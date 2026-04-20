import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { supabase } from "../../../lib/supabase.ts";
import { AppError, ValidationError } from "../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

const SUPPORTED_LANGUAGES = new Set(["en", "es", "fr", "de", "pt", "ja", "zh"]);
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_OFFSET = 50_000;
const MAX_QUERY_LENGTH = 80;
const MAX_TAGS = 10;

type Relevance =
  | "most_reactions"
  | "most_likes"
  | "most_dislikes"
  | "most_comments"
  | "most_recent";
type SortOrder = "newest" | "oldest" | "az" | "za";
type Scope = "title" | "content" | "title_content" | "tags";
type Phase = "title" | "content" | "tags" | "none";

type SearchResultPost = {
  id: string;
  titulo: string;
  slug: string;
  body: string;
  imagen_url: string | null;
  fecha: string | null;
  language: string;
  // Metrics (only populated when relevance requires them).
  likes_count?: number;
  dislikes_count?: number;
  reactions_count?: number;
  comments_count?: number;
  preview?: string;
};

function stripMarkdown(value: string): string {
  if (!value) return "";
  let s = String(value);
  // Remove fenced code blocks
  s = s.replace(/```[\s\S]*?```/g, " ");
  // Remove inline code
  s = s.replace(/`([^`]*)`/g, "$1");
  // Remove images: ![alt](url) -> alt
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Links: [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  // Headings
  s = s.replace(/^#+\s+/gm, "");
  // Blockquotes
  s = s.replace(/^>\s+/gm, "");
  // Emphasis
  s = s.replace(/\*\*(.*?)\*\*/g, "$1");
  s = s.replace(/\*(.*?)\*/g, "$1");
  s = s.replace(/__(.*?)__/g, "$1");
  s = s.replace(/_(.*?)_/g, "$1");
  // Lists
  s = s.replace(/^[\-\*\+]\s+/gm, "");
  // Remove remaining markdown characters
  s = s.replace(/[#*_>`~-]/g, "");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function truncateText(text: string, max = 150): string {
  if (!text) return "";
  if (text.length <= max) return text;
  // Try to avoid cutting mid-word
  const truncated = text.slice(0, max);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > Math.floor(max * 0.6)) return truncated.slice(0, lastSpace) + "...";
  return truncated + "...";
}

function attachPreview(posts: SearchResultPost[]): SearchResultPost[] {
  return posts.map((p) => {
    const source = p.body ?? "";
    const plain = stripMarkdown(source);
    const preview = truncateText(plain.replace(/\s+/g, " ").trim(), 150);
    return { ...p, preview };
  });
}

function parseCsv(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function toStartOfDayUtcIso(date: Date): string {
  const d = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  return d.toISOString();
}

function toEndOfDayUtcIso(date: Date): string {
  const d = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
  return d.toISOString();
}

function parseDateParam(raw: string | null, label: string): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Accept YYYY-MM-DD or full ISO. Rely on Date parsing; validate after.
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError(`Invalid ${label} date`);
  }
  return d;
}

function isFutureDate(d: Date): boolean {
  return d.getTime() > Date.now();
}

function parseEnum<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!raw) return fallback;
  const v = raw.trim() as T;
  return allowed.includes(v) ? v : fallback;
}

async function resolveTagIdsFromSlugs(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const { data, error } = await supabase
    .from("tags")
    .select("id, slug")
    .in("slug", slugs);
  if (error) {
    console.error("Supabase error:", error);
    throw new AppError("Failed to resolve tags", 500);
  }
  const ids = ((data ?? []) as Array<{ id: string | null }>).map((t) => t.id)
    .filter((v): v is string => typeof v === "string" && v.trim() !== "");
  // If any slug is unknown, treat as no matches.
  if (ids.length !== slugs.length) return [];
  return ids;
}

async function tagIdsForNameSearch(q: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("id")
    .ilike("name", `%${q}%`)
    .limit(50);
  if (error) {
    console.error("Supabase error:", error);
    throw new AppError("Failed to search tags", 500);
  }
  return ((data ?? []) as Array<{ id: string | null }>).map((t) => t.id)
    .filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

async function postIdsHavingAllTags(tagIds: string[]): Promise<string[]> {
  if (tagIds.length === 0) return [];
  const { data, error } = await supabase
    .from("post_tags")
    .select("post_id, tag_id")
    .in("tag_id", tagIds);
  if (error) {
    console.error("Supabase error:", error);
    throw new AppError("Failed to filter by tags", 500);
  }

  const seenByPost = new Map<string, Set<string>>();
  for (
    const row of (data ?? []) as Array<{ post_id: string; tag_id: string }>
  ) {
    const postId = row.post_id;
    const tagId = row.tag_id;
    if (!postId || !tagId) continue;
    const set = seenByPost.get(postId) ?? new Set<string>();
    set.add(tagId);
    seenByPost.set(postId, set);
  }

  const required = new Set(tagIds);
  const out: string[] = [];
  for (const [postId, present] of seenByPost.entries()) {
    if (present.size < required.size) continue;
    let ok = true;
    for (const t of required) {
      if (!present.has(t)) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(postId);
  }
  return out;
}

async function postIdsHavingAnyTag(tagIds: string[]): Promise<Set<string>> {
  if (tagIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("post_tags")
    .select("post_id")
    .in("tag_id", tagIds);
  if (error) {
    console.error("Supabase error:", error);
    throw new AppError("Failed to search posts by tags", 500);
  }
  const out = new Set<string>();
  for (const row of (data ?? []) as Array<{ post_id: string }>) {
    if (row?.post_id) out.add(row.post_id);
  }
  return out;
}

type BaseFilterChain<T> = {
  in: (column: string, values: string[]) => T;
  gte: (column: string, value: string) => T;
  lte: (column: string, value: string) => T;
};

function applyBasePostFilters<T extends BaseFilterChain<T>>(
  query: T,
  opts: {
    languages: string[] | null;
    fromIso: string | null;
    toIso: string | null;
    allowedPostIds: string[] | null;
  },
): T {
  let q = query;
  if (opts.languages && opts.languages.length > 0) {
    q = q.in("language", opts.languages);
  }
  if (opts.fromIso) q = q.gte("fecha", opts.fromIso);
  if (opts.toIso) q = q.lte("fecha", opts.toIso);
  if (opts.allowedPostIds) {
    if (opts.allowedPostIds.length === 0) {
      // Ensure no results.
      q = q.in("id", ["__no_such_id__"]);
    } else {
      q = q.in("id", opts.allowedPostIds);
    }
  }
  return q;
}

async function countMatchingPosts(
  opts: {
    languages: string[] | null;
    fromIso: string | null;
    toIso: string | null;
    allowedPostIds: string[] | null;
    titleIlike?: string;
    bodyIlike?: string;
    tagSearchPostIds?: string[] | null;
  },
): Promise<number> {
  let q = supabase.from("posts").select("id", { count: "exact", head: true });
  q = applyBasePostFilters(q, {
    languages: opts.languages,
    fromIso: opts.fromIso,
    toIso: opts.toIso,
    allowedPostIds: opts.tagSearchPostIds ?? opts.allowedPostIds,
  });
  if (opts.titleIlike) q = q.ilike("titulo", opts.titleIlike);
  if (opts.bodyIlike) q = q.ilike("body", opts.bodyIlike);
  const { count, error } = await q;
  if (error) {
    console.error("Supabase error:", error);
    throw new AppError("Failed to count posts", 500);
  }
  return count ?? 0;
}

async function fetchAllMatchingPosts(
  opts: {
    languages: string[] | null;
    fromIso: string | null;
    toIso: string | null;
    allowedPostIds: string[] | null;
    titleIlike?: string;
    bodyIlike?: string;
    tagSearchPostIds?: string[] | null;
  },
): Promise<SearchResultPost[]> {
  // Fetch all matches in chunks because ordering by computed metrics requires global sort.
  const total = await countMatchingPosts(opts);
  if (total === 0) return [];

  const pageSize = 1000;
  const posts: SearchResultPost[] = [];
  for (let offset = 0; offset < total; offset += pageSize) {
    let q = supabase
      .from("posts")
      .select("id, titulo, slug, body, imagen_url, fecha, language")
      .order("fecha", { ascending: false })
      .range(offset, Math.min(offset + pageSize - 1, total - 1));
    q = applyBasePostFilters(q, {
      languages: opts.languages,
      fromIso: opts.fromIso,
      toIso: opts.toIso,
      allowedPostIds: opts.tagSearchPostIds ?? opts.allowedPostIds,
    });
    if (opts.titleIlike) q = q.ilike("titulo", opts.titleIlike);
    if (opts.bodyIlike) q = q.ilike("body", opts.bodyIlike);

    const { data, error } = await q;
    if (error) {
      console.error("Supabase error:", error);
      throw new AppError("Failed to fetch posts", 500);
    }
    posts.push(...((data ?? []) as SearchResultPost[]));
  }

  return posts;
}

async function addMetrics(
  posts: SearchResultPost[],
): Promise<Map<string, { likes: number; dislikes: number; comments: number }>> {
  const ids = posts.map((p) => p.id).filter(Boolean);
  const metrics = new Map<
    string,
    { likes: number; dislikes: number; comments: number }
  >();
  for (const id of ids) metrics.set(id, { likes: 0, dislikes: 0, comments: 0 });

  // Reactions
  for (const batch of chunk(ids, 200)) {
    const { data, error } = await supabase
      .from("post_reactions")
      .select("post_id, reaction_type")
      .in("post_id", batch);
    if (error) {
      console.error("Supabase error:", error);
      throw new AppError("Failed to fetch reactions", 500);
    }
    for (
      const row of (data ?? []) as Array<
        { post_id: string; reaction_type: string }
      >
    ) {
      const m = metrics.get(row.post_id);
      if (!m) continue;
      if (row.reaction_type === "like") m.likes += 1;
      if (row.reaction_type === "dislike") m.dislikes += 1;
    }
  }

  // Comments
  for (const batch of chunk(ids, 200)) {
    const { data, error } = await supabase
      .from("comments")
      .select("post_id")
      .in("post_id", batch);
    if (error) {
      console.error("Supabase error:", error);
      throw new AppError("Failed to fetch comments", 500);
    }
    for (const row of (data ?? []) as Array<{ post_id: string }>) {
      const m = metrics.get(row.post_id);
      if (!m) continue;
      m.comments += 1;
    }
  }

  return metrics;
}

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  async GET(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const url = new URL(req.url);

    const qRaw = (url.searchParams.get("q") ?? "").trim();
    const q = qRaw;
    const fromDate = parseDateParam(url.searchParams.get("from"), "from");
    const toDate = parseDateParam(url.searchParams.get("to"), "to");

    const relevance = parseEnum<Relevance>(
      url.searchParams.get("relevance"),
      [
        "most_reactions",
        "most_likes",
        "most_dislikes",
        "most_comments",
        "most_recent",
      ],
      "most_recent",
    );
    const sort = parseEnum<SortOrder>(
      url.searchParams.get("sort"),
      ["newest", "oldest", "az", "za"],
      "newest",
    );
    const scope = parseEnum<Scope>(
      url.searchParams.get("scope"),
      ["title", "content", "title_content", "tags"],
      "title",
    );

    const languageSingle = (url.searchParams.get("language") ?? "").trim();
    const languagesCsv = (url.searchParams.get("languages") ?? "").trim();
    const languagesRaw = languagesCsv
      ? parseCsv(languagesCsv)
      : (languageSingle ? [languageSingle] : []);
    const languages = languagesRaw.includes("all") ? null : languagesRaw;

    const tagIdsCsv = url.searchParams.get("tag_ids");
    const tagSlugsCsv = url.searchParams.get("tags"); // shareable slugs
    const tagSlug = url.searchParams.get("tag_slug");
    const tagIdsDirect = parseCsv(tagIdsCsv);
    const tagSlugsDirect = parseCsv(tagSlugsCsv);

    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    try {
      if (q.length > MAX_QUERY_LENGTH) {
        throw new ValidationError("Query too long");
      }
      if (languages) {
        for (const lang of languages) {
          if (!SUPPORTED_LANGUAGES.has(lang)) {
            throw new ValidationError("Unsupported language");
          }
        }
      }

      if (fromDate && isFutureDate(fromDate)) {
        throw new ValidationError("Future dates not allowed");
      }
      if (toDate && isFutureDate(toDate)) {
        throw new ValidationError("Future dates not allowed");
      }
      if (fromDate && toDate && toDate.getTime() < fromDate.getTime()) {
        throw new ValidationError("Invalid date range");
      }

      const limit = Math.min(
        Math.max(
          Number.parseInt(limitParam ?? `${DEFAULT_LIMIT}`, 10) ||
            DEFAULT_LIMIT,
          1,
        ),
        MAX_LIMIT,
      );
      const offset = Math.max(Number.parseInt(offsetParam ?? "0", 10) || 0, 0);
      if (offset > MAX_OFFSET) throw new ValidationError("Offset too large");

      const fromIso = fromDate ? toStartOfDayUtcIso(fromDate) : null;
      const toIso = toDate ? toEndOfDayUtcIso(toDate) : null;

      // Resolve tag filters to IDs.
      let selectedTagIds: string[] = [];
      if (tagIdsDirect.length > 0) {
        selectedTagIds = tagIdsDirect;
      } else if (tagSlugsDirect.length > 0) {
        selectedTagIds = await resolveTagIdsFromSlugs(tagSlugsDirect);
      }
      if (tagSlug) {
        const more = await resolveTagIdsFromSlugs([tagSlug.trim()]);
        selectedTagIds = [...new Set([...selectedTagIds, ...more])];
      }
      if (selectedTagIds.length > MAX_TAGS) {
        throw new ValidationError("Too many tags");
      }

      // AND logic for selected tags.
      let allowedPostIds: string[] | null = null;
      if (selectedTagIds.length > 0) {
        const ids = await postIdsHavingAllTags(selectedTagIds);
        allowedPostIds = ids;
        if (ids.length === 0) {
          const response = successResponse(
            {
              posts: attachPreview([]),
              total: 0,
              limit,
              offset,
              phase: "none" satisfies Phase,
            },
            "No results",
            200,
          );
          headers.forEach((value, key) => response.headers.set(key, value));
          return response;
        }
      }

      // If scope is not the default title phase, we do a direct search (no fallback).
      // Otherwise (default), we do sequential fallback: title -> content -> tags.
      let phase: Phase = "none";
      let titleIlike: string | undefined;
      let bodyIlike: string | undefined;
      let tagSearchPostIds: string[] | null = null;

      const hasTerm = Boolean(q);
      const ilikeTerm = hasTerm ? `%${q}%` : "";

      if (hasTerm) {
        if (scope === "content") {
          phase = "content";
          bodyIlike = ilikeTerm;
        } else if (scope === "title_content") {
          // PostgREST OR can be fragile with unescaped chars; do two queries and union in-memory when needed.
          // For counting and fetching we use OR via separate fetchAll path below (metrics path fetches all anyway).
          // Here we mark both and handle by fetch/count helpers individually.
          // Note: this still respects sequential fallback contract by being an explicit user choice.
          phase = "content";
          titleIlike = ilikeTerm;
          bodyIlike = ilikeTerm;
        } else if (scope === "tags") {
          phase = "tags";
          const qTagIds = await tagIdsForNameSearch(q);
          if (qTagIds.length === 0) {
            const response = successResponse(
              {
                posts: attachPreview([]),
                total: 0,
                limit,
                offset,
                phase: "tags" satisfies Phase,
              },
              "No results",
              200,
            );
            headers.forEach((value, key) => response.headers.set(key, value));
            return response;
          }
          const anyPosts = await postIdsHavingAnyTag(qTagIds);
          let ids = Array.from(anyPosts);
          if (allowedPostIds) {
            const allowed = new Set(allowedPostIds);
            ids = ids.filter((id) => allowed.has(id));
          }
          tagSearchPostIds = ids;
          if (tagSearchPostIds.length === 0) {
            const response = successResponse(
              {
                posts: attachPreview([]),
                total: 0,
                limit,
                offset,
                phase: "tags" satisfies Phase,
              },
              "No results",
              200,
            );
            headers.forEach((value, key) => response.headers.set(key, value));
            return response;
          }
        } else {
          // Sequential fallback.
          const titleCount = await countMatchingPosts({
            languages,
            fromIso,
            toIso,
            allowedPostIds,
            titleIlike: ilikeTerm,
          });
          if (titleCount > 0) {
            phase = "title";
            titleIlike = ilikeTerm;
          } else {
            const bodyCount = await countMatchingPosts({
              languages,
              fromIso,
              toIso,
              allowedPostIds,
              bodyIlike: ilikeTerm,
            });
            if (bodyCount > 0) {
              phase = "content";
              bodyIlike = ilikeTerm;
            } else {
              const qTagIds = await tagIdsForNameSearch(q);
              if (qTagIds.length > 0) {
                const anyPosts = await postIdsHavingAnyTag(qTagIds);
                let ids = Array.from(anyPosts);
                if (allowedPostIds) {
                  const allowed = new Set(allowedPostIds);
                  ids = ids.filter((id) => allowed.has(id));
                }
                if (ids.length > 0) {
                  phase = "tags";
                  tagSearchPostIds = ids;
                } else {
                  phase = "none";
                }
              } else {
                phase = "none";
              }
            }
          }
        }
      }

      // Relevance ordering requires global metrics; compute in-memory and paginate after sorting.
      if (relevance !== "most_recent") {
        let posts: SearchResultPost[] = [];

        if (!hasTerm) {
          posts = await fetchAllMatchingPosts({
            languages,
            fromIso,
            toIso,
            allowedPostIds,
          });
        } else if (scope === "title_content") {
          const titleMatches = await fetchAllMatchingPosts({
            languages,
            fromIso,
            toIso,
            allowedPostIds,
            titleIlike: ilikeTerm,
          });
          const bodyMatches = await fetchAllMatchingPosts({
            languages,
            fromIso,
            toIso,
            allowedPostIds,
            bodyIlike: ilikeTerm,
          });
          const byId = new Map<string, SearchResultPost>();
          for (const p of [...titleMatches, ...bodyMatches]) byId.set(p.id, p);
          posts = Array.from(byId.values());
        } else if (phase === "tags") {
          posts = await fetchAllMatchingPosts({
            languages,
            fromIso,
            toIso,
            allowedPostIds,
            tagSearchPostIds,
          });
        } else {
          posts = await fetchAllMatchingPosts({
            languages,
            fromIso,
            toIso,
            allowedPostIds,
            titleIlike,
            bodyIlike,
          });
        }

        const total = posts.length;
        if (total === 0) {
          const response = successResponse(
            { posts: attachPreview([]), total: 0, limit, offset, phase },
            "No results",
            200,
          );
          headers.forEach((value, key) => response.headers.set(key, value));
          return response;
        }

        const metrics = await addMetrics(posts);
        for (const p of posts) {
          const m = metrics.get(p.id) ?? { likes: 0, dislikes: 0, comments: 0 };
          p.likes_count = m.likes;
          p.dislikes_count = m.dislikes;
          p.comments_count = m.comments;
          p.reactions_count = m.likes + m.dislikes;
        }

        const scoreFor = (p: SearchResultPost): number => {
          if (relevance === "most_likes") return p.likes_count ?? 0;
          if (relevance === "most_dislikes") return p.dislikes_count ?? 0;
          if (relevance === "most_comments") return p.comments_count ?? 0;
          return p.reactions_count ?? 0;
        };

        posts.sort((a, b) => {
          const d = scoreFor(b) - scoreFor(a);
          if (d !== 0) return d;
          const af = a.fecha ? new Date(a.fecha).getTime() : 0;
          const bf = b.fecha ? new Date(b.fecha).getTime() : 0;
          return bf - af;
        });

        const pagePosts = posts.slice(offset, offset + limit);
        const response = successResponse(
          { posts: attachPreview(pagePosts), total, limit, offset, phase, relevance },
          "Posts fetched successfully",
          200,
        );
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      // Default ordering: date/title sort can be handled by the database query.
      // Build query for data + a separate count.
      let total = 0;

      if (scope === "title_content" && hasTerm) {
        // Title+content explicit scope: union of both sets (distinct posts).
        const [titleMatches, bodyMatches] = await Promise.all([
          fetchAllMatchingPosts({
            languages,
            fromIso,
            toIso,
            allowedPostIds,
            titleIlike: ilikeTerm,
          }),
          fetchAllMatchingPosts({
            languages,
            fromIso,
            toIso,
            allowedPostIds,
            bodyIlike: ilikeTerm,
          }),
        ]);
        const byId = new Map<string, SearchResultPost>();
        for (const p of [...titleMatches, ...bodyMatches]) byId.set(p.id, p);
        const merged = Array.from(byId.values());
        total = merged.length;

        // Apply sort to merged set.
        merged.sort((a, b) => {
          if (sort === "az") return a.titulo.localeCompare(b.titulo);
          if (sort === "za") return b.titulo.localeCompare(a.titulo);
          const af = a.fecha ? new Date(a.fecha).getTime() : 0;
          const bf = b.fecha ? new Date(b.fecha).getTime() : 0;
          return sort === "oldest" ? af - bf : bf - af;
        });

        const pagePosts = merged.slice(offset, offset + limit);
        const response = successResponse(
          { posts: attachPreview(pagePosts), total, limit, offset, phase, relevance, sort },
          "Posts fetched successfully",
          200,
        );
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      // Count
      total = await countMatchingPosts({
        languages,
        fromIso,
        toIso,
        allowedPostIds,
        titleIlike,
        bodyIlike,
        tagSearchPostIds,
      });

      if (total === 0) {
        const response = successResponse(
          { posts: attachPreview([]), total: 0, limit, offset, phase, relevance, sort },
          "No results",
          200,
        );
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      let query = supabase
        .from("posts")
        .select("id, titulo, slug, body, imagen_url, fecha, language")
        .range(offset, offset + limit - 1);

      query = applyBasePostFilters(query, {
        languages,
        fromIso,
        toIso,
        allowedPostIds: tagSearchPostIds ?? allowedPostIds,
      });
      if (titleIlike) query = query.ilike("titulo", titleIlike);
      if (bodyIlike) query = query.ilike("body", bodyIlike);

      if (sort === "az" || sort === "za") {
        query = query.order("titulo", { ascending: sort === "az" });
      } else {
        query = query.order("fecha", { ascending: sort === "oldest" });
      }

      const { data, error } = await query;
      if (error) {
        console.error("Supabase error:", error);
        throw new AppError("Failed to fetch posts", 500);
      }

      const response = successResponse(
        {
          posts: attachPreview((data ?? []) as SearchResultPost[]),
          total,
          limit,
          offset,
          phase,
          relevance,
          sort,
        },
        "Posts fetched successfully",
        200,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      const response = errorResponse(
        error instanceof Error ? error.message : "Internal server error",
        statusCode,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};
