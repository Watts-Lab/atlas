import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Copy, File } from 'lucide-react'
import { Feature } from '../feature.types'

interface FeatureDetailProps {
  feature: Feature | null
  isSelected: boolean
  onEdit: (feat: Feature) => void
  onDelete: () => void
  onCopy: (feat: Feature) => void
  onToggleSelect?: (feat: Feature, selected: boolean) => void
  showSelect?: boolean
}

export const FeatureDetail: React.FC<FeatureDetailProps> = ({
  feature,
  isSelected,
  onEdit,
  onDelete,
  onCopy,
  onToggleSelect,
  showSelect = true,
}) => {
  if (!feature) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground'>
        <File className='w-12 h-12 mb-4 opacity-20' />
        <p>Select a feature from the list to view details</p>
      </div>
    )
  }

  return (
    <div className='flex flex-col h-full min-h-0'>
      <div className='p-4 border-b bg-background/50 shrink-0'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex-1 min-w-0'>
            <h4 className='font-semibold text-lg break-all leading-tight'>
              {feature.feature_identifier}
            </h4>
            <div className='flex items-center gap-2 mt-2 h-5'>
              <Badge variant='secondary' className='capitalize'>
                {feature.feature_type}
              </Badge>
              {feature.is_shared && <Badge variant='outline'>Shared</Badge>}
              <div className='flex items-center gap-2 ml-2'>
                <span className='text-[10px] text-muted-foreground uppercase tracking-tight font-medium whitespace-nowrap'>
                  <b>Owner:</b> {feature.created_by}
                </span>
                {feature.version && (
                  <Badge
                    variant='outline'
                    className='text-[10px] px-1 py-0 h-4 border-muted-foreground/20 text-muted-foreground font-normal'
                  >
                    <b>Version:</b> {feature.version}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {showSelect ? null : (
            <div className='flex items-center gap-1.5 shrink-0'>
              {feature.created_by === 'user' && (
                <>
                  <Button
                    size='xs'
                    variant='outline'
                    onClick={() => onEdit(feature)}
                    className='h-8 w-8 p-0 @[400px]:w-auto @[400px]:px-2.5 @[400px]:gap-1.5'
                    title='Edit Feature'
                  >
                    <Pencil className='w-3.5 h-3.5' />
                    <span className='hidden @[400px]:inline'>Edit</span>
                  </Button>
                  <Button
                    size='xs'
                    variant='outline'
                    onClick={onDelete}
                    className='h-8 w-8 p-0 @[400px]:w-auto @[400px]:px-2.5 @[400px]:gap-1.5 text-destructive hover:text-destructive'
                    title='Delete Feature'
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                    <span className='hidden @[400px]:inline'>Delete</span>
                  </Button>
                </>
              )}
              <Button
                size='xs'
                variant='outline'
                onClick={() => onCopy(feature)}
                className='h-8 w-8 p-0 @[400px]:w-auto @[400px]:px-2.5 @[400px]:gap-1.5'
                title='Copy Feature'
              >
                <Copy className='w-3.5 h-3.5' />
                <span className='hidden @[400px]:inline'>Copy</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className='flex-1 p-4 overflow-y-auto'>
        <div className='space-y-4'>
          <div>
            <Label className='text-xs text-muted-foreground uppercase tracking-wider font-bold'>
              Description
            </Label>
            <p className='mt-1 text-sm'>
              {feature.feature_description || (
                <span className='text-muted-foreground italic'>No description</span>
              )}
            </p>
          </div>

          <Separator />

          {feature.feature_type === 'enum' && feature.feature_enum_options && (
            <div>
              <Label className='text-xs text-muted-foreground uppercase tracking-wider font-bold'>
                Options
              </Label>
              <div className='flex flex-wrap gap-1 mt-2'>
                {feature.feature_enum_options.map((opt, i) => (
                  <Badge key={i} variant='outline' className='bg-background'>
                    {opt}
                  </Badge>
                ))}
              </div>
              <Separator className='mt-4' />
            </div>
          )}

          {feature.feature_prompt && (
            <div>
              <Label className='text-xs text-muted-foreground uppercase tracking-wider font-bold'>
                Extraction Prompt
              </Label>
              <div className='mt-2 p-2 bg-muted rounded-md text-xs font-mono whitespace-pre-wrap break-words'>
                {feature.feature_prompt}
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
                <span className='text-muted-foreground'>Ground Truth Accuracy</span>
                <span className='font-medium text-xs'>
                  {feature.ground_truth_accuracy !== undefined ? (
                    `${Math.round(feature.ground_truth_accuracy * 100)}%`
                  ) : (
                    <span className='text-muted-foreground italic font-normal'>Not evaluated</span>
                  )}
                </span>
              </div>
              {feature.ground_truth_accuracy !== undefined && (
                <Progress value={feature.ground_truth_accuracy * 100} className='h-1.5' />
              )}
            </div>

            <div className='space-y-1.5'>
              <div className='flex justify-between text-xs'>
                <span className='text-muted-foreground'>Repeatability Score</span>
                <span className='font-medium text-xs'>
                  {feature.repeatability_score !== undefined ? (
                    `${Math.round(feature.repeatability_score * 10)}/10`
                  ) : (
                    <span className='text-muted-foreground italic font-normal'>Not evaluated</span>
                  )}
                </span>
              </div>
              {feature.repeatability_score !== undefined && (
                <Progress value={feature.repeatability_score * 100} className='h-1.5' />
              )}
            </div>
          </div>
        </div>
      </div>
      {showSelect && onToggleSelect && (
        <div className='p-3 border-t bg-background/50 flex justify-end gap-2 shrink-0 @container'>
          {feature.created_by === 'user' && (
            <>
              <Button
                size='xs'
                variant='outline'
                onClick={() => onEdit(feature)}
                className='gap-1.5'
                title='Edit Feature'
              >
                <Pencil className='w-3.5 h-3.5' />
                <span className='hidden @[300px]:inline'>Edit</span>
              </Button>
              <Button
                size='xs'
                variant='outline'
                onClick={onDelete}
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
            onClick={() => onCopy(feature)}
            className='gap-1.5'
            title='Copy Feature'
          >
            <Copy className='w-3.5 h-3.5' />
            <span className='hidden @[300px]:inline'>Copy</span>
          </Button>
          <Button
            size='xs'
            variant={isSelected ? 'secondary' : 'default'}
            onClick={() => onToggleSelect(feature, !isSelected)}
          >
            {isSelected ? 'Remove Selection' : 'Select Feature'}
          </Button>
        </div>
      )}
    </div>
  )
}
