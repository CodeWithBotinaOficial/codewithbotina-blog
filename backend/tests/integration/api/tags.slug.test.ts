import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/tags/[slug].ts";
import { supabase } from "../../../lib/supabase.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

const mockContext = {
  params: { slug: "react" },
} as unknown as FreshContext;

Deno.test("Integration: GET /api/tags/:slug returns tag and posts", async () => {
  const supabaseAny = supabase as unknown as { from: (...args: unknown[]) => unknown };
  const _fromStub = stub(supabaseAny, "from", (...args: unknown[]) => {
    const table = String(args[0] ?? "");
    if (table === "tags") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { id: "tag-1", name: "React", slug: "react" },
                error: null,
              }),
          }),
        }),
      };
    }

    if (table === "posts") {
      return {
        select: (_columns: unknown, opts?: { count?: string; head?: boolean }) => {
          const isCountQuery = Boolean(opts?.head) && opts?.count === "exact";

          // countQuery: .select(..., { count:"exact", head:true }).eq(...)
          if (isCountQuery) {
            return {
              eq: () => Promise.resolve({ count: 1, error: null }),
            };
          }

          // postsQuery: .select(...).eq(...).order(...).range(...)
          return {
            eq: () => ({
              order: () => ({
                range: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: "post-1",
                        titulo: "React intro",
                        slug: "react-intro",
                        body: "Body",
                        imagen_url: null,
                        fecha: new Date().toISOString(),
                        language: "en",
                      },
                    ],
                    error: null,
                  }),
              }),
            }),
          };
        },
      };
    }

    return {} as never;
  });

  const req = new Request("http://localhost/api/tags/react", {
    method: "GET",
    headers: { "Origin": "http://localhost:8000" },
  });

  const res = await handler.GET!(req, mockContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.tag.slug, "react");
  assertEquals(body.data.posts.length, 1);

  restore();
});
