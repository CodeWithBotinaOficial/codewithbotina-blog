import { useEffect, useMemo, useState } from "preact/hooks";
import { getApiUrl } from "../../lib/env";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../hooks/useSession";
import MarkdownPreview from "./MarkdownPreview";
import TagSelector, { TagOption } from "./TagSelector";
import ConfirmDialog from "../ui/ConfirmDialog";
import Toast from "../ui/Toast";
import { useToast } from "../../hooks/useToast";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from "../../lib/i18n";

interface EditorData {
  titulo: string;
  slug: string;
  body: string;
  imagen_url?: string | null;
  tags?: TagOption[];
  language?: string;
}

interface Props {
  mode: "create" | "edit";
  initialData?: EditorData;
  cancelHref?: string;
}

const API_URL = getApiUrl();

export default function PostEditor({ mode, initialData, cancelHref }: Props) {
  const { loading: sessionLoading, isAdmin } = useSession();
  const [title, setTitle] = useState(initialData?.titulo ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [body, setBody] = useState(initialData?.body ?? "");
  const [imageUrl, setImageUrl] = useState(initialData?.imagen_url ?? "");
  const [tags, setTags] = useState<TagOption[]>(initialData?.tags ?? []);
  const [language, setLanguage] = useState(initialData?.language ?? "es");

  const [previewMode, setPreviewMode] = useState(false);
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageTitle, setImageTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  const initialSlug = useMemo(() => initialData?.slug ?? "", [initialData?.slug]);

  useEffect(() => {
    if (!sessionLoading && !isAdmin) {
      window.location.href = "/?error=access_denied";
    }
  }, [sessionLoading, isAdmin]);

  useEffect(() => {
    if (mode !== "create") return;
    if (!title) return;
    if (slugTouched) return;
    setSlug(generateSlug(title));
  }, [title, mode, slugTouched]);

  useEffect(() => {
    const trimmed = slug.trim();
    if (!trimmed) return;
    if (trimmed === initialSlug) return;

    const timer = setTimeout(async () => {
      try {
        setSlugChecking(true);
        const exists = await checkSlugExists(trimmed, language);
        setErrors((prev) => ({
          ...prev,
          slug: exists ? "This slug already exists" : "",
        }));
      } catch (_error) {
        setErrors((prev) => ({
          ...prev,
          slug: "Unable to validate slug. Try again.",
        }));
      } finally {
        setSlugChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug, initialSlug, language]);

  if (sessionLoading) {
    return (
      <div class="py-12 text-center text-[var(--color-text-secondary)]">
        Checking admin access...
      </div>
    );
  }

  if (!isAdmin) return null;

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const newErrors: Record<string, string> = {};
    const trimmedTitle = title.trim();
    const trimmedSlug = slug.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || trimmedTitle.length < 1) {
      newErrors.title = "Title is required";
    } else if (trimmedTitle.length > 200) {
      newErrors.title = "Title must be less than 200 characters";
    }

    if (!trimmedSlug) {
      newErrors.slug = "Slug is required";
    } else if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      newErrors.slug = "Slug must be lowercase letters, numbers, and hyphens only";
    }

    if (!SUPPORTED_LANGUAGES.includes(language as "en" | "es")) {
      newErrors.language = "Please select a valid language";
    }

    if (!trimmedBody || trimmedBody.length < 100) {
      newErrors.body = "Content must be at least 100 characters";
    } else if (trimmedBody.length > 50000) {
      newErrors.body = "Content must be less than 50,000 characters";
    }

    if (imageMode === "url" && imageUrl) {
      try {
        new URL(imageUrl);
      } catch (_error) {
        newErrors.imageUrl = "Image URL must be valid";
      }
    }

    if (imageMode === "upload") {
      if (!imageFile) {
        newErrors.imageFile = "Please select an image to upload";
      } else if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) {
        newErrors.imageFile = "Image must be JPG, PNG, or WebP";
      } else if (imageFile.size > 5 * 1024 * 1024) {
        newErrors.imageFile = "Image must be under 5MB";
      }

      if (!imageTitle.trim()) {
        newErrors.imageTitle = "Image title is required for uploads";
      }
    }

    if (errors.slug) {
      newErrors.slug = errors.slug;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setShowConfirm(true);
  };

  const submitPost = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const trimmedTitle = title.trim();
    const trimmedSlug = slug.trim();
    const trimmedBody = body.trim();

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error("Missing access token");
      }

      let finalImageUrl = imageUrl;
      if (imageMode === "upload" && imageFile) {
        finalImageUrl = await uploadImage(imageFile, imageTitle, trimmedSlug, token);
      }

      const endpoint = mode === "create"
        ? "/api/posts/create"
        : `/api/posts/${initialSlug}/update`;

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titulo: trimmedTitle,
          slug: trimmedSlug,
          body: trimmedBody,
          imagen_url: finalImageUrl || null,
          language,
          tag_ids: tags.map((tag) => tag.id),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save post");
      }

      const payload = await response.json();
      const nextSlug = payload?.data?.slug ?? trimmedSlug;
      showToast("Post saved successfully.", "success");
      window.setTimeout(() => {
        window.location.href = `/${language}/posts/${nextSlug}`;
      }, 500);
    } catch (error) {
      console.error(error);
      showToast("Failed to save post. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSlugInput = (value: string) => {
    setSlugTouched(true);
    setSlug(value);
  };

  const handleSlugBlur = () => {
    if (!slug.trim()) return;
    setSlug(generateSlug(slug));
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-8">
      <div class="space-y-2">
        <label class="text-sm font-semibold">Title *</label>
        <input
          type="text"
          value={title}
          onInput={(event) => setTitle((event.currentTarget as HTMLInputElement).value)}
          placeholder="Enter post title..."
          maxLength={200}
          required
          class="input-field"
        />
        {errors.title ? <p class="text-sm text-[var(--color-error)]">{errors.title}</p> : null}
      </div>

      <div class="space-y-2">
        <label class="text-sm font-semibold">Slug *</label>
        <input
          type="text"
          value={slug}
          onInput={(event) => handleSlugInput((event.currentTarget as HTMLInputElement).value)}
          onBlur={handleSlugBlur}
          placeholder="post-url-slug"
          required
          class="input-field"
        />
        <div class="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
          <span>Auto-generated from title, but editable</span>
          {slugChecking ? <span>Checking...</span> : null}
        </div>
        {errors.slug ? <p class="text-sm text-[var(--color-error)]">{errors.slug}</p> : null}
      </div>

      <div class="space-y-2">
        <label class="text-sm font-semibold">Language *</label>
        <select
          value={language}
          onChange={(event) => setLanguage((event.currentTarget as HTMLSelectElement).value)}
          class="input-field"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {LANGUAGE_NAMES[lang]}
            </option>
          ))}
        </select>
        {errors.language ? <p class="text-sm text-[var(--color-error)]">{errors.language}</p> : null}
      </div>

      <div class="space-y-2">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label class="text-sm font-semibold">Content * (Markdown)</label>
          <div class="flex gap-2">
            <button
              type="button"
              class={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                !previewMode
                  ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-light)] text-[var(--color-accent-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
              }`}
              onClick={() => setPreviewMode(false)}
            >
              Raw Markdown
            </button>
            <button
              type="button"
              class={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                previewMode
                  ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-light)] text-[var(--color-accent-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
              }`}
              onClick={() => setPreviewMode(true)}
            >
              Preview
            </button>
          </div>
        </div>

        {!previewMode ? (
          <textarea
            value={body}
            onInput={(event) => setBody((event.currentTarget as HTMLTextAreaElement).value)}
            placeholder="Write your post content in Markdown..."
            rows={18}
            maxLength={50000}
            required
            class="input-field min-h-[360px]"
          />
        ) : (
          <MarkdownPreview content={body} />
        )}

        <div class="text-xs text-[var(--color-text-tertiary)]">
          {body.length} characters (min 100, max 50,000)
        </div>
        {errors.body ? <p class="text-sm text-[var(--color-error)]">{errors.body}</p> : null}
      </div>

      <TagSelector
        title={title}
        body={body}
        selectedTags={tags}
        onChange={setTags}
      />

      <div class="space-y-3">
        <label class="text-sm font-semibold">Featured Image (Optional)</label>
        <div class="flex flex-wrap gap-4">
          <label class="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="imageMode"
              checked={imageMode === "url"}
              onChange={() => setImageMode("url")}
            />
            External URL
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="imageMode"
              checked={imageMode === "upload"}
              onChange={() => setImageMode("upload")}
            />
            Upload Image
          </label>
        </div>

        {imageMode === "url" ? (
          <div class="space-y-2">
            <input
              type="url"
              value={imageUrl}
              onInput={(event) => setImageUrl((event.currentTarget as HTMLInputElement).value)}
              placeholder="https://example.com/image.jpg"
              class="input-field"
            />
            {errors.imageUrl ? (
              <p class="text-sm text-[var(--color-error)]">{errors.imageUrl}</p>
            ) : null}
          </div>
        ) : (
          <div class="space-y-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                setImageFile((event.currentTarget as HTMLInputElement).files?.[0] ?? null)}
              class="input-field"
            />
            <input
              type="text"
              value={imageTitle}
              onInput={(event) => setImageTitle((event.currentTarget as HTMLInputElement).value)}
              placeholder="Image title (for alt text)"
              class="input-field"
            />
            <p class="text-xs text-[var(--color-text-tertiary)]">
              Max 5MB, JPG/PNG/WebP only. Uploads are optimized to WebP.
            </p>
            {errors.imageFile ? (
              <p class="text-sm text-[var(--color-error)]">{errors.imageFile}</p>
            ) : null}
            {errors.imageTitle ? (
              <p class="text-sm text-[var(--color-error)]">{errors.imageTitle}</p>
            ) : null}
          </div>
        )}
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isSubmitting}
          class="btn-primary w-full sm:w-auto"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
            ? "Create Post"
            : "Update Post"}
        </button>
        <a
          href={cancelHref ?? "/"}
          class="rounded-lg border border-[var(--color-border)] px-6 py-3 text-center font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)]"
        >
          Cancel
        </a>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={submitPost}
        title={mode === "create" ? "Publish post" : "Update post"}
        message={
          mode === "create"
            ? "Are you sure you want to publish this post? Please verify all content is correct."
            : "Are you sure you want to update this post?"
        }
        confirmText={mode === "create" ? "Publish" : "Update"}
        cancelText="Cancel"
        variant="info"
      />

      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </form>
  );
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function checkSlugExists(slug: string, language: string): Promise<boolean> {
  const response = await fetch(`${API_URL}/api/posts/${slug}/exists?language=${encodeURIComponent(language)}`);
  if (!response.ok) {
    throw new Error("Slug check failed");
  }
  const payload = await response.json();
  return Boolean(payload?.exists);
}

async function uploadImage(
  file: File,
  title: string,
  slug: string,
  token: string,
): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("title", title);
  formData.append("slug", slug);

  const response = await fetch(`${API_URL}/api/posts/upload-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) throw new Error("Image upload failed");

  const payload = await response.json();
  return payload?.data?.url as string;
}
