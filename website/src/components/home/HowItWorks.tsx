import { motion } from 'motion/react'
import { TiltCard } from '../TiltCard'
import { Reveal } from '../Reveal'

function UnearthArt() {
  return (
    <div className="art art--unearth">
      <motion.div
        className="art__pin"
        initial={{ y: -60, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.3 }}
      >
        <svg width="40" height="50" viewBox="0 0 34 42" aria-hidden="true">
          <path d="M17 41s14-13.4 14-24A14 14 0 0 0 3 17c0 10.6 14 24 14 24Z" fill="var(--amber-pin)" />
          <path d="M11 16l2.5-3.5h7L23 16l-6 7z" fill="#fff" />
        </svg>
      </motion.div>
      <motion.span
        className="art__ripple"
        initial={{ scale: 0, opacity: 0.6 }}
        whileInView={{ scale: 2.2, opacity: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, delay: 0.55 }}
      />
      <div className="art__fields">
        <span className="chip chip--green">♥ What you loved</span>
        <span className="chip chip--amber">⚠ What to watch out for</span>
      </div>
    </div>
  )
}

function FoundTooArt() {
  return (
    <div className="art art--found">
      <div className="art__finders">
        {['@asha', '@vik', '@ryan'].map((h, i) => (
          <motion.span
            key={h}
            className="art__finder"
            initial={{ x: (i - 1) * 60, y: i === 1 ? -50 : 40, opacity: 0 }}
            whileInView={{ x: 0, y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.25 + i * 0.2 }}
          >
            {h}
          </motion.span>
        ))}
      </div>
      <motion.span
        className="badge badge--polished art__badge"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 420, damping: 12, delay: 1.1 }}
      >
        ✦ Polished · 3 finds
      </motion.span>
    </div>
  )
}

function DigArt() {
  return (
    <div className="art art--dig">
      <div className="art__grid" />
      {[
        [20, 30],
        [62, 22],
        [44, 58],
        [76, 64],
      ].map(([x, y], i) => (
        <motion.span
          key={i}
          className="art__dot"
          style={{ left: `${x}%`, top: `${y}%` }}
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.3 + i * 0.12 }}
        />
      ))}
      <motion.span
        className="art__stash"
        initial={{ y: 30, opacity: 0, rotate: -10 }}
        whileInView={{ y: 0, opacity: 1, rotate: 0 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.9 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h12v18l-6-4-6 4z" fill="currentColor" />
        </svg>
        Saved to Stash
      </motion.span>
    </div>
  )
}

const steps = [
  {
    n: '01',
    title: 'Unearth a gem',
    body: 'Found somewhere special? Drop a pin, name it, and tell people why it’s worth the trip: what you loved, and what to watch out for.',
    art: <UnearthArt />,
  },
  {
    n: '02',
    title: 'Found it too?',
    body: 'When someone else independently unearths the same place, it gets stronger. Three separate finds and a gem becomes Polished, trusted because real people keep discovering it on their own.',
    art: <FoundTooArt />,
  },
  {
    n: '03',
    title: 'Dig around',
    body: 'Open the map anywhere and see what people near you have unearthed. Save the ones you want to try to your Stash.',
    art: <DigArt />,
  },
]

export function HowItWorks() {
  return (
    <section className="section" id="how">
      <Reveal>
        <p className="kicker">How it works</p>
        <h2 className="section__title">Three verbs. That’s the whole app.</h2>
      </Reveal>
      <div className="steps">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.12}>
            <TiltCard className="step">
              {s.art}
              <span className="step__n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
