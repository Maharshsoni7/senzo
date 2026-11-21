import { env } from 'cloudflare:workers';
import { eq, sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { seed } from '.';
import { createDb, schema, type Db } from '../src/db';

let db: Db;

beforeAll(async () => {
  db = createDb(env.DB);
  await seed(db);
});

describe('seed', () => {
  it('can run twice', async () => {
    await expect(seed(db)).resolves.toBeGreaterThan(0);
  });

  it('matches the SZ-1042 numbers in the mockup (C08, G10)', async () => {
    const b = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.code, 'SZ-1042'))
      .get();
    expect(b).toMatchObject({
      menuTotalPaise: 1_080_000,
      platformFeePaise: 162_000,
      platformFeeGstPaise: 29_160,
      chefSharePaise: 888_840,
      totalPaise: 1_097_600,
      state: 'paid_out',
    });
  });

  it('gives Ananya six courses with one default option each', async () => {
    const counts = await db
      .select({ courseId: schema.menuOptions.courseId, n: sql<number>`count(*)` })
      .from(schema.menuOptions)
      .groupBy(schema.menuOptions.courseId);
    expect(counts).toHaveLength(6);
  });

  it('keeps band prices non-increasing as groups grow', async () => {
    const bands = await db
      .select()
      .from(schema.menuBands)
      .orderBy(schema.menuBands.menuId, schema.menuBands.minGuests);
    for (let i = 1; i < bands.length; i++) {
      const [prev, cur] = [bands[i - 1]!, bands[i]!];
      if (prev.menuId === cur.menuId) {
        expect(cur.pricePerGuestPaise).toBeLessThanOrEqual(prev.pricePerGuestPaise);
      }
    }
  });
});
