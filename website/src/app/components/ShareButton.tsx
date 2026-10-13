import { Icon } from '../../components/Icon'
import { useToast } from './Toast'

/** Web Share sheet where available; otherwise copies the link and shows "Link copied". */
export function ShareButton({ title, text, className = 'ux-btn ux-btn--outline' }: { title: string; text?: string; className?: string }) {
  const toast = useToast()
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const share = async () => {
    const url = window.location.href.split('#')[0]
    if (canShare) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast('Link copied')
    } catch {
      toast('Couldn’t copy the link. Copy it from the address bar.')
    }
  }

  return (
    <button type="button" className={className} onClick={share}>
      <Icon name={canShare ? 'share' : 'link'} size={18} />
      {canShare ? 'Share' : 'Copy link'}
    </button>
  )
}
