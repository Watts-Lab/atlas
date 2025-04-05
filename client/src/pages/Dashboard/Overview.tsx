import MainPage from '@/components/View/DataGrid/MainPage'
import ProjectsTable from '@/components/View/DataGrid/ProjectsTable'
import PapersTable from '@/components/View/DataGrid/PapersTable'
import { useNavigate } from 'react-router-dom'
import useOverviewData from './useOverviewData'
import { useEffect } from 'react'

const Overview = () => {
  const { projects, papers, isLoadingProjects, isLoadingPapers, refetchProjects } =
    useOverviewData(50)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/')
    }
  }, [])

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
      <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
        <div className='grid auto-rows-min gap-4 md:grid-cols-3'>
          <div className='bg-white rounded-lg shadow-md p-4'>
            <h2 className='text-lg font-semibold'>Running jobs</h2>
            <p className='text-sm text-gray-500'>
              {projects
                .map((project) => project.results.filter((result) => !result.finished).length)
                .reduce((a, b) => a + b, 0)}{' '}
              in progress
            </p>
          </div>
          <div className='bg-white rounded-lg shadow-md p-4'>
            <h2 className='text-lg font-semibold'>Available features</h2>
            <p className='text-sm text-gray-500'>57 Total - 0 User</p>
          </div>
          <div className='bg-white rounded-lg shadow-md p-4'>
            <h2 className='text-lg font-semibold'>Available credit</h2>
            <p className='text-sm text-gray-500'>0 tokens</p>
          </div>
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
