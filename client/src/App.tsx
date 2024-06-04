import Dashboard from "./components/Builder/Dashboard";
import WorkflowProvider from "./context/WorkflowProvider";
import { ReactFlowProvider } from "reactflow";
import { Routes, Route } from "react-router-dom";
import Table from "./pages/Table";

function App() {
  return (
    <>
      <ReactFlowProvider>
        <WorkflowProvider>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/table" element={<Table />} />
          </Routes>
        </WorkflowProvider>
      </ReactFlowProvider>
    </>
  );
}

export default App;
