import { coerceDateRange, createDateRange } from "@/lib/date-range";
import type { CustomFieldType, CustomModule, CustomModuleField, DateRange } from "@/types/resume";

const defaultCustomModuleTitle = "自定义模块";
const defaultCustomFieldLabel = "自定义字段";

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeFieldType(value: unknown): CustomFieldType {
  if (value === "textarea" || value === "date" || value === "text") return value;
  return "text";
}

function defaultValueForType(type: CustomFieldType): string | DateRange {
  if (type === "date") return createDateRange("", "", false);
  return "";
}

function normalizeFieldValue(type: CustomFieldType, value: unknown): string | DateRange {
  if (type === "date") return coerceDateRange(value as DateRange | string | undefined | null);
  return String(value ?? "");
}

export function createCustomField(index: number, type: CustomFieldType = "text"): CustomModuleField {
  return {
    id: uniqueId("custom-field"),
    label: `${defaultCustomFieldLabel} ${index}`,
    type,
    value: defaultValueForType(type),
    visible: true,
  };
}

export function createCustomModule(index: number): CustomModule {
  return {
    id: uniqueId("custom-module"),
    title: `${defaultCustomModuleTitle} ${index}`,
    fields: [createCustomField(1, "text"), createCustomField(2, "textarea")],
  };
}

export function normalizeCustomField(field: Partial<CustomModuleField> | undefined, index: number): CustomModuleField {
  const type = normalizeFieldType(field?.type);

  return {
    id: typeof field?.id === "string" && field.id ? field.id : uniqueId("custom-field"),
    label: typeof field?.label === "string" && field.label.trim() ? field.label : `${defaultCustomFieldLabel} ${index}`,
    type,
    value: normalizeFieldValue(type, field?.value),
    visible: field?.visible !== false,
  };
}

export function normalizeCustomModules(value: unknown): CustomModule[] {
  if (!Array.isArray(value)) return [];

  return value.map((module, moduleIndex) => {
    const input = module as Partial<CustomModule> | undefined;
    const fields = Array.isArray(input?.fields) ? input.fields : [];

    return {
      id: typeof input?.id === "string" && input.id ? input.id : uniqueId("custom-module"),
      title: typeof input?.title === "string" && input.title.trim() ? input.title : `${defaultCustomModuleTitle} ${moduleIndex + 1}`,
      fields: fields.length ? fields.map((field, fieldIndex) => normalizeCustomField(field, fieldIndex + 1)) : [createCustomField(1)],
    };
  });
}

export function changeCustomFieldType(field: CustomModuleField, type: CustomFieldType): CustomModuleField {
  if (field.type === type) return field;

  return {
    ...field,
    type,
    value: defaultValueForType(type),
  };
}
