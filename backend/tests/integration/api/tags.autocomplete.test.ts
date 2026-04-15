import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/tags/autocomplete.ts";
import { supabase } from "../../../lib/supabase.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

Deno.test("Integration: GET /api/tags/autocomplete returns empty for short query", async () => {
  const req = new Request("http://localhost/api/tags/autocomplete?q=a", {
    method: "GET",
    headers: { "Origin": "http://localhost:8000" },
  });

  const res = await handler.GET!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.data.tags.length, 0);
});

Deno.test("Integration: GET /api/tags/autocomplete returns matches", async () => {
  const supabaseAny = supabase as unknown as {
    from: (...args: unknown[]) => unknown;
  };
  const _fromStub = stub(supabaseAny, "from", () => ({
    select: () => ({
      ilike: () => ({
        order: () => ({
          limit: () =>
            Promise.resolve({
              data: [{
                id: "tag-1",
                name: "React",
                slug: "react",
                usage_count: 4,
              }],
              error: null,
            }),
        }),
      }),
    }),
  }));

  const req = new Request("http://localhost/api/tags/autocomplete?q=rea", {
    method: "GET",
    headers: { "Origin": "http://localhost:8000" },
  });

  const res = await handler.GET!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.tags.length, 1);

  restore();
});
