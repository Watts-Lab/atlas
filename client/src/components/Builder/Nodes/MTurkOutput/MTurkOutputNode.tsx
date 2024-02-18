import { Handle, Position } from "reactflow";

type MultipleOutputNodeProps = {
  isConnectable: boolean | undefined;
};

function MTurkOutputNode({ isConnectable }: MultipleOutputNodeProps) {
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

      <div className="border-2 border-gray-500 w-24 h-24 flex rounded items-center justify-center bg-orange-300">
        <h1 className="text-center text-base font-bold">MTurk Output</h1>
      </div>

      <Handle
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

export const displayGroup = "Humans";
export const displayName = "MTurk output node";

export default MTurkOutputNode;
