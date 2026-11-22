import type { Bindings } from '../../env';
import { log } from '../../lib/log';

// Kept apart from src/workflows so route code can signal without importing cloudflare:workers.

export type BookingTimerParams = {
  bookingId: string;
  chefId: string;
  date: string;
  slot: 'lunch' | 'dinner' | 'late';
};

export const PAYMENT_CAPTURED = 'payment-captured';
export const JOB_DONE = 'job-done';

export const startBookingTimers = (env: Bindings, params: BookingTimerParams) =>
  env.BOOKING_TIMERS.create({ id: params.bookingId, params });

/**
 * Never throws: the state change is already committed, and the Workflow re-reads the booking
 * on its own deadlines. Seeded bookings have no Workflow instance.
 */
export async function signalBooking(env: Bindings, bookingId: string, type: string) {
  try {
    await (await env.BOOKING_TIMERS.get(bookingId)).sendEvent({ type, payload: {} });
  } catch (err) {
    log.warn('booking signal not delivered', { bookingId, type, err });
  }
}
