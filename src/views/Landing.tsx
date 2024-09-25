import { useNavigate } from "react-router-dom";
import Header from "../components/Header/Header";

const Landing = () => {
  const navigate = useNavigate();

  const handleGameRoomClick = () => {
    navigate("/room");
  };

  const handleLobbyClick = () => {
    navigate("/home");
  };

  return (
    <div>
      <Header />

      <div>Landing page under construction</div>

      <button onClick={handleGameRoomClick}>Go to game room</button>
      <button onClick={handleLobbyClick}>Go to lobby</button>
    </div>
  );
};

export default Landing;
