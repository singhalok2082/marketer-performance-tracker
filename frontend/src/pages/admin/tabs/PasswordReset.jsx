import React, { useState, useEffect } from "react";
import api from "../../../api/client";

function initials(name = "") {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function PasswordReset() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [newPw, setNewPw]       = useState("");
  const [result, setResult]     = useState(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    api.get("/users")
      .then(r => setUsers(r.data.filter(u => u.is_active)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleReset = async e => {
    e.preventDefault();
    if (!selected) return;
    setResetting(true);
    setResult(null);
    try {
      const res = await api.post(`/users/${selected.id}/reset-password`, { newPassword: newPw || undefined });
      setResult({ type: "success", text: res.data.message });
      setNewPw("");
    } catch (err) {
      setResult({ type: "error", text: err.response?.data?.error || "Failed to reset password" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-muted">Select a user and set a new temporary password. Their active sessions will be revoked and they must change their password on next login.</p>

      {result && (
        <div className={`text-sm rounded-lg px-4 py-3 ${result.type === "error" ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`}>
          {result.text}
          <button onClick={() => setResult(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      <div className="card p-5">
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select User *</label>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {loading ? (
                <div className="text-sm text-muted">Loading users…</div>
              ) : users.map(u => (
                <button type="button" key={u.id}
                  onClick={() => setSelected(u)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-colors text-left ${selected?.id === u.id ? "border-primary bg-indigo-50" : "border-border hover:bg-surface"}`}>
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {initials(u.name)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{u.name}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                  </div>
                  {u.role === "admin" && <span className="ml-auto badge bg-purple-100 text-purple-700">Admin</span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">New password <span className="text-muted font-normal">(leave blank for default: ConsultAdd@2024)</span></label>
            <input
              type="text" value={newPw} onChange={e => setNewPw(e.target.value)}
              className="input" placeholder="ConsultAdd@2024" minLength={8}
              disabled={!selected}
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={!selected || resetting}>
            {resetting ? "Resetting…" : `Reset Password${selected ? ` for ${selected.name.split(" ")[0]}` : ""}`}
          </button>
        </form>
      </div>
    </div>
  );
}
