import React, { useState } from "react";

// Multi-select chips for the shared `portals` list, plus an inline "add a
// custom portal" input. Custom names are kept as plain strings until submit —
// the backend upserts them into the shared portals table by name.
export default function PortalPicker({ portals, selectedIds, onToggle, customNames, onAddCustom, onRemoveCustom }) {
  const [customInput, setCustomInput] = useState("");

  const addCustom = () => {
    const name = customInput.trim();
    if (!name) return;
    const existing = portals.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selectedIds.includes(existing.id)) onToggle(existing.id);
    } else if (!customNames.some(n => n.toLowerCase() === name.toLowerCase())) {
      onAddCustom(name);
    }
    setCustomInput("");
  };

  return (
    <div>
      <label className="block text-xs font-medium mb-1">Portals</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {portals.map(p => (
          <button key={p.id} type="button" onClick={() => onToggle(p.id)}
            className={`h-7 px-2.5 rounded-full text-xs font-semibold border transition-colors ${
              selectedIds.includes(p.id) ? "bg-primary text-white border-primary" : "border-border text-muted hover:bg-surface"
            }`}>
            {p.name}
          </button>
        ))}
        {customNames.map(name => (
          <span key={name} className="h-7 px-2.5 rounded-full text-xs font-semibold border bg-primary text-white border-primary inline-flex items-center gap-1.5">
            {name}
            <button type="button" onClick={() => onRemoveCustom(name)} className="leading-none font-bold">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={customInput} onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          placeholder="Add a portal not listed above…" className="flex-1 h-8 rounded-lg border border-border px-3 text-xs" />
        <button type="button" onClick={addCustom} className="h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-surface">Add</button>
      </div>
    </div>
  );
}
