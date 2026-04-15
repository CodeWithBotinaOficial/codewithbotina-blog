import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/posts/index.ts";
import { supabase } from "../../../lib/supabase.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

Deno.test("Integration: GET /api/posts returns list with language filter", async () => {
  const supabaseAny = supabase as unknown as {
    from: (...args: unknown[]) => unknown;
  };
  const queryBuilder = {
    order: () => queryBuilder,
    eq: () => queryBuilder,
    range: () =>
      Promise.resolve({
        data: [
          {
            id: "post-1",
            titulo: "Hello",
            slug: "hello",
            body: "Content",
            imagen_url: null,
            fecha: new Date().toISOString(),
            updated_at: null,
            language: "es",
          },
        ],
        error: null,
      }),
  };
  const _fromStub = stub(supabaseAny, "from", () => ({
    select: () => queryBuilder,
  }));

  const req = new Request("http://localhost/api/posts?language=es&limit=10", {
    method: "GET",
    headers: { "Origin": "http://localhost:8000" },
  });

  const res = await handler.GET!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.posts.length, 1);

  restore();
});
