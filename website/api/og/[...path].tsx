import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactElement, ReactNode } from 'react'
import { ImageResponse } from '@vercel/og'
import {
  CATEGORY_FROM_SEGMENT,
  CATEGORY_LABEL,
  fetchApi,
  isCitySlug,
  isSlug,
  listTitle,
  placeName,
  placeTitle,
} from '../_lib/site.js'

export const config = { runtime: 'nodejs' }

type Font = { name: string; data: ArrayBuffer; weight: 500 | 600 | 700 }

let fontsPromise: Promise<Font[]> | null = null

function loadFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.resolve().then(() => {
    const dir = join(process.cwd(), 'api/_fonts')
    const file = (name: string) => {
      const buf = readFileSync(join(dir, name))
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    }
    return [
      { name: 'Bricolage Grotesque', data: file('BricolageGrotesque-Bold.ttf'), weight: 700 },
      { name: 'DM Sans', data: file('DMSans-Medium.ttf'), weight: 500 },
      { name: 'DM Sans', data: file('DMSans-SemiBold.ttf'), weight: 600 },
    ]
  })
  return fontsPromise
}

type Gem = {
  name: string
  category: string
  city: string | null
  area: string | null
  status: { primary: string; labels: string[] }
}

type PlacePage = {
  place: { city: string; area: string | null; gemCount: number }
}

const SIZE = { width: 1200, height: 630 }

function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px 64px',
        background: '#F6F7F5',
        color: '#15201b',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: '#e3f0e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            fontFamily: 'Bricolage Grotesque',
            color: '#1f6b4f',
          }}
        >
          U
        </div>
        <div style={{ fontSize: 32, fontFamily: 'Bricolage Grotesque', fontWeight: 700 }}>Unearth</div>
      </div>
      {children}
    </div>
  )
}

function Badge({ text, tone }: { text: string; tone: 'green' | 'amber' | 'ink' }) {
  const bg = tone === 'green' ? '#e3f0e8' : tone === 'amber' ? '#fdf0dd' : '#f1f2ef'
  const color = tone === 'green' ? '#1f6b4f' : tone === 'amber' ? '#8a4d06' : '#3e4a44'
  return (
    <div
      style={{
        display: 'flex',
        padding: '8px 14px',
        borderRadius: 10,
        background: bg,
        color,
        fontFamily: 'DM Sans',
        fontWeight: 600,
        fontSize: 22,
      }}
    >
      {text}
    </div>
  )
}

function fallback() {
  return (
    <Frame>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 64, fontFamily: 'Bricolage Grotesque', fontWeight: 700, lineHeight: 1.05, maxWidth: 900 }}>
          The best places aren’t on the top-10 lists.
        </div>
      </div>
    </Frame>
  )
}

async function png(element: ReactElement): Promise<Response> {
  const fonts = await loadFonts()
  return new ImageResponse(element, { ...SIZE, fonts }) as unknown as Response
}

export async function GET(request: Request): Promise<Response> {
  const parts = new URL(request.url).pathname.replace(/^\/api\/og\/?/, '').split('/').filter(Boolean)

  try {
    if (parts[0] === 'g' && isSlug(parts[1])) {
      const { data } = await fetchApi<Gem>(`/gems/${parts[1]}`)
      if (data) {
        const where = placeName(data.city, data.area)
        return png(
          <Frame>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <Badge text={CATEGORY_LABEL[data.category] ?? data.category} tone="ink" />
                {data.status.labels.slice(0, 2).map((label) => (
                  <Badge key={label} text={label} tone={label === 'Polished' ? 'green' : 'amber'} />
                ))}
              </div>
              <div style={{ fontSize: 64, fontFamily: 'Bricolage Grotesque', fontWeight: 700, lineHeight: 1.05 }}>
                {data.name}
              </div>
              {where && (
                <div style={{ fontSize: 28, fontFamily: 'DM Sans', fontWeight: 500, color: '#56635c' }}>{where}</div>
              )}
            </div>
          </Frame>,
        )
      }
    }

    if (parts[0] === 'lists' && isCitySlug(parts[1]) && (parts[2] === 'top' || parts[2] === 'new')) {
      const kind = parts[2]
      const { data } = await fetchApi<PlacePage>(`/places/${parts[1]}?sort=${kind === 'top' ? 'polished' : 'new'}`)
      if (data) {
        const title = listTitle(kind, data.place.city).replace(' · Unearth', '')
        return png(
          <Frame>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 60, fontFamily: 'Bricolage Grotesque', fontWeight: 700, lineHeight: 1.05, maxWidth: 980 }}>
                {title}
              </div>
              <div style={{ fontSize: 28, fontFamily: 'DM Sans', fontWeight: 500, color: '#56635c' }}>
                {data.place.gemCount} {data.place.gemCount === 1 ? 'gem' : 'gems'} on Unearth
              </div>
            </div>
          </Frame>,
        )
      }
    }

    if (parts.length >= 1 && parts.length <= 3 && isCitySlug(parts[0])) {
      const qs = new URLSearchParams()
      if (parts[1] && isSlug(parts[1])) qs.set('area', parts[1])
      const category = parts[2] ? CATEGORY_FROM_SEGMENT[parts[2]] : undefined
      if (category) qs.set('category', category)
      const { data } = await fetchApi<PlacePage>(`/places/${parts[0]}${qs.size ? `?${qs}` : ''}`)
      if (data) {
        const title = placeTitle(data.place.city, data.place.area, category).replace(' · Unearth', '')
        return png(
          <Frame>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 60, fontFamily: 'Bricolage Grotesque', fontWeight: 700, lineHeight: 1.05, maxWidth: 980 }}>
                {title}
              </div>
              <div style={{ fontSize: 28, fontFamily: 'DM Sans', fontWeight: 500, color: '#56635c' }}>
                {data.place.gemCount} {data.place.gemCount === 1 ? 'gem' : 'gems'} · Unearth
              </div>
            </div>
          </Frame>,
        )
      }
    }
  } catch {
    /* fall through */
  }

  return png(fallback())
}
