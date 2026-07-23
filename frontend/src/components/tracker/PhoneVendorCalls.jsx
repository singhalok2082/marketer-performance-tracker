import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../api/client";
import ResumePicker from "./shared/ResumePicker";
import ResumePreviewModal, { fetchResumeViewer } from "./shared/ResumePreviewModal";

const emptyForm = { phone_number: "", vendor_name: "", candidate_name: "", resume_id: "" };

export default function PhoneVendorCalls({ user }) {
  const isAdmin = user?.role === "admin";
  const [entries, setEntries] = useState([]);
  const [managers, setManagers] = useState([]);
  const [managerFilter, setManagerFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingOwnerId, setEditingOwnerId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [viewer, setViewer] = useState(null);
  const resumePickerRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = isAdmin && managerFilter !== "all" ? { user_id: managerFilter } : {};
    api.get("/phone-numbers/vendor-calls", { params })
      .then(r => setEntries(r.data))
      .catch(() => setMsg({ type: "error", text: "Failed to load vendor calls" }))
      .finally(() => setLoading(false));
  }, [isAdmin, managerFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (isAdmin) api.get("/users/public").then(r => setManagers(r.data)).catch(() => {});
  }, [isAdmin]);

  const startAdd = () => { setForm(emptyForm); setEditingId(null); setEditingOwnerId(null); setShowForm(true); };
  const startEdit = (e) => {
    setForm({ phone_number: e.phone_number, vendor_name: e.vendor_name, candidate_name: e.candidate_name, resume_id: e.resume_id || "" });
    setEditingId(e.id);
    setEditingOwnerId(e.user_id);
    setShowForm(true);
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const resume_id = await resumePickerRef.current.resolve();
      const payload = { ...form, resume_id };
      if (editingId) await api.patch(`/phone-numbers/vendor-calls/${editingId}`, payload);
      else await api.post("/phone-numbers/vendor-calls", payload);
      setMsg({ type: "success", text: editingId ? "Entry updated." : "Entry added." });
      setShowForm(false);
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || err.message || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (e) => {
    if (!confirm(`Remove this entry for ${e.phone_number}?`)) return;
    try {
      await api.delete(`/phone-numbers/vendor-calls/${e.id}`);
      load();
    } catch {
      alert("Failed to remove");
    }
  };

  const preview = async (e) => {
    if (!e.resume_id) return;
    try {
      setViewer(await fetchResumeViewer(e.resume_id, e.resume_title || "Resume"));
    } catch {
      alert("Failed to open resume");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold mb-1">Submission of the phone number on prime vendors</h3>
        <p className="text-sm text-muted -mb-1">
          Track which phone number you used to take a call with a vendor, for which candidate, and with which resume.
        </p>
      </div>

      {msg && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${msg.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted">{entries.length} entr{entries.length === 1 ? "y" : "ies"}</div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-white px-3 text-sm">
              <option value="all">All managers</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <button onClick={showForm ? () => setShowForm(false) : startAdd} className="btn-primary">
            {showForm ? "Cancel" : "+ Add Vendor Call"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Phone number *</label>
            <input required value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
              placeholder="+1 (555) 123-4567" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Vendor / company *</label>
            <input required value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))}
              placeholder="Acme Staffing" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">Candidate *</label>
            <input required value={form.candidate_name} onChange={e => setForm(f => ({ ...f, candidate_name: e.target.value }))}
              placeholder="Candidate name" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <ResumePicker key={editingId || "new"} ref={resumePickerRef} user={user} ownerId={editingOwnerId} initialResumeId={form.resume_id} />
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-40">
              {saving ? "Saving…" : editingId ? "Save changes" : "Add entry"}
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-muted">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 text-muted">No vendor calls logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-alt text-left">
                  {isAdmin && <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide">Manager</th>}
                  <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide">Phone number</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide">Vendor</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide">Candidate</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide">Resume</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-t border-border hover:bg-surface transition-colors">
                    {isAdmin && <td className="px-4 py-2.5">{e.user_name || "—"}</td>}
                    <td className="px-4 py-2.5 font-medium">{e.phone_number}</td>
                    <td className="px-4 py-2.5 text-muted">{e.vendor_name}</td>
                    <td className="px-4 py-2.5 text-muted">{e.candidate_name}</td>
                    <td className="px-4 py-2.5 text-muted">{e.resume_title || "—"}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => preview(e)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-surface mr-1.5">Preview</button>
                      <button onClick={() => startEdit(e)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-surface mr-1.5">Edit</button>
                      <button onClick={() => remove(e)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ResumePreviewModal viewer={viewer} onClose={() => setViewer(null)} />
    </div>
  );
}
