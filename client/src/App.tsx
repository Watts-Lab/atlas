import Dashboard from './components/Builder/Dashboard'
import WorkflowProvider from './context/Workflow/WorkflowProvider'
import { ReactFlowProvider } from 'reactflow'
import { Routes, Route } from 'react-router-dom'
import Table from './components/View/TableView/Table'
import SocketProvider from './context/Socket/SocketProvider'

function App() {
  return (
    <>
      <ReactFlowProvider>
        <WorkflowProvider>
          <SocketProvider>
            <Routes>
              <Route path='/dashboard' element={<Dashboard />} />
              <Route path='/table' element={<Table />} />
            </Routes>
          </SocketProvider>
        </WorkflowProvider>
      </ReactFlowProvider>
    </>
  )
}

export default App
