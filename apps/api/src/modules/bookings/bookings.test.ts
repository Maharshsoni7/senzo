import { env } from 'cloudflare:workers';
import { sign } from 'hono/jwt';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { seed } from '../../../seed';
import { createApp } from '../../app';
import { createDb } from '../../db';
import { dueOtpKind } from './otp';
import { scopeOf } from './service';
import { transition } from './transition';

const db = createDb(env.DB);
const app = createApp();
const NOW = Date.parse('2026-11-22T06:00:00Z');

const tokenFor = (userId: string) =>
  sign({ sub: userId, sid: `ses_${userId}`, iat: 0, exp: 4_000_000_000 }, env.JWT_SECRET, 'HS256');

async function get<T = Record<string, unknown>>(path: string, userId?: string) {
  const headers: Record<string, string> = userId
    ? { Authorization: `Bearer ${await tokenFor(userId)}` }
    : {};
  const res = await app.request(path, { headers }, env);
  return { status: res.status, body: (await res.json()) as T };
}

type Summary = {
  id: string;
  code: string;
  state: string;
  otp: { kind: string; code: string } | null;
};
type List = { items: Summary[]; nextCursor: string | null };
type Detail = Summary & {
  subStatus: string | null;
  startsAt: string;
  etaMinutes: number | null;
  onTheWayAt: string | null;
  address: { area: string | null };
  items: { course: string | null; dishName: string }[];
  price: { menuTotalPaise: number; totalPaise: number };
};
const codes = (l: List) => l.items.map((b) => b.code);

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  await seed(db);
});
afterAll(() => vi.useRealTimers());

describe('GET /v1/bookings', () => {
  it('needs a signed-in guest', async () => {
    expect((await get('/v1/bookings')).status).toBe(401);
  });

  it('lists coming up soonest first, including a decline whose slot has not passed', async () => {
    const { status, body } = await get<List>('/v1/bookings', 'usr_rahul');
    expect(status).toBe(200);
    expect(codes(body)).toEqual(['SZ-1050', 'SZ-1051']);
    expect(body.items[1]!.otp).toMatchObject({
      kind: 'start',
      code: expect.stringMatching(/^\d{4}$/),
    });
    expect(body.items[0]!.otp).toBeNull();
  });

  it('lists past bookings, most recent first', async () => {
    const { body } = await get<List>('/v1/bookings?scope=past', 'usr_rahul');
    expect(codes(body)).toEqual(['SZ-1042']);
    expect(body.items[0]!.otp).toBeNull();
  });

  it("shows only the caller's bookings", async () => {
    expect(codes((await get<List>('/v1/bookings', 'usr_krupa')).body)).toEqual([
      'SZ-1048',
      'SZ-1052',
    ]);
    expect(codes((await get<List>('/v1/bookings?scope=past', 'usr_krupa')).body)).toEqual([]);
  });

  it('pages with a cursor', async () => {
    const first = await get<List>('/v1/bookings?limit=1', 'usr_rahul');
    expect(codes(first.body)).toEqual(['SZ-1050']);
    const second = await get<List>(
      `/v1/bookings?limit=1&cursor=${first.body.nextCursor}`,
      'usr_rahul',
    );
    expect(codes(second.body)).toEqual(['SZ-1051']);
    expect(second.body.nextCursor).toBeNull();
  });

  it('rejects a bad cursor or scope', async () => {
    expect((await get('/v1/bookings?cursor=!!', 'usr_rahul')).status).toBe(400);
    expect((await get('/v1/bookings?scope=all', 'usr_rahul')).status).toBe(400);
  });
});

describe('GET /v1/bookings/:id', () => {
  it("is 404 for another guest's booking", async () => {
    expect((await get('/v1/bookings/bk_sz1051', 'usr_krupa')).status).toBe(404);
    expect((await get('/v1/bookings/bk_nope', 'usr_rahul')).status).toBe(404);
  });

  it('returns the menu, address area, price and the same start code every time', async () => {
    const a = await get<Detail>('/v1/bookings/bk_sz1051', 'usr_rahul');
    const b = await get<Detail>('/v1/bookings/bk_sz1051', 'usr_rahul');
    expect(a.status).toBe(200);
    expect(a.body.items).toHaveLength(6);
    expect(a.body.address.area).toBe('Prahlad Nagar');
    expect(a.body.price.menuTotalPaise).toBe(1_080_000);
    expect(a.body.startsAt).toBe('2026-12-19T14:00:00.000Z');
    expect(a.body.otp!.code).toBe(b.body.otp!.code);
  });

  it('follows the job: on my way with ETA, then the finish code once the chef is done', async () => {
    const start = (await get<Detail>('/v1/bookings/bk_sz1051', 'usr_rahul')).body.otp!;
    const onTheWay = Date.parse('2026-12-19T13:00:00Z');
    vi.setSystemTime(onTheWay);
    await transition(db, 'bk_sz1051', { type: 'on_my_way', etaMinutes: 30 }, { kind: 'chef' });

    const travelling = (await get<Detail>('/v1/bookings/bk_sz1051', 'usr_rahul')).body;
    expect(travelling).toMatchObject({ subStatus: 'on_the_way', etaMinutes: 30, otp: start });
    expect(travelling.onTheWayAt).toBe(new Date(onTheWay).toISOString());

    await transition(db, 'bk_sz1051', { type: 'job_started' }, { kind: 'chef' });
    expect((await get<Detail>('/v1/bookings/bk_sz1051', 'usr_rahul')).body.otp).toBeNull();

    await transition(db, 'bk_sz1051', { type: 'job_done' }, { kind: 'chef' });
    const done = (await get<Detail>('/v1/bookings/bk_sz1051', 'usr_rahul')).body;
    expect(done.otp).toMatchObject({ kind: 'finish' });
    expect(done.otp!.code).not.toBe(start.code);
  });
});

describe('rules', () => {
  const day = 86_400_000;
  it('keeps active bookings upcoming and ended ones past once their slot passes', () => {
    expect(scopeOf('confirmed', NOW - day, NOW)).toBe('upcoming');
    expect(scopeOf('declined', NOW + day, NOW)).toBe('upcoming');
    expect(scopeOf('declined', NOW - day, NOW)).toBe('past');
    expect(scopeOf('completed', NOW + day, NOW)).toBe('past');
  });

  it('shows the start code while confirmed and the finish code only after "done"', () => {
    expect(dueOtpKind('requested', null)).toBeNull();
    expect(dueOtpKind('confirmed', 'possible_no_show')).toBe('start');
    expect(dueOtpKind('in_progress', null)).toBeNull();
    expect(dueOtpKind('in_progress', 'awaiting_finish')).toBe('finish');
    expect(dueOtpKind('completed', null)).toBeNull();
  });
});
