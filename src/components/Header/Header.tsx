import { useNavigate } from "react-router-dom";
import Logo from "../../assets/octopus.svg";
import "./Header.css";

const Header = () => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate("/");
  };

  return (
    <div className="header">
      <div className="header-content">
        <img className="header-clickable" onClick={handleLogoClick} src={Logo} width={32} alt="Logo" />
        <h3 className="header-logo header-clickable" onClick={handleLogoClick}>
          octree.io<sup className="header-beta">BETA</sup>
        </h3>
      </div>
    </div>
  );
};

export default Header;
