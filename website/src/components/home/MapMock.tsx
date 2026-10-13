import { useRef } from 'react'
import { motion } from 'motion/react'
import { animated, useSpring } from '@react-spring/web'
import { gsap, prefersReducedMotion, useGSAP } from '../../lib/gsap'

const pins = [
  { x: 22, y: 30, polished: true },
  { x: 64, y: 22, polished: false },
  { x: 46, y: 48, polished: true, active: true },
  { x: 78, y: 56, polished: false },
  { x: 30, y: 66, polished: false },
]

function Pin({ polished, active }: { polished: boolean; active?: boolean }) {
  return (
    <svg width={active ? 44 : 34} height={active ? 54 : 42} viewBox="0 0 34 42" aria-hidden="true">
      <path
        d="M17 41s14-13.4 14-24A14 14 0 0 0 3 17c0 10.6 14 24 14 24Z"
        fill={active ? 'var(--amber-pin)' : polished ? 'var(--green)' : 'var(--surface)'}
        stroke={polished || active ? 'none' : 'var(--green)'}
        strokeWidth="2.5"
      />
      <path d="M11 16l2.5-3.5h7L23 16l-6 7z" fill={active ? '#fff' : polished ? 'var(--green-tint)' : 'var(--amber-pin)'} />
    </svg>
  )
}

export function MapMock() {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.utils.toArray<SVGPathElement>('.map__road').forEach((road, i) => {
        const len = road.getTotalLength()
        gsap.fromTo(
          road,
          { strokeDasharray: len, strokeDashoffset: len },
          { strokeDashoffset: 0, duration: 1.6, delay: 0.2 + i * 0.12, ease: 'power2.inOut' },
        )
      })
      gsap.from('.map__blob', { scale: 0, transformOrigin: '50% 50%', duration: 1, stagger: 0.15, ease: 'expo.out', delay: 0.3 })
    },
    { scope: root },
  )

  const pulse = useSpring({
    from: { scale: 1, opacity: 0.55 },
    to: { scale: 2.6, opacity: 0 },
    loop: true,
    config: { duration: 1800 },
  })

  return (
    <div className="map" ref={root}>
      <svg className="map__bg" viewBox="0 0 400 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="400" height="480" fill="#EEF2EC" />
        <ellipse className="map__blob" cx="320" cy="90" rx="90" ry="60" fill="#DCEBDD" />
        <ellipse className="map__blob" cx="70" cy="400" rx="110" ry="70" fill="#DCEBDD" />
        <path className="map__blob" d="M-20 200 C 80 180, 120 260, 60 300 S -40 330, -20 200Z" fill="#D7E7F0" />
        <path className="map__road" d="M-10 140 C 120 160, 220 90, 410 130" />
        <path className="map__road" d="M180 -10 C 170 120, 230 260, 200 490" />
        <path className="map__road" d="M-10 330 C 120 300, 260 380, 410 320" />
        <path className="map__road map__road--small" d="M60 -10 L 110 490" />
        <path className="map__road map__road--small" d="M300 -10 C 290 160, 340 300, 320 490" />
        <path className="map__road map__road--small" d="M-10 240 L 410 220" />
      </svg>

      <div className="map__me" style={{ left: '56%', top: '60%' }}>
        <animated.span className="map__me-pulse" style={pulse} />
        <span className="map__me-dot" />
      </div>

      {pins.map((p, i) => (
        <motion.div
          key={i}
          className={`map__pin ${p.active ? 'map__pin--active' : ''}`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          initial={{ y: -22, scale: 0.85 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 12, delay: 0.2 + i * 0.1 }}
          whileHover={{ y: -6, scale: 1.12 }}
        >
          <Pin polished={p.polished} active={p.active} />
        </motion.div>
      ))}

      <motion.div
        className="map__sheet"
        initial={{ y: 28 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 16, delay: 0.5 }}
      >
        <span className="map__grabber" />
        <div className="map__sheet-head">
          <div>
            <p className="map__sheet-cat">Food · 350 m</p>
            <h4>The dosa stall with no sign</h4>
          </div>
          <span className="map__stash" aria-label="Saved to Stash">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 3h12v18l-6-4-6 4z" fill="currentColor" />
            </svg>
          </span>
        </div>
        <div className="badges">
          <span className="badge badge--polished">Polished · 4 finds</span>
          <span className="badge badge--rare">Rare</span>
        </div>
        <p className="map__love">
          <b>Loved:</b> crispy ghee roast, chutney refills
        </p>
        <p className="map__watch">
          <b>Watch out:</b> cash only, gone by 10am
        </p>
      </motion.div>
    </div>
  )
}
