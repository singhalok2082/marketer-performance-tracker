const router = require("express").Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");

function canModify(req, row) {
  return req.user.role === "admin" || row.user_id === req.user.userId;
}

router.get("/", requireAuth, async (req, res) => {
  let query = supabase
    .from("job_descriptions")
    .select("*, users(name)")
    .order("jd_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (req.user.role === "admin") {
    if (req.query.user_id) query = query.eq("user_id", req.query.user_id);
  } else {
    query = query.eq("user_id", req.user.userId);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data || []).map(({ users, ...row }) => ({ ...row, user_name: users?.name || null })));
});

router.post("/", requireAuth, async (req, res) => {
  const { designation, location, action, jd_date, jd_text, notes } = req.body;
  if (!designation?.trim()) return res.status(400).json({ error: "Designation is required" });

  const { data, error } = await supabase
    .from("job_descriptions")
    .insert({
      user_id: req.user.userId,
      designation: designation.trim(),
      location: location?.trim() || null,
      action: action || "Created",
      jd_date: jd_date || undefined,
      jd_text: jd_text?.trim() || null,
      notes: notes?.trim() || null,
    })
    .select("*, users(name)")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "CREATE_JOB_DESCRIPTION", target_type: "job_description", target_id: data.id,
    metadata: { designation: data.designation },
  });

  const { users, ...row } = data;
  res.status(201).json({ ...row, user_name: users?.name || null });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("job_descriptions").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  const { designation, location, action, jd_date, jd_text, notes } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (designation !== undefined) updates.designation = designation.trim();
  if (location !== undefined) updates.location = location?.trim() || null;
  if (action !== undefined) updates.action = action;
  if (jd_date !== undefined) updates.jd_date = jd_date;
  if (jd_text !== undefined) updates.jd_text = jd_text?.trim() || null;
  if (notes !== undefined) updates.notes = notes?.trim() || null;

  const { data, error } = await supabase
    .from("job_descriptions").update(updates).eq("id", req.params.id)
    .select("*, users(name)").single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "UPDATE_JOB_DESCRIPTION", target_type: "job_description", target_id: req.params.id, metadata: updates,
  });

  const { users, ...row } = data;
  res.json({ ...row, user_name: users?.name || null });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("job_descriptions").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  await supabase.from("job_descriptions").delete().eq("id", req.params.id);

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "DELETE_JOB_DESCRIPTION", target_type: "job_description", target_id: req.params.id,
  });

  res.json({ ok: true });
});

module.exports = router;
