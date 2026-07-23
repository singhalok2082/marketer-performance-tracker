/**
 * Incremental import from "Account Manager's Sheet (2).xlsx" — the same
 * living tracker as Sheet (1) (already imported by import-history.js and
 * import-resume-links.js), now with ~3 more weeks of data filled in.
 *
 * Sheet (1) and (2) share the same 1000-row template (fixed date × employee
 * slots for the month); most rows are byte-identical between the two files.
 * Only the rows that actually changed carry genuinely new data for the
 * event-log-style tables (recruiter_outreach, vendor_activities) that have
 * no natural dedup key. Resumes/LinkedIn profiles/job_applications are
 * deduped directly against current DB state instead (Google Doc/Drive ID,
 * normalized URL), since that's more reliable than sheet-diffing.
 *
 * New in this run: job_applications was never imported before at all — the
 * "Number of jobs applied via/on LinkedIn" and "...on Portals" columns (13-21)
 * were parsed by neither prior script. Populated here for the first time.
 *
 *   node supabase/import-sheet-2-updates.js [--commit]
 *
 * Reads "Account Manager's Sheet (1).xlsx" and "(2).xlsx" from ~/Downloads
 * by default; override with --old <path> / --new <path>.
 */
require("dotenv").config({ path: "../backend/.env" });
const os = require("os");
const path = require("path");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const argv = process.argv.slice(2);
const COMMIT = argv.includes("--commit");
const oldFlagIdx = argv.indexOf("--old");
const newFlagIdx = argv.indexOf("--new");
const OLD_PATH = oldFlagIdx >= 0 ? argv[oldFlagIdx + 1] : path.join(os.homedir(), "Downloads", "Account Manager's Sheet (1).xlsx");
const NEW_PATH = newFlagIdx >= 0 ? argv[newFlagIdx + 1] : path.join(os.homedir(), "Downloads", "Account Manager's Sheet (2).xlsx");

const SKIP_NAMES = new Set(["sample data", "divyanshu"]);

// ── helpers ──────────────────────────────────────────────────────
function splitLines(cell) {
  if (cell === null || cell === undefined) return [];
  return String(cell).split("\n").map(s => s.trim()).filter(Boolean);
}
function stripPrefix(line) {
  return line.replace(/^\s*\d+\s*[:.\-]\s*-?\s*/, "").trim();
}
function toISODate(val) {
  if (val instanceof Date && !isNaN(val)) return val.toISOString().slice(0, 10);
  if (typeof val === "string") {
    const m = val.match(/(\d{2})-(\w{3})-(\d{4})/);
    if (m) {
      const d = new Date(`${m[2]} ${m[1]}, ${m[3]}`);
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
    }
    const d2 = new Date(val);
    if (!isNaN(d2)) return d2.toISOString().slice(0, 10);
  }
  return null;
}
function parseVendorCounts(text) {
  if (!text) return [];
  const out = [];
  const segments = String(text).split(/\n|,/).map(s => s.trim()).filter(Boolean);
  for (const seg of segments) {
    const m = seg.match(/^(.+?)\s*[-:]*\s*(\d+)\s*$/);
    if (m) out.push({ vendor: m[1].trim(), count: parseInt(m[2], 10) });
  }
  return out;
}
function parseCallDurations(text) {
  if (!text) return [];
  const out = [];
  for (const raw of String(text).split("\n")) {
    const line = stripPrefix(raw);
    if (!line) continue;
    const minM = line.match(/(\d+)\s*min/i);
    const noteM = line.match(/\(([^)]+)\)/);
    out.push({ duration_minutes: minM ? parseInt(minM[1], 10) : null, notes: noteM ? noteM[1].trim() : null });
  }
  return out;
}
function extractDocId(url) {
  const m = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
function normalizeLinkedinUrl(u) {
  return String(u).trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").replace(/\?.*$/, "");
}
function isRealLinkedinProfileUrl(u) {
  return /linkedin\.com\/in\//i.test(String(u));
}
function normalizePortalKey(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}
function normRow(row) {
  return JSON.stringify((row || []).map(v => (v instanceof Date ? v.toISOString() : (v === null || v === undefined ? "" : String(v)))));
}

async function main() {
  // ── reference data ──
  const { data: users, error: userErr } = await supabase
    .from("users").select("id, name").eq("role", "account_manager").eq("is_active", true);
  if (userErr) { console.error("Failed to load users:", userErr.message); process.exit(1); }
  const userByName = new Map(users.map(u => [u.name.trim().toLowerCase(), u.id]));
  function resolveUser(name, unmatched) {
    if (!name) return null;
    const key = String(name).trim().toLowerCase();
    if (SKIP_NAMES.has(key)) return null;
    const id = userByName.get(key);
    if (!id) { unmatched.add(name); return null; }
    return id;
  }

  const { data: portals, error: portalErr } = await supabase.from("portals").select("id, name");
  if (portalErr) { console.error("Failed to load portals:", portalErr.message); process.exit(1); }
  const portalByKey = new Map(portals.map(p => [normalizePortalKey(p.name), p.id]));
  const linkedinPortalId = portalByKey.get("linkedin") || null;

  const { data: existingResumes, error: resErr } = await supabase.from("resumes").select("id, file_name, google_drive_link");
  if (resErr) { console.error("Failed to load existing resumes:", resErr.message); process.exit(1); }
  const docIdToResumeId = new Map();
  for (const r of existingResumes || []) {
    if (r.file_name) {
      const m = r.file_name.match(/imported-([a-zA-Z0-9_-]+)\.pdf/);
      if (m) docIdToResumeId.set(m[1], r.id);
    }
    if (r.google_drive_link) {
      const id = extractDocId(r.google_drive_link);
      if (id) docIdToResumeId.set(id, r.id);
    }
  }

  const { data: existingLinkedin, error: liErr } = await supabase.from("linkedin_profiles").select("user_id, linkedin_url");
  if (liErr) { console.error("Failed to load existing linkedin_profiles:", liErr.message); process.exit(1); }
  const existingLinkedinKeys = new Set(
    (existingLinkedin || []).map(p => `${p.user_id}::${normalizeLinkedinUrl(p.linkedin_url)}`)
  );

  // ── workbooks ──
  const wbOld = XLSX.readFile(OLD_PATH, { cellDates: true });
  const wbNew = XLSX.readFile(NEW_PATH, { cellDates: true });
  const dailyOld = XLSX.utils.sheet_to_json(wbOld.Sheets["1_Daily_Tracker"], { header: 1, defval: null });
  const dailyNew = XLSX.utils.sheet_to_json(wbNew.Sheets["1_Daily_Tracker"], { header: 1, defval: null });
  const linkedinRows = XLSX.utils.sheet_to_json(wbNew.Sheets["LinkedIn_Mastersheet"], { header: 1, defval: null });

  const changedIdx = new Set();
  const maxLen = Math.max(dailyOld.length, dailyNew.length);
  for (let i = 1; i < maxLen; i++) {
    if (normRow(dailyOld[i]) !== normRow(dailyNew[i])) changedIdx.add(i);
  }

  const unmatchedNames = new Set();
  const toInsert = { linkedin_profiles: [], resumes: [], job_applications: [], recruiter_outreach: [], vendor_activities: [], daily_notes: [] };
  const skipped = { linkedinNonProfile: 0, resumeExisting: 0, ambiguousPortal: [], noUsableTitle: 0 };

  // ── LinkedIn profiles (LinkedIn_Mastersheet, deduped against DB) ──
  const seenLinkedinInSheet = new Set();
  for (const row of linkedinRows.slice(1)) {
    const [teamLead, employee, , urlCell, techCell, locCell, connCell] = row;
    if (!employee || String(employee).toLowerCase().includes("team")) continue;
    const userId = resolveUser(employee, unmatchedNames);
    if (!userId) continue;

    const urls = splitLines(urlCell);
    const techs = splitLines(techCell);
    const locs = splitLines(locCell);
    const conns = splitLines(connCell);
    urls.forEach((rawUrl, i) => {
      const url = /^https?:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
      if (!isRealLinkedinProfileUrl(url)) { skipped.linkedinNonProfile++; return; }
      const key = `${userId}::${normalizeLinkedinUrl(url)}`;
      if (existingLinkedinKeys.has(key) || seenLinkedinInSheet.has(key)) return;
      seenLinkedinInSheet.add(key);
      toInsert.linkedin_profiles.push({
        user_id: userId,
        linkedin_url: url,
        title: stripPrefix(techs[i] || techs[0] || "Untitled"),
        location: locs[i] ? stripPrefix(locs[i]) : null,
        connections: conns[i] ? parseInt(String(conns[i]).replace(/\D/g, ""), 10) || 0 : 0,
      });
    });
  }

  // ── Daily tracker: resumes, job applications (all rows), outreach/activities/notes (changed rows only) ──
  const seenResumeDocIdInSheet = new Set();
  for (let i = 1; i < dailyNew.length; i++) {
    const row = dailyNew[i];
    if (!row) continue;
    const [
      dateCell, teamLead, employee, , resumeLinks, techStacks, , , , recruiterReached,
      empType, vendorCompany, jobRole,
      liAppCount, liJobTitle, liReqLink, liResumeLink,
      portalAppCount, portalNames, portalJobTitle, portalReqLink, portalResumeLink,
      , coldEmailsSent, , callDuration, techScreening, interviewCalls, offers, challenge,
    ] = row;

    if (!employee) continue;
    if (String(teamLead || "").toLowerCase().includes("team")) continue;
    if (String(teamLead || "").toLowerCase() === "sample data") continue;
    if (String(dateCell || "").toLowerCase() === "sample data") continue;

    const isoDate = toISODate(dateCell);
    if (!isoDate) continue; // header/marker/template rows with no real date

    const userId = resolveUser(employee, unmatchedNames);
    if (!userId) continue;

    // Resumes (Google Doc/Drive links) — dedup against DB, every row eligible
    const links = splitLines(resumeLinks);
    const techs = splitLines(techStacks);
    links.forEach((link, li) => {
      if (!/docs\.google\.com|drive\.google\.com/.test(link)) return;
      const docId = extractDocId(link);
      if (docId && (docIdToResumeId.has(docId) || seenResumeDocIdInSheet.has(docId))) { skipped.resumeExisting++; return; }
      if (docId) seenResumeDocIdInSheet.add(docId);
      toInsert.resumes.push({
        user_id: userId,
        title: stripPrefix(techs[li] || techs[0] || "Imported resume"),
        tech_stack: stripPrefix(techs[li] || techs[0] || "Imported resume"),
        google_drive_link: link,
        is_active: true,
        _docId: docId,
      });
    });

    // Job applications — never imported before, every row eligible
    function resolvePortalId(text) {
      if (!text) return null;
      const key = normalizePortalKey(stripPrefix(String(text).trim()));
      if (!key) return null;
      if (portalByKey.has(key)) return portalByKey.get(key);
      // e.g. "All on dice" / "All on Dice" — one known portal name embedded in a phrase
      const matches = [...portalByKey.keys()].filter(k => key.includes(k));
      if (matches.length === 1) return portalByKey.get(matches[0]);
      skipped.ambiguousPortal.push({ row: i, text });
      return null;
    }
    function parseApplications(titleCell, linkCell, resumeLinkCell, portalCell, fixedPortalId) {
      const titles = splitLines(titleCell).map(stripPrefix);
      const reqLinks = splitLines(linkCell).map(stripPrefix);
      const resumeLinksList = splitLines(resumeLinkCell).map(stripPrefix);
      const portalLines = portalCell ? splitLines(portalCell) : [];
      const n = Math.max(titles.length, reqLinks.length, resumeLinksList.length);
      const items = [];
      for (let k = 0; k < n; k++) {
        const title = titles[k] || titles[0] || null;
        if (!title) { skipped.noUsableTitle++; continue; }
        const portalId = fixedPortalId !== undefined ? fixedPortalId : resolvePortalId(portalLines[k] || portalLines[0]);
        items.push({
          job_title: title,
          job_url: /^https?:\/\//.test(reqLinks[k] || "") ? reqLinks[k] : null,
          resumeLink: resumeLinksList[k] || resumeLinksList[0] || null,
          portalId,
        });
      }
      return items;
    }

    for (const item of parseApplications(liJobTitle, liReqLink, liResumeLink, null, linkedinPortalId)) {
      toInsert.job_applications.push({
        user_id: userId, portal_id: item.portalId, job_url: item.job_url, job_title: item.job_title,
        resume_id: null, _resumeLink: item.resumeLink, applied_date: isoDate, status: "Applied",
      });
    }
    for (const item of parseApplications(portalJobTitle, portalReqLink, portalResumeLink, portalNames)) {
      toInsert.job_applications.push({
        user_id: userId, portal_id: item.portalId, job_url: item.job_url, job_title: item.job_title,
        resume_id: null, _resumeLink: item.resumeLink, applied_date: isoDate, status: "Applied",
      });
    }

    // Everything below only has new data on rows that actually changed
    if (!changedIdx.has(i)) continue;

    const channels = splitLines(recruiterReached);
    const empTypes = splitLines(empType);
    const vendors = splitLines(vendorCompany);
    const roles = splitLines(jobRole);
    const outreachCount = Math.max(channels.length, empTypes.length, vendors.length, roles.length);
    for (let k = 0; k < outreachCount; k++) {
      if (!channels[k] && !vendors[k] && !roles[k]) continue;
      const rawChannel = stripPrefix(channels[k] || "");
      let channel = null;
      if (/linkedin/i.test(rawChannel) && /email/i.test(rawChannel)) channel = "Both";
      else if (/linkedin/i.test(rawChannel)) channel = "LinkedIn";
      else if (/email/i.test(rawChannel)) channel = "Email";

      const rawEmp = stripPrefix(empTypes[k] || "");
      let employment_type = null;
      if (/c2c/i.test(rawEmp)) employment_type = "C2C";
      else if (/w2/i.test(rawEmp)) employment_type = "W2";
      else if (/full\s*time|fulltime/i.test(rawEmp)) employment_type = "Full Time";

      toInsert.recruiter_outreach.push({
        user_id: userId, channel, employment_type,
        vendor_company: vendors[k] ? stripPrefix(vendors[k]) : null,
        job_role: roles[k] ? stripPrefix(roles[k]) : null,
        contacted_date: isoDate, notes: null,
      });
    }

    for (const { vendor, count } of parseVendorCounts(coldEmailsSent)) {
      for (let k = 0; k < count; k++) {
        toInsert.vendor_activities.push({ user_id: userId, activity_type: "cold_email", vendor_company: vendor, activity_date: isoDate, imported_placeholder: false });
      }
    }
    for (const { duration_minutes, notes } of parseCallDurations(callDuration)) {
      toInsert.vendor_activities.push({ user_id: userId, activity_type: "vendor_call", duration_minutes, notes, activity_date: isoDate, imported_placeholder: false });
    }
    for (const [type, count] of [["tech_screening", techScreening], ["interview", interviewCalls], ["offer", offers]]) {
      const n = Number(count) || 0;
      for (let k = 0; k < n; k++) {
        toInsert.vendor_activities.push({ user_id: userId, activity_type: type, activity_date: isoDate, imported_placeholder: true, notes: "Imported from historical tracker — no per-event detail available in source sheet." });
      }
    }
    if (challenge && String(challenge).trim()) {
      toInsert.daily_notes.push({ user_id: userId, note_date: isoDate, challenge_text: String(challenge).trim() });
    }
  }

  // ── resolve job_applications resume_id from resumeLink, now that we know which docIds are already-known vs newly-imported-this-run ──
  for (const ja of toInsert.job_applications) {
    if (!ja._resumeLink) continue;
    const docId = extractDocId(ja._resumeLink);
    if (docId && docIdToResumeId.has(docId)) ja.resume_id = docIdToResumeId.get(docId);
  }

  // ── summary ──
  console.log("\n=== SHEET (2) INCREMENTAL IMPORT SUMMARY ===");
  console.log(`Daily tracker rows changed vs sheet (1): ${changedIdx.size} / ${maxLen - 1}`);
  console.log(`Names unmatched (${unmatchedNames.size}):`, [...unmatchedNames].sort());
  console.log(`LinkedIn profiles to insert:          ${toInsert.linkedin_profiles.length}`);
  console.log(`  (non-profile links skipped:         ${skipped.linkedinNonProfile})`);
  console.log(`Resumes to insert:                    ${toInsert.resumes.length}`);
  console.log(`  (already-represented skipped:       ${skipped.resumeExisting})`);
  console.log(`Job applications to insert:           ${toInsert.job_applications.length}`);
  console.log(`  (resume matched:                    ${toInsert.job_applications.filter(j => j.resume_id).length})`);
  console.log(`  (portal resolved:                   ${toInsert.job_applications.filter(j => j.portal_id).length})`);
  console.log(`  (no usable title, skipped:          ${skipped.noUsableTitle})`);
  const uniqueAmbiguous = [...new Map(skipped.ambiguousPortal.map(a => [`${a.row}::${a.text}`, a])).values()];
  console.log(`  (ambiguous portal name, ${skipped.ambiguousPortal.length} items / ${uniqueAmbiguous.length} distinct rows):`, uniqueAmbiguous);
  console.log(`Recruiter outreach to insert:          ${toInsert.recruiter_outreach.length}`);
  console.log(`Vendor activity events to insert:      ${toInsert.vendor_activities.length}`);
  console.log(`Daily notes to insert/update:          ${toInsert.daily_notes.length}`);

  if (!COMMIT) {
    console.log("\nDry run only — no data written. Re-run with --commit to write.");
    console.log("\nSample job_applications (first 5):", JSON.stringify(toInsert.job_applications.slice(0, 5).map(({ _resumeLink, ...r }) => r), null, 2));
    return;
  }

  console.log("\n=== COMMITTING ===");

  // Resumes first, so we can map any newly-created ones for job_applications.
  for (let i = 0; i < toInsert.resumes.length; i += 500) {
    const batch = toInsert.resumes.slice(i, i + 500).map(({ _docId, ...r }) => r);
    const { data, error } = await supabase.from("resumes").insert(batch).select("id, google_drive_link");
    if (error) { console.error(`  ✗ resumes batch ${i}:`, error.message); continue; }
    for (const row of data) {
      const docId = extractDocId(row.google_drive_link);
      if (docId) docIdToResumeId.set(docId, row.id);
    }
  }
  console.log(`  ✓ resumes: ${toInsert.resumes.length} rows`);

  for (const ja of toInsert.job_applications) {
    if (!ja.resume_id && ja._resumeLink) {
      const docId = extractDocId(ja._resumeLink);
      if (docId && docIdToResumeId.has(docId)) ja.resume_id = docIdToResumeId.get(docId);
    }
  }

  for (const [table, key] of [
    ["linkedin_profiles", "linkedin_profiles"],
    ["job_applications", "job_applications"],
    ["recruiter_outreach", "recruiter_outreach"],
    ["vendor_activities", "vendor_activities"],
  ]) {
    const rows = toInsert[key].map(({ _resumeLink, _docId, ...r }) => r);
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = await supabase.from(table).insert(batch);
      if (error) console.error(`  ✗ ${table} batch ${i}-${i + batch.length}:`, error.message);
    }
    console.log(`  ✓ ${table}: ${rows.length} rows`);
  }

  for (const note of toInsert.daily_notes) {
    const { error } = await supabase.from("daily_notes").upsert(note, { onConflict: "user_id,note_date" });
    if (error) console.error("  ✗ daily_notes:", note.user_id, note.note_date, error.message);
  }
  console.log(`  ✓ daily_notes: ${toInsert.daily_notes.length} rows`);

  console.log("\nDone.");
}

main().catch(e => { console.error("IMPORT FAILED:", e); process.exit(1); });
