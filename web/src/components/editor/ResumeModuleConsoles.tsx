"use client";

import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/css";
import { coerceDateRange } from "@/lib/date-range";
import { getProjectDensity, getResumeDensity } from "@/lib/resume-metrics";
import { builtInSkillCategory, customSkillCategory, isSkillContentField, joinSkillTags, splitSkillTags, type SkillCategoryItem } from "@/lib/skills";
import { getOrderedFields, isEditorModule } from "@/lib/resume-layout";
import type { TranslationKey } from "@/lib/i18n";
import { DateRangeField } from "@/components/editor/DateRangeField";
import { FieldLayoutControls } from "@/components/editor/FieldLayoutControls";
import { IdentityPhotoField } from "@/components/editor/IdentityPhotoField";
import { ModuleShell } from "@/components/editor/ModuleShell";
import { ModuleTelemetry } from "@/components/editor/ModuleTelemetry";
import { ResumeExportActions } from "@/components/editor/ResumeExportActions";
import { TacticalTextField } from "@/components/editor/TacticalTextField";
import { useEditorStore } from "@/store/editor-store";
import type {
  CustomFieldType,
  CustomModule,
  CustomModuleField,
  DateRange,
  EducationExperience,
  EditorModule,
  ExportProtocol,
  ProjectExperience,
  ResumeIdentity,
  SkillColumnMode,
  SkillDisplayMode,
  WorkExperience,
} from "@/types/resume";

const statusLabelKeys: Record<ProjectExperience["status"], TranslationKey> = {
  stable: "status.stable",
  warning: "status.warning",
  critical: "status.critical",
};

const densityLabelKeys: Record<ReturnType<typeof getProjectDensity>["level"], TranslationKey> = {
  stable: "density.stable",
  warning: "density.warning",
  critical: "density.critical",
};

type EditableValue = string | DateRange;
type EditableRecord = Record<string, EditableValue>;


function StatusPill({
  status,
  label,
  active,
  onClick,
}: {
  status: ProjectExperience["status"];
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition",
        active
          ? status === "stable"
            ? "border-[rgba(57,255,136,0.65)] bg-[rgba(57,255,136,0.1)] text-[var(--cyber-green)] shadow-[0_0_18px_rgba(57,255,136,0.16)]"
            : status === "warning"
              ? "border-[rgba(255,138,61,0.7)] bg-[rgba(255,138,61,0.1)] text-[var(--warning-orange)] shadow-[0_0_18px_rgba(255,138,61,0.15)]"
              : "border-red-400/70 bg-red-500/10 text-red-300 shadow-[0_0_18px_rgba(248,113,113,0.15)]"
          : "border-[rgba(125,139,153,0.2)] text-slate-500 hover:border-[rgba(88,230,255,0.35)] hover:text-slate-300",
      )}
    >
      {label}
    </button>
  );
}

function DensityFooter({ level, percentage }: { level: ReturnType<typeof getProjectDensity>["level"]; percentage: number }) {
  const { t } = useI18n();

  return (
    <div className="w-full font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
      <div className="mb-2 flex items-center justify-between">
        <span>{t(densityLabelKeys[level])}</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-1.5 bg-black">
        <div
          className={cn(
            "h-full transition-all duration-200",
            level === "stable" ? "bg-[var(--cyber-green)]" : "bg-[var(--warning-orange)] compress-pulse",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function usePreviewLatency() {
  const [previewLatency, setPreviewLatency] = useState(0);

  const measure = (operation: () => void) => {
    const startedAt = performance.now();
    operation();
    setPreviewLatency(Math.max(0, Math.round(performance.now() - startedAt)));
  };

  return { previewLatency, measure };
}

function EditableFields({
  module,
  item,
  fieldPrefix,
  onChange,
}: {
  module: EditorModule;
  item: EditableRecord;
  fieldPrefix: string;
  onChange: (field: string, value: EditableValue) => void;
}) {
  const { t } = useI18n();
  const fieldLayout = useEditorStore((state) => state.draft.layout.fields[module]);
  const fields = getOrderedFields(module, fieldLayout).filter((field) => field.visible);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {fields.map((field) => (
        <div key={field.id} className={field.id === "period" || field.id === "photo" || field.minRows ? "xl:col-span-2" : undefined}>
          {field.id === "period" ? (
            <DateRangeField
              id={`${fieldPrefix}-${field.id}`}
              label={t(field.labelKey)}
              value={item[field.id] ?? ""}
              onChange={(value) => onChange(field.id, value)}
            />
          ) : field.id === "photo" && module === "identity" ? (
            <IdentityPhotoField
              id={`${fieldPrefix}-${field.id}`}
              label={t(field.labelKey)}
              value={String(item[field.id] ?? "")}
              onChange={(value) => onChange(field.id, value)}
            />
          ) : (
            <TacticalTextField
              id={`${fieldPrefix}-${field.id}`}
              label={t(field.labelKey)}
              value={String(item[field.id] ?? "")}
              placeholder={t(field.placeholderKey)}
              minRows={field.minRows}
              onChange={(value) => onChange(field.id, value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function TacticalSegmentControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="tactical-field p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">{label}</span>
        <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(57,255,136,0.35),transparent)]" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition",
              value === option.value
                ? "border-[rgba(57,255,136,0.62)] bg-[rgba(57,255,136,0.1)] text-[var(--cyber-green)] shadow-[0_0_18px_rgba(57,255,136,0.14)]"
                : "border-[rgba(125,139,153,0.2)] text-slate-500 hover:border-[rgba(88,230,255,0.36)] hover:text-[var(--trace-cyan)]",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SkillTagField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const [draftTag, setDraftTag] = useState("");
  const tags = useMemo(() => splitSkillTags(value), [value]);

  const commitTag = (rawValue = draftTag) => {
    const nextTags = splitSkillTags(`${joinSkillTags(tags)}\n${rawValue}`);
    if (nextTags.length !== tags.length) onChange(joinSkillTags(nextTags));
    setDraftTag("");
  };

  const removeTag = (target: string) => {
    onChange(joinSkillTags(tags.filter((tag) => tag !== target)));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (event.key === "Enter") {
      event.preventDefault();
      commitTag();
      return;
    }

    if (event.key === "Backspace" && !draftTag && tags.length) {
      event.preventDefault();
      removeTag(tags.at(-1) ?? "");
    }
  };

  return (
    <div className="tactical-field p-4">
      <label htmlFor={id} className="mb-3 block font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
        {label}
      </label>
      <div className="min-h-11 border border-[rgba(125,139,153,0.16)] bg-black/30 p-2">
        {tags.length ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                title={`${t("skills.removeTag")}: ${tag}`}
                onClick={() => removeTag(tag)}
                className="group inline-flex items-center gap-2 border border-[rgba(57,255,136,0.32)] bg-[rgba(57,255,136,0.06)] px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] text-slate-300 transition hover:border-[rgba(255,138,61,0.55)] hover:text-[var(--warning-orange)]"
              >
                <span>{tag}</span>
                <span className="text-[var(--cyber-green)] transition group-hover:text-[var(--warning-orange)]">×</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-600">{t("skills.emptyTags")}</p>
        )}
      </div>
      <input
        id={id}
        value={draftTag}
        placeholder={placeholder}
        onChange={(event) => setDraftTag(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draftTag.trim()) commitTag();
        }}
        className="tactical-input mt-2 h-10 border border-[rgba(88,230,255,0.14)] bg-black/20 px-3 text-[15px]"
      />
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">{t("skills.tagHint")}</p>
    </div>
  );
}

function SkillCategoryCard({
  category,
  displayMode,
  onLabelChange,
  onContentChange,
  onToggleVisibility,
  onDelete,
}: {
  category: SkillCategoryItem;
  displayMode: SkillDisplayMode;
  onLabelChange: (label: string) => void;
  onContentChange: (content: string) => void;
  onToggleVisibility?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className={cn("border bg-black/20 p-4 transition", category.visible ? "border-[rgba(125,139,153,0.18)]" : "border-[rgba(255,138,61,0.28)] opacity-72")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
        <div className="flex flex-wrap items-center gap-2">
          <span className={category.custom ? "text-[var(--trace-cyan)]" : "text-[var(--cyber-green)]"}>
            {category.custom ? t("skills.customCategory") : t("skills.builtInCategory")}
          </span>
          {!category.visible ? <span className="border border-[rgba(255,138,61,0.35)] px-2 py-1 text-[var(--warning-orange)]">{t("skills.hiddenCategory")}</span> : null}
        </div>
        {category.custom ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggleVisibility}
              className={cn(
                "border px-2 py-1 transition",
                category.visible
                  ? "border-[rgba(57,255,136,0.34)] text-[var(--cyber-green)] hover:bg-[rgba(57,255,136,0.08)]"
                  : "border-[rgba(255,138,61,0.34)] text-[var(--warning-orange)] hover:bg-[rgba(255,138,61,0.08)]",
              )}
            >
              {category.visible ? t("control.hide") : t("control.show")}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="border border-[rgba(255,138,61,0.34)] px-2 py-1 text-[var(--warning-orange)] transition hover:bg-[rgba(255,138,61,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_16px_rgba(255,138,61,0.16)]"
            >
              {t("skills.deleteCategory")}
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4">
        <TacticalTextField
          id={`skill-category-${category.id}-label`}
          label={t("skills.categoryTitle")}
          value={category.label}
          placeholder={t("skills.categoryTitlePlaceholder")}
          onChange={onLabelChange}
        />
        {displayMode === "tags" ? (
          <SkillTagField
            id={`skill-category-${category.id}-tags`}
            label={t("skills.categoryContent")}
            value={category.content}
            placeholder={t("skills.tagInput")}
            onChange={onContentChange}
          />
        ) : (
          <TacticalTextField
            id={`skill-category-${category.id}-content`}
            label={t("skills.categoryContent")}
            value={category.content}
            placeholder={t("skills.categoryContentPlaceholder")}
            minRows={3}
            onChange={onContentChange}
          />
        )}
      </div>
    </div>
  );
}

function ModuleFooter({ module, children }: { module: EditorModule; children?: ReactNode }) {
  return (
    <div className="space-y-5">
      {children}
      <FieldLayoutControls module={module} />
    </div>
  );
}

const customFieldTypeKeys: Record<CustomFieldType, TranslationKey> = {
  text: "custom.typeText",
  textarea: "custom.typeTextarea",
  date: "custom.typeDate",
};

function CustomFieldTypeSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: CustomFieldType;
  onChange: (value: CustomFieldType) => void;
}) {
  const { t } = useI18n();
  const options: CustomFieldType[] = ["text", "textarea", "date"];

  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
        {t("custom.fieldType")}
      </label>
      <span className="tactical-field block p-3">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as CustomFieldType)}
          className="tactical-input h-9 cursor-pointer bg-transparent text-[15px] uppercase"
        >
          {options.map((option) => (
            <option key={option} value={option} className="bg-[#060a0f] text-slate-200">
              {t(customFieldTypeKeys[option])}
            </option>
          ))}
        </select>
      </span>
    </div>
  );
}

function CustomFieldControls({
  field,
  index,
  total,
  onMove,
  onToggle,
  onDelete,
}: {
  field: CustomModuleField;
  index: number;
  total: number;
  onMove: (toIndex: number) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
      <span className="mr-auto text-slate-600">field_{String(index + 1).padStart(2, "0")}</span>
      <button
        type="button"
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
        className="border border-[rgba(125,139,153,0.18)] px-2 py-1 text-slate-500 transition hover:border-[rgba(88,230,255,0.34)] hover:text-[var(--trace-cyan)] disabled:opacity-30 disabled:hover:border-[rgba(125,139,153,0.18)] disabled:hover:text-slate-500"
      >
        ↑ {t("control.moveUp")}
      </button>
      <button
        type="button"
        disabled={index === total - 1}
        onClick={() => onMove(index + 1)}
        className="border border-[rgba(125,139,153,0.18)] px-2 py-1 text-slate-500 transition hover:border-[rgba(88,230,255,0.34)] hover:text-[var(--trace-cyan)] disabled:opacity-30 disabled:hover:border-[rgba(125,139,153,0.18)] disabled:hover:text-slate-500"
      >
        ↓ {t("control.moveDown")}
      </button>
      <button
        type="button"
        aria-pressed={field.visible}
        onClick={onToggle}
        className={cn(
          "border px-2 py-1 transition",
          field.visible
            ? "border-[rgba(57,255,136,0.34)] text-[var(--cyber-green)] hover:bg-[rgba(57,255,136,0.08)]"
            : "border-[rgba(255,138,61,0.34)] text-[var(--warning-orange)] hover:bg-[rgba(255,138,61,0.08)]",
        )}
      >
        {field.visible ? t("control.visible") : t("control.hidden")}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="border border-[rgba(255,138,61,0.34)] px-2 py-1 text-[var(--warning-orange)] transition hover:bg-[rgba(255,138,61,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_16px_rgba(255,138,61,0.16)]"
      >
        {t("custom.deleteField")}
      </button>
    </div>
  );
}

function CustomFieldEditor({
  module,
  field,
  index,
}: {
  module: CustomModule;
  field: CustomModuleField;
  index: number;
}) {
  const { t } = useI18n();
  const updateCustomField = useEditorStore((state) => state.updateCustomField);
  const moveCustomField = useEditorStore((state) => state.moveCustomField);
  const toggleCustomFieldVisibility = useEditorStore((state) => state.toggleCustomFieldVisibility);
  const deleteCustomField = useEditorStore((state) => state.deleteCustomField);
  const value: DateRange | string = field.type === "date" ? coerceDateRange(field.value) : String(field.value ?? "");

  return (
    <div className="border border-[rgba(125,139,153,0.18)] bg-black/20 p-4">
      <div className="mb-4">
        <CustomFieldControls
          field={field}
          index={index}
          total={module.fields.length}
          onMove={(toIndex) => moveCustomField(module.id, index, toIndex)}
          onToggle={() => toggleCustomFieldVisibility(module.id, field.id)}
          onDelete={() => deleteCustomField(module.id, field.id)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
        <TacticalTextField
          id={`${module.id}-${field.id}-label`}
          label={t("custom.fieldTitle")}
          value={field.label}
          placeholder={t("custom.fieldTitlePlaceholder")}
          onChange={(label) => updateCustomField(module.id, field.id, { label })}
        />
        <CustomFieldTypeSelect id={`${module.id}-${field.id}-type`} value={field.type} onChange={(type) => updateCustomField(module.id, field.id, { type })} />
      </div>

      <div className="mt-4">
        {field.type === "date" ? (
          <DateRangeField
            id={`${module.id}-${field.id}-value`}
            label={field.label || t("custom.fieldValue")}
            value={value}
            onChange={(nextValue) => updateCustomField(module.id, field.id, { value: nextValue })}
          />
        ) : (
          <TacticalTextField
            id={`${module.id}-${field.id}-value`}
            label={t("custom.fieldValue")}
            value={String(value)}
            placeholder={field.type === "textarea" ? t("custom.fieldTextareaPlaceholder") : t("custom.fieldValuePlaceholder")}
            minRows={field.type === "textarea" ? 4 : 1}
            onChange={(nextValue) => updateCustomField(module.id, field.id, { value: nextValue })}
          />
        )}
      </div>
    </div>
  );
}

function CustomModuleConsole() {
  const { t } = useI18n();
  const activeModule = useEditorStore((state) => state.activeModule);
  const customModule = useEditorStore((state) => state.draft.customModules.find((module) => module.id === activeModule));
  const updateCustomModuleTitle = useEditorStore((state) => state.updateCustomModuleTitle);
  const addCustomField = useEditorStore((state) => state.addCustomField);
  const deleteCustomModule = useEditorStore((state) => state.deleteCustomModule);
  const { previewLatency, measure } = usePreviewLatency();

  if (!customModule) return <IdentityConsole />;

  const visibleFields = customModule.fields.filter((field) => field.visible).length;

  return (
    <ModuleShell
      id={`custom-${customModule.id}`}
      eyebrow={t("custom.blockType")}
      title={`${t("custom.titlePrefix")}: ${customModule.title || t("custom.moduleFallback")}`}
      telemetry={<ModuleTelemetry items={[[t("project.previewLatency"), `${previewLatency}ms`], [t("common.fields"), `${visibleFields}/${customModule.fields.length}`]]} />}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addCustomField(customModule.id, "text")}
              className="border border-[rgba(88,230,255,0.35)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)]"
            >
              + {t("custom.addTextField")}
            </button>
            <button
              type="button"
              onClick={() => addCustomField(customModule.id, "textarea")}
              className="border border-[rgba(88,230,255,0.35)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)]"
            >
              + {t("custom.addTextareaField")}
            </button>
            <button
              type="button"
              onClick={() => addCustomField(customModule.id, "date")}
              className="border border-[rgba(88,230,255,0.35)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)]"
            >
              + {t("custom.addDateField")}
            </button>
          </div>
          <button
            type="button"
            onClick={() => deleteCustomModule(customModule.id)}
            className="border border-[rgba(255,138,61,0.4)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--warning-orange)] transition hover:bg-[rgba(255,138,61,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_18px_rgba(255,138,61,0.18)]"
          >
            {t("custom.deleteModule")}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <TacticalTextField
          id={`${customModule.id}-title`}
          label={t("custom.moduleTitle")}
          value={customModule.title}
          placeholder={t("custom.moduleTitlePlaceholder")}
          onChange={(title) => measure(() => updateCustomModuleTitle(customModule.id, title))}
        />
        {customModule.fields.length ? (
          customModule.fields.map((field, index) => <CustomFieldEditor key={field.id} module={customModule} field={field} index={index} />)
        ) : (
          <div className="border border-dashed border-[rgba(88,230,255,0.28)] p-5 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {t("custom.emptyFields")}
          </div>
        )}
      </div>
    </ModuleShell>
  );
}

function IdentityConsole() {
  const { t } = useI18n();
  const identity = useEditorStore((state) => state.draft.identity);
  const updateIdentity = useEditorStore((state) => state.updateIdentity);
  const { previewLatency, measure } = usePreviewLatency();
  const fieldLayout = useEditorStore((state) => state.draft.layout.fields.identity);
  const visibleFields = getOrderedFields("identity", fieldLayout).filter((field) => field.visible).length;

  const update = (field: string, value: EditableValue) => {
    measure(() => updateIdentity(field as keyof ResumeIdentity, String(value)));
  };

  return (
    <ModuleShell
      id="core-identity"
      eyebrow={t("identity.blockType")}
      title={t("identity.title")}
      telemetry={<ModuleTelemetry items={[[t("project.previewLatency"), `${previewLatency}ms`], [t("common.fields"), visibleFields]]} />}
      footer={<ModuleFooter module="identity" />}
    >
      <EditableFields module="identity" item={identity as unknown as EditableRecord} fieldPrefix="identity" onChange={update} />
    </ModuleShell>
  );
}

function ProjectExperienceConsole() {
  const { t } = useI18n();
  const projects = useEditorStore((state) => state.draft.projects);
  const updateProject = useEditorStore((state) => state.updateProject);
  const addProject = useEditorStore((state) => state.addProject);
  const { previewLatency, measure } = usePreviewLatency();
  const density = useMemo(() => getProjectDensity(projects[0]), [projects]);

  const update = (project: ProjectExperience, field: string, value: EditableValue) => {
    measure(() => updateProject(project.id, field as keyof ProjectExperience, value as ProjectExperience[keyof ProjectExperience]));
  };

  return (
    <ModuleShell
      id="project-experience"
      eyebrow={t("project.blockType")}
      title={t("project.title")}
      telemetry={<ModuleTelemetry items={[[t("project.previewLatency"), `${previewLatency}ms`], [t("common.activePayload"), projects.length]]} />}
      footer={
        <ModuleFooter module="projects">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={addProject}
              className="border border-[rgba(88,230,255,0.35)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)]"
            >
              + {t("project.add")}
            </button>
            <div className="w-full max-w-sm">
              <DensityFooter level={density.level} percentage={density.percentage} />
            </div>
          </div>
        </ModuleFooter>
      }
    >
      <div className="space-y-5">
        {projects.map((project, index) => (
          <div key={project.id} className="border border-[rgba(125,139,153,0.18)] bg-black/20 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">payload_{String(index + 1).padStart(2, "0")}</p>
              <div className="flex flex-wrap gap-2">
                {(["stable", "warning", "critical"] as ProjectExperience["status"][]).map((status) => (
                  <StatusPill key={status} status={status} label={t(statusLabelKeys[status])} active={project.status === status} onClick={() => update(project, "status", status)} />
                ))}
              </div>
            </div>
            <EditableFields module="projects" item={project as unknown as EditableRecord} fieldPrefix={`project-${project.id}`} onChange={(field, value) => update(project, field, value)} />
          </div>
        ))}
      </div>
    </ModuleShell>
  );
}

function WorkHistoryConsole() {
  const { t } = useI18n();
  const work = useEditorStore((state) => state.draft.work);
  const updateWork = useEditorStore((state) => state.updateWork);
  const addWork = useEditorStore((state) => state.addWork);
  const { previewLatency, measure } = usePreviewLatency();

  const update = (item: WorkExperience, field: string, value: EditableValue) => {
    measure(() => updateWork(item.id, field as keyof WorkExperience, value));
  };

  return (
    <ModuleShell
      id="work-history"
      eyebrow={t("work.blockType")}
      title={t("work.title")}
      telemetry={<ModuleTelemetry items={[[t("project.previewLatency"), `${previewLatency}ms`], [t("common.activePayload"), work.length]]} />}
      footer={
        <ModuleFooter module="work">
          <button
            type="button"
            onClick={addWork}
            className="border border-[rgba(88,230,255,0.35)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)]"
          >
            + {t("work.add")}
          </button>
        </ModuleFooter>
      }
    >
      <div className="space-y-5">
        {work.map((item, index) => (
          <div key={item.id} className="border border-[rgba(125,139,153,0.18)] bg-black/20 p-4">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">payload_{String(index + 1).padStart(2, "0")}</p>
            <EditableFields module="work" item={item as unknown as EditableRecord} fieldPrefix={`work-${item.id}`} onChange={(field, value) => update(item, field, value)} />
          </div>
        ))}
      </div>
    </ModuleShell>
  );
}

function SkillsMatrixConsole() {
  const { t } = useI18n();
  const skills = useEditorStore((state) => state.draft.skills);
  const updateSkills = useEditorStore((state) => state.updateSkills);
  const updateSkillLabel = useEditorStore((state) => state.updateSkillLabel);
  const addSkillCategory = useEditorStore((state) => state.addSkillCategory);
  const updateSkillCategory = useEditorStore((state) => state.updateSkillCategory);
  const deleteSkillCategory = useEditorStore((state) => state.deleteSkillCategory);
  const toggleSkillCategoryVisibility = useEditorStore((state) => state.toggleSkillCategoryVisibility);
  const { previewLatency, measure } = usePreviewLatency();
  const fieldLayout = useEditorStore((state) => state.draft.layout.fields.skills);
  const orderedSkillFields = getOrderedFields("skills", fieldLayout);
  const categories = [
    ...orderedSkillFields.filter(isSkillContentField).map((field) => builtInSkillCategory(skills, field.id, field.visible)),
    ...skills.customCategories.map(customSkillCategory),
  ];
  const visibleFields = categories.filter((category) => category.visible).length;

  const updateCategoryLabel = (category: SkillCategoryItem, label: string) => {
    const builtInId = category.builtInId;
    if (builtInId) {
      measure(() => updateSkillLabel(builtInId, label));
      return;
    }

    measure(() => updateSkillCategory(category.id, { label }));
  };

  const updateCategoryContent = (category: SkillCategoryItem, content: string) => {
    const builtInId = category.builtInId;
    if (builtInId) {
      measure(() => updateSkills(builtInId, content));
      return;
    }

    measure(() => updateSkillCategory(category.id, { content }));
  };

  return (
    <ModuleShell
      id="skills-matrix"
      eyebrow={t("skills.blockType")}
      title={t("skills.title")}
      telemetry={<ModuleTelemetry items={[[t("project.previewLatency"), `${previewLatency}ms`], [t("common.fields"), `${visibleFields}/${categories.length}`]]} />}
      footer={
        <ModuleFooter module="skills">
          <button
            type="button"
            onClick={() => measure(() => addSkillCategory(t("skills.customCategory")))}
            className="border border-[rgba(88,230,255,0.35)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_18px_rgba(88,230,255,0.16)]"
          >
            + {t("skills.addCategory")}
          </button>
        </ModuleFooter>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-2">
          <TacticalSegmentControl<SkillDisplayMode>
            label={t("skills.displayMode")}
            value={skills.displayMode}
            options={[
              { value: "markdown", label: t("skills.modeMarkdown") },
              { value: "tags", label: t("skills.modeTags") },
            ]}
            onChange={(displayMode) => measure(() => updateSkills("displayMode", displayMode))}
          />
          <TacticalSegmentControl<SkillColumnMode>
            label={t("skills.columnMode")}
            value={skills.columnMode}
            options={[
              { value: "one", label: t("skills.oneColumn") },
              { value: "two", label: t("skills.twoColumns") },
            ]}
            onChange={(columnMode) => measure(() => updateSkills("columnMode", columnMode))}
          />
        </div>

        <div className="border border-[rgba(88,230,255,0.18)] bg-[rgba(88,230,255,0.04)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {t("skills.modeHint")}
        </div>

        <div className="grid gap-4">
          {categories.map((category) => (
            <SkillCategoryCard
              key={category.id}
              category={category}
              displayMode={skills.displayMode}
              onLabelChange={(label) => updateCategoryLabel(category, label)}
              onContentChange={(content) => updateCategoryContent(category, content)}
              onToggleVisibility={category.custom ? () => measure(() => toggleSkillCategoryVisibility(category.id)) : undefined}
              onDelete={category.custom ? () => measure(() => deleteSkillCategory(category.id)) : undefined}
            />
          ))}
        </div>
      </div>
    </ModuleShell>
  );
}

function EducationConsole() {
  const { t } = useI18n();
  const education = useEditorStore((state) => state.draft.education);
  const updateEducation = useEditorStore((state) => state.updateEducation);
  const addEducation = useEditorStore((state) => state.addEducation);
  const { previewLatency, measure } = usePreviewLatency();

  const update = (item: EducationExperience, field: string, value: EditableValue) => {
    measure(() => updateEducation(item.id, field as keyof EducationExperience, value));
  };

  return (
    <ModuleShell
      id="education"
      eyebrow={t("education.blockType")}
      title={t("education.title")}
      telemetry={<ModuleTelemetry items={[[t("project.previewLatency"), `${previewLatency}ms`], [t("common.activePayload"), education.length]]} />}
      footer={
        <ModuleFooter module="education">
          <button
            type="button"
            onClick={addEducation}
            className="border border-[rgba(88,230,255,0.35)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)]"
          >
            + {t("education.add")}
          </button>
        </ModuleFooter>
      }
    >
      <div className="space-y-5">
        {education.map((item, index) => (
          <div key={item.id} className="border border-[rgba(125,139,153,0.18)] bg-black/20 p-4">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">payload_{String(index + 1).padStart(2, "0")}</p>
            <EditableFields module="education" item={item as unknown as EditableRecord} fieldPrefix={`education-${item.id}`} onChange={(field, value) => update(item, field, value)} />
          </div>
        ))}
      </div>
    </ModuleShell>
  );
}

function ExportProtocolConsole() {
  const { t } = useI18n();
  const draft = useEditorStore((state) => state.draft);
  const exportProtocol = useEditorStore((state) => state.draft.exportProtocol);
  const updateExportProtocol = useEditorStore((state) => state.updateExportProtocol);
  const { previewLatency, measure } = usePreviewLatency();
  const density = useMemo(() => getResumeDensity(draft), [draft]);

  const update = (field: string, value: EditableValue) => {
    measure(() => updateExportProtocol(field as keyof ExportProtocol, String(value)));
  };

  return (
    <ModuleShell
      id="export-protocol"
      eyebrow={t("export.blockType")}
      title={t("export.title")}
      telemetry={<ModuleTelemetry items={[[t("project.previewLatency"), `${previewLatency}ms`], [t("project.density"), `${density.percentage}%`]]} />}
      footer={
        <ModuleFooter module="export">
          <DensityFooter level={density.level} percentage={density.percentage} />
        </ModuleFooter>
      }
    >
      <div className="space-y-5">
        <ResumeExportActions />
        <EditableFields module="export" item={exportProtocol as unknown as EditableRecord} fieldPrefix="export" onChange={update} />
      </div>
    </ModuleShell>
  );
}

const moduleComponents: Record<EditorModule, () => ReactNode> = {
  identity: IdentityConsole,
  projects: ProjectExperienceConsole,
  work: WorkHistoryConsole,
  skills: SkillsMatrixConsole,
  education: EducationConsole,
  export: ExportProtocolConsole,
};

export function ActiveResumeModule() {
  const activeModule = useEditorStore((state) => state.activeModule);
  if (!isEditorModule(activeModule)) return <CustomModuleConsole />;

  const ActiveModule = moduleComponents[activeModule];
  return <ActiveModule />;
}
