import React from 'react'
import { CartographicBackground } from './CelestialBackground'
import { ScrollTree } from './ScrollTree'
import { motion, useScroll, useMotionValueEvent } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const Landing: React.FC = () => {
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

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className='bg-[#f8fafc] min-h-screen text-[#0b1f3a] font-sans selection:bg-[#6f95bd]/25 selection:text-[#06162b]'>
      <CartographicBackground />

      <motion.header
        className='fixed top-0 left-0 right-0 bg-[#f8fafc]/90 border-b border-[#d6dee8] z-[100] backdrop-blur-md'
        animate={{
          y: hidden ? -140 : 0,
          opacity: hidden ? 0 : 1,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className='max-w-225 mx-auto h-15 flex items-center justify-between px-6'>
          {/* Logo */}
          <div className='flex items-center text-[#0b1f3a]'>
            <button onClick={() => scrollTo('home')} className='flex items-center gap-3'>
              <img src='/logo.svg' alt='' className='h-8 w-8' />
              <h1 className='text-2xl font-semibold tracking-[0.08em] uppercase'>Atlas</h1>
            </button>
          </div>

          {/* Nav */}
          <nav className='flex items-center gap-8 max-[600px]:gap-5'>
            <button
              onClick={() => scrollTo('home')}
              className='text-[#334155] text-sm hover:text-[#0b1f3a] transition-colors'
            >
              Home
            </button>
            <button
              onClick={() => scrollTo('explore')}
              className='text-[#334155] text-sm hover:text-[#0b1f3a] transition-colors'
            >
              Explore
            </button>
            <button
              onClick={() => scrollTo('get-started')}
              className='text-[#334155] text-sm hover:text-[#0b1f3a] transition-colors'
            >
              Get Started
            </button>
            <a
              href='/docs/'
              className='text-[#334155] text-sm hover:text-[#0b1f3a] transition-colors'
            >
              Documentation
            </a>

            <Link
              to='/login'
              className='
      text-sm font-semibold px-4 py-1.5 rounded-sm
      bg-[#0b1f3a] text-white border border-[#0b1f3a]
      hover:bg-[#16375f] hover:border-[#16375f]
      transition-colors duration-200
    '
            >
              Login
            </Link>
          </nav>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section
        id='home'
        className='relative z-10 min-h-[60vh] flex flex-col items-center justify-end text-center px-4 pb-10 pt-32'
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <img src='/logo.svg' alt='' className='mx-auto mb-5 h-32 w-32' />
          <h1 className='text-6xl md:text-8xl font-semibold tracking-[0.01em] mb-6 text-[#071a33]'>
            Atlas
          </h1>
          <p className='text-xl md:text-2xl text-[#334155] max-w-2xl mx-auto font-light leading-relaxed'>
            Extract the structure of knowledge hidden within scientific papers.
          </p>
          <div className='mt-12'>
            <p className='text-sm uppercase tracking-widest text-[#64748b]'>Scroll to explore</p>
            <div className='w-px h-12 bg-[#8aa3bf] mx-auto mt-4' />
          </div>
        </motion.div>
      </section>

      {/* Scroll Animation Section */}
      <div id='explore'>
        <ScrollTree headerHidden={hidden} />
      </div>

      {/* Footer / Outro */}
      <section
        id='get-started'
        className='relative z-10 min-h-screen flex flex-col items-center justify-center px-4 text-center'
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className='text-4xl md:text-5xl font-semibold mb-6 tracking-tight text-[#071a33]'>
            Ready to map your data?
          </h2>
          <p className='text-lg text-[#475569] mb-10 max-w-xl mx-auto'>
            Upload your PDFs and let Atlas automatically structure the experiments, conditions, and
            results into a clean, queryable format.
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

export default Landing
