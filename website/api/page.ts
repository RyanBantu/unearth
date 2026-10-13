import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CATEGORY_FROM_SEGMENT,
  CATEGORY_PHRASE,
  fetchApi,
  gemTitle,
  isCitySlug,
  isHandle,
  isSlug,
  listTitle,
  placeName,
  placeTitle,
  siteOrigin,
  fallbackHtml,
} from './_lib/site.js'

type Tags = {
  title: string
  description: string
  url: string
  image: string
  imageAlt: string
}

type Gem = {
  name: string
  slug: string
  city: string | null
  area: string | null
  address: string | null
  status: { findCount: number; primary: string }
  finds: { description: string }[]
}

type PlacePage = {
  place: {
    city: string
    citySlug: string
    area: string | null
    gemCount: number
    polishedCount: number
  }
}

type Profile = { user: { handle: string | null; gemsUnearthed?: number } }

function indexHtml(): string {
  // vercel.json includeFiles: "dist/index.html" lands at the function root
  // (page.func/index.html, cwd /var/task). Local Vite keeps it in dist/.
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    join(process.cwd(), 'index.html'),
    join(here, '../index.html'),
    join(process.cwd(), 'dist/index.html'),
    join(here, '../dist/index.html'),
  ]
  for (const file of candidates) {
    try {
      return readFileSync(file, 'utf8')
    } catch {
      /* try next */
    }
  }
  return fallbackHtml()
}

/** Vercel turns `/g/:slug` into `/api/page?slug=`; keep the public path too. */
function routeParts(url: URL): string[] {
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] !== 'api' || parts[1] !== 'page') return parts

  const q = url.searchParams
  const slug = q.get('slug')
  if (slug) return ['g', slug]
  const handle = q.get('handle')
  if (handle) return ['u', handle]
  const city = q.get('city')
  const kind = q.get('kind')
  if (city && kind) return ['lists', city, kind]
  if (city) return [city, q.get('area'), q.get('category')].filter((p): p is string => Boolean(p))
  return parts
}

function inject(html: string, tags: Tags): string {
  const stripped = html
    .replace(/<title>[^<]*<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:(title|description|url|image)"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:(card|title|description|image)"[^>]*>\s*/gi, '')

  const extra = [
    `<title>${esc(tags.title)}</title>`,
    `<meta name="description" content="${esc(tags.description)}" />`,
    `<link rel="canonical" href="${esc(tags.url)}" />`,
    `<meta property="og:title" content="${esc(tags.title)}" />`,
    `<meta property="og:description" content="${esc(tags.description)}" />`,
    `<meta property="og:url" content="${esc(tags.url)}" />`,
    `<meta property="og:image" content="${esc(tags.image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(tags.title)}" />`,
    `<meta name="twitter:description" content="${esc(tags.description)}" />`,
    `<meta name="twitter:image" content="${esc(tags.image)}" />`,
  ].join('\n    ')

  if (stripped.includes('</head>')) return stripped.replace('</head>', `    ${extra}\n  </head>`)
  return extra + stripped
}

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function notFoundPage(html: string, origin: string, path: string): Response {
  const page = inject(html, {
    title: 'Nothing buried here · Unearth',
    description: 'This page isn’t on Unearth.',
    url: `${origin}${path}`,
    image: `${origin}/og-image.png`,
    imageAlt: 'Unearth',
  })
  return new Response(page, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

function ok(html: string, tags: Tags): Response {
  return new Response(inject(html, tags), {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, s-maxage=120, stale-while-revalidate=600' },
  })
}

export async function GET(request: Request): Promise<Response> {
  const origin = siteOrigin(request)
  const url = new URL(request.url)
  const parts = routeParts(url)
  const publicPath = `/${parts.join('/')}`
  const html = indexHtml()

  try {
    if (parts[0] === 'g' && isSlug(parts[1]) && parts.length === 2) {
      const { data } = await fetchApi<Gem>(`/gems/${parts[1]}`)
      if (!data) return notFoundPage(html, origin, publicPath)
      const where = placeName(data.city, data.area)
      const blurb = data.finds[0]?.description?.slice(0, 160) || `${data.name} on Unearth.`
      return ok(html, {
        title: gemTitle(data.name, data.city, data.area),
        description: where ? `${data.name} — ${data.status.primary} gem in ${where}. ${blurb}` : blurb,
        url: `${origin}/g/${data.slug}`,
        image: `${origin}/api/og/g/${data.slug}`,
        imageAlt: data.name,
      })
    }

    if (parts[0] === 'u' && isHandle(parts[1]?.replace(/^@/, '').toLowerCase()) && parts.length === 2) {
      const handle = parts[1]!.replace(/^@/, '').toLowerCase()
      const { data } = await fetchApi<Profile>(`/users/${handle}`)
      if (!data?.user.handle) return notFoundPage(html, origin, publicPath)
      const n = data.user.gemsUnearthed ?? 0
      return ok(html, {
        title: `@${data.user.handle} · Unearth`,
        description: `${n} ${n === 1 ? 'gem' : 'gems'} unearthed by @${data.user.handle} on Unearth.`,
        url: `${origin}/u/${data.user.handle}`,
        image: `${origin}/og-image.png`,
        imageAlt: `@${data.user.handle}`,
      })
    }

    if (parts[0] === 'lists' && isCitySlug(parts[1]) && (parts[2] === 'top' || parts[2] === 'new') && parts.length === 3) {
      const kind = parts[2]
      const { data } = await fetchApi<PlacePage>(`/places/${parts[1]}?sort=${kind === 'top' ? 'polished' : 'new'}`)
      if (!data) return notFoundPage(html, origin, publicPath)
      const title = listTitle(kind, data.place.city)
      return ok(html, {
        title,
        description: `${title.replace(' · Unearth', '')} — shared by people who’ve been there.`,
        url: `${origin}/lists/${parts[1]}/${kind}`,
        image: `${origin}/api/og/lists/${parts[1]}/${kind}`,
        imageAlt: title,
      })
    }

    if (parts.length >= 1 && parts.length <= 3 && isCitySlug(parts[0])) {
      const citySlug = parts[0]
      const areaSlug = parts[1] && isSlug(parts[1]) ? parts[1] : undefined
      const categorySeg = parts[2]
      const category = categorySeg ? CATEGORY_FROM_SEGMENT[categorySeg] : undefined
      if (parts.length === 3 && !category) return notFoundPage(html, origin, publicPath)

      const qs = new URLSearchParams()
      if (areaSlug) qs.set('area', areaSlug)
      if (category) qs.set('category', category)
      const { data } = await fetchApi<PlacePage>(`/places/${citySlug}${qs.size ? `?${qs}` : ''}`)
      if (!data) return notFoundPage(html, origin, publicPath)

      const { place } = data
      const title = placeTitle(place.city, place.area, category)
      const where = placeName(place.city, place.area)
      const lead = category ? CATEGORY_PHRASE[category] : 'Hidden gems'
      return ok(html, {
        title,
        description: `${place.gemCount} ${place.gemCount === 1 ? 'gem' : 'gems'} in ${where}. ${lead}, shared by people who’ve been there.`,
        url: `${origin}${publicPath}`,
        image: `${origin}/api/og${publicPath}`,
        imageAlt: title,
      })
    }
  } catch {
    return ok(html, {
      title: 'Unearth — the places that aren’t on the top-10 lists',
      description: 'Hidden places, shared by people who’ve been there.',
      url: `${origin}${publicPath}`,
      image: `${origin}/og-image.png`,
      imageAlt: 'Unearth',
    })
  }

  return notFoundPage(html, origin, publicPath)
}
