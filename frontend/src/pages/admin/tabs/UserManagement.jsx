import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/client";

const AVATAR_COLORS = ["#4F46E5","#7C3AED","#DB2777","#DC2626","#D97706","#059669","#0891B2","#1D4ED8","#6D28D9","#BE185D","#B45309","#047857","#0E7490","#1E40AF"];

function initials(name = "") {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function UserManagement() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]     = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/users")
      .then(r => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const addUser = async e => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.post("/users", form);
      setMsg({ type: "success", text: `${form.name} added successfully. Default password: ${form.password || "ConsultAdd@2024"}` });
      setForm({ name: "", email: "", password: "" });
      setShowAdd(false);
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to add user" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    const action = user.is_active ? "deactivate" : "reactivate";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.name}?`)) return;
    try {
      if (user.is_active) {
        await api.delete(`/users/${user.id}`);
      } else {
        await api.patch(`/users/${user.id}`, { is_active: true });
      }
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed");
    }
  };

  const managers = users.filter(u => u.role === "account_manager");
  const admins   = users.filter(u => u.role === "admin");

  return (
    <div className="space-y-5">
      {msg && (
        <div className={`text-sm rounded-lg px-4 py-3 ${msg.type === "error" ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">{managers.length} account managers · {admins.length} admin</div>
        <button onClick={() => setShowAdd(o => !o)} className="btn-primary text-sm py-1.5 px-4">
          {showAdd ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {/* Add user form */}
      {showAdd && (
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Add New Account Manager</h3>
          <form onSubmit={addUser} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Full name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" required placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" required placeholder="jane@consultadd.com" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Password (optional)</label>
              <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input" placeholder="ConsultAdd@2024 (default)" />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Adding…" : "Add Account Manager"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Users list */}
      <div className="card overflow-hidden">
        <div className="bg-surface border-b border-border px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
          Account Managers
        </div>
        {loading ? (
          <div className="text-center py-10 text-muted">Loading…</div>
        ) : (
          <ul className="divide-y divide-border">
            {managers.map((u, i) => (
              <li key={u.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                  {initials(u.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{u.name}</div>
                  <div className="text-xs text-muted">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {u.must_change_password && (
                    <span className="badge bg-amber-100 text-amber-700">Must change pw</span>
                  )}
                  <span className={`badge ${u.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                  <button onClick={() => toggleActive(u)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${u.is_active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}>
                    {u.is_active ? "Deactivate" : "Reactivate"}
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
