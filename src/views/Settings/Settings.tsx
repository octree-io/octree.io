import { useEffect, useState } from "react";
import Header from "../../components/Header/Header";
import "./Settings.css";
import { isTokenValid } from "../../helper/tokenValidation";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import apiClient from "../../client/APIClient";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const Settings = () => {
  const [decodedUser, setDecodedUser] = useState<any>({});
  const [accessToken, setAccessToken] = useState<string>("");
  const [desiredUsername, setDesiredUsername] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const navigate = useNavigate();

  const refreshToken = async () => {
    try {
      const response: any = await apiClient.get("/auth/refresh-token");
      const { accessToken } = response;
      localStorage.setItem("token", accessToken);
      setAccessToken(accessToken);
      return true;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      return false;
    }
  };

  const changeUsername = () => {
    setError(null);
  };

  const changeProfilePic = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Invalid token");
      return;
    }

    if (!selectedFile) {
      setError("Please select an image to upload.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("File size exceeds the 10MB limit. Please upload a smaller file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    await axios.post(import.meta.env.VITE_API_URL + "/images/upload", formData, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      }
    });

    refreshToken();
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
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    if (file.size > MAX_FILE_SIZE) {
                      setError("File size exceeds the 10MB limit. Please upload a smaller file.");
                      setSelectedFile(null);
                    } else {
                      setSelectedFile(file);
                      setError(null);
                    }
                  }
                }}
              />
              <button className="settings-button" onClick={changeProfilePic}>Upload</button>
            </div>
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
