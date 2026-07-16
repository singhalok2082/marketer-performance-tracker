import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/client";

const emptyForm = { linkedin_url: "", title: "", location: "", connections: "" };

export default function LinkedInProfiles({ user }) {
  const isAdmin = user?.role === "admin";
  const [profiles, setProfiles] = useState([]);
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
    api.get("/linkedin", { params })
      .then(r => setProfiles(r.data))
      .catch(() => setMsg({ type: "error", text: "Failed to load LinkedIn profiles" }))
      .finally(() => setLoading(false));
  }, [isAdmin, managerFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (isAdmin) api.get("/users/public").then(r => setManagers(r.data)).catch(() => {});
  }, [isAdmin]);

  const startAdd = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const startEdit = (p) => {
    setForm({ linkedin_url: p.linkedin_url, title: p.title, location: p.location || "", connections: String(p.connections ?? "") });
    setEditingId(p.id);
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const payload = { ...form, connections: form.connections === "" ? 0 : Number(form.connections) };
      if (editingId) await api.patch(`/linkedin/${editingId}`, payload);
      else await api.post("/linkedin", payload);
      setMsg({ type: "success", text: editingId ? "Profile updated." : "Profile added." });
      setShowForm(false);
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!confirm(`Remove this LinkedIn profile (${p.title})?`)) return;
    try {
      await api.delete(`/linkedin/${p.id}`);
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
        <div className="text-sm text-muted">{profiles.length} LinkedIn profile{profiles.length === 1 ? "" : "s"}</div>
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
            {showForm ? "Cancel" : "+ Add LinkedIn Profile"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">LinkedIn URL *</label>
            <input required type="url" value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
              placeholder="https://linkedin.com/in/…" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Title / Tech stack *</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Full Stack AI/ML Developer" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Location</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="Austin, TX" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Connections</label>
            <input type="number" min="0" value={form.connections} onChange={e => setForm(f => ({ ...f, connections: e.target.value }))}
              className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold disabled:opacity-40">
              {saving ? "Saving…" : editingId ? "Save changes" : "Add profile"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-muted">Loading…</div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-10 text-muted">No LinkedIn profiles logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface text-left">
                  {isAdmin && <th className="px-4 py-2.5 font-semibold text-muted">Manager</th>}
                  <th className="px-4 py-2.5 font-semibold text-muted">Title</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">LinkedIn URL</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Location</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-right">Connections</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map(p => (
                  <tr key={p.id} className="border-t border-border">
                    {isAdmin && <td className="px-4 py-2.5">{p.user_name || "—"}</td>}
                    <td className="px-4 py-2.5 font-medium">{p.title}</td>
                    <td className="px-4 py-2.5 truncate max-w-[240px]">
                      <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{p.linkedin_url}</a>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{p.location || "—"}</td>
                    <td className="px-4 py-2.5 text-right">{p.connections?.toLocaleString() ?? 0}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => startEdit(p)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-surface mr-1.5">Edit</button>
                      <button onClick={() => remove(p)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Remove</button>
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
