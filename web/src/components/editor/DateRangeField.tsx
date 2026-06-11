"use client";

import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/css";
import { coerceDateRange, formatDateRange, normalizeMonthValue } from "@/lib/date-range";
import type { DateRange } from "@/types/resume";

const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const defaultPickerYear = 2026;

function splitMonthValue(value: string) {
  const normalized = normalizeMonthValue(value);
  if (!normalized) return { normalized: "", year: defaultPickerYear, month: "" };
  const [year, month] = normalized.split("-");
  return { normalized, year: Number(year), month };
}

function monthDisplay(value: string, fallback: string) {
  const { normalized } = splitMonthValue(value);
  if (!normalized) return fallback;
  return normalized.replace("-", ".");
}

function TacticalMonthPicker({
  id,
  label,
  value,
  disabled,
  open,
  onOpenChange,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const parsed = splitMonthValue(value);
  const [viewYear, setViewYear] = useState(parsed.year);

  const display = monthDisplay(value, t("dateRange.unset"));

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">{label}</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-700">YYYY.MM</span>
      </div>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-label={`${label} ${display}`}
        onClick={() => {
          if (!open) setViewYear(splitMonthValue(value).year);
          onOpenChange(!open);
        }}
        className={cn(
          "group relative flex h-12 w-full items-center justify-between overflow-hidden border bg-[#060a0f] px-3 text-left transition focus-visible:outline-none",
          open
            ? "border-[rgba(57,255,136,0.7)] shadow-[0_0_22px_rgba(57,255,136,0.14),inset_0_0_18px_rgba(57,255,136,0.04)]"
            : "border-[rgba(125,139,153,0.2)] hover:border-[rgba(88,230,255,0.38)] hover:bg-[#081018]",
          disabled ? "cursor-not-allowed opacity-45" : "",
        )}
      >
        <span className="absolute inset-y-0 left-0 w-1 bg-[linear-gradient(180deg,var(--trace-cyan),var(--cyber-green))] opacity-50 transition group-hover:opacity-90" />
        <span className="relative z-10 min-w-0">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-slate-600">{t("dateRange.selectMonth")}</span>
          <span className={cn("mt-0.5 block font-mono text-base font-black tracking-[-0.04em]", parsed.normalized ? "text-white" : "text-slate-600")}>{display}</span>
        </span>
        <span className={cn("relative z-10 font-mono text-lg transition", open ? "text-[var(--cyber-green)]" : "text-slate-600 group-hover:text-[var(--trace-cyan)]")}>⌄</span>
      </button>

      {open && !disabled ? (
        <div className="mt-2 border border-[rgba(57,255,136,0.24)] bg-[#05090d] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.35),0_0_30px_rgba(57,255,136,0.08)]">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-[rgba(125,139,153,0.16)] pb-2 font-mono uppercase tracking-[0.18em]">
            <button
              type="button"
              onClick={() => setViewYear((year) => Math.max(1900, year - 1))}
              className="border border-[rgba(125,139,153,0.22)] px-2 py-1 text-[11px] text-slate-400 transition hover:border-[rgba(88,230,255,0.45)] hover:text-[var(--trace-cyan)] focus-visible:outline-none focus-visible:shadow-[0_0_16px_rgba(88,230,255,0.16)]"
            >
              −
            </button>
            <div className="text-center">
              <p className="text-[9px] text-slate-600">{t("dateRange.year")}</p>
              <p className="text-base font-black text-[var(--cyber-green)]">{viewYear}</p>
            </div>
            <button
              type="button"
              onClick={() => setViewYear((year) => Math.min(2100, year + 1))}
              className="border border-[rgba(125,139,153,0.22)] px-2 py-1 text-[11px] text-slate-400 transition hover:border-[rgba(88,230,255,0.45)] hover:text-[var(--trace-cyan)] focus-visible:outline-none focus-visible:shadow-[0_0_16px_rgba(88,230,255,0.16)]"
            >
              +
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {monthOptions.map((month) => {
              const selected = parsed.year === viewYear && parsed.month === month;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => {
                    onChange(`${viewYear}-${month}`);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "border py-2 font-mono text-[11px] uppercase tracking-[0.08em] transition focus-visible:outline-none",
                    selected
                      ? "border-[rgba(57,255,136,0.75)] bg-[rgba(57,255,136,0.13)] text-[var(--cyber-green)] shadow-[0_0_16px_rgba(57,255,136,0.12)]"
                      : "border-[rgba(125,139,153,0.16)] bg-black/25 text-slate-500 hover:border-[rgba(88,230,255,0.38)] hover:text-slate-200",
                  )}
                >
                  {month}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              onChange("");
              onOpenChange(false);
            }}
            className="mt-3 w-full border border-[rgba(255,138,61,0.28)] py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,138,61,0.82)] transition hover:bg-[rgba(255,138,61,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_16px_rgba(255,138,61,0.15)]"
          >
            {t("dateRange.clear")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function DateRangeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: DateRange | string;
  onChange: (value: DateRange) => void;
}) {
  const { language, t } = useI18n();
  const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);
  const range = coerceDateRange(value);
  const formattedRange = formatDateRange(range, language);

  const updateRange = (nextRange: DateRange) => {
    if (nextRange.isPresent) setOpenPicker(null);
    onChange({ ...nextRange, end: nextRange.isPresent ? "" : nextRange.end });
  };

  return (
    <div className="tactical-field overflow-hidden px-3 py-3">
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(125,139,153,0.14)] pb-3">
        <label htmlFor={`${id}-start`} className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
          {label}
        </label>
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--trace-cyan)]">
          <span className="h-1.5 w-1.5 animate-pulse bg-[var(--cyber-green)] shadow-[0_0_12px_rgba(57,255,136,0.65)]" />
          <span>{formattedRange}</span>
        </div>
      </div>

      <div className="relative z-10 mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)_auto]">
        <TacticalMonthPicker
          id={`${id}-start`}
          label={t("dateRange.start")}
          value={range.start}
          open={openPicker === "start"}
          onOpenChange={(open) => setOpenPicker(open ? "start" : null)}
          onChange={(start) => updateRange({ ...range, start })}
        />

        <div className="hidden items-center justify-center pt-6 xl:flex">
          <span className="font-mono text-lg text-[rgba(88,230,255,0.42)]">→</span>
        </div>

        <TacticalMonthPicker
          id={`${id}-end`}
          label={t("dateRange.end")}
          value={range.end}
          disabled={range.isPresent}
          open={!range.isPresent && openPicker === "end"}
          onOpenChange={(open) => setOpenPicker(open ? "end" : null)}
          onChange={(end) => updateRange({ ...range, end })}
        />

        <button
          type="button"
          aria-pressed={range.isPresent}
          title={range.isPresent ? t("dateRange.endLocked") : undefined}
          onClick={() => updateRange({ ...range, isPresent: !range.isPresent, end: !range.isPresent ? "" : range.end })}
          className={cn(
            "mt-[23px] flex h-12 min-w-28 items-center justify-center gap-2 border px-4 font-mono text-[11px] uppercase tracking-[0.18em] transition focus-visible:outline-none",
            range.isPresent
              ? "border-[rgba(57,255,136,0.66)] bg-[rgba(57,255,136,0.11)] text-[var(--cyber-green)] shadow-[0_0_20px_rgba(57,255,136,0.13)]"
              : "border-[rgba(125,139,153,0.2)] bg-black/20 text-slate-500 hover:border-[rgba(255,138,61,0.42)] hover:text-[var(--warning-orange)]",
          )}
        >
          <span className={cn("h-2 w-2", range.isPresent ? "bg-[var(--cyber-green)] shadow-[0_0_12px_rgba(57,255,136,0.7)]" : "bg-slate-700")} />
          {t("dateRange.present")}
        </button>
      </div>

      <div className="relative z-10 mt-3 h-px overflow-hidden bg-[rgba(125,139,153,0.12)]">
        <div
          className="h-full bg-[linear-gradient(90deg,var(--cyber-green),var(--trace-cyan),transparent)] transition-all duration-300"
          style={{ width: range.start || range.end || range.isPresent ? "78%" : "24%" }}
        />
      </div>
    </div>
  );
}

