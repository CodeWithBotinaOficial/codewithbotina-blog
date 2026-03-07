import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { UploadCloud } from "lucide-preact";
import { getApiUrl } from "../../lib/env";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../hooks/useSession";
import MarkdownPreview from "./MarkdownPreview";
import TagSelector from "./TagSelector";
import ConfirmDialog from "../ui/ConfirmDialog";
import Toast from "../ui/Toast";
import { useToast } from "../../hooks/useToast";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from "../../lib/i18n";
import type { TagOption } from "./TagSelector";
import type { PostEditorLabels, TagSelectorLabels } from "../../lib/admin-editor";

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
  labels?: PostEditorLabels;
  tagLabels?: TagSelectorLabels;
}

const API_URL = getApiUrl();

export default function PostEditor({ mode, initialData, cancelHref, labels, tagLabels }: Props) {
  const copy: PostEditorLabels = labels ?? {
    accessChecking: "Checking admin access...",
    titleLabel: "Title",
    titlePlaceholder: "Enter post title...",
    slugLabel: "Slug",
    slugPlaceholder: "post-url-slug",
    slugHint: "Auto-generated from title, but editable",
    slugChecking: "Checking...",
    languageLabel: "Language",
    contentLabel: "Content (Markdown)",
    rawTab: "Raw Markdown",
    previewTab: "Preview",
    bodyPlaceholder: "Write your post content in Markdown...",
    characterCount: "{{count}} characters (min {{min}}, max {{max}})",
    featuredImageLabel: "Featured image (optional)",
    imageUrlLabel: "Image URL",
    imageUrlOption: "External URL",
    imageUploadOption: "Upload image",
    imageFileLabel: "Image file",
    imageTitleLabel: "Image title",
    imageUrlPlaceholder: "https://example.com/image.jpg",
    imageTitlePlaceholder: "Image title (for alt text)",
    imageHelp: "Max 5MB, JPG/PNG/WebP only. Uploads are optimized to WebP.",
    imageDropTitle: "Drag image here or click to browse",
    imageDropSubtitle: "JPG, PNG, or WebP up to 5MB",
    imageDropActive: "Drop image to upload",
    imageReplaceLabel: "Change image",
    imageFileName: "File",
    imageFileSize: "Size",
    submitCreate: "Create post",
    submitUpdate: "Update post",
    submitting: "Saving...",
    cancel: "Cancel",
    submitDisabledHint: "Complete all required fields to enable.",
    updateDisabledHint: "Make a change and ensure the form is valid to enable.",
    confirmCreateTitle: "Publish post",
    confirmCreateMessage:
      "Are you sure you want to publish this post? Please verify all content is correct.",
    confirmUpdateTitle: "Update post",
    confirmUpdateMessage: "Are you sure you want to update this post?",
    confirmCreateAction: "Publish",
    confirmUpdateAction: "Update",
    toastSuccessCreate: "Post created successfully!",
    toastSuccessUpdate: "Post updated successfully!",
    toastError: "Failed to save post. Please try again.",
    errors: {
      titleRequired: "Title is required",
      titleTooLong: "Title must be less than 200 characters",
      slugRequired: "Slug is required",
      slugInvalid: "Slug must be lowercase letters, numbers, and hyphens only",
      slugExists: "This slug already exists",
      slugCheckFailed: "Unable to validate slug. Try again.",
      languageInvalid: "Please select a valid language",
      bodyTooShort: "Content must be at least 100 characters",
      bodyTooLong: "Content must be less than 50,000 characters",
      imageUrlInvalid: "Image URL must be valid",
      imageFileRequired: "Please select an image to upload",
      imageFileType: "Image must be JPG, PNG, or WebP",
      imageFileSize: "Image must be under 5MB",
      imageTitleRequired: "Image title is required for uploads",
    },
  };

  const formatTemplate = (template: string, data: Record<string, string | number>) => {
    return Object.entries(data).reduce((acc, [key, value]) => {
      return acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), String(value));
    }, template);
  };
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
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const { toasts, showToast, removeToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const initialSlug = useMemo(() => initialData?.slug ?? "", [initialData?.slug]);
  const initialTitle = useMemo(() => initialData?.titulo ?? "", [initialData?.titulo]);
  const initialBody = useMemo(() => initialData?.body ?? "", [initialData?.body]);
  const initialImageUrl = useMemo(() => initialData?.imagen_url ?? "", [initialData?.imagen_url]);
  const initialLanguage = useMemo(() => initialData?.language ?? "es", [initialData?.language]);
  const initialTagIds = useMemo(
    () => (initialData?.tags ?? []).map((tag) => tag.id).sort().join(","),
    [initialData?.tags],
  );

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
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, slug: "" }));
      return;
    }
    if (trimmed === initialSlug) {
      setErrors((prev) => ({ ...prev, slug: "" }));
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSlugChecking(true);
        const exists = await checkSlugExists(trimmed, language);
        setErrors((prev) => ({
          ...prev,
          slug: exists ? copy.errors.slugExists : "",
        }));
      } catch (_error) {
        setErrors((prev) => ({
          ...prev,
          slug: copy.errors.slugCheckFailed,
        }));
      } finally {
        setSlugChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug, initialSlug, language]);

  useEffect(() => {
    if (imageMode === "upload") {
      setErrors((prev) => ({ ...prev, imageUrl: "" }));
      return;
    }

    if (imageFile) {
      setImageFile(null);
    }
    setImageTitle("");
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setImagePreviewUrl(null);
    setErrors((prev) => ({ ...prev, imageFile: "", imageTitle: "" }));
  }, [imageMode]);

  useEffect(() => {
    if (!imageFile) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setImagePreviewUrl(null);
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(imageFile);
    previewUrlRef.current = objectUrl;
    setImagePreviewUrl(objectUrl);
    return () => {
      if (previewUrlRef.current === objectUrl) {
        URL.revokeObjectURL(objectUrl);
        previewUrlRef.current = null;
      } else {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageFile]);

  const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (size >= 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${size} B`;
  };

  const getImageFileError = (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return copy.errors.imageFileType;
    }
    if (file.size > 5 * 1024 * 1024) {
      return copy.errors.imageFileSize;
    }
    return null;
  };

  const handleImageFileSelection = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setImagePreviewUrl(null);
      setErrors((prev) => ({ ...prev, imageFile: "" }));
      return;
    }

    const validationError = getImageFileError(file);
    if (validationError) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setImageFile(null);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setImagePreviewUrl(null);
      setErrors((prev) => ({ ...prev, imageFile: validationError }));
      return;
    }

    setErrors((prev) => ({ ...prev, imageFile: "" }));
    setImageFile(file);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    handleImageFileSelection(file);
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const currentTagIds = useMemo(
    () => tags.map((tag) => tag.id).sort().join(","),
    [tags],
  );

  const tagsChanged = useMemo(
    () => currentTagIds !== initialTagIds,
    [currentTagIds, initialTagIds],
  );

  const trimmedTitle = title.trim();
  const trimmedSlug = slug.trim();
  const trimmedBody = body.trim();
  const trimmedImageUrl = imageUrl.trim();
  const trimmedImageTitle = imageTitle.trim();

  const slugIsValid = Boolean(trimmedSlug) && /^[a-z0-9-]+$/.test(trimmedSlug);
  const languageIsValid = SUPPORTED_LANGUAGES.includes(language as "en" | "es");
  const bodyIsValid = trimmedBody.length >= 100 && trimmedBody.length <= 50000;
  const titleIsValid = trimmedTitle.length > 0 && trimmedTitle.length <= 200;

  const imageUrlIsValid = imageMode !== "url" || !trimmedImageUrl || (() => {
    try {
      new URL(trimmedImageUrl);
      return true;
    } catch (_error) {
      return false;
    }
  })();

  const imageFileIsValid = imageMode !== "upload"
    ? true
    : Boolean(imageFile) && !getImageFileError(imageFile as File) && Boolean(trimmedImageTitle);

  const isFormValid = titleIsValid
    && slugIsValid
    && !slugChecking
    && !errors.slug
    && languageIsValid
    && bodyIsValid
    && imageUrlIsValid
    && imageFileIsValid;

  const hasChanges = useMemo(() => {
    if (mode === "create") return true;
    const titleChanged = trimmedTitle !== initialTitle.trim();
    const slugChanged = trimmedSlug !== initialSlug.trim();
    const bodyChanged = trimmedBody !== initialBody.trim();
    const languageChanged = language !== initialLanguage;
    const tagsUpdated = tagsChanged;
    const imageUrlChanged = imageMode === "url"
      ? trimmedImageUrl !== (initialImageUrl ?? "").trim()
      : Boolean(imageFile);
    return titleChanged || slugChanged || bodyChanged || languageChanged || tagsUpdated || imageUrlChanged;
  }, [
    mode,
    trimmedTitle,
    trimmedSlug,
    trimmedBody,
    trimmedImageUrl,
    language,
    tagsChanged,
    imageMode,
    imageFile,
    initialTitle,
    initialSlug,
    initialBody,
    initialImageUrl,
    initialLanguage,
  ]);

  const submitDisabled = isSubmitting || !isFormValid || (mode === "edit" && !hasChanges);
  const submitHint = !isFormValid
    ? copy.submitDisabledHint
    : mode === "edit" && !hasChanges
    ? copy.updateDisabledHint
    : "";

  if (sessionLoading) {
    return (
      <div class="py-12 text-center text-[var(--color-text-secondary)]">
        {copy.accessChecking}
      </div>
    );
  }

  if (!isAdmin) return null;

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!trimmedTitle || trimmedTitle.length < 1) {
      newErrors.title = copy.errors.titleRequired;
    } else if (trimmedTitle.length > 200) {
      newErrors.title = copy.errors.titleTooLong;
    }

    if (!trimmedSlug) {
      newErrors.slug = copy.errors.slugRequired;
    } else if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      newErrors.slug = copy.errors.slugInvalid;
    }

    if (!SUPPORTED_LANGUAGES.includes(language as "en" | "es")) {
      newErrors.language = copy.errors.languageInvalid;
    }

    if (!trimmedBody || trimmedBody.length < 100) {
      newErrors.body = copy.errors.bodyTooShort;
    } else if (trimmedBody.length > 50000) {
      newErrors.body = copy.errors.bodyTooLong;
    }

    if (imageMode === "url" && trimmedImageUrl) {
      try {
        new URL(trimmedImageUrl);
      } catch (_error) {
        newErrors.imageUrl = copy.errors.imageUrlInvalid;
      }
    }

    if (imageMode === "upload") {
      if (!imageFile) {
        newErrors.imageFile = copy.errors.imageFileRequired;
      } else {
        const fileError = getImageFileError(imageFile);
        if (fileError) {
          newErrors.imageFile = fileError;
        }
      }

      if (!trimmedImageTitle) {
        newErrors.imageTitle = copy.errors.imageTitleRequired;
      }
    }

    if (errors.slug) {
      newErrors.slug = errors.slug;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (mode === "edit" && !hasChanges) {
      return;
    }

    setShowConfirm(true);
  };

  const submitPost = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

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

      const payload = {
        titulo: trimmedTitle,
        slug: trimmedSlug,
        body: trimmedBody,
        imagen_url: finalImageUrl || null,
        language,
        ...(mode === "create" || tagsChanged ? { tag_ids: tags.map((tag) => tag.id) } : {}),
      };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save post");
      }

      const payload = await response.json();
      const nextSlug = payload?.data?.slug ?? trimmedSlug;
      showToast(mode === "create" ? copy.toastSuccessCreate : copy.toastSuccessUpdate, "success");
      window.setTimeout(() => {
        window.location.href = `/${language}/posts/${nextSlug}`;
      }, 500);
    } catch (error) {
      console.error(error);
      showToast(copy.toastError, "error");
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
        <label class="text-sm font-semibold" htmlFor="post-title">{copy.titleLabel} *</label>
        <input
          type="text"
          id="post-title"
          name="title"
          value={title}
          onInput={(event) => setTitle((event.currentTarget as HTMLInputElement).value)}
          placeholder={copy.titlePlaceholder}
          maxLength={200}
          required
          class="input-field"
        />
        {errors.title ? <p class="text-sm text-[var(--color-error)]">{errors.title}</p> : null}
      </div>

      <div class="space-y-2">
        <label class="text-sm font-semibold" htmlFor="post-slug">{copy.slugLabel} *</label>
        <input
          type="text"
          id="post-slug"
          name="slug"
          value={slug}
          onInput={(event) => handleSlugInput((event.currentTarget as HTMLInputElement).value)}
          onBlur={handleSlugBlur}
          placeholder={copy.slugPlaceholder}
          required
          class="input-field"
        />
        <div class="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
          <span>{copy.slugHint}</span>
          {slugChecking ? <span>{copy.slugChecking}</span> : null}
        </div>
        {errors.slug ? <p class="text-sm text-[var(--color-error)]">{errors.slug}</p> : null}
      </div>

      <div class="space-y-2">
        <label class="text-sm font-semibold" htmlFor="post-language">{copy.languageLabel} *</label>
        <select
          id="post-language"
          name="language"
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
          <label class="text-sm font-semibold" htmlFor="post-body">{copy.contentLabel} *</label>
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
              {copy.rawTab}
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
              {copy.previewTab}
            </button>
          </div>
        </div>

        {!previewMode ? (
          <textarea
            value={body}
            onInput={(event) => setBody((event.currentTarget as HTMLTextAreaElement).value)}
            placeholder={copy.bodyPlaceholder}
            rows={18}
            maxLength={50000}
            required
            id="post-body"
            name="body"
            class="input-field min-h-[360px]"
          />
        ) : (
          <MarkdownPreview content={body} />
        )}

        <div class="text-xs text-[var(--color-text-tertiary)]">
          {formatTemplate(copy.characterCount, { count: body.length, min: 100, max: 50000 })}
        </div>
        {errors.body ? <p class="text-sm text-[var(--color-error)]">{errors.body}</p> : null}
      </div>

      <TagSelector
        title={title}
        body={body}
        selectedTags={tags}
        onChange={setTags}
        labels={tagLabels}
      />

      <div class="space-y-3">
        <label class="text-sm font-semibold">{copy.featuredImageLabel}</label>
        <div class="flex flex-wrap gap-4">
          <label class="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="imageMode"
              id="image-mode-url"
              checked={imageMode === "url"}
              onChange={() => setImageMode("url")}
            />
            {copy.imageUrlOption}
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="imageMode"
              id="image-mode-upload"
              checked={imageMode === "upload"}
              onChange={() => setImageMode("upload")}
            />
            {copy.imageUploadOption}
          </label>
        </div>

        {imageMode === "url" ? (
          <div class="space-y-2">
            <label class="text-sm font-semibold" htmlFor="post-image-url">
              {copy.imageUrlLabel}
            </label>
            <input
              type="url"
              id="post-image-url"
              name="imageUrl"
              value={imageUrl}
              onInput={(event) => setImageUrl((event.currentTarget as HTMLInputElement).value)}
              placeholder={copy.imageUrlPlaceholder}
              class="input-field"
            />
            {errors.imageUrl ? (
              <p class="text-sm text-[var(--color-error)]">{errors.imageUrl}</p>
            ) : null}
          </div>
        ) : (
          <div class="space-y-2">
            <label class="text-sm font-semibold" htmlFor="post-image-file">
              {copy.imageFileLabel}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              id="post-image-file"
              name="imageFile"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                handleImageFileSelection((event.currentTarget as HTMLInputElement).files?.[0] ?? null)}
              class="sr-only"
            />
            <button
              type="button"
              onClick={openFileDialog}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              aria-label={copy.imageDropTitle}
              class={`group relative w-full rounded-xl border-2 border-dashed px-6 py-8 transition-colors ${
                dragActive
                  ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-light)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg-subtle)] hover:border-[var(--color-accent-primary)]"
              }`}
            >
              {imagePreviewUrl ? (
                <div class="relative">
                  <img
                    src={imagePreviewUrl}
                    alt={copy.imageTitlePlaceholder}
                    class="w-full h-56 object-cover rounded-lg"
                  />
                  <div class="absolute inset-0 rounded-lg bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                    <span class="text-xs font-semibold text-white uppercase tracking-wide">
                      {copy.imageReplaceLabel}
                    </span>
                  </div>
                </div>
              ) : (
                <div class="flex flex-col items-center gap-2 text-center">
                  <UploadCloud className="h-8 w-8 text-[var(--color-accent-primary)]" />
                  <p class="text-sm font-semibold text-[var(--color-text-primary)]">
                    {dragActive ? copy.imageDropActive : copy.imageDropTitle}
                  </p>
                  <p class="text-xs text-[var(--color-text-tertiary)]">
                    {copy.imageDropSubtitle}
                  </p>
                </div>
              )}
            </button>
            {imageFile ? (
              <div class="text-xs text-[var(--color-text-tertiary)] flex flex-wrap gap-2">
                <span>{copy.imageFileName}: {imageFile.name}</span>
                <span>•</span>
                <span>{copy.imageFileSize}: {formatFileSize(imageFile.size)}</span>
              </div>
            ) : null}
            <label class="text-sm font-semibold" htmlFor="post-image-title">
              {copy.imageTitleLabel}
            </label>
            <input
              type="text"
              id="post-image-title"
              name="imageTitle"
              value={imageTitle}
              onInput={(event) => setImageTitle((event.currentTarget as HTMLInputElement).value)}
              placeholder={copy.imageTitlePlaceholder}
              class="input-field"
            />
            <p class="text-xs text-[var(--color-text-tertiary)]">
              {copy.imageHelp}
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
          disabled={submitDisabled}
          title={submitDisabled ? submitHint : undefined}
          class="btn-primary w-full sm:w-auto"
        >
          {isSubmitting ? (
            <span class="inline-flex items-center justify-center gap-2">
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
              {copy.submitting}
            </span>
          ) : mode === "create" ? (
            copy.submitCreate
          ) : (
            copy.submitUpdate
          )}
        </button>
        <a
          href={cancelHref ?? "/"}
          class="rounded-lg border border-[var(--color-border)] px-6 py-3 text-center font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)]"
        >
          {copy.cancel}
        </a>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={submitPost}
        title={mode === "create" ? copy.confirmCreateTitle : copy.confirmUpdateTitle}
        message={
          mode === "create"
            ? copy.confirmCreateMessage
            : copy.confirmUpdateMessage
        }
        confirmText={mode === "create" ? copy.confirmCreateAction : copy.confirmUpdateAction}
        cancelText={copy.cancel}
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
