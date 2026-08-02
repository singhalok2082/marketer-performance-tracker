import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import logoIcon from "../assets/consultadd-icon.jpeg";

const img = (name) => `${import.meta.env.BASE_URL}images/${name}.jpg`;
const heroImage = img("ny-skyline");
const teamImage = img("capitol");

function initials(name = "") { return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase(); }

function Navbar({ onAdminLogin, onSignIn }) {
  return (
    <nav className="relative z-20 px-6 py-6">
      <div className="glass-light max-w-5xl mx-auto rounded-full px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <img src={logoIcon} alt="ConsultAdd" className="w-9 h-9 rounded-full object-cover" />
          <a href="#team" className="hidden md:block text-caText/70 hover:text-caText text-sm font-medium transition-colors">Team</a>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onAdminLogin} className="text-caText/70 hover:text-caText text-sm font-medium transition-colors">Admin</button>
          <button onClick={onSignIn} className="bg-caText rounded-full px-6 py-2 text-white text-sm font-medium hover:bg-black transition-colors">Sign In</button>
        </div>
      </div>
    </nav>
  );
}

export default function Landing() {
  const [team, setTeam] = useState([]);
  const [email, setEmail] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      return;
    }
    api.get("/users/public").then(r => setTeam(r.data)).catch(() => {});
  }, [user, navigate]);

  // Fire-and-forget landing-page visit log — counts the hit regardless of
  // whether the visitor turns out to already be logged in.
  useEffect(() => {
    api.post("/analytics/track", { path: "/" }).catch(() => {});
  }, []);

  const goLogin = (e) => {
    e?.preventDefault();
    navigate(email ? `/login?email=${encodeURIComponent(email)}` : "/login");
  };

  return (
    <div className="bg-[#FBF6EC]" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen overflow-hidden flex flex-col">
        <img src={heroImage} alt="New York skyline" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/5 to-[#FBF6EC]" />
        <Navbar onAdminLogin={() => navigate("/admin-login")} onSignIn={() => navigate("/login")} />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center" style={{ transform: "translateY(-4%)" }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="glass-light rounded-[2.5rem] px-8 py-10 md:px-14 md:py-12 max-w-2xl"
          >
            <h1
              className="text-5xl md:text-7xl text-caText tracking-tight mb-7"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Performance,<br /><em className="italic">fully tracked.</em>
            </h1>

            <p className="text-caText/60 text-sm leading-relaxed max-w-md mx-auto mb-7">
              LinkedIn profiles, resumes, and job applications — logged in seconds, visible the moment your team needs them.
            </p>

            <form onSubmit={goLogin} className="bg-white border border-caText/10 max-w-xl w-full mx-auto rounded-full pl-6 pr-2 py-2 flex items-center gap-3">
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email to sign in" className="flex-1 bg-transparent text-caText placeholder:text-caText/40 text-sm outline-none"
              />
              <button type="submit" className="bg-caText rounded-full p-3 text-white flex-shrink-0 hover:scale-105 transition-transform" aria-label="Sign in">
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ═══ TEAM ═══ */}
      <section
        id="team"
        className="relative py-24 md:py-32 px-6 text-center"
        style={{
          backgroundImage: `linear-gradient(180deg, #FBF6EC 0%, rgba(251,246,236,0.1) 14%, rgba(251,246,236,0.1) 86%, #FBF6EC 100%), url(${teamImage})`,
          backgroundSize: "cover", backgroundPosition: "center",
        }}
      >
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }}
          className="glass-light inline-block rounded-[2.5rem] px-8 py-8 md:px-14 md:py-10 mb-12">
          <span className="block text-caText/40 text-sm tracking-widest uppercase mb-4">The Team</span>
          <h2 className="text-4xl md:text-6xl text-caText tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
            One team, <em className="italic text-caText/50">one dashboard.</em>
          </h2>
        </motion.div>
        <div className="flex flex-wrap gap-3 justify-center max-w-3xl mx-auto mb-12">
          {team.map((m, i) => (
            <motion.button key={m.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/login?email=${encodeURIComponent(m.email)}`)}
              className="bg-white border border-caText/10 rounded-full pl-2 pr-5 py-2 flex items-center gap-2.5 text-caText text-sm font-medium hover:bg-caNeutral transition-colors shadow-sm">
              <img src={logoIcon} alt="" className="w-6 h-6 rounded-full object-cover" />
              {m.name}
            </motion.button>
          ))}
        </div>
        <motion.button initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}
          onClick={() => navigate("/login")} className="bg-caText rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-black transition-colors">
          Get your team started →
        </motion.button>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-caText/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="ConsultAdd" className="w-8 h-8 rounded-full object-cover" />
            <div>
              <div className="text-caText text-sm font-semibold">ConsultAdd Pulse</div>
              <div className="text-caText/40 text-xs">© {new Date().getFullYear()} ConsultAdd</div>
            </div>
          </div>
          <button onClick={() => navigate("/login")} className="bg-white border border-caText/10 rounded-full px-6 py-2.5 text-caText text-sm font-medium hover:bg-caNeutral transition-colors shadow-sm">Sign in →</button>
        </div>
      </footer>
    </div>
  );
}
