import { Routes, Route } from 'react-router-dom'
import Table from './components/View/TableView/Table'
import Galaxy from './pages/Login/Galaxy'
import Dashboard from './pages/Dashboard/Dashboard'
import ProjectView from './pages/ProjectView/ProjectView'
import Project from './components/View/DataGrid/Project'
import MainPage from './components/View/DataGrid/MainPage'
import ProjectsTable from './components/View/DataGrid/ProjectsTable'
import PapersTable from './components/View/DataGrid/PapersTable'

function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Galaxy />} />
        <Route path='/login/:email/:magicLink' element={<Galaxy loggingIn={true} />} />
        <Route path='/table' element={<Table />} />
        <Route path='/projects/:project_id' element={<ProjectView />} />
        <Route path='/dashboard' element={<Dashboard />} />
        <Route
          path='/grid/:project_id'
          element={
            <MainPage breadcrumbs={[]} sidebarOpen={false}>
              <Project />
            </MainPage>
          }
        />
        <Route
          path='/page'
          element={
            <MainPage
              breadcrumbs={[
                {
                  title: 'Dashboard',
                  url: '/dashboard',
                },
              ]}
              sidebarOpen={true}
            >
              <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
                <div className='grid auto-rows-min gap-4 md:grid-cols-3'>
                  <div className='bg-white rounded-lg shadow-md p-4'>
                    <h2 className='text-lg font-semibold'>Running jobs</h2>
                    <p className='text-sm text-gray-500'>3 In progress</p>
                  </div>
                  <div className='bg-white rounded-lg shadow-md p-4'>
                    <h2 className='text-lg font-semibold'>Available features</h2>
                    <p className='text-sm text-gray-500'>57 Total - 3 User</p>
                  </div>
                  <div className='bg-white rounded-lg shadow-md p-4'>
                    <h2 className='text-lg font-semibold'>Available credit</h2>
                    <p className='text-sm text-gray-500'>10,324 tokens</p>
                  </div>
                </div>
                <ProjectsTable />
                <PapersTable />
              </div>
            </MainPage>
          }
        />
      </Routes>
    </>
  )
}

export default App
