import { useCallback, useState } from "react";
import {
  Node,
  NodeProps,
  Handle,
  Position,
  useReactFlow,
  useStoreApi,
} from "reactflow";

const handleStyle = { left: 10 };

const options = [
  {
    value: "multiple",
    label: "Multiple outputs",
  },
  {
    value: "freetext",
    label: "Free text",
  },
  {
    value: "binary",
    label: "Yes/No (Binary)",
  },
];

interface SelectType {
  value: string;
}

function Select({ value }: SelectType) {
  const store = useStoreApi();

  const [selected, setSelected] = useState(value);

  const onChange = (evt) => {
    const { nodeInternals } = store.getState();
    setSelected(evt.target.value);

  };

  return (
    <div className="form-control w-full max-w-xs px-4">
      <label className="label">
        <span className="label-text text-xs">
          Pick the type of output for your prompt
        </span>
      </label>
      <select
        className="select select-bordered select-xs w-full max-w-xs nodrag"
        onChange={onChange}
        value={selected}
      >
        <option disabled value="default">
          Pick one
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PromptNode({ data }) {
  const [running, setRunning] = useState(false);

  const onChange = useCallback((evt) => {
    console.log(evt.target.value);
  }, []);

  const onRunPrompt = useCallback(() => {
    console.log("running prompt");
    running ? setRunning(false) : setRunning(true);
  }, [running]);

  return (
    <div className="card w-60 bg-base-100 shadow-xl">
      {Object.keys(data.selects).map((handleId) => (
        <Select key={handleId} value={data.selects[handleId]} />
      ))}
      <div className="card-body items-center text-center p-4">
        <div className="card-actions">
          <textarea
            placeholder="Prompt text"
            className="textarea textarea-bordered textarea-sm w-full max-w-xs"
          ></textarea>
          <button
            onClick={onRunPrompt}
            className="btn btn-sm btn-block"
            disabled={running}
          >
            {running ? (
              <>
                Running<span className="loading loading-spinner"></span>
              </>
            ) : (
              "Run prompt"
            )}
          </button>
        </div>
      </div>

      <Handle type="target" position={Position.Bottom} />
    </div>
  );
}

export default PromptNode;
