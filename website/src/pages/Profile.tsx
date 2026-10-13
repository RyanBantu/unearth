import { useParams } from 'react-router-dom'
import { Avatar, Badge, EmptyState, ErrorState, GemCard, GemGrid, GemGridSkeleton, LoadingRegion, Skeleton } from '../app/components/bits'
import { useDocumentTitle } from '../app/hooks'
import { isNotFound, useProfile } from '../app/queries'
import type { GemCardData, ProfileFind } from '../app/types'
import NotFound from './NotFound'

const HANDLE_RE = /^[a-z0-9_]{3,20}$/

function toCard(f: ProfileFind): GemCardData {
  return {
    ...f.gem,
    score: f.gem.upvotes - f.gem.downvotes,
    createdAt: f.createdAt,
    loved: f.liked,
    watchOut: f.disliked,
  }
}

export default function Profile() {
  const { handle = '' } = useParams()
  const clean = handle.replace(/^@/, '').toLowerCase()
  const valid = HANDLE_RE.test(clean)
  const profile = useProfile(valid ? clean : undefined)
  useDocumentTitle(valid ? `@${clean} · Unearth` : undefined)

  if (!valid || (profile.isError && isNotFound(profile.error))) {
    return <NotFound title="No one here by that name" message={`There’s no prospector called @${clean}.`} />
  }

  return (
    <div className="page">
      <header className="profile">
        <Avatar handle={clean} size={64} />
        <div>
          <h1 className="page__title">@{clean}</h1>
          {profile.data ? (
            <div className="profile__meta">
              {profile.data.user.level && <Badge text={profile.data.user.level} variant="polished" />}
              <span>
                {profile.data.user.gemsUnearthed ?? 0} {(profile.data.user.gemsUnearthed ?? 0) === 1 ? 'gem' : 'gems'} unearthed
              </span>
              <span>
                {profile.data.user.firstFinds ?? 0} First {(profile.data.user.firstFinds ?? 0) === 1 ? 'find' : 'finds'}
              </span>
            </div>
          ) : (
            !profile.isError && (
              <LoadingRegion label="Loading profile…">
                <Skeleton className="sk--line sk--short" />
              </LoadingRegion>
            )
          )}
        </div>
      </header>

      {profile.isError ? (
        <ErrorState message="Couldn’t load this profile. Try again." onRetry={() => profile.refetch()} />
      ) : profile.isPending ? (
        <GemGridSkeleton count={4} />
      ) : profile.data.finds.length === 0 ? (
        <EmptyState title="No finds yet" message={`@${clean} hasn’t unearthed anything public yet.`} />
      ) : (
        <section className="page__section" aria-labelledby="profile-finds">
          <h2 id="profile-finds" className="page__h2">
            Finds
          </h2>
          <GemGrid>
            {profile.data.finds.map((f) => (
              <GemCard key={f.id} gem={toCard(f)} />
            ))}
          </GemGrid>
        </section>
      )}
    </div>
  )
}
