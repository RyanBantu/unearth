import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AppStoreButton } from '../../components/AppStoreButton'
import { Logo } from '../../components/Logo'
import { Dialog } from './Dialog'

const GetTheAppContext = createContext<(reason?: string) => void>(() => {})

const DEFAULT_REASON = 'Unearthing gems, adding your find, voting and stashing all happen in the Unearth iPhone app.'

/** Any would-be write action (vote, stash, "I found it too", report) opens this instead. */
export function GetTheAppProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<string | null>(null)
  const open = useCallback((why?: string) => setReason(why ?? DEFAULT_REASON), [])

  return (
    <GetTheAppContext.Provider value={open}>
      {children}
      <Dialog open={reason !== null} onClose={() => setReason(null)} title="Get the app">
        <div className="gta-dialog">
          <Logo size={52} />
          <p className="ux-dialog__text">{reason}</p>
          <AppStoreButton />
          <button type="button" className="ux-btn ux-btn--ghost" onClick={() => setReason(null)}>
            Not now
          </button>
        </div>
      </Dialog>
    </GetTheAppContext.Provider>
  )
}

export function useGetTheApp() {
  return useContext(GetTheAppContext)
}

export function GetTheAppCard({ title, text }: { title: string; text: string }) {
  return (
    <aside className="gta-card">
      <Logo size={40} />
      <div className="gta-card__copy">
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <AppStoreButton />
    </aside>
  )
}
