import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/client";
import { fmtDate } from "./helpers";

export default function ApprovalQueue({ onClose, onChanged, onOpenCandidate }) {
  const [data, setData] = useState({ pending_candidates: [], pending_edit_requests: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/candidates/approval-queue").then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = () => { load(); onChanged(); };

  const approveCandidate = async (id) => {
    setBusyId(id);
    try { await api.post(`/candidates/${id}/approve`); notify(); } finally { setBusyId(null); }
  };
  const rejectCandidate = async (id) => {
    const reason = window.prompt("Reason for rejecting this candidate?") || "";
    setBusyId(id);
    try { await api.post(`/candidates/${id}/reject`, { reason }); notify(); } finally { setBusyId(null); }
  };
  const approveEdit = async (candidateId, reqId) => {
    setBusyId(reqId);
    try { await api.post(`/candidates/${candidateId}/edit-requests/${reqId}/approve`); notify(); } finally { setBusyId(null); }
  };
  const rejectEdit = async (candidateId, reqId) => {
    const reason = window.prompt("Reason for rejecting this edit request?") || "";
    setBusyId(reqId);
    try { await api.post(`/candidates/${candidateId}/edit-requests/${reqId}/reject`, { reason }); notify(); } finally { setBusyId(null); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="font-semibold text-sm">Candidate Bench — Approval Queue</div>
          <button onClick={onClose} className="text-muted hover:text-dark text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-6">
          {loading ? (
            <div className="text-center py-10 text-muted">Loading…</div>
          ) : (
            <>
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  New candidates ({data.pending_candidates.length})
                </div>
                {data.pending_candidates.length === 0 ? (
                  <div className="text-sm text-muted">Nothing pending.</div>
                ) : (
                  <div className="space-y-2">
                    {data.pending_candidates.map(c => (
                      <div key={c.id} className="card p-3 flex items-center justify-between gap-3">
                        <button onClick={() => onOpenCandidate(c.id)} className="text-left min-w-0">
                          <div className="text-sm font-medium truncate">{c.marketing_name || c.legal_name || "Unnamed candidate"}</div>
                          <div className="text-xs text-muted">Submitted by {c.submitted_by_name || "—"} · {fmtDate(c.created_at?.slice(0, 10))}</div>
                        </button>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => approveCandidate(c.id)} disabled={busyId === c.id} className="h-7 px-2.5 rounded-lg text-xs font-semibold bg-primary text-white disabled:opacity-40">Approve</button>
                          <button onClick={() => rejectCandidate(c.id)} disabled={busyId === c.id} className="h-7 px-2.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 disabled:opacity-40">Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  Edit requests ({data.pending_edit_requests.length})
                </div>
                {data.pending_edit_requests.length === 0 ? (
                  <div className="text-sm text-muted">Nothing pending.</div>
                ) : (
                  <div className="space-y-2">
                    {data.pending_edit_requests.map(r => (
                      <div key={r.id} className="card p-3 flex items-center justify-between gap-3">
                        <button onClick={() => onOpenCandidate(r.candidate_id)} className="text-left min-w-0">
                          <div className="text-sm font-medium truncate">{r.candidate_marketing_name}</div>
                          <div className="text-xs text-muted">Requested by {r.requested_by_name || "—"} · {fmtDate(r.created_at?.slice(0, 10))}</div>
                        </button>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => approveEdit(r.candidate_id, r.id)} disabled={busyId === r.id} className="h-7 px-2.5 rounded-lg text-xs font-semibold bg-primary text-white disabled:opacity-40">Approve</button>
                          <button onClick={() => rejectEdit(r.candidate_id, r.id)} disabled={busyId === r.id} className="h-7 px-2.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 disabled:opacity-40">Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
