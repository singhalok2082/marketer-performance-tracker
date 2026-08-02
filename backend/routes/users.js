const router = require("express").Router();
const bcrypt = require("bcryptjs");
const supabase = require("../db/supabase");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { PERMISSION_KEYS, requirePermission } = require("../utils/permissions");

function validatePermissions(permissions) {
  if (permissions === undefined || permissions === null) return { ok: true, value: null };
  if (!Array.isArray(permissions) || !permissions.every(p => PERMISSION_KEYS.includes(p))) {
    return { ok: false };
  }
  return { ok: true, value: permissions };
}

// GET /api/users – list all users (admin) or public list for landing page
router.get("/public", async (_req, res) => {
  const { data } = await supabase
    .from("users")
    .select("id, name, email, role, is_active")
    .eq("role", "account_manager")
    .eq("is_active", true)
    .order("name");
  res.json(data || []);
});

router.get("/", requireAuth, requirePermission("users"), async (_req, res) => {
  const { data } = await supabase
    .from("users")
    .select("id, name, email, role, is_active, must_change_password, permissions, created_at")
    .order("role")
    .order("name");
  res.json(data || []);
});

// POST /api/users – add new user (account manager, or admin — optionally scoped — if role is specified)
router.post("/", requireAuth, requirePermission("users"), async (req, res) => {
  const { name, email, password, role, permissions } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Name and email required" });
  if (role !== undefined && !["account_manager", "admin"].includes(role)) {
    return res.status(400).json({ error: "Role must be account_manager or admin" });
  }
  const permCheck = validatePermissions(permissions);
  if (!permCheck.ok) return res.status(400).json({ error: "Invalid permissions list" });

  const pw = password || "ConsultAdd@2024";
  const hash = await bcrypt.hash(pw, 12);

  const { data, error } = await supabase
    .from("users")
    .insert({
      name: name.trim(), email: email.toLowerCase().trim(), role: role || "account_manager",
      password_hash: hash, must_change_password: true,
      permissions: role === "admin" ? permCheck.value : null,
    })
    .select("id, name, email, role, is_active, permissions, created_at")
    .single();

  if (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Email already exists" });
    return res.status(500).json({ error: error.message });
  }

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId,
    actor_name: req.user.name,
    action: "CREATE_USER",
    target_type: "user",
    target_id: data.id,
    metadata: { name: data.name, email: data.email, role: data.role, permissions: data.permissions },
  });

  res.status(201).json(data);
});

// PATCH /api/users/:id – update name / active status / role / permissions
router.patch("/:id", requireAuth, requirePermission("users"), async (req, res) => {
  const { name, is_active, role, permissions } = req.body;
  if (role !== undefined) {
    if (!["account_manager", "admin"].includes(role)) {
      return res.status(400).json({ error: "Role must be account_manager or admin" });
    }
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: "Can't change your own role — have another admin do it" });
    }
  }
  const permCheck = validatePermissions(permissions);
  if (!permCheck.ok) return res.status(400).json({ error: "Invalid permissions list" });
  if (permissions !== undefined && req.params.id === req.user.userId) {
    return res.status(400).json({ error: "Can't change your own access — have another admin do it" });
  }

  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (is_active !== undefined) updates.is_active = is_active;
  if (role !== undefined) {
    updates.role = role;
    // Demoting to account manager always clears any leftover permission scoping
    if (role === "account_manager") updates.permissions = null;
  }
  if (permissions !== undefined) updates.permissions = permCheck.value;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", req.params.id)
    .select("id, name, email, role, is_active, permissions")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId,
    actor_name: req.user.name,
    action: "UPDATE_USER",
    target_type: "user",
    target_id: req.params.id,
    metadata: updates,
  });

  res.json(data);
});

// DELETE /api/users/:id – deactivate (soft delete)
router.delete("/:id", requireAuth, requirePermission("users"), async (req, res) => {
  if (req.params.id === req.user.userId) return res.status(400).json({ error: "Cannot deactivate yourself" });

  const { data } = await supabase.from("users").select("name, email").eq("id", req.params.id).single();

  await supabase.from("users").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", req.params.id);
  await supabase.from("sessions").update({ is_active: false }).eq("user_id", req.params.id);

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId,
    actor_name: req.user.name,
    action: "DEACTIVATE_USER",
    target_type: "user",
    target_id: req.params.id,
    metadata: data,
  });

  res.json({ ok: true });
});

// POST /api/users/:id/reset-password – admin resets any user's password
router.post("/:id/reset-password", requireAuth, requirePermission("passwords"), async (req, res) => {
  const { newPassword } = req.body;
  const pw = newPassword || "ConsultAdd@2024";
  if (pw.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const hash = await bcrypt.hash(pw, 12);
  const { data: user } = await supabase.from("users").select("name, email").eq("id", req.params.id).single();

  await supabase.from("users").update({ password_hash: hash, must_change_password: true, updated_at: new Date().toISOString() }).eq("id", req.params.id);
  // Revoke all sessions
  await supabase.from("sessions").update({ is_active: false }).eq("user_id", req.params.id);

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId,
    actor_name: req.user.name,
    action: "RESET_PASSWORD",
    target_type: "user",
    target_id: req.params.id,
    metadata: { email: user?.email },
  });

  res.json({ ok: true, message: `Password reset. Temporary password: ${pw}` });
});

module.exports = router;
