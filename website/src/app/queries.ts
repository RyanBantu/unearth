import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { api, ApiError, query } from './api'
import type { Category, CitySummary, GemDetail, GemSort, Me, PlacePage, Profile, SearchResults } from './types'

export const keys = {
  me: ['me'] as const,
  gem: (slug: string) => ['gem', slug] as const,
  places: ['places'] as const,
  place: (city: string, area: string | undefined, category: Category | undefined, sort: GemSort) =>
    ['place', city, area ?? '', category ?? 'all', sort] as const,
  search: (q: string) => ['search', q.toLowerCase()] as const,
  profile: (handle: string) => ['profile', handle.toLowerCase()] as const,
}

/** Never retry 4xx; they won't change on their own. */
export function shouldRetry(count: number, err: unknown): boolean {
  if (err instanceof ApiError && err.status < 500) return false
  return count < 2
}

export function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 400)
}

/** Signed-in user; only used when web sign-in is enabled. */
export function useMe(enabled = true) {
  return useQuery({
    queryKey: keys.me,
    queryFn: async () => {
      try {
        return await api<Me>('GET', '/me')
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null
        throw err
      }
    },
    enabled,
    staleTime: 60_000,
  })
}

export function useGem(slug: string | undefined) {
  return useQuery({
    queryKey: keys.gem(slug ?? ''),
    queryFn: () => api<GemDetail>('GET', `/gems/${encodeURIComponent(slug!)}`),
    enabled: !!slug,
  })
}

export function usePlaces() {
  return useQuery({
    queryKey: keys.places,
    queryFn: () => api<{ places: CitySummary[] }>('GET', '/places').then((r) => r.places),
    staleTime: 5 * 60_000,
  })
}

export function usePlace(params: { city: string; area?: string; category?: Category; sort: GemSort }) {
  const { city, area, category, sort } = params
  return useInfiniteQuery({
    queryKey: keys.place(city, area, category, sort),
    queryFn: ({ pageParam }) =>
      api<PlacePage>('GET', `/places/${encodeURIComponent(city)}${query({ area, category, sort, page: pageParam })}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  })
}

export function useSearch(q: string) {
  const trimmed = q.trim()
  return useQuery({
    queryKey: keys.search(trimmed),
    queryFn: () => api<SearchResults>('GET', `/search${query({ q: trimmed })}`),
    enabled: trimmed.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

export function useProfile(handle: string | undefined) {
  return useQuery({
    queryKey: keys.profile(handle ?? ''),
    queryFn: () => api<Profile>('GET', `/users/${encodeURIComponent(handle!)}`),
    enabled: !!handle,
  })
}
