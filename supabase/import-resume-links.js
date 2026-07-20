/**
 * Import every resume link from "Account Manager's Sheet (1).xlsx" as a
 * Google-Drive-link resume (no download/upload needed, so it works even for
 * docs that were never made public — the earlier import-history.js attempt
 * had to fetch+upload each file and 112/131 failed for exactly that reason).
 *
 * Skips any doc already represented in the `resumes` table, whether that's
 * one of the 19 successfully uploaded files from the earlier run, or a link
 * already imported by a previous run of this script.
 *
 *   node supabase/import-resume-links.js "/path/to/sheet.xlsx"
 *   node supabase/import-resume-links.js "/path/to/sheet.xlsx" --commit
 */
require("dotenv").config({ path: "../backend/.env" });
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const argv = process.argv.slice(2);
const COMMIT = argv.includes("--commit");
const filePath = argv.find(a => !a.startsWith("--"));

if (!filePath) {
  console.error("Usage: node import-resume-links.js <path-to-xlsx> [--commit]");
  process.exit(1);
}

const SKIP_NAMES = new Set(["sample data", "divyanshu"]);

function splitLines(cell) {
  if (cell === null || cell === undefined) return [];
  return String(cell).split("\n").map(s => s.trim()).filter(Boolean);
}
function stripPrefix(line) {
  return line.replace(/^\s*\d+\s*[:.\-]\s*-?\s*/, "").trim();
}
function extractGoogleDocId(url) {
  const m = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

async function main() {
  const { data: users, error: userErr } = await supabase
    .from("users").select("id, name").eq("role", "account_manager").eq("is_active", true);
  if (userErr) { console.error("Failed to load users:", userErr.message); process.exit(1); }
  const userByName = new Map(users.map(u => [u.name.trim().toLowerCase(), u.id]));

  const { data: existingResumes, error: resErr } = await supabase
    .from("resumes").select("file_name, google_drive_link");
  if (resErr) { console.error("Failed to load existing resumes:", resErr.message); process.exit(1); }

  const existingDocIds = new Set();
  for (const r of existingResumes || []) {
    if (r.file_name) {
      const m = r.file_name.match(/imported-([a-zA-Z0-9_-]+)\.pdf/);
      if (m) existingDocIds.add(m[1]);
    }
    if (r.google_drive_link) {
      const id = extractGoogleDocId(r.google_drive_link);
      if (id) existingDocIds.add(id);
    }
  }

  const wb = XLSX.readFile(filePath, { cellDates: true });
  const dailyRows = XLSX.utils.sheet_to_json(wb.Sheets["1_Daily_Tracker"], { header: 1, defval: null });

  const toInsert = [];
  const seenInSheet = new Set();
  let totalLinks = 0, skippedExisting = 0, skippedUnmatched = 0, skippedBadLink = 0;
  const unmatchedNames = new Set();

  for (const row of dailyRows.slice(1)) {
    const [dateCell, teamLead, employee, , resumeLinks, techStacks] = row;
    if (!employee) continue;
    if (String(teamLead || "").toLowerCase().includes("team")) continue;
    if (String(teamLead || "").toLowerCase() === "sample data") continue;

    const key = String(employee).trim().toLowerCase();
    if (SKIP_NAMES.has(key)) continue;
    const userId = userByName.get(key);
    if (!userId) { unmatchedNames.add(employee); skippedUnmatched++; continue; }

    const links = splitLines(resumeLinks);
    const techs = splitLines(techStacks);

    links.forEach((link, i) => {
      if (!/docs\.google\.com|drive\.google\.com/.test(link)) { skippedBadLink++; return; }
      totalLinks++;
      const docId = extractGoogleDocId(link);
      if (docId && (existingDocIds.has(docId) || seenInSheet.has(docId))) { skippedExisting++; return; }
      if (docId) seenInSheet.add(docId);

      const techLabel = stripPrefix(techs[i] || techs[0] || "Imported resume");
      toInsert.push({
        user_id: userId,
        title: techLabel,
        tech_stack: techLabel,
        google_drive_link: link,
        is_active: true,
      });
    });
  }

  console.log("\n=== RESUME LINK IMPORT SUMMARY ===");
  console.log(`Total resume links found in sheet:   ${totalLinks}`);
  console.log(`Already represented (skipped):       ${skippedExisting}`);
  console.log(`Unmatched employee name (skipped):   ${skippedUnmatched}`, unmatchedNames.size ? [...unmatchedNames] : "");
  console.log(`Non-Google links (skipped):          ${skippedBadLink}`);
  console.log(`New link-based resumes to insert:    ${toInsert.length}`);

  if (!COMMIT) {
    console.log("\nDry run only — no data written. Re-run with --commit to write.");
    return;
  }

  console.log("\n=== COMMITTING ===");
  for (let i = 0; i < toInsert.length; i += 500) {
    const batch = toInsert.slice(i, i + 500);
    const { error } = await supabase.from("resumes").insert(batch);
    if (error) console.error(`  ✗ batch ${i}-${i + batch.length}:`, error.message);
  }
  console.log(`  ✓ inserted ${toInsert.length} resumes as Google Drive links.`);
}

main().catch(e => { console.error("IMPORT FAILED:", e); process.exit(1); });
