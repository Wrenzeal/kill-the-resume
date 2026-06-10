import type { TranslationKey } from "@/lib/i18n";
import type { EditorModule, FieldLayout, ModuleId, ModuleLayout } from "@/types/resume";

export type FieldDefinition = {
  id: string;
  labelKey: TranslationKey;
  placeholderKey: TranslationKey;
  minRows?: number;
};

export type ModuleDefinition = {
  id: EditorModule;
  code: string;
  labelKey: TranslationKey;
  blockTypeKey: TranslationKey;
  titleKey: TranslationKey;
  addLabelKey?: TranslationKey;
  repeatable: boolean;
};

export const moduleDefinitions: ModuleDefinition[] = [
  {
    id: "identity",
    code: "00",
    labelKey: "nav.coreIdentity",
    blockTypeKey: "identity.blockType",
    titleKey: "identity.title",
    repeatable: false,
  },
  {
    id: "projects",
    code: "01",
    labelKey: "nav.projectExperience",
    blockTypeKey: "project.blockType",
    titleKey: "project.title",
    addLabelKey: "project.add",
    repeatable: true,
  },
  {
    id: "work",
    code: "02",
    labelKey: "nav.workHistory",
    blockTypeKey: "work.blockType",
    titleKey: "work.title",
    addLabelKey: "work.add",
    repeatable: true,
  },
  {
    id: "skills",
    code: "03",
    labelKey: "nav.skillsMatrix",
    blockTypeKey: "skills.blockType",
    titleKey: "skills.title",
    repeatable: false,
  },
  {
    id: "education",
    code: "04",
    labelKey: "nav.education",
    blockTypeKey: "education.blockType",
    titleKey: "education.title",
    addLabelKey: "education.add",
    repeatable: true,
  },
  {
    id: "export",
    code: "05",
    labelKey: "nav.exportProtocol",
    blockTypeKey: "export.blockType",
    titleKey: "export.title",
    repeatable: false,
  },
];

export const fieldDefinitions: Record<EditorModule, FieldDefinition[]> = {
  identity: [
    { id: "name", labelKey: "identity.name", placeholderKey: "identity.namePlaceholder" },
    { id: "title", labelKey: "identity.titleField", placeholderKey: "identity.titlePlaceholder" },
    { id: "photo", labelKey: "identity.photo", placeholderKey: "identity.photoPlaceholder" },
    { id: "callsign", labelKey: "identity.callsign", placeholderKey: "identity.callsignPlaceholder" },
    { id: "email", labelKey: "identity.email", placeholderKey: "identity.emailPlaceholder" },
    { id: "location", labelKey: "identity.location", placeholderKey: "identity.locationPlaceholder" },
    { id: "website", labelKey: "identity.website", placeholderKey: "identity.websitePlaceholder" },
    { id: "summary", labelKey: "identity.summary", placeholderKey: "identity.summaryPlaceholder", minRows: 4 },
  ],
  projects: [
    { id: "codename", labelKey: "project.codename", placeholderKey: "project.codenamePlaceholder" },
    { id: "role", labelKey: "project.role", placeholderKey: "project.rolePlaceholder" },
    { id: "stack", labelKey: "project.stack", placeholderKey: "project.stackPlaceholder" },
    { id: "period", labelKey: "project.period", placeholderKey: "project.periodPlaceholder" },
    { id: "signal", labelKey: "project.signal", placeholderKey: "project.signalPlaceholder", minRows: 3 },
    { id: "impact", labelKey: "project.impact", placeholderKey: "project.impactPlaceholder", minRows: 3 },
  ],
  work: [
    { id: "company", labelKey: "work.company", placeholderKey: "work.companyPlaceholder" },
    { id: "role", labelKey: "work.role", placeholderKey: "work.rolePlaceholder" },
    { id: "period", labelKey: "work.period", placeholderKey: "work.periodPlaceholder" },
    { id: "location", labelKey: "work.location", placeholderKey: "work.locationPlaceholder" },
    { id: "summary", labelKey: "work.summary", placeholderKey: "work.summaryPlaceholder", minRows: 3 },
    { id: "bullets", labelKey: "work.bullets", placeholderKey: "work.bulletsPlaceholder", minRows: 4 },
  ],
  skills: [
    { id: "languages", labelKey: "skills.languages", placeholderKey: "skills.languagesPlaceholder", minRows: 3 },
    { id: "frontend", labelKey: "skills.frontend", placeholderKey: "skills.frontendPlaceholder", minRows: 3 },
    { id: "backend", labelKey: "skills.backend", placeholderKey: "skills.backendPlaceholder", minRows: 3 },
    { id: "tools", labelKey: "skills.tools", placeholderKey: "skills.toolsPlaceholder", minRows: 3 },
  ],
  education: [
    { id: "school", labelKey: "education.school", placeholderKey: "education.schoolPlaceholder" },
    { id: "degree", labelKey: "education.degree", placeholderKey: "education.degreePlaceholder" },
    { id: "period", labelKey: "education.period", placeholderKey: "education.periodPlaceholder" },
    { id: "detail", labelKey: "education.detail", placeholderKey: "education.detailPlaceholder", minRows: 4 },
  ],
  export: [
    { id: "targetRole", labelKey: "export.targetRole", placeholderKey: "export.targetRolePlaceholder" },
    { id: "pageSize", labelKey: "export.pageSize", placeholderKey: "export.pageSizePlaceholder" },
    { id: "densityMode", labelKey: "export.densityMode", placeholderKey: "export.densityModePlaceholder" },
    { id: "notes", labelKey: "export.notes", placeholderKey: "export.notesPlaceholder", minRows: 4 },
  ],
};

export const defaultModuleLayout: ModuleLayout[] = moduleDefinitions.map((module) => ({
  id: module.id,
  visible: module.id !== "export",
}));

export function ensureExportLast(modules: ModuleLayout[]) {
  const exportLayout = modules.find((module) => module.id === "export") ?? defaultModuleLayout.find((module) => module.id === "export");
  const withoutExport = modules.filter((module) => module.id !== "export");

  return exportLayout ? [...withoutExport, exportLayout] : withoutExport;
}

export const defaultFieldLayout: Record<EditorModule, FieldLayout[]> = Object.fromEntries(
  moduleDefinitions.map((module) => [
    module.id,
    fieldDefinitions[module.id].map((field) => ({ id: field.id, visible: true })),
  ]),
) as Record<EditorModule, FieldLayout[]>;

export function getModuleDefinition(module: EditorModule) {
  return moduleDefinitions.find((definition) => definition.id === module) ?? moduleDefinitions[0];
}

export function isEditorModule(module: ModuleId): module is EditorModule {
  return moduleDefinitions.some((definition) => definition.id === module);
}

export function isCustomModuleId(module: ModuleId) {
  return !isEditorModule(module);
}

export function getOrderedFields(module: EditorModule, layout: FieldLayout[]) {
  const definitions = fieldDefinitions[module];
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const ordered = layout.map((field) => {
    const definition = byId.get(field.id);

    return definition ? { ...definition, visible: field.visible } : null;
  });

  const existingIds = new Set(layout.map((field) => field.id));
  const missing = definitions
    .filter((definition) => !existingIds.has(definition.id))
    .map((definition) => ({ ...definition, visible: true }));

  return [...ordered.filter((field): field is FieldDefinition & { visible: boolean } => Boolean(field)), ...missing];
}
