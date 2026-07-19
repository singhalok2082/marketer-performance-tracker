import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import Particles from "../components/landing/Particles";
import "./Landing.css";

const URL_TEXT = "linkedin.com/in/priya-sharma-python-dev";

function useTyping(text, active, speed = 42) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (!active) return;
    setShown("");
    let i = 0;
    const t = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [active, text, speed]);
  return shown;
}

const fadeUp = { hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

const MOCK_ROWS = [
  { name: "Priya Sharma", role: "Python Engineer", status: "Submitted to Client", time: "2m ago" },
  { name: "Rahul Verma", role: "DevOps Engineer", status: "Applied", time: "just now" },
  { name: "Ananya Iyer", role: "Full Stack AI/ML Dev", status: "Interview Scheduled", time: "8m ago" },
];

function StatusBadge({ status }) {
  const colors = {
    "Submitted to Client": { bg: "rgba(129,121,246,0.14)", color: "#a89bff" },
    "Applied": { bg: "rgba(255,255,255,0.06)", color: "#8d8b9c" },
    "Interview Scheduled": { bg: "rgba(74,222,128,0.1)", color: "#4ade80" },
  };
  const c = colors[status] || colors.Applied;
  return <span className="lp-status-pill" style={{ background: c.bg, color: c.color }}>{status}</span>;
}

export default function Landing() {
  const [team, setTeam] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      return;
    }
    api.get("/users/public").then(r => setTeam(r.data)).catch(() => {});
  }, [user, navigate]);

  const logRef = useRef(null);
  const logInView = useInView(logRef, { once: true, amount: 0.4 });
  const typedUrl = useTyping(URL_TEXT, logInView);
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (typedUrl.length === URL_TEXT.length && !added) {
      const t = setTimeout(() => setAdded(true), 700);
      return () => clearTimeout(t);
    }
  }, [typedUrl.length, added]);

  const trackCardRef = useRef(null);
  const trackCardInView = useInView(trackCardRef, { once: true, amount: 0.3 });

  const reviewRef = useRef(null);
  const reviewInView = useInView(reviewRef, { once: true, amount: 0.3 });

  return (
    <div className="lp-root">
      <Particles count={40} />

      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <div className="lp-nav-logo">CA</div>
          <span className="lp-nav-name">ConsultAdd Tracker</span>
        </div>
        <button className="lp-nav-admin" onClick={() => navigate("/admin-login")}>Admin Login</button>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="lp-hero">
        <div className="lp-hero-glow" />
        <div className="lp-hero-fade" />

        <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "0 24px", maxWidth: 780 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            <span className="lp-badge">
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#8179f6", display: "inline-block" }} />
              ConsultAdd Tracker
            </span>
          </motion.div>

          <motion.h1 className="lp-headline" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}>
            Bench recruiting,<br /><em>reimagined.</em>
          </motion.h1>

          <motion.p className="lp-subhead" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}>
            Log LinkedIn profiles, manage resumes, and track every job application — all from one dashboard built for your team.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}>
            <button className="btn-lp-primary" onClick={() => navigate("/login")}>Get started →</button>
          </motion.div>
        </div>

        <motion.div className="scroll-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
          <div className="scroll-hint-line" />
          <span>Scroll</span>
        </motion.div>
      </section>

      {/* ═══ 01 · LOG ═══ */}
      <section className="lp-section">
        <div className="lp-split-grid">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }}>
            <motion.span className="lp-section-label" variants={fadeUp}>01 · Log</motion.span>
            <motion.h2 className="lp-section-heading" variants={fadeUp}>One record.<br />That's all it takes.</motion.h2>
            <motion.p className="lp-section-body" variants={fadeUp}>
              Add a LinkedIn profile or upload a resume in seconds. No spreadsheets, no back-and-forth — just log it and move on.
            </motion.p>
            <motion.div variants={fadeUp} style={{ marginTop: 32, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["LinkedIn", "Resume", "Job Title", "Portal", "Status"].map(tag => (
                <span key={tag} className="lp-tag">{tag}</span>
              ))}
            </motion.div>
          </motion.div>

          <div ref={logRef} className="lp-demo-card">
            <div className="lp-demo-label">LinkedIn URL</div>
            <div className="lp-url-input">
              <span style={{ color: "var(--lp-text-muted)", fontFamily: "var(--lp-mono)", fontSize: 11, marginRight: 2 }}>https://</span>
              <span style={{ color: "var(--lp-text-primary)", fontFamily: "var(--lp-mono)", fontSize: 11 }}>{typedUrl}</span>
              {typedUrl.length < URL_TEXT.length && !added && <span className="lp-cursor" />}
            </div>
            <motion.button
              animate={added ? { backgroundColor: "#4ade80" } : { backgroundColor: "#8179f6" }}
              transition={{ duration: 0.35 }}
              style={{ width: "100%", marginTop: 12, padding: "12px 0", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "default", color: "#08080b", fontFamily: "inherit" }}
            >
              {added ? "✓ Added! Tracking now…" : "+ Add LinkedIn Profile"}
            </motion.button>
            {added && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 16, padding: "12px 14px", background: "var(--lp-bg-elevated)", border: "1px solid var(--lp-border)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8179f6", animation: "lpPulse 1.2s ease infinite", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "var(--lp-text-secondary)" }}>Now visible on your manager's dashboard…</span>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ 02 · TRACK ═══ */}
      <section className="lp-section" style={{ background: "linear-gradient(to bottom, var(--lp-bg), #0c0c10 50%, var(--lp-bg))" }}>
        <div className="lp-split-grid lp-split-grid-reverse">
          <div ref={trackCardRef} className="lp-result-card">
            <div className="lp-result-header">
              <div style={{ width: 32, height: 32, background: "var(--lp-green-dim)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✓</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--lp-text-primary)" }}>Resume tracked</div>
                <div style={{ fontSize: 11, color: "var(--lp-text-muted)" }}>Updated live</div>
              </div>
              <span style={{ fontSize: 11, background: "var(--lp-green-dim)", color: "var(--lp-green)", padding: "3px 10px", borderRadius: 100, fontWeight: 700 }}>Active</span>
            </div>
            {[["Title", "Python Engineer"], ["Location", "Remote, US"], ["Connections", "512"], ["File", "priya_sharma_v3.pdf"]].map((f, i) => (
              <motion.div key={f[0]} className="lp-field-row" initial={{ opacity: 0, x: -20 }} animate={trackCardInView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.25 + i * 0.2, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
                <span className="lp-field-label">{f[0]}</span>
                <span className="lp-field-value" style={{ fontFamily: f[0] === "File" ? "var(--lp-mono)" : "inherit" }}>{f[1]}</span>
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0 }} animate={trackCardInView ? { opacity: 1 } : {}} transition={{ delay: 1.2 }} style={{ marginTop: 16, paddingTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "var(--lp-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Submission rate</span>
                <span style={{ fontSize: 11, color: "var(--lp-green)", fontWeight: 700 }}>74%</span>
              </div>
              <div style={{ height: 3, background: "var(--lp-border)", borderRadius: 2, overflow: "hidden" }}>
                <motion.div initial={{ width: 0 }} animate={trackCardInView ? { width: "74%" } : {}} transition={{ delay: 1.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} style={{ height: "100%", background: "var(--lp-green)", borderRadius: 2 }} />
              </div>
            </motion.div>
          </div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
            <motion.span className="lp-section-label" variants={fadeUp}>02 · Track</motion.span>
            <motion.h2 className="lp-section-heading" variants={fadeUp}>Real numbers.<br />Every time.</motion.h2>
            <motion.p className="lp-section-body" variants={fadeUp}>
              Every LinkedIn profile, resume, and application rolls up into one live view — for you and for your manager.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ═══ 03 · REVIEW ═══ */}
      <section className="lp-section">
        <div className="lp-split-grid">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
            <motion.span className="lp-section-label" variants={fadeUp}>03 · Review</motion.span>
            <motion.h2 className="lp-section-heading" variants={fadeUp}>Every application.<br />Full visibility.</motion.h2>
          </motion.div>

          <div ref={reviewRef} className="lp-dash-mock">
            <div className="lp-dash-topbar">
              <div className="lp-dash-dot" style={{ background: "#f87171" }} />
              <div className="lp-dash-dot" style={{ background: "#fbbf24" }} />
              <div className="lp-dash-dot" style={{ background: "#4ade80" }} />
              <span style={{ marginLeft: 10, fontSize: 11, color: "var(--lp-text-muted)", fontFamily: "var(--lp-mono)" }}>consultadd-tracker · admin</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderBottom: "1px solid var(--lp-border)" }}>
              {[{ v: "186", l: "Applications", color: "#8179f6" }, { v: "42", l: "Submitted", color: "#4ade80" }, { v: "23%", l: "Rate", color: "var(--lp-text-primary)" }].map((s, i) => (
                <div key={s.l} style={{ padding: "14px 16px", textAlign: "center", borderRight: i < 2 ? "1px solid var(--lp-border)" : "none" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: -1 }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: "var(--lp-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", padding: "8px 16px", borderBottom: "1px solid var(--lp-border)", gap: 12 }}>
              {["Candidate", "Status", "Time"].map(h => <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--lp-text-muted)" }}>{h}</span>)}
            </div>
            {MOCK_ROWS.map((r, i) => (
              <motion.div key={r.name} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", padding: "10px 16px", borderBottom: "1px solid var(--lp-border-subtle)", alignItems: "center", gap: 12 }}
                initial={{ opacity: 0, x: 24 }} animate={reviewInView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.15 + i * 0.14, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--lp-text-primary)" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--lp-text-muted)" }}>{r.role}</div>
                </div>
                <StatusBadge status={r.status} />
                <span style={{ fontSize: 11, color: "var(--lp-text-muted)", fontFamily: "var(--lp-mono)", whiteSpace: "nowrap" }}>{r.time}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 04 · TEAM ═══ */}
      <section className="lp-section" style={{ background: "linear-gradient(to bottom, var(--lp-bg), #050507)" }}>
        <div style={{ position: "relative", zIndex: 10, maxWidth: 1020, width: "100%", textAlign: "center", padding: "0 24px" }}>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
            <motion.span className="lp-section-label" variants={fadeUp}>04 · Team</motion.span>
            <motion.h2 className="lp-section-heading" variants={fadeUp}>One team,<br />one dashboard.</motion.h2>
          </motion.div>

          <div style={{ height: 60 }} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 36 }}>
            {team.map((member, i) => (
              <motion.div key={member.id} initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.022, type: "spring", stiffness: 260, damping: 20 }}>
                <button className="sdr-pill" onClick={() => navigate(`/login?email=${encodeURIComponent(member.email)}`)}>
                  {member.name}<span className="sdr-pill-arrow">→</span>
                </button>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5, duration: 0.6 }}>
            <button className="btn-lp-primary" onClick={() => navigate("/login")}>Get your team started →</button>
          </motion.div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer>
        <div className="lp-footer-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="lp-nav-logo">CA</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--lp-text-primary)", letterSpacing: -0.2 }}>ConsultAdd Tracker</div>
              <div style={{ fontSize: 11, color: "var(--lp-text-muted)" }}>© {new Date().getFullYear()} ConsultAdd</div>
            </div>
          </div>
          <button className="btn-lp-primary" style={{ fontSize: 13, padding: "10px 22px" }} onClick={() => navigate("/login")}>Sign in →</button>
        </div>
      </footer>
    </div>
  );
}
