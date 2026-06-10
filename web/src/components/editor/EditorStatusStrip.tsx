"use client";

import { useI18n } from "@/hooks/useI18n";
import { LanguageToggle } from "@/components/editor/LanguageToggle";
import { PreviewToggle } from "@/components/editor/PreviewToggle";
import { ResumeExportActions } from "@/components/editor/ResumeExportActions";

export function EditorStatusStrip() {
  const { t } = useI18n();

  const telemetry = [
    [t("status.route"), "/editor"],
    [t("status.mode"), t("status.modeValue")],
    [t("status.data"), t("status.dataValue")],
    ["A4", t("status.a4Value")],
  ];

  return (
    <header className="border-b border-[rgba(125,139,153,0.18)] bg-[#080c11]/88 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.28em] text-slate-400">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-[var(--cyber-green)]">
          <span className="h-2 w-2 animate-pulse bg-[var(--cyber-green)] shadow-[0_0_18px_rgba(57,255,136,0.9)]" />
          <span>{t("status.operation")}</span>
        </div>
        <div className="flex items-center gap-4">
          <dl className="hidden items-center gap-4 xl:flex">
            {telemetry.map(([label, value]) => (
              <div key={label} className="flex items-center gap-2">
                <dt className="text-slate-600">{label}</dt>
                <dd className="text-slate-300">{value}</dd>
              </div>
            ))}
          </dl>
          <PreviewToggle />
          <ResumeExportActions variant="compact" />
          <LanguageToggle compact />
        </div>
      </div>
    </header>
  );
}
