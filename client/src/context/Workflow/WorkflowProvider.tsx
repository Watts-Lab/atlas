import React, { createContext, useCallback, useEffect, useState } from 'react'
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowInstance,
} from '@xyflow/react'
import ELK from 'elkjs/lib/elk.bundled.js'
import { Feature } from '@/components/View/DataGrid/feature.types'

interface WorkflowContextType {
  nodes: Node[]
  edges: Edge[]
  selectedFeatureIds: string[]
  setSelectedFeatureIds: React.Dispatch<React.SetStateAction<string[]>>
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (params: Edge | Connection) => void
  addFeatureChain: (
    childFeatureId: string,
    allFeatures: Feature[],
    createNodeData: (f: Feature) => Node['data'],
  ) => void
  removeFeature: (featureId: string) => void
  saveWorkflow: () => void
  loadWorkflow: () => void
  resetWorkflow: () => void
  reactFlowInstance: ReactFlowInstance | undefined
  setReactFlowInstance: React.Dispatch<React.SetStateAction<ReactFlowInstance | undefined>>
}

function loadJsonFromLS<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : fallback
  } catch {
    return fallback
  }
}

export const WorkflowContext = createContext<WorkflowContextType>({} as WorkflowContextType)

const defaultNodes: Node[] = []
const defaultEdges: Edge[] = []

// Helper function to get parent identifier
function getParentIdentifier(identifier: string): string | null {
  const parts = identifier.split('.')
  if (parts.length <= 1) return null

  let last = parts.pop()!
  if (last === 'parent') {
    if (parts.length === 0) return null
    last = parts.pop()!
    parts.push('parent')
  } else {
    parts.push('parent')
  }

  const parent = parts.join('.')
  return parent !== identifier ? parent : null
}

/**
 * getParentChain:
 * For "paper.experiments.condition.name",
 * we get:
 * 1) "paper.experiments.condition.parent"
 * 2) "paper.experiments.parent"
 * 3) "paper.parent"
 * 4) (possibly more if deeper)...
 */
function getParentChain(identifier: string): string[] {
  const chain: string[] = []
  let current = identifier
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const parent = getParentIdentifier(current)
    if (!parent || parent === current) break
    chain.push(parent)
    current = parent
  }
  console.log(chain)
  return chain
}

const elk = new ELK()

export const WorkflowProvider = ({ children }: { children: React.ReactNode }) => {
  // State to manage nodes, edges, and selected feature IDs
  const [nodes, setNodes] = useState<Node[]>(() => loadJsonFromLS('workflowNodes', defaultNodes))
  const [edges, setEdges] = useState<Edge[]>(() => loadJsonFromLS('workflowEdges', defaultEdges))
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>(() =>
    loadJsonFromLS('selectedFeatureIds', []),
  )

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance>()

  const saveWorkflow = useCallback(() => {
    localStorage.setItem('workflowNodes', JSON.stringify(nodes))
    localStorage.setItem('workflowEdges', JSON.stringify(edges))
    localStorage.setItem('selectedFeatureIds', JSON.stringify(selectedFeatureIds))
  }, [nodes, edges, selectedFeatureIds])

  useEffect(() => {
    saveWorkflow()
  }, [nodes, edges, selectedFeatureIds, saveWorkflow])

  const loadWorkflow = useCallback(() => {
    const loadedNodes = loadJsonFromLS<Node[]>('workflowNodes', defaultNodes)
    const loadedEdges = loadJsonFromLS<Edge[]>('workflowEdges', defaultEdges)
    const loadedSelected = loadJsonFromLS<string[]>('selectedFeatureIds', [])
    setNodes(loadedNodes)
    setEdges(loadedEdges)
    setSelectedFeatureIds(loadedSelected)
  }, [])

  const resetWorkflow = useCallback(() => {
    setNodes(defaultNodes)
    setEdges(defaultEdges)
    setSelectedFeatureIds([])
    // Remove from localStorage as well
    localStorage.removeItem('workflowNodes')
    localStorage.removeItem('workflowEdges')
    localStorage.removeItem('selectedFeatureIds')
  }, [])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds))
    },
    [setNodes],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds))
    },
    [setEdges],
  )

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      setEdges((eds) => addEdge({ ...params }, eds))
    },
    [setEdges],
  )

  const layoutGraph = useCallback(async () => {
    if (!reactFlowInstance) return
    const currentNodes = reactFlowInstance.getNodes()
    const currentEdges = reactFlowInstance.getEdges()
    if (!currentNodes || currentNodes.length === 0) return

    // Set the graph layout options
    const graph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.spacing.nodeNode': '80',
      },
      children: currentNodes.map((n: Node) => ({
        id: n.id,
        width: 160,
        height: 60,
      })),
      edges: currentEdges.map((e: Edge) => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target],
      })),
    }

    try {
      const layouted = await elk.layout(graph)
      const layoutedChildren = layouted.children || []

      // Update node positions
      const updatedNodes = currentNodes.map((n: Node) => {
        const layoutInfo = layoutedChildren.find((c) => c.id === n.id)
        if (!layoutInfo) return n
        return {
          ...n,
          position: {
            x: layoutInfo.x || 0,
            y: layoutInfo.y || 0,
          },
          draggable: false,
        }
      })
      setNodes(updatedNodes)

      reactFlowInstance.fitView()
    } catch (err) {
      console.error('ELK layout error:', err)
    }
  }, [reactFlowInstance, setNodes])

  // Add chain of features (child + parents)
  const addFeatureChain = useCallback(
    (
      childFeatureId: string,
      allFeatures: Feature[],
      createNodeData: (f: Feature) => Node['data'],
    ) => {
      const childFeature = allFeatures.find((f) => f.id === childFeatureId)
      if (!childFeature) return

      // Get the entire chain of parent identifiers
      const chainParents = getParentChain(childFeature.feature_identifier)
      const chainIdentifiers = [childFeature.feature_identifier, ...chainParents]

      const chainFeatures = chainIdentifiers
        .map((ident) => allFeatures.find((f) => f.feature_identifier === ident))
        .filter((f): f is Feature => !!f)

      const newNodes: Node[] = []
      const newEdges: Edge[] = []

      // Convert chain of features into a node for each if missing
      // Then link each parent -> child in order
      for (let i = 0; i < chainFeatures.length; i++) {
        const feat = chainFeatures[i]
        const nodeId = `feature-node-${feat.id}`

        // If node is missing, create it
        if (!nodes.some((nd) => nd.id === nodeId)) {
          newNodes.push({
            id: nodeId,
            type: 'SingleOutputNode',
            position: { x: 0, y: 0 },
            data: createNodeData(feat),
          })
        }

        const next = chainFeatures[i + 1]
        if (next) {
          const nextId = `feature-node-${next.id}`
          const edgeId = `edge-${next.id}-${feat.id}`
          if (!edges.some((e) => e.id === edgeId)) {
            newEdges.push({
              id: edgeId,
              source: nextId,
              target: nodeId,
            })
          }
        }
      }

      setNodes((nds) => [...nds, ...newNodes])
      setEdges((eds) => [...eds, ...newEdges])

      setTimeout(() => layoutGraph(), 0)
    },
    [nodes, edges, setNodes, setEdges, layoutGraph],
  )

  // Remove a feature node (parents remain)
  const removeFeature = useCallback(
    (featureId: string) => {
      const nodeId = `feature-node-${featureId}`
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
      setTimeout(() => layoutGraph(), 0)
    },
    [setNodes, setEdges, layoutGraph],
  )

  const value: WorkflowContextType = {
    nodes,
    edges,
    selectedFeatureIds,
    setSelectedFeatureIds,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addFeatureChain,
    removeFeature,
    saveWorkflow,
    loadWorkflow,
    resetWorkflow,
    reactFlowInstance,
    setReactFlowInstance,
  }

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
}
