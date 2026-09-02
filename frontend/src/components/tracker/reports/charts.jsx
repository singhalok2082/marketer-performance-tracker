import React, { useState } from "react";

// Horizontal bar chart — thin marks, rounded value-end anchored to the
// baseline, direct value labels on every bar (few enough rows to read as
// small multiples rather than clutter — dataviz skill's "selective" rule).
// Each datum can carry its own `color` (status charts); otherwise falls
// back to the single `color` prop (single-series comparisons).
export function BarChart({ data, color, unit = "", ariaLabel = "Bar chart" }) {
  if (!data.length) return <div className="text-sm text-muted">No data for this range.</div>;
  const max = Math.max(1, ...data.map(d => d.value));
  const [hover, setHover] = useState(null);
  const barH = 22, gap = 12, labelW = 130, chartW = 320, leftPad = labelW + 10, rightPad = 60;
  const totalH = data.length * (barH + gap) - gap;
  const svgW = leftPad + chartW + rightPad;

  return (
    <svg viewBox={`0 0 ${svgW} ${totalH}`} width="100%" height={totalH} role="img" aria-label={ariaLabel}>
      {data.map((d, i) => {
        const w = Math.max((d.value / max) * chartW, d.value > 0 ? 4 : 0);
        const y = i * (barH + gap);
        const dim = hover !== null && hover !== i;
        return (
          <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
            <title>{`${d.label}: ${d.value.toLocaleString()}${unit}`}</title>
            <text x={labelW} y={y + barH / 2} textAnchor="end" dominantBaseline="middle" fontSize="12" className="fill-medium">{d.label}</text>
            <rect x={leftPad} y={y} width={chartW} height={barH} rx={4} className="fill-surface-alt" />
            <rect x={leftPad} y={y} width={w} height={barH} rx={4} fill={d.color || color} opacity={dim ? 0.4 : 1} />
            <text x={leftPad + w + 8} y={y + barH / 2} dominantBaseline="middle" fontSize="12" fontWeight="600" className="fill-dark">
              {d.value.toLocaleString()}{unit}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Area/line trend — a single continuous series over time. Rounded line
// join, filled area at low opacity down to the baseline, sparse x-axis
// labels (start/mid/end only) so dates never collide regardless of how
// many points are in range. Tooltip is a real HTML element positioned over
// the hovered point (not the native SVG <title>, which is slow to appear
// and easy to miss) — shows the date and metric name immediately on hover.
export function TrendChart({ data, color, metricLabel = "Value", ariaLabel = "Trend over time" }) {
  if (!data.length) return <div className="text-sm text-muted">No data for this range.</div>;
  const w = 560, h = 160, padL = 34, padR = 12, padT = 12, padB = 24;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const max = Math.max(1, ...data.map(d => d.value));
  const [hover, setHover] = useState(null);

  const x = i => padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = v => padT + plotH - (v / max) * plotH;
  const points = data.map((d, i) => [x(i), y(d.value)]);
  const linePath = points.map(([px, py], i) => `${i === 0 ? "M" : "L"} ${px} ${py}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1][0]} ${padT + plotH} L ${points[0][0]} ${padT + plotH} Z`;

  const labelIdx = data.length <= 2 ? data.map((_, i) => i) : [0, Math.floor((data.length - 1) / 2), data.length - 1];
  const nearestIndex = (clientX, svgEl) => {
    const rect = svgEl.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * w;
    let best = 0, bestDist = Infinity;
    points.forEach(([px], i) => { const dist = Math.abs(px - relX); if (dist < bestDist) { bestDist = dist; best = i; } });
    return best;
  };

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label={ariaLabel}
        onMouseMove={e => setHover(nearestIndex(e.clientX, e.currentTarget))}
        onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} className="stroke-border" strokeWidth={1} />
        <path d={areaPath} fill={color} opacity={0.12} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <line x1={points[hover][0]} y1={padT} x2={points[hover][0]} y2={padT + plotH} className="stroke-border" strokeWidth={1} strokeDasharray="3,3" />
        )}
        {points.map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r={hover === i ? 5 : 3} fill={color} stroke="#fff" strokeWidth={1.5} />
        ))}
        {labelIdx.map(i => (
          <text key={i} x={x(i)} y={h - 6} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} fontSize="10" className="fill-muted">
            {data[i].label}
          </text>
        ))}
      </svg>
      {hover !== null && (
        <div className="absolute pointer-events-none bg-white border border-border rounded-lg shadow-popover px-2.5 py-1.5 text-xs whitespace-nowrap z-10"
          style={{
            left: `${(points[hover][0] / w) * 100}%`,
            top: `${(points[hover][1] / h) * 100}%`,
            transform: `translate(-50%, calc(-100% - 8px))`,
          }}>
          <div className="font-semibold text-dark">{data[hover].label}</div>
          <div className="text-muted">{metricLabel}: <span className="font-semibold text-dark">{data[hover].value.toLocaleString()}</span></div>
        </div>
      )}
    </div>
  );
}

// Donut chart with an always-present legend (direct-labeled with count + %),
// 2px white gap between segments, hover highlight + native tooltip.
export function PieChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const [hover, setHover] = useState(null);
  const r = 62, cx = 74, cy = 74;

  let cumulative = 0;
  const slices = total > 0 ? data.filter(d => d.value > 0).map(d => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += d.value;
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const [x1, y1] = [cx + r * Math.cos(startAngle), cy + r * Math.sin(startAngle)];
    const [x2, y2] = [cx + r * Math.cos(endAngle), cy + r * Math.sin(endAngle)];
    return { ...d, path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z` };
  }) : [];

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg viewBox="0 0 148 148" width="148" height="148" role="img" aria-label="Vendor activity mix">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} className="fill-surface-alt" />
        ) : slices.map((d, i) => (
          <path key={d.label} d={d.path} fill={d.color} stroke="#fff" strokeWidth={2}
            opacity={hover === null || hover === i ? 1 : 0.4}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
            <title>{`${d.label}: ${d.value.toLocaleString()} (${Math.round((d.value / total) * 100)}%)`}</title>
          </path>
        ))}
      </svg>
      <ul className="text-sm space-y-1.5 min-w-[180px]">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-muted">{d.label}</span>
            <span className="font-semibold text-dark ml-auto">{d.value.toLocaleString()} {total ? `(${Math.round((d.value / total) * 100)}%)` : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
