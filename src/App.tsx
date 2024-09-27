import './App.css'
import "allotment/dist/style.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GameRoom from './views/GameRoom/GameRoom';
import Lobby from './views/Lobby/Lobby';
import Landing from './views/Landing/Landing';
import Login from './views/Login/Login';
import Signup from './views/Signup/Signup';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Lobby />} />
        <Route path="/room" element={<GameRoom />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </Router>
  )
};

export default App;
