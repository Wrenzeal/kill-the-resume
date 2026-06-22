"use client";

import Link from "next/link";
import { useI18n } from "@/hooks/useI18n";
import { LanguageToggle } from "@/components/editor/LanguageToggle";

export function HomeLaunch() {
  const { t } = useI18n();

  return (
    <section className="tactical-panel max-w-2xl p-10">
      <div className="flex items-start justify-between gap-6">
        <p className="font-mono text-[13px] uppercase tracking-[0.45em] text-[var(--cyber-green)]">
          kill-the-resume
        </p>
        <LanguageToggle compact />
      </div>
      <h1 className="mt-5 font-mono text-4xl font-black uppercase tracking-[-0.06em]">
        {t("home.title")}
      </h1>
      <p className="mt-4 text-[15px] leading-7 text-slate-400">
        {t("home.description")}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/editor"
          className="inline-flex border border-[rgba(57,255,136,0.45)] px-5 py-3 font-mono text-[13px] uppercase tracking-[0.28em] text-[var(--cyber-green)] shadow-[0_0_24px_rgba(57,255,136,0.13)] transition hover:bg-[rgba(57,255,136,0.08)]"
        >
          {t("home.cta")}
        </Link>
        <Link
          href="/job-radar"
          className="inline-flex border border-[rgba(88,230,255,0.4)] px-5 py-3 font-mono text-[13px] uppercase tracking-[0.28em] text-[var(--trace-cyan)] shadow-[0_0_24px_rgba(88,230,255,0.1)] transition hover:bg-[rgba(88,230,255,0.08)]"
        >
          {t("home.radarCta")}
        </Link>
      </div>
    </section>
  );
}
