import { env } from 'cloudflare:workers';
import { and, eq } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { seed } from '../../../seed';
import { createApp } from '../../app';
import { createDb } from '../../db';
import { chefs, jobChecks, jobOtps } from '../../db/schema';
import { addressUnlocked, partnerScopeOf } from './service';

const db = createDb(env.DB);
const app = createApp();

const tokenFor = (userId: string) =>
  sign({ sub: userId, sid: `ses_${userId}`, iat: 0, exp: 4_000_000_000 }, env.JWT_SECRET, 'HS256');

async function call<T = Record<string, unknown>>(
  method: 'GET' | 'POST',
  path: string,
  userId?: string,
  body?: unknown,
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (userId) headers.Authorization = `Bearer ${await tokenFor(userId)}`;
  const res = await app.request(
    path,
    { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) },
    env,
  );
  return { status: res.status, body: (await res.json()) as T };
}
const ananya = (method: 'GET' | 'POST', path: string, body?: unknown) =>
  call<Detail>(method, `/v1/partner/bookings${path}`, 'usr_ananya', body);

type Detail = {
  code: string;
  state: string;
  subStatus: string | null;
  guestName: string;
  acceptBy: string | null;
  earningsPaise: number;
  foodProfile: { allergies: string[]; jainCount: number | null };
  address: { unlocked: boolean; area: string; line1: string | null; lat: number | null };
  detail?: string;
};
type List = { items: Detail[]; nextCursor: string | null };
type GuestBooking = { otp: { kind: string; code: string } | null; state: string };

const guestOtp = async (bookingId: string, guest: string) =>
  (await call<GuestBooking>('GET', `/v1/bookings/${bookingId}`, guest)).body.otp!.code;
const wrong = (code: string) => (code === '0000' ? '1111' : '0000');
const at = (iso: string) => vi.setSystemTime(Date.parse(iso));

// Rahul's home (seed) and a point ~10 km away.
const RAHUL_HOME = { lat: 23.012, lng: 72.511 };
const FAR = { lat: 23.1, lng: 72.55 };

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  at('2026-11-22T06:00:00Z');
  await seed(db);
});
afterAll(() => vi.useRealTimers());

describe('access', () => {
  it('needs a signed-in chef', async () => {
    expect((await call('GET', '/v1/partner/bookings')).status).toBe(401);
    expect((await call('GET', '/v1/partner/bookings', 'usr_rahul')).status).toBe(403);
  });

  it("is 404 for another chef's booking", async () => {
    expect((await call('GET', '/v1/partner/bookings/bk_sz1052', 'usr_rohan')).status).toBe(404);
  });
});

describe('requests (C04, C05)', () => {
  it('lists requests by answer deadline, with earnings and the guest’s short name', async () => {
    const { status, body } = await call<List>(
      'GET',
      '/v1/partner/bookings?scope=requests',
      'usr_ananya',
    );
    expect(status).toBe(200);
    expect(body.items.map((b) => b.code)).toEqual(['SZ-1048', 'SZ-1052']);
    expect(body.items[1]).toMatchObject({
      guestName: 'Krupa S.',
      acceptBy: '2026-11-22T06:01:00.000Z',
      earningsPaise: 1_185_120,
    });
  });

  it('shows allergies and the area, but not the street, before accepting', async () => {
    const { body } = await ananya('GET', '/bk_sz1052');
    expect(body.foodProfile).toMatchObject({ allergies: ['peanut'], jainCount: 4 });
    expect(body.address).toMatchObject({
      unlocked: false,
      area: 'Satellite',
      line1: null,
      lat: null,
    });
  });

  it('needs the allergy tick, and a live profile, to accept', async () => {
    expect((await ananya('POST', '/bk_sz1052/accept', {})).status).toBe(400);
    await db.update(chefs).set({ status: 'paused' }).where(eq(chefs.id, 'chef_ananya'));
    expect((await ananya('POST', '/bk_sz1052/accept', { allergiesAck: true })).status).toBe(403);
    await db.update(chefs).set({ status: 'live' }).where(eq(chefs.id, 'chef_ananya'));
  });

  it('accepting unlocks the address and gives the guest a start code', async () => {
    const { status, body } = await ananya('POST', '/bk_sz1052/accept', { allergiesAck: true });
    expect(status).toBe(200);
    expect(body.state).toBe('confirmed');
    expect(body.address).toMatchObject({ unlocked: true, line1: 'Satellite' });
    const row = await db
      .select()
      .from(jobOtps)
      .where(and(eq(jobOtps.bookingId, 'bk_sz1052'), eq(jobOtps.kind, 'start')))
      .get();
    expect(row?.codeHash).toBeTruthy();
    expect(row?.codeHash).not.toContain(await guestOtp('bk_sz1052', 'usr_krupa'));
  });

  it('declines once; a second answer is a conflict', async () => {
    expect((await ananya('POST', '/bk_sz1048/decline', { reason: 'Away' })).body.state).toBe(
      'declined',
    );
    expect((await ananya('POST', '/bk_sz1048/accept', { allergiesAck: true })).status).toBe(409);
  });
});

describe('the job (C13, C06, C07, C08) on SZ-1051, dinner 19 Dec, arrive by 5:30 PM IST', () => {
  it('"on my way" opens 4 hours before arrival', async () => {
    at('2026-12-19T07:00:00Z');
    expect((await ananya('POST', '/bk_sz1051/on-my-way', { etaMinutes: 30 })).status).toBe(409);
    at('2026-12-19T11:00:00Z');
    const { body } = await ananya('POST', '/bk_sz1051/on-my-way', { etaMinutes: 30 });
    expect(body.subStatus).toBe('on_the_way');
  });

  it('the start code works from 1 hour before arrival', async () => {
    at('2026-12-19T10:30:00Z');
    const code = await guestOtp('bk_sz1051', 'usr_rahul');
    const early = await ananya('POST', '/bk_sz1051/start', { otp: code, ...RAHUL_HOME });
    expect(early.status).toBe(422);
    expect(early.body.detail).toMatch(/works from 4:30/);
  });

  it('counts a wrong code, then starts with the right one and records the distance', async () => {
    at('2026-12-19T11:50:00Z');
    const code = await guestOtp('bk_sz1051', 'usr_rahul');
    const miss = await ananya('POST', '/bk_sz1051/start', { otp: wrong(code), ...RAHUL_HOME });
    expect(miss.status).toBe(422);
    expect(miss.body.detail).toBe('Wrong code. 4 tries left');

    const ok = await ananya('POST', '/bk_sz1051/start', { otp: code, ...FAR });
    expect(ok.status).toBe(200);
    expect(ok.body.state).toBe('in_progress');
    const check = await db
      .select()
      .from(jobChecks)
      .where(eq(jobChecks.bookingId, 'bk_sz1051'))
      .get();
    expect(check?.distanceM).toBeGreaterThan(300);
  });

  it('"done" creates the finish code; the right code completes the job', async () => {
    at('2026-12-19T15:30:00Z');
    expect((await ananya('POST', '/bk_sz1051/finish', { otp: '1234' })).status).toBe(409);

    const done = await ananya('POST', '/bk_sz1051/done');
    expect(done.body.subStatus).toBe('awaiting_finish');
    const code = await guestOtp('bk_sz1051', 'usr_rahul');
    expect(
      (await call<GuestBooking>('GET', '/v1/bookings/bk_sz1051', 'usr_rahul')).body.otp,
    ).toMatchObject({ kind: 'finish' });

    expect((await ananya('POST', '/bk_sz1051/finish', { otp: wrong(code) })).status).toBe(422);
    const finished = await ananya('POST', '/bk_sz1051/finish', { otp: code });
    expect(finished.body.state).toBe('completed');
    expect(
      (await call<GuestBooking>('GET', '/v1/bookings/bk_sz1051', 'usr_rahul')).body.otp,
    ).toBeNull();
  });

  it('hides the street again 24 hours after the job', async () => {
    at('2026-12-20T15:00:00Z');
    expect((await ananya('GET', '/bk_sz1051')).body.address.unlocked).toBe(true);
    at('2026-12-20T16:00:00Z');
    expect((await ananya('GET', '/bk_sz1051')).body.address).toMatchObject({
      unlocked: false,
      line1: null,
    });
  });
});

describe('start code lock (SZ-1052, lunch 20 Dec)', () => {
  it('locks after 5 wrong codes, even for the right one', async () => {
    at('2026-12-20T05:00:00Z');
    const code = await guestOtp('bk_sz1052', 'usr_krupa');
    const body = { otp: wrong(code), lat: 23.03, lng: 72.52 };
    for (let i = 0; i < 4; i++)
      expect((await ananya('POST', '/bk_sz1052/start', body)).status).toBe(422);
    expect((await ananya('POST', '/bk_sz1052/start', body)).status).toBe(423);
    expect((await ananya('POST', '/bk_sz1052/start', { ...body, otp: code })).status).toBe(423);
  });
});

describe('rules', () => {
  const base = { acceptedAt: 1, completedAt: null, date: '2026-12-19', slot: 'dinner' as const };
  const serving = Date.parse('2026-12-19T14:00:00Z');
  const day = 86_400_000;

  it('unlocks the address only after accepting and until 24 h after the job', () => {
    expect(addressUnlocked({ ...base, acceptedAt: null, state: 'requested' }, serving)).toBe(false);
    expect(addressUnlocked({ ...base, state: 'confirmed' }, serving)).toBe(true);
    expect(addressUnlocked({ ...base, state: 'cancelled' }, serving)).toBe(false);
    expect(
      addressUnlocked({ ...base, state: 'completed', completedAt: serving }, serving + day - 1),
    ).toBe(true);
    expect(
      addressUnlocked({ ...base, state: 'completed', completedAt: serving }, serving + day),
    ).toBe(false);
  });

  it('sorts bookings into the C04 tabs', () => {
    expect(partnerScopeOf('requested')).toBe('requests');
    expect(partnerScopeOf('in_progress')).toBe('upcoming');
    expect(partnerScopeOf('paid_out')).toBe('past');
  });
});
