import { useEffect, useRef } from 'react'
import { createUniverse } from '../Home/stars-render'

const IC2S2 = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const starDensity = 0.216
    const speedCoeff = 0.03
    const giantColor = '180,184,240'
    const starColor = '226,225,142'
    const cometColor = '226,225,224'
    const cometDisabled = false
    const canvas = canvasRef.current
    if (!canvas) return

    const cleanup = createUniverse(
      canvas,
      starDensity,
      speedCoeff,
      giantColor,
      starColor,
      cometColor,
      cometDisabled,
    )
    return () => {
      cleanup()
    }
  }, [])

  return (
    <div className='relative min-h-screen container-gradient'>
      {/* Galaxy Background Canvas */}
      <canvas
        ref={canvasRef}
        id='universe'
        className='fixed top-0 left-0 w-full h-full z-0 pointer-events-none'
      ></canvas>

      {/* Fixed Navigation Menu */}
      <nav className='fixed top-0 left-0 w-full z-20 bg-black bg-opacity-50'>
        <div className='max-w-7xl mx-auto px-4 py-4 flex justify-between items-center'>
          <h1 className='text-white text-xl font-bold'>Research Cartography with Atlas</h1>
          <ul className='flex space-x-6'>
            <li>
              <a href='#description' className='text-gray-200 hover:text-white'>
                Description
              </a>
            </li>
            <li>
              <a href='#outline' className='text-gray-200 hover:text-white'>
                Tutorial Outline
              </a>
            </li>
            <li>
              <a href='#hands-on' className='text-gray-200 hover:text-white'>
                Hands‑On Session
              </a>
            </li>
            <li>
              <a href='#speakers' className='text-gray-200 hover:text-white'>
                Speakers
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* Scrollable Content Sections */}
      <div className='relative z-10 pt-20 pb-10'>
        {/* SECTION: Description */}
        <section id='description' className='max-w-4xl mx-auto py-16 text-white space-y-6'>
          <h2 className='text-4xl font-bold text-center'>Research Cartography with Atlas</h2>
          <p className='text-lg'>
            In this workshop, you will learn about the conceptual importance and challenges of
            research cartography and gain hands‑on practice using Atlas—our platform designed to
            systematically analyze and integrate research findings across literature. Questions like
            “Under which situations does X cause Y?” require consistently detailed comparisons
            across studies.
          </p>
          <p className='text-lg'>
            By emphasizing commensurability—describing findings in comparable ways—Atlas helps
            reveal the actual practices behind reported claims and supports more effective
            meta‑analysis. Sign up or log in to get started here:{' '}
            <a
              className='underline text-blue-300 hover:text-blue-500'
              href='https://atlas.seas.upenn.edu'
              target='_blank'
              rel='noreferrer'
            >
              https://atlas.seas.upenn.edu
            </a>
          </p>
          <p className='text-lg'>
            Join us on July 21‑24, 2025, in Norrköping, Sweden at the 11th International Conference
            on Computational Social Science (IC²S²) to learn a new scientific approach that turns
            research papers into quantitative maps.
          </p>
        </section>

        {/* SECTION: Tutorial Outline */}
        <section id='outline' className='max-w-4xl mx-auto py-16 text-white space-y-6'>
          <h2 className='text-4xl font-bold text-center'>Tutorial Outline</h2>
          <ul className='list-disc ml-8 space-y-3 text-lg'>
            <li>
              <span className='font-semibold'>Introducing research cartography:</span> A high‑level
              overview of theory and practice (30–40 minutes).
            </li>
            <li>
              <span className='font-semibold'>Case study:</span> A working demo illustrating
              end‑to‑end data processing and project workflow (20–40 minutes).
            </li>
            <li>
              <span className='font-semibold'>Hands‑on with Atlas:</span> Participants create a
              project from scratch, add literature, select features, and run analyses (40 minutes).
            </li>
            <li>
              <span className='font-semibold'>Creating features on Atlas:</span> A guided
              brainstorming and discussion session focusing on key dimensions (20 minutes).
            </li>
            <li>
              <span className='font-semibold'>New feature in practice:</span> Time for participants
              to develop and test their own features (40 minutes).
            </li>
            <li>
              <span className='font-semibold'>Developer tooling:</span> An introduction to API
              access, deployment, and contributing to open‑source tools (10–20 minutes).
            </li>
          </ul>
        </section>

        {/* SECTION: Hands‑On Session Material */}
        <section id='hands-on' className='max-w-4xl mx-auto py-16 text-white space-y-6'>
          <h2 className='text-4xl font-bold text-center'>Hands‑On Session Material</h2>
          <p className='text-lg'>
            During the hands‑on segment of the tutorial, participants will log in to Atlas and set
            up their own research projects. The session will guide you through:
          </p>
          <ul className='list-disc ml-8 space-y-3 text-lg'>
            <li>Importing and organizing research papers.</li>
            <li>Selecting or even defining new dimensions (features) for systematic comparison.</li>
            <li>
              Running analyses and visualizing research maps that highlight key experimental
              details.
            </li>
            <li>Exporting synthesized data to further your research.</li>
          </ul>
          <p className='text-lg'>
            Please bring your own list of papers (e.g., experiments with at least 10 subjects and
            multiple conditions) and a laptop.
          </p>
        </section>

        {/* SECTION: Speakers */}
        <section id='speakers' className='max-w-4xl mx-auto py-16 text-white space-y-8'>
          <h2 className='text-4xl font-bold text-center'>Speakers &amp; Organizers</h2>

          <div className='space-y-4'>
            {/* Mark Whiting */}
            <div>
              <h3 className='text-2xl font-bold'>Mark Whiting</h3>
              <p className='italic'>
                University of Pennsylvania, Pareto.ai –{' '}
                <span className='font-semibold'>markew@seas.upenn.edu</span>
              </p>
              <p className='text-lg'>
                Mark E. Whiting is the Chief Technology Officer of Pareto Inc and a visiting
                scientist at the Computational Social Science Lab (CSSLab) at the University of
                Pennsylvania. With postdoctoral experience with Duncan Watts at Penn and Michael S.
                Bernstein at Stanford, Mark holds degrees in Design from RMIT and KAIST and a PhD in
                Engineering from CMU. Learn more about him at{' '}
                <a
                  className='underline text-blue-300 hover:text-blue-500'
                  href='https://whiting.me'
                  target='_blank'
                  rel='noreferrer'
                >
                  https://whiting.me
                </a>
                .
              </p>
            </div>

            {/* Amirhossein Nakhaei */}
            <div>
              <h3 className='text-2xl font-bold'>Amirhossein Nakhaei</h3>
              <p className='italic'>
                RWTH Aachen University –{' '}
                <span className='font-semibold'>amirhossein.nakhaei@rwth-aachen.de</span>
              </p>
              <p className='text-lg'>
                Amirhossein Nakhaei is an incoming PhD student in Data Science at Boston University
                and a visiting researcher at CSSLab at Penn. Holding a master’s in Computational
                Social Science from RWTH Aachen University, he currently applies his expertise as a
                software engineer in Berlin.
              </p>
            </div>

            {/* Linnea Gandhi */}
            <div>
              <h3 className='text-2xl font-bold'>Linnea Gandhi</h3>
              <p className='italic'>
                University of Pennsylvania –{' '}
                <span className='font-semibold'>lgandhi@wharton.upenn.edu</span>
              </p>
              <p className='text-lg'>
                Linnea Gandhi is a Lecturer and PhD candidate at Wharton whose research focuses on
                improving the generalizability of behavioral science interventions. Her
                dissertation—supported by a database of 200+ experimental variables—seeks to both
                predict new experiments and build LLM‑based tools to expedite research synthesis via
                Atlas.
              </p>
            </div>

            {/* Duncan Watts */}
            <div>
              <h3 className='text-2xl font-bold'>Duncan Watts</h3>
              <p className='italic'>
                University of Pennsylvania –{' '}
                <span className='font-semibold'>djwatts@seas.upenn.edu</span>
              </p>
              <p className='text-lg'>
                Duncan J. Watts is the Stevens University Professor at the University of
                Pennsylvania with primary appointments across several departments including
                Communication, Engineering, and Operations. His research centers on social networks
                and the dynamics of human systems, providing a critical foundation for the work
                presented in this workshop.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default IC2S2
