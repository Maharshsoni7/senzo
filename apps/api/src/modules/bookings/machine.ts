import type { Actor, BookingState } from '@senzo/schemas';
import { AppError } from '../../lib/errors';
import { HOUR, slotStartsAt } from '../../lib/time';

// docs/booking-states.md → Transitions. Side effects run from the outbox, not here.

export type BookingEvent =
  | { type: 'payment_captured' }
  | { type: 'checkout_expired' }
  | { type: 'chef_accepted'; allergiesAck: boolean }
  | { type: 'chef_declined'; reason?: string }
  | { type: 'accept_timeout' }
  | { type: 'guest_cancelled'; reason?: string }
  | { type: 'chef_cancelled'; reason?: string }
  | { type: 'on_my_way'; etaMinutes: 15 | 30 | 45 }
  | { type: 'possible_no_show' }
  | { type: 'job_started' }
  | { type: 'no_show_marked' }
  | { type: 'job_done' }
  | { type: 'job_finished' }
  | { type: 'auto_completed' }
  | { type: 'reported' }
  | { type: 'payout_released' }
  | { type: 'dispute_resolved'; outcome: 'pay_chef' | 'refund' };

export type BookingForMachine = {
  state: BookingState;
  subStatus: 'on_the_way' | 'awaiting_finish' | 'possible_no_show' | null;
  date: string;
  slot: 'lunch' | 'dinner' | 'late';
};

type Rule = {
  from: BookingState[];
  to: BookingState | ((e: BookingEvent) => BookingState);
  actors: Actor[];
  outbox: string;
  guard?: (b: BookingForMachine, e: BookingEvent, now: number) => string | null;
};

const ARRIVAL_BEFORE_SLOT = 2 * HOUR;
const NO_SHOW_WAIT = 30 * 60_000;
const ON_MY_WAY_WINDOW = 4 * HOUR;

const arrivalAt = (b: BookingForMachine) => slotStartsAt(b.date, b.slot) - ARRIVAL_BEFORE_SLOT;

const RULES: Record<BookingEvent['type'], Rule> = {
  payment_captured: {
    from: ['payment_pending'],
    to: 'requested',
    actors: ['system'],
    outbox: 'booking.requested',
  },
  checkout_expired: {
    from: ['payment_pending'],
    to: 'expired',
    actors: ['system'],
    outbox: 'booking.expired',
  },
  chef_accepted: {
    from: ['requested'],
    to: 'confirmed',
    actors: ['chef'],
    outbox: 'booking.confirmed',
    guard: (_, e) =>
      e.type === 'chef_accepted' && !e.allergiesAck ? 'Confirm you have read the allergies' : null,
  },
  chef_declined: {
    from: ['requested'],
    to: 'declined',
    actors: ['chef'],
    outbox: 'booking.declined',
  },
  accept_timeout: {
    from: ['requested'],
    to: 'declined',
    actors: ['system'],
    outbox: 'booking.declined',
  },
  guest_cancelled: {
    from: ['requested', 'confirmed'],
    to: 'cancelled',
    actors: ['guest'],
    outbox: 'booking.cancelled',
  },
  chef_cancelled: {
    from: ['confirmed'],
    to: 'cancelled',
    actors: ['chef'],
    outbox: 'booking.cancelled',
  },
  on_my_way: {
    from: ['confirmed'],
    to: 'confirmed',
    actors: ['chef'],
    outbox: 'booking.on_the_way',
    guard: (b, _, now) =>
      arrivalAt(b) - now > ON_MY_WAY_WINDOW ? 'Too early to start travelling' : null,
  },
  possible_no_show: {
    from: ['confirmed'],
    to: 'confirmed',
    actors: ['system'],
    outbox: 'booking.possible_no_show',
  },
  job_started: {
    from: ['confirmed'],
    to: 'in_progress',
    actors: ['chef'],
    outbox: 'booking.started',
  },
  no_show_marked: {
    from: ['confirmed'],
    to: 'no_show',
    actors: ['chef', 'system'],
    outbox: 'booking.no_show',
    guard: (b, _, now) =>
      now < arrivalAt(b) + NO_SHOW_WAIT ? 'Wait 30 minutes at the door first' : null,
  },
  job_done: {
    from: ['in_progress'],
    to: 'in_progress',
    actors: ['chef'],
    outbox: 'booking.done',
    guard: (b) => (b.subStatus === 'awaiting_finish' ? 'Already marked done' : null),
  },
  job_finished: {
    from: ['in_progress'],
    to: 'completed',
    actors: ['chef'],
    outbox: 'booking.completed',
    guard: (b) => (b.subStatus !== 'awaiting_finish' ? 'Tap done before the finish code' : null),
  },
  auto_completed: {
    from: ['in_progress'],
    to: 'completed',
    actors: ['system'],
    outbox: 'booking.completed',
    guard: (b) => (b.subStatus !== 'awaiting_finish' ? 'Chef has not tapped done' : null),
  },
  reported: {
    from: ['in_progress', 'completed', 'no_show'],
    to: 'disputed',
    actors: ['guest', 'chef'],
    outbox: 'booking.disputed',
  },
  payout_released: {
    from: ['completed'],
    to: 'paid_out',
    actors: ['system'],
    outbox: 'booking.paid_out',
  },
  dispute_resolved: {
    from: ['disputed'],
    to: (e) => (e.type === 'dispute_resolved' && e.outcome === 'refund' ? 'refunded' : 'paid_out'),
    actors: ['admin'],
    outbox: 'booking.dispute_resolved',
  },
};

const SUB_STATUS: Partial<Record<BookingEvent['type'], BookingForMachine['subStatus']>> = {
  on_my_way: 'on_the_way',
  possible_no_show: 'possible_no_show',
  job_done: 'awaiting_finish',
};

/** Pure: validates the event and says what changes. Throws INVALID_TRANSITION. */
export function planTransition(b: BookingForMachine, e: BookingEvent, actor: Actor, now: number) {
  const rule = RULES[e.type];
  if (!rule.from.includes(b.state)) {
    throw new AppError(
      'INVALID_TRANSITION',
      409,
      `Can't ${e.type.replaceAll('_', ' ')} a ${b.state} booking`,
    );
  }
  if (!rule.actors.includes(actor)) {
    throw new AppError('FORBIDDEN', 403, `${actor} can't ${e.type.replaceAll('_', ' ')}`);
  }
  const blocked = rule.guard?.(b, e, now);
  if (blocked) throw new AppError('INVALID_TRANSITION', 409, blocked);

  const to = typeof rule.to === 'function' ? rule.to(e) : rule.to;
  // Sub-status belongs to one state; it clears whenever the event doesn't set one.
  const subStatus = SUB_STATUS[e.type] ?? null;
  return { from: b.state, to, subStatus, outboxType: rule.outbox };
}

export const TRANSITIONS = RULES;
