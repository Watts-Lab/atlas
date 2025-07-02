import * as React from 'react'
import fuzzysort from 'fuzzysort'
import { useEffect, useState } from 'react'
import { Feature, NewFeature } from './feature.types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type SelectFeaturesProps = {
  isFeatureModalOpen: boolean
  setIsFeatureModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  availableFeatures: Feature[]
  setAvailableFeatures: React.Dispatch<React.SetStateAction<Feature[]>>
  updateProjectFeatures: () => void
  addNewFeature: (newFeatureData: NewFeature) => void
}

const SelectFeatures = ({
  availableFeatures,
  isFeatureModalOpen,
  setIsFeatureModalOpen,
  setAvailableFeatures,
  updateProjectFeatures,
  addNewFeature,
}: SelectFeaturesProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredFeatures, setFilteredFeatures] = useState<Feature[]>([])

  // New feature form state
  const [newFeatureType, setNewFeatureType] = useState<'parent' | 'text' | 'number' | 'enum'>(
    'text',
  )
  const [newFeatureParent, setNewFeatureParent] = useState('')
  const [newFeatureName, setNewFeatureName] = useState('')
  const [newFeatureDescription, setNewFeatureDescription] = useState('')
  const [newFeaturePrompt, setNewFeaturePrompt] = useState('')
  const [enumOptions, setEnumOptions] = useState<string[]>([''])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const results = fuzzysort.go(searchQuery, availableFeatures, {
      keys: ['feature_name', 'feature_description'],
    })
    setFilteredFeatures(
      searchQuery.length ? results.map((result) => result.obj) : availableFeatures,
    )
  }, [searchQuery, availableFeatures])

  // Get available parent features (those ending with .parent)
  const getAvailableParents = () => {
    const parents = availableFeatures.filter((feature) =>
      feature.feature_identifier.endsWith('.parent'),
    )
    return [...parents]
  }

  const handleAddEnumOption = () => {
    setEnumOptions([...enumOptions, ''])
  }

  const handleRemoveEnumOption = (index: number) => {
    setEnumOptions(enumOptions.filter((_, i) => i !== index))
  }

  const handleEnumOptionChange = (index: number, value: string) => {
    const newOptions = [...enumOptions]
    newOptions[index] = value
    setEnumOptions(newOptions)
  }

  const generateTrail = (identifier: string): string => {
    // Remove .parent suffix for display, then replace dots with arrows
    const cleanIdentifier = identifier.endsWith('.parent')
      ? identifier.replace('.parent', '[ ]')
      : identifier
    return cleanIdentifier.replace(/\./g, ' → ')
  }

  const generateFeatureIdentifier = (): string => {
    const featureParent = newFeatureParent.replace('.parent', '')
    if (newFeatureType === 'parent') {
      const baseName = newFeatureName.toLowerCase().replace(/\s+/g, '_')
      return newFeatureParent ? `${featureParent}.${baseName}.parent` : `${baseName}.parent`
    } else {
      const baseName = newFeatureName.toLowerCase().replace(/\s+/g, '_')
      return newFeatureParent ? `${featureParent}.${baseName}` : baseName
    }
  }

  const handleAddNewFeature = async () => {
    if (!newFeatureName.trim()) {
      alert('Feature name is required')
      return
    }

    if (newFeatureType === 'enum' && enumOptions.filter((opt) => opt.trim()).length === 0) {
      alert('At least one enum option is required')
      return
    }

    setIsSubmitting(true)

    try {
      const newFeatureData: NewFeature = {
        feature_name: newFeatureName.trim(),
        feature_identifier: generateFeatureIdentifier(),
        feature_parent: newFeatureParent.replace('.parent', ''),
        feature_description: newFeatureDescription.trim(),
        feature_type: newFeatureType,
        feature_prompt: newFeaturePrompt.trim(),
        enum_options: newFeatureType === 'enum' ? enumOptions.filter((o) => o.trim()) : undefined,
      }

      // Call the addNewFeature function passed from parent
      await addNewFeature(newFeatureData)

      // Reset form
      setNewFeatureType('text')
      setNewFeatureParent('')
      setNewFeatureName('')
      setNewFeatureDescription('')
      setNewFeaturePrompt('')
      setEnumOptions([''])

      // Close modal
      setIsFeatureModalOpen(false)
    } catch (error) {
      console.error('Error adding feature:', error)
      alert('Failed to add feature. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setIsFeatureModalOpen(false)
  }

  return (
    <Dialog open={isFeatureModalOpen} onOpenChange={setIsFeatureModalOpen}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Feature Management</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue='select' className='w-full'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='select'>Select Features</TabsTrigger>
            <TabsTrigger value='define'>Define New Feature</TabsTrigger>
          </TabsList>

          <TabsContent value='select' className='space-y-4'>
            <div className='flex justify-between items-center'>
              <h3 className='text-lg font-semibold'>Select Features to Add</h3>
              <span className='text-sm text-muted-foreground'>hover for details</span>
            </div>

            <Input
              type='text'
              placeholder='Search features...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full'
            />

            <div className='max-h-80 overflow-y-auto space-y-2'>
              {filteredFeatures
                .filter((feature) => !feature.feature_identifier.endsWith('.parent'))
                .map((feature) => (
                  <div
                    key={feature.id}
                    className='flex items-start hover:bg-accent p-1 rounded-md cursor-pointer'
                    title={feature.feature_description}
                    onClick={() => {
                      setAvailableFeatures(
                        availableFeatures.map((f) =>
                          f.id === feature.id ? { ...f, selected: !f.selected } : f,
                        ),
                      )
                    }}
                  >
                    <div className='flex-grow space-y-1'>
                      <p className='font-medium'>{generateTrail(feature.feature_identifier)}</p>
                      <p className='text-sm text-muted-foreground'>{feature.feature_description}</p>
                    </div>
                    <div className='flex items-center self-center ml-4'>
                      <input
                        type='checkbox'
                        checked={feature.selected}
                        onChange={(e) => {
                          e.stopPropagation()
                          setAvailableFeatures(
                            availableFeatures.map((f) =>
                              f.id === feature.id ? { ...f, selected: e.target.checked } : f,
                            ),
                          )
                        }}
                        className='h-4 w-4'
                      />
                    </div>
                  </div>
                ))}
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

          <TabsContent value='define' className='space-y-4'>
            <h3 className='text-lg font-semibold'>Define New Feature</h3>

            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='feature-type'>Feature Type</Label>
                <Select
                  value={newFeatureType}
                  onValueChange={(value) => {
                    setNewFeatureType(value as 'parent' | 'text' | 'number' | 'enum')
                    // Clear enum options when switching away from enum type
                    if (value !== 'enum') {
                      setEnumOptions([''])
                    }
                  }}
                >
                  <SelectTrigger className='w-[180px]'>
                    <SelectValue placeholder='Select feature type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='parent'>Parent (Container)</SelectItem>
                    <SelectItem value='text'>Text</SelectItem>
                    <SelectItem value='number'>Number</SelectItem>
                    <SelectItem value='boolean'>Boolean</SelectItem>
                    <SelectItem value='enum'>Multiple Choice (Enum)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='parent-feature'>Parent Feature (Optional)</Label>
                <Select
                  value={newFeatureParent || 'root'}
                  onValueChange={(value) => setNewFeatureParent(value === 'root' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select parent feature or leave empty for root' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='root'>Root Level</SelectItem>
                    {getAvailableParents().map((parent) => (
                      <SelectItem key={parent.feature_identifier} value={parent.feature_identifier}>
                        {generateTrail(parent.feature_identifier)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='feature-name'>Feature Name</Label>
                <Input
                  id='feature-name'
                  type='text'
                  value={newFeatureName}
                  onChange={(e) => setNewFeatureName(e.target.value)}
                  placeholder='e.g., experiment_name, participant_count'
                />
                <p className='text-sm text-muted-foreground'>
                  Will generate identifier: {generateFeatureIdentifier()}
                  <br />
                  Trail: {generateTrail(generateFeatureIdentifier())}
                </p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='feature-description'>Description</Label>
                <Input
                  id='feature-description'
                  type='text'
                  value={newFeatureDescription}
                  onChange={(e) => setNewFeatureDescription(e.target.value)}
                  placeholder='Brief description of what this feature captures'
                  spellCheck
                />
              </div>

              {newFeatureType !== 'parent' && (
                <div className='space-y-2'>
                  <Label htmlFor='feature-prompt'>GPT Prompt</Label>
                  <Textarea
                    id='feature-prompt'
                    value={newFeaturePrompt}
                    onChange={(e) => setNewFeaturePrompt(e.target.value)}
                    placeholder='Prompt for AI to extract this feature from text'
                    className='min-h-[100px]'
                    spellCheck
                  />
                </div>
              )}

              {newFeatureType === 'enum' && (
                <div className='space-y-2'>
                  <Label>Enum Options</Label>
                  {enumOptions.map((option, index) => (
                    <div key={index} className='flex gap-2'>
                      <Input
                        value={option}
                        onChange={(e) => handleEnumOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => handleRemoveEnumOption(index)}
                        disabled={enumOptions.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button type='button' variant='outline' size='sm' onClick={handleAddEnumOption}>
                    Add Option
                  </Button>
                </div>
              )}
            </div>

            <div className='flex justify-end space-x-2'>
              <Button variant='outline' onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleAddNewFeature}
                disabled={isSubmitting || !newFeatureName.trim()}
              >
                {isSubmitting ? 'Adding...' : 'Add Feature'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default SelectFeatures
