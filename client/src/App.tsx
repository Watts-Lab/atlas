import { Routes, Route } from 'react-router-dom'
import Table from './components/View/TableView/Table'
import Home from './pages/Home/Home'
import ProjectView from './pages/ProjectView/ProjectView'
import Project from './components/View/DataGrid/Project'
import Overview from './pages/Dashboard/Overview'
import IC2S2 from './pages/IC2S2/IC2S2'
import DocumentationLayout from './pages/Documentation/DocumentationLayout'
import DocPage from './pages/Documentation/DocPage'
import ProjectCreate from './pages/ProjectCreate/ProjectCreate'
import ProjectSettings from './pages/ProjectSettings/ProjectSettings'

function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login/:email/:magicLink' element={<Home loggingIn={true} />} />
        <Route path='/table' element={<Table />} />
        <Route path='/dashboard' element={<Overview />} />
        <Route path='/projects' element={<Overview />} />
        <Route path='/projects/create' element={<ProjectCreate />} />
        <Route path='/projects/settings' element={<ProjectSettings />} />
        <Route path='/project/:project_id' element={<Project />} />

        <Route path='/project-old/:project_id' element={<ProjectView />} />
        <Route path='/ic2s2' element={<IC2S2 />} />

        <Route path='/docs' element={<DocumentationLayout />}>
          <Route index element={<DocPage fileName='overview.md' />} />
          <Route path='introduction' element={<DocPage fileName='introduction.md' />} />
          <Route path='get-started' element={<DocPage fileName='get-started.md' />} />
          <Route path='tutorials' element={<DocPage fileName='tutorials.md' />} />
          <Route path='changelog' element={<DocPage fileName='changelog.md' />} />
          <Route path='api-reference' element={<DocPage fileName='api_refrence.md' />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
