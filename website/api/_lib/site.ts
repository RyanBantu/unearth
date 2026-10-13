export const RENDER_API_URL = (process.env.RENDER_API_URL ?? 'https://unearth-1o4a.onrender.com').replace(/\/$/, '')

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const HANDLE_RE = /^[a-z0-9_]{3,20}$/

export const RESERVED = new Set([
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

export const CATEGORY_SEGMENT: Record<string, string> = {
  food: 'food',
  cafe: 'cafes',
  viewpoint: 'viewpoints',
  trail: 'trails',
  shop: 'shops',
  other: 'other',
}

export const CATEGORY_FROM_SEGMENT: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SEGMENT).map(([category, segment]) => [segment, category]),
)

export const CATEGORY_PHRASE: Record<string, string> = {
  food: 'Hidden food spots',
  cafe: 'Hidden cafés',
  viewpoint: 'Hidden viewpoints',
  trail: 'Hidden trails',
  shop: 'Hidden shops',
  other: 'Hidden gems',
}

export const CATEGORY_LABEL: Record<string, string> = {
  food: 'Food',
  cafe: 'Café',
  viewpoint: 'Viewpoint',
  trail: 'Trail',
  shop: 'Shop',
  other: 'Other',
}

export function siteOrigin(request: Request): string {
  const configured = process.env.SITE_URL?.replace(/\/$/, '')
  if (configured) return configured
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  const url = new URL(request.url)
  const host = request.headers.get('x-forwarded-host') ?? url.host
  const proto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')
  return `${proto}://${host}`
}

export function isSlug(value: string | undefined): value is string {
  return !!value && value.length <= 80 && SLUG_RE.test(value)
}

export function isHandle(value: string | undefined): value is string {
  return !!value && HANDLE_RE.test(value)
}

export function isCitySlug(value: string | undefined): value is string {
  return isSlug(value) && !RESERVED.has(value)
}

function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { accept: 'application/json' }
  const token = process.env.PRERENDER_TOKEN
  if (token) headers['x-unearth-prerender'] = token
  return headers
}

export async function fetchApi<T>(path: string): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`${RENDER_API_URL}${path}`, {
    headers: apiHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (res.status === 404) return { status: 404, data: null }
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`)
  return { status: res.status, data: (await res.json()) as T }
}

export function placeName(city: string | null | undefined, area?: string | null): string {
  if (area && city) return `${area}, ${city}`
  return area || city || ''
}

export function gemTitle(name: string, city?: string | null, area?: string | null): string {
  const where = placeName(city, area)
  return where ? `${name}: hidden gem in ${where} · Unearth` : `${name}: hidden gem · Unearth`
}

export function placeTitle(city: string, area?: string | null, category?: string | null): string {
  const lead = category ? (CATEGORY_PHRASE[category] ?? 'Hidden gems') : 'Hidden gems'
  return `${lead} in ${placeName(city, area)} · Unearth`
}

export function listTitle(kind: 'top' | 'new', city: string): string {
  return kind === 'top' ? `Top 10 Polished gems in ${city} · Unearth` : `Newest finds in ${city} · Unearth`
}

export function fallbackHtml(): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Unearth</title></head><body></body></html>`
}
