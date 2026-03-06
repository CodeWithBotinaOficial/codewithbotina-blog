import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/posts/[slug]/delete.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { PostService } from "../../../services/post.service.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

const mockContext = {
  params: { slug: "hello" },
} as unknown as FreshContext;

Deno.test("Integration: DELETE /api/posts/:slug/delete returns confirmation info", async () => {
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
  const _infoStub = stub(
    PostService.prototype,
    "getDeleteInfo",
    () =>
      Promise.resolve({
        post_id: "post-1",
        titulo: "Hello",
        comments_count: 2,
        reactions_count: 4,
        likes_count: 3,
        dislikes_count: 1,
        imagen_url: null,
      }),
  );

  const req = new Request("http://localhost/api/posts/hello/delete", {
    method: "DELETE",
    headers: {
      "Origin": "http://localhost:8000",
      "Authorization": "Bearer token",
    },
  });

  const res = await handler.DELETE!(req, mockContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.requires_confirmation, true);

  restore();
});
