import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchFeatures } from './feature.service'
import { Feature, NewFeature } from './feature.types'
import GridTable from './GridTable'
import { useParams } from 'react-router-dom'
import { debounce } from 'lodash'
import { toast } from 'sonner'
import { usePapaParse } from 'react-papaparse'
import { flattenObject } from '../TableView/hooks/data-handler'
import { useSocket } from '@/context/Socket/useSocket'
import api from '@/service/api'
import ProjectHeader from './ProjectHeader'
import SelectFeatures from './SelectFeatures'

type ProjectDetails = {
  id: string
  name: string
  description: string
  prompt: string
  created_at: string
  updated_at: string
}

type Params = {
  project_id?: string
}

type ProjectStats = {
  papersProcessed: number
  featuresExtracted: number
  lastUpdated: string
}

const Project: React.FC = () => {
  const params: Params = useParams()
  const { socket } = useSocket()
  const { jsonToCSV } = usePapaParse()

  // State management
  const [loading, setLoading] = useState<boolean>(false)
  const [projectResults, setProjectResults] = useState<Record<string, unknown>[]>([
    { paper: '...' },
  ])
  const [resultIds, setResultIds] = useState<string[]>([])

  const [project, setProject] = useState<ProjectDetails>({
    id: '',
    name: '',
    description: '',
    prompt: '',
    created_at: '',
    updated_at: '',
  })
  const [projectStats, setProjectStats] = useState<ProjectStats>({
    papersProcessed: 0,
    featuresExtracted: 0,
    lastUpdated: '',
  })
  const [availableFeatures, setAvailableFeatures] = useState<Feature[]>([])
  const [selectableHeaders, setSelectableHeaders] = useState<string[]>([])

  const [loadingAccuracy, setLoadingAccuracy] = useState<boolean>(false)
  const [accuracyScores, setAccuracyScores] = useState<Record<string, number> | null>(null)
  const [showVersions, setShowVersions] = useState<boolean>(false)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_tasksMapping, setTasksMapping] = useState<Record<string, string>>({})
  type FeatureModalState = { open: boolean; initialTab: 'select' | 'define' }
  const [featureModal, setFeatureModal] = useState<FeatureModalState>({
    open: false,
    initialTab: 'select',
  })

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const defaultPrompt = `You are a research assistant for a team of scientists tasked with research cartography. You are given a PDF of the paper and are asked to provide a summary of the key findings. Your response should be in JSON format. Just provide the JSON response without any additional text. Do not include \`\`\`json or any other formatting.`

  // Project update functions
  const updateProject = useCallback(
    debounce(async (updatedProject: Partial<ProjectDetails>) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const response = await api.put(
          `/v1/projects/${params.project_id}`,
          {
            project_name: updatedProject.name,
            project_description: updatedProject.description,
            project_prompt: updatedProject.prompt,
          },
          { signal: controller.signal },
        )

        const responseData = response.data
        setProject((prev) => ({
          ...prev,
          ...responseData.project,
          name: responseData.project.title,
          prompt: responseData.project.prompt || prev.prompt,
        }))

        toast.success('Project updated successfully')
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error updating project:', error)
          toast.error('Failed to update project')
        }
      }
    }, 1000),
    [params.project_id],
  )

  const updateProjectPrompt = async (newPrompt: string) => {
    try {
      const response = await api.put(`/v1/projects/${params.project_id}`, {
        project_name: project.name,
        project_prompt: newPrompt,
      })

      if (response.status === 200) {
        setProject((prev) => ({
          ...prev,
          prompt: response.data.project.prompt,
        }))
        toast.success('Prompt updated successfully')
      }
    } catch (error) {
      console.error('Error updating prompt:', error)
      toast.error('Failed to update prompt')
      throw error
    }
  }

  const updateProjectFeatures = async () => {
    const selectedFeatures = availableFeatures.filter((feature) => feature.selected)

    try {
      const response = await api.post(`/projects/${params.project_id}/features`, {
        project_id: params.project_id,
        feature_ids: selectedFeatures.map((feature) => feature.id),
      })

      if (response.status === 201) {
        toast.success('Project features updated successfully')
        setProjectStats((prev) => ({
          ...prev,
          featuresExtracted: selectedFeatures.length,
        }))
      } else {
        toast.error('Error updating features')
      }
    } catch (error) {
      console.error('Error updating features:', error)
      toast.error('Failed to update features')
    }
  }

  // File handling
  const handleFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleUploadFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && params.project_id) {
      await handleBackend(files)
    }
  }

  const handleBackend = async (files: FileList) => {
    if (!params.project_id) return

    const data = new FormData()
    for (const file of files) {
      data.append('files[]', file, file.name)
    }
    data.append('sid', socket?.id || '')
    data.append('project_id', params.project_id)
    data.append('strategy_type', 'json_schema') // 'json_schema' or 'assistant_api' for backend processing

    try {
      toast.loading('Uploading files...')
      const response = await api.post('/add_paper', data)

      if (response.status === 200) {
        toast.dismiss()
        toast.success('Files uploaded successfully!')
        setTasksMapping(response.data)

        const taskIds = Object.values(response.data)
        const toastId = toast.loading(`Processing ${taskIds.length} tasks...`)

        const waitForTasksCompletion = new Promise<void>((resolve) => {
          const pendingTasks = new Set(taskIds)

          const handleStatusUpdate = (data: {
            status: string
            progress: number
            task_id: string
            done: boolean
          }) => {
            if (pendingTasks.has(data.task_id) && data.done) {
              pendingTasks.delete(data.task_id)
              toast.dismiss(toastId)
              toast(`Processing ${pendingTasks.size} tasks...`)
            }
            if (pendingTasks.size === 0) {
              socket?.off('status', handleStatusUpdate)
              resolve()
            }
          }

          socket?.on('status', handleStatusUpdate)
        })

        waitForTasksCompletion.then(() => {
          toast.dismiss(toastId)
          toast.success('All files processed!', {
            dismissible: true,
            duration: 5000,
          })
          setProjectStats((prev) => ({
            ...prev,
            papersProcessed: prev.papersProcessed + files.length,
          }))
        })
      } else {
        toast.error('Error uploading file')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload files')
    }
  }

  // CSV handling
  const handleExportCSV = (selectedColumns: string[]) => {
    const data = flattenObject(projectResults)
    if (!data.length) return

    const finalCols = selectableHeaders.reduce((acc, col) => {
      acc.push(col)
      if (selectedColumns.includes(col)) acc.push(`${col}_truth`)
      return acc
    }, [] as string[])

    const finalData = data.map((row) =>
      finalCols.reduce(
        (acc, col) => {
          acc[col] = row[col] ?? (col.endsWith('_truth') ? 'FILL_IN' : 'NaN')
          return acc
        },
        {} as Record<string, unknown>,
      ),
    )

    const csvString = jsonToCSV(finalData)
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'truth_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleLoadTruth = async (file: File) => {
    setLoadingAccuracy(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      // Start the task
      const response = await api.post(`/v1/projects/${params.project_id}/score_csv`, formData)

      if (response.status === 200) {
        const { task_id } = response.data
        toast.success('Processing started... Please wait')

        // Poll for results with timeout
        const pollForResult = async (attempts = 0, maxAttempts = 60): Promise<void> => {
          if (attempts >= maxAttempts) {
            toast.error('Processing timeout - please try again')
            setLoadingAccuracy(false)
            return
          }

          try {
            const resultResponse = await api.get(
              `/v1/projects/${params.project_id}/score_csv?task_id=${task_id}`,
            )

            if (resultResponse.status === 200) {
              const { status, result } = resultResponse.data

              switch (status) {
                case 'SUCCESS':
                  if (result?.status === 'success') {
                    // Process successful result
                    const scores = result.aggregate_scores
                    const formattedScores: Record<string, number> = {}

                    Object.entries(scores).forEach(([key, value]) => {
                      formattedScores[key.split('.').join(' ')] = value as number
                    })

                    setAccuracyScores(formattedScores)
                    toast.success('Ground truth loaded successfully')
                  } else {
                    // Task completed but with error
                    toast.error(result?.message || 'Error processing ground truth')
                  }
                  setLoadingAccuracy(false)
                  return

                case 'FAILURE':
                  toast.error(result?.message || 'Failed to process ground truth')
                  setLoadingAccuracy(false)
                  return

                case 'PENDING':
                case 'STARTED':
                  // Update progress message if needed
                  if (attempts % 5 === 0 && attempts > 0) {
                    toast.info(`Still processing... (${attempts * 2}s elapsed)`)
                  }
                  // Continue polling
                  setTimeout(() => pollForResult(attempts + 1, maxAttempts), 2000)
                  break

                default:
                  // Unknown status, continue polling but with warning
                  console.warn('Unknown task status:', status)
                  setTimeout(() => pollForResult(attempts + 1, maxAttempts), 2000)
                  break
              }
            } else {
              throw new Error(`HTTP ${resultResponse.status}: Failed to get task status`)
            }
          } catch (pollError) {
            console.error('Error polling for result:', pollError)

            // Retry a few times on polling errors
            if (attempts < 3) {
              setTimeout(() => pollForResult(attempts + 1, maxAttempts), 3000)
            } else {
              toast.error('Error checking processing status')
              setLoadingAccuracy(false)
            }
          }
        }

        // Start polling after initial delay
        setTimeout(() => pollForResult(), 1000)
      } else {
        toast.error('Error starting ground truth processing')
        setLoadingAccuracy(false)
      }
    } catch (error) {
      console.error('Error loading ground truth:', error)
      toast.error('Failed to start ground truth processing')
      setLoadingAccuracy(false)
    }
  }

  const handleAddNewFeature = async (newFeatureData: NewFeature) => {
    try {
      const resp = await api.post('/features', newFeatureData)
      if (resp.status !== 201) throw new Error('Failed to create feature')

      const f = resp.data.feature
      const newFeature: Feature = {
        id: f.id,
        feature_identifier: f.feature_identifier,
        feature_identifier_spaced: f.feature_identifier.replace(/\./g, ' '),
        feature_name: f.feature_name,
        feature_description: f.feature_description,
        selected: true,
        trail: newFeatureData.feature_parent
          ? `${newFeatureData.feature_parent} → ${newFeatureData.feature_name}`
          : newFeatureData.feature_name,
        created_by: 'user',
        feature_type: newFeatureData.feature_type,
        feature_prompt: newFeatureData.feature_prompt || '',
        feature_enum_options: newFeatureData.enum_options || [],
        is_shared: newFeatureData.is_shared,
      }
      setAvailableFeatures((prev) => [...prev, newFeature])

      // if it's not a parent, also attach to the project immediately:
      if (newFeatureData.feature_type !== 'parent') {
        await api.post(`/projects/${params.project_id}/features`, {
          project_id: params.project_id,
          feature_ids: [...availableFeatures.filter((f) => f.selected).map((f) => f.id), f.id],
        })
        toast.success('Feature created & added to project!')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error creating feature')
      throw err
    }
  }

  const deletePapers = async (paperIds: string[]) => {
    if (!params.project_id || paperIds.length === 0) return

    try {
      const resultIdsToDelete = paperIds.map((id) => resultIds[parseInt(id)])

      const response = await api.delete(`/v1/projects/${params.project_id}/results`, {
        data: {
          result_ids: resultIdsToDelete,
        },
      })

      if (response.status === 200) {
        toast.success(`${paperIds.length} papers deleted successfully`)

        setProjectResults((prev) => prev.filter((_, index) => !paperIds.includes(String(index))))

        setProjectStats((prev) => ({
          ...prev,
          papersProcessed: prev.papersProcessed - paperIds.length,
        }))
      } else {
        toast.error('Failed to delete papers')
      }
    } catch (error) {
      console.error('Error deleting papers:', error)
      toast.error('Failed to delete papers')
      throw error
    }
  }

  // Data fetching effects
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true)
      try {
        const url = showVersions
          ? `/v1/projects/${params.project_id}/results?include_versions=true`
          : `/v1/projects/${params.project_id}/results`

        const response = await api.get(url)
        const responseData = response.data
        const results = responseData.results.map((result: Record<string, unknown>, id: number) => ({
          id,
          ...result,
        }))
        setProjectResults(results)
        setResultIds(responseData.ids || [])
        setProjectStats((prev) => ({
          ...prev,
          papersProcessed: showVersions
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              results.filter((r: any) => r._is_latest !== false).length
            : results.length,
        }))
      } catch (error) {
        console.error('Error fetching results:', error)
      } finally {
        setLoading(false)
      }
    }

    if (params.project_id) {
      fetchResults()

      const handleStatusUpdate = (data: { done: boolean }) => {
        if (data.done) {
          fetchResults()
        }
      }

      socket?.on('status', handleStatusUpdate)
      return () => {
        socket?.off('status', handleStatusUpdate)
      }
    }
  }, [params.project_id, socket, showVersions])

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!params.project_id) return

      setLoading(true)
      try {
        const response = await api.get(`/v1/projects/${params.project_id}`)
        const projectData = response.data.project

        setProject({
          id: projectData.id,
          name: projectData.title,
          description: projectData.description || '',
          prompt: projectData.prompt || defaultPrompt,
          created_at: projectData.created_at,
          updated_at: projectData.updated_at,
        })

        setProjectStats((prev) => ({
          ...prev,
          lastUpdated: new Date(projectData.updated_at).toLocaleDateString(),
        }))
      } catch (error) {
        console.error('Error fetching project:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjectData()
  }, [params.project_id])

  useEffect(() => {
    const fetchProjectScores = async () => {
      if (!params.project_id) return
      try {
        const response = await api.get(`/v1/projects/${params.project_id}/ground_truth`)
        const projectData = response.data.feature_scores

        const formattedScores: Record<string, number> = {}

        projectData.map((score: { feature_identifier: string; feature_score: number }) => {
          formattedScores[score.feature_identifier.split('.').join(' ')] = score.feature_score
        })

        setAccuracyScores(formattedScores)
      } catch (error) {
        console.error('Error fetching project:', error)
      }
    }

    fetchProjectScores()
  }, [params.project_id])

  useEffect(() => {
    const loadFeatures = async () => {
      if (!params.project_id) return

      try {
        // Fetch all features relevant to the project in one request
        const allFeatures = await fetchFeatures(params.project_id)

        // Fetch features currently assigned to the project
        const projectFeaturesResponse = await api.get(`/projects/${params.project_id}/features`)
        const projectFeatures: Feature[] = projectFeaturesResponse.data.features

        // Mark selected features
        const featuresWithSelection = allFeatures.map((feature) => ({
          ...feature,
          selected: projectFeatures.some((pf) => pf.id === feature.id),
        }))

        setAvailableFeatures(featuresWithSelection)
        setProjectStats((prev) => ({
          ...prev,
          featuresExtracted: projectFeatures.length,
        }))
      } catch (error) {
        console.error('Error fetching features:', error)
      }
    }

    loadFeatures()
  }, [params.project_id])

  // Update selectable headers when project results change
  useEffect(() => {
    const notIncluded = [
      'id',
      'paper',
      'created_at',
      'updated_at',
      '_version',
      '_is_latest',
      '_result_id',
      '_paper_id',
    ]
    const allKeys = new Set<string>()

    flattenObject(projectResults).forEach((obj) => {
      Object.keys(obj).forEach((key) => {
        if (!notIncluded.includes(key)) {
          allKeys.add(key)
        }
      })
    })

    setSelectableHeaders(Array.from(allKeys))
  }, [projectResults])

  const handleToggleVersions = () => {
    setShowVersions((prev) => !prev)
  }

  const [bulkReprocessing, setBulkReprocessing] = useState<boolean>(false)

  const reprocessPaper = async (paperId: string) => {
    if (!params.project_id || !paperId) return

    try {
      const response = await api.post(`/reprocess_paper/${paperId}`, {
        project_id: params.project_id,
        strategy_type: 'json_schema',
        sid: socket?.id || '',
      })

      if (response.status === 200) {
        toast.success('Paper queued for reprocessing')

        const taskId = response.data.task_id
        const toastId = toast.loading('Reprocessing paper...')

        const handleReprocessComplete = (data: {
          task_id: string
          done: boolean
          status?: string
          message?: string
          progress?: number
        }) => {
          // Check if this is the task we're waiting for
          if (data.task_id === taskId) {
            // Update progress if available
            if (data.progress !== undefined && data.progress < 100 && !data.done) {
              toast.loading(`Reprocessing paper... ${data.progress}%`, {
                id: toastId, // Use the same toast ID
              })
            }

            // Handle completion
            if (data.done) {
              toast.dismiss(toastId)

              // Check status
              if (data.status === 'FAILURE' || data.message?.includes('failed')) {
                toast.error('Paper reprocessing failed')
              } else {
                toast.success('Paper reprocessed successfully!')
              }

              // Clean up listener
              socket?.off('status', handleReprocessComplete)

              // Refresh the data properly instead of reload
              const fetchResults = async () => {
                try {
                  const url = showVersions
                    ? `/v1/projects/${params.project_id}/results?include_versions=true`
                    : `/v1/projects/${params.project_id}/results`

                  const response = await api.get(url)
                  const responseData = response.data
                  const results = responseData.results.map(
                    (result: Record<string, unknown>, id: number) => ({
                      id,
                      ...result,
                    }),
                  )
                  setProjectResults(results)
                  setResultIds(responseData.ids || [])
                } catch (error) {
                  console.error('Error fetching results:', error)
                }
              }

              fetchResults()
            }
          }
        }

        socket?.on('status', handleReprocessComplete)

        // Cleanup timeout - also dismiss the toast
        const timeoutId = setTimeout(() => {
          socket?.off('status', handleReprocessComplete)
          toast.dismiss(toastId)
          toast.error('Reprocessing timed out')
        }, 120000) // 2 minutes timeout

        // Store cleanup function in case component unmounts
        return () => {
          clearTimeout(timeoutId)
          socket?.off('status', handleReprocessComplete)
          toast.dismiss(toastId)
        }
      }
    } catch (error) {
      console.error('Error reprocessing paper:', error)
      toast.error('Failed to reprocess paper')
    }
  }

  const reprocessAllPapers = async () => {
    if (!params.project_id) return

    setBulkReprocessing(true)

    try {
      const response = await api.post(`/reprocess_project/${params.project_id}`, {
        strategy_type: 'json_schema',
        sid: socket?.id || '',
      })

      if (response.status === 200) {
        const { task_ids, total_papers } = response.data
        const taskIdsList = Object.values(task_ids) as string[]

        toast.success(`Started reprocessing ${total_papers} papers`)

        let toastId = toast.loading(`Reprocessing ${total_papers} papers...`)
        const completedTasks = new Set<string>()

        const handleBulkReprocessComplete = (data: {
          task_id: string
          done: boolean
          status?: string
          message?: string
          progress?: number
        }) => {
          // Only handle tasks from our bulk operation
          if (taskIdsList.includes(data.task_id)) {
            // Handle task completion
            if (data.done) {
              completedTasks.add(data.task_id)

              const remaining = total_papers - completedTasks.size

              // Update progress
              if (remaining > 0) {
                toast.dismiss(toastId)
                toastId = toast.loading(`Reprocessing ${remaining}/${total_papers} papers...`)
              } else {
                // All tasks completed
                toast.dismiss(toastId)
                toast.success('All papers reprocessed successfully!', {
                  duration: 5000,
                })

                // Clean up
                socket?.off('status', handleBulkReprocessComplete)
                setBulkReprocessing(false)

                // Refresh data
                setTimeout(() => {
                  window.location.reload() // Or call your data refresh function
                }, 1000)
              }
            }
          }
        }

        socket?.on('status', handleBulkReprocessComplete)

        // Cleanup timeout
        setTimeout(() => {
          socket?.off('status', handleBulkReprocessComplete)
          toast.dismiss(toastId)
          toast.error('Bulk reprocessing timed out')
          setBulkReprocessing(false)
        }, 600000) // 10 minutes timeout for bulk operations
      }
    } catch (error) {
      console.error('Error reprocessing all papers:', error)
      toast.error('Failed to start bulk reprocessing')
      setBulkReprocessing(false)
    }
  }

  return (
    <main className={`min-h-screen ${loading ? 'opacity-50' : ''}`}>
      <ProjectHeader
        project={project}
        projectStats={projectStats}
        availableFeatures={availableFeatures}
        selectableHeaders={selectableHeaders}
        onUpdateProject={updateProject}
        onUpdatePrompt={updateProjectPrompt}
        onUpdateFeatures={updateProjectFeatures}
        onFileUpload={handleFileUpload}
        onExportCSV={handleExportCSV}
        onLoadTruth={handleLoadTruth}
        isLoading={loading}
        loadingAccuracy={loadingAccuracy}
        setAvailableFeatures={setAvailableFeatures}
        featureModal={featureModal}
        setFeatureModal={setFeatureModal}
        onAddFeature={handleAddNewFeature}
        onReprocessAll={reprocessAllPapers}
        bulkReprocessing={bulkReprocessing}
      />

      <input
        type='file'
        ref={fileInputRef}
        onChange={handleUploadFileChange}
        accept='application/pdf'
        multiple
        className='hidden'
      />

      <GridTable
        data={projectResults}
        availableFeatures={availableFeatures}
        accuracyScores={accuracyScores}
        onDeletePapers={deletePapers}
        showVersions={showVersions}
        onToggleVersions={handleToggleVersions}
        reprocessPaper={reprocessPaper}
      />

      <SelectFeatures
        isFeatureModalOpen={featureModal.open}
        setIsFeatureModalOpen={(open) => setFeatureModal((m) => ({ ...m, open: Boolean(open) }))}
        initialTab={featureModal.initialTab}
        availableFeatures={availableFeatures}
        setAvailableFeatures={setAvailableFeatures}
        updateProjectFeatures={updateProjectFeatures}
        addNewFeature={handleAddNewFeature}
      />
    </main>
  )
}

export default Project
