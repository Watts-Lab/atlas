import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchFeatures } from './feature.service'
import { Feature } from './feature.types'
import GridTable from './GridTable'
import { useParams } from 'react-router-dom'
import Contenteditable from '../../../pages/ProjectView/Contenteditable'
import { debounce } from 'lodash'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FolderDown, Loader2 } from 'lucide-react'
import { MultiSelect } from '@/components/ui/multi-select'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { usePapaParse } from 'react-papaparse'
import { flattenObject } from '../TableView/hooks/data-handler'
import { useSocket } from '@/context/Socket/useSocket'
import api from '@/service/api'

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
  const { socket } = useSocket()

  const [loading, setLoading] = useState<boolean>(false)
  const [projectResults, setProjectResults] = useState<Record<string, unknown>[]>([
    {
      paper: '...',
    },
  ])
  const [project, setProject] = useState<ProjectDetails>({
    name: '',
    id: '',
    created_at: '',
    updated_at: '',
  })
  const [availableFeatures, setAvailableFeatures] = useState<Feature[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_tasksMapping, setTasksMapping] = useState<Record<string, string>>({})

  const abortControllerRef = useRef<AbortController | null>(null)

  const updateProjectName = useCallback(
    debounce(async (updatedName: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort() // Cancel the previous fetch call
      }
      const controller = new AbortController()
      abortControllerRef.current = controller
      try {
        const response = await api.put(
          `/v1/projects/${params.project_id}`,
          { project_name: updatedName },
          {
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
      try {
        const response = await api.get(`/v1/projects/${params.project_id}/results`)
        const response_data = response.data
        setProjectResults(
          response_data.results.map((result: Record<string, unknown>, id: number) => ({
            id,
            ...result,
          })),
        )
      } catch (error) {
        console.error('Error:', error)
        return null
      } finally {
        setLoading(false)
      }
    }
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
  }, [params.project_id, socket])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await api.get(`/v1/projects/${params.project_id}`)
        setProject({
          name: response.data.project.title,
          id: response.data.project.id,
          created_at: response.data.project.created_at,
          updated_at: response.data.project.updated_at,
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
        const response = await api.get(`/projects/${params.project_id}/features`)
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

  const updateProjectFeatures = async () => {
    const projectId = params.project_id
    const selectedFeatures = availableFeatures.filter((feature) => feature.selected)

    await api
      .post(`/projects/${params.project_id}/features`, {
        project_id: projectId,
        feature_ids: selectedFeatures.map((feature) => feature.id),
      })
      .then((response) => {
        if (response.status === 201) {
          toast.success('Project features updated successfully')
        } else {
          toast.error('Error updating features')
        }
      })
  }

  const [selectableHeaders, setSelectableHeaders] = useState<string[]>([])

  useEffect(() => {
    const notIncluded = ['id', 'paper']
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

  const { jsonToCSV } = usePapaParse()

  const handleJsonToCSV = () => {
    const data = flattenObject(projectResults)
    if (!data.length) return

    console.log('Selected columns:', selectedFrameworks)
    console.log('Available headers:', selectableHeaders)
    const finalCols = selectableHeaders.reduce((acc, col) => {
      acc.push(col)
      if (selectedFrameworks.includes(col)) acc.push(`${col}_truth`)
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
  }

  // State and handlers for reading user’s CSV
  const [truthFile, setTruthFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) {
      setTruthFile(null)
      return
    }
    setTruthFile(e.target.files[0])
  }

  const [open, setOpen] = useState(false)
  const [loadingAccuracy, setLoadingAccuracy] = useState<boolean>(false)
  const [accuracyScores, setAccuracyScores] = useState<Record<string, number> | null>(null)

  const handleLoadCSV = async () => {
    if (!truthFile) return
    setLoadingAccuracy(true)
    const formData = new FormData()
    formData.append('file', truthFile)
    try {
      const response = await api.post(`/v1/projects/${params.project_id}/score_csv`)
      if (response.status === 200) {
        const scores = response.data.aggregate_scores
        const formattedScores: Record<string, number> = {}
        Object.entries(scores).forEach(([key, value]) => {
          formattedScores[key.split('.').join(' ')] = value as number
        })
        setAccuracyScores(formattedScores)
        toast.success('CSV loaded successfully')
        setOpen(false)
      } else {
        toast.error('Error loading CSV')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error scoring the CSV.')
    } finally {
      setLoadingAccuracy(false)
    }
  }

  const handleBackend = async (files: FileList) => {
    if (params.project_id === undefined) return

    const data = new FormData()
    for (const file of files) {
      data.append('files[]', file, file.name)
    }
    data.append('sid', socket?.id || '')
    data.append('project_id', params.project_id)

    try {
      toast.loading('Uploading files...')
      const response = await api.post(`/add_paper`, data)
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
              // Update the toast message with the number of remaining tasks:
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
        })
      } else {
        toast.error('Error uploading file')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }
  const handleUploadFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      handleBackend(files)
    }
  }

  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([])

  return (
    <main className={`${loading ? 'blur-sm' : ''}`}>
      <header className='bg-gray-50 rounded-md shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-y-4 sm:gap-y-0 p-4'>
        <div className='w-full sm:w-auto'>
          <Contenteditable
            className='w-full sm:w-60 text-xl font-semibold text-gray-800'
            value={project.name}
            onChange={(updatedContent) => {
              setProject({ ...project, name: updatedContent })
              updateProjectName(updatedContent)
            }}
          />
        </div>

        <div className='text-center text-gray-600 font-medium flex-1'>{project.id}</div>

        <div className='flex flex-wrap justify-end items-center space-x-2 w-full sm:w-auto'>
          <Button onClick={handleButtonClick}>Upload file</Button>
          <input
            type='file'
            ref={fileInputRef}
            onChange={handleUploadFileChange}
            accept='application/pdf'
            multiple
            className='hidden'
          />

          <Dialog open={open} onOpenChange={setOpen} modal={false}>
            <DialogTrigger asChild>
              <Button>
                <FolderDown className='inline-block mr-1' />
                Load truth
              </Button>
            </DialogTrigger>
            <DialogContent className='max-w-lg'>
              <DialogHeader>
                <DialogTitle>Create truth input</DialogTitle>
                <DialogDescription>
                  Select the columns you want to input a ground truth for and then export the CSV
                  file. After editing, upload your modified ground truth to obtain an accuracy score
                  on your features.
                </DialogDescription>
              </DialogHeader>
              <MultiSelect
                modalPopover={false}
                options={selectableHeaders.map((feature) => ({
                  label: feature.replace(/\s/g, ' → ').toLowerCase(),
                  value: feature,
                }))}
                onValueChange={setSelectedFrameworks}
                defaultValue={selectedFrameworks}
                placeholder='Select columns'
                variant='inverted'
                maxCount={3}
              />
              <DialogDescription>
                Choose the columns/features you are interested in.
              </DialogDescription>
              <DialogFooter>
                <Button type='submit' onClick={handleJsonToCSV}>
                  Export CSV Base Template
                </Button>
              </DialogFooter>
              <Separator className='my-4' />
              <div className='space-y-2'>
                <div className='font-semibold'>Import Ground Truth</div>
                <p className='text-sm text-gray-500'>
                  Upload your modified ground truth CSV to score your features.
                </p>
                <Input type='file' accept='.csv' onChange={handleFileChange} />
                <DialogFooter>
                  <Button type='submit' onClick={handleLoadCSV} disabled={loadingAccuracy}>
                    {loadingAccuracy && <Loader2 className='animate-spin mr-2' />}
                    Load CSV Ground Truth
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <GridTable
        projectId={params.project_id ?? ''}
        data={projectResults}
        availableFeatures={availableFeatures}
        accuracyScores={accuracyScores}
        setAvailableFeatures={setAvailableFeatures}
        updateProjectFeatures={updateProjectFeatures}
      />
    </main>
  )
}

export default Project
