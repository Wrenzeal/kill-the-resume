export type TacticalStatus = "stable" | "warning" | "critical";

export type DateRange = {
  start: string;
  end: string;
  isPresent: boolean;
};

export type ResumeIdentity = {
  name: string;
  title: string;
  callsign: string;
  email: string;
  location: string;
  website: string;
  summary: string;
  photo: string;
};

export type ProjectExperience = {
  id: string;
  codename: string;
  role: string;
  stack: string;
  period: DateRange;
  signal: string;
  impact: string;
  status: TacticalStatus;
};

export type WorkExperience = {
  id: string;
  company: string;
  role: string;
  period: DateRange;
  location: string;
  summary: string;
  bullets: string;
};

export type SkillDisplayMode = "markdown" | "tags";
export type SkillColumnMode = "one" | "two";
export type BuiltInSkillId = "languages" | "frontend" | "backend" | "tools";

export type SkillCategory = {
  id: string;
  label: string;
  content: string;
  visible: boolean;
};

export type SkillMatrix = {
  languages: string;
  frontend: string;
  backend: string;
  tools: string;
  labels: Record<BuiltInSkillId, string>;
  customCategories: SkillCategory[];
  displayMode: SkillDisplayMode;
  columnMode: SkillColumnMode;
};

export type EducationExperience = {
  id: string;
  school: string;
  degree: string;
  period: DateRange;
  detail: string;
};

export type ExportProtocol = {
  targetRole: string;
  pageSize: string;
  densityMode: string;
  notes: string;
};

export type ResumeTheme = {
  presetId: string;
  accentColor: string;
};

export type EditorModule = "identity" | "projects" | "work" | "skills" | "education" | "export";
export type ModuleId = EditorModule | string;

export type CustomFieldType = "text" | "textarea" | "date";

export type CustomModuleField = {
  id: string;
  label: string;
  type: CustomFieldType;
  value: string | DateRange;
  visible: boolean;
};

export type CustomModule = {
  id: string;
  title: string;
  fields: CustomModuleField[];
};

export type ModuleLayout = {
  id: ModuleId;
  visible: boolean;
};

export type FieldLayout = {
  id: string;
  visible: boolean;
};

export type ResumeLayout = {
  modules: ModuleLayout[];
  fields: Record<EditorModule, FieldLayout[]>;
};

export type ResumeDraft = {
  theme: ResumeTheme;
  identity: ResumeIdentity;
  projects: ProjectExperience[];
  work: WorkExperience[];
  skills: SkillMatrix;
  education: EducationExperience[];
  customModules: CustomModule[];
  exportProtocol: ExportProtocol;
  layout: ResumeLayout;
};
