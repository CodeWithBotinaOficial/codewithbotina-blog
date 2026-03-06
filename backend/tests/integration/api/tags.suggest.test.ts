import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/tags/suggest.ts";
import { supabase } from "../../../lib/supabase.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

Deno.test("Integration: POST /api/tags/suggest returns relevant tags", async () => {
  const supabaseAny = supabase as unknown as { from: (...args: unknown[]) => unknown };
  const _fromStub = stub(supabaseAny, "from", () => ({
    select: () => ({
      order: () =>
        Promise.resolve({
          data: [{ id: "tag-1", name: "React", slug: "react", usage_count: 3 }],
          error: null,
        }),
    }),
  }));

  const req = new Request("http://localhost/api/tags/suggest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:8000",
    },
    body: JSON.stringify({ title: "React guide", body: "Learn React basics" }),
  });

  const res = await handler.POST!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.suggestions.length, 1);

  restore();
});
