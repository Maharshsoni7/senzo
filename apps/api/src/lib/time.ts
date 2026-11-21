import type { Slot } from '@senzo/schemas';

const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;
export const HOUR = 3_600_000;

/** Serving time in IST (business rules §3). */
const SLOT_START_IST: Record<Slot, [number, number]> = {
  lunch: [12, 30],
  dinner: [19, 30],
  late: [21, 30],
};

/** UTC epoch ms when a booking's slot starts; `date` is the IST calendar date. */
export function slotStartsAt(date: string, slot: Slot) {
  const [h, m] = SLOT_START_IST[slot];
  return Date.parse(`${date}T00:00:00Z`) + (h * 60 + m) * 60_000 - IST_OFFSET_MS;
}

export function istDate(epochMs: number) {
  return new Date(epochMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}
