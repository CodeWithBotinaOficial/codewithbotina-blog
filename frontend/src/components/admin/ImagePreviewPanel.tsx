import { useEffect, useState } from "preact/hooks";
import type { StorageImageItem, StorageImageLabels } from "./StorageImageGallery";

interface Props {
  image: StorageImageItem | null;
  labels: StorageImageLabels;
  onUse: (image: StorageImageItem) => void;
  onCancel: () => void;
}

function formatFileSize(size: number | null | undefined): string {
  if (typeof size !== "number") return "";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "2-digit" }).format(d);
}

export default function ImagePreviewPanel({ image, labels, onUse, onCancel }: Props) {
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!image?.url) {
      setDimensions(null);
      return;
    }
    const img = new Image();
    img.onload = () => setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = image.url;
  }, [image?.url]);

  if (!image) {
    return (
      <aside class="rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <div class="text-sm font-semibold text-[var(--color-text-primary)]">{labels.selectedImage}</div>
        <p class="mt-2 text-sm text-[var(--color-text-tertiary)]">{labels.pickHint}</p>
      </aside>
    );
  }

  const locale = labels.locale ?? "en-US";

  return (
    <aside class="rounded-2xl border border-[var(--color-border)] bg-white p-5 space-y-4">
      <div>
        <div class="text-sm font-semibold text-[var(--color-text-primary)]">{labels.selectedImage}</div>
        <p class="mt-1 text-xs text-[var(--color-text-tertiary)]">{labels.filenameReadOnly}</p>
      </div>

      <div class="w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] shadow-sm">
        <div class="max-h-[320px] min-h-[240px] flex items-center justify-center p-4">
          <img src={image.url} alt={image.name} class="max-h-[280px] w-full object-contain" />
        </div>
      </div>

      <div class="space-y-2">
        <div class="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          {labels.fileInfo}
        </div>
        <dl class="text-sm text-[var(--color-text-secondary)] space-y-1">
          <div class="flex items-start justify-between gap-3">
            <dt class="font-semibold">{labels.filename}</dt>
            <dd class="text-right break-all">{image.name}</dd>
          </div>
          {typeof image.size === "number" ? (
            <div class="flex items-start justify-between gap-3">
              <dt class="font-semibold">{labels.fileSize}</dt>
              <dd class="text-right">{formatFileSize(image.size)}</dd>
            </div>
          ) : null}
          {dimensions ? (
            <div class="flex items-start justify-between gap-3">
              <dt class="font-semibold">{labels.dimensions}</dt>
              <dd class="text-right">{dimensions.w}x{dimensions.h}</dd>
            </div>
          ) : null}
          {image.created_at ? (
            <div class="flex items-start justify-between gap-3">
              <dt class="font-semibold">{labels.uploadedOn}</dt>
              <dd class="text-right">{formatDate(image.created_at, locale)}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div class="flex flex-col gap-2">
        <button
          type="button"
          class="btn-primary w-full"
          onClick={() => onUse(image)}
        >
          {labels.useThisImage}
        </button>
        <button
          type="button"
          class="rounded-lg border border-[var(--color-border)] px-4 py-2 font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)] transition"
          onClick={onCancel}
        >
          {labels.cancel}
        </button>
      </div>
    </aside>
  );
}

