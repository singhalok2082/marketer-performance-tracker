const router = require("express").Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");
const { hasPermission, requirePermission } = require("../utils/permissions");

const CANDIDATE_FIELDS = [
  "marketing_name", "legal_name", "date_of_birth", "ssn_last4",
  "visa_type", "visa_start_date", "visa_end_date", "us_entry_date",
  "current_address_linkedin", "is_w2", "is_c2c",
];

function pickCandidateFields(body) {
  const out = {};
  for (const f of CANDIDATE_FIELDS) {
    if (body[f] !== undefined) out[f] = body[f] === "" ? null : body[f];
  }
  return out;
}

// Nothing about a candidate is required — recruiting sends partial info and
// admin fills gaps later. The only thing still validated is SSN's shape,
// and only when a value is actually given.
function validateCandidateFields(fields) {
  if (fields.ssn_last4 != null && !/^\d{4}$/.test(fields.ssn_last4)) {
    return "SSN must be exactly the last 4 digits";
  }
  return null;
}

function mapEducationRow(e) {
  return {
    degree_name: e.degree_name?.trim() || null,
    institution: e.institution?.trim() || null,
    location: e.location?.trim() || null,
    start_year: e.start_year || null,
    end_year: e.end_year || null,
  };
}

function mapDetailRow(d) {
  return { label: d.label?.trim() || null, value: d.value?.trim() || null };
}

function mapSystemCredentialRow(s) {
  return {
    system_name: s.system_name?.trim() || null,
    login_id: s.login_id?.trim() || null,
    password: s.password?.trim() || null,
    notes: s.notes?.trim() || null,
  };
}

async function replaceChildRows(table, candidateId, rows, mapRow) {
  await supabase.from(table).delete().eq("candidate_id", candidateId);
  const insertRows = (rows || []).map(r => ({ candidate_id: candidateId, ...mapRow(r) }));
  if (insertRows.length) {
    const { error } = await supabase.from(table).insert(insertRows);
    if (error) throw error;
  }
}

function canView(req, row) {
  if (req.user.role === "admin") return hasPermission(req.user, "bench");
  return row.approval_status === "approved" || row.submitted_by === req.user.userId;
}

function canModifyDirectly(req, row) {
  if (req.user.role === "admin") return hasPermission(req.user, "bench");
  return row.submitted_by === req.user.userId && row.approval_status === "pending";
}

async function logAudit(req, action, targetId, metadata) {
  await supabase.from("audit_logs").insert({
    actor_id: req.user.userId, actor_name: req.user.name,
    action, target_type: "candidate", target_id: targetId, metadata,
  });
}

function shapeRow(row) {
  const { submitter, ...rest } = row;
  return {
    ...rest,
    submitted_by_name: submitter?.name || null,
  };
}

/* ─────────────── list / detail ─────────────── */

router.get("/", requireAuth, async (req, res) => {
  const isAdmin = req.user.role === "admin";
  if (isAdmin && !hasPermission(req.user, "bench")) {
    return res.status(403).json({ error: "You don't have access to this section" });
  }

  let query = supabase
    .from("candidates")
    .select("*, candidate_education(*), submitter:users!candidates_submitted_by_fkey(name)")
    .order("created_at", { ascending: false });

  if (isAdmin) {
    if (req.query.approval_status) query = query.eq("approval_status", req.query.approval_status);
  } else {
    query = query.or(`approval_status.eq.approved,submitted_by.eq.${req.user.userId}`);
  }

  if (req.query.marketing_status) query = query.eq("marketing_status", req.query.marketing_status);
  else if (!req.query.approval_status) query = query.eq("marketing_status", "active");

  if (req.query.segment === "w2") query = query.eq("is_w2", true);
  if (req.query.segment === "c2c") query = query.eq("is_c2c", true);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let rows = (data || []).map(row => ({
    ...shapeRow(row),
    is_own_pending: row.approval_status === "pending" && row.submitted_by === req.user.userId,
  }));

  const search = req.query.search?.trim().toLowerCase();
  if (search) {
    rows = rows.filter(r =>
      r.marketing_name?.toLowerCase().includes(search) || r.legal_name?.toLowerCase().includes(search)
    );
  }

  res.json(rows);
});

router.get("/approval-queue", requireAuth, requirePermission("bench"), async (req, res) => {
  const [{ data: candidates, error: candErr }, { data: editRequests, error: editErr }] = await Promise.all([
    supabase.from("candidates")
      .select("*, submitter:users!candidates_submitted_by_fkey(name)")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("candidate_edit_requests")
      .select("*, requester:users!candidate_edit_requests_requested_by_fkey(name), candidates(marketing_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);
  if (candErr) return res.status(500).json({ error: candErr.message });
  if (editErr) return res.status(500).json({ error: editErr.message });

  res.json({
    pending_candidates: (candidates || []).map(shapeRow),
    pending_edit_requests: (editRequests || []).map(({ requester, candidates: cand, ...row }) => ({
      ...row,
      requested_by_name: requester?.name || null,
      candidate_marketing_name: cand?.marketing_name || null,
    })),
  });
});

router.get("/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("candidates")
    .select("*, candidate_education(*), candidate_details(*), candidate_offers(*), candidate_system_credentials(*), submitter:users!candidates_submitted_by_fkey(name)")
    .eq("id", req.params.id)
    .single();
  if (error || !data) return res.status(404).json({ error: "Not found" });
  if (!canView(req, data)) return res.status(403).json({ error: "Not allowed" });

  res.json({
    ...shapeRow(data),
    is_own_pending: data.approval_status === "pending" && data.submitted_by === req.user.userId,
  });
});

/* ─────────────── create / edit ─────────────── */

router.post("/", requireAuth, async (req, res) => {
  const isAdmin = req.user.role === "admin";
  if (isAdmin && !hasPermission(req.user, "bench")) {
    return res.status(403).json({ error: "You don't have access to this section" });
  }

  const fields = pickCandidateFields(req.body);
  const fieldErr = validateCandidateFields(fields);
  if (fieldErr) return res.status(400).json({ error: fieldErr });

  const insertRow = {
    ...fields,
    marketing_name: fields.marketing_name?.trim() || null,
    legal_name: fields.legal_name?.trim() || null,
    submitted_by: req.user.userId,
  };
  if (isAdmin) {
    insertRow.approval_status = "approved";
    insertRow.approved_by = req.user.userId;
    insertRow.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase.from("candidates").insert(insertRow).select().single();
  if (error) return res.status(500).json({ error: error.message });

  try {
    await replaceChildRows("candidate_education", data.id, req.body.education, mapEducationRow);
    await replaceChildRows("candidate_details", data.id, (req.body.details || []).filter(d => d.label?.trim() || d.value?.trim()), mapDetailRow);
    await replaceChildRows("candidate_system_credentials", data.id,
      (req.body.system_credentials || []).filter(s => s.system_name?.trim() || s.login_id?.trim() || s.password?.trim() || s.notes?.trim()), mapSystemCredentialRow);
  } catch (childErr) {
    await supabase.from("candidates").delete().eq("id", data.id);
    return res.status(500).json({ error: childErr.message });
  }

  await logAudit(req, isAdmin ? "CREATE_CANDIDATE" : "SUBMIT_CANDIDATE", data.id, { marketing_name: data.marketing_name });
  res.status(201).json(data);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { data: existing, error: findErr } = await supabase.from("candidates").select("*").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (!canModifyDirectly(req, existing)) return res.status(403).json({ error: "Not allowed" });

  const fields = pickCandidateFields(req.body);
  const fieldErr = validateCandidateFields(fields);
  if (fieldErr) return res.status(400).json({ error: fieldErr });

  const updates = { ...fields, updated_at: new Date().toISOString() };
  if (updates.marketing_name !== undefined) updates.marketing_name = updates.marketing_name?.trim() || null;
  if (updates.legal_name !== undefined) updates.legal_name = updates.legal_name?.trim() || null;

  const { data, error } = await supabase.from("candidates").update(updates).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (req.body.education !== undefined) await replaceChildRows("candidate_education", data.id, req.body.education, mapEducationRow);
  if (req.body.details !== undefined) {
    await replaceChildRows("candidate_details", data.id, (req.body.details || []).filter(d => d.label?.trim() || d.value?.trim()), mapDetailRow);
  }
  if (req.body.system_credentials !== undefined) {
    await replaceChildRows("candidate_system_credentials", data.id,
      (req.body.system_credentials || []).filter(s => s.system_name?.trim() || s.login_id?.trim() || s.password?.trim() || s.notes?.trim()), mapSystemCredentialRow);
  }

  await logAudit(req, "UPDATE_CANDIDATE", data.id, updates);
  res.json(data);
});

router.post("/:id/approve", requireAuth, requirePermission("bench"), async (req, res) => {
  const { data: existing, error: findErr } = await supabase.from("candidates").select("id, approval_status, marketing_name").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (existing.approval_status !== "pending") return res.status(400).json({ error: "Candidate is not pending approval" });

  const { data, error } = await supabase.from("candidates")
    .update({ approval_status: "approved", approved_by: req.user.userId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req, "APPROVE_CANDIDATE", data.id, { marketing_name: data.marketing_name });
  res.json(data);
});

router.post("/:id/reject", requireAuth, requirePermission("bench"), async (req, res) => {
  const { data: existing, error: findErr } = await supabase.from("candidates").select("id, approval_status, marketing_name").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (existing.approval_status !== "pending") return res.status(400).json({ error: "Candidate is not pending approval" });

  const reason = req.body.reason?.trim() || null;
  const { data, error } = await supabase.from("candidates")
    .update({ approval_status: "rejected", rejection_reason: reason, updated_at: new Date().toISOString() })
    .eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req, "REJECT_CANDIDATE", data.id, { marketing_name: data.marketing_name, reason });
  res.json(data);
});

router.patch("/:id/marketing-status", requireAuth, requirePermission("bench"), async (req, res) => {
  const status = req.body.marketing_status;
  if (!["active", "stopped"].includes(status)) return res.status(400).json({ error: "marketing_status must be 'active' or 'stopped'" });

  const { data: existing, error: findErr } = await supabase.from("candidates").select("id, approval_status").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (existing.approval_status !== "approved") return res.status(400).json({ error: "Only approved candidates have a marketing status" });

  const { data, error } = await supabase.from("candidates")
    .update({ marketing_status: status, updated_at: new Date().toISOString() })
    .eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req, "UPDATE_CANDIDATE_MARKETING_STATUS", data.id, { marketing_status: status });
  res.json(data);
});

router.delete("/:id", requireAuth, requirePermission("bench"), async (req, res) => {
  const { data: existing, error: findErr } = await supabase.from("candidates").select("id, approval_status, marketing_name").eq("id", req.params.id).single();
  if (findErr || !existing) return res.status(404).json({ error: "Not found" });
  if (existing.approval_status === "approved") {
    return res.status(400).json({ error: "Approved candidates can't be deleted — set marketing status to Stopped instead" });
  }

  await supabase.from("candidates").delete().eq("id", req.params.id);
  await logAudit(req, "DELETE_CANDIDATE", req.params.id, { marketing_name: existing.marketing_name });
  res.json({ ok: true });
});

/* ─────────────── offers ─────────────── */

router.post("/:id/offers", requireAuth, async (req, res) => {
  const { data: candidate, error: findErr } = await supabase.from("candidates").select("id, approval_status, submitted_by").eq("id", req.params.id).single();
  if (findErr || !candidate) return res.status(404).json({ error: "Not found" });
  if (!canView(req, candidate)) return res.status(403).json({ error: "Not allowed" });

  const employer = req.body.employer_client?.trim();
  if (!employer) return res.status(400).json({ error: "Employer/client is required" });

  const { data, error } = await supabase.from("candidate_offers").insert({
    candidate_id: req.params.id,
    employer_client: employer,
    offer_date: req.body.offer_date || null,
    notes: req.body.notes?.trim() || null,
    created_by: req.user.userId,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req, "ADD_CANDIDATE_OFFER", req.params.id, { employer_client: employer });
  res.status(201).json(data);
});

router.delete("/:id/offers/:offerId", requireAuth, requirePermission("bench"), async (req, res) => {
  const { data: existing, error: findErr } = await supabase.from("candidate_offers").select("id, candidate_id").eq("id", req.params.offerId).single();
  if (findErr || !existing || existing.candidate_id !== req.params.id) return res.status(404).json({ error: "Not found" });

  await supabase.from("candidate_offers").delete().eq("id", req.params.offerId);
  await logAudit(req, "DELETE_CANDIDATE_OFFER", req.params.id, { offer_id: req.params.offerId });
  res.json({ ok: true });
});

// Linked activity from two separate trackers:
//   - vendor_activities: discrete tech_screening/interview/offer log entries
//     per candidate — this is where account managers actually log "we got
//     Labhesh an interview / an offer", so it's the primary signal here.
//   - job_applications: portal-submission status (Applied/.../Offer) per job.
// Each mirrors its own route's privacy boundary: an admin with that
// resource's permission sees every manager's linked rows, everyone else
// (including a scoped admin without it) only sees their own.
router.get("/:id/activity", requireAuth, async (req, res) => {
  const { data: candidate, error: findErr } = await supabase.from("candidates").select("id, approval_status, submitted_by").eq("id", req.params.id).single();
  if (findErr || !candidate) return res.status(404).json({ error: "Not found" });
  if (!canView(req, candidate)) return res.status(403).json({ error: "Not allowed" });

  const seeAllActivities = req.user.role === "admin" && hasPermission(req.user, "activities");
  const seeAllApps = req.user.role === "admin" && hasPermission(req.user, "applications");

  let vaQuery = supabase
    .from("vendor_activities")
    .select("id, activity_type, client_name, vendor_company, employment_type, activity_date, user_id, users(name)")
    .eq("candidate_id", req.params.id)
    .order("activity_date", { ascending: false });
  if (!seeAllActivities) vaQuery = vaQuery.eq("user_id", req.user.userId);

  let appQuery = supabase
    .from("job_applications")
    .select("id, job_title, status, applied_date, user_id, users(name), portals(name)")
    .eq("candidate_id", req.params.id)
    .order("applied_date", { ascending: false });
  if (!seeAllApps) appQuery = appQuery.eq("user_id", req.user.userId);

  const [{ data: vaData, error: vaErr }, { data: appData, error: appErr }] = await Promise.all([vaQuery, appQuery]);
  if (vaErr) return res.status(500).json({ error: vaErr.message });
  if (appErr) return res.status(500).json({ error: appErr.message });

  const vendorActivities = (vaData || []).map(({ users, ...row }) => ({ ...row, user_name: users?.name || null }));
  const applications = (appData || []).map(({ users, portals, ...row }) => ({
    ...row, user_name: users?.name || null, portal_name: portals?.name || null,
  }));

  const vaByType = {};
  const vaByManagerMap = new Map();
  for (const a of vendorActivities) {
    vaByType[a.activity_type] = (vaByType[a.activity_type] || 0) + 1;
    if (!vaByManagerMap.has(a.user_id)) vaByManagerMap.set(a.user_id, { user_name: a.user_name, total: 0, interviews: 0, offers: 0 });
    const m = vaByManagerMap.get(a.user_id);
    m.total += 1;
    if (a.activity_type === "interview") m.interviews += 1;
    if (a.activity_type === "offer") m.offers += 1;
  }

  const appByStatus = {};
  const appByManagerMap = new Map();
  for (const a of applications) {
    appByStatus[a.status] = (appByStatus[a.status] || 0) + 1;
    if (!appByManagerMap.has(a.user_id)) appByManagerMap.set(a.user_id, { user_name: a.user_name, total: 0, interviews: 0, offers: 0 });
    const m = appByManagerMap.get(a.user_id);
    m.total += 1;
    if (a.status === "Interview Scheduled") m.interviews += 1;
    if (a.status === "Offer") m.offers += 1;
  }

  res.json({
    vendorActivities: {
      items: vendorActivities,
      summary: { total: vendorActivities.length, byType: vaByType, byManager: Array.from(vaByManagerMap.values()).sort((a, b) => b.total - a.total) },
      scope: seeAllActivities ? "all" : "own",
    },
    jobApplications: {
      items: applications,
      summary: { total: applications.length, byStatus: appByStatus, byManager: Array.from(appByManagerMap.values()).sort((a, b) => b.total - a.total) },
      scope: seeAllApps ? "all" : "own",
    },
  });
});

/* ─────────────── edit requests ─────────────── */

router.post("/:id/edit-requests", requireAuth, async (req, res) => {
  const { data: candidate, error: findErr } = await supabase.from("candidates").select("id, approval_status").eq("id", req.params.id).single();
  if (findErr || !candidate) return res.status(404).json({ error: "Not found" });
  if (candidate.approval_status !== "approved") return res.status(400).json({ error: "Only approved candidates can have edit requests" });

  const changes = req.body.changes;
  if (!changes || typeof changes !== "object") return res.status(400).json({ error: "changes is required" });
  if (changes.candidate) {
    const fieldErr = validateCandidateFields(pickCandidateFields(changes.candidate));
    if (fieldErr) return res.status(400).json({ error: fieldErr });
  }

  const { data, error } = await supabase.from("candidate_edit_requests").insert({
    candidate_id: req.params.id, requested_by: req.user.userId, changes,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logAudit(req, "SUBMIT_CANDIDATE_EDIT_REQUEST", req.params.id, { edit_request_id: data.id });
  res.status(201).json(data);
});

router.get("/:id/edit-requests", requireAuth, async (req, res) => {
  const isAdmin = req.user.role === "admin";
  if (isAdmin && !hasPermission(req.user, "bench")) return res.status(403).json({ error: "You don't have access to this section" });

  let query = supabase
    .from("candidate_edit_requests")
    .select("*, requester:users!candidate_edit_requests_requested_by_fkey(name)")
    .eq("candidate_id", req.params.id)
    .order("created_at", { ascending: false });
  if (!isAdmin) query = query.eq("requested_by", req.user.userId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(({ requester, ...row }) => ({ ...row, requested_by_name: requester?.name || null })));
});

router.post("/:id/edit-requests/:reqId/approve", requireAuth, requirePermission("bench"), async (req, res) => {
  const { data: editReq, error: findErr } = await supabase.from("candidate_edit_requests").select("*").eq("id", req.params.reqId).single();
  if (findErr || !editReq || editReq.candidate_id !== req.params.id) return res.status(404).json({ error: "Not found" });
  if (editReq.status !== "pending") return res.status(400).json({ error: "Edit request already reviewed" });

  const { changes } = editReq;
  const candidateChanges = pickCandidateFields(changes.candidate || {});
  if (candidateChanges.marketing_name !== undefined) candidateChanges.marketing_name = candidateChanges.marketing_name?.trim() || null;
  if (candidateChanges.legal_name !== undefined) candidateChanges.legal_name = candidateChanges.legal_name?.trim() || null;

  if (Object.keys(candidateChanges).length) {
    candidateChanges.updated_at = new Date().toISOString();
    const { error: updateErr } = await supabase.from("candidates").update(candidateChanges).eq("id", req.params.id);
    if (updateErr) return res.status(500).json({ error: updateErr.message });
  }
  if (changes.education !== undefined) await replaceChildRows("candidate_education", req.params.id, changes.education, mapEducationRow);
  if (changes.details !== undefined) {
    await replaceChildRows("candidate_details", req.params.id, (changes.details || []).filter(d => d.label?.trim() || d.value?.trim()), mapDetailRow);
  }

  await supabase.from("candidate_edit_requests").update({
    status: "approved", reviewed_by: req.user.userId, reviewed_at: new Date().toISOString(),
  }).eq("id", req.params.reqId);

  await logAudit(req, "APPROVE_CANDIDATE_EDIT_REQUEST", req.params.id, { edit_request_id: req.params.reqId });
  await logAudit(req, "UPDATE_CANDIDATE", req.params.id, candidateChanges);

  const { data: updated } = await supabase
    .from("candidates")
    .select("*, candidate_education(*), candidate_details(*), candidate_offers(*)")
    .eq("id", req.params.id)
    .single();
  res.json(updated);
});

router.post("/:id/edit-requests/:reqId/reject", requireAuth, requirePermission("bench"), async (req, res) => {
  const { data: editReq, error: findErr } = await supabase.from("candidate_edit_requests").select("id, candidate_id, status").eq("id", req.params.reqId).single();
  if (findErr || !editReq || editReq.candidate_id !== req.params.id) return res.status(404).json({ error: "Not found" });
  if (editReq.status !== "pending") return res.status(400).json({ error: "Edit request already reviewed" });

  const reason = req.body.reason?.trim() || null;
  await supabase.from("candidate_edit_requests").update({
    status: "rejected", reviewed_by: req.user.userId, reviewed_at: new Date().toISOString(), rejection_reason: reason,
  }).eq("id", req.params.reqId);

  await logAudit(req, "REJECT_CANDIDATE_EDIT_REQUEST", req.params.id, { edit_request_id: req.params.reqId, reason });
  res.json({ ok: true });
});

module.exports = router;
