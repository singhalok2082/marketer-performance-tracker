const router = require("express").Router();
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");

const BUCKET = "resumes";
const MIME_TO_TYPE = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (MIME_TO_TYPE[file.mimetype]) cb(null, true);
    else cb(new Error("Only PDF, DOC, or DOCX files are allowed"));
  },
});

function canModify(req, row) {
  return req.user.role === "admin" || row.user_id === req.user.userId;
}

router.get("/", requireAuth, async (req, res) => {
  let query = supabase
    .from("resumes")
    .select("*, users(name)")
    .order("created_at", { ascending: false });

  if (req.user.role === "admin") {
    if (req.query.user_id) query = query.eq("user_id", req.query.user_id);
  } else {
    query = query.eq("user_id", req.user.userId);
  }
  if (req.query.is_active !== undefined) query = query.eq("is_active", req.query.is_active === "true");

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data || []).map(({ users, file_path, ...row }) => ({ ...row, user_name: users?.name || null })));
});

router.post("/", requireAuth, (req, res) => {
  upload.single("file")(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: uploadErr.message });
    if (!req.body.title?.trim()) return res.status(400).json({ error: "Title is required" });
    if (!req.body.tech_stack?.trim()) return res.status(400).json({ error: "Tech stack is required" });

    const driveLink = req.body.google_drive_link?.trim();
    if (!req.file && !driveLink) return res.status(400).json({ error: "Attach a file or a Google Drive link" });

    const insertRow = {
      user_id: req.user.userId,
      title: req.body.title.trim(),
      tech_stack: req.body.tech_stack.trim(),
    };

    let uploadedPath = null;
    if (req.file) {
      const fileType = MIME_TO_TYPE[req.file.mimetype];
      uploadedPath = `${req.user.userId}/${uuidv4()}.${fileType}`;

      const { error: uploadStorageErr } = await supabase.storage
        .from(BUCKET)
        .upload(uploadedPath, req.file.buffer, { contentType: req.file.mimetype });
      if (uploadStorageErr) return res.status(500).json({ error: uploadStorageErr.message });

      insertRow.file_path = uploadedPath;
      insertRow.file_name = req.file.originalname;
      insertRow.file_type = fileType;
    } else {
      insertRow.google_drive_link = driveLink;
    }

    const { data, error } = await supabase.from("resumes").insert(insertRow).select().single();

    if (error) {
      if (uploadedPath) await supabase.storage.from(BUCKET).remove([uploadedPath]);
      return res.status(500).json({ error: error.message });
    }

    await supabase.from("audit_logs").insert({
      actor_id: req.user.userId, actor_name: req.user.name,
      action: "UPLOAD_RESUME", target_type: "resume", target_id: data.id,
      metadata: { title: data.title, file_name: data.file_name, google_drive_link: data.google_drive_link },
    });

    const { file_path, ...safe } = data;
    res.status(201).json(safe);
  });
});

router.get("/:id/url", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("resumes").select("*").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  if (existing.google_drive_link) {
    return res.json({ url: existing.google_drive_link, is_drive_link: true, file_name: existing.file_name || existing.title });
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(existing.file_path, 600);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ url: data.signedUrl, file_type: existing.file_type, file_name: existing.file_name, is_drive_link: false });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("resumes").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  const { title, tech_stack, google_drive_link, is_active } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title.trim();
  if (tech_stack !== undefined) updates.tech_stack = tech_stack?.trim() || null;
  if (google_drive_link !== undefined) updates.google_drive_link = google_drive_link?.trim() || null;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from("resumes").update(updates).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "UPDATE_RESUME", target_type: "resume", target_id: req.params.id, metadata: updates,
  });

  const { file_path, ...safe } = data;
  res.json(safe);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("resumes").select("*").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  if (existing.file_path) await supabase.storage.from(BUCKET).remove([existing.file_path]);
  await supabase.from("resumes").delete().eq("id", req.params.id);

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "DELETE_RESUME", target_type: "resume", target_id: req.params.id,
  });

  res.json({ ok: true });
});

module.exports = router;
