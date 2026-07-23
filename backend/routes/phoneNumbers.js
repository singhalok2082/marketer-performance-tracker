const router = require("express").Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");
const { resolvePortalIds } = require("../utils/resolvePortals");

function canModify(req, row) {
  return req.user.role === "admin" || row.user_id === req.user.userId;
}

async function validateResumeOwnership(req, res, resume_id) {
  const { data: resume, error } = await supabase
    .from("resumes").select("id, user_id").eq("id", resume_id).single();
  if (error || !resume) {
    res.status(404).json({ error: "Resume not found" });
    return false;
  }
  if (resume.user_id !== req.user.userId && req.user.role !== "admin") {
    res.status(403).json({ error: "Not allowed to use this resume" });
    return false;
  }
  return true;
}

/* ─────────────── Portal usage: "Use of the phone number on different portals" ─────────────── */

function flattenPortalUsage({ users, resumes, phone_portal_usage_portals, ...row }) {
  return {
    ...row,
    user_name: users?.name || null,
    resume_title: resumes?.title || null,
    resume_tech_stack: resumes?.tech_stack || null,
    resume_google_drive_link: resumes?.google_drive_link || null,
    portals: (phone_portal_usage_portals || []).map(p => p.portals).filter(Boolean),
  };
}

const PORTAL_USAGE_SELECT =
  "*, users(name), resumes(title, tech_stack, google_drive_link), phone_portal_usage_portals(portals(id, name))";

router.get("/portal-usage", requireAuth, async (req, res) => {
  let query = supabase.from("phone_portal_usage").select(PORTAL_USAGE_SELECT).order("created_at", { ascending: false });

  if (req.user.role === "admin") {
    if (req.query.user_id) query = query.eq("user_id", req.query.user_id);
  } else {
    query = query.eq("user_id", req.user.userId);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data || []).map(flattenPortalUsage));
});

router.post("/portal-usage", requireAuth, async (req, res) => {
  const { phone_number, resume_id, portal_ids, custom_portal_names } = req.body;

  if (!phone_number?.trim()) return res.status(400).json({ error: "Phone number is required" });
  if (!resume_id) return res.status(400).json({ error: "A resume is required" });
  if (!(await validateResumeOwnership(req, res, resume_id))) return;

  let portalIds;
  try {
    portalIds = await resolvePortalIds(supabase, portal_ids, custom_portal_names);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { data: usage, error: insertErr } = await supabase
    .from("phone_portal_usage")
    .insert({ user_id: req.user.userId, phone_number: phone_number.trim(), resume_id })
    .select()
    .single();
  if (insertErr) return res.status(500).json({ error: insertErr.message });

  if (portalIds.length) {
    const { error: joinErr } = await supabase
      .from("phone_portal_usage_portals")
      .insert(portalIds.map(portal_id => ({ phone_portal_usage_id: usage.id, portal_id })));
    if (joinErr) {
      await supabase.from("phone_portal_usage").delete().eq("id", usage.id);
      return res.status(500).json({ error: joinErr.message });
    }
  }

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "CREATE_PHONE_PORTAL_USAGE", target_type: "phone_portal_usage", target_id: usage.id,
    metadata: { phone_number: usage.phone_number },
  });

  const { data: full, error: fetchErr } = await supabase
    .from("phone_portal_usage").select(PORTAL_USAGE_SELECT).eq("id", usage.id).single();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  res.status(201).json(flattenPortalUsage(full));
});

router.patch("/portal-usage/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("phone_portal_usage").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  const { phone_number, resume_id, portal_ids, custom_portal_names } = req.body;

  if (resume_id !== undefined && !(await validateResumeOwnership(req, res, resume_id))) return;

  const updates = { updated_at: new Date().toISOString() };
  if (phone_number !== undefined) updates.phone_number = phone_number.trim();
  if (resume_id !== undefined) updates.resume_id = resume_id;

  const { error: updateErr } = await supabase.from("phone_portal_usage").update(updates).eq("id", req.params.id);
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  if (portal_ids !== undefined || custom_portal_names !== undefined) {
    let portalIds;
    try {
      portalIds = await resolvePortalIds(supabase, portal_ids, custom_portal_names);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }

    const { data: existingLinks } = await supabase
      .from("phone_portal_usage_portals").select("portal_id").eq("phone_portal_usage_id", req.params.id);

    await supabase.from("phone_portal_usage_portals").delete().eq("phone_portal_usage_id", req.params.id);
    if (portalIds.length) {
      const { error: joinErr } = await supabase
        .from("phone_portal_usage_portals")
        .insert(portalIds.map(portal_id => ({ phone_portal_usage_id: req.params.id, portal_id })));
      if (joinErr) {
        if (existingLinks?.length) {
          await supabase.from("phone_portal_usage_portals")
            .insert(existingLinks.map(l => ({ phone_portal_usage_id: req.params.id, portal_id: l.portal_id })));
        }
        return res.status(500).json({ error: joinErr.message });
      }
    }
  }

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "UPDATE_PHONE_PORTAL_USAGE", target_type: "phone_portal_usage", target_id: req.params.id, metadata: updates,
  });

  const { data: full, error: fetchErr } = await supabase
    .from("phone_portal_usage").select(PORTAL_USAGE_SELECT).eq("id", req.params.id).single();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  res.json(flattenPortalUsage(full));
});

router.delete("/portal-usage/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("phone_portal_usage").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  await supabase.from("phone_portal_usage").delete().eq("id", req.params.id);

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "DELETE_PHONE_PORTAL_USAGE", target_type: "phone_portal_usage", target_id: req.params.id,
  });

  res.json({ ok: true });
});

/* ─────────────── Vendor calls: "Submission of the phone number on prime vendors" ─────────────── */

function flattenVendorCall({ users, resumes, ...row }) {
  return {
    ...row,
    user_name: users?.name || null,
    resume_title: resumes?.title || null,
    resume_tech_stack: resumes?.tech_stack || null,
    resume_google_drive_link: resumes?.google_drive_link || null,
  };
}

const VENDOR_CALL_SELECT = "*, users(name), resumes(title, tech_stack, google_drive_link)";

router.get("/vendor-calls", requireAuth, async (req, res) => {
  let query = supabase.from("phone_vendor_calls").select(VENDOR_CALL_SELECT).order("created_at", { ascending: false });

  if (req.user.role === "admin") {
    if (req.query.user_id) query = query.eq("user_id", req.query.user_id);
  } else {
    query = query.eq("user_id", req.user.userId);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json((data || []).map(flattenVendorCall));
});

router.post("/vendor-calls", requireAuth, async (req, res) => {
  const { phone_number, vendor_name, candidate_name, resume_id } = req.body;

  if (!phone_number?.trim()) return res.status(400).json({ error: "Phone number is required" });
  if (!vendor_name?.trim()) return res.status(400).json({ error: "Vendor name is required" });
  if (!candidate_name?.trim()) return res.status(400).json({ error: "Candidate name is required" });
  if (!resume_id) return res.status(400).json({ error: "A resume is required" });
  if (!(await validateResumeOwnership(req, res, resume_id))) return;

  const { data, error } = await supabase
    .from("phone_vendor_calls")
    .insert({
      user_id: req.user.userId,
      phone_number: phone_number.trim(),
      vendor_name: vendor_name.trim(),
      candidate_name: candidate_name.trim(),
      resume_id,
    })
    .select(VENDOR_CALL_SELECT)
    .single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "CREATE_PHONE_VENDOR_CALL", target_type: "phone_vendor_call", target_id: data.id,
    metadata: { phone_number: data.phone_number, vendor_name: data.vendor_name },
  });

  res.status(201).json(flattenVendorCall(data));
});

router.patch("/vendor-calls/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("phone_vendor_calls").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  const { phone_number, vendor_name, candidate_name, resume_id } = req.body;

  if (resume_id !== undefined && !(await validateResumeOwnership(req, res, resume_id))) return;

  const updates = { updated_at: new Date().toISOString() };
  if (phone_number !== undefined) updates.phone_number = phone_number.trim();
  if (vendor_name !== undefined) updates.vendor_name = vendor_name.trim();
  if (candidate_name !== undefined) updates.candidate_name = candidate_name.trim();
  if (resume_id !== undefined) updates.resume_id = resume_id;

  const { data, error } = await supabase
    .from("phone_vendor_calls").update(updates).eq("id", req.params.id).select(VENDOR_CALL_SELECT).single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "UPDATE_PHONE_VENDOR_CALL", target_type: "phone_vendor_call", target_id: req.params.id, metadata: updates,
  });

  res.json(flattenVendorCall(data));
});

router.delete("/vendor-calls/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from("phone_vendor_calls").select("id, user_id").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModify(req, existing)) return res.status(403).json({ error: "Not allowed" });

  await supabase.from("phone_vendor_calls").delete().eq("id", req.params.id);

  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action: "DELETE_PHONE_VENDOR_CALL", target_type: "phone_vendor_call", target_id: req.params.id,
  });

  res.json({ ok: true });
});

module.exports = router;
