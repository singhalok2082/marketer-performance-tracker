import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/client";

const TODAY = new Date().toISOString().slice(0, 10);

export default function DailyNotes({ user }) {
  const isAdmin = user?.role === "admin";
  const [notes, setNotes] = useState([]);
  const [managers, setManagers] = useState([]);
  const [managerFilter, setManagerFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [todayText, setTodayText] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = isAdmin && managerFilter !== "all" ? { user_id: managerFilter } : {};
    api.get("/daily-notes", { params })
      .then(r => {
        setNotes(r.data);
        if (!isAdmin) {
          const mine = r.data.find(n => n.note_date === TODAY);
          setTodayText(mine?.challenge_text || "");
        }
      })
      .catch(() => setMsg({ type: "error", text: "Failed to load notes" }))
      .finally(() => setLoading(false));
  }, [isAdmin, managerFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (isAdmin) api.get("/users/public").then(r => setManagers(r.data)).catch(() => {});
  }, [isAdmin]);

  const saveToday = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await api.put("/daily-notes", { note_date: TODAY, challenge_text: todayText });
      setMsg({ type: "success", text: "Today's note saved." });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to save" });
    } finally {
      setSaving(false);
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

      {!isAdmin && (
        <div className="card p-5">
          <label className="block text-sm font-semibold mb-2">What's blocking you today?</label>
          <textarea rows={3} value={todayText} onChange={e => setTodayText(e.target.value)}
            placeholder="Any challenge you're facing today…" className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3" />
          <div className="flex justify-end">
            <button onClick={saveToday} disabled={saving} className="btn-primary disabled:opacity-40">
              {saving ? "Saving…" : "Save today's note"}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted">{notes.length} note{notes.length === 1 ? "" : "s"}</div>
        {isAdmin && (
          <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-white px-3 text-sm">
            <option value="all">All managers</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-muted">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-10 text-muted">No notes yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {notes.filter(n => n.challenge_text).map(n => (
              <li key={n.id} className="px-5 py-3 hover:bg-surface transition-colors">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-xs font-semibold text-muted">{n.note_date}{isAdmin && n.user_name ? ` · ${n.user_name}` : ""}</span>
                </div>
                <div className="text-sm text-dark">{n.challenge_text}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
