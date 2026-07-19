import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { ArrowRight, ArrowUpRight, Link2, FileText, Briefcase, TrendingUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import Particles from "../components/landing/Particles";

const floatIcon = (i = 0) => ({
  animate: { y: [0, -10, 0] },
  transition: { duration: 3 + (i % 3) * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 },
});

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] },
});

function initials(name = "") { return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase(); }

function GlowBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-1/4 -left-1/4 w-[70%] h-[70%] rounded-full bg-indigo-500/20 blur-[100px]" style={{ animation: "lgDrift 14s ease-in-out infinite" }} />
      <div className="absolute -bottom-1/4 -right-1/4 w-[70%] h-[70%] rounded-full bg-orange-500/20 blur-[100px]" style={{ animation: "lgDrift 17s ease-in-out infinite reverse" }} />
      <Particles count={70} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
    </div>
  );
}

function Navbar({ onAdminLogin, onSignIn }) {
  return (
    <nav className="relative z-20 px-6 py-6">
      <div className="liquid-glass max-w-5xl mx-auto rounded-full px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-black font-bold text-xs">CA</div>
          <span className="text-white font-semibold text-lg">ConsultAdd Tracker</span>
          <div className="hidden md:flex items-center gap-8 ml-8">
            {["Features", "Team", "FAQ"].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="text-white/80 hover:text-white text-sm font-medium transition-colors">{l}</a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onAdminLogin} className="text-white/80 hover:text-white text-sm font-medium transition-colors">Admin</button>
          <button onClick={onSignIn} className="liquid-glass rounded-full px-6 py-2 text-white text-sm font-medium hover:bg-white/5 transition-colors">Sign In</button>
        </div>
      </div>
    </nav>
  );
}

export default function Landing() {
  const [team, setTeam] = useState([]);
  const [email, setEmail] = useState("");
  const [openFaq, setOpenFaq] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      return;
    }
    api.get("/users/public").then(r => setTeam(r.data)).catch(() => {});
  }, [user, navigate]);

  const goLogin = (e) => {
    e?.preventDefault();
    navigate(email ? `/login?email=${encodeURIComponent(email)}` : "/login");
  };

  const aboutRef = useRef(null);
  const aboutInView = useInView(aboutRef, { once: true, margin: "-100px" });

  const FAQS = [
    { q: "Do I need to install anything?", a: "No — it runs in your browser. Just sign in and start logging your work." },
    { q: "Can I see my own numbers before my manager does?", a: "Yes. Your dashboard updates live as soon as you log a profile, resume, or application." },
    { q: "What happens if I upload the wrong resume?", a: "Archive it and upload the current one — old versions stay on file so nothing is lost." },
    { q: "Who can see my LinkedIn profiles and resumes?", a: "You, and your admin. Other account managers only see their own records." },
  ];

  return (
    <div className="bg-black min-h-screen" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen overflow-hidden flex flex-col">
        <GlowBackdrop />
        <Navbar onAdminLogin={() => navigate("/admin-login")} onSignIn={() => navigate("/login")} />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center" style={{ transform: "translateY(-8%)" }}>
          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-7xl lg:text-8xl text-white tracking-tight mb-8"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Bench recruiting,<br /><em className="italic">fully tracked.</em>
          </motion.h1>

          <motion.form
            onSubmit={goLogin}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="liquid-glass max-w-xl w-full rounded-full pl-6 pr-2 py-2 flex items-center gap-3 mb-6"
          >
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email to sign in" className="flex-1 bg-transparent text-white placeholder:text-white/40 text-sm outline-none"
            />
            <button type="submit" className="bg-white rounded-full p-3 text-black flex-shrink-0 hover:scale-105 transition-transform" aria-label="Sign in">
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.35 }}
            className="text-white/60 text-sm leading-relaxed px-4 max-w-md mb-8"
          >
            LinkedIn profiles, resumes, and job applications — logged in seconds, visible the moment your team needs them.
          </motion.p>

          <motion.a
            href="#features"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45 }}
            className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/5 transition-colors"
          >
            See how it works
          </motion.a>
        </div>

        <div className="relative z-10 flex justify-center gap-3 pb-10">
          {["14 Managers", "Live Sync", "Secure by Design"].map(t => (
            <span key={t} className="liquid-glass rounded-full px-4 py-2 text-white/70 text-xs font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse" />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ═══ ABOUT ═══ */}
      <section ref={aboutRef} className="relative bg-black pt-32 md:pt-44 pb-16 px-6 overflow-hidden" style={{ background: "radial-gradient(ellipse at top, rgba(255,255,255,0.03) 0%, transparent 70%)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.span {...fadeUp(0)} className="block text-white/40 text-sm tracking-widest uppercase mb-6">About This Tool</motion.span>
          <motion.h2 {...fadeUp(0.1)} className="text-4xl md:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Built for the team<br className="hidden md:block" /> that <em className="italic text-white/60">tracks</em> everything <em className="italic text-white/60">that matters.</em>
          </motion.h2>
        </div>
      </section>

      {/* ═══ FEATURED PRODUCT ═══ */}
      <section id="features" className="bg-black pt-6 md:pt-10 pb-24 md:pb-32 px-6 overflow-hidden">
        <motion.div {...fadeUp(0)} className="max-w-6xl mx-auto rounded-3xl overflow-hidden relative liquid-glass" style={{ aspectRatio: "16/9" }}>
          <div className="absolute inset-0" style={{ animation: "lgPulseGlow 5s ease-in-out infinite", background: "radial-gradient(ellipse at 30% 30%, rgba(99,102,241,0.22), transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(249,115,22,0.18), transparent 60%)" }} />
          <Particles count={35} />
          <div className="lg-shimmer-sweep" />
          <div className="absolute inset-0 flex items-center justify-center p-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-xl">
              {[{ Icon: Link2, c: "text-indigo-300" }, { Icon: FileText, c: "text-orange-300" }, { Icon: Briefcase, c: "text-cyan-300" }, { Icon: TrendingUp, c: "text-emerald-300" }].map(({ Icon, c }, i) => (
                <motion.div key={i} {...floatIcon(i)} className="liquid-glass rounded-2xl aspect-square flex items-center justify-center">
                  <Icon className={`${c} w-8 h-8`} strokeWidth={1.5} />
                </motion.div>
              ))}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div className="liquid-glass rounded-2xl p-6 md:p-8 max-w-md">
              <div className="text-white/50 text-xs tracking-widest uppercase mb-3">Our Approach</div>
              <p className="text-white text-sm md:text-base leading-relaxed">
                Every profile, every resume, every application — logged the moment it happens, so your manager never has to ask what you did this week.
              </p>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/login")}
              className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium">
              Sign in →
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* ═══ TRACKING x VISIBILITY ═══ */}
      <section className="bg-black py-28 md:py-40 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.h2 {...fadeUp(0)} className="text-5xl md:text-7xl lg:text-8xl text-white tracking-tight mb-16 md:mb-24" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Tracking <em className="italic text-white/40">×</em> Visibility
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }}
              className="liquid-glass rounded-3xl overflow-hidden relative flex items-center justify-center p-10" style={{ aspectRatio: "4/3" }}>
              <div className="absolute inset-0" style={{ animation: "lgPulseGlow 6s ease-in-out infinite", background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.06), transparent 70%)" }} />
              <Particles count={30} />
              <div className="lg-shimmer-sweep" />
              <div className="relative grid grid-cols-3 gap-3 w-full max-w-xs">
                {["186", "42", "23%"].map((v, i) => (
                  <motion.div key={i} {...floatIcon(i)} className="liquid-glass rounded-xl p-4 text-center">
                    <div className="text-white text-xl font-bold" style={{ fontFamily: "'Instrument Serif', serif" }}>{v}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }}>
              <div className="mb-8">
                <div className="text-white/40 text-xs tracking-widest uppercase mb-4">Log the work</div>
                <p className="text-white/70 text-base md:text-lg leading-relaxed">
                  A LinkedIn profile, a resume, a job application — each takes seconds to log, and none of it lives in a chat thread or a spreadsheet that only you can find.
                </p>
              </div>
              <div className="w-full h-px bg-white/10 mb-8" />
              <div>
                <div className="text-white/40 text-xs tracking-widest uppercase mb-4">See the results</div>
                <p className="text-white/70 text-base md:text-lg leading-relaxed">
                  Submission rates, portal breakdowns, and every team member's activity roll up automatically — visible to you and your manager the moment it happens.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ SERVICES ═══ */}
      <section className="relative bg-black py-28 md:py-40 px-6 overflow-hidden" style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.02) 0%, transparent 60%)" }}>
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0)} className="flex items-center justify-between mb-14">
            <h2 className="text-3xl md:text-5xl text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>What's inside</h2>
            <span className="hidden md:block text-white/40 text-sm">Core features</span>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {[
              { tag: "Tracking", title: "LinkedIn & Resumes", desc: "Log every profile and resume as it's created — quick-view any resume right in the browser, no downloads needed.", icons: [Link2, FileText], grad: "from-indigo-500/20 to-transparent" },
              { tag: "Visibility", title: "Applications & Reporting", desc: "Every application logged with portal, status, and resume used — submission rates roll up for your manager automatically.", icons: [Briefcase, TrendingUp], grad: "from-orange-500/20 to-transparent" },
            ].map((c, i) => (
              <motion.div key={c.title} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, delay: i * 0.15 }}
                className="liquid-glass rounded-3xl overflow-hidden group">
                <div className={`relative flex items-center justify-center gap-6 p-10 bg-gradient-to-br ${c.grad} transition-transform duration-700 group-hover:scale-105`} style={{ aspectRatio: "16/9" }}>
                  <Particles count={20} />
                  <div className="lg-shimmer-sweep" />
                  {c.icons.map((Icon, j) => (
                    <motion.div key={j} {...floatIcon(j + i * 2)} className="relative">
                      <Icon className="text-white/70 w-10 h-10" strokeWidth={1.25} />
                    </motion.div>
                  ))}
                </div>
                <div className="p-6 md:p-8">
                  <div className="uppercase tracking-widest text-white/40 text-xs mb-3">{c.tag}</div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="text-white text-xl md:text-2xl tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>{c.title}</h3>
                    <span className="liquid-glass rounded-full p-2 flex-shrink-0"><ArrowUpRight className="w-4 h-4 text-white" /></span>
                  </div>
                  <p className="text-white/50 text-sm leading-relaxed">{c.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TEAM ═══ */}
      <section id="team" className="relative bg-black py-28 md:py-40 px-6 overflow-hidden text-center">
        <motion.div {...fadeUp(0)}>
          <span className="block text-white/40 text-sm tracking-widest uppercase mb-4">The Team</span>
          <h2 className="text-4xl md:text-6xl text-white tracking-tight mb-16" style={{ fontFamily: "'Instrument Serif', serif" }}>
            One team, <em className="italic text-white/50">one dashboard.</em>
          </h2>
        </motion.div>
        <div className="flex flex-wrap gap-3 justify-center max-w-3xl mx-auto mb-12">
          {team.map((m, i) => (
            <motion.button key={m.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/login?email=${encodeURIComponent(m.email)}`)}
              className="liquid-glass rounded-full pl-2 pr-5 py-2 flex items-center gap-2.5 text-white text-sm font-medium hover:bg-white/5 transition-colors">
              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">{initials(m.name)}</span>
              {m.name}
            </motion.button>
          ))}
        </div>
        <motion.button {...fadeUp(0.1)} onClick={() => navigate("/login")} className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/5 transition-colors">
          Get your team started →
        </motion.button>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="bg-black py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.h2 {...fadeUp(0)} className="text-4xl md:text-5xl text-white tracking-tight text-center mb-14" style={{ fontFamily: "'Instrument Serif', serif" }}>Good to know.</motion.h2>
          <div className="liquid-glass rounded-3xl p-2">
            {FAQS.map((f, i) => (
              <div key={f.q} className={`px-6 py-5 ${i !== FAQS.length - 1 ? "border-b border-white/10" : ""}`}>
                <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="w-full flex items-center justify-between gap-4 text-left">
                  <span className="text-white font-medium">{f.q}</span>
                  <span className="text-white/50 text-xl flex-shrink-0">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && <p className="text-white/50 text-sm leading-relaxed mt-3">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold text-xs">CA</div>
            <div>
              <div className="text-white text-sm font-semibold">ConsultAdd Tracker</div>
              <div className="text-white/40 text-xs">© {new Date().getFullYear()} ConsultAdd</div>
            </div>
          </div>
          <button onClick={() => navigate("/login")} className="liquid-glass rounded-full px-6 py-2.5 text-white text-sm font-medium hover:bg-white/5 transition-colors">Sign in →</button>
        </div>
      </footer>
    </div>
  );
}
