import { Handle, Position } from "reactflow";

type SingleOutputNodeProps = {
  isConnectable: boolean | undefined;
  className?: string;
  selected?: boolean;
  data: {
    name: string;
    measurement: string;
    prompt: string;
    maxLength: number;
  };
};

function SingleOutputNode({
  isConnectable,
  selected,
  data,
}: SingleOutputNodeProps) {
  const { name, measurement, prompt, maxLength = 60 } = data;

  const trimmedText =
    prompt.length > maxLength ? prompt.slice(0, maxLength) + "..." : prompt;

  return (
    <div className={`paper-input-node`}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />

      <div
        className={`border-2 w-52 h-24 p-2 bg-slate-300 rounded ${
          selected ? "border-slate-600" : "border-slate-300"
        }`}
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
