import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

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

  if (mustChange) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold">CA</div>
            <div className="font-bold text-lg">Set New Password</div>
          </div>
          <p className="text-sm text-muted mb-6">You must set a new password before continuing.</p>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">New password</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="input" required minLength={8} placeholder="Min. 8 characters" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm new password</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="input" required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Saving…" : "Set Password & Continue"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold">CA</div>
          <div>
            <div className="font-bold text-lg">ConsultAdd Tracker</div>
            <div className="text-xs text-muted">Account Manager Login</div>
          </div>
        </div>

        {suspicious && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 mb-4">
            <div className="text-amber-800 text-sm font-semibold mb-1">⚠ Security notice</div>
            <ul className="text-xs text-amber-700 space-y-0.5">
              {suspicious.map((f, i) => <li key={i}>• {f}</li>)}
            </ul>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4 flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="input" required autoFocus={!email}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="input" required autoFocus={!!email}
            />
          </div>
          <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-muted hover:text-primary">← Back to team list</Link>
        </div>
      </div>
    </div>
  );
}
