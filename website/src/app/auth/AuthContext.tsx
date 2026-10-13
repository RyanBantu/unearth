import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { keys, useMe } from '../queries'
import type { Me } from '../types'
import { AuthDialog, type AuthStep } from './AuthDialog'

type AuthContextValue = {
  /** undefined while loading, null when signed out. */
  user: Me | null | undefined
  loading: boolean
  /** Runs `action` now if the user is ready to act; otherwise signs in / agrees / picks a handle first. */
  requireAuth: (action?: () => void, reason?: string) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function nextStep(me: Me | null | undefined): AuthStep | null {
  if (!me) return 'signin'
  if (me.needsTerms) return 'terms'
  if (!me.handle) return 'handle'
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const me = useMe()
  const [step, setStep] = useState<AuthStep | null>(null)
  const [reason, setReason] = useState<string | undefined>()
  const pending = useRef<(() => void) | undefined>(undefined)

  const requireAuth = useCallback(
    (action?: () => void, why?: string) => {
      const s = nextStep(me.data)
      if (!s) {
        action?.()
        return
      }
      pending.current = action
      setReason(why)
      setStep(s)
    },
    [me.data],
  )

  /** Called after each step finishes: refresh the user, then continue or run the pending action. */
  const advance = useCallback(async () => {
    const fresh = await qc.fetchQuery({ queryKey: keys.me, queryFn: () => api<Me>('GET', '/me'), staleTime: 0 })
    const s = nextStep(fresh)
    setStep(s)
    if (!s) {
      const action = pending.current
      pending.current = undefined
      action?.()
    }
  }, [qc])

  const close = useCallback(() => {
    pending.current = undefined
    setStep(null)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api<void>('POST', '/auth/web/logout')
    } finally {
      qc.clear()
      qc.setQueryData(keys.me, null)
    }
  }, [qc])

  const value = useMemo<AuthContextValue>(
    () => ({ user: me.data, loading: me.isPending, requireAuth, signOut }),
    [me.data, me.isPending, requireAuth, signOut],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthDialog step={step} reason={reason} onDone={advance} onClose={close} />
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
