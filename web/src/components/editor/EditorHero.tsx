"use client";

import { useI18n } from "@/hooks/useI18n";

export function EditorHero() {
  const { t } = useI18n();

  return (
    <section className="tactical-panel p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.38em] text-[var(--trace-cyan)]">
        {t("editor.bridge")}
      </p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-mono text-4xl font-black uppercase tracking-[-0.08em] text-white">
            {t("editor.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-400">
            {t("editor.description")}
          </p>
        </div>
        <div className="border border-[rgba(255,138,61,0.35)] bg-[rgba(255,138,61,0.055)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--warning-orange)]">
          {t("editor.badge")}
        </div>
      </div>
    </section>
  );
}
