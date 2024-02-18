import Dashboard from "./components/Builder";
import WorkflowProvider from "./components/WorkflowProvider";
import { ReactFlowProvider } from "reactflow";

function App() {
  return (
    <>
      <ReactFlowProvider>
        <WorkflowProvider>
          <div>
            <Dashboard />
          </div>
        </WorkflowProvider>
      </ReactFlowProvider>
    </>
  );
}

export default App;
