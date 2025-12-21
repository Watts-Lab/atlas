import React, { useState, useEffect } from 'react'
import fuzzysort from 'fuzzysort'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Copy, Trash2, FilePlus, File, AlertTriangle, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Feature, NewFeature } from './feature.types'
import api from '@/service/api'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export type SelectFeaturesProps = {
  isFeatureModalOpen: boolean
  setIsFeatureModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  initialTab: 'select' | 'define'
  availableFeatures: Feature[]
  setAvailableFeatures: React.Dispatch<React.SetStateAction<Feature[]>>
  updateProjectFeatures: () => void
  addNewFeature: (newFeatureData: NewFeature) => Promise<void>
  isLoading?: boolean
}

const SelectFeatures: React.FC<SelectFeaturesProps> = ({
  isFeatureModalOpen,
  setIsFeatureModalOpen,
  initialTab,
  availableFeatures,
  setAvailableFeatures,
  updateProjectFeatures,
  addNewFeature,
  isLoading = false,
}) => {
  // Tabs + search + owner‐filter state
  const [tab, setTab] = useState<'select' | 'define'>(initialTab)
  const [search, setSearch] = useState('')
  const [ownerFilter, setOwnerFilter] = useState<
    'all' | 'mine' | 'project' | 'provided' | 'shared'
  >('all')
  const [filtered, setFiltered] = useState<Feature[]>(availableFeatures)

  // Form state for “Define”
  const [type, setType] = useState<'parent' | 'text' | 'number' | 'boolean' | 'enum'>('text')
  const [parent, setParent] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [prompt, setPrompt] = useState('')
  const [enumOpts, setEnumOpts] = useState<string[]>([''])
  const [submitting, setSubmitting] = useState(false)
  const [isSharedFeature, setIsSharedFeature] = useState(false)
  const [isParentLocked, setIsParentLocked] = useState(false)
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null)
  const [isCopying, setIsCopying] = useState(false)

  // UI State
  const [activeFeature, setActiveFeature] = useState<Feature | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // reset tab/search when opened
  useEffect(() => {
    if (isFeatureModalOpen) {
      setOwnerFilter('all')
    }
  }, [isFeatureModalOpen, initialTab])

  // filtering + fuzzysort
  useEffect(() => {
    let pool = [...availableFeatures]
    if (ownerFilter === 'mine') {
      pool = pool.filter((f) => f.created_by === 'user')
    }
    if (ownerFilter === 'project') {
      pool = pool.filter((f) => f.selected)
    }
    if (ownerFilter === 'provided') {
      pool = pool.filter((f) => f.created_by === 'provider')
    }
    if (ownerFilter === 'shared') {
      pool = pool.filter((f) => f.is_shared)
    }
    if (search) {
      const res = fuzzysort.go(search, pool, {
        keys: ['feature_name', 'feature_description'],
      })
      pool = res.map((r) => r.obj)
    }
    setFiltered(pool)
  }, [search, ownerFilter, availableFeatures])

  const handleEdit = (feat: Feature) => {
    setEditingFeatureId(feat.id)
    setIsCopying(false)
    setName(feat.feature_name)
    setDesc(feat.feature_description)
    setType(feat.feature_type)

    // Handle parent
    const ident = feat.feature_identifier
    const lastDot = ident.lastIndexOf('.')
    if (lastDot !== -1) {
      const p = ident.substring(0, lastDot)
      setParent(p.endsWith('.parent') ? p : p + '.parent')
    } else {
      setParent('')
    }

    setPrompt(feat.feature_prompt || '')
    setEnumOpts(feat.feature_enum_options.length > 0 ? [...feat.feature_enum_options] : [''])
    setIsSharedFeature(feat.is_shared || false)
    setIsParentLocked(false)
    setTab('define')
  }

  const handleDefine = async () => {
    if (!name.trim()) return alert('Name required')
    if (type === 'enum' && enumOpts.every((o) => !o.trim()))
      return alert('At least one enum option')
    setSubmitting(true)

    const ident = (() => {
      const base = name.trim().toLowerCase().replace(/\s+/g, '_')
      const p = parent.replace(/\.parent$/, '')
      if (type === 'parent') {
        return p ? `${p}.${base}.parent` : `${base}.parent`
      }
      return p ? `${p}.${base}` : base
    })()

    const payload: NewFeature = {
      feature_name: name.trim(),
      feature_identifier: ident,
      feature_parent: parent.replace(/\.parent$/, ''),
      feature_description: desc.trim(),
      feature_type: type,
      feature_prompt: type !== 'parent' ? prompt.trim() : '',
      enum_options: type === 'enum' ? enumOpts.filter((o) => o.trim()) : undefined,
      is_shared: isSharedFeature,
    }

    try {
      if (editingFeatureId) {
        const resp = await api.put(`/features/${editingFeatureId}`, payload)
        if (resp.status === 200) {
          const updated = resp.data.feature
          setAvailableFeatures((prev) =>
            prev.map((f) =>
              f.id === editingFeatureId
                ? {
                    ...f,
                    feature_name: updated.feature_name,
                    feature_identifier: updated.feature_identifier,
                    feature_description: updated.feature_description,
                    feature_type: updated.feature_type,
                    feature_prompt: updated.feature_prompt,
                    feature_enum_options: updated.feature_enum_options,
                    is_shared: updated.is_shared,
                  }
                : f,
            ),
          )
          toast.success('Feature updated')
        }
      } else {
        await addNewFeature(payload)
      }

      // reset form + go back to select
      handleCancelDefine()
    } catch (err) {
      console.error(err)
      toast.error(editingFeatureId ? 'Failed to update feature' : 'Failed to create feature')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setIsFeatureModalOpen(false)
    setEditingFeatureId(null)
    setIsCopying(false)
  }

  const handleCancelDefine = () => {
    setType('text')
    setParent('')
    setName('')
    setDesc('')
    setPrompt('')
    setEnumOpts([''])
    setIsParentLocked(false)
    setEditingFeatureId(null)
    setIsCopying(false)
    setTab('select')
  }

  const handleDelete = async () => {
    if (!activeFeature) return
    try {
      await api.delete(`/features/${activeFeature.id}`)
      setAvailableFeatures((prev) => prev.filter((f) => f.id !== activeFeature.id))
      setActiveFeature(null)
      setShowDeleteConfirm(false)
      toast.success('Feature deleted successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete feature')
    }
  }

  const handleCopy = (feat: Feature) => {
    const ident = feat.feature_identifier
    const isParent = ident.endsWith('.parent')
    const newParentIdent = isParent ? ident : ident.replace(/\.[^.]+$/, '') + '.parent'

    const isBooleanType =
      feat.feature_enum_options.length == 2 &&
      feat.feature_enum_options.every((o) => ['yes', 'no'].includes(o.toLowerCase()))

    setType(isBooleanType ? 'boolean' : feat.feature_type)
    setParent(newParentIdent)
    setName(`${feat.feature_name} copy`)
    setDesc(feat.feature_description)
    setPrompt(feat.feature_prompt || '')
    setEnumOpts(feat.feature_enum_options || [''])
    setIsParentLocked(true)
    setIsCopying(true)
    setTab('define')
  }

  const generateTrail = (identifier: string): string => {
    // Remove .parent suffix for display, then replace dots with arrows
    const cleanIdentifier = identifier.endsWith('.parent')
      ? identifier.replace('.parent', '[ ]')
      : identifier
    return cleanIdentifier.replace(/\./g, ' → ')
  }

  return (
    <Dialog open={isFeatureModalOpen} onOpenChange={setIsFeatureModalOpen}>
      <DialogContent className='w-full sm:max-w-[65vw] h-[85vh] flex flex-col p-0 gap-0'>
        <DialogHeader className='p-6 pb-2 shrink-0'>
          <DialogTitle>Feature Management</DialogTitle>
          <DialogDescription className='sr-only'>
            {/* Accessible description for screen readers */}
            Manage, select, and define features for your project.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as 'select' | 'define')
          }}
          className='w-full flex-1 overflow-hidden flex flex-col p-6 pt-2'
        >
          {/* restore full width & 2-col grid */}
          {/* — SELECT TAB — */}
          <TabsContent
            value='select'
            className='flex-1 flex flex-col gap-4 overflow-hidden min-h-0'
          >
            <div className='flex justify-between items-center shrink-0'>
              <h3 className='text-lg font-semibold'>Add features to your project</h3>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-muted-foreground'>hover for details</span>
                <Button
                  variant='outline'
                  size='sm'
                  className='ml-2 gap-2'
                  onClick={() => setTab('define')}
                >
                  <FilePlus className='h-4 w-4' />
                  Create new feature
                </Button>
              </div>
            </div>

            {/* owner filters + search */}
            <div className='flex items-center space-x-2 shrink-0'>
              <Button
                size='sm'
                variant={ownerFilter === 'all' ? 'secondary' : 'outline'}
                onClick={() => setOwnerFilter('all')}
              >
                All
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size='sm'
                    variant={ownerFilter === 'mine' ? 'secondary' : 'outline'}
                    onClick={() => setOwnerFilter('mine')}
                  >
                    Mine
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Features defined by you</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size='sm'
                    variant={ownerFilter === 'project' ? 'secondary' : 'outline'}
                    onClick={() => setOwnerFilter('project')}
                  >
                    Project
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Features used by current project</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size='sm'
                    variant={ownerFilter === 'provided' ? 'secondary' : 'outline'}
                    onClick={() => setOwnerFilter('provided')}
                  >
                    Provided
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Features freely provided by Atlas</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size='sm'
                    variant={ownerFilter === 'shared' ? 'secondary' : 'outline'}
                    onClick={() => setOwnerFilter('shared')}
                  >
                    Shared
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Shared feature by other users</TooltipContent>
              </Tooltip>

              <span className='text-sm text-muted-foreground'>({filtered.length} features)</span>
            </div>
            <Input
              placeholder='Search features...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='ml-auto w-full shrink-0'
            />

            {isLoading ? (
              <div className='flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground border rounded-md bg-muted/10'>
                <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
                <p>Loading features...</p>
              </div>
            ) : (
              <ResizablePanelGroup
                direction='horizontal'
                className='flex-1 border rounded-md overflow-hidden min-h-0'
              >
                {/* Left Panel: Feature List */}
                <ResizablePanel defaultSize={65} minSize={30}>
                  <div className='h-full p-2 bg-background overflow-y-auto'>
                    <div className='space-y-2'>
                      {filtered.length === 0 ? (
                        <div className='text-muted-foreground text-sm text-center py-8'>
                          No features match your filters.
                        </div>
                      ) : (
                        filtered.map((feat) => (
                          <div
                            key={feat.id}
                            className={`relative flex justify-between items-start p-2 rounded-md cursor-pointer border transition-colors ${
                              activeFeature?.id === feat.id
                                ? 'bg-accent border-primary/50'
                                : 'hover:bg-accent/50 border-transparent'
                            } ${feat.selected ? 'bg-secondary/50' : ''}`}
                            onClick={() => setActiveFeature(feat)}
                          >
                            {/* Left side: Text info */}
                            <div className='flex-grow space-y-1 pr-2 overflow-hidden'>
                              <p className='font-medium truncate flex items-center gap-1.5'>
                                <span>{generateTrail(feat.feature_identifier)}</span>
                                {feat.version && (
                                  <Badge
                                    variant='secondary'
                                    className='text-xs px-1 py-0 h-3.5 leading-none bg-muted/50 border-none font-normal text-muted-foreground'
                                  >
                                    {feat.version}
                                  </Badge>
                                )}
                                {feat.feature_identifier.endsWith('.parent') && (
                                  <Badge variant='outline' className='text-[10px] px-1 py-0 h-auto'>
                                    Parent
                                  </Badge>
                                )}
                              </p>
                              <p className='text-sm text-muted-foreground truncate'>
                                {feat.feature_description}
                              </p>
                            </div>

                            {/* Right side: Controls */}
                            <div className='flex flex-col items-end gap-1 shrink-0'>
                              {/* Checkbox */}
                              <input
                                type='checkbox'
                                checked={feat.selected}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  setAvailableFeatures((prev) =>
                                    prev.map((f) =>
                                      f.id === feat.id ? { ...f, selected: e.target.checked } : f,
                                    ),
                                  )
                                }}
                                className='h-4 w-4 rounded border-gray-300'
                              />

                              {/* Icons */}
                              <div className='flex items-center gap-2'>
                                <button
                                  title='Copy Feature'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCopy(feat)
                                  }}
                                >
                                  <Copy className='w-4 h-4 text-muted-foreground hover:text-primary transition-colors' />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Panel: Feature Details */}
                <ResizablePanel defaultSize={35} minSize={20}>
                  <div className='flex flex-col h-full bg-muted/30 overflow-hidden'>
                    {activeFeature ? (
                      <div className='flex flex-col h-full min-h-0'>
                        <div className='p-4 border-b bg-background/50 shrink-0'>
                          <h4 className='font-semibold text-lg break-all leading-tight'>
                            {activeFeature.feature_identifier}
                          </h4>
                          <div className='flex items-center gap-2 mt-2 h-5'>
                            <Badge variant='secondary' className='capitalize'>
                              {activeFeature.feature_type}
                            </Badge>
                            {activeFeature.is_shared && <Badge variant='outline'>Shared</Badge>}

                            <div className='flex items-center gap-2 ml-auto'>
                              <span className='text-[10px] text-muted-foreground uppercase tracking-tight font-medium'>
                                <b>Owner:</b> {activeFeature.created_by}
                              </span>
                              {activeFeature.version && (
                                <Badge
                                  variant='outline'
                                  className='text-[10px] px-1 py-0 h-4 border-muted-foreground/20 text-muted-foreground font-normal'
                                >
                                  <b>Version:</b> {activeFeature.version}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className='flex-1 p-4 overflow-y-auto'>
                          <div className='space-y-4'>
                            <div>
                              <Label className='text-xs text-muted-foreground uppercase tracking-wider font-bold'>
                                Description
                              </Label>
                              <p className='mt-1 text-sm'>
                                {activeFeature.feature_description || (
                                  <span className='text-muted-foreground italic'>
                                    No description
                                  </span>
                                )}
                              </p>
                            </div>

                            <Separator />

                            {activeFeature.feature_type === 'enum' &&
                              activeFeature.feature_enum_options && (
                                <div>
                                  <Label className='text-xs text-muted-foreground uppercase tracking-wider font-bold'>
                                    Options
                                  </Label>
                                  <div className='flex flex-wrap gap-1 mt-2'>
                                    {activeFeature.feature_enum_options.map((opt, i) => (
                                      <Badge key={i} variant='outline' className='bg-background'>
                                        {opt}
                                      </Badge>
                                    ))}
                                  </div>
                                  <Separator className='mt-4' />
                                </div>
                              )}

                            {activeFeature.feature_prompt && (
                              <div>
                                <Label className='text-xs text-muted-foreground uppercase tracking-wider font-bold'>
                                  Extraction Prompt
                                </Label>
                                <div className='mt-2 p-2 bg-muted rounded-md text-xs font-mono whitespace-pre-wrap break-words'>
                                  {activeFeature.feature_prompt}
                                </div>
                              </div>
                            )}

                            <Separator />

                            <div className='space-y-4'>
                              <Label className='text-xs text-muted-foreground uppercase tracking-wider font-bold'>
                                Quality Metrics
                              </Label>

                              <div className='space-y-1.5'>
                                <div className='flex justify-between text-xs'>
                                  <span className='text-muted-foreground'>
                                    Ground Truth Accuracy
                                  </span>
                                  <span className='font-medium text-xs'>
                                    {activeFeature.ground_truth_accuracy !== undefined ? (
                                      `${Math.round(activeFeature.ground_truth_accuracy * 100)}%`
                                    ) : (
                                      <span className='text-muted-foreground italic font-normal'>
                                        Not evaluated
                                      </span>
                                    )}
                                  </span>
                                </div>
                                {activeFeature.ground_truth_accuracy !== undefined && (
                                  <Progress
                                    value={activeFeature.ground_truth_accuracy * 100}
                                    className='h-1.5'
                                  />
                                )}
                              </div>

                              <div className='space-y-1.5'>
                                <div className='flex justify-between text-xs'>
                                  <span className='text-muted-foreground'>Repeatability Score</span>
                                  <span className='font-medium text-xs'>
                                    {activeFeature.repeatability_score !== undefined ? (
                                      `${Math.round(activeFeature.repeatability_score * 10)}/10`
                                    ) : (
                                      <span className='text-muted-foreground italic font-normal'>
                                        Not evaluated
                                      </span>
                                    )}
                                  </span>
                                </div>
                                {activeFeature.repeatability_score !== undefined && (
                                  <Progress
                                    value={activeFeature.repeatability_score * 100}
                                    className='h-1.5'
                                  />
                                )}
                              </div>
                            </div>

                            {/* Metadata moved to header */}
                          </div>
                        </div>
                        <div className='p-3 border-t bg-background/50 flex justify-end gap-2 shrink-0 @container'>
                          {activeFeature.created_by === 'user' && (
                            <>
                              <Button
                                size='xs'
                                variant='outline'
                                onClick={() => handleEdit(activeFeature)}
                                className='gap-1.5'
                                title='Edit Feature'
                              >
                                <Pencil className='w-3.5 h-3.5' />
                                <span className='hidden @[300px]:inline'>Edit</span>
                              </Button>
                              <Button
                                size='xs'
                                variant='outline'
                                onClick={() => setShowDeleteConfirm(true)}
                                className='gap-1.5 text-destructive hover:text-destructive'
                                title='Delete Feature'
                              >
                                <Trash2 className='w-3.5 h-3.5' />
                                <span className='hidden @[300px]:inline'>Delete</span>
                              </Button>
                            </>
                          )}
                          <Button
                            size='xs'
                            variant='outline'
                            onClick={() => handleCopy(activeFeature)}
                            className='gap-1.5'
                            title='Copy Feature'
                          >
                            <Copy className='w-3.5 h-3.5' />
                            <span className='hidden @[300px]:inline'>Copy</span>
                          </Button>
                          {(() => {
                            const isSelected = availableFeatures.find(
                              (f) => f.id === activeFeature.id,
                            )?.selected
                            return (
                              <Button
                                size='xs'
                                variant={isSelected ? 'secondary' : 'default'}
                                onClick={() =>
                                  setAvailableFeatures((prev) =>
                                    prev.map((f) =>
                                      f.id === activeFeature.id
                                        ? { ...f, selected: !f.selected }
                                        : f,
                                    ),
                                  )
                                }
                              >
                                {isSelected ? 'Remove Selection' : 'Select Feature'}
                              </Button>
                            )
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className='flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground'>
                        <File className='w-12 h-12 mb-4 opacity-20' />
                        <p>Select a feature from the list to view details</p>
                      </div>
                    )}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the feature{' '}
                    <span className='font-semibold text-foreground'>
                      &quot;{activeFeature?.feature_name}&quot;
                    </span>{' '}
                    ({activeFeature?.feature_identifier}) and remove it from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  >
                    Delete Feature
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className='flex justify-end space-x-2 shrink-0 pt-2'>
              <Button variant='outline' onClick={handleClose}>
                Close
              </Button>
              <Button
                onClick={() => {
                  updateProjectFeatures()
                  handleClose()
                }}
              >
                Save Selection
              </Button>
            </div>
          </TabsContent>

          {/* — DEFINE TAB — */}
          <TabsContent
            value='define'
            className='flex-1 flex flex-col gap-4 overflow-hidden min-h-0'
          >
            <div className='flex justify-between items-center shrink-0'>
              <h3 className='text-lg font-semibold'>
                {editingFeatureId ? 'Edit Feature' : 'Define New Feature'}
              </h3>
            </div>

            {editingFeatureId && (
              <div className='flex items-center gap-2 p-3 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-md'>
                <AlertTriangle className='h-4 w-4 shrink-0' />
                <p>
                  <strong>Note:</strong> The updated feature prompt should aim to produce the same
                  ground truth as the previous version to maintain consistency across your results.
                </p>
              </div>
            )}

            {isLoading ? (
              <div className='flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground border rounded-md bg-muted/10'>
                <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
                <p>Loading features...</p>
              </div>
            ) : (
              <ResizablePanelGroup
                direction='horizontal'
                className='flex-1 border rounded-md overflow-hidden min-h-0'
              >
                {/* Left: Input Form */}
                <ResizablePanel defaultSize={50} minSize={30}>
                  <div className='h-full p-4 bg-background overflow-y-auto'>
                    <div className='space-y-4'>
                      <div className='space-y-2'>
                        <Label htmlFor='feature-type'>Feature Type</Label>
                        <div className='flex items-center space-x-4'>
                          <Select
                            value={type}
                            onValueChange={(v) =>
                              setType(v as 'number' | 'boolean' | 'text' | 'parent' | 'enum')
                            }
                          >
                            <SelectTrigger className='w-[180px]'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='parent'>Parent (Container)</SelectItem>
                              <SelectItem value='text'>Text</SelectItem>
                              <SelectItem value='number'>Number</SelectItem>
                              <SelectItem value='boolean'>Boolean</SelectItem>
                              <SelectItem value='enum'>Multiple Choice</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className='flex items-center space-x-2'>
                            <Switch
                              checked={isSharedFeature}
                              onCheckedChange={() => setIsSharedFeature((prev) => !prev)}
                              id='airplane-mode'
                            />
                            <Label htmlFor='airplane-mode'>
                              Is shared ({`${isSharedFeature ? 'Yes' : 'No'}`})
                            </Label>
                          </div>
                        </div>
                      </div>

                      <div className='space-y-2'>
                        <Label htmlFor='parent-feature'>Parent Feature</Label>
                        <Select
                          value={parent || 'root'}
                          onValueChange={(v) => setParent(v === 'root' ? '' : v)}
                          disabled={isParentLocked || !!editingFeatureId}
                        >
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Root Level' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='root'>Root Level</SelectItem>
                            {availableFeatures
                              .filter((f) => f.feature_identifier.endsWith('.parent'))
                              .map((p) => (
                                <SelectItem key={p.id} value={p.feature_identifier}>
                                  {p.feature_identifier
                                    .replace(/\.parent$/, '')
                                    .replace(/\./g, ' → ')}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className='space-y-2'>
                        <Label htmlFor='feature-name'>Feature Name</Label>
                        <Input
                          id='feature-name'
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder='e.g. participant_count'
                          className='w-full'
                          disabled={!!editingFeatureId || isCopying}
                        />
                        <p className='text-sm text-gray-500'>
                          Will generate identifier:{' '}
                          <code>{name.toLowerCase().trim().replace(/\s+/g, '_')}</code>
                        </p>
                      </div>

                      <div className='space-y-2'>
                        <Label htmlFor='feature-description'>Description</Label>
                        <Input
                          id='feature-description'
                          value={desc}
                          onChange={(e) => setDesc(e.target.value)}
                          placeholder='Brief description'
                          className='w-full'
                        />
                      </div>

                      {type !== 'parent' && (
                        <div className='space-y-2'>
                          <Label htmlFor='feature-prompt'>GPT Prompt</Label>
                          <Textarea
                            id='feature-prompt'
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder='Prompt to extract this feature'
                            className='min-h-[100px] w-full'
                          />
                        </div>
                      )}

                      {type === 'enum' && (
                        <div className='space-y-2'>
                          <Label>Enum Options</Label>
                          {enumOpts.map((o, i) => (
                            <div key={i} className='flex items-center gap-2'>
                              <Input
                                value={o}
                                onChange={(e) =>
                                  setEnumOpts((es) => {
                                    const c = [...es]
                                    c[i] = e.target.value
                                    return c
                                  })
                                }
                                placeholder={`Option ${i + 1}`}
                                className='flex-1'
                              />
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() =>
                                  setEnumOpts((es) => es.filter((_, idx) => idx !== i))
                                }
                                disabled={enumOpts.length === 1}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => setEnumOpts((es) => [...es, ''])}
                          >
                            + Add Option
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right: Preview & Evaluate */}
                <ResizablePanel defaultSize={50} minSize={30}>
                  <div className='h-full bg-muted/30 overflow-hidden flex flex-col'>
                    <div className='p-4 border-b bg-background/50 shrink-0'>
                      <h4 className='font-semibold text-lg'>Preview & Evaluate</h4>
                      <p className='text-sm text-muted-foreground'>
                        See how your feature looks and test it.
                      </p>
                    </div>
                    <div className='flex-1 p-4 overflow-y-auto space-y-6'>
                      {/* Live Preview Card */}
                      <div className='border rounded-md p-4 bg-background shadow-sm'>
                        <div className='mb-2'>
                          <Badge variant='outline' className='mr-2 capitalize'>
                            {type}
                          </Badge>
                          {isSharedFeature && <Badge variant='secondary'>Shared</Badge>}
                        </div>
                        <h5 className='font-semibold text-base break-words'>
                          {parent && parent !== 'root'
                            ? `${parent.replace(/\.parent$/, '').replace(/\./g, ' → ')} → `
                            : ''}
                          {name ? (
                            name.toLowerCase().trim().replace(/\s+/g, '_')
                          ) : (
                            <span className='text-muted-foreground italic'>feature_identifier</span>
                          )}
                          {type === 'parent' && '.parent'}
                        </h5>
                        <p className='text-sm text-muted-foreground mt-1'>
                          {desc || (
                            <span className='italic opacity-50'>
                              Description will appear here...
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Evaluation Placeholder */}
                      <div className='space-y-2'>
                        <Label className='text-xs uppercase font-bold text-muted-foreground'>
                          Test Extraction
                        </Label>
                        <Textarea
                          placeholder='Paste sample text here to test this feature extraction (Coming Soon)...'
                          className='min-h-[100px] resize-none bg-muted/50'
                          disabled
                        />
                        <Button size='sm' variant='secondary' disabled className='w-full'>
                          Run Test
                        </Button>
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}

            <div className='flex justify-end space-x-2 shrink-0 pt-2'>
              <Button variant='outline' onClick={handleCancelDefine}>
                Cancel
              </Button>
              <Button onClick={handleDefine} disabled={submitting}>
                {submitting ? 'Adding…' : 'Add Feature'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default SelectFeatures
