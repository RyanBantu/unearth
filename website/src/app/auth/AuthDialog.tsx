import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '../../components/Icon'
import { Logo } from '../../components/Logo'
import { api, ApiError, errorMessage } from '../api'
import { Dialog } from '../components/Dialog'
import { HANDLE_RE } from '../format'
import type { AuthResult } from '../types'
import { AppleSignInCancelled, appleServicesId, loadAppleSignIn, signInWithApple } from './appleSignIn'

export type AuthStep = 'signin' | 'terms' | 'handle'

type Props = {
  step: AuthStep | null
  reason?: string
  onDone: () => Promise<void>
  onClose: () => void
}

const titles: Record<AuthStep, string> = {
  signin: 'Sign in to continue',
  terms: 'Terms of Use',
  handle: 'Pick a handle',
}

export function AuthDialog({ step, reason, onDone, onClose }: Props) {
  const [lastStep, setLastStep] = useState<AuthStep>('signin')
  if (step && step !== lastStep) setLastStep(step)
  const shown = step ?? lastStep

  return (
    <Dialog open={!!step} onClose={onClose} title={titles[shown]}>
      {shown === 'signin' && <SignInStep reason={reason} onDone={onDone} />}
      {shown === 'terms' && <TermsStep onDone={onDone} />}
      {shown === 'handle' && <HandleStep onDone={onDone} />}
    </Dialog>
  )
}

function SignInStep({ reason, onDone }: { reason?: string; onDone: () => Promise<void> }) {
  const [apple, setApple] = useState<Awaited<ReturnType<typeof loadAppleSignIn>> | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!appleServicesId) return
    let live = true
    loadAppleSignIn().then(
      (a) => live && setApple(a),
      () => live && setError('Sign in with Apple could not load. Check your connection and try again.'),
    )
    return () => {
      live = false
    }
  }, [])

  async function signIn() {
    if (!apple) return
    setBusy(true)
    setError(null)
    try {
      const credential = await signInWithApple(apple)
      await api<AuthResult>('POST', '/auth/web/apple', credential)
      await onDone()
    } catch (err) {
      if (!(err instanceof AppleSignInCancelled)) setError(errorMessage(err, 'Sign in failed. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function devSignIn() {
    setBusy(true)
    try {
      await api<AuthResult>('POST', '/auth/dev', { handle: 'webdev', web: true })
      await onDone()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ux-auth">
      <Logo size={52} />
      <p className="ux-dialog__text">
        {reason ?? 'Sign in to stash gems, vote, and unearth your own.'} Browsing stays open to everyone.
      </p>
      <button
        type="button"
        className="ux-apple-btn"
        onClick={signIn}
        disabled={!apple || busy}
        data-autofocus
      >
        <Icon name="apple" size={20} />
        {busy ? 'Signing in…' : 'Sign in with Apple'}
      </button>
      {!appleServicesId && (
        <p className="ux-field__error">Sign in with Apple isn’t configured (APPLE_SERVICES_ID).</p>
      )}
      {import.meta.env.DEV && (
        <button type="button" className="ux-link-btn" onClick={devSignIn} disabled={busy}>
          Dev sign in (local only)
        </button>
      )}
      {error && (
        <p className="ux-field__error" role="alert">
          {error}
        </p>
      )}
      <p className="ux-auth__fine">
        By continuing you agree to the <Link to="/terms">Terms of Use</Link> and{' '}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>
    </div>
  )
}

function TermsStep({ onDone }: { onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function agree() {
    setBusy(true)
    setError(null)
    try {
      await api('POST', '/me/agree-terms')
      await onDone()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ux-auth ux-auth--left">
      <p className="ux-dialog__text">
        Post public places only. No abusive, hateful or sexual content, spam or private homes. We remove reported
        content within 24 hours and ban users who break the rules.
      </p>
      <a className="ux-inline-link" href="/terms" target="_blank" rel="noreferrer">
        Read the full Terms of Use <Icon name="external" size={15} />
      </a>
      {error && (
        <p className="ux-field__error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="ux-btn ux-btn--primary ux-btn--block" onClick={agree} disabled={busy} data-autofocus>
        {busy ? 'Saving…' : 'I agree'}
      </button>
    </div>
  )
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function HandleStep({ onDone }: { onDone: () => Promise<void> }) {
  const [handle, setHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounced = useDebounced(handle, 300)
  const valid = HANDLE_RE.test(handle)

  const availability = useQuery({
    queryKey: ['handle-available', debounced],
    queryFn: () => api<{ available: boolean }>('GET', `/handles/${debounced}/available`).then((r) => r.available),
    enabled: HANDLE_RE.test(debounced),
  })
  const checked = debounced === handle && availability.data !== undefined && !availability.isFetching
  const available = checked ? availability.data : undefined

  let hint = '3–20 characters: lowercase letters, numbers, underscore.'
  if (handle && !valid) hint = handle.length < 3 ? 'At least 3 characters.' : 'Lowercase letters, numbers and underscore only.'
  else if (valid && available === true) hint = `@${handle} is available.`
  else if (valid && available === false) hint = `@${handle} is taken.`
  else if (valid) hint = 'Checking…'

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || available === false) return
    setBusy(true)
    setError(null)
    try {
      await api('PUT', '/me/handle', { handle })
      await onDone()
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? 'That handle is taken.' : errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="ux-auth ux-auth--left" onSubmit={save}>
      <p className="ux-dialog__text">This is how other prospectors will find you when you Unearth gems.</p>
      <label className="ux-field">
        <span className="ux-field__label">Handle</span>
        <span className="ux-input ux-input--prefix">
          <span aria-hidden="true">@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
            placeholder="yourhandle"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby="handle-hint"
            data-autofocus
          />
        </span>
        <span
          id="handle-hint"
          className={`ux-field__hint ${available === false || (handle && !valid) ? 'is-bad' : ''} ${available ? 'is-good' : ''}`}
          aria-live="polite"
        >
          {hint}
        </span>
      </label>
      {error && (
        <p className="ux-field__error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="ux-btn ux-btn--primary ux-btn--block" disabled={!valid || available !== true || busy}>
        {busy ? 'Saving…' : 'Continue'}
      </button>
    </form>
  )
}
