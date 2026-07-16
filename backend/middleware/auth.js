const jwt = require("jsonwebtoken");
const supabase = require("../db/supabase");

async function requireAuth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Session DB check — if the sessions table doesn't exist yet (migration pending),
  // fall back to JWT-only validation so login still works.
  try {
    const { data: session, error: dbErr } = await supabase
      .from("sessions")
      .select("id, is_active, expires_at")
      .eq("session_id", payload.sessionId)
      .single();

    if (!dbErr && session) {
      if (!session.is_active || new Date(session.expires_at) < new Date()) {
        return res.status(401).json({ error: "Session expired or revoked" });
      }
      // Fire-and-forget last_activity update
      supabase.from("sessions").update({ last_activity: new Date().toISOString() }).eq("session_id", payload.sessionId).then(() => {});
    }
    // If dbErr (table missing, row missing), fall through — JWT is still valid
  } catch {
    // DB unavailable — trust the JWT alone
  }

  req.user = payload;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
