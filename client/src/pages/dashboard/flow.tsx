import React, { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
} from "reactflow";

import Sidebar from "./sidebar";

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

const initialEdges: Edge[] = [];

const nodeTypes = { PromptNode: PromptNode };

let id = 0;
const getId = () => `dndnode_${id++}`;

function Flow() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

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
          type: "default",
          position: { x: -150, y: 300 },
          data: {
            selects: {
              "handle-0": "default",
            },
          },
        },
        {
          id: "3",
          type: "default",
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

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");

      // check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

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
      {/* <ReactFlowProvider>
        <div className="reactflow-wrapper" ref={reactFlowWrapper}>
         
        </div>
        <Sidebar />
      </ReactFlowProvider> */}
    </div>
  );
}

export default Flow;
