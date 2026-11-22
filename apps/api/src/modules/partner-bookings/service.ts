import type { BookingState, PartnerBookingListQuery, PartnerBookingScope } from '@senzo/schemas';
import { JOB_OTP } from '../../config/policy';
import type { Db } from '../../db';
import { jobChecks } from '../../db/schema';
import type { Bindings } from '../../env';
import { AppError } from '../../lib/errors';
import { distanceKm } from '../../lib/geo';
import { log } from '../../lib/log';
import { slotStartsAt } from '../../lib/time';
import { arrivalAt } from '../bookings/machine';
import { checkJobOtp, finishWindow, jobOtpInsert, startWindow } from '../bookings/otp';
import { JOB_DONE, signalBooking } from '../bookings/signals';
import { transition } from '../bookings/transition';
import { shortName } from '../discovery/service';
import * as repo from './repo';

type Row = Awaited<ReturnType<typeof repo.chefBookings>>[number];

const ACCEPT_WINDOW_MS = 2 * 3_600_000;
const UPCOMING: BookingState[] = ['confirmed', 'in_progress'];
/** Flagged, not blocked (business rules §3); job_checks keeps the distance for ops. */
const ARRIVAL_FLAG_METRES = 300;

export function partnerScopeOf(state: BookingState): PartnerBookingScope {
  if (state === 'requested') return 'requests';
  return UPCOMING.includes(state) ? 'upcoming' : 'past';
}

/** Street and coordinates once accepted, until 24 h after the job. */
export function addressUnlocked(
  b: Pick<Row['booking'], 'acceptedAt' | 'state' | 'completedAt' | 'date' | 'slot'>,
  now: number,
) {
  if (b.acceptedAt === null || ['cancelled', 'declined'].includes(b.state)) return false;
  const jobEnd = b.completedAt ?? slotStartsAt(b.date, b.slot);
  return now < jobEnd + JOB_OTP.addressVisibleAfterJobMs;
}

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

function toSummary(row: Row) {
  const b = row.booking;
  return {
    id: b.id,
    code: b.code,
    state: b.state,
    subStatus: b.subStatus,
    date: b.date,
    slot: b.slot,
    startsAt: new Date(slotStartsAt(b.date, b.slot)).toISOString(),
    arriveBy: new Date(arrivalAt(b)).toISOString(),
    acceptBy:
      b.state === 'requested' && row.requestedAt !== null
        ? new Date(row.requestedAt + ACCEPT_WINDOW_MS).toISOString()
        : null,
    guests: b.guests,
    guestName: shortName(row.guestName),
    area: row.area,
    menuName: row.menuName,
    foodRule: b.foodRule,
    earningsPaise: b.chefSharePaise,
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

/** Requests by answer deadline, upcoming soonest first, past most recent first. */
export async function listChefBookings(db: Db, chefId: string, q: PartnerBookingListQuery) {
  const items = (await repo.chefBookings(db, chefId))
    .filter((row) => partnerScopeOf(row.booking.state) === q.scope)
    .map(toSummary)
    .sort((a, b) => {
      if (q.scope === 'requests') return (a.acceptBy ?? '').localeCompare(b.acceptBy ?? '');
      const byTime = a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id);
      return q.scope === 'past' ? -byTime : byTime;
    });
  const offset = q.cursor ? decodeCursor(q.cursor) : 0;
  return {
    items: items.slice(offset, offset + q.limit),
    nextCursor: offset + q.limit < items.length ? encodeCursor(offset + q.limit) : null,
  };
}

async function load(db: Db, chefId: string, bookingId: string) {
  const row = await repo.chefBooking(db, chefId, bookingId);
  if (!row) throw new AppError('NOT_FOUND', 404, 'Booking not found');
  return row;
}

export async function getChefBooking(db: Db, chefId: string, bookingId: string, now = Date.now()) {
  const row = await load(db, chefId, bookingId);
  const b = row.booking;
  const unlocked = addressUnlocked(b, now);
  const { address: a, profile } = row;
  return {
    ...toSummary(row),
    groceriesBy: b.groceriesBy,
    etaMinutes: b.subStatus === 'on_the_way' ? b.etaMinutes : null,
    allergiesAckAt: iso(b.allergiesAckAt),
    startedAt: iso(b.startedAt),
    doneAt: iso(b.doneAt),
    completedAt: iso(b.completedAt),
    items: row.items,
    foodProfile: {
      allergies: profile?.allergies ?? [],
      jainCount: profile?.rules.jainCount ?? null,
      noOnionGarlic: profile?.rules.noOnionGarlic ?? false,
      notes: profile?.notes ?? null,
    },
    kitchen: row.kitchen,
    address: {
      unlocked,
      area: a.area,
      city: a.city,
      line1: unlocked ? a.line1 : null,
      pincode: unlocked ? a.pincode : null,
      lat: unlocked ? a.lat : null,
      lng: unlocked ? a.lng : null,
    },
  };
}

const chef = (chefId: string) => ({ kind: 'chef' as const, id: chefId });

export async function acceptBooking(db: Db, env: Bindings, chefId: string, bookingId: string) {
  const { booking } = await load(db, chefId, bookingId);
  if ((await repo.chefStatus(db, chefId))?.status !== 'live') {
    throw new AppError('FORBIDDEN', 403, 'Your profile is not live, so you can’t take new jobs');
  }
  const startCode = await jobOtpInsert(
    db,
    env.OTP_PEPPER,
    bookingId,
    'start',
    startWindow(booking),
  );
  await transition(db, bookingId, { type: 'chef_accepted', allergiesAck: true }, chef(chefId), {
    with: [startCode.query],
  });
  return getChefBooking(db, chefId, bookingId);
}

export async function declineBooking(db: Db, chefId: string, bookingId: string, reason?: string) {
  await load(db, chefId, bookingId);
  await transition(db, bookingId, { type: 'chef_declined', reason }, chef(chefId));
  return getChefBooking(db, chefId, bookingId);
}

export async function onMyWay(db: Db, chefId: string, bookingId: string, etaMinutes: 15 | 30 | 45) {
  await load(db, chefId, bookingId);
  await transition(db, bookingId, { type: 'on_my_way', etaMinutes }, chef(chefId));
  return getChefBooking(db, chefId, bookingId);
}

export async function startJob(
  db: Db,
  env: Bindings,
  chefId: string,
  bookingId: string,
  input: { otp: string; lat: number; lng: number },
  now = Date.now(),
) {
  const { booking, address } = await load(db, chefId, bookingId);
  // Checked before the code so a wrong-state request doesn't burn a try.
  if (booking.state !== 'confirmed') {
    throw new AppError('INVALID_TRANSITION', 409, `Can't start a ${booking.state} booking`);
  }
  const markUsed = await checkJobOtp(
    db,
    env.OTP_PEPPER,
    bookingId,
    'start',
    input.otp,
    startWindow(booking),
    now,
  );
  const distanceM = Math.round(distanceKm(input.lat, input.lng, address.lat, address.lng) * 1000);
  if (distanceM > ARRIVAL_FLAG_METRES)
    log.warn('start code entered far from address', { bookingId, distanceM });
  await transition(db, bookingId, { type: 'job_started' }, chef(chefId), {
    now,
    with: [
      markUsed.query,
      db.insert(jobChecks).values({
        bookingId,
        kind: 'arrival',
        lat: input.lat,
        lng: input.lng,
        distanceM,
        at: now,
      }),
    ],
  });
  return getChefBooking(db, chefId, bookingId, now);
}

export async function markDone(
  db: Db,
  env: Bindings,
  chefId: string,
  bookingId: string,
  now = Date.now(),
) {
  await load(db, chefId, bookingId);
  const finishCode = await jobOtpInsert(db, env.OTP_PEPPER, bookingId, 'finish', finishWindow(now));
  await transition(db, bookingId, { type: 'job_done' }, chef(chefId), {
    now,
    with: [finishCode.query],
  });
  await signalBooking(env, bookingId, JOB_DONE);
  return getChefBooking(db, chefId, bookingId, now);
}

export async function finishJob(
  db: Db,
  env: Bindings,
  chefId: string,
  bookingId: string,
  otp: string,
  now = Date.now(),
) {
  const { booking } = await load(db, chefId, bookingId);
  if (booking.state !== 'in_progress' || booking.subStatus !== 'awaiting_finish') {
    throw new AppError('INVALID_TRANSITION', 409, 'Tap done before the finish code');
  }
  const markUsed = await checkJobOtp(
    db,
    env.OTP_PEPPER,
    bookingId,
    'finish',
    otp,
    finishWindow(booking.doneAt ?? now),
    now,
  );
  await transition(db, bookingId, { type: 'job_finished' }, chef(chefId), {
    now,
    with: [markUsed.query],
  });
  return getChefBooking(db, chefId, bookingId, now);
}
