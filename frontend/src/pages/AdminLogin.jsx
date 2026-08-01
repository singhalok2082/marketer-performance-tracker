import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoIcon from "../assets/consultadd-icon.jpeg";

const sideImage = `${import.meta.env.BASE_URL}images/manhattan-bridge.jpg`;

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
    <div className="min-h-screen bg-[#FBF6EC] flex">
      <div className="hidden md:block md:w-1/2 lg:w-3/5 relative">
        <img src={sideImage} alt="Manhattan Bridge" className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8">
            <img src={logoIcon} alt="ConsultAdd" className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <div className="font-bold text-lg text-caText">ConsultAdd Pulse</div>
              <div className="text-xs text-caText/50">Admin Portal</div>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-5">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-caText/70 mb-1.5">Admin email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-caText/15 text-caText rounded-lg px-3 py-2.5 text-sm outline-none focus:border-caBlue transition-colors placeholder:text-caText/35"
                placeholder="alok@consultadd.com"
                required autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-caText/70 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-white border border-caText/15 text-caText rounded-lg px-3 py-2.5 text-sm outline-none focus:border-caBlue transition-colors"
                required
              />
            </div>
            <button type="submit" className="w-full h-11 rounded-xl bg-caText text-white text-sm font-semibold hover:bg-black transition-colors disabled:opacity-40" disabled={loading}>
              {loading ? "Authenticating…" : "Access Admin Dashboard"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-caText/40 hover:text-caText/70 transition-colors">← Back to team portal</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
