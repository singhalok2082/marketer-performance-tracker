const router = require("express").Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");

router.get("/", requireAuth, async (req, res) => {
  let query = supabase
    .from("daily_notes")
    .select("*, users(name)")
    .order("note_date", { ascending: false });

  if (req.user.role === "admin") {
    if (req.query.user_id) query = query.eq("user_id", req.query.user_id);
  } else {
    query = query.eq("user_id", req.user.userId);
  }
  if (req.query.start) query = query.gte("note_date", req.query.start);
  if (req.query.end) query = query.lte("note_date", req.query.end);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data || []).map(({ users, ...row }) => ({ ...row, user_name: users?.name || null })));
});

// Upsert-by-date: one call sets (or replaces) the note for a given day (default today)
router.put("/", requireAuth, async (req, res) => {
  const { note_date, challenge_text } = req.body;
  const date = note_date || new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_notes")
    .upsert(
      { user_id: req.user.userId, note_date: date, challenge_text: challenge_text?.trim() || null, updated_at: new Date().toISOString() },
      { onConflict: "user_id,note_date" }
    )
    .select("*, users(name)")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "SET_DAILY_NOTE", target_type: "daily_note", target_id: data.id,
    metadata: { note_date: date },
  });

  const { users, ...row } = data;
  res.json({ ...row, user_name: users?.name || null });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("daily_notes").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (req.user.role !== "admin" && existing.user_id !== req.user.userId) {
    return res.status(403).json({ error: "Not allowed" });
  }

  await supabase.from("daily_notes").delete().eq("id", req.params.id);
  res.json({ ok: true });
});

module.exports = router;
