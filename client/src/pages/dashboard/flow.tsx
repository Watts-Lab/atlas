import React, { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
} from "reactflow";

import PromptNode from "./promptnode";

import "reactflow/dist/style.css";

const rfStyle = {
  backgroundColor: "#dedede",
};

const initialNodes = [
  {
    id: "1",
    type: "PromptNode",
    position: { x: 0, y: 0 },
    data: {
      selects: {
        "handle-0": "default",
      },
      text: "Hello, world!",
    },
  },
];

const initialEdges = [];

const nodeTypes = { PromptNode: PromptNode };

function Flow() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  useEffect(() => {
    // Add nodes 2 and 3 after a 5-second delay
    const nodesTimer = setTimeout(() => {
      setNodes((prevNodes) => [
        ...prevNodes,
        {
          id: "2",
          type: "PromptNode",
          position: { x: -150, y: 300 },
          data: {
            selects: {
              "handle-0": "default",
            },
          },
        },
        {
          id: "3",
          type: "PromptNode",
          position: { x: 150, y: 300 },
          data: {
            selects: {
              "handle-0": "default",
            },
          },
        },
      ]);
    }, 5000);

    // Add the edge after a 5-second delay
    const edgesTimer = setTimeout(() => {
      setEdges((prevEdges) => [
        ...prevEdges,
        {
          id: "1-2",
          source: "1",
          target: "2",
          label: "Edge 1-2",
          animated: true,
          labelBgStyle: { fill: "#dedede", fillOpacity: 0.5 },
        },
        {
          id: "1-3",
          source: "1",
          target: "3",
          label: "Edge 1-3",
          animated: true,
          labelBgStyle: { fill: "#dedede", fillOpacity: 0.5 },
        },
      ]);
    }, 5000);

    return () => {
      clearTimeout(nodesTimer);
      clearTimeout(edgesTimer);
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", zIndex: -1 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        style={rfStyle}
      >
        <Controls />
        {/* <MiniMap /> */}
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

export default Flow;
