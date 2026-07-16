const router = require("express").Router();
const supabase = require("../db/supabase");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// GET /api/analytics/usage?range=daily|weekly|monthly
router.get("/usage", requireAuth, requireAdmin, async (req, res) => {
  const { range = "weekly", userId } = req.query;

  let startDate;
  const now = new Date();
  if (range === "daily") startDate = new Date(now); startDate && (startDate.setDate(startDate.getDate() - 1));
  if (range === "weekly") startDate = new Date(now.setDate(now.getDate() - 7));
  if (range === "monthly") startDate = new Date(new Date().setMonth(new Date().getMonth() - 1));

  // Re-init after potential mutation
  const cutoff = new Date();
  if (range === "daily")   cutoff.setDate(cutoff.getDate() - 1);
  if (range === "weekly")  cutoff.setDate(cutoff.getDate() - 7);
  if (range === "monthly") cutoff.setMonth(cutoff.getMonth() - 1);

  let q = supabase
    .from("usage_analytics")
    .select("*, users(name, email)")
    .gte("date", cutoff.toISOString().split("T")[0])
    .order("date", { ascending: false });

  if (userId) q = q.eq("user_id", userId);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  // Aggregate by user
  const byUser = {};
  (data || []).forEach(row => {
    const uid = row.user_id;
    if (!byUser[uid]) {
      byUser[uid] = {
        userId: uid,
        name: row.users?.name || "Unknown",
        email: row.users?.email || "",
        totalMinutes: 0,
        totalLogins: 0,
        days: [],
      };
    }
    byUser[uid].totalMinutes += row.time_spent_minutes || 0;
    byUser[uid].totalLogins  += row.login_count || 0;
    byUser[uid].days.push({ date: row.date, minutes: row.time_spent_minutes, logins: row.login_count });
  });

  res.json(Object.values(byUser).sort((a, b) => b.totalMinutes - a.totalMinutes));
});

// GET /api/analytics/summary – dashboard summary numbers
router.get("/summary", requireAuth, requireAdmin, async (_req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [activeSessions, todayLogins, weekLogins, suspiciousCount] = await Promise.all([
    supabase.from("sessions").select("*", { count: "exact", head: true }).eq("is_active", true).gt("expires_at", new Date().toISOString()),
    supabase.from("login_logs").select("*", { count: "exact", head: true }).eq("status", "success").gte("created_at", today),
    supabase.from("login_logs").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("login_logs").select("*", { count: "exact", head: true }).eq("status", "suspicious").gte("created_at", weekAgo),
  ]);

  res.json({
    activeSessions: activeSessions.count || 0,
    todayLogins: todayLogins.count || 0,
    weekLogins: weekLogins.count || 0,
    suspiciousCount: suspiciousCount.count || 0,
  });
});

module.exports = router;
