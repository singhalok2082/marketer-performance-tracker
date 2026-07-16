import React, { useState, useEffect } from "react";
import api from "../../../api/client";

function fmt(ts) {
  return new Date(ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function SuspiciousAlerts() {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/audit/suspicious?limit=200")
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      {!loading && data.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="font-semibold text-dark">No suspicious activity detected</div>
          <div className="text-sm text-muted mt-1">All logins look normal</div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 border-b border-amber-200">
                <tr>
                  {["Date & Time","User","Email","IP Address","Browser","OS","Country","Reason"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-muted">Loading…</td></tr>
                ) : data.map(row => (
                  <tr key={row.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted">{fmt(row.created_at)}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{row.users?.name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{row.email}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{row.ip_address || "—"}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{row.browser || "—"}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{row.os || "—"}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{row.country || "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="badge bg-amber-100 text-amber-700">{row.failure_reason || "Suspicious pattern"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
