import { Routes, Route } from 'react-router-dom'
import Table from './components/View/TableView/Table'
import Home from './pages/Home/Home'
import ProjectView from './pages/ProjectView/ProjectView'
import Project from './components/View/DataGrid/Project'
import Overview from './pages/Dashboard/Overview'
import IC2S2 from './pages/IC2S2/IC2S2'

function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login/:email/:magicLink' element={<Home loggingIn={true} />} />
        <Route path='/table' element={<Table />} />
        <Route path='/projects/:project_id' element={<ProjectView />} />
        <Route path='/dashboard' element={<Overview />} />
        <Route path='/grid/:project_id' element={<Project />} />
        <Route path='/ic2s2' element={<IC2S2 />} />
      </Routes>
    </>
  )
}

export default App
