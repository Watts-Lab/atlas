import { useEffect, useState } from 'react'
import { API_URL } from '../../service/api'
import { useNavigate } from 'react-router-dom'
import MainPage from '@/components/View/DataGrid/MainPage'
import ProjectsTable, { Projects } from '@/components/View/DataGrid/ProjectsTable'
import PapersTable, { Papers } from '@/components/View/DataGrid/PapersTable'

const Overview = () => {
  const [projects, setProjects] = useState<Projects[]>([])
  const [papers, setPapers] = useState<Papers[]>([])

  // papers table page size default is 50
  const [pageSize] = useState<number>(50)

  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token') || ''

    const fetchProjects = async () => {
      await fetch(`${API_URL}/user/projects`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).then(async (response) => {
        if (response.ok) {
          const data = await response.json()

          setProjects(
            data.project.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (project: { id: string; title: string; description: string; papers: any[] }) => {
                return {
                  id: project.id,
                  name: project.title,
                  description: project.description,
                  paper_count: project.papers.length,
                } as Projects
              },
            ),
          )
        } else {
          throw new Error('Network response was not ok')
        }
      })
    }

    fetchProjects()
  }, [])

  const fetchPapers = async (page: number) => {
    const token = localStorage.getItem('token') || ''
    if (!token) {
      navigate('/')
    }
    await fetch(`${API_URL}/user/papers?page=${page}&page_size=${pageSize}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }).then(async (response) => {
      if (response.ok) {
        const data = await response.json()
        setPapers(
          data.papers.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (paper: { id: string; title: string; file_hash: string; updated_at: string }) => {
              return {
                id: paper.id,
                title: paper.title,
                file_hash: paper.file_hash,
                uploaded_at: paper.updated_at,
              } as Papers
            },
          ),
        )
      } else {
        throw new Error('Network response was not ok')
      }
    })
  }

  useEffect(() => {
    fetchPapers(1)
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
            <p className='text-sm text-gray-500'>0 In progress</p>
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
        <ProjectsTable projects={projects} />
        <PapersTable papers={papers} />
      </div>
    </MainPage>
  )
}

export default Overview
