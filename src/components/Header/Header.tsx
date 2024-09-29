import { useNavigate } from "react-router-dom";
import Logo from "../../assets/octopus.svg";
import "./Header.css";
import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { jwtDecode } from "jwt-decode";
import apiClient, { TokenExpiredError } from "../../client/APIClient";
import { isTokenValid } from "../../helper/tokenValidation";

const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null); 

  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate("/");
  };

  const handleProfileClick = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    console.log("Logging out");
    localStorage.removeItem("token");
    await apiClient.get("/auth/logout");
    setIsLoggedIn(false);
    navigate("/");
  };

  const handleSettings = () => {
    navigate("/settings");
  };

  const refreshToken = async () => {
    try {
      const response: any = await apiClient.get('/auth/refresh-token');
      const { accessToken } = response;
      localStorage.setItem("token", accessToken);
      return true;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        handleLogout();
      } else {
        console.error("Failed to refresh token:", error);
      }
      return false;
    }
  };

  const checkLoginStatus = async () => {
    const token = localStorage.getItem("token");
    if (token && isTokenValid(token)) {
      setIsLoggedIn(true);
      const decodedToken: any = jwtDecode(token);
      setProfilePic(decodedToken.profilePic);
    } else if (token) {
      const tokenRefreshed = await refreshToken();
      setIsLoggedIn(tokenRefreshed);
      if (tokenRefreshed) {
        const refreshedToken = localStorage.getItem("token");
        if (refreshedToken) {
          const decodedToken: any = jwtDecode(refreshedToken);
          setProfilePic(decodedToken.profilePic);
        }
      }
    } else {
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  // TODO: Fix the bug where clicking the profile again doesn't close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <div className="header">
      <div className="header-content">
        <img className="header-clickable" onClick={handleLogoClick} src={Logo} width={32} alt="Logo" />
        <h3 className="header-logo header-clickable" onClick={handleLogoClick}>
          octree.io<sup className="header-beta">BETA</sup>
        </h3>
      </div>

      {isLoggedIn ? (
          <div className="header-profile-container">
            <img
              className="header-profile-icon header-clickable"
              onClick={handleProfileClick}
              src={profilePic || ""}
              width={35}
              alt="Profile"
            />
            <div className="header-arrow-icon" onClick={handleProfileClick}>
              {isDropdownOpen ? <FiChevronUp /> : <FiChevronDown />}
            </div>
            {isDropdownOpen && (
              <div className="header-profile-dropdown" ref={dropdownRef}>
                <div className="header-dropdown-item" onClick={handleSettings}>
                  Settings
                </div>
                <div className="header-dropdown-item" onClick={handleLogout}>
                  Logout
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="header-login-container">
            <button className="header-login-button" onClick={() => navigate("/login")}>Login</button>
          </div>
        )}
    </div>
  );
};

export default Header;
