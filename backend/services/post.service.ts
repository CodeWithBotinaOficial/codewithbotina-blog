import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import { supabase } from "../lib/supabase.ts";
import { sanitizeInput } from "../lib/validation.ts";
import { ServiceResult } from "../types/api.types.ts";
import {
  BulkPostUpdateRequest,
  BulkPostUpdateResponse,
  DeleteInfo,
  DeleteResult,
  PostCreate,
  PostCreateBatchRequest,
  PostCreateBatchResponse,
  PostLanguage,
  PostRecord,
  PostUpdate,
} from "../types/post.types.ts";
import { AppError, DatabaseError, ValidationError } from "../utils/errors.ts";
import { AuthService } from "./auth.service.ts";
import { ImageService } from "./image.service.ts";
import { PostTranslationService } from "./post-translation.service.ts";

type SanitizedPost = {
  titulo: string;
  slug: string;
  body: string;
  imagen_url: string | null;
  language: PostLanguage;
};

export class PostService {
  private authService: AuthService;
  private imageService: ImageService;
  private supportedLanguages: Set<PostLanguage> = new Set([
    "en",
    "es",
    "fr",
    "de",
    "pt",
    "ja",
    "zh",
  ]);

  constructor(
    authService: AuthService = new AuthService(),
    imageService: ImageService = new ImageService(),
  ) {
    this.authService = authService;
    this.imageService = imageService;
  }

  async createPost(
    data: PostCreate,
    userId: string,
  ): Promise<ServiceResult<PostRecord>> {
    try {
      const isAdmin = await this.authService.isAdmin(userId);
      if (!isAdmin) {
        return { success: false, error: new AppError("Forbidden", 403) };
      }

      const sanitized = this.validateAndSanitize(data, "es");
      const unique = await this.isSlugUnique(sanitized.slug, undefined, sanitized.language);
      if (!unique) {
        return {
          success: false,
          error: new ValidationError("Slug already exists"),
        };
      }

      const { data: created, error } = await supabase
        .from("posts")
        .insert([{
          titulo: sanitized.titulo,
          slug: sanitized.slug,
          body: sanitized.body,
          imagen_url: sanitized.imagen_url ?? null,
          fecha: new Date().toISOString(),
          language: sanitized.language,
        }])
        .select("id, titulo, slug, body, imagen_url, fecha, language")
        .single();

      if (error || !created) {
        console.error("Supabase error:", error);
        throw new DatabaseError("Failed to create post");
      }

      const tagIds = this.normalizeTagIds(data.tag_ids);
      if (tagIds.length > 0) {
        await this.safeInsertPostTags(created.id, tagIds);
      }

      return { success: true, data: created as PostRecord };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async createPostsBatch(
    data: PostCreateBatchRequest,
    userId: string,
  ): Promise<ServiceResult<PostCreateBatchResponse>> {
    const translationService = new PostTranslationService();

    const createdPostIds: string[] = [];
    let createdGroupId: string | null = null;

    try {
      const isAdmin = await this.authService.isAdmin(userId);
      if (!isAdmin) {
        return { success: false, error: new AppError("Forbidden", 403) };
      }

      const posts = Array.isArray(data?.posts) ? data.posts : [];
      if (posts.length < 1) {
        return { success: false, error: new ValidationError("At least one post is required") };
      }

      const sanitizedPosts = posts.map((post) => {
        const fallbackLanguage = this.normalizeLanguage(post.language) ?? "es";
        return this.validateAndSanitize(post, fallbackLanguage);
      });

      // Ensure one post per language in the request.
      const seenLangs = new Set<string>();
      for (const post of sanitizedPosts) {
        const lang = post.language;
        if (seenLangs.has(lang)) {
          return { success: false, error: new ValidationError("Only one post per language can be created") };
        }
        seenLangs.add(lang);
      }

      // Ensure slugs are unique per language in DB (and within the payload).
      const seenSlugKeys = new Set<string>();
      for (const post of sanitizedPosts) {
        const key = `${post.language}:${post.slug}`;
        if (seenSlugKeys.has(key)) {
          return { success: false, error: new ValidationError("Duplicate slug detected in request") };
        }
        seenSlugKeys.add(key);

        const unique = await this.isSlugUnique(post.slug, undefined, post.language);
        if (!unique) {
          return { success: false, error: new ValidationError("Slug already exists") };
        }
      }

      const now = new Date().toISOString();
      const insertRows = sanitizedPosts.map((post) => ({
        titulo: post.titulo,
        slug: post.slug,
        body: post.body,
        imagen_url: post.imagen_url ?? null,
        fecha: now,
        language: post.language,
      }));

      const { data: createdRows, error } = await supabase
        .from("posts")
        .insert(insertRows as any)
        .select("id, titulo, slug, body, imagen_url, fecha, language");

      if (error || !createdRows || createdRows.length !== insertRows.length) {
        console.error("Supabase error:", error);
        throw new DatabaseError("Failed to create posts");
      }

      // Map (language, slug) -> created post id for tag linking.
      const idByKey = new Map<string, string>();
      for (const row of createdRows as any[]) {
        idByKey.set(`${row.language}:${row.slug}`, row.id);
        createdPostIds.push(row.id);
      }

      for (const original of posts) {
        const fallbackLanguage = this.normalizeLanguage(original.language) ?? "es";
        const normalized = this.validateAndSanitize(original, fallbackLanguage);
        const postId = idByKey.get(`${normalized.language}:${normalized.slug}`);
        if (!postId) continue;
        const tagIds = this.normalizeTagIds(original.tag_ids);
        if (tagIds.length > 0) {
          await this.safeInsertPostTags(postId, tagIds);
        }
      }

      if (createdPostIds.length > 1) {
        const baseId = createdPostIds[0];
        const linkResult = await translationService.linkTranslations(baseId, createdPostIds.slice(1));
        if (!linkResult.success) {
          throw linkResult.error ?? new DatabaseError("Failed to link translations");
        }
        createdGroupId = linkResult.data?.translation_group_id ?? null;
      }

      return {
        success: true,
        data: {
          posts: createdRows as PostRecord[],
          translation_group_id: createdGroupId,
        },
      };
    } catch (error) {
      // Best-effort rollback for multi-step operations.
      if (createdPostIds.length > 0) {
        try {
          await supabase.from("post_translations").delete().in("post_id", createdPostIds);
        } catch (_e) {
          // ignore
        }
        try {
          await supabase.from("post_tags").delete().in("post_id", createdPostIds);
        } catch (_e) {
          // ignore
        }
        try {
          await supabase.from("posts").delete().in("id", createdPostIds);
        } catch (_e) {
          // ignore
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async bulkUpdatePosts(
    data: BulkPostUpdateRequest,
    userId: string,
  ): Promise<ServiceResult<BulkPostUpdateResponse>> {
    const translationService = new PostTranslationService();

    const updatedPostIds: string[] = [];
    const createdPostIds: string[] = [];
    const unlinkedPostIds: string[] = [];
    const translationGroupByBase: Record<string, string | null> = {};

    // Rollback snapshots.
    const postSnapshotById = new Map<string, PostRecord>();
    const tagSnapshotByPostId = new Map<string, string[]>();
    const translationSnapshotByGroupId = new Map<string, Array<{ post_id: string; translation_group_id: string; language: string }>>();
    const translationGroupIdsCreated = new Set<string>();

    try {
      const isAdmin = await this.authService.isAdmin(userId);
      if (!isAdmin) {
        return { success: false, error: new AppError("Forbidden", 403) };
      }

      const updates = Array.isArray(data?.updates) ? data.updates : [];
      const creates = Array.isArray(data?.creates) ? data.creates : [];
      const unlinks = Array.isArray(data?.unlinks) ? data.unlinks : [];

      const updateIds = Array.from(new Set(updates.map((u) => String(u.post_id ?? "").trim()).filter(Boolean)));
      if (updateIds.some((id) => !this.isValidUuid(id))) {
        return { success: false, error: new ValidationError("Invalid post_id") };
      }

      const baseIds = Array.from(
        new Set(creates.map((c) => String(c.base_post_id ?? "").trim()).filter(Boolean)),
      );
      if (baseIds.some((id) => !this.isValidUuid(id))) {
        return { success: false, error: new ValidationError("Invalid base_post_id") };
      }

      for (const unlink of unlinks) {
        const postId = String(unlink?.post_id ?? "").trim();
        const linkedId = String(unlink?.linked_post_id ?? "").trim();
        if (!this.isValidUuid(postId) || !this.isValidUuid(linkedId)) {
          return { success: false, error: new ValidationError("Invalid unlink post_id") };
        }
      }

      // Load snapshots for rollback.
      for (const postId of updateIds) {
        const existing = await this.getPostById(postId);
        if (!existing) {
          return { success: false, error: new AppError("Post not found", 404) };
        }
        postSnapshotById.set(postId, existing);
        tagSnapshotByPostId.set(postId, await this.getPostTagIds(postId));
      }

      // Snapshot translation groups that might be affected by create/unlink operations.
      const touchedTranslationPostIds = new Set<string>();
      for (const baseId of baseIds) touchedTranslationPostIds.add(baseId);
      for (const unlink of unlinks) {
        touchedTranslationPostIds.add(String(unlink.post_id ?? "").trim());
        touchedTranslationPostIds.add(String(unlink.linked_post_id ?? "").trim());
      }

      if (touchedTranslationPostIds.size > 0) {
        const ids = Array.from(touchedTranslationPostIds).filter((id) => id && this.isValidUuid(id));
        const { data: touchedLinks, error: touchedError } = await supabase
          .from("post_translations")
          .select("post_id, translation_group_id, language")
          .in("post_id", ids);
        if (touchedError) {
          console.error("Supabase error:", touchedError);
          throw new DatabaseError("Failed to load translation links");
        }
        const groupIds = Array.from(
          new Set((touchedLinks ?? []).map((row: any) => String(row.translation_group_id ?? "").trim()).filter(Boolean)),
        );
        for (const groupId of groupIds) {
          const { data: groupRows, error: groupError } = await supabase
            .from("post_translations")
            .select("post_id, translation_group_id, language")
            .eq("translation_group_id", groupId);
          if (groupError) {
            console.error("Supabase error:", groupError);
            throw new DatabaseError("Failed to load translation group");
          }
          translationSnapshotByGroupId.set(
            groupId,
            (groupRows ?? []).map((row: any) => ({
              post_id: String(row.post_id),
              translation_group_id: String(row.translation_group_id),
              language: String(row.language),
            })),
          );
        }
      }

      // Validate all updates first (including slug uniqueness).
      const sanitizedUpdates = new Map<string, SanitizedPost>(); // normalized and validated
      const updateSlugKeys = new Set<string>();
      for (const item of updates) {
        const postId = String(item.post_id ?? "").trim();
        if (!postId) continue;
        const existing = postSnapshotById.get(postId);
        if (!existing) continue;
        const sanitized = this.validateAndSanitize(item.post as PostUpdate, existing.language);

        const key = `${sanitized.language}:${sanitized.slug}`;
        if (updateSlugKeys.has(key)) {
          return { success: false, error: new ValidationError("Duplicate slug detected in request") };
        }
        updateSlugKeys.add(key);

        const unique = await this.isSlugUnique(sanitized.slug, postId, sanitized.language);
        if (!unique) {
          return { success: false, error: new ValidationError("Slug already exists") };
        }

        sanitizedUpdates.set(postId, sanitized);
      }

      // Apply updates.
      for (const item of updates) {
        const postId = String(item.post_id ?? "").trim();
        if (!postId) continue;
        const sanitized = sanitizedUpdates.get(postId);
        if (!sanitized) continue;

        const { data: updated, error } = await supabase
          .from("posts")
          .update({
            titulo: sanitized.titulo,
            slug: sanitized.slug,
            body: sanitized.body,
            imagen_url: sanitized.imagen_url ?? null,
            language: sanitized.language,
          })
          .eq("id", postId)
          .select("id, titulo, slug, body, imagen_url, fecha, language")
          .single();

        if (error || !updated) {
          console.error("Supabase error:", error);
          throw new DatabaseError("Failed to update post");
        }

        updatedPostIds.push(postId);

        // Sync tags if provided.
        const tagIds = Array.isArray(item.tag_ids)
          ? this.normalizeTagIds(item.tag_ids)
          : Array.isArray(item.post?.tag_ids)
          ? this.normalizeTagIds(item.post.tag_ids)
          : null;
        if (tagIds) {
          await this.syncPostTags(postId, tagIds);
        }

        // Keep post_translations language column consistent if this post is linked.
        await this.syncTranslationLanguage(postId, sanitized.language);
      }

      // Create and link translations.
      const createsByBase = new Map<string, PostCreate[]>();
      for (const item of creates) {
        const baseId = String(item.base_post_id ?? "").trim();
        if (!baseId) continue;
        const list = createsByBase.get(baseId) ?? [];
        list.push(item.post);
        createsByBase.set(baseId, list);
      }

      for (const [basePostId, newPosts] of createsByBase.entries()) {
        const basePost = await this.getPostById(basePostId);
        if (!basePost) {
          return { success: false, error: new AppError("Post not found", 404) };
        }

        const { data: baseLinkRow } = await supabase
          .from("post_translations")
          .select("translation_group_id")
          .eq("post_id", basePostId)
          .maybeSingle();
        const baseHadGroup = Boolean((baseLinkRow as any)?.translation_group_id);

        // Determine which languages are already linked to this base post.
        const existingLinks = await translationService.getTranslations(basePostId);
        const languagesInGroup = new Set<string>();
        languagesInGroup.add(basePost.language);
        if (existingLinks.success) {
          for (const row of existingLinks.data ?? []) {
            languagesInGroup.add(row.language);
          }
        }

        const sanitizedNewPosts: SanitizedPost[] = newPosts.map((post) => {
          const fallbackLanguage = this.normalizeLanguage(post.language) ?? basePost.language;
          return this.validateAndSanitize(post, fallbackLanguage);
        });

        for (const post of sanitizedNewPosts) {
          if (languagesInGroup.has(post.language)) {
            return { success: false, error: new ValidationError("Only one post per language can be linked") };
          }
          languagesInGroup.add(post.language);

          const unique = await this.isSlugUnique(post.slug, undefined, post.language);
          if (!unique) {
            return { success: false, error: new ValidationError("Slug already exists") };
          }
        }

        const now = new Date().toISOString();
        const insertRows = sanitizedNewPosts.map((post) => ({
          titulo: post.titulo,
          slug: post.slug,
          body: post.body,
          imagen_url: post.imagen_url ?? null,
          fecha: now,
          language: post.language,
        }));

        const { data: createdRows, error } = await supabase
          .from("posts")
          .insert(insertRows as any)
          .select("id, titulo, slug, body, imagen_url, fecha, language");

        if (error || !createdRows || createdRows.length !== insertRows.length) {
          console.error("Supabase error:", error);
          throw new DatabaseError("Failed to create post");
        }

        const idByKey = new Map<string, string>();
        for (const row of createdRows as any[]) {
          idByKey.set(`${row.language}:${row.slug}`, row.id);
          createdPostIds.push(row.id);
        }

        // Tag linking (best-effort).
        for (const original of newPosts) {
          const fallbackLanguage = this.normalizeLanguage(original.language) ?? basePost.language;
          const normalized = this.validateAndSanitize(original, fallbackLanguage);
          const postId = idByKey.get(`${normalized.language}:${normalized.slug}`);
          if (!postId) continue;
          const tagIds = this.normalizeTagIds(original.tag_ids);
          if (tagIds.length > 0) {
            await this.safeInsertPostTags(postId, tagIds);
          }
        }

        const baseLinkResult = await translationService.linkTranslations(basePostId, Array.from(idByKey.values()));
        if (!baseLinkResult.success) {
          throw baseLinkResult.error ?? new DatabaseError("Failed to link translations");
        }
        const groupId = baseLinkResult.data?.translation_group_id ?? null;
        translationGroupByBase[basePostId] = groupId;
        if (!baseHadGroup && groupId) {
          translationGroupIdsCreated.add(groupId);
        }
      }

      // Unlink translations (does not delete posts).
      for (const unlink of unlinks) {
        const postId = String(unlink.post_id ?? "").trim();
        const linkedPostId = String(unlink.linked_post_id ?? "").trim();
        if (!postId || !linkedPostId) continue;
        const result = await translationService.unlinkTranslation(postId, linkedPostId);
        if (!result.success) {
          throw result.error ?? new DatabaseError("Failed to unlink translation");
        }
        unlinkedPostIds.push(linkedPostId);
      }

      return {
        success: true,
        data: {
          updated_post_ids: updatedPostIds,
          created_post_ids: createdPostIds,
          unlinked_post_ids: unlinkedPostIds,
          translation_group_id_by_base_post_id: translationGroupByBase,
        },
      };
    } catch (error) {
      // Best-effort rollback: restore updated posts + tags and delete created posts.
      try {
        for (const postId of updatedPostIds) {
          const snapshot = postSnapshotById.get(postId);
          if (!snapshot) continue;
          await supabase
            .from("posts")
            .update({
              titulo: snapshot.titulo,
              slug: snapshot.slug,
              body: snapshot.body,
              imagen_url: snapshot.imagen_url ?? null,
              language: snapshot.language,
            })
            .eq("id", postId);

          await this.syncTranslationLanguage(postId, snapshot.language);

          const tags = tagSnapshotByPostId.get(postId) ?? [];
          await this.syncPostTags(postId, tags);
        }

        if (createdPostIds.length > 0) {
          await supabase.from("post_translations").delete().in("post_id", createdPostIds);
          await supabase.from("post_tags").delete().in("post_id", createdPostIds);
          await supabase.from("posts").delete().in("id", createdPostIds);
        }

        // Restore translation groups that were modified.
        if (translationGroupIdsCreated.size > 0) {
          await supabase
            .from("post_translations")
            .delete()
            .in("translation_group_id", Array.from(translationGroupIdsCreated));
        }

        for (const [groupId, snapshotRows] of translationSnapshotByGroupId.entries()) {
          await supabase.from("post_translations").delete().eq("translation_group_id", groupId);
          if (snapshotRows.length > 0) {
            await supabase.from("post_translations").insert(snapshotRows as any);
          }
        }
      } catch (_rollbackError) {
        // ignore
      }

      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async updatePost(
    slug: string,
    data: PostUpdate,
    userId: string,
  ): Promise<ServiceResult<PostRecord>> {
    try {
      const isAdmin = await this.authService.isAdmin(userId);
      if (!isAdmin) {
        return { success: false, error: new AppError("Forbidden", 403) };
      }

      const preferredLanguage = this.normalizeLanguage(data.language) ?? undefined;
      let existing = await this.getPostBySlug(slug, preferredLanguage);
      if (!existing && !preferredLanguage) {
        existing = await this.getPostBySlug(slug);
      }
      if (!existing) {
        return { success: false, error: new AppError("Post not found", 404) };
      }

      const sanitized = this.validateAndSanitize(data, existing.language);
      if (sanitized.slug !== existing.slug) {
        const unique = await this.isSlugUnique(sanitized.slug, existing.id, sanitized.language);
        if (!unique) {
          return {
            success: false,
            error: new ValidationError("Slug already exists"),
          };
        }
      }

      const { data: updated, error } = await supabase
        .from("posts")
        .update({
          titulo: sanitized.titulo,
          slug: sanitized.slug,
          body: sanitized.body,
          imagen_url: sanitized.imagen_url ?? null,
          language: sanitized.language,
        })
        .eq("id", existing.id)
        .select("id, titulo, slug, body, imagen_url, fecha, language")
        .single();

      if (error || !updated) {
        console.error("Supabase error:", error);
        throw new DatabaseError("Failed to update post");
      }

      if (Array.isArray(data.tag_ids)) {
        const tagIds = this.normalizeTagIds(data.tag_ids);
        await this.syncPostTags(existing.id, tagIds);
      }

      await this.syncTranslationLanguage(existing.id, updated.language);
      return { success: true, data: updated as PostRecord };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async deletePost(
    slug: string,
    userId: string,
    language?: string,
  ): Promise<ServiceResult<DeleteResult>> {
    try {
      const isAdmin = await this.authService.isAdmin(userId);
      if (!isAdmin) {
        return { success: false, error: new AppError("Forbidden", 403) };
      }

      const normalizedLanguage = this.normalizeLanguage(language) ?? undefined;
      const existing = await this.getPostBySlug(slug, normalizedLanguage);
      if (!existing) {
        return { success: false, error: new AppError("Post not found", 404) };
      }

      const info = await this.getDeleteInfo(slug, normalizedLanguage);

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", existing.id);

      if (error) {
        console.error("Supabase error:", error);
        throw new DatabaseError("Failed to delete post");
      }

      let imageDeleted = false;
      if (existing.imagen_url) {
        const filename = this.imageService.getFilenameFromUrl(existing.imagen_url);
        if (filename) {
          imageDeleted = await this.imageService.deleteImage(filename);
        }
      }

      return {
        success: true,
        data: {
          post_id: existing.id,
          comments_deleted: info.comments_count,
          reactions_deleted: info.reactions_count,
          image_deleted: imageDeleted,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async getDeleteInfo(slug: string, language?: string): Promise<DeleteInfo> {
    const post = await this.getPostBySlug(slug, language);
    if (!post) {
      throw new AppError("Post not found", 404);
    }

    const { count: commentCount, error: commentError } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", post.id);

    if (commentError) {
      console.error("Supabase error:", commentError);
      throw new DatabaseError("Failed to fetch comment count");
    }

    const { data: reactions, error: reactionError } = await supabase
      .from("post_reactions")
      .select("reaction_type")
      .eq("post_id", post.id);

    if (reactionError) {
      console.error("Supabase error:", reactionError);
      throw new DatabaseError("Failed to fetch reaction count");
    }

    const likesCount = (reactions ?? []).filter((reaction) =>
      reaction.reaction_type === "like"
    ).length;
    const dislikesCount = (reactions ?? []).filter((reaction) =>
      reaction.reaction_type === "dislike"
    ).length;
    const reactionCount = likesCount + dislikesCount;

    return {
      post_id: post.id,
      titulo: post.titulo,
      comments_count: commentCount ?? 0,
      reactions_count: reactionCount ?? 0,
      likes_count: likesCount,
      dislikes_count: dislikesCount,
      imagen_url: post.imagen_url ?? null,
    };
  }

  async isSlugUnique(
    slug: string,
    excludeId?: string,
    language?: string,
  ): Promise<boolean> {
    let query = supabase
      .from("posts")
      .select("id")
      .eq("slug", slug);

    const normalizedLanguage = this.normalizeLanguage(language);
    if (normalizedLanguage) {
      query = query.eq("language", normalizedLanguage);
    }

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to check slug uniqueness");
    }

    return !data;
  }

  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  sanitizeMarkdown(content: string): string {
    try {
      const html = marked.parse(content) as string;
      DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          "p",
          "br",
          "strong",
          "em",
          "u",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "ul",
          "ol",
          "li",
          "blockquote",
          "code",
          "pre",
          "a",
          "img",
        ],
        ALLOWED_ATTR: ["href", "src", "alt", "title", "class"],
      });

      return DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });
    } catch (error) {
      console.error("Markdown sanitization failed, falling back to text cleanup", error);
      return sanitizeInput(content);
    }
  }

  private typeGuardLanguage(value: unknown, fallback: PostLanguage): PostLanguage {
    if (typeof value === "string" && value.trim()) {
      const normalized = this.normalizeLanguage(value);
      if (!normalized) throw new ValidationError("Language is not supported");
      return normalized;
    }
    return fallback;
  }

  private validateAndSanitize(
    data: PostCreate | PostUpdate,
    fallbackLanguage: PostLanguage,
  ): SanitizedPost {
    const errors: Record<string, string> = {};

    const titulo = sanitizeInput(data.titulo ?? "");
    if (!titulo || titulo.length < 1) {
      errors.titulo = "Title is required";
    } else if (titulo.length > 200) {
      errors.titulo = "Title must be less than 200 characters";
    }

    const baseSlug = data.slug ? data.slug : this.generateSlug(titulo);
    const slug = this.generateSlug(baseSlug);
    if (!slug) {
      errors.slug = "Slug is required";
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      errors.slug = "Slug must be lowercase letters, numbers, and hyphens only";
    }

    const bodyRaw = data.body ?? "";
    const body = this.sanitizeMarkdown(bodyRaw.trim());
    if (!body || body.length < 100) {
      errors.body = "Content must be at least 100 characters";
    } else if (body.length > 50000) {
      errors.body = "Content must be less than 50,000 characters";
    }

    let imagen_url: string | null = null;
    if (typeof data.imagen_url === "string" && data.imagen_url.trim() !== "") {
      try {
        const parsed = new URL(data.imagen_url.trim());
        imagen_url = parsed.toString();
      } catch (_error) {
        errors.imagen_url = "Image URL must be a valid URL";
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(
        Object.values(errors)[0] || "Invalid post data",
      );
    }

    const language = this.typeGuardLanguage((data as any).language, fallbackLanguage);

    return {
      titulo,
      slug,
      body,
      imagen_url,
      language,
    };
  }

  private normalizeTagIds(tagIds?: string[] | null): string[] {
    if (!Array.isArray(tagIds)) return [];
    const unique = new Set<string>();
    for (const tagId of tagIds) {
      if (typeof tagId !== "string") continue;
      const trimmed = tagId.trim();
      if (!trimmed) continue;
      if (!this.isValidUuid(trimmed)) continue;
      unique.add(trimmed);
    }
    return Array.from(unique);
  }

  private isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value);
  }

  private async safeInsertPostTags(postId: string, tagIds: string[]) {
    if (tagIds.length === 0) return;
    const payload = tagIds.map((tagId) => ({
      post_id: postId,
      tag_id: tagId,
    }));

    const { error } = await supabase.from("post_tags").insert(payload);
    if (error) {
      console.error("Failed to insert post tags:", error);
    }
  }

  private async syncPostTags(postId: string, tagIds: string[]) {
    const { data, error } = await supabase
      .from("post_tags")
      .select("tag_id")
      .eq("post_id", postId);

    if (error) {
      console.error("Failed to load post tags:", error);
      return;
    }

    const existingIds = new Set((data ?? []).map((row) => row.tag_id));
    const incomingIds = new Set(tagIds);

    const toRemove = Array.from(existingIds).filter((id) => !incomingIds.has(id));
    const toAdd = tagIds.filter((id) => !existingIds.has(id));

    if (toRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from("post_tags")
        .delete()
        .eq("post_id", postId)
        .in("tag_id", toRemove);

      if (deleteError) {
        console.error("Failed to remove post tags:", deleteError);
      }
    }

    if (toAdd.length > 0) {
      await this.safeInsertPostTags(postId, toAdd);
    }
  }

  private async getPostBySlug(
    slug: string,
    language?: string,
  ): Promise<PostRecord | null> {
    let query = supabase
      .from("posts")
      .select("id, titulo, slug, body, imagen_url, fecha, language")
      .eq("slug", slug);

    const normalizedLanguage = this.normalizeLanguage(language);
    if (normalizedLanguage) {
      query = query.eq("language", normalizedLanguage);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to fetch post");
    }

    return data as PostRecord | null;
  }

  private normalizeLanguage(value?: string | null): PostLanguage | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if (this.supportedLanguages.has(normalized as PostLanguage)) {
      return normalized as PostLanguage;
    }
    return null;
  }

  private async getPostById(id: string): Promise<PostRecord | null> {
    const postId = String(id ?? "").trim();
    if (!postId || !this.isValidUuid(postId)) return null;
    const { data, error } = await supabase
      .from("posts")
      .select("id, titulo, slug, body, imagen_url, fecha, language")
      .eq("id", postId)
      .maybeSingle();
    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to fetch post");
    }
    return data as PostRecord | null;
  }

  private async getPostTagIds(postId: string): Promise<string[]> {
    const id = String(postId ?? "").trim();
    if (!id || !this.isValidUuid(id)) return [];
    const { data, error } = await supabase
      .from("post_tags")
      .select("tag_id")
      .eq("post_id", id);
    if (error) {
      console.error("Supabase error:", error);
      return [];
    }
    const ids = (data ?? []).map((row: any) => String(row.tag_id ?? "").trim()).filter(Boolean);
    return Array.from(new Set(ids));
  }

  private async syncTranslationLanguage(postId: string, language: PostLanguage): Promise<void> {
    const id = String(postId ?? "").trim();
    if (!id || !this.isValidUuid(id)) return;
    const lang = this.normalizeLanguage(language) ?? null;
    if (!lang) return;
    const { error } = await supabase
      .from("post_translations")
      .update({ language: lang })
      .eq("post_id", id);
    if (error) {
      // Not all posts are linked; ignore not found errors.
      console.error("Failed to sync translation language:", error);
    }
  }
}
