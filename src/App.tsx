import './App.css'
import "allotment/dist/style.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landing from './views/Landing';
import GameRoom from './views/GameRoom/GameRoom';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/room" element={<GameRoom />} />
      </Routes>
    </Router>
  )
};

export default App;
