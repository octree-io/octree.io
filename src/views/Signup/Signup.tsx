import Header from "../../components/Header/Header";
import "./Signup.css";
import Logo from "../../assets/octopus.svg";

const Signup = () => {
  return (
    <div className="signup-container">
      <Header /> 

      <div className="signup-main-content">
        <div className="signup-box">
          <img src={Logo} width={32} alt="Logo" />
          <h2>Sign up</h2>
          <div className="signup-google-signup">
            <div className="signup-google-img" />
          </div>
          <div className="signup-divider">
            Or
          </div>
          <form>
            <div className="signup-form-group">
              <label htmlFor="username">Username:</label>
              <input type="text" id="username" name="username" autoComplete="off" required />
            </div>
            <div className="signup-form-group">
              <label htmlFor="email">Email:</label>
              <input type="text" id="email" name="email" autoComplete="off" required />
            </div>
            <div className="signup-form-group">
              <label htmlFor="password">Password:</label>
              <input type="password" id="password" name="password" required />
            </div>
            <div className="signup-form-group">
              <label htmlFor="confirm-password">Confirm Password:</label>
              <input type="password" id="confirm-password" name="password" required />
            </div>
            <button type="submit" className="signup-button">Sign up</button>
          </form>
          <div className="signup-login-redirect">Already have an account? <a href="/login">Sign in</a></div>
        </div>
      </div>

      <footer className="signup-footer">
        <p>
          © 2024 <a href="/">octree.io</a>
          <a href="/terms"> Terms and Conditions</a>
          <a href="/privacy">Privacy Policy</a>
        </p>
      </footer>
    </div>
  )
}

export default Signup;
