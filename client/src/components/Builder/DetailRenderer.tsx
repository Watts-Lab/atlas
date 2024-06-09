import { ReactNode } from 'react'
import PaperInputDescription from './Nodes/PaperInput/PaperInputDescription'
import MultipleOutputDescription from './Nodes/MultipleOutput/MultipleOutputDescription'
import SingleOutputDescription from './Nodes/SingleOutput/SingleOutputDescription'
import { selectedNode } from './Flow.types'
import { Node } from 'reactflow'

type DetailRendererProps = {
  nodeType: string
  setNodes: React.Dispatch<React.SetStateAction<Node<string | undefined>[]>>
  selectedNode: selectedNode
}

const DetailRenderer: React.FC<DetailRendererProps> = ({
  nodeType,
  setNodes,
  selectedNode,
}: DetailRendererProps) => {
  let components: ReactNode = null

  // console.log(selectedNode, "detail");

  if (nodeType === 'PaperInputNode') {
    components = <PaperInputDescription />
  } else if (nodeType === 'MultipleOutputNode') {
    components = <MultipleOutputDescription setNodes={setNodes} selectedNode={selectedNode} />
  } else if (nodeType === 'SingleOutputNode') {
    components = <SingleOutputDescription setNodes={setNodes} selectedNode={selectedNode} />
  }

  return <div>{components}</div>
}

export default DetailRenderer
