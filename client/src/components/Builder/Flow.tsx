import { useState, useRef, useCallback, useEffect } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  useStore,
  Panel,
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
  MTurkOutputNode,
} from "./Nodes/index";

const initialNodes = [
  {
    id: "node-1",
    type: "PaperInputNode",
    position: { x: 0, y: 0 },
    data: { value: 123, label: "paper node", variable: "context" },
  },
  {
    id: "node-2",
    type: "MultipleOutputNode",
    position: { x: 0, y: 200 },
    data: { value: 123, label: "paper node", variable: "condition_name" },
  },
  {
    id: "node-3",
    type: "SingleOutputNode",
    position: { x: 300, y: 200 },
    data: { value: 123, label: "paper node", variable: "condition_num" },
  },
];

const nodeTypes = {
  PaperInputNode,
  SingleOutputNode,
  MultipleOutputNode,
  MTurkOutputNode,
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

  const onInit = useCallback((rfInstance: any) => {
    setReactFlowInstance(rfInstance);
  }, []);

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      const { source } = params;
      const sourceNode = nodes.find((node) => node.id === source);
      const label =
        sourceNode?.data?.variable || sourceNode?.data?.variable || "";

      const edgeWithLabel = {
        ...params,
        label,
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
            nodes={nodes}
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

        <Panel position="bottom-left">
          <div className="flex flex-col gap-1 text-start">
            <button className="btn btn-sm btn-wide join-item">Run all</button>
            <button className="btn btn-sm btn-wide join-item">
              Export data
            </button>
            <button className="btn btn-sm btn-wide join-item">
              Export workflow
            </button>
          </div>
        </Panel>
        <Sidebar selectedNode={selectedNode} />
      </ReactFlowProvider>
    </div>
  );
};

export default Flow;
