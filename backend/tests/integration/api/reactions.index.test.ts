import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/reactions/[postId]/index.ts";
import { supabase } from "../../../lib/supabase.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

const mockContext = {
  params: { postId: "post-1" },
} as unknown as FreshContext;

Deno.test("Integration: GET /api/reactions/:postId returns counts", async () => {
  const supabaseAny = supabase as unknown as {
    from: (...args: unknown[]) => unknown;
  };
  const _fromStub = stub(supabaseAny, "from", () => ({
    select: () => ({
      eq: () =>
        Promise.resolve({
          data: [
            { reaction_type: "like" },
            { reaction_type: "like" },
            { reaction_type: "dislike" },
          ],
          error: null,
        }),
    }),
  }));

  const req = new Request("http://localhost/api/reactions/post-1", {
    method: "GET",
    headers: { "Origin": "http://localhost:8000" },
  });

  const res = await handler.GET!(req, mockContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.total, 3);

  restore();
});
