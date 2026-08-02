const router = require("express").Router();
const geoip = require("geoip-lite");
const supabase = require("../db/supabase");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { requirePermission } = require("../utils/permissions");
const { getRealIp, getCountry, parseUserAgent } = require("../utils/parseUA");

// POST /api/analytics/track — public, fire-and-forget landing-page visit log
router.post("/track", async (req, res) => {
  res.status(204).end(); // respond immediately; the beacon call doesn't wait on this

  try {
    const ip = getRealIp(req);
    const ua = req.get("user-agent") || "";
    const { browser, os, device } = parseUserAgent(ua);
    const geo = geoip.lookup(ip);

    await supabase.from("page_visits").insert({
      path: (req.body?.path || "/").slice(0, 200),
      ip_address: ip,
      country: getCountry(ip),
      city: geo?.city || null,
      referrer: req.get("referer")?.slice(0, 300) || null,
      browser, os, device,
    });
  } catch {
    // best-effort logging only — never let this affect the visitor's page load
  }
});

// GET /api/analytics/visits — admin: traffic summary + recent visits
router.get("/visits", requireAuth, requirePermission("traffic"), async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [totalRes, todayRes, weekRes, recentRes] = await Promise.all([
    supabase.from("page_visits").select("*", { count: "exact", head: true }),
    supabase.from("page_visits").select("*", { count: "exact", head: true }).gte("created_at", today),
    supabase.from("page_visits").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("page_visits").select("*").order("created_at", { ascending: false }).limit(500),
  ]);

  const recent = recentRes.data || [];
  const uniqueIps = new Set(recent.map(v => v.ip_address)).size;
  const byCountry = {};
  recent.forEach(v => { const c = v.country || "Unknown"; byCountry[c] = (byCountry[c] || 0) + 1; });

  res.json({
    total: totalRes.count || 0,
    today: todayRes.count || 0,
    week: weekRes.count || 0,
    uniqueRecentVisitors: uniqueIps,
    byCountry: Object.entries(byCountry).sort((a, b) => b[1] - a[1]).map(([country, count]) => ({ country, count })),
    recent: recent.slice(0, 100),
  });
});

// GET /api/analytics/usage?range=daily|weekly|monthly
router.get("/usage", requireAuth, requirePermission("analytics"), async (req, res) => {
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
