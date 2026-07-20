import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/client";

export default function Resumes({ user }) {
  const isAdmin = user?.role === "admin";
  const [resumes, setResumes] = useState([]);
  const [managers, setManagers] = useState([]);
  const [managerFilter, setManagerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [techStack, setTechStack] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [viewer, setViewer] = useState(null); // { url, file_type, file_name, title }

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (isAdmin && managerFilter !== "all") params.user_id = managerFilter;
    if (statusFilter !== "all") params.is_active = statusFilter === "active";
    api.get("/resumes", { params })
      .then(r => setResumes(r.data))
      .catch(() => setMsg({ type: "error", text: "Failed to load resumes" }))
      .finally(() => setLoading(false));
  }, [isAdmin, managerFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (isAdmin) api.get("/users/public").then(r => setManagers(r.data)).catch(() => {});
  }, [isAdmin]);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { setMsg({ type: "error", text: "Choose a PDF, DOC, or DOCX file" }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("tech_stack", techStack);
      formData.append("file", file);
      await api.post("/resumes", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg({ type: "success", text: "Resume uploaded." });
      setTitle(""); setTechStack(""); setFile(null); setShowForm(false);
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to upload" });
    } finally {
      setSaving(false);
    }
  };

  const view = async (r) => {
    try {
      const { data } = await api.get(`/resumes/${r.id}/url`);
      setViewer({ ...data, title: r.title });
    } catch {
      alert("Failed to open resume");
    }
  };

  const toggleActive = async (r) => {
    try {
      await api.patch(`/resumes/${r.id}`, { is_active: !r.is_active });
      load();
    } catch {
      alert("Failed to update");
    }
  };

  const remove = async (r) => {
    if (!confirm(`Delete resume "${r.title}" (${r.file_name})? This cannot be undone.`)) return;
    try {
      await api.delete(`/resumes/${r.id}`);
      load();
    } catch {
      alert("Failed to delete");
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
        <div className="text-sm text-muted">{resumes.length} resume{resumes.length === 1 ? "" : "s"}</div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-white px-3 text-sm">
              <option value="all">All managers</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-white px-3 text-sm">
            <option value="active">Current</option>
            <option value="inactive">Old / archived</option>
            <option value="all">All</option>
          </select>
          <button onClick={() => setShowForm(o => !o)}
            className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold">
            {showForm ? "Cancel" : "+ Upload Resume"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Title / designation *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Python Engineer, DevOps Engineer…" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Tech stack *</label>
            <input required value={techStack} onChange={e => setTechStack(e.target.value)}
              placeholder="Java, React, DevOps…" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">File (PDF, DOC, DOCX) *</label>
            <input required type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold disabled:opacity-40">
              {saving ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-muted">Loading…</div>
        ) : resumes.length === 0 ? (
          <div className="text-center py-10 text-muted">No resumes uploaded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface text-left">
                  {isAdmin && <th className="px-4 py-2.5 font-semibold text-muted">Manager</th>}
                  <th className="px-4 py-2.5 font-semibold text-muted">Title</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Tech stack</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">File</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Uploaded</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resumes.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    {isAdmin && <td className="px-4 py-2.5">{r.user_name || "—"}</td>}
                    <td className="px-4 py-2.5 font-medium">{r.title}</td>
                    <td className="px-4 py-2.5 text-muted">{r.tech_stack || "—"}</td>
                    <td className="px-4 py-2.5 text-muted truncate max-w-[220px]">{r.file_name} <span className="uppercase text-xs">({r.file_type})</span></td>
                    <td className="px-4 py-2.5 text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {r.is_active ? "Current" : "Old"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => view(r)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-surface mr-1.5">Quick view</button>
                      <button onClick={() => toggleActive(r)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-surface mr-1.5">
                        {r.is_active ? "Archive" : "Restore"}
                      </button>
                      <button onClick={() => remove(r)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={() => setViewer(null)}>
          <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="font-semibold text-sm">{viewer.title} — {viewer.file_name}</div>
              <button onClick={() => setViewer(null)} className="text-muted hover:text-dark text-xl leading-none">×</button>
            </div>
            <iframe
              title="Resume preview"
              className="flex-1 w-full"
              src={viewer.file_type === "pdf" ? viewer.url : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewer.url)}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
