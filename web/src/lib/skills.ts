import type { BuiltInSkillId, SkillCategory, SkillColumnMode, SkillDisplayMode, SkillMatrix } from "@/types/resume";

export const skillContentFieldIds = ["languages", "frontend", "backend", "tools"] as const;

export type SkillContentFieldId = (typeof skillContentFieldIds)[number];

export const defaultSkillDisplayMode: SkillDisplayMode = "markdown";
export const defaultSkillColumnMode: SkillColumnMode = "two";

export const defaultSkillLabels: Record<BuiltInSkillId, string> = {
  languages: "Production",
  frontend: "Frontend Systems",
  backend: "Backend/Data",
  tools: "Engineering Signals",
};

export const defaultSkillMatrix: SkillMatrix = {
  languages: "TypeScript / Go / SQL / JavaScript",
  frontend: "React / Next.js / Tailwind CSS / Zustand / Design Systems",
  backend: "Gin / PostgreSQL / GORM / JWT Auth / REST APIs",
  tools: "Vector PDF export / Browser extension import / PM2 deploy / Regression tests / API hardening",
  labels: { ...defaultSkillLabels },
  customCategories: [],
  displayMode: defaultSkillDisplayMode,
  columnMode: defaultSkillColumnMode,
};

const skillContentIdSet = new Set<string>(skillContentFieldIds);

export type SkillCategoryItem = {
  id: string;
  label: string;
  content: string;
  visible: boolean;
  builtInId?: SkillContentFieldId;
  custom: boolean;
};

type SkillNormalizeOptions = {
  fillEmptyLabels?: boolean;
};

export function isSkillContentFieldId(id: string): id is SkillContentFieldId {
  return skillContentIdSet.has(id);
}

export function isSkillContentField<T extends { id: string }>(field: T): field is T & { id: SkillContentFieldId } {
  return isSkillContentFieldId(field.id);
}

export function isVisibleSkillContentField<T extends { id: string; visible: boolean }>(field: T): field is T & { id: SkillContentFieldId } {
  return field.visible && isSkillContentField(field);
}

export function normalizeSkillDisplayMode(value: unknown): SkillDisplayMode {
  return value === "tags" || value === "markdown" ? value : defaultSkillDisplayMode;
}

export function normalizeSkillColumnMode(value: unknown): SkillColumnMode {
  return value === "one" || value === "two" ? value : defaultSkillColumnMode;
}

function normalizeSkillLabel(value: unknown, fallback: string, options: SkillNormalizeOptions = {}) {
  if (value === undefined || value === null) return fallback;

  const label = String(value);
  return options.fillEmptyLabels && !label.trim() ? fallback : label;
}

function normalizeSkillLabels(labels: unknown, options: SkillNormalizeOptions = {}): Record<BuiltInSkillId, string> {
  const input = labels && typeof labels === "object" ? labels as Partial<Record<BuiltInSkillId, unknown>> : {};

  return {
    languages: normalizeSkillLabel(input.languages, defaultSkillLabels.languages, options),
    frontend: normalizeSkillLabel(input.frontend, defaultSkillLabels.frontend, options),
    backend: normalizeSkillLabel(input.backend, defaultSkillLabels.backend, options),
    tools: normalizeSkillLabel(input.tools, defaultSkillLabels.tools, options),
  };
}

export function createSkillCategory(index: number, label = `自定义技能 ${index}`): SkillCategory {
  return {
    id: `skill-custom-${Date.now()}-${index}`,
    label,
    content: "",
    visible: true,
  };
}

function normalizeSkillCategory(category: unknown, index: number, usedIds: Set<string>, options: SkillNormalizeOptions = {}): SkillCategory | null {
  if (!category || typeof category !== "object") return null;
  const input = category as Partial<SkillCategory>;
  const rawId = String(input.id ?? "").trim();
  let id = rawId || `skill-custom-legacy-${index}`;
  while (usedIds.has(id)) id = `${id}-${index}`;
  usedIds.add(id);

  return {
    id,
    label: normalizeSkillLabel(input.label, `自定义技能 ${index + 1}`, options),
    content: String(input.content ?? ""),
    visible: input.visible !== false,
  };
}

function normalizeSkillCategories(categories: unknown, options: SkillNormalizeOptions = {}): SkillCategory[] {
  if (!Array.isArray(categories)) return [];
  const usedIds = new Set<string>();

  return categories
    .map((category, index) => normalizeSkillCategory(category, index, usedIds, options))
    .filter((category): category is SkillCategory => Boolean(category));
}

export function normalizeSkillMatrix(skills: Partial<SkillMatrix> | undefined | null, options: SkillNormalizeOptions = {}): SkillMatrix {
  return {
    languages: String(skills?.languages ?? defaultSkillMatrix.languages),
    frontend: String(skills?.frontend ?? defaultSkillMatrix.frontend),
    backend: String(skills?.backend ?? defaultSkillMatrix.backend),
    tools: String(skills?.tools ?? defaultSkillMatrix.tools),
    labels: normalizeSkillLabels(skills?.labels, options),
    customCategories: normalizeSkillCategories(skills?.customCategories, options),
    displayMode: normalizeSkillDisplayMode(skills?.displayMode),
    columnMode: normalizeSkillColumnMode(skills?.columnMode),
  };
}

export function normalizeSkillMatrixForPersistence(skills: Partial<SkillMatrix> | undefined | null): SkillMatrix {
  return normalizeSkillMatrix(skills, { fillEmptyLabels: true });
}

export function builtInSkillCategory(skills: SkillMatrix, id: SkillContentFieldId, visible = true): SkillCategoryItem {
  return {
    id,
    builtInId: id,
    custom: false,
    label: String(skills.labels?.[id] ?? defaultSkillLabels[id]),
    content: String(skills[id] ?? ""),
    visible,
  };
}

export function customSkillCategory(category: SkillCategory): SkillCategoryItem {
  return {
    id: category.id,
    custom: true,
    label: category.label,
    content: category.content,
    visible: category.visible,
  };
}

export function visibleCustomSkillCategories(skills: SkillMatrix) {
  return skills.customCategories.filter((category) => category.visible).map(customSkillCategory);
}

export function skillCategoriesFromFields<T extends { id: string; visible: boolean }>(skills: SkillMatrix, fields: T[]) {
  return [
    ...fields.filter(isVisibleSkillContentField).map((field) => builtInSkillCategory(skills, field.id, field.visible)),
    ...visibleCustomSkillCategories(skills),
  ];
}

export function splitSkillTags(value: string | undefined | null) {
  const seen = new Set<string>();
  const tags: string[] = [];

  String(value ?? "")
    .split(/\r?\n|[,，、;；]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((tag) => {
      const key = tag.toLocaleLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      tags.push(tag);
    });

  return tags;
}

export function joinSkillTags(tags: string[]) {
  return tags.map((tag) => tag.trim()).filter(Boolean).join("\n");
}
