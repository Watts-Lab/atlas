import { useCallback } from "react";
import { Handle, Position } from "reactflow";

function SingleOutputNode({ data, isConnectable }) {
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

      <div className=" border-2 border-gray-500 w-24 h-24 flex items-center justify-center bg-green-400">
        <p className="text-base text-center font-bold">Single Output</p>
      </div>

      <Handle
        className="!w-3"
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

export default SingleOutputNode;
