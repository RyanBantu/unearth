import { useEffect, useState } from 'react'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { Reveal } from '../Reveal'
import { Icon, type IconName } from '../Icon'

const activity = [
  '@asha also found Rooftop Filter Coffee',
  'Your gem End of the Dirt Road was polished',
  '@vik also found The Dosa Stall With No Sign',
  'Old Market Bookshop is now mined out',
]

function ActivityTicker() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % activity.length), 2600)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="ticker">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={i}
          initial={{ y: 26, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -26, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        >
          <span className="ticker__dot" />
          {activity[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

function Levels() {
  return (
    <div className="levels">
      {[
        ['Digger', 'under 10 finds'],
        ['Prospector', '10–49 finds'],
        ['Master Prospector', '50+ finds'],
      ].map(([name, req], i) => (
        <motion.div
          key={name}
          className="levels__row"
          initial={{ width: '0%' }}
          whileInView={{ width: `${60 + i * 20}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <b>{name}</b>
          <span>{req}</span>
        </motion.div>
      ))}
    </div>
  )
}

type Feature = { icon: IconName; title: string; body: string; wide?: boolean; extra?: React.ReactNode }

const features: Feature[] = [
  {
    icon: 'map',
    title: 'Map-first Dig',
    body: 'Open the map anywhere and see what people nearby have unearthed, with distances from where you stand. No location? Browse and place pins by hand.',
    wide: true,
  },
  {
    icon: 'notes',
    title: 'Loves & watch-outs',
    body: 'Every find says what was great and what to know before you go. Tag it as Food, Café, Viewpoint, Trail or Shop, and add a Google Maps link.',
  },
  {
    icon: 'match',
    title: 'Found it too?',
    body: 'Unearth spots when you’re posting a place someone already found, so your find stacks onto theirs instead of making a duplicate.',
  },
  {
    icon: 'stash',
    title: 'Your Stash',
    body: 'Save the gems you want to try. Your Stash is private, just for you.',
  },
  {
    icon: 'activity',
    title: 'Activity',
    body: 'See when someone else finds your gem, when it gets Polished, and when a place goes mainstream.',
    wide: true,
    extra: <ActivityTicker />,
  },
  {
    icon: 'gem',
    title: 'Prospector levels',
    body: 'Your profile grows with your finds. Every real discovery counts.',
    extra: <Levels />,
  },
  {
    icon: 'share',
    title: 'Share cards',
    body: 'Send a friend a clean card for any gem: “Unearthed by @you. Find it on Unearth.”',
  },
  {
    icon: 'thumbs',
    title: 'Thumbs, not stars',
    body: 'A simple thumbs up or down on other people’s gems. No five-star averages to inflate or game.',
  },
  {
    icon: 'apple',
    title: 'Sign in with Apple',
    body: 'One tap to start. Hide My Email works too. We don’t collect photos, contacts or ad identifiers.',
  },
  {
    icon: 'shield',
    title: 'Report & block',
    body: 'Report anything that breaks the rules and block anyone you’d rather not see. Every report gets reviewed.',
  },
]

const grid: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 160, damping: 20 } },
}

export function Features() {
  return (
    <section className="section" id="features">
      <Reveal>
        <p className="kicker">Features</p>
        <h2 className="section__title">Small, honest, and built for finding things.</h2>
      </Reveal>
      <motion.div
        className="features"
        variants={grid}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
      >
        {features.map((f) => (
          <motion.article
            key={f.title}
            className={`feature ${f.wide ? 'feature--wide' : ''}`}
            variants={item}
            whileHover={{ y: -6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <span className={`feature__icon ${f.icon === 'apple' ? 'feature__icon--apple' : ''}`}>
              <Icon name={f.icon} size={22} />
            </span>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
            {f.extra}
          </motion.article>
        ))}
      </motion.div>
    </section>
  )
}
