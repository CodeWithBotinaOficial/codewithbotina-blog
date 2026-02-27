import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { CommentService } from "../../../services/comment.service.ts";
import { CommentRepository } from "../../../repositories/comment.repository.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { validCommentData } from "../../fixtures/testData.ts";

const baseComment = {
  id: "comment-1",
  post_id: validCommentData.postId,
  user_id: validCommentData.userId,
  content: validCommentData.content,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_pinned: false,
};

Deno.test("CommentService creates comment successfully", async () => {
  const repo = new CommentRepository();
  const auth = new AuthService();

  const postStub = stub(repo, "postExists", () => Promise.resolve(true));
  const createStub = stub(repo, "createComment", () => Promise.resolve(baseComment));

  const service = new CommentService(repo, auth);
  const result = await service.createComment(
    validCommentData.postId,
    validCommentData.userId,
    validCommentData.content,
  );

  assertEquals(result.success, true);
  assertEquals(result.data?.id, "comment-1");

  postStub.restore();
  createStub.restore();
});

Deno.test("CommentService rejects non-existent post", async () => {
  const repo = new CommentRepository();
  const auth = new AuthService();

  const postStub = stub(repo, "postExists", () => Promise.resolve(false));
  const service = new CommentService(repo, auth);

  const result = await service.createComment(
    validCommentData.postId,
    validCommentData.userId,
    validCommentData.content,
  );

  assertEquals(result.success, false);
  assertEquals(result.error?.message, "Post not found");

  postStub.restore();
});

Deno.test("CommentService enforces author-only update", async () => {
  const repo = new CommentRepository();
  const auth = new AuthService();

  const getStub = stub(repo, "getCommentById", () => Promise.resolve(baseComment));
  const updateStub = stub(repo, "updateComment", () => Promise.resolve(baseComment));

  const service = new CommentService(repo, auth);
  const result = await service.updateComment(
    baseComment.id,
    "other-user",
    "Updated content that is long enough",
  );

  assertEquals(result.success, false);
  assertEquals(result.error?.message, "Forbidden");

  getStub.restore();
  updateStub.restore();
});

Deno.test("CommentService allows admin delete", async () => {
  const repo = new CommentRepository();
  const auth = new AuthService();

  const getStub = stub(repo, "getCommentById", () => Promise.resolve(baseComment));
  const deleteStub = stub(repo, "deleteComment", () => Promise.resolve(true));

  const service = new CommentService(repo, auth);
  const result = await service.deleteComment(baseComment.id, "admin-user", true);

  assertEquals(result.success, true);
  assertEquals(result.data, true);

  getStub.restore();
  deleteStub.restore();
});

Deno.test("CommentService enforces admin-only pinning", async () => {
  const repo = new CommentRepository();
  const auth = new AuthService();

  const adminStub = stub(auth, "isAdmin", () => Promise.resolve(false));

  const service = new CommentService(repo, auth);
  const result = await service.pinComment(baseComment.id, baseComment.user_id);

  assertEquals(result.success, false);
  assertEquals(result.error?.message, "Forbidden");

  adminStub.restore();
});
