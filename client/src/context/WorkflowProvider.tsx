import React, { useCallback } from "react";
import { WorkflowContext } from "./WorkflowProvider.types";
import { Node, Edge } from "reactflow";

const defaultNodes = [
  {
    id: "node-1",
    type: "PaperInputNode",
    position: { x: 0, y: 0 },
    draggable: false,
    data: {
      name: "undefined",
      measurement: "Choose an option",
      prompt: "undefined",
      maxLength: 0,
    },
  },
  {
    id: "node-2",
    type: "MultipleOutputNode",
    position: { x: 150, y: 300 },
    data: {
      name: "paper_title",
      measurement: "GPT-3.5",
      prompt:
        "This is the node's prompt content, which is a string, and it can be up to 50 characters long.",
      maxLength: 60,
    },
  },
  {
    id: "node-3",
    type: "SingleOutputNode",
    position: { x: -150, y: 300 },
    isConnectable: true,
    data: {
      name: "paper_abstract",
      measurement: "GPT-4",
      prompt:
        "This is the node's prompt content, which is a string, and it can be up to 50 characters long.",
      maxLength: 60,
    },
  },
];

const WorkflowProvider = ({ children }: { children: React.ReactNode }) => {
  const saveWorkflow = useCallback((nodes: Node[], edges: Edge[]) => {
    localStorage.setItem("workflowNodes", JSON.stringify(nodes));
    localStorage.setItem("workflowEdges", JSON.stringify(edges));
  }, []);

  const loadWorkflow = useCallback(() => {
    const nodes = localStorage.getItem("workflowNodes");
    const edges = localStorage.getItem("workflowEdges");
    return {
      nodes: nodes ? JSON.parse(nodes) : (defaultNodes as Node[]),
      edges: edges ? JSON.parse(edges) : ([] as Edge[]),
    };
  }, []);

  return (
    <WorkflowContext.Provider value={{ saveWorkflow, loadWorkflow }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export default WorkflowProvider;
