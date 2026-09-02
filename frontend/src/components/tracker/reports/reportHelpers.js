const TODAY = new Date().toISOString().slice(0, 10);

function fmtIso(d) { return d.toISOString().slice(0, 10); }

export function getRangeBounds(range, customStart, customEnd) {
  if (range === "custom") return { start: customStart || "2026-01-01", end: customEnd || TODAY };
  const daysMap = { weekly: 7, monthly: 30, sixmonth: 182 };
  const days = daysMap[range] || 30;
  const d = new Date(TODAY + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return { start: fmtIso(d), end: TODAY };
}

export function fmtDateLabel(iso) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const CSV_COLUMNS = [
  ["name", "Manager"],
  ["applications", "Applications"],
  ["submissions", "Submissions"],
  ["submissionRate", "Submission Rate %"],
  ["coldEmails", "Cold Emails"],
  ["vendorCalls", "Vendor Calls"],
  ["techScreenings", "Tech Screenings"],
  ["interviews", "Interviews"],
  ["offers", "Offers"],
  ["outreach", "Outreach"],
];

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadReportCsv(report) {
  const lines = [CSV_COLUMNS.map(([, label]) => csvEscape(label)).join(",")];
  for (const row of report.byManager) {
    lines.push(CSV_COLUMNS.map(([key]) => csvEscape(row[key])).join(","));
  }
  lines.push("");
  lines.push(`Team Total,${report.totals.applications},${report.totals.submissions},${report.totals.submissionRate},${report.totals.coldEmails},${report.totals.vendorCalls},${report.totals.techScreenings},${report.totals.interviews},${report.totals.offers},${report.totals.outreach}`);

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `team-performance_${report.range.start}_to_${report.range.end}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
