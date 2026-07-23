import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/client";
import { driveEmbedUrl } from "../../utils/drivePreview";

export default function Resumes({ user }) {
  const isAdmin = user?.role === "admin";
  const [resumes, setResumes] = useState([]);
  const [managers, setManagers] = useState([]);
  const [managerFilter, setManagerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState("file"); // "file" | "link"
  const [title, setTitle] = useState("");
  const [techStack, setTechStack] = useState("");
  const [file, setFile] = useState(null);
  const [driveLink, setDriveLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [viewer, setViewer] = useState(null); // { url, file_type, file_name, title, is_drive_link }

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

  const resetForm = () => { setTitle(""); setTechStack(""); setFile(null); setDriveLink(""); setMode("file"); };

  const submit = async (e) => {
    e.preventDefault();
    if (mode === "file" && !file) { setMsg({ type: "error", text: "Choose a PDF, DOC, or DOCX file" }); return; }
    if (mode === "link" && !driveLink.trim()) { setMsg({ type: "error", text: "Paste a Google Drive link" }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("tech_stack", techStack);
      if (mode === "file") formData.append("file", file);
      else formData.append("google_drive_link", driveLink.trim());
      await api.post("/resumes", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg({ type: "success", text: "Resume added." });
      resetForm(); setShowForm(false);
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to save" });
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

  const previewLocalFile = () => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Only PDF files can be previewed before saving — DOC/DOCX preview will be available right after you save.");
      return;
    }
    setViewer({ url: URL.createObjectURL(file), file_type: "pdf", file_name: file.name, title, is_drive_link: false });
  };

  const previewLocalDriveLink = () => {
    if (!driveLink.trim()) return;
    setViewer({ url: driveLink.trim(), file_name: "Google Drive preview", title, is_drive_link: true });
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
    if (!confirm(`Delete resume "${r.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/resumes/${r.id}`);
      load();
    } catch {
      alert("Failed to delete");
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted -mb-1">
        Your resume library — every resume you've ever built, current and archived. Upload one today and it lands here immediately as part of your asset library.
      </p>

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
          <button onClick={() => { setShowForm(o => !o); if (showForm) resetForm(); }}
            className="btn-primary">
            {showForm ? "Cancel" : "+ Add Resume"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 flex gap-2">
            <button type="button" onClick={() => setMode("file")}
              className={`h-8 px-3 rounded-lg text-xs font-semibold border ${mode === "file" ? "bg-primary text-white border-primary" : "border-border text-muted"}`}>
              Upload PDF / DOC
            </button>
            <button type="button" onClick={() => setMode("link")}
              className={`h-8 px-3 rounded-lg text-xs font-semibold border ${mode === "link" ? "bg-primary text-white border-primary" : "border-border text-muted"}`}>
              Google Drive link
            </button>
          </div>
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
          {mode === "file" ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">File (PDF, DOC, DOCX) *</label>
              <div className="flex gap-2 items-center">
                <input required type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)}
                  className="flex-1 text-sm" />
                {file && (
                  <button type="button" onClick={previewLocalFile}
                    className="h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-surface flex-shrink-0">Preview</button>
                )}
              </div>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Google Drive link *</label>
              <div className="flex gap-2">
                <input required type="url" value={driveLink} onChange={e => setDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/file/d/…" className="flex-1 h-9 rounded-lg border border-border px-3 text-sm" />
                {driveLink.trim() && (
                  <button type="button" onClick={previewLocalDriveLink}
                    className="h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-surface flex-shrink-0">Preview</button>
                )}
              </div>
              <p className="text-xs text-muted mt-1">Make sure sharing is set to "Anyone with the link" so it can be previewed in the portal.</p>
            </div>
          )}
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-40">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-muted">Loading…</div>
        ) : resumes.length === 0 ? (
          <div className="text-center py-10 text-muted">No resumes added yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-alt text-left">
                  {isAdmin && <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide">Manager</th>}
                  <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide">Title</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide">Tech stack</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide">Source</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide">Added</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resumes.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-surface transition-colors">
                    {isAdmin && <td className="px-4 py-2.5">{r.user_name || "—"}</td>}
                    <td className="px-4 py-2.5 font-medium">{r.title}</td>
                    <td className="px-4 py-2.5 text-muted">{r.tech_stack || "—"}</td>
                    <td className="px-4 py-2.5 text-muted truncate max-w-[220px]">
                      {r.google_drive_link
                        ? <a href={r.google_drive_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">🔗 Google Drive</a>
                        : <>{r.file_name} <span className="uppercase text-xs">({r.file_type})</span></>}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {r.is_active ? "Current" : "Old"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => view(r)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-surface mr-1.5">Preview</button>
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

      {viewer && (() => {
        const embedSrc = viewer.is_drive_link
          ? driveEmbedUrl(viewer.url)
          : (viewer.file_type === "pdf" ? viewer.url : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewer.url)}`);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={() => setViewer(null)}>
            <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="font-semibold text-sm">{viewer.title} — {viewer.file_name}</div>
                <button onClick={() => setViewer(null)} className="text-muted hover:text-dark text-xl leading-none">×</button>
              </div>
              {embedSrc ? (
                <iframe title="Resume preview" className="flex-1 w-full" src={embedSrc} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-muted p-6 text-center">
                  <div>This link can't be previewed inline.</div>
                  <a href={viewer.url} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center">Open link</a>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
