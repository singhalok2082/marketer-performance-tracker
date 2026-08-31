export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

// Flags a visa nearing or past its expiration date so it stands out on the card.
export function visaExpiryFlag(visaEndDate) {
  if (!visaEndDate) return null;
  const end = new Date(visaEndDate + "T00:00:00Z");
  const days = Math.floor((end - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Visa expired", bg: "#FEE2E2", color: "#B91C1C" };
  if (days <= 90) return { label: `Visa expires in ${days}d`, bg: "#FEF3C7", color: "#B45309" };
  return null;
}

export const emptyCandidateForm = {
  marketing_name: "", legal_name: "", date_of_birth: "", ssn_last4: "",
  visa_type: "", visa_start_date: "", visa_end_date: "", us_entry_date: "",
  current_address_linkedin: "", is_w2: false, is_c2c: false,
  jump_login_id: "", jump_password: "",
  education: [], details: [], system_credentials: [],
};

export function candidateToForm(c) {
  return {
    marketing_name: c.marketing_name || "",
    legal_name: c.legal_name || "",
    date_of_birth: c.date_of_birth || "",
    ssn_last4: c.ssn_last4 || "",
    visa_type: c.visa_type || "",
    visa_start_date: c.visa_start_date || "",
    visa_end_date: c.visa_end_date || "",
    us_entry_date: c.us_entry_date || "",
    current_address_linkedin: c.current_address_linkedin || "",
    is_w2: !!c.is_w2,
    is_c2c: !!c.is_c2c,
    jump_login_id: c.jump_login_id || "",
    jump_password: c.jump_password || "",
    education: (c.candidate_education || []).map(e => ({
      degree_name: e.degree_name || "", institution: e.institution || "",
      location: e.location || "", start_year: e.start_year || "", end_year: e.end_year || "",
    })),
    details: (c.candidate_details || []).map(d => ({ label: d.label || "", value: d.value || "" })),
    system_credentials: (c.candidate_system_credentials || []).map(s => ({
      system_name: s.system_name || "", username: s.username || "", password: s.password || "", notes: s.notes || "",
    })),
  };
}

// Plain-text blocks (no markdown) meant to be pasted as-is into Slack —
// only fields with a value are included, so nothing reads like "SSN: —".
export function buildMarketingText(c) {
  const lines = [];
  const header = c.marketing_name || c.legal_name;
  if (header) lines.push(header);
  if (c.legal_name && c.legal_name !== c.marketing_name) lines.push(`Legal Name: ${c.legal_name}`);
  if (c.date_of_birth) lines.push(`DOB: ${fmtDate(c.date_of_birth)}`);
  if (c.ssn_last4) lines.push(`SSN (last 4): ${c.ssn_last4}`);
  if (c.visa_type) lines.push(`Visa: ${c.visa_type}`);
  if (c.visa_start_date) lines.push(`Visa Issue Date: ${fmtDate(c.visa_start_date)}`);
  if (c.visa_end_date) lines.push(`Visa Expiration Date: ${fmtDate(c.visa_end_date)}`);
  if (c.us_entry_date) lines.push(`US Entry Date: ${fmtDate(c.us_entry_date)}`);
  if (c.current_address_linkedin) lines.push(`Current Location: ${c.current_address_linkedin}`);
  const segments = [c.is_w2 && "W2", c.is_c2c && "C2C"].filter(Boolean);
  if (segments.length) lines.push(`Segment: ${segments.join(", ")}`);

  for (const e of c.candidate_education || []) {
    const edu = [e.degree_name, e.institution, e.location].filter(Boolean).join(" — ");
    const years = (e.start_year || e.end_year) ? ` (${e.start_year || "?"}–${e.end_year || "?"})` : "";
    if (edu) lines.push(`Education: ${edu}${years}`);
  }
  for (const d of c.candidate_details || []) {
    if (d.label) lines.push(`${d.label}: ${d.value || "—"}`);
  }
  return lines.join("\n");
}

export function buildSystemText(c) {
  const blocks = [];

  if (c.jump_login_id || c.jump_password) {
    const lines = ["Jump"];
    if (c.jump_login_id) lines.push(`Login ID: ${c.jump_login_id}`);
    if (c.jump_password) lines.push(`Password: ${c.jump_password}`);
    blocks.push(lines.join("\n"));
  }

  for (const s of c.candidate_system_credentials || []) {
    const lines = [s.system_name || "System"];
    if (s.username) lines.push(`Username: ${s.username}`);
    if (s.password) lines.push(`Password: ${s.password}`);
    if (s.notes) lines.push(s.notes);
    blocks.push(lines.join("\n"));
  }

  return blocks.join("\n\n");
}

export function buildAllText(c) {
  const marketing = buildMarketingText(c);
  const system = buildSystemText(c);
  return system ? `${marketing}\n\nSystem Access\n${system}` : marketing;
}

const FIELD_LABELS = {
  marketing_name: "Marketing Name", legal_name: "Legal Name", date_of_birth: "Date of Birth",
  ssn_last4: "SSN (last 4)", visa_type: "Visa Type", visa_start_date: "Visa Issue Date",
  visa_end_date: "Visa Expiration Date", us_entry_date: "US Entry Date",
  current_address_linkedin: "Current Location", is_w2: "W2", is_c2c: "C2C",
  jump_login_id: "Jump Login ID", jump_password: "Jump Password",
};
const DATE_FIELDS = new Set(["date_of_birth", "visa_start_date", "visa_end_date", "us_entry_date"]);
const BOOL_FIELDS = new Set(["is_w2", "is_c2c"]);

function formatFieldValue(field, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (DATE_FIELDS.has(field)) return fmtDate(value);
  if (BOOL_FIELDS.has(field)) return value ? "Yes" : "No";
  return String(value);
}

// Turns one audit_logs row (target_type="candidate") into a plain-English
// history line: who did what, and for field edits, exactly what changed.
export function describeHistoryEvent(row) {
  const m = row.metadata || {};
  const actor = row.actor_name || "Someone";
  const changedLines = Object.entries(m.changed || {}).map(([field, { from, to }]) =>
    `${FIELD_LABELS[field] || field}: ${formatFieldValue(field, from)} → ${formatFieldValue(field, to)}`
  );
  const touchedExtras = [
    m.education_updated && "education",
    m.details_updated && "additional details",
    m.system_credentials_updated && "system access",
  ].filter(Boolean);

  switch (row.action) {
    case "CREATE_CANDIDATE": return `${actor} created this candidate`;
    case "SUBMIT_CANDIDATE": return `${actor} submitted this candidate for approval`;
    case "APPROVE_CANDIDATE": return `${actor} approved this candidate`;
    case "REJECT_CANDIDATE": return `${actor} rejected this candidate${m.reason ? `: ${m.reason}` : ""}`;
    case "DELETE_CANDIDATE": return `${actor} deleted this candidate`;
    case "UPDATE_CANDIDATE_MARKETING_STATUS": return `${actor} set marketing status to "${m.marketing_status}"`;
    case "ADD_CANDIDATE_OFFER": return `${actor} logged an offer from ${m.employer_client || "a client"}`;
    case "DELETE_CANDIDATE_OFFER": return `${actor} removed an offer entry`;
    case "UPDATE_CANDIDATE": {
      const parts = [...changedLines];
      if (touchedExtras.length) parts.push(`updated ${touchedExtras.join(", ")}`);
      return parts.length ? `${actor} updated — ${parts.join("; ")}` : `${actor} updated candidate details`;
    }
    case "SUBMIT_CANDIDATE_EDIT_REQUEST": {
      const proposed = Object.entries(m.proposed || {}).map(([field, val]) => `${FIELD_LABELS[field] || field}: ${formatFieldValue(field, val)}`);
      const extras = [m.education_proposed && "education", m.details_proposed && "additional details"].filter(Boolean);
      const parts = [...proposed, ...extras.map(e => `updated ${e}`)];
      return parts.length ? `${actor} requested an edit — ${parts.join("; ")}` : `${actor} requested an edit`;
    }
    case "APPROVE_CANDIDATE_EDIT_REQUEST": return `${actor} approved an edit request`;
    case "REJECT_CANDIDATE_EDIT_REQUEST": return `${actor} rejected an edit request${m.reason ? `: ${m.reason}` : ""}`;
    default: return `${actor} — ${row.action}`;
  }
}
