import React, { useState, useEffect } from 'react'
import fuzzysort from 'fuzzysort'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { FilePlus, AlertTriangle } from 'lucide-react'
import { Feature, NewFeature } from './feature.types'
import api from '@/service/api'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
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

// Sub-components
import { FeatureList } from './FeatureManagement/FeatureList'
import { FeatureDetail } from './FeatureManagement/FeatureDetail'
import { FeatureDefineForm } from './FeatureManagement/FeatureDefineForm'
import { FeatureEvaluation } from './FeatureManagement/FeatureEvaluation'
import { Input } from '@/components/ui/input'
import { getParentIdentifier } from './feature.service'

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
    const ident = feat.feature_identifier
    setParent(getParentIdentifier(ident))

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
    const isBooleanType =
      feat.feature_enum_options.length === 2 &&
      feat.feature_enum_options.every((o) => ['yes', 'no'].includes(o.toLowerCase()))

    setType(isBooleanType ? 'boolean' : feat.feature_type)
    setParent(getParentIdentifier(ident))
    setName(`${feat.feature_name} copy`)
    setDesc(feat.feature_description)
    setPrompt(feat.feature_prompt || '')
    setEnumOpts(feat.feature_enum_options || [''])
    setIsParentLocked(true)
    setIsCopying(true)
    setTab('define')
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
                    <FeatureList
                      features={filtered}
                      activeFeatureId={activeFeature?.id}
                      onSelectFeature={setActiveFeature}
                      onToggleSelect={(f, sel) => {
                        setAvailableFeatures((prev) =>
                          prev.map((it) => (it.id === f.id ? { ...it, selected: sel } : it)),
                        )
                      }}
                      onCopy={handleCopy}
                    />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Panel: Feature Details */}
                <ResizablePanel defaultSize={35} minSize={20}>
                  <div className='flex flex-col h-full bg-muted/30 overflow-hidden'>
                    <FeatureDetail
                      feature={activeFeature}
                      isSelected={
                        !!availableFeatures.find((f) => f.id === activeFeature?.id)?.selected
                      }
                      onEdit={handleEdit}
                      onDelete={() => setShowDeleteConfirm(true)}
                      onCopy={handleCopy}
                      onToggleSelect={(f, sel) => {
                        setAvailableFeatures((prev) =>
                          prev.map((it) => (it.id === f.id ? { ...it, selected: sel } : it)),
                        )
                      }}
                    />
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
                    <FeatureDefineForm
                      type={type}
                      setType={setType}
                      isSharedFeature={isSharedFeature}
                      setIsSharedFeature={setIsSharedFeature}
                      parent={parent}
                      setParent={setParent}
                      name={name}
                      setName={setName}
                      desc={desc}
                      setDesc={setDesc}
                      prompt={prompt}
                      setPrompt={setPrompt}
                      enumOpts={enumOpts}
                      setEnumOpts={setEnumOpts}
                      availableFeatures={availableFeatures}
                      isParentLocked={isParentLocked}
                      editingFeatureId={editingFeatureId}
                      isCopying={isCopying}
                      onSubmit={handleDefine}
                      onCancel={handleCancelDefine}
                      submitting={submitting}
                    />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right: Preview & Evaluate */}
                <ResizablePanel defaultSize={50} minSize={30}>
                  <FeatureEvaluation
                    feature={{
                      id: editingFeatureId || undefined,
                      name: name,
                      identifier: (parent && parent !== 'root' ? `${parent}.` : '') + name.toLowerCase().trim().replace(/\s+/g, '_') + (type === 'parent' ? '.parent' : ''),
                      prompt: prompt,
                      type: type,
                      description: desc,
                      enum_options: enumOpts,
                    }}
                    availableFeatures={availableFeatures}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            )}


          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default SelectFeatures
