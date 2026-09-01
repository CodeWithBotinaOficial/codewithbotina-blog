import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import { PostService } from "../../../services/post.service.ts";
import { PostTranslationService } from "../../../services/post-translation.service.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { ImageService } from "../../../services/image.service.ts";
import { supabase } from "../../../lib/supabase.ts";
import { ValidationError } from "../../../utils/errors.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";

const service = new PostService(
  {} as unknown as AuthService,
  {} as unknown as ImageService,
);

Deno.test("generateSlug normalizes accents and punctuation", () => {
  const slug = service.generateSlug("¡Hola Mundo! 🌟");
  assertEquals(slug, "hola-mundo");
});

Deno.test("generateSlug normalizes Portuguese characters", () => {
  const slug = service.generateSlug("Bem-vindos ao CodeWithBotina 🌟");
  assertEquals(slug, "bem-vindos-ao-codewithbotina");

  const slug2 = service.generateSlug("Coração de Programador");
  assertEquals(slug2, "coracao-de-programador");
});

Deno.test("generateSlug collapses whitespace", () => {
  const slug = service.generateSlug("  Hello    World  ");
  assertEquals(slug, "hello-world");
});

Deno.test("sanitizeMarkdown strips raw HTML", () => {
  const sanitized = service.sanitizeMarkdown("<script>alert('x')</script>Hi");
  assertEquals(sanitized, "Hi");
});

Deno.test("sanitizeMarkdown keeps markdown text intact", () => {
  const sanitized = service.sanitizeMarkdown("**Bold** text");
  assertStringIncludes(sanitized, "**Bold**");
});

Deno.test("supportedLanguages includes pt-br", () => {
  // @ts-ignore: testing private property
  const supported = service.supportedLanguages;
  assertEquals(supported.has("pt-br"), true);
});

Deno.test("createPostsBatch rejects duplicate languages", async () => {
  const adminAuth = {
    isAdmin: () => Promise.resolve(true),
  } as unknown as AuthService;
  const multi = new PostService(adminAuth, {} as unknown as ImageService);

  const result = await multi.createPostsBatch(
    {
      posts: [
        { titulo: "Hola", slug: "hola", body: "x".repeat(120), language: "es" },
        { titulo: "Otro", slug: "otro", body: "x".repeat(120), language: "es" },
      ],
    },
    "admin-id",
  );

  assertEquals(result.success, false);
  assertEquals(result.error instanceof ValidationError, true);
});

Deno.test("bulkUpdatePosts rejects invalid post_id", async () => {
  const adminAuth = {
    isAdmin: () => Promise.resolve(true),
  } as unknown as AuthService;
  const multi = new PostService(adminAuth, {} as unknown as ImageService);

  const result = await multi.bulkUpdatePosts(
    {
      updates: [
        {
          post_id: "not-a-uuid",
          post: {
            titulo: "Hola",
            slug: "hola",
            body: "x".repeat(120),
            language: "es",
          },
        },
      ],
    },
    "admin-id",
  );

  assertEquals(result.success, false);
  assertEquals(result.error instanceof ValidationError, true);
});

Deno.test("createPostsBatch preserves status and scheduled_at for each post", async () => {
  const adminAuth = {
    isAdmin: () => Promise.resolve(true),
  } as unknown as AuthService;
  const service = new PostService(adminAuth, {} as unknown as ImageService);

  const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString();
  let insertedRows: Array<Record<string, unknown>> = [];

  const _fromStub = stub(supabase, "from", (table: string) => {
    if (table === "posts") {
      return {
        insert(rows: Array<Record<string, unknown>>) {
          insertedRows = rows;
          return {
            select: () =>
              Promise.resolve({
                data: rows.map((row, index) => ({
                  id: `post-${index}`,
                  titulo: row.titulo,
                  slug: row.slug,
                  body: row.body,
                  imagen_url: row.imagen_url,
                  fecha: row.fecha,
                  language: row.language,
                  is_pinned: row.is_pinned,
                  status: row.status,
                  scheduled_at: row.scheduled_at,
                })),
                error: null,
              }),
          };
        },
        select: () => ({
          eq: () => ({
            eq: () => ({
              neq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    }

    return {
      select: () => Promise.resolve({ data: [], error: null }),
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      }),
      delete: () => ({ in: () => ({}) }),
    };
  });
  stub(
    PostTranslationService.prototype,
    "linkTranslations",
    async () =>
      await Promise.resolve({
        success: true,
        data: { translation_group_id: "group-1", translations: [] },
      }),
  );

  try {
    const result = await service.createPostsBatch(
      {
        posts: [
          {
            titulo: "First post",
            slug: "first-post",
            body: "x".repeat(120),
            language: "es",
            status: "published",
            scheduled_at: null,
          },
          {
            titulo: "Second post",
            slug: "second-post",
            body: "x".repeat(120),
            language: "en",
            status: "scheduled",
            scheduled_at: scheduledAt,
          },
        ],
      },
      "admin-id",
    );

    assertEquals(result.success, true);
    assertEquals(insertedRows[0].status, "published");
    assertEquals(insertedRows[0].scheduled_at, null);
    assertEquals(insertedRows[1].status, "scheduled");
    assertEquals(insertedRows[1].scheduled_at, scheduledAt);
  } finally {
    restore();
  }
});
