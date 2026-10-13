import { Fragment, useRef } from 'react'
import { gsap, prefersReducedMotion, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { TiltCard } from '../TiltCard'

const principles = [
  {
    title: 'Real finds only.',
    body: 'Gems are posted by people who’ve been there, not by businesses paying for attention.',
    tone: 'green',
  },
  {
    title: 'Public places only.',
    body: 'No homes, no private property, nothing that puts someone at risk.',
    tone: 'amber',
  },
  {
    title: 'Respect the gem.',
    body: 'Hidden places stay good when visitors are kind to them and the people who run them.',
    tone: 'ink',
  },
]

export function Principles() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.set('.principle', { opacity: 0, y: 80, rotate: (i: number) => (i - 1) * 4 })
      ScrollTrigger.batch('.principle', {
        start: 'top 85%',
        once: true,
        onEnter: (els) =>
          gsap.to(els, { opacity: 1, y: 0, rotate: 0, stagger: 0.15, duration: 1, ease: 'elastic.out(1, 0.75)' }),
      })
      gsap.from('.principles__title span', {
        yPercent: 100,
        opacity: 0,
        stagger: 0.08,
        duration: 0.8,
        ease: 'power4.out',
        scrollTrigger: { trigger: '.principles__title', start: 'top 85%' },
      })
    },
    { scope: root },
  )

  return (
    <section className="section" id="principles" ref={root}>
      <p className="kicker">Our principles</p>
      <h2 className="section__title principles__title" aria-label="Three rules we don't bend.">
        {'Three rules we don’t bend.'.split(' ').map((w, i) => (
          <Fragment key={i}>
            <span aria-hidden="true">{w}</span>{' '}
          </Fragment>
        ))}
      </h2>
      <div className="principles">
        {principles.map((p, i) => (
          <div className="principle" key={p.title}>
            <TiltCard className={`principle__card principle__card--${p.tone}`} max={10}>
              <span className="principle__n">0{i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </TiltCard>
          </div>
        ))}
      </div>
    </section>
  )
}
