import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider } from './contexts/UserContext'
import { RoomsProvider } from './contexts/RoomsContext'
import { ChatProvider } from './contexts/ChatContext'
import Landing from './views/Landing/Landing'
import Lobby from './views/Lobby/Lobby'
import GameRoom from './views/GameRoom/GameRoom'
import './App.css'

export default function App() {
  return (
    <UserProvider>
      <RoomsProvider>
        <ChatProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/lobby" element={<Lobby />} />
              <Route path="/room/:roomId" element={<GameRoom />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ChatProvider>
      </RoomsProvider>
    </UserProvider>
  )
}
