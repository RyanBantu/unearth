import { fetchApi, siteOrigin } from './_lib/site.js'

type SitemapData = {
  cities: { citySlug: string; updatedAt: string }[]
  areas: { citySlug: string; areaSlug: string; updatedAt: string }[]
  gems: { slug: string; updatedAt: string }[]
}

function loc(origin: string, path: string, updatedAt?: string, changefreq = 'weekly', priority = '0.6'): string {
  const last = updatedAt ? `\n    <lastmod>${new Date(updatedAt).toISOString().slice(0, 10)}</lastmod>` : ''
  return `  <url>\n    <loc>${origin}${path}</loc>${last}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
}

export async function GET(request: Request): Promise<Response> {
  const origin = siteOrigin(request)
  const { data } = await fetchApi<SitemapData>('/sitemap-data')
  const cities = data?.cities ?? []
  const areas = data?.areas ?? []
  const gems = data?.gems ?? []

  const urls = [
    loc(origin, '/', undefined, 'daily', '1.0'),
    loc(origin, '/search', undefined, 'weekly', '0.4'),
    loc(origin, '/privacy', undefined, 'yearly', '0.2'),
    loc(origin, '/terms', undefined, 'yearly', '0.2'),
    loc(origin, '/delete-account', undefined, 'yearly', '0.2'),
    ...cities.map((c) => loc(origin, `/${c.citySlug}`, c.updatedAt, 'daily', '0.8')),
    ...cities.flatMap((c) => [
      loc(origin, `/lists/${c.citySlug}/top`, c.updatedAt, 'daily', '0.7'),
      loc(origin, `/lists/${c.citySlug}/new`, c.updatedAt, 'daily', '0.7'),
    ]),
    ...areas.map((a) => loc(origin, `/${a.citySlug}/${a.areaSlug}`, a.updatedAt, 'daily', '0.7')),
    ...gems.map((g) => loc(origin, `/g/${g.slug}`, g.updatedAt, 'weekly', '0.6')),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
