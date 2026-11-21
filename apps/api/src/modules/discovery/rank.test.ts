import { describe, expect, it } from 'vitest';
import { score } from './rank';

const base = {
  distanceKm: 2,
  serviceRadiusKm: 10,
  ratingAvg: 4.8,
  acceptRate: 0.9,
  replyMinutesP50: 15,
};

describe('score', () => {
  it('prefers closer, better-rated, more responsive chefs', () => {
    expect(score(base)).toBeGreaterThan(score({ ...base, distanceKm: 8 }));
    expect(score(base)).toBeGreaterThan(score({ ...base, ratingAvg: 4.2 }));
    expect(score(base)).toBeGreaterThan(score({ ...base, acceptRate: 0.5 }));
    expect(score(base)).toBeGreaterThan(score({ ...base, replyMinutesP50: 90 }));
  });

  it('gives chefs with no history a neutral middle score', () => {
    const fresh = {
      distanceKm: null,
      serviceRadiusKm: null,
      ratingAvg: null,
      acceptRate: null,
      replyMinutesP50: null,
    };
    expect(score(fresh)).toBeCloseTo(0.5);
  });

  it('stays within 0–1 for out-of-range inputs', () => {
    const s = score({ ...base, distanceKm: 99, replyMinutesP50: 999 });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});
