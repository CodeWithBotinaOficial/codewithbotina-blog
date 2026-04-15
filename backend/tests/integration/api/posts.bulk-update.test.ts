import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/posts/bulk-update.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { PostService } from "../../../services/post.service.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

Deno.test("Integration: PUT /api/posts/bulk-update returns 200", async () => {
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
    "bulkUpdatePosts",
    () =>
      Promise.resolve({
        success: true,
        data: {
          updated_post_ids: ["post-es"],
          created_post_ids: ["post-en"],
          unlinked_post_ids: ["post-fr"],
          translation_group_id_by_base_post_id: {
            "post-es": "22222222-2222-2222-2222-222222222222",
          },
        },
      }),
  );

  const req = new Request("http://localhost/api/posts/bulk-update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:8000",
      "Authorization": "Bearer token",
    },
    body: JSON.stringify({
      updates: [
        {
          post_id: "post-es",
          post: {
            titulo: "Hola",
            slug: "hola",
            body: "Contenido",
            language: "es",
            tag_ids: [],
          },
        },
      ],
      creates: [
        {
          base_post_id: "post-es",
          post: {
            titulo: "Hello",
            slug: "hello",
            body: "Content",
            language: "en",
          },
        },
      ],
      unlinks: [{ post_id: "post-es", linked_post_id: "post-fr" }],
    }),
  });

  const res = await handler.PUT!(req, {} as unknown as FreshContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.updated_post_ids.length, 1);
  assertEquals(body.data.created_post_ids.length, 1);
  assertEquals(body.data.unlinked_post_ids.length, 1);

  restore();
});
