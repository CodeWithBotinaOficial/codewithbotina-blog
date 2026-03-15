import { useEffect, useRef, useState } from "preact/hooks";
import { UploadCloud, X } from "lucide-preact";

export interface ImageUploadPreviewLabels {
  dropTitle: string;
  dropSubtitle: string;
  dropActive: string;
  changeLabel: string;
  removeLabel: string;
  fileNameLabel: string;
  fileSizeLabel: string;
  dimensionsLabel: string;
}

interface Props {
  file: File | null;
  previewUrl: string | null;
  dragActive: boolean;
  onOpenFileDialog: () => void;
  onRemove: () => void;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  labels: ImageUploadPreviewLabels;
  disabled?: boolean;
  maxWidthClass?: string;
}

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

export default function ImageUploadPreview({
  file,
  previewUrl,
  dragActive,
  onOpenFileDialog,
  onRemove,
  onDragOver,
  onDragLeave,
  onDrop,
  labels,
  disabled,
  maxWidthClass,
}: Props) {
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!previewUrl) {
      setDimensions(null);
      return;
    }
    const img = new Image();
    img.onload = () => setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = previewUrl;
  }, [previewUrl]);

  const containerWidth = maxWidthClass ?? "max-w-[400px]";
  const borderClass = previewUrl ? "border-[var(--color-border)]" : "border-dashed border-[var(--color-border)]";
  const dragClass = dragActive ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-light)]" : "bg-[var(--color-bg-subtle)]";

  return (
    <div class={`w-full ${containerWidth}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={onOpenFileDialog}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        aria-label={labels.dropTitle}
        class={`group relative w-full overflow-hidden rounded-xl border-2 ${borderClass} ${dragClass} shadow-sm transition-colors disabled:opacity-60`}
      >
        <div class="w-full max-h-[300px] min-h-[220px] flex items-center justify-center p-4">
          {previewUrl ? (
            <img
              ref={imgRef}
              src={previewUrl}
              alt=""
              class="max-h-[260px] w-full object-contain"
            />
          ) : (
            <div class="flex flex-col items-center gap-2 text-center px-4 py-10">
              <UploadCloud className="h-8 w-8 text-[var(--color-accent-primary)]" />
              <p class="text-sm font-semibold text-[var(--color-text-primary)]">
                {dragActive ? labels.dropActive : labels.dropTitle}
              </p>
              <p class="text-xs text-[var(--color-text-tertiary)]">{labels.dropSubtitle}</p>
            </div>
          )}
        </div>

        {previewUrl ? (
          <>
            <div class="absolute inset-0 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
              <span class="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
                {labels.changeLabel}
              </span>
            </div>
            <button
              type="button"
              disabled={disabled}
              aria-label={labels.removeLabel}
              class="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-[var(--color-text-secondary)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white disabled:opacity-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </button>

      {file ? (
        <div class="mt-3 text-xs text-[var(--color-text-tertiary)] space-y-1">
          <div>
            <span class="font-semibold">{labels.fileNameLabel}:</span> {file.name}
          </div>
          <div class="flex flex-wrap gap-2">
            <span>
              <span class="font-semibold">{labels.fileSizeLabel}:</span> {formatFileSize(file.size)}
            </span>
            {dimensions ? (
              <span>
                <span class="font-semibold">{labels.dimensionsLabel}:</span> {dimensions.w}x{dimensions.h}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

