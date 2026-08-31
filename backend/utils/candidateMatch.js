const supabase = require("../db/supabase");

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function nameMatches(textNorm, nameNorm) {
  if (!nameNorm) return false;
  const re = new RegExp(`(^|\\s)${nameNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
  return re.test(textNorm);
}

// Best-effort, conservative: only returns a candidate_id when exactly one
// approved bench candidate's full name appears as a whole-word match in the
// given free text. Ambiguous or no matches return null rather than guessing —
// this runs automatically on every save so a wrong guess would silently
// mislink someone's record, which is worse than just not linking.
async function matchCandidateId(freeText) {
  const textNorm = normalize(freeText);
  if (!textNorm) return null;

  const { data: candidates } = await supabase.from("candidates").select("id, marketing_name, legal_name").eq("approval_status", "approved");
  if (!candidates?.length) return null;

  const matches = candidates.filter(c => nameMatches(textNorm, normalize(c.marketing_name)) || nameMatches(textNorm, normalize(c.legal_name)));
  const unique = [...new Map(matches.map(c => [c.id, c])).values()];
  return unique.length === 1 ? unique[0].id : null;
}

module.exports = { matchCandidateId };
