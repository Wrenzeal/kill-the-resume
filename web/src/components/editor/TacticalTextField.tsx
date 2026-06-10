"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/css";
import { applyMarkdownEdit, parseMarkdownBlocks, type MarkdownAction, type MarkdownBlock } from "@/lib/markdown";
import type { TranslationKey } from "@/lib/i18n";

type TacticalTextFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  minRows?: number;
  onChange: (value: string) => void;
};

type FullscreenMode = "edit" | "split" | "preview";

const markdownActions: Array<{ action: MarkdownAction; labelKey: TranslationKey; token: string }> = [
  { action: "heading", labelKey: "markdown.heading", token: "H2" },
  { action: "bold", labelKey: "markdown.bold", token: "B" },
  { action: "italic", labelKey: "markdown.italic", token: "I" },
  { action: "list", labelKey: "markdown.list", token: "•" },
  { action: "quote", labelKey: "markdown.quote", token: ">" },
  { action: "code", labelKey: "markdown.code", token: "</>" },
];

const fullscreenModeKeys: Record<FullscreenMode, TranslationKey> = {
  edit: "markdown.modeEdit",
  split: "markdown.modeSplit",
  preview: "markdown.modePreview",
};

function MarkdownPreviewBlock({ block }: { block: MarkdownBlock }) {
  if (block.type === "blank") return <div className="h-3" />;

  if (block.type === "heading") {
    return (
      <h4 className="border-l-2 border-[var(--cyber-green)] pl-3 font-mono text-base font-black uppercase tracking-[-0.03em] text-white">
        {block.text}
      </h4>
    );
  }

  if (block.type === "bullet") {
    return (
      <div className="flex gap-3 text-sm leading-6 text-slate-300">
        {block.ordered ? (
          <span className="min-w-6 shrink-0 font-mono text-[12px] font-black text-[var(--cyber-green)] drop-shadow-[0_0_10px_rgba(57,255,136,0.42)]">
            {block.order ?? 1}.
          </span>
        ) : (
          <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-[var(--cyber-green)] shadow-[0_0_12px_rgba(57,255,136,0.55)]" />
        )}
        <span>{block.text}</span>
      </div>
    );
  }

  if (block.type === "quote") {
    return <blockquote className="border-l-2 border-[rgba(88,230,255,0.45)] pl-3 text-sm italic leading-6 text-slate-300">{block.text}</blockquote>;
  }

  if (block.type === "code") {
    return (
      <pre className="tactical-scrollbar overflow-auto border border-[rgba(88,230,255,0.18)] bg-black/35 p-3 font-mono text-xs leading-5 text-[var(--trace-cyan)]">
        {block.text}
      </pre>
    );
  }

  return <p className="whitespace-pre-line text-sm leading-6 text-slate-300">{block.text}</p>;
}

function MarkdownPreview({ value, emptyText }: { value: string; emptyText: string }) {
  const blocks = parseMarkdownBlocks(value);

  if (!blocks.length) {
    return <div className="flex h-full items-center justify-center border border-dashed border-[rgba(125,139,153,0.24)] p-6 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-slate-600">{emptyText}</div>;
  }

  return (
    <div className="tactical-scrollbar h-full overflow-auto border border-[rgba(125,139,153,0.18)] bg-[#05080c]/76 p-4">
      <div className="space-y-3">
        {blocks.map((block, index) => (
          <MarkdownPreviewBlock key={`${block.type}-${index}-${block.text.slice(0, 12)}`} block={block} />
        ))}
      </div>
    </div>
  );
}

function ToolbarButton({ children, title, onClick }: { children: ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="border border-[rgba(88,230,255,0.26)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--trace-cyan)] transition hover:border-[rgba(57,255,136,0.5)] hover:bg-[rgba(57,255,136,0.08)] hover:text-[var(--cyber-green)] focus-visible:outline-none focus-visible:shadow-[0_0_18px_rgba(57,255,136,0.16)]"
    >
      {children}
    </button>
  );
}

export function TacticalTextField({ id, label, value, placeholder, minRows = 1, onChange }: TacticalTextFieldProps) {
  const { t } = useI18n();
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState<FullscreenMode>("split");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isLong = minRows > 1;

  useEffect(() => {
    if (!fullscreen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fullscreen]);

  const applyMarkdownAction = (action: MarkdownAction) => {
    const target = textareaRef.current;
    const selectionStart = target?.selectionStart ?? value.length;
    const selectionEnd = target?.selectionEnd ?? value.length;
    const next = applyMarkdownEdit(value, selectionStart, selectionEnd, action);
    onChange(next.value);

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  };

  return (
    <div className="block">
      <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
        <label htmlFor={id} className="min-w-0 truncate">
          {label}
        </label>
        <span className="flex shrink-0 items-center gap-3">
          {isLong ? (
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="text-[rgba(88,230,255,0.76)] transition hover:text-[var(--trace-cyan)] focus-visible:outline-none focus-visible:text-[var(--trace-cyan)]"
            >
              {t("control.fullscreenEdit")}
            </button>
          ) : null}
          <span className="text-[rgba(88,230,255,0.7)]">{value.length.toString().padStart(3, "0")}B</span>
        </span>
      </div>
      <span className="tactical-field block p-3">
        {isLong ? (
          <textarea
            id={id}
            value={value}
            rows={minRows}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            className="tactical-input min-h-20 text-[15px] leading-6"
          />
        ) : (
          <input
            id={id}
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            className="tactical-input h-8 text-[15px]"
          />
        )}
      </span>

      {fullscreen ? (
        <div className="fixed inset-0 z-50 bg-[#05080d]/95 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby={`${id}-fullscreen-title`}>
          <div className="flex h-full flex-col border border-[rgba(57,255,136,0.32)] bg-[#080c11] shadow-[0_0_40px_rgba(57,255,136,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(125,139,153,0.18)] px-5 py-4 font-mono uppercase tracking-[0.24em]">
              <div className="min-w-0">
                <p className="text-[11px] text-[var(--cyber-green)]">markdown_fullscreen_input</p>
                <h3 id={`${id}-fullscreen-title`} className="mt-1 truncate text-base font-black text-white">
                  {label}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <span className="text-slate-500">{value.length.toString().padStart(3, "0")}B</span>
                <button
                  type="button"
                  onClick={() => setFullscreen(false)}
                  className="border border-[rgba(255,138,61,0.5)] px-3 py-2 text-[var(--warning-orange)] transition hover:bg-[rgba(255,138,61,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_18px_rgba(255,138,61,0.2)]"
                >
                  {t("control.closeFullscreen")}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(125,139,153,0.14)] px-5 py-3">
              <div className="flex flex-wrap gap-2">
                {markdownActions.map((item) => (
                  <ToolbarButton key={item.action} title={t(item.labelKey)} onClick={() => applyMarkdownAction(item.action)}>
                    {item.token}
                  </ToolbarButton>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-[0.18em]">
                {(Object.keys(fullscreenModeKeys) as FullscreenMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={fullscreenMode === mode}
                    onClick={() => setFullscreenMode(mode)}
                    className={cn(
                      "border px-3 py-2 transition focus-visible:outline-none",
                      fullscreenMode === mode
                        ? "border-[rgba(57,255,136,0.55)] bg-[rgba(57,255,136,0.08)] text-[var(--cyber-green)]"
                        : "border-[rgba(125,139,153,0.2)] text-slate-500 hover:border-[rgba(88,230,255,0.36)] hover:text-[var(--trace-cyan)]",
                    )}
                  >
                    {t(fullscreenModeKeys[mode])}
                  </button>
                ))}
              </div>
            </div>

            <div className={cn("min-h-0 flex-1 gap-4 p-5", fullscreenMode === "split" ? "grid lg:grid-cols-2" : "grid grid-cols-1")}>
              {fullscreenMode !== "preview" ? (
                <span className="tactical-field block h-full p-4">
                  <textarea
                    ref={textareaRef}
                    value={value}
                    placeholder={placeholder}
                    onChange={(event) => onChange(event.target.value)}
                    autoFocus
                    className="tactical-input h-full min-h-0 resize-none font-mono text-base leading-7"
                  />
                </span>
              ) : null}

              {fullscreenMode !== "edit" ? <MarkdownPreview value={value} emptyText={t("markdown.previewEmpty")} /> : null}
            </div>

            <div className="border-t border-[rgba(125,139,153,0.18)] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
              esc / {t("control.closeFullscreen")} · {t("markdown.hint")}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
