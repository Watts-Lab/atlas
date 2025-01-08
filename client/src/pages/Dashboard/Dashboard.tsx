import { useEffect, useState } from 'react'
import Papers, { Paper } from './Papers'
import Projects, { Project } from './Projects'
import { API_URL } from '../../service/api'
import { useNavigate } from 'react-router-dom'

const Dashboard = () => {
  const email = localStorage.getItem('email') || ''
  const [projects, setProjects] = useState<Project[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize] = useState<number>(10) // Set your desired page size here
  const [totalPapers, setTotalPapers] = useState<number>(0)

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
                  papers: project.papers.length,
                }
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
                updated_at: paper.updated_at,
              }
            },
          ),
        )
        setTotalPapers(data.total_papers)
      } else {
        throw new Error('Network response was not ok')
      }
    })
  }

  useEffect(() => {
    fetchPapers(currentPage)
  }, [currentPage])

  return (
    <div className='bg-gray-100 dark:bg-gray-900 p-4 min-h-screen'>
      {/* <!-- User Info Section --> */}
      <div className='bg-white dark:bg-gray-800 shadow-md rounded p-4 mb-6'>
        <div className='flex justify-between items-center'>
          <div>
            <h2 className='text-xl font-bold dark:text-white'>User: {email}</h2>
            <p className='dark:text-gray-300'></p>
            <p className='dark:text-gray-300'>
              Projects: {projects.length} | Papers: {totalPapers}
            </p>
          </div>
        </div>
      </div>

      <Projects projects={projects} />
      <Papers
        papers={papers}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPapers={totalPapers}
        setCurrentPage={setCurrentPage}
      />
    </div>
  )
}

export default Dashboard
