import React from "react";
import { Edge, Node } from "reactflow";

export interface WorkflowContextType {
  saveWorkflow: (nodes: any[], edges: any[]) => void;
  loadWorkflow: () => { nodes: Node[]; edges: Edge[] };
}

export const WorkflowContext = React.createContext<WorkflowContextType>({
  saveWorkflow: () => {},
  loadWorkflow: () => ({ nodes: [], edges: [] }),
});
