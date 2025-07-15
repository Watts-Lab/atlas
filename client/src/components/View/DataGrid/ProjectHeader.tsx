import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MultiSelect } from '@/components/ui/multi-select'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  Upload,
  FolderDown,
  FileText,
  Info,
  Save,
  X,
  ChevronDown,
  Plus,
  Layers,
  Loader2,
  Share2,
} from 'lucide-react'
import { Feature, NewFeature } from './feature.types'
import PromptEditorModal from './PromptEditorModal'
import { toast } from 'sonner'

type ProjectDetails = {
  id: string
  name: string
  description: string
  prompt: string
  created_at: string
  updated_at: string
}

type ProjectStats = {
  papersProcessed: number
  featuresExtracted: number
  lastUpdated: string
}

interface ProjectHeaderProps {
  project: ProjectDetails
  projectStats: ProjectStats
  availableFeatures: Feature[]
  selectableHeaders: string[]
  onUpdateProject: (project: Partial<ProjectDetails>) => void
  onUpdatePrompt: (prompt: string) => Promise<void>
  onUpdateFeatures: () => Promise<void>
  onFileUpload: () => void
  onExportCSV: (columns: string[]) => void
  onLoadTruth: (file: File) => Promise<void>
  isLoading: boolean
  loadingAccuracy: boolean
  setAvailableFeatures: React.Dispatch<React.SetStateAction<Feature[]>>
  featureModal: { open: boolean; initialTab: 'select' | 'define' }
  setFeatureModal: React.Dispatch<
    React.SetStateAction<{ open: boolean; initialTab: 'select' | 'define' }>
  >
  onAddFeature: (nf: NewFeature) => Promise<void>
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  projectStats,
  availableFeatures,
  selectableHeaders,
  onUpdateProject,
  onUpdatePrompt,
  onUpdateFeatures,
  onFileUpload,
  onExportCSV,
  onLoadTruth,
  isLoading,
  loadingAccuracy,
  setAvailableFeatures,
  setFeatureModal,
}) => {
  // Dialog open states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [manageFeaturesDialogOpen, setManageFeaturesDialogOpen] = useState(false)
  const [groundTruthDialogOpen, setGroundTruthDialogOpen] = useState(false)
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false)
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)

  // Local form state
  const [tempProject, setTempProject] = useState<ProjectDetails>(project)
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [truthFile, setTruthFile] = useState<File | null>(null)

  // Sync project → tempProject
  useEffect(() => {
    setTempProject(project)
  }, [project])

  // Handlers
  const handleSaveProjectDetails = useCallback(() => {
    onUpdateProject({
      name: tempProject.name,
      description: tempProject.description,
    })
    setEditDialogOpen(false)
  }, [tempProject, onUpdateProject])

  const handleCancelEdit = useCallback(() => {
    setTempProject(project)
    setEditDialogOpen(false)
  }, [project])

  const handleFeatureToggle = useCallback(
    (featureId: string) => {
      setAvailableFeatures((prev) =>
        prev.map((f) => (f.id === featureId ? { ...f, selected: !f.selected } : f)),
      )
    },
    [setAvailableFeatures],
  )

  const handleSaveFeatures = useCallback(async () => {
    await onUpdateFeatures()
    setManageFeaturesDialogOpen(false)
  }, [onUpdateFeatures])

  const handleExportGroundTruth = useCallback(() => {
    onExportCSV(selectedColumns)
  }, [selectedColumns, onExportCSV])

  const handleTruthFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setTruthFile(e.target.files[0])
    } else {
      setTruthFile(null)
    }
  }, [])

  const handleLoadTruthFile = useCallback(async () => {
    if (!truthFile) return
    await onLoadTruth(truthFile)
    setTruthFile(null)
  }, [truthFile, onLoadTruth])

  const handleCopyShareLink = useCallback(() => {
    const shareLink = `${window.location.origin}/projects/${project.id}`
    navigator.clipboard.writeText(shareLink)
    toast.success('Share link copied to clipboard!')
  }, [project.id])

  return (
    <div className='w-full border-b border-gray-200 bg-white shadow-sm'>
      {/* Top Menu */}
      <div className='bg-gray-50 border-b px-4 py-0.5'>
        <div className='flex items-center space-x-1'>
          {/* File */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='h-8 px-3 text-sm font-medium hover:bg-gray-100'
                disabled={isLoading}
              >
                File <ChevronDown className='w-3 h-3 ml-1' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='w-48'>
              <DropdownMenuItem onClick={onFileUpload}>
                <Upload className='w-4 h-4 mr-2' />
                Upload Papers
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setGroundTruthDialogOpen(true)}>
                <FolderDown className='w-4 h-4 mr-2' />
                Ground Truth
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Edit */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='h-8 px-3 text-sm font-medium hover:bg-gray-100'
                disabled={isLoading}
              >
                Edit <ChevronDown className='w-3 h-3 ml-1' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='w-48'>
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <FileText className='w-4 h-4 mr-2' />
                Project Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPromptDialogOpen(true)}>
                <Settings className='w-4 h-4 mr-2' />
                Assistant Prompt
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Features */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='h-8 px-3 text-sm font-medium hover:bg-gray-100'
                disabled={isLoading}
              >
                Features <ChevronDown className='w-3 h-3 ml-1' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='w-48'>
              <DropdownMenuItem
                onClick={() => setFeatureModal({ open: true, initialTab: 'select' })}
              >
                <Layers className='w-4 h-4 mr-2' /> Manage Features
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFeatureModal({ open: true, initialTab: 'define' })}
              >
                <Plus className='w-4 h-4 mr-2' /> Create New Feature
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='h-8 px-3 text-sm font-medium hover:bg-gray-100'
              >
                Help <ChevronDown className='w-3 h-3 ml-1' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='w-48'>
              <DropdownMenuItem onClick={() => setAboutDialogOpen(true)}>
                <Info className='w-4 h-4 mr-2' />
                About Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open('/docs', '_blank')}>
                <FileText className='w-4 h-4 mr-2' />
                Documentation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Project Info */}
      <div className='bg-white px-4 py-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <h1 className='text-xl font-semibold text-gray-900'>{project.name}</h1>
            {isLoading && <Loader2 className='w-4 h-4 animate-spin text-gray-500' />}
            <span className='text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono'>
              {project.id}
            </span>
          </div>
          <div className='flex items-center space-x-4 text-sm text-gray-600'>
            <span>Papers: {projectStats.papersProcessed}</span>
            <span>Features: {projectStats.featuresExtracted}</span>
            <span>Updated: {projectStats.lastUpdated}</span>
          </div>
        </div>
        {project.description && <p className='text-sm text-gray-600 mt-2'>{project.description}</p>}
      </div>

      {/* ————— Edit Project Dialog ————— */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Edit Project Details</DialogTitle>
            <DialogDescription>Update your project information and settings.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='proj-name'>Project Name</Label>
              <Input
                id='proj-name'
                value={tempProject.name}
                onChange={(e) => setTempProject({ ...tempProject, name: e.target.value })}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='proj-id'>Project ID</Label>
              <Input id='proj-id' value={tempProject.id} disabled className='bg-gray-50' />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='proj-desc'>Description</Label>
              <Textarea
                id='proj-desc'
                value={tempProject.description}
                onChange={(e) =>
                  setTempProject({
                    ...tempProject,
                    description: e.target.value,
                  })
                }
                className='min-h-[100px]'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={handleCancelEdit}>
              <X className='w-4 h-4 mr-2' /> Cancel
            </Button>
            <Button onClick={handleSaveProjectDetails} disabled={isLoading}>
              <Save className='w-4 h-4 mr-2' /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ————— Manage Features Dialog ————— */}
      <Dialog open={manageFeaturesDialogOpen} onOpenChange={setManageFeaturesDialogOpen}>
        <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Manage Features</DialogTitle>
            <DialogDescription>Select which features to include in your project.</DialogDescription>
          </DialogHeader>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {availableFeatures.map((f) => (
              <div
                key={f.id}
                className={`p-4 border rounded-lg cursor-pointer ${
                  f.selected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleFeatureToggle(f.id)}
              >
                <div className='flex items-center space-x-2'>
                  <input
                    type='checkbox'
                    checked={f.selected}
                    onChange={() => handleFeatureToggle(f.id)}
                    className='w-4 h-4'
                  />
                  <div>
                    <h4 className='font-medium'>{f.feature_name}</h4>
                    {f.feature_description && (
                      <p className='text-sm text-gray-600'>{f.feature_description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setManageFeaturesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFeatures} disabled={isLoading}>
              {isLoading ? <Loader2 className='w-4 h-4 mr-2 animate-spin' /> : null}
              Save Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ————— Ground Truth Dialog ————— */}
      <Dialog open={groundTruthDialogOpen} onOpenChange={setGroundTruthDialogOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>Ground Truth Management</DialogTitle>
            <DialogDescription>
              Select the columns you want to input a ground truth for and then export the CSV file.
              After editing, upload your modified ground truth to obtain an accuracy score on your
              features.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <MultiSelect
              modalPopover={false}
              options={selectableHeaders.map((feature) => ({
                label: feature.replace(/\s/g, ' → ').toLowerCase(),
                value: feature,
              }))}
              onValueChange={setSelectedColumns}
              value={selectedColumns}
              placeholder='Select columns'
              maxCount={3}
            />
            <DialogDescription>
              Choose the columns/features you are interested in.
            </DialogDescription>
          </div>

          <DialogFooter>
            <Button
              type='submit'
              onClick={handleExportGroundTruth}
              disabled={selectedColumns.length === 0}
            >
              Export CSV Base Template
            </Button>
          </DialogFooter>

          <Separator className='my-4' />

          <div className='space-y-2'>
            <div className='font-semibold'>Import Ground Truth</div>
            <p className='text-sm text-gray-500'>
              Upload your modified ground truth CSV to score your features.
            </p>
            <Input type='file' accept='.csv' onChange={handleTruthFileChange} />

            <DialogFooter>
              <Button
                type='submit'
                onClick={handleLoadTruthFile}
                disabled={loadingAccuracy || !truthFile}
              >
                {loadingAccuracy && <Loader2 className='animate-spin mr-2' />}
                Load CSV Ground Truth
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ————— About Dialog ————— */}
      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>About This Project</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='flex justify-between'>
              <span className='font-medium'>Project ID:</span>
              <span className='font-mono text-gray-600'>{project.id}</span>
            </div>
            <div className='flex justify-between'>
              <span className='font-medium'>Created:</span>
              <span className='text-gray-600'>
                {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='font-medium'>Papers Processed:</span>
              <span className='text-gray-600'>{projectStats.papersProcessed}</span>
            </div>
            <div className='flex justify-between'>
              <span className='font-medium'>Features Extracted:</span>
              <span className='text-gray-600'>{projectStats.featuresExtracted}</span>
            </div>

            <Separator className='my-4' />

            <div className='space-y-2'>
              <div className='font-medium'>Share Project</div>
              <p className='text-sm text-gray-500'>
                Share this project with others using the link below.
              </p>
              <div className='flex space-x-2'>
                <Input
                  value={`${window.location.origin}/project/${project.id}`}
                  readOnly
                  className='bg-gray-50'
                />
                <Button variant='outline' size='sm' onClick={handleCopyShareLink}>
                  <Share2 className='w-4 h-4 mr-2' />
                  Copy
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAboutDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ————— Prompt Editor Modal ————— */}
      {promptDialogOpen && (
        <PromptEditorModal
          currentPrompt={project.prompt}
          isOpen={promptDialogOpen}
          onClose={() => setPromptDialogOpen(false)}
          onSave={async (newPrompt) => {
            await onUpdatePrompt(newPrompt)
            setPromptDialogOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default ProjectHeader
