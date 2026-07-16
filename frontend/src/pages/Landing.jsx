import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

const AVATAR_COLORS = [
  "#4F46E5","#7C3AED","#DB2777","#DC2626","#D97706",
  "#059669","#0891B2","#1D4ED8","#6D28D9","#BE185D",
  "#B45309","#047857","#0E7490","#1E40AF",
];

function initials(name) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function Landing() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      return;
    }
    api.get("/users/public")
      .then(r => setTeam(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-base">CA</div>
            <div>
              <div className="text-base font-bold leading-tight">ConsultAdd Tracker</div>
              <div className="text-xs text-muted">Application &amp; submission performance</div>
            </div>
          </div>
          <button
            onClick={() => navigate("/admin-login")}
            className="text-xs font-semibold text-muted hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-primary"
          >
            Admin Login
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-8 w-full">
        <h1 className="text-3xl font-bold text-dark mb-2">Our Recruitment Team</h1>
        <p className="text-muted text-base">Click on a team member to log in to your dashboard.</p>
      </section>

      {/* Team grid */}
      <main className="max-w-7xl mx-auto px-6 pb-16 w-full flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : team.length === 0 ? (
          <div className="text-center text-muted py-24">No team members found.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
            {team.map((member, i) => (
              <button
                key={member.id}
                onClick={() => navigate(`/login?email=${encodeURIComponent(member.email)}`)}
                className="card p-5 flex flex-col items-center gap-3 hover:shadow-md hover:border-primary/30 transition-all group cursor-pointer"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                  {initials(member.name)}
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-dark leading-snug line-clamp-2">{member.name}</div>
                  <div className="text-xs text-muted mt-1">Account Manager</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-white py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} ConsultAdd · Recruitment Tracker
      </footer>
    </div>
  );
}
