import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "preact";
import CommentItem from "../../../src/components/comments/CommentItem";

const baseComment = {
  id: "comment-1",
  content: "A valid comment content here.",
  created_at: "2026-02-25T10:00:00Z",
  updated_at: "2026-02-25T10:00:00Z",
  is_pinned: false,
  user: {
    id: "user-1",
    full_name: "Test User",
    avatar_url: null,
  },
};

describe("CommentItem actions", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("shows edit/delete for author only", () => {
    render(
      <CommentItem
        comment={baseComment}
        currentUserId="user-1"
        isAdmin={false}
        onDelete={() => {}}
        onUpdate={async () => null}
        onTogglePin={() => {}}
      />,
      container,
    );

    expect(container.textContent).toContain("Edit");
    expect(container.textContent).toContain("Delete");
    expect(container.textContent).not.toContain("Pin");
  });

  it("shows pin for admin only", () => {
    render(
      <CommentItem
        comment={baseComment}
        currentUserId="user-2"
        isAdmin={true}
        onDelete={() => {}}
        onUpdate={async () => null}
        onTogglePin={() => {}}
      />,
      container,
    );

    expect(container.textContent).toContain("Pin");
    expect(container.textContent).not.toContain("Edit");
  });
});
