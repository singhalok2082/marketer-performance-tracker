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
    education: (c.candidate_education || []).map(e => ({
      degree_name: e.degree_name || "", institution: e.institution || "",
      location: e.location || "", start_year: e.start_year || "", end_year: e.end_year || "",
    })),
    details: (c.candidate_details || []).map(d => ({ label: d.label || "", value: d.value || "" })),
    system_credentials: (c.candidate_system_credentials || []).map(s => ({
      system_name: s.system_name || "", login_id: s.login_id || "", password: s.password || "", notes: s.notes || "",
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
  const creds = c.candidate_system_credentials || [];
  if (!creds.length) return "";
  return creds.map(s => {
    const lines = [s.system_name || "System"];
    if (s.login_id) lines.push(`Login ID: ${s.login_id}`);
    if (s.password) lines.push(`Password: ${s.password}`);
    if (s.notes) lines.push(s.notes);
    return lines.join("\n");
  }).join("\n\n");
}

export function buildAllText(c) {
  const marketing = buildMarketingText(c);
  const system = buildSystemText(c);
  return system ? `${marketing}\n\nSystem Access\n${system}` : marketing;
}
