import { env } from 'cloudflare:workers';
import { beforeAll, describe, expect, it } from 'vitest';
import { seed } from '../../../seed';
import * as data from '../../../seed/data';
import { createApp } from '../../app';
import { createDb } from '../../db';
import { availability, bookings } from '../../db/schema';
import { slotStartsAt } from '../../lib/time';
import { slotStatus } from './rules';
import { assertSlotOpen, chefMonth } from './service';

const db = createDb(env.DB);
const app = createApp();
// 1 Dec 2026 IST, before any December slot.
const NOW = Date.parse('2026-11-30T18:30:00Z');
const day = <T extends { date: string }>(days: T[], date: string) =>
  days.find((d) => d.date === date)!;

beforeAll(async () => {
  await seed(db);
  const template = data.bookings.find((b) => b.code === 'SZ-1048')!;
  await db.insert(bookings).values([
    {
      ...template,
      id: 'bk_av_1',
      code: 'SZ-AV1',
      date: '2026-12-05',
      slot: 'dinner',
      state: 'confirmed',
    },
    {
      ...template,
      id: 'bk_av_2',
      code: 'SZ-AV2',
      date: '2026-12-06',
      slot: 'dinner',
      state: 'cancelled',
    },
  ]);
  await db.insert(availability).values([
    { chefId: 'chef_ananya', date: '2026-12-07', slot: 'dinner', state: 'open' },
    { chefId: 'chef_ananya', date: '2026-12-10', slot: 'lunch', state: 'off' },
  ]);
});

describe('chefMonth', () => {
  it('follows the weekly pattern: Ananya cooks Thursday to Sunday', async () => {
    const { days } = await chefMonth(db, 'chef_ananya', '2026-12', NOW);
    expect(days).toHaveLength(31);
    expect(day(days, '2026-12-03').open).toBe(true); // Thursday
    expect(day(days, '2026-12-08')).toMatchObject({
      open: false,
      slots: { lunch: 'off', dinner: 'off', late: 'off' },
    }); // Tuesday
  });

  it('marks active bookings as booked and ignores cancelled ones', async () => {
    const { days } = await chefMonth(db, 'chef_ananya', '2026-12', NOW);
    expect(day(days, '2026-12-05').slots.dinner).toBe('booked');
    expect(day(days, '2026-12-06').slots.dinner).toBe('open');
  });

  it('applies the chef’s one-off choices over the weekly pattern', async () => {
    const { days } = await chefMonth(db, 'chef_ananya', '2026-12', NOW);
    expect(day(days, '2026-12-07').slots).toEqual({ lunch: 'off', dinner: 'open', late: 'off' }); // Monday
    expect(day(days, '2026-12-10').slots.lunch).toBe('off'); // Thursday
  });

  it('closes slots that have started', () => {
    const inputs = {
      chefLive: true,
      weekly: new Map([[6, ['dinner' as const]]]),
      overrides: new Map(),
      busy: new Set<string>(),
    };
    const start = slotStartsAt('2026-12-05', 'dinner');
    expect(slotStatus('2026-12-05', 'dinner', { ...inputs, now: start - 1 })).toBe('open');
    expect(slotStatus('2026-12-05', 'dinner', { ...inputs, now: start })).toBe('off');
    expect(slotStatus('2026-12-05', 'dinner', { ...inputs, chefLive: false, now: 0 })).toBe('off');
  });
});

describe('assertSlotOpen', () => {
  it('says why a slot can’t be booked', async () => {
    await expect(
      assertSlotOpen(db, 'chef_ananya', '2026-12-05', 'dinner', NOW),
    ).rejects.toMatchObject({
      code: 'SLOT_TAKEN',
    });
    await expect(
      assertSlotOpen(db, 'chef_ananya', '2026-12-08', 'dinner', NOW),
    ).rejects.toMatchObject({
      code: 'SLOT_UNAVAILABLE',
    });
    await expect(
      assertSlotOpen(db, 'chef_ananya', '2026-12-12', 'dinner', NOW),
    ).resolves.toBeUndefined();
  });
});

describe('GET /v1/chefs/:id/availability', () => {
  it('returns the month and validates the query', async () => {
    const ok = await app.request('/v1/chefs/chef_ananya/availability?month=2027-01', {}, env);
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { days: unknown[] }).days).toHaveLength(31);

    expect(
      (await app.request('/v1/chefs/chef_ananya/availability?month=2027-13', {}, env)).status,
    ).toBe(400);
    expect((await app.request('/v1/chefs/nobody/availability?month=2027-01', {}, env)).status).toBe(
      404,
    );
  });
});
