import MainPage from '@/components/View/DataGrid/MainPage'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { SidebarRight } from './SideBarProject'
import Dashboard from '@/components/Builder/Dashboard'

const ProjectCreate = () => {
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
          title: 'Projects',
          url: '/projects',
        },
        {
          title: 'Create Project',
          url: '/projects/create',
        },
      ]}
      sidebarOpen={false}
      rightSidebar={<SidebarRight />}
    >
      <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
        <Dashboard />
      </div>
    </MainPage>
  )
}

export default ProjectCreate
