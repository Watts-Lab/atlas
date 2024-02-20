import { Handle, Position } from "reactflow";

type MultipleOutputNodeProps = {
  isConnectable: boolean | undefined;
  className?: string;
  data: {
    name: string;
    measurement: string;
    prompt: string; // Add a prop for text content
    maxLength: number;
  };
};

function MultipleOutputNode({
  isConnectable,
  className,
  data,
}: MultipleOutputNodeProps) {
  const { name, measurement, prompt, maxLength = 60 } = data;

  const trimmedText =
    prompt.length > maxLength ? prompt.slice(0, maxLength) + "..." : prompt;

  return (
    <div className="paper-input-node">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />

      <div
        className={`${className} border-gray-500 w-52 h-20 p-2 bg-yellow-200 rounded`}
      >
        <div className="flex justify-between items-start">
          <p className=" text-sm font-bold">{name}</p>
          <span className="badge badge-md badge-neutral text-xs">
            {measurement === "Choose an option" ? "" : measurement}
          </span>
        </div>
        <p className="mt-2 text-xs text-justify">{trimmedText}</p>
      </div>

      <Handle
        className="!rounded-none"
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
      />
    </div>
  );
}

export const displayGroup = "LLMs";
export const displayName = "Multiple output feature";

export default MultipleOutputNode;
