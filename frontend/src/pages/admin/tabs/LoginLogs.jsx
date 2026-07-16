import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/client";

const STATUS_COLORS = {
  success:    "bg-green-100 text-green-700",
  failed:     "bg-red-100 text-red-700",
  suspicious: "bg-amber-100 text-amber-700",
};

function fmt(ts) {
  return new Date(ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function LoginLogs() {
  const [data, setData]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const LIMIT = 50;

  const fetch = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (status) params.set("status", status);
    api.get(`/audit/login-logs?${params}`)
      .then(r => { setData(r.data.data); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => { fetch(); }, [fetch]);

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-sm text-muted">{total} total records</div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="input w-auto text-sm">
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="suspicious">Suspicious</option>
        </select>
        <button onClick={fetch} className="btn-secondary text-sm py-1.5 px-3">Refresh</button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-border">
              <tr>
                {["Date & Time","User","Email","Status","IP Address","Browser","OS","Device","Country"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-muted">Loading…</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-muted">No records found</td></tr>
              ) : data.map(row => (
                <tr key={row.id} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted">{fmt(row.created_at)}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{row.users?.name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{row.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`badge ${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-600"}`}>{row.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{row.ip_address || "—"}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{row.browser || "—"}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{row.os || "—"}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{row.device || "—"}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{row.country || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm py-1 px-3 disabled:opacity-40">← Prev</button>
          <span className="text-sm text-muted">Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary text-sm py-1 px-3 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
