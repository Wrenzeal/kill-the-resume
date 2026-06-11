export type MarkdownBlockType = "heading" | "paragraph" | "bullet" | "quote" | "code" | "blank";

export type MarkdownBlock = {
  type: MarkdownBlockType;
  text: string;
  level?: number;
  ordered?: boolean;
  order?: number;
};

export type MarkdownAction = "heading" | "bold" | "italic" | "list" | "quote" | "code";

const headingPattern = /^\s{0,3}(#{1,6})\s+(.+)$/;
const unorderedListPattern = /^\s*[-*+]\s+(?:\[[ xX]\]\s+)?(.+)$/;
const orderedListPattern = /^\s*(\d+)[.)]\s+(.+)$/;
const quotePattern = /^\s*>\s?(.+)$/;
const fencePattern = /^\s*```/;

function normalizeInput(value: string | undefined | null) {
  return String(value ?? "").replace(/\r\n?/g, "\n");
}

export function stripInlineMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[\s([{])__([^_\n]+)__($|[\s)\]},.!?;:])/g, "$1$2$3")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/(^|[\s([{])_([^_\n]+)_($|[\s)\]},.!?;:])/g, "$1$2$3")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, "$1")
    .trim();
}

export function hasMarkdownSyntax(value: string | undefined | null) {
  const text = normalizeInput(value);
  return /(^|\n)\s{0,3}#{1,6}\s+/.test(text)
    || /(^|\n)\s*[-*+]\s+/.test(text)
    || /(^|\n)\s*\d+[.)]\s+/.test(text)
    || /(^|\n)\s*>\s?/.test(text)
    || /(^|\n)\s*```/.test(text)
    || /\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^)]*\)/.test(text);
}

export function parseMarkdownBlocks(value: string | undefined | null): MarkdownBlock[] {
  const lines = normalizeInput(value).split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let code: string[] = [];
  let inFence = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: stripInlineMarkdown(paragraph.join("\n")) });
    paragraph = [];
  };

  const flushCode = () => {
    blocks.push({ type: "code", text: code.join("\n").trimEnd() });
    code = [];
  };

  for (const line of lines) {
    if (fencePattern.test(line)) {
      if (inFence) {
        flushCode();
        inFence = false;
      } else {
        flushParagraph();
        inFence = true;
        code = [];
      }
      continue;
    }

    if (inFence) {
      code.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      if (blocks.at(-1)?.type !== "blank") blocks.push({ type: "blank", text: "" });
      continue;
    }

    const heading = line.match(headingPattern);
    if (heading) {
      flushParagraph();
      blocks.push({ type: "heading", level: heading[1].length, text: stripInlineMarkdown(heading[2]) });
      continue;
    }

    const unordered = line.match(unorderedListPattern);
    const ordered = line.match(orderedListPattern);
    if (unordered || ordered) {
      flushParagraph();
      blocks.push(
        ordered
          ? { type: "bullet", ordered: true, order: Number(ordered[1]), text: stripInlineMarkdown(ordered[2] ?? "") }
          : { type: "bullet", ordered: false, text: stripInlineMarkdown(unordered?.[1] ?? "") },
      );
      continue;
    }

    const quote = line.match(quotePattern);
    if (quote) {
      flushParagraph();
      blocks.push({ type: "quote", text: stripInlineMarkdown(quote[1]) });
      continue;
    }

    paragraph.push(line.trim());
  }

  if (inFence) flushCode();
  flushParagraph();

  return blocks.filter((block, index, all) => block.type !== "blank" || (index > 0 && index < all.length - 1));
}

export function markdownToPlainText(value: string | undefined | null, options: { bulletPrefix?: string; preserveBlankLines?: boolean } = {}) {
  const bulletPrefix = options.bulletPrefix ?? "";
  const lines = parseMarkdownBlocks(value).flatMap((block) => {
    if (block.type === "blank") return options.preserveBlankLines ? [""] : [];
    if (block.type === "bullet") {
      const prefix = block.ordered ? `${block.order ?? 1}. ` : bulletPrefix;
      return [`${prefix}${block.text}`.trimEnd()];
    }
    return block.text.split("\n").map((line) => line.trim()).filter(Boolean);
  });

  return lines.join("\n").trim();
}

export function markdownToBulletItems(value: string | undefined | null) {
  return normalizeInput(value)
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";

      const unordered = trimmed.match(unorderedListPattern);
      const ordered = trimmed.match(orderedListPattern);
      if (ordered) return `${ordered[1]}. ${stripInlineMarkdown(ordered[2] ?? "")}`;
      return stripInlineMarkdown(unordered?.[1] ?? trimmed);
    })
    .filter(Boolean);
}

function lineBounds(value: string, start: number, end: number) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const nextBreak = value.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  return { lineStart, lineEnd };
}

function prefixSelectedLines(value: string, start: number, end: number, prefix: string) {
  const { lineStart, lineEnd } = lineBounds(value, start, end);
  const selectedLines = value.slice(lineStart, lineEnd).split("\n");
  const updatedLines = selectedLines.map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`));
  const updated = `${value.slice(0, lineStart)}${updatedLines.join("\n")}${value.slice(lineEnd)}`;
  return {
    value: updated,
    selectionStart: start + prefix.length,
    selectionEnd: end + prefix.length * selectedLines.length,
  };
}

function wrapSelection(value: string, start: number, end: number, left: string, right = left, fallback: string) {
  const selected = value.slice(start, end) || fallback;
  const inserted = `${left}${selected}${right}`;
  return {
    value: `${value.slice(0, start)}${inserted}${value.slice(end)}`,
    selectionStart: start + left.length,
    selectionEnd: start + left.length + selected.length,
  };
}

export function applyMarkdownEdit(value: string, start: number, end: number, action: MarkdownAction) {
  if (action === "heading") return prefixSelectedLines(value, start, end, "## ");
  if (action === "list") return prefixSelectedLines(value, start, end, "- ");
  if (action === "quote") return prefixSelectedLines(value, start, end, "> ");
  if (action === "bold") return wrapSelection(value, start, end, "**", "**", "重点内容");
  if (action === "italic") return wrapSelection(value, start, end, "*", "*", "补充说明");

  const selected = value.slice(start, end) || "code";
  const hasLineBreak = selected.includes("\n");
  const left = hasLineBreak ? "```\n" : "`";
  const right = hasLineBreak ? "\n```" : "`";
  return wrapSelection(value, start, end, left, right, selected);
}
