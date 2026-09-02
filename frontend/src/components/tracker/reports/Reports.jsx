import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/client";
import { BarChart, PieChart, TrendChart } from "./charts";
import { getRangeBounds, fmtDateLabel, fmtShortDate, downloadReportCsv } from "./reportHelpers";

const RANGE_OPTIONS = [["weekly", "Weekly"], ["monthly", "Monthly"], ["sixmonth", "6 Months"], ["custom", "Custom"]];

// Fixed categorical order, validated with the dataviz skill's palette
// validator (all-pairs pass for this 5-slot set; the two WARN-band contrast
// pairs are relieved by the always-visible legend + direct value labels).
const ACTIVITY_COLORS = {
  cold_email: "#4a3aa7",
  vendor_call: "#1baf7a",
  tech_screening: "#eda100",
  interview: "#2a78d6",
  offer: "#008300",
};
const ACTIVITY_LABELS = {
  cold_email: "Cold Emails",
  vendor_call: "Vendor Calls",
  tech_screening: "Tech Screenings",
  interview: "Interviews",
  offer: "Offers",
};

// Status is a state, not an identity — reuses the same colors already
// shipped on every status badge elsewhere in the app (Job Applications,
// Candidate Bench activity), so this chart doesn't introduce a second
// meaning for "green" or "red."
const STATUS_COLORS = {
  "Applied": "#D97706",
  "Submitted to Client": "#9333EA",
  "Interview Scheduled": "#2563EB",
  "Offer": "#16A34A",
  "Rejected": "#DC2626",
  "No Response": "#6B7280",
};

// Each metric gets its own small trend chart rather than overlaying them on
// one shared axis — applications run in the hundreds and offers in single
// digits, so one linear scale would make offers invisible (the dataviz
// skill's "two measures of different scale -> small multiples" rule).
// Colors for cold email/vendor call/screening/interview/offer match
// ACTIVITY_COLORS so the same metric reads the same color everywhere.
const TREND_METRICS = [
  { key: "applications", label: "Applications", color: "#eb6834" },
  { key: "submissions", label: "Submissions", color: "#e87ba4" },
  { key: "coldEmails", label: "Cold Emails", color: ACTIVITY_COLORS.cold_email },
  { key: "vendorCalls", label: "Vendor Calls", color: ACTIVITY_COLORS.vendor_call },
  { key: "techScreenings", label: "Tech Screenings", color: ACTIVITY_COLORS.tech_screening },
  { key: "interviews", label: "Interviews", color: ACTIVITY_COLORS.interview },
  { key: "offers", label: "Offers", color: ACTIVITY_COLORS.offer },
  { key: "outreach", label: "Inbound Requirements", color: "#e34948" },
];
const DEFAULT_TREND_METRICS = ["applications"];

function KpiCard({ label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] text-muted font-semibold mb-1.5 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-extrabold tracking-tight text-dark">{value}</div>
      {sub && <div className="text-xs text-subtle mt-1">{sub}</div>}
    </div>
  );
}

export default function Reports({ user }) {
  const [range, setRange] = useState("monthly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMetricPicker, setShowMetricPicker] = useState(false);

  // Persisted per-admin, same pattern as the dashboard's own background/theme
  // preference — "tick or untick what I want to see" sticks across visits.
  const metricsKey = `pulse-reports-trend-metrics:${user?.id || "admin"}`;
  const [selectedMetrics, setSelectedMetrics] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(metricsKey));
      return Array.isArray(saved) && saved.length ? saved : DEFAULT_TREND_METRICS;
    } catch { return DEFAULT_TREND_METRICS; }
  });
  const toggleMetric = (key) => {
    setSelectedMetrics(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      const safe = next.length ? next : prev; // keep at least one selected
      try { localStorage.setItem(metricsKey, JSON.stringify(safe)); } catch { /* ignore */ }
      return safe;
    });
  };

  const { start, end } = getRangeBounds(range, customStart, customEnd);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get("/reports/team-performance", { params: { start, end } })
      .then(r => setReport(r.data))
      .catch(err => setError(err.response?.data?.error || "Failed to load report"))
      .finally(() => setLoading(false));
  }, [start, end]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap print-hide">
        <p className="text-sm text-muted">Team performance across applications, inbound requirements, and vendor activity.</p>
        <div className="flex items-center gap-2 flex-wrap">
          {RANGE_OPTIONS.map(([key, label]) => (
            <button key={key} onClick={() => setRange(key)}
              className={`h-8 px-3 rounded-lg text-xs font-semibold border ${range === key ? "bg-primary text-white border-primary" : "bg-white text-medium border-border"}`}>
              {label}
            </button>
          ))}
          {range === "custom" && (
            <>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="input h-8 w-36 text-xs" />
              <span className="text-muted text-xs">to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="input h-8 w-36 text-xs" />
            </>
          )}
        </div>
      </div>

      {error && <div className="text-sm rounded-lg px-4 py-3 border bg-red-50 border-red-200 text-red-700">{error}</div>}

      {loading ? (
        <div className="text-center py-10 text-muted">Loading report…</div>
      ) : report && (
        <div id="report-print-area" className="print-area space-y-5">
          <div className="hidden print:block text-lg font-bold">ConsultAdd Pulse — Team Performance Report</div>
          <div className="hidden print:block text-sm text-muted mb-2">{fmtDateLabel(report.range.start)} – {fmtDateLabel(report.range.end)}</div>

          <div className="flex items-center justify-between gap-3 flex-wrap print-hide">
            <div className="text-xs text-muted">{fmtDateLabel(report.range.start)} – {fmtDateLabel(report.range.end)}</div>
            <div className="flex gap-2">
              <button onClick={() => downloadReportCsv(report)} className="h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-surface">Download CSV</button>
              <button onClick={() => window.print()} className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover">Download PDF</button>
            </div>
          </div>

          <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
            <KpiCard label="Applications" value={report.totals.applications.toLocaleString()} />
            <KpiCard label="Submissions" value={report.totals.submissions.toLocaleString()} sub={`${report.totals.submissionRate}% submission rate`} />
            <KpiCard label="Interviews" value={report.totals.interviews.toLocaleString()} />
            <KpiCard label="Offers" value={report.totals.offers.toLocaleString()} />
            <KpiCard label="Cold Emails" value={report.totals.coldEmails.toLocaleString()} />
            <KpiCard label="Vendor Calls" value={report.totals.vendorCalls.toLocaleString()} />
            <KpiCard label="Inbound Requirements" value={report.totals.outreach.toLocaleString()} />
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between gap-3 mb-1 print-hide">
              <div>
                <div className="text-sm font-semibold">Trends over time</div>
                <div className="text-xs text-muted">
                  {report.trend.granularity === "week" ? "Grouped by week — range is long enough that daily points would overlap." : "Daily."}
                </div>
              </div>
              <button onClick={() => setShowMetricPicker(s => !s)} className="h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-surface shrink-0">
                Customize ({selectedMetrics.length})
              </button>
            </div>
            <div className="hidden print:block text-sm font-semibold mb-3">Trends over time</div>

            {showMetricPicker && (
              <div className="print-hide grid gap-1.5 mb-4 mt-2 p-3 rounded-lg bg-surface border border-border" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
                {TREND_METRICS.map(m => (
                  <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={selectedMetrics.includes(m.key)} onChange={() => toggleMetric(m.key)} />
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                    {m.label}
                  </label>
                ))}
              </div>
            )}

            <div className={`grid gap-4 ${selectedMetrics.length > 1 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
              {TREND_METRICS.filter(m => selectedMetrics.includes(m.key)).map(m => (
                <div key={m.key}>
                  <div className="text-xs font-semibold text-medium mb-1.5">{m.label}</div>
                  <TrendChart color={m.color} metricLabel={m.label} ariaLabel={`${m.label} over time`}
                    data={report.trend.points.map(p => ({ label: fmtShortDate(p.date), value: p[m.key] || 0 }))} />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="text-sm font-semibold mb-3">Applications per manager</div>
              <BarChart color="#2a78d6" ariaLabel="Applications per manager" data={report.byManager.map(m => ({ label: m.name, value: m.applications }))} />
            </div>
            <div className="card p-4">
              <div className="text-sm font-semibold mb-3">Applications by status</div>
              <BarChart ariaLabel="Applications by status" data={Object.entries(STATUS_COLORS).map(([status, color]) => ({
                label: status, value: report.byStatus[status] || 0, color,
              }))} />
            </div>
            <div className="card p-4 lg:col-span-2">
              <div className="text-sm font-semibold mb-3">Vendor activity mix</div>
              <PieChart data={Object.entries(ACTIVITY_LABELS).map(([key, label]) => ({
                label, color: ACTIVITY_COLORS[key], value: report.byActivityType[key] || 0,
              }))} />
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="text-sm font-semibold px-4 pt-4 pb-2">Per-manager breakdown</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-alt text-left">
                    <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide">Manager</th>
                    <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide text-right">Applications</th>
                    <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide text-right">Submissions</th>
                    <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide text-right">Sub. Rate</th>
                    <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide text-right">Cold Emails</th>
                    <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide text-right">Vendor Calls</th>
                    <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide text-right">Screenings</th>
                    <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide text-right">Interviews</th>
                    <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide text-right">Offers</th>
                    <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide text-right">Inbound Reqs.</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byManager.map(m => (
                    <tr key={m.user_id} className="border-t border-border">
                      <td className="px-4 py-2.5 font-medium">{m.name}</td>
                      <td className="px-4 py-2.5 text-right">{m.applications.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">{m.submissions.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">{m.submissionRate}%</td>
                      <td className="px-4 py-2.5 text-right">{m.coldEmails.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">{m.vendorCalls.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">{m.techScreenings.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">{m.interviews.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">{m.offers.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">{m.outreach.toLocaleString()}</td>
                    </tr>
                  ))}
                  {report.byManager.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-8 text-muted">No account managers found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
