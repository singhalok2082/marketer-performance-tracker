import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/client";
import PerformanceDashboard from "../PerformanceDashboard";
import LoginLogs from "./tabs/LoginLogs";
import ActiveSessions from "./tabs/ActiveSessions";
import UsageAnalytics from "./tabs/UsageAnalytics";
import SuspiciousAlerts from "./tabs/SuspiciousAlerts";
import UserManagement from "./tabs/UserManagement";
import PortalManagement from "./tabs/PortalManagement";
import PasswordReset from "./tabs/PasswordReset";
import LinkedInProfiles from "../../components/tracker/LinkedInProfiles";
import Resumes from "../../components/tracker/Resumes";
import JobApplications from "../../components/tracker/JobApplications";
import RecruiterOutreach from "../../components/tracker/RecruiterOutreach";
import VendorActivities from "../../components/tracker/VendorActivities";
import DailyNotes from "../../components/tracker/DailyNotes";
import JobDescriptions from "../../components/tracker/JobDescriptions";

const TABS = [
  { id: "sessions",   label: "Active Sessions",  icon: "🟢" },
  { id: "logs",       label: "Login Logs",        icon: "📋" },
  { id: "analytics",  label: "Usage Analytics",   icon: "📊" },
  { id: "suspicious", label: "Suspicious",        icon: "⚠️" },
  { id: "users",      label: "Users",             icon: "👥" },
  { id: "portals",    label: "Portals",           icon: "🔗" },
  { id: "passwords",  label: "Reset Passwords",   icon: "🔑" },
  { id: "applications", label: "Applications",    icon: "📨" },
  { id: "jobdescriptions", label: "Job Descriptions", icon: "🧾" },
  { id: "outreach",   label: "Inbound Requirements", icon: "📥" },
  { id: "activities", label: "Vendor Activities",  icon: "☎️" },
  { id: "notes",      label: "Daily Notes",        icon: "📝" },
  { id: "linkedin",   label: "LinkedIn Profiles", icon: "💼" },
  { id: "resumes",    label: "Resumes",           icon: "📄" },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPanel, setShowPanel] = useState(false);
  const [tab, setTab] = useState("sessions");
  const [summary, setSummary] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    { label: "Active Sessions", value: summary?.activeSessions ?? "—", color: "text-green-600", bg: "bg-green-50" },
    { label: "Logins Today",    value: summary?.todayLogins    ?? "—", color: "text-primary",   bg: "bg-indigo-50" },
    { label: "Logins This Week",value: summary?.weekLogins     ?? "—", color: "text-blue-600",  bg: "bg-blue-50" },
    { label: "Suspicious (7d)", value: summary?.suspiciousCount ?? "—", color: "text-red-600",  bg: "bg-red-50" },
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top header */}
      <header className="bg-gray-900 border-b border-gray-700 text-white sticky top-0 z-20">
        <div className="px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(o => !o)} className="text-gray-400 hover:text-white p-1">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-sm">CA</div>
            <div>
              <div className="text-sm font-bold">ConsultAdd Tracker</div>
              <div className="text-xs text-gray-400">Admin Security Panel</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {summary?.suspiciousCount > 0 && (
              <button onClick={() => setTab("suspicious")}
                className="flex items-center gap-1.5 bg-red-900/40 border border-red-700 text-red-300 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-900/60 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
                {summary.suspiciousCount} suspicious
              </button>
            )}
            <button
              onClick={() => setShowPanel(false)}
              className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white border border-gray-600 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors">
              ← Dashboard
            </button>
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.split(" ").map(w => w[0]).slice(0,2).join("")}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold">{user?.name}</div>
                <div className="text-xs text-gray-400">Admin</div>
              </div>
            </div>
            <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white transition-colors border border-gray-600 hover:border-gray-400 px-3 py-1.5 rounded-lg">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className={`bg-gray-900 border-r border-gray-700 flex flex-col transition-all duration-200 ${sidebarOpen ? "w-52" : "w-0 overflow-hidden"}`}>
          <div className="p-3 space-y-0.5 flex-1">
            {TABS.map(t => (
              <React.Fragment key={t.id}>
                {t.id === "linkedin" && (
                  <div className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">Assets</div>
                )}
                <button onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    tab === t.id ? "bg-primary text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}>
                  <span className="text-base">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {/* Summary strip */}
          <div className="bg-white border-b border-border px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {SUMMARY_CARDS.map(c => (
                <div key={c.label} className={`${c.bg} rounded-xl px-4 py-3`}>
                  <div className="text-xs text-muted font-semibold uppercase tracking-wide">{c.label}</div>
                  <div className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="text-lg font-bold mb-5 flex items-center gap-2">
              <span>{TABS.find(t => t.id === tab)?.icon}</span>
              {TABS.find(t => t.id === tab)?.label}
            </div>
            {tab === "sessions"   && <ActiveSessions />}
            {tab === "logs"       && <LoginLogs />}
            {tab === "analytics"  && <UsageAnalytics />}
            {tab === "suspicious" && <SuspiciousAlerts />}
            {tab === "users"      && <UserManagement />}
            {tab === "portals"    && <PortalManagement />}
            {tab === "passwords"  && <PasswordReset />}
            {tab === "linkedin"     && <LinkedInProfiles user={user} />}
            {tab === "resumes"      && <Resumes user={user} />}
            {tab === "applications" && <JobApplications user={user} />}
            {tab === "jobdescriptions" && <JobDescriptions user={user} />}
            {tab === "outreach"     && <RecruiterOutreach user={user} />}
            {tab === "activities"   && <VendorActivities user={user} />}
            {tab === "notes"        && <DailyNotes user={user} />}
          </div>
        </main>
      </div>
    </div>
  );
}
