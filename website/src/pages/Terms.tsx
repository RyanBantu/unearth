import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { site } from '../config'

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <motion.section
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

export default function Terms() {
  return (
    <div className="policy">
      <header className="policy__hero">
        <p className="kicker">Legal</p>
        <h1>Terms of Use</h1>
        <p className="policy__date">
          <strong>Last updated:</strong> {site.termsUpdatedDate}
        </p>
        <p className="policy__intro">By using Unearth you agree to these Terms of Use.</p>
      </header>

      <div className="policy__layout policy__layout--single">
        <article className="policy__body">
          <Section n={1} title="Community rules">
            <ul>
              <li>
                <strong>Public places only</strong> — no private homes, apartments, or places guests are not welcome.
              </li>
              <li>
                <strong>No abusive, hateful or sexual content</strong>, spam, scams, or illegal activity.
              </li>
              <li>Be honest about locations so other people can actually visit them.</li>
            </ul>
            <p>
              See the full <a href={site.guidelinesUrl}>Posting Guidelines</a>.
            </p>
          </Section>

          <Section n={2} title="Moderation">
            <p>
              We review reports and remove content that breaks these rules, typically within{' '}
              <strong>24 hours</strong>. We may ban accounts that repeatedly violate the Terms. You can report gems or
              finds in the app, and block other users so you no longer see their content.
            </p>
          </Section>

          <Section n={3} title="Your content">
            <p>
              You keep ownership of what you post. You grant Unearth a license to show it to other users as part of the
              service. You can delete your finds or account at any time.
            </p>
          </Section>

          <Section n={4} title="Contact">
            <div className="policy__contact">
              <p>
                Questions: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
              </p>
              <p>
                See also our <Link to="/privacy">Privacy Policy</Link>.
              </p>
            </div>
          </Section>
        </article>
      </div>
    </div>
  )
}
