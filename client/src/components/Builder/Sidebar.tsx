import { DragEvent, useEffect, useState } from 'react'
import DetailRenderer from './DetailRenderer'
import { loadNodeTypes } from './Nodes'

type SidebarProps = {
  selectedNode: any
  setNodes: any
}

const Sidebar = ({ selectedNode, setNodes }: SidebarProps) => {
  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const [nodeType, setNodeType] = useState('')
  const [availableNodeTypes, setAvailableNodeTypes] = useState<
    { type: string; displayName: string; displayGroup: string }[]
  >([])

  useEffect(() => {
    const fetchData = async () => {
      return await loadNodeTypes().then((data) => {
        return setAvailableNodeTypes(data)
      })
    }

    fetchData()
  }, [])

  useEffect(() => {
    setNodeType(selectedNode?.type)
  }, [selectedNode])

  return (
    <aside className='lg:w-2/6 border-l border-gray-300 p-4 bg-white'>
      <div className='flex flex-col w-full'>
        <div className='divider !my-1'>Extractors</div>
      </div>
      {availableNodeTypes.map((node, _index) => {
        if (node.displayGroup === 'LLMs') {
          return (
            <div
              key={`${node.type}_${_index}`}
              onDragStart={(event) => onDragStart(event, node.type)}
              draggable
              className='btn btn-xs w-full mb-2 no-animation'
            >
              {node.displayName}
            </div>
          )
        }
      })}

      {/* Display the selected node ID */}
      <div className='flex flex-col w-full'>
        <div className='divider !my-1'>Node settings</div>
      </div>
      {nodeType && (
        <>
          <DetailRenderer nodeType={nodeType} setNodes={setNodes} selectedNode={selectedNode} />
        </>
      )}
    </aside>
  )
}

export default Sidebar
