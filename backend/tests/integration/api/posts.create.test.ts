import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/posts/create.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { PostService } from "../../../services/post.service.ts";
import { supabase } from "../../../lib/supabase.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

Deno.test("Integration: POST /api/posts/create returns 201", async () => {
  const adminUser = {
    id: "admin-id",
    email: "admin@example.com",
    full_name: "Admin",
    avatar_url: null,
    google_id: null,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
    is_admin: true,
  };
  const _authStub = stub(
    AuthService.prototype,
    "getUserFromToken",
    () => Promise.resolve(adminUser),
  );
  const _serviceStub = stub(
    PostService.prototype,
    "createPost",
    () =>
      Promise.resolve({
        success: true,
        data: {
          id: "post-1",
          titulo: "Hello",
          slug: "hello",
          body: "Content",
          imagen_url: null,
          fecha: new Date().toISOString(),
          status: "scheduled",
          scheduled_at: "2026-09-13T12:00:00.000Z",
          language: "es",
        },
      }),
  );

  const req = new Request("http://localhost/api/posts/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:8000",
      "Authorization": "Bearer token",
    },
    body: JSON.stringify({
      titulo: "Hello",
      slug: "hello",
      body: "Content",
      language: "es",
    }),
  });

  const res = await handler.POST!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 201);
  assertEquals(body.success, true);
  assertEquals(body.data.slug, "hello");
  assertEquals(body.data.status, "scheduled");
  assertEquals(body.data.scheduled_at, "2026-09-13T12:00:00.000Z");

  restore();
});

Deno.test("Integration: POST /api/posts/create supports batch payload", async () => {
  const adminUser = {
    id: "admin-id",
    email: "admin@example.com",
    full_name: "Admin",
    avatar_url: null,
    google_id: null,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
    is_admin: true,
  };
  const _authStub = stub(
    AuthService.prototype,
    "getUserFromToken",
    () => Promise.resolve(adminUser),
  );
  const _serviceStub = stub(
    PostService.prototype,
    "createPostsBatch",
    () =>
      Promise.resolve({
        success: true,
        data: {
          posts: [
            {
              id: "post-es",
              titulo: "Hola",
              slug: "hola",
              body: "Contenido",
              imagen_url: null,
              fecha: new Date().toISOString(),
              status: "scheduled",
              scheduled_at: "2026-09-13T12:00:00.000Z",
              language: "es",
            },
            {
              id: "post-en",
              titulo: "Hello",
              slug: "hello",
              body: "Content",
              imagen_url: null,
              fecha: new Date().toISOString(),
              status: "scheduled",
              scheduled_at: "2026-09-13T12:00:00.000Z",
              language: "en",
            },
          ],
          translation_group_id: "22222222-2222-2222-2222-222222222222",
        },
      }),
  );

  const req = new Request("http://localhost/api/posts/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:8000",
      "Authorization": "Bearer token",
    },
    body: JSON.stringify({
      posts: [
        { titulo: "Hola", slug: "hola", body: "Contenido", language: "es" },
        { titulo: "Hello", slug: "hello", body: "Content", language: "en" },
      ],
    }),
  });

  const res = await handler.POST!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 201);
  assertEquals(body.success, true);
  assertEquals(body.data.posts.length, 2);
  assertEquals(
    body.data.translation_group_id,
    "22222222-2222-2222-2222-222222222222",
  );
  assertEquals(body.data.posts[0].status, "scheduled");
  assertEquals(
    body.data.posts[0].scheduled_at,
    "2026-09-13T12:00:00.000Z",
  );

  restore();
});

Deno.test("PostService: scheduled post uses scheduled_at as fecha", async () => {
  const scheduledAt = new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString();
  let inserted: Record<string, unknown> | null = null;
  let postQueryCount = 0;

  stub(AuthService.prototype, "isAdmin", () => Promise.resolve(true));
  stub(supabase, "from", (table: string) => {
    if (table !== "posts") throw new Error(`Unexpected table: ${table}`);
    postQueryCount += 1;
    if (postQueryCount === 1) {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      };
    }
    return {
      insert: (rows: Record<string, unknown>[]) => {
        inserted = rows[0];
        return {
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { ...inserted, id: "post-1" },
                error: null,
              }),
          }),
        };
      },
    };
  });

  const result = await new PostService().createPost({
    titulo: "Scheduled post",
    slug: "scheduled-post",
    body: "x".repeat(100),
    language: "en",
    scheduled_at: scheduledAt,
  }, "admin-id");

  const saved = inserted as unknown as Record<string, unknown>;
  assertEquals(result.success, true);
  assertEquals(saved.status, "scheduled");
  assertEquals(saved.scheduled_at, scheduledAt);
  assertEquals(saved.fecha, scheduledAt);

  restore();
});

Deno.test("PostService: published post uses creation time as fecha", async () => {
  let inserted: Record<string, unknown> | null = null;
  let postQueryCount = 0;

  stub(AuthService.prototype, "isAdmin", () => Promise.resolve(true));
  stub(supabase, "from", (table: string) => {
    if (table !== "posts") throw new Error(`Unexpected table: ${table}`);
    postQueryCount += 1;
    if (postQueryCount === 1) {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      };
    }
    return {
      insert: (rows: Record<string, unknown>[]) => {
        inserted = rows[0];
        return {
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { ...inserted, id: "post-1" },
                error: null,
              }),
          }),
        };
      },
    };
  });

  const before = Date.now();
  const result = await new PostService().createPost({
    titulo: "Published post",
    slug: "published-post",
    body: "x".repeat(100),
    language: "en",
  }, "admin-id");
  const after = Date.now();

  const saved = inserted as unknown as Record<string, unknown>;
  assertEquals(result.success, true);
  assertEquals(saved.status, "published");
  assertEquals(saved.scheduled_at, null);
  const fecha = new Date(String(saved.fecha)).getTime();
  assert(fecha >= before && fecha <= after);

  restore();
});
