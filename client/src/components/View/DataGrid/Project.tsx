import { useCallback, useEffect, useRef, useState } from 'react'
import { addFeature, fetchFeatures } from './feature.service'
import { Feature, NewFeature } from './feature.types'
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { usePapaParse } from 'react-papaparse'
import { flattenObject } from '../TableView/hooks/data-handler'
import { useSocket } from '@/context/Socket/UseSocket'
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

  const form = useForm()
  const [selectableHeaders, setSelectableHeaders] = useState<string[]>([])

  useEffect(() => {
    const allKeys = new Set<string>()
    flattenObject(projectResults).forEach((obj) => {
      Object.keys(obj).forEach((key) => allKeys.add(key))
    })
    setSelectableHeaders(Array.from(allKeys))
  }, [projectResults])

  const { jsonToCSV } = usePapaParse()

  const handleJsonToCSV = () => {
    const selectedColumns = form.watch('frameworks') || []
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
    data.append('model', 'gpt')
    data.append('project_id', params.project_id)
    data.append(
      'features',
      JSON.stringify([
        'experiments.name',
        'experiments.description',
        'experiments.participant_source',
        'experiments.participant_source_category',
        'experiments.units_randomized',
        'experiments.units_analyzed',
      ]),
    )

    try {
      const response = await api.post(`/add_paper`, data)
      if (response.status === 200) {
        toast.success('File uploaded successfully')
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
        <div className='md:navbar-end z-10 max-md:pt-4'>
          <Button onClick={handleButtonClick} className='mr-2'>
            Upload file
          </Button>
          <input
            type='file'
            ref={fileInputRef}
            onChange={handleUploadFileChange}
            style={{ display: 'none' }}
            accept='application/pdf'
            multiple
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <FolderDown />
                &nbsp;Load truth
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-[600px]'>
              <DialogHeader>
                <DialogTitle>Create truth input</DialogTitle>
                <DialogDescription>
                  Select the columns you want to input a ground truth for and then export the CSV
                  file. After editing, upload your modified ground truth to obtain an accuracy score
                  on your features.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(() => {})} className='space-y-8'>
                  <FormField
                    control={form.control}
                    name='frameworks'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Columns</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={selectableHeaders.map((feature) => ({
                              label: feature.replace(/\s/g, ' → ').toLowerCase(),
                              value: feature,
                            }))}
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            placeholder='Select columns'
                            variant='inverted'
                            maxCount={3}
                          />
                        </FormControl>
                        <FormDescription>
                          Choose the columns/features you are interested in.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type='submit' onClick={handleJsonToCSV}>
                      Export CSV Base Template
                    </Button>
                  </DialogFooter>
                </form>
              </Form>

              <Separator />

              <div className='space-y-2'>
                <div className='font-semibold'>Import Ground Truth</div>
                <p className='text-sm text-muted-foreground'>
                  Upload your modified ground truth CSV to score your features.
                </p>
                <Input type='file' accept='.csv' onChange={handleFileChange} />
                <DialogFooter>
                  <Button type='submit' onClick={handleLoadCSV} disabled={loadingAccuracy}>
                    {loadingAccuracy && <Loader2 className='animate-spin' />}
                    Load CSV Ground Truth
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <hr></hr>

      <GridTable
        data={projectResults}
        availableFeatures={availableFeatures}
        accuracyScores={accuracyScores}
        setAvailableFeatures={setAvailableFeatures}
        addNewFeature={addNewFeatureHandler}
        updateProjectFeatures={updateProjectFeatures}
      />
    </main>
  )
}

export default Project
