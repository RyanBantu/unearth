import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Hero } from '../components/home/Hero'
import { Explore } from '../components/home/Explore'
import { Places } from '../components/home/Places'
import { HowItWorks } from '../components/home/HowItWorks'
import { PolishDemo } from '../components/home/PolishDemo'
import { Features } from '../components/home/Features'
import { Why } from '../components/home/Why'
import { Principles } from '../components/home/Principles'
import { Download } from '../components/home/Download'
import { ScrollTrigger } from '../lib/gsap'

export default function Home() {
  const { hash } = useLocation()

  useEffect(() => {
    ScrollTrigger.refresh()
    if (!hash) return
    const id = setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }), 80)
    return () => clearTimeout(id)
  }, [hash])

  return (
    <>
      <Hero />
      <Explore />
      <Places />
      <HowItWorks />
      <PolishDemo />
      <Features />
      <Why />
      <Principles />
      <Download />
    </>
  )
}
