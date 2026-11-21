import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Db } from '.';
import { addresses, bookings, chefs, ledgerAccounts, ledgerEntries, users } from './schema';

let db: Db;
let guestId: string;
let chefId: string;
let addressId: string;
let seq = 1000;

// Drizzle wraps the D1 error; the constraint name is on `cause`.
const expectDbError = (query: Promise<unknown>, message: RegExp) =>
  expect(query).rejects.toMatchObject({ cause: { message: expect.stringMatching(message) } });

const booking = (overrides: Partial<typeof bookings.$inferInsert> = {}) =>
  ({
    code: `SZ-${seq++}`,
    guestId,
    chefId,
    addressId,
    date: '2026-12-05',
    slot: 'dinner',
    guests: 6,
    foodRule: 'regular',
    groceriesBy: 'chef',
    state: 'requested',
    priceSnapshot: {},
    menuTotalPaise: 1_080_000,
    convenienceFeePaise: 14_900,
    feeGstPaise: 2_682,
    totalPaise: 1_097_582,
    platformFeePaise: 162_000,
    chefSharePaise: 918_000,
    ...overrides,
  }) satisfies typeof bookings.$inferInsert;

beforeAll(async () => {
  db = createDb(env.DB);
  const [guest] = await db.insert(users).values({ phoneE164: '+919800000001' }).returning();
  const [cook] = await db.insert(users).values({ phoneE164: '+919800000002' }).returning();
  const [chef] = await db
    .insert(chefs)
    .values({ userId: cook!.id, slug: 'ananya-mehta', displayName: 'Ananya Mehta' })
    .returning();
  const [address] = await db
    .insert(addresses)
    .values({
      userId: guest!.id,
      line1: 'Prahlad Nagar',
      area: 'Prahlad Nagar',
      city: 'Ahmedabad',
      pincode: '380015',
      lat: 23.01,
      lng: 72.51,
    })
    .returning();
  guestId = guest!.id;
  chefId = chef!.id;
  addressId = address!.id;
});

describe('bookings', () => {
  it('allows one active booking per chef, date and slot', async () => {
    await db.insert(bookings).values(booking({ date: '2026-12-06' }));
    await expectDbError(
      db.insert(bookings).values(booking({ date: '2026-12-06' })),
      /UNIQUE constraint failed/,
    );
  });

  it('frees the slot once the booking is no longer active', async () => {
    const [first] = await db
      .insert(bookings)
      .values(booking({ date: '2026-12-07' }))
      .returning();
    await db.update(bookings).set({ state: 'declined' }).where(eq(bookings.id, first!.id));
    await expect(
      db.insert(bookings).values(booking({ date: '2026-12-07' })),
    ).resolves.toBeDefined();
  });

  it('rejects states outside the enum', async () => {
    await expectDbError(
      db.insert(bookings).values(booking({ state: 'lost' as 'requested' })),
      /CHECK constraint failed: state_valid/,
    );
  });
});

describe('ledger', () => {
  it('rejects zero-amount entries', async () => {
    const [account] = await db
      .insert(ledgerAccounts)
      .values({ kind: 'platform_revenue' })
      .returning();
    await expectDbError(
      db
        .insert(ledgerEntries)
        .values({ txnId: 't1', accountId: account!.id, amountPaise: 0, at: Date.now() }),
      /CHECK constraint failed: amount_nonzero/,
    );
  });

  it('keeps one platform-wide account per kind', async () => {
    await db.insert(ledgerAccounts).values({ kind: 'gst_payable' });
    await expectDbError(
      db.insert(ledgerAccounts).values({ kind: 'gst_payable' }),
      /UNIQUE constraint failed/,
    );
  });
});
