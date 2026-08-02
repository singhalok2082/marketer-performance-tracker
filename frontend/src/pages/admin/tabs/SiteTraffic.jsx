import React, { useState, useEffect } from "react";
import api from "../../../api/client";

function fmtDateTime(s) {
  return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function SiteTraffic() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/visits")
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-muted">Loading…</div>;
  if (!data) return <div className="text-sm text-muted">Failed to load traffic data.</div>;

  const CARDS = [
    { label: "Total Visits (all-time)", value: data.total },
    { label: "Today", value: data.today },
    { label: "Last 7 Days", value: data.week },
    { label: "Unique Visitors (recent)", value: data.uniqueRecentVisitors },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted -mb-1">
        Anonymous hits on the public landing page, logged before anyone signs in. "Unique visitors" is based on the most recent 500 visits, not all-time.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {CARDS.map(c => (
          <div key={c.label} className="bg-primary-tint rounded-xl px-4 py-3.5">
            <div className="text-[11px] text-muted font-semibold uppercase tracking-wide">{c.label}</div>
            <div className="text-2xl font-extrabold mt-1 tracking-tight text-primary">{c.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {data.byCountry.length > 0 && (
        <div className="card p-5">
          <div className="text-[13.5px] font-bold mb-2.5">By country (recent visits)</div>
          {data.byCountry.slice(0, 8).map(c => (
            <div key={c.country} className="mb-2">
              <div className="flex justify-between text-xs text-medium mb-1">
                <span>{c.country}</span><span className="text-subtle">{c.count}</span>
              </div>
              <div className="bg-surface-alt rounded h-1.5">
                <div className="bg-primary h-full rounded" style={{ width: `${Math.round((c.count / data.byCountry[0].count) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <div className="text-[13.5px] font-bold">Recent visits</div>
          <div className="text-xs text-subtle mt-0.5">Most recent 100</div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Time</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">IP Address</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Location</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Device</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Referrer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.recent.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-muted">No visits logged yet.</td></tr>
            ) : data.recent.map(v => (
              <tr key={v.id} className="hover:bg-surface transition-colors">
                <td className="px-5 py-2.5 text-medium whitespace-nowrap">{fmtDateTime(v.created_at)}</td>
                <td className="px-5 py-2.5 text-medium whitespace-nowrap font-mono text-xs">{v.ip_address || "—"}</td>
                <td className="px-5 py-2.5 text-medium whitespace-nowrap">{[v.city, v.country].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-5 py-2.5 text-muted whitespace-nowrap">{v.browser} · {v.os}</td>
                <td className="px-5 py-2.5 text-muted truncate max-w-[220px]">{v.referrer || "Direct"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
