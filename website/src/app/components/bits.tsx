import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { badgeVariant, categoryIcon, categoryLabel, formatDistance, pinTone } from '../format'
import type { GemCardData, GemStatus } from '../types'

export function Badge({ text, variant = 'neutral' }: { text: string; variant?: ReturnType<typeof badgeVariant> }) {
  return <span className={`ux-badge ux-badge--${variant}`}>{text}</span>
}

const AVATAR_SHADES = ['#1f6b4f', '#154d39', '#2f7d5d', '#3d8a68', '#246148', '#4a8f6f']

/** Generated avatar: initial letter on a shade of green (no uploads). */
export function Avatar({ handle, size = 28 }: { handle: string | null; size?: number }) {
  const name = handle ?? '?'
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span
      className="ux-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.44,
        background: AVATAR_SHADES[hash % AVATAR_SHADES.length],
      }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export function StatusBadges({ status }: { status: GemStatus }) {
  return (
    <>
      {status.labels.map((label) => (
        <Badge key={label} text={label} variant={badgeVariant(label)} />
      ))}
    </>
  )
}

/** "+12" / "−1" / "0" */
export function formatScore(score: number): string {
  if (score > 0) return `+${score}`
  if (score < 0) return `−${Math.abs(score)}`
  return '0'
}

/** Gem card: name, category · area, badges, net thumbs, first Loved / Watch out lines. */
export function GemCard({
  gem,
  rank,
  distanceM,
  showArea = true,
}: {
  gem: GemCardData
  rank?: number
  distanceM?: number | null
  showArea?: boolean
}) {
  const distance = formatDistance(distanceM)
  const where = showArea ? gem.area ?? gem.city : null
  return (
    <Link to={`/g/${gem.slug}`} className="gcard">
      {rank !== undefined && (
        <span className="gcard__rank" aria-label={`Number ${rank}`}>
          {rank}
        </span>
      )}
      <span className="gcard__head">
        <span className={`gcard__tile gcard__tile--${pinTone(gem.category)}`} aria-hidden="true">
          <Icon name={categoryIcon[gem.category]} size={24} />
        </span>
        <span className="gcard__title">
          <span className="gcard__name">{gem.name}</span>
          <span className="gcard__meta">
            {categoryLabel[gem.category]}
            {where ? ` · ${where}` : ''}
            {distance ? ` · ${distance} away` : ''}
          </span>
        </span>
        <span className="gcard__score" title={`${gem.upvotes} up, ${gem.downvotes} down`}>
          <Icon name="thumbs" size={15} />
          <span className="sr-only">Net score</span>
          {formatScore(gem.score)}
        </span>
      </span>
      <span className="gcard__badges">
        <StatusBadges status={gem.status} />
      </span>
      {(gem.loved || gem.watchOut) && (
        <span className="gcard__lines">
          {gem.loved && (
            <span className="gcard__line gcard__line--good">
              <strong>Loved</strong> {gem.loved}
            </span>
          )}
          {gem.watchOut && (
            <span className="gcard__line gcard__line--bad">
              <strong>Watch out</strong> {gem.watchOut}
            </span>
          )}
        </span>
      )}
    </Link>
  )
}

export function GemGrid({ children }: { children: ReactNode }) {
  return <div className="ggrid">{children}</div>
}

export function GemGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="ggrid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="gcard gcard--skeleton">
          <span className="sk sk--tile" />
          <span className="sk sk--line" />
          <span className="sk sk--line sk--short" />
        </div>
      ))}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`sk ${className}`} aria-hidden="true" />
}

export function LoadingRegion({ label = 'Loading…', children }: { label?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

export function EmptyState({ title, message, action }: { title: string; message?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ux-state ux-state--empty">
      <strong>{title}</strong>
      {message && <span>{message}</span>}
      {action}
    </div>
  )
}

export function ErrorState({ onRetry, message = 'Couldn’t load gems. Try again.' }: { onRetry: () => void; message?: string }) {
  return (
    <div className="ux-state ux-state--error" role="alert">
      <strong>{message}</strong>
      <button type="button" className="ux-btn ux-btn--outline ux-btn--sm" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
