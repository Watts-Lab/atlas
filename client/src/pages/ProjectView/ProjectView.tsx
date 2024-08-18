import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL } from '../../service/api'
import Header from '../../components/Builder/Header'

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

  const [project, setProject] = useState<ProjectDetails>({
    name: '',
    id: '',
    created_at: '',
    updated_at: '',
  })

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
        console.log(response_data)
        setProject({
          name: response_data.project.title,
          id: response_data.project.id,
          created_at: response_data.project.created_at,
          updated_at: response_data.project.updated_at,
        })
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
      <Header fileName={project.name} />
      <div className='navbar bg-base-100 flex flex-col sm:flex-row'>
        <div className='navbar-start z-10 md:pl-5'>
          <div className='flex-none'>
            <div
              className='normal-case text-xl'
              contentEditable='true'
              onBlur={(e) => {
                e.preventDefault()
                setProject({ ...project, name: e.currentTarget.textContent || '' })
              }}
            >
              {project.name}
            </div>
          </div>
        </div>
        <div className='navbar-center text-center'>
          <div className='flex flex-row justify-center '>{project.id}</div>
        </div>
        <div className='md:navbar-end z-10 max-sm:pt-4'>
          <button className='btn btn-sm btn-ghost border border-teal-100'>Browse file</button>
          <input type='file' style={{ display: 'none' }} accept='application/pdf' multiple />
          <button className='btn btn-sm btn-ghost badge badge-xs badge-primary'>Export .csv</button>
        </div>
      </div>
    </main>
  )
}

export default ProjectView
