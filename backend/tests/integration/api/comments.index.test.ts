import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/comments/[commentId]/index.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { CommentService } from "../../../services/comment.service.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

const mockContext = {
  params: { commentId: "post-1" },
} as unknown as FreshContext;

const mockUser = {
  id: "user-1",
  email: "user@example.com",
  full_name: "User",
  avatar_url: null,
  google_id: null,
  created_at: new Date().toISOString(),
  last_login: new Date().toISOString(),
  is_admin: false,
};

Deno.test("Integration: GET /api/comments/:postId returns comments", async () => {
  const _serviceStub = stub(
    CommentService.prototype,
    "getPostComments",
    () =>
      Promise.resolve({
        success: true,
        data: [
          {
            id: "comment-1",
            post_id: "post-1",
            user_id: "user-1",
            content: "Great post",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_pinned: false,
            user: { id: "user-1", full_name: "User", avatar_url: null },
          },
        ],
      }),
  );

  const req = new Request("http://localhost/api/comments/post-1", {
    method: "GET",
    headers: { "Origin": "http://localhost:8000" },
  });

  const res = await handler.GET!(req, mockContext);
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.length, 1);

  restore();
});

Deno.test("Integration: POST /api/comments/:postId creates comment", async () => {
  const _authStub = stub(
    AuthService.prototype,
    "getUserFromToken",
    () => Promise.resolve(mockUser),
  );
  const _serviceStub = stub(
    CommentService.prototype,
    "createComment",
    () =>
      Promise.resolve({
        success: true,
        data: {
          id: "comment-2",
          post_id: "post-1",
          user_id: "user-1",
          content: "Hello",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_pinned: false,
          user: { id: "user-1", full_name: "User", avatar_url: null },
        },
      }),
  );

  const req = new Request("http://localhost/api/comments/post-1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:8000",
      "Authorization": "Bearer token",
    },
    body: JSON.stringify({ content: "Hello" }),
  });

  const res = await handler.POST!(req, mockContext);
  const body = await res.json();

  assertEquals(res.status, 201);
  assertEquals(body.success, true);
  assertEquals(body.data.id, "comment-2");

  restore();
});
