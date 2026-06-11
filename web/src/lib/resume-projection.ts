import { formatWebsiteDisplay, formatWebsiteHref } from "@/lib/contact-display";
import { formatDateRange } from "@/lib/date-range";
import { getOrderedFields } from "@/lib/resume-layout";
import { normalizeSkillColumnMode, normalizeSkillDisplayMode, skillCategoriesFromFields } from "@/lib/skills";
import type { DateRange, EditorModule, ResumeDraft } from "@/types/resume";
import type { Language } from "@/lib/i18n";

export type ResumeValue = string | DateRange;
export type ResumeItem = Record<string, ResumeValue>;

export function fieldCaption(label: string) {
  return label.includes("·") ? label.split("·").at(-1)?.trim() ?? label : label;
}

export function isResumeFieldVisible(draft: ResumeDraft, module: EditorModule, fieldId: string) {
  return getOrderedFields(module, draft.layout.fields[module]).some((field) => field.id === fieldId && field.visible);
}

export function getResumeModuleItems(draft: ResumeDraft, module: EditorModule): ResumeItem[] {
  if (module === "identity") return [draft.identity as unknown as ResumeItem];
  if (module === "projects") return draft.projects as unknown as ResumeItem[];
  if (module === "work") return draft.work as unknown as ResumeItem[];
  if (module === "skills") return [];
  if (module === "education") return draft.education as unknown as ResumeItem[];
  return [draft.exportProtocol as unknown as ResumeItem];
}

export function projectResumeItemFieldText(item: ResumeItem, fieldId: string, language: Language) {
  const value = item[fieldId];
  if (fieldId === "period") return formatDateRange(value, language);
  return String(value ?? "");
}

export function isResumeMetaField(fieldId: string) {
  return fieldId === "role" || fieldId === "period" || fieldId === "location" || fieldId === "stack" || fieldId === "degree";
}

export function projectWebsiteLink(value: string | undefined | null) {
  const display = formatWebsiteDisplay(value);

  return {
    display,
    href: display ? formatWebsiteHref(value) : "",
  };
}

export function projectIdentityContact(draft: ResumeDraft) {
  const email = isResumeFieldVisible(draft, "identity", "email") ? draft.identity.email.trim() : "";
  const location = isResumeFieldVisible(draft, "identity", "location") ? draft.identity.location.trim() : "";
  const photo = isResumeFieldVisible(draft, "identity", "photo") ? draft.identity.photo.trim() : "";
  const website = isResumeFieldVisible(draft, "identity", "website") ? projectWebsiteLink(draft.identity.website) : { display: "", href: "" };

  return {
    email,
    location,
    photo,
    websiteDisplay: website.display,
    websiteHref: website.href,
    hasContact: Boolean(email || location || website.display),
  };
}

export function projectSkillSection(draft: ResumeDraft) {
  const categories = skillCategoriesFromFields(draft.skills, getOrderedFields("skills", draft.layout.fields.skills));
  const displayMode = normalizeSkillDisplayMode(draft.skills.displayMode);
  const columnMode = normalizeSkillColumnMode(draft.skills.columnMode);

  return {
    categories,
    displayMode,
    columnMode,
    columnCount: columnMode === "one" ? 1 : 2,
  };
}
