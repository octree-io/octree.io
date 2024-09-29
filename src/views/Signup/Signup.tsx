import { useEffect, useState } from "react";
import Header from "../../components/Header/Header";
import "./Signup.css";
import Logo from "../../assets/octopus.svg";
import { useNavigate } from "react-router-dom";
import { AuthType, initiateGoogleOAuth } from "../../helper/googleOAuthHelper";
import apiClient from "../../client/APIClient";

const Signup = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSigninRedirect = () => {
    navigate("/login");
  };

  const handleGoogleSignup = async () => {
    try {
      const result = await initiateGoogleOAuth(AuthType.SIGN_UP);
      if (result === true) {
        navigate("/home");
      }
    } catch (error: any) {
      console.log("[handleGoogleSignup] OAuth signup failed: ", error); 
      setError(error);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      await apiClient.post('/auth/signup', {
        username,
        email,
        password,
      });

      navigate("/home");
    } catch (error: any) {
      console.error('Signup failed:', error);
      setError('Signup failed. Please try again.');
    }
  };

  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/home");
      return;
    }
  }, []);

  return (
    <div className="signup-container">
      <Header /> 

      <div className="signup-main-content">
        <div className="signup-box">
          <img src={Logo} width={32} alt="Logo" />
          <h2>Sign up</h2>

          {error && <div className="signup-error">{error}</div>}

          <div className="signup-google-signup" onClick={handleGoogleSignup}>
            <div className="signup-google-img" />
          </div>
          <div className="signup-divider">Or</div>

          <form onSubmit={handleSignup}>
            <div className="signup-form-group">
              <label htmlFor="username">Username:</label>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="signup-form-group">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="signup-form-group">
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="signup-form-group">
              <label htmlFor="confirm-password">Confirm Password:</label>
              <input
                type="password"
                id="confirm-password"
                name="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="signup-button">Sign up</button>
          </form>
          <div className="signup-login-redirect">Already have an account? <a onClick={handleSigninRedirect}>Sign in</a></div>
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
