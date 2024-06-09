import { useEffect, useState } from 'react'
import { Node, useNodes } from 'reactflow'
import { selectedNode } from '../../Flow.types'

type MeasurementOption = 'Choose an option' | 'GPT-4' | 'GPT-3.5' | 'Human'

type MultipleOutputDescriptionProps = {
  setNodes: React.Dispatch<React.SetStateAction<Node<string | undefined>[]>>
  selectedNode: selectedNode
}

const MultipleOutputDescription = ({ setNodes, selectedNode }: MultipleOutputDescriptionProps) => {
  const nodes = useNodes()
  const [nodeName, setNodeName] = useState('')
  const [measurement, setMeasurement] = useState<MeasurementOption>('Choose an option')
  const [prompt, setPrompt] = useState('')

  const thisNode: Node = nodes.find((node) => node.id === selectedNode.id)!

  useEffect(() => {
    if (thisNode) {
      setNodeName(thisNode?.data.name || '')
      setMeasurement(thisNode?.data.measurement || 'Choose an option')
      setPrompt(thisNode?.data.prompt || '')
    }
  }, [selectedNode.id])

  useEffect(() => {
    if (thisNode) {
      setNodes((oldNodes: Node[]) => {
        return oldNodes.map((node) => {
          if (node.id === thisNode.id) {
            return {
              ...node,
              data: {
                ...node.data,
                name: nodeName,
                measurement: measurement.toString(),
                prompt: prompt,
              },
            }
          }
          return node
        })
      })
    }
  }, [nodeName, measurement, prompt])

  return (
    <div>
      <form className='space-y-4'>
        <div className='form-control'>
          <label className='label' htmlFor='nodeName'>
            <span className='label-text'>Variable Name</span>
          </label>
          <input
            id='nodeName'
            type='text'
            placeholder='Variable name'
            className='input input-bordered input-sm w-full max-w-xs'
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
          />
        </div>
        <div className='form-control'>
          <label className='label' htmlFor='measurement'>
            <span className='label-text'>How is this feature measured?</span>
          </label>
          <select
            id='measurement'
            className='select select-bordered select-sm w-full max-w-xs'
            value={measurement}
            onChange={(e) => setMeasurement(e.target.value as MeasurementOption)}
          >
            <option disabled>Choose an option</option>
            <option>GPT-4</option>
            <option>GPT-3.5</option>
            <option>Human</option>
          </select>
        </div>
        <div className='form-control'>
          <label className='label' htmlFor='prompt'>
            <span className='label-text'>Prompt</span>
          </label>
          <textarea
            id='prompt'
            className='textarea textarea-bordered'
            placeholder='What is the title of this feature...'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          ></textarea>
        </div>
      </form>
    </div>
  )
}

export default MultipleOutputDescription
