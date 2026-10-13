import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Avatar, Badge, ErrorState, GemCard, GemGrid, LoadingRegion, Skeleton, StatusBadges } from '../app/components/bits'
import { GetTheAppCard, useGetTheApp } from '../app/components/GetTheApp'
import { ShareButton } from '../app/components/ShareButton'
import { categoryLabel, formatDate } from '../app/format'
import { useDocumentTitle } from '../app/hooks'
import {
  appleMapsUrl,
  CATEGORY_CHIPS,
  gemTitle,
  googleMapsDirectionsUrl,
  PLACE_SLUG_RE,
  placePath,
  prefersAppleMaps,
} from '../app/places'
import { isNotFound, useGem, usePlace } from '../app/queries'
import type { Find, GemDetail } from '../app/types'
import NotFound from './NotFound'

export default function Gem() {
  const { slug = '' } = useParams()
  const valid = PLACE_SLUG_RE.test(slug) && slug.length <= 80
  const gem = useGem(valid ? slug : undefined)
  useDocumentTitle(gem.data ? gemTitle(gem.data.name, gem.data.city, gem.data.area) : undefined)

  if (!valid || (gem.isError && isNotFound(gem.error))) {
    return <NotFound title="Gem not found" message="It may have been removed, or the link is wrong." />
  }
  if (gem.isError) {
    return (
      <div className="page page--narrow">
        <ErrorState message="Couldn’t load this gem. Try again." onRetry={() => gem.refetch()} />
      </div>
    )
  }
  if (gem.isPending) {
    return (
      <div className="page page--narrow">
        <LoadingRegion label="Loading gem…">
          <Skeleton className="sk--line sk--short" />
          <Skeleton className="sk--title" />
          <Skeleton className="sk--line" />
          <Skeleton className="sk--block" />
        </LoadingRegion>
      </div>
    )
  }
  return <GemView gem={gem.data} />
}

function FindBody({ find }: { find: Find }) {
  return (
    <>
      <p className="gem__description">{find.description}</p>
      {(find.liked || find.disliked) && (
        <div className="gem__liked">
          {find.liked && (
            <div className="gem__liked-card">
              <span className="gem__liked-label gem__liked-label--good">Liked</span>
              <p>{find.liked}</p>
            </div>
          )}
          {find.disliked && (
            <div className="gem__liked-card">
              <span className="gem__liked-label gem__liked-label--bad">Didn’t like</span>
              <p>{find.disliked}</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function Handle({ handle }: { handle: string | null }) {
  if (!handle) return <span>a prospector</span>
  return <Link to={`/u/${handle}`}>@{handle}</Link>
}

function GemView({ gem }: { gem: GemDetail }) {
  const getTheApp = useGetTheApp()
  const firstFind = gem.finds.find((f) => f.isFirstFind) ?? gem.finds[0]
  const others = gem.finds.filter((f) => f !== firstFind)
  const tags = useMemo(() => [...new Set(gem.finds.flatMap((f) => f.tags))], [gem.finds])
  const finders = gem.findCount
  const categoryChip = CATEGORY_CHIPS.find((c) => c.category === gem.category)

  const directions = [
    { key: 'apple', label: 'Apple Maps', href: appleMapsUrl(gem) },
    { key: 'google', label: 'Google Maps', href: googleMapsDirectionsUrl(gem) },
  ]
  if (!prefersAppleMaps()) directions.reverse()

  return (
    <article className="page page--narrow gem">
      {gem.citySlug && (
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to={`/${gem.citySlug}`}>{gem.city}</Link>
          {gem.areaSlug && (
            <>
              <Icon name="chevron" size={14} />
              <Link to={placePath(gem.citySlug, gem.areaSlug)}>{gem.area}</Link>
            </>
          )}
          <Icon name="chevron" size={14} />
          <Link to={placePath(gem.citySlug, gem.areaSlug, gem.category)}>{categoryChip?.label ?? categoryLabel[gem.category]}</Link>
        </nav>
      )}

      <header className="gem__header">
        <div className="gem__badges">
          <Badge text={categoryLabel[gem.category]} />
          <StatusBadges status={gem.status} />
        </div>
        <h1 className="gem__title">{gem.name}</h1>
        {gem.address && <p className="gem__address">{gem.address}</p>}
        <p className="gem__finders">
          <span className="gem__avatars" aria-hidden="true">
            {gem.finds.slice(0, 3).map((f) => (
              <Avatar key={f.id} handle={f.handle} size={26} />
            ))}
          </span>
          <span>
            Unearthed independently by {finders} {finders === 1 ? 'person' : 'people'}
          </span>
        </p>
      </header>

      <div className="gem__actions">
        <div className="gem__directions" role="group" aria-label="Directions">
          {directions.map((d) => (
            <a key={d.key} className="ux-btn ux-btn--primary" href={d.href} target="_blank" rel="noreferrer">
              <Icon name="directions" size={18} />
              {d.label}
            </a>
          ))}
        </div>
        <div className="gem__actions-row">
          <ShareButton title={gem.name} text={`${gem.name} on Unearth`} />
          {gem.googleMapsUrl && (
            <a className="ux-btn ux-btn--outline" href={gem.googleMapsUrl} target="_blank" rel="noreferrer">
              <Icon name="external" size={18} />
              Open Google Maps link
            </a>
          )}
          <button type="button" className="ux-btn ux-btn--outline" onClick={() => getTheApp('Add your find to this gem with “I found it too” in the Unearth iPhone app.')}>
            <Icon name="gem" size={18} />
            I found it too
          </button>
          <button type="button" className="ux-btn ux-btn--outline" onClick={() => getTheApp('Stash gems to visit later in the Unearth iPhone app.')}>
            <Icon name="stash" size={18} />
            Stash
          </button>
        </div>
      </div>

      {firstFind && (
        <section className="gem__first" aria-labelledby="first-find">
          <h2 id="first-find" className="gem__find-head">
            <Avatar handle={firstFind.handle} size={30} />
            <span>
              First find by <Handle handle={firstFind.handle} />
              <small> · {formatDate(firstFind.createdAt)}</small>
            </span>
          </h2>
          <FindBody find={firstFind} />
        </section>
      )}

      {tags.length > 0 && (
        <ul className="gem__tags" aria-label="Tags">
          {tags.map((t) => (
            <li key={t}>
              <Badge text={t} />
            </li>
          ))}
        </ul>
      )}

      <div className="gem__votes">
        <span className="gem__votes-q">Worth the trip?</span>
        <button type="button" className="gem__vote" onClick={() => getTheApp('Voting happens in the Unearth iPhone app.')}>
          <Icon name="thumbs" size={18} />
          <span className="sr-only">Thumbs up:</span> {gem.upvotes}
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" className="gem__vote" onClick={() => getTheApp('Voting happens in the Unearth iPhone app.')}>
          <Icon name="thumbs-down" size={18} />
          <span className="sr-only">Thumbs down:</span> {gem.downvotes}
        </button>
      </div>

      {others.length > 0 && (
        <section className="gem__others" aria-labelledby="other-finds">
          <h2 id="other-finds">
            {others.length} more {others.length === 1 ? 'find' : 'finds'}
          </h2>
          <ul>
            {others.map((f) => (
              <li key={f.id}>
                <p className="gem__other-head">
                  <Avatar handle={f.handle} size={26} />
                  <span>
                    <Handle handle={f.handle} />
                    <small> · {formatDate(f.createdAt)}</small>
                  </span>
                </p>
                <FindBody find={f} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <GetTheAppCard title="Been here? Add your find in the app" text="Tap “I found it too” in Unearth to add what you loved and what to watch out for." />

      <p className="gem__report">
        <button type="button" className="ux-link-btn" onClick={() => getTheApp('Reporting and blocking happen in the Unearth iPhone app. You can also email us.')}>
          Report this gem
        </button>
      </p>

      {gem.citySlug && gem.areaSlug && <MoreInArea gem={gem} />}
    </article>
  )
}

function MoreInArea({ gem }: { gem: GemDetail }) {
  const more = usePlace({ city: gem.citySlug!, area: gem.areaSlug!, sort: 'polished' })
  const gems = (more.data?.pages[0]?.gems ?? []).filter((g) => g.id !== gem.id).slice(0, 4)
  if (more.isError || (!more.isPending && gems.length === 0)) return null

  return (
    <section className="gem__more" aria-labelledby="more-in-area">
      <h2 id="more-in-area" className="page__h2">
        More gems in {gem.area}
      </h2>
      {more.isPending ? (
        <LoadingRegion>
          <Skeleton className="sk--block" />
        </LoadingRegion>
      ) : (
        <GemGrid>
          {gems.map((g) => (
            <GemCard key={g.id} gem={g} showArea={false} />
          ))}
        </GemGrid>
      )}
      <Link to={placePath(gem.citySlug!, gem.areaSlug)} className="ux-inline-link">
        See all gems in {gem.area}
      </Link>
    </section>
  )
}
