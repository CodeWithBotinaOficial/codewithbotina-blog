import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/posts/create.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { PostService } from "../../../services/post.service.ts";
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
              language: "es",
            },
            {
              id: "post-en",
              titulo: "Hello",
              slug: "hello",
              body: "Content",
              imagen_url: null,
              fecha: new Date().toISOString(),
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
  assertEquals(body.data.translation_group_id, "22222222-2222-2222-2222-222222222222");

  restore();
});
