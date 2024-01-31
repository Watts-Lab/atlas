import { useCallback } from "react";
import { Handle, Position } from "reactflow";

function MultipleOutputNode({ data, isConnectable }) {
  const onChange = useCallback((evt) => {
    console.log(evt.target.value);
  }, []);

  return (
    <div className="paper-input-node">
      <Handle
        id="paper-handle"
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{
          zIndex: 999,
          width: "10px",
          height: "10px",
        }}
      />

      <div className="border-2 border-gray-500 w-24 h-24 flex items-center justify-center bg-cyan-400">
        <h1 className="text-center text-base font-bold">Multi Output</h1>
      </div>

      <Handle
        className="!w-4 !rounded-none"
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{
          zIndex: 999,
          width: "10px",
          height: "10px",
        }}
      />
    </div>
  );
}

export default MultipleOutputNode;
