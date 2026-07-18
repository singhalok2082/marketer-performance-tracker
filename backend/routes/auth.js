const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const rateLimit = require("express-rate-limit");
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");
const { parseUserAgent, getCountry, getRealIp } = require("../utils/parseUA");
const { checkSuspicious } = require("../utils/suspicious");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: req => getRealIp(req),
});

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const ip = getRealIp(req);
  const ua = req.get("user-agent") || "";
  const { browser, os, device } = parseUserAgent(ua);
  const country = getCountry(ip);

  const { data: users } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  const user = users;

  if (!user) {
    await supabase.from("login_logs").insert({
      email,
      ip_address: ip,
      user_agent: ua,
      browser,
      os,
      device,
      country,
      status: "failed",
    });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    await supabase.from("login_logs").insert({
      user_id: user.id,
      email,
      ip_address: ip,
      user_agent: ua,
      browser,
      os,
      device,
      country,
      status: "failed",
    });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, name: user.name, sessionId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  // Non-fatal — login succeeds even if sessions/login_logs tables aren't created yet
  await supabase.from("sessions").insert({
    user_id: user.id,
    session_id: sessionId,
    ip_address: ip,
    user_agent: ua,
    device,
    browser,
    os,
    expires_at: expiresAt.toISOString(),
  }).then(() => {}).catch(e => console.warn("Session insert skipped:", e.message));

  await supabase.from("login_logs").insert({
    user_id: user.id,
    email,
    ip_address: ip,
    user_agent: ua,
    browser,
    os,
    device,
    country,
    status: "success",
  }).then(() => {}).catch(e => console.warn("Login log skipped:", e.message));

  const isProd = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  });
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
});

router.post("/logout", requireAuth, async (req, res) => {
  await supabase.from("sessions").update({ is_active: false }).eq("session_id", req.user.sessionId);
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("token", { sameSite: isProd ? "none" : "lax", secure: isProd });
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, role, must_change_password, created_at")
    .eq("id", req.user.userId)
    .single();
  res.json(user || req.user);
});

router.post("/change-password", requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: "Passwords required" });

  const { data: user } = await supabase.from("users").select("*").eq("id", req.user.userId).single();

  const match = await bcrypt.compare(oldPassword, user.password_hash);
  if (!match) return res.status(401).json({ error: "Current password incorrect" });

  const newHash = await bcrypt.hash(newPassword, 10);
  await supabase.from("users").update({ password_hash: newHash, must_change_password: false }).eq("id", req.user.userId);

  res.json({ ok: true });
});

module.exports = router;
