import type { IconName } from '../components/Icon'
import type { Category, GemStatus } from './types'

export const categoryLabel: Record<Category, string> = {
  food: 'Food',
  cafe: 'Café',
  viewpoint: 'Viewpoint',
  trail: 'Trail',
  shop: 'Shop',
  other: 'Other',
}

export const categoryIcon: Record<Category, IconName> = {
  food: 'food',
  cafe: 'coffee',
  viewpoint: 'viewpoint',
  trail: 'trail',
  shop: 'shop',
  other: 'gem',
}

/** Food and café pins are green; everything else is amber. */
export function pinTone(category: Category): 'green' | 'amber' {
  return category === 'food' || category === 'cafe' ? 'green' : 'amber'
}

export function formatDistance(m: number | null | undefined): string | null {
  if (m === null || m === undefined || !Number.isFinite(m)) return null
  if (m < 1000) return `${Math.max(1, Math.round(m))} m`
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`
}

/** "Polished · 3 finds" / "Uncut · 1 find" */
export function statusText(status: GemStatus): string {
  const n = status.findCount
  return `${status.primary} · ${n} ${n === 1 ? 'find' : 'finds'}`
}

export function badgeVariant(label: string): 'polished' | 'rare' | 'uncut' | 'neutral' {
  if (label === 'Polished') return 'polished'
  if (label === 'Rare') return 'rare'
  if (label === 'Uncut' || label === 'Mined out') return 'uncut'
  return 'neutral'
}

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export const TAGS = [
  'Cheap',
  'Cash only',
  'Quiet',
  'Mornings',
  'Late night',
  'Standing only',
  'Needs a vehicle',
  'Family friendly',
  'Great view',
  'Veg friendly',
] as const

export const GOOGLE_MAPS_RE = /google\.[^/]+\/maps|maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl/i

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/
