import React from 'react'
import { Edge, Node } from 'reactflow'

export interface WorkflowContextType {
  saveWorkflow: (nodes: Node[], edges: Edge[]) => void
  loadWorkflow: () => { nodes: Node[]; edges: Edge[] }
  sendToBackend: (nodes: Node[], edges: Edge[]) => void
}

export const WorkflowContext = React.createContext<WorkflowContextType>({
  saveWorkflow: () => {},
  loadWorkflow: () => ({ nodes: [], edges: [] }),
  sendToBackend: () => {},
})
