import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/client";

const CHANNELS = ["LinkedIn", "Email", "Both"];
const EMP_TYPES = ["C2C", "W2", "Full Time"];
const emptyForm = { channel: "LinkedIn", employment_type: "", vendor_company: "", job_role: "", contacted_date: "", notes: "" };

export default function RecruiterOutreach({ user }) {
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

  const load = useCallback(() => {
    setLoading(true);
    const params = isAdmin && managerFilter !== "all" ? { user_id: managerFilter } : {};
    api.get("/outreach", { params })
      .then(r => setRows(r.data))
      .catch(() => setMsg({ type: "error", text: "Failed to load recruiter outreach" }))
      .finally(() => setLoading(false));
  }, [isAdmin, managerFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (isAdmin) api.get("/users/public").then(r => setManagers(r.data)).catch(() => {});
  }, [isAdmin]);

  const startAdd = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const startEdit = (r) => {
    setForm({
      channel: r.channel || "LinkedIn", employment_type: r.employment_type || "",
      vendor_company: r.vendor_company || "", job_role: r.job_role || "",
      contacted_date: r.contacted_date || "", notes: r.notes || "",
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      if (editingId) await api.patch(`/outreach/${editingId}`, form);
      else await api.post("/outreach", form);
      setMsg({ type: "success", text: editingId ? "Outreach updated." : "Outreach logged." });
      setShowForm(false);
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    if (!confirm(`Remove this outreach entry (${r.vendor_company || "unnamed vendor"})?`)) return;
    try {
      await api.delete(`/outreach/${r.id}`);
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
        <div className="text-sm text-muted">{rows.length} outreach entr{rows.length === 1 ? "y" : "ies"}</div>
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
            {showForm ? "Cancel" : "+ Log Outreach"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Channel</label>
            <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm">
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Employment type</label>
            <select value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm">
              <option value="">Select…</option>
              {EMP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Vendor company</label>
            <input value={form.vendor_company} onChange={e => setForm(f => ({ ...f, vendor_company: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Job role</label>
            <input value={form.job_role} onChange={e => setForm(f => ({ ...f, job_role: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Date contacted</label>
            <input type="date" value={form.contacted_date} onChange={e => setForm(f => ({ ...f, contacted_date: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold disabled:opacity-40">
              {saving ? "Saving…" : editingId ? "Save changes" : "Log outreach"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-muted">No recruiter outreach logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface text-left">
                  {isAdmin && <th className="px-4 py-2.5 font-semibold text-muted">Manager</th>}
                  <th className="px-4 py-2.5 font-semibold text-muted">Date</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Channel</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Vendor company</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Job role</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Type</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    {isAdmin && <td className="px-4 py-2.5">{r.user_name || "—"}</td>}
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">{r.contacted_date}</td>
                    <td className="px-4 py-2.5">{r.channel || "—"}</td>
                    <td className="px-4 py-2.5 font-medium">{r.vendor_company || "—"}</td>
                    <td className="px-4 py-2.5 text-muted">{r.job_role || "—"}</td>
                    <td className="px-4 py-2.5 text-muted">{r.employment_type || "—"}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
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
    </div>
  );
}
