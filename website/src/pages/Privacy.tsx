import { useEffect, useState, type ReactNode } from 'react'
import { motion, useScroll, useSpring } from 'motion/react'
import { site } from '../config'

const sections = [
  { id: 'collect', title: 'Information we collect' },
  { id: 'use', title: 'How we use information' },
  { id: 'share', title: 'How information is shared' },
  { id: 'retention', title: 'How long we keep information' },
  { id: 'rights', title: 'Your choices and rights' },
  { id: 'security', title: 'Security' },
  { id: 'children', title: 'Children' },
  { id: 'changes', title: 'Changes to this policy' },
  { id: 'contact', title: 'Contact and grievances' },
]

function Section({ id, n, children }: { id: string; n: number; children: ReactNode }) {
  const title = sections.find((s) => s.id === id)!.title
  return (
    <motion.section
      id={id}
      className="policy__section"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <h2>
        <span>{n}.</span> {title}
      </h2>
      {children}
    </motion.section>
  )
}

export default function Privacy() {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 })
  const [active, setActive] = useState(sections[0].id)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length) setActive(visible[0].target.id)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const email = <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>

  return (
    <div className="policy">
      <motion.div className="policy__progress" style={{ scaleX: progress }} />

      <header className="policy__hero">
        <motion.p
          className="kicker"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          Legal
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Privacy Policy
        </motion.h1>
        <motion.p
          className="policy__date"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <strong>Effective date:</strong> {site.privacyEffectiveDate}
        </motion.p>
        <motion.p
          className="policy__intro"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
        >
          This policy explains what information the Unearth app and website (“Unearth”, “we”, “us”) collect, how we use
          it, and your choices. Unearth is operated from {site.operatorCity}, India.
        </motion.p>
        <motion.div
          className="policy__short"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
        >
          <strong>The short version:</strong> we collect only what Unearth needs to work. We don’t sell your data, we
          don’t show ads, and we don’t track you across other apps or websites.
        </motion.div>
      </header>

      <div className="policy__layout">
        <nav className="policy__toc" aria-label="Contents">
          <p>Contents</p>
          <ol>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={active === s.id ? 'is-active' : ''}>
                  {active === s.id && (
                    <motion.span
                      layoutId="toc-indicator"
                      className="policy__toc-indicator"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="policy__body">
          <Section id="collect" n={1}>
            <h3>Account information</h3>
            <ul>
              <li>
                When you use Sign in with Apple, Apple gives us a unique account identifier, and, if you choose to share
                them, your name and email address. If you choose “Hide My Email”, we receive an Apple relay address
                instead of your real email.
              </li>
              <li>The handle (username) you choose.</li>
              <li>The date you agreed to our Terms of Use.</li>
            </ul>

            <h3>Content you post</h3>
            <ul>
              <li>
                Gems and finds: place names, map locations, categories, descriptions, likes and dislikes, tags and
                optional Google Maps links.
              </li>
              <li>Your votes, saved gems (Stash), reports you submit, and users you block.</li>
            </ul>
            <p>
              This content, along with your handle, is <strong>public</strong> to other Unearth users (except your
              Stash, reports and blocks, which are private).
            </p>

            <h3>Location</h3>
            <ul>
              <li>
                If you allow location access, the app uses your device’s location <strong>while you’re using it</strong>{' '}
                to show gems near you, calculate distances, and place the pin when you unearth a gem.
              </li>
              <li>
                We send coordinates to our server to find nearby gems.{' '}
                <strong>We don’t store your location history or track your location in the background.</strong> The
                only locations we store are the locations of gems you choose to post.
              </li>
              <li>
                You can turn off location access anytime in iOS Settings. You can still browse the map and place pins
                manually.
              </li>
            </ul>

            <h3>Technical information</h3>
            <ul>
              <li>
                Our servers keep standard logs (such as IP address, device and app version, and error details) to keep
                the service secure and fix problems. Logs are kept for a limited time.
              </li>
            </ul>
            <p className="policy__callout">
              We don’t collect photos, contacts, payment information, or advertising identifiers.
            </p>
          </Section>

          <Section id="use" n={2}>
            <ul>
              <li>
                To provide Unearth: your account, posting and displaying gems, showing nearby places, votes, Stash,
                activity and profiles.
              </li>
              <li>To detect duplicate places and mark gems as “Polished” when several people find them.</li>
              <li>To keep Unearth safe: reviewing reports, enforcing our Terms, preventing spam and abuse.</li>
              <li>To contact you about your account or important changes (we don’t send marketing emails).</li>
              <li>To fix bugs and improve the app.</li>
            </ul>
          </Section>

          <Section id="share" n={3}>
            <p>We don’t sell or rent your personal information. We share it only:</p>
            <ul>
              <li>
                <strong>Publicly within Unearth:</strong> your handle and the content you post.
              </li>
              <li>
                <strong>With service providers</strong> who run Unearth on our behalf and may only use the data to
                provide their service to us:
                <ul className="providers">
                  <li>
                    <b>Apple</b> Sign in with Apple and Apple Maps
                  </li>
                  <li>
                    <b>Render</b> server hosting
                  </li>
                  <li>
                    <b>Neon</b> database hosting
                  </li>
                </ul>
              </li>
              <li>
                <strong>If required by law,</strong> or to protect the safety of our users or the public.
              </li>
              <li>
                <strong>If Unearth is transferred</strong> to another owner, in which case this policy continues to
                apply to your information.
              </li>
            </ul>
            <p>Our service providers may store data outside India, including in Singapore.</p>
          </Section>

          <Section id="retention" n={4}>
            <p>
              We keep your account and content while your account is active. When you delete your account, we delete
              your account information and your finds from our active systems promptly, and from backups within{' '}
              {site.backupRetentionDays} days. Gems that other people also found remain, without your write-up. We may
              keep limited information longer where needed to comply with the law or handle abuse (for example, a record
              that an account was banned).
            </p>
          </Section>

          <Section id="rights" n={5}>
            <ul>
              <li>
                <strong>Access and correction:</strong> you can see and edit your content in the app.
              </li>
              <li>
                <strong>Deletion:</strong> delete individual finds in the app, or your whole account in{' '}
                <span className="kbd">Profile → Settings → Delete account</span>. This also revokes Unearth’s access to
                your Apple ID.
              </li>
              <li>
                <strong>Location:</strong> turn location access on or off in iOS Settings.
              </li>
              <li>
                <strong>Other requests:</strong> depending on where you live (including under India’s Digital Personal
                Data Protection Act, 2023), you may have rights to access, correct, delete or get information about your
                data, and to raise a grievance. Email us at {email} and we’ll respond within 30 days.
              </li>
            </ul>
          </Section>

          <Section id="security" n={6}>
            <p>
              We use encrypted connections (HTTPS), store sensitive tokens securely, and limit access to data. No system
              is perfectly secure, but we work to protect your information.
            </p>
          </Section>

          <Section id="children" n={7}>
            <p>
              Unearth is not intended for anyone under 18. We don’t knowingly collect information from children. If you
              believe a child has created an account, contact us and we’ll delete it.
            </p>
          </Section>

          <Section id="changes" n={8}>
            <p>
              We may update this policy. If we make significant changes, we’ll let you know in the app. The effective
              date above shows when it was last updated.
            </p>
          </Section>

          <Section id="contact" n={9}>
            <div className="policy__contact">
              <p>Email: {email}</p>
            </div>
          </Section>
        </article>
      </div>
    </div>
  )
}
