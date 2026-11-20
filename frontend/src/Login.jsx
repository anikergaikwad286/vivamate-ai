import { useState } from "react";
import { BrainCircuit, User, Lock, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";
import "./Login.css";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }

    setError("");
    onLogin(username.trim());
  };

  return (
    <div className="login-container">
      <div className="login-orb orb-one"></div>
      <div className="login-orb orb-two"></div>
      <div className="login-grid"></div>

      <div className="login-layout">
        <div className="login-brand-section">
          <div className="login-brand-icon">
            <BrainCircuit size={34} />
          </div>

          <h1>VivaMate <span>AI</span></h1>
          <div className="brand-line"></div>
          <h2>SMART VIVA<br />PLATFORM</h2>

          <p>
            Practice smarter. Speak confidently.
            Master every viva with AI-powered learning.
          </p>

          <div className="login-feature">
            <Sparkles size={18} />
            <span>Your intelligent viva preparation partner</span>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-top">
            <div className="login-mini-icon">
              <Lock size={21} />
            </div>
            <span>STUDENT WORKSPACE</span>
          </div>

          <h2>Welcome Back!</h2>
          <p className="login-subtitle">
            Sign in to continue your learning journey.
          </p>

          <form onSubmit={handleLogin}>
            <label>Username</label>
            <div className="login-field">
              <User size={19} />
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <label>Password</label>
            <div className="login-field">
              <Lock size={19} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button className="login-button" type="submit">
              <span>Login to Workspace</span>
              <ArrowRight size={19} />
            </button>
          </form>

          <div className="login-security">
            <Lock size={13} />
            <span>Secure Student Access</span>
          </div>
        </div>
      </div>

      <div className="login-bottom">
        <span>© 2026 VivaMate AI</span>
        <span>LEARN. PRACTICE. EXCEL.</span>
      </div>
    </div>
  );
}

export default Login;
