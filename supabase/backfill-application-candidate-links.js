// One-time backfill: link existing job_applications rows to Candidate Bench
// entries by matching the freeform candidate_info text against candidate
// names. Only confident matches (the full candidate name appears as a whole
// word sequence in candidate_info, and only one candidate matches) are
// linked — anything ambiguous is reported and left alone rather than guessed.
//
// Usage: node backfill-application-candidate-links.js
require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function nameMatches(candidateInfoNorm, nameNorm) {
  if (!nameNorm) return false;
  const re = new RegExp(`(^|\\s)${nameNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
  return re.test(candidateInfoNorm);
}

async function main() {
  const { data: candidates, error: candErr } = await supabase.from("candidates").select("id, marketing_name, legal_name");
  if (candErr) throw candErr;

  const { data: applications, error: appErr } = await supabase
    .from("job_applications")
    .select("id, candidate_info")
    .is("candidate_id", null)
    .not("candidate_info", "is", null);
  if (appErr) throw appErr;

  const linked = [];
  const ambiguous = [];
  const noMatch = [];

  for (const app of applications) {
    const infoNorm = normalize(app.candidate_info);
    if (!infoNorm) continue;

    const matches = candidates.filter(c =>
      nameMatches(infoNorm, normalize(c.marketing_name)) || nameMatches(infoNorm, normalize(c.legal_name))
    );
    const uniqueMatches = [...new Map(matches.map(c => [c.id, c])).values()];

    if (uniqueMatches.length === 1) {
      linked.push({ app, candidate: uniqueMatches[0] });
    } else if (uniqueMatches.length > 1) {
      ambiguous.push({ app, candidates: uniqueMatches });
    } else {
      noMatch.push(app);
    }
  }

  for (const { app, candidate } of linked) {
    const { error } = await supabase.from("job_applications").update({ candidate_id: candidate.id }).eq("id", app.id);
    if (error) throw error;
  }

  console.log(`Linked ${linked.length} application(s):`);
  for (const { app, candidate } of linked) {
    console.log(`  "${app.candidate_info}" -> ${candidate.marketing_name || candidate.legal_name} (${candidate.id})`);
  }
  console.log(`\nAmbiguous, left unlinked (${ambiguous.length}):`);
  for (const { app, candidates: cs } of ambiguous) {
    console.log(`  "${app.candidate_info}" matched multiple: ${cs.map(c => c.marketing_name || c.legal_name).join(", ")}`);
  }
  console.log(`\nNo match (${noMatch.length}) — candidate not in the bench yet, or name doesn't match closely enough.`);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
