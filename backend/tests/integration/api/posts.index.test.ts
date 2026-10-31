import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/posts/index.ts";
import { supabase } from "../../../lib/supabase.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

Deno.test("Integration: GET /api/posts returns list with language filter", async () => {
  let selectedColumns = "";
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
            imagen_url: null,
            fecha: new Date().toISOString(),
            updated_at: null,
            language: "es",
            is_pinned: false,
            status: "published",
            scheduled_at: null,
          },
        ],
        error: null,
      }),
  };
  const _fromStub = stub(supabaseAny, "from", () => ({
    select: (columns: string) => {
      selectedColumns = columns;
      return queryBuilder;
    },
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
  const firstPost = body.data.posts[0];
  assertEquals("body" in firstPost, false);
  assertEquals(firstPost.slug, "hello");
  assertEquals(firstPost.titulo, "Hello");
  for (
    const field of [
      "id",
      "imagen_url",
      "fecha",
      "language",
      "is_pinned",
      "status",
      "scheduled_at",
    ]
  ) {
    assertEquals(field in firstPost, true);
  }
  assertEquals(selectedColumns.includes("body"), false);
  assertEquals(selectedColumns.includes("titulo"), true);
  assertEquals(selectedColumns.includes("slug"), true);

  restore();
});

Deno.test("Integration: GET /api/posts returns total count for pagination", async () => {
  const supabaseAny = supabase as unknown as {
    from: (...args: unknown[]) => unknown;
  };

  const countQueryBuilder = {
    select: () => countQueryBuilder,
    eq: () => countQueryBuilder,
    or: () => countQueryBuilder,
    then: (resolve: (value: { count: number; error: null }) => void) =>
      resolve({ count: 42, error: null }),
  };

  const dataQueryBuilder = {
    select: () => dataQueryBuilder,
    order: () => dataQueryBuilder,
    eq: () => dataQueryBuilder,
    or: () => dataQueryBuilder,
    range: () =>
      Promise.resolve({
        data: [
          {
            id: "post-1",
            titulo: "Hello",
            slug: "hello",
            imagen_url: null,
            fecha: new Date().toISOString(),
            updated_at: null,
            language: "es",
            is_pinned: false,
            status: "published",
            scheduled_at: null,
          },
        ],
        error: null,
      }),
  };

  let callCount = 0;
  const _fromStub = stub(supabaseAny, "from", () => {
    callCount += 1;
    return callCount === 1 ? countQueryBuilder : dataQueryBuilder;
  });

  const req = new Request(
    "http://localhost/api/posts?language=es&limit=10&offset=0",
    {
      method: "GET",
      headers: { "Origin": "http://localhost:8000" },
    },
  );

  const res = await handler.GET!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.total, 42);
  assertEquals(body.data.posts.length, 1);
  assertEquals("body" in body.data.posts[0], false);

  restore();
});
