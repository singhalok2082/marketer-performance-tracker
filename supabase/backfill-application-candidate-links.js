// One-time backfill: link existing job_applications and vendor_activities
// rows to Candidate Bench entries by matching their freeform candidate name
// text (candidate_info / candidate_name) against candidate names. Only
// confident matches (the full candidate name appears as a whole word
// sequence, and only one candidate matches) are linked — anything ambiguous
// is reported and left alone rather than guessed.
//
// Paginates through every row (Supabase/PostgREST caps a single query at
// 1000 rows by default, and this project has 1000+ job_applications rows —
// an earlier un-paginated version of this script silently missed everything
// past the first page).
//
// Usage: node backfill-application-candidate-links.js
require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const PAGE_SIZE = 1000;

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function nameMatches(textNorm, nameNorm) {
  if (!nameNorm) return false;
  const re = new RegExp(`(^|\\s)${nameNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
  return re.test(textNorm);
}

async function fetchAll(table, columns, textColumn) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .is("candidate_id", null)
      .not(textColumn, "is", null)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function backfill(table, rows, textField, candidates) {
  const linked = [];
  const ambiguous = [];
  const noMatch = [];

  for (const row of rows) {
    const textNorm = normalize(row[textField]);
    if (!textNorm) continue;

    const matches = candidates.filter(c =>
      nameMatches(textNorm, normalize(c.marketing_name)) || nameMatches(textNorm, normalize(c.legal_name))
    );
    const uniqueMatches = [...new Map(matches.map(c => [c.id, c])).values()];

    if (uniqueMatches.length === 1) linked.push({ row, candidate: uniqueMatches[0] });
    else if (uniqueMatches.length > 1) ambiguous.push({ row, candidates: uniqueMatches });
    else noMatch.push(row);
  }

  for (const { row, candidate } of linked) {
    const { error } = await supabase.from(table).update({ candidate_id: candidate.id }).eq("id", row.id);
    if (error) throw error;
  }

  console.log(`\n=== ${table} ===`);
  console.log(`Linked ${linked.length}:`);
  for (const { row, candidate } of linked) console.log(`  "${row[textField]}" -> ${candidate.marketing_name || candidate.legal_name} (${candidate.id})`);
  console.log(`Ambiguous, left unlinked (${ambiguous.length}):`);
  for (const { row, candidates: cs } of ambiguous) console.log(`  "${row[textField]}" matched multiple: ${cs.map(c => c.marketing_name || c.legal_name).join(", ")}`);
  console.log(`No match: ${noMatch.length} (candidate not in the bench yet, or name doesn't match closely enough)`);
}

async function main() {
  const { data: candidates, error: candErr } = await supabase.from("candidates").select("id, marketing_name, legal_name");
  if (candErr) throw candErr;

  const applications = await fetchAll("job_applications", "id, candidate_info", "candidate_info");
  await backfill("job_applications", applications, "candidate_info", candidates);

  const activities = await fetchAll("vendor_activities", "id, candidate_name", "candidate_name");
  await backfill("vendor_activities", activities, "candidate_name", candidates);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
