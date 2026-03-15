import { Check } from "lucide-preact";
import type { StorageImageItem } from "./StorageImageGallery";

interface Props {
  image: StorageImageItem;
  selected: boolean;
  applied: boolean;
  onClick: () => void;
}

export default function ImageThumbnail({ image, selected, applied, onClick }: Props) {
  const isActive = selected || applied;
  return (
    <button
      type="button"
      onClick={onClick}
      class={`group relative w-full rounded-xl border bg-white p-2 text-left transition ${
        isActive
          ? "border-[var(--color-accent-primary)] shadow-md"
          : "border-[var(--color-border)] hover:border-[var(--color-accent-primary)]"
      }`}
    >
      <div class="relative flex items-center justify-center rounded-lg bg-[var(--color-bg-subtle)] h-28 overflow-hidden">
        <img
          src={image.url}
          alt={image.name}
          loading="lazy"
          class="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
        />
        {isActive ? (
          <div class="absolute right-2 top-2 rounded-full bg-[var(--color-accent-primary)] p-1 text-white shadow">
            <Check className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div class="mt-2 space-y-0.5">
        <div class="text-xs font-semibold text-[var(--color-text-primary)] truncate" title={image.name}>
          {image.name}
        </div>
        {typeof image.size === "number" ? (
          <div class="text-[10px] text-[var(--color-text-tertiary)]">
            {formatFileSize(image.size)}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

