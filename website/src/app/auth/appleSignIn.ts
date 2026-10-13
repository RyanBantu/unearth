const APPLE_JS =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'

type AppleSignInResponse = {
  authorization: { code: string; id_token: string; state?: string }
  user?: { email?: string; name?: { firstName?: string; lastName?: string } }
}

type AppleIDGlobal = {
  auth: {
    init: (config: {
      clientId: string
      scope: string
      redirectURI: string
      state?: string
      usePopup: boolean
    }) => void
    signIn: () => Promise<AppleSignInResponse>
  }
}

declare global {
  interface Window {
    AppleID?: AppleIDGlobal
  }
}

export const appleServicesId: string = import.meta.env.APPLE_SERVICES_ID ?? ''

let loading: Promise<AppleIDGlobal> | null = null

/** Loads Apple's JS once. Call before the click so signIn() runs inside the user gesture. */
export function loadAppleSignIn(): Promise<AppleIDGlobal> {
  if (loading) return loading
  loading = new Promise<AppleIDGlobal>((resolve, reject) => {
    if (window.AppleID) return resolve(window.AppleID)
    const script = document.createElement('script')
    script.src = APPLE_JS
    script.async = true
    script.onload = () => (window.AppleID ? resolve(window.AppleID) : reject(new Error('AppleID missing')))
    script.onerror = () => reject(new Error('Could not load Sign in with Apple'))
    document.head.appendChild(script)
  })
  loading.catch(() => {
    loading = null
  })
  return loading
}

export class AppleSignInCancelled extends Error {}

/** Popup sign-in. The redirect URI is the site origin, which must be registered on the Services ID. */
export async function signInWithApple(apple: AppleIDGlobal) {
  const state = crypto.randomUUID()
  apple.auth.init({
    clientId: appleServicesId,
    scope: 'name email',
    redirectURI: window.location.origin,
    state,
    usePopup: true,
  })
  let res: AppleSignInResponse
  try {
    res = await apple.auth.signIn()
  } catch (err) {
    const code = (err as { error?: string })?.error
    if (code === 'popup_closed_by_user' || code === 'user_cancelled_authorize') throw new AppleSignInCancelled()
    throw new Error(code ?? 'Sign in with Apple failed')
  }
  if (res.authorization.state !== state) throw new Error('Sign in with Apple state mismatch')
  return {
    idToken: res.authorization.id_token,
    code: res.authorization.code,
    redirectUri: window.location.origin,
    user: res.user,
  }
}
