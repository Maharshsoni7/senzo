import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { createDb } from '../db';
import type { Bindings } from '../env';
import {
  ACCEPT_WINDOW_MS,
  AUTO_COMPLETE_AFTER_DONE_MS,
  NO_SHOW_CHECK_AFTER_ARRIVAL_MS,
  PAYOUT_HOLD_MS,
  REMINDERS,
  autoComplete,
  declineIfUnanswered,
  expireCheckout,
  flagPossibleNoShow,
  loadTimes,
  releasePayout,
  sendReminder,
} from '../modules/bookings/timers';

export type BookingTimerParams = {
  bookingId: string;
  chefId: string;
  date: string;
  slot: 'lunch' | 'dinner' | 'late';
};

export const PAYMENT_CAPTURED = 'payment-captured';
export const JOB_DONE = 'job-done';

/**
 * One instance per booking, id = booking id, started when checkout begins. Every step
 * re-reads the booking and does nothing if it has moved on, so replays and late events are safe.
 */
export class BookingTimers extends WorkflowEntrypoint<Bindings, BookingTimerParams> {
  override async run(event: WorkflowEvent<BookingTimerParams>, step: WorkflowStep) {
    const b = event.payload;
    const db = createDb(this.env.DB);
    const load = (name: string) => step.do(name, () => loadTimes(db, b.bookingId));

    await waitOrTimeout(step, 'wait for payment', PAYMENT_CAPTURED, '10 minutes');
    const afterCheckout = await step.do('expire unpaid checkout', () =>
      expireCheckout(this.env, db, { id: b.bookingId, ...b }),
    );
    if (afterCheckout !== 'requested' && afterCheckout !== 'confirmed') return afterCheckout;

    const paid = await load('load after payment');
    await step.sleepUntil('accept deadline', (paid.requestedAt ?? Date.now()) + ACCEPT_WINDOW_MS);
    const accepted = await step.do('decline if unanswered', () =>
      declineIfUnanswered(db, b.bookingId),
    );
    if (accepted !== 'confirmed') return accepted;

    for (const r of REMINDERS) {
      const dueAt = paid.slotStartsAt - r.beforeSlotMs;
      await step.sleepUntil(`reminder ${r.name}`, dueAt);
      await step.do(`send reminder ${r.name}`, () => sendReminder(db, b.bookingId, r.name, dueAt));
    }

    await step.sleepUntil('no-show check', paid.arrivalAt + NO_SHOW_CHECK_AFTER_ARRIVAL_MS);
    await step.do('flag possible no-show', () => flagPossibleNoShow(db, b.bookingId));

    const beforeDone = await load('load before done');
    if (beforeDone.subStatus !== 'awaiting_finish') {
      await waitOrTimeout(step, 'wait for done', JOB_DONE, '24 hours');
    }
    const done = await load('load after done');
    if (done.state !== 'in_progress' || done.doneAt === null) return done.state;

    await step.sleepUntil('auto-complete', done.doneAt + AUTO_COMPLETE_AFTER_DONE_MS);
    await step.do('auto-complete', () => autoComplete(db, b.bookingId));

    const completed = await load('load after completion');
    if (completed.state !== 'completed' || completed.completedAt === null) return completed.state;

    await step.sleepUntil('payout hold', completed.completedAt + PAYOUT_HOLD_MS);
    return step.do('release payout', () => releasePayout(db, b.bookingId));
  }
}

/** waitForEvent throws on timeout; callers re-read the booking either way. */
async function waitOrTimeout(
  step: WorkflowStep,
  name: string,
  type: string,
  timeout: '10 minutes' | '24 hours',
) {
  try {
    await step.waitForEvent(name, { type, timeout });
    return true;
  } catch {
    return false;
  }
}

export const startBookingTimers = (env: Bindings, params: BookingTimerParams) =>
  env.BOOKING_TIMERS.create({ id: params.bookingId, params });

export const signalBooking = async (env: Bindings, bookingId: string, type: string) =>
  (await env.BOOKING_TIMERS.get(bookingId)).sendEvent({ type, payload: {} });
