import React from "react";

export interface WorkflowContextType {
  saveWorkflow: (nodes: any[], edges: any[]) => void;
}

export const WorkflowContext = React.createContext<WorkflowContextType>({
  saveWorkflow: () => {},

});
