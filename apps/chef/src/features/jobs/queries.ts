import {
  acceptBooking,
  declineBooking,
  finishJob,
  getPartnerBooking,
  listPartnerBookings,
  markJobDone,
  markOnMyWay,
  startJob,
  type PartnerBookingDetail,
} from '@senzo/api-client';
import type { PartnerBookingScope } from '@senzo/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Until a partner socket exists; requests expire in 2 h, so the home list stays fresh.
const POLL_MS = 30_000;

export const usePartnerBookings = (scope: PartnerBookingScope) =>
  useQuery({
    queryKey: ['partner-bookings', scope],
    queryFn: () => listPartnerBookings({ scope, limit: 50 }),
    refetchInterval: scope === 'past' ? false : POLL_MS,
  });

export const usePartnerBooking = (id: string) =>
  useQuery({
    queryKey: ['partner-booking', id],
    queryFn: () => getPartnerBooking(id),
  });

/**
 * Every action returns the updated booking, which replaces the cached one. TanStack pauses
 * mutations while offline and sends them when the connection is back.
 */
function useJobAction<V>(id: string, run: (vars: V) => Promise<PartnerBookingDetail>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (booking) => {
      client.setQueryData(['partner-booking', id], booking);
      void client.invalidateQueries({ queryKey: ['partner-bookings'] });
    },
  });
}

export const useAccept = (id: string) =>
  useJobAction(id, () => acceptBooking(id, { allergiesAck: true }));
export const useDecline = (id: string) => useJobAction(id, () => declineBooking(id, {}));
export const useOnMyWay = (id: string) =>
  useJobAction(id, (etaMinutes: 15 | 30 | 45) => markOnMyWay(id, { etaMinutes }));
export const useStart = (id: string) =>
  useJobAction(id, (body: { otp: string; lat: number; lng: number }) => startJob(id, body));
export const useMarkDone = (id: string) => useJobAction(id, () => markJobDone(id));
export const useFinish = (id: string) => useJobAction(id, (otp: string) => finishJob(id, { otp }));
