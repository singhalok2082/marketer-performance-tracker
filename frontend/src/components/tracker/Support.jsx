import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/client";

const CATEGORIES = [
  ["bug", "Something's broken"],
  ["access", "Access / login issue"],
  ["data", "Data looks wrong"],
  ["other", "Other"],
];

const STATUSES = [
  ["open", "Open"],
  ["in_progress", "In Progress"],
  ["resolved", "Resolved"],
];

function statusColors(status) {
  if (status === "resolved") return { bg: "#DCFCE7", color: "#15803D" };
  if (status === "in_progress") return { bg: "#DBEAFE", color: "#1D4ED8" };
  return { bg: "#FEF3C7", color: "#B45309" };
}

function categoryLabel(cat) { return CATEGORIES.find(([k]) => k === cat)?.[1] || "Other"; }
function statusLabel(status) { return STATUSES.find(([k]) => k === status)?.[1] || status; }
function fmtDateTime(s) {
  return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function AttachmentChip({ att }) {
  const [loading, setLoading] = useState(false);
  const open = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/tickets/attachments/${att.id}/url`);
      window.open(data.url, "_blank", "noopener");
    } catch {
      // ignore — transient network/signing failure, user can just retry the click
    } finally {
      setLoading(false);
    }
  };
  const isImage = att.file_type?.startsWith("image/");
  return (
    <button onClick={open} disabled={loading}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-white text-[11.5px] font-medium text-medium hover:bg-surface transition-colors">
      {isImage ? "🖼️" : "📎"} {att.file_name || "attachment"}
    </button>
  );
}

export default function Support({ user }) {
  const isAdmin = user?.role === "admin";
  const [tickets, setTickets] = useState([]);
  const [managers, setManagers] = useState([]);
  const [managerFilter, setManagerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const [view, setView] = useState("list"); // "list" | "new" | ticketId
  const [ticket, setTicket] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("bug");
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [replyBody, setReplyBody] = useState("");
  const [replyFile, setReplyFile] = useState(null);
  const [replying, setReplying] = useState(false);

  const loadList = useCallback(() => {
    setLoading(true);
    const params = {};
    if (isAdmin && managerFilter !== "all") params.user_id = managerFilter;
    if (statusFilter !== "all") params.status = statusFilter;
    api.get("/tickets", { params })
      .then(r => setTickets(r.data))
      .catch(() => setMsg({ type: "error", text: "Failed to load tickets" }))
      .finally(() => setLoading(false));
  }, [isAdmin, managerFilter, statusFilter]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => {
    if (isAdmin) api.get("/users/public").then(r => setManagers(r.data)).catch(() => {});
  }, [isAdmin]);

  const openTicket = (id) => {
    setView(id);
    setTicketLoading(true);
    api.get(`/tickets/${id}`)
      .then(r => setTicket(r.data))
      .catch(() => setMsg({ type: "error", text: "Failed to load ticket" }))
      .finally(() => setTicketLoading(false));
  };

  const resetForm = () => { setSubject(""); setCategory("bug"); setBody(""); setFile(null); };

  const submitTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) { setMsg({ type: "error", text: "Subject and description are required" }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("category", category);
      formData.append("body", body);
      if (file) formData.append("file", file);
      await api.post("/tickets", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg({ type: "success", text: "Ticket submitted." });
      resetForm();
      setView("list");
      loadList();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to submit ticket" });
    } finally {
      setSaving(false);
    }
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyBody.trim() && !replyFile) return;
    setReplying(true);
    try {
      const formData = new FormData();
      formData.append("body", replyBody);
      if (replyFile) formData.append("file", replyFile);
      await api.post(`/tickets/${ticket.id}/messages`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setReplyBody(""); setReplyFile(null);
      openTicket(ticket.id);
      loadList();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to send reply" });
    } finally {
      setReplying(false);
    }
  };

  const changeStatus = async (status) => {
    try {
      await api.patch(`/tickets/${ticket.id}`, { status });
      setTicket(t => ({ ...t, status }));
      loadList();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Failed to update status" });
    }
  };

  /* ─────────────── New ticket form ─────────────── */
  if (view === "new") {
    return (
      <div className="space-y-5 max-w-xl">
        <button onClick={() => setView("list")} className="text-xs text-muted hover:text-dark">← Back to tickets</button>
        <div className="text-[15px] font-bold">Raise a ticket</div>
        {msg && (
          <div className={`text-sm rounded-lg px-4 py-3 border ${msg.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
            {msg.text}
          </div>
        )}
        <form onSubmit={submitTicket} className="space-y-4">
          <div>
            <div className="text-xs font-semibold text-medium mb-1">Subject</div>
            <input value={subject} onChange={e => setSubject(e.target.value)} className="input" placeholder="Short summary of the issue" required />
          </div>
          <div>
            <div className="text-xs font-semibold text-medium mb-1">Category</div>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input">
              {CATEGORIES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs font-semibold text-medium mb-1">Describe what happened</div>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} className="input" style={{ height: "auto" }}
              placeholder="What were you trying to do, what happened instead, and any steps to reproduce it" required />
          </div>
          <div>
            <div className="text-xs font-semibold text-medium mb-1">Attach a screenshot or file (optional)</div>
            <input type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={e => setFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-medium file:mr-3 file:h-8 file:px-3 file:rounded-lg file:border-0 file:bg-surface-alt file:text-xs file:font-semibold file:text-dark" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? "Submitting…" : "Submit ticket"}</button>
        </form>
      </div>
    );
  }

  /* ─────────────── Ticket detail / thread ─────────────── */
  if (view !== "list") {
    if (ticketLoading || !ticket) return <div className="text-sm text-muted">Loading…</div>;
    const sc = statusColors(ticket.status);
    return (
      <div className="space-y-4 max-w-2xl">
        <button onClick={() => { setView("list"); loadList(); }} className="text-xs text-muted hover:text-dark">← Back to tickets</button>

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-bold">{ticket.subject}</div>
            <div className="text-xs text-subtle mt-0.5">
              {categoryLabel(ticket.category)} · opened by {ticket.user_name || "—"} · {fmtDateTime(ticket.created_at)}
            </div>
          </div>
          {isAdmin ? (
            <select value={ticket.status} onChange={e => changeStatus(e.target.value)}
              className="h-8 rounded-lg border border-border bg-white px-2.5 text-xs font-semibold">
              {STATUSES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          ) : (
            <span className="badge" style={{ background: sc.bg, color: sc.color }}>{statusLabel(ticket.status)}</span>
          )}
        </div>

        <div className="space-y-3">
          {ticket.messages.map(m => (
            <div key={m.id} className="bg-white border border-border rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[12.5px] font-semibold">{m.actor_name || "—"}</div>
                <div className="text-[11px] text-subtle">{fmtDateTime(m.created_at)}</div>
              </div>
              <div className="text-[13px] text-medium whitespace-pre-wrap">{m.body}</div>
              {m.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {m.attachments.map(a => <AttachmentChip key={a.id} att={a} />)}
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={submitReply} className="bg-white border border-border rounded-xl p-3.5 space-y-2.5">
          <textarea value={replyBody} onChange={e => setReplyBody(e.target.value)} rows={3} className="input" style={{ height: "auto" }}
            placeholder="Write a reply…" />
          <div className="flex items-center justify-between gap-2">
            <input type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={e => setReplyFile(e.target.files?.[0] || null)}
              className="text-xs text-medium file:mr-3 file:h-7 file:px-2.5 file:rounded-md file:border-0 file:bg-surface-alt file:text-[11px] file:font-semibold file:text-dark" />
            <button type="submit" disabled={replying} className="btn-primary text-xs">{replying ? "Sending…" : "Reply"}</button>
          </div>
        </form>
      </div>
    );
  }

  /* ─────────────── Ticket list ─────────────── */
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted -mb-1">
        Run into a problem or have a question about the portal? Raise it here — {isAdmin ? "your team's tickets land in one place instead of scattered across DMs." : "your admin can see it and reply right here, instead of over DM or email."}
      </p>

      {msg && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${msg.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted">{tickets.length} ticket{tickets.length === 1 ? "" : "s"}</div>
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
            <option value="all">All statuses</option>
            {STATUSES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <button onClick={() => { resetForm(); setMsg(null); setView("new"); }} className="btn-primary">Raise a ticket</button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-border rounded-xl px-4 py-8 text-center text-sm text-subtle">
          No tickets yet.
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden divide-y divide-border-soft">
          {tickets.map(t => {
            const sc = statusColors(t.status);
            return (
              <button key={t.id} onClick={() => openTicket(t.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface transition-colors">
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold truncate">{t.subject}</div>
                  <div className="text-[11.5px] text-subtle mt-0.5">
                    {categoryLabel(t.category)}{isAdmin ? ` · ${t.user_name || "—"}` : ""} · {t.message_count} message{t.message_count === 1 ? "" : "s"} · updated {fmtDateTime(t.last_activity)}
                  </div>
                </div>
                <span className="badge flex-shrink-0" style={{ background: sc.bg, color: sc.color }}>{statusLabel(t.status)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
