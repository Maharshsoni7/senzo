import { getMyBooking, listMyBookings } from '@senzo/api-client';
import type { BookingScope } from '@senzo/schemas';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { isLive, stageOf } from './stage';

// Until /ws/bookings/:id exists.
const POLL_MS = 30_000;

export const useMyBookings = (scope: BookingScope) =>
  useInfiniteQuery({
    queryKey: ['bookings', scope],
    queryFn: ({ pageParam }) =>
      listMyBookings({ scope, limit: 20, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: scope === 'upcoming' ? POLL_MS : false,
  });

export const useBooking = (id: string) =>
  useQuery({
    queryKey: ['booking', id],
    queryFn: () => getMyBooking(id),
    refetchInterval: (q) => (q.state.data && isLive(stageOf(q.state.data)) ? POLL_MS : false),
  });
