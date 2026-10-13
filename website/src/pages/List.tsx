import { Link, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, GemCard, GemGridSkeleton, LoadingRegion, Skeleton } from '../app/components/bits'
import { ShareButton } from '../app/components/ShareButton'
import { AppStoreButton } from '../components/AppStoreButton'
import { useDocumentTitle } from '../app/hooks'
import { isPlaceSlug, listTitle, SITE_NAME } from '../app/places'
import { isNotFound, usePlace } from '../app/queries'
import NotFound from './NotFound'

/** /lists/:city/top and /lists/:city/new: numbered, because the order is the ranking. */
export default function List() {
  const { city = '', kind = '' } = useParams()
  const valid = isPlaceSlug(city) && (kind === 'top' || kind === 'new')
  if (!valid) return <NotFound />
  return <ListView key={`${city}/${kind}`} city={city} kind={kind as 'top' | 'new'} />
}

function ListView({ city, kind }: { city: string; kind: 'top' | 'new' }) {
  const result = usePlace({ city, sort: kind === 'top' ? 'polished' : 'new' })
  const first = result.data?.pages[0]
  const title = first ? listTitle(kind, first.place.city) : null
  useDocumentTitle(title ? `${title} · ${SITE_NAME}` : undefined)

  if (result.isError && isNotFound(result.error)) {
    return <NotFound title="Place not found" message="We don’t have any gems here yet." />
  }

  const gems = (first?.gems ?? [])
    .filter((g) => kind === 'new' || g.status.primary === 'Polished')
    .slice(0, 10)
  const other = kind === 'top' ? 'new' : 'top'

  return (
    <div className="page page--narrow">
      <header className="page__head">
        {first && (
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to={`/${city}`}>{first.place.city}</Link>
          </nav>
        )}
        {title ? (
          <div className="page__title-row">
            <h1 className="page__title">{title}</h1>
            <ShareButton title={title} />
          </div>
        ) : (
          <LoadingRegion label="Loading list…">
            <Skeleton className="sk--title" />
          </LoadingRegion>
        )}
      </header>

      {result.isError ? (
        <ErrorState onRetry={() => result.refetch()} />
      ) : result.isPending ? (
        <GemGridSkeleton count={4} />
      ) : gems.length === 0 ? (
        <EmptyState
          title={kind === 'top' ? `No Polished gems in ${first!.place.city} yet.` : `No gems in ${first!.place.city} yet.`}
          message="A gem turns Polished once three people find it independently."
          action={<AppStoreButton />}
        />
      ) : (
        <ol className="ranked">
          {gems.map((g, i) => (
            <li key={g.id}>
              <GemCard gem={{ ...g, watchOut: null }} rank={i + 1} />
            </li>
          ))}
        </ol>
      )}

      {first && (
        <nav className="list-links" aria-label="More lists">
          <Link to={`/lists/${city}/${other}`}>{listTitle(other, first.place.city)}</Link>
          <Link to={`/${city}`}>All gems in {first.place.city}</Link>
        </nav>
      )}
    </div>
  )
}
