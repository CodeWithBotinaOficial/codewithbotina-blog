import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/tags/index.ts";
import { supabase } from "../../../lib/supabase.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

Deno.test("Integration: GET /api/tags returns tag list", async () => {
  const supabaseAny = supabase as unknown as { from: (...args: unknown[]) => unknown };
  const queryBuilder: any = {
    ilike: () => queryBuilder,
    order: () => queryBuilder,
    range: () =>
      Promise.resolve({
        data: [
          { id: "tag-1", name: "React", slug: "react", usage_count: 5, created_at: null, description: null },
        ],
        error: null,
        count: 1,
      }),
  };
  const _fromStub = stub(supabaseAny, "from", () => ({
    select: () => queryBuilder,
  }));

  const req = new Request("http://localhost/api/tags", {
    method: "GET",
    headers: { "Origin": "http://localhost:8000" },
  });

  const res = await handler.GET!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.tags.length, 1);
  assertEquals(body.data.total, 1);

  restore();
});
