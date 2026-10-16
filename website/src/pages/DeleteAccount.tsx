import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { site } from '../config'

const deleteMail = `mailto:${site.contactEmail}?subject=${encodeURIComponent('Delete my Unearth account')}`

export default function DeleteAccount() {
  const email = <a href={deleteMail}>{site.contactEmail}</a>

  return (
    <div className="policy">
      <header className="policy__hero">
        <p className="kicker">Legal</p>
        <h1>Delete your Unearth account</h1>
        <p className="policy__intro">
          You can delete your Unearth account and the data we store with it. This page is for the Unearth app on Google
          Play, the App Store, and the website.
        </p>
      </header>

      <div className="policy__layout policy__layout--single">
        <article className="policy__body">
          <motion.section
            className="policy__section"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2>
              <span>1.</span> Delete in the app
            </h2>
            <ol>
              <li>Open Unearth and sign in.</li>
              <li>
                Go to <span className="kbd">Profile → Settings → Delete account</span>.
              </li>
              <li>Confirm. Deletion is permanent and cannot be undone.</li>
            </ol>
          </motion.section>

          <motion.section
            className="policy__section"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2>
              <span>2.</span> Request deletion by email
            </h2>
            <p>
              If you uninstalled the app or cannot sign in, email {email} from the address on your account (Google or
              Apple). Include your Unearth handle if you remember it (for example, @yourname).
            </p>
            <p>
              We delete the account after we can match the request to you. We aim to complete this within{' '}
              {site.backupRetentionDays} days.
            </p>
            <div className="policy__contact">
              <p>
                <a href={deleteMail}>Email a deletion request</a>
              </p>
            </div>
          </motion.section>

          <motion.section
            className="policy__section"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2>
              <span>3.</span> What we delete
            </h2>
            <ul>
              <li>Your account, handle, and sign-in identifiers (Apple and/or Google).</li>
              <li>Your finds, stash, votes, reports, blocks, and session tokens.</li>
              <li>Gems that nobody else found — those are removed for everyone.</li>
            </ul>
            <p>We also revoke Unearth’s access to your Apple ID or Google account where possible.</p>
          </motion.section>

          <motion.section
            className="policy__section"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2>
              <span>4.</span> What may remain
            </h2>
            <ul>
              <li>
                Gems that other people also found stay on the map, without your write-up. Their finds are their content.
              </li>
              <li>
                Backups are cleared within {site.backupRetentionDays} days.
              </li>
              <li>
                We may keep a limited record if the account was banned for abuse, or if the law requires it.
              </li>
            </ul>
            <p>
              See the <Link to="/privacy">Privacy Policy</Link> for the full list of what Unearth collects.
            </p>
          </motion.section>
        </article>
      </div>
    </div>
  )
}
