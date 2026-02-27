import { describe, it, expect } from "vitest";
import { sortComments } from "../../../src/components/comments/CommentList";

describe("CommentList sorting", () => {
  it("prioritizes pinned comments then newest", () => {
    const comments = [
      {
        id: "1",
        content: "Old pinned",
        created_at: "2026-02-25T09:00:00Z",
        updated_at: "2026-02-25T09:00:00Z",
        is_pinned: true,
        user: { id: "u1", full_name: "A", avatar_url: null },
      },
      {
        id: "2",
        content: "New unpinned",
        created_at: "2026-02-25T11:00:00Z",
        updated_at: "2026-02-25T11:00:00Z",
        is_pinned: false,
        user: { id: "u2", full_name: "B", avatar_url: null },
      },
      {
        id: "3",
        content: "New pinned",
        created_at: "2026-02-25T12:00:00Z",
        updated_at: "2026-02-25T12:00:00Z",
        is_pinned: true,
        user: { id: "u3", full_name: "C", avatar_url: null },
      },
    ];

    const sorted = sortComments(comments);
    expect(sorted[0].id).toBe("3");
    expect(sorted[1].id).toBe("1");
    expect(sorted[2].id).toBe("2");
  });
});
