import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminLogin() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.user.role !== "admin") {
        setError("This portal is for admins only. Use the main login.");
        return;
      }
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-10 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg">CA</div>
          <div>
            <div className="font-bold text-lg text-white">ConsultAdd Tracker</div>
            <div className="text-xs text-gray-400">Admin Portal</div>
          </div>
        </div>

        {error && <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-3 py-2 mb-5">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Admin email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors placeholder-gray-500"
              placeholder="alok@consultadd.com"
              required autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? "Authenticating…" : "Access Admin Dashboard"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← Back to team portal</Link>
        </div>
      </div>
    </div>
  );
}
