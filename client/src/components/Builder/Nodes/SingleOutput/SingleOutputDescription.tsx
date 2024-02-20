import { useEffect, useState } from "react";
import { Node, useNodes } from "reactflow";

type SingleOutputDescriptionProps = {
  setNodes: any;
};

const SingleOutputDescription = ({
  setNodes,
}: SingleOutputDescriptionProps) => {
  const nodes = useNodes();
  const [nodeName, setNodeName] = useState("");

  const thisNode: any = nodes.find((node) => node.id === "node-3");

  useEffect(() => {
    if (thisNode) {
      setNodeName(thisNode?.data.name || "");
    }
  }, []);

  useEffect(() => {
    if (thisNode) {
      // Modify node parameters here
      setNodes((oldNodes: Node[]) => {
        console.log(oldNodes);
        return oldNodes.map((node) => {
          if (node.id === "node-3") {
            return {
              ...node,
              data: {
                ...node.data,
                name: nodeName,
              },
            };
          }
          return node;
        });
      });
    }
  }, [nodeName]);

  return (
    <div>
      <form className="space-y-4">
        <div className="form-control">
          <label className="label" htmlFor="nodeName">
            <span className="label-text">Variable Name</span>
          </label>
          <input
            id="nodeName"
            type="text"
            placeholder="Variable name"
            className="input input-bordered input-sm w-full max-w-xs"
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
          />
        </div>

        <div className="form-control">
          <label className="label" htmlFor="measurement">
            <span className="label-text">How is this feature measured?</span>
          </label>
          <select
            id="measurement"
            className="select select-bordered select-sm w-full max-w-xs"
            defaultValue={"Choose an option"}
          >
            <option disabled>Choose an option</option>
            <option>GPT-4</option>
            <option>Amazon MTurk</option>
            <option>Gemini-2</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label" htmlFor="dataAppearance">
            <span className="label-text">Prompt</span>
          </label>
          <textarea
            id="dataAppearance"
            className="textarea textarea-bordered"
            placeholder="What is the title of this feature..."
          ></textarea>
        </div>
      </form>
    </div>
  );
};

export default SingleOutputDescription;
