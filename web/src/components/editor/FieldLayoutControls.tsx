"use client";

import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/css";
import { getOrderedFields } from "@/lib/resume-layout";
import { isSkillContentFieldId } from "@/lib/skills";
import { useEditorStore } from "@/store/editor-store";
import type { EditorModule } from "@/types/resume";

export function FieldLayoutControls({ module }: { module: EditorModule }) {
  const { t } = useI18n();
  const fieldLayout = useEditorStore((state) => state.draft.layout.fields[module]);
  const skillLabels = useEditorStore((state) => state.draft.skills.labels);
  const moveField = useEditorStore((state) => state.moveField);
  const toggleFieldVisibility = useEditorStore((state) => state.toggleFieldVisibility);
  const fields = getOrderedFields(module, fieldLayout);

  return (
    <div className="border border-[rgba(125,139,153,0.18)] bg-black/20 p-3">
      <div className="mb-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em]">
        <span className="text-slate-500">{t("control.fieldLayout")}</span>
        <span className="text-[var(--trace-cyan)]">{fields.filter((field) => field.visible).length}/{fields.length}</span>
      </div>
      <div className="grid gap-2 xl:grid-cols-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2 border border-[rgba(125,139,153,0.14)] bg-[#05080c]/80 p-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
            <button
              type="button"
              onClick={() => moveField(module, index, index - 1)}
              disabled={index === 0}
              className="px-2 py-1 text-slate-400 transition hover:text-[var(--cyber-green)] disabled:opacity-25"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveField(module, index, index + 1)}
              disabled={index === fields.length - 1}
              className="px-2 py-1 text-slate-400 transition hover:text-[var(--cyber-green)] disabled:opacity-25"
            >
              ↓
            </button>
            <span className="min-w-0 flex-1 truncate">{module === "skills" && isSkillContentFieldId(field.id) ? skillLabels[field.id] : t(field.labelKey)}</span>
            <button
              type="button"
              onClick={() => toggleFieldVisibility(module, field.id)}
              className={cn(
                "px-2 py-1 transition hover:bg-[rgba(88,230,255,0.08)]",
                field.visible ? "text-[var(--cyber-green)]" : "text-[var(--warning-orange)]",
              )}
            >
              {field.visible ? t("control.show") : t("control.hide")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
