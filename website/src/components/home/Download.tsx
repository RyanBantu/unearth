import { useState } from 'react'
import { animated, useInView, useTrail } from '@react-spring/web'
import { AppStoreButton } from '../AppStoreButton'
import { site } from '../../config'

const words = ['Go', 'dig.']

export function Download() {
  const [ref, inView] = useInView({ once: true, rootMargin: '-80px 0px' })
  const [copied, setCopied] = useState(false)

  const trail = useTrail(words.length, {
    opacity: inView ? 1 : 0,
    y: inView ? 0 : 60,
    rotate: inView ? 0 : -8,
    config: { mass: 1, tension: 260, friction: 20 },
  })

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(site.contactEmail)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${site.contactEmail}`
    }
  }

  return (
    <section className="download" id="download">
      <div className="download__inner" ref={ref}>
        <h2 className="download__title" aria-label="Go dig.">
          {trail.map((style, i) => (
            <animated.span key={words[i]} style={style} aria-hidden="true">
              {words[i]}
            </animated.span>
          ))}
        </h2>
        <p className="download__sub">Unearth is on iPhone. Find something worth sharing, then share it.</p>
        <AppStoreButton variant="light" />

        <div className="contact" id="contact">
          <h3>Get in touch</h3>
          <p>Questions, feedback, or a problem to report:</p>
          <div className="contact__row">
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
            <button type="button" onClick={copyEmail} className="contact__copy">
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
