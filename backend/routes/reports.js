const router = require("express").Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");
const { requirePermission } = require("../utils/permissions");

const VA_TYPES = ["cold_email", "vendor_call", "tech_screening", "interview", "offer"];
const APP_STATUSES = ["Applied", "Submitted to Client", "Interview Scheduled", "Offer", "Rejected", "No Response"];

// Matches PerformanceDashboard.jsx's isSubmission — kept identical so this
// report and the Overview tab's leaderboard never disagree on what counts.
function isSubmission(status) { return status !== "Applied" && status !== "No Response"; }

// PostgREST caps a single response at 1000 rows by default — this project's
// job_applications table alone has 1000+ rows, so an unpaginated query here
// would silently undercount a report meant to be shared externally.
async function fetchAllRows(table, columns, build) {
  const rows = [];
  const PAGE_SIZE = 1000;
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(supabase.from(table).select(columns)).range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

// Team performance report: applications, vendor activity (cold emails, vendor
// calls, screenings, interviews, offers), and inbound outreach for a date
// range, broken down team-wide and per account manager.
router.get("/team-performance", requireAuth, requirePermission("reports"), async (req, res) => {
  const start = req.query.start || "2000-01-01";
  const end = req.query.end || new Date().toISOString().slice(0, 10);

  let apps, vas, outreach, managers;
  try {
    [managers, apps, vas, outreach] = await Promise.all([
      supabase.from("users").select("id, name").eq("role", "account_manager").eq("is_active", true).then(r => { if (r.error) throw r.error; return r.data || []; }),
      fetchAllRows("job_applications", "id, user_id, status, applied_date", q => q.gte("applied_date", start).lte("applied_date", end)),
      fetchAllRows("vendor_activities", "id, user_id, activity_type, activity_date", q => q.gte("activity_date", start).lte("activity_date", end)),
      fetchAllRows("recruiter_outreach", "id, user_id, contacted_date", q => q.gte("contacted_date", start).lte("contacted_date", end)),
    ]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  const byStatus = {};
  for (const s of APP_STATUSES) byStatus[s] = 0;
  apps.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });

  const byActivityType = {};
  for (const t of VA_TYPES) byActivityType[t] = 0;
  vas.forEach(a => { byActivityType[a.activity_type] = (byActivityType[a.activity_type] || 0) + 1; });

  const managerRow = (id, name) => {
    const mApps = apps.filter(a => a.user_id === id);
    const mVas = vas.filter(a => a.user_id === id);
    const submissions = mApps.filter(a => isSubmission(a.status)).length;
    return {
      user_id: id,
      name,
      applications: mApps.length,
      submissions,
      submissionRate: mApps.length ? Math.round((submissions / mApps.length) * 100) : 0,
      offers: mVas.filter(a => a.activity_type === "offer").length,
      interviews: mVas.filter(a => a.activity_type === "interview").length,
      techScreenings: mVas.filter(a => a.activity_type === "tech_screening").length,
      coldEmails: mVas.filter(a => a.activity_type === "cold_email").length,
      vendorCalls: mVas.filter(a => a.activity_type === "vendor_call").length,
      outreach: outreach.filter(o => o.user_id === id).length,
    };
  };

  // Every active manager appears even with all-zero activity in range — a
  // report that silently omits quiet managers isn't useful for "how is the
  // team performing."
  const byManager = managers.map(m => managerRow(m.id, m.name)).sort((a, b) => b.applications - a.applications);

  const totalSubmissions = apps.filter(a => isSubmission(a.status)).length;
  res.json({
    range: { start, end },
    totals: {
      applications: apps.length,
      submissions: totalSubmissions,
      submissionRate: apps.length ? Math.round((totalSubmissions / apps.length) * 100) : 0,
      offers: byActivityType.offer,
      interviews: byActivityType.interview,
      techScreenings: byActivityType.tech_screening,
      coldEmails: byActivityType.cold_email,
      vendorCalls: byActivityType.vendor_call,
      outreach: outreach.length,
    },
    byStatus,
    byActivityType,
    byManager,
  });
});

module.exports = router;
