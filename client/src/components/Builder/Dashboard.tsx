import { useEffect } from 'react'
import Flow from './Flow'
import { useWorkflow } from '@/context/Workflow/useWorkflow'

const Dashboard = () => {
  const { loadWorkflow } = useWorkflow()

  useEffect(() => {
    loadWorkflow()
  }, [loadWorkflow])

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh' }}>
      <Flow />
    </div>
  )
}

export default Dashboard
