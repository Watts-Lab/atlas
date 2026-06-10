import { motion, useScroll, useTransform, AnimatePresence, type MotionValue } from 'motion/react'
import { useRef, useState } from 'react'
import {
  FileText,
  AlignLeft,
  FlaskConical,
  Tag,
  Users,
  Database,
  Layers,
  Activity,
  UserRound,
  Mail,
  Briefcase,
  Building2,
  CalendarDays,
  MapPin,
  Award,
  TrendingUp,
  BarChart2,
  BookOpen,
  Globe,
  AlertTriangle,
  CheckSquare,
  Scale,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeData = {
  title: string
  icon: React.ElementType
  description: string
  isArray?: boolean
}

type Schema = {
  label: string
  tagline: string
  Icon: React.ElementType
  root: NodeData
  l1: NodeData[]
  l2: NodeData[]
  l3: NodeData[]
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const SCHEMAS: Record<string, Schema> = {
  science: {
    label: 'Scientific Paper',
    tagline: 'Extracts experiments, conditions and metrics from academic research',
    Icon: FlaskConical,
    root: {
      title: 'Scientific PDF',
      icon: FileText,
      description: 'The source document — any published research paper or academic report.',
    },
    l1: [
      {
        title: 'Paper Title',
        icon: Tag,
        description: 'The official title of the published research paper.',
      },
      {
        title: 'Abstract',
        icon: AlignLeft,
        description: 'A concise summary of the research goals, methods, and findings.',
      },
      {
        title: 'Experiments',
        icon: FlaskConical,
        description:
          'A paper can contain multiple experiments — each extracted and structured independently.',
        isArray: true,
      },
    ],
    l2: [
      {
        title: 'Experiment Name',
        icon: Tag,
        description: 'The unique identifier for this experiment within the paper.',
      },
      {
        title: 'Description',
        icon: AlignLeft,
        description: 'Detailed methodology and setup of the experiment.',
      },
      {
        title: 'Participants',
        icon: Users,
        description: 'Demographics and sample size of the subjects involved.',
      },
      {
        title: 'Source',
        icon: Database,
        description: 'Where participants or data were sourced from (MTurk, university, etc.).',
      },
      {
        title: 'Conditions',
        icon: Layers,
        description:
          'Each experiment can have multiple conditions — different treatments or groups applied.',
        isArray: true,
      },
    ],
    l3: [
      {
        title: 'Condition Name',
        icon: Tag,
        description: 'The treatment or control group identifier.',
      },
      {
        title: 'Stimuli Type',
        icon: Layers,
        description: 'Material presented to participants — images, text, audio, and more.',
      },
      {
        title: 'Response Metric',
        icon: Activity,
        description: 'How participant reactions were measured (reaction time, accuracy, ratings…).',
      },
    ],
  },

  hr: {
    label: 'CV Screening',
    tagline: 'Parses candidate résumés into roles, achievements and impact metrics',
    Icon: UserRound,
    root: {
      title: 'Candidate CV',
      icon: UserRound,
      description: 'Any résumé or curriculum vitae — Atlas structures every section automatically.',
    },
    l1: [
      {
        title: 'Full Name',
        icon: Tag,
        description: "The candidate's full legal name as it appears on the CV.",
      },
      {
        title: 'Contact Info',
        icon: Mail,
        description: 'Email, phone number, LinkedIn profile, and current location.',
      },
      {
        title: 'Work Experience',
        icon: Briefcase,
        description:
          'Each previous role is extracted individually with full company and timeline details.',
        isArray: true,
      },
    ],
    l2: [
      { title: 'Job Title', icon: Tag, description: 'The official title held during this role.' },
      {
        title: 'Company',
        icon: Building2,
        description: 'The organisation where this role was held.',
      },
      {
        title: 'Duration',
        icon: CalendarDays,
        description: 'Start and end dates and total time spent in this role.',
      },
      {
        title: 'Location',
        icon: MapPin,
        description: 'City, country, or remote status of the position.',
      },
      {
        title: 'Achievements',
        icon: Award,
        description: 'Each role may contain multiple concrete, measurable accomplishments.',
        isArray: true,
      },
    ],
    l3: [
      {
        title: 'Achievement',
        icon: Tag,
        description: 'A specific accomplishment or project delivered in this role.',
      },
      {
        title: 'Impact',
        icon: TrendingUp,
        description: 'The business outcome or improvement driven by this achievement.',
      },
      {
        title: 'Metric',
        icon: BarChart2,
        description: 'Quantified result — growth %, revenue generated, users acquired, etc.',
      },
    ],
  },

  contract: {
    label: 'Contract Analysis',
    tagline: 'Identifies clauses, obligations and risk levels in legal documents',
    Icon: Scale,
    root: {
      title: 'Legal Contract',
      icon: FileText,
      description:
        'Any legal agreement — NDAs, service contracts, leases — parsed into clean structured data.',
    },
    l1: [
      {
        title: 'Parties',
        icon: Users,
        description: 'All entities bound by the contract — names, roles, and legal representation.',
      },
      {
        title: 'Key Dates',
        icon: CalendarDays,
        description: 'Effective date, expiry, renewal windows, and milestone deadlines.',
      },
      {
        title: 'Clauses',
        icon: BookOpen,
        description:
          'A contract contains multiple clauses — each one parsed and risk-assessed independently.',
        isArray: true,
      },
    ],
    l2: [
      {
        title: 'Clause Title',
        icon: Tag,
        description: 'The formal heading or reference number of the clause.',
      },
      {
        title: 'Obligations',
        icon: AlignLeft,
        description: 'What each party is contractually required to do under this clause.',
      },
      {
        title: 'Jurisdiction',
        icon: Globe,
        description: 'Governing law and the legal territory that applies to this clause.',
      },
      {
        title: 'Risk Level',
        icon: AlertTriangle,
        description: 'Atlas automatically flags clauses as low, medium, or high risk.',
      },
      {
        title: 'Sub-clauses',
        icon: Layers,
        description: 'Complex clauses often contain nested provisions — each extracted separately.',
        isArray: true,
      },
    ],
    l3: [
      {
        title: 'Sub-clause',
        icon: Tag,
        description: 'The specific nested provision within the parent clause.',
      },
      {
        title: 'Requirement',
        icon: CheckSquare,
        description: 'The exact action or condition stipulated by this sub-clause.',
      },
      {
        title: 'Penalty',
        icon: Scale,
        description: 'Consequence or remedy applicable if this sub-clause is breached.',
      },
    ],
  },
}

// ─── Positions (fixed spatial layout shared across all schemas) ───────────────

const POS = {
  root: { x: 2000, y: 200 },
  l1: [
    { x: 1500, y: 700 },
    { x: 2000, y: 700 },
    { x: 2500, y: 700 },
  ],
  l2: [
    { x: 1700, y: 1200 },
    { x: 2100, y: 1200 },
    { x: 2500, y: 1200 },
    { x: 2900, y: 1200 },
    { x: 3300, y: 1200 },
  ],
  l3: [
    { x: 2900, y: 1700 },
    { x: 3300, y: 1700 },
    { x: 3700, y: 1700 },
  ],
}

// Header height in px — must match h-15 (60px) in Landing
const HEADER_H = 60

// ─── ScrollTree ───────────────────────────────────────────────────────────────

export function ScrollTree({ headerHidden = false }: { headerHidden?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeKey, setActiveKey] = useState<keyof typeof SCHEMAS>('science')
  const schema = SCHEMAS[activeKey]

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // ── Per-branch MotionValues

  const l1Path0 = useTransform(scrollYProgress, [0.05, 0.21], [0, 1])
  const l1Path1 = useTransform(scrollYProgress, [0.07, 0.23], [0, 1])
  const l1Path2 = useTransform(scrollYProgress, [0.09, 0.25], [0, 1])
  const l1Node0 = useTransform(scrollYProgress, [0.19, 0.24], [0, 1])
  const l1Node1 = useTransform(scrollYProgress, [0.21, 0.26], [0, 1])
  const l1Node2 = useTransform(scrollYProgress, [0.23, 0.28], [0, 1])

  const l2Path0 = useTransform(scrollYProgress, [0.43, 0.54], [0, 1])
  const l2Path1 = useTransform(scrollYProgress, [0.45, 0.56], [0, 1])
  const l2Path2 = useTransform(scrollYProgress, [0.47, 0.58], [0, 1])
  const l2Path3 = useTransform(scrollYProgress, [0.49, 0.6], [0, 1])
  const l2Path4 = useTransform(scrollYProgress, [0.51, 0.62], [0, 1])
  const l2Node0 = useTransform(scrollYProgress, [0.52, 0.56], [0, 1])
  const l2Node1 = useTransform(scrollYProgress, [0.54, 0.58], [0, 1])
  const l2Node2 = useTransform(scrollYProgress, [0.56, 0.6], [0, 1])
  const l2Node3 = useTransform(scrollYProgress, [0.58, 0.62], [0, 1])
  const l2Node4 = useTransform(scrollYProgress, [0.6, 0.65], [0, 1])

  const l3Path0 = useTransform(scrollYProgress, [0.76, 0.84], [0, 1])
  const l3Path1 = useTransform(scrollYProgress, [0.78, 0.86], [0, 1])
  const l3Path2 = useTransform(scrollYProgress, [0.8, 0.88], [0, 1])
  const l3Node0 = useTransform(scrollYProgress, [0.82, 0.86], [0, 1])
  const l3Node1 = useTransform(scrollYProgress, [0.84, 0.88], [0, 1])
  const l3Node2 = useTransform(scrollYProgress, [0.86, 0.91], [0, 1])

  const l1Paths = [l1Path0, l1Path1, l1Path2]
  const l1NodeVals = [l1Node0, l1Node1, l1Node2]
  const l2Paths = [l2Path0, l2Path1, l2Path2, l2Path3, l2Path4]
  const l2NodeVals = [l2Node0, l2Node1, l2Node2, l2Node3, l2Node4]
  const l3Paths = [l3Path0, l3Path1, l3Path2]
  const l3NodeVals = [l3Node0, l3Node1, l3Node2]

  // ── Camera pan

  const focusX = useTransform(
    scrollYProgress,
    [0, 0.28, 0.43, 0.65, 0.76, 1.0],
    [2000, 2000, 2500, 2500, 3300, 3300],
  )
  const focusY = useTransform(
    scrollYProgress,
    [0, 0.28, 0.43, 0.65, 0.76, 1.0],
    [200, 700, 700, 1200, 1200, 1700],
  )

  const SCALE = 0.75
  const cx = useTransform(focusX, (v) => `calc(50vw - ${v * SCALE}px)`)
  const cy = useTransform(focusY, (v) => `calc(50vh - ${v * SCALE}px)`)

  const handleSchemaChange = (key: string) => {
    setActiveKey(key)
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const rootNode = { ...POS.root, ...schema.root }
  const l1Data = schema.l1.map((d, i) => ({ ...POS.l1[i], ...d }))
  const l2Data = schema.l2.map((d, i) => ({ ...POS.l2[i], ...d }))
  const l3Data = schema.l3.map((d, i) => ({ ...POS.l3[i], ...d }))

  // When the header slides back in, push the tab selector down so it clears it.
  // headerHidden=true  → header is gone    → tabs sit at 32px (top-8)
  // headerHidden=false → header is visible → tabs sit at HEADER_H + 16px
  const tabsTop = headerHidden ? 32 : HEADER_H + 16

  return (
    <div ref={containerRef} className='h-[600vh] relative z-10'>
      <div className='sticky top-0 h-screen w-full overflow-hidden'>
        {/* ── Schema selector ─────────────────────────────────────────────── */}
        <div
          className='absolute inset-x-0 z-20 flex justify-center pointer-events-none transition-[top] duration-300 ease-in-out'
          style={{ top: tabsTop }}
        >
          <div className='pointer-events-auto flex flex-col items-center gap-3'>
            <p className='text-[10px] uppercase tracking-[0.18em] text-white/25 font-semibold'>
              Document type
            </p>

            <div className='flex p-1.5 gap-1 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'>
              {Object.entries(SCHEMAS).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => handleSchemaChange(key)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                              transition-colors duration-200 select-none
                              ${activeKey === key ? 'text-white' : 'text-white/35 hover:text-white/60'}`}
                >
                  {activeKey === key && (
                    <motion.div
                      layoutId='schema-pill'
                      className='absolute inset-0 rounded-xl bg-indigo-600/90 border border-indigo-400/30
                                 shadow-[0_0_20px_rgba(99,102,241,0.45)]'
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <s.Icon size={13} className='relative z-10 shrink-0' />
                  <span className='relative z-10 whitespace-nowrap'>{s.label}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode='wait'>
              <motion.p
                key={activeKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className='text-[11px] text-white/30 text-center max-w-[300px] leading-relaxed'
              >
                {schema.tagline}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* ── SVG canvas ──────────────────────────────────────────────────── */}
        <motion.div
          className='absolute top-0 left-0'
          style={{ x: cx, y: cy, scale: SCALE, transformOrigin: '0 0', width: 6000, height: 3000 }}
        >
          <svg width='6000' height='3000' className='overflow-visible'>
            {l1Data.map((n, i) => (
              <Branch key={`p1-${i}`} start={rootNode} end={n} pathLength={l1Paths[i]} />
            ))}
            {l2Data.map((n, i) => (
              <Branch key={`p2-${i}`} start={l1Data[2]} end={n} pathLength={l2Paths[i]} />
            ))}
            {l3Data.map((n, i) => (
              <Branch key={`p3-${i}`} start={l2Data[4]} end={n} pathLength={l3Paths[i]} />
            ))}

            <Node {...rootNode} schemaKey={activeKey} nodeOpacity={1} nodeScale={1} />

            {l1Data.map((n, i) => (
              <Node
                key={`n1-${i}`}
                {...n}
                schemaKey={activeKey}
                nodeOpacity={l1NodeVals[i]}
                nodeScale={l1NodeVals[i]}
              />
            ))}
            {l2Data.map((n, i) => (
              <Node
                key={`n2-${i}`}
                {...n}
                schemaKey={activeKey}
                nodeOpacity={l2NodeVals[i]}
                nodeScale={l2NodeVals[i]}
              />
            ))}
            {l3Data.map((n, i) => (
              <Node
                key={`n3-${i}`}
                {...n}
                schemaKey={activeKey}
                nodeOpacity={l3NodeVals[i]}
                nodeScale={l3NodeVals[i]}
              />
            ))}
          </svg>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Branch ───────────────────────────────────────────────────────────────────

function Branch({
  start,
  end,
  pathLength,
}: {
  start: { x: number; y: number }
  end: { x: number; y: number }
  pathLength: MotionValue<number>
}) {
  const sy = start.y + 50
  const ey = end.y - 50
  const my = sy + (ey - sy) / 2
  const d = `M ${start.x} ${sy} C ${start.x} ${my}, ${end.x} ${my}, ${end.x} ${ey}`

  return (
    <motion.path
      d={d}
      fill='transparent'
      stroke='rgba(165, 180, 252, 0.35)'
      strokeWidth='2.5'
      style={{ pathLength }}
    />
  )
}

// ─── Node ─────────────────────────────────────────────────────────────────────

function Node({
  x,
  y,
  title,
  icon: Icon,
  description,
  isArray,
  schemaKey,
  nodeOpacity,
  nodeScale,
}: {
  x: number
  y: number
  title: string
  icon: React.ElementType
  description: string
  isArray?: boolean
  schemaKey: string
  nodeOpacity: MotionValue<number> | number
  nodeScale: MotionValue<number> | number
}) {
  return (
    <foreignObject x={x - 160} y={y - 50} width='320' height='320'>
      <motion.div
        className='relative group/node mx-[10px] opacity-0'
        style={{ opacity: nodeOpacity, scale: nodeScale, transformOrigin: 'center top' }}
      >
        {isArray && (
          <>
            {/* card 3 — furthest back */}
            <div
              className='
              absolute inset-0 rounded-2xl
              border border-indigo-400/30 bg-indigo-950/60
              translate-y-[18px] translate-x-[14px] scale-[0.91]
              shadow-[0_0_12px_rgba(99,102,241,0.08)]
            '
            />
            {/* card 2 — middle layer */}
            <div
              className='
              absolute inset-0 rounded-2xl
              border border-indigo-400/45 bg-indigo-950/75
              translate-y-[9px] translate-x-[7px] scale-[0.96]
              shadow-[0_0_16px_rgba(99,102,241,0.12)]
            '
            />
          </>
        )}

        {/* Main card */}
        <div
          className='relative z-10 flex items-center gap-3 overflow-hidden
                        bg-[#0a0f1c]/90 backdrop-blur-xl border border-indigo-500/40
                        rounded-2xl px-4 py-[14px] text-white
                        shadow-[0_0_30px_rgba(99,102,241,0.15)]
                        transition-all duration-300
                        hover:border-indigo-400 hover:shadow-[0_0_40px_rgba(129,140,248,0.35)]'
        >
          <AnimatePresence mode='wait'>
            <motion.div
              key={`${schemaKey}-${title}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.18 }}
              className='flex items-center gap-3 w-full min-w-0'
            >
              <div
                className='p-2.5 bg-indigo-500/20 rounded-xl shrink-0
                              transition-colors duration-300 group-hover/node:bg-indigo-500/30'
              >
                <Icon
                  size={18}
                  className='text-indigo-300 group-hover/node:text-indigo-200
                                           transition-colors duration-300'
                />
              </div>
              <span className='font-semibold text-md tracking-wide truncate flex-1 min-w-0'>
                {title}
              </span>
              {isArray && (
                <span
                  className='shrink-0 font-mono text-md font-semibold tracking-wider
                                 text-indigo-400/70 border border-indigo-500/25 rounded-full
                                 px-2 py-0.5 bg-indigo-500/10'
                >
                  1…N
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Hover tooltip */}
        <div
          className='absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-60 z-50
                        opacity-0 group-hover/node:opacity-100
                        transition-opacity duration-200 pointer-events-none'
        >
          <div
            className='mx-auto mb-0 w-0 h-0
                          border-l-[6px] border-r-[6px] border-b-[6px]
                          border-l-transparent border-r-transparent border-b-indigo-500/30'
          />
          <AnimatePresence mode='wait'>
            <motion.div
              key={`tip-${schemaKey}-${title}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className='bg-[#0d1425]/95 border border-indigo-500/25 rounded-xl p-3
                         text-[20px] text-indigo-100/60 leading-relaxed
                         shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
            >
              {description}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </foreignObject>
  )
}
