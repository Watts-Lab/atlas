import { useState, useRef, useCallback } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node as ReactFlowNode,
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
    type: "PaperInputNode",
    position: { x: 0, y: 0 },
    draggable: false,
    data: {
      name: "undefined",
      text: "undefined",
      maxLength: 0,
    },
  },
  {
    id: "node-2",
    type: "MultipleOutputNode",
    position: { x: 150, y: 300 },
    data: {
      name: "Node 2",
      text: "This is the node's text content, which is a string, and it can be up to 50 characters long.",
      maxLength: 65,
    },
  },
  {
    id: "node-3",
    type: "SingleOutputNode",
    position: { x: -150, y: 300 },
    isConnectable: true,
    data: {
      name: "Node 3",
      text: "This is the node's text content, which is a string, and it can be up to 50 characters long.",
      maxLength: 65,
    },
  },
];

const nodeTypes = {
  PaperInputNode,
  SingleOutputNode,
  MultipleOutputNode,
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
    data: {
      name: undefined,
    },
  });

  const updatedNodes = nodes.map((node) => ({
    ...node,
    className: node.id === selectedNode.id ? "border-4" : "",
  }));

  const onInit = useCallback((rfInstance: any) => {
    setReactFlowInstance(rfInstance);
  }, []);

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      const edgeWithLabel = {
        ...params,
      };

      setEdges((eds) => addEdge(edgeWithLabel, eds));
    },
    [nodes]
  );

  const onSelectionChange = useCallback((elements: any) => {
    setSelectedNode(
      {
        id: elements.nodes[0]?.id,
        type: elements.nodes[0]?.type,
        data: elements.nodes[0]?.data,
      } || {
        id: null,
        type: null,
        data: { name: undefined },
      }
    );
  }, []);

  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: any) => {
      event.preventDefault();

      const type: string = event.dataTransfer.getData("application/reactflow");

      if (typeof type === "undefined") {
        return;
      }

      // adding some constant (75px) so when you release the node it's centers on your cursor
      const position = (reactFlowInstance as any).screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: ReactFlowNode = {
        id: getId(),
        type,
        position,
        data: {
          nullable: true,
          label: "new node",
          variable: "new variable",
          value: 0,
        },
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
            nodes={updatedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onInit={onInit}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          ></ReactFlow>
        </div>

        <Sidebar selectedNode={selectedNode} setNodes={setNodes} />
      </ReactFlowProvider>
    </div>
  );
};

export default Flow;
