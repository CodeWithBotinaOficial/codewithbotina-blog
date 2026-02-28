import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { PostService } from "../../../services/post.service.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { ImageService } from "../../../services/image.service.ts";

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
