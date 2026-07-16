const router = require("express").Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");

function canModify(req, row) {
  return req.user.role === "admin" || row.user_id === req.user.userId;
}

router.get("/", requireAuth, async (req, res) => {
  let query = supabase
    .from("job_applications")
    .select("*, users(name), portals(name), resumes(title)")
    .order("applied_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (req.user.role === "admin") {
    if (req.query.user_id) query = query.eq("user_id", req.query.user_id);
  } else {
    query = query.eq("user_id", req.user.userId);
  }
  if (req.query.start) query = query.gte("applied_date", req.query.start);
  if (req.query.end) query = query.lte("applied_date", req.query.end);
  if (req.query.portal_id) query = query.eq("portal_id", req.query.portal_id);
  if (req.query.status) query = query.eq("status", req.query.status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data || []).map(({ users, portals, resumes, ...row }) => ({
    ...row,
    user_name: users?.name || null,
    portal_name: portals?.name || null,
    resume_title: resumes?.title || null,
  })));
});

router.post("/", requireAuth, async (req, res) => {
  const { portal_id, job_url, job_title, candidate_info, job_description, resume_id, applied_date, status } = req.body;
  if (!job_title?.trim()) return res.status(400).json({ error: "Job title is required" });

  const { data, error } = await supabase
    .from("job_applications")
    .insert({
      user_id: req.user.userId,
      portal_id: portal_id || null,
      job_url: job_url?.trim() || null,
      job_title: job_title.trim(),
      candidate_info: candidate_info?.trim() || null,
      job_description: job_description?.trim() || null,
      resume_id: resume_id || null,
      applied_date: applied_date || undefined,
      status: status || undefined,
    })
    .select("*, users(name), portals(name), resumes(title)")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "CREATE_APPLICATION", target_type: "job_application", target_id: data.id,
    metadata: { job_title: data.job_title },
  });

  const { users, portals, resumes, ...row } = data;
  res.status(201).json({ ...row, user_name: users?.name || null, portal_name: portals?.name || null, resume_title: resumes?.title || null });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("job_applications").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  const { portal_id, job_url, job_title, candidate_info, job_description, resume_id, applied_date, status } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (portal_id !== undefined) updates.portal_id = portal_id || null;
  if (job_url !== undefined) updates.job_url = job_url?.trim() || null;
  if (job_title !== undefined) updates.job_title = job_title.trim();
  if (candidate_info !== undefined) updates.candidate_info = candidate_info?.trim() || null;
  if (job_description !== undefined) updates.job_description = job_description?.trim() || null;
  if (resume_id !== undefined) updates.resume_id = resume_id || null;
  if (applied_date !== undefined) updates.applied_date = applied_date;
  if (status !== undefined) updates.status = status;

  const { data, error } = await supabase
    .from("job_applications").update(updates).eq("id", req.params.id)
    .select("*, users(name), portals(name), resumes(title)").single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "UPDATE_APPLICATION", target_type: "job_application", target_id: req.params.id, metadata: updates,
  });

  const { users, portals, resumes, ...row } = data;
  res.json({ ...row, user_name: users?.name || null, portal_name: portals?.name || null, resume_title: resumes?.title || null });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("job_applications").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  await supabase.from("job_applications").delete().eq("id", req.params.id);

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "DELETE_APPLICATION", target_type: "job_application", target_id: req.params.id,
  });

  res.json({ ok: true });
});

module.exports = router;
