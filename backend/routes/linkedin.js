const router = require("express").Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");

function canModify(req, row) {
  return req.user.role === "admin" || row.user_id === req.user.userId;
}

router.get("/", requireAuth, async (req, res) => {
  let query = supabase
    .from("linkedin_profiles")
    .select("*, users(name)")
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
  const { linkedin_url, title, location, connections } = req.body;
  if (!linkedin_url?.trim() || !title?.trim()) {
    return res.status(400).json({ error: "LinkedIn URL and title are required" });
  }

  const { data, error } = await supabase
    .from("linkedin_profiles")
    .insert({
      user_id: req.user.userId,
      linkedin_url: linkedin_url.trim(),
      title: title.trim(),
      location: location?.trim() || null,
      connections: Number.isFinite(+connections) ? +connections : 0,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "CREATE_LINKEDIN_PROFILE", target_type: "linkedin_profile", target_id: data.id,
    metadata: { title: data.title },
  });

  res.status(201).json(data);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("linkedin_profiles").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  const { linkedin_url, title, location, connections } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (linkedin_url !== undefined) updates.linkedin_url = linkedin_url.trim();
  if (title !== undefined) updates.title = title.trim();
  if (location !== undefined) updates.location = location?.trim() || null;
  if (connections !== undefined) updates.connections = Number.isFinite(+connections) ? +connections : 0;

  const { data, error } = await supabase
    .from("linkedin_profiles").update(updates).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "UPDATE_LINKEDIN_PROFILE", target_type: "linkedin_profile", target_id: req.params.id, metadata: updates,
  });

  res.json(data);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("linkedin_profiles").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  await supabase.from("linkedin_profiles").delete().eq("id", req.params.id);

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "DELETE_LINKEDIN_PROFILE", target_type: "linkedin_profile", target_id: req.params.id,
  });

  res.json({ ok: true });
});

module.exports = router;
