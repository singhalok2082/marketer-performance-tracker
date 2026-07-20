import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/client";
import { driveEmbedUrl } from "../../utils/drivePreview";

const STATUS_LIST = ["Applied", "Submitted to Client", "Interview Scheduled", "Offer", "Rejected", "No Response"];
const emptyForm = { portal_id: "", job_url: "", job_title: "", candidate_info: "", job_description: "", resume_id: "", applied_date: "", status: "Applied" };
const emptyNewResume = { title: "", tech_stack: "", file: null, drive_link: "" };

function statusColors(status) {
  if (status === "Offer") return "bg-green-100 text-green-700";
  if (status === "Interview Scheduled") return "bg-blue-100 text-blue-700";
  if (status === "Submitted to Client") return "bg-purple-100 text-purple-700";
  if (status === "Rejected") return "bg-red-100 text-red-700";
  if (status === "No Response") return "bg-gray-100 text-gray-500";
  return "bg-amber-100 text-amber-700";
}

export default function JobApplications({ user }) {
  const isAdmin = user?.role === "admin";
  const [apps, setApps] = useState([]);
  const [portals, setPortals] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [managers, setManagers] = useState([]);
  const [managerFilter, setManagerFilter] = useState("all");
  const [portalFilter, setPortalFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [resumeMode, setResumeMode] = useState("existing"); // "existing" | "upload" | "link"
  const [newResume, setNewResume] = useState(emptyNewResume);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [jdModal, setJdModal] = useState(null);
  const [viewer, setViewer] = useState(null); // { url, file_type, file_name, is_drive_link, title }

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (isAdmin && managerFilter !== "all") params.user_id = managerFilter;
    if (portalFilter !== "all") params.portal_id = portalFilter;
    if (statusFilter !== "all") params.status = statusFilter;
    api.get("/applications", { params })
      .then(r => setApps(r.data))
      .catch(() => setMsg({ type: "error", text: "Failed to load applications" }))
      .finally(() => setLoading(false));
  }, [isAdmin, managerFilter, portalFilter, statusFilter]);

  const loadResumes = useCallback(() => {
    api.get("/resumes", { params: { is_active: true } }).then(r => setResumes(r.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get("/portals").then(r => setPortals(r.data.filter(p => p.is_active))).catch(() => {});
    loadResumes();
    if (isAdmin) api.get("/users/public").then(r => setManagers(r.data)).catch(() => {});
  }, [isAdmin, loadResumes]);

  const startAdd = () => { setForm(emptyForm); setEditingId(null); setResumeMode("existing"); setNewResume(emptyNewResume); setShowForm(true); };
  const startEdit = (a) => {
    setForm({
      portal_id: a.portal_id || "", job_url: a.job_url || "", job_title: a.job_title,
      candidate_info: a.candidate_info || "", job_description: a.job_description || "",
      resume_id: a.resume_id || "", applied_date: a.applied_date, status: a.status,
    });
    setEditingId(a.id);
    setResumeMode("existing");
    setNewResume(emptyNewResume);
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (resumeMode === "upload" && !newResume.file) { setMsg({ type: "error", text: "Choose a resume file, or switch back to an existing resume" }); return; }
    if (resumeMode === "link" && !newResume.drive_link.trim()) { setMsg({ type: "error", text: "Paste a Google Drive link, or switch back to an existing resume" }); return; }
    if (resumeMode !== "existing" && !newResume.tech_stack.trim()) { setMsg({ type: "error", text: "Tech stack is required for the new resume" }); return; }

    setSaving(true);
    setMsg(null);
    try {
      let resumeId = form.resume_id || null;

      if (resumeMode !== "existing") {
        const fd = new FormData();
        fd.append("title", newResume.title.trim() || form.job_title);
        fd.append("tech_stack", newResume.tech_stack.trim());
        if (resumeMode === "upload") fd.append("file", newResume.file);
        else fd.append("google_drive_link", newResume.drive_link.trim());
        const { data: created } = await api.post("/resumes", fd, { headers: { "Content-Type": "multipart/form-data" } });
        resumeId = created.id;
        loadResumes();
      }

      const payload = { ...form, portal_id: form.portal_id || null, resume_id: resumeId, applied_date: form.applied_date || undefined };
      if (editingId) await api.patch(`/applications/${editingId}`, payload);
      else await api.post("/applications", payload);
      setMsg({ type: "success", text: editingId ? "Application updated." : "Application logged." });
      setShowForm(false);
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const previewResume = async (resumeId) => {
    try {
      const { data } = await api.get(`/resumes/${resumeId}/url`);
      setViewer(data);
    } catch {
      alert("Failed to open resume");
    }
  };

  const remove = async (a) => {
    if (!confirm(`Remove application for "${a.job_title}"?`)) return;
    try {
      await api.delete(`/applications/${a.id}`);
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
        <div className="text-sm text-muted">{apps.length} application{apps.length === 1 ? "" : "s"}</div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)} className="h-9 rounded-lg border border-border bg-white px-3 text-sm">
              <option value="all">All managers</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <select value={portalFilter} onChange={e => setPortalFilter(e.target.value)} className="h-9 rounded-lg border border-border bg-white px-3 text-sm">
            <option value="all">All portals</option>
            {portals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-lg border border-border bg-white px-3 text-sm">
            <option value="all">All statuses</option>
            {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={showForm ? () => setShowForm(false) : startAdd}
            className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold">
            {showForm ? "Cancel" : "+ Log Application"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Portal</label>
            <select value={form.portal_id} onChange={e => setForm(f => ({ ...f, portal_id: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm">
              <option value="">Select portal…</option>
              {portals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Job title *</label>
            <input required value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">Job URL</label>
            <input type="url" value={form.job_url} onChange={e => setForm(f => ({ ...f, job_url: e.target.value }))} placeholder="https://…" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Candidate info</label>
            <input value={form.candidate_info} onChange={e => setForm(f => ({ ...f, candidate_info: e.target.value }))} placeholder="Name / notes" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">Resume used</label>
            <div className="flex gap-2 mb-2">
              {[["existing", "Choose existing"], ["upload", "Upload new"], ["link", "Drive link"]].map(([m, l]) => (
                <button key={m} type="button" onClick={() => setResumeMode(m)}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold border ${resumeMode === m ? "bg-primary text-white border-primary" : "border-border text-muted"}`}>
                  {l}
                </button>
              ))}
            </div>
            {resumeMode === "existing" && (
              <select value={form.resume_id} onChange={e => setForm(f => ({ ...f, resume_id: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm">
                <option value="">None</option>
                {resumes.map(r => <option key={r.id} value={r.id}>{r.title} {r.file_name ? `(${r.file_name})` : "(Drive link)"}</option>)}
              </select>
            )}
            {resumeMode !== "existing" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={newResume.title} onChange={e => setNewResume(f => ({ ...f, title: e.target.value }))}
                  placeholder="Resume title (defaults to job title)" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
                <input required value={newResume.tech_stack} onChange={e => setNewResume(f => ({ ...f, tech_stack: e.target.value }))}
                  placeholder="Tech stack *" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
                {resumeMode === "upload" ? (
                  <input required type="file" accept=".pdf,.doc,.docx" onChange={e => setNewResume(f => ({ ...f, file: e.target.files?.[0] || null }))}
                    className="w-full text-sm sm:col-span-2" />
                ) : (
                  <input required type="url" value={newResume.drive_link} onChange={e => setNewResume(f => ({ ...f, drive_link: e.target.value }))}
                    placeholder="https://drive.google.com/file/d/…" className="w-full h-9 rounded-lg border border-border px-3 text-sm sm:col-span-2" />
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Applied date</label>
            <input type="date" value={form.applied_date} onChange={e => setForm(f => ({ ...f, applied_date: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full h-9 rounded-lg border border-border px-3 text-sm">
              {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">Job description</label>
            <textarea rows={4} value={form.job_description} onChange={e => setForm(f => ({ ...f, job_description: e.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold disabled:opacity-40">
              {saving ? "Saving…" : editingId ? "Save changes" : "Log application"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-muted">Loading…</div>
        ) : apps.length === 0 ? (
          <div className="text-center py-10 text-muted">No applications logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface text-left">
                  {isAdmin && <th className="px-4 py-2.5 font-semibold text-muted">Manager</th>}
                  <th className="px-4 py-2.5 font-semibold text-muted">Date</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Job title</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Candidate</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Portal</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Resume</th>
                  <th className="px-4 py-2.5 font-semibold text-muted">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.map(a => (
                  <tr key={a.id} className="border-t border-border">
                    {isAdmin && <td className="px-4 py-2.5">{a.user_name || "—"}</td>}
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">{a.applied_date}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {a.job_url ? <a href={a.job_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{a.job_title}</a> : a.job_title}
                    </td>
                    <td className="px-4 py-2.5 text-muted truncate max-w-[160px]">{a.candidate_info || "—"}</td>
                    <td className="px-4 py-2.5">{a.portal_name || "—"}</td>
                    <td className="px-4 py-2.5 text-muted truncate max-w-[160px]">
                      {a.resume_id ? (
                        <button onClick={() => previewResume(a.resume_id)} className="text-primary hover:underline">{a.resume_title || "Preview"}</button>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors(a.status)}`}>{a.status}</span></td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {a.job_description && <button onClick={() => setJdModal(a)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-surface mr-1.5">JD</button>}
                      <button onClick={() => startEdit(a)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border hover:bg-surface mr-1.5">Edit</button>
                      <button onClick={() => remove(a)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {jdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={() => setJdModal(null)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div>
                <div className="font-semibold text-sm">{jdModal.job_title}</div>
                <div className="text-xs text-muted">{jdModal.portal_name || "—"} · {jdModal.applied_date}</div>
              </div>
              <button onClick={() => setJdModal(null)} className="text-muted hover:text-dark text-xl leading-none">×</button>
            </div>
            <div className="p-5 overflow-y-auto text-sm whitespace-pre-wrap">{jdModal.job_description}</div>
          </div>
        </div>
      )}

      {viewer && (() => {
        const embedSrc = viewer.is_drive_link
          ? driveEmbedUrl(viewer.url)
          : (viewer.file_type === "pdf" ? viewer.url : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewer.url)}`);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={() => setViewer(null)}>
            <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="font-semibold text-sm">{viewer.file_name}</div>
                <button onClick={() => setViewer(null)} className="text-muted hover:text-dark text-xl leading-none">×</button>
              </div>
              {embedSrc ? (
                <iframe title="Resume preview" className="flex-1 w-full" src={embedSrc} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-muted p-6 text-center">
                  <div>This link can't be previewed inline.</div>
                  <a href={viewer.url} target="_blank" rel="noreferrer" className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold inline-flex items-center">Open link</a>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
