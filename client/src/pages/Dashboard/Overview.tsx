import { useEffect } from 'react'
import MainPage from '@/components/View/DataGrid/MainPage'
import ProjectsTable from '@/components/View/DataGrid/ProjectsTable'
import PapersTable from '@/components/View/DataGrid/PapersTable'
import useOverviewData from './useOverviewData'
import { useUser } from '@/context/User/useUser'
import { Card } from '@/components/ui/card'
import { Activity, Coins, Layers } from 'lucide-react'

const Overview = () => {
  const { projects, papers, isLoadingProjects, isLoadingPapers, refetchProjects } =
    useOverviewData(50)
  const { user, refreshUser } = useUser()

  // Refresh usage figures on mount so the dashboard reflects tokens consumed
  // since login (the numbers otherwise only update at login time).
  useEffect(() => {
    refreshUser()
  }, [refreshUser])
  const runningJobs = projects
    .map((project) => project.results.filter((result) => !result.finished).length)
    .reduce((a, b) => a + b, 0)

  // Live monthly-usage figures (USD) from the metering system; fall back to a
  // dash while it loads.
  const usage = user.usage
  const fmtUsd = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
  const creditValue = usage ? fmtUsd(usage.remaining_usd) : '—'
  const creditDetail = usage ? `of ${fmtUsd(usage.limit_usd)} left` : 'remaining'

  const stats = [
    {
      title: 'Running jobs',
      value: runningJobs,
      detail: 'in progress',
      icon: Activity,
    },
    {
      title: 'Available features',
      value: 57,
      detail: 'total - 0 user',
      icon: Layers,
    },
    {
      title: 'Monthly usage',
      value: creditValue,
      detail: creditDetail,
      icon: Coins,
    },
  ]

  return (
    <MainPage
      breadcrumbs={[
        {
          title: 'Dashboard',
          url: '/dashboard',
        },
      ]}
      sidebarOpen={true}
    >
      <div className='flex flex-1 flex-col gap-4 p-4 pt-0 min-w-0 text-[#0b1f3a]'>
        <div className='grid auto-rows-min gap-4 md:grid-cols-3'>
          {stats.map((stat) => (
            <Card
              key={stat.title}
              className='gap-2 rounded-sm border-[#d6dee8] bg-white/90 p-4 shadow-sm backdrop-blur-sm'
            >
              <div className='flex items-center justify-between gap-3'>
                <h2 className='text-sm font-semibold text-[#334155]'>{stat.title}</h2>
                <div className='flex h-7 w-7 items-center justify-center rounded-sm border border-[#d6dee8] bg-[#eef4fa] text-[#3c6082]'>
                  <stat.icon className='h-4 w-4' />
                </div>
              </div>
              <p className='text-sm text-[#64748b]'>
                <span className='mr-1 text-xl font-semibold tracking-tight text-[#071a33]'>
                  {stat.value}
                </span>
                {stat.detail}
              </p>
            </Card>
          ))}
        </div>

        <ProjectsTable
          projects={projects}
          isLoading={isLoadingProjects}
          refetchProjects={refetchProjects}
        />
        <PapersTable papers={papers} isLoading={isLoadingPapers} />
      </div>
    </MainPage>
  )
}

export default Overview
