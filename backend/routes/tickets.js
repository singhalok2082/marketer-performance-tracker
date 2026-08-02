const router = require("express").Router();
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");
const { hasPermission, requirePermission } = require("../utils/permissions");

const BUCKET = "ticket-attachments";
const ALLOWED_MIME = [
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error("That file type isn't supported — try an image, PDF, Word doc, or text file"));
  },
});

const CATEGORIES = ["bug", "access", "data", "other"];
const STATUSES = ["open", "in_progress", "resolved"];

function canAccess(req, ticket) {
  return hasPermission(req.user, "support") || ticket.user_id === req.user.userId;
}

async function attachFile(req, file, ticketId, messageId) {
  const ext = (file.originalname.split(".").pop() || "bin").toLowerCase();
  const path = `${req.user.userId}/${ticketId}/${uuidv4()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype });
  if (uploadErr) return { error: uploadErr.message };

  const { error: insertErr } = await supabase.from("ticket_attachments").insert({
    ticket_id: ticketId,
    message_id: messageId,
    file_path: path,
    file_name: file.originalname,
    file_type: file.mimetype,
    uploaded_by: req.user.userId,
  });
  if (insertErr) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { error: insertErr.message };
  }
  return { ok: true };
}

// GET /api/tickets — list, scoped by role
router.get("/", requireAuth, async (req, res) => {
  let query = supabase
    .from("tickets")
    .select("*, users(name), ticket_messages(id, created_at)")
    .order("updated_at", { ascending: false });

  if (req.user.role === "admin") {
    if (!hasPermission(req.user, "support")) return res.status(403).json({ error: "You don't have access to this section" });
    if (req.query.user_id) query = query.eq("user_id", req.query.user_id);
  } else {
    query = query.eq("user_id", req.user.userId);
  }
  if (req.query.status) query = query.eq("status", req.query.status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data || []).map(({ users, ticket_messages, ...row }) => ({
    ...row,
    user_name: users?.name || null,
    message_count: ticket_messages?.length || 0,
    last_activity: ticket_messages?.length
      ? ticket_messages.reduce((mx, m) => m.created_at > mx ? m.created_at : mx, ticket_messages[0].created_at)
      : row.created_at,
  })));
});

// GET /api/tickets/:id — full thread
router.get("/:id", requireAuth, async (req, res) => {
  const { data: ticket, error: findErr } = await supabase
    .from("tickets").select("*, users(name)").eq("id", req.params.id).single();
  if (findErr || !ticket) return res.status(404).json({ error: "Not found" });
  if (!canAccess(req, ticket)) return res.status(403).json({ error: "Not allowed" });

  const { data: messages, error: msgErr } = await supabase
    .from("ticket_messages")
    .select("*, ticket_attachments(id, file_name, file_type, created_at)")
    .eq("ticket_id", req.params.id)
    .order("created_at", { ascending: true });
  if (msgErr) return res.status(500).json({ error: msgErr.message });

  const { users, ...ticketRow } = ticket;
  res.json({
    ...ticketRow,
    user_name: users?.name || null,
    messages: (messages || []).map(({ ticket_attachments, ...m }) => ({
      ...m,
      attachments: ticket_attachments || [],
    })),
  });
});

// POST /api/tickets — create ticket + first message (+ optional attachment)
router.post("/", requireAuth, (req, res) => {
  upload.single("file")(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: `File is too large — max ${MAX_FILE_SIZE / (1024 * 1024)}MB` });
      }
      return res.status(400).json({ error: uploadErr.message });
    }
    const { subject, body, category } = req.body;
    if (!subject?.trim()) return res.status(400).json({ error: "Subject is required" });
    if (!body?.trim()) return res.status(400).json({ error: "Description is required" });
    const cat = CATEGORIES.includes(category) ? category : "other";

    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .insert({ user_id: req.user.userId, subject: subject.trim(), category: cat })
      .select()
      .single();
    if (ticketErr) return res.status(500).json({ error: ticketErr.message });

    const { data: message, error: msgErr } = await supabase
      .from("ticket_messages")
      .insert({ ticket_id: ticket.id, actor_id: req.user.userId, actor_name: req.user.name, body: body.trim() })
      .select()
      .single();
    if (msgErr) {
      await supabase.from("tickets").delete().eq("id", ticket.id);
      return res.status(500).json({ error: msgErr.message });
    }

    if (req.file) {
      const { error: attachErr } = await attachFile(req, req.file, ticket.id, message.id);
      if (attachErr) return res.status(500).json({ error: attachErr });
    }

    await supabase.from("audit_logs").insert({
      actor_id: req.user.userId, actor_name: req.user.name,
      action: "CREATE_TICKET", target_type: "ticket", target_id: ticket.id,
      metadata: { subject: ticket.subject, category: cat },
    });

    res.status(201).json(ticket);
  });
});

// POST /api/tickets/:id/messages — reply (+ optional attachment)
router.post("/:id/messages", requireAuth, (req, res) => {
  upload.single("file")(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: `File is too large — max ${MAX_FILE_SIZE / (1024 * 1024)}MB` });
      }
      return res.status(400).json({ error: uploadErr.message });
    }

    const { data: ticket, error: findErr } = await supabase
      .from("tickets").select("*").eq("id", req.params.id).single();
    if (findErr || !ticket) return res.status(404).json({ error: "Not found" });
    if (!canAccess(req, ticket)) return res.status(403).json({ error: "Not allowed" });

    const { body } = req.body;
    if (!body?.trim() && !req.file) return res.status(400).json({ error: "Write a message or attach a file" });

    const { data: message, error: msgErr } = await supabase
      .from("ticket_messages")
      .insert({ ticket_id: ticket.id, actor_id: req.user.userId, actor_name: req.user.name, body: (body || "").trim() || "(attachment)" })
      .select()
      .single();
    if (msgErr) return res.status(500).json({ error: msgErr.message });

    if (req.file) {
      const { error: attachErr } = await attachFile(req, req.file, ticket.id, message.id);
      if (attachErr) return res.status(500).json({ error: attachErr });
    }

    // Reopen a resolved ticket if the reporter follows up; admin replies don't change status
    const updates = { updated_at: new Date().toISOString() };
    if (ticket.status === "resolved" && req.user.userId === ticket.user_id) updates.status = "open";
    await supabase.from("tickets").update(updates).eq("id", ticket.id);

    res.status(201).json(message);
  });
});

// PATCH /api/tickets/:id — admin: change status
router.patch("/:id", requireAuth, requirePermission("support"), async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });

  const { data, error } = await supabase
    .from("tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "UPDATE_TICKET_STATUS", target_type: "ticket", target_id: req.params.id,
    metadata: { status },
  });

  res.json(data);
});

// GET /api/tickets/attachments/:id/url — signed URL to view/download
router.get("/attachments/:id/url", requireAuth, async (req, res) => {
  const { data: attachment, error: findErr } = await supabase
    .from("ticket_attachments").select("*, tickets(user_id)").eq("id", req.params.id).single();
  if (findErr || !attachment) return res.status(404).json({ error: "Not found" });
  if (!hasPermission(req.user, "support") && attachment.tickets?.user_id !== req.user.userId) {
    return res.status(403).json({ error: "Not allowed" });
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(attachment.file_path, 600);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ url: data.signedUrl, file_name: attachment.file_name, file_type: attachment.file_type });
});

module.exports = router;
