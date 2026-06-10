"use client";

import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/css";
import { useEditorStore } from "@/store/editor-store";

type PreviewToggleProps = {
  variant?: "status" | "dock";
};

export function PreviewToggle({ variant = "status" }: PreviewToggleProps) {
  const { t } = useI18n();
  const previewVisible = useEditorStore((state) => state.previewVisible);
  const togglePreviewVisibility = useEditorStore((state) => state.togglePreviewVisibility);
  const setPreviewVisible = useEditorStore((state) => state.setPreviewVisible);

  if (variant === "dock") {
    if (previewVisible) return null;

    return (
      <aside
        data-resume-preview-dock
        className="relative z-0 flex h-full w-14 shrink-0 flex-col items-center justify-between border-l border-[rgba(125,139,153,0.18)] bg-[#070b10] py-4"
      >
        <div className="h-2 w-2 animate-pulse bg-[var(--warning-orange)] shadow-[0_0_18px_rgba(255,138,61,0.75)]" />
        <button
          type="button"
          aria-pressed={false}
          onClick={() => setPreviewVisible(true)}
          className="group flex min-h-44 w-10 items-center justify-center border border-[rgba(88,230,255,0.28)] bg-[rgba(88,230,255,0.05)] font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--trace-cyan)] transition hover:border-[rgba(57,255,136,0.55)] hover:bg-[rgba(57,255,136,0.08)] hover:text-[var(--cyber-green)] focus-visible:outline-none focus-visible:shadow-[0_0_22px_rgba(57,255,136,0.18)]"
        >
          <span className="rotate-90 whitespace-nowrap">{t("preview.show")}</span>
        </button>
        <div className="h-16 w-px bg-[linear-gradient(180deg,transparent,var(--trace-cyan),transparent)] opacity-55" />
      </aside>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={previewVisible}
      onClick={togglePreviewVisibility}
      className={cn(
        "flex items-center gap-2 border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition focus-visible:outline-none",
        previewVisible
          ? "border-[rgba(57,255,136,0.42)] bg-[rgba(57,255,136,0.05)] text-[var(--cyber-green)] hover:bg-[rgba(57,255,136,0.09)] focus-visible:shadow-[0_0_18px_rgba(57,255,136,0.2)]"
          : "border-[rgba(255,138,61,0.42)] bg-[rgba(255,138,61,0.05)] text-[var(--warning-orange)] hover:bg-[rgba(255,138,61,0.09)] focus-visible:shadow-[0_0_18px_rgba(255,138,61,0.2)]",
      )}
    >
      <span className={cn("h-1.5 w-1.5", previewVisible ? "bg-[var(--cyber-green)] shadow-[0_0_10px_rgba(57,255,136,0.8)]" : "bg-[var(--warning-orange)] shadow-[0_0_10px_rgba(255,138,61,0.72)]")} />
      {previewVisible ? t("preview.hide") : t("preview.show")}
    </button>
  );
}
