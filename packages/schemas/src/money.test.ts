import { describe, expect, it } from 'vitest';
import { formatINR, percentOf, rupeesToPaise } from './money';

describe('rupeesToPaise', () => {
  it('converts whole rupees', () => {
    expect(rupeesToPaise(149)).toBe(14_900);
  });

  it('rejects fractional rupees', () => {
    expect(() => rupeesToPaise(1.5)).toThrow(RangeError);
  });
});

describe('percentOf', () => {
  it('computes the 15% platform fee from the C08 example', () => {
    expect(percentOf(1_080_000, 1500)).toBe(162_000);
  });

  it('rounds 18% GST on ₹149 to the paisa', () => {
    expect(percentOf(14_900, 1800)).toBe(2682);
  });

  it('rounds half away from zero for negative amounts', () => {
    expect(percentOf(-5, 5000)).toBe(-3);
  });
});

describe('formatINR', () => {
  it('uses Indian digit grouping', () => {
    expect(formatINR(1_080_000)).toBe('₹10,800');
    expect(formatINR(10_000_000)).toBe('₹1,00,000');
  });

  it('shows paise only when present', () => {
    expect(formatINR(2682)).toBe('₹26.82');
  });
});
