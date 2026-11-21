import {
  createQuote,
  getChefAvailability,
  getChefMenus,
  getChefProfile,
  getChefReviews,
  type QuoteRequest,
} from '@senzo/api-client';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

export const useChefProfile = (slug: string) =>
  useQuery({ queryKey: ['chef', slug], queryFn: () => getChefProfile(slug) });

export const useChefMenus = (chefId: string | undefined) =>
  useQuery({
    queryKey: ['chef-menus', chefId],
    queryFn: () => getChefMenus(chefId!),
    enabled: !!chefId,
  });

export const useChefReviews = (chefId: string | undefined) =>
  useInfiniteQuery({
    queryKey: ['chef-reviews', chefId],
    queryFn: ({ pageParam }) =>
      getChefReviews(chefId!, { limit: 20, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!chefId,
  });

export const useAvailability = (chefId: string | null, month: string) =>
  useQuery({
    queryKey: ['availability', chefId, month],
    queryFn: () => getChefAvailability(chefId!, { month }),
    enabled: !!chefId,
    staleTime: 30_000,
  });

/** Server price for the current draft; the app never computes a total itself. */
export const useQuote = (req: QuoteRequest | null) =>
  useQuery({
    queryKey: ['quote', req],
    queryFn: () => createQuote(req!),
    enabled: !!req,
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: false,
  });
