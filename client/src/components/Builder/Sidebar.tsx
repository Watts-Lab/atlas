import { DragEvent, useEffect, useState } from "react";
import DetailRenderer from "./DetailRenderer";
import { loadNodeTypes } from "./Nodes";

type SidebarProps = {
  selectedNode: any;
};

const Sidebar = ({ selectedNode }: SidebarProps) => {
  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const [nodeType, setNodeType] = useState("");
  const [availableNodeTypes, setAvailableNodeTypes] = useState<
    { type: string; displayName: string; displayGroup: string }[]
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      return await loadNodeTypes().then((data) => {
        return setAvailableNodeTypes(data);
      });
    };

    fetchData();
    setNodeType(selectedNode?.type);
  }, [selectedNode]);

  return (
    <aside className="lg:w-2/6 border-l border-gray-300 p-4 bg-white">
      <div className="description">
        <h2 className="text-xl font-bold">Acticle Features</h2>
        <p className="text-gray-500">
          A Set of features for knowledge extraction.
        </p>
      </div>

      <div className="flex flex-col w-full">
        <div className="divider !my-1">Providers</div>
      </div>
      {availableNodeTypes.map((node, _index) => {
        if (node.displayGroup === "Providers") {
          return (
            <div
              key={`${node.type}_${_index}`}
              onDragStart={(event) => onDragStart(event, node.type)}
              draggable
              className="btn btn-xs w-full mb-2 no-animation"
            >
              {node.displayName}
            </div>
          );
        }
      })}

      <div className="flex flex-col w-full">
        <div className="divider !my-1">LLM extractors</div>
      </div>
      {availableNodeTypes.map((node, _index) => {
        if (node.displayGroup === "LLMs") {
          return (
            <div
              key={`${node.type}_${_index}`}
              onDragStart={(event) => onDragStart(event, node.type)}
              draggable
              className="btn btn-xs w-full mb-2 no-animation"
            >
              {node.displayName}
            </div>
          );
        }
      })}

      <div className="flex flex-col w-full">
        <div className="divider !my-1">Human extractors</div>
      </div>
      {availableNodeTypes.map((node, _index) => {
        if (node.displayGroup === "Humans") {
          return (
            <div
              key={`${node.type}_${_index}`}
              onDragStart={(event) => onDragStart(event, node.type)}
              draggable
              className="btn btn-xs w-full mb-2 no-animation"
            >
              {node.displayName}
            </div>
          );
        }
      })}

      {/* Display the selected node ID */}
      {nodeType && (
        <>
          <DetailRenderer nodeType={nodeType} />
        </>
      )}
    </aside>
  );
};

export default Sidebar;
