import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import { PostService } from "../../../services/post.service.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { ImageService } from "../../../services/image.service.ts";
import { ValidationError } from "../../../utils/errors.ts";

const service = new PostService(
  {} as unknown as AuthService,
  {} as unknown as ImageService,
);

Deno.test("generateSlug normalizes accents and punctuation", () => {
  const slug = service.generateSlug("¡Hola Mundo! 🌟");
  assertEquals(slug, "hola-mundo");
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
