import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/client";
import { hasPermission } from "../../../pages/admin/permissionSections";
import CandidateCard from "./CandidateCard";
import CandidateFormModal from "./CandidateFormModal";
import CandidateDetailModal from "./CandidateDetailModal";
import ApprovalQueue from "./ApprovalQueue";
import { candidateToForm } from "./helpers";

const SEGMENT_FILTERS = [["all", "All"], ["w2", "W2"], ["c2c", "C2C"]];

const chip = (active) =>
  `h-8 px-3.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
    active ? "bg-primary border-primary text-white shadow-sm" : "bg-white border-border text-medium hover:bg-surface hover:border-zinc-300"
  }`;

export default function CandidateBench({ user }) {
  const isAdmin = user?.role === "admin";
  const canManage = isAdmin && hasPermission(user, "bench");

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [segment, setSegment] = useState("all");
  const [marketingStatus, setMarketingStatus] = useState("active");

  const [formModal, setFormModal] = useState(null); // { mode, candidateId, initial } | null
  const [detailId, setDetailId] = useState(null);
  const [showQueue, setShowQueue] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    const params = { marketing_status: marketingStatus };
    if (segment !== "all") params.segment = segment;
    api.get("/candidates", { params })
      .then(r => setCandidates(r.data))
      .catch(err => setError(err.response?.data?.error || "Failed to load candidates"))
      .finally(() => setLoading(false));
  }, [segment, marketingStatus]);

  useEffect(() => { load(); }, [load]);

  const loadQueueCount = useCallback(() => {
    if (!canManage) return;
    api.get("/candidates/approval-queue")
      .then(r => setQueueCount(r.data.pending_candidates.length + r.data.pending_edit_requests.length))
      .catch(() => {});
  }, [canManage]);

  useEffect(() => { loadQueueCount(); }, [loadQueueCount]);

  const onChanged = () => { load(); loadQueueCount(); };

  const openDetail = (id) => { setShowQueue(false); setDetailId(id); };
  const openEditFrom = (candidate, mode) => {
    setDetailId(null);
    setFormModal({ mode, candidateId: candidate.id, initial: candidateToForm(candidate) });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted -mb-1">
        Candidates on the bench, open for W2 and/or C2C roles. New submissions stay private to you until an admin approves them.
      </p>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {SEGMENT_FILTERS.map(([key, label]) => (
            <button key={key} onClick={() => setSegment(key)} className={chip(segment === key)}>{label}</button>
          ))}
          <span className="w-px h-5 bg-border mx-1" />
          <button onClick={() => setMarketingStatus("active")} className={chip(marketingStatus === "active")}>Active bench</button>
          <button onClick={() => setMarketingStatus("stopped")} className={chip(marketingStatus === "stopped")}>Not marketing</button>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <button onClick={() => setShowQueue(true)} className="h-9 px-3.5 rounded-lg border border-border bg-white text-xs font-semibold text-medium hover:bg-surface flex items-center gap-1.5">
              Approval Queue
              {queueCount > 0 && <span className="badge bg-amber-100 text-amber-700">{queueCount}</span>}
            </button>
          )}
          <button onClick={() => setFormModal({ mode: "create", candidateId: null, initial: null })} className="btn-primary">
            + Add Candidate
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm rounded-lg px-4 py-3 border bg-red-50 border-red-200 text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-muted">Loading…</div>
      ) : candidates.length === 0 ? (
        <div className="card text-center py-10 text-muted">No candidates in this view yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {candidates.map(c => <CandidateCard key={c.id} candidate={c} onOpen={openDetail} />)}
        </div>
      )}

      {formModal && (
        <CandidateFormModal
          mode={formModal.mode}
          candidateId={formModal.candidateId}
          initial={formModal.initial}
          onClose={() => setFormModal(null)}
          onSaved={() => { setFormModal(null); onChanged(); }}
        />
      )}

      {detailId && (
        <CandidateDetailModal
          candidateId={detailId}
          user={user}
          onClose={() => setDetailId(null)}
          onChanged={onChanged}
          onEdit={openEditFrom}
        />
      )}

      {showQueue && (
        <ApprovalQueue
          onClose={() => setShowQueue(false)}
          onChanged={onChanged}
          onOpenCandidate={openDetail}
        />
      )}
    </div>
  );
}
