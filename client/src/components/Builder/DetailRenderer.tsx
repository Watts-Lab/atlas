import { ReactNode } from "react";
import PaperInputDescription from "./Nodes/PaperInput/PaperInputDescription";
import MultipleOutputDescription from "./Nodes/MultipleOutput/MultipleOutputDescription";
import SingleOutputDescription from "./Nodes/SingleOutput/SingleOutputDescription";

type DetailRendererProps = {
  nodeType: string;
  setNodes: any;
};

const DetailRenderer: React.FC<DetailRendererProps> = ({
  nodeType,
  setNodes,
}: DetailRendererProps) => {
  let components: ReactNode = null;

  if (nodeType === "PaperInputNode") {
    components = <PaperInputDescription />;
  } else if (nodeType === "MultipleOutputNode") {
    components = <MultipleOutputDescription />;
  } else if (nodeType === "SingleOutputNode") {
    components = <SingleOutputDescription setNodes={setNodes} />;
  }

  return <div>{components}</div>;
};

export default DetailRenderer;
