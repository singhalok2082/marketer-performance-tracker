import React, { forwardRef, useImperativeHandle, useState, useEffect, useCallback } from "react";
import api from "../../../api/client";

// Lets the user either pick one of their own existing resumes, or attach a
// brand-new one inline (file upload or Google Drive link) via the existing
// POST /api/resumes endpoint. Exposes an imperative `resolve()` that returns
// a resume id, creating the new resume first if needed.
// Render this with `key={editingId || "new"}` from the parent form so it
// remounts (instead of keeping stale state) whenever the user switches which
// row they're editing, or between editing and adding.
const ResumePicker = forwardRef(function ResumePicker({ user, initialResumeId, ownerId }, ref) {
  const effectiveOwnerId = ownerId || user?.id;
  const [mode, setMode] = useState("existing");
  const [resumes, setResumes] = useState([]);
  const [selectedId, setSelectedId] = useState(initialResumeId || "");
  const [attachMode, setAttachMode] = useState("file"); // "file" | "link"
  const [title, setTitle] = useState("");
  const [techStack, setTechStack] = useState("");
  const [file, setFile] = useState(null);
  const [driveLink, setDriveLink] = useState("");

  const loadResumes = useCallback(() => {
    if (!effectiveOwnerId) return;
    api.get("/resumes", { params: { user_id: effectiveOwnerId } })
      .then(r => setResumes(r.data))
      .catch(() => setResumes([]));
  }, [effectiveOwnerId]);

  useEffect(() => { loadResumes(); }, [loadResumes]);

  useImperativeHandle(ref, () => ({
    async resolve() {
      if (mode === "existing") {
        if (!selectedId) throw new Error("Choose a resume");
        return selectedId;
      }

      if (!title.trim()) throw new Error("Title is required for the new resume");
      if (!techStack.trim()) throw new Error("Tech stack is required for the new resume");
      if (attachMode === "file" && !file) throw new Error("Choose a PDF, DOC, or DOCX file");
      if (attachMode === "link" && !driveLink.trim()) throw new Error("Paste a Google Drive link");

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("tech_stack", techStack.trim());
      if (attachMode === "file") formData.append("file", file);
      else formData.append("google_drive_link", driveLink.trim());

      const { data } = await api.post("/resumes", formData, { headers: { "Content-Type": "multipart/form-data" } });
      loadResumes();
      return data.id;
    },
    reset() {
      setMode("existing");
      setSelectedId("");
      setAttachMode("file");
      setTitle("");
      setTechStack("");
      setFile(null);
      setDriveLink("");
    },
  }), [mode, selectedId, title, techStack, attachMode, file, driveLink, loadResumes]);

  return (
    <div className="sm:col-span-2">
      <label className="block text-xs font-medium mb-1">Resume *</label>
      <div className="flex gap-2 mb-2">
        <button type="button" onClick={() => setMode("existing")}
          className={`h-8 px-3 rounded-lg text-xs font-semibold border ${mode === "existing" ? "bg-primary text-white border-primary" : "border-border text-muted"}`}>
          Use existing resume
        </button>
        <button type="button" onClick={() => setMode("new")}
          className={`h-8 px-3 rounded-lg text-xs font-semibold border ${mode === "new" ? "bg-primary text-white border-primary" : "border-border text-muted"}`}>
          Attach a new resume
        </button>
      </div>

      {mode === "existing" ? (
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
          className="w-full h-9 rounded-lg border border-border px-3 text-sm">
          <option value="">Select a resume…</option>
          {resumes.map(r => (
            <option key={r.id} value={r.id}>{r.title} ({r.tech_stack || "—"}){r.is_active ? "" : " — archived"}</option>
          ))}
        </select>
      ) : (
        <div className="space-y-3 border border-border rounded-lg p-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setAttachMode("file")}
              className={`h-8 px-3 rounded-lg text-xs font-semibold border ${attachMode === "file" ? "bg-primary text-white border-primary" : "border-border text-muted"}`}>
              Upload PDF / DOC
            </button>
            <button type="button" onClick={() => setAttachMode("link")}
              className={`h-8 px-3 rounded-lg text-xs font-semibold border ${attachMode === "link" ? "bg-primary text-white border-primary" : "border-border text-muted"}`}>
              Google Drive link
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Title / designation *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Python Engineer, DevOps Engineer…" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tech stack *</label>
              <input value={techStack} onChange={e => setTechStack(e.target.value)}
                placeholder="Java, React, DevOps…" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
            </div>
          </div>
          {attachMode === "file" ? (
            <div>
              <label className="block text-xs font-medium mb-1">File (PDF, DOC, DOCX) *</label>
              <input type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)} className="text-sm" />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium mb-1">Google Drive link *</label>
              <input type="url" value={driveLink} onChange={e => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/…" className="w-full h-9 rounded-lg border border-border px-3 text-sm" />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default ResumePicker;
