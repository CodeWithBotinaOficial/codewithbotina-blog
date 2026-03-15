import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { getApiUrl } from "../../lib/env";
import ImageThumbnail from "./ImageThumbnail";
import ImagePreviewPanel from "./ImagePreviewPanel";

export interface StorageImageItem {
  name: string;
  url: string;
  size?: number | null;
  mimetype?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface StorageImageLabels {
  uploadNew: string;
  selectFromLibrary: string;
  externalUrl: string;
  useThisImage: string;
  cancel: string;
  noImages: string;
  filenameReadOnly: string;
  searchImages: string;
  selectedImage: string;
  pickHint: string;
  fileInfo: string;
  filename: string;
  fileSize: string;
  dimensions: string;
  uploadedOn: string;
  loading: string;
  error: string;
  retry: string;
  loadMore: string;
  locale?: string;
}

interface Props {
  labels: StorageImageLabels;
  appliedImage: StorageImageItem | null;
  onUse: (image: StorageImageItem) => void;
  disabled?: boolean;
}

const API_URL = getApiUrl().replace(/\/$/, "");

export default function StorageImageGallery({ labels, appliedImage, onUse, disabled }: Props) {
  const [items, setItems] = useState<StorageImageItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StorageImageItem | null>(null);

  const q = query.trim();

  const fetchPage = useCallback(async (nextOffset: number, reset: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL(`${API_URL}/api/storage/images`);
      url.searchParams.set("limit", "48");
      url.searchParams.set("offset", String(nextOffset));
      if (q) url.searchParams.set("q", q);

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to load images");
      }
      const payload = await res.json();
      const images = (payload?.data?.images ?? []) as StorageImageItem[];
      const more = Boolean(payload?.data?.has_more);

      setItems((prev) => (reset ? images : [...prev, ...images]));
      setOffset(payload?.data?.next_offset ?? nextOffset + 48);
      setHasMore(more);
    } catch (_e) {
      setError(labels.error);
    } finally {
      setLoading(false);
    }
  }, [labels.error, q]);

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    setSelected(null);
    fetchPage(0, true);
  }, [q, fetchPage]);

  const appliedName = appliedImage?.name ?? null;
  const appliedUrl = appliedImage?.url ?? null;

  const appliedMatch = useMemo(() => {
    if (!appliedName && !appliedUrl) return null;
    return items.find((img) => (appliedName ? img.name === appliedName : false) || (appliedUrl ? img.url === appliedUrl : false)) ??
      null;
  }, [items, appliedName, appliedUrl]);

  const empty = !loading && !error && items.length === 0;

  return (
    <div class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-[var(--color-text-primary)]">{labels.selectFromLibrary}</div>
          {appliedImage ? (
            <div class="text-xs text-[var(--color-text-tertiary)] truncate">
              {labels.selectedImage}: {appliedImage.name}
            </div>
          ) : null}
        </div>
        <div class="w-full sm:w-72">
          <input
            type="text"
            disabled={disabled}
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            placeholder={labels.searchImages}
            class="input-field"
          />
        </div>
      </div>

      {error ? (
        <div class="rounded-xl border border-[var(--color-border)] bg-white p-4 flex items-center justify-between gap-4">
          <div class="text-sm text-[var(--color-text-secondary)]">{error}</div>
          <button
            type="button"
            disabled={disabled}
            class="rounded-lg border border-[var(--color-border)] px-4 py-2 font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)] transition disabled:opacity-50"
            onClick={() => fetchPage(0, true)}
          >
            {labels.retry}
          </button>
        </div>
      ) : null}

      <div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div class="space-y-3">
          {loading && items.length === 0 ? (
            <div class="text-sm text-[var(--color-text-tertiary)]">{labels.loading}</div>
          ) : empty ? (
            <div class="text-sm text-[var(--color-text-tertiary)]">{labels.noImages}</div>
          ) : (
            <>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                {items.map((img) => (
                  <ImageThumbnail
                    key={img.name}
                    image={img}
                    selected={Boolean(selected?.name && selected.name === img.name)}
                    applied={Boolean(appliedMatch?.name && appliedMatch.name === img.name)}
                    onClick={() => setSelected(img)}
                  />
                ))}
              </div>

              {hasMore ? (
                <div class="pt-2">
                  <button
                    type="button"
                    disabled={disabled || loading}
                    class="rounded-lg border border-[var(--color-border)] px-4 py-2 font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)] transition disabled:opacity-50"
                    onClick={() => fetchPage(offset, false)}
                  >
                    {loading ? labels.loading : labels.loadMore}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        <ImagePreviewPanel
          image={selected}
          labels={labels}
          onUse={(img) => {
            onUse(img);
            setSelected(null);
          }}
          onCancel={() => setSelected(null)}
        />
      </div>
    </div>
  );
}
