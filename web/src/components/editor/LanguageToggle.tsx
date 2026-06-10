"use client";

import { cn } from "@/lib/css";
import { languageOptions, type Language } from "@/lib/i18n";
import { useI18n } from "@/hooks/useI18n";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
      {!compact ? <span>{t("language.label")}</span> : null}
      <div
        role="group"
        aria-label={t("language.label")}
        className="flex border border-[rgba(125,139,153,0.24)] bg-black/30"
      >
        {languageOptions.map((option) => {
          const isActive = language === option.code;

          return (
            <button
              key={option.code}
              type="button"
              aria-pressed={isActive}
              aria-label={`${t("language.current")}: ${t(option.labelKey)}`}
              onClick={() => setLanguage(option.code as Language)}
              className={cn(
                "px-3 py-2 transition",
                isActive
                  ? "bg-[rgba(57,255,136,0.12)] text-[var(--cyber-green)] shadow-[0_0_18px_rgba(57,255,136,0.14)]"
                  : "text-slate-500 hover:bg-[rgba(88,230,255,0.06)] hover:text-slate-200",
              )}
            >
              {option.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
