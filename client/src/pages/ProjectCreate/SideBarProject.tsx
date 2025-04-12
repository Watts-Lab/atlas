import { useState, ComponentProps, useCallback, useMemo } from 'react'
import { ArrowRight, CircleX, Rows2, Rows3, Rows4 } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import api from '../../service/api'
import { toast } from 'sonner'

// Hooks
import { useWorkflow } from '@/context/Workflow/useWorkflow'
import { Feature } from '@/components/View/DataGrid/feature.types'
import { useFeatures } from '@/components/View/DataGrid/feature.service'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useNavigate } from 'react-router-dom'

// Possible "compact modes"
type CompactMode = 'name-only' | 'name-trail' | 'name-description'

export function SidebarRight(props: ComponentProps<typeof Sidebar>) {
  const { features, loading } = useFeatures()
  const {
    selectedFeatureIds,
    setSelectedFeatureIds,
    addFeatureChain,
    removeFeature,
    resetWorkflow,
  } = useWorkflow()
  const navigate = useNavigate()

  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')

  const [compactMode, setCompactMode] = useState<CompactMode>('name-trail')

  const displayFeatures = useMemo(() => {
    return features.filter((f) => !f.feature_identifier.endsWith('.parent'))
  }, [features])

  const createNodeData = useCallback(
    (feat: Feature) => ({
      name: feat.feature_name,
      measurement: 'GPT-o1',
      prompt: feat.feature_description,
      maxLength: 60,
    }),
    [],
  )

  const handleCheckboxChange = useCallback(
    (featureId: string, checked: boolean) => {
      if (checked) {
        setSelectedFeatureIds((prev) => [...prev, featureId])
        addFeatureChain(featureId, features, createNodeData)
      } else {
        setSelectedFeatureIds((prev) => prev.filter((id) => id !== featureId))
        removeFeature(featureId)
      }
    },
    [addFeatureChain, removeFeature, setSelectedFeatureIds, features, createNodeData],
  )

  const renderFeatureContent = useCallback(
    (feature: Feature) => {
      switch (compactMode) {
        case 'name-only':
          return <p className='text-sm font-medium leading-none'>{feature.feature_name}</p>
        case 'name-trail':
          return (
            <>
              <p className='text-sm font-medium leading-none'>{feature.feature_name}</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className='text-sm text-muted-foreground cursor-help'>{feature.trail}</p>
                  </TooltipTrigger>
                  <TooltipContent className='max-w-sm'>
                    <p className='text-xs'>{feature.feature_description || 'No description'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )
        case 'name-description':
          return (
            <>
              <p className='text-sm font-medium leading-none'>{feature.feature_name}</p>
              <p className='text-xs text-justify text-secondary-foreground whitespace-normal'>
                {feature.feature_description}
              </p>
              <p className='text-sm text-muted-foreground'>{feature.trail}</p>
            </>
          )
        default:
          return <p className='text-sm font-medium leading-none'>{feature.feature_name}</p>
      }
    },
    [compactMode],
  )

  const handleCreateProject = useCallback(async () => {
    try {
      if (!projectName) {
        toast.error('Please enter a project name')
        return
      }
      const response = await api.post('/v1/projects', {
        project_name: projectName,
        project_description: projectDescription,
        project_features: selectedFeatureIds,
      })

      setProjectName('')
      setProjectDescription('')

      selectedFeatureIds.forEach((id) => removeFeature(id))
      setSelectedFeatureIds([])

      // reset workflow
      resetWorkflow()
      toast.success('Project created successfully')
      navigate(`/project/${response.data.project_id}`)
    } catch (error) {
      toast.error('Error creating project')
      console.error('Error creating project:', error)
    }
  }, [projectName, projectDescription, selectedFeatureIds])

  return (
    <Sidebar collapsible='none' className='sticky hidden lg:flex top-0 h-svh border-l' {...props}>
      <SidebarHeader className='border-b py-3 px-4'>
        <div className='text-left space-y-1'>
          <h2 className='text-base font-semibold'>New Project Wizard</h2>
          <p className='text-sm text-muted-foreground'>Set up your new project</p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className='p-4 space-y-3 border-b'>
          {/* Project Info */}
          <div>
            <Label htmlFor='projectname'>Project Name*</Label>
            <Input
              id='projectname'
              placeholder='New project'
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor='projectdescription'>Description</Label>
            <Input
              id='projectdescription'
              placeholder='Project description'
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
            />
          </div>
        </div>

        <ToggleGroup type='single'>
          <ToggleGroupItem
            onClick={() => setCompactMode('name-only')}
            value='name-only'
            aria-label="Toggle 'name-only'"
            title='Show only feature name'
          >
            <Rows4 size={2} />
          </ToggleGroupItem>
          <ToggleGroupItem
            onClick={() => setCompactMode('name-trail')}
            value='name-trail'
            aria-label="Toggle 'name-trail'"
            title='Show feature name and trail'
          >
            <Rows3 size={2} />
          </ToggleGroupItem>
          <ToggleGroupItem
            onClick={() => setCompactMode('name-description')}
            value='name-description'
            aria-label="Toggle 'name-description'"
            title='Show feature name, trail and description'
          >
            <Rows2 size={2} />
          </ToggleGroupItem>
          <Button variant='ghost' size='icon' title='reset' onClick={() => resetWorkflow()}>
            <CircleX />
          </Button>
        </ToggleGroup>

        <div className='px-4'>
          {loading && <p>Loading features...</p>}
          {!loading &&
            displayFeatures.map((feature) => {
              const isChecked = selectedFeatureIds.includes(feature.id)
              return (
                <div
                  key={feature.id}
                  className='flex items-start space-x-2 mb-2 cursor-pointer'
                  onClick={() => handleCheckboxChange(feature.id, !isChecked)}
                >
                  <Checkbox
                    id={feature.id}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleCheckboxChange(feature.id, !!checked)}
                    onClick={(e) => {
                      // prevent double toggle
                      e.stopPropagation()
                    }}
                  />
                  <div className='leading-snug'>{renderFeatureContent(feature)}</div>
                </div>
              )
            })}
        </div>
      </SidebarContent>

      <SidebarFooter className='border-t p-4'>
        <SidebarMenu>
          <SidebarMenuItem>
            <Button size='default' className='w-full' onClick={handleCreateProject}>
              Create Project
              <ArrowRight className='ml-auto size-4' />
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
