"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/css";
import { parseMarkdownBlocks, type MarkdownBlock } from "@/lib/markdown";
import type { TranslationKey } from "@/lib/i18n";
import { createResumePaperLayoutPlan, resumePaperMetrics, type PaperBlock } from "@/lib/resume-paper-layout";
import { getResumeDensity } from "@/lib/resume-metrics";
import { fieldCaption, isResumeFieldVisible, projectIdentityContact, projectSkillSection } from "@/lib/resume-projection";
import { splitSkillTags } from "@/lib/skills";
import { useEditorStore } from "@/store/editor-store";
import type { ResumeDraft } from "@/types/resume";

const densityLabelKeys: Record<ReturnType<typeof getResumeDensity>["level"], TranslationKey> = {
  stable: "density.stable",
  warning: "density.warning",
  critical: "density.critical",
};

const densityCssVar = "var(--resume-density-scale, 1)";

function scaledPx(value: number) {
  return `calc(${value}px * ${densityCssVar})`;
}

function scaledRem(value: number) {
  return `calc(${value}rem * ${densityCssVar})`;
}

function scaledTextStyle(size: number, lineHeight = 1.35): CSSProperties {
  return { fontSize: scaledPx(size), lineHeight };
}

function scaledSpacingStyle(property: "gap" | "paddingBottom" | "paddingTop" | "marginTop", value: number): CSSProperties {
  return { [property]: scaledRem(value) } as CSSProperties;
}

function PreviewSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      className="font-mono font-black uppercase tracking-[0.26em] text-[var(--resume-accent)]"
      style={scaledTextStyle(11.5, 1.2)}
    >
      {children}
    </h2>
  );
}

function PreviewMarkdownBlock({ block }: { block: MarkdownBlock }) {
  if (block.type === "blank") return <div aria-hidden="true" style={{ height: scaledRem(0.25) }} />;

  if (block.type === "heading") {
    return <p className="font-black uppercase tracking-[-0.025em] text-slate-950" style={scaledTextStyle(12.5, 1.2)}>{block.text}</p>;
  }

  if (block.type === "bullet") {
    return (
      <div className="flex text-slate-800" style={{ ...scaledTextStyle(10.5), gap: scaledRem(0.625) }}>
        {block.ordered ? (
          <span className="shrink-0 font-mono font-bold text-[var(--resume-accent)]" style={{ ...scaledTextStyle(8.5, 1.55), minWidth: scaledRem(1) }}>
            {block.order ?? 1}.
          </span>
        ) : (
          <span className="shrink-0 bg-[var(--resume-accent)]" style={{ marginTop: scaledRem(0.45), height: scaledRem(0.25), width: scaledRem(0.25) }} />
        )}
        <span>{block.text}</span>
      </div>
    );
  }

  if (block.type === "quote") {
    return <p className="border-l border-[var(--resume-accent)] italic text-slate-700" style={{ ...scaledTextStyle(10.5), paddingLeft: scaledRem(0.5) }}>{block.text}</p>;
  }

  if (block.type === "code") {
    return <pre className="whitespace-pre-wrap break-words bg-slate-100 font-mono text-slate-700" style={{ ...scaledTextStyle(8.5), padding: `${scaledRem(0.25)} ${scaledRem(0.5)}` }}>{block.text}</pre>;
  }

  return <p className="whitespace-pre-line text-slate-800" style={scaledTextStyle(10.5)}>{block.text}</p>;
}

function PreviewMarkdownText({ value, className }: { value: string; className?: string }) {
  const blocks = parseMarkdownBlocks(value);

  if (!blocks.length) return null;

  return (
    <div className={cn("flex flex-col", className)} style={scaledSpacingStyle("gap", 0.25)}>
      {blocks.map((block, index) => (
        <PreviewMarkdownBlock key={`${block.type}-${index}-${block.text.slice(0, 16)}`} block={block} />
      ))}
    </div>
  );
}

function PreviewSkillTags({ value }: { value: string }) {
  const tags = splitSkillTags(value);
  if (!tags.length) return null;

  return (
    <div className="flex flex-wrap" style={{ marginTop: scaledRem(0.375), gap: scaledRem(0.375) }}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="border border-[color-mix(in_srgb,var(--resume-accent)_42%,transparent)] bg-[color-mix(in_srgb,var(--resume-accent)_7%,transparent)] font-semibold text-slate-700"
          style={{ ...scaledTextStyle(8.5, 1.2), padding: `${scaledRem(0.125)} ${scaledRem(0.375)}` }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function PreviewIdentityHeader({ draft, t }: { draft: ResumeDraft; t: (key: TranslationKey) => string }) {
  const { email, location, photo, websiteDisplay: website, websiteHref, hasContact } = projectIdentityContact(draft);
  const wrappingContactStyle: CSSProperties = { overflowWrap: "anywhere", wordBreak: "break-word" };
  const compactWebsiteStyle: CSSProperties = {
    display: "-webkit-box",
    overflow: "hidden",
    overflowWrap: "anywhere",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    wordBreak: "break-word",
  };
  const photoWebsiteStyle: CSSProperties = { overflowWrap: "anywhere", wordBreak: "break-all" };
  const contactColumn = hasContact ? (
    <div
      data-resume-identity-contact
      className={cn(
        "min-w-0 text-right font-mono tracking-[0.12em] text-slate-500",
        photo ? "w-full" : "w-full",
      )}
      style={scaledTextStyle(8.5, photo ? 1.32 : 1.88)}
    >
      {email ? (
        <p className={cn("uppercase", photo ? "" : "truncate")} style={photo ? wrappingContactStyle : undefined}>{email}</p>
      ) : null}
      {location ? (
        <p className={cn("uppercase", photo ? "" : "truncate")} style={photo ? wrappingContactStyle : undefined}>{location}</p>
      ) : null}
      {website ? (
        websiteHref ? (
          <a
            className={cn("normal-case text-slate-500 no-underline", photo ? "block" : "break-words")}
            href={websiteHref}
            rel="noopener noreferrer"
            target="_blank"
            title={websiteHref}
            style={photo ? photoWebsiteStyle : compactWebsiteStyle}
          >
            {website}
          </a>
        ) : (
          <p
            className={cn("normal-case text-slate-500", photo ? "" : "break-words")}
            title={websiteHref || website}
            style={photo ? photoWebsiteStyle : compactWebsiteStyle}
          >
            {website}
          </p>
        )
      ) : null}
    </div>
  ) : null;

  return (
    <header data-resume-identity-header className="border-b-2 border-[var(--resume-accent)]" style={{ paddingBottom: scaledRem(0.75) }}>
      <div className="flex items-start justify-between" style={{ gap: scaledRem(1.25) }}>
        <div className="min-w-0 flex-1">
          {isResumeFieldVisible(draft, "identity", "callsign") ? (
            <p className="font-mono uppercase tracking-[0.35em] text-[var(--resume-accent)]" style={scaledTextStyle(9, 1.2)}>{draft.identity.callsign || t("identity.callsignPlaceholder")}</p>
          ) : null}
          {isResumeFieldVisible(draft, "identity", "name") ? (
            <h1 className="font-black uppercase tracking-[-0.08em] text-slate-950" style={{ ...scaledTextStyle(30, 1.05), marginTop: scaledRem(0.375) }}>{draft.identity.name || t("identity.namePlaceholder")}</h1>
          ) : null}
          {isResumeFieldVisible(draft, "identity", "title") ? (
            <p className="font-mono uppercase tracking-[0.2em] text-slate-700" style={{ ...scaledTextStyle(11, 1.25), marginTop: scaledRem(0.375) }}>{draft.identity.title || t("identity.titlePlaceholder")}</p>
          ) : null}
        </div>

        {hasContact || photo ? (
          <div
            data-resume-identity-contact-wrap
            className={cn(
              "flex min-w-0 shrink-0 items-start justify-end",
              photo ? (hasContact ? "w-[248px] max-w-[56%]" : "w-16") : "w-[42%] max-w-[178px]",
            )}
            style={{ gap: scaledRem(0.75) }}
          >
            {contactColumn}
            {photo ? (
              <div data-resume-identity-photo className="shrink-0 overflow-hidden bg-transparent" style={{ height: scaledRem(5), width: scaledRem(4) }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={t("identity.photo")} className="h-full w-full object-cover" />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

function mmToPercent(value: number) {
  return `${(value / resumePaperMetrics.page.height) * 100}%`;
}

function blockHeightStyle(block: PaperBlock): CSSProperties {
  if (block.kind === "gap") return { height: mmToPercent(block.estimate) };
  return { minHeight: mmToPercent(block.estimate) };
}

function PreviewBlockSectionTitle({ title }: { title?: string }) {
  if (!title) return null;

  return (
    <div style={{ paddingBottom: scaledRem(0.42), paddingTop: scaledRem(0.26) }}>
      <PreviewSectionTitle>{title}</PreviewSectionTitle>
      <div className="h-px bg-[var(--resume-accent)]" style={{ marginTop: scaledRem(0.32) }} />
    </div>
  );
}

function PreviewPaperBlock({ block, preserveBlockHeight = true }: { block: PaperBlock; preserveBlockHeight?: boolean }) {
  const data = block.data ?? {};
  const label = typeof data.label === "string" ? data.label : "";
  const line = typeof data.line === "string" ? data.line : "";
  const valueSize = typeof data.valueSize === "number" ? data.valueSize : 7.4;
  const isMeta = Boolean(data.meta || data.date);
  const isBordered = Boolean(data.bordered);
  const blockStyle = preserveBlockHeight ? blockHeightStyle(block) : undefined;
  const bodyClass = cn(isBordered ? "border-l-2 border-[var(--resume-accent)]" : "");
  const bodyStyle = isBordered ? { paddingLeft: scaledRem(1) } : undefined;

  if (block.kind === "gap") return <div aria-hidden="true" style={blockStyle ?? { height: scaledRem(0.3) }} />;

  if (block.kind === "section-title-only") {
    return (
      <section style={blockStyle}>
        <PreviewBlockSectionTitle title={block.sectionTitle} />
      </section>
    );
  }

  if (block.kind === "summary-line") {
    return (
      <section style={blockStyle}>
        <PreviewBlockSectionTitle title={block.sectionTitle} />
        <p className="text-slate-800" style={scaledTextStyle(10.5)}>{line}</p>
      </section>
    );
  }

  if (block.kind === "header-field-line") {
    return (
      <section style={blockStyle}>
        <PreviewBlockSectionTitle title={block.sectionTitle} />
        <div className={bodyClass} style={bodyStyle}>
          <h3 className="font-black uppercase tracking-[-0.03em] text-slate-950" style={scaledTextStyle(15, 1.2)}>{line}</h3>
        </div>
      </section>
    );
  }

  if (block.kind === "label-value-line") {
    const lineIndex = typeof data.lineIndex === "number" ? data.lineIndex : 0;

    return (
      <section style={blockStyle}>
        <PreviewBlockSectionTitle title={block.sectionTitle} />
        <div
          className={cn(
            bodyClass,
            isMeta
              ? "font-mono uppercase tracking-[0.14em] text-slate-600"
              : "text-slate-800",
          )}
          style={bodyStyle}
        >
          {lineIndex === 0 && label ? (
            <span className="font-mono font-bold uppercase tracking-[0.14em] text-slate-400" style={scaledTextStyle(8.8, 1.35)}>
              {fieldCaption(label)}:{" "}
            </span>
          ) : null}
          <span style={scaledTextStyle(isMeta ? 9 : valueSize + 3.1, 1.35)}>{line}</span>
        </div>
      </section>
    );
  }

  if (block.kind === "markdown-label") {
    return (
      <section style={blockStyle}>
        <PreviewBlockSectionTitle title={block.sectionTitle} />
        <div className={bodyClass} style={bodyStyle}>
          <p className="font-mono font-bold uppercase tracking-[0.14em] text-slate-400" style={scaledTextStyle(8.8, 1.35)}>{fieldCaption(label)}:</p>
        </div>
      </section>
    );
  }

  if (block.kind === "markdown-line") {
    const markdownBlock = data.block as MarkdownBlock | undefined;
    const type = markdownBlock?.type ?? "paragraph";
    const ordered = Boolean(markdownBlock && "ordered" in markdownBlock && markdownBlock.ordered);
    const order = markdownBlock && "order" in markdownBlock ? markdownBlock.order : undefined;

    return (
      <section style={blockStyle}>
        <div className={bodyClass} style={bodyStyle}>
          {type === "heading" ? (
            <p className="font-black uppercase tracking-[-0.025em] text-slate-950" style={scaledTextStyle(12.5, 1.2)}>{line}</p>
          ) : type === "bullet" ? (
            <div className="flex text-slate-800" style={{ ...scaledTextStyle(10.5), gap: scaledRem(0.625) }}>
              {ordered ? (
                <span className="shrink-0 font-mono font-bold text-[var(--resume-accent)]" style={{ ...scaledTextStyle(8.5, 1.55), minWidth: scaledRem(1) }}>
                  {order ?? 1}.
                </span>
              ) : (
                <span className="shrink-0 bg-[var(--resume-accent)]" style={{ marginTop: scaledRem(0.45), height: scaledRem(0.25), width: scaledRem(0.25) }} />
              )}
              <span>{line}</span>
            </div>
          ) : type === "quote" ? (
            <p className="border-l border-[var(--resume-accent)] italic text-slate-700" style={{ ...scaledTextStyle(10.5), paddingLeft: scaledRem(0.5) }}>{line}</p>
          ) : type === "code" ? (
            <pre className="whitespace-pre-wrap break-words bg-slate-100 font-mono text-slate-700" style={{ ...scaledTextStyle(8.5), padding: `${scaledRem(0.25)} ${scaledRem(0.5)}` }}>{line}</pre>
          ) : (
            <p className="whitespace-pre-line text-slate-800" style={scaledTextStyle(10.5)}>{line}</p>
          )}
        </div>
      </section>
    );
  }

  if (block.kind === "skills-row") {
    const categories = Array.isArray(data.categories) ? (data.categories as ReturnType<typeof projectSkillSection>["categories"]) : [];
    const displayMode = data.displayMode === "tags" ? "tags" : "markdown";
    const columnCount = data.columnCount === 1 ? 1 : 2;

    return (
      <section style={blockStyle}>
        <PreviewBlockSectionTitle title={block.sectionTitle} />
        <dl className={cn("grid", columnCount === 1 ? "grid-cols-1" : "grid-cols-2")} style={scaledSpacingStyle("gap", 0.75)}>
          {categories.map((category) => (
            <div key={category.id} className="min-w-0">
              <dt className="font-mono font-bold uppercase tracking-[0.14em] text-slate-400" style={scaledTextStyle(8.8, 1.35)}>{fieldCaption(category.label)}</dt>
              <dd style={{ marginTop: scaledRem(0.25) }}>
                {displayMode === "tags" ? <PreviewSkillTags value={category.content} /> : <PreviewMarkdownText value={category.content} />}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  return null;
}

function pageBreakIndexes(pages: PaperBlock[][]) {
  let cursor = 0;
  const breakIndexes = new Set<number>();

  pages.slice(0, -1).forEach((page) => {
    cursor += page.length;
    if (cursor > 0) breakIndexes.add(cursor);
  });

  return breakIndexes;
}

function PreviewPageBreakMarker({ pageNumber, t }: { pageNumber: number; t: (key: TranslationKey) => string }) {
  return (
    <div data-resume-continuous-page-break className="relative my-5 border-t border-dashed border-[color-mix(in_srgb,var(--resume-accent)_58%,transparent)]">
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-[var(--paper)] px-3 font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--resume-accent)]">
        {t("preview.pageBreakGuide")} · PAGE_{pageNumber.toString().padStart(2, "0")} / {t("preview.pageBreakNext")}
      </div>
    </div>
  );
}

function PreviewContinuousBlocks({ blocks, breaks, t }: { blocks: PaperBlock[]; breaks: Set<number>; t: (key: TranslationKey) => string }) {
  return (
    <div className="flex flex-col" data-resume-continuous-blocks>
      {blocks.map((block, index) => (
        <div key={`${block.kind}-${index}-${block.sectionTitle ?? ""}-${block.estimate}`}>
          {breaks.has(index) ? <PreviewPageBreakMarker pageNumber={index === 0 ? 1 : [...breaks].filter((breakIndex) => breakIndex <= index).length + 1} t={t} /> : null}
          <PreviewPaperBlock block={block} preserveBlockHeight={false} />
        </div>
      ))}
    </div>
  );
}

function PreviewContinuousPaper({
  draft,
  t,
  blocks,
  breaks,
  scale,
  accentColor,
  overflowRisk,
}: {
  draft: ResumeDraft;
  t: (key: TranslationKey) => string;
  blocks: PaperBlock[];
  breaks: Set<number>;
  scale: number;
  accentColor: string;
  overflowRisk: boolean;
}) {
  return (
    <article
      data-resume-continuous-preview
      className="resume-paper-surface w-[min(31vw,500px)] min-w-[360px] shadow-2xl shadow-black"
      style={{ "--resume-accent": accentColor } as CSSProperties}
    >
      <div className="flex flex-col p-[6.4%]" style={{ "--resume-density-scale": scale } as CSSProperties}>
        <PreviewIdentityHeader draft={draft} t={t} />
        <PreviewContinuousBlocks blocks={blocks} breaks={breaks} t={t} />
        {overflowRisk ? <p className="mt-5 font-mono text-[8px] uppercase tracking-[0.16em] text-orange-600">{t("control.overflowRisk")}</p> : null}
      </div>
    </article>
  );
}

function PreviewPaperPage({ blocks }: { blocks: PaperBlock[] }) {
  return (
    <div className="min-h-0 flex-1">
      {blocks.map((block, index) => (
        <PreviewPaperBlock key={`${block.kind}-${index}-${block.sectionTitle ?? ""}-${block.estimate}`} block={block} />
      ))}
    </div>
  );
}

function PreviewPaper({
  children,
  pageNumber,
  scale,
  accentColor,
  targetRole,
  exportTargetLabel,
  variant = "side",
}: {
  children: ReactNode;
  pageNumber: number;
  scale: number;
  accentColor: string;
  targetRole: string;
  exportTargetLabel: string;
  variant?: "side" | "large";
}) {
  return (
    <article
      data-resume-paper
      className={cn(
        "a4-paper transition-transform duration-200",
        variant === "large" ? "w-[clamp(500px,52vw,640px)] shadow-2xl shadow-black" : "w-[min(31vw,500px)] min-w-[360px] shadow-2xl shadow-black",
      )}
      style={{ "--resume-accent": accentColor } as CSSProperties}
    >
      <div
        className={cn("flex h-full flex-col p-[6.4%] transition-[filter] duration-200", scale < 0.9 ? "compress-pulse" : "")}
        style={{ "--resume-density-scale": scale } as CSSProperties}
      >
        {children}
        <footer data-resume-footer className="mt-auto flex items-center justify-between border-t border-slate-200 font-mono tracking-[0.16em] text-slate-400" style={{ ...scaledTextStyle(8, 1.25), gap: scaledRem(0.75), paddingTop: scaledRem(0.5) }}>
          <span className="min-w-0 truncate">
            {exportTargetLabel}: {targetRole}
          </span>
          <span className="shrink-0">PAGE_{pageNumber.toString().padStart(2, "0")}</span>
        </footer>
      </div>
    </article>
  );
}



export function ResumePreview() {
  const { language, t } = useI18n();
  const previewVisible = useEditorStore((state) => state.previewVisible);
  const setPreviewVisible = useEditorStore((state) => state.setPreviewVisible);
  const draft = useEditorStore((state) => state.draft);
  const accentColor = draft.theme.accentColor;
  const density = useMemo(() => getResumeDensity(draft), [draft]);
  const [largePreviewOpen, setLargePreviewOpen] = useState(false);
  const layoutPlan = useMemo(() => createResumePaperLayoutPlan(draft, t, { language }), [draft, language, t]);
  const pageCount = layoutPlan.pageCount;
  const previewScale = layoutPlan.densityScale;
  const continuousPageBreaks = useMemo(() => pageBreakIndexes(layoutPlan.pages), [layoutPlan.pages]);

  useEffect(() => {
    if (!largePreviewOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLargePreviewOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [largePreviewOpen]);

  if (!previewVisible) return null;

  return (
    <>
      <section data-resume-screen-root className="relative z-0 flex h-full w-[clamp(420px,34vw,560px)] shrink-0 flex-col border-l border-[rgba(125,139,153,0.18)] bg-[#070b10]">
      <div data-print-hidden className="flex items-center justify-between gap-4 border-b border-[rgba(125,139,153,0.18)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
        <span>{t("preview.title")}</span>
        <div className="flex items-center gap-3">
          <span className={density.level === "stable" ? "text-[var(--cyber-green)]" : "text-[var(--warning-orange)]"}>
            {pageCount === 2 ? t("control.twoPages") : t("control.onePage")} · {t(densityLabelKeys[density.level])} · FIT {Math.round(layoutPlan.densityScale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setLargePreviewOpen(true)}
            className="border border-[rgba(88,230,255,0.36)] px-2 py-1 text-[8px] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_16px_rgba(88,230,255,0.18)]"
          >
            {t("preview.largeOpen")}
          </button>
          <button
            type="button"
            onClick={() => setPreviewVisible(false)}
            className="border border-[rgba(255,138,61,0.36)] px-2 py-1 text-[8px] text-[var(--warning-orange)] transition hover:bg-[rgba(255,138,61,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_16px_rgba(255,138,61,0.18)]"
          >
            {t("preview.hide")}
          </button>
        </div>
      </div>

      <div
        data-resume-print-stage
        className="tactical-grid tactical-scrollbar flex min-h-0 flex-1 items-start justify-center overflow-y-auto overflow-x-hidden p-5"
      >
        <div data-resume-print-stack className="flex justify-center pb-8">
          <PreviewContinuousPaper
            draft={draft}
            t={t}
            blocks={layoutPlan.blocks}
            breaks={continuousPageBreaks}
            scale={previewScale}
            accentColor={accentColor}
            overflowRisk={layoutPlan.overflowRisk}
          />
        </div>
      </div>
      </section>

      {largePreviewOpen ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#05080d]/96 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={t("preview.largeTitle")}
        >
          <div className="flex items-center justify-between gap-4 border-b border-[rgba(125,139,153,0.22)] bg-[#080c11]/90 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">
            <div>
              <p className="text-[var(--trace-cyan)]">{t("preview.largeTitle")}</p>
              <p className="mt-1 text-[9px] text-slate-600">{pageCount === 2 ? t("control.twoPages") : t("control.onePage")} · FIT {Math.round(layoutPlan.densityScale * 100)}%</p>
            </div>
            <button
              type="button"
              onClick={() => setLargePreviewOpen(false)}
              className="border border-[rgba(255,138,61,0.42)] px-3 py-2 text-[10px] text-[var(--warning-orange)] transition hover:bg-[rgba(255,138,61,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_18px_rgba(255,138,61,0.22)]"
            >
              {t("preview.largeClose")}
            </button>
          </div>
          <div className="tactical-grid tactical-scrollbar min-h-0 flex-1 overflow-auto px-8 py-8">
            <div className={cn("mx-auto flex w-full justify-center gap-8", pageCount === 2 ? "flex-col items-center min-[1800px]:flex-row min-[1800px]:items-start" : "items-start")}>
              <PreviewPaper pageNumber={1} scale={previewScale} variant="large" accentColor={accentColor} targetRole={draft.exportProtocol.targetRole} exportTargetLabel={t("preview.exportTarget")}>
                <PreviewIdentityHeader draft={draft} t={t} />
                <PreviewPaperPage blocks={layoutPlan.pages[0] ?? []} />
              </PreviewPaper>
              {pageCount === 2 ? (
                <PreviewPaper pageNumber={2} scale={previewScale} variant="large" accentColor={accentColor} targetRole={draft.exportProtocol.targetRole} exportTargetLabel={t("preview.exportTarget")}>
                  <PreviewPaperPage blocks={layoutPlan.pages[1] ?? []} />
                  {layoutPlan.overflowRisk ? <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.16em] text-orange-600">{t("control.overflowRisk")}</p> : null}
                </PreviewPaper>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
