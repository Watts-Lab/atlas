import { useCallback, useEffect, useRef, useState } from 'react'
import { addFeature, fetchFeatures } from './feature.service'
import { Feature, NewFeature } from './feature.types'
import GridTable from './GridTable'
import { useParams } from 'react-router-dom'
import Contenteditable from '../../../pages/ProjectView/Contenteditable'
import { debounce } from 'lodash'
import api from '../../../service/api'
import { toast } from 'sonner'

type ProjectDetails = {
  name: string
  id: string
  created_at: string
  updated_at: string
}

type Params = {
  project_id?: string
}

const Project: React.FC = () => {
  const params: Params = useParams()

  const [loading, setLoading] = useState<boolean>(false)

  const [projectResults, setProjectResults] = useState<Record<string, unknown>[]>([])
  const [project, setProject] = useState<ProjectDetails>({
    name: '',
    id: '',
    created_at: '',
    updated_at: '',
  })

  const [availableFeatures, setAvailableFeatures] = useState<Feature[]>([])

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
        const response = await api.put(
          `/projects`,
          { project_name: updatedName },
          {
            params: { project_id: params.project_id },
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          },
        )

        const response_data = response.data

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
    const fetchResults = async () => {
      setLoading(true)
      const token = localStorage.getItem('token') || ''
      if (!token) {
        return
      }
      try {
        const response = await api.get('/projects/results', {
          params: { project_id: params.project_id },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        const response_data = response.data
        console.log('projectResults:', response_data.results)
        setProjectResults(response_data.results)
      } catch (error) {
        console.error('Error:', error)
        return null
      } finally {
        setLoading(false)
      }
    }
    fetchResults()
  }, [params.project_id])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const token = localStorage.getItem('token') || ''
      if (!token) {
        return
      }
      try {
        const response = await api.get('/projects', {
          params: { project_id: params.project_id },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        const response_data = response.data

        setProject({
          name: response_data.project.title,
          id: response_data.project.id,
          created_at: response_data.project.created_at,
          updated_at: response_data.project.updated_at,
        })
      } catch (error) {
        console.error('Error:', error)
        return null
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [params.project_id])

  useEffect(() => {
    const loadFeatures = async () => {
      try {
        const allFeatures = await fetchFeatures()

        const response = await api.get(`/projects/features`, {
          params: { project_id: params.project_id },
        })
        const projectFeatures: Feature[] = response.data.features

        const featuresWithSelection = allFeatures.map((feature) => {
          const isSelected = projectFeatures.some((pf) => pf.id === feature.id)
          return { ...feature, selected: isSelected }
        })

        setAvailableFeatures(featuresWithSelection)
      } catch (error) {
        console.error('Error fetching features:', error)
      }
    }

    loadFeatures()
  }, [params.project_id])

  const addNewFeatureHandler = async (newFeatureData: NewFeature) => {
    try {
      const addedFeature = await addFeature(newFeatureData)
      setAvailableFeatures((prevFeatures) => [...prevFeatures, addedFeature])
    } catch (error) {
      console.error('Error adding feature:', error)
    }
  }

  const updateProjectFeatures = async () => {
    const projectId = params.project_id
    const selectedFeatures = availableFeatures.filter((feature) => feature.selected)

    const response = await api.post('/projects/features', {
      project_id: projectId,
      feature_ids: selectedFeatures.map((feature) => feature.id),
    })

    if (response.status === 200) {
      toast.success('Project features updated successfully')
      console.log('Features updated successfully')
    } else {
      toast.error('Error updating features')
      console.error('Error updating features')
    }
  }

  return (
    <main className={`${loading ? 'blur-sm' : ''}`}>
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

      <GridTable
        data={projectResults}
        availableFeatures={availableFeatures}
        setAvailableFeatures={setAvailableFeatures}
        addNewFeature={addNewFeatureHandler}
        updateProjectFeatures={updateProjectFeatures}
      />
    </main>
  )
}

export default Project
