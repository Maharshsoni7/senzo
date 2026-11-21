import type { ListChefsParams } from '@senzo/api-client';
import { create } from 'zustand';

export type Meal = 'lunch' | 'dinner' | 'late';
export type FoodRule = 'jain' | 'no_onion_garlic';

export type Filters = {
  date: string | null;
  meal: Meal | null;
  guests: number | null;
  cuisines: string[];
  rule: FoodRule | null;
};

const EMPTY: Filters = { date: null, meal: null, guests: null, cuisines: [], rule: null };

export const useFilters = create<
  Filters & { set: (patch: Partial<Filters>) => void; clear: () => void }
>((set) => ({
  ...EMPTY,
  set: (patch) => set(patch),
  clear: () => set(EMPTY),
}));

/** Guest buckets from G06; the API needs one count, so each bucket sends its lower bound. */
export const GUEST_BUCKETS = [
  { label: '2–4', guests: 2 },
  { label: '5–8', guests: 5 },
  { label: '9–15', guests: 9 },
  { label: '16+', guests: 16 },
] as const;

export const CUISINES = [
  'Gujarati',
  'Kathiyawadi',
  'Surti',
  'North Indian',
  'South Indian',
  'Pan-Asian',
  'Desserts',
] as const;

export function activeCount(f: Filters) {
  return [f.date, f.meal, f.guests, f.rule].filter((v) => v !== null).length + f.cuisines.length;
}

/** Date and meal only filter together (the API needs both). */
export function toParams(f: Filters, q?: string): ListChefsParams {
  return {
    ...(q ? { q } : {}),
    ...(f.date && f.meal ? { date: f.date, slot: f.meal } : {}),
    ...(f.guests ? { guests: f.guests } : {}),
    ...(f.cuisines.length ? { cuisine: f.cuisines.join(',') } : {}),
    ...(f.rule ? { rule: f.rule } : {}),
    limit: 50,
  };
}

const IST = 'Asia/Kolkata';
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(d);

export const prettyDate = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));

/** Today, tomorrow and the coming Saturday and Sunday, as IST dates. */
export function dateChoices(now = new Date()) {
  const day = (offset: number) => ymd(new Date(now.getTime() + offset * 86_400_000));
  const weekday = new Date(`${day(0)}T00:00:00Z`).getUTCDay();
  const toSat = (6 - weekday + 7) % 7 || 7;
  const choices = [day(0), day(1), day(toSat), day(toSat + 1)];
  return [...new Set(choices)];
}
