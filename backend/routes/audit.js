const router = require("express").Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");
const { requirePermission } = require("../utils/permissions");

// Login logs
router.get("/login-logs", requireAuth, requirePermission("logs"), async (req, res) => {
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
router.get("/sessions", requireAuth, requirePermission("sessions"), async (_req, res) => {
  const { data } = await supabase
    .from("sessions")
    .select("*, users(name, email, role)")
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .order("login_time", { ascending: false });
  res.json(data || []);
});

// Terminate a session
router.delete("/sessions/:id", requireAuth, requirePermission("sessions"), async (req, res) => {
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
router.get("/suspicious", requireAuth, requirePermission("suspicious"), async (req, res) => {
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
router.get("/trail", requireAuth, requirePermission("logs"), async (req, res) => {
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

// Live feed: who logged what work, grouped by account manager, for one day.
const FEED_ACTIONS = [
  "CREATE_APPLICATION", "CREATE_OUTREACH", "CREATE_VENDOR_ACTIVITY",
  "CREATE_LINKEDIN_PROFILE", "UPLOAD_RESUME", "CREATE_TICKET", "SET_DAILY_NOTE",
];
const VA_VERBS = { cold_email: "cold email", vendor_call: "vendor call", tech_screening: "tech screening", interview: "interview", offer: "offer" };
const FEED_CATEGORY = {
  CREATE_APPLICATION: "applications", CREATE_OUTREACH: "outreach",
  CREATE_LINKEDIN_PROFILE: "linkedin", UPLOAD_RESUME: "resumes",
  CREATE_TICKET: "tickets", SET_DAILY_NOTE: "notes",
};
function describeFeedEvent(row) {
  const m = row.metadata || {};
  if (row.action === "CREATE_VENDOR_ACTIVITY") {
    const type = m.activity_type || "activity";
    return { category: type, label: `Logged a ${VA_VERBS[type] || type} with ${m.vendor_company || "a vendor"}` };
  }
  switch (row.action) {
    case "CREATE_APPLICATION":      return { category: "applications", label: `Applied to ${m.job_title || "a role"}` };
    case "CREATE_OUTREACH":         return { category: "outreach", label: `Logged inbound requirement from ${m.vendor_company || "a vendor"}` };
    case "CREATE_LINKEDIN_PROFILE": return { category: "linkedin", label: `Added LinkedIn profile: ${m.title || "untitled"}` };
    case "UPLOAD_RESUME":           return { category: "resumes", label: `Uploaded resume: ${m.title || "untitled"}` };
    case "CREATE_TICKET":           return { category: "tickets", label: `Raised a support ticket: ${m.subject || "untitled"}` };
    case "SET_DAILY_NOTE":          return { category: "notes", label: "Logged today's blocker note" };
    default:                        return { category: FEED_CATEGORY[row.action] || "other", label: row.action };
  }
}

router.get("/feed", requireAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required" });

  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : new Date().toISOString().slice(0, 10);
  const start = `${date}T00:00:00.000Z`;
  const end = new Date(new Date(start).getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .in("action", FEED_ACTIONS)
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const byUser = new Map();
  for (const row of data || []) {
    const uid = row.actor_id || "unknown";
    if (!byUser.has(uid)) byUser.set(uid, { user_id: uid, user_name: row.actor_name || "Unknown", total: 0, counts: {}, events: [] });
    const bucket = byUser.get(uid);
    const { category, label } = describeFeedEvent(row);

    bucket.total += 1;
    bucket.counts[category] = (bucket.counts[category] || 0) + 1;
    bucket.events.push({ id: row.id, time: row.created_at, category, label });
  }

  const managers = Array.from(byUser.values()).sort((a, b) => b.total - a.total);
  res.json({ date, managers });
});

module.exports = router;
