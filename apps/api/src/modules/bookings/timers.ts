import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../../db';
import { bookingEvents, bookings, outboxEvents } from '../../db/schema';
import { slotLock } from '../../durable/slot-lock';
import type { Bindings } from '../../env';
import { AppError } from '../../lib/errors';
import { HOUR, slotStartsAt } from '../../lib/time';
import type { BookingEvent } from './machine';
import { transition } from './transition';

// Deadlines from docs/booking-states.md → Timers.
export const ACCEPT_WINDOW_MS = 2 * HOUR;
export const AUTO_COMPLETE_AFTER_DONE_MS = 2 * HOUR;
export const PAYOUT_HOLD_MS = 24 * HOUR;
export const NO_SHOW_CHECK_AFTER_ARRIVAL_MS = 30 * 60_000;
export const ARRIVAL_BEFORE_SLOT_MS = 2 * HOUR;
export const REMINDERS = [
  { name: '24h', beforeSlotMs: 24 * HOUR },
  { name: '2h', beforeSlotMs: 2 * HOUR },
] as const;
/** A reminder whose time passed longer ago than this (late booking) is skipped. */
const REMINDER_GRACE_MS = 15 * 60_000;

export type BookingTimes = {
  state: string;
  subStatus: string | null;
  slotStartsAt: number;
  arrivalAt: number;
  requestedAt: number | null;
  doneAt: number | null;
  completedAt: number | null;
};

export async function loadTimes(db: Db, bookingId: string): Promise<BookingTimes> {
  const [[b], [requested]] = await db.batch([
    db.select().from(bookings).where(eq(bookings.id, bookingId)),
    db
      .select({ at: bookingEvents.at })
      .from(bookingEvents)
      .where(and(eq(bookingEvents.bookingId, bookingId), eq(bookingEvents.toState, 'requested')))
      .orderBy(desc(bookingEvents.at))
      .limit(1),
  ]);
  if (!b) throw new AppError('NOT_FOUND', 404, `Booking ${bookingId} not found`);
  const startsAt = slotStartsAt(b.date, b.slot);
  return {
    state: b.state,
    subStatus: b.subStatus,
    slotStartsAt: startsAt,
    arrivalAt: startsAt - ARRIVAL_BEFORE_SLOT_MS,
    requestedAt: requested?.at ?? null,
    doneAt: b.doneAt,
    completedAt: b.completedAt,
  };
}

/** Applies a system event if the booking is still where the timer expects; else a no-op. */
async function fire(db: Db, bookingId: string, expected: string, event: BookingEvent, now: number) {
  const { state, subStatus } = await loadTimes(db, bookingId);
  if (state !== expected) return state;
  try {
    return (await transition(db, bookingId, event, { kind: 'system' }, { now })).state;
  } catch (err) {
    // A guard (e.g. sub-status) says not yet; STATE_CONFLICT propagates so the step retries.
    if (err instanceof AppError && err.code === 'INVALID_TRANSITION') return subStatus ?? state;
    throw err;
  }
}

export async function expireCheckout(
  env: Bindings,
  db: Db,
  b: { id: string; chefId: string; date: string; slot: 'lunch' | 'dinner' | 'late' },
  now = Date.now(),
) {
  const state = await fire(db, b.id, 'payment_pending', { type: 'checkout_expired' }, now);
  if (state === 'expired') await slotLock(env, b.chefId, b.date, b.slot).release(b.id);
  return state;
}

export const declineIfUnanswered = (db: Db, id: string, now = Date.now()) =>
  fire(db, id, 'requested', { type: 'accept_timeout' }, now);

export const flagPossibleNoShow = (db: Db, id: string, now = Date.now()) =>
  fire(db, id, 'confirmed', { type: 'possible_no_show' }, now);

export const autoComplete = (db: Db, id: string, now = Date.now()) =>
  fire(db, id, 'in_progress', { type: 'auto_completed' }, now);

export const releasePayout = (db: Db, id: string, now = Date.now()) =>
  fire(db, id, 'completed', { type: 'payout_released' }, now);

export async function sendReminder(
  db: Db,
  bookingId: string,
  reminder: (typeof REMINDERS)[number]['name'],
  dueAt: number,
  now = Date.now(),
) {
  const { state } = await loadTimes(db, bookingId);
  if (state !== 'confirmed' || now > dueAt + REMINDER_GRACE_MS) return false;
  await db.insert(outboxEvents).values({
    type: 'booking.reminder',
    payload: { bookingId, reminder },
    createdAt: now,
  });
  return true;
}
