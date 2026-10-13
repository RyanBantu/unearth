import { useRef } from 'react'
import { motion } from 'motion/react'
import { gsap, prefersReducedMotion, useGSAP } from '../../lib/gsap'
import { site } from '../../config'

const paragraph =
  'Review apps are full of paid reviews, inflated stars, and places everyone already knows. We wanted something smaller and more honest.'

const nots = ['No star ratings', 'No ads from businesses', 'No algorithm deciding what’s popular']

export function Why() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        '.why__word',
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.05,
          ease: 'none',
          scrollTrigger: { trigger: '.why__text', start: 'top 80%', end: 'bottom 45%', scrub: true },
        },
      )
    },
    { scope: root },
  )

  return (
    <section className="why" id="why" ref={root}>
      <div className="why__inner">
        <p className="kicker kicker--light">Why we built it</p>
        <p className="why__text">
          {paragraph.split(' ').map((w, i) => (
            <span className="why__word" key={i}>
              {w}{' '}
            </span>
          ))}
        </p>
        <ul className="why__nots">
          {nots.map((n, i) => (
            <motion.li
              key={n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
            >
              <span>{n}</span>
              <motion.i
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: 0.5 + i * 0.15, duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
              />
            </motion.li>
          ))}
        </ul>
        <motion.p
          className="why__punch"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Just people pointing each other toward places that are worth it.
        </motion.p>
        {site.founderNote && (
          <blockquote className="why__note">
            “{site.founderNote}”{site.founderName && <cite> — {site.founderName}</cite>}
          </blockquote>
        )}
      </div>
    </section>
  )
}
