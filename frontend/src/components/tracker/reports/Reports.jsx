import React, { useState, useEffect, useCallback } from "react";
import api from "../../../api/client";
import { BarChart, PieChart } from "./charts";
import { getRangeBounds, fmtDateLabel, downloadReportCsv } from "./reportHelpers";

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

function KpiCard({ label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] text-muted font-semibold mb-1.5 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-extrabold tracking-tight text-dark">{value}</div>
      {sub && <div className="text-xs text-subtle mt-1">{sub}</div>}
    </div>
  );
}

export default function Reports() {
  const [range, setRange] = useState("monthly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <p className="text-sm text-muted">Team performance across applications, outreach, and vendor activity.</p>
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
            <KpiCard label="Inbound Outreach" value={report.totals.outreach.toLocaleString()} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="text-sm font-semibold mb-3">Applications per manager</div>
              <BarChart color="#2a78d6" data={report.byManager.map(m => ({ label: m.name, value: m.applications }))} />
            </div>
            <div className="card p-4">
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
                    <th className="px-4 py-2.5 font-semibold text-muted text-[11px] uppercase tracking-wide text-right">Outreach</th>
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
