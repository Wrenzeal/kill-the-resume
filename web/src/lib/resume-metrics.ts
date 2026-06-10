import { formatDateRange } from "@/lib/date-range";
import { markdownToPlainText } from "@/lib/markdown";
import { getOrderedFields, isEditorModule } from "@/lib/resume-layout";
import { skillCategoriesFromFields } from "@/lib/skills";
import type { DateRange, EditorModule, ProjectExperience, ResumeDraft } from "@/types/resume";

type DensityLevel = "stable" | "warning" | "critical";

type DensityTelemetry = {
  level: DensityLevel;
  label: "LAYOUT_STABLE" | "SPACE_COMPRESSION_ARMED" | "CRITICAL_OVERFLOW_RISK";
  percentage: number;
  compression: number;
};

function resolveDensity(characters: number, warningAt: number, criticalAt: number): DensityTelemetry {
  if (characters >= criticalAt) {
    return {
      level: "critical",
      label: "CRITICAL_OVERFLOW_RISK",
      percentage: 100,
      compression: 0.94,
    };
  }

  if (characters >= warningAt) {
    return {
      level: "warning",
      label: "SPACE_COMPRESSION_ARMED",
      percentage: Math.min(96, Math.round((characters / criticalAt) * 100)),
      compression: 0.97,
    };
  }

  return {
    level: "stable",
    label: "LAYOUT_STABLE",
    percentage: Math.max(18, Math.round((characters / criticalAt) * 100)),
    compression: 1,
  };
}

type DensityValue = string | DateRange;
type DensityItem = Record<string, DensityValue>;

function densityText(value: DensityValue | undefined) {
  if (!value) return "";
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) return "";
    return markdownToPlainText(value, { preserveBlankLines: true });
  }
  return formatDateRange(value);
}

export function getProjectDensity(project: ProjectExperience) {
  const payload = [project.codename, project.role, project.stack, densityText(project.period), project.signal, project.impact].join(" ");

  return resolveDensity(payload.length, 420, 620);
}

function getModuleItems(draft: ResumeDraft, module: EditorModule): DensityItem[] {
  if (module === "identity") return [draft.identity];
  if (module === "projects") return draft.projects;
  if (module === "work") return draft.work;
  if (module === "skills") return [];
  if (module === "education") return draft.education;
  return [draft.exportProtocol];
}

export function getResumeDensity(draft: ResumeDraft) {
  const payload = draft.layout.modules
    .filter((module) => module.visible && module.id !== "export")
    .flatMap((module) => {
      if (!isEditorModule(module.id)) {
        const customModule = draft.customModules.find((item) => item.id === module.id);
        if (!customModule) return [];

        return [
          customModule.title,
          ...customModule.fields.filter((field) => field.visible).flatMap((field) => [field.label, densityText(field.value)]),
        ];
      }

      const fields = getOrderedFields(module.id, draft.layout.fields[module.id]).filter((field) => field.visible);
      if (module.id === "skills") {
        return skillCategoriesFromFields(draft.skills, fields).flatMap((category) => [
          category.label,
          densityText(category.content),
        ]);
      }

      const items = getModuleItems(draft, module.id);

      return items.flatMap((item) => fields.map((field) => densityText(item[field.id])));
    })
    .join(" ");

  return resolveDensity(payload.length, 1600, 2300);
}
