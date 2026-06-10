import type { ResumeTheme } from "@/types/resume";
import type { TranslationKey } from "@/lib/i18n";

export type ResumeThemePreset = {
  id: string;
  labelKey: TranslationKey;
  accentColor: string;
};

export type RgbTuple = [number, number, number];

export const resumeThemePresets = [
  { id: "cyber-green", labelKey: "theme.presetCyberGreen", accentColor: "#0f766e" },
  { id: "trace-cyan", labelKey: "theme.presetTraceCyan", accentColor: "#0369a1" },
  { id: "warning-orange", labelKey: "theme.presetWarningOrange", accentColor: "#c2410c" },
  { id: "signal-violet", labelKey: "theme.presetSignalViolet", accentColor: "#6d28d9" },
  { id: "kill-crimson", labelKey: "theme.presetKillCrimson", accentColor: "#be123c" },
  { id: "paper-black", labelKey: "theme.presetPaperBlack", accentColor: "#020617" },
] as const satisfies readonly ResumeThemePreset[];

export const defaultResumeTheme: ResumeTheme = {
  presetId: "cyber-green",
  accentColor: resumeThemePresets[0].accentColor,
};

const hexColorPattern = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && hexColorPattern.test(value);
}

function normalizePresetId(value: unknown, accentColor: string) {
  if (typeof value === "string" && resumeThemePresets.some((preset) => preset.id === value)) {
    return value;
  }

  const matchingPreset = resumeThemePresets.find((preset) => preset.accentColor.toLowerCase() === accentColor.toLowerCase());
  return matchingPreset?.id ?? "custom";
}

export function normalizeResumeTheme(theme: Partial<ResumeTheme> | undefined | null): ResumeTheme {
  const accentColor = isHexColor(theme?.accentColor) ? theme.accentColor.toLowerCase() : defaultResumeTheme.accentColor;

  return {
    presetId: normalizePresetId(theme?.presetId, accentColor),
    accentColor,
  };
}

export function getThemePreset(presetId: string) {
  return resumeThemePresets.find((preset) => preset.id === presetId);
}

export function applyThemePreset(preset: ResumeThemePreset): ResumeTheme {
  return {
    presetId: preset.id,
    accentColor: preset.accentColor,
  };
}

export function applyCustomAccentColor(colorValue: string, currentTheme: ResumeTheme): ResumeTheme {
  if (!isHexColor(colorValue)) {
    return currentTheme;
  }

  const accentColor = colorValue.toLowerCase();
  const matchingPreset = resumeThemePresets.find((preset) => preset.accentColor.toLowerCase() === accentColor);

  return {
    presetId: matchingPreset?.id ?? "custom",
    accentColor,
  };
}

export function hexToRgbTuple(colorValue: string): RgbTuple {
  const normalized = isHexColor(colorValue) ? colorValue.slice(1) : defaultResumeTheme.accentColor.slice(1);
  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16)) as RgbTuple;
}
