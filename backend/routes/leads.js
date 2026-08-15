const router = require("express").Router();
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");
const { hasPermission, requirePermission } = require("../utils/permissions");

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ROWS = 5000;
const CSV_EXT = /\.csv$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => cb(null, CSV_EXT.test(file.originalname)),
});

const CANONICAL_FIELDS = ["full_name", "designation", "company_name", "company_domain", "linkedin_url", "email", "phone"];

const SYNONYMS = {
  full_name: ["name", "fullname", "recruitername", "contactname", "candidatename", "leadname", "personname"],
  designation: ["designation", "title", "jobtitle", "role", "position"],
  company_name: ["company", "companyname", "organization", "organisation", "employer"],
  company_domain: ["domain", "companydomain", "website", "companywebsite", "webaddress"],
  linkedin_url: ["linkedin", "linkedinurl", "linkedinprofile", "linkedinlink", "profileurl"],
  email: ["email", "emailaddress", "emailid", "mail"],
  phone: ["phone", "phonenumber", "phoneno", "mobile", "mobilenumber", "contactnumber", "cell"],
};

function normalize(h) {
  return String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function suggestMapping(headers) {
  const normalized = headers.map(normalize);
  const mapping = {};
  const usedHeaders = new Set();
  const usedFields = new Set();

  // Pass 1: exact synonym matches
  for (const field of CANONICAL_FIELDS) {
    const idx = normalized.findIndex((n, i) => !usedHeaders.has(i) && SYNONYMS[field].includes(n));
    if (idx !== -1) { mapping[headers[idx]] = field; usedHeaders.add(idx); usedFields.add(field); }
  }
  // Pass 2: substring matches for whatever's left
  for (const field of CANONICAL_FIELDS) {
    if (usedFields.has(field)) continue;
    const idx = normalized.findIndex((n, i) => !usedHeaders.has(i) && SYNONYMS[field].some(s => n.includes(s)));
    if (idx !== -1) { mapping[headers[idx]] = field; usedHeaders.add(idx); usedFields.add(field); }
  }
  // Everything else: suggest as a custom field
  headers.forEach((h, i) => {
    if (!usedHeaders.has(i)) mapping[h] = `custom:${slugify(h)}`;
  });
  return mapping;
}

function slugify(label) {
  return String(label || "field").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field";
}

// ─────────────── Uploads ───────────────

router.post("/uploads", requireAuth, requirePermission("tasks"), upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Attach a .csv file" });

  let records;
  try {
    records = parse(req.file.buffer.toString("utf8"), { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (e) {
    return res.status(400).json({ error: `Could not parse CSV: ${e.message}` });
  }
  if (records.length === 0) return res.status(400).json({ error: "That CSV has no data rows" });
  if (records.length > MAX_ROWS) return res.status(400).json({ error: `That CSV has ${records.length} rows — split it into batches of ${MAX_ROWS} or fewer` });

  const headers = Object.keys(records[0]);
  const suggestedMapping = suggestMapping(headers);

  const { data, error } = await supabase
    .from("lead_uploads")
    .insert({
      uploaded_by: req.user.userId,
      file_name: req.file.originalname,
      headers,
      rows: records,
      row_count: records.length,
    })
    .select("id, file_name, headers, row_count, created_at")
    .single();
  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ ...data, sample_rows: records.slice(0, 5), suggested_mapping: suggestedMapping });
});

router.get("/uploads/:id", requireAuth, requirePermission("tasks"), async (req, res) => {
  const { data, error } = await supabase.from("lead_uploads").select("*").eq("id", req.params.id).single();
  if (error || !data) return res.status(404).json({ error: "Upload not found" });

  res.json({
    id: data.id, file_name: data.file_name, headers: data.headers, row_count: data.row_count,
    status: data.status, mapping: data.mapping, custom_fields: data.custom_fields,
    imported_count: data.imported_count, skipped_count: data.skipped_count,
    sample_rows: (data.rows || []).slice(0, 5),
    suggested_mapping: data.mapping || suggestMapping(data.headers),
  });
});

router.post("/uploads/:id/commit", requireAuth, requirePermission("tasks"), async (req, res) => {
  const { mapping, custom_fields } = req.body;
  if (!mapping || typeof mapping !== "object") return res.status(400).json({ error: "mapping is required" });

  const { data: upload, error: findErr } = await supabase.from("lead_uploads").select("*").eq("id", req.params.id).single();
  if (findErr || !upload) return res.status(404).json({ error: "Upload not found" });
  if (upload.status === "committed") return res.status(400).json({ error: "This upload was already imported" });

  const nameHeaders = Object.entries(mapping).filter(([, v]) => v === "full_name").map(([h]) => h);
  if (nameHeaders.length !== 1) return res.status(400).json({ error: "Map exactly one column to Full Name before importing" });

  const { data: existingLeads } = await supabase.from("leads").select("email, linkedin_url");
  const seenEmails = new Set((existingLeads || []).filter(l => l.email).map(l => l.email.toLowerCase().trim()));
  const seenLinkedin = new Set((existingLeads || []).filter(l => l.linkedin_url).map(l => l.linkedin_url.toLowerCase().trim()));

  const toInsert = [];
  let skipped = 0;

  for (const row of upload.rows) {
    const lead = { upload_id: upload.id, custom_fields: {} };
    for (const [header, target] of Object.entries(mapping)) {
      if (!target) continue;
      const raw = row[header];
      const value = raw === undefined || raw === null ? null : String(raw).trim() || null;
      if (target.startsWith("custom:")) {
        if (value !== null) lead.custom_fields[target.slice(7)] = value;
      } else if (CANONICAL_FIELDS.includes(target)) {
        lead[target] = value;
      }
    }

    if (!lead.full_name) { skipped++; continue; }
    const emailKey = lead.email?.toLowerCase().trim();
    const linkedinKey = lead.linkedin_url?.toLowerCase().trim();
    if ((emailKey && seenEmails.has(emailKey)) || (linkedinKey && seenLinkedin.has(linkedinKey))) { skipped++; continue; }

    if (emailKey) seenEmails.add(emailKey);
    if (linkedinKey) seenLinkedin.add(linkedinKey);
    toInsert.push(lead);
  }

  for (let i = 0; i < toInsert.length; i += 500) {
    const { error: insertErr } = await supabase.from("leads").insert(toInsert.slice(i, i + 500));
    if (insertErr) return res.status(500).json({ error: insertErr.message });
  }

  await supabase.from("lead_uploads").update({
    status: "committed", mapping, custom_fields: custom_fields || [],
    imported_count: toInsert.length, skipped_count: skipped, committed_at: new Date().toISOString(),
  }).eq("id", upload.id);

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "IMPORT_LEADS", target_type: "lead_upload", target_id: upload.id,
    metadata: { file_name: upload.file_name, imported: toInsert.length, skipped },
  });

  res.json({ imported_count: toInsert.length, skipped_count: skipped, total_rows: upload.rows.length });
});

// ─────────────── Pool + assignment ───────────────

router.get("/pool-count", requireAuth, requirePermission("tasks"), async (_req, res) => {
  const [{ count: totalLeads }, { count: totalAssigned }] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("lead_assignments").select("id", { count: "exact", head: true }),
  ]);
  res.json({ pool: (totalLeads || 0) - (totalAssigned || 0) });
});

router.post("/assign", requireAuth, requirePermission("tasks"), async (req, res) => {
  const counts = req.body.counts || {};
  const entries = Object.entries(counts).filter(([, n]) => Number(n) > 0);
  const totalRequested = entries.reduce((sum, [, n]) => sum + Number(n), 0);
  if (entries.length === 0) return res.status(400).json({ error: "Set at least one manager's lead count" });

  const { data: assignedRows } = await supabase.from("lead_assignments").select("lead_id");
  const assignedIds = (assignedRows || []).map(r => r.lead_id);

  let poolQuery = supabase.from("leads").select("id").order("created_at", { ascending: true }).limit(totalRequested);
  if (assignedIds.length > 0) poolQuery = poolQuery.not("id", "in", `(${assignedIds.join(",")})`);
  const { data: freshLeads, error: poolErr } = await poolQuery;
  if (poolErr) return res.status(500).json({ error: poolErr.message });

  const today = new Date().toISOString().slice(0, 10);
  const rows = [];
  const assigned = {};
  let cursor = 0;
  for (const [userId, n] of entries) {
    const take = freshLeads.slice(cursor, cursor + Number(n));
    cursor += Number(n);
    assigned[userId] = take.length;
    for (const lead of take) {
      rows.push({ lead_id: lead.id, user_id: userId, assigned_by: req.user.userId, assignment_date: today });
    }
  }

  if (rows.length > 0) {
    const { error: insertErr } = await supabase.from("lead_assignments").insert(rows);
    if (insertErr) return res.status(500).json({ error: insertErr.message });

    await supabase.from("audit_logs").insert({
      actor_id: req.user.userId, actor_name: req.user.name,
      action: "ASSIGN_LEADS", target_type: "lead_assignment", target_id: null,
      metadata: { date: today, assigned, total: rows.length },
    });
  }

  res.json({ requested: Object.fromEntries(entries.map(([u, n]) => [u, Number(n)])), assigned, total_assigned: rows.length, pool_short: totalRequested > freshLeads.length });
});

// ─────────────── Progress (admin) + my tasks (account manager) ───────────────

function leadStatus(row) {
  const l = row.leads;
  const hasCall = !!l?.phone, hasEmail = !!l?.email;
  if (!hasCall && !hasEmail) return "no_contact";
  const callOk = !hasCall || row.call_done;
  const emailOk = !hasEmail || row.email_done;
  return callOk && emailOk ? "done" : "pending";
}

router.get("/assignments", requireAuth, requirePermission("tasks"), async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("lead_assignments")
    .select("*, leads(full_name, designation, company_name, company_domain, linkedin_url, email, phone, custom_fields), users!lead_assignments_user_id_fkey(name)")
    .eq("assignment_date", date)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const byUser = new Map();
  for (const row of data || []) {
    const uid = row.user_id;
    if (!byUser.has(uid)) byUser.set(uid, { user_id: uid, user_name: row.users?.name || "Unknown", total: 0, done: 0, pending: 0, items: [] });
    const bucket = byUser.get(uid);
    const status = leadStatus(row);
    bucket.total += 1;
    if (status === "done") bucket.done += 1; else bucket.pending += 1;
    bucket.items.push({
      id: row.id, lead: row.leads, call_done: row.call_done, email_done: row.email_done,
      notes: row.notes, status, assigned_at: row.created_at,
    });
  }

  const managers = Array.from(byUser.values()).sort((a, b) => b.total - a.total);
  res.json({ date, managers });
});

router.get("/my-tasks", requireAuth, async (req, res) => {
  const targetUserId = req.user.role === "admin" && req.query.user_id ? req.query.user_id : req.user.userId;
  if (targetUserId !== req.user.userId && !hasPermission(req.user, "tasks")) {
    return res.status(403).json({ error: "You don't have access to this section" });
  }

  const { data, error } = await supabase
    .from("lead_assignments")
    .select("*, leads(full_name, designation, company_name, company_domain, linkedin_url, email, phone, custom_fields)")
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });

  const pending = [], completed = [];
  for (const row of data || []) {
    const status = leadStatus(row);
    const item = {
      id: row.id, lead: row.leads, call_done: row.call_done, email_done: row.email_done,
      notes: row.notes, status, assignment_date: row.assignment_date, updated_at: row.updated_at,
    };
    (status === "done" ? completed : pending).push(item);
  }
  completed.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  res.json({ pending, completed });
});

router.patch("/assignments/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("lead_assignments").select("id, user_id, lead_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (existing.user_id !== req.user.userId && !hasPermission(req.user, "tasks")) {
    return res.status(403).json({ error: "Not allowed" });
  }

  const { call_done, email_done, notes } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (call_done !== undefined) updates.call_done = !!call_done;
  if (email_done !== undefined) updates.email_done = !!email_done;
  if (notes !== undefined) updates.notes = notes?.trim() || null;

  const { data, error } = await supabase
    .from("lead_assignments").update(updates).eq("id", req.params.id)
    .select("*, leads(full_name, designation, company_name, company_domain, linkedin_url, email, phone, custom_fields)").single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "UPDATE_LEAD_TASK", target_type: "lead_assignment", target_id: req.params.id,
    metadata: { lead_id: existing.lead_id, call_done: data.call_done, email_done: data.email_done },
  });

  res.json({ id: data.id, lead: data.leads, call_done: data.call_done, email_done: data.email_done, notes: data.notes, status: leadStatus(data) });
});

module.exports = router;
