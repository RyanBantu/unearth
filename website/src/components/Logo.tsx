import { useRef } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap'

type Props = { size?: number; animate?: boolean }

export function Logo({ size = 36, animate = false }: Props) {
  const root = useRef<SVGSVGElement>(null)

  useGSAP(
    () => {
      if (!animate || prefersReducedMotion()) return
      gsap.from('.logo-gem', {
        y: -14,
        rotate: -25,
        transformOrigin: '50% 50%',
        duration: 0.9,
        delay: 0.1,
        ease: 'bounce.out',
      })
    },
    { scope: root, dependencies: [animate] },
  )

  return (
    <svg ref={root} width={size} height={size} viewBox="0 0 100 100" aria-label="Unearth" role="img">
      <rect width="100" height="100" rx="22.5" fill="var(--green-tint)" />
      <path
        className="logo-u"
        d="M28 28v24a22 22 0 0 0 44 0V28"
        fill="none"
        stroke="var(--green)"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path className="logo-gem" d="M39 44l5-7h12l5 7-11 13z" fill="var(--amber-pin)" />
    </svg>
  )
}
