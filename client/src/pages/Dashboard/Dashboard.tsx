import { useEffect, useState } from 'react'
import Papers, { Paper } from './Papers'
import Projects, { Project } from './Projects'
import { API_URL } from '../../service/api'
import { useNavigate } from 'react-router-dom'

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [papers, setPapers] = useState<Paper[]>([])

  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token') || ''

    if (!token) {
      navigate('/login')
    }

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

  useEffect(() => {
    const token = localStorage.getItem('token') || ''

    if (!token) {
      navigate('/login')
    }

    const fetchPapers = async () => {
      await fetch(`${API_URL}/user/papers`, {
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
        } else {
          throw new Error('Network response was not ok')
        }
      })
    }

    fetchPapers()
  }, [])

  return (
    <div className='bg-gray-100 dark:bg-gray-900 p-4 min-h-screen'>
      {/* <!-- User Info Section --> */}
      <div className='bg-white dark:bg-gray-800 shadow-md rounded p-4 mb-6'>
        <div className='flex justify-between items-center'>
          <div>
            <h2 className='text-xl font-bold dark:text-white'>User: user@example.com</h2>
            <p className='dark:text-gray-300'>Tokens used: 50 | Tokens available: 150</p>
            <p className='dark:text-gray-300'>Projects: 3 | Papers: 10</p>
          </div>
        </div>
      </div>

      <Projects projects={projects} />
      <Papers papers={papers} />
    </div>
  )
}

export default Dashboard
