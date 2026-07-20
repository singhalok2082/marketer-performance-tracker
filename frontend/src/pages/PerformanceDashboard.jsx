import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import api from "../api/client";
import LinkedInProfiles from "../components/tracker/LinkedInProfiles";
import Resumes from "../components/tracker/Resumes";
import JobApplications from "../components/tracker/JobApplications";
import RecruiterOutreach from "../components/tracker/RecruiterOutreach";
import VendorActivities from "../components/tracker/VendorActivities";
import DailyNotes from "../components/tracker/DailyNotes";

const STATUS_LIST = ["Applied", "Submitted to Client", "Interview Scheduled", "Offer", "Rejected", "No Response"];
const TODAY   = new Date().toISOString().slice(0, 10);
const PAGE_SZ = 15;

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
  if (status === "No Response") return { bg: "#F1F2F6", color: "#7B8094" };
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
];

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
      showToast(err.response?.data?.error || "Failed to add recruiter");
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
      showToast(err.response?.data?.error || "Failed to remove recruiter");
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
      { label: "Total applications", value: totalApps.toLocaleString(), sub: `${activeIds.size} active managers`, color: "#16181D" },
      { label: "Client submissions", value: totalSubs.toLocaleString(), sub: subRate + "% of applications", color: "#4F46E5" },
      { label: "Submission rate", value: subRate + "%", sub: "Applied → submitted to client", color: "#16181D" },
      { label: "Team size", value: managers.length, sub: activeIds.size + " active this period", color: "#16181D" },
    ] : [
      { label: "My applications", value: totalApps.toLocaleString(), sub: "in selected range", color: "#16181D" },
      { label: "My submissions", value: totalSubs.toLocaleString(), sub: subRate + "% of applications", color: "#4F46E5" },
      { label: "Submission rate", value: subRate + "%", sub: "Applied → submitted to client", color: "#16181D" },
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
        tooltip: `${k}: ${b.apps} apps, ${b.subs} subs`,
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
        kpis: [{ label: "Applications", value: dApps.length, color: "#16181D" }, { label: "Submissions", value: dSubs.length, color: "#4F46E5" }, { label: "Submission rate", value: dRate + "%", color: "#16181D" }],
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

  const tabBtn = (active) => ({ height: 28, padding: "0 14px", borderRadius: 6, border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: active ? "white" : "transparent", color: active ? "#4F46E5" : "#7B8094", boxShadow: active ? "0 1px 2px rgba(16,24,40,0.08)" : "none" });
  const sortToggle = (col, def) => { const same = s.sortCol === col; return { sortCol: col, sortDir: same && s.sortDir === def ? (def === "asc" ? "desc" : "asc") : def }; };

  const showOverviewLoading = s.tab === "overview" && !C.dataLoaded;
  const isAdminMode = s.role === "admin";
  const isRecruiterMode = !isAdminMode;

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F7", color: "#16181D" }}>

      {/* ── HEADER ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "#FFFFFF", borderBottom: "1px solid #E7E9EF" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "#4F46E5", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>CA</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.15 }}>ConsultAdd Tracker</div>
              <div style={{ fontSize: 11.5, color: "#7B8094", lineHeight: 1.3 }}>LinkedIn, resume & application tracking</div>
            </div>
          </div>
          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {isAdminUser && s.tab === "overview" && (
              <div style={{ display: "flex", background: "#F0F1F5", borderRadius: 8, padding: 3 }}>
                <button style={tabBtn(isAdminMode)} onClick={() => set({ role: "admin", logPage: 1, drillRecruiterId: null })}>Admin view</button>
                <button style={tabBtn(isRecruiterMode)} onClick={() => set(prev => ({ role: "recruiter", logPage: 1, drillRecruiterId: null, viewingRecruiterId: prev.viewingRecruiterId || managers[0]?.id || null }))}>My view</button>
              </div>
            )}
            {isAdminUser && s.tab === "overview" && isRecruiterMode && (
              <select value={s.viewingRecruiterId || ""} onChange={e => set({ viewingRecruiterId: e.target.value, logPage: 1 })}
                style={{ height: 34, borderRadius: 8, border: "1px solid #DDE0E8", background: "white", padding: "0 10px", fontSize: 13, color: "#16181D", fontWeight: 600 }}>
                {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
            {isAdminUser && (
              <button onClick={() => set({ manageOpen: true, manageTab: "recruiters" })}
                style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "1px solid #DDE0E8", background: "white", fontSize: 12.5, fontWeight: 600, color: "#383B49", cursor: "pointer" }}>
                Manage team & portals
              </button>
            )}
            {/* Admin Panel link */}
            {isAdminUser && onOpenAdminPanel && (
              <button onClick={onOpenAdminPanel}
                style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "1px solid #4F46E5", background: "#EEF2FF", fontSize: 12.5, fontWeight: 600, color: "#4F46E5", cursor: "pointer" }}>
                Admin Panel
              </button>
            )}
            {/* User chip */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 8, borderLeft: "1px solid #E7E9EF" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#4F46E5", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{initials(user?.name)}</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#16181D", lineHeight: 1.2, whiteSpace: "nowrap" }}>{user?.name || "User"}</div>
                <div style={{ fontSize: 11, color: "#7B8094", lineHeight: 1.2 }}>{user?.role === "admin" ? "Admin" : "Account Manager"}</div>
              </div>
              <button onClick={() => set({ changePwOpen: true, changePwOld: "", changePwNew: "", changePwConfirm: "", changePwError: "" })} title="Change password"
                style={{ height: 30, padding: "0 10px", borderRadius: 7, border: "1px solid #E7E9EF", background: "white", fontSize: 12, fontWeight: 600, color: "#7B8094", cursor: "pointer", marginLeft: 2 }}>
                Pwd
              </button>
              <button onClick={onLogout} title="Sign out"
                style={{ height: 30, padding: "0 10px", borderRadius: 7, border: "1px solid #E7E9EF", background: "white", fontSize: 12, fontWeight: 600, color: "#7B8094", cursor: "pointer" }}>
                Sign out
              </button>
            </div>
          </div>
        </div>
        {/* Section tabs */}
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 32px 13px", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          {TABS.map(([key, label]) => {
            const active = s.tab === key;
            return (
              <React.Fragment key={key}>
                {key === "linkedin" && (
                  <React.Fragment>
                    <div style={{ width: 1, height: 20, background: "#E7E9EF", margin: "0 4px" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#A1A5B3", textTransform: "uppercase", letterSpacing: 0.4, marginRight: 2 }}>Assets</span>
                  </React.Fragment>
                )}
                <button onClick={() => set({ tab: key })}
                  style={{ height: 32, padding: "0 14px", borderRadius: 8, border: `1px solid ${active ? "#4F46E5" : "#DDE0E8"}`, background: active ? "#4F46E5" : "white", color: active ? "white" : "#383B49", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                  {label}
                </button>
              </React.Fragment>
            );
          })}
          {s.tab === "overview" && (
            <>
              <div style={{ width: 1, height: 20, background: "#E7E9EF", margin: "0 4px" }} />
              {[["daily","Daily"],["weekly","Weekly"],["monthly","Monthly"],["sixmonth","6-Month"],["yearly","Yearly"],["custom","Custom"]].map(([key, label]) => {
                const active = s.timeRange === key;
                return (
                  <button key={key} onClick={() => set({ timeRange: key, logPage: 1 })}
                    style={{ height: 32, padding: "0 14px", borderRadius: 8, border: `1px solid ${active ? "#4F46E5" : "#DDE0E8"}`, background: active ? "#4F46E5" : "white", color: active ? "white" : "#383B49", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    {label}
                  </button>
                );
              })}
              {s.timeRange === "custom" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
                  <input type="date" value={s.customStart} onChange={e => set({ customStart: e.target.value, logPage: 1 })} style={{ height: 30, borderRadius: 6, border: "1px solid #DDE0E8", padding: "0 8px", fontSize: 12 }} />
                  <span style={{ color: "#A1A5B3", fontSize: 12 }}>to</span>
                  <input type="date" value={s.customEnd} onChange={e => set({ customEnd: e.target.value, logPage: 1 })} style={{ height: 30, borderRadius: 6, border: "1px solid #DDE0E8", padding: "0 8px", fontSize: 12 }} />
                </div>
              )}
              <div style={{ marginLeft: "auto", fontSize: 12, color: "#7B8094" }}>{C.rangeLabel}</div>
              {C.isAdmin && (
                <button onClick={() => exportCsv(C.scopedApps, C.managerById)}
                  style={{ height: 32, padding: "0 14px", borderRadius: 8, border: "1px solid #DDE0E8", background: "white", fontSize: 12.5, fontWeight: 600, color: "#383B49", cursor: "pointer" }}>
                  Export CSV
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 32px 60px" }}>

        {s.tab === "linkedin" && <LinkedInProfiles user={user} />}
        {s.tab === "resumes" && <Resumes user={user} />}
        {s.tab === "applications" && <JobApplications user={user} />}
        {s.tab === "outreach" && <RecruiterOutreach user={user} />}
        {s.tab === "activities" && <VendorActivities user={user} />}
        {s.tab === "notes" && <DailyNotes user={user} />}

        {s.tab === "overview" && showOverviewLoading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: "#7B8094", fontSize: 14, gap: 10 }}>
            <span className="spin" style={{ display: "inline-block", width: 18, height: 18, border: "2px solid #E4E6EF", borderTopColor: "#4F46E5", borderRadius: "50%" }} />
            Loading data…
          </div>
        )}

        {s.tab === "overview" && !showOverviewLoading && (() => {
          const { isAdmin, isRecruiter, kpis, trendBars, trendSubtitle, portalBars, teamRows, teamCount, logRows, totalPages, page, logCountLabel, portalFilterOptions, statusFilterOptions } = C;
          return (
            <>
              {/* KPI cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 20 }}>
                {kpis.map((kpi, i) => (
                  <div key={i} style={{ background: "white", borderRadius: 12, padding: "18px 20px", border: "1px solid #ECEDF2", boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
                    <div style={{ fontSize: 12, color: "#7B8094", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>{kpi.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: kpi.color, lineHeight: 1.1 }}>{kpi.value}</div>
                    <div style={{ fontSize: 12, color: "#A1A5B3", marginTop: 5 }}>{kpi.sub}</div>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 20 }}>
                {/* Trend */}
                <div style={{ background: "white", borderRadius: 12, padding: "20px 22px", border: "1px solid #ECEDF2" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>Applications vs. submissions over time</div>
                  <div style={{ fontSize: 12, color: "#A1A5B3", marginBottom: 14 }}>{trendSubtitle}</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 160 }}>
                    {trendBars.length === 0
                      ? <div style={{ width: "100%", textAlign: "center", color: "#A1A5B3", fontSize: 13, alignSelf: "center" }}>No data in range</div>
                      : trendBars.map((b, i) => (
                        <div key={i} title={b.tooltip} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 3 }}>
                          <div style={{ width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2, height: "100%" }}>
                            <div style={{ width: "45%", background: "#C7CBF7", borderRadius: "3px 3px 0 0", height: b.appH, minHeight: 2 }} />
                            <div style={{ width: "45%", background: "#4F46E5", borderRadius: "3px 3px 0 0", height: b.subH, minHeight: 2 }} />
                          </div>
                          <div style={{ fontSize: 10, color: "#A1A5B3", whiteSpace: "nowrap" }}>{b.label}</div>
                        </div>
                      ))}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#7B8094" }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#C7CBF7", display: "inline-block" }} />Applications</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#7B8094" }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#4F46E5", display: "inline-block" }} />Submissions</div>
                  </div>
                </div>
                {/* Portal breakdown */}
                <div style={{ background: "white", borderRadius: 12, padding: "20px 22px", border: "1px solid #ECEDF2" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>By job portal</div>
                  {portalBars.length === 0 && <div style={{ color: "#A1A5B3", fontSize: 13 }}>No applications in range</div>}
                  {portalBars.slice(0, 9).map((p, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#383B49", marginBottom: 3 }}>
                        <span>{p.portal}</span><span style={{ color: "#A1A5B3" }}>{p.count}</span>
                      </div>
                      <div style={{ background: "#F0F1F5", borderRadius: 4, height: 6 }}>
                        <div style={{ background: "#7B78E8", width: p.pct + "%", height: "100%", borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team performance table (admin) */}
              {isAdmin && (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #ECEDF2", overflow: "hidden", marginBottom: 20 }}>
                  <div style={{ padding: "16px 22px", borderBottom: "1px solid #ECEDF2", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 700 }}>Team performance</div>
                      <div style={{ fontSize: 12, color: "#A1A5B3", marginTop: 2 }}>Click a row for that manager's submission log</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#A1A5B3" }}>{teamCount} managers</div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#FAFAFC" }}>
                          {[["name","Manager","left","asc","22px"],["applications","Applications","right","desc","14px"],["submissions","Submissions","right","desc","14px"],["rate","Sub. rate","right","desc","14px"]].map(([col, label, align, def, pad]) => (
                            <th key={col} onClick={() => set(sortToggle(col, def))} style={{ textAlign: align, padding: `10px ${pad}`, color: "#7B8094", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
                              {label} {s.sortCol === col ? (s.sortDir === "asc" ? "↑" : "↓") : ""}
                            </th>
                          ))}
                          <th style={{ textAlign: "left", padding: "10px 14px", color: "#7B8094", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>Top portal</th>
                          <th style={{ textAlign: "left", padding: "10px 22px", color: "#7B8094", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>Last active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamRows.map(row => (
                          <tr key={row.id} className="team-row" onClick={() => set({ drillRecruiterId: row.id })} style={{ borderTop: "1px solid #F0F1F5", cursor: "pointer" }}>
                            <td style={{ padding: "11px 22px", fontWeight: 600 }}>{row.name}</td>
                            <td style={{ padding: "11px 14px", textAlign: "right" }}>{row.applications}</td>
                            <td style={{ padding: "11px 14px", textAlign: "right" }}>{row.submissions}</td>
                            <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 600, color: row.rateColor }}>{row.rate}</td>
                            <td style={{ padding: "11px 14px", color: "#7B8094" }}>{row.topPortal}</td>
                            <td style={{ padding: "11px 22px", color: "#7B8094" }}>{row.lastActive}</td>
                          </tr>
                        ))}
                        {teamRows.length === 0 && (
                          <tr><td colSpan={6} style={{ padding: "24px 22px", textAlign: "center", color: "#A1A5B3", fontSize: 13 }}>No managers yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Submissions table */}
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #ECEDF2", overflow: "hidden" }}>
                <div style={{ padding: "16px 22px", borderBottom: "1px solid #ECEDF2", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{isAdmin ? "All submissions & applications" : "My submission log"}</div>
                    <div style={{ fontSize: 12, color: "#A1A5B3", marginTop: 2 }}>{C.logSource.length.toLocaleString()} records in range</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input placeholder="Search candidate or job title…" value={s.logSearch} onChange={e => set({ logSearch: e.target.value, logPage: 1 })}
                      style={{ height: 32, borderRadius: 8, border: "1px solid #DDE0E8", padding: "0 10px", fontSize: 12.5, width: 200 }} />
                    <select value={s.logPortalFilter} onChange={e => set({ logPortalFilter: e.target.value, logPage: 1 })} style={{ height: 32, borderRadius: 8, border: "1px solid #DDE0E8", padding: "0 8px", fontSize: 12.5 }}>
                      {portalFilterOptions.map(opt => <option key={opt} value={opt}>{opt === "all" ? "All portals" : opt}</option>)}
                    </select>
                    <select value={s.logStatusFilter} onChange={e => set({ logStatusFilter: e.target.value, logPage: 1 })} style={{ height: 32, borderRadius: 8, border: "1px solid #DDE0E8", padding: "0 8px", fontSize: 12.5 }}>
                      {statusFilterOptions.map(opt => <option key={opt} value={opt}>{opt === "all" ? "All statuses" : opt}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: "#FAFAFC" }}>
                        <th style={{ textAlign: "left", padding: "10px 22px", color: "#7B8094", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>Date</th>
                        {isAdmin && <th style={{ textAlign: "left", padding: "10px 14px", color: "#7B8094", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>Manager</th>}
                        {[["Candidate","14px"],["Job title","14px"],["Portal","14px"],["Resume","14px"],["Status","14px"],["JD","22px"]].map(([h, p]) => (
                          <th key={h} style={{ textAlign: "left", padding: `10px ${p}`, color: "#7B8094", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logRows.map((row, i) => (
                        <tr key={row.id || i} style={{ borderTop: "1px solid #F0F1F5" }}>
                          <td style={{ padding: "10px 22px", color: "#383B49", whiteSpace: "nowrap" }}>{row.date}</td>
                          {isAdmin && <td style={{ padding: "10px 14px", color: "#383B49", whiteSpace: "nowrap" }}>{row.recruiterName}</td>}
                          <td style={{ padding: "10px 14px", color: "#383B49", whiteSpace: "nowrap" }}>{row.candidateName}</td>
                          <td style={{ padding: "10px 14px", color: "#383B49", whiteSpace: "nowrap" }}>{row.jobTitle}</td>
                          <td style={{ padding: "10px 14px", color: "#7B8094", whiteSpace: "nowrap" }}>{row.portal}</td>
                          <td style={{ padding: "10px 14px", color: "#7B8094", whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{row.resumeFile}</td>
                          <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: row.statusBg, color: row.statusColor }}>{row.status}</span>
                          </td>
                          <td style={{ padding: "10px 22px", whiteSpace: "nowrap" }}>
                            <button onClick={() => set({ jdModalAppId: row.id })} style={{ height: 26, padding: "0 10px", borderRadius: 6, border: "1px solid #DDE0E8", background: "#FAFAFC", fontSize: 11.5, fontWeight: 600, color: "#4F46E5", cursor: "pointer" }}>View</button>
                          </td>
                        </tr>
                      ))}
                      {logRows.length === 0 && (
                        <tr><td colSpan={isAdmin ? 8 : 7} style={{ padding: "24px 22px", textAlign: "center", color: "#A1A5B3", fontSize: 13 }}>No records match your filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: "13px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #ECEDF2" }}>
                  <div style={{ fontSize: 12, color: "#A1A5B3" }}>{logCountLabel}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button onClick={() => set({ logPage: Math.max(1, page - 1) })} disabled={page <= 1} style={{ height: 30, padding: "0 12px", borderRadius: 7, border: "1px solid #DDE0E8", background: "white", fontSize: 12.5, cursor: "pointer", color: "#383B49" }}>Prev</button>
                    <div style={{ fontSize: 12.5, color: "#7B8094", padding: "0 4px" }}>Page {page} / {totalPages}</div>
                    <button onClick={() => set({ logPage: Math.min(totalPages, page + 1) })} disabled={page >= totalPages} style={{ height: 30, padding: "0 12px", borderRadius: 7, border: "1px solid #DDE0E8", background: "white", fontSize: 12.5, cursor: "pointer", color: "#383B49" }}>Next</button>
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* ── DRILLDOWN MODAL ── */}
      {C.drillData && (
        <div onClick={() => set({ drillRecruiterId: null })} style={{ position: "fixed", inset: 0, background: "rgba(16,20,30,0.45)", zIndex: 40, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#F3F4F7", borderRadius: 14, width: "100%", maxWidth: 900, overflow: "hidden" }}>
            <div style={{ background: "white", padding: "20px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #ECEDF2" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{C.drillData.name}</div>
                <div style={{ fontSize: 12.5, color: "#A1A5B3", marginTop: 2 }}>{C.rangeLabel} performance detail</div>
              </div>
              <button onClick={() => set({ drillRecruiterId: null })} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #DDE0E8", background: "white", cursor: "pointer", fontSize: 15, color: "#7B8094" }}>✕</button>
            </div>
            <div style={{ padding: "20px 26px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
              {C.drillData.kpis.map((kpi, i) => (
                <div key={i} style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: "1px solid #ECEDF2" }}>
                  <div style={{ fontSize: 11.5, color: "#7B8094", fontWeight: 600, marginBottom: 6 }}>{kpi.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 26px 26px" }}>
              <div style={{ background: "white", borderRadius: 10, border: "1px solid #ECEDF2", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: "#FAFAFC" }}>
                      {["Date","Candidate","Job title","Portal","Status"].map((h, i) => (
                        <th key={h} style={{ textAlign: "left", padding: i === 0 || i === 4 ? "8px 16px" : "8px 12px", color: "#7B8094", fontWeight: 600, fontSize: 11.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {C.drillData.rows.map((row, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #F0F1F5" }}>
                        <td style={{ padding: "9px 16px", whiteSpace: "nowrap", color: "#383B49" }}>{row.date}</td>
                        <td style={{ padding: "9px 12px", whiteSpace: "nowrap", color: "#383B49" }}>{row.candidateName}</td>
                        <td style={{ padding: "9px 12px", whiteSpace: "nowrap", color: "#383B49" }}>{row.jobTitle}</td>
                        <td style={{ padding: "9px 12px", whiteSpace: "nowrap", color: "#7B8094" }}>{row.portal}</td>
                        <td style={{ padding: "9px 16px", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: row.statusBg, color: row.statusColor }}>{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 11.5, color: "#A1A5B3", marginTop: 8 }}>Showing most recent {C.drillData.rows.length} of {C.drillData.total} records.</div>
            </div>
          </div>
        </div>
      )}

      {/* ── JD MODAL ── */}
      {C.jdModalData && (
        <div onClick={() => set({ jdModalAppId: null })} style={{ position: "fixed", inset: 0, background: "rgba(16,20,30,0.45)", zIndex: 45, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #ECEDF2", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{C.jdModalData.jobTitle}</div>
                <div style={{ fontSize: 12.5, color: "#A1A5B3", marginTop: 4 }}>{C.jdModalData.candidateName} · {C.jdModalData.portal} · {C.jdModalData.date}</div>
              </div>
              <button onClick={() => set({ jdModalAppId: null })} style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 8, border: "1px solid #DDE0E8", background: "white", cursor: "pointer", fontSize: 14, color: "#7B8094" }}>✕</button>
            </div>
            <div style={{ padding: "20px 24px", fontSize: 13.5, lineHeight: 1.6, color: "#383B49", whiteSpace: "pre-wrap" }}>{C.jdModalData.description}</div>
          </div>
        </div>
      )}

      {/* ── MANAGE MODAL ── */}
      {s.manageOpen && (
        <div onClick={() => set({ manageOpen: false })} style={{ position: "fixed", inset: 0, background: "rgba(16,20,30,0.45)", zIndex: 45, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#F3F4F7", borderRadius: 14, width: "100%", maxWidth: 620, overflow: "hidden" }}>
            <div style={{ background: "white", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #ECEDF2" }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Manage team & portals</div>
              <button onClick={() => set({ manageOpen: false })} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #DDE0E8", background: "white", cursor: "pointer", fontSize: 14, color: "#7B8094" }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 4, padding: "14px 24px 0" }}>
              {[["recruiters",`Managers (${managers.length})`],["portals",`Portals (${portalsList.length})`]].map(([tab, label]) => (
                <button key={tab} onClick={() => set({ manageTab: tab })}
                  style={{ height: 30, padding: "0 14px", borderRadius: "7px 7px 0 0", border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: s.manageTab === tab ? "#F3F4F7" : "transparent", color: s.manageTab === tab ? "#16181D" : "#7B8094" }}>
                  {label}
                </button>
              ))}
            </div>
            {s.manageTab === "recruiters" && (
              <div style={{ padding: "16px 24px 24px" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <input placeholder="New account manager name" value={s.newRecruiterName} onChange={e => set({ newRecruiterName: e.target.value })} onKeyDown={e => e.key === "Enter" && addRecruiter()}
                    style={{ flex: 1, height: 34, borderRadius: 8, border: "1px solid #DDE0E8", padding: "0 10px", fontSize: 12.5 }} />
                  <button onClick={addRecruiter} disabled={s.manageLoading}
                    style={{ height: 34, padding: "0 16px", borderRadius: 8, border: "none", background: "#4F46E5", color: "white", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                    {s.manageLoading ? "…" : "Add"}
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
                  {managers.map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", border: "1px solid #ECEDF2", borderRadius: 8, padding: "9px 14px" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                        <div style={{ fontSize: 11.5, color: "#A1A5B3" }}>{m.email}</div>
                      </div>
                      <button onClick={() => deleteRecruiter(m.id, m.name)}
                        style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#B91C1C", cursor: "pointer", fontSize: 13 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {s.manageTab === "portals" && (
              <div style={{ padding: "16px 24px 24px" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <input placeholder="New portal name" value={s.newPortalName} onChange={e => set({ newPortalName: e.target.value })} onKeyDown={e => e.key === "Enter" && addPortal()}
                    style={{ flex: 1, height: 34, borderRadius: 8, border: "1px solid #DDE0E8", padding: "0 10px", fontSize: 12.5 }} />
                  <button onClick={addPortal}
                    style={{ height: 34, padding: "0 16px", borderRadius: 8, border: "none", background: "#4F46E5", color: "white", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Add</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {portalsList.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: "1px solid #ECEDF2", borderRadius: 999, padding: "6px 8px 6px 14px" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#383B49" }}>{p.name}</span>
                      <button onClick={() => deletePortal(p)} style={{ width: 20, height: 20, borderRadius: "50%", border: "none", background: "#F1F2F6", color: "#7B8094", cursor: "pointer", fontSize: 11 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHANGE PASSWORD MODAL ── */}
      {s.changePwOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(22,24,29,0.45)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) set({ changePwOpen: false }); }}>
          <div style={{ background: "white", borderRadius: 14, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1px solid #ECEDF2" }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Change Password</div>
              <button onClick={() => set({ changePwOpen: false })} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "#F0F1F5", color: "#7B8094", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
            <form onSubmit={handleChangePw} style={{ padding: "18px 22px 22px" }}>
              {s.changePwError && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", fontSize: 12.5, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>{s.changePwError}</div>
              )}
              {[
                { label: "Current password", key: "changePwOld" },
                { label: "New password", key: "changePwNew", hint: "Min. 8 characters" },
                { label: "Confirm new password", key: "changePwConfirm" },
              ].map(({ label, key, hint }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#383B49", marginBottom: 5 }}>{label}</div>
                  <input type="password" value={s[key]} onChange={e => set({ [key]: e.target.value })} required minLength={key !== "changePwOld" ? 8 : undefined}
                    placeholder={hint || ""}
                    style={{ width: "100%", height: 36, border: "1px solid #DDE0E8", borderRadius: 8, padding: "0 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <button type="submit" disabled={s.changePwLoading}
                style={{ width: "100%", height: 38, borderRadius: 8, border: "none", background: "#4F46E5", color: "white", fontSize: 13.5, fontWeight: 700, cursor: s.changePwLoading ? "not-allowed" : "pointer", opacity: s.changePwLoading ? 0.6 : 1, marginTop: 4 }}>
                {s.changePwLoading ? "Saving…" : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {s.toast && (
        <div className="toast-anim" style={{ position: "fixed", bottom: 24, right: 24, background: "#16181D", color: "white", padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 60 }}>
          {s.toast}
        </div>
      )}
    </div>
  );
}
