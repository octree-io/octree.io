import Header from "../../components/Header/Header";
import "./RoomNotFound.css";

const RoomNotFound = () => {
  return (
    <div className="room-not-found-container">
      <Header />

      <div className="room-not-found-main-content">
        <h1>Room Not Found</h1>
        <p>The room you are looking for is closed or does not exist.</p>
      </div>

      <footer className="room-not-found-footer">
        <p>
          © 2024 <a href="/">octree.io</a>
          <a href="/terms"> Terms and Conditions</a>
          <a href="/privacy">Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
};

export default RoomNotFound;
