import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { seed } from '../../../seed';
import * as data from '../../../seed/data';
import { createDb } from '../../db';
import { bookingEvents, bookings, ledgerEntries, outboxEvents } from '../../db/schema';
import { captureLines } from '../ledger/entries';
import { ledgerTxn } from '../ledger/service';
import { transition } from './transition';

const db = createDb(env.DB);
const sz1048 = data.bookings.find((x) => x.code === 'SZ-1048')!;
let n = 0;

/** Copies SZ-1048 into a fresh booking on its own date. */
async function newBooking(state: 'payment_pending' | 'requested', date?: string) {
  n++;
  date ??= `2027-01-${String(n).padStart(2, '0')}`;
  const [row] = await db
    .insert(bookings)
    .values({ ...sz1048, id: undefined, code: `SZ-T${n}`, state, date })
    .returning();
  return row!;
}

beforeAll(async () => {
  await seed(db);
});

describe('transition', () => {
  it('updates the booking and writes the event and outbox rows together', async () => {
    const bk = await newBooking('requested');
    const out = await transition(
      db,
      bk.id,
      { type: 'chef_accepted', allergiesAck: true },
      {
        kind: 'chef',
        id: 'usr_ananya',
      },
    );
    expect(out.state).toBe('confirmed');

    const saved = await db.select().from(bookings).where(eq(bookings.id, bk.id)).get();
    expect(saved).toMatchObject({ state: 'confirmed', acceptedAt: expect.any(Number) });

    const events = await db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, bk.id));
    expect(events).toMatchObject([{ fromState: 'requested', toState: 'confirmed', actor: 'chef' }]);

    const outbox = await db.select().from(outboxEvents);
    expect(
      outbox.some(
        (o) =>
          o.type === 'booking.confirmed' &&
          (o.payload as { bookingId: string }).bookingId === bk.id,
      ),
    ).toBe(true);
  });

  it('lets only one of two racing requests win, and rolls back the loser’s ledger rows', async () => {
    const bk = await newBooking('payment_pending');
    const { statements } = await ledgerTxn(db, {
      lines: captureLines(bk),
      bookingId: bk.id,
      memo: 'capture',
      at: Date.now(),
    });

    const results = await Promise.allSettled([
      transition(db, bk.id, { type: 'payment_captured' }, { kind: 'system' }, { with: statements }),
      transition(db, bk.id, { type: 'checkout_expired' }, { kind: 'system' }),
    ]);

    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r) => r.status === 'rejected');
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect((lost[0] as PromiseRejectedResult).reason).toMatchObject({ code: 'STATE_CONFLICT' });

    const events = await db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, bk.id));
    expect(events).toHaveLength(1);
    const ledger = await db.select().from(ledgerEntries).where(eq(ledgerEntries.bookingId, bk.id));
    const capturedWon =
      (won[0] as PromiseFulfilledResult<{ state: string }>).value.state === 'requested';
    expect(ledger.length > 0).toBe(capturedWon);
  });

  it('refuses to confirm payment into a slot that another booking now holds', async () => {
    const date = '2027-02-01';
    const taken = await newBooking('payment_pending', date);
    const late = await newBooking('payment_pending', date);
    await transition(db, taken.id, { type: 'payment_captured' }, { kind: 'system' });
    await expect(
      transition(db, late.id, { type: 'payment_captured' }, { kind: 'system' }),
    ).rejects.toMatchObject({ code: 'SLOT_TAKEN' });
    const still = await db.select().from(bookings).where(eq(bookings.id, late.id)).get();
    expect(still?.state).toBe('payment_pending');
  });

  it('404s for an unknown booking', async () => {
    await expect(
      transition(db, 'nope', { type: 'payment_captured' }, { kind: 'system' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
