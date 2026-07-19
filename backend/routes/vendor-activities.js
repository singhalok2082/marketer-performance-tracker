const router = require("express").Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");

const TYPES = ["cold_email", "vendor_call", "tech_screening", "interview", "offer"];

function canModify(req, row) {
  return req.user.role === "admin" || row.user_id === req.user.userId;
}

function pickFields(body) {
  const {
    activity_type, vendor_name, vendor_company, client_name, candidate_name,
    employment_type, job_title, jd_text, rate_usd, duration_minutes,
    activity_date, notes, application_id,
  } = body;
  return {
    activity_type, vendor_name, vendor_company, client_name, candidate_name,
    employment_type, job_title, jd_text, rate_usd, duration_minutes,
    activity_date, notes, application_id,
  };
}

router.get("/", requireAuth, async (req, res) => {
  let query = supabase
    .from("vendor_activities")
    .select("*, users(name)")
    .order("activity_date", { ascending: false });

  if (req.user.role === "admin") {
    if (req.query.user_id) query = query.eq("user_id", req.query.user_id);
  } else {
    query = query.eq("user_id", req.user.userId);
  }
  if (req.query.type) query = query.eq("activity_type", req.query.type);
  if (req.query.start) query = query.gte("activity_date", req.query.start);
  if (req.query.end) query = query.lte("activity_date", req.query.end);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data || []).map(({ users, ...row }) => ({ ...row, user_name: users?.name || null })));
});

router.post("/", requireAuth, async (req, res) => {
  const fields = pickFields(req.body);
  if (!TYPES.includes(fields.activity_type)) {
    return res.status(400).json({ error: `activity_type must be one of: ${TYPES.join(", ")}` });
  }

  const { data, error } = await supabase
    .from("vendor_activities")
    .insert({
      user_id: req.user.userId,
      ...fields,
      vendor_company: fields.vendor_company?.trim() || null,
      notes: fields.notes?.trim() || null,
      application_id: fields.application_id || null,
      activity_date: fields.activity_date || undefined,
    })
    .select("*, users(name)")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "CREATE_VENDOR_ACTIVITY", target_type: "vendor_activity", target_id: data.id,
    metadata: { activity_type: data.activity_type, vendor_company: data.vendor_company },
  });

  const { users, ...row } = data;
  res.status(201).json({ ...row, user_name: users?.name || null });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("vendor_activities").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  const fields = pickFields(req.body);
  const updates = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) updates[k] = typeof v === "string" && k !== "activity_type" ? (v.trim() || null) : v;
  }
  if (updates.activity_type && !TYPES.includes(updates.activity_type)) {
    return res.status(400).json({ error: `activity_type must be one of: ${TYPES.join(", ")}` });
  }

  const { data, error } = await supabase
    .from("vendor_activities").update(updates).eq("id", req.params.id)
    .select("*, users(name)").single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "UPDATE_VENDOR_ACTIVITY", target_type: "vendor_activity", target_id: req.params.id, metadata: updates,
  });

  const { users, ...row } = data;
  res.json({ ...row, user_name: users?.name || null });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("vendor_activities").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  await supabase.from("vendor_activities").delete().eq("id", req.params.id);

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "DELETE_VENDOR_ACTIVITY", target_type: "vendor_activity", target_id: req.params.id,
  });

  res.json({ ok: true });
});

module.exports = router;
