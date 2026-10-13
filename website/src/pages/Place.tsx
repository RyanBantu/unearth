import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { EmptyState, ErrorState, GemCard, GemGrid, GemGridSkeleton, LoadingRegion, Skeleton } from '../app/components/bits'
import { AppStoreButton } from '../components/AppStoreButton'
import { haversineM } from '../app/format'
import { useDocumentTitle, useUserLocation } from '../app/hooks'
import {
  CATEGORY_CHIPS,
  CATEGORY_FROM_SEGMENT,
  CATEGORY_PHRASE,
  isPlaceSlug,
  PLACE_SLUG_RE,
  placeName,
  placePath,
  placeTitle,
} from '../app/places'
import { isNotFound, usePlace } from '../app/queries'
import type { Category, GemSort } from '../app/types'
import NotFound from './NotFound'

const SORTS: { sort: GemSort; label: string }[] = [
  { sort: 'polished', label: 'Polished first' },
  { sort: 'top', label: 'Top' },
  { sort: 'new', label: 'Newest' },
]

const CATEGORIES = new Set<string>(['food', 'cafe', 'viewpoint', 'trail', 'shop', 'other'])

/** /:city, /:city/:area and /:city/:area/:category */
export default function Place() {
  const { city = '', area, category: segment } = useParams()
  const [params] = useSearchParams()

  const queryCategory = params.get('category') ?? ''
  const category: Category | undefined = segment
    ? CATEGORY_FROM_SEGMENT[segment]
    : CATEGORIES.has(queryCategory)
      ? (queryCategory as Category)
      : undefined
  const sortParam = params.get('sort')
  const sort: GemSort = sortParam === 'top' || sortParam === 'new' ? sortParam : 'polished'

  const valid = isPlaceSlug(city) && (!area || PLACE_SLUG_RE.test(area)) && (!segment || !!category)
  if (!valid) return <NotFound title="Place not found" message="We don’t have any gems here yet." />

  return <PlaceView key={`${city}/${area ?? ''}`} city={city} area={area} category={category} sort={sort} />
}

function PlaceView({ city, area, category, sort }: { city: string; area?: string; category?: Category; sort: GemSort }) {
  const result = usePlace({ city, area, category, sort })
  const { location, request } = useUserLocation()
  const [nearMe, setNearMe] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  const first = result.data?.pages[0]
  const place = first?.place
  useDocumentTitle(place ? placeTitle(place.city, place.area, category) : undefined)

  const gems = useMemo(() => {
    const all = result.data?.pages.flatMap((p) => p.gems) ?? []
    if (!nearMe || !location) return all.map((g) => ({ gem: g, distance: null as number | null }))
    return all
      .map((g) => ({ gem: g, distance: haversineM(location, g) }))
      .sort((a, b) => a.distance - b.distance)
  }, [result.data, nearMe, location])

  if (result.isError && isNotFound(result.error)) {
    return <NotFound title="Place not found" message="We don’t have any gems here yet. Be the first to unearth one." />
  }

  const toggleNearMe = async () => {
    if (nearMe) return setNearMe(false)
    setLocError(null)
    setLocating(true)
    try {
      await request()
      setNearMe(true)
    } catch (err) {
      setLocError(err instanceof Error ? err.message : 'Couldn’t get your location.')
    } finally {
      setLocating(false)
    }
  }

  const sortLink = (s: GemSort) => {
    const q = new URLSearchParams()
    if (category && !area) q.set('category', category)
    if (s !== 'polished') q.set('sort', s)
    const qs = q.toString()
    return `${area ? placePath(city, area, category) : `/${city}`}${qs ? `?${qs}` : ''}`
  }
  const categoryLink = (c: Category | null) => {
    const base = placePath(city, area, c)
    if (sort === 'polished') return base
    return `${base}${base.includes('?') ? '&' : '?'}sort=${sort}`
  }

  const heading = place
    ? `${category ? CATEGORY_PHRASE[category] : 'Hidden gems'} in ${placeName(place.city, place.area)}`
    : null
  const countLine = place
    ? category
      ? `${first!.total} ${first!.total === 1 ? 'gem' : 'gems'}`
      : `${place.gemCount} ${place.gemCount === 1 ? 'gem' : 'gems'} · ${place.polishedCount} Polished`
    : null

  return (
    <div className="page">
      <header className="page__head">
        {place?.area && (
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to={`/${city}`}>{place.city}</Link>
            <Icon name="chevron" size={14} />
            <span aria-current="page">{place.area}</span>
          </nav>
        )}
        {heading ? (
          <>
            <h1 className="page__title">{heading}</h1>
            <p className="page__count">{countLine}</p>
          </>
        ) : (
          <LoadingRegion label="Loading place…">
            <Skeleton className="sk--title" />
            <Skeleton className="sk--line sk--short" />
          </LoadingRegion>
        )}
      </header>

      {place && !area && first!.areas.length > 0 && (
        <nav className="chip-row" aria-label="Areas">
          <Link to={`/${city}`} className="ux-chip is-on" aria-current="page">
            All areas
          </Link>
          {first!.areas.map((a) => (
            <Link key={a.areaSlug} to={placePath(city, a.areaSlug, category)} className="ux-chip">
              {a.area} <span className="ux-chip__n">{a.gemCount}</span>
            </Link>
          ))}
        </nav>
      )}

      <nav className="chip-row" aria-label="Categories">
        <Link to={categoryLink(null)} className={`ux-chip ${!category ? 'is-on' : ''}`} aria-current={!category ? 'page' : undefined}>
          All
        </Link>
        {CATEGORY_CHIPS.map((c) => (
          <Link
            key={c.category}
            to={categoryLink(c.category)}
            className={`ux-chip ${category === c.category ? 'is-on' : ''}`}
            aria-current={category === c.category ? 'page' : undefined}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      <div className="toolbar">
        <nav className="tabs" aria-label="Sort">
          {SORTS.map((s) => (
            <Link
              key={s.sort}
              to={sortLink(s.sort)}
              replace
              className={`tabs__tab ${!nearMe && sort === s.sort ? 'is-on' : ''}`}
              aria-current={!nearMe && sort === s.sort ? 'true' : undefined}
              onClick={() => setNearMe(false)}
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <button type="button" className={`ux-btn ux-btn--sm ${nearMe ? 'ux-btn--primary' : 'ux-btn--outline'}`} onClick={toggleNearMe} aria-pressed={nearMe} disabled={locating}>
          <Icon name="locate" size={16} />
          {locating ? 'Locating…' : 'Near me'}
        </button>
      </div>
      {locError && (
        <p className="page__note" role="alert">
          {locError}
        </p>
      )}

      {result.isError ? (
        <ErrorState onRetry={() => result.refetch()} />
      ) : result.isPending ? (
        <LoadingRegion label="Loading gems…">
          <GemGridSkeleton />
        </LoadingRegion>
      ) : gems.length === 0 ? (
        <EmptyState
          title={`No ${category ? CATEGORY_PHRASE[category].replace('Hidden ', '') : 'gems'} here yet.`}
          message="Be the first to unearth one."
          action={<AppStoreButton />}
        />
      ) : (
        <>
          <div className={result.isPlaceholderData ? 'is-stale' : undefined}>
            <GemGrid>
              {gems.map(({ gem, distance }) => (
                <GemCard key={gem.id} gem={gem} distanceM={distance} showArea={!area} />
              ))}
            </GemGrid>
          </div>
          {result.hasNextPage && (
            <div className="page__more">
              <button type="button" className="ux-btn ux-btn--outline" onClick={() => result.fetchNextPage()} disabled={result.isFetchingNextPage}>
                {result.isFetchingNextPage ? 'Loading…' : 'Show more'}
              </button>
            </div>
          )}
        </>
      )}

      {place && (
        <nav className="list-links" aria-label={`Lists for ${place.city}`}>
          <Link to={`/lists/${city}/top`}>
            <Icon name="gem" size={20} />
            Top 10 Polished gems in {place.city}
          </Link>
          <Link to={`/lists/${city}/new`}>
            <Icon name="activity" size={20} />
            Newest finds in {place.city}
          </Link>
        </nav>
      )}
    </div>
  )
}
