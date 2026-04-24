import { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import fuzzysort from 'fuzzysort'
import MainPage from '@/components/View/DataGrid/MainPage'
import { FeatureList } from '@/components/View/DataGrid/FeatureManagement/FeatureList'
import { FeatureDetail } from '@/components/View/DataGrid/FeatureManagement/FeatureDetail'
import { FeatureDefineForm } from '@/components/View/DataGrid/FeatureManagement/FeatureDefineForm'
import { FeatureEvaluation } from '@/components/View/DataGrid/FeatureManagement/FeatureEvaluation'
import { useFeatures, getParentIdentifier } from '@/components/View/DataGrid/feature.service'
import { Feature } from '@/components/View/DataGrid/feature.types'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { toast } from 'sonner'
import api from '@/service/api'

const FeaturesPage = () => {
  const { features, loading, refetch } = useFeatures()
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname
  const isExplorer = currentPath.includes('/explorer')
  const isCreate = currentPath.includes('/create')

  const [searchQuery, setSearchQuery] = useState('')
  const [ownerFilter, setOwnerFilter] = useState<
    'all' | 'mine' | 'project' | 'provided' | 'shared'
  >('all')
  const [activeFeature, setActiveFeature] = useState<Feature | null>(null)

  // Define Form State
  const [type, setType] = useState<'number' | 'boolean' | 'text' | 'parent' | 'enum'>('text')
  const [isSharedFeature, setIsSharedFeature] = useState(false)
  const [parent, setParent] = useState<string>('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [prompt, setPrompt] = useState('')
  const [enumOpts, setEnumOpts] = useState<string[]>([''])
  const [submitting, setSubmitting] = useState(false)
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null)
  const [isCopying, setIsCopying] = useState(false)

  const filteredFeatures = useMemo(() => {
    let filtered = features

    // 1. Owner Filter
    if (ownerFilter === 'mine') {
      filtered = filtered.filter((f) => f.created_by === 'user')
    } else if (ownerFilter === 'provided') {
      filtered = filtered.filter((f) => f.created_by === 'provider')
    } else if (ownerFilter === 'shared') {
      filtered = filtered.filter((f) => f.is_shared)
    }

    // 2. Search Filter
    if (!searchQuery.trim()) return filtered

    const results = fuzzysort.go(searchQuery, filtered, {
      keys: ['feature_name', 'feature_identifier', 'feature_description'],
      threshold: -10000,
    })
    return results.map((r) => r.obj)
  }, [features, ownerFilter, searchQuery])

  const handleDefine = async () => {
    if (!name.trim()) {
      toast.error('Feature name is required')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        type,
        parent_feature_identifier: parent || null,
        name: name.trim(),
        description: desc.trim(),
        prompt: prompt.trim(),
        enum_options: type === 'enum' ? enumOpts.filter((o) => o.trim()) : null,
        is_shared: isSharedFeature,
      }

      if (editingFeatureId) {
        await api.put(`/features/${editingFeatureId}`, payload)
        toast.success('Feature updated successfully')
      } else {
        await api.post('/features', payload)
        toast.success('Feature added successfully')
      }

      refetch()
      handleCancelDefine()
      navigate('/features/explorer')
    } catch (error) {
      console.error('Failed to save feature:', error)
      toast.error('Failed to save feature')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelDefine = () => {
    setEditingFeatureId(null)
    setIsCopying(false)
    setName('')
    setDesc('')
    setPrompt('')
    setEnumOpts([''])
    setType('text')
    setIsSharedFeature(false)
    setParent('')
  }

  const handleEdit = (feat: Feature) => {
    setEditingFeatureId(feat.id)
    setIsCopying(false)
    setType(feat.feature_type)
    setIsSharedFeature(feat.is_shared || false)
    setParent(getParentIdentifier(feat.feature_identifier))
    setName(feat.feature_name)
    setDesc(feat.feature_description || '')
    setPrompt(feat.feature_prompt || '')
    setEnumOpts(feat.feature_enum_options || [''])
    navigate('/features/create')
  }

  const handleCopy = (feat: Feature) => {
    setEditingFeatureId(null)
    setIsCopying(true)
    setType(feat.feature_type)
    setIsSharedFeature(feat.is_shared || false)
    setParent(getParentIdentifier(feat.feature_identifier))
    setName(`${feat.feature_name}_copy`)
    setDesc(feat.feature_description || '')
    setPrompt(feat.feature_prompt || '')
    setEnumOpts(feat.feature_enum_options || [''])
    navigate('/features/create')
  }

  return (
    <MainPage
      breadcrumbs={[
        { title: 'Dashboard', url: '/dashboard' },
        { title: 'Features', url: '/features' },
        { title: isExplorer ? 'Explorer' : 'Create Feature', url: currentPath },
      ]}
    >
      <div className='flex-1 h-full overflow-hidden flex flex-col min-w-0'>
        {isExplorer && (
          <div className='flex-1 flex flex-col p-6 overflow-hidden min-w-0'>
            <div className='flex items-center gap-4 mb-6 shrink-0'>
              <div className='flex items-center space-x-1 border rounded-md p-1 bg-muted/50'>
                {(['all', 'mine', 'provided', 'shared'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setOwnerFilter(filter)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all ${
                      ownerFilter === filter
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
              <div className='flex-1'>
                <input
                  type='text'
                  placeholder='Search features by name, identifier or description...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-full h-10 px-4 text-sm bg-background border rounded-md outline-none focus:ring-1 focus:ring-primary/20'
                />
              </div>
              <div className='text-xs text-muted-foreground tabular-nums'>
                Showing <b>{filteredFeatures.length}</b> of {features.length} features
              </div>
            </div>

            <ResizablePanelGroup
              direction='horizontal'
              className='flex-1 border rounded-xl overflow-hidden shadow-sm bg-background'
            >
              <ResizablePanel defaultSize={35} minSize={25}>
                <div className='h-full overflow-y-auto p-4 border-r'>
                  {loading ? (
                    <div className='flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-12'>
                      <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent' />
                      <span className='text-sm font-medium'>Loading feature library…</span>
                    </div>
                  ) : (
                    <FeatureList
                      features={filteredFeatures}
                      activeFeatureId={activeFeature?.id}
                      onSelectFeature={setActiveFeature}
                      onToggleSelect={() => {}}
                      onCopy={handleCopy}
                    />
                  )}
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={65}>
                <div className='h-full bg-muted/5'>
                  <FeatureDetail
                    feature={activeFeature}
                    isSelected={false}
                    onEdit={handleEdit}
                    onCopy={handleCopy}
                    onDelete={async () => {
                      if (!activeFeature) return
                      try {
                        await api.delete(`/features/${activeFeature.id}`)
                        toast.success('Feature deleted')
                        refetch()
                        setActiveFeature(null)
                      } catch {
                        toast.error('Failed to delete feature')
                      }
                    }}
                    showSelect={false}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}

        {isCreate && (
          <div className='flex-1 p-8 overflow-hidden bg-muted/10'>
            <div className='w-full mx-auto h-full flex flex-col'>
              <div className='mb-6'>
                <h2 className='text-2xl font-bold tracking-tight'>
                  {editingFeatureId ? 'Edit Feature' : 'Create New Feature'}
                </h2>
                <p className='text-muted-foreground'>
                  Define how to extract this information from your data.
                </p>
              </div>

              <ResizablePanelGroup
                direction='horizontal'
                className='flex-1 border rounded-xl overflow-hidden shadow-lg bg-background'
              >
                <ResizablePanel
                  defaultSize={30}
                  minSize={30}
                  className='border-r'
                >
                  <div className='h-full overflow-y-auto p-8'>
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
                    availableFeatures={features}
                    isParentLocked={isCopying}
                    editingFeatureId={editingFeatureId}
                    isCopying={isCopying}
                    onSubmit={handleDefine}
                    onCancel={() => {
                      handleCancelDefine()
                      navigate('/features/explorer')
                    }}
                    submitting={submitting}
                  />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={50}>
                  <div className='h-full'>
                    <FeatureEvaluation
                      feature={{
                        id: editingFeatureId || undefined,
                        name: name,
                        identifier:
                          (parent && parent !== 'root' ? `${parent}.` : '') +
                          name.toLowerCase().trim().replace(/\s+/g, '_') +
                          (type === 'parent' ? '.parent' : ''),
                        prompt: prompt,
                        type: type,
                        description: desc,
                        enum_options: enumOpts,
                      }}
                      availableFeatures={features}
                    />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>
        )}
      </div>
    </MainPage>
  )
}

export default FeaturesPage
