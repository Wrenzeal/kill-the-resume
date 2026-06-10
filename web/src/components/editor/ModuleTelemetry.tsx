"use client";

export function ModuleTelemetry({ items }: { items: Array<[string, string | number]> }) {
  return (
    <div className="min-w-56 border border-[rgba(57,255,136,0.26)] bg-[rgba(57,255,136,0.045)] p-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
      {items.map(([label, value], index) => (
        <div key={label} className={index > 0 ? "mt-2 flex items-center justify-between gap-5" : "flex items-center justify-between gap-5"}>
          <span>{label}</span>
          <span className="text-[var(--cyber-green)]">{value}</span>
        </div>
      ))}
    </div>
  );
}
