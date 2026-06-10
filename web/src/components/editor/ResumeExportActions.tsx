"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/css";
import { getResumeDensity } from "@/lib/resume-metrics";
import { normalizeResumeDraftForPersistence } from "@/lib/resume-normalize";
import { useEditorStore } from "@/store/editor-store";
import type { ResumeDraft } from "@/types/resume";

type ResumeExportActionsProps = {
  variant?: "panel" | "compact";
};

type ExportPayload = {
  schemaVersion: "kill-the-resume.resume.v1";
  exportedAt: string;
  generator: {
    app: "kill-the-resume";
    mode: "frontend-json-export";
  };
  draft: ResumeDraft;
};

function slugify(value: string) {
  const fallback = "kill-the-resume";
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug || fallback;
}

function getFileName(draft: ResumeDraft, extension: "json" | "pdf") {
  const name = slugify(draft.identity.name || "resume");
  const role = slugify(draft.exportProtocol.targetRole || draft.identity.title || "target");
  const date = new Date().toISOString().slice(0, 10);

  return `${name}-${role}-${date}.${extension}`;
}


function buildExportPayload(draft: ResumeDraft): ExportPayload {
  return {
    schemaVersion: "kill-the-resume.resume.v1",
    exportedAt: new Date().toISOString(),
    generator: {
      app: "kill-the-resume",
      mode: "frontend-json-export",
    },
    draft: normalizeResumeDraftForPersistence(draft),
  };
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ResumeExportActions({ variant = "panel" }: ResumeExportActionsProps) {
  const { language, t } = useI18n();
  const draft = useEditorStore((state) => state.draft);
  const density = useMemo(() => getResumeDensity(draft), [draft]);
  const [lastAction, setLastAction] = useState<"idle" | "pdf" | "json" | "error">("idle");
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const exportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const { exportResumePdf } = await import("@/lib/resume-pdf");
      await exportResumePdf(draft, getFileName(draft, "pdf"), t, { language });
      setLastAction("pdf");
    } catch (error) {
      console.error(error);
      setLastAction("error");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const exportJson = () => {
    const payload = buildExportPayload(draft);
    downloadTextFile(getFileName(draft, "json"), `${JSON.stringify(payload, null, 2)}\n`, "application/json;charset=utf-8");
    setLastAction("json");
  };

  const status = lastAction === "pdf" ? t("export.statusPrint") : lastAction === "json" ? t("export.statusJson") : lastAction === "error" ? t("export.statusError") : t("export.statusIdle");

  if (variant === "compact") {
    return (
      <div className="hidden items-center gap-2 lg:flex" data-print-hidden>
        <button
          type="button"
          onClick={exportPdf}
          disabled={isExportingPdf}
          className="border border-[rgba(57,255,136,0.42)] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--cyber-green)] transition hover:bg-[rgba(57,255,136,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_18px_rgba(57,255,136,0.2)]"
        >
          {isExportingPdf ? t("export.exportingShort") : t("export.printPdfShort")}
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="border border-[rgba(88,230,255,0.35)] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_18px_rgba(88,230,255,0.18)]"
        >
          {t("export.downloadJsonShort")}
        </button>
      </div>
    );
  }

  return (
    <div className="border border-[rgba(57,255,136,0.24)] bg-[rgba(7,11,16,0.72)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--cyber-green)]">
            {t("export.actionsTitle")}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            {t("export.backendNote")}
          </p>
        </div>
        <div
          className={cn(
            "font-mono text-[11px] uppercase tracking-[0.2em]",
            density.level === "stable" ? "text-[var(--cyber-green)]" : "text-[var(--warning-orange)]",
          )}
        >
          {t("project.density")} {density.percentage}%
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={exportPdf}
          disabled={isExportingPdf}
          className="group border border-[rgba(57,255,136,0.46)] bg-[rgba(57,255,136,0.06)] p-4 text-left transition hover:bg-[rgba(57,255,136,0.1)] hover:shadow-[0_0_24px_rgba(57,255,136,0.13)] focus-visible:outline-none focus-visible:shadow-[0_0_24px_rgba(57,255,136,0.2)]"
        >
          <span className="font-mono text-[13px] uppercase tracking-[0.24em] text-[var(--cyber-green)]">
            {isExportingPdf ? t("export.exportingPdf") : t("export.printPdf")}
          </span>
          <span className="mt-2 block text-sm leading-6 text-slate-400 group-hover:text-slate-300">
            {t("export.printHint")}
          </span>
        </button>

        <button
          type="button"
          onClick={exportJson}
          className="group border border-[rgba(88,230,255,0.38)] bg-[rgba(88,230,255,0.05)] p-4 text-left transition hover:bg-[rgba(88,230,255,0.09)] hover:shadow-[0_0_24px_rgba(88,230,255,0.11)] focus-visible:outline-none focus-visible:shadow-[0_0_24px_rgba(88,230,255,0.18)]"
        >
          <span className="font-mono text-[13px] uppercase tracking-[0.24em] text-[var(--trace-cyan)]">
            {t("export.downloadJson")}
          </span>
          <span className="mt-2 block text-sm leading-6 text-slate-400 group-hover:text-slate-300">
            {t("export.jsonHint")}
          </span>
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[rgba(125,139,153,0.14)] pt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
        <span>{t("export.status")}</span>
        <span className={lastAction === "idle" ? "text-slate-500" : "text-[var(--cyber-green)]"}>{status}</span>
      </div>
    </div>
  );
}
