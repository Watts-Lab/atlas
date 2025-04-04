import { useContext } from 'react'
import { WorkflowContext } from './WorkflowProvider'

export function useWorkflow() {
  return useContext(WorkflowContext)
}
