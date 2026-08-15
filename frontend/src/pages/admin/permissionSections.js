// Canonical list of Admin Panel sections an admin's access can be scoped
// to. Keys must match backend/utils/permissions.js PERMISSION_KEYS exactly.
export const PERMISSION_SECTIONS = [
  { key: "sessions",     label: "Active Sessions" },
  { key: "logs",         label: "Login Logs" },
  { key: "analytics",    label: "Usage Analytics" },
  { key: "traffic",      label: "Site Traffic" },
  { key: "suspicious",   label: "Suspicious Activity" },
  { key: "users",        label: "Users" },
  { key: "portals",      label: "Portals" },
  { key: "passwords",    label: "Reset Passwords" },
  { key: "applications", label: "Applications" },
  { key: "outreach",     label: "Inbound Requirements" },
  { key: "activities",   label: "Vendor Activities" },
  { key: "tasks",        label: "Daily Tasks" },
  { key: "notes",        label: "Daily Notes" },
  { key: "linkedin",     label: "LinkedIn Profiles" },
  { key: "resumes",      label: "Resumes" },
  { key: "support",      label: "Support Tickets" },
];

// null/undefined permissions = unrestricted (full admin) — matches backend.
export function hasPermission(user, key) {
  if (user?.role !== "admin") return false;
  if (user.permissions === null || user.permissions === undefined) return true;
  return Array.isArray(user.permissions) && user.permissions.includes(key);
}
