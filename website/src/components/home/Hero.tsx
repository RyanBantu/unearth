import { Fragment, useRef } from 'react'
import { animated, useSpring } from '@react-spring/web'
import { AppStoreButton } from '../AppStoreButton'
import { MapMock } from './MapMock'
import { gsap, prefersReducedMotion, useGSAP } from '../../lib/gsap'

const headline = ['The', 'best', 'places', 'aren’t', 'on', 'the', 'top-10', 'lists.']

export function Hero() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from('.hero__eyebrow', { y: 20, opacity: 0, duration: 0.8 })
        .from('.hero__word > span', { yPercent: 115, rotate: 6, duration: 1.1, stagger: 0.06 }, '-=0.5')
        .from('.hero__strike', { scaleX: 0, transformOrigin: 'left center', duration: 0.7, ease: 'power3.inOut' }, '-=0.3')
        .from('.hero__sub, .hero__actions', { y: 24, opacity: 0, duration: 0.9, stagger: 0.12 }, '-=0.5')

      gsap.to('.hero__visual', {
        yPercent: -8,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      })
    },
    { scope: root },
  )

  const float = useSpring({
    from: { y: 0, rotate: -8 },
    to: { y: -14, rotate: 6 },
    loop: { reverse: true },
    config: { mass: 2, tension: 60, friction: 14 },
  })

  return (
    <section className="hero" ref={root}>
      <div className="hero__copy">
        <p className="hero__eyebrow">
          <span className="dot" /> For places locals send their friends to
        </p>
        <h1 className="hero__title">
          {headline.map((w, i) => (
            <Fragment key={i}>
              <span className="hero__word">
                <span className={w === 'top-10' ? 'hero__top10' : undefined}>
                  {w}
                  {w === 'top-10' && <i className="hero__strike" aria-hidden="true" />}
                </span>
              </span>{' '}
            </Fragment>
          ))}
        </h1>
        <p className="hero__sub">
          Unearth is where the dosa stall with no sign, the café three floors up and the viewpoint at the end of a dirt
          road get shared. No star ratings. No ads. No algorithm.
        </p>
        <div className="hero__actions">
          <AppStoreButton />
          <a className="btn-ghost" href="#how">
            See how it works
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14m0 0-6-6m6 6 6-6" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            </svg>
          </a>
        </div>
      </div>

      <div className="hero__visual">
        <animated.svg className="hero__gem" style={float} width="84" height="84" viewBox="0 0 64 64" aria-hidden="true">
          <path d="M14 24 22 12h20l8 12-18 28z" fill="var(--amber-pin)" />
          <path d="M14 24h36L32 52z" fill="var(--amber)" />
          <path d="M22 12l4 12 6-12 6 12 4-12" fill="none" stroke="#FDF0DD" strokeWidth="1.6" strokeLinejoin="round" opacity=".7" />
          <path d="M26 24l6 28 6-28" fill="none" stroke="#FDF0DD" strokeWidth="1.6" opacity=".45" />
        </animated.svg>
        <div className="phone">
          <MapMock />
        </div>
      </div>
    </section>
  )
}
