import { supabase } from "../lib/supabase.ts";
import { ServiceResult } from "../types/api.types.ts";
import { AppError, DatabaseError, ValidationError } from "../utils/errors.ts";
import type { PostLanguage } from "../types/post.types.ts";

export interface PostTranslationSummary {
  post_id: string;
  language: PostLanguage;
  slug: string;
  titulo: string;
  fecha: string | null;
  imagen_url: string | null;
  translation_group_id: string;
}

const SUPPORTED_LANGUAGES: Set<PostLanguage> = new Set([
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "ja",
  "zh",
]);

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value);
}

function normalizeLanguage(value: string): PostLanguage {
  const normalized = value.trim().toLowerCase() as PostLanguage;
  if (!SUPPORTED_LANGUAGES.has(normalized)) {
    throw new ValidationError("Unsupported language");
  }
  return normalized;
}

export class PostTranslationService {
  async getTranslations(postId: string): Promise<ServiceResult<PostTranslationSummary[]>> {
    try {
      if (!isValidUuid(postId)) {
        return { success: false, error: new ValidationError("Invalid postId") };
      }

      const { data: link, error: linkError } = await supabase
        .from("post_translations")
        .select("translation_group_id")
        .eq("post_id", postId)
        .maybeSingle();

      if (linkError) {
        console.error("Supabase error:", linkError);
        throw new DatabaseError("Failed to load post translation group");
      }

      const groupId = (link as { translation_group_id?: string | null } | null)?.translation_group_id ??
        null;
      if (!groupId) {
        return { success: true, data: [] };
      }

      const { data, error } = await supabase
        .from("post_translations")
        .select(
          "post_id, language, translation_group_id, post:posts(id, slug, titulo, fecha, imagen_url, language)",
        )
        .eq("translation_group_id", groupId);

      if (error) {
        console.error("Supabase error:", error);
        throw new DatabaseError("Failed to fetch translations");
      }

      const rows = (data ?? []).map((row: any) => ({
        post_id: row.post_id,
        language: normalizeLanguage(row.language),
        slug: row.post?.slug ?? "",
        titulo: row.post?.titulo ?? "",
        fecha: row.post?.fecha ?? null,
        imagen_url: row.post?.imagen_url ?? null,
        translation_group_id: row.translation_group_id,
      })).filter((row: PostTranslationSummary) => Boolean(row.slug) && Boolean(row.titulo));

      return { success: true, data: rows };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async getTranslationForLanguage(
    postId: string,
    targetLanguage: string,
  ): Promise<ServiceResult<PostTranslationSummary | null>> {
    try {
      if (!isValidUuid(postId)) {
        return { success: false, error: new ValidationError("Invalid postId") };
      }
      const lang = normalizeLanguage(targetLanguage);

      const { data: link, error: linkError } = await supabase
        .from("post_translations")
        .select("translation_group_id")
        .eq("post_id", postId)
        .maybeSingle();

      if (linkError) {
        console.error("Supabase error:", linkError);
        throw new DatabaseError("Failed to load post translation group");
      }

      const groupId = (link as { translation_group_id?: string | null } | null)?.translation_group_id ??
        null;
      if (!groupId) {
        return { success: true, data: null };
      }

      const { data, error } = await supabase
        .from("post_translations")
        .select(
          "post_id, language, translation_group_id, post:posts(id, slug, titulo, fecha, imagen_url, language)",
        )
        .eq("translation_group_id", groupId)
        .eq("language", lang)
        .maybeSingle();

      if (error) {
        console.error("Supabase error:", error);
        throw new DatabaseError("Failed to fetch translation");
      }

      if (!data) {
        return { success: true, data: null };
      }

      const row: any = data;
      return {
        success: true,
        data: {
          post_id: row.post_id,
          language: normalizeLanguage(row.language),
          slug: row.post?.slug ?? "",
          titulo: row.post?.titulo ?? "",
          fecha: row.post?.fecha ?? null,
          imagen_url: row.post?.imagen_url ?? null,
          translation_group_id: row.translation_group_id,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  /**
   * Link a post to one or more other posts as translations.
   *
   * Behavior:
   * - If linkedPostIds is empty: unlink postId from its current group (if any).
   * - Otherwise: merge translation groups (if needed) and link all posts into one group.
   *   Existing group members are preserved.
   */
  async linkTranslations(
    postId: string,
    linkedPostIds: string[],
  ): Promise<ServiceResult<{ translation_group_id: string | null; translations: PostTranslationSummary[] }>> {
    try {
      if (!isValidUuid(postId)) {
        return { success: false, error: new ValidationError("Invalid postId") };
      }

      const uniqueLinked = Array.from(
        new Set((Array.isArray(linkedPostIds) ? linkedPostIds : []).map((id) => String(id).trim()).filter(Boolean)),
      );

      if (uniqueLinked.some((id) => !isValidUuid(id))) {
        return { success: false, error: new ValidationError("Invalid linked_post_ids") };
      }

      if (uniqueLinked.includes(postId)) {
        return { success: false, error: new ValidationError("Cannot link a post to itself") };
      }

      // Unlink-only mode
      if (uniqueLinked.length === 0) {
        const { data: link, error: linkError } = await supabase
          .from("post_translations")
          .select("translation_group_id")
          .eq("post_id", postId)
          .maybeSingle();

        if (linkError) {
          console.error("Supabase error:", linkError);
          throw new DatabaseError("Failed to load post translation group");
        }

        const groupId = (link as { translation_group_id?: string | null } | null)?.translation_group_id ??
          null;
        if (!groupId) {
          return { success: true, data: { translation_group_id: null, translations: [] } };
        }

        const { error: deleteError } = await supabase
          .from("post_translations")
          .delete()
          .eq("post_id", postId);

        if (deleteError) {
          console.error("Supabase error:", deleteError);
          throw new DatabaseError("Failed to unlink post from translation group");
        }

        await this.cleanupSingletonGroup(groupId);
        const translationsResult = await this.getTranslations(postId);
        if (!translationsResult.success) return { success: false, error: translationsResult.error };
        return { success: true, data: { translation_group_id: null, translations: translationsResult.data ?? [] } };
      }

      const candidatePostIds = [postId, ...uniqueLinked];

      // Load post languages (validate existence + uniqueness).
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select("id, language")
        .in("id", candidatePostIds);

      if (postsError) {
        console.error("Supabase error:", postsError);
        throw new DatabaseError("Failed to load posts for translation linking");
      }

      if (!posts || posts.length !== candidatePostIds.length) {
        return { success: false, error: new AppError("One or more posts not found", 404) };
      }

      const languageByPostId = new Map<string, PostLanguage>();
      for (const row of posts as Array<{ id: string; language: string }>) {
        languageByPostId.set(row.id, normalizeLanguage(row.language));
      }

      const seenLanguages = new Set<string>();
      for (const id of candidatePostIds) {
        const lang = languageByPostId.get(id);
        if (!lang) {
          return { success: false, error: new AppError("One or more posts not found", 404) };
        }
        if (seenLanguages.has(lang)) {
          return {
            success: false,
            error: new ValidationError("Only one post per language can be linked"),
          };
        }
        seenLanguages.add(lang);
      }

      // Load any existing group ids for the candidate posts.
      const { data: existingLinks, error: existingLinksError } = await supabase
        .from("post_translations")
        .select("post_id, translation_group_id")
        .in("post_id", candidatePostIds);

      if (existingLinksError) {
        console.error("Supabase error:", existingLinksError);
        throw new DatabaseError("Failed to load existing translation links");
      }

      const existingGroupIds = Array.from(
        new Set((existingLinks ?? []).map((row: any) => row.translation_group_id).filter(Boolean)),
      ) as string[];

      const targetGroupId = existingGroupIds[0] ?? crypto.randomUUID();
      const groupsToMerge = existingGroupIds.filter((id) => id !== targetGroupId);

      if (groupsToMerge.length > 0) {
        // Validate we can merge: no duplicate languages across all members of all groups.
        const { data: unionRows, error: unionError } = await supabase
          .from("post_translations")
          .select("post_id, language, translation_group_id, post:posts(id, language)")
          .in("translation_group_id", [targetGroupId, ...groupsToMerge]);

        if (unionError) {
          console.error("Supabase error:", unionError);
          throw new DatabaseError("Failed to validate translation group merge");
        }

        const unionLangs = new Map<string, string>(); // lang -> post_id
        for (const row of (unionRows ?? []) as any[]) {
          const lang = normalizeLanguage(row.language);
          const existingPost = unionLangs.get(lang);
          if (existingPost && existingPost !== row.post_id) {
            return {
              success: false,
              error: new ValidationError("Cannot merge translation groups with duplicate languages"),
            };
          }
          unionLangs.set(lang, row.post_id);
        }
      }

      // Merge other groups into the target group.
      if (groupsToMerge.length > 0) {
        const { error: mergeError } = await supabase
          .from("post_translations")
          .update({ translation_group_id: targetGroupId })
          .in("translation_group_id", groupsToMerge);
        if (mergeError) {
          console.error("Supabase error:", mergeError);
          throw new DatabaseError("Failed to merge translation groups");
        }
      }

      // Upsert candidate posts into the target group.
      const upsertPayload = candidatePostIds.map((id) => ({
        post_id: id,
        translation_group_id: targetGroupId,
        language: languageByPostId.get(id),
      }));

      const { error: upsertError } = await supabase
        .from("post_translations")
        // post_id is the PK; allow updates to move posts between groups.
        .upsert(upsertPayload as any, { onConflict: "post_id" });

      if (upsertError) {
        console.error("Supabase error:", upsertError);
        throw new DatabaseError("Failed to link translations");
      }

      const translationsResult = await this.getTranslations(postId);
      if (!translationsResult.success) return { success: false, error: translationsResult.error };

      return {
        success: true,
        data: {
          translation_group_id: targetGroupId,
          translations: translationsResult.data ?? [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  async unlinkTranslation(
    postId: string,
    linkedPostId: string,
  ): Promise<ServiceResult<{ translation_group_id: string | null }>> {
    try {
      if (!isValidUuid(postId) || !isValidUuid(linkedPostId)) {
        return { success: false, error: new ValidationError("Invalid postId") };
      }
      if (postId === linkedPostId) {
        return { success: false, error: new ValidationError("Cannot unlink a post from itself") };
      }

      const { data: links, error } = await supabase
        .from("post_translations")
        .select("post_id, translation_group_id")
        .in("post_id", [postId, linkedPostId]);

      if (error) {
        console.error("Supabase error:", error);
        throw new DatabaseError("Failed to load translation links");
      }

      const groupByPost = new Map<string, string>();
      for (const row of (links ?? []) as any[]) {
        groupByPost.set(row.post_id, row.translation_group_id);
      }

      const groupA = groupByPost.get(postId) ?? null;
      const groupB = groupByPost.get(linkedPostId) ?? null;
      if (!groupA || !groupB || groupA !== groupB) {
        return { success: false, error: new AppError("Translation link not found", 404) };
      }

      const { error: deleteError } = await supabase
        .from("post_translations")
        .delete()
        .eq("post_id", linkedPostId);

      if (deleteError) {
        console.error("Supabase error:", deleteError);
        throw new DatabaseError("Failed to unlink translation");
      }

      await this.cleanupSingletonGroup(groupA);
      return { success: true, data: { translation_group_id: groupA } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new AppError("Internal server error"),
      };
    }
  }

  private async cleanupSingletonGroup(groupId: string): Promise<void> {
    const { data, error } = await supabase
      .from("post_translations")
      .select("post_id")
      .eq("translation_group_id", groupId);
    if (error) {
      console.error("Supabase error:", error);
      return;
    }
    const remaining = data ?? [];
    if (remaining.length <= 1 && remaining.length > 0) {
      const { error: cleanupError } = await supabase
        .from("post_translations")
        .delete()
        .eq("post_id", remaining[0].post_id);
      if (cleanupError) {
        console.error("Supabase error:", cleanupError);
      }
    }
  }
}

