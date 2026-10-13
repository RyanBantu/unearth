import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { animated, useSpring } from '@react-spring/web'
import { Reveal } from '../Reveal'

type Badge = 'uncut' | 'polished' | 'rare' | 'minedOut'

const labels: Record<Badge, string> = {
  uncut: 'Uncut',
  polished: 'Polished',
  rare: 'Rare',
  minedOut: 'Mined out',
}

function badgesFor(finds: number): Badge[] {
  const out: Badge[] = [finds >= 3 ? 'polished' : 'uncut']
  if (finds >= 25) out.push('minedOut')
  else if (finds < 10) out.push('rare')
  return out
}

function caption(finds: number) {
  if (finds < 3) return `Uncut. ${3 - finds} more independent ${3 - finds === 1 ? 'find' : 'finds'} until it’s Polished.`
  if (finds < 10) return 'Polished and still Rare: trusted, but not yet crowded.'
  if (finds < 25) return 'Polished. Word is getting out.'
  return 'Mined out. Everyone knows about this one now.'
}

const handles = ['you', 'asha', 'vik', 'meera', 'arjun', 'zoya', 'kabir', 'nila', 'dev', 'tara']
const steps = [1, 2, 3, 5, 10, 25]

export function PolishDemo() {
  const [idx, setIdx] = useState(0)
  const finds = steps[idx]
  const badges = badgesFor(finds)

  const { n, w } = useSpring({
    n: finds,
    w: Math.min(finds / 25, 1) * 100,
    config: { tension: 170, friction: 22 },
  })

  return (
    <section className="section polish" id="polish">
      <div className="polish__copy">
        <Reveal>
          <p className="kicker">Trust, without stars</p>
          <h2 className="section__title">A gem gets stronger every time someone finds it on their own.</h2>
          <p className="section__lede">
            No ratings to game. A place earns its badge when separate people unearth it independently. Tap through and
            watch a gem grow up.
          </p>
        </Reveal>
        <ul className="polish__legend">
          <li>
            <span className="badge badge--uncut">Uncut</span> fewer than 3 finds
          </li>
          <li>
            <span className="badge badge--polished">Polished</span> 3 or more independent finds
          </li>
          <li>
            <span className="badge badge--rare">Rare</span> still under 10 finds
          </li>
          <li>
            <span className="badge badge--mined">Mined out</span> 25+ finds, no longer hidden
          </li>
        </ul>
      </div>

      <Reveal delay={0.15}>
        <div className="polish__card">
          <p className="map__sheet-cat">Viewpoint · 2.4 km</p>
          <h3>End of the dirt road</h3>

          <motion.div className="badges" layout>
            <AnimatePresence mode="popLayout">
              {badges.map((b) => (
                <motion.span
                  layout
                  key={b}
                  className={`badge badge--${b === 'minedOut' ? 'mined' : b}`}
                  initial={{ scale: 0.4, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.4, opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                >
                  {labels[b]}
                </motion.span>
              ))}
            </AnimatePresence>
          </motion.div>

          <div className="polish__count">
            <animated.span>{n.to((v) => Math.round(v))}</animated.span>
            <small>{finds === 1 ? 'find' : 'finds'}</small>
          </div>

          <div className="polish__meter" aria-hidden="true">
            <animated.span style={{ width: w.to((v) => `${v}%`) }} />
            <i style={{ left: '12%' }} title="Polished" />
            <i style={{ left: '40%' }} title="No longer rare" />
          </div>

          <div className="polish__finders">
            <AnimatePresence>
              {handles.slice(0, Math.min(finds, handles.length)).map((h, i) => (
                <motion.span
                  key={h}
                  className={`polish__avatar ${i === 0 ? 'polish__avatar--first' : ''}`}
                  initial={{ scale: 0, x: -10 }}
                  animate={{ scale: 1, x: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20, delay: i * 0.03 }}
                  title={i === 0 ? 'First find' : `@${h}`}
                >
                  {h[0].toUpperCase()}
                </motion.span>
              ))}
            </AnimatePresence>
            {finds > handles.length && <span className="polish__more">+{finds - handles.length}</span>}
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={caption(finds)}
              className="polish__caption"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {caption(finds)}
            </motion.p>
          </AnimatePresence>

          <div className="polish__controls">
            <motion.button
              type="button"
              className="btn-primary"
              whileTap={{ scale: 0.95 }}
              onClick={() => setIdx((i) => (i + 1) % steps.length)}
            >
              {idx === steps.length - 1 ? 'Start over' : 'Someone else found it too'}
            </motion.button>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
