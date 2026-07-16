import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/client";

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmt(ts) {
  return new Date(ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function ActiveSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [terminating, setTerminating] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/audit/sessions")
      .then(r => setSessions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const terminate = async (id) => {
    if (!confirm("Terminate this session? The user will be logged out immediately.")) return;
    setTerminating(id);
    try {
      await api.delete(`/audit/sessions/${id}`);
      setSessions(s => s.filter(x => x.id !== id));
    } catch {
      alert("Failed to terminate session");
    } finally {
      setTerminating(null);
    }
  };

  if (loading && sessions.length === 0) {
    return <div className="text-center py-16 text-muted">Loading sessions…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">{sessions.length} active session{sessions.length !== 1 ? "s" : ""}</div>
        <button onClick={load} className="btn-secondary text-sm py-1.5 px-3">↻ Refresh</button>
      </div>

      {sessions.length === 0 ? (
        <div className="card p-12 text-center text-muted">No active sessions right now.</div>
      ) : (
        <div className="grid gap-3">
          {sessions.map(s => (
            <div key={s.id} className="card px-5 py-4 flex items-center gap-4 flex-wrap">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {(s.users?.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{s.users?.name || "Unknown"}</div>
                <div className="text-xs text-muted">{s.users?.email}</div>
              </div>
              <div className="text-xs text-muted space-y-0.5 min-w-0">
                <div>🌐 {s.ip_address || "—"}</div>
                <div>🖥 {s.browser || "—"} · {s.os || "—"}</div>
              </div>
              <div className="text-xs text-muted text-right min-w-0">
                <div>Logged in {timeAgo(s.login_time)}</div>
                <div className="text-subtle">Active {timeAgo(s.last_activity)}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> LIVE
                </span>
                <button onClick={() => terminate(s.id)} disabled={terminating === s.id}
                  className="btn-danger text-xs py-1 px-2.5 disabled:opacity-50">
                  {terminating === s.id ? "…" : "Terminate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
