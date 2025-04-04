import { Handle, Position } from '@xyflow/react'

type PaperInputNodeProps = {
  isConnectable: boolean | undefined
  data: {
    name?: string
    measurement?: string
    text?: string // Add a prop for text content
    maxLength?: number
  }
}

function PaperInputNode({ isConnectable }: PaperInputNodeProps) {
  return (
    <div className='paper-input-node'>
      <div className='border-dashed border-2 border-gray-500 rotate-45 w-24 h-24 flex items-center justify-center'>
        <h1 className='text-center text-lg font-bold rotate-[-45deg]'>Papers</h1>
      </div>

      <Handle
        className='!rounded-none'
        id='paper-handle'
        type='source'
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{
          zIndex: 999,
          width: '10px',
          height: '10px',
          bottom: '-24px',
        }}
      />
    </div>
  )
}

export const displayGroup = 'Providers'
export const displayName = 'Paper input node'
export default PaperInputNode
