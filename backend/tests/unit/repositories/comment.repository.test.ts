import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { CommentRepository } from "../../../repositories/comment.repository.ts";
import { SupabaseClient } from "@supabase/supabase-js";

Deno.test("CommentRepository orders pinned first then newest", async () => {
  const orderCalls: Array<{ column: string; opts: { ascending: boolean } }> =
    [];

  const client = {
    from: (_table: string) => ({
      select: (_columns: string) => ({
        eq: (_column: string, _value: string) => ({
          order: (column: string, opts: { ascending: boolean }) => {
            orderCalls.push({ column, opts });
            return {
              order: (column2: string, opts2: { ascending: boolean }) => {
                orderCalls.push({ column: column2, opts: opts2 });
                return Promise.resolve({ data: [], error: null });
              },
            };
          },
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  const repo = new CommentRepository(client);
  await repo.getCommentsByPost("post-123");

  assertEquals(orderCalls.length, 2);
  assertEquals(orderCalls[0], {
    column: "is_pinned",
    opts: { ascending: false },
  });
  assertEquals(orderCalls[1], {
    column: "created_at",
    opts: { ascending: false },
  });
});
