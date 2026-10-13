import { useRef } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '../../lib/gsap'

const places = [
  { emoji: '🥞', text: 'The dosa stall with no sign.' },
  { emoji: '☕️', text: 'The café three floors up that only regulars know.' },
  { emoji: '🌄', text: 'The viewpoint at the end of a dirt road.' },
]

export function Places() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: 'top 70%', end: 'bottom 60%', scrub: 0.6 },
      })
      tl.from('.places__item', { opacity: 0.12, x: -40, stagger: 0.4, ease: 'power2.out' })
        .from('.places__not', { opacity: 0, y: 30 }, '+=0.1')
        .from('.places__strike', { scaleX: 0, transformOrigin: 'left center', ease: 'power2.inOut' })
        .from('.places__shared', { opacity: 0, scale: 0.92, ease: 'back.out(2)' })
    },
    { scope: root },
  )

  return (
    <section className="places" ref={root}>
      <p className="kicker">They're the places…</p>
      <ul className="places__list">
        {places.map((p) => (
          <li className="places__item" key={p.text}>
            <span className="places__emoji" aria-hidden="true">
              {p.emoji}
            </span>
            {p.text}
          </li>
        ))}
      </ul>
      <p className="places__not">
        The places locals send their friends to.{' '}
        <span className="places__struck">
          Not the ones with 4,000 reviews and a queue out the door.
          <i className="places__strike" aria-hidden="true" />
        </span>
      </p>
      <p className="places__shared">
        <span>Unearth</span> is where those places get shared.
      </p>
    </section>
  )
}
