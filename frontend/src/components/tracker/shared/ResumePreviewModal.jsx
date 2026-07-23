import React from "react";
import api from "../../../api/client";
import { driveEmbedUrl } from "../../../utils/drivePreview";

// Fetches a signed preview URL (or the Google Drive link) for a resume and
// hands back the shape ResumePreviewModal expects as its `viewer` prop.
export async function fetchResumeViewer(resumeId, title) {
  const { data } = await api.get(`/resumes/${resumeId}/url`);
  return { ...data, title };
}

export default function ResumePreviewModal({ viewer, onClose }) {
  if (!viewer) return null;

  const embedSrc = viewer.is_drive_link
    ? driveEmbedUrl(viewer.url)
    : (viewer.file_type === "pdf" ? viewer.url : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewer.url)}`);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="font-semibold text-sm">{viewer.title} — {viewer.file_name}</div>
          <button onClick={onClose} className="text-muted hover:text-dark text-xl leading-none">×</button>
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
}
