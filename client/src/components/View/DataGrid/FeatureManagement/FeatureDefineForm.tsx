import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Feature } from '../feature.types'

interface FeatureDefineFormProps {
  type: 'number' | 'boolean' | 'text' | 'parent' | 'enum'
  setType: (type: 'number' | 'boolean' | 'text' | 'parent' | 'enum') => void
  isSharedFeature: boolean
  setIsSharedFeature: (shared: boolean) => void
  parent: string | null
  setParent: (parent: string) => void
  name: string
  setName: (name: string) => void
  desc: string
  setDesc: (desc: string) => void
  prompt: string
  setPrompt: (prompt: string) => void
  enumOpts: string[]
  setEnumOpts: (opts: string[] | ((prev: string[]) => string[])) => void
  availableFeatures: Feature[]
  isParentLocked: boolean
  editingFeatureId: string | null
  isCopying: boolean
  onSubmit: () => void
  onCancel: () => void
  submitting: boolean
}

export const FeatureDefineForm: React.FC<FeatureDefineFormProps> = ({
  type,
  setType,
  isSharedFeature,
  setIsSharedFeature,
  parent,
  setParent,
  name,
  setName,
  desc,
  setDesc,
  prompt,
  setPrompt,
  enumOpts,
  setEnumOpts,
  availableFeatures,
  isParentLocked,
  editingFeatureId,
  isCopying,
  onSubmit,
  onCancel,
  submitting,
}) => {
  return (
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
              onCheckedChange={() => setIsSharedFeature(!isSharedFeature)}
              id='is-shared'
            />
            <Label htmlFor='is-shared'>
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
                  {p.feature_name}
                  <span className='ml-2 text-[10px] text-muted-foreground font-mono opacity-50'>
                    ({p.feature_identifier.replace(/\.parent$/, '').replace(/\./g, ' → ')})
                  </span>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='feature-name'>Name</Label>
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
          <Label htmlFor='feature-prompt'>Prompt</Label>
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

      <div className='flex justify-end space-x-2 pt-4 border-t mt-4'>
        <Button variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Processing…' : editingFeatureId ? 'Update Feature' : 'Add Feature'}
        </Button>
      </div>
    </div>
  )
}
