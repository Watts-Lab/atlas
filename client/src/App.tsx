import Dashboard from "./components/Builder/Dashboard";
import WorkflowProvider from "./context/WorkflowProvider";
import { ReactFlowProvider } from "reactflow";
import { BrowserRouter as Router, Link } from "react-router-dom";

function App() {
  return (
    <>
      <ReactFlowProvider>
        <WorkflowProvider>
          <Router>
            <ul>
              <li>
                <Link to="/dashboard">
                  <Dashboard />
                </Link>
              </li>
              <li>
                <Link to="/table">Zillow Group</Link>
              </li>
            </ul>
          </Router>
        </WorkflowProvider>
      </ReactFlowProvider>
    </>
  );
}

export default App;
