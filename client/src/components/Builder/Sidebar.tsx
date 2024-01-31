import React, { useCallback, useEffect } from "react";
import { useStore } from "reactflow";
import PaperInputNode from "./Nodes/PaperInput/PaperInputNode";

const transformSelector = (state) => state.transform;

type SidebarProps = {
  nodes: any;
  setNodes: any;
  selectedNode: any;
};

const Sidebar = ({ nodes, setNodes, selectedNode }: SidebarProps) => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  useEffect(() => {
    console.log(selectedNode);
  }, [selectedNode]);

  return (
    <aside className="lg:w-2/6 border-l border-gray-300 p-4 bg-white">
      <div className="description">
        <h2 className="text-xl font-bold">Acticle Features</h2>
        <p className="text-gray-500">
          A Set of features for knowledge extraction.
        </p>
      </div>

      <div
        className="dndnode"
        onDragStart={(event) => onDragStart(event, "paperInput")}
        draggable
      >
        Paper Input Node
      </div>
      <div
        className="dndnode"
        onDragStart={(event) => onDragStart(event, "multipleOutput")}
        draggable
      >
        Multiple Output Feature
      </div>

      <div
        className="dndnode "
        onDragStart={(event) => onDragStart(event, "singleoutput")}
        draggable
      >
        Single Output Feature
      </div>
      {/*       
      <div className="transform">
        [{transform[0].toFixed(2)}, {transform[1].toFixed(2)},{" "}
        {transform[2].toFixed(2)}]
      </div>
      <div className="title">Nodes</div>
      {nodes.map((node) => (
        <div key={node.id}>
          Node {node.id} - x: {node.position.x.toFixed(2)}, y:{" "}
          {node.position.y.toFixed(2)}
        </div>
      ))} */}

      {/* Display the selected node ID */}
      {selectedNode && (
        <>
          <div className="selected-node">
            <div className="title">Selected Node</div>
            <div>
              ID: {selectedNode.id} - Type: {selectedNode.type}
            </div>
          </div>

          <form className="space-y-4">
            <div className="form-control">
              <label className="label" htmlFor="measurement">
                <span className="label-text">
                  How is this feature measured?
                </span>
              </label>
              <select
                id="measurement"
                className="select select-bordered"
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
                <span className="label-text">
                  What does the data look like?
                </span>
              </label>
              <textarea
                id="dataAppearance"
                className="textarea textarea-bordered"
                placeholder="Shows some values"
              ></textarea>
            </div>

            <div className="form-control">
              <label className="label" htmlFor="featureQuality">
                <span className="label-text">How good is the feature?</span>
              </label>
              <select
                id="featureQuality"
                className="select select-bordered"
                defaultValue={"Choose an option"}
              >
                <option disabled>Choose an option</option>
                <option>Quality Metric 1</option>
                <option>Quality Metric 2</option>
                <option>Quality Metric 3</option>
              </select>
            </div>

            <div className="form-control">
              <label className="cursor-pointer label">
                <span className="label-text mr-2">Is there ground truth?</span>
                <input type="checkbox" className="toggle" />
              </label>
            </div>

            {/* Dynamic form sections can be added based on the feature type selected */}

            <div className="form-control mt-6">
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </>
      )}
    </aside>
  );
};

export default Sidebar;
