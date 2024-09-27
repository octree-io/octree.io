import Header from "../../components/Header/Header";
import "./Login.css";
import Logo from "../../assets/octopus.svg";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  const handleSignupRedirect = () => {
    navigate("/signup");
  };

  return (
    <div className="login-container">
      <Header />

      <div className="login-main-content">
        <div className="login-box">
          <img src={Logo} width={32} alt="Logo" />
          <h2>Login</h2>
          <div className="login-google-login">
            <div className="login-google-img" />
          </div>
          <div className="login-divider">
            Or
          </div>
          <form>
            <div className="login-form-group">
              <label htmlFor="username">Username:</label>
              <input type="text" id="username" name="username" autoComplete="off" required />
            </div>
            <div className="login-form-group">
              <label htmlFor="password">Password:</label>
              <input type="password" id="password" name="password" required />
            </div>
            <button type="submit" className="login-button">Login</button>
          </form>
          <div className="login-signup-redirect">Don't have an account? <a onClick={handleSignupRedirect}>Sign up</a></div>
        </div>
      </div>

      <footer className="login-footer">
        <p>
          © 2024 <a href="/">octree.io</a>
          <a href="/terms"> Terms and Conditions</a>
          <a href="/privacy">Privacy Policy</a>
        </p>
      </footer>
    </div>
  )
}

export default Login;
