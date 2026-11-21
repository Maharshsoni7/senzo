import type { Actor } from '@senzo/schemas';
import { and, eq, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { Db } from '../../db';
import { bookingEvents, bookings, outboxEvents } from '../../db/schema';
import { AppError } from '../../lib/errors';
import { planTransition, type BookingEvent } from './machine';

type Statement = BatchItem<'sqlite'>;

const STALE_MARKER = 'stale booking';

function patchFor(
  e: BookingEvent,
  actor: Actor,
  now: number,
): Partial<typeof bookings.$inferInsert> {
  switch (e.type) {
    case 'chef_accepted':
      return { allergiesAckAt: now, acceptedAt: now };
    case 'on_my_way':
      return { etaMinutes: e.etaMinutes };
    case 'job_started':
      return { startedAt: now };
    case 'job_done':
      return { doneAt: now };
    case 'job_finished':
    case 'auto_completed':
      return { completedAt: now };
    case 'payout_released':
      return { paidOutAt: now };
    case 'dispute_resolved':
      return e.outcome === 'pay_chef' ? { paidOutAt: now } : {};
    case 'chef_declined':
    case 'guest_cancelled':
    case 'chef_cancelled':
      return { cancelledBy: actor, cancelReason: e.reason ?? null };
    case 'accept_timeout':
      return { cancelledBy: 'system', cancelReason: 'No answer in 2 hours' };
    default:
      return {};
  }
}

/**
 * The only way a booking's state changes. Writes the booking update, booking_events and an
 * outbox row — plus any `with` statements (ledger, refunds) — in one D1 batch. If another
 * request changed the booking first, the batch rolls back and this throws STATE_CONFLICT.
 */
export async function transition(
  db: Db,
  bookingId: string,
  event: BookingEvent,
  actor: { kind: Actor; id?: string },
  opts: { now?: number; with?: Statement[] } = {},
) {
  const now = opts.now ?? Date.now();
  const booking = await db.select().from(bookings).where(eq(bookings.id, bookingId)).get();
  if (!booking) throw new AppError('NOT_FOUND', 404, 'Booking not found');

  const plan = planTransition(booking, event, actor.kind, now);
  const patch = { ...patchFor(event, actor.kind, now), state: plan.to, subStatus: plan.subStatus };

  const statements: Statement[] = [
    db
      .update(bookings)
      .set({ ...patch, updatedAt: now })
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.state, booking.state),
          eq(bookings.updatedAt, booking.updatedAt),
        ),
      ),
    // Aborts the whole batch when the update above matched no row (raise() only works in triggers).
    db
      .select({ ok: sql<number>`CASE WHEN changes() = 1 THEN 1 ELSE json(${STALE_MARKER}) END` })
      .from(bookings)
      .where(eq(bookings.id, bookingId)),
    db.insert(bookingEvents).values({
      bookingId,
      fromState: plan.from,
      toState: plan.to,
      actor: actor.kind,
      actorId: actor.id,
      reason: 'reason' in event ? event.reason : event.type,
      at: now,
    }),
    db.insert(outboxEvents).values({
      type: plan.outboxType,
      payload: { bookingId, code: booking.code, from: plan.from, to: plan.to, event: event.type },
      createdAt: now,
    }),
    ...(opts.with ?? []),
  ];

  try {
    await db.batch(statements as [Statement, ...Statement[]]);
  } catch (err) {
    const message = String((err as Error).cause ?? err);
    if (message.includes('malformed JSON')) {
      throw new AppError('STATE_CONFLICT', 409, 'The booking changed; reload and try again');
    }
    if (message.includes('UNIQUE constraint failed: bookings.chef_id')) {
      throw new AppError('SLOT_TAKEN', 409, 'The chef was booked for this slot meanwhile');
    }
    throw err;
  }
  return { ...booking, ...patch, updatedAt: now, previousState: plan.from };
}
