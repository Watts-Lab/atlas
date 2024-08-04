import { Routes, Route } from 'react-router-dom'
import Table from './components/View/TableView/Table'
import Galaxy from './pages/Login/Galaxy'
import User from './pages/User/User'

function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Galaxy />} />
        <Route path='/login/:email/:magicLink' element={<Galaxy loggingIn={true} />} />
        <Route path='/table' element={<Table />} />
        <Route path='/dashboard' element={<User />} />
      </Routes>
    </>
  )
}

export default App
