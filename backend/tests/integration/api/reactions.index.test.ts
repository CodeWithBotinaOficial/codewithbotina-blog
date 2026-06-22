import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/reactions/[postId]/index.ts";
import { supabase } from "../../../lib/supabase.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

const mockContext = {
  params: { postId: "post-1" },
} as unknown as FreshContext;

Deno.test("Integration: GET /api/reactions/:postId returns counts by translation group", async () => {
  const supabaseAny = supabase as unknown as {
    from: (...args: unknown[]) => unknown;
  };
  const eqCalls: Array<{ table: string; column: string; value: string }> = [];
  const _fromStub = stub(supabaseAny, "from", (tableArg) => {
    const table = String(tableArg);

    return {
      select: () => ({
        eq: (column: string, value: string) => {
          eqCalls.push({ table, column, value });

          if (table === "post_translations") {
            return {
              maybeSingle: () =>
                Promise.resolve({
                  data: { translation_group_id: "group-1" },
                  error: null,
                }),
            };
          }

          return Promise.resolve({
            data: [
              { reaction_type: "like" },
              { reaction_type: "like" },
              { reaction_type: "dislike" },
            ],
            error: null,
          });
        },
      }),
    };
  });

  try {
    const req = new Request("http://localhost/api/reactions/post-1", {
      method: "GET",
      headers: { "Origin": "http://localhost:8000" },
    });

    const res = await handler.GET!(req, mockContext);
    const body = await res.json();

    assertEquals(res.status, 200);
    assertEquals(body.success, true);
    assertEquals(body.data.total, 3);
    assertEquals(body.data.translation_group_id, "group-1");
    assertEquals(
      eqCalls.some((call) =>
        call.table === "post_reactions" &&
        call.column === "translation_group_id" &&
        call.value === "group-1"
      ),
      true,
    );
  } finally {
    restore();
  }
});

Deno.test("Integration: GET /api/reactions/:postId falls back to post id without translation group", async () => {
  const supabaseAny = supabase as unknown as {
    from: (...args: unknown[]) => unknown;
  };
  const eqCalls: Array<{ table: string; column: string; value: string }> = [];
  const _fromStub = stub(supabaseAny, "from", (tableArg) => {
    const table = String(tableArg);

    return {
      select: () => ({
        eq: (column: string, value: string) => {
          eqCalls.push({ table, column, value });

          if (table === "post_translations") {
            return {
              maybeSingle: () =>
                Promise.resolve({
                  data: null,
                  error: null,
                }),
            };
          }

          return Promise.resolve({
            data: [{ reaction_type: "like" }],
            error: null,
          });
        },
      }),
    };
  });

  try {
    const req = new Request("http://localhost/api/reactions/post-1", {
      method: "GET",
      headers: { "Origin": "http://localhost:8000" },
    });

    const res = await handler.GET!(req, mockContext);
    const body = await res.json();

    assertEquals(res.status, 200);
    assertEquals(body.success, true);
    assertEquals(body.data.total, 1);
    assertEquals(body.data.translation_group_id, "post-1");
    assertEquals(
      eqCalls.some((call) =>
        call.table === "post_reactions" &&
        call.column === "translation_group_id" &&
        call.value === "post-1"
      ),
      true,
    );
  } finally {
    restore();
  }
});
