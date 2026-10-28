import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CommentForm from "../../../src/components/comments/CommentForm";
import { BackendStatusContext } from "../../../src/context/BackendStatusContext";

vi.mock("../../../src/hooks/useSession", () => ({
  useSession: () => ({ user: null, loading: false }),
}));

describe("CommentForm maintenance gate", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("keeps the form visible but disables submission during maintenance", () => {
    render(
      <BackendStatusContext.Provider value={{
        status: "maintenance",
        isMaintenanceMode: true,
        consecutiveFailures: 2,
        lastChecked: new Date(),
        reportFailure: () => undefined,
        reportSuccess: () => undefined,
      }}>
        <CommentForm postId="post-1" />
      </BackendStatusContext.Provider>,
      container,
    );

    expect(container.querySelector("form")).not.toBeNull();
    expect(container.textContent).toContain(
      "This feature is temporarily unavailable.",
    );
    expect(
      container.querySelector<HTMLTextAreaElement>("textarea")?.disabled,
    ).toBe(true);
    expect(
      container.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(true);
  });
});
