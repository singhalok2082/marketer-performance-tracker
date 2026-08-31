import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/client";
import { fmtDate, buildMarketingText, buildSystemText, buildAllText } from "./helpers";
import { hasPermission } from "../../../pages/admin/permissionSections";

function Row({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="text-sm text-dark mt-0.5">{value || "—"}</div>
    </div>
  );
}

function activityStatusClass(status) {
  if (status === "Offer") return "bg-green-100 text-green-700";
  if (status === "Interview Scheduled") return "bg-blue-100 text-blue-700";
  if (status === "Submitted to Client") return "bg-purple-100 text-purple-700";
  if (status === "Rejected") return "bg-red-100 text-red-700";
  if (status === "No Response") return "bg-gray-100 text-gray-500";
  return "bg-amber-100 text-amber-700";
}

export default function CandidateDetailModal({ candidateId, user, onClose, onChanged, onEdit }) {
  const isAdmin = user?.role === "admin";
  const canManage = isAdmin && hasPermission(user, "bench");

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offerForm, setOfferForm] = useState({ employer_client: "", offer_date: "", notes: "" });
  const [savingOffer, setSavingOffer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [activity, setActivity] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/candidates/${candidateId}`)
      .then(r => setCandidate(r.data))
      .catch(err => setError(err.response?.data?.error || "Failed to load candidate"))
      .finally(() => setLoading(false));
  }, [candidateId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get(`/candidates/${candidateId}/activity`).then(r => setActivity(r.data)).catch(() => setActivity(null));
  }, [candidateId]);

  const notify = () => { load(); onChanged(); };

  const approve = async () => { setBusy(true); try { await api.post(`/candidates/${candidateId}/approve`); notify(); } finally { setBusy(false); } };
  const reject = async () => {
    const reason = window.prompt("Reason for rejecting this candidate?") || "";
    setBusy(true);
    try { await api.post(`/candidates/${candidateId}/reject`, { reason }); notify(); } finally { setBusy(false); }
  };
  const setMarketingStatus = async (marketing_status) => {
    setBusy(true);
    try { await api.patch(`/candidates/${candidateId}/marketing-status`, { marketing_status }); notify(); } finally { setBusy(false); }
  };
  const toggleSegment = async (field) => {
    setBusy(true);
    try { await api.patch(`/candidates/${candidateId}`, { [field]: !candidate[field] }); notify(); } finally { setBusy(false); }
  };
  const addOffer = async (e) => {
    e.preventDefault();
    if (!offerForm.employer_client.trim()) return;
    setSavingOffer(true);
    try {
      await api.post(`/candidates/${candidateId}/offers`, offerForm);
      setOfferForm({ employer_client: "", offer_date: "", notes: "" });
      load();
    } finally { setSavingOffer(false); }
  };

  const copy = async (key, text) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="font-semibold text-sm">{candidate?.marketing_name || candidate?.legal_name || "Candidate"}</div>
          <button onClick={onClose} className="text-muted hover:text-dark text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {error && <div className="text-sm rounded-lg px-4 py-3 border bg-red-50 border-red-200 text-red-700">{error}</div>}
          {loading && <div className="text-center py-10 text-muted">Loading…</div>}

          {candidate && (
            <>
              <div className="flex flex-wrap gap-1.5">
                <span className={`badge ${candidate.is_w2 ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-400"}`}>W2</span>
                <span className={`badge ${candidate.is_c2c ? "bg-purple-100 text-purple-700" : "bg-zinc-100 text-zinc-400"}`}>C2C</span>
                {candidate.approval_status === "pending" && <span className="badge bg-amber-100 text-amber-700">Pending approval</span>}
                {candidate.approval_status === "rejected" && <span className="badge bg-red-100 text-red-700">Rejected{candidate.rejection_reason ? `: ${candidate.rejection_reason}` : ""}</span>}
                {candidate.marketing_status === "stopped" && <span className="badge bg-zinc-200 text-zinc-600">Not marketing</span>}
              </div>

              {canManage && (
                <div>
                  <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Segment</div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleSegment("is_w2")} disabled={busy}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 ${candidate.is_w2 ? "bg-primary border-primary text-white" : "border-border text-medium hover:bg-surface"}`}>
                      W2 {candidate.is_w2 ? "✓" : ""}
                    </button>
                    <button onClick={() => toggleSegment("is_c2c")} disabled={busy}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 ${candidate.is_c2c ? "bg-primary border-primary text-white" : "border-border text-medium hover:bg-surface"}`}>
                      C2C {candidate.is_c2c ? "✓" : ""}
                    </button>
                  </div>
                </div>
              )}

              {canManage && candidate.approval_status === "pending" && (
                <div className="flex gap-2">
                  <button onClick={approve} disabled={busy} className="btn-primary disabled:opacity-40">Approve</button>
                  <button onClick={reject} disabled={busy} className="h-9 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50">Reject</button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Row label="Legal name" value={candidate.legal_name} />
                <Row label="Date of birth" value={fmtDate(candidate.date_of_birth)} />
                <Row label="SSN (last 4)" value={candidate.ssn_last4} />
                <Row label="Visa type" value={candidate.visa_type} />
                <Row label="Visa issue date" value={fmtDate(candidate.visa_start_date)} />
                <Row label="Visa expiration date" value={fmtDate(candidate.visa_end_date)} />
                <Row label="US entry date" value={fmtDate(candidate.us_entry_date)} />
                <Row label="Current location" value={candidate.current_address_linkedin} />
                <Row label="Submitted by" value={candidate.submitted_by_name} />
              </div>

              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Education</div>
                {candidate.candidate_education?.length ? (
                  <ul className="text-sm space-y-1">
                    {candidate.candidate_education.map(e => (
                      <li key={e.id}>
                        {[e.degree_name, e.institution, e.location].filter(Boolean).join(" — ")}
                        {(e.start_year || e.end_year) && ` (${e.start_year || "?"}–${e.end_year || "?"})`}
                      </li>
                    ))}
                  </ul>
                ) : <div className="text-sm text-muted">None on file.</div>}
              </div>

              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Additional details</div>
                {candidate.candidate_details?.length ? (
                  <ul className="text-sm space-y-1">
                    {candidate.candidate_details.map(d => <li key={d.id}><span className="font-medium">{d.label}:</span> {d.value || "—"}</li>)}
                  </ul>
                ) : <div className="text-sm text-muted">None on file.</div>}
              </div>

              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">System access</div>
                {candidate.candidate_system_credentials?.length ? (
                  <ul className="text-sm space-y-2">
                    {candidate.candidate_system_credentials.map(s => (
                      <li key={s.id}>
                        <div className="font-medium">{s.system_name}</div>
                        {s.login_id && <div className="text-muted">Login ID: <span className="text-dark">{s.login_id}</span></div>}
                        {s.password && <div className="text-muted">Password: <span className="text-dark">{s.password}</span></div>}
                      </li>
                    ))}
                  </ul>
                ) : <div className="text-sm text-muted">None on file.</div>}
              </div>

              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Offers</div>
                {candidate.candidate_offers?.length ? (
                  <ul className="text-sm space-y-1 mb-2">
                    {candidate.candidate_offers.map(o => (
                      <li key={o.id}>{o.employer_client} — {fmtDate(o.offer_date)}{o.notes ? ` — ${o.notes}` : ""}</li>
                    ))}
                  </ul>
                ) : <div className="text-sm text-muted mb-2">No offers logged yet.</div>}

                {candidate.approval_status === "approved" && (
                  <form onSubmit={addOffer} className="flex flex-wrap gap-2">
                    <input className="input flex-1 min-w-[140px]" placeholder="Employer / client" value={offerForm.employer_client}
                      onChange={e => setOfferForm(f => ({ ...f, employer_client: e.target.value }))} />
                    <input type="date" className="input w-40" value={offerForm.offer_date}
                      onChange={e => setOfferForm(f => ({ ...f, offer_date: e.target.value }))} />
                    <button type="submit" disabled={savingOffer} className="btn-primary disabled:opacity-40">Log offer</button>
                  </form>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Vendor activity</div>
                <p className="text-xs text-muted -mt-0.5 mb-2">
                  Screenings, interviews, and offers logged for this candidate from the Vendor Activities tracker.
                  {activity?.vendorActivities.scope === "own" && " Showing only entries you logged — an admin sees everyone's."}
                </p>
                {!activity || activity.vendorActivities.items.length === 0 ? (
                  <div className="text-sm text-muted">No linked vendor activity yet — link one from the Vendor Activities tab.</div>
                ) : (
                  <>
                    <div className="text-sm mb-2">
                      {activity.vendorActivities.summary.byType.tech_screening || 0} screening{(activity.vendorActivities.summary.byType.tech_screening || 0) === 1 ? "" : "s"}
                      {" · "}{activity.vendorActivities.summary.byType.interview || 0} interview{(activity.vendorActivities.summary.byType.interview || 0) === 1 ? "" : "s"}
                      {" · "}{activity.vendorActivities.summary.byType.offer || 0} offer{(activity.vendorActivities.summary.byType.offer || 0) === 1 ? "" : "s"}
                    </div>
                    {activity.vendorActivities.scope === "all" && activity.vendorActivities.summary.byManager.length > 1 && (
                      <ul className="text-xs text-muted space-y-0.5 mb-2">
                        {activity.vendorActivities.summary.byManager.map(m => (
                          <li key={m.user_name}>{m.user_name || "—"}: {m.interviews} interview{m.interviews === 1 ? "" : "s"}, {m.offers} offer{m.offers === 1 ? "" : "s"}</li>
                        ))}
                      </ul>
                    )}
                    <ul className="text-sm space-y-1.5">
                      {activity.vendorActivities.items.map(a => (
                        <li key={a.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            {a.client_name || a.vendor_company || "—"} · {fmtDate(a.activity_date)}
                            {activity.vendorActivities.scope === "all" && a.user_name ? ` · ${a.user_name}` : ""}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${activityStatusClass(a.activity_type === "offer" ? "Offer" : a.activity_type === "interview" ? "Interview Scheduled" : "")}`}>
                            {a.activity_type === "tech_screening" ? "Tech Screening" : a.activity_type[0].toUpperCase() + a.activity_type.slice(1)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Job application activity</div>
                <p className="text-xs text-muted -mt-0.5 mb-2">
                  Portal submissions logged for this candidate from the Job Applications tracker.
                  {activity?.jobApplications.scope === "own" && " Showing only applications you logged — an admin sees everyone's."}
                </p>
                {!activity || activity.jobApplications.items.length === 0 ? (
                  <div className="text-sm text-muted">No linked applications yet — link one from the Job Applications tab.</div>
                ) : (
                  <>
                    <div className="text-sm mb-2">
                      {activity.jobApplications.summary.total} application{activity.jobApplications.summary.total === 1 ? "" : "s"}
                      {" · "}{activity.jobApplications.summary.byStatus["Interview Scheduled"] || 0} interview{(activity.jobApplications.summary.byStatus["Interview Scheduled"] || 0) === 1 ? "" : "s"} scheduled
                      {" · "}{activity.jobApplications.summary.byStatus["Offer"] || 0} offer{(activity.jobApplications.summary.byStatus["Offer"] || 0) === 1 ? "" : "s"}
                    </div>
                    {activity.jobApplications.scope === "all" && activity.jobApplications.summary.byManager.length > 1 && (
                      <ul className="text-xs text-muted space-y-0.5 mb-2">
                        {activity.jobApplications.summary.byManager.map(m => (
                          <li key={m.user_name}>{m.user_name || "—"}: {m.total} application{m.total === 1 ? "" : "s"}, {m.interviews} interview{m.interviews === 1 ? "" : "s"}, {m.offers} offer{m.offers === 1 ? "" : "s"}</li>
                        ))}
                      </ul>
                    )}
                    <ul className="text-sm space-y-1.5">
                      {activity.jobApplications.items.map(a => (
                        <li key={a.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            {a.job_title}{a.portal_name ? ` — ${a.portal_name}` : ""} · {fmtDate(a.applied_date)}
                            {activity.jobApplications.scope === "all" && a.user_name ? ` · ${a.user_name}` : ""}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${activityStatusClass(a.status)}`}>{a.status}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {canManage && candidate.approval_status === "approved" && (
                <div>
                  <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Marketing status</div>
                  <div className="flex gap-2">
                    <button onClick={() => setMarketingStatus("active")} disabled={busy || candidate.marketing_status === "active"}
                      className="h-8 px-3 rounded-lg border border-border text-xs font-semibold disabled:opacity-40 disabled:bg-surface hover:bg-surface">Keep marketing</button>
                    <button onClick={() => setMarketingStatus("stopped")} disabled={busy || candidate.marketing_status === "stopped"}
                      className="h-8 px-3 rounded-lg border border-border text-xs font-semibold disabled:opacity-40 disabled:bg-surface hover:bg-surface">Stop marketing</button>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Copy for Slack</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => copy("marketing", buildMarketingText(candidate))}
                    className="h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-surface">
                    {copiedKey === "marketing" ? "Copied ✓" : "Copy marketing details"}
                  </button>
                  <button onClick={() => copy("system", buildSystemText(candidate))} disabled={!candidate.candidate_system_credentials?.length}
                    className="h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-surface disabled:opacity-40">
                    {copiedKey === "system" ? "Copied ✓" : "Copy system details"}
                  </button>
                  <button onClick={() => copy("all", buildAllText(candidate))}
                    className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover">
                    {copiedKey === "all" ? "Copied ✓" : "Copy all"}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {canManage && (
                  <button onClick={() => onEdit(candidate, "edit")} className="h-9 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-surface">Edit</button>
                )}
                {!canManage && candidate.approval_status === "approved" && (
                  <button onClick={() => onEdit(candidate, "edit-request")} className="h-9 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-surface">Request edit</button>
                )}
                {!canManage && candidate.is_own_pending && (
                  <button onClick={() => onEdit(candidate, "edit")} className="h-9 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-surface">Edit</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
