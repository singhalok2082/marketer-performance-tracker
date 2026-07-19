import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import "./Landing.css";

const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

const PAIN_CARDS = [
  { icon: "\u{1F4AC}", title: "Profiles get lost in DMs", body: "A LinkedIn URL sent over chat is easy to lose and impossible to search a week later.", rotate: -3, top: 0 },
  { icon: "\u{1F4E7}", title: "Resumes buried in threads", body: "The latest version of a resume is always in someone's inbox — never where you need it.", rotate: 2, top: 190 },
  { icon: "\u{1F441}️", title: "No visibility for your manager", body: "Without one shared view, your manager can't see what's actually getting done each day.", rotate: -1, top: 380 },
];

const STRIP_ITEMS = ["LinkedIn Profiles", "Resumes", "Job Applications", "Daily Tracking", "Submission Rates", "Team Visibility"];

function initials(name) { return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase(); }

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

  return (
    <div className="lp-root">
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <div className="lp-nav-logo">CA</div>
          <span className="lp-nav-name">ConsultAdd Tracker</span>
        </div>
        <button className="lp-nav-admin" onClick={() => navigate("/admin-login")}>Admin Login</button>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="lp-hero">
        <div className="lp-hero-grid">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.span className="lp-tag-label" variants={fadeUp}>Internal tool for account managers</motion.span>
            <motion.h1 className="lp-headline" variants={fadeUp}>
              Bench recruiting,<br /><mark>organized.</mark>
            </motion.h1>
            <motion.p className="lp-subhead" variants={fadeUp}>
              Log LinkedIn profiles, manage resumes, and track every job application — all in one place built for your team.
            </motion.p>
            <motion.div variants={fadeUp}>
              <button className="btn-lp-dark" onClick={() => navigate("/login")}>Get Started →</button>
              <div className="lp-hint">14 account managers. One dashboard.</div>
            </motion.div>
          </motion.div>

          <motion.div className="lp-hero-visual" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <div className="lp-mock-card">
              <div className="lp-mock-label">Resume tracked</div>
              <div className="lp-mock-row"><span className="lp-mock-row-label">Title</span><span>Python Engineer</span></div>
              <div className="lp-mock-row"><span className="lp-mock-row-label">Location</span><span>Remote, US</span></div>
              <div className="lp-mock-row"><span className="lp-mock-row-label">Status</span><span className="lp-mock-pill">Active</span></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ STRIP ═══ */}
      <div className="lp-strip">
        {STRIP_ITEMS.map(item => <span key={item} className="lp-strip-item">{item}</span>)}
      </div>

      {/* ═══ THE CHALLENGE ═══ */}
      <section className="lp-section">
        <div className="lp-section-grid">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}>
            <motion.span className="lp-tag-label" variants={fadeUp}>The Challenge</motion.span>
            <motion.h2 className="lp-section-heading" variants={fadeUp}>
              Scattered work leads<br />to <mark style={{ background: "var(--lp-accent)", color: "#fff", padding: "2px 10px", borderRadius: 8 }}>missed visibility</mark>.
            </motion.h2>
            <motion.p className="lp-section-body" variants={fadeUp}>
              When LinkedIn profiles live in one chat, resumes in another, and applications in a spreadsheet, nobody — not you, not your manager — gets the full picture.
            </motion.p>
          </motion.div>

          <div className="lp-pain-stack">
            {PAIN_CARDS.map((c, i) => (
              <motion.div key={c.title} className="lp-pain-card" style={{ top: c.top, transform: `rotate(${c.rotate}deg)`, zIndex: i }}
                initial={{ opacity: 0, y: 30, rotate: c.rotate }} whileInView={{ opacity: 1, y: 0, rotate: c.rotate }} viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: i * 0.15, duration: 0.5 }}>
                <div className="lp-pain-icon">{c.icon}</div>
                <div className="lp-pain-title">{c.title}</div>
                <div className="lp-pain-body">{c.body}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE SOLUTION ═══ */}
      <section className="lp-solution-band">
        <motion.h2 className="lp-solution-heading" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          Start tracking <mark>everything</mark><br />in one place.
        </motion.h2>

        <div className="lp-step">
          <div>
            <span className="lp-step-num">Step 1</span>
            <h3 className="lp-step-heading">Log a LinkedIn profile</h3>
            <p className="lp-step-body">Paste the URL, add a title and location. It's saved and visible on your dashboard immediately — no spreadsheet required.</p>
          </div>
          <div className="lp-step-visual">
            <div className="lp-mock-card">
              <div className="lp-mock-label">LinkedIn URL</div>
              <div className="lp-mock-input">linkedin.com/in/priya-sharma-dev</div>
              <button className="lp-mock-btn">+ Add LinkedIn Profile</button>
            </div>
          </div>
        </div>

        <div className="lp-step">
          <div className="lp-step-visual">
            <div className="lp-mock-card">
              <div className="lp-mock-label">Upload Resume</div>
              <div className="lp-mock-input" style={{ fontFamily: "inherit" }}>📄 priya_sharma_v3.pdf</div>
              <button className="lp-mock-btn" style={{ background: "var(--lp-sage-deep)" }}>Upload &amp; Track</button>
            </div>
          </div>
          <div>
            <span className="lp-step-num">Step 2</span>
            <h3 className="lp-step-heading">Upload &amp; quick-view resumes</h3>
            <p className="lp-step-body">Keep current and old versions in one list. Anyone with access can open a resume right in the browser — no downloads.</p>
          </div>
        </div>

        <div className="lp-step">
          <div>
            <span className="lp-step-num">Step 3</span>
            <h3 className="lp-step-heading">Log the application</h3>
            <p className="lp-step-body">Portal, job title, resume used, and status — logged in seconds. Your manager sees submission rates roll up in real time.</p>
          </div>
          <div className="lp-step-visual">
            <div className="lp-mock-card" style={{ maxWidth: 340 }}>
              <div className="lp-mock-label">Recent applications</div>
              {[["Priya Sharma", "Submitted"], ["Rahul Verma", "Applied"], ["Ananya Iyer", "Interview"]].map(([n, s]) => (
                <div key={n} className="lp-mock-row"><span>{n}</span><span className="lp-mock-pill">{s}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TEAM ═══ */}
      <section className="lp-section lp-team-section" style={{ maxWidth: "none", textAlign: "center" }}>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.span className="lp-tag-label" variants={fadeUp}>The Team</motion.span>
          <motion.h2 className="lp-section-heading" variants={fadeUp} style={{ maxWidth: "none" }}>One team,<br />one dashboard.</motion.h2>
        </motion.div>

        <div style={{ height: 40 }} />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 40, maxWidth: 1000, margin: "0 auto 40px" }}>
          {team.map((member, i) => (
            <motion.div key={member.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.03, type: "spring", stiffness: 260, damping: 20 }}>
              <button className="sdr-pill" onClick={() => navigate(`/login?email=${encodeURIComponent(member.email)}`)}>
                <span className="sdr-avatar">{initials(member.name)}</span>
                {member.name}<span className="sdr-pill-arrow">→</span>
              </button>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3, duration: 0.5 }}>
          <button className="btn-lp-dark" onClick={() => navigate("/login")}>Get your team started →</button>
        </motion.div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer>
        <div className="lp-footer-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="lp-nav-logo">CA</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--lp-ink)" }}>ConsultAdd Tracker</div>
              <div style={{ fontSize: 12, color: "var(--lp-muted)" }}>© {new Date().getFullYear()} ConsultAdd</div>
            </div>
          </div>
          <button className="btn-lp-dark" style={{ fontSize: 13, padding: "10px 22px" }} onClick={() => navigate("/login")}>Sign in →</button>
        </div>
      </footer>
    </div>
  );
}
