import { formatDateRange } from "@/lib/date-range";
import { markdownToBulletItems, markdownToPlainText, parseMarkdownBlocks, type MarkdownBlock } from "@/lib/markdown";
import { getOrderedFields } from "@/lib/resume-layout";
import { fieldCaption, getResumeModuleItems, isResumeFieldVisible, isResumeMetaField, projectCustomModuleSection, projectIdentityContact, projectResumeItemFieldText, projectSkillSection, type ResumeItem } from "@/lib/resume-projection";
import { splitSkillTags } from "@/lib/skills";
import type { Language, TranslationKey } from "@/lib/i18n";
import type { EditorModule, ResumeDraft } from "@/types/resume";

export type PaperBlockKind =
  | "summary-line"
  | "header-field-line"
  | "label-value-line"
  | "markdown-label"
  | "markdown-line"
  | "gap"
  | "skills-row"
  | "section-title-only";

export type PaperBlock = {
  kind: PaperBlockKind;
  estimate: number;
  sectionTitle?: string;
  data?: Record<string, unknown>;
};

export type ResumePaperLayoutPlan = {
  blocks: PaperBlock[];
  pages: PaperBlock[][];
  pageCount: number;
  densityScale: number;
  overflowRisk: boolean;
  totalHeight: number;
  capacity: {
    firstPage: number;
    laterPage: number;
    total: number;
  };
};

type PaperTranslate = (key: TranslationKey) => string;
type TextStyle = "normal" | "bold";
type FontRole = "sans" | "mono";

export const resumePaperMetrics = {
  page: {
    width: 210,
    height: 297,
    marginX: 15.5,
    top: 14.5,
    footerLineY: 284,
    footerY: 289,
    contentBottom: 280,
  },
  layout: {
    headerHeight: 42,
    sectionGapTop: 4.2,
    sectionTitleLineOffset: 5.1,
    sectionGapBottom: 6.8,
    fieldGap: 1.9,
    itemGap: 4.4,
    rowGap: 4.8,
    borderInset: 4,
    bulletInset: 5.2,
    bulletTextGap: 3.4,
  },
  maxPages: 2,
  minDensityScale: 0.72,
  previewFontScale: 1.58,
} as const;

const averageCharWidth: Record<FontRole, Record<TextStyle, number>> = {
  sans: { normal: 0.52, bold: 0.57 },
  mono: { normal: 0.61, bold: 0.63 },
};
const cjkLikePattern = /[⺀-鿿豈-﫿぀-ヿ가-힯　-〿＀-￯]/u;
const tokenizePattern = /\s+|[⺀-鿿豈-﫿぀-ヿ가-힯　-〿＀-￯]+|[^\s⺀-鿿豈-﫿぀-ヿ가-힯　-〿＀-￯]+/gu;

function normalizePaperText(value: string | undefined | null) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, "")
    .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, " ");
}

export function paperRawText(value: string | undefined | null) {
  return markdownToPlainText(normalizePaperText(value), { preserveBlankLines: true }).trim();
}

export function paperSafeText(value: string | undefined | null) {
  return paperRawText(value).replace(/\s+/g, " ").trim();
}

export function paperUpper(value: string) {
  return paperSafeText(value).toUpperCase();
}

function containsCjk(value: string) {
  return cjkLikePattern.test(value);
}

export function paperLineHeight(size: number, scale: number, ratio = 1.35) {
  return scale * size * resumePaperMetrics.previewFontScale * 0.3528 * ratio;
}

function textWidth(text: string, size: number, style: TextStyle, role: FontRole, scale: number) {
  return Array.from(text).reduce((sum, char) => {
    const widthFactor = containsCjk(char) ? 0.92 : averageCharWidth[role][style];
    return sum + size * resumePaperMetrics.previewFontScale * widthFactor * 0.3528 * scale;
  }, 0);
}

function tokenize(value: string) {
  const tokens: string[] = [];
  for (const segment of paperSafeText(value).match(tokenizePattern) ?? []) {
    if (/^\s+$/u.test(segment)) {
      tokens.push(" ");
    } else if (containsCjk(segment)) {
      tokens.push(...Array.from(segment));
    } else {
      tokens.push(segment);
    }
  }
  return tokens;
}

function wrapLongToken(token: string, maxWidth: number, size: number, style: TextStyle, role: FontRole, scale: number) {
  const pieces: string[] = [];
  let current = "";

  for (const char of Array.from(token)) {
    const next = `${current}${char}`;
    if (current && textWidth(next, size, style, role, scale) > maxWidth) {
      pieces.push(current);
      current = char;
    } else {
      current = next;
    }
  }

  if (current) pieces.push(current);
  return pieces;
}

export function paperWrapped(text: string, maxWidth: number, size: number, style: TextStyle = "normal", role: FontRole = "sans", scale = 1) {
  const lines: string[] = [];
  let line = "";

  for (const token of tokenize(text)) {
    if (token === " " && !line) continue;
    const candidate = token === " " ? `${line} ` : `${line}${token}`;

    if (!line || textWidth(candidate, size, style, role, scale) <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line.trim()) lines.push(line.trimEnd());

    if (textWidth(token, size, style, role, scale) > maxWidth) {
      const pieces = wrapLongToken(token, maxWidth, size, style, role, scale);
      lines.push(...pieces.slice(0, -1));
      line = pieces.at(-1) ?? "";
    } else {
      line = token.trimStart();
    }
  }

  if (line.trim()) lines.push(line.trimEnd());
  return lines.length ? lines : [""];
}

function sectionTitleHeight(scale: number) {
  const layout = resumePaperMetrics.layout;
  return scale * (layout.sectionGapTop + layout.sectionTitleLineOffset + layout.sectionGapBottom);
}

function makeBlock(kind: PaperBlockKind, estimate: number, sectionTitle?: string, data?: Record<string, unknown>): PaperBlock {
  return { kind, estimate: (sectionTitle ? sectionTitleHeight(activeScale) : 0) + estimate, sectionTitle, data };
}

let activeScale = 1;
let activeLanguage: Language = "zh-CN";

function addFlowBlock(blocks: PaperBlock[], kind: PaperBlockKind, estimate: number, sectionTitle?: string, data?: Record<string, unknown>) {
  blocks.push(makeBlock(kind, estimate, sectionTitle, data));
}

function addGapBlock(blocks: PaperBlock[], gap: number) {
  addFlowBlock(blocks, "gap", activeScale * gap, undefined, { gap });
}

function addSummaryBlocks(blocks: PaperBlock[], draft: ResumeDraft, t: PaperTranslate) {
  if (!isResumeFieldVisible(draft, "identity", "summary")) return;
  const summary = paperSafeText(draft.identity.summary) || t("identity.summaryPlaceholder");
  const lines = paperWrapped(summary, 179, 8.2, "normal", "sans", activeScale);
  const lh = paperLineHeight(8.2, activeScale);

  lines.forEach((line, index) => {
    const isLast = index === lines.length - 1;
    addFlowBlock(blocks, "summary-line", lh + (isLast ? activeScale : 0), index === 0 ? t("preview.summary") : undefined, { module: "identity", line });
  });
}

function addHeaderFieldBlocks(blocks: PaperBlock[], value: string, maxWidth: number, sectionTitle?: string, data?: Record<string, unknown>) {
  const lines = paperWrapped(paperUpper(value), maxWidth, 11, "bold", "sans", activeScale);
  const lh = paperLineHeight(11, activeScale);

  lines.forEach((line, index) => {
    const isLast = index === lines.length - 1;
    addFlowBlock(blocks, "header-field-line", lh + (isLast ? activeScale * resumePaperMetrics.layout.fieldGap : 0), index === 0 ? sectionTitle : undefined, { ...data, line, lineIndex: index });
  });
}

function addLabelValueFieldBlocks(blocks: PaperBlock[], label: string, value: string, maxWidth: number, valueSize: number, valueRole: FontRole, sectionTitle?: string, data?: Record<string, unknown>) {
  const labelText = `${label}: `;
  const labelWidth = Math.min(maxWidth * 0.42, textWidth(labelText, 6.8, "bold", "mono", activeScale));
  const firstLineWidth = Math.max(maxWidth - labelWidth, maxWidth * 0.52);
  const lines = paperWrapped(value, firstLineWidth, valueSize, "normal", valueRole, activeScale);
  const lh = paperLineHeight(valueSize, activeScale);

  lines.forEach((line, index) => {
    const isLast = index === lines.length - 1;
    addFlowBlock(blocks, "label-value-line", lh + (isLast ? activeScale * resumePaperMetrics.layout.fieldGap : 0), index === 0 ? sectionTitle : undefined, { ...data, label, value, line, lineIndex: index, valueSize, valueRole });
  });
}

function markdownBlockStyle(block: MarkdownBlock): { size: number; style: TextStyle; role: FontRole; inset: number } {
  if (block.type === "heading") return { size: 8.6, style: "bold", role: "sans", inset: 0 };
  if (block.type === "bullet") return { size: 7.2, style: "normal", role: "sans", inset: block.ordered ? resumePaperMetrics.layout.bulletInset + resumePaperMetrics.layout.bulletTextGap + 1.8 : resumePaperMetrics.layout.bulletInset + resumePaperMetrics.layout.bulletTextGap };
  if (block.type === "quote") return { size: 7.1, style: "normal", role: "sans", inset: 2.8 };
  if (block.type === "code") return { size: 6.4, style: "normal", role: "mono", inset: 2 };
  return { size: 7.4, style: "normal", role: "sans", inset: 0 };
}

function addMarkdownFieldBlocks(blocks: PaperBlock[], label: string, value: string, maxWidth: number, sectionTitle?: string, data?: Record<string, unknown>) {
  const labelHeight = paperLineHeight(6.8, activeScale) + activeScale * 0.8;
  addFlowBlock(blocks, "markdown-label", labelHeight, sectionTitle, { ...data, label });

  const markdownBlocks = parseMarkdownBlocks(value);
  markdownBlocks.forEach((block, blockIndex) => {
    if (block.type === "blank") {
      addGapBlock(blocks, 1.2);
      return;
    }

    const style = markdownBlockStyle(block);
    const contentMaxWidth = Math.max(20, maxWidth - style.inset);
    const sourceLines = block.text.split("\n").map((line) => line.trim()).filter(Boolean);
    const lines = sourceLines.flatMap((line) => paperWrapped(block.type === "heading" ? paperUpper(line) : line, contentMaxWidth, style.size, style.style, style.role, activeScale));
    const renderedLines = lines.length ? lines : [""];
    const lh = paperLineHeight(style.size, activeScale);
    const isLastBlock = blockIndex === markdownBlocks.length - 1;

    renderedLines.forEach((line, lineIndex) => {
      const isLastLine = lineIndex === renderedLines.length - 1;
      const extraGap = isLastBlock && isLastLine ? activeScale * resumePaperMetrics.layout.fieldGap : isLastLine ? activeScale * 0.55 : 0;
      addFlowBlock(blocks, "markdown-line", lh + extraGap, undefined, { ...data, block, line, lineIndex, style });
    });
  });
}

function addFieldBlocks(blocks: PaperBlock[], field: ReturnType<typeof getOrderedFields>[number], fieldIndex: number, item: ResumeItem, t: PaperTranslate, maxWidth: number, sectionTitle?: string, data?: Record<string, unknown>) {
  const fieldText = projectResumeItemFieldText(item, field.id, activeLanguage);
  if (field.id === "bullets") {
    const markdownValue = normalizePaperText(fieldText).trim();
    if (!markdownValue) return false;
    addMarkdownFieldBlocks(blocks, fieldCaption(t(field.labelKey)), markdownValue, maxWidth, sectionTitle, { ...data, fieldId: field.id });
    return true;
  }

  const value = paperSafeText(fieldText);
  if (!value) return false;

  if (fieldIndex === 0) {
    addHeaderFieldBlocks(blocks, value, maxWidth, sectionTitle, { ...data, fieldId: field.id });
    return true;
  }

  const meta = isResumeMetaField(field.id);
  addLabelValueFieldBlocks(blocks, fieldCaption(t(field.labelKey)), meta ? paperUpper(value) : value, maxWidth, meta ? 6.4 : 7.4, meta ? "mono" : "sans", sectionTitle, { ...data, fieldId: field.id, meta });
  return true;
}

function addRepeatableBlocks(blocks: PaperBlock[], draft: ResumeDraft, module: EditorModule, title: string, t: PaperTranslate, bordered: boolean) {
  const fields = getOrderedFields(module, draft.layout.fields[module]).filter((field) => field.visible);
  const items = getResumeModuleItems(draft, module);
  if (!fields.length) return;

  items.forEach((item, itemIndex) => {
    let titlePending = itemIndex === 0 ? title : undefined;
    let drewAnyField = false;
    const maxWidth = bordered ? 171 : 179;

    fields.forEach((field, fieldIndex) => {
      const didDraw = addFieldBlocks(blocks, field, fieldIndex, item, t, maxWidth, titlePending, { module, itemIndex, bordered });
      if (didDraw) {
        titlePending = undefined;
        drewAnyField = true;
      }
    });

    if (drewAnyField) addGapBlock(blocks, resumePaperMetrics.layout.itemGap);
  });
}

function estimateSkillMarkdown(value: string, maxWidth: number) {
  const labelHeight = paperLineHeight(6.8, activeScale) + activeScale * 1.15;
  const markdownBlocks = parseMarkdownBlocks(normalizePaperText(value));
  const contentHeight = markdownBlocks.reduce((sum, block) => {
    if (block.type === "blank") return sum + activeScale * 1.1;

    const style = markdownBlockStyle(block);
    const contentMaxWidth = Math.max(20, maxWidth - style.inset);
    const sourceLines = block.text.split("\n").map((line) => line.trim()).filter(Boolean);
    const lines = sourceLines.flatMap((line) => paperWrapped(block.type === "heading" ? paperUpper(line) : line, contentMaxWidth, style.size, style.style, style.role, activeScale));
    return sum + Math.max(lines.length, 1) * paperLineHeight(style.size, activeScale) + activeScale * 0.55;
  }, 0);

  return labelHeight + contentHeight;
}

function skillTagRows(tags: string[], maxWidth: number) {
  const gap = activeScale * 1.4;
  let rowCount = tags.length ? 1 : 0;
  let cursorX = 0;

  tags.forEach((tag) => {
    const tagWidth = Math.min(maxWidth, textWidth(tag, 5.9, "bold", "sans", activeScale) + activeScale * 5.4);
    if (cursorX && cursorX + tagWidth > maxWidth) {
      rowCount += 1;
      cursorX = 0;
    }
    cursorX += tagWidth + gap;
  });

  return rowCount;
}

function estimateSkillTags(value: string, maxWidth: number) {
  const tags = splitSkillTags(value);
  const labelHeight = paperLineHeight(6.8, activeScale) + activeScale * 1.8;
  const tagHeight = paperLineHeight(5.9, activeScale) + activeScale * 1.5;
  const rowGap = activeScale * 1.5;
  const rows = skillTagRows(tags, maxWidth);

  return labelHeight + (rows ? rows * tagHeight + Math.max(0, rows - 1) * rowGap : 0);
}

function addSkillsBlock(blocks: PaperBlock[], draft: ResumeDraft, t: PaperTranslate) {
  const skillSection = projectSkillSection(draft);
  const { categories, displayMode, columnCount } = skillSection;
  if (!categories.length) return;

  const colGap = columnCount === 1 ? 0 : 9;
  const colWidth = (179 - colGap * (columnCount - 1)) / columnCount;
  const rows = categories.reduce<Array<typeof categories>>((acc, category, index) => {
    const row = Math.floor(index / columnCount);
    acc[row] = [...(acc[row] ?? []), category];
    return acc;
  }, []);

  rows.forEach((rowCategories, rowIndex) => {
    const rowHeight = Math.max(...rowCategories.map((category) => displayMode === "tags" ? estimateSkillTags(category.content, colWidth) : estimateSkillMarkdown(category.content, colWidth)));
    addFlowBlock(blocks, "skills-row", rowHeight + activeScale * resumePaperMetrics.layout.rowGap, rowIndex === 0 ? t("preview.skillsMatrix") : undefined, { module: "skills", categories: rowCategories, displayMode, columnCount, colWidth, colGap });
  });
}

function addSectionTitleOnlyBlock(blocks: PaperBlock[], title: string, moduleId: string) {
  const safeTitle = paperSafeText(title);
  if (!safeTitle) return;
  addFlowBlock(blocks, "section-title-only", 0, safeTitle, { module: moduleId, title: safeTitle });
}

function addCustomModuleBlocks(blocks: PaperBlock[], draft: ResumeDraft, moduleId: string) {
  const customSection = projectCustomModuleSection(draft, moduleId, activeLanguage);
  if (!customSection) return;

  const { fields, title } = customSection;
  if (!fields.length) {
    addSectionTitleOnlyBlock(blocks, title, moduleId);
    addGapBlock(blocks, resumePaperMetrics.layout.itemGap);
    return;
  }

  let titlePending: string | undefined = title;
  let drewAnyField = false;
  const maxWidth = 171;

  fields.forEach(({ field, value }, fieldIndex) => {
    const renderedValue = field.type === "textarea" ? paperRawText(value) : paperSafeText(value);
    if (!renderedValue) return;

    if (fieldIndex === 0 && field.type === "text") {
      const label = paperSafeText(field.label);
      if (label) {
        addLabelValueFieldBlocks(blocks, label, renderedValue, maxWidth, 7.4, "sans", titlePending, { module: moduleId, fieldId: field.id, bordered: true, custom: true });
      } else {
        addHeaderFieldBlocks(blocks, renderedValue, maxWidth, titlePending, { module: moduleId, fieldId: field.id, bordered: true, custom: true });
      }
    } else {
      const lines = field.type === "textarea" ? markdownToBulletItems(renderedValue) : [renderedValue];
      const text = lines.length > 1 ? lines.join(" / ") : renderedValue;
      addLabelValueFieldBlocks(blocks, paperSafeText(field.label), field.type === "date" ? paperUpper(text) : text, maxWidth, field.type === "date" ? 6.4 : 7.4, field.type === "date" ? "mono" : "sans", titlePending, { module: moduleId, fieldId: field.id, bordered: true, custom: true, date: field.type === "date" });
    }

    titlePending = undefined;
    drewAnyField = true;
  });

  if (drewAnyField) addGapBlock(blocks, resumePaperMetrics.layout.itemGap);
}

export function buildResumePaperBlocks(draft: ResumeDraft, t: PaperTranslate, options: { language?: Language; densityScale?: number } = {}) {
  activeScale = options.densityScale ?? 1;
  activeLanguage = options.language ?? "zh-CN";
  const blocks: PaperBlock[] = [];

  for (const moduleLayout of draft.layout.modules.filter((item) => item.visible)) {
    if (projectCustomModuleSection(draft, moduleLayout.id, activeLanguage)) {
      addCustomModuleBlocks(blocks, draft, moduleLayout.id);
      continue;
    }

    if (moduleLayout.id === "identity") addSummaryBlocks(blocks, draft, t);
    if (moduleLayout.id === "projects") addRepeatableBlocks(blocks, draft, "projects", t("preview.projectExperience"), t, true);
    if (moduleLayout.id === "work") addRepeatableBlocks(blocks, draft, "work", t("preview.workHistory"), t, true);
    if (moduleLayout.id === "skills") addSkillsBlock(blocks, draft, t);
    if (moduleLayout.id === "education") addRepeatableBlocks(blocks, draft, "education", t("preview.education"), t, false);
  }

  activeScale = 1;
  activeLanguage = "zh-CN";
  return blocks;
}

function totalBlockHeight(blocks: PaperBlock[]) {
  return blocks.reduce((sum, block) => sum + block.estimate, 0);
}

function paginateBlocks(blocks: PaperBlock[]) {
  const pages: PaperBlock[][] = [[]];
  let currentPage = 0;
  let y = resumePaperMetrics.page.top + activeScale * resumePaperMetrics.layout.headerHeight;

  for (const block of blocks) {
    if (currentPage < resumePaperMetrics.maxPages - 1 && pages[currentPage].length > 0 && y + block.estimate > resumePaperMetrics.page.contentBottom) {
      currentPage += 1;
      pages[currentPage] = [];
      y = resumePaperMetrics.page.top;
    }

    pages[currentPage].push(block);
    y += block.estimate;
  }

  return pages.filter((blocksOnPage) => blocksOnPage.length > 0 || pages.length === 1);
}

export function createResumePaperLayoutPlan(draft: ResumeDraft, t: PaperTranslate, options: { language?: Language } = {}): ResumePaperLayoutPlan {
  const unscaledBlocks = buildResumePaperBlocks(draft, t, { language: options.language, densityScale: 1 });
  const totalHeight = totalBlockHeight(unscaledBlocks);
  const firstPageCapacity = resumePaperMetrics.page.contentBottom - (resumePaperMetrics.page.top + resumePaperMetrics.layout.headerHeight);
  const laterPageCapacity = resumePaperMetrics.page.contentBottom - resumePaperMetrics.page.top;
  const totalCapacity = firstPageCapacity + laterPageCapacity * (resumePaperMetrics.maxPages - 1);
  const rawScale = totalHeight > totalCapacity ? totalCapacity / Math.max(totalHeight, 1) : 1;
  const densityScale = Math.max(resumePaperMetrics.minDensityScale, Math.min(1, rawScale));

  activeScale = densityScale;
  const blocks = buildResumePaperBlocks(draft, t, { language: options.language, densityScale });
  activeScale = densityScale;
  const pages = paginateBlocks(blocks).slice(0, resumePaperMetrics.maxPages);
  const scaledTotalHeight = totalBlockHeight(blocks);
  const overflowRisk = scaledTotalHeight > totalCapacity + 0.5 || pages.some((page, index) => {
    const capacity = index === 0 ? firstPageCapacity * densityScale : laterPageCapacity * densityScale;
    return totalBlockHeight(page) > capacity + 0.5;
  });
  activeScale = 1;

  return {
    blocks,
    pages,
    pageCount: Math.max(1, pages.length),
    densityScale,
    overflowRisk,
    totalHeight: scaledTotalHeight,
    capacity: {
      firstPage: firstPageCapacity * densityScale,
      laterPage: laterPageCapacity * densityScale,
      total: totalCapacity * densityScale,
    },
  };
}

export function projectIdentityHeaderHeight(draft: ResumeDraft) {
  const contact = projectIdentityContact(draft);
  const websiteLines = contact.websiteDisplay ? Math.min(2, paperWrapped(contact.websiteDisplay, contact.photo ? 46 : 58, 6.2, "normal", "mono").length) : 0;
  const contactLines = Number(Boolean(contact.email)) + Number(Boolean(contact.location)) + websiteLines;
  const contactHeight = contactLines ? contactLines * 5 : 0;
  const photoHeight = contact.photo ? 26 : 0;
  return Math.max(resumePaperMetrics.layout.headerHeight, 36 + Math.max(contactHeight, photoHeight) * 0.15);
}

export function formatPaperDateRange(value: string | Parameters<typeof formatDateRange>[0], language?: Language) {
  return formatDateRange(value, language);
}
