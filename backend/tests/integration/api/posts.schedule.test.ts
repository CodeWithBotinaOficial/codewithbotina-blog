import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { supabase } from "../../../lib/supabase.ts";
import { PostService } from "../../../services/post.service.ts";

const service = new PostService();

Deno.test("Integration: schedulePost accepts a valid future scheduled_at and updates status", async () => {
  const future = new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString();

  const queryChain = {
    select: () => ({
      eq: () => ({
        single: () =>
          Promise.resolve({
            data: { id: "post-1", status: "draft", slug: "hello" },
            error: null,
          }),
      }),
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: "post-1",
                slug: "hello",
                status: "scheduled",
                scheduled_at: future,
              },
              error: null,
            }),
        }),
      }),
    }),
  };

  stub(supabase, "from", () => queryChain);

  const result = await service.schedulePost("hello", future, "admin-1");

  assertEquals(result.status, "scheduled");
  assertEquals(result.scheduled_at, future);

  restore();
});

Deno.test("Integration: publishScheduledPosts marks posts due at or before now as published", async () => {
  let updatePayload: Record<string, unknown> | null = null;
  const queryChain = {
    select: () => ({
      eq: () => ({
        lte: () =>
          Promise.resolve({
            data: [{ id: "post-1", slug: "hello" }],
            error: null,
          }),
      }),
    }),
    update: (payload: Record<string, unknown>) => {
      updatePayload = payload;
      return {
      in: () => ({
        select: () => Promise.resolve({ error: null }),
      }),
      };
    },
  };

  stub(supabase, "from", () => queryChain);

  const result = await service.publishScheduledPosts();

  assertEquals(result.published, 1);
  assertEquals(result.slugs, ["hello"]);
  assertEquals(updatePayload, { status: "published" });

  restore();
});

Deno.test("Integration: publishScheduledPosts returns zero when no posts are due", async () => {
  let updateCalled = false;
  const queryChain = {
    select: () => ({
      eq: () => ({
        lte: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
    update: () => {
      updateCalled = true;
      return {};
    },
  };

  stub(supabase, "from", () => queryChain);

  const result = await service.publishScheduledPosts();

  assertEquals(result, { published: 0, slugs: [] });
  assertEquals(updateCalled, false);

  restore();
});
