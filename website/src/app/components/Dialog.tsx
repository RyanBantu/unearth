import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Hide the visible title (it stays as the accessible name). */
  hideTitle?: boolean
}

export function Dialog({ open, onClose, title, children, hideTitle }: Props) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      const target = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, button')
      ;(target ?? panel.current)?.focus()
    })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="ux-dialog">
          <motion.div
            className="ux-dialog__scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            ref={panel}
            className="ux-dialog__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <h2 id={titleId} className={hideTitle ? 'sr-only' : 'ux-dialog__title'}>
              {title}
            </h2>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

type ConfirmProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel, busy, onConfirm, onClose }: ConfirmProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="ux-dialog__text">{message}</p>
      <div className="ux-dialog__actions">
        <button type="button" className="ux-btn ux-btn--outline" onClick={onClose} data-autofocus>
          Cancel
        </button>
        <button type="button" className="ux-btn ux-btn--danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}

type ChoiceProps = {
  open: boolean
  title: string
  choices: { label: string; onSelect: () => void; danger?: boolean }[]
  onClose: () => void
}

/** Action-sheet style list of choices. */
export function ChoiceDialog({ open, title, choices, onClose }: ChoiceProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="ux-choices">
        {choices.map((c) => (
          <button
            key={c.label}
            type="button"
            className={`ux-choice ${c.danger ? 'ux-choice--danger' : ''}`}
            onClick={c.onSelect}
          >
            {c.label}
          </button>
        ))}
        <button type="button" className="ux-choice ux-choice--cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Dialog>
  )
}
