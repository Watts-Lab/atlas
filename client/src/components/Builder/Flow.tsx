import { useCallback } from 'react'
import { ReactFlow, Background, Controls, ReactFlowInstance } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './index.css'
// custom nodes
import { PaperInputNode, MultipleOutputNode, SingleOutputNode } from './Nodes'
import { useWorkflow } from '@/context/Workflow/useWorkflow'

const nodeTypes = {
  PaperInputNode,
  SingleOutputNode,
  MultipleOutputNode,
}

const Flow = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setReactFlowInstance } =
    useWorkflow()

  const onInit = useCallback(
    (instance: ReactFlowInstance) => {
      setReactFlowInstance(instance)
    },
    [setReactFlowInstance],
  )

  return (
    <div className='dndflow'>
      <div className='reactflow-wrapper h-screen'>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={onInit}
          nodeTypes={nodeTypes}
          proOptions={{ hideAttribution: true }}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}

export default Flow
