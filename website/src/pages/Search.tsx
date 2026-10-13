import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SearchBox } from '../app/components/SearchBox'
import { EmptyState, ErrorState, GemCard, GemGrid, GemGridSkeleton, LoadingRegion, Skeleton } from '../app/components/bits'
import { AppStoreButton } from '../components/AppStoreButton'
import { useDebounced, useDocumentTitle } from '../app/hooks'
import { placeName, placePath } from '../app/places'
import { useSearch } from '../app/queries'

export default function Search() {
  const [params, setParams] = useSearchParams()
  const urlQ = params.get('q') ?? ''
  const [typed, setTyped] = useState(urlQ)
  const q = useDebounced(typed, 250).trim()
  const results = useSearch(q)
  useDocumentTitle(q ? `“${q}” · Search · Unearth` : 'Search · Unearth')

  useEffect(() => {
    if (q !== urlQ.trim()) setParams(q ? { q } : {}, { replace: true })
  }, [q, urlQ, setParams])

  const data = results.data
  const empty = !!data && data.places.length === 0 && data.gems.length === 0

  return (
    <div className="page">
      <header className="page__head">
        <h1 className="page__title">Search</h1>
        <SearchBox initial={urlQ} size="lg" autoFocus={!urlQ} onChange={setTyped} />
      </header>

      {!q ? (
        <EmptyState title="Search a city or neighbourhood" message="Try Manipal, Bengaluru or Indiranagar." />
      ) : results.isError ? (
        <ErrorState onRetry={() => results.refetch()} />
      ) : results.isPending ? (
        <LoadingRegion label="Searching…">
          <div className="place-chips place-chips--wrap">
            <Skeleton className="sk--chip" />
            <Skeleton className="sk--chip" />
          </div>
          <GemGridSkeleton count={4} />
        </LoadingRegion>
      ) : empty ? (
        <EmptyState
          title={`No gems in ${q} yet. Be the first to unearth one.`}
          action={<AppStoreButton />}
        />
      ) : (
        <div className={results.isPlaceholderData ? 'is-stale' : undefined}>
          {data!.places.length > 0 && (
            <section className="page__section" aria-labelledby="search-places">
              <h2 id="search-places" className="page__h2">
                Places
              </h2>
              <ul className="place-chips place-chips--wrap">
                {data!.places.map((p) => (
                  <li key={`${p.citySlug}/${p.areaSlug ?? ''}`}>
                    <Link to={placePath(p.citySlug, p.areaSlug)} className="place-chip">
                      {placeName(p.city, p.area)}
                      <span>
                        {p.gemCount} {p.gemCount === 1 ? 'gem' : 'gems'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {data!.gems.length > 0 && (
            <section className="page__section" aria-labelledby="search-gems">
              <h2 id="search-gems" className="page__h2">
                Gems
              </h2>
              <GemGrid>
                {data!.gems.map((g) => (
                  <GemCard key={g.id} gem={g} />
                ))}
              </GemGrid>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
