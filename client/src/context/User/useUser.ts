import { useContext } from 'react'
import { UserContext, UserContextType } from './UserProvider'

export const useUser = (): UserContextType => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider')
  }
  return context
}
