import React from "react";
import { fmtDate, visaExpiryFlag } from "./helpers";

export default function CandidateCard({ candidate, onOpen }) {
  const c = candidate;
  const expiry = visaExpiryFlag(c.visa_end_date);
  const education = c.candidate_education?.[0];

  return (
    <button onClick={() => onOpen(c.id)} className="card p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-sm text-dark truncate">{c.marketing_name || c.legal_name || "Unnamed candidate"}</div>
        {c.is_own_pending && (
          <span className="badge bg-amber-100 text-amber-700 shrink-0">Pending approval</span>
        )}
        {!c.is_own_pending && c.approval_status === "rejected" && (
          <span className="badge bg-red-100 text-red-700 shrink-0">Rejected</span>
        )}
      </div>

      {c.legal_name && c.legal_name !== c.marketing_name && (
        <div className="text-xs text-muted mt-0.5 truncate">Legal: {c.legal_name}</div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        {c.is_w2 && <span className="badge bg-blue-100 text-blue-700">W2</span>}
        {c.is_c2c && <span className="badge bg-purple-100 text-purple-700">C2C</span>}
        {c.marketing_status === "stopped" && <span className="badge bg-zinc-200 text-zinc-600">Not marketing</span>}
        {expiry && <span className="badge" style={{ background: expiry.bg, color: expiry.color }}>{expiry.label}</span>}
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted">
        {c.visa_type && <div>Visa: <span className="text-dark font-medium">{c.visa_type}</span> · expires {fmtDate(c.visa_end_date)}</div>}
        {education && (
          <div className="truncate">
            {[education.degree_name, education.institution].filter(Boolean).join(" — ") || "Education on file"}
          </div>
        )}
        {c.submitted_by_name && <div>Submitted by {c.submitted_by_name}</div>}
      </div>
    </button>
  );
}
