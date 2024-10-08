import { FaAirbnb, FaApple, FaMeta, FaPinterest } from "react-icons/fa6";
import Header from "../../components/Header/Header";
import "./Landing.css";
import { FaAmazon, FaGoogle } from "react-icons/fa";
import Logo from "../../assets/octopus.svg";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  const handleGetStartedClick = () => {
    if (localStorage.getItem("token")) {
      navigate("/home");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="landing-container">
      <Header />

      <section className="landing-hero">
        <div>
          <h1 className="landing-hero-header">Solve Problems Together</h1>
          <div className="landing-hero-steps">
            <div className="landing-hero-step">
              <h2>Join a room</h2>
              <p>Join or create a room, invite your friends and start solving problems today!</p>
            </div>

            <div className="landing-hero-step">
              <h2>Select a language</h2>
              <p>You can select up to 8 different languages. We support Python, C++, Java, C#, Ruby, Go, Rust, OCaml and more coming in the future!</p>
            </div>

            <div className="landing-hero-step">
              <h2>Solve problems</h2>
              <p>You can chat and solve problems together. Soon solutions will be shown at the end of each round.</p>
            </div>
          </div>
          <div className="landing-hero-cta">
            <button className="landing-get-started-button" onClick={handleGetStartedClick}>Get started</button>
          </div>
        </div>
      </section>

      <div className="landing-companies">
        <span>Used by engineers from</span>
        <div className="landing-company-logos">
          <div className="landing-company-logo">
            <FaAmazon size={50} />
          </div>
          <div className="landing-company-logo">
            <FaGoogle size={50} />
          </div>
          <div className="landing-company-logo">
            <FaMeta size={50} />
          </div>
          <div className="landing-company-logo">
            <FaPinterest size={50} />
          </div>
          <div className="landing-company-logo">
            <FaApple size={50} />
          </div>
          <div className="landing-company-logo">
            <FaAirbnb size={50} />
          </div>
        </div>
      </div>

      <div className="landing-picture-container">
        <div className="landing-picture-group">
          <div className="landing-browser-bar">
            <div className="landing-browser-button" style={{ backgroundColor: "red" }}></div>
            <div className="landing-browser-button" style={{ backgroundColor: "#fcbd2e" }}></div>
            <div className="landing-browser-button" style={{ backgroundColor: "green" }}></div>
          </div>

          <div className="landing-picture" />
        </div>
      </div>

      <div className="landing-bottom-cta">
        <h1>Start practicing today</h1>
        <p>Join our growing community to start solving algorithmic problems today.</p>
        <button className="landing-get-started-button" onClick={handleGetStartedClick}>Get started</button>
      </div>

      <footer className="landing-footer-container">
        <div className="landing-footer">
          <div className="landing-footer-column">
            <div className="landing-footer-logo">
              <img className="landing-footer-logo-image" src={Logo} width={32} alt="Logo" />
              <h3 className="landing-footer-logo-text">octree.io<sup>BETA</sup></h3>
            </div>
            <div className="landing-footer-copyright">© 2024 octree.io. All rights reserved.</div>
          </div>
          
          <div className="landing-footer-column">
            <header>Product</header>
            <a href="mailto:team@octree.io">Contact</a>
            <a href="mailto:team@octree.io">Support</a>
          </div>

          <div className="landing-footer-column">
            <header>Terms</header>
            <a href="">Terms of Service</a>
            <a href="">Privacy Policy</a>
          </div>

        </div>
      </footer>
    </div>
  );
};

export default Landing;
