import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { seed } from '../../../seed';
import { createApp } from '../../app';
import { createDb } from '../../db';
import { bookings, chefs, reviews } from '../../db/schema';
import { shortName } from './service';

const db = createDb(env.DB);
const app = createApp();
const get = async <T = Record<string, unknown>>(path: string) => {
  const res = await app.request(path, {}, env);
  return { status: res.status, body: (await res.json()) as T };
};
type Card = { id: string; slug: string; fromPricePaise: number; distanceKm: number | null };
type List = { items: Card[]; nextCursor: string | null };
const ids = (l: List) => l.items.map((c) => c.id).sort();

// Rahul's home in Prahlad Nagar (seed).
const PRAHLAD_NAGAR = 'lat=23.012&lng=72.511';

beforeAll(async () => {
  await seed(db);
  await db.update(chefs).set({ status: 'paused' }).where(eq(chefs.id, 'chef_arjun'));
});

describe('GET /v1/chefs', () => {
  it('lists live chefs only, ranked, with from-prices', async () => {
    const { body } = await get<List>('/v1/chefs');
    expect(body.items).toHaveLength(7);
    expect(ids(body)).not.toContain('chef_arjun');
    const ananya = body.items.find((c) => c.id === 'chef_ananya')!;
    expect(ananya.fromPricePaise).toBe(75_000);
  });

  it('measures distance and drops chefs outside their service radius', async () => {
    const near = await get<List>(`/v1/chefs?${PRAHLAD_NAGAR}`);
    expect(near.body.items.find((c) => c.id === 'chef_ananya')!.distanceKm).toBeCloseTo(3.1, 0);
    const surat = await get<List>('/v1/chefs?lat=21.17&lng=72.83');
    expect(surat.body.items).toEqual([]);
  });

  it('searches names, cuisines and dishes, including synonyms', async () => {
    expect(ids((await get<List>('/v1/chefs?q=undhiyu')).body)).toEqual(['chef_ananya']);
    expect(ids((await get<List>('/v1/chefs?q=dhokra')).body)).toEqual(['chef_ananya']);
    expect(ids((await get<List>('/v1/chefs?q=tandoor')).body)).toEqual(['chef_rohan']);
    expect((await get<List>('/v1/chefs?q=sushi')).body.items).toEqual([]);
  });

  it('filters by food rule, cuisine and group size', async () => {
    expect(ids((await get<List>('/v1/chefs?rule=jain')).body)).toEqual([
      'chef_ananya',
      'chef_bhavna',
      'chef_hetal',
    ]);
    expect(ids((await get<List>('/v1/chefs?cuisine=desserts')).body)).toEqual(['chef_priya']);
    const big = await get<List>('/v1/chefs?guests=30');
    expect(ids(big.body)).toEqual(['chef_ananya']);
    expect(big.body.items[0]!.fromPricePaise).toBe(165_000);
  });

  it('keeps only chefs free on the chosen date and slot', async () => {
    // 2027-06-01 is a Tuesday (Ananya off); late slot only exists for Ananya.
    expect(ids((await get<List>('/v1/chefs?date=2027-06-01&slot=dinner')).body)).not.toContain(
      'chef_ananya',
    );
    expect(ids((await get<List>('/v1/chefs?date=2027-06-03&slot=late')).body)).toEqual([
      'chef_ananya',
    ]);
  });

  it('pages with a cursor without repeating chefs', async () => {
    const first = (await get<List>('/v1/chefs?limit=4')).body;
    expect(first.items).toHaveLength(4);
    const second = (await get<List>(`/v1/chefs?limit=4&cursor=${first.nextCursor}`)).body;
    expect(second.items).toHaveLength(3);
    expect(second.nextCursor).toBeNull();
    expect(new Set([...ids(first), ...ids(second)]).size).toBe(7);
  });

  it('rejects half a location or half a slot', async () => {
    expect((await get('/v1/chefs?lat=23')).status).toBe(400);
    expect((await get('/v1/chefs?date=2027-06-01')).status).toBe(400);
  });
});

describe('GET /v1/chefs/:slug', () => {
  it('returns the profile with verified proofs only and no contact details', async () => {
    const { status, body } = await get('/v1/chefs/ananya-mehta');
    expect(status).toBe(200);
    expect(body).toMatchObject({
      id: 'chef_ananya',
      yearsCooking: 8,
      maxGuests: 40,
      hasHelper: true,
      foodRules: expect.arrayContaining(['jain']),
      occasions: expect.arrayContaining(['Kitty party']),
      proofs: [{ kind: 'kitchen', title: 'Hotel kitchen, Ahmedabad' }],
      specialties: expect.arrayContaining([
        {
          name: 'Khandvi Tacos',
          course: 'Starter 1',
          description: expect.stringContaining('khandvi'),
        },
      ]),
      reviews: { ratingAvg: 4.9, ratingCount: 126 },
    });
    expect(JSON.stringify(body)).not.toMatch(/\+91|phone|lat|lng/i);
  });

  it('404s for unknown or paused chefs', async () => {
    expect((await get('/v1/chefs/nobody')).status).toBe(404);
    expect((await get('/v1/chefs/arjun-rao')).status).toBe(404);
  });
});

describe('GET /v1/chefs/:id/menus', () => {
  it('returns live menus in order with the full Gujarati Classic structure', async () => {
    type Menus = {
      items: {
        name: string;
        courses: { options: unknown[] }[];
        addons: unknown[];
        bands: unknown[];
      }[];
    };
    const { body } = await get<Menus>('/v1/chefs/chef_ananya/menus');
    expect(body.items.map((m) => m.name)).toEqual([
      'Gujarati Classic',
      'Festive Thali',
      'Everyday Home-style',
    ]);
    const classic = body.items[0]!;
    expect(classic.bands).toHaveLength(3);
    expect(classic.courses).toHaveLength(6);
    expect(classic.courses.flatMap((c) => c.options)).toHaveLength(17);
    expect(classic.addons).toHaveLength(5);
  });

  it('404s for a paused chef', async () => {
    expect((await get('/v1/chefs/chef_arjun/menus')).status).toBe(404);
  });
});

describe('GET /v1/chefs/:id/reviews', () => {
  it('shows public guest reviews with a short name, newest first, paged', async () => {
    const base = Date.now() + 60_000;
    await db.insert(reviews).values([
      { id: 'rev_t1', bookingId: 'bk_sz1042', authorSide: 'guest', stars: 4, createdAt: base + 1 },
      { id: 'rev_t2', bookingId: 'bk_sz1042', authorSide: 'guest', stars: 5, createdAt: base + 2 },
      {
        id: 'rev_private',
        bookingId: 'bk_sz1042',
        authorSide: 'chef',
        stars: 3,
        isPrivate: true,
        createdAt: base + 3,
      },
    ]);

    type Reviews = {
      items: { id: string; author: string; guests: number }[];
      nextCursor: string | null;
    };
    const first = (await get<Reviews>('/v1/chefs/chef_ananya/reviews?limit=2')).body;
    expect(first.items.map((r) => r.id)).toEqual(['rev_t2', 'rev_t1']);
    expect(first.items[0]).toMatchObject({ author: 'Rahul D.', guests: 6 });

    const rest = (
      await get<Reviews>(`/v1/chefs/chef_ananya/reviews?limit=2&cursor=${first.nextCursor}`)
    ).body;
    expect(rest.items.map((r) => r.id)).toEqual(['rev_sz1042_guest']);
    expect(rest.nextCursor).toBeNull();

    const booked = await db.select().from(bookings).where(eq(bookings.id, 'bk_sz1042')).get();
    expect(booked?.chefId).toBe('chef_ananya');
  });
});

describe('shortName', () => {
  it.each([
    ['Rahul Desai', 'Rahul D.'],
    ['Krupa', 'Krupa'],
    [null, 'Guest'],
    ['  ', 'Guest'],
  ])('%s → %s', (input, out) => {
    expect(shortName(input)).toBe(out);
  });
});
