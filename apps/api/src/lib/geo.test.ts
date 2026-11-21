import { describe, expect, it } from 'vitest';
import { distanceKm } from './geo';

describe('distanceKm', () => {
  it('measures Bodakdev to Prahlad Nagar (~3.2 km)', () => {
    expect(distanceKm(23.04, 72.51, 23.012, 72.511)).toBeCloseTo(3.1, 0);
  });

  it('is zero for the same point', () => {
    expect(distanceKm(23, 72, 23, 72)).toBe(0);
  });
});
