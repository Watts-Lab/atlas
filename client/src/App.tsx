import { Routes, Route, Navigate } from 'react-router-dom'
import Table from './components/View/TableView/Table'
import Home from './pages/Home/Home'
import ProjectView from './pages/ProjectView/ProjectView'
import Project from './components/View/DataGrid/Project'
import Overview from './pages/Dashboard/Overview'
import IC2S2 from './pages/IC2S2/IC2S2'
import ProjectCreate from './pages/ProjectCreate/ProjectCreate'
import FeaturesPage from './pages/Features/Features'
import Landing from './pages/Landing/Landing'
import Team from './pages/Team/Team'
import ApiKeysPage from './pages/Settings/ApiKeysPage'
import PasskeysPage from './pages/Settings/PasskeysPage'
import UsagePage from './pages/Settings/UsagePage'

function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Landing />} />
        <Route path='/home' element={<Navigate to='/' replace />} />
        <Route path='/login' element={<Home />} />
        <Route path='/login/:email/:magicLink' element={<Home loggingIn={true} />} />
        <Route path='/table' element={<Table />} />
        <Route path='/dashboard' element={<Overview />} />
        <Route path='/projects' element={<Overview />} />
        <Route path='/features'>
          <Route index element={<Navigate to='/features/explorer' replace />} />
          <Route path='explorer' element={<FeaturesPage />} />
          <Route path='create' element={<FeaturesPage />} />
        </Route>
        <Route path='/projects/create' element={<ProjectCreate />} />
        {/* <Route path='/projects/settings' element={<ProjectSettings />} /> */}
        <Route path='/project/:project_id' element={<Project />} />

        <Route path='/project-old/:project_id' element={<ProjectView />} />
        <Route path='/ic2s2' element={<IC2S2 />} />
        <Route path='/team' element={<Team />} />
        <Route path='/settings/api-keys' element={<ApiKeysPage />} />
        <Route path='/settings/passkeys' element={<PasskeysPage />} />
        <Route path='/settings/usage' element={<UsagePage />} />
      </Routes>
    </>
  )
}

export default App
