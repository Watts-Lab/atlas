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
    data: null,
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
        data: null,
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
          name:
            type === "SingleOutputNode" ? "single_output" : "multiple_output",
            measurement: "Choose an option",
          prompt: "LLM prompt.",
          maxLength: 60,
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
