import { coerceDateRange } from "@/lib/date-range";
import { normalizeCustomModules } from "@/lib/custom-modules";
import { normalizeResumeTheme } from "@/lib/resume-theme";
import { normalizeSkillMatrix, normalizeSkillMatrixForPersistence } from "@/lib/skills";
import { defaultFieldLayout, defaultModuleLayout, ensureExportLast } from "@/lib/resume-layout";
import type { EditorModule, FieldLayout, ResumeDraft } from "@/types/resume";

function normalizeFieldLayouts(inputFieldLayout: Partial<Record<EditorModule, FieldLayout[]>>) {
  return Object.fromEntries(
    Object.entries(defaultFieldLayout).map(([module, defaultFields]) => {
      const moduleId = module as EditorModule;
      const inputFields = Array.isArray(inputFieldLayout[moduleId]) ? inputFieldLayout[moduleId] : [];
      const defaultIds = new Set(defaultFields.map((field) => field.id));
      const seenIds = new Set<string>();
      const normalizedInputFields = inputFields
        .filter((field): field is FieldLayout => Boolean(field?.id) && defaultIds.has(field.id) && !seenIds.has(field.id))
        .map((field) => {
          seenIds.add(field.id);
          return { id: field.id, visible: field.visible !== false };
        });
      const missingFields = defaultFields.filter((field) => !seenIds.has(field.id));

      return [moduleId, [...normalizedInputFields, ...missingFields]];
    }),
  ) as Record<EditorModule, FieldLayout[]>;
}

function normalizeResumeDraftBase(draft: ResumeDraft, { forPersistence = false }: { forPersistence?: boolean } = {}): ResumeDraft {
  const customModules = normalizeCustomModules(draft.customModules);
  const customModuleIds = new Set(customModules.map((module) => module.id));
  const inputModules = Array.isArray(draft.layout?.modules) ? draft.layout.modules : defaultModuleLayout;
  const inputFieldLayout = draft.layout?.fields ?? defaultFieldLayout;
  const normalizedModules = ensureExportLast([
    ...inputModules.filter((module) => defaultModuleLayout.some((defaultModule) => defaultModule.id === module.id) || customModuleIds.has(module.id)),
    ...defaultModuleLayout.filter((defaultModule) => !inputModules.some((module) => module.id === defaultModule.id)),
    ...customModules
      .filter((module) => !inputModules.some((layoutModule) => layoutModule.id === module.id))
      .map((module) => ({ id: module.id, visible: true })),
  ]);

  return {
    ...draft,
    theme: normalizeResumeTheme(draft.theme),
    identity: {
      ...draft.identity,
      photo: String(draft.identity?.photo ?? ""),
    },
    customModules,
    skills: forPersistence ? normalizeSkillMatrixForPersistence(draft.skills) : normalizeSkillMatrix(draft.skills),
    projects: (draft.projects ?? []).map((project) => ({
      ...project,
      period: coerceDateRange(project.period),
    })),
    work: (draft.work ?? []).map((item) => ({
      ...item,
      period: coerceDateRange(item.period),
    })),
    education: (draft.education ?? []).map((item) => ({
      ...item,
      period: coerceDateRange(item.period),
    })),
    layout: {
      ...draft.layout,
      modules: normalizedModules,
      fields: normalizeFieldLayouts(inputFieldLayout),
    },
  };
}

export function normalizeResumeDraft(draft: ResumeDraft): ResumeDraft {
  return normalizeResumeDraftBase(draft);
}

export function normalizeResumeDraftForPersistence(draft: ResumeDraft): ResumeDraft {
  return normalizeResumeDraftBase(draft, { forPersistence: true });
}
