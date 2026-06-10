"use client";

import type { ReactNode } from "react";

export function ModuleShell({
  id,
  eyebrow,
  title,
  telemetry,
  children,
  footer,
}: {
  id: string;
  eyebrow: string;
  title: string;
  telemetry?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section id={id} className="tactical-panel scanline relative overflow-hidden p-5">
      <div className="relative z-10">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(125,139,153,0.18)] pb-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.38em] text-[var(--warning-orange)]">
              {eyebrow}
            </p>
            <h2 className="mt-3 font-mono text-2xl font-black uppercase tracking-[-0.06em] text-white">
              {title}
            </h2>
          </div>
          {telemetry}
        </div>

        <div className="mt-5">{children}</div>
        {footer ? <div className="mt-5 border-t border-[rgba(125,139,153,0.18)] pt-5">{footer}</div> : null}
      </div>
    </section>
  );
}
