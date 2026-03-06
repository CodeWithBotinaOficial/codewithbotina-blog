import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/posts/[slug]/update.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { PostService } from "../../../services/post.service.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

const mockContext = {
  params: { slug: "hello" },
} as unknown as FreshContext;

Deno.test("Integration: PUT /api/posts/:slug/update returns 200", async () => {
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
    "updatePost",
    () =>
      Promise.resolve({
        success: true,
        data: {
          id: "post-1",
          titulo: "Hello Updated",
          slug: "hello-updated",
          body: "Updated content",
          imagen_url: null,
          fecha: new Date().toISOString(),
          language: "es",
        },
      }),
  );

  const req = new Request("http://localhost/api/posts/hello/update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:8000",
      "Authorization": "Bearer token",
    },
    body: JSON.stringify({
      titulo: "Hello Updated",
      slug: "hello-updated",
      body: "Updated content",
    }),
  });

  const res = await handler.PUT!(req, mockContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.slug, "hello-updated");

  restore();
});
