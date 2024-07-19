import Dashboard from './components/Builder/Dashboard'
import WorkflowProvider from './context/Workflow/WorkflowProvider'
import { ReactFlowProvider } from 'reactflow'
import { Routes, Route } from 'react-router-dom'
import Table from './components/View/TableView/Table'
import { SocketProvider } from './context/Socket/SocketProvider'
import Galaxy from './pages/Login/Galaxy'

function App() {
  return (
    <>
      <ReactFlowProvider>
        <WorkflowProvider>
          <SocketProvider>
            <Routes>
              <Route path='/' element={<Galaxy />} />
              <Route path='/login/:email/:magicLink' element={<Galaxy loggingIn={true} />} />
              <Route path='/table' element={<Table />} />
              <Route path='/dashboard' element={<Dashboard />} />
            </Routes>
          </SocketProvider>
        </WorkflowProvider>
      </ReactFlowProvider>
    </>
  )
}

export default App
