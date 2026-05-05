import { useState } from "react";
import { supabase } from "../supabase";

const GRAD = "linear-gradient(135deg,#6c63ff,#ff6b9d)";

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin(data.user);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: username } }
        });
        if (error) throw error;
        setMessage("✅ Check your email to verify your account!");
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  }

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid #2a2a45",
    background: "#1a1a28",
    color: "#f0f0ff",
    fontSize: 14,
    marginBottom: 10,
    outline: "none",
    boxSizing: "border-box"
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        overflowY: "auto"   // ✅ FIX: allow scroll on laptop
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,    // ✅ slightly smaller
          background: "#12121a",
          borderRadius: 20,
          padding: 24,      // ✅ reduced padding
          border: "1px solid #2a2a45"
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: GRAD,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              margin: "0 auto 10px"
            }}
          >
            ♪
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            SoundWave
          </div>
          <div style={{ fontSize: 12, color: "#606080" }}>
            Every song. Free. 🌍
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#0a0a0f", borderRadius: 10, padding: 4, marginBottom: 18 }}>
          {["Login", "Sign Up"].map((tab, i) => (
            <button
              key={tab}
              onClick={() => {
                setIsLogin(i === 0);
                setError("");
                setMessage("");
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                background: isLogin === (i === 0) ? GRAD : "none",
                color: isLogin === (i === 0) ? "#fff" : "#606080"
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          style={{
            width: "100%",
            padding: "11px 0",
            borderRadius: 12,
            border: "1px solid #2a2a45",
            background: "#1a1a28",
            color: "#f0f0ff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 12
          }}
        >
          Continue with Google
        </button>

        <div style={{ textAlign: "center", color: "#606080", fontSize: 11, marginBottom: 12 }}>
          — or —
        </div>

        {!isLogin && (
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Your name"
            style={inputStyle}
          />
        )}

        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          style={inputStyle}
        />

        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          style={{ ...inputStyle, marginBottom: 14 }}
        />

        {error && <div style={{ color: "#ff6b6b", fontSize: 12, marginBottom: 10 }}>{error}</div>}
        {message && <div style={{ color: "#00d4aa", fontSize: 12, marginBottom: 10 }}>{message}</div>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 12,
            border: "none",
            background: GRAD,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
        </button>

        <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "#606080" }}>
          Free forever
        </div>
      </div>
    </div>
  );
}