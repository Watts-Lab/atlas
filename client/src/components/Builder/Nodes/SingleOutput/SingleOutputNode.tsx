import { Handle, Position } from "reactflow";

type SingleOutputNodeProps = {
  isConnectable: boolean | undefined;
  className?: string;
  data: {
    name: string;
    text: string; // Add a prop for text content
    maxLength: number;
  };
};

function SingleOutputNode({
  isConnectable,
  className,
  data,
}: SingleOutputNodeProps) {
  const { name, text, maxLength } = data;

  const trimmedText =
    text?.length ?? 0 > maxLength ? text?.slice(0, maxLength) + "..." : text;

  return (
    <div className={`paper-input-node ${className}`}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />

      <div
        className={`${className} border-gray-500 w-52 h-20 p-2 bg-slate-300 rounded`}
      >
        <div className="flex justify-between items-start">
          <p className=" text-sm font-bold">{name}</p>
          <span className="badge badge-md badge-neutral text-xs">GPT-4</span>
        </div>
        <p className="mt-2 text-xs text-justify">{trimmedText}</p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
      />
    </div>
  );
}
export const displayGroup = "LLMs";
export const displayName = "Single output feature";

export default SingleOutputNode;
