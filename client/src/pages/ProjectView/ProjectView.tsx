import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL } from '../../service/api'
import Contenteditable from './Contenteditable'
import { debounce } from 'lodash'
import TableView from '../../components/View/TableView/TableView'
import { check_data } from '../../components/View/TableView/hooks/mock-data'
import { Result } from '../../components/View/TableView/hooks/data-handler'

type ProjectDetails = {
  name: string
  id: string
  created_at: string
  updated_at: string
}

type Params = {
  project_id?: string
}

const ProjectView = () => {
  const params: Params = useParams()

  const [loading, setLoading] = useState<boolean>(false)

  const [projectResults, setProjectResults] = useState<Result[]>([check_data])
  const [project, setProject] = useState<ProjectDetails>({
    name: '',
    id: '',
    created_at: '',
    updated_at: '',
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [token, _setToken] = useState<string>(localStorage.getItem('token') || '')

  const abortControllerRef = useRef<AbortController | null>(null)

  const updateProjectName = useCallback(
    debounce(async (updatedName: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort() // Cancel the previous fetch call
      }
      const controller = new AbortController()
      abortControllerRef.current = controller

      const token = localStorage.getItem('token') || ''
      if (!token) {
        return
      }
      try {
        const response = await fetch(`${API_URL}/projects?project_id=${params.project_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ project_name: updatedName }),
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
        const response_data = await response.json()
        setProject((prevProject) => ({
          ...prevProject,
          name: response_data.project.title,
        }))
      } catch (error: unknown) {
        console.error('Error:', error)
      }
    }, 1000),
    [params.project_id],
  )

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      const token = localStorage.getItem('token') || ''
      if (!token) {
        return
      }

      try {
        const response = await fetch(`${API_URL}/projects?project_id=${params.project_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Network response was not ok')
        }

        const response_data = await response.json()
        setProject({
          name: response_data.project.title,
          id: response_data.project.id,
          created_at: response_data.project.created_at,
          updated_at: response_data.project.updated_at,
        })

        if (response_data.results.length !== 0) {
          setProjectResults(response_data.results)
        }
      } catch (error: unknown) {
        console.error('Error:', error)
        return null
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.project_id])

  return (
    <main className={`h-screen w-screen px-4 ${loading ? 'blur-sm' : ''}`}>
      <div className='navbar bg-base-100 flex flex-col sm:flex-row'>
        <div className='navbar-start z-10 md:pl-5'>
          <div className='flex-none'>
            <Contenteditable
              className='normal-case text-xl'
              value={project.name}
              onChange={(updatedContent) => {
                setProject({ ...project, name: updatedContent })
                updateProjectName(updatedContent)
              }}
            />
          </div>
        </div>
        <div className='navbar-center text-center'>
          <div className='flex flex-row justify-center '>{project.id}</div>
        </div>
        <div className='md:navbar-end z-10 max-sm:pt-4'></div>
      </div>
      <hr></hr>
      <TableView
        project_id={params.project_id || ''}
        project_results={projectResults}
        token={token}
      />
    </main>
  )
}

export default ProjectView