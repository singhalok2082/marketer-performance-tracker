import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/client";

const ACTIONS = ["Created", "Updated", "Enhanced"];
const emptyForm = { designation: "", location: "", action: "Created", jd_date: "", jd_text: "", notes: "" };

export default function JobDescriptions({ user }) {
  const isAdmin = user?.role === "admin";
  const [rows, setRows] = useState([]);
  const [managers, setManagers] = useState([]);
  const [managerFilter, setManagerFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [jdModal, setJdModal] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = isAdmin && managerFilter !== "all" ? { user_id: managerFilter } : {};
    api.get("/job-descriptions", { params })
      .then(r => setRows(r.data))
      .catch(() => setMsg({ type: "error", text: "Failed to load job descriptions" }))
      .finally(() => setLoading(false));
  }, [isAdmin, managerFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (isAdmin) api.get("/users/public").then(r => setManagers(r.data)).catch(() => {});
  }, [isAdmin]);

  const startAdd = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const startEdit = (r) => {
    setForm({
      designation: r.designation || "", location: r.location || "",
      action: r.action || "Created", jd_date: r.jd_date || "",
      jd_text: r.jd_text || "", notes: r.notes || "",
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      if (editingId) await api.patch(`/job-descriptions/${editingId}`, form);
      else await api.post("/job-descriptions", form);
      setMsg({ type: "success", text: editingId ? "Job description updated." : "Job description logged." });
      setShowForm(false);
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    if (!confirm(`Remove this job description entry (${r.designation})?`)) return;
    try {
      await api.delete(`/job-descriptions/${r.id}`);
      load();
    } catch {
      alert("Failed to remove");
    }
  };

  return (
    <div className="space-y-5">
      {msg && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${msg.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted">{rows.length} job description{rows.length === 1 ? "" : "s"}</div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-white px-3 text-sm">
              <option value="all">All managers</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <button onClick={showForm ? () => setShowForm(false) : startAdd}
            className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold">
            {showForm ? "Cancel" : "+ Log Job Description"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Designation *</label>
            <input required value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
              placeholder="Java Developer, DevOps Engineer…" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Location</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="Remote, Austin TX…" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Action</label>
            <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm">
              {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Date</label>
            <input type="date" value={form.jd_date} onChange={e => setForm(f => ({ ...f, jd_date: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">JD text</label>
            <textarea rows={4} value={form.jd_text} onChange={e => setForm(f => ({ ...f, jd_text: e.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold disabled:opacity-40">
              {saving ? "Saving…" : editingId ? "Save changes" : "Log job description"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-muted">No job descriptions logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface text-left">
                  {isAdmin && <th className="px-4 py-2.5 font-semibold text-muted">Manager</th>}
                  <th className="px-4 py-2.5 font-semibold text-muted">Date</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Designation</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Location</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Action</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    {isAdmin && <td className="px-4 py-2.5">{r.user_name || "—"}</td>}
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">{r.jd_date}</td>
                    <td className="px-4 py-2.5 font-medium">{r.designation}</td>
                    <td className="px-4 py-2.5 text-muted">{r.location || "—"}</td>
                    <td className="px-4 py-2.5">{r.action}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {r.jd_text && <button onClick={() => setJdModal(r)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-surface mr-1.5">JD</button>}
                      <button onClick={() => startEdit(r)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-surface mr-1.5">Edit</button>
                      <button onClick={() => remove(r)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {jdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={() => setJdModal(null)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div>
                <div className="font-semibold text-sm">{jdModal.designation}</div>
                <div className="text-xs text-muted">{jdModal.location || "—"} · {jdModal.jd_date}</div>
              </div>
              <button onClick={() => setJdModal(null)} className="text-muted hover:text-dark text-xl leading-none">×</button>
            </div>
            <div className="p-5 overflow-y-auto text-sm whitespace-pre-wrap">{jdModal.jd_text}</div>
          </div>
        </div>
      )}
    </div>
  );
}
