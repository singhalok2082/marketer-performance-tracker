const router = require("express").Router();
const supabase = require("../db/supabase");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// Login logs
router.get("/login-logs", requireAuth, requireAdmin, async (req, res) => {
  const { page = 1, limit = 50, userId, status } = req.query;
  const from = (page - 1) * limit;
  const to = from + Number(limit) - 1;

  let q = supabase
    .from("login_logs")
    .select("*, users(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (userId) q = q.eq("user_id", userId);
  if (status) q = q.eq("status", status);

  const { data, count, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data: data || [], total: count || 0, page: Number(page), limit: Number(limit) });
});

// Active sessions
router.get("/sessions", requireAuth, requireAdmin, async (_req, res) => {
  const { data } = await supabase
    .from("sessions")
    .select("*, users(name, email, role)")
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .order("login_time", { ascending: false });
  res.json(data || []);
});

// Terminate a session
router.delete("/sessions/:id", requireAuth, requireAdmin, async (req, res) => {
  const { data: session } = await supabase.from("sessions").select("user_id, session_id").eq("id", req.params.id).single();
  await supabase.from("sessions").update({ is_active: false }).eq("id", req.params.id);

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "TERMINATE_SESSION", target_type: "session", target_id: req.params.id,
    metadata: { terminated_user_id: session?.user_id },
  });

  res.json({ ok: true });
});

// Suspicious activity
router.get("/suspicious", requireAuth, requireAdmin, async (req, res) => {
  const { limit = 100 } = req.query;
  const { data } = await supabase
    .from("login_logs")
    .select("*, users(name)")
    .eq("status", "suspicious")
    .order("created_at", { ascending: false })
    .limit(Number(limit));
  res.json(data || []);
});

// General audit trail
router.get("/trail", requireAuth, requireAdmin, async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const from = (page - 1) * limit;
  const to = from + Number(limit) - 1;

  const { data, count } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  res.json({ data: data || [], total: count || 0 });
});

module.exports = router;
