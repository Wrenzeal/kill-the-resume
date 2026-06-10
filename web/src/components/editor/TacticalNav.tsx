"use client";

import { useState, type DragEvent } from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/css";
import { getModuleDefinition, isEditorModule } from "@/lib/resume-layout";
import { useEditorStore } from "@/store/editor-store";
import type { EditorModule, ModuleId } from "@/types/resume";

export function TacticalNav() {
  const { t } = useI18n();
  const activeModule = useEditorStore((state) => state.activeModule);
  const moduleLayout = useEditorStore((state) => state.draft.layout.modules);
  const customModules = useEditorStore((state) => state.draft.customModules);
  const setActiveModule = useEditorStore((state) => state.setActiveModule);
  const moveModule = useEditorStore((state) => state.moveModule);
  const toggleModuleVisibility = useEditorStore((state) => state.toggleModuleVisibility);
  const addCustomModule = useEditorStore((state) => state.addCustomModule);
  const deleteCustomModule = useEditorStore((state) => state.deleteCustomModule);
  const addProject = useEditorStore((state) => state.addProject);
  const addWork = useEditorStore((state) => state.addWork);
  const addEducation = useEditorStore((state) => state.addEducation);
  const [draggedModule, setDraggedModule] = useState<ModuleId | null>(null);
  const editableModuleLayout = moduleLayout.filter((module) => module.id !== "export");
  const exportDefinition = getModuleDefinition("export");

  const handleDrop = (targetModule: ModuleId) => {
    if (!draggedModule || draggedModule === targetModule) {
      setDraggedModule(null);
      return;
    }

    const fromIndex = moduleLayout.findIndex((module) => module.id === draggedModule);
    const toIndex = moduleLayout.findIndex((module) => module.id === targetModule);
    moveModule(fromIndex, toIndex);
    setDraggedModule(null);
  };

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[rgba(125,139,153,0.18)] bg-[#080c11]/92">
      <div className="border-b border-[rgba(125,139,153,0.18)] p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-[var(--warning-orange)]">
          {t("nav.eyebrow")}
        </p>
        <h2 className="mt-3 font-mono text-lg font-black uppercase tracking-[-0.04em] text-white">
          {t("nav.title")}
        </h2>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
          {t("control.dragHint")}
        </p>
      </div>

      <nav className="tactical-scrollbar flex-1 space-y-2 overflow-y-auto p-3 font-mono text-[13px] uppercase tracking-[0.18em]">
        {editableModuleLayout.map((moduleLayoutItem, index) => {
          const isBuiltin = isEditorModule(moduleLayoutItem.id);
          const definition = isBuiltin ? getModuleDefinition(moduleLayoutItem.id as EditorModule) : null;
          const customModule = isBuiltin ? null : customModules.find((module) => module.id === moduleLayoutItem.id);
          if (!definition && !customModule) return null;

          const customIndex = customModule ? customModules.findIndex((module) => module.id === customModule.id) : -1;
          const label = definition ? t(definition.labelKey) : customModule?.title || t("custom.moduleFallback");
          const code = definition ? definition.code : `C${String(customIndex + 1).padStart(2, "0")}`;
          const isActive = activeModule === moduleLayoutItem.id;

          return (
            <div
              key={moduleLayoutItem.id}
              className={cn(
                "border border-transparent transition",
                draggedModule === moduleLayoutItem.id ? "border-[rgba(88,230,255,0.35)] opacity-60" : "",
              )}
            >
              <button
                type="button"
                draggable
                aria-current={isActive ? "page" : undefined}
                onDragStart={() => setDraggedModule(moduleLayoutItem.id)}
                onDragEnd={() => setDraggedModule(null)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(moduleLayoutItem.id)}
                onClick={() => setActiveModule(moduleLayoutItem.id)}
                className="group flex w-full items-center gap-3 border border-transparent px-3 py-3 text-left text-slate-500 transition hover:border-[rgba(88,230,255,0.25)] hover:bg-[rgba(88,230,255,0.04)] hover:text-slate-200 focus-visible:border-[rgba(57,255,136,0.55)] focus-visible:outline-none focus-visible:shadow-[0_0_18px_rgba(57,255,136,0.16)] aria-[current=page]:border-[rgba(57,255,136,0.42)] aria-[current=page]:bg-[rgba(57,255,136,0.07)] aria-[current=page]:text-[var(--cyber-green)]"
              >
                <span className="text-[11px] text-slate-600 group-aria-[current=page]:text-[var(--cyber-green)]">
                  [{code}]
                </span>
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className="text-[9px] text-slate-700 group-aria-[current=page]:text-[var(--cyber-green)]">
                  {index + 1}
                </span>
                <span
                  className="h-1.5 w-1.5 bg-current opacity-50 shadow-[0_0_12px_currentColor] group-aria-[current=page]:opacity-100"
                  aria-hidden="true"
                />
              </button>
              <div className="flex border-x border-b border-[rgba(125,139,153,0.14)] bg-black/20">
                <button
                  type="button"
                  onClick={() => {
                    toggleModuleVisibility(moduleLayoutItem.id);
                  }}
                  className={cn(
                    "flex-1 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.16em] transition hover:text-slate-200",
                    moduleLayoutItem.visible ? "text-[var(--cyber-green)]" : "text-[var(--warning-orange)]",
                  )}
                >
                  {moduleLayoutItem.visible ? t("control.visible") : t("control.hidden")}
                </button>
                {definition?.repeatable && definition.addLabelKey ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (moduleLayoutItem.id === "projects") addProject();
                      if (moduleLayoutItem.id === "work") addWork();
                      if (moduleLayoutItem.id === "education") addEducation();
                    }}
                    className="border-l border-[rgba(125,139,153,0.14)] px-3 py-2 text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)]"
                  >
                    +
                  </button>
                ) : null}
                {customModule ? (
                  <button
                    type="button"
                    aria-label={`${t("custom.deleteModule")}: ${customModule.title}`}
                    onClick={() => deleteCustomModule(customModule.id)}
                    className="border-l border-[rgba(125,139,153,0.14)] px-3 py-2 text-[var(--warning-orange)] transition hover:bg-[rgba(255,138,61,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_16px_rgba(255,138,61,0.16)]"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-[rgba(125,139,153,0.18)] p-3">
        <div className="border border-[rgba(57,255,136,0.18)] bg-black/20 font-mono text-[13px] uppercase tracking-[0.18em]">
          <button
            type="button"
            aria-current={activeModule === "export" ? "page" : undefined}
            onClick={() => setActiveModule("export")}
            className="group flex w-full items-center gap-3 border border-transparent px-3 py-3 text-left text-slate-500 transition hover:border-[rgba(57,255,136,0.25)] hover:bg-[rgba(57,255,136,0.04)] hover:text-slate-200 focus-visible:border-[rgba(57,255,136,0.55)] focus-visible:outline-none focus-visible:shadow-[0_0_18px_rgba(57,255,136,0.16)] aria-[current=page]:border-[rgba(57,255,136,0.42)] aria-[current=page]:bg-[rgba(57,255,136,0.07)] aria-[current=page]:text-[var(--cyber-green)]"
          >
            <span className="text-[11px] text-slate-600 group-aria-[current=page]:text-[var(--cyber-green)]">
              [{exportDefinition.code}]
            </span>
            <span className="min-w-0 flex-1 truncate">{t(exportDefinition.labelKey)}</span>
            <span className="text-[9px] text-slate-700 group-aria-[current=page]:text-[var(--cyber-green)]">
              {moduleLayout.length}
            </span>
            <span
              className="h-1.5 w-1.5 bg-current opacity-50 shadow-[0_0_12px_currentColor] group-aria-[current=page]:opacity-100"
              aria-hidden="true"
            />
          </button>
          <div className="border-x border-b border-[rgba(125,139,153,0.14)] bg-black/20 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
            {t("control.editorOnly")}
          </div>
        </div>

        <button
          type="button"
          onClick={addCustomModule}
          className="w-full border border-[rgba(88,230,255,0.32)] bg-[rgba(88,230,255,0.04)] px-3 py-3 text-left font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_18px_rgba(88,230,255,0.16)]"
        >
          + {t("custom.addModule")}
        </button>
      </div>

      <div className="border-t border-[rgba(125,139,153,0.18)] p-4 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
        <div className="flex items-center justify-between">
          <span>{t("nav.integrity")}</span>
          <span className="text-[var(--cyber-green)]">99.9%</span>
        </div>
        <div className="mt-3 h-1 bg-slate-900">
          <div className="h-full w-[99%] bg-[var(--cyber-green)] shadow-[0_0_16px_rgba(57,255,136,0.7)]" />
        </div>
      </div>
    </aside>
  );
}
