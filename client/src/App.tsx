import { Routes, Route } from 'react-router-dom'
import Table from './components/View/TableView/Table'
import Galaxy from './pages/Login/Galaxy'
import Dashboard from './pages/Dashboard/Dashboard'
import ProjectView from './pages/ProjectView/ProjectView'

function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Galaxy />} />
        <Route path='/login/:email/:magicLink' element={<Galaxy loggingIn={true} />} />
        <Route path='/table' element={<Table />} />
        <Route path='/projects/:project_id' element={<ProjectView />} />
        <Route path='/dashboard' element={<Dashboard />} />
      </Routes>
    </>
  )
}

export default App
