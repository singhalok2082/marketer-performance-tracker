import React, { useState } from "react";

// Horizontal bar chart — one series, thin marks, rounded value-end anchored
// to the baseline, direct value labels (every bar, since there are few
// enough managers for this to read as a small-multiples table rather than
// clutter — see dataviz skill's "selective" rule).
export function BarChart({ data, color, unit = "" }) {
  if (!data.length) return <div className="text-sm text-muted">No data for this range.</div>;
  const max = Math.max(1, ...data.map(d => d.value));
  const [hover, setHover] = useState(null);
  const barH = 22, gap = 12, labelW = 130, chartW = 320, leftPad = labelW + 10, rightPad = 60;
  const totalH = data.length * (barH + gap) - gap;
  const svgW = leftPad + chartW + rightPad;

  return (
    <svg viewBox={`0 0 ${svgW} ${totalH}`} width="100%" height={totalH} role="img" aria-label="Applications per manager">
      {data.map((d, i) => {
        const w = Math.max((d.value / max) * chartW, d.value > 0 ? 4 : 0);
        const y = i * (barH + gap);
        const dim = hover !== null && hover !== i;
        return (
          <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
            <title>{`${d.label}: ${d.value.toLocaleString()}${unit}`}</title>
            <text x={labelW} y={y + barH / 2} textAnchor="end" dominantBaseline="middle" fontSize="12" className="fill-medium">{d.label}</text>
            <rect x={leftPad} y={y} width={chartW} height={barH} rx={4} className="fill-surface-alt" />
            <rect x={leftPad} y={y} width={w} height={barH} rx={4} fill={color} opacity={dim ? 0.4 : 1} />
            <text x={leftPad + w + 8} y={y + barH / 2} dominantBaseline="middle" fontSize="12" fontWeight="600" className="fill-dark">
              {d.value.toLocaleString()}{unit}
            </text>
          </g>
        );
      })}
    </svg>
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
