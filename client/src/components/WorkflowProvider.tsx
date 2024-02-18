import React, { useCallback } from "react";
import { WorkflowContext } from "./Builder/workflow-context";
import { Node, Edge } from "reactflow";


const WorkflowProvider = ({ children }: { children: React.ReactNode }) => {
  const saveWorkflow = useCallback((nodes: Node[], edges: Edge[]) => {
    localStorage.setItem("workflowNodes", JSON.stringify(nodes));
    localStorage.setItem("workflowEdges", JSON.stringify(edges));
  }, []);

  return (
    <WorkflowContext.Provider value={{ saveWorkflow }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export default WorkflowProvider;
