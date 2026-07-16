import React, { useState } from 'react'
import { motion, useScroll, useMotionValueEvent } from 'motion/react'
import { Link } from 'react-router-dom'
import { Globe } from 'lucide-react'
import { CartographicBackground } from '../Landing/CelestialBackground'
import SiteHeader from '../../components/SiteHeader'

// ─── Data ───────────────────────────────────────────────────────────────────

type Member = {
  name: string
  role: string
  affiliation: string
  bio: string
  link?: string
}

const team: Member[] = [
  {
    name: 'Mark Whiting',
    role: 'CTO, Pareto · Visiting Scientist, CSSLab',
    affiliation: 'University of Pennsylvania',
    link: 'https://whiting.me/',
    bio: 'Mark E. Whiting is the Chief Technology Officer of Pareto Inc and a visiting scientist at the Computational Social Science Lab (CSSLab) at the University of Pennsylvania. With postdoctoral experience with Duncan Watts at Penn and Michael S. Bernstein at Stanford, Mark holds degrees in Design from RMIT and KAIST and a PhD in Engineering from CMU.',
  },
  {
    name: 'Amirhossein Nakhaei',
    role: 'Software Engineer · Visiting Researcher, CSSLab',
    affiliation: 'University of Pennsylvania',
    link: 'https://nakhaei.me/',
    bio: 'Amirhossein Nakhaei is a visiting researcher at the CSSLab at Penn. Holding a master’s in Computational Social Science from RWTH Aachen University, he currently applies his expertise as a software engineer in Berlin.',
  },
  {
    name: 'Linnea Gandhi',
    role: 'Lecturer & PhD Candidate',
    affiliation: 'The Wharton School, University of Pennsylvania',
    link: 'https://www.linneagandhi.com/',
    bio: 'Linnea Gandhi is a Lecturer and PhD candidate at Wharton whose research focuses on improving the generalizability of behavioral science interventions. Her dissertation—supported by a database of 200+ experimental variables—seeks to both predict new experiments and build LLM-based tools to expedite research synthesis via Atlas.',
  },
  {
    name: 'Duncan Watts',
    role: 'Stevens University Professor',
    affiliation: 'University of Pennsylvania',
    link: 'https://duncanjwatts.com/',
    bio: 'Duncan J. Watts is the Stevens University Professor at the University of Pennsylvania with primary appointments across Communication, Engineering, and Operations. His research centers on social networks and the dynamics of human systems, providing a critical foundation for the work behind Atlas.',
  },
]

type Appearance = {
  venue: string
  title: string
  location: string
  year: string
  kind: 'Workshop' | 'Poster'
}

const appearances: Appearance[] = [
  {
    venue: 'IC²S²',
    title: 'Research Cartography with Atlas — Poster',
    location: 'Philadelphia, PA, USA',
    year: '2024',
    kind: 'Poster',
  },
  {
    venue: 'ICSSI',
    title: 'Atlas: Structuring Knowledge from Scientific Papers — Poster',
    location: 'Washington, D.C., USA',
    year: '2024',
    kind: 'Poster',
  },
  {
    venue: 'IC²S²',
    title: 'Research Cartography with Atlas — Workshop',
    location: 'Norrköping, Sweden',
    year: '2025',
    kind: 'Workshop',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

const Team: React.FC = () => {
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)

  useMotionValueEvent(scrollY, 'change', (current) => {
    const previous = scrollY.getPrevious() ?? 0
    if (current > previous && current > 150) {
      setHidden(true)
    } else {
      setHidden(false)
    }
  })

  return (
    <div className='bg-[#f8fafc] min-h-screen text-[#0b1f3a] font-sans selection:bg-[#6f95bd]/25 selection:text-[#06162b]'>
      <CartographicBackground />

      <SiteHeader hidden={hidden} />

      {/* Hero */}
      <section className='relative z-10 flex flex-col items-center justify-end text-center px-4 pb-14 pt-40'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <p className='text-sm uppercase tracking-[0.3em] text-[#64748b] mb-4'>Who We Are</p>
          <h1 className='text-5xl md:text-7xl font-semibold tracking-[0.01em] mb-6 text-[#071a33]'>
            The Atlas Team
          </h1>
          <p className='text-lg md:text-xl text-[#334155] max-w-2xl mx-auto font-light leading-relaxed'>
            A collaboration at the Computational Social Science Lab building tools to map the
            structure of knowledge hidden within scientific papers.
          </p>
        </motion.div>
      </section>

      {/* Team */}
      <section id='team' className='relative z-10 max-w-5xl mx-auto px-6 py-16'>
        <div className='flex items-center gap-4 mb-10'>
          <h2 className='text-3xl md:text-4xl font-semibold tracking-tight text-[#071a33]'>Team</h2>
          <div className='flex-1 h-px bg-[#d6dee8]' />
        </div>

        <div className='grid gap-6 md:grid-cols-2'>
          {team.map((member, i) => (
            <motion.article
              key={member.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className='rounded-md border border-[#d6dee8] bg-white/70 backdrop-blur-sm p-6 shadow-sm hover:shadow-md hover:border-[#6f95bd]/60 transition-all'
            >
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <h3 className='text-xl font-semibold text-[#071a33]'>{member.name}</h3>
                  <p className='mt-1 text-sm font-medium text-[#16375f]'>{member.role}</p>
                  <p className='text-sm text-[#64748b]'>{member.affiliation}</p>
                </div>
                {member.link && (
                  <a
                    href={member.link}
                    target='_blank'
                    rel='noreferrer'
                    aria-label={`${member.name} personal website`}
                    className='shrink-0 rounded-full border border-[#d6dee8] p-2 text-[#3c6082] hover:text-[#0b1f3a] hover:border-[#6f95bd] transition-colors'
                  >
                    <Globe className='h-4 w-4' />
                  </a>
                )}
              </div>
              <p className='mt-4 text-sm leading-relaxed text-[#334155]'>{member.bio}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Appearances */}
      <section id='appearances' className='relative z-10 max-w-5xl mx-auto px-6 py-16'>
        <div className='flex items-center gap-4 mb-4'>
          <h2 className='text-3xl md:text-4xl font-semibold tracking-tight text-[#071a33]'>
            Where We&apos;ve Been
          </h2>
          <div className='flex-1 h-px bg-[#d6dee8]' />
        </div>
        <p className='text-[#475569] max-w-2xl mb-10'>
          Atlas has been presented through posters and workshops at leading computational and social
          science venues.
        </p>

        <div className='space-y-4'>
          {appearances.map((item, i) => (
            <motion.div
              key={`${item.venue}-${item.year}-${item.kind}`}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className='flex flex-col gap-3 sm:flex-row sm:items-center rounded-md border border-[#d6dee8] bg-white/70 backdrop-blur-sm p-5'
            >
              <div className='flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-sm bg-[#0b1f3a] text-white'>
                <span className='text-lg font-semibold leading-none'>{item.year}</span>
              </div>
              <div className='flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='text-base font-semibold text-[#071a33]'>{item.venue}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      item.kind === 'Workshop'
                        ? 'bg-[#6f1d1b]/10 text-[#6f1d1b]'
                        : 'bg-[#3c6082]/12 text-[#16375f]'
                    }`}
                  >
                    {item.kind}
                  </span>
                </div>
                <p className='mt-1 text-sm text-[#334155]'>{item.title}</p>
                <p className='text-sm text-[#64748b]'>{item.location}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className='relative z-10 max-w-5xl mx-auto px-6 py-20 text-center'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className='text-3xl md:text-4xl font-semibold mb-6 tracking-tight text-[#071a33]'>
            Want to explore Atlas?
          </h2>
          <p className='text-lg text-[#475569] mb-10 max-w-xl mx-auto'>
            Turn research papers into quantitative maps and structure the experiments, conditions,
            and results hidden inside them.
          </p>
          <Link
            to='/login'
            className='inline-block px-8 py-4 bg-[#0b1f3a] text-white rounded-sm font-semibold border border-[#0b1f3a] hover:bg-[#16375f] hover:border-[#16375f] transition-colors'
          >
            Get Started with Atlas
          </Link>
        </motion.div>
      </section>

      <footer className='relative z-10 border-t border-[#3c6082]/35 bg-[#071a33]/96 backdrop-blur-md'>
        <div className='mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 md:flex-row md:items-center md:justify-between'>
          <div className='flex flex-wrap items-center gap-6'>
            <img src='/css_lab_logo.png' alt='CSSLab' className='h-12 w-auto object-contain' />
            <div className='h-10 w-px bg-white/20' />
            <img src='/penn_logo.png' alt='UPenn' className='h-12 w-auto object-contain' />
          </div>

          <div className='max-w-xl text-left text-sm leading-6 text-[#d6dee8] md:text-right'>
            <p>3401 Walnut Street Suite 417B, Philadelphia PA, 19104</p>
            <p className='mt-1 text-xs text-[#9fb2ca]'>
              Copyright © 2023 - 2026 - All right reserved by CSSLab at UPenn
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Team
