import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  applyEdgeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import "./index.css";

import Sidebar from "./Sidebar";

// custom nodes
import {
  PaperInputNode,
  MultipleOutputNode,
  SingleOutputNode,
} from "./Nodes/index";

const initialNodes = [
  {
    id: "node-1",
    type: "paperInput",
    position: { x: 0, y: 0 },
    data: { value: 123, label: "paper node" },
  },
  {
    id: "node-2",
    type: "multipleOutput",
    position: { x: 100, y: 0 },
    data: { value: 123, label: "paper node" },
  },
  {
    id: "node-3",
    type: "singleoutput",
    position: { x: 300, y: 0 },
    data: { value: 123, label: "paper node" },
  },
];

const nodeTypes = {
  paperInput: PaperInputNode,
  multipleOutput: MultipleOutputNode,
  singleoutput: SingleOutputNode,
};

let id = 0;
const getId = () => `dndnode_${id++}`;

const Flow = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNode, setSelectedNode] = useState({
    id: null,
    type: null,
    data: null,
  });

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  
  const onSelectionChange = useCallback((elements) => {
    setSelectedNode(
      {
        id: elements.nodes[0]?.id,
        type: elements.nodes[0]?.type,
        data: elements.nodes[0]?.data,
      } || {
        id: null,
        type: null,
        data: null,
      }
    );
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData(
        "application/reactflow"
      ) as typeof nodeTypes;

      if (typeof type === "undefined" || !type) {
        return;
      }
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode = {
        id: getId(),
        type,
        position,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  return (
    <div className="dndflow">
      <ReactFlowProvider>
        <div className="reactflow-wrapper h-screen" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
          </ReactFlow>
        </div>
        <Sidebar
          nodes={nodes}
          setNodes={setNodes}
          selectedNode={selectedNode}
        />
      </ReactFlowProvider>
    </div>
  );
};

export default Flow;
