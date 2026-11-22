import { ApiError, type PartnerBookingDetail, type PartnerBookingSummary } from '@senzo/api-client';
import type { Href } from 'expo-router';
import type { TFunction } from 'i18next';

const ist = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...opts });
const dayFmt = ist({ weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = ist({ hour: 'numeric', minute: '2-digit', hour12: true });

/** "Sun, 20 Dec" in IST. */
export const dayLabel = (iso: string) => dayFmt.format(new Date(iso));
/** "12:30 pm" in IST. */
export const timeLabel = (iso: string | number) => timeFmt.format(new Date(iso));

/** "1h 42m" until `iso`, or null once it has passed. */
export function timeLeft(iso: string, now = Date.now()) {
  const mins = Math.floor((Date.parse(iso) - now) / 60_000);
  if (mins <= 0) return null;
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

/** The screen a booking opens on, by where the job is. */
export function screenFor(b: Pick<PartnerBookingSummary, 'id' | 'state' | 'subStatus'>): Href {
  const params = { id: b.id };
  if (b.state === 'confirmed') {
    return b.subStatus === 'on_the_way'
      ? { pathname: '/job/[id]/start', params }
      : { pathname: '/job/[id]/on-my-way', params };
  }
  if (b.state === 'in_progress') {
    return b.subStatus === 'awaiting_finish'
      ? { pathname: '/job/[id]/finish', params }
      : { pathname: '/job/[id]/cooking', params };
  }
  if (b.state === 'completed' || b.state === 'paid_out') {
    return { pathname: '/job/[id]/finish', params };
  }
  return { pathname: '/request/[id]', params };
}

/** The API's `detail` explains guards ("Too early to start travelling"), so show it. */
export function jobErrorMessage(err: unknown, t: TFunction) {
  if (err instanceof ApiError && err.problem?.detail) return err.problem.detail;
  return t('common.errorBody');
}

/** "Allergies: peanut · 4 guests Jain" — what the chef must remember (C05, C07). */
export function foodRulesLine(b: PartnerBookingDetail, t: TFunction) {
  const p = b.foodProfile;
  return [
    p.allergies.length ? t('request.allergies', { list: p.allergies.join(', ') }) : null,
    p.jainCount ? t('request.jain', { count: p.jainCount }) : null,
    p.noOnionGarlic ? t('request.noOnionGarlic') : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
