import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { WorkflowProvider } from '@/context/Workflow/WorkflowProvider'
import { useWorkflow } from '@/context/Workflow/useWorkflow'
import Flow from '@/components/Builder/Flow'
import { Feature } from './feature.types'
import { Node, Edge } from '@xyflow/react'

// Helper function to get parent identifier (copied from WorkflowProvider to avoid circular deps or exports)
function getParentIdentifier(identifier: string): string | null {
  const parts = identifier.split('.')
  if (parts.length <= 1) return null

  let last = parts.pop()!
  if (last === 'parent') {
    if (parts.length === 0) return null
    last = parts.pop()!
    parts.push('parent')
  } else {
    parts.push('parent')
  }

  const parent = parts.join('.')
  return parent !== identifier ? parent : null
}

function getParentChain(identifier: string): string[] {
  const chain: string[] = []
  let current = identifier
  while (true) {
    const parent = getParentIdentifier(current)
    if (!parent || parent === current) break
    chain.push(parent)
    current = parent
  }
  return chain
}

// Wrapper to access context and populate graph
const FeatureGraphLoader = ({ features }: { features: Feature[] }) => {
  const { setGraph, reactFlowInstance } = useWorkflow()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Only initialize if we have the React Flow instance ready for layout calculations
    if (isInitialized || !reactFlowInstance) return

    const initialNodes: Node[] = []
    const initialEdges: Edge[] = []

    // 2. Build map of all needed features
    // Filter to only processing SELECTED features (and their parents)
    const selectedFeatures = features.filter((f) => f.selected)

    selectedFeatures.forEach((feature) => {
      // Get chain: [feature_id, parent1, parent2, ...]
      const chainFeatures = [
        feature.feature_identifier,
        ...getParentChain(feature.feature_identifier),
      ]

      // Process chain pairs for edges
      for (let i = 0; i < chainFeatures.length; i++) {
        const ident = chainFeatures[i]

        const feat = features.find((f) => f.feature_identifier === ident)
        if (!feat) continue

        const nodeId = `feature-node-${feat.id}`

        // Add node if not exists
        if (!initialNodes.some((n) => n.id === nodeId)) {
          // MATCH DATA STRUCTURE REQUIRED BY SingleOutputNode
          initialNodes.push({
            id: nodeId,
            type: 'SingleOutputNode',
            position: { x: 0, y: 0 },
            data: {
              name: feat.feature_name,
              measurement: 'GPT-o1',
              prompt: feat.feature_description || '',
              maxLength: 60,
            },
          })
        }

        // Add edge to next parent in chain
        const parentIdent = chainFeatures[i + 1]
        if (parentIdent) {
          const parentFeat = features.find((f) => f.feature_identifier === parentIdent)
          if (parentFeat) {
            const parentId = `feature-node-${parentFeat.id}`
            const edgeId = `edge-${parentId}-${feat.id}` // Parent -> Child

            if (!initialEdges.some((e) => e.id === edgeId)) {
              initialEdges.push({
                id: edgeId,
                source: parentId,
                target: nodeId,
              })
            }
          }
        }
      }
    })

    setGraph(initialNodes, initialEdges)
    setIsInitialized(true)
  }, [features, isInitialized, setGraph, reactFlowInstance])

  return <Flow />
}

type ProjectFeatureMapDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  features: Feature[]
  isLoading?: boolean
}

const ProjectFeatureMapDialog = ({
  open,
  onOpenChange,
  features,
  isLoading = false,
}: ProjectFeatureMapDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[65vw] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col'>
        <DialogHeader className='p-4 py-2 border-b shrink-0 bg-background z-10'>
          <DialogTitle>Project Feature Map</DialogTitle>
          <DialogDescription className='sr-only'>
            A visual representation of the project&apos;s features and their relationships.
          </DialogDescription>
        </DialogHeader>
        <div className='flex-1 w-full relative min-h-0 bg-gray-50/50 flex flex-col items-center justify-center'>
          {isLoading ? (
            <div className='flex flex-col items-center gap-2 text-muted-foreground'>
              <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
              <p>Loading features...</p>
            </div>
          ) : (
            <WorkflowProvider enablePersistence={false}>
              <div className='h-full w-full flex-1'>
                <FeatureGraphLoader features={features} />
              </div>
            </WorkflowProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProjectFeatureMapDialog
