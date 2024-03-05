import { useContext } from "react";
import Flow from "./Flow";
import Header from "./Header";
import { WorkflowContext } from "../../context/WorkflowProvider.types";

const Dashboard = () => {
  const { loadWorkflow } = useContext(WorkflowContext);

  const initialNodes = loadWorkflow().nodes;
  const initialEdges = loadWorkflow().edges;

  return (
    <>
      <Header fileName="Workflow-1" />

      <Flow initialNodes={initialNodes} initialEdges={initialEdges} />
    </>
  );
};

export default Dashboard;
