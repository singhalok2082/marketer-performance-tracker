const router = require("express").Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");

function canModify(req, row) {
  return req.user.role === "admin" || row.user_id === req.user.userId;
}

router.get("/", requireAuth, async (req, res) => {
  let query = supabase
    .from("recruiter_outreach")
    .select("*, users(name)")
    .order("contacted_date", { ascending: false });

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
  const { channel, employment_type, vendor_company, job_role, contacted_date, notes } = req.body;

  const { data, error } = await supabase
    .from("recruiter_outreach")
    .insert({
      user_id: req.user.userId,
      channel: channel || null,
      employment_type: employment_type || null,
      vendor_company: vendor_company?.trim() || null,
      job_role: job_role?.trim() || null,
      contacted_date: contacted_date || undefined,
      notes: notes?.trim() || null,
    })
    .select("*, users(name)")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "CREATE_OUTREACH", target_type: "recruiter_outreach", target_id: data.id,
    metadata: { vendor_company: data.vendor_company },
  });

  const { users, ...row } = data;
  res.status(201).json({ ...row, user_name: users?.name || null });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("recruiter_outreach").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  const { channel, employment_type, vendor_company, job_role, contacted_date, notes } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (channel !== undefined) updates.channel = channel || null;
  if (employment_type !== undefined) updates.employment_type = employment_type || null;
  if (vendor_company !== undefined) updates.vendor_company = vendor_company?.trim() || null;
  if (job_role !== undefined) updates.job_role = job_role?.trim() || null;
  if (contacted_date !== undefined) updates.contacted_date = contacted_date;
  if (notes !== undefined) updates.notes = notes?.trim() || null;

  const { data, error } = await supabase
    .from("recruiter_outreach").update(updates).eq("id", req.params.id)
    .select("*, users(name)").single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "UPDATE_OUTREACH", target_type: "recruiter_outreach", target_id: req.params.id, metadata: updates,
  });

  const { users, ...row } = data;
  res.json({ ...row, user_name: users?.name || null });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("recruiter_outreach").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  await supabase.from("recruiter_outreach").delete().eq("id", req.params.id);

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "DELETE_OUTREACH", target_type: "recruiter_outreach", target_id: req.params.id,
  });

  res.json({ ok: true });
});

module.exports = router;
