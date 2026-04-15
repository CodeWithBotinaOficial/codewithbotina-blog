import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/posts/[slug]/tags.ts";
import { supabase } from "../../../lib/supabase.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

const mockContext = {
  params: { slug: "hello" },
} as unknown as FreshContext;

Deno.test("Integration: GET /api/posts/:slug/tags returns tag list", async () => {
  const supabaseAny = supabase as unknown as {
    from: (...args: unknown[]) => unknown;
  };
  const _fromStub = stub(supabaseAny, "from", (...args: unknown[]) => {
    const table = String(args[0] ?? "");
    if (table === "posts") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { id: "post-1", slug: "hello" },
                error: null,
              }),
          }),
        }),
      };
    }

    if (table === "post_tags") {
      return {
        select: () => ({
          eq: () =>
            Promise.resolve({
              data: [
                { tag: { id: "tag-1", name: "React", slug: "react" } },
              ],
              error: null,
            }),
        }),
      };
    }

    return {} as never;
  });

  const req = new Request("http://localhost/api/posts/hello/tags", {
    method: "GET",
    headers: { "Origin": "http://localhost:8000" },
  });

  const res = await handler.GET!(req, mockContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.tags.length, 1);

  restore();
});
