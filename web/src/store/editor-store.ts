"use client";

import { create } from "zustand";
import { changeCustomFieldType, createCustomField, createCustomModule } from "@/lib/custom-modules";
import { createEducationExperience, createProjectExperience, createWorkExperience, initialResumeDraft } from "@/lib/resume-defaults";
import { ensureExportLast } from "@/lib/resume-layout";
import { normalizeResumeDraft } from "@/lib/resume-normalize";
import { createSkillCategory } from "@/lib/skills";
import type {
  BuiltInSkillId,
  CustomFieldType,
  CustomModuleField,
  EducationExperience,
  EditorModule,
  ExportProtocol,
  FieldLayout,
  ModuleId,
  ProjectExperience,
  ResumeDraft,
  ResumeIdentity,
  ResumeTheme,
  SkillCategory,
  SkillMatrix,
  WorkExperience,
} from "@/types/resume";

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);

  return next;
}

type EditorStore = {
  activeModule: ModuleId;
  previewVisible: boolean;
  draft: ResumeDraft;
  lastUpdatedAt: number;
  setActiveModule: (module: ModuleId) => void;
  setPreviewVisible: (visible: boolean) => void;
  togglePreviewVisibility: () => void;
  moveModule: (fromIndex: number, toIndex: number) => void;
  toggleModuleVisibility: (module: ModuleId) => void;
  moveField: (module: EditorModule, fromIndex: number, toIndex: number) => void;
  toggleFieldVisibility: (module: EditorModule, fieldId: string) => void;
  addCustomModule: () => void;
  deleteCustomModule: (moduleId: string) => void;
  updateCustomModuleTitle: (moduleId: string, title: string) => void;
  addCustomField: (moduleId: string, type?: CustomFieldType) => void;
  deleteCustomField: (moduleId: string, fieldId: string) => void;
  moveCustomField: (moduleId: string, fromIndex: number, toIndex: number) => void;
  toggleCustomFieldVisibility: (moduleId: string, fieldId: string) => void;
  updateCustomField: (moduleId: string, fieldId: string, patch: Partial<CustomModuleField>) => void;
  addProject: () => void;
  addWork: () => void;
  addEducation: () => void;
  updateIdentity: <K extends keyof ResumeIdentity>(field: K, value: ResumeIdentity[K]) => void;
  updateProject: <K extends keyof ProjectExperience>(id: string, field: K, value: ProjectExperience[K]) => void;
  updateWork: <K extends keyof WorkExperience>(id: string, field: K, value: WorkExperience[K]) => void;
  updateSkills: <K extends keyof SkillMatrix>(field: K, value: SkillMatrix[K]) => void;
  updateSkillLabel: (id: BuiltInSkillId, label: string) => void;
  addSkillCategory: (label?: string) => void;
  updateSkillCategory: (id: string, patch: Partial<SkillCategory>) => void;
  deleteSkillCategory: (id: string) => void;
  toggleSkillCategoryVisibility: (id: string) => void;
  updateEducation: <K extends keyof EducationExperience>(id: string, field: K, value: EducationExperience[K]) => void;
  updateExportProtocol: <K extends keyof ExportProtocol>(field: K, value: ExportProtocol[K]) => void;
  updateTheme: (theme: ResumeTheme) => void;
  replaceDraft: (draft: ResumeDraft) => void;
};

export const useEditorStore = create<EditorStore>((set) => ({
  activeModule: "identity",
  previewVisible: true,
  draft: initialResumeDraft,
  lastUpdatedAt: Date.now(),
  setActiveModule: (module) => set({ activeModule: module }),
  setPreviewVisible: (previewVisible) => set({ previewVisible }),
  togglePreviewVisibility: () => set((state) => ({ previewVisible: !state.previewVisible })),
  moveModule: (fromIndex, toIndex) =>
    set((state) => ({
      draft: {
        ...state.draft,
        layout: {
          ...state.draft.layout,
          modules: ensureExportLast(moveItem(state.draft.layout.modules, fromIndex, toIndex)),
        },
      },
      lastUpdatedAt: Date.now(),
    })),
  toggleModuleVisibility: (module) =>
    set((state) => ({
      draft: {
        ...state.draft,
        layout: {
          ...state.draft.layout,
          modules: state.draft.layout.modules.map((item) =>
            item.id === module ? { ...item, visible: !item.visible } : item,
          ),
        },
      },
      lastUpdatedAt: Date.now(),
    })),
  moveField: (module, fromIndex, toIndex) =>
    set((state) => ({
      draft: {
        ...state.draft,
        layout: {
          ...state.draft.layout,
          fields: {
            ...state.draft.layout.fields,
            [module]: moveItem(state.draft.layout.fields[module], fromIndex, toIndex) as FieldLayout[],
          },
        },
      },
      lastUpdatedAt: Date.now(),
    })),
  toggleFieldVisibility: (module, fieldId) =>
    set((state) => ({
      draft: {
        ...state.draft,
        layout: {
          ...state.draft.layout,
          fields: {
            ...state.draft.layout.fields,
            [module]: state.draft.layout.fields[module].map((field) =>
              field.id === fieldId ? { ...field, visible: !field.visible } : field,
            ),
          },
        },
      },
      lastUpdatedAt: Date.now(),
    })),
  addCustomModule: () =>
    set((state) => {
      const customModule = createCustomModule(state.draft.customModules.length + 1);
      const exportIndex = state.draft.layout.modules.findIndex((module) => module.id === "export");
      const modules =
        exportIndex >= 0
          ? [
              ...state.draft.layout.modules.slice(0, exportIndex),
              { id: customModule.id, visible: true },
              ...state.draft.layout.modules.slice(exportIndex),
            ]
          : [...state.draft.layout.modules, { id: customModule.id, visible: true }];

      return {
        draft: {
          ...state.draft,
          customModules: [...state.draft.customModules, customModule],
          layout: {
            ...state.draft.layout,
            modules: ensureExportLast(modules),
          },
        },
        activeModule: customModule.id,
        lastUpdatedAt: Date.now(),
      };
    }),
  deleteCustomModule: (moduleId) =>
    set((state) => ({
      draft: {
        ...state.draft,
        customModules: state.draft.customModules.filter((module) => module.id !== moduleId),
        layout: {
          ...state.draft.layout,
          modules: state.draft.layout.modules.filter((module) => module.id !== moduleId),
        },
      },
      activeModule: state.activeModule === moduleId ? "identity" : state.activeModule,
      lastUpdatedAt: Date.now(),
    })),
  updateCustomModuleTitle: (moduleId, title) =>
    set((state) => ({
      draft: {
        ...state.draft,
        customModules: state.draft.customModules.map((module) => (module.id === moduleId ? { ...module, title } : module)),
      },
      lastUpdatedAt: Date.now(),
    })),
  addCustomField: (moduleId, type = "text") =>
    set((state) => ({
      draft: {
        ...state.draft,
        customModules: state.draft.customModules.map((module) =>
          module.id === moduleId ? { ...module, fields: [...module.fields, createCustomField(module.fields.length + 1, type)] } : module,
        ),
      },
      lastUpdatedAt: Date.now(),
    })),
  deleteCustomField: (moduleId, fieldId) =>
    set((state) => ({
      draft: {
        ...state.draft,
        customModules: state.draft.customModules.map((module) =>
          module.id === moduleId ? { ...module, fields: module.fields.filter((field) => field.id !== fieldId) } : module,
        ),
      },
      lastUpdatedAt: Date.now(),
    })),
  moveCustomField: (moduleId, fromIndex, toIndex) =>
    set((state) => ({
      draft: {
        ...state.draft,
        customModules: state.draft.customModules.map((module) =>
          module.id === moduleId ? { ...module, fields: moveItem(module.fields, fromIndex, toIndex) } : module,
        ),
      },
      lastUpdatedAt: Date.now(),
    })),
  toggleCustomFieldVisibility: (moduleId, fieldId) =>
    set((state) => ({
      draft: {
        ...state.draft,
        customModules: state.draft.customModules.map((module) =>
          module.id === moduleId
            ? {
                ...module,
                fields: module.fields.map((field) => (field.id === fieldId ? { ...field, visible: !field.visible } : field)),
              }
            : module,
        ),
      },
      lastUpdatedAt: Date.now(),
    })),
  updateCustomField: (moduleId, fieldId, patch) =>
    set((state) => ({
      draft: {
        ...state.draft,
        customModules: state.draft.customModules.map((module) =>
          module.id === moduleId
            ? {
                ...module,
                fields: module.fields.map((field) => {
                  if (field.id !== fieldId) return field;
                  const typedField = patch.type && patch.type !== field.type ? changeCustomFieldType(field, patch.type) : field;
                  return { ...typedField, ...patch, value: patch.type && patch.type !== field.type ? typedField.value : (patch.value ?? typedField.value) };
                }),
              }
            : module,
        ),
      },
      lastUpdatedAt: Date.now(),
    })),
  addProject: () =>
    set((state) => ({
      draft: {
        ...state.draft,
        projects: [...state.draft.projects, createProjectExperience(state.draft.projects.length + 1)],
      },
      activeModule: "projects",
      lastUpdatedAt: Date.now(),
    })),
  addWork: () =>
    set((state) => ({
      draft: {
        ...state.draft,
        work: [...state.draft.work, createWorkExperience(state.draft.work.length + 1)],
      },
      activeModule: "work",
      lastUpdatedAt: Date.now(),
    })),
  addEducation: () =>
    set((state) => ({
      draft: {
        ...state.draft,
        education: [...state.draft.education, createEducationExperience(state.draft.education.length + 1)],
      },
      activeModule: "education",
      lastUpdatedAt: Date.now(),
    })),
  updateIdentity: (field, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        identity: {
          ...state.draft.identity,
          [field]: value,
        },
      },
      lastUpdatedAt: Date.now(),
    })),
  updateProject: (id, field, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        projects: state.draft.projects.map((project) => (project.id === id ? { ...project, [field]: value } : project)),
      },
      lastUpdatedAt: Date.now(),
    })),
  updateWork: (id, field, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        work: state.draft.work.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
      },
      lastUpdatedAt: Date.now(),
    })),
  updateSkills: (field, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        skills: {
          ...state.draft.skills,
          [field]: value,
        },
      },
      lastUpdatedAt: Date.now(),
    })),
  updateSkillLabel: (id, label) =>
    set((state) => ({
      draft: {
        ...state.draft,
        skills: {
          ...state.draft.skills,
          labels: {
            ...state.draft.skills.labels,
            [id]: label,
          },
        },
      },
      lastUpdatedAt: Date.now(),
    })),
  addSkillCategory: (label) =>
    set((state) => ({
      draft: {
        ...state.draft,
        skills: {
          ...state.draft.skills,
          customCategories: [
            ...state.draft.skills.customCategories,
            createSkillCategory(state.draft.skills.customCategories.length + 1, label),
          ],
        },
      },
      lastUpdatedAt: Date.now(),
    })),
  updateSkillCategory: (id, patch) =>
    set((state) => ({
      draft: {
        ...state.draft,
        skills: {
          ...state.draft.skills,
          customCategories: state.draft.skills.customCategories.map((category) =>
            category.id === id ? { ...category, ...patch, id: category.id } : category,
          ),
        },
      },
      lastUpdatedAt: Date.now(),
    })),
  deleteSkillCategory: (id) =>
    set((state) => ({
      draft: {
        ...state.draft,
        skills: {
          ...state.draft.skills,
          customCategories: state.draft.skills.customCategories.filter((category) => category.id !== id),
        },
      },
      lastUpdatedAt: Date.now(),
    })),
  toggleSkillCategoryVisibility: (id) =>
    set((state) => ({
      draft: {
        ...state.draft,
        skills: {
          ...state.draft.skills,
          customCategories: state.draft.skills.customCategories.map((category) =>
            category.id === id ? { ...category, visible: !category.visible } : category,
          ),
        },
      },
      lastUpdatedAt: Date.now(),
    })),
  updateEducation: (id, field, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        education: state.draft.education.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
      },
      lastUpdatedAt: Date.now(),
    })),
  updateExportProtocol: (field, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        exportProtocol: {
          ...state.draft.exportProtocol,
          [field]: value,
        },
      },
      lastUpdatedAt: Date.now(),
    })),
  updateTheme: (theme) =>
    set((state) => ({
      draft: {
        ...state.draft,
        theme,
      },
      lastUpdatedAt: Date.now(),
    })),
  replaceDraft: (draft) => set({ draft: normalizeResumeDraft(draft), activeModule: "identity", lastUpdatedAt: Date.now() }),
}));
