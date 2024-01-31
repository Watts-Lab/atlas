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
    label: "Multiple (List)",
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
          Output type
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

interface PromptNodeProps {
  data: { selects: { [key: string]: string }; text: string };
}

function PromptNode({ data }: PromptNodeProps) {
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState(null);

  const [inputText, setInputText] = useState(data.text);
  const [selectedOutputType, setSelectedOutputType] = useState("default");

  const onChange = useCallback((evt) => {
    setInputText(evt.target.value);
  }, []);

  const { addNodes, addEdges } = useReactFlow();
  const store = useStoreApi();

  const [childNodes, setChildNodes] = useState([]);

  /**
   * Runs the prompt when the user clicks the "Run" button.
   * Sends an API request with the input text and selected output type.
   * Handles the API response data and sets the response if needed.
   * @returns void
   */
  const onRunPrompt = useCallback(() => {
    if (!running) {
      fetch("http://localhost:8080/api/runprompt", {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText,
          outputType: selectedOutputType,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          setResponse(data.message);

          const { nodeInternals } = store.getState();

          const previousNodes = Array.from(nodeInternals.values());
          const maxId = Math.max(
            ...previousNodes.map((node) => parseInt(node.id, 10)),
            0
          );

          addNodes([
            {
              id: (maxId + 1).toString(),
              type: "default",
              position: { x: -150, y: 300 },
              data: {
                selects: {
                  "handle-0": "default",
                },
              },
            },
          ]);
        })
        .catch((error) => {
          console.error("API Error:", error);
        })
        .finally(() => {
          setRunning(false);
        });

      setRunning(true);
    }
  }, [running, inputText, selectedOutputType]);

  return (
    <div className="card w-60 bg-base-100 shadow-xl">
      <Handle type="target" position={Position.Top} />
      {/* {Object.keys(data.selects).map((handleId) => (
         <Select key={handleId} value={data.selects[handleId]} />
       ))} */}
      <Select
        value={selectedOutputType}
        onChange={(value) => setSelectedOutputType(value)} // Update the selected output type
      />
      <div className="card-body items-center text-center p-4">
        <div className="card-actions">
          <textarea
            placeholder="Prompt text"
            className="textarea textarea-bordered textarea-xs w-full max-w-xs nodrag"
            rows={5}
            value={data.text}
            onChange={onChange} // Update the input text
          ></textarea>
          <button
            onClick={onRunPrompt}
            className="btn btn-xs btn-block"
            disabled={running}
          >
            {running ? (
              <>
                Running
                <span className="loading loading-spinner text-xs"></span>
              </>
            ) : (
              "Run prompt"
            )}
          </button>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default PromptNode;
