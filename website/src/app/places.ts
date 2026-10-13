import type { Category } from './types'

/** URL segment for each category: /bengaluru/indiranagar/cafes */
export const CATEGORY_SEGMENT: Record<Category, string> = {
  food: 'food',
  cafe: 'cafes',
  viewpoint: 'viewpoints',
  trail: 'trails',
  shop: 'shops',
  other: 'other',
}

export const CATEGORY_FROM_SEGMENT: Record<string, Category> = Object.fromEntries(
  Object.entries(CATEGORY_SEGMENT).map(([category, segment]) => [segment, category as Category]),
)

/** Chips shown on place pages ("All" is separate). */
export const CATEGORY_CHIPS: { category: Category; label: string }[] = [
  { category: 'food', label: 'Food' },
  { category: 'cafe', label: 'Cafés' },
  { category: 'viewpoint', label: 'Viewpoints' },
  { category: 'trail', label: 'Trails' },
  { category: 'shop', label: 'Shops' },
]

/** "Hidden food spots", "Hidden cafés" … used in headings and titles. */
export const CATEGORY_PHRASE: Record<Category, string> = {
  food: 'Hidden food spots',
  cafe: 'Hidden cafés',
  viewpoint: 'Hidden viewpoints',
  trail: 'Hidden trails',
  shop: 'Hidden shops',
  other: 'Hidden gems',
}

/** Top-level paths that are never a city. Keep in sync with vercel.json and api/_lib/site.ts. */
export const RESERVED_PATHS = new Set([
  'privacy',
  'terms',
  'search',
  'g',
  'u',
  'lists',
  'api',
  'assets',
  '.well-known',
  'sitemap.xml',
  'robots.txt',
])

export const PLACE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isPlaceSlug(segment: string | undefined): segment is string {
  return !!segment && segment.length <= 80 && PLACE_SLUG_RE.test(segment) && !RESERVED_PATHS.has(segment)
}

export function placePath(citySlug: string, areaSlug?: string | null, category?: Category | null): string {
  let path = `/${citySlug}`
  if (areaSlug) path += `/${areaSlug}`
  if (category) path += areaSlug ? `/${CATEGORY_SEGMENT[category]}` : `?category=${category}`
  return path
}

/** "Indiranagar, Bengaluru" / "Bengaluru" */
export function placeName(city: string | null | undefined, area?: string | null): string {
  if (area && city) return `${area}, ${city}`
  return area || city || ''
}

export const SITE_NAME = 'Unearth'

export function placeTitle(city: string, area?: string | null, category?: Category | null): string {
  const lead = category ? CATEGORY_PHRASE[category] : 'Hidden gems'
  return `${lead} in ${placeName(city, area)} · ${SITE_NAME}`
}

export function gemTitle(name: string, city?: string | null, area?: string | null): string {
  const where = placeName(city, area)
  return where ? `${name}: hidden gem in ${where} · ${SITE_NAME}` : `${name}: hidden gem · ${SITE_NAME}`
}

export function listTitle(kind: 'top' | 'new', city: string): string {
  return kind === 'top' ? `Top 10 Polished gems in ${city}` : `Newest finds in ${city}`
}

/** True on iPhone, iPad and Mac, where Apple Maps should come first. */
export function prefersAppleMaps(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod|Macintosh/.test(ua)
}

export function appleMapsUrl(gem: { name: string; lat: number; lng: number }): string {
  return `https://maps.apple.com/?daddr=${gem.lat},${gem.lng}&q=${encodeURIComponent(gem.name)}`
}

export function googleMapsDirectionsUrl(gem: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${gem.lat},${gem.lng}`
}
