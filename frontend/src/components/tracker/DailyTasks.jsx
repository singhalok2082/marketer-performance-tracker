import React, { useState, useEffect, useCallback } from "react";
import { Upload, Contact2, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import api from "../../api/client";

const CANONICAL_FIELDS = [
  { key: "full_name", label: "Full Name" },
  { key: "designation", label: "Designation" },
  { key: "company_name", label: "Company Name" },
  { key: "company_domain", label: "Company Domain" },
  { key: "linkedin_url", label: "LinkedIn URL" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
];

const ghostBtn = "h-8 px-3.5 rounded-lg border border-border bg-white text-xs font-semibold text-medium hover:bg-surface hover:border-zinc-300 transition-colors disabled:opacity-40";

function slugify(label) {
  return String(label || "field").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field";
}

export default function DailyTasks({ user }) {
  return user?.role === "admin" ? <AdminDailyTasks /> : <MyDailyTasks />;
}

/* ═══════════════════════ Account manager: my checklist ═══════════════════════ */

function LeadCard({ item, onToggle, onSaveNotes }) {
  const { lead } = item;
  const [notes, setNotes] = useState(item.notes || "");

  return (
    <div className="border border-border rounded-lg p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-[13.5px] truncate">{lead.full_name}</div>
          <div className="text-xs text-subtle truncate">{[lead.designation, lead.company_name].filter(Boolean).join(" · ") || "—"}</div>
          {lead.company_domain && <div className="text-xs text-muted truncate">{lead.company_domain}</div>}
          {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {Object.entries(lead.custom_fields).map(([k, v]) => (
                <span key={k} className="badge bg-surface-alt text-medium">{k.replace(/_/g, " ")}: {v}</span>
              ))}
            </div>
          )}
        </div>
        {lead.linkedin_url && (
          <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="flex-shrink-0 text-muted hover:text-primary" title="LinkedIn profile">
            <Contact2 size={16} />
          </a>
        )}
      </div>

      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {lead.phone && (
          <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
            <input type="checkbox" checked={item.call_done} onChange={e => onToggle(item.id, "call_done", e.target.checked)} className="w-4 h-4 rounded accent-primary" />
            Called <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="text-muted hover:underline">{lead.phone}</a>
          </label>
        )}
        {lead.email && (
          <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
            <input type="checkbox" checked={item.email_done} onChange={e => onToggle(item.id, "email_done", e.target.checked)} className="w-4 h-4 rounded accent-primary" />
            Emailed <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="text-muted hover:underline">{lead.email}</a>
          </label>
        )}
        {!lead.phone && !lead.email && <span className="text-xs text-subtle italic">No phone or email on file for this lead</span>}
      </div>

      <textarea
        value={notes} onChange={e => setNotes(e.target.value)}
        onBlur={() => { if (notes !== (item.notes || "")) onSaveNotes(item.id, notes); }}
        placeholder="Notes (optional)…" rows={1}
        className="input mt-2.5 text-xs resize-y"
      />
    </div>
  );
}

function MyDailyTasks() {
  const [data, setData] = useState({ pending: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  const load = useCallback(() => {
    api.get("/leads/my-tasks").then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = (id, updates) => {
    setData(prev => {
      const merged = [...prev.pending, ...prev.completed].map(i => i.id === id ? { ...i, ...updates } : i);
      const pending = [], completed = [];
      for (const item of merged) {
        const hasCall = !!item.lead.phone, hasEmail = !!item.lead.email;
        const isDone = (hasCall || hasEmail) && (!hasCall || item.call_done) && (!hasEmail || item.email_done);
        (isDone ? completed : pending).push(item);
      }
      return { pending, completed };
    });
    api.patch(`/leads/assignments/${id}`, updates).catch(() => load());
  };

  const total = data.pending.length + data.completed.length;

  if (loading) return <div className="text-sm text-muted py-6 text-center">Loading your leads…</div>;
  if (total === 0) return <div className="text-sm text-subtle py-10 text-center">No leads assigned to you yet. Check back once your admin hands out today's batch.</div>;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-xs text-medium mb-1">
          <span>{data.completed.length} of {total} done</span>
          <span className="text-subtle">{data.pending.length} remaining</span>
        </div>
        <div className="bg-surface-alt rounded h-1.5">
          <div className="bg-emerald-500 h-full rounded transition-all" style={{ width: `${total ? (data.completed.length / total) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="space-y-2.5">
        {data.pending.map(item => (
          <LeadCard key={item.id} item={item}
            onToggle={(id, field, val) => patch(id, { [field]: val })}
            onSaveNotes={(id, notes) => patch(id, { notes })} />
        ))}
        {data.pending.length === 0 && <div className="text-sm text-subtle text-center py-6">All caught up — nice work.</div>}
      </div>

      {data.completed.length > 0 && (
        <div>
          <button onClick={() => setShowCompleted(s => !s)} className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-dark">
            <CheckCircle2 size={14} className="text-emerald-500" /> {data.completed.length} completed {showCompleted ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showCompleted && (
            <div className="space-y-2.5 mt-2.5">
              {data.completed.map(item => (
                <LeadCard key={item.id} item={item}
                  onToggle={(id, field, val) => patch(id, { [field]: val })}
                  onSaveNotes={(id, notes) => patch(id, { notes })} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ Admin: upload, assign, track ═══════════════════════ */

function AdminDailyTasks() {
  const [subTab, setSubTab] = useState("assign");
  const [poolCount, setPoolCount] = useState(null);

  const refreshPool = useCallback(() => {
    api.get("/leads/pool-count").then(r => setPoolCount(r.data.pool)).catch(() => {});
  }, []);
  useEffect(() => { refreshPool(); }, [refreshPool]);

  return (
    <div className="space-y-4">
      <div className="flex bg-surface-alt rounded-lg p-1 w-fit">
        {[["assign", "Upload & Assign"], ["progress", "Progress"]].map(([key, label]) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={`h-7 px-3.5 rounded-md text-xs font-semibold transition-colors ${subTab === key ? "bg-white text-dark shadow-sm" : "text-muted hover:text-dark"}`}>
            {label}
          </button>
        ))}
      </div>
      {subTab === "assign" && <AssignPanel poolCount={poolCount} onPoolChange={refreshPool} />}
      {subTab === "progress" && <ProgressPanel />}
    </div>
  );
}

function AssignPanel({ poolCount, onPoolChange }) {
  const [uploadDraft, setUploadDraft] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const [committing, setCommitting] = useState(false);

  const [managers, setManagers] = useState([]);
  const [counts, setCounts] = useState({});
  const [splitTotal, setSplitTotal] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState(null);

  useEffect(() => { api.get("/users/public").then(r => setManagers(r.data)).catch(() => {}); }, []);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true); setUploadMsg(null);
    const form = new FormData();
    form.append("file", file);
    api.post("/leads/uploads", form, { headers: { "Content-Type": "multipart/form-data" } })
      .then(r => {
        const mapping = { ...r.data.suggested_mapping };
        const customLabels = {};
        r.data.headers.forEach(h => {
          if (mapping[h]?.startsWith("custom:")) customLabels[h] = h;
        });
        setUploadDraft({ ...r.data, mapping, customLabels });
      })
      .catch(err => setUploadMsg({ type: "error", text: err.response?.data?.error || "Upload failed" }))
      .finally(() => setUploading(false));
  };

  const setMapping = (header, target) => {
    setUploadDraft(prev => ({ ...prev, mapping: { ...prev.mapping, [header]: target } }));
  };
  const setCustomLabel = (header, label) => {
    setUploadDraft(prev => ({ ...prev, customLabels: { ...prev.customLabels, [header]: label } }));
  };

  const nameMappedCount = uploadDraft ? Object.values(uploadDraft.mapping).filter(v => v === "full_name").length : 0;

  const commit = () => {
    if (!uploadDraft) return;
    const mapping = {};
    const customFields = [];
    for (const [header, target] of Object.entries(uploadDraft.mapping)) {
      if (target === "ignore" || !target) continue;
      if (target === "custom") {
        const key = slugify(uploadDraft.customLabels[header] || header);
        mapping[header] = `custom:${key}`;
        customFields.push({ key, label: uploadDraft.customLabels[header] || header });
      } else {
        mapping[header] = target;
      }
    }
    setCommitting(true); setUploadMsg(null);
    api.post(`/leads/uploads/${uploadDraft.id}/commit`, { mapping, custom_fields: customFields })
      .then(r => {
        setUploadMsg({ type: "success", text: `Imported ${r.data.imported_count} leads${r.data.skipped_count ? ` · skipped ${r.data.skipped_count} (missing name or already in the pool)` : ""}.` });
        setUploadDraft(null);
        onPoolChange();
      })
      .catch(err => setUploadMsg({ type: "error", text: err.response?.data?.error || "Import failed" }))
      .finally(() => setCommitting(false));
  };

  const setCount = (userId, val) => setCounts(prev => ({ ...prev, [userId]: val }));

  const splitEqually = () => {
    const total = Number(splitTotal) || 0;
    if (total <= 0 || managers.length === 0) return;
    const base = Math.floor(total / managers.length);
    const remainder = total % managers.length;
    const next = {};
    managers.forEach((m, i) => { next[m.id] = base + (i < remainder ? 1 : 0); });
    setCounts(next);
  };

  const totalToAssign = Object.values(counts).reduce((s, n) => s + (Number(n) || 0), 0);

  const submitAssign = () => {
    const payload = Object.fromEntries(Object.entries(counts).filter(([, n]) => Number(n) > 0));
    if (Object.keys(payload).length === 0) return;
    setAssigning(true); setAssignMsg(null);
    api.post("/leads/assign", { counts: payload })
      .then(r => {
        const lines = managers.filter(m => r.data.assigned[m.id] != null).map(m => `${m.name}: ${r.data.assigned[m.id]}`);
        setAssignMsg({
          type: r.data.pool_short ? "warn" : "success",
          text: `Assigned ${r.data.total_assigned} lead${r.data.total_assigned === 1 ? "" : "s"} (${lines.join(", ")})${r.data.pool_short ? " — pool ran short, some managers got fewer than requested." : ""}`,
        });
        setCounts({}); setSplitTotal("");
        onPoolChange();
      })
      .catch(err => setAssignMsg({ type: "error", text: err.response?.data?.error || "Assignment failed" }))
      .finally(() => setAssigning(false));
  };

  return (
    <div className="space-y-5">
      {/* Upload */}
      <div className="card p-5">
        <div className="text-[13.5px] font-bold mb-1">Upload leads</div>
        <div className="text-xs text-subtle mb-3">CSV with recruiter name, designation, company, domain, LinkedIn, email, and/or phone. Columns don't need to match exactly — you'll map them next.</div>

        {!uploadDraft && (
          <label className={`${ghostBtn} inline-flex items-center gap-1.5 cursor-pointer`}>
            <Upload size={13} /> {uploading ? "Uploading…" : "Choose CSV file"}
            <input type="file" accept=".csv" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
        )}

        {uploadMsg && (
          <div className={`text-xs rounded-lg px-3 py-2 mt-3 ${uploadMsg.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {uploadMsg.text}
          </div>
        )}

        {uploadDraft && (
          <div className="mt-2 space-y-3">
            <div className="text-xs text-medium">{uploadDraft.file_name} · {uploadDraft.row_count} rows</div>
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-surface border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-muted uppercase tracking-wide">CSV column</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted uppercase tracking-wide">Sample</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted uppercase tracking-wide">Maps to</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {uploadDraft.headers.map(h => {
                    const target = uploadDraft.mapping[h];
                    const isCustom = target === "custom" || target?.startsWith("custom:");
                    return (
                      <tr key={h}>
                        <td className="px-3 py-2 font-medium whitespace-nowrap">{h}</td>
                        <td className="px-3 py-2 text-subtle truncate max-w-[160px]">{uploadDraft.sample_rows[0]?.[h] || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={isCustom ? "custom" : (target || "ignore")}
                              onChange={e => setMapping(h, e.target.value)}
                              className="h-7 rounded-md border border-border px-1.5 text-xs">
                              {CANONICAL_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                              <option value="custom">Custom field…</option>
                              <option value="ignore">Ignore column</option>
                            </select>
                            {isCustom && (
                              <input value={uploadDraft.customLabels[h] || ""} onChange={e => setCustomLabel(h, e.target.value)}
                                placeholder="Field name" className="h-7 rounded-md border border-border px-2 text-xs w-28" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {nameMappedCount !== 1 && (
              <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">Map exactly one column to Full Name before importing.</div>
            )}
            <div className="flex gap-2">
              <button onClick={commit} disabled={nameMappedCount !== 1 || committing} className="btn-primary text-sm">
                {committing ? "Importing…" : `Import ${uploadDraft.row_count} leads`}
              </button>
              <button onClick={() => setUploadDraft(null)} className={ghostBtn}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Assign */}
      <div className="card p-5">
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-[13.5px] font-bold">Assign today's leads</div>
          <div className="text-xs text-subtle">{poolCount == null ? "…" : `${poolCount} fresh leads in the pool`}</div>
        </div>
        <div className="text-xs text-subtle mb-3">Give each manager a number of leads to work today. Leave a manager at 0 to skip them — leftovers from a previous day stay with whoever they were assigned to until done.</div>

        <div className="flex items-center gap-2 mb-3.5">
          <input type="number" min="0" placeholder="Total to split" value={splitTotal} onChange={e => setSplitTotal(e.target.value)}
            className="input w-32" />
          <button onClick={splitEqually} className={ghostBtn}>Split equally</button>
        </div>

        <div className="space-y-2 mb-3.5">
          {managers.map(m => (
            <div key={m.id} className="flex items-center justify-between gap-3">
              <div className="text-[13px] font-medium">{m.name}</div>
              <input type="number" min="0" value={counts[m.id] ?? ""} onChange={e => setCount(m.id, e.target.value)}
                className="input w-24 text-right" placeholder="0" />
            </div>
          ))}
          {managers.length === 0 && <div className="text-sm text-subtle">No active account managers found.</div>}
        </div>

        {assignMsg && (
          <div className={`text-xs rounded-lg px-3 py-2 mb-3 ${assignMsg.type === "error" ? "bg-red-50 text-red-700" : assignMsg.type === "warn" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {assignMsg.text}
          </div>
        )}

        <button onClick={submitAssign} disabled={totalToAssign === 0 || assigning} className="btn-primary text-sm">
          {assigning ? "Assigning…" : `Assign ${totalToAssign || ""} lead${totalToAssign === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}

function ProgressPanel() {
  const TODAY = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(TODAY);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    setLoading(true);
    api.get(`/leads/assignments?date=${date}`).then(r => setManagers(r.data.managers || [])).catch(() => {}).finally(() => setLoading(false));
  }, [date]);

  const toggle = (uid) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(uid) ? next.delete(uid) : next.add(uid);
    return next;
  });

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="text-[13.5px] font-bold">Batches assigned on this day</div>
        <input type="date" value={date} max={TODAY} onChange={e => setDate(e.target.value)} className="h-8 rounded-lg border border-border px-2 text-xs" />
      </div>

      {loading ? (
        <div className="text-sm text-muted py-6 text-center">Loading…</div>
      ) : managers.length === 0 ? (
        <div className="text-sm text-subtle py-6 text-center">No leads were assigned on this day.</div>
      ) : (
        <div className="space-y-2">
          {managers.map(m => {
            const open = expanded.has(m.user_id);
            return (
              <div key={m.user_id} className="border border-border rounded-lg overflow-hidden">
                <button onClick={() => toggle(m.user_id)} className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-surface transition-colors">
                  <div className="font-semibold text-[13px]">{m.user_name}</div>
                  <div className="flex items-center gap-3">
                    <span className="badge bg-emerald-50 text-emerald-700">{m.done} done</span>
                    <span className="badge bg-amber-50 text-amber-700">{m.pending} pending</span>
                    <span className="text-xs text-subtle">{m.total} total</span>
                    {open ? <ChevronUp size={15} className="text-muted" /> : <ChevronDown size={15} className="text-muted" />}
                  </div>
                </button>
                {open && (
                  <div className="border-t border-border divide-y divide-border">
                    {m.items.map(it => (
                      <div key={it.id} className="px-3.5 py-2 flex items-center justify-between gap-3 text-[13px]">
                        <div className="min-w-0">
                          <span className="font-medium">{it.lead.full_name}</span>
                          <span className="text-subtle"> · {[it.lead.designation, it.lead.company_name].filter(Boolean).join(" · ") || "—"}</span>
                        </div>
                        <span className={`badge flex-shrink-0 ${it.status === "done" ? "bg-emerald-50 text-emerald-700" : it.status === "no_contact" ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-700"}`}>
                          {it.status === "done" ? "Done" : it.status === "no_contact" ? "No contact info" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
