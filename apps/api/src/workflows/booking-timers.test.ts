import { introspectWorkflowInstance } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { seed } from '../../seed';
import * as data from '../../seed/data';
import { createDb } from '../db';
import { bookingEvents, bookings, outboxEvents } from '../db/schema';
import { slotLock } from '../durable/slot-lock';
import { sendReminder } from '../modules/bookings/timers';
import { JOB_DONE, PAYMENT_CAPTURED, startBookingTimers } from './booking-timers';

const db = createDb(env.DB);
const template = data.bookings.find((x) => x.code === 'SZ-1048')!;
let n = 0;

async function booking(state: 'payment_pending' | 'requested' | 'in_progress', extra = {}) {
  n++;
  const date = `2027-04-${String(n).padStart(2, '0')}`;
  const [row] = await db
    .insert(bookings)
    .values({ ...template, id: `bk_wf_${n}`, code: `SZ-W${n}`, state, date, ...extra })
    .returning();
  if (state !== 'payment_pending') {
    await db.insert(bookingEvents).values({
      bookingId: row!.id,
      fromState: 'payment_pending',
      toState: 'requested',
      actor: 'system',
      at: Date.now(),
    });
  }
  return row!;
}

const params = (b: {
  id: string;
  chefId: string;
  date: string;
  slot: 'lunch' | 'dinner' | 'late';
}) => ({
  bookingId: b.id,
  chefId: b.chefId,
  date: b.date,
  slot: b.slot,
});

const stateOf = async (id: string) =>
  (await db.select({ state: bookings.state }).from(bookings).where(eq(bookings.id, id)).get())
    ?.state;

beforeAll(async () => {
  await seed(db);
});

describe('BookingTimers workflow', () => {
  it('expires an unpaid checkout after 10 minutes and frees the slot', async () => {
    const b = await booking('payment_pending');
    const lock = slotLock(env, b.chefId, b.date, b.slot);
    await lock.acquire(b.id);

    await using wf = await introspectWorkflowInstance(env.BOOKING_TIMERS, b.id);
    await wf.modify(async (m) => {
      await m.forceEventTimeout({ name: 'wait for payment' });
    });
    await startBookingTimers(env, params(b));
    await wf.waitForStatus('complete');

    expect(await wf.getOutput()).toBe('expired');
    expect(await stateOf(b.id)).toBe('expired');
    expect(await lock.holder()).toBeNull();
  });

  it('auto-declines a request the chef never answers', async () => {
    const b = await booking('requested');
    await using wf = await introspectWorkflowInstance(env.BOOKING_TIMERS, b.id);
    await wf.modify(async (m) => {
      await m.disableSleeps();
      await m.mockEvent({ type: PAYMENT_CAPTURED, payload: {} });
    });
    await startBookingTimers(env, params(b));
    await wf.waitForStatus('complete');

    expect(await wf.getOutput()).toBe('declined');
    const saved = await db.select().from(bookings).where(eq(bookings.id, b.id)).get();
    expect(saved).toMatchObject({ state: 'declined', cancelledBy: 'system' });
    const outbox = await db.select().from(outboxEvents);
    expect(outbox.some((o) => o.type === 'booking.declined')).toBe(true);
  });

  it('auto-completes 2 h after "done" and releases the payout 24 h later', async () => {
    const doneAt = Date.now() - 1000;
    const b = await booking('in_progress', { subStatus: 'awaiting_finish', doneAt });
    await using wf = await introspectWorkflowInstance(env.BOOKING_TIMERS, b.id);
    await wf.modify(async (m) => {
      await m.disableSleeps();
      await m.mockEvent({ type: PAYMENT_CAPTURED, payload: {} });
      await m.mockEvent({ type: JOB_DONE, payload: {} });
      // The chef accepted and started during the checkout and accept-deadline sleeps.
      await m.mockStepResult({ name: 'expire unpaid checkout' }, 'requested');
      await m.mockStepResult({ name: 'decline if unanswered' }, 'confirmed');
    });
    await startBookingTimers(env, params(b));
    await wf.waitForStatus('complete');

    expect(await wf.getOutput()).toBe('paid_out');
    const events = await db
      .select({ to: bookingEvents.toState, actor: bookingEvents.actor })
      .from(bookingEvents)
      .where(eq(bookingEvents.bookingId, b.id));
    expect(events.map((e) => e.to)).toEqual(['requested', 'completed', 'paid_out']);
  });
});

describe('sendReminder', () => {
  it('sends only for confirmed bookings and skips reminders that are long overdue', async () => {
    const b = await booking('requested');
    await db.update(bookings).set({ state: 'confirmed' }).where(eq(bookings.id, b.id));
    const now = Date.now();
    expect(await sendReminder(db, b.id, '24h', now, now)).toBe(true);
    expect(await sendReminder(db, b.id, '2h', now - 16 * 60_000, now)).toBe(false);

    await db.update(bookings).set({ state: 'cancelled' }).where(eq(bookings.id, b.id));
    expect(await sendReminder(db, b.id, '2h', now, now)).toBe(false);
  });
});
