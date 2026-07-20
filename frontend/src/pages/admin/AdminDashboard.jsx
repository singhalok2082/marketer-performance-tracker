import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, ScrollText, BarChart3, ShieldAlert, Users, Link2, KeyRound,
  Send, Inbox, Phone, NotebookPen, Contact2, FileText, Menu, LogOut, ArrowLeft,
} from "lucide-react";
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

const TABS = [
  { id: "sessions",   label: "Active Sessions",  Icon: Activity },
  { id: "logs",       label: "Login Logs",        Icon: ScrollText },
  { id: "analytics",  label: "Usage Analytics",   Icon: BarChart3 },
  { id: "suspicious", label: "Suspicious",        Icon: ShieldAlert },
  { id: "users",      label: "Users",             Icon: Users },
  { id: "portals",    label: "Portals",           Icon: Link2 },
  { id: "passwords",  label: "Reset Passwords",   Icon: KeyRound },
  { id: "applications", label: "Applications",    Icon: Send },
  { id: "outreach",   label: "Inbound Requirements", Icon: Inbox },
  { id: "activities", label: "Vendor Activities",  Icon: Phone },
  { id: "notes",      label: "Daily Notes",        Icon: NotebookPen },
  { id: "linkedin",   label: "LinkedIn Profiles", Icon: Contact2 },
  { id: "resumes",    label: "Resumes",           Icon: FileText },
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
    { label: "Active Sessions", value: summary?.activeSessions ?? "—", color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Logins Today",    value: summary?.todayLogins    ?? "—", color: "text-primary",   bg: "bg-primary-tint" },
    { label: "Logins This Week",value: summary?.weekLogins     ?? "—", color: "text-blue-600",  bg: "bg-blue-50" },
    { label: "Suspicious (7d)", value: summary?.suspiciousCount ?? "—", color: "text-red-600",  bg: "bg-red-50" },
  ];

  const activeTab = TABS.find(t => t.id === tab);

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      {/* Top header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-20">
        <div className="px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(o => !o)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
              <Menu size={19} />
            </button>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-sm shadow-sm">CA</div>
            <div>
              <div className="text-sm font-bold tracking-tight">ConsultAdd Tracker</div>
              <div className="text-[11px] text-slate-400">Admin Security Panel</div>
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
              className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors">
              <ArrowLeft size={13} /> Dashboard
            </button>
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.split(" ").map(w => w[0]).slice(0,2).join("")}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold">{user?.name}</div>
                <div className="text-[11px] text-slate-400">Admin</div>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg">
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-200 ${sidebarOpen ? "w-56" : "w-0 overflow-hidden"}`}>
          <div className="p-3 space-y-0.5 flex-1 overflow-y-auto">
            {TABS.map(t => (
              <React.Fragment key={t.id}>
                {t.id === "linkedin" && (
                  <div className="px-3 pt-4 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Assets</div>
                )}
                <button onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors text-left ${
                    tab === t.id ? "bg-primary text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}>
                  <t.Icon size={16} strokeWidth={2} className="flex-shrink-0" />
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {SUMMARY_CARDS.map(c => (
                <div key={c.label} className={`${c.bg} rounded-xl px-4 py-3.5`}>
                  <div className="text-[11px] text-muted font-semibold uppercase tracking-wide">{c.label}</div>
                  <div className={`text-2xl font-extrabold mt-1 tracking-tight ${c.color}`}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="text-[17px] font-bold mb-5 flex items-center gap-2.5">
              {activeTab && <activeTab.Icon size={19} className="text-primary" />}
              {activeTab?.label}
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
            {tab === "outreach"     && <RecruiterOutreach user={user} />}
            {tab === "activities"   && <VendorActivities user={user} />}
            {tab === "notes"        && <DailyNotes user={user} />}
          </div>
        </main>
      </div>
    </div>
  );
}
