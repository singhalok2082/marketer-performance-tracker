// Turns a block of pasted recruiting-team notes (freeform "Label: value"
// lines, one per line, in whatever order) into a candidate form patch.
// Nothing here is guaranteed correct — it's a first pass for the admin to
// review — so anything that can't be confidently mapped is kept, not
// dropped, as a plain "Additional detail" row instead of being discarded.

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function pad(n) { return String(n).padStart(2, "0"); }

function parseFlexibleDate(raw) {
  if (!raw) return null;
  const s = raw.trim().replace(/(\d+)(st|nd|rd|th)\b/gi, "$1").replace(/[.,]/g, "").replace(/\s+/g, " ").trim();

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${pad(m[1])}-${pad(m[2])}`;

  m = s.match(/^([A-Za-z]+) (\d{1,2}) (\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[1].toLowerCase()])}-${pad(m[2])}`;

  m = s.match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(m[1])}`;

  m = s.match(/^([A-Za-z]+) (\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[2]}-${pad(MONTHS[m[1].toLowerCase()])}-01`;

  return null;
}

// "B.E in Mechanical Engineering, VTU, India (2017 - 2021)" -> structured row
function parseEducationLine(value) {
  let m = value.match(/^(.*?),\s*(.*?),\s*(.*?)\s*\((\d{4})\s*-\s*(\d{4})\)\.?\s*$/);
  if (m) return { degree_name: m[1].trim(), institution: m[2].trim(), location: m[3].trim(), start_year: m[4], end_year: m[5] };

  m = value.match(/^(.*?),\s*(.*?),\s*(.*?)\.?\s*$/);
  if (m) return { degree_name: m[1].trim(), institution: m[2].trim(), location: m[3].trim(), start_year: "", end_year: "" };

  return { degree_name: value.trim(), institution: "", location: "", start_year: "", end_year: "" };
}

function normalize(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Split "Label: value", "Label :- value", "Label: - value" into {label, value}.
// Recruiting notes are inconsistent about the separator, so we just take
// everything before the first colon as the label.
function splitLine(line) {
  const idx = line.indexOf(":");
  if (idx === -1) return null;
  const label = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).replace(/^[\s\-:]+/, "").trim();
  if (!label || !value) return null;
  return { label, value };
}

export function parsePastedCandidateText(text) {
  const candidate = {};
  const education = [];
  const details = [];
  const systemCredentials = [];
  let currentSystem = null;

  const getOrCreateSystem = (name) => {
    const key = name.toLowerCase();
    let row = systemCredentials.find(s => s.system_name.toLowerCase() === key);
    if (!row) {
      row = { system_name: name, login_id: "", password: "", notes: "" };
      systemCredentials.push(row);
    }
    return row;
  };

  const addDateField = (field, label, value) => {
    const parsed = parseFlexibleDate(value);
    if (parsed) candidate[field] = parsed;
    else details.push({ label, value }); // couldn't parse — surface it instead of losing it
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = splitLine(line);
    if (!parts) continue;
    const { label, value } = parts;
    const n = normalize(label);

    if (n.includes("jump") && n.includes("login")) { getOrCreateSystem("Jump").login_id = value; continue; }
    if (n.includes("jump") && n.includes("pass")) { getOrCreateSystem("Jump").password = value; continue; }
    if (n.includes("system name")) { currentSystem = getOrCreateSystem(value); continue; }
    if (n === "username" || n.includes("login id")) {
      if (!currentSystem) currentSystem = getOrCreateSystem("System");
      currentSystem.login_id = value;
      continue;
    }
    if (n === "password") {
      if (!currentSystem) currentSystem = getOrCreateSystem("System");
      currentSystem.password = value;
      continue;
    }

    if (n.includes("visa") && (n.includes("start") || n.includes("issue"))) { addDateField("visa_start_date", label, value); continue; }
    if (n.includes("visa") && (n.includes("end") || n.includes("expir"))) { addDateField("visa_end_date", label, value); continue; }
    if (n.includes("visa")) { candidate.visa_type = value; continue; }
    if (n.includes("ssn")) { candidate.ssn_last4 = value.replace(/\D/g, "").slice(-4); continue; }
    if (n.includes("dob") || (n.includes("date") && n.includes("birth"))) { addDateField("date_of_birth", label, value); continue; }
    if (n.includes("legal name")) { candidate.legal_name = value; continue; }
    if (n.includes("market") || n.includes("mareting")) { candidate.marketing_name = value; continue; } // "mareting" catches a common typo seen in real recruiting notes
    if (n.includes("us entry") || n.includes("entry date")) { addDateField("us_entry_date", label, value); continue; }
    if (n.includes("address") || n.includes("location")) { candidate.current_address_linkedin = value; continue; }
    if (n.includes("education")) { education.push(parseEducationLine(value)); continue; }

    details.push({ label, value }); // unrecognized — keep it visible rather than dropping it
  }

  return { candidate, education, details, systemCredentials };
}
