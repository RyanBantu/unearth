import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'

/** Only loaded when WEB_SIGN_IN_ENABLED=true (see App.tsx and Nav.tsx). */
export default function WebAuth({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

export function AccountButton() {
  const { user, loading, requireAuth, signOut } = useAuth()
  if (loading) return null
  if (!user) {
    return (
      <button type="button" className="nav__account" onClick={() => requireAuth()}>
        Sign in
      </button>
    )
  }
  return (
    <span className="nav__account-group">
      {user.handle && <Link to={`/u/${user.handle}`}>@{user.handle}</Link>}
      <button type="button" className="nav__account" onClick={() => signOut()}>
        Sign out
      </button>
    </span>
  )
}
