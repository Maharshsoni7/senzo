import type { BookingSummary } from '@senzo/api-client';

export type Stage =
  | 'waiting'
  | 'booked'
  | 'on_the_way'
  | 'cooking'
  | 'done'
  | 'finished'
  | 'declined'
  | 'cancelled'
  | 'no_show'
  | 'in_review';

export function stageOf(b: Pick<BookingSummary, 'state' | 'subStatus'>): Stage {
  switch (b.state) {
    case 'requested':
      return 'waiting';
    case 'confirmed':
      return b.subStatus === 'on_the_way' ? 'on_the_way' : 'booked';
    case 'in_progress':
      return b.subStatus === 'awaiting_finish' ? 'done' : 'cooking';
    case 'completed':
    case 'paid_out':
      return 'finished';
    case 'declined':
      return 'declined';
    case 'no_show':
      return 'no_show';
    case 'disputed':
    case 'refunded':
      return 'in_review';
    default:
      return 'cancelled';
  }
}

/** Stages that change without the guest doing anything, so the screen polls. */
export const isLive = (s: Stage) =>
  s === 'waiting' || s === 'booked' || s === 'on_the_way' || s === 'cooking' || s === 'done';

/** Progress steps on G12; the mockup's "arrived" step has no server signal, so it's folded into "on the way". */
export const STEPS = ['on_the_way', 'cooking', 'done'] as const;
export function stepIndex(s: Stage) {
  if (s === 'on_the_way') return 0;
  if (s === 'cooking') return 1;
  if (s === 'done' || s === 'finished') return 2;
  return -1;
}

const ist = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...opts });
const dayFmt = ist({ weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = ist({ hour: 'numeric', minute: '2-digit', hour12: true });

/** "Sat, 19 Dec" in IST. */
export const dayLabel = (iso: string) => dayFmt.format(new Date(iso));
/** "7:30 pm" in IST. */
export const timeLabel = (iso: string | number) => timeFmt.format(new Date(iso));
