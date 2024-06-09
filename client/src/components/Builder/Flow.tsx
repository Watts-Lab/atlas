/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef, useCallback } from 'react'
import ReactFlow, { addEdge, useNodesState, useEdgesState, Connection, Edge, Node } from 'reactflow'
import 'reactflow/dist/style.css'
import './index.css'

import Sidebar from './Sidebar'

// custom nodes
import { PaperInputNode, MultipleOutputNode, SingleOutputNode } from './Nodes/index'

const nodeTypes = {
  PaperInputNode,
  SingleOutputNode,
  MultipleOutputNode,
}

let id = 0
const getId = () => `dndnode_${id++}`

const Flow = ({ initialNodes, initialEdges }: { initialNodes: Node[]; initialEdges: Edge[] }) => {
  const reactFlowWrapper = useRef(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [selectedNode, setSelectedNode] = useState({
    id: null,
    type: null,
    data: null,
  })

  const onInit = useCallback((rfInstance: any) => {
    setReactFlowInstance(rfInstance)
  }, [])

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      const edgeWithLabel = {
        ...params,
      }

      setEdges((eds) => addEdge(edgeWithLabel, eds))
    },
    [nodes],
  )

  const onSelectionChange = useCallback((elements: any) => {
    setSelectedNode(
      // eslint-disable-next-line no-constant-binary-expression
      {
        id: elements.nodes[0]?.id,
        type: elements.nodes[0]?.type,
        data: elements.nodes[0]?.data,
      } || {
        id: null,
        type: null,
        data: null,
      },
    )
  }, [])

  const onDragOver = useCallback((event: any) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: any) => {
      event.preventDefault()

      const type: string = event.dataTransfer.getData('application/reactflow')

      if (typeof type === 'undefined') {
        return
      }

      // adding some constant (75px) so when you release the node it's centers on your cursor
      const position = (reactFlowInstance as any).screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: {
          name: type === 'SingleOutputNode' ? 'single_output' : 'multiple_output',
          measurement: 'Choose an option',
          prompt: 'LLM prompt.',
          maxLength: 60,
        },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance],
  )

  return (
    <div className='dndflow'>
      <div className='reactflow-wrapper h-screen' ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          onInit={onInit}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
        ></ReactFlow>
      </div>

      <Sidebar selectedNode={selectedNode} setNodes={setNodes} />
    </div>
  )
}

export default Flow
