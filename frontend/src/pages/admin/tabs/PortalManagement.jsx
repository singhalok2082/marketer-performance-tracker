import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/client";

export default function PortalManagement() {
  const [portals, setPortals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name: "", url: "" });
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/portals")
      .then(r => setPortals(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const addPortal = async e => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.post("/portals", form);
      setMsg({ type: "success", text: `Portal "${form.name}" added.` });
      setForm({ name: "", url: "" });
      setShowAdd(false);
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (portal) => {
    try {
      await api.patch(`/portals/${portal.id}`, { is_active: !portal.is_active });
      load();
    } catch {
      alert("Failed to update portal");
    }
  };

  const remove = async (portal) => {
    if (!confirm(`Remove portal "${portal.name}"?`)) return;
    try {
      await api.delete(`/portals/${portal.id}`);
      load();
    } catch {
      alert("Failed");
    }
  };

  return (
    <div className="space-y-5">
      {msg && (
        <div className={`text-sm rounded-lg px-4 py-3 ${msg.type === "error" ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">{portals.length} portals configured</div>
        <button onClick={() => setShowAdd(o => !o)} className="btn-primary text-sm py-1.5 px-4">
          {showAdd ? "Cancel" : "+ Add Portal"}
        </button>
      </div>

      {showAdd && (
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Add New Portal</h3>
          <form onSubmit={addPortal} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Portal name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" required placeholder="LinkedIn, Naukri…" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">URL (optional)</label>
              <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="input" placeholder="https://…" />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Adding…" : "Add Portal"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-muted">Loading…</div>
        ) : portals.length === 0 ? (
          <div className="text-center py-10 text-muted">No portals yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {portals.map(p => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{p.name}</div>
                  {p.url && <div className="text-xs text-muted truncate">{p.url}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                  <button onClick={() => toggle(p)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-surface transition-colors">
                    {p.is_active ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => remove(p)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
