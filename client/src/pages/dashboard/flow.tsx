import React, { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  ReactFlowProvider,
  useReactFlow,
  MiniMap,
  Controls,
  Background,
  Panel,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
} from "reactflow";

import dagre from "dagre";

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

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 300;
const nodeHeight = 500;

const getLayoutedElements = (nodes, edges, direction = "TB") => {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? "left" : "top";
    node.sourcePosition = isHorizontal ? "right" : "bottom";

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};

const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
  initialNodes,
  initialEdges
);

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

  const onLayout = useCallback(
    (direction) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges, direction);

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges]
  );

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
        <Background variant="dots" gap={12} size={1} />
        <Panel position="top-right">
          <div className="join join-vertical">
            <button className="btn btn-xs join-item" onClick={() => onLayout("TB")}>
              vertical layout
            </button>
            <button className="btn btn-xs join-item" onClick={() => onLayout("LR")}>
              horizontal layout
            </button>
          </div>
        </Panel>
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
