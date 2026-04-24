import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Copy } from 'lucide-react'
import { Feature } from '../feature.types'
import { generateTrail } from './featureUtils'

interface FeatureListProps {
  features: Feature[]
  activeFeatureId?: string
  onSelectFeature: (feat: Feature) => void
  onToggleSelect: (feat: Feature, selected: boolean) => void
  onCopy: (feat: Feature) => void
}

export const FeatureList: React.FC<FeatureListProps> = ({
  features,
  activeFeatureId,
  onSelectFeature,
  onToggleSelect,
  onCopy,
}) => {
  return (
    <div className='space-y-2'>
      {features.length === 0 ? (
        <div className='text-muted-foreground text-sm text-center py-8'>
          No features match your filters.
        </div>
      ) : (
        features.map((feat) => (
          <div
            key={feat.id}
            className={`relative flex justify-between items-start p-2 rounded-md cursor-pointer border transition-colors ${
              activeFeatureId === feat.id
                ? 'bg-accent border-primary/50'
                : 'hover:bg-accent/50 border-transparent'
            } ${feat.selected ? 'bg-secondary/50' : ''}`}
            onClick={() => onSelectFeature(feat)}
          >
            {/* Left side: Text info */}
            <div className='flex-grow space-y-1 pr-2 overflow-hidden'>
              <div className='flex items-center gap-1.5 overflow-hidden'>
                <p className='font-medium truncate'>
                  {feat.feature_name}
                </p>
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
              </div>
              <p className='text-[10px] font-mono text-muted-foreground truncate opacity-70'>
                {generateTrail(feat.feature_identifier)}
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
                  onToggleSelect(feat, e.target.checked)
                }}
                className='h-4 w-4 rounded border-gray-300'
              />

              {/* Icons */}
              <div className='flex items-center gap-2'>
                <button
                  title='Copy Feature'
                  onClick={(e) => {
                    e.stopPropagation()
                    onCopy(feat)
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
  )
}
