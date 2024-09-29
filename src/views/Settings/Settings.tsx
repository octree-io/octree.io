import { useEffect, useState } from "react";
import Header from "../../components/Header/Header";
import "./Settings.css";
import { isTokenValid } from "../../helper/tokenValidation";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const Settings = () => {
  const [decodedUser, setDecodedUser] = useState<any>({});
  const [accessToken, setAccessToken] = useState<string>("");
  const [desiredUsername, setDesiredUsername] = useState<string>("");
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const changeUsername = () => {
    setError(null);
  };

  const changeProfilePic = () => {
    
  };

  useEffect(() => {
    if (accessToken !== "") {
      setDecodedUser(jwtDecode(accessToken));
    }
  }, [accessToken]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token || !isTokenValid(token)) {
      navigate("/");
    } else {
      setAccessToken(token);
    }
  }, []);

  return (
    <div className="settings-container">
      <Header />

      <div className="settings-main-content">
        <div className="settings-box">
          <h2>Settings</h2>

          {error && <div className="settings-error">{error}</div>}

          <div className="settings-user-info">
            <div><img className="user-profile-picture" src={decodedUser.profilePic} width={35} height={35} /></div>
            <div className="settings-username">{decodedUser.username}</div>
          </div>

          <div className="settings-change-profile-pic">
            <div>Change profile picture</div>
            <button className="settings-button" onClick={changeProfilePic}>Upload</button>
          </div>

          <div className="settings-change-username">
            <div>Change username</div>
            <div>
              <div>Desired username:</div>
              <input
                style={{ marginRight: "10px" }}
                type="text"
                id="desired-username"
                name="desired-username"
                value={desiredUsername}
                onChange={(e) => setDesiredUsername(e.target.value)}
                autoComplete="off"
                required
              />
              <button className="settings-button" onClick={changeUsername}>Change username</button>
            </div>
            
          </div>
        </div>
      </div>

      <footer className="settings-footer">
        <p>
          © 2024 <a href="/">octree.io</a>
          <a href="/terms"> Terms and Conditions</a>
          <a href="/privacy">Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
};

export default Settings;
