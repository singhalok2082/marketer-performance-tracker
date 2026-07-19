/**
 * One-off historical import from "Account Manager's Sheet (1).xlsx" into the
 * new tracking tables. Defaults to a dry run (prints a summary, writes
 * nothing). Pass --commit to actually write.
 *
 *   node supabase/import-history.js "/path/to/Account Manager's Sheet (1).xlsx"
 *   node supabase/import-history.js "/path/to/sheet.xlsx" --commit
 */
require("dotenv").config({ path: "../backend/.env" });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const argv = process.argv.slice(2);
const COMMIT = argv.includes("--commit");
const filePath = argv.find(a => !a.startsWith("--"));

if (!filePath) {
  console.error("Usage: node import-history.js <path-to-xlsx> [--commit]");
  process.exit(1);
}

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
    const m = val.match(/(\d{2})-(\w{3})-(\d{4})/); // "07-Jul-2026 (Tue)"
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
  // Real entries vary: "Vendor:- N", "Vendor - N", "Vendor-N", "Vendor N", and
  // sometimes multiple comma-separated pairs on one line.
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

function extractGoogleDocId(url) {
  const m = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// ── load workbook ────────────────────────────────────────────────
const wb = XLSX.readFile(filePath, { cellDates: true });
const dailyRows = XLSX.utils.sheet_to_json(wb.Sheets["1_Daily_Tracker"], { header: 1, defval: null });
const linkedinRows = XLSX.utils.sheet_to_json(wb.Sheets["LinkedIn_Mastersheet"], { header: 1, defval: null });

const summary = {
  usersMatched: new Set(),
  usersSkipped: new Set(),
  linkedin: 0,
  outreach: 0,
  coldEmails: 0,
  vendorCalls: 0,
  placeholders: { tech_screening: 0, interview: 0, offer: 0 },
  dailyNotes: 0,
  resumesAttempted: 0,
  resumesUploaded: 0,
  resumesFailed: [],
};

const toInsert = { linkedin_profiles: [], recruiter_outreach: [], vendor_activities: [], daily_notes: [], resumes: [] };

async function main() {
  const { data: users, error: userErr } = await supabase
    .from("users").select("id, name").eq("role", "account_manager").eq("is_active", true);
  if (userErr) { console.error("Failed to load users:", userErr.message); process.exit(1); }

  const userByName = new Map(users.map(u => [u.name.trim().toLowerCase(), u.id]));

  function resolveUser(name) {
    if (!name) return null;
    const key = String(name).trim().toLowerCase();
    if (SKIP_NAMES.has(key)) { summary.usersSkipped.add(name); return null; }
    const id = userByName.get(key);
    if (!id) { summary.usersSkipped.add(name); return null; }
    summary.usersMatched.add(name);
    return id;
  }

  // ── LinkedIn profiles from LinkedIn_Mastersheet ──
  for (const row of linkedinRows.slice(1)) {
    const [teamLead, employee, , urlCell, techCell, locCell, connCell] = row;
    if (!employee || String(employee).toLowerCase().includes("team")) continue;
    const userId = resolveUser(employee);
    if (!userId) continue;

    const urls = splitLines(urlCell);
    const techs = splitLines(techCell);
    const locs = splitLines(locCell);
    const conns = splitLines(connCell);
    urls.forEach((url, i) => {
      if (!/^https?:\/\//.test(url)) return;
      toInsert.linkedin_profiles.push({
        user_id: userId,
        linkedin_url: url,
        title: stripPrefix(techs[i] || techs[0] || "Untitled"),
        location: locs[i] ? stripPrefix(locs[i]) : null,
        connections: conns[i] ? parseInt(String(conns[i]).replace(/\D/g, ""), 10) || 0 : 0,
      });
      summary.linkedin++;
    });
  }

  // ── Daily tracker: outreach, activities, notes, resumes ──
  for (const row of dailyRows.slice(1)) {
    const [
      dateCell, teamLead, employee, , resumeLinks, techStacks, , , , recruiterReached,
      empType, vendorCompany, jobRole, , , , , , , , , , ,
      coldEmailsSent, , callDuration, techScreening, interviewCalls, offers, challenge,
    ] = row;

    if (!employee) continue;
    if (String(teamLead || "").toLowerCase().includes("team")) continue; // "Bharat Team" / "Ankit Team" marker rows
    if (String(teamLead || "").toLowerCase() === "sample data") continue;

    const userId = resolveUser(employee);
    if (!userId) continue;

    const isoDate = toISODate(dateCell);
    if (!isoDate) continue; // header/marker rows with no real date

    // Recruiter outreach
    const channels = splitLines(recruiterReached);
    const empTypes = splitLines(empType);
    const vendors = splitLines(vendorCompany);
    const roles = splitLines(jobRole);
    const outreachCount = Math.max(channels.length, empTypes.length, vendors.length, roles.length);
    for (let i = 0; i < outreachCount; i++) {
      if (!channels[i] && !vendors[i] && !roles[i]) continue;
      const rawChannel = stripPrefix(channels[i] || "");
      let channel = null;
      if (/linkedin/i.test(rawChannel) && /email/i.test(rawChannel)) channel = "Both";
      else if (/linkedin/i.test(rawChannel)) channel = "LinkedIn";
      else if (/email/i.test(rawChannel)) channel = "Email";

      const rawEmp = stripPrefix(empTypes[i] || "");
      let employment_type = null;
      if (/c2c/i.test(rawEmp)) employment_type = "C2C";
      else if (/w2/i.test(rawEmp)) employment_type = "W2";
      else if (/full\s*time|fulltime/i.test(rawEmp)) employment_type = "Full Time";

      toInsert.recruiter_outreach.push({
        user_id: userId, channel, employment_type,
        vendor_company: vendors[i] ? stripPrefix(vendors[i]) : null,
        job_role: roles[i] ? stripPrefix(roles[i]) : null,
        contacted_date: isoDate,
        notes: null,
      });
      summary.outreach++;
    }

    // Cold emails
    for (const { vendor, count } of parseVendorCounts(coldEmailsSent)) {
      for (let i = 0; i < count; i++) {
        toInsert.vendor_activities.push({
          user_id: userId, activity_type: "cold_email", vendor_company: vendor,
          activity_date: isoDate, imported_placeholder: false,
        });
        summary.coldEmails++;
      }
    }

    // Vendor calls
    for (const { duration_minutes, notes } of parseCallDurations(callDuration)) {
      toInsert.vendor_activities.push({
        user_id: userId, activity_type: "vendor_call", duration_minutes, notes,
        activity_date: isoDate, imported_placeholder: false,
      });
      summary.vendorCalls++;
    }

    // Tech screenings / interviews / offers — counts only, placeholder rows
    for (const [type, count] of [["tech_screening", techScreening], ["interview", interviewCalls], ["offer", offers]]) {
      const n = Number(count) || 0;
      for (let i = 0; i < n; i++) {
        toInsert.vendor_activities.push({
          user_id: userId, activity_type: type, activity_date: isoDate,
          imported_placeholder: true, notes: "Imported from historical tracker — no per-event detail available in source sheet.",
        });
        summary.placeholders[type]++;
      }
    }

    // Daily challenge note
    if (challenge && String(challenge).trim()) {
      toInsert.daily_notes.push({ user_id: userId, note_date: isoDate, challenge_text: String(challenge).trim() });
      summary.dailyNotes++;
    }

    // Resumes (Google Doc links)
    const links = splitLines(resumeLinks);
    const techs = splitLines(techStacks);
    links.forEach((link, i) => {
      if (!/docs\.google\.com/.test(link)) return;
      summary.resumesAttempted++;
      toInsert.resumes.push({ user_id: userId, link, title: stripPrefix(techs[i] || techs[0] || "Imported resume") });
    });
  }

  // ── Print dry-run summary ──
  console.log("\n=== IMPORT SUMMARY ===");
  console.log(`Users matched (${summary.usersMatched.size}):`, [...summary.usersMatched].sort());
  console.log(`Names skipped/unmatched (${summary.usersSkipped.size}):`, [...summary.usersSkipped].sort());
  console.log(`LinkedIn profiles to insert:        ${summary.linkedin}`);
  console.log(`Recruiter outreach to insert:       ${summary.outreach}`);
  console.log(`Cold email events to insert:        ${summary.coldEmails}`);
  console.log(`Vendor call events to insert:        ${summary.vendorCalls}`);
  console.log(`Tech screening placeholders:         ${summary.placeholders.tech_screening}`);
  console.log(`Interview placeholders:              ${summary.placeholders.interview}`);
  console.log(`Offer placeholders:                  ${summary.placeholders.offer}`);
  console.log(`Daily notes to insert:                ${summary.dailyNotes}`);
  console.log(`Resume links found (will attempt fetch): ${summary.resumesAttempted}`);

  if (!COMMIT) {
    console.log("\nDry run only — no data written. Re-run with --commit to write.");
    return;
  }

  console.log("\n=== COMMITTING ===");

  for (const [table, key] of [
    ["linkedin_profiles", "linkedin_profiles"],
    ["recruiter_outreach", "recruiter_outreach"],
    ["vendor_activities", "vendor_activities"],
  ]) {
    const rows = toInsert[key];
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = await supabase.from(table).insert(batch);
      if (error) console.error(`  ✗ ${table} batch ${i}-${i + batch.length}:`, error.message);
    }
    console.log(`  ✓ ${table}: ${rows.length} rows`);
  }

  // Daily notes — upsert to respect the one-per-user-per-day constraint
  for (const note of toInsert.daily_notes) {
    const { error } = await supabase.from("daily_notes").upsert(note, { onConflict: "user_id,note_date" });
    if (error) console.error("  ✗ daily_notes:", note.user_id, note.note_date, error.message);
  }
  console.log(`  ✓ daily_notes: ${toInsert.daily_notes.length} rows`);

  // Resumes — fetch each Google Doc as PDF, upload, insert row
  for (const r of toInsert.resumes) {
    const docId = extractGoogleDocId(r.link);
    if (!docId) { summary.resumesFailed.push({ link: r.link, reason: "could not parse doc id" }); continue; }
    try {
      const resp = await fetch(`https://docs.google.com/document/d/${docId}/export?format=pdf`);
      const contentType = resp.headers.get("content-type") || "";
      if (!resp.ok || !contentType.includes("pdf")) {
        summary.resumesFailed.push({ link: r.link, reason: `fetch failed (status ${resp.status}, type ${contentType})` });
        continue;
      }
      const buf = Buffer.from(await resp.arrayBuffer());
      const storagePath = `${r.user_id}/${crypto.randomUUID()}.pdf`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(storagePath, buf, { contentType: "application/pdf" });
      if (upErr) { summary.resumesFailed.push({ link: r.link, reason: upErr.message }); continue; }

      const { error: insErr } = await supabase.from("resumes").insert({
        user_id: r.user_id, title: r.title, file_path: storagePath,
        file_name: `imported-${docId}.pdf`, file_type: "pdf", is_active: true,
      });
      if (insErr) { summary.resumesFailed.push({ link: r.link, reason: insErr.message }); continue; }
      summary.resumesUploaded++;
    } catch (e) {
      summary.resumesFailed.push({ link: r.link, reason: e.message });
    }
  }
  console.log(`  ✓ resumes uploaded: ${summary.resumesUploaded} / ${summary.resumesAttempted}`);
  if (summary.resumesFailed.length) {
    console.log(`  ✗ resumes failed (${summary.resumesFailed.length}) — need manual re-upload:`);
    summary.resumesFailed.forEach(f => console.log(`      ${f.link} — ${f.reason}`));
  }

  console.log("\nDone.");
}

main().catch(e => { console.error("IMPORT FAILED:", e); process.exit(1); });
