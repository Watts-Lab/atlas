import React from 'react'
import { motion } from 'motion/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

type SiteHeaderProps = {
  /** When true, the header slides out of view (hide-on-scroll-down). */
  hidden?: boolean
}

/**
 * Shared top navigation used across the public marketing pages (Landing, Team).
 * Anchor links (Explore) smooth-scroll when already on the landing page and
 * otherwise navigate to the landing page and jump to the section.
 */
const SiteHeader: React.FC<SiteHeaderProps> = ({ hidden = false }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const goToSection = (id: string) => {
    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate(`/#${id}`)
    }
  }

  const linkClass = 'text-[#334155] text-sm hover:text-[#0b1f3a] transition-colors'

  return (
    <motion.header
      className='fixed top-0 left-0 right-0 bg-[#f8fafc]/90 border-b border-[#d6dee8] z-100 backdrop-blur-md'
      animate={{
        y: hidden ? -140 : 0,
        opacity: hidden ? 0 : 1,
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className='max-w-225 mx-auto h-15 flex items-center justify-between px-6'>
        {/* Logo */}
        <div className='flex items-center text-[#0b1f3a]'>
          <Link to='/' className='flex items-center gap-3'>
            <img src='/logo.svg' alt='' className='h-8 w-8' />
            <h1 className='text-2xl font-semibold tracking-[0.08em] uppercase'>Atlas</h1>
          </Link>
        </div>

        {/* Nav */}
        <nav className='flex items-center gap-8 max-[600px]:gap-5'>
          <Link to='/' className={linkClass}>
            Home
          </Link>
          <button onClick={() => goToSection('explore')} className={linkClass}>
            Explore
          </button>
          <Link to='/team' className={linkClass}>
            Team
          </Link>
          <a href='/docs/' className={linkClass}>
            Documentation
          </a>

          <Link
            to='/login'
            className='text-sm font-semibold px-4 py-1.5 rounded-sm bg-[#0b1f3a] text-white border border-[#0b1f3a] hover:bg-[#16375f] hover:border-[#16375f] transition-colors duration-200'
          >
            Login
          </Link>
        </nav>
      </div>
    </motion.header>
  )
}

export default SiteHeader
