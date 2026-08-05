import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import api from "../api/client";
import logoIcon from "../assets/consultadd-icon.jpeg";
import LinkedInProfiles from "../components/tracker/LinkedInProfiles";
import Resumes from "../components/tracker/Resumes";
import Emails from "../components/tracker/Emails";
import PhoneNumbers from "../components/tracker/PhoneNumbers";
import JobApplications from "../components/tracker/JobApplications";
import RecruiterOutreach from "../components/tracker/RecruiterOutreach";
import VendorActivities from "../components/tracker/VendorActivities";
import DailyNotes from "../components/tracker/DailyNotes";
import Support from "../components/tracker/Support";
import LiveFeed from "../components/tracker/LiveFeed";

export const img = (name) => `${import.meta.env.BASE_URL}images/${name}.jpg`;

// Each tab gets its own landmark photo dissolving into a tint pulled from
// that image's palette, so the whole pane reads as one themed surface
// instead of a cropped strip pasted on top.
export const TAB_BANNERS = {
  overview: { src: img("ny-skyline"), caption: "New York, NY", tint: "#FBF3E9" },
  applications: { src: img("capitol"), caption: "Washington, DC", tint: "#EFF4FA" },
  outreach: { src: img("golden-gate-bridge"), caption: "San Francisco, CA", tint: "#FBF0EA" },
  activities: { src: img("brooklyn-bridge"), caption: "Brooklyn, NY", tint: "#F6F1E7" },
  notes: { src: img("alaska"), caption: "Alaska", tint: "#EAF3F7" },
  linkedin: { src: img("harvard"), caption: "Cambridge, MA", tint: "#F8EFEC" },
  resumes: { src: img("mit"), caption: "Cambridge, MA", tint: "#F0F5EC" },
  emails: { src: img("manhattan-bridge"), caption: "Manhattan, NY", tint: "#EEF1F5" },
  "phone-numbers": { src: img("mount-rushmore"), caption: "South Dakota", tint: "#EEF2ED" },
  support: { src: img("statue-of-liberty"), caption: "Liberty Island, NY", tint: "#EFF4F5" },
};

// A handful of named looks for "Simple" mode — background, a faint CSS
// texture (no images), and a font, each picking up a different classic
// web look. Picked once, remembered until changed.
export const SIMPLE_THEMES = [
  {
    id: "default", label: "Default",
    bg: "#FAFAFA", texture: "none",
    cardBg: "#FFFFFF", cardBorder: "#E4E4E7",
    font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  },
  {
    id: "classic", label: "Classic",
    bg: "#F8F1E4",
    texture: "repeating-linear-gradient(0deg, rgba(0,0,0,0.025) 0px, rgba(0,0,0,0.025) 1px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, rgba(0,0,0,0.025) 0px, rgba(0,0,0,0.025) 1px, transparent 1px, transparent 24px)",
    cardBg: "#FFFDF8", cardBorder: "#E8D9BE",
    font: "Georgia, 'Times New Roman', serif",
  },
  {
    id: "terminal", label: "Terminal",
    bg: "#EFF5EF",
    texture: "repeating-linear-gradient(0deg, rgba(22,101,52,0.05) 0px, rgba(22,101,52,0.05) 1px, transparent 1px, transparent 3px)",
    cardBg: "#FBFDFB", cardBorder: "#CFE3D3",
    font: "'Courier New', Courier, monospace",
  },
  {
    id: "ocean", label: "Ocean",
    bg: "#EDF3F8",
    texture: "radial-gradient(rgba(37,99,235,0.06) 1px, transparent 1px)",
    textureSize: "16px 16px",
    cardBg: "#FFFFFF", cardBorder: "#D6E4F0",
    font: "Verdana, 'Trebuchet MS', sans-serif",
  },
];

const STATUS_LIST = ["Applied", "Submitted to Client", "Interview Scheduled", "Offer", "Rejected", "No Response"];
const TODAY   = new Date().toISOString().slice(0, 10);
const PAGE_SZ = 15;

const VENDOR_ACTIVITY_TYPES = ["cold_email", "vendor_call", "tech_screening", "interview", "offer"];
const VA_LABELS = { cold_email: "Cold emails", vendor_call: "Vendor calls", tech_screening: "Tech screenings", interview: "Interviews", offer: "Offers" };
const PERIOD_LABELS = { daily: "today", weekly: "in the last 7 days", monthly: "in the last 30 days", sixmonth: "in the last 6 months", yearly: "in the last 12 months", custom: "in the selected range" };
const EMPTY_ASSETS = { resumes: [], linkedin: [], emails: [], phoneUsage: [], phoneCalls: [], outreach: [], vendorActivities: [] };

function isSubmission(status) { return status !== "Applied" && status !== "No Response"; }
function fmtIso(d) { return d.toISOString().slice(0, 10); }
function fmtDisplay(s) {
  return new Date(s + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
function initials(name = "") { return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase(); }

function statusColors(status) {
  if (status === "Offer") return { bg: "#DCFCE7", color: "#15803D" };
  if (status === "Interview Scheduled") return { bg: "#DBEAFE", color: "#1D4ED8" };
  if (status === "Submitted to Client") return { bg: "#EDE9FE", color: "#6D28D9" };
  if (status === "Rejected") return { bg: "#FEE2E2", color: "#B91C1C" };
  if (status === "No Response") return { bg: "#F1F5F9", color: "#64748B" };
  return { bg: "#FEF3C7", color: "#B45309" };
}

function getRangeBounds(timeRange, customStart, customEnd) {
  if (timeRange === "custom") return { start: customStart || "2026-01-01", end: customEnd || TODAY };
  const dMap = { daily: 1, weekly: 7, monthly: 30, sixmonth: 182, yearly: 365 };
  const days = dMap[timeRange] || 30;
  const d = new Date(TODAY + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - (days - 1));
  return { start: fmtIso(d), end: TODAY };
}

const TABS = [
  ["overview", "Overview"],
  ["applications", "Applications"],
  ["outreach", "Inbound Requirements"],
  ["activities", "Vendor Activities"],
  ["notes", "Daily Notes"],
  ["linkedin", "LinkedIn Profiles"],
  ["resumes", "Resumes"],
  ["emails", "Emails"],
  ["phone-numbers", "Phone Numbers"],
  ["support", "Support"],
];

/* ─────────────── shared style helpers ─────────────── */
const navItem = (active) =>
  `w-full flex items-center gap-2.5 pl-3.5 pr-3 py-2 rounded-md text-[13px] font-medium transition-colors text-left border-l-2 ${
    active ? "bg-zinc-800 text-white font-semibold border-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border-transparent"
  }`;
const pillBtn = (active) =>
  `h-7 px-3.5 rounded-md text-xs font-semibold transition-colors ${
    active ? "bg-white text-dark shadow-sm" : "text-muted hover:text-dark"
  }`;
const chipBtn = (active) =>
  `h-8 px-3.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
    active ? "bg-primary border-primary text-white shadow-sm" : "bg-white border-border text-medium hover:bg-surface hover:border-zinc-300"
  }`;
const ghostBtn = "h-8 px-3.5 rounded-lg border border-border bg-white text-xs font-semibold text-medium hover:bg-surface hover:border-zinc-300 transition-colors";
const iconGhostBtn = "w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-white text-muted hover:bg-surface hover:text-dark transition-colors";
const th = "text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted whitespace-nowrap";

/* ─────────────── COMPONENT ─────────────── */
export default function PerformanceDashboard({ user, onLogout, onOpenAdminPanel }) {
  const isAdminUser = user?.role === "admin";

  const [s, setRaw] = useState({
    tab: "overview",
    role: isAdminUser ? "admin" : "recruiter",
    viewingRecruiterId: null,
    timeRange: "monthly", customStart: "", customEnd: TODAY,
    sortCol: "applications", sortDir: "desc",
    drillRecruiterId: null,
    logPage: 1, logSearch: "", logPortalFilter: "all", logStatusFilter: "all",
    manageOpen: false, manageTab: "recruiters",
    newRecruiterName: "", newPortalName: "",
    toast: null, jdModalAppId: null,
    manageLoading: false,
    changePwOpen: false, changePwOld: "", changePwNew: "", changePwConfirm: "", changePwLoading: false, changePwError: "",
  });

  const [managers, setManagers] = useState([]);
  const [portalsList, setPortalsList] = useState([]);
  const [applications, setApplications] = useState([]);
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [assets, setAssets] = useState(EMPTY_ASSETS);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Per-user preference: the photo-themed "creative" background, or the
  // original plain surface. Persisted locally so it survives reloads and
  // doesn't leak between different people sharing the same browser.
  const bgPrefKey = `pulse-dashboard-bg:${user?.id || "guest"}`;
  const [bgPref, setBgPref] = useState(() => {
    try { return localStorage.getItem(bgPrefKey) || "creative"; } catch { return "creative"; }
  });
  const setBgPrefPersist = useCallback((val) => {
    setBgPref(val);
    try { localStorage.setItem(bgPrefKey, val); } catch { /* ignore */ }
  }, [bgPrefKey]);

  // Which named look to use while in "Simple" mode — also remembered per user.
  const simpleThemeKey = `pulse-simple-theme:${user?.id || "guest"}`;
  const [simpleThemeId, setSimpleThemeId] = useState(() => {
    try { return localStorage.getItem(simpleThemeKey) || "default"; } catch { return "default"; }
  });
  const setSimpleThemePersist = useCallback((val) => {
    setSimpleThemeId(val);
    try { localStorage.setItem(simpleThemeKey, val); } catch { /* ignore */ }
  }, [simpleThemeKey]);
  const simpleTheme = SIMPLE_THEMES.find(t => t.id === simpleThemeId) || SIMPLE_THEMES[0];

  const toastTimer = useRef(null);

  const set = useCallback((patch) => {
    setRaw(prev => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));
  }, []);

  /* Load team + portals once */
  useEffect(() => {
    api.get("/users/public").then(r => setManagers(r.data)).catch(() => setManagers([]));
    api.get("/portals").then(r => setPortalsList(r.data.filter(p => p.is_active))).catch(() => setPortalsList([]));
  }, []);

  /* Load real applications for the Overview tab, scoped by role + time range */
  useEffect(() => {
    if (s.tab !== "overview") return;
    const { start, end } = getRangeBounds(s.timeRange, s.customStart, s.customEnd);
    const params = { start, end };
    if (isAdminUser && s.role === "recruiter" && s.viewingRecruiterId) params.user_id = s.viewingRecruiterId;
    setAppsLoaded(false);
    api.get("/applications", { params })
      .then(r => setApplications(r.data))
      .catch(() => setApplications([]))
      .finally(() => setAppsLoaded(true));
  }, [s.tab, s.timeRange, s.customStart, s.customEnd, s.role, s.viewingRecruiterId, isAdminUser]);

  /* Load asset inventory (resumes, LinkedIn, emails, phone numbers, outreach, vendor activity)
     for the Overview tab's asset board. All-time totals, scoped by role like applications above —
     not refetched on time-range change since the board shows all-time counts, not a range-filtered log. */
  useEffect(() => {
    if (s.tab !== "overview") return;
    const params = {};
    if (isAdminUser && s.role === "recruiter" && s.viewingRecruiterId) params.user_id = s.viewingRecruiterId;
    setAssetsLoaded(false);
    Promise.all([
      api.get("/resumes", { params }),
      api.get("/linkedin", { params }),
      api.get("/emails", { params }),
      api.get("/phone-numbers/portal-usage", { params }),
      api.get("/phone-numbers/vendor-calls", { params }),
      api.get("/outreach", { params }),
      api.get("/vendor-activities", { params }),
    ]).then(([resumes, linkedin, emails, phoneUsage, phoneCalls, outreach, vendorActivities]) => {
      setAssets({
        resumes: resumes.data, linkedin: linkedin.data, emails: emails.data,
        phoneUsage: phoneUsage.data, phoneCalls: phoneCalls.data,
        outreach: outreach.data, vendorActivities: vendorActivities.data,
      });
    }).catch(() => setAssets(EMPTY_ASSETS))
      .finally(() => setAssetsLoaded(true));
  }, [s.tab, s.role, s.viewingRecruiterId, isAdminUser]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const showToast = useCallback((msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    set({ toast: msg });
    toastTimer.current = setTimeout(() => set({ toast: null }), 2600);
  }, [set]);

  const handleChangePw = useCallback(async (e) => {
    e.preventDefault();
    if (s.changePwNew !== s.changePwConfirm) { set({ changePwError: "Passwords don't match" }); return; }
    if (s.changePwNew.length < 8) { set({ changePwError: "Minimum 8 characters" }); return; }
    set({ changePwLoading: true, changePwError: "" });
    try {
      await api.post("/auth/change-password", { oldPassword: s.changePwOld, newPassword: s.changePwNew });
      set({ changePwOpen: false, changePwOld: "", changePwNew: "", changePwConfirm: "", changePwLoading: false });
      showToast("Password changed successfully");
    } catch (err) {
      set({ changePwError: err.response?.data?.error || "Failed to change password", changePwLoading: false });
    }
  }, [s.changePwNew, s.changePwConfirm, s.changePwOld, set, showToast]);

  /* Manage actions — real API calls, then refetch */
  const addRecruiter = useCallback(async () => {
    const name = s.newRecruiterName.trim();
    if (!name) return;
    set({ manageLoading: true });
    try {
      await api.post("/users", { name, email: name.toLowerCase().replace(/\s+/g, ".") + "@consultadd.com" });
      const { data } = await api.get("/users/public");
      setManagers(data);
      set({ newRecruiterName: "", manageLoading: false });
      showToast(`Added ${name} to the team`);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to add account manager");
      set({ manageLoading: false });
    }
  }, [s.newRecruiterName, set, showToast]);

  const deleteRecruiter = useCallback(async (id, name) => {
    if (!window.confirm(`Remove ${name} and all their application records?`)) return;
    try {
      await api.delete(`/users/${id}`);
      const { data } = await api.get("/users/public");
      setManagers(data);
      set(prev => prev.viewingRecruiterId === id ? { viewingRecruiterId: data[0]?.id || null } : {});
      showToast(`Removed ${name}`);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to remove account manager");
    }
  }, [set, showToast]);

  const addPortal = useCallback(async () => {
    const name = s.newPortalName.trim();
    if (!name) return;
    if (portalsList.some(p => p.name.toLowerCase() === name.toLowerCase())) { showToast(`${name} already exists`); return; }
    try {
      await api.post("/portals", { name });
      const { data } = await api.get("/portals");
      setPortalsList(data.filter(p => p.is_active));
      set({ newPortalName: "" });
      showToast(`Added ${name}`);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to add portal");
    }
  }, [s.newPortalName, portalsList, set, showToast]);

  const deletePortal = useCallback(async (portal) => {
    try {
      await api.delete(`/portals/${portal.id}`);
      const { data } = await api.get("/portals");
      setPortalsList(data.filter(p => p.is_active));
    } catch { /* non-fatal */ }
    showToast(`Removed ${portal.name}`);
  }, [showToast]);

  const exportCsv = useCallback((apps, managerById) => {
    const header = ["Date", "Manager", "Candidate", "Job Title", "Portal", "Resume", "Status"];
    const lines = [header.join(","), ...apps.map(a => [
      a.applied_date, managerById[a.user_id]?.name || a.user_name || "",
      a.candidate_info || "", a.job_title, a.portal_name || "", a.resume_title || "", a.status,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "consultadd-export.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }, []);

  /* ─── Derived (Overview tab only) ─── */
  const C = useMemo(() => {
    if (!appsLoaded) return { dataLoaded: false };
    const isAdmin = s.role === "admin";
    const isRecruiter = !isAdmin;
    const managerById = {};
    managers.forEach(m => { managerById[m.id] = m; });

    const apps = applications;
    const totalApps = apps.length;
    const subApps = apps.filter(a => isSubmission(a.status));
    const totalSubs = subApps.length;
    const subRate = totalApps ? Math.round((totalSubs / totalApps) * 100) : 0;
    const activeIds = new Set(apps.map(a => a.user_id));

    const kpis = isAdmin ? [
      { label: "Total applications", value: totalApps.toLocaleString(), sub: `${activeIds.size} active managers`, color: "#18181B" },
      { label: "Client submissions", value: totalSubs.toLocaleString(), sub: subRate + "% of applications", color: "#18181B" },
      { label: "Submission rate", value: subRate + "%", sub: "Applied → submitted to client", color: "#18181B" },
      { label: "Team size", value: managers.length, sub: activeIds.size + " active this period", color: "#18181B" },
    ] : [
      { label: "My applications", value: totalApps.toLocaleString(), sub: "in selected range", color: "#18181B" },
      { label: "My submissions", value: totalSubs.toLocaleString(), sub: subRate + "% of applications", color: "#18181B" },
      { label: "Submission rate", value: subRate + "%", sub: "Applied → submitted to client", color: "#18181B" },
    ];

    /* trend chart */
    const { start, end } = getRangeBounds(s.timeRange, s.customStart, s.customEnd);
    const dayCount = Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000) + 1);
    const byWeek = dayCount > 45;
    const buckets = {}, bucketOrder = [];
    apps.forEach(a => {
      let key;
      if (byWeek) { const d = new Date(a.applied_date + "T00:00:00Z"); const ws = new Date(d); ws.setUTCDate(d.getUTCDate() - d.getUTCDay()); key = fmtIso(ws); }
      else key = a.applied_date;
      if (!buckets[key]) { buckets[key] = { apps: 0, subs: 0 }; bucketOrder.push(key); }
      buckets[key].apps++; if (isSubmission(a.status)) buckets[key].subs++;
    });
    bucketOrder.sort();
    const maxVal = Math.max(1, ...bucketOrder.map(k => buckets[k].apps));
    const trendBars = bucketOrder.slice(-16).map(k => {
      const b = buckets[k]; const d = new Date(k + "T00:00:00Z");
      return {
        label: byWeek ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : d.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" }),
        dateLabel: byWeek ? `Week of ${fmtDisplay(k)}` : fmtDisplay(k),
        apps: b.apps, subs: b.subs,
        appH: Math.round((b.apps / maxVal) * 140), subH: Math.round((b.subs / maxVal) * 140)
      };
    });

    /* portal bars */
    const portalUnion = Array.from(new Set([...portalsList.map(p => p.name), ...apps.map(a => a.portal_name).filter(Boolean)]));
    const pCounts = {}; portalUnion.forEach(p => pCounts[p] = 0);
    apps.forEach(a => { if (a.portal_name) pCounts[a.portal_name] = (pCounts[a.portal_name] || 0) + 1; });
    const maxP = Math.max(1, ...Object.values(pCounts));
    const portalBars = portalUnion.map(p => ({ portal: p, count: pCounts[p], pct: Math.round((pCounts[p] / maxP) * 100) })).sort((a, b) => b.count - a.count);

    /* team table */
    let teamRows = [];
    if (isAdmin) {
      teamRows = managers.map(m => {
        const mApps = apps.filter(a => a.user_id === m.id);
        const mSubs = mApps.filter(a => isSubmission(a.status));
        const rate = mApps.length ? Math.round((mSubs.length / mApps.length) * 100) : 0;
        const pc = {}; mApps.forEach(a => { if (a.portal_name) pc[a.portal_name] = (pc[a.portal_name] || 0) + 1; });
        let topPortal = "—", topC = 0; Object.entries(pc).forEach(([p, c]) => { if (c > topC) { topPortal = p; topC = c; } });
        const last = mApps.length ? mApps.reduce((mx, a) => a.applied_date > mx ? a.applied_date : mx, mApps[0].applied_date) : "—";
        return { id: m.id, name: m.name, applications: mApps.length, submissions: mSubs.length, rate: rate + "%", rateColor: rate >= 40 ? "#15803D" : rate >= 20 ? "#B45309" : "#B91C1C", topPortal, lastActive: last === "—" ? "—" : fmtDisplay(last), _apps: mApps.length, _subs: mSubs.length, _rate: rate };
      });
      const sortKey = s.sortCol === "applications" ? "_apps" : s.sortCol === "submissions" ? "_subs" : s.sortCol === "rate" ? "_rate" : "name";
      const dir = s.sortDir === "asc" ? 1 : -1;
      teamRows.sort((a, b) => sortKey === "name" ? dir * a.name.localeCompare(b.name) : dir === 1 ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]);
    }

    /* log */
    let logSource = apps;
    if (s.logPortalFilter !== "all") logSource = logSource.filter(a => a.portal_name === s.logPortalFilter);
    if (s.logStatusFilter !== "all") logSource = logSource.filter(a => a.status === s.logStatusFilter);
    if (s.logSearch.trim()) {
      const q = s.logSearch.trim().toLowerCase();
      logSource = logSource.filter(a => (a.candidate_info || "").toLowerCase().includes(q) || a.job_title.toLowerCase().includes(q));
    }
    logSource = [...logSource].sort((a, b) => a.applied_date < b.applied_date ? 1 : -1);
    const totalPages = Math.max(1, Math.ceil(logSource.length / PAGE_SZ));
    const page = Math.min(s.logPage, totalPages);
    const logRows = logSource.slice((page - 1) * PAGE_SZ, page * PAGE_SZ).map(a => {
      const sc = statusColors(a.status);
      return {
        id: a.id, date: fmtDisplay(a.applied_date), recruiterName: managerById[a.user_id]?.name || a.user_name || "—",
        candidateName: a.candidate_info || "—", jobTitle: a.job_title, portal: a.portal_name || "—", resumeFile: a.resume_title || "—",
        status: a.status, statusBg: sc.bg, statusColor: sc.color,
      };
    });

    /* drilldown */
    let drillData = null;
    if (isAdmin && s.drillRecruiterId) {
      const m = managerById[s.drillRecruiterId];
      const dApps = apps.filter(a => a.user_id === s.drillRecruiterId);
      const dSubs = dApps.filter(a => isSubmission(a.status));
      const dRate = dApps.length ? Math.round((dSubs.length / dApps.length) * 100) : 0;
      drillData = {
        name: m?.name || "", total: dApps.length,
        kpis: [{ label: "Applications", value: dApps.length, color: "#18181B" }, { label: "Submissions", value: dSubs.length, color: "#18181B" }, { label: "Submission rate", value: dRate + "%", color: "#18181B" }],
        rows: [...dApps].sort((a, b) => a.applied_date < b.applied_date ? 1 : -1).slice(0, 30).map(a => { const sc = statusColors(a.status); return { date: fmtDisplay(a.applied_date), candidateName: a.candidate_info || "—", jobTitle: a.job_title, portal: a.portal_name || "—", status: a.status, statusBg: sc.bg, statusColor: sc.color }; })
      };
    }

    /* JD modal */
    let jdModalData = null;
    if (s.jdModalAppId) {
      const app = apps.find(a => a.id === s.jdModalAppId);
      if (app) jdModalData = { jobTitle: app.job_title, candidateName: app.candidate_info || "—", portal: app.portal_name || "—", date: fmtDisplay(app.applied_date), description: app.job_description || "No description provided." };
    }

    const rangeLabelMap = { daily: "Today", weekly: "Last 7 days", monthly: "Last 30 days", sixmonth: "Last 6 months", yearly: "Last 12 months", custom: `${start} to ${end}` };

    return {
      dataLoaded: true, isAdmin, isRecruiter, rangeLabel: rangeLabelMap[s.timeRange] || "",
      kpis, trendBars, trendSubtitle: byWeek ? "Weekly buckets" : "Daily buckets",
      portalBars,
      teamRows, teamCount: managers.length,
      logRows, totalPages, page, logSource, logCountLabel: `Showing ${logSource.length ? (page - 1) * PAGE_SZ + 1 : 0}–${Math.min(page * PAGE_SZ, logSource.length)} of ${logSource.length}`,
      drillData, jdModalData, managerById, scopedApps: apps,
      portalFilterOptions: ["all", ...portalUnion],
      statusFilterOptions: ["all", ...STATUS_LIST],
    };
  }, [appsLoaded, applications, managers, portalsList, s.role, s.sortCol, s.sortDir, s.drillRecruiterId, s.jdModalAppId, s.logPage, s.logSearch, s.logPortalFilter, s.logStatusFilter, s.timeRange, s.customStart, s.customEnd]);

  /* ─── Derived (Overview tab asset board) ─── */
  const A = useMemo(() => {
    if (!assetsLoaded) return { loaded: false };
    const { start, end } = getRangeBounds(s.timeRange, s.customStart, s.customEnd);
    const inRange = (row, field) => { const d = (row[field] || row.created_at || "").slice(0, 10); return d >= start && d <= end; };
    const periodLabel = PERIOD_LABELS[s.timeRange] || "in the selected range";

    const resumesActive = assets.resumes.filter(r => r.is_active !== false);
    const resumesInactive = assets.resumes.length - resumesActive.length;
    const resumesPeriod = assets.resumes.filter(r => inRange(r, "created_at")).length;

    const linkedinPeriod = assets.linkedin.filter(r => inRange(r, "created_at")).length;
    const totalConnections = assets.linkedin.reduce((sum, r) => sum + (Number(r.connections) || 0), 0);

    const emailsPeriod = assets.emails.filter(r => inRange(r, "created_at")).length;

    const phoneNumberSet = new Set([...assets.phoneUsage, ...assets.phoneCalls].map(r => r.phone_number).filter(Boolean));

    const outreachPeriod = assets.outreach.filter(r => inRange(r, "contacted_date")).length;

    const vaByType = {};
    assets.vendorActivities.forEach(r => { vaByType[r.activity_type] = (vaByType[r.activity_type] || 0) + 1; });
    const maxVa = Math.max(1, ...VENDOR_ACTIVITY_TYPES.map(t => vaByType[t] || 0));
    const vaBreakdown = VENDOR_ACTIVITY_TYPES.map(t => ({ label: VA_LABELS[t], count: vaByType[t] || 0, pct: Math.round(((vaByType[t] || 0) / maxVa) * 100) }));

    const assetCards = [
      { label: "Resumes", value: resumesActive.length.toLocaleString(), sub: `+${resumesPeriod} ${periodLabel}${resumesInactive ? ` · ${resumesInactive} inactive` : ""}` },
      { label: "LinkedIn profiles", value: assets.linkedin.length.toLocaleString(), sub: `+${linkedinPeriod} ${periodLabel} · ${totalConnections.toLocaleString()} total connections` },
      { label: "Emails", value: assets.emails.length.toLocaleString(), sub: `+${emailsPeriod} ${periodLabel}` },
      { label: "Phone numbers", value: phoneNumberSet.size.toLocaleString(), sub: `${assets.phoneUsage.length} portal listings · ${assets.phoneCalls.length} vendor calls` },
      { label: "Outreach contacts", value: assets.outreach.length.toLocaleString(), sub: `+${outreachPeriod} ${periodLabel}` },
      { label: "Vendor activities", value: assets.vendorActivities.length.toLocaleString(), sub: `${vaByType.interview || 0} interviews · ${vaByType.offer || 0} offers` },
    ];

    return { loaded: true, assetCards, vaBreakdown };
  }, [assetsLoaded, assets, s.timeRange, s.customStart, s.customEnd]);

  const sortToggle = (col, def) => { const same = s.sortCol === col; return { sortCol: col, sortDir: same && s.sortDir === def ? (def === "asc" ? "desc" : "asc") : def }; };

  const showOverviewLoading = s.tab === "overview" && !C.dataLoaded;
  const isAdminMode = s.role === "admin";
  const isRecruiterMode = !isAdminMode;
  const currentTabLabel = TABS.find(([key]) => key === s.tab)?.[1] || "Overview";
  const theme = bgPref === "simple" ? null : TAB_BANNERS[s.tab];
  const cardCls = theme ? "glass-card" : "card";

  return (
    <div className="min-h-screen bg-surface text-dark font-sans flex">

      {/* ══ SIDEBAR ══ */}
      <nav className="w-60 bg-zinc-900 flex flex-col flex-shrink-0 sticky top-0 h-screen">
        <div className="px-4 py-4 flex items-center gap-2.5 border-b border-zinc-800">
          <img src={logoIcon} alt="ConsultAdd" className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-white font-bold text-[13.5px] leading-tight truncate">ConsultAdd Pulse</div>
            <div className="text-zinc-500 text-[10.5px] leading-tight">Performance Tracking</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {TABS.map(([key, label]) => (
            <React.Fragment key={key}>
              {key === "linkedin" && (
                <div className="px-3.5 pt-4 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">Assets</div>
              )}
              {key === "support" && (
                <div className="px-3.5 pt-4 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">Help</div>
              )}
              <button onClick={() => set({ tab: key })} className={navItem(s.tab === key)}>
                {label}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="border-t border-zinc-800 p-3 space-y-2">
          {isAdminUser && (
            <button onClick={() => set({ manageOpen: true, manageTab: "recruiters" })}
              className="w-full h-8 rounded-md text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-left px-2.5">
              Manage team &amp; portals
            </button>
          )}
          {isAdminUser && onOpenAdminPanel && (
            <button onClick={onOpenAdminPanel}
              className="w-full h-8 rounded-md text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-left px-2.5">
              Admin Panel
            </button>
          )}
          <div className="px-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Background</div>
            <div className="flex bg-zinc-800 rounded-md p-0.5">
              {[["creative", "Creative"], ["simple", "Simple"]].map(([key, label]) => (
                <button key={key} onClick={() => setBgPrefPersist(key)}
                  className={`flex-1 h-6 rounded text-[11px] font-semibold transition-colors ${bgPref === key ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>
            {bgPref === "simple" && (
              <div className="flex gap-1.5 mt-1.5">
                {SIMPLE_THEMES.map(t => (
                  <button key={t.id} onClick={() => setSimpleThemePersist(t.id)} title={t.label}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${simpleThemeId === t.id ? "border-white scale-110" : "border-transparent hover:scale-105"}`}
                    style={{ background: t.bg }} />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5 pt-1.5 px-1">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">{initials(user?.name)}</div>
            <div className="min-w-0 flex-1">
              <div className="text-white text-[12.5px] font-semibold leading-tight truncate">{user?.name || "User"}</div>
              <div className="text-zinc-500 text-[10.5px] leading-tight">{user?.role === "admin" ? "Admin" : "Account Manager"}</div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => set({ changePwOpen: true, changePwOld: "", changePwNew: "", changePwConfirm: "", changePwError: "" })}
              className="flex-1 h-7 rounded-md border border-zinc-700 text-[11.5px] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
              Password
            </button>
            <button onClick={onLogout}
              className="flex-1 h-7 rounded-md border border-zinc-700 text-[11.5px] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* ══ MAIN ══ */}
      <div
        className="flex-1 min-w-0 flex flex-col"
        style={theme ? {
          backgroundImage: `linear-gradient(${theme.tint}30, ${theme.tint}4D), url(${theme.src})`,
          backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed", backgroundRepeat: "no-repeat",
        } : {
          background: simpleTheme.bg,
          backgroundImage: simpleTheme.texture,
          backgroundSize: simpleTheme.textureSize,
          fontFamily: simpleTheme.font,
          "--card-bg": simpleTheme.cardBg,
          "--card-border": simpleTheme.cardBorder,
        }}
      >
        <div className={theme ? "sticky top-0 z-20 bg-white/70 backdrop-blur-lg border-b border-white/40" : "sticky top-0 z-20 border-b"} style={theme ? undefined : { background: simpleTheme.cardBg, borderColor: simpleTheme.cardBorder }}>
          <div className="px-8 py-3.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[15.5px] font-bold tracking-tight">{currentTabLabel}</div>
            {s.tab === "overview" && (
              <div className="flex items-center gap-2 flex-wrap">
                {isAdminUser && (
                  <div className="flex bg-surface-alt rounded-lg p-1">
                    <button className={pillBtn(isAdminMode)} onClick={() => set({ role: "admin", logPage: 1, drillRecruiterId: null })}>Admin view</button>
                    <button className={pillBtn(isRecruiterMode)} onClick={() => set(prev => ({ role: "recruiter", logPage: 1, drillRecruiterId: null, viewingRecruiterId: prev.viewingRecruiterId || managers[0]?.id || null }))}>My view</button>
                  </div>
                )}
                {isAdminUser && isRecruiterMode && (
                  <select value={s.viewingRecruiterId || ""} onChange={e => set({ viewingRecruiterId: e.target.value, logPage: 1 })}
                    className="h-8 rounded-lg border border-border bg-white px-2.5 text-[13px] font-semibold text-dark">
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                )}
                <div className="w-px h-5 bg-border mx-0.5" />
                {[["daily","Daily"],["weekly","Weekly"],["monthly","Monthly"],["sixmonth","6-Month"],["yearly","Yearly"],["custom","Custom"]].map(([key, label]) => (
                  <button key={key} onClick={() => set({ timeRange: key, logPage: 1 })} className={chipBtn(s.timeRange === key)}>
                    {label}
                  </button>
                ))}
                {s.timeRange === "custom" && (
                  <div className="flex items-center gap-1.5 ml-1">
                    <input type="date" value={s.customStart} onChange={e => set({ customStart: e.target.value, logPage: 1 })} className="h-8 rounded-lg border border-border px-2 text-xs" />
                    <span className="text-subtle text-xs">to</span>
                    <input type="date" value={s.customEnd} onChange={e => set({ customEnd: e.target.value, logPage: 1 })} className="h-8 rounded-lg border border-border px-2 text-xs" />
                  </div>
                )}
                <div className="text-xs text-muted ml-1">{C.rangeLabel}</div>
                {C.isAdmin && (
                  <button onClick={() => exportCsv(C.scopedApps, C.managerById)} className={ghostBtn}>
                    Export CSV
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══ BODY ══ */}
        <div className="px-8 py-6 pb-16 flex-1">

          {["linkedin", "resumes", "emails", "phone-numbers", "applications", "outreach", "activities", "notes", "support"].includes(s.tab) && (
            <div className={`${cardCls} p-6`}>
              {s.tab === "linkedin" && <LinkedInProfiles user={user} />}
              {s.tab === "resumes" && <Resumes user={user} />}
              {s.tab === "emails" && <Emails user={user} />}
              {s.tab === "phone-numbers" && <PhoneNumbers user={user} />}
              {s.tab === "applications" && <JobApplications user={user} />}
              {s.tab === "outreach" && <RecruiterOutreach user={user} />}
              {s.tab === "activities" && <VendorActivities user={user} />}
              {s.tab === "notes" && <DailyNotes user={user} />}
              {s.tab === "support" && <Support user={user} />}
            </div>
          )}

          {s.tab === "overview" && showOverviewLoading && (
            <div className={`${cardCls} flex items-center justify-center min-h-[300px] text-medium text-sm gap-2.5`}>
              <span className="spin inline-block border-2 border-border rounded-full" style={{ borderTopColor: "#18181B", width: 18, height: 18 }} />
              Loading data…
            </div>
          )}

          {s.tab === "overview" && !showOverviewLoading && (() => {
            const { isAdmin, isRecruiter, kpis, trendBars, trendSubtitle, portalBars, teamRows, teamCount, logRows, totalPages, page, logCountLabel, portalFilterOptions, statusFilterOptions } = C;
            return (
              <>
                {/* KPI cards */}
                <div className="grid gap-3.5 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))" }}>
                  {kpis.map((kpi, i) => (
                    <div key={i} className={`${cardCls} p-5`}>
                      <div className="text-[11.5px] text-muted font-semibold mb-2 uppercase tracking-wide">{kpi.label}</div>
                      <div className="text-[28px] font-extrabold tracking-tight leading-none" style={{ color: kpi.color }}>{kpi.value}</div>
                      <div className="text-xs text-subtle mt-1.5">{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Live feed of daily work, admins only */}
                {isAdmin && <LiveFeed />}

                {/* Asset inventory */}
                <div className={`${cardCls} px-4 py-2.5 mb-2 flex items-baseline justify-between`}>
                  <div className="text-[13.5px] font-bold">{isAdmin ? "Team asset inventory" : "My asset inventory"}</div>
                  <div className="text-xs text-medium">All-time totals · deltas reflect {C.rangeLabel.toLowerCase()}</div>
                </div>
                {!A.loaded ? (
                  <div className={`${cardCls} p-5 mb-5 text-sm text-muted`}>Loading asset data…</div>
                ) : (
                  <>
                    <div className="grid gap-3.5 mb-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))" }}>
                      {A.assetCards.map((kpi, i) => (
                        <div key={i} className={`${cardCls} p-5`}>
                          <div className="text-[11.5px] text-muted font-semibold mb-2 uppercase tracking-wide">{kpi.label}</div>
                          <div className="text-[28px] font-extrabold tracking-tight leading-none text-dark">{kpi.value}</div>
                          <div className="text-xs text-subtle mt-1.5">{kpi.sub}</div>
                        </div>
                      ))}
                    </div>
                    <div className={`${cardCls} p-5 mb-5`}>
                      <div className="text-[13.5px] font-bold mb-2.5">Vendor activity breakdown</div>
                      {A.vaBreakdown.every(v => v.count === 0) && <div className="text-subtle text-sm">No vendor activity logged yet</div>}
                      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
                        {A.vaBreakdown.map((v, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-xs text-medium mb-1">
                              <span>{v.label}</span><span className="text-subtle">{v.count}</span>
                            </div>
                            <div className="bg-surface-alt rounded h-1.5">
                              <div className="bg-zinc-500 h-full rounded" style={{ width: v.pct + "%" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Charts row */}
                <div className="grid gap-3.5 mb-5" style={{ gridTemplateColumns: "2fr 1fr" }}>
                  {/* Trend */}
                  <div className={`${cardCls} p-5`}>
                    <div className="text-[13.5px] font-bold mb-0.5">Applications vs. submissions over time</div>
                    <div className="text-xs text-subtle mb-3.5">{trendSubtitle}</div>
                    <div className="flex items-end gap-1.5 mt-6" style={{ height: 160 }}>
                      {trendBars.length === 0
                        ? <div className="w-full text-center text-subtle text-sm self-center">No data in range</div>
                        : trendBars.map((b, i) => (
                          <div key={i} className="relative group flex-1 flex flex-col items-center justify-end h-full gap-1 cursor-default">
                            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 whitespace-nowrap bg-dark text-white rounded-md px-2.5 py-1.5 shadow-popover">
                              <div className="text-[10px] text-zinc-400 font-medium mb-0.5">{b.dateLabel}</div>
                              <div className="text-[11.5px] font-semibold">{b.apps} application{b.apps === 1 ? "" : "s"} · {b.subs} submission{b.subs === 1 ? "" : "s"}</div>
                            </div>
                            <div className="w-full flex items-end justify-center gap-0.5 h-full">
                              <div className="w-[45%] rounded-t bg-zinc-200 group-hover:bg-zinc-300 transition-colors" style={{ height: b.appH, minHeight: 2 }} />
                              <div className="w-[45%] rounded-t bg-primary group-hover:bg-primary-hover transition-colors" style={{ height: b.subH, minHeight: 2 }} />
                            </div>
                            <div className="text-[10px] text-subtle whitespace-nowrap">{b.label}</div>
                          </div>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted"><span className="w-2.5 h-2.5 rounded-sm bg-zinc-200 inline-block" />Applications</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Submissions</div>
                    </div>
                  </div>
                  {/* Portal breakdown */}
                  <div className={`${cardCls} p-5`}>
                    <div className="text-[13.5px] font-bold mb-2.5">By job portal</div>
                    {portalBars.length === 0 && <div className="text-subtle text-sm">No applications in range</div>}
                    {portalBars.slice(0, 9).map((p, i) => (
                      <div key={i} className="mb-2">
                        <div className="flex justify-between text-xs text-medium mb-1">
                          <span>{p.portal}</span><span className="text-subtle">{p.count}</span>
                        </div>
                        <div className="bg-surface-alt rounded h-1.5">
                          <div className="bg-zinc-500 h-full rounded" style={{ width: p.pct + "%" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team performance table (admin) */}
                {isAdmin && (
                  <div className={`${cardCls} overflow-hidden mb-5`}>
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                      <div>
                        <div className="text-[14.5px] font-bold">Team performance</div>
                        <div className="text-xs text-subtle mt-0.5">Click a row for that manager's submission log</div>
                      </div>
                      <div className="text-xs text-subtle">{teamCount} managers</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-[13px]">
                        <thead>
                          <tr className="bg-surface-alt">
                            {[["name","Manager","left","asc"],["applications","Applications","right","desc"],["submissions","Submissions","right","desc"],["rate","Sub. rate","right","desc"]].map(([col, label, align, def]) => (
                              <th key={col} onClick={() => set(sortToggle(col, def))} className={`${th} cursor-pointer select-none ${align === "right" ? "text-right" : ""} ${col === "name" ? "pl-5" : ""}`}>
                                {label} {s.sortCol === col ? (s.sortDir === "asc" ? "↑" : "↓") : ""}
                              </th>
                            ))}
                            <th className={th}>Top portal</th>
                            <th className={`${th} pr-5`}>Last active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamRows.map(row => (
                            <tr key={row.id} className="team-row border-t border-border-soft cursor-pointer" onClick={() => set({ drillRecruiterId: row.id })}>
                              <td className="px-4 pl-5 py-2.5 font-semibold">{row.name}</td>
                              <td className="px-4 py-2.5 text-right">{row.applications}</td>
                              <td className="px-4 py-2.5 text-right">{row.submissions}</td>
                              <td className="px-4 py-2.5 text-right font-bold" style={{ color: row.rateColor }}>{row.rate}</td>
                              <td className="px-4 py-2.5 text-muted">{row.topPortal}</td>
                              <td className="px-4 pr-5 py-2.5 text-muted">{row.lastActive}</td>
                            </tr>
                          ))}
                          {teamRows.length === 0 && (
                            <tr><td colSpan={6} className="px-5 py-6 text-center text-subtle text-sm">No managers yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Submissions table */}
                <div className={`${cardCls} overflow-hidden`}>
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-[14.5px] font-bold">{isAdmin ? "All submissions & applications" : "My submission log"}</div>
                      <div className="text-xs text-subtle mt-0.5">{C.logSource.length.toLocaleString()} records in range</div>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      <input placeholder="Search candidate or job title…" value={s.logSearch} onChange={e => set({ logSearch: e.target.value, logPage: 1 })}
                        className="h-8 rounded-lg border border-border px-2.5 text-xs" style={{ width: 200 }} />
                      <select value={s.logPortalFilter} onChange={e => set({ logPortalFilter: e.target.value, logPage: 1 })} className="h-8 rounded-lg border border-border px-2 text-xs">
                        {portalFilterOptions.map(opt => <option key={opt} value={opt}>{opt === "all" ? "All portals" : opt}</option>)}
                      </select>
                      <select value={s.logStatusFilter} onChange={e => set({ logStatusFilter: e.target.value, logPage: 1 })} className="h-8 rounded-lg border border-border px-2 text-xs">
                        {statusFilterOptions.map(opt => <option key={opt} value={opt}>{opt === "all" ? "All statuses" : opt}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[12.5px]">
                      <thead>
                        <tr className="bg-surface-alt">
                          <th className={`${th} pl-5`}>Date</th>
                          {isAdmin && <th className={th}>Manager</th>}
                          <th className={th}>Candidate</th>
                          <th className={th}>Job title</th>
                          <th className={th}>Portal</th>
                          <th className={th}>Resume</th>
                          <th className={th}>Status</th>
                          <th className={`${th} pr-5`}>JD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logRows.map((row, i) => (
                          <tr key={row.id || i} className="border-t border-border-soft hover:bg-surface transition-colors">
                            <td className="px-4 pl-5 py-2.5 text-medium whitespace-nowrap">{row.date}</td>
                            {isAdmin && <td className="px-4 py-2.5 text-medium whitespace-nowrap">{row.recruiterName}</td>}
                            <td className="px-4 py-2.5 text-medium whitespace-nowrap">{row.candidateName}</td>
                            <td className="px-4 py-2.5 text-medium whitespace-nowrap">{row.jobTitle}</td>
                            <td className="px-4 py-2.5 text-muted whitespace-nowrap">{row.portal}</td>
                            <td className="px-4 py-2.5 text-muted whitespace-nowrap truncate max-w-[180px]">{row.resumeFile}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: row.statusBg, color: row.statusColor }}>{row.status}</span>
                            </td>
                            <td className="px-4 pr-5 py-2.5 whitespace-nowrap">
                              <button onClick={() => set({ jdModalAppId: row.id })} className="h-[26px] px-2.5 rounded-md border border-border bg-white text-[11.5px] font-semibold text-dark hover:bg-surface transition-colors">View</button>
                            </td>
                          </tr>
                        ))}
                        {logRows.length === 0 && (
                          <tr><td colSpan={isAdmin ? 8 : 7} className="px-5 py-6 text-center text-subtle text-sm">No records match your filters.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 py-3.5 flex items-center justify-between border-t border-border">
                    <div className="text-xs text-subtle">{logCountLabel}</div>
                    <div className="flex gap-1.5 items-center">
                      <button onClick={() => set({ logPage: Math.max(1, page - 1) })} disabled={page <= 1} className={ghostBtn}>Prev</button>
                      <div className="text-xs text-muted px-1">Page {page} / {totalPages}</div>
                      <button onClick={() => set({ logPage: Math.min(totalPages, page + 1) })} disabled={page >= totalPages} className={ghostBtn}>Next</button>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* ══ DRILLDOWN MODAL ══ */}
      {C.drillData && (
        <div onClick={() => set({ drillRecruiterId: null })} className="fixed inset-0 bg-[rgba(24,24,27,0.5)] z-40 flex items-start justify-center overflow-y-auto" style={{ padding: "40px 20px" }}>
          <div onClick={e => e.stopPropagation()} className="bg-surface rounded-2xl w-full overflow-hidden shadow-popover" style={{ maxWidth: 900 }}>
            <div className="bg-white px-6 py-5 flex items-center justify-between border-b border-border">
              <div>
                <div className="text-base font-bold">{C.drillData.name}</div>
                <div className="text-xs text-subtle mt-0.5">{C.rangeLabel} performance detail</div>
              </div>
              <button onClick={() => set({ drillRecruiterId: null })} className={iconGhostBtn}>✕</button>
            </div>
            <div className="p-6 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" }}>
              {C.drillData.kpis.map((kpi, i) => (
                <div key={i} className="bg-white rounded-xl border border-border p-3.5">
                  <div className="text-[11.5px] text-muted font-semibold mb-1.5">{kpi.label}</div>
                  <div className="text-[22px] font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr className="bg-surface-alt">
                      {["Date","Candidate","Job title","Portal","Status"].map((h, i) => (
                        <th key={h} className={`text-left py-2 text-[11.5px] font-semibold text-muted ${i === 0 || i === 4 ? "px-4" : "px-3"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {C.drillData.rows.map((row, i) => (
                      <tr key={i} className="border-t border-border-soft">
                        <td className="py-2.5 px-4 whitespace-nowrap text-medium">{row.date}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-medium">{row.candidateName}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-medium">{row.jobTitle}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-muted">{row.portal}</td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: row.statusBg, color: row.statusColor }}>{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[11.5px] text-subtle mt-2">Showing most recent {C.drillData.rows.length} of {C.drillData.total} records.</div>
            </div>
          </div>
        </div>
      )}

      {/* ══ JD MODAL ══ */}
      {C.jdModalData && (
        <div onClick={() => set({ jdModalAppId: null })} className="fixed inset-0 bg-[rgba(24,24,27,0.5)] z-[45] flex items-center justify-center p-6">
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full overflow-y-auto shadow-popover" style={{ maxWidth: 560, maxHeight: "80vh" }}>
            <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-bold">{C.jdModalData.jobTitle}</div>
                <div className="text-xs text-subtle mt-1">{C.jdModalData.candidateName} · {C.jdModalData.portal} · {C.jdModalData.date}</div>
              </div>
              <button onClick={() => set({ jdModalAppId: null })} className={`${iconGhostBtn} flex-shrink-0`}>✕</button>
            </div>
            <div className="px-6 py-5 text-[13.5px] leading-relaxed text-medium whitespace-pre-wrap">{C.jdModalData.description}</div>
          </div>
        </div>
      )}

      {/* ══ MANAGE MODAL ══ */}
      {s.manageOpen && (
        <div onClick={() => set({ manageOpen: false })} className="fixed inset-0 bg-[rgba(24,24,27,0.5)] z-[45] flex items-start justify-center overflow-y-auto" style={{ padding: "40px 20px" }}>
          <div onClick={e => e.stopPropagation()} className="bg-surface rounded-2xl w-full overflow-hidden shadow-popover" style={{ maxWidth: 620 }}>
            <div className="bg-white px-6 py-[18px] flex items-center justify-between border-b border-border">
              <div className="text-[15px] font-bold">Manage team &amp; portals</div>
              <button onClick={() => set({ manageOpen: false })} className={iconGhostBtn}>✕</button>
            </div>
            <div className="flex gap-1 px-6 pt-3.5 bg-white">
              {[["recruiters",`Managers (${managers.length})`],["portals",`Portals (${portalsList.length})`]].map(([tab, label]) => (
                <button key={tab} onClick={() => set({ manageTab: tab })}
                  className={`h-8 px-3.5 rounded-t-lg text-xs font-bold transition-colors ${s.manageTab === tab ? "bg-surface text-dark" : "text-muted hover:text-dark"}`}>
                  {label}
                </button>
              ))}
            </div>
            {s.manageTab === "recruiters" && (
              <div className="p-6">
                <div className="flex gap-2 mb-3.5">
                  <input placeholder="New account manager name" value={s.newRecruiterName} onChange={e => set({ newRecruiterName: e.target.value })} onKeyDown={e => e.key === "Enter" && addRecruiter()}
                    className="flex-1 h-9 rounded-lg border border-border px-2.5 text-xs bg-white" />
                  <button onClick={addRecruiter} disabled={s.manageLoading} className="btn-primary text-xs">
                    {s.manageLoading ? "…" : "Add"}
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: 320 }}>
                  {managers.map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-white border border-border rounded-lg px-3.5 py-2.5">
                      <div>
                        <div className="text-[13px] font-semibold">{m.name}</div>
                        <div className="text-[11.5px] text-subtle">{m.email}</div>
                      </div>
                      <button onClick={() => deleteRecruiter(m.id, m.name)}
                        className="w-7 h-7 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-[13px]">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {s.manageTab === "portals" && (
              <div className="p-6">
                <div className="flex gap-2 mb-3.5">
                  <input placeholder="New portal name" value={s.newPortalName} onChange={e => set({ newPortalName: e.target.value })} onKeyDown={e => e.key === "Enter" && addPortal()}
                    className="flex-1 h-9 rounded-lg border border-border px-2.5 text-xs bg-white" />
                  <button onClick={addPortal} className="btn-primary text-xs">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {portalsList.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-white border border-border rounded-full py-1.5 pl-3.5 pr-1.5">
                      <span className="text-xs font-semibold text-medium">{p.name}</span>
                      <button onClick={() => deletePortal(p)} className="w-5 h-5 rounded-full bg-surface-alt text-muted hover:bg-zinc-200 transition-colors text-[11px]">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ CHANGE PASSWORD MODAL ══ */}
      {s.changePwOpen && (
        <div className="fixed inset-0 bg-[rgba(24,24,27,0.5)] z-[70] flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) set({ changePwOpen: false }); }}>
          <div className="bg-white rounded-2xl w-full shadow-popover" style={{ maxWidth: 400 }}>
            <div className="flex items-center justify-between px-[22px] py-4 border-b border-border">
              <div className="text-[15px] font-bold">Change Password</div>
              <button onClick={() => set({ changePwOpen: false })} className="w-7 h-7 rounded-full bg-surface-alt text-muted hover:bg-zinc-200 transition-colors text-sm">✕</button>
            </div>
            <form onSubmit={handleChangePw} className="p-[22px]">
              {s.changePwError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 mb-3.5">{s.changePwError}</div>
              )}
              {[
                { label: "Current password", key: "changePwOld" },
                { label: "New password", key: "changePwNew", hint: "Min. 8 characters" },
                { label: "Confirm new password", key: "changePwConfirm" },
              ].map(({ label, key, hint }) => (
                <div key={key} className="mb-3.5">
                  <div className="text-xs font-semibold text-medium mb-1">{label}</div>
                  <input type="password" value={s[key]} onChange={e => set({ [key]: e.target.value })} required minLength={key !== "changePwOld" ? 8 : undefined}
                    placeholder={hint || ""} className="input" />
                </div>
              ))}
              <button type="submit" disabled={s.changePwLoading} className="btn-primary w-full mt-1">
                {s.changePwLoading ? "Saving…" : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ TOAST ══ */}
      {s.toast && (
        <div className="toast-anim fixed bottom-6 right-6 bg-dark text-white px-[18px] py-3 rounded-xl text-sm font-semibold shadow-popover z-[60]">
          {s.toast}
        </div>
      )}
    </div>
  );
}
