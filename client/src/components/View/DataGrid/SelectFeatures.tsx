import React, { useState, useEffect } from 'react'
import fuzzysort from 'fuzzysort'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { GitFork, Trash2 } from 'lucide-react'
import { Feature, NewFeature } from './feature.types'
import api from '@/service/api'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export type SelectFeaturesProps = {
  isFeatureModalOpen: boolean
  setIsFeatureModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  initialTab: 'select' | 'define'
  availableFeatures: Feature[]
  setAvailableFeatures: React.Dispatch<React.SetStateAction<Feature[]>>
  updateProjectFeatures: () => void
  addNewFeature: (newFeatureData: NewFeature) => Promise<void>
}

const SelectFeatures: React.FC<SelectFeaturesProps> = ({
  isFeatureModalOpen,
  setIsFeatureModalOpen,
  initialTab,
  availableFeatures,
  setAvailableFeatures,
  updateProjectFeatures,
  addNewFeature,
}) => {
  // Tabs + search + owner‐filter state
  const [tab, setTab] = useState<'select' | 'define'>(initialTab)
  const [search, setSearch] = useState('')
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'mine' | 'provided'>('all')
  const [showParents, setShowParents] = useState(false)
  const [filtered, setFiltered] = useState<Feature[]>(availableFeatures)

  // Form state for “Define”
  const [type, setType] = useState<'parent' | 'text' | 'number' | 'boolean' | 'enum'>('text')
  const [parent, setParent] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [prompt, setPrompt] = useState('')
  const [enumOpts, setEnumOpts] = useState<string[]>([''])
  const [submitting, setSubmitting] = useState(false)

  // reset tab/search when opened
  useEffect(() => {
    if (isFeatureModalOpen) {
      setTab(initialTab)
      setSearch('')
      setOwnerFilter('all')
    }
  }, [isFeatureModalOpen, initialTab])

  // filtering + fuzzysort
  useEffect(() => {
    let pool = [...availableFeatures]
    if (ownerFilter === 'mine') {
      pool = pool.filter((f) => f.created_by === 'user')
    }
    if (ownerFilter === 'provided') {
      pool = pool.filter((f) => f.created_by === 'provider')
    }
    if (search) {
      const res = fuzzysort.go(search, pool, {
        keys: ['feature_name', 'feature_description'],
      })
      pool = res.map((r) => r.obj)
    }
    setFiltered(pool)
  }, [search, ownerFilter, availableFeatures])

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
    }

    try {
      await addNewFeature(payload)
      // reset form + go back to select
      setType('text')
      setParent('')
      setName('')
      setDesc('')
      setPrompt('')
      setEnumOpts([''])
      setTab('select')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => setIsFeatureModalOpen(false)

  const generateTrail = (identifier: string): string => {
    // Remove .parent suffix for display, then replace dots with arrows
    const cleanIdentifier = identifier.endsWith('.parent')
      ? identifier.replace('.parent', '[ ]')
      : identifier
    return cleanIdentifier.replace(/\./g, ' → ')
  }

  return (
    <Dialog open={isFeatureModalOpen} onOpenChange={setIsFeatureModalOpen}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Feature Management</DialogTitle>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'select' | 'define')}
          className='w-full'
        >
          {/* restore full width & 2-col grid */}
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='select'>Select Features</TabsTrigger>
            <TabsTrigger value='define'>Define New Feature</TabsTrigger>
          </TabsList>

          {/* — SELECT TAB — */}
          <TabsContent value='select' className='space-y-4'>
            <div className='flex justify-between items-center'>
              <h3 className='text-lg font-semibold'>Select Features to Add</h3>
              <span className='text-sm text-muted-foreground'>hover for details</span>
            </div>

            {/* owner filters + search */}
            <div className='flex items-center space-x-2'>
              <Button
                size='sm'
                variant={ownerFilter === 'all' ? 'secondary' : 'outline'}
                onClick={() => setOwnerFilter('all')}
              >
                All
              </Button>
              <Button
                size='sm'
                variant={ownerFilter === 'mine' ? 'secondary' : 'outline'}
                onClick={() => setOwnerFilter('mine')}
              >
                <Tooltip>
                  <TooltipTrigger>Mine</TooltipTrigger>
                  <TooltipContent>Features defined by you</TooltipContent>
                </Tooltip>
              </Button>
              <Button
                size='sm'
                variant={ownerFilter === 'provided' ? 'secondary' : 'outline'}
                onClick={() => setOwnerFilter('provided')}
              >
                <Tooltip>
                  <TooltipTrigger>Provided</TooltipTrigger>
                  <TooltipContent>Features freely provided by Atlas</TooltipContent>
                </Tooltip>
              </Button>

              <Button
                size='sm'
                variant={showParents ? 'secondary' : 'outline'}
                onClick={() => setShowParents((prev) => !prev)}
                className='ml-auto'
              >
                {showParents ? 'Hide Parents' : 'Show Parents'}
              </Button>

              <span className='text-sm text-muted-foreground'>({filtered.length} features)</span>
            </div>
            <Input
              placeholder='Search features...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='ml-auto w-full '
            />

            {/* feature list */}
            <div className='max-h-80 overflow-y-auto space-y-2'>
              {filtered.length === 0 ? (
                <div className='text-muted-foreground text-sm text-center py-8'>
                  No features match your filters.
                </div>
              ) : (
                filtered
                  .filter((f) => showParents || !f.feature_identifier.endsWith('.parent'))
                  .map((feat) => (
                    <div
                      key={feat.id}
                      className={`relative flex justify-between items-start p-2 rounded-md cursor-pointer hover:bg-accent ${
                        feat.selected ? 'bg-accent/50' : ''
                      }`}
                      title={feat.feature_description}
                      onClick={() =>
                        setAvailableFeatures((prev) =>
                          prev.map((f) => (f.id === feat.id ? { ...f, selected: !f.selected } : f)),
                        )
                      }
                    >
                      {/* Left side: Text info */}
                      <div className='flex-grow space-y-1 pr-2'>
                        <p className='font-medium'>
                          {generateTrail(feat.feature_identifier)}{' '}
                          {feat.feature_identifier.endsWith('.parent') && (
                            <span className='text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded'>
                              Parent
                            </span>
                          )}
                        </p>
                        <p className='text-sm text-muted-foreground'>{feat.feature_description}</p>
                      </div>

                      {/* Right side: Controls */}
                      <div className='flex flex-col items-end gap-1'>
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
                          className='h-4 w-4'
                        />

                        {/* Icons */}
                        <div className='flex items-center gap-2'>
                          {feat.created_by === 'user' && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  await api.delete(`/features/${feat.id}`)
                                  setAvailableFeatures((prev) =>
                                    prev.filter((f) => f.id !== feat.id),
                                  )
                                  toast.success('Feature deleted successfully')
                                } catch (err) {
                                  console.error(err)
                                  toast.error('Failed to delete feature')
                                }
                              }}
                            >
                              <Trash2 className='w-5 h-5 text-red-500 hover:text-red-700' />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const ident = feat.feature_identifier
                              const isParent = ident.endsWith('.parent')
                              const newParentIdent = isParent
                                ? ident
                                : ident.replace(/\.[^.]+$/, '') + '.parent'

                              const isBooleanType =
                                feat.feature_enum_options.length == 2 &&
                                feat.feature_enum_options.every((o) =>
                                  ['yes', 'no'].includes(o.toLowerCase()),
                                )

                              setType(isBooleanType ? 'boolean' : feat.feature_type)
                              setParent(newParentIdent)
                              setName(`${feat.feature_name} copy`)
                              setDesc(feat.feature_description)
                              setPrompt(feat.feature_prompt || '')
                              setEnumOpts(feat.feature_enum_options || [''])
                              setTab('define')
                            }}
                          >
                            <GitFork className='w-5 h-5 text-gray-500 hover:text-gray-700' />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className='flex justify-end space-x-2'>
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
          <TabsContent value='define' className='space-y-4'>
            <h3 className='text-lg font-semibold'>Define New Feature</h3>

            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='feature-type'>Feature Type</Label>
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
              </div>

              <div className='space-y-2'>
                <Label htmlFor='parent-feature'>Parent Feature (Optional)</Label>
                <Select
                  value={parent || 'root'}
                  onValueChange={(v) => setParent(v === 'root' ? '' : v)}
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
                          {p.feature_identifier.replace(/\.parent$/, '').replace(/\./g, ' → ')}
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
                        onClick={() => setEnumOpts((es) => es.filter((_, idx) => idx !== i))}
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

            <div className='flex justify-end space-x-2'>
              <Button variant='outline' onClick={handleClose}>
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
