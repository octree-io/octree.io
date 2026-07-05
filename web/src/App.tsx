import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing/Landing'
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import Room from './pages/Room/Room'
import Lobby from './pages/Lobby/Lobby'
import Settings from './pages/Settings/Settings'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* auth-only */}
        <Route element={<ProtectedRoute />}>
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/room/:id" element={<Room />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
