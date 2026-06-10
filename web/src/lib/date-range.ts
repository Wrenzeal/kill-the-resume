import type { DateRange } from "@/types/resume";
import type { Language } from "@/lib/i18n";

const anchoredYearMonthPattern = /^(\d{4})(?:[-./年\s]?)(\d{1,2})?/;
const looseYearMonthPattern = /(\d{4})(?:[-./年\s]?)(\d{1,2})?/g;

export function normalizeMonthValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(anchoredYearMonthPattern);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2] ?? 1);
  if (!Number.isInteger(year) || year < 1900 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return "";
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function createDateRange(start: string, end = "", isPresent = false): DateRange {
  return {
    start: normalizeMonthValue(start),
    end: isPresent ? "" : normalizeMonthValue(end),
    isPresent,
  };
}

export function isDateRange(value: unknown): value is DateRange {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.start === "string" && typeof record.end === "string" && typeof record.isPresent === "boolean";
}

export function coerceDateRange(value: DateRange | string | undefined | null): DateRange {
  if (isDateRange(value)) {
    return createDateRange(value.start, value.end, value.isPresent);
  }

  const raw = String(value ?? "").trim();
  if (!raw) return createDateRange("", "", false);

  const isPresent = /至今|present|current|now/i.test(raw);
  const matches = [...raw.matchAll(looseYearMonthPattern)];
  const start = matches[0]?.[0] ?? "";
  const end = isPresent ? "" : matches[1]?.[0] ?? "";

  return createDateRange(start, end, isPresent);
}

function formatMonth(value: string, language: Language) {
  const normalized = normalizeMonthValue(value);
  if (!normalized) return "";
  const [year, month] = normalized.split("-");
  return language === "zh-CN" ? `${year}.${month}` : `${year}.${month}`;
}

export function formatDateRange(value: DateRange | string | undefined | null, language: Language = "zh-CN") {
  const range = coerceDateRange(value);
  const start = formatMonth(range.start, language);
  const end = range.isPresent ? (language === "zh-CN" ? "至今" : "Present") : formatMonth(range.end, language);

  if (start && end) return `${start} — ${end}`;
  if (start) return `${start} — ${language === "zh-CN" ? "待定" : "TBD"}`;
  if (end) return `${language === "zh-CN" ? "待定" : "TBD"} — ${end}`;
  return language === "zh-CN" ? "时间待定" : "Period TBD";
}
