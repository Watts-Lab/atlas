import { useState, useRef, useCallback, useEffect } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Connection,
  Edge,
  useStore,
  Panel,
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

  const onInit = useCallback((rfInstance) => {
    setReactFlowInstance(rfInstance);
  }, []);

  const zoomLevel = useStore((state) => state.transform[2]);

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

  useEffect(() => {
    console.log("onConnect", edges);
  }, [edges]);

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

      // adding some constant (75px) so when you release the node it's centers on your cursor
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - 75,
        y: event.clientY - 75,
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
            onInit={onInit}
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
