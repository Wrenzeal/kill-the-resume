import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFName, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { getApiBaseUrl } from "@/lib/api";
import { markdownToBulletItems, markdownToPlainText, parseMarkdownBlocks, type MarkdownBlock } from "@/lib/markdown";
import { createResumePaperLayoutPlan } from "@/lib/resume-paper-layout";
import { getOrderedFields } from "@/lib/resume-layout";
import { fieldCaption, getResumeModuleItems, isResumeFieldVisible, isResumeMetaField, projectCustomModuleSection, projectIdentityContact, projectResumeItemFieldText, projectSkillSection, type ResumeItem } from "@/lib/resume-projection";
import { hexToRgbTuple } from "@/lib/resume-theme";
import { splitSkillTags } from "@/lib/skills";
import type { Language, TranslationKey } from "@/lib/i18n";
import type { EditorModule, ResumeDraft } from "@/types/resume";

type PdfTextStyle = "normal" | "bold";
type PdfFontRole = "sans" | "mono";
type PdfTranslate = (key: TranslationKey) => string;
type PdfExportOptions = {
  language?: Language;
};
type PdfColor = [number, number, number];

type PdfTheme = {
  ink: PdfColor;
  muted: PdfColor;
  faint: PdfColor;
  light: PdfColor;
  black: PdfColor;
};

type PdfCursor = {
  y: number;
};

type PdfBlock = {
  estimate: number;
  draw: (page: PDFPage, cursor: PdfCursor) => void;
};

type PdfField = ReturnType<typeof getOrderedFields>[number];
type PdfFontSet = {
  sans: Record<PdfTextStyle, PDFFont>;
  mono: Record<PdfTextStyle, PDFFont>;
  cjk: Record<PdfTextStyle, PDFFont>;
};

type PdfImageAsset = {
  image: PDFImage;
  width: number;
  height: number;
};

const pageSize = {
  width: 210,
  height: 297,
  marginX: 15.5,
  top: 14.5,
  footerLineY: 284,
  footerY: 289,
  contentBottom: 280,
};

const layout = {
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
};

const maxPdfPages = 2;
const previewFontScale = 1.58;
const ptPerMm = 72 / 25.4;

const pdfFonts = {
  sans: {
    normal: "/fonts/ktr-paper-sans.ttf",
    bold: "/fonts/ktr-paper-sans-bold.ttf",
  },
  mono: {
    normal: "/fonts/ktr-paper-mono.ttf",
    bold: "/fonts/ktr-paper-mono-bold.ttf",
  },
  cjk: {
    normal: "/fonts/ktr-paper-cjk.ttf",
    bold: "/fonts/ktr-paper-cjk.ttf",
  },
};

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function backendFontUrl(fontName: string) {
  if (typeof window === "undefined") return "";

  try {
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl.startsWith("http://") && !apiBaseUrl.startsWith("https://")) return "";

    const apiUrl = new URL(apiBaseUrl);
    return `${apiUrl.origin}/assets/fonts/${fontName}`;
  } catch {
    return "";
  }
}

function fontCandidates(path: string) {
  const fontName = path.split("/").pop() ?? path;
  return uniqueValues([path, `/api/fonts/${fontName}`, backendFontUrl(fontName)]);
}

let activeFonts: PdfFontSet | null = null;
let activeImages: { identityPhoto?: PdfImageAsset } = {};
let activeDensityScale = 1;
let activePdfLanguage: Language = "zh-CN";

const cjkLikePattern = /[⺀-鿿豈-﫿぀-ヿ가-힯　-〿＀-￯]/;
const cjkLikeRunPattern = /[⺀-鿿豈-﫿぀-ヿ가-힯　-〿＀-￯]+|[^⺀-鿿豈-﫿぀-ヿ가-힯　-〿＀-￯]+/g;
const tokenizePattern = /\s+|[⺀-鿿豈-﫿぀-ヿ가-힯　-〿＀-￯]+|[^\s⺀-鿿豈-﫿぀-ヿ가-힯　-〿＀-￯]+/g;

const theme: PdfTheme = {
  ink: [15, 23, 42],
  muted: [71, 85, 105],
  faint: [148, 163, 184],
  light: [203, 213, 225],
  black: [2, 6, 23],
};

let activePdfAccent: PdfColor = theme.black;

function mm(value: number) {
  return value * ptPerMm;
}

function yFromTop(value: number) {
  return mm(pageSize.height - value);
}

function scaled(value: number) {
  return value * activeDensityScale;
}

function scaledFontSize(value: number) {
  return scaled(value * previewFontScale);
}

function color(value: PdfColor) {
  return rgb(value[0] / 255, value[1] / 255, value[2] / 255);
}

function splitList(value: string) {
  return markdownToBulletItems(value);
}

function normalizePdfText(value: string | undefined | null) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, "")
    .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, " ");
}

function rawText(value: string | undefined | null) {
  return markdownToPlainText(normalizePdfText(value), { preserveBlankLines: true }).trim();
}

function safeText(value: string | undefined | null) {
  return rawText(value).replace(/\s+/g, " ").trim();
}

function upper(value: string) {
  return safeText(value).toUpperCase();
}

function containsCjk(value: string) {
  return cjkLikePattern.test(value);
}

function splitFontRuns(value: string) {
  const runs: Array<{ text: string; cjk: boolean }> = [];

  for (const segment of normalizePdfText(value).match(cjkLikeRunPattern) ?? []) {
    const cjk = containsCjk(segment);
    const last = runs.at(-1);

    if (last?.cjk === cjk) {
      last.text += segment;
    } else {
      runs.push({ text: segment, cjk });
    }
  }

  return runs;
}

function fontFor(role: PdfFontRole, style: PdfTextStyle, text = "", forceCjk = false) {
  if (!activeFonts) throw new Error("PDF fonts are not ready");
  if (forceCjk || containsCjk(text)) return activeFonts.cjk[style];
  return activeFonts[role][style];
}

function lineHeight(size: number, ratio = 1.35) {
  return scaled(size * previewFontScale * 0.3528 * ratio);
}

function textWidth(text: string, size: number, style: PdfTextStyle, role: PdfFontRole, forceCjk = false) {
  const font = fontFor(role, style, text, forceCjk);
  return font.widthOfTextAtSize(text, scaledFontSize(size)) / ptPerMm;
}

function measureMixedTextWidth(text: string, size: number, style: PdfTextStyle, role: PdfFontRole) {
  if (!containsCjk(text)) return textWidth(text, size, style, role);

  return splitFontRuns(text).reduce((sum, run) => sum + textWidth(run.text, size, style, role, run.cjk), 0);
}

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, stroke: PdfColor, thickness = 0.3) {
  page.drawLine({
    start: { x: mm(x1), y: yFromTop(y1) },
    end: { x: mm(x2), y: yFromTop(y2) },
    color: color(stroke),
    thickness: mm(thickness),
  });
}

function drawTextRun(page: PDFPage, text: string, x: number, y: number, size: number, style: PdfTextStyle, role: PdfFontRole, fill: PdfColor, forceCjk = false) {
  if (!text) return;
  page.drawText(text, {
    x: mm(x),
    y: yFromTop(y),
    size: scaledFontSize(size),
    font: fontFor(role, style, text, forceCjk),
    color: color(fill),
  });
}

function drawMixedTextLine(page: PDFPage, text: string, x: number, y: number, size: number, style: PdfTextStyle, fill: PdfColor, role: PdfFontRole) {
  let cursorX = x;

  splitFontRuns(text).forEach((run) => {
    drawTextRun(page, run.text, cursorX, y, size, style, role, fill, run.cjk);
    cursorX += textWidth(run.text, size, style, role, run.cjk);
  });
}

function textLine(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  style: PdfTextStyle = "normal",
  fill = theme.ink,
  role: PdfFontRole = "sans",
  options?: { align?: "right"; maxWidth?: number },
) {
  const content = safeText(text);
  if (!content) return;
  const renderedWidth = measureMixedTextWidth(content, size, style, role);
  const drawX = options?.align === "right" ? x - Math.min(renderedWidth, options.maxWidth ?? renderedWidth) : x;

  if (containsCjk(content)) {
    drawMixedTextLine(page, content, drawX, y, size, style, fill, role);
  } else {
    drawTextRun(page, content, drawX, y, size, style, role, fill);
  }
}

function addUriLink(page: PDFPage, href: string, x: number, y: number, width: number, height: number) {
  if (!href || width <= 0 || height <= 0) return;

  const annotation = page.doc.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [mm(x), yFromTop(y + height), mm(x + width), yFromTop(y)],
    Border: [0, 0, 0],
    A: {
      Type: "Action",
      S: "URI",
      URI: href,
    },
  });
  const annotationRef = page.doc.context.register(annotation);
  const existingAnnotations = page.node.Annots();

  if (existingAnnotations) {
    existingAnnotations.push(annotationRef);
  } else {
    page.node.set(PDFName.of("Annots"), page.doc.context.obj([annotationRef]));
  }
}

function clampTextToWidth(text: string, maxWidth: number, size: number, style: PdfTextStyle, role: PdfFontRole, suffix = "") {
  const content = safeText(text);
  if (!content) return "";
  if (!suffix && measureMixedTextWidth(content, size, style, role) <= maxWidth) return content;

  const glyphs = Array.from(content);
  const marker = suffix || "...";
  let low = 0;
  let high = glyphs.length;
  let best = "";

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = `${glyphs.slice(0, mid).join("")}${marker}`;

    if (measureMixedTextWidth(candidate, size, style, role) <= maxWidth) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best || marker;
}

function drawRightAlignedClampedText(
  page: PDFPage,
  text: string,
  right: number,
  y: number,
  maxWidth: number,
  size: number,
  style: PdfTextStyle,
  fill: PdfColor,
  role: PdfFontRole,
) {
  const content = safeText(text);
  if (!content) return;
  const line = measureMixedTextWidth(content, size, style, role) <= maxWidth ? content : clampTextToWidth(content, maxWidth, size, style, role);
  textLine(page, line, right, y, size, style, fill, role, { align: "right" });
}

function drawRightAlignedWebsite(page: PDFPage, content: string, href: string, right: number, y: number, maxWidth: number) {
  if (!content) return 0;

  const allLines = wrapped(content, maxWidth, 6.2, "normal", "mono");
  const lines = allLines.slice(0, 2);
  if (allLines.length > 2 && lines[1]) lines[1] = clampTextToWidth(lines[1], maxWidth, 6.2, "normal", "mono", "...");

  lines.forEach((line, index) => {
    const lineY = y + scaled(index * 4.1);
    const lineWidth = Math.min(measureMixedTextWidth(line, 6.2, "normal", "mono"), maxWidth);

    textLine(page, line, right, lineY, 6.2, "normal", theme.muted, "mono", { align: "right" });
    if (href) addUriLink(page, href, right - lineWidth, lineY - scaled(1.2), lineWidth, scaled(4.5));
  });

  return lines.length;
}

function tokenize(value: string) {
  const tokens: string[] = [];
  for (const segment of safeText(value).match(tokenizePattern) ?? []) {
    if (/^\s+$/.test(segment)) {
      tokens.push(" ");
    } else if (containsCjk(segment)) {
      tokens.push(...Array.from(segment));
    } else {
      tokens.push(segment);
    }
  }
  return tokens;
}

function wrapLongToken(token: string, maxWidth: number, size: number, style: PdfTextStyle, role: PdfFontRole) {
  const pieces: string[] = [];
  let current = "";

  for (const char of Array.from(token)) {
    const next = `${current}${char}`;
    if (current && measureMixedTextWidth(next, size, style, role) > maxWidth) {
      pieces.push(current);
      current = char;
    } else {
      current = next;
    }
  }

  if (current) pieces.push(current);
  return pieces;
}

function wrapped(text: string, maxWidth: number, size: number, style: PdfTextStyle = "normal", role: PdfFontRole = "sans") {
  const lines: string[] = [];
  let line = "";

  for (const token of tokenize(text)) {
    if (token === " " && !line) continue;
    const candidate = token === " " ? `${line} ` : `${line}${token}`;

    if (!line || measureMixedTextWidth(candidate, size, style, role) <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line.trim()) lines.push(line.trimEnd());

    if (measureMixedTextWidth(token, size, style, role) > maxWidth) {
      const pieces = wrapLongToken(token, maxWidth, size, style, role);
      lines.push(...pieces.slice(0, -1));
      line = pieces.at(-1) ?? "";
    } else {
      line = token.trimStart();
    }
  }

  if (line.trim()) lines.push(line.trimEnd());
  return lines.length ? lines : [""];
}

function sectionTitleHeight() {
  return scaled(layout.sectionGapTop + layout.sectionTitleLineOffset + layout.sectionGapBottom);
}

function sectionTitle(page: PDFPage, title: string, cursor: PdfCursor) {
  cursor.y += scaled(layout.sectionGapTop);
  textLine(page, upper(title), pageSize.marginX, cursor.y, 8.4, "bold", activePdfAccent, "mono");
  const lineY = cursor.y + scaled(layout.sectionTitleLineOffset);
  drawLine(page, pageSize.marginX, lineY, pageSize.width - pageSize.marginX, lineY, activePdfAccent, 0.3);
  cursor.y = lineY + scaled(layout.sectionGapBottom);
}

function addFlowBlock(
  blocks: PdfBlock[],
  estimate: number,
  drawSegment: (page: PDFPage, cursor: PdfCursor) => void,
  options: { includeTitle?: string; bordered?: boolean; borderColor?: PdfColor } = {},
) {
  blocks.push({
    estimate: (options.includeTitle ? sectionTitleHeight() : 0) + estimate,
    draw: (targetPage, cursor) => {
      if (options.includeTitle) sectionTitle(targetPage, options.includeTitle, cursor);

      const startY = cursor.y;
      drawSegment(targetPage, cursor);

      if (options.bordered) {
        drawLine(
          targetPage,
          pageSize.marginX,
          startY - scaled(1),
          pageSize.marginX,
          Math.max(startY + scaled(4), cursor.y - scaled(1.5)),
          options.borderColor ?? theme.light,
          0.7,
        );
      }
    },
  });
}

function addGapBlock(blocks: PdfBlock[], gap: number) {
  blocks.push({
    estimate: scaled(gap),
    draw: (_targetPage, cursor) => {
      cursor.y += scaled(gap);
    },
  });
}

function addHighlightBlocks(blocks: PdfBlock[], draft: ResumeDraft, t: PdfTranslate) {
  if (!isResumeFieldVisible(draft, "identity", "highlights")) return;
  const highlights = normalizePdfText(draft.identity.highlights).split(/\r?\n/).map((line) => safeText(line)).filter(Boolean);
  if (!highlights.length) return;

  highlights.slice(0, 5).forEach((highlight, highlightIndex) => {
    const lines = wrapped(highlight, 171, 7.2, "bold", "sans");
    const lh = lineHeight(7.2, 1.3);
    lines.forEach((line, lineIndex) => {
      const isLastLine = lineIndex === lines.length - 1;
      addFlowBlock(
        blocks,
        lh + (isLastLine ? scaled(1.15) : 0),
        (targetPage, cursor) => {
          const boxHeight = lh + scaled(0.65);
          targetPage.drawRectangle({
            x: mm(pageSize.marginX + layout.borderInset),
            y: yFromTop(cursor.y + boxHeight - scaled(0.25)),
            width: mm(171),
            height: mm(boxHeight),
            color: color([248, 250, 252]),
            borderColor: color(theme.light),
            borderWidth: mm(0.18),
          });
          targetPage.drawRectangle({
            x: mm(pageSize.marginX + layout.borderInset + scaled(1.6)),
            y: yFromTop(cursor.y + scaled(3.6)),
            width: mm(scaled(1.4)),
            height: mm(scaled(1.4)),
            color: color(activePdfAccent),
          });
          textLine(targetPage, line, pageSize.marginX + layout.borderInset + scaled(5.2), cursor.y + scaled(1.2), 7.2, "bold", theme.black, "sans");
          cursor.y += lh + (isLastLine ? scaled(1.15) : 0);
        },
        { includeTitle: highlightIndex === 0 && lineIndex === 0 ? t("preview.highlights") : undefined },
      );
    });
  });
}

function addSummaryBlock(blocks: PdfBlock[], draft: ResumeDraft, t: PdfTranslate) {
  if (!isResumeFieldVisible(draft, "identity", "summary")) return;
  const summary = safeText(draft.identity.summary) || t("identity.summaryPlaceholder");
  const lines = wrapped(summary, 179, 8.2);
  const lh = lineHeight(8.2);

  lines.forEach((line, index) => {
    const isLast = index === lines.length - 1;
    addFlowBlock(
      blocks,
      lh + (isLast ? scaled(1) : 0),
      (targetPage, cursor) => {
        textLine(targetPage, line, pageSize.marginX, cursor.y, 8.2, "normal", theme.ink, "sans");
        cursor.y += lh + (isLast ? scaled(1) : 0);
      },
      { includeTitle: index === 0 ? t("preview.summary") : undefined },
    );
  });
}

function addHeaderFieldBlocks(
  blocks: PdfBlock[],
  value: string,
  maxWidth: number,
  options: { includeTitle?: string; bordered?: boolean; borderColor?: PdfColor },
) {
  const lines = wrapped(upper(value), maxWidth, 11, "bold", "sans");
  const lh = lineHeight(11);

  lines.forEach((line, index) => {
    const isLast = index === lines.length - 1;
    addFlowBlock(
      blocks,
      lh + (isLast ? scaled(layout.fieldGap) : 0),
      (targetPage, cursor) => {
        textLine(targetPage, line, pageSize.marginX + layout.borderInset, cursor.y, 11, "bold", theme.black, "sans");
        cursor.y += lh + (isLast ? scaled(layout.fieldGap) : 0);
      },
      { ...options, includeTitle: index === 0 ? options.includeTitle : undefined },
    );
  });
}

function addLabelValueFieldBlocks(
  blocks: PdfBlock[],
  label: string,
  value: string,
  maxWidth: number,
  valueSize: number,
  valueRole: PdfFontRole,
  valueColor: PdfColor,
  options: { includeTitle?: string; bordered?: boolean; borderColor?: PdfColor },
) {
  const x = pageSize.marginX + layout.borderInset;
  const labelText = `${label}: `;
  const labelWidth = Math.min(maxWidth * 0.42, measureMixedTextWidth(labelText, 6.8, "bold", "mono"));
  const firstLineWidth = Math.max(maxWidth - labelWidth, maxWidth * 0.52);
  const lines = wrapped(value, firstLineWidth, valueSize, "normal", valueRole);
  const lh = lineHeight(valueSize);

  lines.forEach((line, index) => {
    const isLast = index === lines.length - 1;
    addFlowBlock(
      blocks,
      lh + (isLast ? scaled(layout.fieldGap) : 0),
      (targetPage, cursor) => {
        if (index === 0) textLine(targetPage, labelText, x, cursor.y, 6.8, "bold", theme.faint, "mono");
        textLine(targetPage, line, index === 0 ? x + labelWidth : x, cursor.y, valueSize, "normal", valueColor, valueRole);
        cursor.y += lh + (isLast ? scaled(layout.fieldGap) : 0);
      },
      { ...options, includeTitle: index === 0 ? options.includeTitle : undefined },
    );
  });
}

function markdownBlockStyle(block: MarkdownBlock): {
  size: number;
  style: PdfTextStyle;
  role: PdfFontRole;
  fill: PdfColor;
  inset: number;
} {
  if (block.type === "heading") return { size: 8.6, style: "bold", role: "sans", fill: theme.black, inset: 0 };
  if (block.type === "bullet") {
    return {
      size: 7.2,
      style: "normal",
      role: "sans",
      fill: theme.ink,
      inset: block.ordered ? layout.bulletInset + layout.bulletTextGap + 1.8 : layout.bulletInset + layout.bulletTextGap,
    };
  }
  if (block.type === "quote") return { size: 7.1, style: "normal", role: "sans", fill: theme.muted, inset: 2.8 };
  if (block.type === "code") return { size: 6.4, style: "normal", role: "mono", fill: theme.muted, inset: 2 };
  return { size: 7.4, style: "normal", role: "sans", fill: theme.ink, inset: 0 };
}

function addMarkdownFieldBlocks(
  blocks: PdfBlock[],
  label: string,
  value: string,
  maxWidth: number,
  options: { includeTitle?: string; bordered?: boolean; borderColor?: PdfColor },
) {
  const x = pageSize.marginX + layout.borderInset;
  const labelText = `${label}:`;
  const labelHeight = lineHeight(6.8) + scaled(0.8);
  let titlePending = options.includeTitle;

  addFlowBlock(
    blocks,
    labelHeight,
    (targetPage, cursor) => {
      textLine(targetPage, labelText, x, cursor.y, 6.8, "bold", theme.faint, "mono");
      cursor.y += labelHeight;
    },
    { ...options, includeTitle: titlePending },
  );
  titlePending = undefined;

  const markdownBlocks = parseMarkdownBlocks(value);

  markdownBlocks.forEach((block, blockIndex) => {
    if (block.type === "blank") {
      addGapBlock(blocks, 1.2);
      return;
    }

    const style = markdownBlockStyle(block);
    const textX = x + style.inset;
    const bulletX = x + layout.bulletInset;
    const contentMaxWidth = Math.max(20, maxWidth - style.inset);
    const sourceLines = block.text.split("\n").map((line) => line.trim()).filter(Boolean);
    const wrappedLines = sourceLines.flatMap((line) => wrapped(block.type === "heading" ? upper(line) : line, contentMaxWidth, style.size, style.style, style.role));
    const lines = wrappedLines.length ? wrappedLines : [""];
    const lh = lineHeight(style.size);
    const isLastBlock = blockIndex === markdownBlocks.length - 1;

    lines.forEach((line, lineIndex) => {
      const isLastLine = lineIndex === lines.length - 1;
      const extraGap = isLastBlock && isLastLine ? scaled(layout.fieldGap) : isLastLine ? scaled(0.55) : 0;

      addFlowBlock(
        blocks,
        lh + extraGap,
        (targetPage, cursor) => {
          if (block.type === "bullet" && lineIndex === 0) {
            if (block.ordered) {
              textLine(targetPage, `${block.order ?? 1}.`, bulletX - 0.8, cursor.y, 6.6, "bold", activePdfAccent, "mono");
            } else {
              targetPage.drawRectangle({
                x: mm(bulletX),
                y: yFromTop(cursor.y - scaled(0.7)),
                width: mm(scaled(1)),
                height: mm(scaled(1)),
                color: color(activePdfAccent),
              });
            }
          }

          if (block.type === "quote" && lineIndex === 0) {
            drawLine(targetPage, x, cursor.y - scaled(0.6), x, cursor.y + lh, activePdfAccent, 0.35);
          }

          textLine(targetPage, line, textX, cursor.y, style.size, style.style, style.fill, style.role);
          cursor.y += lh + extraGap;
        },
        { ...options, includeTitle: titlePending },
      );
    });
  });
}

function addFieldBlocks(
  blocks: PdfBlock[],
  field: PdfField,
  fieldIndex: number,
  item: ResumeItem,
  t: PdfTranslate,
  maxWidth: number,
  options: { includeTitle?: string; bordered?: boolean; borderColor?: PdfColor },
) {
  const fieldText = projectResumeItemFieldText(item, field.id, activePdfLanguage);
  if (field.id === "bullets") {
    const markdownValue = normalizePdfText(fieldText).trim();
    if (!markdownValue) return false;
    addMarkdownFieldBlocks(blocks, fieldCaption(t(field.labelKey)), markdownValue, maxWidth, options);
    return true;
  }

  const value = safeText(fieldText);
  if (!value) return false;

  if (fieldIndex === 0) {
    addHeaderFieldBlocks(blocks, value, maxWidth, options);
    return true;
  }

  const meta = isResumeMetaField(field.id);
  const label = fieldCaption(t(field.labelKey));
  addLabelValueFieldBlocks(blocks, label, meta ? upper(value) : value, maxWidth, meta ? 6.4 : 7.4, meta ? "mono" : "sans", meta ? theme.muted : theme.ink, options);
  return true;
}

function addRepeatableBlocks(blocks: PdfBlock[], draft: ResumeDraft, module: EditorModule, title: string, t: PdfTranslate, bordered: boolean, borderColor: PdfColor) {
  const fields = getOrderedFields(module, draft.layout.fields[module]).filter((field) => field.visible);
  const items = getResumeModuleItems(draft, module);
  if (!fields.length) return;

  items.forEach((item, itemIndex) => {
    let titlePending = itemIndex === 0 ? title : undefined;
    let drewAnyField = false;
    const maxWidth = bordered ? 171 : 179;

    fields.forEach((field, fieldIndex) => {
      const didDraw = addFieldBlocks(blocks, field, fieldIndex, item, t, maxWidth, {
        includeTitle: titlePending,
        bordered,
        borderColor,
      });

      if (didDraw) {
        titlePending = undefined;
        drewAnyField = true;
      }
    });

    if (drewAnyField) addGapBlock(blocks, layout.itemGap);
  });
}

function estimateSkillMarkdown(value: string, maxWidth: number) {
  const labelHeight = lineHeight(6.8) + scaled(1.15);
  const markdownBlocks = parseMarkdownBlocks(normalizePdfText(value));

  if (!markdownBlocks.length) return labelHeight;

  const contentHeight = markdownBlocks.reduce((sum, block) => {
    if (block.type === "blank") return sum + scaled(1.1);

    const style = markdownBlockStyle(block);
    const contentMaxWidth = Math.max(20, maxWidth - style.inset);
    const sourceLines = block.text.split("\n").map((line) => line.trim()).filter(Boolean);
    const lines = sourceLines.flatMap((line) => wrapped(block.type === "heading" ? upper(line) : line, contentMaxWidth, style.size, style.style, style.role));

    return sum + Math.max(lines.length, 1) * lineHeight(style.size) + scaled(0.55);
  }, 0);

  return labelHeight + contentHeight;
}

function drawSkillMarkdown(page: PDFPage, label: string, value: string, x: number, y: number, maxWidth: number) {
  textLine(page, `${label}:`, x, y, 6.8, "bold", activePdfAccent, "mono");
  let currentY = y + lineHeight(6.8) + scaled(1.15);
  const markdownBlocks = parseMarkdownBlocks(normalizePdfText(value));

  markdownBlocks.forEach((block) => {
    if (block.type === "blank") {
      currentY += scaled(1.1);
      return;
    }

    const style = markdownBlockStyle(block);
    const textX = x + style.inset;
    const bulletX = x + 1.4;
    const contentMaxWidth = Math.max(20, maxWidth - style.inset);
    const sourceLines = block.text.split("\n").map((line) => line.trim()).filter(Boolean);
    const lines = sourceLines.flatMap((line) => wrapped(block.type === "heading" ? upper(line) : line, contentMaxWidth, style.size, style.style, style.role));
    const lh = lineHeight(style.size);

    (lines.length ? lines : [""]).forEach((line, lineIndex) => {
      if (block.type === "bullet" && lineIndex === 0) {
        if (block.ordered) {
          textLine(page, `${block.order ?? 1}.`, bulletX, currentY, 6.2, "bold", activePdfAccent, "mono");
        } else {
          page.drawRectangle({
            x: mm(bulletX + 0.4),
            y: yFromTop(currentY - scaled(0.55)),
            width: mm(scaled(0.9)),
            height: mm(scaled(0.9)),
            color: color(activePdfAccent),
          });
        }
      }

      if (block.type === "quote" && lineIndex === 0) {
        drawLine(page, x, currentY - scaled(0.5), x, currentY + lh, activePdfAccent, 0.35);
      }

      textLine(page, line, textX, currentY, style.size, style.style, style.fill, style.role);
      currentY += lh;
    });

    currentY += scaled(0.55);
  });
}

function skillTagRows(tags: string[], maxWidth: number) {
  const gap = scaled(1.4);
  let rowCount = tags.length ? 1 : 0;
  let cursorX = 0;

  tags.forEach((tag) => {
    const tagWidth = Math.min(maxWidth, measureMixedTextWidth(tag, 5.9, "bold", "sans") + scaled(5.4));
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
  const labelHeight = lineHeight(6.8) + scaled(1.8);
  const tagHeight = lineHeight(5.9) + scaled(1.5);
  const rowGap = scaled(1.5);
  const rows = skillTagRows(tags, maxWidth);

  return labelHeight + (rows ? rows * tagHeight + Math.max(0, rows - 1) * rowGap : 0);
}

function drawSkillTags(page: PDFPage, label: string, value: string, x: number, y: number, maxWidth: number) {
  const tags = splitSkillTags(value);
  textLine(page, `${label}:`, x, y, 6.8, "bold", activePdfAccent, "mono");

  if (!tags.length) return;

  const tagHeight = lineHeight(5.9) + scaled(1.5);
  const gap = scaled(1.4);
  const rowGap = scaled(1.5);
  let cursorX = x;
  let cursorY = y + lineHeight(6.8) + scaled(1.8);

  tags.forEach((tag) => {
    const tagWidth = Math.min(maxWidth, measureMixedTextWidth(tag, 5.9, "bold", "sans") + scaled(5.4));
    if (cursorX > x && cursorX - x + tagWidth > maxWidth) {
      cursorX = x;
      cursorY += tagHeight + rowGap;
    }

    page.drawRectangle({
      x: mm(cursorX),
      y: yFromTop(cursorY + tagHeight - scaled(0.2)),
      width: mm(tagWidth),
      height: mm(tagHeight),
      color: color([248, 250, 252]),
      borderColor: color(activePdfAccent),
      borderWidth: mm(0.18),
    });
    textLine(page, tag, cursorX + scaled(2.6), cursorY + scaled(1.25), 5.9, "bold", theme.muted, "sans");
    cursorX += tagWidth + gap;
  });
}

function addSkillsBlock(blocks: PdfBlock[], draft: ResumeDraft, t: PdfTranslate) {
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
    const rowHeight = Math.max(
      ...rowCategories.map((category) => {
        const value = category.content;
        return displayMode === "tags" ? estimateSkillTags(value, colWidth) : estimateSkillMarkdown(value, colWidth);
      }),
    );

    addFlowBlock(
      blocks,
      rowHeight + scaled(layout.rowGap),
      (targetPage, cursor) => {
        rowCategories.forEach((category, columnIndex) => {
          const x = pageSize.marginX + columnIndex * (colWidth + colGap);
          const label = fieldCaption(category.label);
          const value = category.content;

          if (displayMode === "tags") {
            drawSkillTags(targetPage, label, value, x, cursor.y, colWidth);
          } else {
            drawSkillMarkdown(targetPage, label, value, x, cursor.y, colWidth);
          }
        });
        cursor.y += rowHeight + scaled(layout.rowGap);
      },
      { includeTitle: rowIndex === 0 ? t("preview.skillsMatrix") : undefined },
    );
  });
}

function addSectionTitleOnlyBlock(blocks: PdfBlock[], title: string) {
  const safeTitle = safeText(title);
  if (!safeTitle) return;

  addFlowBlock(blocks, 0, () => undefined, { includeTitle: safeTitle });
}

function addCustomModuleBlocks(blocks: PdfBlock[], draft: ResumeDraft, moduleId: string) {
  const customSection = projectCustomModuleSection(draft, moduleId, activePdfLanguage);
  if (!customSection) return;

  const { fields, title } = customSection;
  if (!fields.length) {
    addSectionTitleOnlyBlock(blocks, title);
    addGapBlock(blocks, layout.itemGap);
    return;
  }

  let titlePending: string | undefined = title;
  let drewAnyField = false;
  const maxWidth = 171;

  fields.forEach(({ field, value }, fieldIndex) => {
    const renderedValue = field.type === "textarea" ? rawText(value) : safeText(value);
    if (!renderedValue) return;

    if (fieldIndex === 0 && field.type === "text") {
      const label = safeText(field.label);
      if (label) {
        addLabelValueFieldBlocks(blocks, label, renderedValue, maxWidth, 7.4, "sans", theme.ink, {
          includeTitle: titlePending,
          bordered: true,
          borderColor: activePdfAccent,
        });
      } else {
        addHeaderFieldBlocks(blocks, renderedValue, maxWidth, {
          includeTitle: titlePending,
          bordered: true,
          borderColor: activePdfAccent,
        });
      }
    } else {
      const lines = field.type === "textarea" ? splitList(renderedValue) : [renderedValue];
      const text = lines.length > 1 ? lines.join(" / ") : renderedValue;
      addLabelValueFieldBlocks(blocks, safeText(field.label), field.type === "date" ? upper(text) : text, maxWidth, field.type === "date" ? 6.4 : 7.4, field.type === "date" ? "mono" : "sans", field.type === "date" ? theme.muted : theme.ink, {
        includeTitle: titlePending,
        bordered: true,
        borderColor: activePdfAccent,
      });
    }

    titlePending = undefined;
    drewAnyField = true;
  });

  if (drewAnyField) addGapBlock(blocks, layout.itemGap);
}

function buildBlocks(draft: ResumeDraft, t: PdfTranslate) {
  const blocks: PdfBlock[] = [];

  for (const moduleLayout of draft.layout.modules.filter((item) => item.visible)) {
    if (projectCustomModuleSection(draft, moduleLayout.id, activePdfLanguage)) {
      addCustomModuleBlocks(blocks, draft, moduleLayout.id);
      continue;
    }

    if (moduleLayout.id === "identity") {
      addHighlightBlocks(blocks, draft, t);
      addSummaryBlock(blocks, draft, t);
    }
    if (moduleLayout.id === "projects") addRepeatableBlocks(blocks, draft, "projects", t("preview.projectExperience"), t, true, activePdfAccent);
    if (moduleLayout.id === "work") addRepeatableBlocks(blocks, draft, "work", t("preview.workHistory"), t, true, activePdfAccent);
    if (moduleLayout.id === "skills") addSkillsBlock(blocks, draft, t);
    if (moduleLayout.id === "education") addRepeatableBlocks(blocks, draft, "education", t("preview.education"), t, false, theme.light);
  }

  return blocks;
}

function paginateBlocks(blocks: PdfBlock[]) {
  const pages: PdfBlock[][] = [[]];
  let currentPage = 0;
  let y = pageSize.top + scaled(layout.headerHeight);

  for (const block of blocks) {
    if (currentPage < maxPdfPages - 1 && pages[currentPage].length > 0 && y + block.estimate > pageSize.contentBottom) {
      currentPage += 1;
      pages[currentPage] = [];
      y = pageSize.top;
    }

    pages[currentPage].push(block);
    y += block.estimate;
  }

  return pages.filter((blocksOnPage) => blocksOnPage.length > 0 || pages.length === 1);
}

function footer(page: PDFPage, draft: ResumeDraft, t: PdfTranslate, pageNumber: number) {
  drawLine(page, pageSize.marginX, pageSize.footerLineY, pageSize.width - pageSize.marginX, pageSize.footerLineY, theme.light, 0.25);
  textLine(
    page,
    `${t("preview.exportTarget")}: ${safeText(draft.exportProtocol.targetRole)}`,
    pageSize.marginX,
    pageSize.footerY,
    6.5,
    "normal",
    [100, 116, 139],
    "mono",
  );
  textLine(page, `PAGE_${String(pageNumber).padStart(2, "0")}`, pageSize.width - pageSize.marginX, pageSize.footerY, 6.5, "normal", [100, 116, 139], "mono", { align: "right" });
}

function drawImageContain(page: PDFPage, asset: PdfImageAsset, x: number, y: number, width: number, height: number) {
  const ratio = Math.min(width / asset.width, height / asset.height);
  const drawWidth = asset.width * ratio;
  const drawHeight = asset.height * ratio;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  page.drawImage(asset.image, {
    x: mm(drawX),
    y: yFromTop(drawY + drawHeight),
    width: mm(drawWidth),
    height: mm(drawHeight),
  });
}

function drawHeader(page: PDFPage, draft: ResumeDraft, cursor: PdfCursor, t: PdfTranslate) {
  const left = pageSize.marginX;
  const right = pageSize.width - pageSize.marginX;
  const contact = projectIdentityContact(draft);
  const photo = contact.photo ? activeImages.identityPhoto : undefined;
  const photoWidth = scaled(20);
  const photoHeight = scaled(26);
  const photoX = right - photoWidth;
  const photoY = cursor.y + scaled(0.4);
  const contactRight = photo ? photoX - scaled(3) : right;
  const contactWidth = 58;
  const contactX = photo ? Math.max(left + 85, contactRight - contactWidth) : right - contactWidth;

  if (isResumeFieldVisible(draft, "identity", "callsign")) textLine(page, upper(draft.identity.callsign || t("identity.callsignPlaceholder")), left, cursor.y, 6.5, "normal", activePdfAccent, "mono");
  if (isResumeFieldVisible(draft, "identity", "name")) textLine(page, upper(draft.identity.name || t("identity.namePlaceholder")), left, cursor.y + scaled(16), 22, "bold", theme.black, "sans");
  if (isResumeFieldVisible(draft, "identity", "title")) textLine(page, upper(draft.identity.title || t("identity.titlePlaceholder")), left, cursor.y + scaled(29), 8.5, "normal", theme.muted, "mono");

  if (photo) drawImageContain(page, photo, photoX, photoY, photoWidth, photoHeight);

  const contactMaxWidth = Math.max(42, contactRight - contactX);
  let contactY = cursor.y + scaled(photo ? 2.8 : 2.2);

  if (contact.email) {
    drawRightAlignedClampedText(page, upper(contact.email), contactRight, contactY, contactMaxWidth, 6.5, "normal", theme.muted, "mono");
    contactY += scaled(5);
  }

  if (contact.location) {
    drawRightAlignedClampedText(page, upper(contact.location), contactRight, contactY, contactMaxWidth, 6.5, "normal", theme.muted, "mono");
    contactY += scaled(5);
  }

  if (contact.websiteDisplay) {
    drawRightAlignedWebsite(page, contact.websiteDisplay, contact.websiteHref, contactRight, contactY, contactMaxWidth);
  }

  drawLine(page, left, cursor.y + scaled(36), right, cursor.y + scaled(36), activePdfAccent, 0.55);
  cursor.y += scaled(layout.headerHeight);
}

function drawContentPage(page: PDFPage, draft: ResumeDraft, t: PdfTranslate, blocks: PdfBlock[], pageNumber: number) {
  const cursor: PdfCursor = { y: pageSize.top };

  if (pageNumber === 1) {
    drawHeader(page, draft, cursor, t);
  }

  for (const block of blocks) {
    block.draw(page, cursor);
  }
}

const fontRetryCount = 2;

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchFont(path: string) {
  let lastError: unknown;

  for (const candidate of fontCandidates(path)) {
    for (let attempt = 0; attempt <= fontRetryCount; attempt += 1) {
      try {
        const cacheBuster = attempt === 0 ? "" : `${candidate.includes("?") ? "&" : "?"}retry=${attempt}&t=${Date.now()}`;
        const response = await fetch(`${candidate}${cacheBuster}`, { cache: attempt === 0 ? "default" : "reload" });
        if (!response.ok) throw new Error(`Font request failed: ${candidate} (${response.status})`);
        return response.arrayBuffer();
      } catch (error) {
        lastError = error;
        if (attempt < fontRetryCount) await delay(80 * (attempt + 1));
      }
    }

    console.warn(`[kill-the-resume] PDF font candidate failed: ${candidate}`, lastError);
  }

  throw lastError instanceof Error ? lastError : new Error(`Font request failed: ${path}`);
}

async function fetchFontWithFallback(path: string, fallback?: ArrayBuffer) {
  try {
    return await fetchFont(path);
  } catch (error) {
    if (!fallback) throw error;
    console.warn(`[kill-the-resume] PDF font fallback: ${path}`, error);
    return fallback;
  }
}

async function embedCustomOrStandard(pdfDoc: PDFDocument, bytes: ArrayBuffer | undefined, standardFont: StandardFonts) {
  if (bytes) {
    try {
      return await pdfDoc.embedFont(bytes, { subset: true });
    } catch (error) {
      console.warn("[kill-the-resume] PDF custom font embed fallback", error);
    }
  }

  return pdfDoc.embedFont(standardFont);
}

async function loadFonts(pdfDoc: PDFDocument): Promise<PdfFontSet> {
  pdfDoc.registerFontkit(fontkit);
  const [sansNormalResult, monoNormalResult, cjk] = await Promise.all([
    fetchFontWithFallback(pdfFonts.sans.normal).catch((error) => {
      console.warn(`[kill-the-resume] PDF font fallback: ${pdfFonts.sans.normal}`, error);
      return undefined;
    }),
    fetchFontWithFallback(pdfFonts.mono.normal).catch((error) => {
      console.warn(`[kill-the-resume] PDF font fallback: ${pdfFonts.mono.normal}`, error);
      return undefined;
    }),
    fetchFont(pdfFonts.cjk.normal).catch((error) => {
      throw new Error(`PDF CJK font unavailable after fallback routes. Check /fonts, /api/fonts, or backend /assets/fonts. ${error instanceof Error ? error.message : String(error)}`);
    }),
  ]);
  const [sansBoldResult, monoBoldResult] = await Promise.all([
    fetchFontWithFallback(pdfFonts.sans.bold, sansNormalResult),
    fetchFontWithFallback(pdfFonts.mono.bold, monoNormalResult),
  ]);

  const [embeddedSansNormal, embeddedSansBold, embeddedMonoNormal, embeddedMonoBold, embeddedCjkNormal, embeddedCjkBold] = await Promise.all([
    embedCustomOrStandard(pdfDoc, sansNormalResult, StandardFonts.Helvetica),
    embedCustomOrStandard(pdfDoc, sansBoldResult, StandardFonts.HelveticaBold),
    embedCustomOrStandard(pdfDoc, monoNormalResult, StandardFonts.Courier),
    embedCustomOrStandard(pdfDoc, monoBoldResult, StandardFonts.CourierBold),
    pdfDoc.embedFont(cjk, { subset: true }),
    pdfDoc.embedFont(cjk, { subset: true }),
  ]);

  return {
    sans: { normal: embeddedSansNormal, bold: embeddedSansBold },
    mono: { normal: embeddedMonoNormal, bold: embeddedMonoBold },
    cjk: { normal: embeddedCjkNormal, bold: embeddedCjkBold },
  };
}

function downloadPdf(filename: string, bytes: Uint8Array) {
  const blob = new Blob([bytes.slice().buffer], { type: "application/pdf" });
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

function dataUrlToBytes(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpe?g));base64,(.+)$/i);
  if (!match) return null;

  const binary = window.atob(match[2]);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return { mime: match[1].toLowerCase(), bytes };
}

async function loadPdfImages(pdfDoc: PDFDocument, draft: ResumeDraft) {
  const photoPayload = isResumeFieldVisible(draft, "identity", "photo") ? draft.identity.photo.trim() : "";
  if (!photoPayload) return {};

  const parsed = dataUrlToBytes(photoPayload);
  if (!parsed) {
    console.warn("[kill-the-resume] PDF identity photo skipped: unsupported image data URL");
    return {};
  }

  try {
    const image = parsed.mime.includes("png") ? await pdfDoc.embedPng(parsed.bytes) : await pdfDoc.embedJpg(parsed.bytes);
    return { identityPhoto: { image, width: image.width, height: image.height } };
  } catch (error) {
    console.warn("[kill-the-resume] PDF identity photo embed skipped", error);
    return {};
  }
}

export async function exportResumePdf(draft: ResumeDraft, filename: string, t: PdfTranslate, options: PdfExportOptions = {}) {
  const pdfDoc = await PDFDocument.create();
  try {
    activePdfLanguage = options.language ?? "zh-CN";
    activePdfAccent = hexToRgbTuple(draft.theme?.accentColor ?? "");
    activeFonts = await loadFonts(pdfDoc);
    activeImages = await loadPdfImages(pdfDoc, draft);
    const layoutPlan = createResumePaperLayoutPlan(draft, t, { language: activePdfLanguage });
    activeDensityScale = layoutPlan.densityScale;
    const blocks = buildBlocks(draft, t);
    const pages = paginateBlocks(blocks).slice(0, maxPdfPages);
    const pageCount = Math.max(1, pages.length);

    for (let index = 0; index < pageCount; index += 1) {
      const targetPage = pdfDoc.addPage([mm(pageSize.width), mm(pageSize.height)]);
      drawContentPage(targetPage, draft, t, pages[index] ?? [], index + 1);
    }

    for (let index = 0; index < pageCount; index += 1) {
      const targetPage = pdfDoc.getPage(index);
      footer(targetPage, draft, t, index + 1);
    }

    const bytes = await pdfDoc.save({ useObjectStreams: false });
    downloadPdf(filename, bytes);
  } finally {
    activeDensityScale = 1;
    activePdfLanguage = "zh-CN";
    activePdfAccent = theme.black;
    activeFonts = null;
    activeImages = {};
  }
}
