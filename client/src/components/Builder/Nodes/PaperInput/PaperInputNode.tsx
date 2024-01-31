import { useCallback } from "react";
import { Handle, Position } from "reactflow";

const handleStyle = { left: 10 };

function PaperInputNode({ data, isConnectable }) {
  const onChange = useCallback((evt) => {
    console.log(evt.target.value);
  }, []);

  return (
    <div className="paper-input-node">
      <div className="border-dashed border-2 border-gray-500 rotate-45 w-24 h-24 flex items-center justify-center">
        <h1 className="text-center text-lg font-bold rotate-[-45deg]">
          Papers
        </h1>
      </div>

      <Handle
        id="paper-handle"
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{
          zIndex: 999,
          width: "10px",
          height: "10px",
          bottom: "-24px",
        }}
      />
    </div>
  );
}

export default PaperInputNode;
