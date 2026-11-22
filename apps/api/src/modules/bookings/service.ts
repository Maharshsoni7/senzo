import type { BookingListQuery, BookingScope, BookingState } from '@senzo/schemas';
import type { Db } from '../../db';
import { AppError } from '../../lib/errors';
import { slotStartsAt } from '../../lib/time';
import { dueOtpKind, jobOtpCode } from './otp';
import * as repo from './repo';

type SummaryRow = Awaited<ReturnType<typeof repo.guestBookings>>[number];

const ACTIVE: BookingState[] = ['requested', 'confirmed', 'in_progress'];
/** Shown under "coming up" until their slot passes, so the guest sees the refund (G11, G17). */
const ENDED_EARLY: BookingState[] = ['declined', 'cancelled'];

export function scopeOf(state: BookingState, startsAt: number, now: number): BookingScope {
  if (ACTIVE.includes(state)) return 'upcoming';
  if (ENDED_EARLY.includes(state) && startsAt > now) return 'upcoming';
  return 'past';
}

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

async function toSummary(row: SummaryRow, pepper: string) {
  const b = row.booking;
  const otpKind = dueOtpKind(b.state, b.subStatus);
  return {
    id: b.id,
    code: b.code,
    state: b.state,
    subStatus: b.subStatus,
    date: b.date,
    slot: b.slot,
    startsAt: new Date(slotStartsAt(b.date, b.slot)).toISOString(),
    guests: b.guests,
    chef: { id: b.chefId, slug: row.chefSlug, displayName: row.chefName },
    menuName: row.menuName,
    totalPaise: b.totalPaise,
    otp: otpKind ? { kind: otpKind, code: await jobOtpCode(pepper, b.id, otpKind) } : null,
  };
}

const encodeCursor = (offset: number) => btoa(String(offset)).replace(/=+$/, '');
function decodeCursor(cursor: string) {
  let offset: number;
  try {
    offset = Number(atob(cursor));
  } catch {
    offset = NaN;
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new AppError('VALIDATION_FAILED', 400, 'Bad cursor', { cursor: ['Bad cursor'] });
  }
  return offset;
}

/** Upcoming soonest first; past most recent first. */
export async function listGuestBookings(
  db: Db,
  pepper: string,
  guestId: string,
  q: BookingListQuery,
  now = Date.now(),
) {
  const rows = (await repo.guestBookings(db, guestId))
    .map((row) => ({ row, startsAt: slotStartsAt(row.booking.date, row.booking.slot) }))
    .filter(({ row, startsAt }) => scopeOf(row.booking.state, startsAt, now) === q.scope)
    .sort((a, b) =>
      q.scope === 'upcoming'
        ? a.startsAt - b.startsAt || a.row.booking.id.localeCompare(b.row.booking.id)
        : b.startsAt - a.startsAt || b.row.booking.id.localeCompare(a.row.booking.id),
    );

  const offset = q.cursor ? decodeCursor(q.cursor) : 0;
  const page = rows.slice(offset, offset + q.limit);
  return {
    items: await Promise.all(page.map(({ row }) => toSummary(row, pepper))),
    nextCursor: offset + q.limit < rows.length ? encodeCursor(offset + q.limit) : null,
  };
}

export async function getGuestBooking(db: Db, pepper: string, guestId: string, bookingId: string) {
  const row = await repo.guestBooking(db, guestId, bookingId);
  if (!row) throw new AppError('NOT_FOUND', 404, 'Booking not found');
  const b = row.booking;
  return {
    ...(await toSummary(row, pepper)),
    foodRule: b.foodRule,
    groceriesBy: b.groceriesBy,
    etaMinutes: b.subStatus === 'on_the_way' ? b.etaMinutes : null,
    onTheWayAt: b.subStatus === 'on_the_way' ? iso(row.onTheWayAt) : null,
    startedAt: iso(b.startedAt),
    doneAt: iso(b.doneAt),
    completedAt: iso(b.completedAt),
    cancelledBy: b.cancelledBy,
    address: { label: row.address.label, line1: row.address.line1, area: row.address.area },
    items: row.items,
    price: {
      menuTotalPaise: b.menuTotalPaise,
      convenienceFeePaise: b.convenienceFeePaise,
      feeGstPaise: b.feeGstPaise,
      promoPaise: b.promoPaise,
      walletPaise: b.walletPaise,
      totalPaise: b.totalPaise,
    },
  };
}
