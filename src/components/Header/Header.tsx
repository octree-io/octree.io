import { useNavigate } from "react-router-dom";
import Logo from "../../assets/octopus.svg";
import "./Header.css";
import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null); 

  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate("/");
  };

  const handleProfileClick = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const handleLogout = () => {
    console.log("Logout logic here");
  };

  const handleSettings = () => {
    navigate("/settings");
  };

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

      <div className="header-profile-container">
        <img
          className="header-profile-icon header-clickable"
          onClick={handleProfileClick}
          src={"https://theeasterner.org/wp-content/uploads/2021/05/Bojack_Horseman.png"}
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
    </div>
  );
};

export default Header;
