import { Slot } from '@senzo/schemas';
import { slotStartsAt } from '../../lib/time';

export type SlotStatus = 'open' | 'booked' | 'off';

export type AvailabilityInput = {
  month: string;
  chefLive: boolean;
  /** Weekday (0 = Sunday) → slots the chef cooks by default. */
  weekly: Map<number, Slot[]>;
  /** `${date}:${slot}` → the chef's one-off choice for that slot. */
  overrides: Map<string, 'open' | 'off'>;
  /** `${date}:${slot}` held by an active booking or a checkout in progress. */
  busy: Set<string>;
  now: number;
};

export function daysInMonth(month: string) {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

/** Booked beats everything; past slots and non-live chefs are off; a one-off choice beats the weekly pattern. */
export function slotStatus(
  date: string,
  slot: Slot,
  i: Omit<AvailabilityInput, 'month'>,
): SlotStatus {
  const key = `${date}:${slot}`;
  if (i.busy.has(key)) return 'booked';
  if (!i.chefLive || slotStartsAt(date, slot) <= i.now) return 'off';
  const override = i.overrides.get(key);
  if (override) return override;
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return i.weekly.get(weekday)?.includes(slot) ? 'open' : 'off';
}

export function monthAvailability(i: AvailabilityInput) {
  return daysInMonth(i.month).map((date) => {
    const slots = Object.fromEntries(
      Slot.options.map((s) => [s, slotStatus(date, s, i)]),
    ) as Record<Slot, SlotStatus>;
    return { date, open: Object.values(slots).includes('open'), slots };
  });
}
