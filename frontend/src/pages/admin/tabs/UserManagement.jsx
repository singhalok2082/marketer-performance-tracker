import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { PERMISSION_SECTIONS } from "../permissionSections";

const AVATAR_COLORS = ["#4F46E5","#7C3AED","#DB2777","#DC2626","#D97706","#059669","#0891B2","#1D4ED8","#6D28D9","#BE185D","#B45309","#047857","#0E7490","#1E40AF"];

function initials(name = "") {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

// Full-access / limited-access toggle + checkbox grid, reused for new
// admins, promoting an account manager, and editing an existing admin.
function PermissionPicker({ scope, setScope, selected, toggle }) {
  return (
    <div className="space-y-2.5">
      <div className="flex bg-surface-alt rounded-lg p-1 w-fit">
        {[["full", "Full access"], ["limited", "Choose specific sections"]].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setScope(key)}
            className={`h-7 px-3.5 rounded-md text-xs font-semibold transition-colors ${scope === key ? "bg-white text-dark shadow-sm" : "text-muted hover:text-dark"}`}>
            {label}
          </button>
        ))}
      </div>
      {scope === "limited" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-surface-alt rounded-lg p-3">
          {PERMISSION_SECTIONS.map(s => (
            <label key={s.key} className="flex items-center gap-2 text-xs text-medium cursor-pointer">
              <input type="checkbox" checked={selected.includes(s.key)} onChange={() => toggle(s.key)} />
              {s.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UserManagement() {
  const { user: me } = useAuth();
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]     = useState({ name: "", email: "", password: "", role: "account_manager" });
  const [addScope, setAddScope] = useState("full");
  const [addPerms, setAddPerms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState(null);

  // { user, scope, perms } while the promote/edit-access modal is open
  const [accessModal, setAccessModal] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/users")
      .then(r => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleAddPerm = (key) => {
    setAddPerms(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);
  };

  const addUser = async e => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const payload = { ...form };
      if (form.role === "admin") payload.permissions = addScope === "limited" ? addPerms : null;
      await api.post("/users", payload);
      const accessNote = form.role === "admin" ? ` (${addScope === "limited" ? `${addPerms.length} section${addPerms.length === 1 ? "" : "s"}` : "full access"})` : "";
      setMsg({ type: "success", text: `${form.name} added as ${form.role === "admin" ? "an admin" : "an account manager"}${accessNote}. Default password: ${form.password || "ConsultAdd@2024"}` });
      setForm({ name: "", email: "", password: "", role: "account_manager" });
      setAddScope("full"); setAddPerms([]);
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

  const openPromote = (user) => setAccessModal({ user, mode: "promote", scope: "full", perms: [] });
  const openEditAccess = (user) => setAccessModal({
    user, mode: "edit",
    scope: user.permissions === null || user.permissions === undefined ? "full" : "limited",
    perms: user.permissions || [],
  });
  const toggleModalPerm = (key) => setAccessModal(m => ({
    ...m, perms: m.perms.includes(key) ? m.perms.filter(k => k !== key) : [...m.perms, key],
  }));

  const saveAccessModal = async () => {
    const { user, mode, scope, perms } = accessModal;
    const permissions = scope === "limited" ? perms : null;
    try {
      await api.patch(`/users/${user.id}`, mode === "promote" ? { role: "admin", permissions } : { permissions });
      setAccessModal(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update access");
    }
  };

  const demote = async (user) => {
    if (!confirm(`Remove admin access from ${user.name}? They'll become an account manager.`)) return;
    try {
      await api.patch(`/users/${user.id}`, { role: "account_manager" });
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to change role");
    }
  };

  const managers = users.filter(u => u.role === "account_manager");
  const admins   = users.filter(u => u.role === "admin");

  const accessLabel = (u) => {
    if (u.permissions === null || u.permissions === undefined) return "Full access";
    const n = u.permissions.length;
    return n === 0 ? "No sections yet" : `${n} section${n === 1 ? "" : "s"}`;
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
        <div className="text-sm text-muted">{managers.length} account managers · {admins.length} admin{admins.length === 1 ? "" : "s"}</div>
        <button onClick={() => setShowAdd(o => !o)} className="btn-primary text-sm py-1.5 px-4">
          {showAdd ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {/* Add user form */}
      {showAdd && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold">Add New User</h3>
          <form onSubmit={addUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
              <div>
                <label className="block text-xs font-medium mb-1">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input">
                  <option value="account_manager">Account Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {form.role === "admin" && (
              <div>
                <label className="block text-xs font-medium mb-1.5">Admin access — which Admin Panel sections should they see?</label>
                <PermissionPicker scope={addScope} setScope={setAddScope} selected={addPerms} toggle={toggleAddPerm} />
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Adding…" : "Add User"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Admins list */}
      <div className="card overflow-hidden">
        <div className="bg-surface border-b border-border px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
          Admins
        </div>
        {loading ? (
          <div className="text-center py-10 text-muted">Loading…</div>
        ) : admins.length === 0 ? (
          <div className="text-center py-8 text-sm text-subtle">No admins yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {admins.map((u, i) => (
              <li key={u.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                  {initials(u.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    {u.name}
                    {u.id === me?.id && <span className="text-[10px] font-semibold text-muted">(you)</span>}
                  </div>
                  <div className="text-xs text-muted">{u.email}</div>
                </div>
                <span className="badge bg-primary-tint text-primary">{accessLabel(u)}</span>
                <div className="flex items-center gap-2">
                  <span className={`badge ${u.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                  {u.id !== me?.id && (
                    <>
                      <button onClick={() => openEditAccess(u)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border text-medium hover:bg-surface transition-colors">
                        Edit access
                      </button>
                      <button onClick={() => demote(u)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border text-medium hover:bg-surface transition-colors">
                        Remove admin
                      </button>
                    </>
                  )}
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

      {/* Account managers list */}
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
                  <button onClick={() => openPromote(u)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border text-medium hover:bg-surface transition-colors">
                    Make admin
                  </button>
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

      {/* Promote / edit access modal */}
      {accessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAccessModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="text-[15px] font-bold mb-1">
              {accessModal.mode === "promote" ? `Make ${accessModal.user.name} an admin` : `Edit ${accessModal.user.name}'s access`}
            </div>
            <p className="text-xs text-subtle mb-4">Which Admin Panel sections should they see?</p>
            <PermissionPicker
              scope={accessModal.scope}
              setScope={(scope) => setAccessModal(m => ({ ...m, scope }))}
              selected={accessModal.perms}
              toggle={toggleModalPerm}
            />
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setAccessModal(null)} className="text-sm font-semibold px-3.5 py-2 rounded-lg border border-border text-medium hover:bg-surface transition-colors">Cancel</button>
              <button onClick={saveAccessModal} className="btn-primary text-sm">
                {accessModal.mode === "promote" ? "Make admin" : "Save access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
