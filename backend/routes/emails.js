const router = require("express").Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");
const { resolvePortalIds } = require("../utils/resolvePortals");

function canModify(req, row) {
  return req.user.role === "admin" || row.user_id === req.user.userId;
}

function flatten({ users, resumes, email_portals, ...row }) {
  return {
    ...row,
    user_name: users?.name || null,
    resume_title: resumes?.title || null,
    resume_tech_stack: resumes?.tech_stack || null,
    resume_google_drive_link: resumes?.google_drive_link || null,
    portals: (email_portals || []).map(ep => ep.portals).filter(Boolean),
  };
}

const SELECT =
  "*, users(name), resumes(title, tech_stack, google_drive_link), email_portals(portals(id, name))";

router.get("/", requireAuth, async (req, res) => {
  let query = supabase.from("emails").select(SELECT).order("created_at", { ascending: false });

  if (req.user.role === "admin") {
    if (req.query.user_id) query = query.eq("user_id", req.query.user_id);
  } else {
    query = query.eq("user_id", req.user.userId);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data || []).map(flatten));
});

router.post("/", requireAuth, async (req, res) => {
  const { email_address, resume_id, portal_ids, custom_portal_names } = req.body;

  if (!email_address?.trim()) return res.status(400).json({ error: "Email address is required" });
  if (!resume_id) return res.status(400).json({ error: "A resume is required" });

  const { data: resume, error: resumeErr } = await supabase
    .from("resumes").select("id, user_id").eq("id", resume_id).single();
  if (resumeErr || !resume) return res.status(404).json({ error: "Resume not found" });
  if (resume.user_id !== req.user.userId && req.user.role !== "admin") {
    return res.status(403).json({ error: "Not allowed to use this resume" });
  }

  let portalIds;
  try {
    portalIds = await resolvePortalIds(supabase, portal_ids, custom_portal_names);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { data: email, error: insertErr } = await supabase
    .from("emails")
    .insert({ user_id: req.user.userId, email_address: email_address.trim(), resume_id })
    .select()
    .single();
  if (insertErr) return res.status(500).json({ error: insertErr.message });

  if (portalIds.length) {
    const { error: joinErr } = await supabase
      .from("email_portals")
      .insert(portalIds.map(portal_id => ({ email_id: email.id, portal_id })));
    if (joinErr) {
      await supabase.from("emails").delete().eq("id", email.id);
      return res.status(500).json({ error: joinErr.message });
    }
  }

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "CREATE_EMAIL", target_type: "email", target_id: email.id,
    metadata: { email_address: email.email_address },
  });

  const { data: full, error: fetchErr } = await supabase.from("emails").select(SELECT).eq("id", email.id).single();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  res.status(201).json(flatten(full));
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("emails").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  const { email_address, resume_id, portal_ids, custom_portal_names } = req.body;

  if (resume_id !== undefined) {
    const { data: resume, error: resumeErr } = await supabase
      .from("resumes").select("id, user_id").eq("id", resume_id).single();
    if (resumeErr || !resume) return res.status(404).json({ error: "Resume not found" });
    if (resume.user_id !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not allowed to use this resume" });
    }
  }

  const updates = { updated_at: new Date().toISOString() };
  if (email_address !== undefined) updates.email_address = email_address.trim();
  if (resume_id !== undefined) updates.resume_id = resume_id;

  const { error: updateErr } = await supabase.from("emails").update(updates).eq("id", req.params.id);
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  if (portal_ids !== undefined || custom_portal_names !== undefined) {
    let portalIds;
    try {
      portalIds = await resolvePortalIds(supabase, portal_ids, custom_portal_names);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }

    const { data: existingLinks } = await supabase
      .from("email_portals").select("portal_id").eq("email_id", req.params.id);

    await supabase.from("email_portals").delete().eq("email_id", req.params.id);
    if (portalIds.length) {
      const { error: joinErr } = await supabase
        .from("email_portals")
        .insert(portalIds.map(portal_id => ({ email_id: req.params.id, portal_id })));
      if (joinErr) {
        if (existingLinks?.length) {
          await supabase.from("email_portals")
            .insert(existingLinks.map(l => ({ email_id: req.params.id, portal_id: l.portal_id })));
        }
        return res.status(500).json({ error: joinErr.message });
      }
    }
  }

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "UPDATE_EMAIL", target_type: "email", target_id: req.params.id, metadata: updates,
  });

  const { data: full, error: fetchErr } = await supabase.from("emails").select(SELECT).eq("id", req.params.id).single();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  res.json(flatten(full));
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("emails").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  await supabase.from("emails").delete().eq("id", req.params.id);

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "DELETE_EMAIL", target_type: "email", target_id: req.params.id,
  });

  res.json({ ok: true });
});

module.exports = router;
