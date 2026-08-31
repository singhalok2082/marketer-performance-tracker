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
  education: [], details: [],
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
  };
}
