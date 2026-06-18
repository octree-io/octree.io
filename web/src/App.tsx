import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider } from './contexts/UserContext'
import { RoomsProvider } from './contexts/RoomsContext'
import { ChatProvider } from './contexts/ChatContext'
import RoomEntry from './views/RoomEntry/RoomEntry'
import GameRoom from './views/GameRoom/GameRoom'
import './App.css'

export default function App() {
  return (
    <UserProvider>
      <RoomsProvider>
        <ChatProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RoomEntry />} />
              <Route path="/room/:roomId" element={<GameRoom />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ChatProvider>
      </RoomsProvider>
    </UserProvider>
  )
}
