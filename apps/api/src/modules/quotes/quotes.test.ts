import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { seed } from '../../../seed';
import { createApp } from '../../app';
import { createDb } from '../../db';
import { chefs } from '../../db/schema';

const app = createApp();
const post = (body: unknown) =>
  app.request(
    '/v1/quotes',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    env,
  );

beforeAll(async () => {
  await seed(createDb(env.DB));
});

describe('POST /v1/quotes', () => {
  it('prices Gujarati Classic from the database', async () => {
    const res = await post({ menuId: 'menu_gujarati_classic', guests: 6 });
    expect(res.status).toBe(200);
    const q = (await res.json()) as Record<string, unknown>;
    expect(q).toMatchObject({ menuTotalPaise: 1_080_000, totalPaise: 1_097_600, bookable: true });
    expect(q).not.toHaveProperty('chef');
  });

  it('applies a live promo, case-insensitively', async () => {
    const res = await post({ menuId: 'menu_gujarati_classic', guests: 6, promo: 'firstfeast' });
    expect(await res.json()).toMatchObject({
      promo: { code: 'FIRSTFEAST', discountPaise: 50_000 },
      totalPaise: 1_047_600,
    });
  });

  it('rejects an unknown promo', async () => {
    const res = await post({ menuId: 'menu_gujarati_classic', guests: 6, promo: 'NOPE' });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: 'PROMO_INVALID' });
  });

  it('404s for an unknown menu', async () => {
    expect((await post({ menuId: 'menu_nope', guests: 6 })).status).toBe(404);
  });

  it('404s when the chef is paused', async () => {
    const db = createDb(env.DB);
    await db.update(chefs).set({ status: 'paused' }).where(eq(chefs.id, 'chef_meera'));
    expect((await post({ menuId: 'menu_meera_signature', guests: 4 })).status).toBe(404);
  });

  it('validates the body', async () => {
    const res = await post({ menuId: 'menu_gujarati_classic', guests: 0 });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
