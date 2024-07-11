import Dashboard from './components/Builder/Dashboard'
import WorkflowProvider from './context/Workflow/WorkflowProvider'
import { ReactFlowProvider } from 'reactflow'
import { Routes, Route } from 'react-router-dom'
import Table from './components/View/TableView/Table'
import { SocketProvider } from './context/Socket/SocketProvider'
import Home from './pages/Home/Home'
import Galaxy from './pages/Login/Galaxy'

function App() {
  return (
    <>
      <ReactFlowProvider>
        <WorkflowProvider>
          <SocketProvider>
            <Routes>
              <Route path='/' element={<Table />} />
              <Route path='/login/:email/:magicLink' element={<Home loggingIn={true} />} />
              <Route path='/dashboard' element={<Dashboard />} />
              <Route path='/galaxy' element={<Galaxy />} />
            </Routes>
          </SocketProvider>
        </WorkflowProvider>
      </ReactFlowProvider>
    </>
  )
}

export default App
