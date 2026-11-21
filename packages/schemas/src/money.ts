import { z } from 'zod';

export const Paise = z.number().int();
export type Paise = z.infer<typeof Paise>;

export function rupeesToPaise(rupees: number): Paise {
  if (!Number.isInteger(rupees)) throw new RangeError(`rupees must be whole: ${rupees}`);
  return rupees * 100;
}

/** Rounds half away from zero to the nearest paisa. 1800 bps = 18%. */
export function percentOf(amount: Paise, basisPoints: number): Paise {
  const raw = (amount * basisPoints) / 10_000;
  return Math.sign(raw) * Math.round(Math.abs(raw));
}

const whole = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const withPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

export function formatINR(amount: Paise): string {
  return amount % 100 === 0 ? whole.format(amount / 100) : withPaise.format(amount / 100);
}
