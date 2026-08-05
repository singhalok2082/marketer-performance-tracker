import React, { useState, useEffect, useCallback } from "react";
import { Radio, ChevronDown, ChevronUp } from "lucide-react";
import api from "../../api/client";

const CATEGORY_LABELS = {
  applications: "Submissions", outreach: "Outreach", linkedin: "LinkedIn", resumes: "Resumes",
  tickets: "Tickets", notes: "Notes",
  cold_email: "Cold emails", vendor_call: "Vendor calls", tech_screening: "Tech screenings",
  interview: "Interviews", offer: "Offers",
};

function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function LiveFeed() {
  const [date, setDate] = useState(TODAY);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());
  const isToday = date === TODAY;

  const load = useCallback(() => {
    api.get(`/audit/feed?date=${date}`)
      .then(r => setManagers(r.data.managers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    setLoading(true);
    load();
    if (!isToday) return;
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load, isToday]);

  const toggle = (uid) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(uid) ? next.delete(uid) : next.add(uid);
    return next;
  });

  const totalToday = managers.reduce((sum, m) => sum + m.total, 0);

  return (
    <div className="card p-5 mb-5">
      <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Radio size={16} className={isToday ? "text-emerald-500" : "text-muted"} strokeWidth={2.25} />
          <div className="text-[13.5px] font-bold">Live Feed</div>
          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />}
          <div className="text-xs text-subtle">{isToday ? `${totalToday} update${totalToday === 1 ? "" : "s"} today` : `${totalToday} update${totalToday === 1 ? "" : "s"}`}</div>
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button onClick={() => setDate(TODAY)} className="text-xs font-semibold text-primary hover:underline">
              Jump to today
            </button>
          )}
          <input type="date" value={date} max={TODAY} onChange={e => setDate(e.target.value)}
            className="h-8 rounded-lg border border-border px-2 text-xs" />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted py-6 text-center">Loading feed…</div>
      ) : managers.length === 0 ? (
        <div className="text-sm text-subtle py-6 text-center">No activity logged {isToday ? "yet today" : "on this day"}.</div>
      ) : (
        <div className="space-y-2">
          {managers.map(m => {
            const open = expanded.has(m.user_id);
            return (
              <div key={m.user_id} className="border border-border rounded-lg overflow-hidden">
                <button onClick={() => toggle(m.user_id)}
                  className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-surface transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-zinc-800 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {m.user_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="font-semibold text-[13px] truncate">{m.user_name}</div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {Object.entries(m.counts).map(([cat, n]) => (
                        <span key={cat} className="badge bg-surface-alt text-medium">{n} {CATEGORY_LABELS[cat] || cat}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-subtle">{m.total} total</span>
                    {open ? <ChevronUp size={15} className="text-muted" /> : <ChevronDown size={15} className="text-muted" />}
                  </div>
                </button>
                {open && (
                  <div className="border-t border-border divide-y divide-border">
                    {m.events.map(ev => (
                      <div key={ev.id} className="px-3.5 py-2 flex items-center justify-between gap-3 text-[13px]">
                        <span className="text-dark">{ev.label}</span>
                        <span className="text-xs text-subtle whitespace-nowrap" title={fmtTime(ev.time)}>
                          {isToday ? timeAgo(ev.time) : fmtTime(ev.time)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
