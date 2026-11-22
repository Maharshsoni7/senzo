import type { BookingState, BookingSubStatus } from '@senzo/schemas';
import { hmacDigits } from '../../lib/crypto';

type JobOtpKind = 'start' | 'finish';

/**
 * Job codes are derived, not stored: the guest must see the code, while `job_otps` keeps only
 * its hash (invariant 6). Accept/done routes insert that row; verification re-derives.
 */
export const jobOtpCode = (pepper: string, bookingId: string, kind: JobOtpKind) =>
  hmacDigits(pepper, `job-otp:${bookingId}:${kind}`, 4);

export function dueOtpKind(
  state: BookingState,
  subStatus: BookingSubStatus | null,
): JobOtpKind | null {
  if (state === 'confirmed') return 'start';
  if (state === 'in_progress' && subStatus === 'awaiting_finish') return 'finish';
  return null;
}
