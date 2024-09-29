import Header from "../../components/Header/Header";
import "./Login.css";
import Logo from "../../assets/octopus.svg";
import { useNavigate } from "react-router-dom";
import { AuthType, initiateGoogleOAuth } from "../../helper/googleOAuthHelper";
import { useEffect, useState } from "react";
import apiClient from "../../client/APIClient";

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSignupRedirect = () => {
    navigate("/signup");
  };

  const handleGoogleSignin = async () => {
    try {
      const result = await initiateGoogleOAuth(AuthType.SIGN_IN);

      if (result === true) {
        navigate("/home");
      }
    } catch (error: any) {
      console.log("[handleGoogleSignin] OAuth failed", error);
      setError(error);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      const response: any = await apiClient.post('/auth/login', {
        username,
        password,
      });

      const { accessToken } = response;

      apiClient.login(accessToken);

      navigate("/home");
    } catch (error: any) {
      console.error('Login failed:', error);
      console.log(error.message);
      setError('Invalid username or password');
    }
  };

  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/home");
      return;
    }
  }, []);

  return (
    <div className="login-container">
      <Header />

      <div className="login-main-content">
        <div className="login-box">
          <img src={Logo} width={32} alt="Logo" />
          <h2>Login</h2>

          {error && <div className="login-error">{error}</div>}

          <div className="login-google-login" onClick={handleGoogleSignin}>
            <div className="login-google-img" />
          </div>
          <div className="login-divider">
            Or
          </div>

          <form onSubmit={handleLogin}>
            <div className="login-form-group">
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
            <div className="login-form-group">
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
