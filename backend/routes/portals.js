const router = require("express").Router();
const supabase = require("../db/supabase");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.get("/", requireAuth, async (_req, res) => {
  const { data } = await supabase.from("portals").select("*").order("name");
  res.json(data || []);
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { name, url } = req.body;
  if (!name) return res.status(400).json({ error: "Portal name required" });

  const { data, error } = await supabase
    .from("portals")
    .insert({ name: name.trim(), url: url?.trim() || null })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "CREATE_PORTAL", target_type: "portal", target_id: data.id,
    metadata: { name: data.name, url: data.url },
  });

  res.status(201).json(data);
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { name, url, is_active } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (url !== undefined) updates.url = url?.trim() || null;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase.from("portals").update(updates).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "UPDATE_PORTAL", target_type: "portal", target_id: req.params.id, metadata: updates,
  });

  res.json(data);
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  await supabase.from("portals").update({ is_active: false }).eq("id", req.params.id);

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "DELETE_PORTAL", target_type: "portal", target_id: req.params.id,
  });

  res.json({ ok: true });
});

module.exports = router;
