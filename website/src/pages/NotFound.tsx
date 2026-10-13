import { Link } from 'react-router-dom'
import { EmptyState } from '../app/components/bits'
import { SearchBox } from '../app/components/SearchBox'
import { useDocumentTitle } from '../app/hooks'

export default function NotFound({
  title = 'Nothing buried here',
  message = 'The link may be wrong, or the gem was removed.',
}: {
  title?: string
  message?: string
}) {
  useDocumentTitle(`${title} · Unearth`)
  return (
    <div className="page page--narrow">
      <EmptyState
        title={title}
        message={message}
        action={
          <>
            <SearchBox />
            <Link to="/" className="ux-btn ux-btn--ghost">
              Back to Unearth
            </Link>
          </>
        }
      />
    </div>
  )
}
