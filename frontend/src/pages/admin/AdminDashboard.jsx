import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, ScrollText, BarChart3, ShieldAlert, Users, Link2, KeyRound,
  Send, Inbox, Phone, ListChecks, NotebookPen, Contact2, FileText, Menu, LogOut, ArrowLeft, LifeBuoy, Globe,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/client";
import logoIcon from "../../assets/consultadd-icon.jpeg";
import PerformanceDashboard, { TAB_BANNERS, SIMPLE_THEMES, img } from "../PerformanceDashboard";
import { PERMISSION_SECTIONS, hasPermission } from "./permissionSections";
import LoginLogs from "./tabs/LoginLogs";
import ActiveSessions from "./tabs/ActiveSessions";
import UsageAnalytics from "./tabs/UsageAnalytics";
import SiteTraffic from "./tabs/SiteTraffic";
import SuspiciousAlerts from "./tabs/SuspiciousAlerts";
import UserManagement from "./tabs/UserManagement";
import PortalManagement from "./tabs/PortalManagement";
import PasswordReset from "./tabs/PasswordReset";
import LinkedInProfiles from "../../components/tracker/LinkedInProfiles";
import Resumes from "../../components/tracker/Resumes";
import JobApplications from "../../components/tracker/JobApplications";
import RecruiterOutreach from "../../components/tracker/RecruiterOutreach";
import VendorActivities from "../../components/tracker/VendorActivities";
import DailyTasks from "../../components/tracker/DailyTasks";
import DailyNotes from "../../components/tracker/DailyNotes";
import Support from "../../components/tracker/Support";

const TAB_ICONS = {
  sessions: Activity, logs: ScrollText, analytics: BarChart3, traffic: Globe, suspicious: ShieldAlert,
  users: Users, portals: Link2, passwords: KeyRound,
  applications: Send, outreach: Inbox, activities: Phone, tasks: ListChecks, notes: NotebookPen,
  linkedin: Contact2, resumes: FileText, support: LifeBuoy,
};
const ALL_TABS = PERMISSION_SECTIONS.map(({ key, label }) => ({ id: key, label, Icon: TAB_ICONS[key] }));

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const visibleTabs = ALL_TABS.filter(t => hasPermission(user, t.id));
  const [showPanel, setShowPanel] = useState(false);
  const [tab, setTab] = useState(() => visibleTabs[0]?.id || "sessions");
  const [summary, setSummary] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const bgPrefKey = `pulse-dashboard-bg:${user?.id || "guest"}`;
  const [bgPref, setBgPref] = useState(() => {
    try { return localStorage.getItem(bgPrefKey) || "creative"; } catch { return "creative"; }
  });
  const setBgPrefPersist = (val) => {
    setBgPref(val);
    try { localStorage.setItem(bgPrefKey, val); } catch { /* ignore */ }
  };

  const simpleThemeKey = `pulse-simple-theme:${user?.id || "guest"}`;
  const [simpleThemeId, setSimpleThemeId] = useState(() => {
    try { return localStorage.getItem(simpleThemeKey) || "default"; } catch { return "default"; }
  });
  const setSimpleThemePersist = (val) => {
    setSimpleThemeId(val);
    try { localStorage.setItem(simpleThemeKey, val); } catch { /* ignore */ }
  };
  const simpleTheme = SIMPLE_THEMES.find(t => t.id === simpleThemeId) || SIMPLE_THEMES[0];

  useEffect(() => {
    if (!showPanel) return;
    const load = () => api.get("/analytics/summary").then(r => setSummary(r.data)).catch(() => {});
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [showPanel]);

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  // Show the main performance dashboard
  if (!showPanel) {
    return (
      <PerformanceDashboard
        user={user}
        onLogout={handleLogout}
        onOpenAdminPanel={() => setShowPanel(true)}
      />
    );
  }

  // Admin security panel
  const SUMMARY_CARDS = [
    { label: "Active Sessions", value: summary?.activeSessions ?? "—", color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Logins Today",    value: summary?.todayLogins    ?? "—", color: "text-primary",   bg: "bg-primary-tint" },
    { label: "Logins This Week",value: summary?.weekLogins     ?? "—", color: "text-blue-600",  bg: "bg-blue-50" },
    { label: "Suspicious (7d)", value: summary?.suspiciousCount ?? "—", color: "text-red-600",  bg: "bg-red-50" },
  ];

  const activeTab = ALL_TABS.find(t => t.id === tab);
  const banner = bgPref === "simple" ? null : (TAB_BANNERS[tab] || { src: img("statue-of-liberty"), caption: "Liberty Island, NY", tint: "#F1F1EC" });
  const cardCls = banner ? "glass-card" : "card";

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      {/* Top header */}
      <header className="bg-zinc-900 border-b border-zinc-800 text-white sticky top-0 z-20">
        <div className="px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(o => !o)} className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
              <Menu size={19} />
            </button>
            <img src={logoIcon} alt="ConsultAdd" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
            <div>
              <div className="text-sm font-bold tracking-tight">ConsultAdd Pulse</div>
              <div className="text-[11px] text-zinc-400">Admin Security Panel</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {summary?.suspiciousCount > 0 && (
              <button onClick={() => setTab("suspicious")}
                className="flex items-center gap-1.5 bg-red-950/60 border border-red-800/60 text-red-300 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-900/60 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
                {summary.suspiciousCount} suspicious
              </button>
            )}
            <button
              onClick={() => setShowPanel(false)}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors">
              <ArrowLeft size={13} /> Dashboard
            </button>
            <div className="flex bg-zinc-800 rounded-md p-0.5">
              {[["creative", "Creative"], ["simple", "Simple"]].map(([key, label]) => (
                <button key={key} onClick={() => setBgPrefPersist(key)}
                  className={`h-6 px-2.5 rounded text-[11px] font-semibold transition-colors ${bgPref === key ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>
            {bgPref === "simple" && (
              <div className="flex gap-1.5">
                {SIMPLE_THEMES.map(t => (
                  <button key={t.id} onClick={() => setSimpleThemePersist(t.id)} title={t.label}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${simpleThemeId === t.id ? "border-white scale-110" : "border-transparent hover:scale-105"}`}
                    style={{ background: t.bg }} />
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.split(" ").map(w => w[0]).slice(0,2).join("")}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold">{user?.name}</div>
                <div className="text-[11px] text-zinc-400">Admin</div>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg">
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className={`bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-200 ${sidebarOpen ? "w-56" : "w-0 overflow-hidden"}`}>
          <div className="p-3 space-y-0.5 flex-1 overflow-y-auto">
            {visibleTabs.map(t => (
              <React.Fragment key={t.id}>
                {t.id === "linkedin" && (
                  <div className="px-3 pt-4 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">Assets</div>
                )}
                <button onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 pl-2.5 pr-3 py-2.5 rounded-md text-[13px] transition-colors text-left border-l-2 ${
                    tab === t.id ? "bg-zinc-800 text-white font-semibold border-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 font-medium border-transparent"
                  }`}>
                  <t.Icon size={16} strokeWidth={2} className="flex-shrink-0" />
                  <span>{t.label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <main
          className="flex-1 overflow-auto"
          style={banner ? {
            backgroundImage: `linear-gradient(${banner.tint}30, ${banner.tint}4D), url(${banner.src})`,
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
          {/* Summary strip */}
          <div className={banner ? "bg-white/70 backdrop-blur-lg border-b border-white/40 px-6 py-4" : "border-b px-6 py-4"}
            style={banner ? undefined : { background: simpleTheme.cardBg, borderColor: simpleTheme.cardBorder }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {SUMMARY_CARDS.map(c => (
                <div key={c.label} className={banner ? `${c.bg}/85 backdrop-blur-md border border-white/40 rounded-xl px-4 py-3.5` : `${c.bg} rounded-xl px-4 py-3.5`}>
                  <div className="text-[11px] text-muted font-semibold uppercase tracking-wide">{c.label}</div>
                  <div className={`text-2xl font-extrabold mt-1 tracking-tight ${c.color}`}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className={`${cardCls} p-6`}>
              {visibleTabs.length === 0 ? (
                <div className="text-sm text-muted text-center py-10">
                  Your admin access doesn't include any Admin Panel sections yet — ask another admin to grant you some under Users.
                </div>
              ) : (
              <>
              <div className="text-[17px] font-bold mb-4 flex items-center gap-2.5">
                {activeTab && <activeTab.Icon size={19} className="text-primary" />}
                {activeTab?.label}
              </div>
              {tab === "sessions"   && <ActiveSessions />}
              {tab === "logs"       && <LoginLogs />}
              {tab === "analytics"  && <UsageAnalytics />}
              {tab === "traffic"    && <SiteTraffic />}
              {tab === "suspicious" && <SuspiciousAlerts />}
              {tab === "users"      && <UserManagement />}
              {tab === "portals"    && <PortalManagement />}
              {tab === "passwords"  && <PasswordReset />}
              {tab === "linkedin"     && <LinkedInProfiles user={user} />}
              {tab === "resumes"      && <Resumes user={user} />}
              {tab === "applications" && <JobApplications user={user} />}
              {tab === "outreach"     && <RecruiterOutreach user={user} />}
              {tab === "activities"   && <VendorActivities user={user} />}
              {tab === "tasks"        && <DailyTasks user={user} />}
              {tab === "notes"        && <DailyNotes user={user} />}
              {tab === "support"      && <Support user={user} />}
              </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
