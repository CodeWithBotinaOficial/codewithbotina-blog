import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/posts/[slug]/index.ts";
import { supabase } from "../../../lib/supabase.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

const mockContext = {
  params: { slug: "hello" },
} as unknown as FreshContext;

Deno.test("Integration: GET /api/posts/:slug returns post with tags", async () => {
  const supabaseAny = supabase as unknown as {
    from: (...args: unknown[]) => unknown;
  };
  const queryBuilder = {
    eq: () => queryBuilder,
    maybeSingle: () =>
      Promise.resolve({
        data: {
          id: "post-1",
          titulo: "Hello",
          slug: "hello",
          body: "Content",
          imagen_url: null,
          fecha: new Date().toISOString(),
          updated_at: null,
          language: "es",
          post_tags: [
            {
              tag: {
                id: "tag-1",
                name: "Tag One",
                slug: "tag-one",
                usage_count: 2,
              },
            },
          ],
        },
        error: null,
      }),
  };
  const _fromStub = stub(supabaseAny, "from", () => ({
    select: () => queryBuilder,
  }));

  const req = new Request("http://localhost/api/posts/hello?language=es", {
    method: "GET",
    headers: { "Origin": "http://localhost:8000" },
  });

  const res = await handler.GET!(req, mockContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.slug, "hello");
  assertEquals(body.data.tags.length, 1);

  restore();
});
