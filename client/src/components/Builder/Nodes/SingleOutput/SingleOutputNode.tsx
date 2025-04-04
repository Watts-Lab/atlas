import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Handle, Position } from '@xyflow/react'

type SingleOutputNodeProps = {
  isConnectable: boolean | undefined
  className?: string
  selected?: boolean
  data: {
    name: string
    measurement: string
    prompt: string
    maxLength: number
  }
}

function SingleOutputNode({ isConnectable, selected, data }: SingleOutputNodeProps) {
  const { name, measurement, prompt } = data

  return (
    <div className='relative'>
      <Handle type='target' position={Position.Top} isConnectable={isConnectable} />
      <Card
        className={`
          w-52 h-24 
          overflow-hidden 
          rounded-md 
          shadow-sm 
          bg-card
          ${selected ? 'border-2 border-border' : 'border border-border'}
          bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-800
        `}
      >
        <CardHeader className='p-2 pb-1'>
          <div className='flex justify-between items-center'>
            <CardTitle className='text-sm font-bold truncate'>{name}</CardTitle>
            {measurement !== 'Choose an option' && (
              <Badge variant='secondary' className='truncate'>
                {measurement}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className='px-2 py-0'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className='text-xs text-justify whitespace-normal line-clamp-3 overflow-hidden text-ellipsis cursor-help'>
                  {prompt}
                </p>
              </TooltipTrigger>
              <TooltipContent className='max-w-sm'>
                <p className='text-xs'>{prompt}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>
      <Handle type='source' position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  )
}

export const displayGroup = 'LLMs'
export const displayName = 'Single output feature'
export default SingleOutputNode
