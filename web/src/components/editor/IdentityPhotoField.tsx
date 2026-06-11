"use client";

import { useState, type ChangeEvent } from "react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/css";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("file_read_failed")));
    reader.readAsDataURL(file);
  });
}

async function imageFileToResumePhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("unsupported_image");

  const dataUrl = await readFileAsDataUrl(file);

  return new Promise<string>((resolve) => {
    const image = new Image();

    image.addEventListener("load", () => {
      const maxSide = 720;
      const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth || maxSide, image.naturalHeight || maxSide));
      const width = Math.max(1, Math.round((image.naturalWidth || maxSide) * ratio));
      const height = Math.max(1, Math.round((image.naturalHeight || maxSide) * ratio));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        resolve(dataUrl);
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    });

    image.addEventListener("error", () => resolve(dataUrl));
    image.src = dataUrl;
  });
}

export function IdentityPhotoField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputId = `${id}-input`;

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setError("");

    try {
      onChange(await imageFileToResumePhoto(file));
    } catch {
      setError(t("identity.photoError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tactical-field p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <label htmlFor={inputId} className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {label}
        </label>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--trace-cyan)]">image_payload</span>
      </div>

      <div className="grid gap-4 md:grid-cols-[112px_minmax(0,1fr)]">
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden border border-[rgba(88,230,255,0.24)] bg-black/35">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={t("identity.photo")} className="h-full w-full object-cover" />
          ) : (
            <div className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-slate-600">
              photo
              <br />
              slot
            </div>
          )}
          <span className="pointer-events-none absolute inset-0 border border-[rgba(57,255,136,0.14)] shadow-[inset_0_0_22px_rgba(88,230,255,0.06)]" />
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-4">
          <p className="text-sm leading-6 text-slate-400">{t("identity.photoHint")}</p>
          {error ? <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--warning-orange)]">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleChange} />
            <label
              htmlFor={inputId}
              className={cn(
                "cursor-pointer border border-[rgba(88,230,255,0.35)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)]",
                busy ? "pointer-events-none opacity-60" : "",
              )}
            >
              {value ? t("identity.photoReplace") : t("identity.photoUpload")}
            </label>
            {value ? (
              <button
                type="button"
                onClick={() => onChange("")}
                className="border border-[rgba(255,138,61,0.34)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--warning-orange)] transition hover:bg-[rgba(255,138,61,0.08)]"
              >
                {t("identity.photoRemove")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

