import type { BookingState, BookingSubStatus, Slot } from '@senzo/schemas';
import { and, eq, sql } from 'drizzle-orm';
import { JOB_OTP } from '../../config/policy';
import type { Db } from '../../db';
import { jobOtps } from '../../db/schema';
import { hmacDigits, hmacSha256, safeEqual } from '../../lib/crypto';
import { AppError } from '../../lib/errors';
import { slotStartsAt } from '../../lib/time';
import { arrivalAt } from './machine';

type JobOtpKind = 'start' | 'finish';

/**
 * Job codes are derived, not stored: the guest must see the code, while `job_otps` keeps only
 * its hash (invariant 6) plus the try count and validity window.
 */
export const jobOtpCode = (pepper: string, bookingId: string, kind: JobOtpKind) =>
  hmacDigits(pepper, `job-otp:${bookingId}:${kind}`, 4);

const hashOf = (pepper: string, bookingId: string, kind: JobOtpKind, code: string) =>
  hmacSha256(pepper, `job-otp-hash:${bookingId}:${kind}:${code}`);

export function dueOtpKind(
  state: BookingState,
  subStatus: BookingSubStatus | null,
): JobOtpKind | null {
  if (state === 'confirmed') return 'start';
  if (state === 'in_progress' && subStatus === 'awaiting_finish') return 'finish';
  return null;
}

type Window = { validFrom: number; validTo: number };

export const startWindow = (b: { date: string; slot: Slot }): Window => ({
  validFrom: arrivalAt(b) - JOB_OTP.startOpensBeforeArrivalMs,
  validTo: slotStartsAt(b.date, b.slot) + JOB_OTP.startClosesAfterServingMs,
});

export const finishWindow = (doneAt: number): Window => ({
  validFrom: doneAt,
  validTo: doneAt + JOB_OTP.finishValidAfterDoneMs,
});

/**
 * Insert for the caller's batch; a repeat for the same booking + kind is ignored. Wrapped in an
 * object because awaiting a Drizzle query runs it.
 */
export async function jobOtpInsert(
  db: Db,
  pepper: string,
  bookingId: string,
  kind: JobOtpKind,
  window: Window,
) {
  const code = await jobOtpCode(pepper, bookingId, kind);
  const codeHash = await hashOf(pepper, bookingId, kind, code);
  return {
    query: db
      .insert(jobOtps)
      .values({ bookingId, kind, codeHash, ...window })
      .onConflictDoNothing(),
  };
}

const timeIST = (ms: number) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
  }).format(ms);

/**
 * Checks a typed code. A wrong code is counted at once (outside any batch) so retries can't
 * dodge the limit. Returns the statement that marks the code used, for the transition batch.
 */
export async function checkJobOtp(
  db: Db,
  pepper: string,
  bookingId: string,
  kind: JobOtpKind,
  typed: string,
  fallbackWindow: Window,
  now: number,
) {
  // Bookings accepted before codes were stored (seed data) get their row on first use.
  await (
    await jobOtpInsert(db, pepper, bookingId, kind, fallbackWindow)
  ).query;
  const row = await db
    .select()
    .from(jobOtps)
    .where(and(eq(jobOtps.bookingId, bookingId), eq(jobOtps.kind, kind)))
    .get();
  if (!row) throw new AppError('INTERNAL', 500);

  if (row.usedAt !== null) throw new AppError('INVALID_TRANSITION', 409, 'Code already used');
  if (row.attempts >= JOB_OTP.maxAttempts) {
    throw new AppError('OTP_LOCKED', 423, 'Too many wrong codes; call support');
  }
  if (now < row.validFrom) {
    throw new AppError('OTP_INVALID', 422, `The code works from ${timeIST(row.validFrom)}`);
  }
  if (now > row.validTo) throw new AppError('OTP_INVALID', 422, 'This code has expired');

  if (!safeEqual(await hashOf(pepper, bookingId, kind, typed), row.codeHash)) {
    await db
      .update(jobOtps)
      .set({ attempts: sql`${jobOtps.attempts} + 1`, updatedAt: now })
      .where(and(eq(jobOtps.bookingId, bookingId), eq(jobOtps.kind, kind)));
    const left = JOB_OTP.maxAttempts - row.attempts - 1;
    if (left <= 0) throw new AppError('OTP_LOCKED', 423, 'Too many wrong codes; call support');
    throw new AppError(
      'OTP_INVALID',
      422,
      `Wrong code. ${left} ${left === 1 ? 'try' : 'tries'} left`,
    );
  }

  return {
    query: db
      .update(jobOtps)
      .set({ usedAt: now, updatedAt: now })
      .where(and(eq(jobOtps.bookingId, bookingId), eq(jobOtps.kind, kind))),
  };
}
