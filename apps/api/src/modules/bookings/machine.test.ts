import { BookingState, type Actor } from '@senzo/schemas';
import { describe, expect, it } from 'vitest';
import { HOUR, slotStartsAt } from '../../lib/time';
import { TRANSITIONS, planTransition, type BookingEvent, type BookingForMachine } from './machine';

const b = (
  state: BookingForMachine['state'],
  subStatus: BookingForMachine['subStatus'] = null,
) => ({
  state,
  subStatus,
  date: '2026-12-05',
  slot: 'dinner' as const,
});
const serveAt = slotStartsAt('2026-12-05', 'dinner');
const arriveAt = serveAt - 2 * HOUR;

const sample: Record<BookingEvent['type'], BookingEvent> = {
  payment_captured: { type: 'payment_captured' },
  checkout_expired: { type: 'checkout_expired' },
  chef_accepted: { type: 'chef_accepted', allergiesAck: true },
  chef_declined: { type: 'chef_declined' },
  accept_timeout: { type: 'accept_timeout' },
  guest_cancelled: { type: 'guest_cancelled' },
  chef_cancelled: { type: 'chef_cancelled' },
  on_my_way: { type: 'on_my_way', etaMinutes: 30 },
  possible_no_show: { type: 'possible_no_show' },
  job_started: { type: 'job_started' },
  no_show_marked: { type: 'no_show_marked' },
  job_done: { type: 'job_done' },
  job_finished: { type: 'job_finished' },
  auto_completed: { type: 'auto_completed' },
  reported: { type: 'reported' },
  payout_released: { type: 'payout_released' },
  dispute_resolved: { type: 'dispute_resolved', outcome: 'pay_chef' },
};

describe('planTransition', () => {
  it('walks the happy path from docs/booking-states.md', () => {
    const steps: [BookingEvent, Actor, BookingForMachine['state']][] = [
      [sample.payment_captured, 'system', 'requested'],
      [sample.chef_accepted, 'chef', 'confirmed'],
      [sample.on_my_way, 'chef', 'confirmed'],
      [sample.job_started, 'chef', 'in_progress'],
      [sample.job_done, 'chef', 'in_progress'],
      [sample.job_finished, 'chef', 'completed'],
      [sample.payout_released, 'system', 'paid_out'],
    ];
    let cur: BookingForMachine = b('payment_pending');
    for (const [event, actor, expected] of steps) {
      const plan = planTransition(cur, event, actor, arriveAt);
      expect(plan.to).toBe(expected);
      cur = { ...cur, state: plan.to, subStatus: plan.subStatus };
    }
  });

  it.each(
    Object.entries(TRANSITIONS).flatMap(([type, rule]) =>
      BookingState.options.filter((s) => !rule.from.includes(s)).map((s) => [type, s] as const),
    ),
  )('rejects %s from %s', (type, state) => {
    const actor = TRANSITIONS[type as BookingEvent['type']].actors[0]!;
    expect(() => planTransition(b(state), sample[type as BookingEvent['type']], actor, 0)).toThrow(
      expect.objectContaining({ code: 'INVALID_TRANSITION' }),
    );
  });

  it('only lets the right side act', () => {
    expect(() => planTransition(b('requested'), sample.chef_accepted, 'guest', 0)).toThrow(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
    expect(() => planTransition(b('completed'), sample.payout_released, 'chef', 0)).toThrow(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
  });

  it('needs the allergy acknowledgement to accept', () => {
    expect(() =>
      planTransition(b('requested'), { type: 'chef_accepted', allergiesAck: false }, 'chef', 0),
    ).toThrow(expect.objectContaining({ detail: 'Confirm you have read the allergies' }));
  });

  it('allows "on my way" only within 4 h of arrival', () => {
    expect(() =>
      planTransition(b('confirmed'), sample.on_my_way, 'chef', arriveAt - 4 * HOUR - 1),
    ).toThrow();
    expect(
      planTransition(b('confirmed'), sample.on_my_way, 'chef', arriveAt - 4 * HOUR).subStatus,
    ).toBe('on_the_way');
  });

  it('allows a no-show only after waiting 30 min past arrival time', () => {
    expect(() =>
      planTransition(b('confirmed'), sample.no_show_marked, 'chef', arriveAt + 30 * 60_000 - 1),
    ).toThrow();
    expect(
      planTransition(b('confirmed'), sample.no_show_marked, 'chef', arriveAt + 30 * 60_000).to,
    ).toBe('no_show');
  });

  it('needs "done" before finishing, by code or by the 2 h timer', () => {
    expect(() => planTransition(b('in_progress'), sample.job_finished, 'chef', 0)).toThrow();
    expect(() => planTransition(b('in_progress'), sample.auto_completed, 'system', 0)).toThrow();
    expect(
      planTransition(b('in_progress', 'awaiting_finish'), sample.auto_completed, 'system', 0).to,
    ).toBe('completed');
    expect(() =>
      planTransition(b('in_progress', 'awaiting_finish'), sample.job_done, 'chef', 0),
    ).toThrow();
  });

  it('routes a dispute to paid_out or refunded', () => {
    expect(planTransition(b('disputed'), sample.dispute_resolved, 'admin', 0).to).toBe('paid_out');
    expect(
      planTransition(b('disputed'), { type: 'dispute_resolved', outcome: 'refund' }, 'admin', 0).to,
    ).toBe('refunded');
  });

  it('clears the sub-status on a real state change', () => {
    expect(
      planTransition(b('confirmed', 'on_the_way'), sample.job_started, 'chef', 0).subStatus,
    ).toBeNull();
  });
});
