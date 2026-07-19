import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

function GlowBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-1/4 -left-1/4 w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-[120px]" style={{ animation: "lgDrift 18s ease-in-out infinite" }} />
      <div className="absolute -bottom-1/4 -right-1/4 w-[70%] h-[70%] rounded-full bg-orange-500/10 blur-[120px]" style={{ animation: "lgDrift 22s ease-in-out infinite reverse" }} />
    </div>
  );
}

const darkInput = "w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors";
const darkLabel = "block text-sm font-medium mb-1.5 text-white/70";
const darkBtn = "liquid-glass w-full h-11 rounded-xl text-white text-sm font-semibold hover:bg-white/5 transition-colors disabled:opacity-40";

export default function Login() {
  const [params] = useSearchParams();
  // Preserve email across navigations via sessionStorage
  const savedEmail = sessionStorage.getItem("login_email") || params.get("email") || "";
  const [email, setEmail]       = useState(savedEmail);
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [mustChange, setMustChange]   = useState(false);
  const [newPw, setNewPw]             = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [suspicious, setSuspicious]   = useState(null);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
  }, [user, navigate]);

  // Persist email so it survives a redirect back to /login
  useEffect(() => {
    if (email) sessionStorage.setItem("login_email", email);
  }, [email]);

  const handleLogin = async e => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.suspicious) setSuspicious(result.suspicious);

      // Use must_change_password from login response if available, else check /me
      let mustChangePw = result.user?.must_change_password;
      if (mustChangePw === undefined) {
        try {
          const me = await api.get("/auth/me");
          mustChangePw = me.data?.must_change_password;
        } catch { /* ignore — proceed to dashboard */ }
      }

      if (mustChangePw) {
        setMustChange(true);
      } else {
        sessionStorage.removeItem("login_email");
        navigate(result.user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.error || (err.code === "ERR_NETWORK" ? "Cannot reach server — is the backend running?" : "Login failed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async e => {
    e.preventDefault();
    if (newPw !== confirmPw) { setError("Passwords don't match"); return; }
    if (newPw.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/change-password", { oldPassword: password, newPassword: newPw });
      sessionStorage.removeItem("login_email");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-black relative flex items-center justify-center px-4 overflow-hidden">
      <GlowBackdrop />
      <div className="liquid-glass relative z-10 rounded-3xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black font-bold text-sm">CA</div>
          <div className="text-white font-semibold text-lg">ConsultAdd Tracker</div>
        </div>
        {children}
        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">← Back to team list</Link>
        </div>
      </div>
    </div>
  );

  if (mustChange) {
    return (
      <Shell>
        <div className="mb-6">
          <div className="text-white text-xl font-semibold mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>Set New Password</div>
          <p className="text-sm text-white/50">You must set a new password before continuing.</p>
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-3 py-2 mb-4">{error}</div>}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className={darkLabel}>New password</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className={darkInput} required minLength={8} placeholder="Min. 8 characters" autoFocus />
          </div>
          <div>
            <label className={darkLabel}>Confirm new password</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={darkInput} required />
          </div>
          <button type="submit" className={darkBtn} disabled={loading}>
            {loading ? "Saving…" : "Set Password & Continue"}
          </button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6">
        <div className="text-white text-2xl mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>Welcome back</div>
        <p className="text-sm text-white/50">Sign in to your account manager dashboard.</p>
      </div>

      {suspicious && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-3 mb-4">
          <div className="text-amber-300 text-sm font-semibold mb-1">⚠ Security notice</div>
          <ul className="text-xs text-amber-300/80 space-y-0.5">
            {suspicious.map((f, i) => <li key={i}>• {f}</li>)}
          </ul>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-3 py-2 mb-4 flex items-start gap-2">
          <span className="mt-0.5 flex-shrink-0">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className={darkLabel}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            className={darkInput} required autoFocus={!email}
          />
        </div>
        <div>
          <label className={darkLabel}>Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            className={darkInput} required autoFocus={!!email}
          />
        </div>
        <button type="submit" className={darkBtn} disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </Shell>
  );
}
