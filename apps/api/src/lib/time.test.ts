import { describe, expect, it } from 'vitest';
import { istDate, slotStartsAt } from './time';

describe('time', () => {
  it('converts IST slot times to UTC', () => {
    expect(new Date(slotStartsAt('2026-11-07', 'dinner')).toISOString()).toBe(
      '2026-11-07T14:00:00.000Z',
    );
    expect(new Date(slotStartsAt('2026-11-07', 'lunch')).toISOString()).toBe(
      '2026-11-07T07:00:00.000Z',
    );
    expect(new Date(slotStartsAt('2026-11-07', 'late')).toISOString()).toBe(
      '2026-11-07T16:00:00.000Z',
    );
  });

  it('gives the IST calendar date', () => {
    expect(istDate(Date.parse('2026-11-07T18:29:59Z'))).toBe('2026-11-07');
    expect(istDate(Date.parse('2026-11-07T18:30:00Z'))).toBe('2026-11-08');
  });
});
