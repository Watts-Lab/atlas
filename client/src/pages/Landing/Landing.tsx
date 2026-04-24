import React from 'react'
import { CosmicBackground } from './CelestialBackground'
import { ScrollTree } from './ScrollTree'
import { motion, useScroll, useMotionValueEvent } from 'motion/react'
import { useState } from 'react'

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
    <div className='bg-[#02040a] min-h-screen text-white font-sans selection:bg-indigo-500/30'>
      <CosmicBackground />

      <motion.header
        className='fixed top-0 left-0 right-0 bg-[rgba(11,16,17,0.9)] border-b border-[#1d2628] z-[100] backdrop-blur-md'
        animate={{
          y: hidden ? -140 : 0,
          opacity: hidden ? 0 : 1,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className='max-w-225 mx-auto h-15 flex items-center justify-between px-6'>
          {/* Logo */}
          <div className='flex items-center text-[#f5f5f5]'>
            <button onClick={() => scrollTo('home')}>
              <h1 className='text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-indigo-300 via-white to-purple-300'>
                Atlas
              </h1>
            </button>
          </div>

          {/* Nav */}
          <nav className='flex items-center gap-8 max-[600px]:gap-5'>
            <button
              onClick={() => scrollTo('home')}
              className='text-[#f5f5f5] text-sm opacity-60 hover:opacity-100 transition-opacity'
            >
              Home
            </button>
            <button
              onClick={() => scrollTo('explore')}
              className='text-[#f5f5f5] text-sm opacity-60 hover:opacity-100 transition-opacity'
            >
              Explore
            </button>
            <button
              onClick={() => scrollTo('get-started')}
              className='text-[#f5f5f5] text-sm opacity-60 hover:opacity-100 transition-opacity'
            >
              Get Started
            </button>

            <button
              onClick={() => scrollTo('home')}
              className='
      text-sm font-semibold px-4 py-1.5 rounded-full
      bg-indigo-600/90 text-white border border-indigo-400/40
      shadow-[0_0_16px_rgba(99,102,241,0.45)]
      hover:bg-indigo-500 hover:shadow-[0_0_24px_rgba(99,102,241,0.7)]
      transition-all duration-200
    '
            >
              Login
            </button>
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
          <h1 className='text-6xl md:text-8xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-linear-to-r from-indigo-300 via-white to-purple-300'>
            Atlas
          </h1>
          <p className='text-xl md:text-2xl text-indigo-100/70 max-w-2xl mx-auto font-light leading-relaxed'>
            Extract the universe of knowledge hidden within scientific papers.
          </p>
          <div className='mt-12'>
            <p className='text-sm uppercase tracking-widest text-white/40 animate-pulse'>
              Scroll to explore
            </p>
            <div className='w-px h-12 bg-linear-to-b from-white/40 to-transparent mx-auto mt-4' />
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
        className='relative z-10 h-screen flex flex-col items-center justify-center px-4 text-center'
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className='text-4xl md:text-5xl font-bold mb-6 tracking-tight'>
            Ready to map your data?
          </h2>
          <p className='text-lg text-indigo-200/60 mb-10 max-w-xl mx-auto'>
            Upload your PDFs and let Atlas automatically structure the experiments, conditions, and
            results into a clean, queryable format.
          </p>
          <button className='px-8 py-4 bg-white text-black rounded-full font-medium hover:bg-indigo-50 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)]'>
            Get Started with Atlas
          </button>
        </motion.div>
      </section>
    </div>
  )
}

export default Landing
