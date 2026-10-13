import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

type Props = { size?: number; animate?: boolean }

export function Logo({ size = 36, animate = false }: Props) {
  const root = useRef<SVGSVGElement>(null)

  useGSAP(
    () => {
      if (!animate) return
      const u = root.current?.querySelector<SVGPathElement>('.logo-u')
      if (!u) return
      const length = u.getTotalLength()
      gsap
        .timeline({ delay: 0.15 })
        .fromTo(u, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.1, ease: 'power3.inOut' })
        .fromTo('.logo-gem', { scale: 0, rotate: -90, transformOrigin: '50% 50%' }, { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2.2)' }, '-=0.35')
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
