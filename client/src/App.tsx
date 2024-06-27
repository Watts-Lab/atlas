import Dashboard from './components/Builder/Dashboard'
import WorkflowProvider from './context/Workflow/WorkflowProvider'
import { ReactFlowProvider } from 'reactflow'
import { Routes, Route } from 'react-router-dom'
import Table from './components/View/TableView/Table'
import SocketProvider from './context/Socket/SocketProvider'
import ArrageTable from './components/View/TableView/ArrangeTable'
import Home from './pages/Home/Home'

function App() {
  return (
    <>
      <ReactFlowProvider>
        <WorkflowProvider>
          <SocketProvider>
            <Routes>
              <Route path='/' element={<Home />} />
              <Route path='/login/:email/:magicLink' element={<Home loggingIn={true} />} />
              <Route path='/dashboard' element={<Dashboard />} />
              <Route path='/table' element={<Table />} />
              <Route path='/test' element={<ArrageTable />} />
            </Routes>
          </SocketProvider>
        </WorkflowProvider>
      </ReactFlowProvider>
    </>
  )
}

export default App
