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
          email, password,
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
    width: "100%", padding: "12px 16px", borderRadius: 12,
    border: "1px solid #2a2a45", background: "#1a1a28",
    color: "#f0f0ff", fontSize: 14, fontFamily: "inherit",
    marginBottom: 12, outline: "none", boxSizing: "border-box"
  };

  return (
    <div style={{
  minHeight: "100vh",
  background: "#0a0a0f",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  overflowY: "auto"   // ✅ THIS FIX ONLY
}}>
      <div style={{ width: "100%", maxWidth: 400, background: "#12121a", borderRadius: 24, padding: 32, border: "1px solid #2a2a45" }}>
        
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, background: GRAD, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 12px" }}>♪</div>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 26, fontWeight: 700, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SoundWave</div>
          <div style={{ fontSize: 13, color: "#606080", marginTop: 4 }}>Every song. Worldwide. Free. 🌍</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#0a0a0f", borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {["Login", "Sign Up"].map((tab, i) => (
            <button key={tab} onClick={() => { setIsLogin(i === 0); setError(""); setMessage(""); }}
              style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, background: isLogin === (i === 0) ? GRAD : "none", color: isLogin === (i === 0) ? "#fff" : "#606080" }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Google */}
        <button onClick={handleGoogle}
          style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "1px solid #2a2a45", background: "#1a1a28", color: "#f0f0ff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: "#2a2a45" }}/>
          <span style={{ color: "#606080", fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#2a2a45" }}/>
        </div>

        {!isLogin && (
          <input value={username} onChange={e => setUsername(e.target.value)}
            placeholder="Your name" style={inputStyle}/>
        )}

        <input value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email address" type="email" style={inputStyle}/>

        <input value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password" type="password" style={{ ...inputStyle, marginBottom: 20 }}/>

        {error && <div style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}
        {message && <div style={{ color: "#00d4aa", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{message}</div>}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: GRAD, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {loading ? "Please wait..." : isLogin ? "🎵 Login" : "🎵 Create Account"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#606080" }}>
          Free forever · No ads · No limits
        </div>
      </div>
    </div>
  );
}