import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Lock, ShieldX, X } from "lucide-preact";
import TranslationLinker, { type TranslationPost } from "./TranslationLinker";
import { getApiUrl } from "../../lib/env";
import { getAdminRoute } from "../../lib/admin-endpoints";
import { getAuthRoute } from "../../lib/auth-endpoints";
import { t, type SupportedLanguage, LANGUAGE_NAMES, SUPPORTED_LANGUAGES as UI_LANGS } from "../../lib/i18n";
import { getMarkdownFeatureLabels } from "../../lib/markdown-labels";
import { pickLinkedPostImageUrl } from "../../lib/admin-linked-image";
import { useSession } from "../../hooks/useSession";
import { useToast } from "../../hooks/useToast";
import ConfirmDialog from "../ui/ConfirmDialog";
import Toast from "../ui/Toast";
import MarkdownPreview from "./MarkdownPreview";
import TagSelector, { type TagOption } from "./TagSelector";
import ImageUploadPreview from "./ImageUploadPreview";
import StorageImageGallery, { type StorageImageItem } from "./StorageImageGallery";
import type { TagSelectorLabels } from "../../lib/admin-editor";

type LanguageCode = string;

type ImageMode = "upload" | "library" | "url";

export interface ImageValue {
  mode: ImageMode;
  url: string;
  file: File | null;
  title: string;
  libraryAppliedImage: StorageImageItem | null;
}

export interface MultiLangEditorPost {
  id?: string;
  language: LanguageCode;
  titulo: string;
  slug: string;
  body: string;
  imagen_url?: string | null;
  tags?: TagOption[];
}

interface Props {
  mode: "create" | "edit";
  uiLanguage: SupportedLanguage;
  initialData?: MultiLangEditorPost;
  cancelHref?: string;
  tagLabels?: TagSelectorLabels;
}

const API_URL = getApiUrl().replace(/\/$/, "");
const ADMIN_API = getAdminRoute("");

function generateSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function isUiLanguage(lang: string): lang is SupportedLanguage {
  return UI_LANGS.includes(lang as SupportedLanguage);
}

function defaultImageValue(initialUrl?: string | null): ImageValue {
  const url = String(initialUrl ?? "");
  return {
    mode: url ? "url" : "upload",
    url,
    file: null,
    title: "",
    libraryAppliedImage: url ? { name: url, url, size: null, created_at: null } : null,
  };
}

async function checkSlugExists(slug: string, language: string): Promise<boolean> {
  const response = await fetch(
    `${API_URL}/api/posts/${encodeURIComponent(slug)}/exists?language=${encodeURIComponent(language)}`,
  );
  if (!response.ok) throw new Error("Slug check failed");
  const payload = await response.json();
  return Boolean(payload?.exists);
}

async function uploadImage(file: File, title: string, slug: string): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("title", title);
  formData.append("slug", slug);
  const response = await fetch(`${ADMIN_API}/posts/upload-image`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!response.ok) throw new Error("Image upload failed");
  const payload = await response.json();
  return payload?.data?.url as string;
}

export default function MultiLanguagePostEditor({ mode, uiLanguage, initialData, cancelHref, tagLabels }: Props) {
  const { loading: sessionLoading, isAuthenticated, isAdmin } = useSession();
  const { toasts, showToast, removeToast } = useToast();

  const interfaceLanguage = uiLanguage;
  const locale = interfaceLanguage === "es" ? "es-ES" : "en-US";
  const markdownLabels = useMemo(() => getMarkdownFeatureLabels(interfaceLanguage), [interfaceLanguage]);

  const [signingIn, setSigningIn] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(5);

  const initialPrimary = String(initialData?.language ?? interfaceLanguage).trim().toLowerCase();
  const [primaryLanguage, setPrimaryLanguage] = useState<LanguageCode>(initialPrimary || "en");
  const [translationLanguages, setTranslationLanguages] = useState<LanguageCode[]>([]);
  const [useSharedTags, setUseSharedTags] = useState(false);
  const [sharedTags, setSharedTags] = useState<TagOption[]>([]);

  const [imageAppliesTo, setImageAppliesTo] = useState<"all" | "custom" | LanguageCode>("all");
  const [sharedImage, setSharedImage] = useState<ImageValue>(defaultImageValue(initialData?.imagen_url ?? null));
  const [sharedImageTouched, setSharedImageTouched] = useState(false);

  const [sections, setSections] = useState<Record<LanguageCode, MultiLangEditorPost>>(() => {
    const lang = initialPrimary || "en";
    return {
      [lang]: {
        id: initialData?.id,
        language: lang,
        titulo: initialData?.titulo ?? "",
        slug: initialData?.slug ?? "",
        body: initialData?.body ?? "",
        imagen_url: initialData?.imagen_url ?? null,
        tags: initialData?.tags ?? [],
      },
    };
  });

  const [imageByLanguage, setImageByLanguage] = useState<Record<LanguageCode, ImageValue>>(() => {
    const lang = initialPrimary || "en";
    return {
      [lang]: defaultImageValue(initialData?.imagen_url ?? null),
    };
  });

  const [previewByLanguage, setPreviewByLanguage] = useState<Record<LanguageCode, boolean>>({});
  const [slugTouched, setSlugTouched] = useState<Record<LanguageCode, boolean>>({});
  const [slugChecking, setSlugChecking] = useState<Record<LanguageCode, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const initialSlugsByPostIdRef = useRef<Record<string, string>>({});

  // Edit-mode translation loading
  const [linkedLoaded, setLinkedLoaded] = useState(false);
  const [unlinks, setUnlinks] = useState<Array<{ post_id: string; linked_post_id: string }>>([]);
  // Posts selected in the TranslationLinker (used to link/unlink translations on save).
  const [selectedLinkedPosts, setSelectedLinkedPosts] = useState<TranslationPost[]>([]);
  const [initialSelectedLinkedIds, setInitialSelectedLinkedIds] = useState<string[]>([]);

  const activeLanguages = useMemo(() => {
    const set = new Set<LanguageCode>();
    set.add(primaryLanguage);
    for (const lang of translationLanguages) set.add(lang);
    return Array.from(set);
  }, [primaryLanguage, translationLanguages]);

  const selectableTranslationLanguages = useMemo(() => {
    const primary = primaryLanguage;
    return UI_LANGS.filter((lang) => lang !== primary).map(String);
  }, [primaryLanguage]);

  const getLanguageName = (lang: string) => {
    const normalized = String(lang ?? "").trim().toLowerCase();
    if (isUiLanguage(normalized)) return LANGUAGE_NAMES[normalized];
    return normalized.toUpperCase();
  };

  const ensureSection = (lang: LanguageCode) => {
    setSections((prev) => {
      if (prev[lang]) return prev;
      return {
        ...prev,
        [lang]: { language: lang, titulo: "", slug: "", body: "", imagen_url: null, tags: [] },
      };
    });
    setImageByLanguage((prev) => {
      if (prev[lang]) return prev;
      return { ...prev, [lang]: defaultImageValue(null) };
    });
  };

  // If the user links an existing post and the shared image is still "empty",
  // auto-inherit the linked post image when the scope remains the default "all versions".
  useEffect(() => {
    if (imageAppliesTo !== "all") return;
    if (sharedImageTouched) return;
    if (sharedImage.file) return;
    if (sharedImage.url.trim()) return;
    const linkedUrl = pickLinkedPostImageUrl(selectedLinkedPosts);
    if (!linkedUrl) return;
    setSharedImage(defaultImageValue(linkedUrl));
  }, [
    imageAppliesTo,
    sharedImageTouched,
    sharedImage.file,
    sharedImage.url,
    selectedLinkedPosts,
  ]);

  useEffect(() => {
    for (const lang of activeLanguages) ensureSection(lang);
  }, [activeLanguages.join("|")]);

  // If primary language changes, make sure it's not selected as a translation.
  useEffect(() => {
    setTranslationLanguages((prev) => prev.filter((l) => l !== primaryLanguage));
  }, [primaryLanguage]);

  // Admin gating and redirect behavior copied from PostEditor (but keyed off interfaceLanguage).
  useEffect(() => {
    if (sessionLoading) return;
    if (!isAuthenticated) return;
    if (isAdmin) return;

    let seconds = 5;
    setRedirectSeconds(seconds);

    const timer = window.setInterval(() => {
      seconds -= 1;
      setRedirectSeconds(seconds);
      if (seconds <= 0) {
        window.clearInterval(timer);
        window.location.assign(`/${interfaceLanguage}/`);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [sessionLoading, isAuthenticated, isAdmin, interfaceLanguage]);

  const startSignIn = () => {
    if (signingIn) return;
    setSigningIn(true);
    const next = window.location.pathname;
    window.location.assign(getAuthRoute("/google", next));
  };

  // Load all linked translations on edit.
  useEffect(() => {
    if (mode !== "edit") return;
    const postId = String(initialData?.id ?? "").trim();
    if (!postId) return;
    if (linkedLoaded) return;
    if (sessionLoading || !isAdmin) return;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/posts/${encodeURIComponent(postId)}/translations`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const payload = await res.json();
        const translations = (payload?.data?.translations ?? []) as Array<{
          post_id: string;
          language: string;
          slug: string;
        }>;

        const others = translations
          .map((row) => ({
            id: String(row.post_id),
            language: String(row.language ?? "").trim().toLowerCase(),
            slug: String(row.slug ?? ""),
          }))
          .filter((row) => row.id && row.slug && row.language)
          .filter((row) => row.id !== postId);

        const loadedLanguages: string[] = [];
        const loadedLinkedPosts: TranslationPost[] = [];
        for (const row of others) {
          const details = await fetch(
            `${API_URL}/api/posts/${encodeURIComponent(row.slug)}?language=${encodeURIComponent(row.language)}`,
            { credentials: "include" },
          );
          if (!details.ok) continue;
          const postPayload = await details.json();
          const post = postPayload?.data ?? postPayload?.post ?? null;
          if (!post) continue;
          if (post?.id && post?.slug) {
            initialSlugsByPostIdRef.current[String(post.id)] = String(post.slug);
          }
          ensureSection(row.language);
          setSections((prev) => ({
            ...prev,
            [row.language]: {
              id: String(post.id),
              language: String(post.language ?? row.language).trim().toLowerCase(),
              titulo: String(post.titulo ?? ""),
              slug: String(post.slug ?? ""),
              body: String(post.body ?? ""),
              imagen_url: post.imagen_url ?? null,
              tags: Array.isArray(post.tags) ? post.tags : [],
            },
          }));
          setImageByLanguage((prev) => ({
            ...prev,
            [row.language]: defaultImageValue(post.imagen_url ?? null),
          }));
          loadedLanguages.push(row.language);
          // collect a shape compatible with TranslationLinker so the UI can show current links
          loadedLinkedPosts.push({
            post_id: String(post.id),
            language: String(post.language ?? row.language).trim().toLowerCase(),
            slug: String(post.slug ?? ""),
            titulo: String(post.titulo ?? ""),
            fecha: post.fecha ?? null,
            imagen_url: post.imagen_url ?? null,
          });
        }

        // Pre-populate translationLanguages based on loaded linked sections.
        const linkedLangs = loadedLanguages.filter((l) => l && l !== primaryLanguage);
        setTranslationLanguages(Array.from(new Set(linkedLangs)));
        if (loadedLinkedPosts.length > 0) {
          setSelectedLinkedPosts(loadedLinkedPosts);
          setInitialSelectedLinkedIds(loadedLinkedPosts.map((p) => p.post_id).sort());
        }
      } finally {
        setLinkedLoaded(true);
      }
    })();
  }, [mode, initialData?.id, linkedLoaded, sessionLoading, isAdmin, primaryLanguage]);

  useEffect(() => {
    if (mode !== "edit") return;
    const postId = String(initialData?.id ?? "").trim();
    if (!postId) return;
    if (initialData?.slug) {
      initialSlugsByPostIdRef.current[postId] = String(initialData.slug);
    }
  }, [mode, initialData?.id, initialData?.slug]);

  // Slug existence checks per language (debounced).
  useEffect(() => {
    const timers: number[] = [];
    for (const lang of activeLanguages) {
      const section = sections[lang];
      if (!section) continue;
      const slug = String(section.slug ?? "").trim();
      if (!slug) continue;
      const key = `slug:${lang}`;

      // Clear error if slug is unchanged in edit mode for that post.
      if (mode === "edit" && section.id && initialSlugsByPostIdRef.current[section.id] === slug) {
        setFieldErrors((prev) => ({ ...prev, [key]: "" }));
        continue;
      }

      const timer = window.setTimeout(async () => {
        try {
          setSlugChecking((prev) => ({ ...prev, [lang]: true }));
          const exists = await checkSlugExists(slug, lang);
          setFieldErrors((prev) => ({ ...prev, [key]: exists ? t(interfaceLanguage, "errors.slugExists", "admin") : "" }));
        } catch (_e) {
          setFieldErrors((prev) => ({ ...prev, [key]: t(interfaceLanguage, "errors.slugCheckFailed", "admin") }));
        } finally {
          setSlugChecking((prev) => ({ ...prev, [lang]: false }));
        }
      }, 450);

      timers.push(timer);
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [activeLanguages.join("|"), JSON.stringify(Object.fromEntries(activeLanguages.map((l) => [l, sections[l]?.slug ?? ""]))), mode, interfaceLanguage]);

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    const requiredTitle = t(interfaceLanguage, "errors.titleRequired", "admin");
    const titleTooLong = t(interfaceLanguage, "errors.titleTooLong", "admin");
    const slugReq = t(interfaceLanguage, "errors.slugRequired", "admin");
    const slugInvalid = t(interfaceLanguage, "errors.slugInvalid", "admin");
    const bodyTooShort = t(interfaceLanguage, "errors.bodyTooShort", "admin");
    const bodyTooLong = t(interfaceLanguage, "errors.bodyTooLong", "admin");

    for (const lang of activeLanguages) {
      const s = sections[lang];
      if (!s) continue;
      const title = s.titulo.trim();
      const slug = s.slug.trim();
      const body = s.body.trim();

      if (!title) nextErrors[`title:${lang}`] = requiredTitle;
      else if (title.length > 200) nextErrors[`title:${lang}`] = titleTooLong;

      if (!slug) nextErrors[`slug:${lang}`] = slugReq;
      else if (!/^[a-z0-9-]+$/.test(slug)) nextErrors[`slug:${lang}`] = slugInvalid;

      if (body.length < 100) nextErrors[`body:${lang}`] = bodyTooShort;
      else if (body.length > 50000) nextErrors[`body:${lang}`] = bodyTooLong;

      const slugError = fieldErrors[`slug:${lang}`];
      if (slugError) nextErrors[`slug:${lang}`] = slugError;
    }

    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const submitDisabled = useMemo(() => {
    if (isSubmitting) return true;
    if (activeLanguages.length < 1) return true;
    for (const lang of activeLanguages) {
      if (slugChecking[lang]) return true;
      if (fieldErrors[`slug:${lang}`]) return true;
      const s = sections[lang];
      if (!s) return true;
      if (!s.titulo.trim() || !s.slug.trim() || s.body.trim().length < 100) return true;
    }
    return false;
  }, [isSubmitting, activeLanguages.join("|"), JSON.stringify(sections), JSON.stringify(slugChecking), JSON.stringify(fieldErrors)]);

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    if (!validate()) return;
    setShowConfirm(true);
  };

  const getTagIdsForLanguage = (lang: LanguageCode): string[] => {
    if (useSharedTags) return sharedTags.map((t) => t.id);
    return (sections[lang]?.tags ?? []).map((t) => t.id);
  };

  const getImageValueForLanguage = (lang: LanguageCode): ImageValue => {
    if (imageAppliesTo === "all") return sharedImage;
    if (imageAppliesTo === "custom") return imageByLanguage[lang] ?? defaultImageValue(null);
    if (imageAppliesTo === lang) return imageByLanguage[lang] ?? defaultImageValue(null);
    return imageByLanguage[lang] ?? defaultImageValue(null);
  };

  const resolveFinalImageUrl = async (lang: LanguageCode): Promise<string | null> => {
    const value = getImageValueForLanguage(lang);
    const trimmedUrl = value.url.trim();
    if (value.mode === "upload") {
      if (!value.file) return null;
      const title = value.title.trim();
      if (!title) return null;
      const slug = sections[lang]?.slug?.trim() ?? "";
      if (!slug) return null;
      return await uploadImage(value.file, title, slug);
    }
    return trimmedUrl ? trimmedUrl : null;
  };

  const syncTranslations = async (args: {
    postId: string;
    mode: "create" | "edit";
    selected: string[];
    initial: string[];
  }): Promise<void> => {
    const postId = String(args.postId ?? "").trim();
    if (!postId) return;

    const uniqueSelected = Array.from(
      new Set((args.selected ?? []).map((id) => String(id).trim()).filter(Boolean)),
    );
    const uniqueInitial = Array.from(
      new Set((args.initial ?? []).map((id) => String(id).trim()).filter(Boolean)),
    );

    const postLink = async (linkedIds: string[]) => {
      const res = await fetch(`${ADMIN_API}/posts/${encodeURIComponent(postId)}/translations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ linked_post_ids: linkedIds }),
      });
      if (!res.ok) throw new Error("Failed to link translations");
    };

    const unlinkOne = async (linkedPostId: string) => {
      const id = String(linkedPostId ?? "").trim();
      if (!id) return;
      const res = await fetch(
        `${ADMIN_API}/posts/${encodeURIComponent(postId)}/translations/${encodeURIComponent(id)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to unlink translation");
    };

    if (args.mode === "create") {
      if (uniqueSelected.length === 0) return;
      await postLink(uniqueSelected);
      return;
    }

    // Edit mode
    if (uniqueSelected.length === 0) {
      if (uniqueInitial.length === 0) return;
      await postLink([]);
      return;
    }

    const initialSet = new Set(uniqueInitial);
    const selectedSet = new Set(uniqueSelected);
    const toAdd = uniqueSelected.filter((id) => !initialSet.has(id));
    const toRemove = uniqueInitial.filter((id) => !selectedSet.has(id));

    if (toAdd.length > 0) {
      await postLink(toAdd);
    }
    for (const id of toRemove) {
      await unlinkOne(id);
    }
  };

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const finalImageUrlByLanguage: Record<LanguageCode, string | null> = {};
      if (imageAppliesTo === "all") {
        let sharedFinal: string | null = null;
        const trimmedUrl = sharedImage.url.trim();
        if (sharedImage.mode === "upload") {
          const slug = sections[primaryLanguage]?.slug?.trim() ?? "";
          if (sharedImage.file && sharedImage.title.trim() && slug) {
            sharedFinal = await uploadImage(sharedImage.file, sharedImage.title.trim(), slug);
          }
        } else {
          sharedFinal = trimmedUrl ? trimmedUrl : null;
        }
        for (const lang of activeLanguages) finalImageUrlByLanguage[lang] = sharedFinal;
      } else {
        for (const lang of activeLanguages) {
          finalImageUrlByLanguage[lang] = await resolveFinalImageUrl(lang);
        }
      }

      if (mode === "create") {
        const posts = activeLanguages.map((lang) => ({
          titulo: sections[lang].titulo.trim(),
          slug: sections[lang].slug.trim(),
          body: sections[lang].body.trim(),
          imagen_url: finalImageUrlByLanguage[lang],
          language: lang,
          tag_ids: getTagIdsForLanguage(lang),
        }));

        const res = await fetch(`${ADMIN_API}/posts/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(posts.length > 1 ? { posts } : posts[0]),
        });
        if (!res.ok) throw new Error("Failed to create posts");
        const payload = await res.json();
        const createdCount = Array.isArray(payload?.data?.posts) ? payload.data.posts.length : 1;
        showToast(t(interfaceLanguage, "multiLang.postsCreated", "admin", { count: createdCount }), "success");

        // If admin selected existing posts to link, attempt to link them to the
        // newly-created primary post. The create endpoint returns created posts
        // (and a translation_group_id for batch creates) – prefer the created
        // post whose language matches the primary language as the base for linking.
        try {
          const createdPosts = Array.isArray(payload?.data?.posts)
            ? payload.data.posts
            : payload?.data
            ? [payload.data]
            : [];
          const primaryCreated = createdPosts.find((p: any) => p.language === primaryLanguage) ?? createdPosts[0];
          const primaryId = primaryCreated?.id as string | undefined;
          await syncTranslations({
            postId: primaryId ?? "",
            mode: "create",
            selected: selectedLinkedPosts.map((p) => p.post_id),
            initial: [],
          });
        } catch (_e) {
          // Non-fatal: linking failures shouldn't block the redirect. Errors are
          // surfaced in server logs and the admin can retry from the edit page.
        }

        const nextSlug = posts.find((p) => p.language === primaryLanguage)?.slug ?? posts[0].slug;
        window.setTimeout(() => {
          window.location.assign(`/${primaryLanguage}/posts/${nextSlug}`);
        }, 500);
        return;
      }

      // edit mode: bulk update + create new translations + unlink selected translations
      const basePostId = String(initialData?.id ?? "").trim();
      if (!basePostId) throw new Error("Missing base post id");

      const updates = activeLanguages
        .map((lang) => {
          const section = sections[lang];
          if (!section?.id) return null;
          return {
            post_id: section.id,
            post: {
              titulo: section.titulo.trim(),
              slug: section.slug.trim(),
              body: section.body.trim(),
              imagen_url: finalImageUrlByLanguage[lang],
              language: lang,
              tag_ids: getTagIdsForLanguage(lang),
            },
          };
        })
        .filter(Boolean);

      const creates = activeLanguages
        .map((lang) => {
          const section = sections[lang];
          if (section?.id) return null;
          return {
            base_post_id: basePostId,
            post: {
              titulo: section.titulo.trim(),
              slug: section.slug.trim(),
              body: section.body.trim(),
              imagen_url: finalImageUrlByLanguage[lang],
              language: lang,
              tag_ids: getTagIdsForLanguage(lang),
            },
          };
        })
        .filter(Boolean);

      const res = await fetch(`${ADMIN_API}/posts/bulk-update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          updates,
          creates,
          unlinks,
        }),
      });
      if (!res.ok) throw new Error("Failed to update posts");
      // Sync TranslationLinker selection (link + unlink) after the content update.
      try {
        await syncTranslations({
          postId: basePostId,
          mode: "edit",
          selected: (selectedLinkedPosts ?? []).map((p) => p.post_id),
          initial: initialSelectedLinkedIds,
        });
      } catch (_e) {
        // Non-fatal; proceed with redirect.
      }

      const nextSlug = sections[primaryLanguage]?.slug ?? initialData?.slug ?? "";
      showToast(t(interfaceLanguage, "multiLang.postsUpdated", "admin", { count: updates.length }), "success");

      window.setTimeout(() => {
        window.location.assign(`/${primaryLanguage}/posts/${nextSlug}`);
      }, 500);
    } catch (error) {
      console.error(error);
      showToast(t(interfaceLanguage, "editor.toastError", "admin"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionLoading) {
    return (
      <div class="flex items-center justify-center py-12 gap-3 text-[var(--color-text-tertiary)]">
        <Lock className="h-5 w-5 animate-pulse" />
        <span>{t(interfaceLanguage, "editor.accessChecking", "admin")}</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div class="py-12">
        <div class="mx-auto max-w-xl rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-neutral-100)] text-[var(--color-text-secondary)]">
            <Lock size={22} />
          </div>
          <h2 class="mt-4 text-center text-xl font-bold">{t(interfaceLanguage, "accessControl.signInRequired", "admin")}</h2>
          <p class="mt-2 text-center text-[var(--color-text-secondary)]">
            {t(interfaceLanguage, "accessControl.signInDescription", "admin")}
          </p>
          <div class="mt-6 flex justify-center">
            <button class="btn-auth" type="button" onClick={startSignIn} disabled={signingIn}>
              {t(interfaceLanguage, "accessControl.signInButton", "admin")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    const seconds = Math.max(0, redirectSeconds);
    const progress = Math.min(100, Math.max(0, ((5 - seconds) / 5) * 100));
    return (
      <div class="py-12">
        <div class="mx-auto max-w-xl rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:p-8">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-neutral-100)] text-[var(--color-warning)]">
            <ShieldX size={22} />
          </div>
          <div class="mt-4 text-center">
            <div class="inline-flex items-center gap-2 rounded-full bg-[var(--color-neutral-100)] px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
              {t(interfaceLanguage, "accessControl.adminOnly", "admin")}
            </div>
          </div>
          <h2 class="mt-4 text-center text-xl font-bold">{t(interfaceLanguage, "accessControl.accessDenied", "admin")}</h2>
          <p class="mt-2 text-center text-[var(--color-text-secondary)]">
            {t(interfaceLanguage, "accessControl.notAuthorized", "admin")}
          </p>
          <p class="mt-6 text-center text-sm font-semibold text-[var(--color-text-primary)]">
            {t(interfaceLanguage, "accessControl.redirecting", "admin", { seconds })}
          </p>
          <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--color-neutral-100)]">
            <div
              class="h-full bg-[var(--color-warning)] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p class="mt-4 text-center text-sm text-[var(--color-text-tertiary)]">
            <a class="underline" href={`/${interfaceLanguage}/`}>/{interfaceLanguage}/</a>
          </p>
        </div>
      </div>
    );
  }

  const translationsTitle = t(interfaceLanguage, "multiLang.translations", "admin");
  const translationsDesc = t(interfaceLanguage, "multiLang.translationsDescription", "admin");
  const translationLinkerLabels = {
    // Avoid confusing this with the "Translations" section above (multi-language creation UI).
    title: t(interfaceLanguage, "multiLang.linkedVersions", "admin"),
    empty: t(interfaceLanguage, "editor.translationsEmpty", "admin"),
    searchPlaceholder: t(interfaceLanguage, "editor.translationsSearchPlaceholder", "admin"),
    searching: t(interfaceLanguage, "editor.translationsSearching", "admin"),
    noResults: t(interfaceLanguage, "editor.translationsNoResults", "admin"),
    removeLabel: t(interfaceLanguage, "editor.translationsRemoveLabel", "admin"),
    languageLabel: t(interfaceLanguage, "editor.translationsLanguageLabel", "admin"),
    dateLabel: t(interfaceLanguage, "editor.translationsDateLabel", "admin"),
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-8">
      <section class="rounded-2xl border border-[var(--color-border)] bg-white p-5 space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold tracking-wide uppercase text-[var(--color-text-tertiary)]">
              {translationsTitle}
            </h2>
            <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
              {translationsDesc}
            </p>
            <p class="mt-2 text-xs text-[var(--color-text-tertiary)]">
              {t(interfaceLanguage, "multiLang.primaryLanguage", "admin")}: <span class="font-semibold">{getLanguageName(primaryLanguage)}</span>
            </p>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-semibold" htmlFor="primary-language">
              {t(interfaceLanguage, "multiLang.primaryLanguage", "admin")} *
            </label>
            <select
              id="primary-language"
              class="input-field"
              value={primaryLanguage}
              disabled={mode === "edit"} // changing language breaks translation integrity; allow in single-language editor instead
              onChange={(e) => setPrimaryLanguage((e.currentTarget as HTMLSelectElement).value)}
            >
              {UI_LANGS.map((lang) => (
                <option key={lang} value={lang}>{LANGUAGE_NAMES[lang]}</option>
              ))}
            </select>
            {mode === "edit" ? (
              <p class="text-xs text-[var(--color-text-tertiary)]">
                {t(interfaceLanguage, "multiLang.currentPost", "admin")}
              </p>
            ) : null}
          </div>

          <div class="space-y-2">
            <div class="text-sm font-semibold">{translationsTitle}</div>
            {selectableTranslationLanguages.length === 0 ? (
              <p class="text-xs text-[var(--color-text-tertiary)]">{t(interfaceLanguage, "multiLang.noTranslations", "admin")}</p>
            ) : (
              <div class="grid grid-cols-2 gap-2">
                {selectableTranslationLanguages.map((lang) => {
                  const checked = translationLanguages.includes(lang);
                  return (
                    <label key={lang} class="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isSubmitting}
                        onChange={(e) => {
                          const next = (e.currentTarget as HTMLInputElement).checked;
                          if (mode === "edit" && !next) {
                            const section = sections[lang];
                            const basePostId = String(initialData?.id ?? "").trim();
                            if (section?.id && basePostId) {
                              const confirm = window.confirm(
                                t(interfaceLanguage, "multiLang.confirmUnlink", "admin"),
                              );
                              if (!confirm) return;
                              setUnlinks((prev) => [...prev, { post_id: basePostId, linked_post_id: section.id! }]);
                            }
                          }

                          if (next) ensureSection(lang);

                          setTranslationLanguages((prev) => {
                            const set = new Set(prev);
                            if (next) set.add(lang);
                            else set.delete(lang);
                            return Array.from(set);
                          });
                        }}
                      />
                      {getLanguageName(lang)}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-[var(--color-border)] bg-white p-5 space-y-4">
        <TranslationLinker
          currentPostId={mode === "edit" ? String(initialData?.id ?? "") : undefined}
          currentPostLanguage={primaryLanguage}
          selected={selectedLinkedPosts}
          onChange={setSelectedLinkedPosts}
          labels={translationLinkerLabels}
          uiLocale={interfaceLanguage === "es" ? "es-ES" : "en-US"}
          disabled={isSubmitting}
        />
      </section>

      <section class="rounded-2xl border border-[var(--color-border)] bg-white p-5 space-y-4">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-sm font-semibold tracking-wide uppercase text-[var(--color-text-tertiary)]">
            {t(interfaceLanguage, "tags.title", "admin")}
          </h2>
          <label class="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={useSharedTags}
              disabled={isSubmitting}
              onChange={(e) => {
                const next = (e.currentTarget as HTMLInputElement).checked;
                setUseSharedTags(next);
                if (next) {
                  const primaryTags = sections[primaryLanguage]?.tags ?? [];
                  setSharedTags(primaryTags);
                }
              }}
            />
            {t(interfaceLanguage, "multiLang.sameTagsForAll", "admin")}
          </label>
        </div>

        {useSharedTags ? (
          <TagSelector
            title={sections[primaryLanguage]?.titulo ?? ""}
            body={sections[primaryLanguage]?.body ?? ""}
            selectedTags={sharedTags}
            onChange={setSharedTags}
            labels={tagLabels}
            inputId="post-tags-shared"
          />
        ) : null}
      </section>

      <section class="rounded-2xl border border-[var(--color-border)] bg-white p-5 space-y-4">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-sm font-semibold tracking-wide uppercase text-[var(--color-text-tertiary)]">
            {t(interfaceLanguage, "editor.featuredImageLabel", "admin")}
          </h2>
          <div class="flex items-center gap-2">
            <label class="text-sm font-semibold" htmlFor="image-applies-to">
              {t(interfaceLanguage, "multiLang.imageAppliesTo", "admin")}
            </label>
            <select
              id="image-applies-to"
              class="input-field !py-2 !px-3 !text-sm"
              value={imageAppliesTo}
              disabled={isSubmitting}
              onChange={(e) => {
                const v = (e.currentTarget as HTMLSelectElement).value;
                setImageAppliesTo(v as any);
              }}
            >
              <option value="all">{t(interfaceLanguage, "multiLang.allVersions", "admin")}</option>
              {activeLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {t(interfaceLanguage, "multiLang.onlyLanguage", "admin", { language: getLanguageName(lang) })}
                </option>
              ))}
              <option value="custom">{t(interfaceLanguage, "multiLang.customPerLanguage", "admin")}</option>
            </select>
          </div>
        </div>

        {imageAppliesTo === "all" ? (
          <FeaturedImagePicker
            langLabel={t(interfaceLanguage, "multiLang.allVersions", "admin")}
            uiLanguage={interfaceLanguage}
            value={sharedImage}
            onChange={(next) => {
              setSharedImageTouched(true);
              setSharedImage(next);
            }}
            disabled={isSubmitting}
            locale={locale}
          />
        ) : imageAppliesTo === "custom" ? (
          <div class="space-y-6">
            {activeLanguages.map((lang) => (
              <FeaturedImagePicker
                key={lang}
                langLabel={getLanguageName(lang)}
                uiLanguage={interfaceLanguage}
                value={imageByLanguage[lang] ?? defaultImageValue(sections[lang]?.imagen_url ?? null)}
                onChange={(next) => setImageByLanguage((prev) => ({ ...prev, [lang]: next }))}
                disabled={isSubmitting}
                locale={locale}
              />
            ))}
          </div>
        ) : (
          <FeaturedImagePicker
            langLabel={getLanguageName(imageAppliesTo)}
            uiLanguage={interfaceLanguage}
            value={imageByLanguage[imageAppliesTo] ?? defaultImageValue(sections[imageAppliesTo]?.imagen_url ?? null)}
            onChange={(next) => setImageByLanguage((prev) => ({ ...prev, [imageAppliesTo]: next }))}
            disabled={isSubmitting}
            locale={locale}
          />
        )}
      </section>

      <div class="space-y-6">
        {activeLanguages.map((lang) => {
          const isPrimary = lang === primaryLanguage;
          const section = sections[lang];
          if (!section) return null;
          const preview = Boolean(previewByLanguage[lang]);

          return (
            <section
              key={lang}
              class={`rounded-2xl border bg-white p-5 space-y-5 ${
                isPrimary ? "border-[var(--color-accent-primary)]" : "border-[var(--color-border)]"
              }`}
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <h2 class="text-lg font-bold text-[var(--color-text-primary)]">
                      {getLanguageName(lang)}
                    </h2>
                    {isPrimary ? (
                      <span class="rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-xs font-semibold text-[var(--color-accent-primary)]">
                        {t(interfaceLanguage, "multiLang.primaryLanguage", "admin")}
                      </span>
                    ) : (
                      <span class="rounded-full bg-[var(--color-bg-subtle)] px-3 py-1 text-xs font-semibold text-[var(--color-text-tertiary)]">
                        {t(interfaceLanguage, "multiLang.translations", "admin")}
                      </span>
                    )}
                  </div>
                </div>

                {mode === "edit" && !isPrimary && section.id ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-error)] hover:text-[var(--color-error)] transition disabled:opacity-50"
                    onClick={() => {
                      const confirm = window.confirm(t(interfaceLanguage, "multiLang.confirmUnlink", "admin"));
                      if (!confirm) return;
                      const basePostId = String(initialData?.id ?? "").trim();
                      if (!basePostId || !section.id) return;
                      setUnlinks((prev) => [...prev, { post_id: basePostId, linked_post_id: section.id! }]);
                      setTranslationLanguages((prev) => prev.filter((l) => l !== lang));
                    }}
                  >
                    <X className="h-4 w-4" />
                    {t(interfaceLanguage, "multiLang.unlinkTranslation", "admin")}
                  </button>
                ) : null}
              </div>

              <div class="grid gap-5 md:grid-cols-2">
                <div class="space-y-2">
                  <label class="text-sm font-semibold" htmlFor={`title-${lang}`}>
                    {t(interfaceLanguage, "multiLang.titleIn", "admin", { language: getLanguageName(lang) })} *
                  </label>
                  <input
                    id={`title-${lang}`}
                    class="input-field"
                    type="text"
                    value={section.titulo}
                    maxLength={200}
                    disabled={isSubmitting}
                    onInput={(e) => {
                      const v = (e.currentTarget as HTMLInputElement).value;
                      setSections((prev) => {
                        const nextSlug = slugTouched[lang] ? prev[lang].slug : generateSlug(v);
                        return { ...prev, [lang]: { ...prev[lang], titulo: v, slug: nextSlug } };
                      });
                    }}
                  />
                  {fieldErrors[`title:${lang}`] ? (
                    <p class="text-sm text-[var(--color-error)]">{fieldErrors[`title:${lang}`]}</p>
                  ) : null}
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-semibold" htmlFor={`slug-${lang}`}>
                    {t(interfaceLanguage, "multiLang.slugIn", "admin", { language: getLanguageName(lang) })} *
                  </label>
                  <input
                    id={`slug-${lang}`}
                    class="input-field"
                    type="text"
                    value={section.slug}
                    disabled={isSubmitting}
                    onInput={(e) => {
                      setSlugTouched((prev) => ({ ...prev, [lang]: true }));
                      const v = (e.currentTarget as HTMLInputElement).value;
                      setSections((prev) => ({ ...prev, [lang]: { ...prev[lang], slug: v } }));
                    }}
                    onBlur={() => {
                      setSections((prev) => ({ ...prev, [lang]: { ...prev[lang], slug: generateSlug(prev[lang].slug) } }));
                    }}
                  />
                  <div class="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
                    <span>{t(interfaceLanguage, "editor.slugHint", "admin")}</span>
                    {slugChecking[lang] ? <span>{t(interfaceLanguage, "editor.slugChecking", "admin")}</span> : null}
                  </div>
                  {fieldErrors[`slug:${lang}`] ? (
                    <p class="text-sm text-[var(--color-error)]">{fieldErrors[`slug:${lang}`]}</p>
                  ) : null}
                </div>
              </div>

              <div class="space-y-2">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label class="text-sm font-semibold" htmlFor={`body-${lang}`}>
                    {t(interfaceLanguage, "multiLang.contentIn", "admin", { language: getLanguageName(lang) })} *
                  </label>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                        !preview
                          ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-light)] text-[var(--color-accent-primary)]"
                          : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                      }`}
                      onClick={() => setPreviewByLanguage((prev) => ({ ...prev, [lang]: false }))}
                    >
                      {t(interfaceLanguage, "editor.rawTab", "admin")}
                    </button>
                    <button
                      type="button"
                      class={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                        preview
                          ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-light)] text-[var(--color-accent-primary)]"
                          : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                      }`}
                      onClick={() => setPreviewByLanguage((prev) => ({ ...prev, [lang]: true }))}
                    >
                      {t(interfaceLanguage, "editor.previewTab", "admin")}
                    </button>
                  </div>
                </div>

                {!preview ? (
                  <textarea
                    id={`body-${lang}`}
                    class="input-field min-h-[320px]"
                    rows={16}
                    value={section.body}
                    disabled={isSubmitting}
                    onInput={(e) => {
                      const v = (e.currentTarget as HTMLTextAreaElement).value;
                      setSections((prev) => ({ ...prev, [lang]: { ...prev[lang], body: v } }));
                    }}
                  />
                ) : (
                  <MarkdownPreview
                    content={section.body}
                    language={interfaceLanguage}
                    labels={markdownLabels}
                    title={section.titulo}
                  />
                )}

                <div class="text-xs text-[var(--color-text-tertiary)]">
                  {t(interfaceLanguage, "editor.characterCount", "admin", {
                    count: section.body.length,
                    min: 100,
                    max: 50000,
                  })}
                </div>
                {fieldErrors[`body:${lang}`] ? (
                  <p class="text-sm text-[var(--color-error)]">{fieldErrors[`body:${lang}`]}</p>
                ) : null}
              </div>

              {!useSharedTags ? (
                <TagSelector
                  title={section.titulo}
                  body={section.body}
                  selectedTags={section.tags ?? []}
                  onChange={(next) => setSections((prev) => ({ ...prev, [lang]: { ...prev[lang], tags: next } }))}
                  labels={tagLabels}
                  inputId={`post-tags-${lang}`}
                />
              ) : null}
            </section>
          );
        })}
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={submitDisabled}
          class="btn-primary w-full sm:w-auto"
        >
          {isSubmitting ? (
            <span class="inline-flex items-center justify-center gap-2">
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
              {t(interfaceLanguage, "editor.submitting", "admin")}
            </span>
          ) : mode === "create" ? (
            t(interfaceLanguage, "editor.submitCreate", "admin")
          ) : (
            t(interfaceLanguage, "editor.submitUpdate", "admin")
          )}
        </button>
        <a
          href={cancelHref ?? "/"}
          class="rounded-lg border border-[var(--color-border)] px-6 py-3 text-center font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)]"
        >
          {t(interfaceLanguage, "editor.cancel", "admin")}
        </a>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={submit}
        title={mode === "create" ? t(interfaceLanguage, "editor.confirmCreateTitle", "admin") : t(interfaceLanguage, "editor.confirmUpdateTitle", "admin")}
        message={mode === "create" ? t(interfaceLanguage, "editor.confirmCreateMessage", "admin") : t(interfaceLanguage, "editor.confirmUpdateMessage", "admin")}
        confirmText={mode === "create" ? t(interfaceLanguage, "editor.confirmCreateAction", "admin") : t(interfaceLanguage, "editor.confirmUpdateAction", "admin")}
        cancelText={t(interfaceLanguage, "editor.cancel", "admin")}
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

function FeaturedImagePicker(props: {
  langLabel: string;
  uiLanguage: SupportedLanguage;
  value: ImageValue;
  onChange: (_next: ImageValue) => void;
  disabled?: boolean;
  locale: string;
}) {
  const { langLabel, uiLanguage, value, onChange, disabled, locale } = props;
  const idSuffix = useMemo(() => generateSlug(langLabel || "image"), [langLabel]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!value.file) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewUrl(null);
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const objectUrl = URL.createObjectURL(value.file);
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      if (previewUrlRef.current === objectUrl) previewUrlRef.current = null;
    };
  }, [value.file]);

  const imageUploadLabels = useMemo(() => ({
    dropTitle: t(uiLanguage, "editor.imageDropTitle", "admin"),
    dropSubtitle: t(uiLanguage, "editor.imageDropSubtitle", "admin"),
    dropActive: t(uiLanguage, "editor.imageDropActive", "admin"),
    changeLabel: t(uiLanguage, "editor.imageReplaceLabel", "admin"),
    removeLabel: t(uiLanguage, "editor.imageRemoveLabel", "admin"),
    fileNameLabel: t(uiLanguage, "editor.imageFileName", "admin"),
    fileSizeLabel: t(uiLanguage, "editor.imageFileSize", "admin"),
    dimensionsLabel: t(uiLanguage, "editor.imageDimensions", "admin"),
  }), [uiLanguage]);

  const storageLabels = useMemo(() => ({
    uploadNew: t(uiLanguage, "editor.imageSection.uploadNew", "admin"),
    selectFromLibrary: t(uiLanguage, "editor.imageSection.selectFromLibrary", "admin"),
    externalUrl: t(uiLanguage, "editor.imageSection.externalUrl", "admin"),
    useThisImage: t(uiLanguage, "editor.imageSection.useThisImage", "admin"),
    cancel: t(uiLanguage, "editor.imageSection.cancel", "admin"),
    noImages: t(uiLanguage, "editor.imageSection.noImages", "admin"),
    filenameReadOnly: t(uiLanguage, "editor.imageSection.filenameReadOnly", "admin"),
    searchImages: t(uiLanguage, "editor.imageSection.searchImages", "admin"),
    selectedImage: t(uiLanguage, "editor.imageSection.selectedImage", "admin"),
    pickHint: t(uiLanguage, "editor.imageSection.pickHint", "admin"),
    fileInfo: t(uiLanguage, "editor.imageSection.fileInfo", "admin"),
    filename: t(uiLanguage, "editor.imageSection.filename", "admin"),
    fileSize: t(uiLanguage, "editor.imageSection.fileSize", "admin"),
    dimensions: t(uiLanguage, "editor.imageSection.dimensions", "admin"),
    uploadedOn: t(uiLanguage, "editor.imageSection.uploadedOn", "admin"),
    loading: t(uiLanguage, "editor.imageSection.loading", "admin"),
    error: t(uiLanguage, "editor.imageSection.error", "admin"),
    retry: t(uiLanguage, "editor.imageSection.retry", "admin"),
    loadMore: t(uiLanguage, "editor.imageSection.loadMore", "admin"),
    locale,
  }), [uiLanguage, locale]);

  const getImageFileError = (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return t(uiLanguage, "errors.imageFileType", "admin");
    }
    if (file.size > 5 * 1024 * 1024) {
      return t(uiLanguage, "errors.imageFileSize", "admin");
    }
    return null;
  };

  const openFileDialog = () => fileInputRef.current?.click();

  const handleImageFileSelection = (file: File | null) => {
    if (!file) {
      onChange({ ...value, file: null });
      return;
    }
    const err = getImageFileError(file);
    if (err) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      onChange({ ...value, file: null });
      return;
    }
    onChange({ ...value, file, url: "", libraryAppliedImage: null });
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    handleImageFileSelection(file);
  };

  return (
    <div class="space-y-3">
      <div class="text-sm font-semibold text-[var(--color-text-primary)]">
        {t(uiLanguage, "multiLang.imageIn", "admin", { language: langLabel })}
      </div>

      <div class="flex flex-wrap gap-2">
        {(["upload", "library", "url"] as ImageMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            class={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              value.mode === mode
                ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-light)] text-[var(--color-accent-primary)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
            }`}
            onClick={() => onChange({ ...value, mode })}
          >
            {mode === "upload"
              ? t(uiLanguage, "editor.imageUploadOption", "admin")
              : mode === "library"
              ? t(uiLanguage, "editor.imageSection.selectFromLibrary", "admin")
              : t(uiLanguage, "editor.imageUrlOption", "admin")}
          </button>
        ))}
      </div>

      {value.mode === "upload" ? (
        <div class="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="hidden"
            onChange={(e) => handleImageFileSelection((e.currentTarget as HTMLInputElement).files?.[0] ?? null)}
          />
          <ImageUploadPreview
            file={value.file}
            previewUrl={previewUrl}
            dragActive={dragActive}
            disabled={disabled}
            onOpenFileDialog={openFileDialog}
            onRemove={() => onChange({ ...value, file: null })}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={handleDrop}
            labels={imageUploadLabels}
          />
          <div class="space-y-2">
            <label class="text-sm font-semibold" htmlFor={`image-title-${idSuffix}`}>
              {t(uiLanguage, "editor.imageTitleLabel", "admin")}
            </label>
            <input
              id={`image-title-${idSuffix}`}
              class="input-field"
              type="text"
              value={value.title}
              disabled={disabled}
              onInput={(e) => onChange({ ...value, title: (e.currentTarget as HTMLInputElement).value })}
              placeholder={t(uiLanguage, "editor.imageTitlePlaceholder", "admin")}
            />
          </div>
        </div>
      ) : value.mode === "library" ? (
        <StorageImageGallery
          labels={storageLabels}
          appliedImage={value.libraryAppliedImage}
          onUse={(img) => onChange({ ...value, url: img.url, libraryAppliedImage: img })}
          disabled={disabled}
        />
      ) : (
        <div class="space-y-3">
          <div class="space-y-2">
            <label class="text-sm font-semibold" htmlFor={`image-url-${idSuffix}`}>
              {t(uiLanguage, "editor.imageUrlLabel", "admin")}
            </label>
            <input
              id={`image-url-${idSuffix}`}
              class="input-field"
              type="url"
              value={value.url}
              disabled={disabled}
              onInput={(e) => onChange({ ...value, url: (e.currentTarget as HTMLInputElement).value, libraryAppliedImage: null })}
              placeholder={t(uiLanguage, "editor.imageUrlPlaceholder", "admin")}
            />
          </div>
          {value.url.trim() ? (
            <div class="w-full max-w-[400px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] shadow-sm">
              <div class="max-h-[300px] min-h-[220px] flex items-center justify-center p-4">
                <img
                  src={value.url.trim()}
                  alt=""
                  class="max-h-[260px] w-full object-contain"
                />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
