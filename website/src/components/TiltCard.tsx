import type { ReactNode } from 'react'
import { animated, to, useSpring } from '@react-spring/web'

type Props = { children: ReactNode; className?: string; max?: number }

export function TiltCard({ children, className = '', max = 8 }: Props) {
  const [{ rx, ry, scale }, api] = useSpring(() => ({
    rx: 0,
    ry: 0,
    scale: 1,
    config: { mass: 1, tension: 320, friction: 26 },
  }))

  return (
    <animated.div
      className={`tilt ${className}`}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const px = (e.clientX - rect.left) / rect.width - 0.5
        const py = (e.clientY - rect.top) / rect.height - 0.5
        api.start({ rx: -py * max, ry: px * max, scale: 1.02 })
      }}
      onPointerLeave={() => api.start({ rx: 0, ry: 0, scale: 1 })}
      style={{
        transform: to(
          [rx, ry, scale],
          (x, y, s) => `perspective(900px) rotateX(${x}deg) rotateY(${y}deg) scale(${s})`,
        ),
      }}
    >
      {children}
    </animated.div>
  )
}
