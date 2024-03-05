import Dashboard from "./components/Builder/Dashboard";
import WorkflowProvider from "./context/WorkflowProvider";
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
