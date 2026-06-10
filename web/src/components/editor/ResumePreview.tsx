"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/css";
import { formatDateRange } from "@/lib/date-range";
import { formatWebsiteDisplay, formatWebsiteHref } from "@/lib/contact-display";
import { markdownToPlainText, parseMarkdownBlocks, type MarkdownBlock } from "@/lib/markdown";
import type { Language, TranslationKey } from "@/lib/i18n";
import { getResumeDensity } from "@/lib/resume-metrics";
import { getModuleDefinition, getOrderedFields, isEditorModule } from "@/lib/resume-layout";
import { skillCategoriesFromFields, splitSkillTags } from "@/lib/skills";
import { useEditorStore } from "@/store/editor-store";
import type { CustomModuleField, DateRange, EditorModule, ModuleLayout, ResumeDraft } from "@/types/resume";

const densityLabelKeys: Record<ReturnType<typeof getResumeDensity>["level"], TranslationKey> = {
  stable: "density.stable",
  warning: "density.warning",
  critical: "density.critical",
};

const twoPageThreshold = 0.72;


function previewPlainText(value: string | undefined | null) {
  return markdownToPlainText(value, { preserveBlankLines: true });
}

function previewFirstLine(value: string | undefined | null) {
  return previewPlainText(value).split("\n").find(Boolean) ?? "";
}

type PreviewValue = string | DateRange;
type PreviewItem = Record<string, PreviewValue>;
type PreviewModuleNode = {
  module: string;
  node: ReactNode;
};

function getModuleItems(draft: ResumeDraft, module: EditorModule): PreviewItem[] {
  if (module === "identity") return [draft.identity];
  if (module === "projects") return draft.projects;
  if (module === "work") return draft.work;
  if (module === "skills") return [];
  if (module === "education") return draft.education;
  return [draft.exportProtocol];
}

function fieldVisible(draft: ResumeDraft, module: EditorModule, fieldId: string) {
  return getOrderedFields(module, draft.layout.fields[module]).some((field) => field.id === fieldId && field.visible);
}

function PreviewSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-mono text-[11.5px] font-black uppercase tracking-[0.26em] text-[var(--resume-accent)]">{children}</h2>;
}

function fieldCaption(label: string) {
  return label.includes("·") ? label.split("·").at(-1)?.trim() ?? label : label;
}

function PreviewMarkdownBlock({ block }: { block: MarkdownBlock }) {
  if (block.type === "blank") return <div className="h-1" />;

  if (block.type === "heading") {
    return <p className="text-[12.5px] font-black uppercase tracking-[-0.025em] text-slate-950">{block.text}</p>;
  }

  if (block.type === "bullet") {
    return (
      <div className="flex gap-2.5 text-[10.5px] leading-[1.35] text-slate-800">
        {block.ordered ? (
          <span className="min-w-4 shrink-0 font-mono text-[8.5px] font-bold leading-[1.55] text-[var(--resume-accent)]">
            {block.order ?? 1}.
          </span>
        ) : (
          <span className="mt-[0.45rem] h-1 w-1 shrink-0 bg-[var(--resume-accent)]" />
        )}
        <span>{block.text}</span>
      </div>
    );
  }

  if (block.type === "quote") {
    return <p className="border-l border-[var(--resume-accent)] pl-2 text-[10.5px] italic leading-[1.35] text-slate-700">{block.text}</p>;
  }

  if (block.type === "code") {
    return <pre className="whitespace-pre-wrap break-words bg-slate-100 px-2 py-1 font-mono text-[8.5px] leading-[1.35] text-slate-700">{block.text}</pre>;
  }

  return <p className="whitespace-pre-line text-[10.5px] leading-[1.35] text-slate-800">{block.text}</p>;
}

function PreviewMarkdownText({ value, className }: { value: string; className?: string }) {
  const blocks = parseMarkdownBlocks(value);

  if (!blocks.length) return null;

  return (
    <div className={cn("space-y-1", className)}>
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
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="border border-[color-mix(in_srgb,var(--resume-accent)_42%,transparent)] bg-[color-mix(in_srgb,var(--resume-accent)_7%,transparent)] px-1.5 py-0.5 text-[8.5px] font-semibold leading-[1.2] text-slate-700"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function PreviewIdentityHeader({ draft, t }: { draft: ResumeDraft; t: (key: TranslationKey) => string }) {
  const photo = fieldVisible(draft, "identity", "photo") ? draft.identity.photo.trim() : "";
  const website = fieldVisible(draft, "identity", "website") ? formatWebsiteDisplay(draft.identity.website) : "";
  const websiteHref = fieldVisible(draft, "identity", "website") ? formatWebsiteHref(draft.identity.website) : "";
  const hasContact = Boolean((fieldVisible(draft, "identity", "email") && draft.identity.email.trim()) || (fieldVisible(draft, "identity", "location") && draft.identity.location.trim()) || website);
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
        "min-w-0 text-right font-mono text-[8.5px] tracking-[0.12em] text-slate-500",
        photo ? "w-full leading-[1.32]" : "w-full leading-4",
      )}
    >
      {fieldVisible(draft, "identity", "email") && draft.identity.email.trim() ? (
        <p className={cn("uppercase", photo ? "" : "truncate")} style={photo ? wrappingContactStyle : undefined}>{draft.identity.email}</p>
      ) : null}
      {fieldVisible(draft, "identity", "location") && draft.identity.location.trim() ? (
        <p className={cn("uppercase", photo ? "" : "truncate")} style={photo ? wrappingContactStyle : undefined}>{draft.identity.location}</p>
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
            title={draft.identity.website}
            style={photo ? photoWebsiteStyle : compactWebsiteStyle}
          >
            {website}
          </p>
        )
      ) : null}
    </div>
  ) : null;

  return (
    <header data-resume-identity-header className="border-b-2 border-[var(--resume-accent)] pb-3">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          {fieldVisible(draft, "identity", "callsign") ? (
            <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-[var(--resume-accent)]">{draft.identity.callsign || t("identity.callsignPlaceholder")}</p>
          ) : null}
          {fieldVisible(draft, "identity", "name") ? (
            <h1 className="mt-1.5 text-3xl font-black uppercase tracking-[-0.08em] text-slate-950">{draft.identity.name || t("identity.namePlaceholder")}</h1>
          ) : null}
          {fieldVisible(draft, "identity", "title") ? (
            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-700">{draft.identity.title || t("identity.titlePlaceholder")}</p>
          ) : null}
        </div>

        {hasContact || photo ? (
          <div
            data-resume-identity-contact-wrap
            className={cn(
              "flex min-w-0 shrink-0 items-start justify-end gap-3",
              photo ? (hasContact ? "w-[248px] max-w-[56%]" : "w-16") : "w-[42%] max-w-[178px]",
            )}
          >
            {contactColumn}
            {photo ? (
              <div data-resume-identity-photo className="h-20 w-16 shrink-0 overflow-hidden bg-transparent">
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

function PreviewFieldList({
  fields,
  item,
  t,
  language,
}: {
  fields: ReturnType<typeof getOrderedFields>;
  item: PreviewItem;
  t: (key: TranslationKey) => string;
  language: Language;
}) {
  return (
    <div className="space-y-1.5">
      {fields.map((field, index) => {
        const rawValue = item[field.id] ?? "";
        const value = field.id === "period" ? formatDateRange(rawValue, language) : String(rawValue);

        if (!value.trim()) {
          return null;
        }

        if (index === 0) {
          const titleValue = previewFirstLine(value) || value;

          return (
            <h3 key={field.id} className="text-[15px] font-black uppercase tracking-[-0.03em] text-slate-950">
              {titleValue}
            </h3>
          );
        }

        const isMeta = field.id === "role" || field.id === "period" || field.id === "location" || field.id === "stack" || field.id === "degree";
        const plainValue = previewPlainText(value);

        if (isMeta) {
          return (
            <p key={field.id} className="font-mono text-[9px] uppercase leading-[1.35] tracking-[0.14em] text-slate-600">
              <span className="font-mono text-[8.8px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {fieldCaption(t(field.labelKey))}:{" "}
              </span>
              {plainValue}
            </p>
          );
        }

        return (
          <div
            key={field.id}
            className="space-y-0.5 text-[10.5px] leading-[1.35] text-slate-800"
          >
            <p className="font-mono text-[8.8px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {fieldCaption(t(field.labelKey))}:{" "}
            </p>
            <PreviewMarkdownText value={value} />
          </div>
        );
      })}
    </div>
  );
}

function renderGenericModule(draft: ResumeDraft, module: EditorModule, t: (key: TranslationKey) => string, language: Language) {
  const definition = getModuleDefinition(module);
  const fields = getOrderedFields(module, draft.layout.fields[module]).filter((field) => field.visible);
  const items = getModuleItems(draft, module);

  if (module === "identity") {
    return (
      <div className="space-y-2">
        {fieldVisible(draft, "identity", "summary") ? (
          <section className="mt-3">
            <PreviewSectionTitle>{t("preview.summary")}</PreviewSectionTitle>
            <PreviewMarkdownText value={draft.identity.summary || t("identity.summaryPlaceholder")} className="mt-1.5" />
          </section>
        ) : null}
      </div>
    );
  }

  if (module === "projects") {
    return (
      <section className="mt-3.5">
        <PreviewSectionTitle>{t("preview.projectExperience")}</PreviewSectionTitle>
        <div className="mt-2 space-y-3">
          {draft.projects.map((project) => (
            <div key={project.id} className="border-l-2 border-[var(--resume-accent)] pl-4">
              <PreviewFieldList fields={fields} item={project} t={t} language={language} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (module === "work") {
    return (
      <section className="mt-3.5">
        <PreviewSectionTitle>{t("preview.workHistory")}</PreviewSectionTitle>
        <div className="mt-2 space-y-3">
          {draft.work.map((work) => (
            <div key={work.id} className="border-l-2 border-[var(--resume-accent)] pl-4">
              <PreviewFieldList fields={fields} item={work} t={t} language={language} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (module === "skills") {
    const skillCategories = skillCategoriesFromFields(draft.skills, fields);
    if (!skillCategories.length) return null;

    const columnsClass = draft.skills.columnMode === "one" ? "grid-cols-1" : "grid-cols-2";

    return (
      <section className="mt-3.5">
        <PreviewSectionTitle>{t("preview.skillsMatrix")}</PreviewSectionTitle>
        <dl className={cn("mt-2 grid gap-3", columnsClass)}>
          {skillCategories.map((category) => (
            <div key={category.id} className="min-w-0">
              <dt className="font-mono text-[9.6px] font-black uppercase tracking-[0.16em] text-[var(--resume-accent)]">{fieldCaption(category.label)}</dt>
              <dd className="mt-1">
                {draft.skills.displayMode === "tags" ? (
                  <PreviewSkillTags value={category.content} />
                ) : (
                  <PreviewMarkdownText value={category.content} />
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  if (module === "education") {
    return (
      <section className="mt-3.5">
        <PreviewSectionTitle>{t("preview.education")}</PreviewSectionTitle>
        <div className="mt-2 space-y-3">
          {draft.education.map((education) => (
            <div key={education.id} className="text-[10.5px] leading-[1.35] text-slate-800">
              <PreviewFieldList fields={fields} item={education} t={t} language={language} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-3.5">
      <PreviewSectionTitle>{t(definition.labelKey)}</PreviewSectionTitle>
      <dl className="mt-2 space-y-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-slate-500">
        {fields.map((field) => (
          <div key={field.id} className="flex gap-2">
            <dt className="text-slate-950">{t(field.labelKey).split("·")[0]}</dt>
            <dd>{String(items[0]?.[field.id] ?? "")}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function customFieldValue(field: CustomModuleField, language: Language) {
  if (field.type === "date") return formatDateRange(field.value, language);
  return String(field.value ?? "");
}

function renderCustomModule(draft: ResumeDraft, moduleId: string, language: Language) {
  const customModule = draft.customModules.find((module) => module.id === moduleId);
  if (!customModule) return null;

  const fields = customModule.fields
    .filter((field) => field.visible)
    .map((field) => ({ field, value: customFieldValue(field, language) }))
    .filter(({ value }) => value.trim());

  if (!fields.length) return null;

  return (
    <section className="mt-3.5">
      <PreviewSectionTitle>{customModule.title}</PreviewSectionTitle>
      <div className="mt-2 space-y-2 border-l-2 border-[var(--resume-accent)] pl-4">
        {fields.map(({ field, value }, index) => {
          if (index === 0 && field.type === "text") {
            const titleValue = previewFirstLine(value) || value;

            return (
              <div key={field.id}>
                <p className="font-mono text-[8.8px] font-bold uppercase tracking-[0.14em] text-slate-400">{field.label}</p>
                <h3 className="text-[15px] font-black uppercase tracking-[-0.03em] text-slate-950">
                  {titleValue}
                </h3>
              </div>
            );
          }

          return (
            <div key={field.id} className="text-[10.5px] leading-[1.35] text-slate-800">
              <p className="font-mono text-[8.8px] font-bold uppercase tracking-[0.14em] text-slate-400">{field.label}</p>
              {field.type === "textarea" ? (
                <PreviewMarkdownText value={value} />
              ) : (
                <p className={cn(field.type === "date" ? "font-mono text-[9px] uppercase tracking-[0.14em] text-slate-600" : "whitespace-pre-line")}>{previewPlainText(value)}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PreviewPaper({
  children,
  pageNumber,
  scale,
  registerPaper,
  registerContent,
  accentColor,
  targetRole,
  exportTargetLabel,
  measurement = false,
}: {
  children: ReactNode;
  pageNumber: number;
  scale: number;
  registerPaper: (element: HTMLElement | null) => void;
  registerContent: (element: HTMLDivElement | null) => void;
  accentColor: string;
  targetRole: string;
  exportTargetLabel: string;
  measurement?: boolean;
}) {
  return (
    <article
      ref={registerPaper}
      data-resume-paper
      className={cn(
        "a4-paper transition-transform duration-200",
        measurement ? "w-[500px] shadow-none" : "w-[min(31vw,500px)] min-w-[360px] shadow-2xl shadow-black",
      )}
      style={{ "--resume-accent": accentColor } as CSSProperties}
    >
      <div
        ref={registerContent}
        className={cn("flex h-full origin-top flex-col p-[6.4%] transition-transform duration-200", scale < 0.9 ? "compress-pulse" : "")}
        style={{ transform: `scaleY(${scale})`, "--resume-content-scale-y": scale } as CSSProperties}
      >
        {children}
        <footer className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 pt-2 font-mono text-[8px] tracking-[0.16em] text-slate-400">
          <span className="min-w-0 truncate">
            {exportTargetLabel}: {targetRole}
          </span>
          <span className="shrink-0">PAGE_{pageNumber.toString().padStart(2, "0")}</span>
        </footer>
      </div>
    </article>
  );
}

function renderVisibleModule(draft: ResumeDraft, module: ModuleLayout, t: (key: TranslationKey) => string, language: Language): PreviewModuleNode[] {
  const node = isEditorModule(module.id)
    ? renderGenericModule(draft, module.id, t, language)
    : renderCustomModule(draft, module.id, language);

  return node ? [{ module: module.id, node }] : [];
}


export function ResumePreview() {
  const { language, t } = useI18n();
  const previewVisible = useEditorStore((state) => state.previewVisible);
  const setPreviewVisible = useEditorStore((state) => state.setPreviewVisible);
  const draft = useEditorStore((state) => state.draft);
  const accentColor = draft.theme.accentColor;
  const density = useMemo(() => getResumeDensity(draft), [draft]);
  const paperRefs = useRef<Array<HTMLElement | null>>([]);
  const contentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const measurePaperRef = useRef<HTMLElement | null>(null);
  const measureContentRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [layoutFitScale, setLayoutFitScale] = useState(1);

  const visibleModules = draft.layout.modules.filter((module) => module.visible && module.id !== "export");
  const moduleNodes = visibleModules.flatMap((module) => renderVisibleModule(draft, module, t, language));
  const measurementModuleNodes = visibleModules.flatMap((module) => renderVisibleModule(draft, module, t, language));
  const shouldUseTwoPages = (layoutFitScale < twoPageThreshold || density.level === "critical") && moduleNodes.length > 1;
  const pageCount = shouldUseTwoPages ? 2 : 1;
  const pageOneModules = pageCount === 1 ? moduleNodes : moduleNodes.slice(0, Math.ceil(moduleNodes.length / 2));
  const pageTwoModules = pageCount === 1 ? [] : moduleNodes.slice(Math.ceil(moduleNodes.length / 2));
  const previewScale = pageCount === 2 ? Math.max(0.72, Math.min(1, fitScale)) : Math.min(density.compression, fitScale);

  useEffect(() => {
    if (!previewVisible) return undefined;

    let frame = 0;

    const updateLayoutFitScale = () => {
      const paper = measurePaperRef.current;
      const content = measureContentRef.current;

      if (!paper || !content || !paper.clientHeight || !content.scrollHeight) {
        return;
      }

      const nextScale = Number(Math.min(1, Math.max(0.42, (paper.clientHeight - 2) / content.scrollHeight)).toFixed(3));
      setLayoutFitScale((currentScale) => (Math.abs(currentScale - nextScale) > 0.004 ? nextScale : currentScale));
    };

    frame = window.requestAnimationFrame(updateLayoutFitScale);

    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateLayoutFitScale);
    });

    if (measurePaperRef.current) resizeObserver.observe(measurePaperRef.current);
    if (measureContentRef.current) resizeObserver.observe(measureContentRef.current);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [draft, measurementModuleNodes.length, previewVisible]);

  useEffect(() => {
    if (!previewVisible) return undefined;

    let frame = 0;

    const updateFitScale = () => {
      const scales = contentRefs.current.map((content, index) => {
        const paper = paperRefs.current[index];

        if (!paper || !content || !paper.clientHeight || !content.scrollHeight) {
          return 1;
        }

        return Math.min(1, Math.max(0.42, (paper.clientHeight - 2) / content.scrollHeight));
      });
      const nextScale = Number((scales.length ? Math.min(...scales) : 1).toFixed(3));

      setFitScale((currentScale) => (Math.abs(currentScale - nextScale) > 0.004 ? nextScale : currentScale));
    };

    frame = window.requestAnimationFrame(updateFitScale);

    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateFitScale);
    });

    paperRefs.current.forEach((paper) => {
      if (paper) resizeObserver.observe(paper);
    });
    contentRefs.current.forEach((content) => {
      if (content) resizeObserver.observe(content);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [draft, moduleNodes.length, pageCount, previewVisible]);

  if (!previewVisible) return null;

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed left-[-200vw] top-0 z-[-1] opacity-0">
        <PreviewPaper
          pageNumber={1}
          scale={1}
          measurement
          registerPaper={(element) => {
            measurePaperRef.current = element;
          }}
          registerContent={(element) => {
            measureContentRef.current = element;
          }}
          accentColor={accentColor}
          targetRole={draft.exportProtocol.targetRole}
          exportTargetLabel={t("preview.exportTarget")}
        >
          <PreviewIdentityHeader draft={draft} t={t} />
          {measurementModuleNodes.map(({ module, node }) => <div key={`measure-${module}`}>{node}</div>)}
        </PreviewPaper>
      </div>

      <section data-resume-screen-root className="relative z-0 flex h-full w-[clamp(420px,34vw,560px)] shrink-0 flex-col border-l border-[rgba(125,139,153,0.18)] bg-[#070b10]">
      <div data-print-hidden className="flex items-center justify-between gap-4 border-b border-[rgba(125,139,153,0.18)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
        <span>{t("preview.title")}</span>
        <div className="flex items-center gap-3">
          <span className={density.level === "stable" ? "text-[var(--cyber-green)]" : "text-[var(--warning-orange)]"}>
            {pageCount === 2 ? t("control.twoPages") : t("control.onePage")} · {t(densityLabelKeys[density.level])} · FIT {Math.round(layoutFitScale * 100)}%
          </span>
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
        className={cn(
          "tactical-grid flex min-h-0 flex-1 justify-center overflow-x-hidden p-5",
          pageCount === 2 ? "tactical-scrollbar items-start overflow-y-auto" : "items-center overflow-hidden",
        )}
      >
        <div data-resume-print-stack className={cn("flex justify-center gap-6", pageCount === 2 ? "flex-col items-center pb-8" : "items-center")}> 
          <PreviewPaper
            pageNumber={1}
            scale={previewScale}
            registerPaper={(element) => {
              paperRefs.current[0] = element;
            }}
            registerContent={(element) => {
              contentRefs.current[0] = element;
            }}
            accentColor={accentColor}
            targetRole={draft.exportProtocol.targetRole}
            exportTargetLabel={t("preview.exportTarget")}
          >
            <PreviewIdentityHeader draft={draft} t={t} />
            {pageOneModules.map(({ module, node }) => (module === "identity" ? <div key={module}>{node}</div> : <div key={module}>{node}</div>))}
          </PreviewPaper>

          {pageCount === 2 ? (
            <PreviewPaper
              pageNumber={2}
              scale={previewScale}
              registerPaper={(element) => {
                paperRefs.current[1] = element;
              }}
              registerContent={(element) => {
                contentRefs.current[1] = element;
              }}
              accentColor={accentColor}
              targetRole={draft.exportProtocol.targetRole}
              exportTargetLabel={t("preview.exportTarget")}
            >
              {pageTwoModules.map(({ module, node }) => (
                <div key={module}>{node}</div>
              ))}
              {previewScale <= 0.73 ? <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.16em] text-orange-600">{t("control.overflowRisk")}</p> : null}
            </PreviewPaper>
          ) : null}
        </div>
      </div>
      </section>
    </>
  );
}
