import React, { useState, useEffect } from "react";
import api from "../../../api/client";

function fmtMin(mins) {
  if (!mins) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function UsageAnalytics() {
  const [data, setData]     = useState([]);
  const [range, setRange]   = useState("weekly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/analytics/usage?range=${range}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  const maxMins = data[0]?.totalMinutes || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {["daily", "weekly", "monthly"].map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors capitalize ${range === r ? "bg-primary text-white border-primary" : "bg-white text-medium border-border hover:border-primary/50"}`}>
            {r}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">User</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Time Spent</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Logins</th>
              <th className="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide w-48">Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10 text-muted">Loading…</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-muted">No usage data for this period.</td></tr>
            ) : data.map(row => (
              <tr key={row.userId} className="hover:bg-surface transition-colors">
                <td className="px-5 py-3">
                  <div className="font-semibold">{row.name}</div>
                  <div className="text-xs text-muted">{row.email}</div>
                </td>
                <td className="px-5 py-3 font-semibold text-primary">{fmtMin(row.totalMinutes)}</td>
                <td className="px-5 py-3 text-medium">{row.totalLogins}</td>
                <td className="px-5 py-3">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.round((row.totalMinutes / maxMins) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
