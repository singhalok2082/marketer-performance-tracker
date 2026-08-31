import React, { useState } from "react";
import api from "../../../api/client";
import { emptyCandidateForm } from "./helpers";
import { parsePastedCandidateText } from "./parsePastedText";

const MODE_TITLES = {
  create: "Add Candidate",
  edit: "Edit Candidate",
  "edit-request": "Request an Edit",
};
const MODE_SUBMIT_LABELS = {
  create: "Add candidate",
  edit: "Save changes",
  "edit-request": "Submit for approval",
};

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function CandidateFormModal({ mode, candidateId, initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial || emptyCandidateForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showPaste, setShowPaste] = useState(mode === "create");
  const [pasteText, setPasteText] = useState("");
  const [parseSummary, setParseSummary] = useState(null);

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const parseAndFill = () => {
    if (!pasteText.trim()) return;
    const { candidate, education, details, systemCredentials } = parsePastedCandidateText(pasteText);
    setForm(f => ({
      ...f,
      ...candidate,
      education: [...f.education, ...education],
      details: [...f.details, ...details],
      system_credentials: [...f.system_credentials, ...systemCredentials],
    }));
    const mappedCount = Object.keys(candidate).length;
    const parts = [`${mappedCount} field${mappedCount === 1 ? "" : "s"} mapped`];
    if (education.length) parts.push(`${education.length} education entr${education.length === 1 ? "y" : "ies"}`);
    if (systemCredentials.length) parts.push(`${systemCredentials.length} system${systemCredentials.length === 1 ? "" : "s"}`);
    if (details.length) parts.push(`${details.length} line${details.length === 1 ? "" : "s"} couldn't be auto-mapped — added below for you to check`);
    setParseSummary(parts.join(", ") + ". Review everything before saving.");
    setPasteText("");
  };

  const setEduRow = (i, patch) => set({ education: form.education.map((r, idx) => idx === i ? { ...r, ...patch } : r) });
  const addEduRow = () => set({ education: [...form.education, { degree_name: "", institution: "", location: "", start_year: "", end_year: "" }] });
  const removeEduRow = (i) => set({ education: form.education.filter((_, idx) => idx !== i) });

  const setDetailRow = (i, patch) => set({ details: form.details.map((r, idx) => idx === i ? { ...r, ...patch } : r) });
  const addDetailRow = () => set({ details: [...form.details, { label: "", value: "" }] });
  const removeDetailRow = (i) => set({ details: form.details.filter((_, idx) => idx !== i) });

  const setSystemRow = (i, patch) => set({ system_credentials: form.system_credentials.map((r, idx) => idx === i ? { ...r, ...patch } : r) });
  const addSystemRow = () => set({ system_credentials: [...form.system_credentials, { system_name: "", username: "", password: "", notes: "" }] });
  const removeSystemRow = (i) => set({ system_credentials: form.system_credentials.filter((_, idx) => idx !== i) });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.ssn_last4 && !/^\d{4}$/.test(form.ssn_last4)) return setError("SSN must be exactly the last 4 digits");

    const education = form.education.filter(r => r.degree_name || r.institution || r.location || r.start_year || r.end_year)
      .map(r => ({ ...r, start_year: r.start_year ? Number(r.start_year) : null, end_year: r.end_year ? Number(r.end_year) : null }));
    const details = form.details.filter(r => r.label.trim() || r.value.trim());
    const systemCredentials = form.system_credentials.filter(r => r.system_name.trim() || r.username.trim() || r.password.trim() || r.notes.trim());

    const core = {
      marketing_name: form.marketing_name.trim(),
      legal_name: form.legal_name || "",
      date_of_birth: form.date_of_birth || "",
      ssn_last4: form.ssn_last4 || "",
      visa_type: form.visa_type || "",
      visa_start_date: form.visa_start_date || "",
      visa_end_date: form.visa_end_date || "",
      us_entry_date: form.us_entry_date || "",
      current_address_linkedin: form.current_address_linkedin || "",
      is_w2: form.is_w2,
      is_c2c: form.is_c2c,
    };
    // Jump login and system access are admin-only after approval — kept out
    // of the edit-request payload entirely, same rule as system_credentials.
    const jump = { jump_login_id: form.jump_login_id || "", jump_password: form.jump_password || "" };

    setSaving(true);
    try {
      if (mode === "create") {
        await api.post("/candidates", { ...core, ...jump, education, details, system_credentials: systemCredentials });
      } else if (mode === "edit") {
        await api.patch(`/candidates/${candidateId}`, { ...core, ...jump, education, details, system_credentials: systemCredentials });
      } else {
        await api.post(`/candidates/${candidateId}/edit-requests`, { changes: { candidate: core, education, details } });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="font-semibold text-sm">{MODE_TITLES[mode]}</div>
          <button onClick={onClose} className="text-muted hover:text-dark text-xl leading-none">×</button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto px-5 py-4 space-y-5">
          {error && <div className="text-sm rounded-lg px-4 py-3 border bg-red-50 border-red-200 text-red-700">{error}</div>}

          {mode !== "edit-request" && (
            <div className="rounded-lg border border-dashed border-border p-3 bg-surface/60">
              <button type="button" onClick={() => setShowPaste(s => !s)} className="text-xs font-semibold text-primary">
                {showPaste ? "− Hide" : "+"} Paste details to auto-fill
              </button>
              {showPaste && (
                <div className="mt-2 space-y-2">
                  <textarea rows={6} className="input h-auto py-2 font-mono text-xs" placeholder={"Paste whatever the recruiting team sent — e.g.\nMarketing Name: ...\nDOB: ...\nSSN: ...\nEducation: ...\nSystem Name: ...\nUsername: ..."}
                    value={pasteText} onChange={e => setPasteText(e.target.value)} />
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={parseAndFill} disabled={!pasteText.trim()} className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-40">
                      Parse &amp; fill form
                    </button>
                    {parseSummary && <div className="text-xs text-muted">{parseSummary}</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Marketing name">
              <input className="input" value={form.marketing_name} onChange={e => set({ marketing_name: e.target.value })} placeholder="Name used when submitting to clients" />
            </Field>
            <Field label="Legal name">
              <input className="input" value={form.legal_name} onChange={e => set({ legal_name: e.target.value })} />
            </Field>
            <Field label="Date of birth">
              <input type="date" className="input" value={form.date_of_birth} onChange={e => set({ date_of_birth: e.target.value })} />
            </Field>
            <Field label="SSN (last 4 digits only)">
              <input className="input" maxLength={4} inputMode="numeric" value={form.ssn_last4}
                onChange={e => set({ ssn_last4: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="1234" />
            </Field>
            <Field label="Visa type">
              <input className="input" value={form.visa_type} onChange={e => set({ visa_type: e.target.value })} placeholder="H1B, OPT, …" />
            </Field>
            <Field label="US entry date">
              <input type="date" className="input" value={form.us_entry_date} onChange={e => set({ us_entry_date: e.target.value })} />
            </Field>
            <Field label="Visa issue date">
              <input type="date" className="input" value={form.visa_start_date} onChange={e => set({ visa_start_date: e.target.value })} />
            </Field>
            <Field label="Visa expiration date">
              <input type="date" className="input" value={form.visa_end_date} onChange={e => set({ visa_end_date: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Current location">
                <input className="input" value={form.current_address_linkedin} onChange={e => set({ current_address_linkedin: e.target.value })} placeholder="City, State" />
              </Field>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium mb-1.5">Segment</div>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={form.is_w2} onChange={e => set({ is_w2: e.target.checked })} /> W2
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={form.is_c2c} onChange={e => set({ is_c2c: e.target.checked })} /> C2C
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-medium">Education</div>
              <button type="button" onClick={addEduRow} className="text-xs font-semibold text-primary">+ Add degree</button>
            </div>
            <div className="space-y-2">
              {form.education.map((row, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <input className="input sm:col-span-3" placeholder="Degree" value={row.degree_name} onChange={e => setEduRow(i, { degree_name: e.target.value })} />
                  <input className="input sm:col-span-3" placeholder="Institution" value={row.institution} onChange={e => setEduRow(i, { institution: e.target.value })} />
                  <input className="input sm:col-span-3" placeholder="Location" value={row.location} onChange={e => setEduRow(i, { location: e.target.value })} />
                  <input className="input sm:col-span-1" placeholder="Start" value={row.start_year} onChange={e => setEduRow(i, { start_year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
                  <input className="input sm:col-span-1" placeholder="End" value={row.end_year} onChange={e => setEduRow(i, { end_year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
                  <button type="button" onClick={() => removeEduRow(i)} className="sm:col-span-1 text-xs text-red-600 font-semibold">Remove</button>
                </div>
              ))}
              {form.education.length === 0 && <div className="text-xs text-muted">No education added yet.</div>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-medium">Additional details</div>
              <button type="button" onClick={addDetailRow} className="text-xs font-semibold text-primary">+ Add detail</button>
            </div>
            <div className="space-y-2">
              {form.details.map((row, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <input className="input sm:col-span-3" placeholder="Label (e.g. Certifications)" value={row.label} onChange={e => setDetailRow(i, { label: e.target.value })} />
                  <input className="input sm:col-span-8" placeholder="Value" value={row.value} onChange={e => setDetailRow(i, { value: e.target.value })} />
                  <button type="button" onClick={() => removeDetailRow(i)} className="sm:col-span-1 text-xs text-red-600 font-semibold">Remove</button>
                </div>
              ))}
              {form.details.length === 0 && <div className="text-xs text-muted">No additional details added yet.</div>}
            </div>
          </div>

          {mode !== "edit-request" && (
            <div>
              <div className="text-xs font-medium mb-1.5">System access</div>
              <p className="text-xs text-muted -mt-0.5 mb-2">Only admins can edit this once the candidate is approved.</p>

              <div className="rounded-lg border border-border p-3 mb-3">
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Jump login</div>
                <p className="text-xs text-muted -mt-0.5 mb-2">The one login that gets you into Jump — from there you find this candidate's individual systems below.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input className="input" placeholder="Jump login ID (email)" value={form.jump_login_id} onChange={e => set({ jump_login_id: e.target.value })} />
                  <input className="input" placeholder="Jump password" value={form.jump_password} onChange={e => set({ jump_password: e.target.value })} />
                </div>
              </div>

              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-semibold text-muted uppercase tracking-wide">Candidate systems (inside Jump)</div>
                <button type="button" onClick={addSystemRow} className="text-xs font-semibold text-primary">+ Add system</button>
              </div>
              <p className="text-xs text-muted -mt-0.5 mb-2">Each system is found by its System Name + Username, and has its own password.</p>
              <div className="space-y-2">
                {form.system_credentials.map((row, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <input className="input sm:col-span-3" placeholder="System name" value={row.system_name} onChange={e => setSystemRow(i, { system_name: e.target.value })} />
                    <input className="input sm:col-span-3" placeholder="Username" value={row.username} onChange={e => setSystemRow(i, { username: e.target.value })} />
                    <input className="input sm:col-span-2" placeholder="Password" value={row.password} onChange={e => setSystemRow(i, { password: e.target.value })} />
                    <input className="input sm:col-span-3" placeholder="Other details (optional)" value={row.notes} onChange={e => setSystemRow(i, { notes: e.target.value })} />
                    <button type="button" onClick={() => removeSystemRow(i)} className="sm:col-span-1 text-xs text-red-600 font-semibold">Remove</button>
                  </div>
                ))}
                {form.system_credentials.length === 0 && <div className="text-xs text-muted">No candidate systems added yet.</div>}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1 pb-1">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-border text-sm font-semibold text-medium hover:bg-surface">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-40">
              {saving ? "Saving…" : MODE_SUBMIT_LABELS[mode]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
