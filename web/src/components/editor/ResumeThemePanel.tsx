"use client";

import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/css";
import { applyCustomAccentColor, applyThemePreset, resumeThemePresets } from "@/lib/resume-theme";
import { useEditorStore } from "@/store/editor-store";

export function ResumeThemePickerContent() {
  const { t } = useI18n();
  const theme = useEditorStore((state) => state.draft.theme);
  const updateTheme = useEditorStore((state) => state.updateTheme);

  return (
    <section className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(125,139,153,0.16)] pb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-[var(--warning-orange)]">{t("theme.eyebrow")}</p>
          <h2 className="mt-2 font-mono text-xl font-black uppercase tracking-[-0.04em] text-white">{t("theme.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{t("theme.description")}</p>
        </div>
        <div className="flex items-center gap-3 border border-[rgba(57,255,136,0.22)] bg-[rgba(57,255,136,0.04)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
          <span className="h-2.5 w-2.5 shadow-[0_0_14px_currentColor]" style={{ backgroundColor: theme.accentColor, color: theme.accentColor }} />
          <span>{t("theme.current")}</span>
          <span className="text-slate-200">{theme.accentColor}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">{t("theme.presets")}</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {resumeThemePresets.map((preset) => {
              const active = theme.presetId === preset.id && theme.accentColor.toLowerCase() === preset.accentColor.toLowerCase();

              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateTheme(applyThemePreset(preset))}
                  className={cn(
                    "group flex items-center gap-3 border bg-black/20 px-3 py-3 text-left transition focus-visible:outline-none",
                    active
                      ? "border-[rgba(57,255,136,0.55)] shadow-[0_0_22px_rgba(57,255,136,0.12),inset_0_0_18px_rgba(57,255,136,0.035)]"
                      : "border-[rgba(125,139,153,0.18)] hover:border-[rgba(88,230,255,0.38)] hover:bg-[rgba(88,230,255,0.04)]",
                  )}
                >
                  <span className="h-8 w-8 shrink-0 border border-white/10 shadow-[0_0_18px_rgba(0,0,0,0.34)]" style={{ backgroundColor: preset.accentColor }} />
                  <span className="min-w-0">
                    <span className={cn("block font-mono text-[11px] uppercase tracking-[0.16em]", active ? "text-[var(--cyber-green)]" : "text-slate-300 group-hover:text-white")}>{t(preset.labelKey)}</span>
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600">{preset.accentColor}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col justify-between border border-[rgba(125,139,153,0.18)] bg-black/20 p-4">
          <span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">{t("theme.custom")}</span>
            <span className="mt-2 block text-sm leading-6 text-slate-500">{t("theme.customHint")}</span>
          </span>
          <span className="mt-5 flex items-center gap-3">
            <input
              type="color"
              aria-label={t("theme.custom")}
              value={theme.accentColor}
              onChange={(event) => updateTheme(applyCustomAccentColor(event.target.value, theme))}
              className="h-11 w-14 cursor-pointer border border-[rgba(88,230,255,0.28)] bg-transparent p-1"
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">{theme.presetId === "custom" ? t("theme.customActive") : t("theme.presetActive")}</span>
          </span>
        </label>
      </div>
    </section>
  );
}


export function ResumeThemePanel() {
  const { t } = useI18n();
  const theme = useEditorStore((state) => state.draft.theme);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" data-resume-theme-trigger>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="border border-[rgba(88,230,255,0.36)] px-2 py-1 text-[8px] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_16px_rgba(88,230,255,0.18)]"
      >
        <span className="mr-1 inline-block h-2 w-2 align-[-1px]" style={{ backgroundColor: theme.accentColor }} />
        {t("theme.title")}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-40 mt-3 w-[min(520px,82vw)] border border-[rgba(125,139,153,0.22)] bg-[#080c11] p-4 shadow-[0_0_38px_rgba(0,0,0,0.55)]" data-resume-theme-popover>
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--warning-orange)]">{t("theme.title")}</p>
            <button type="button" onClick={() => setOpen(false)} className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 transition hover:text-[var(--warning-orange)]">{t("theme.close")}</button>
          </div>
          <ResumeThemePickerContent />
        </div>
      ) : null}
    </div>
  );
}
