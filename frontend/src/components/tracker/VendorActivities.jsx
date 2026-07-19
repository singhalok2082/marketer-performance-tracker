import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/client";

const TYPES = [
  { key: "cold_email", label: "Cold Emails" },
  { key: "vendor_call", label: "Vendor Calls" },
  { key: "tech_screening", label: "Tech Screenings" },
  { key: "interview", label: "Interviews" },
  { key: "offer", label: "Offers" },
];

const RICH_TYPES = ["tech_screening", "interview", "offer"];

const emptyForm = {
  vendor_name: "", vendor_company: "", client_name: "", candidate_name: "",
  employment_type: "", job_title: "", jd_text: "", rate_usd: "",
  duration_minutes: "", activity_date: "", notes: "",
};

export default function VendorActivities({ user }) {
  const isAdmin = user?.role === "admin";
  const [activeType, setActiveType] = useState("cold_email");
  const [rows, setRows] = useState([]);
  const [managers, setManagers] = useState([]);
  const [managerFilter, setManagerFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const isRich = RICH_TYPES.includes(activeType);

  const load = useCallback(() => {
    setLoading(true);
    const params = { type: activeType };
    if (isAdmin && managerFilter !== "all") params.user_id = managerFilter;
    api.get("/vendor-activities", { params })
      .then(r => setRows(r.data))
      .catch(() => setMsg({ type: "error", text: "Failed to load activities" }))
      .finally(() => setLoading(false));
  }, [isAdmin, managerFilter, activeType]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (isAdmin) api.get("/users/public").then(r => setManagers(r.data)).catch(() => {});
  }, [isAdmin]);

  const startAdd = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const startEdit = (r) => {
    setForm({
      vendor_name: r.vendor_name || "", vendor_company: r.vendor_company || "",
      client_name: r.client_name || "", candidate_name: r.candidate_name || "",
      employment_type: r.employment_type || "", job_title: r.job_title || "",
      jd_text: r.jd_text || "", rate_usd: r.rate_usd != null ? String(r.rate_usd) : "",
      duration_minutes: r.duration_minutes != null ? String(r.duration_minutes) : "",
      activity_date: r.activity_date || "", notes: r.notes || "",
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        ...form,
        activity_type: activeType,
        rate_usd: form.rate_usd === "" ? null : Number(form.rate_usd),
        duration_minutes: form.duration_minutes === "" ? null : Number(form.duration_minutes),
      };
      if (editingId) await api.patch(`/vendor-activities/${editingId}`, payload);
      else await api.post("/vendor-activities", payload);
      setMsg({ type: "success", text: editingId ? "Activity updated." : "Activity logged." });
      setShowForm(false);
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    if (!confirm("Remove this activity entry?")) return;
    try {
      await api.delete(`/vendor-activities/${r.id}`);
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

      <div className="flex items-center gap-2 flex-wrap">
        {TYPES.map(t => (
          <button key={t.key} onClick={() => { setActiveType(t.key); setShowForm(false); }}
            className={`h-9 px-4 rounded-lg text-sm font-semibold border ${activeType === t.key ? "bg-primary text-white border-primary" : "bg-white text-medium border-border"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted">{rows.length} entr{rows.length === 1 ? "y" : "ies"}</div>
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
            {showForm ? "Cancel" : `+ Log ${TYPES.find(t => t.key === activeType)?.label.replace(/s$/, "")}`}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isRich && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">Vendor name</label>
                <input value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Vendor company</label>
                <input value={form.vendor_company} onChange={e => setForm(f => ({ ...f, vendor_company: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Client name</label>
                <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Candidate name</label>
                <input value={form.candidate_name} onChange={e => setForm(f => ({ ...f, candidate_name: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">C2C or W2</label>
                <select value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm">
                  <option value="">Select…</option>
                  <option value="C2C">C2C</option>
                  <option value="W2">W2</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Job title</label>
                <input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Rate ($)</label>
                <input type="number" min="0" step="0.01" value={form.rate_usd} onChange={e => setForm(f => ({ ...f, rate_usd: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Date</label>
                <input type="date" value={form.activity_date} onChange={e => setForm(f => ({ ...f, activity_date: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Job description</label>
                <textarea rows={3} value={form.jd_text} onChange={e => setForm(f => ({ ...f, jd_text: e.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
              </div>
            </>
          )}

          {!isRich && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">Vendor company</label>
                <input value={form.vendor_company} onChange={e => setForm(f => ({ ...f, vendor_company: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
              </div>
              {activeType === "vendor_call" && (
                <div>
                  <label className="block text-xs font-medium mb-1">Duration (minutes)</label>
                  <input type="number" min="0" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1">Date</label>
                <input type="date" value={form.activity_date} onChange={e => setForm(f => ({ ...f, activity_date: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
              </div>
            </>
          )}

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold disabled:opacity-40">
              {saving ? "Saving…" : editingId ? "Save changes" : "Log entry"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-muted">Nothing logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface text-left">
                  {isAdmin && <th className="px-4 py-2.5 font-semibold text-muted">Manager</th>}
                  <th className="px-4 py-2.5 font-semibold text-muted">Date</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Vendor</th>
                  {isRich && <th className="px-4 py-2.5 font-semibold text-muted">Candidate</th>}
                  {isRich && <th className="px-4 py-2.5 font-semibold text-muted">Job title</th>}
                  {isRich && <th className="px-4 py-2.5 font-semibold text-muted text-right">Rate</th>}
                  {activeType === "vendor_call" && <th className="px-4 py-2.5 font-semibold text-muted text-right">Duration</th>}
                  <th className="px-4 py-2.5 font-semibold text-muted">Notes</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    {isAdmin && <td className="px-4 py-2.5">{r.user_name || "—"}</td>}
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">
                      {r.activity_date}{r.imported_placeholder && <span className="ml-1.5 text-xs text-amber-600">(imported)</span>}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{r.vendor_company || r.vendor_name || "—"}</td>
                    {isRich && <td className="px-4 py-2.5 text-muted">{r.candidate_name || "—"}</td>}
                    {isRich && <td className="px-4 py-2.5 text-muted">{r.job_title || "—"}</td>}
                    {isRich && <td className="px-4 py-2.5 text-right">{r.rate_usd != null ? `$${r.rate_usd}` : "—"}</td>}
                    {activeType === "vendor_call" && <td className="px-4 py-2.5 text-right">{r.duration_minutes != null ? `${r.duration_minutes} min` : "—"}</td>}
                    <td className="px-4 py-2.5 text-muted truncate max-w-[200px]">{r.notes || "—"}</td>
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
