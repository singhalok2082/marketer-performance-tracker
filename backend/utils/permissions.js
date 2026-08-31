// Admin Panel sections an admin's access can be scoped to. Keys match the
// AdminDashboard sidebar tab ids on the frontend.
const PERMISSION_KEYS = [
  "sessions", "logs", "analytics", "traffic", "suspicious",
  "users", "portals", "passwords",
  "applications", "outreach", "activities", "tasks", "notes", "linkedin", "resumes", "support", "bench",
];

// null/undefined permissions on the user record = unrestricted (full admin).
// A JSON array = only those keys.
function hasPermission(user, key) {
  if (user?.role !== "admin") return false;
  if (user.permissions === null || user.permissions === undefined) return true;
  return Array.isArray(user.permissions) && user.permissions.includes(key);
}

function requirePermission(key) {
  return (req, res, next) => {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    if (!hasPermission(req.user, key)) {
      return res.status(403).json({ error: "You don't have access to this section" });
    }
    next();
  };
}

module.exports = { PERMISSION_KEYS, hasPermission, requirePermission };
