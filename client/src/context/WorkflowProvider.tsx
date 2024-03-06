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

  const sendToBackend = useCallback((nodes: Node[], edges: Edge[]) => {
    const simplifiedNodes = nodes.map(({ id, data }) => ({ id, data }));

    const simplifiedEdges = edges.map(({ source, target }) => ({
      source,
      target,
    }));

    fetch("http://127.0.0.1:8000/api/workflow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nodes: simplifiedNodes, edges: simplifiedEdges }),
    })
      .then((response) => {
        if (response.ok) {
          console.log("Nodes and edges sent to the backend successfully");
        } else {
          console.error("Failed to send nodes and edges to the backend");
        }
      })
      .catch((error) => {
        console.error(
          "Error occurred while sending nodes and edges to the backend:",
          error
        );
      });
  }, []);

  return (
    <WorkflowContext.Provider
      value={{ saveWorkflow, loadWorkflow, sendToBackend }}
    >
      {children}
    </WorkflowContext.Provider>
  );
};

export default WorkflowProvider;
