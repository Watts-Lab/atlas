import { useContext } from 'react'
import { WorkflowContext, WorkflowContextType } from './WorkflowProvider'

export const useWorkflow = (): WorkflowContextType => {
  const context = useContext(WorkflowContext)
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider')
  }
  return context
}
