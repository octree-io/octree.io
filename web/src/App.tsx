import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './Landing'
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import Room from './pages/Room/Room'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/room/:id" element={<Room />} />
      </Routes>
    </BrowserRouter>
  )
}
