import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "preact";
import ConfirmDialog from "../../../src/components/ui/ConfirmDialog";

describe("ConfirmDialog component", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    document.body.removeChild(container);
  });

  it("renders with title and message", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete Post"
        message="Are you sure?"
        variant="danger"
      />,
      container,
    );

    expect(document.body.textContent).toContain("Delete Post");
    expect(document.body.textContent).toContain("Are you sure?");
  });

  it("calls onConfirm and onClose when confirming", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Confirm"
        message="Proceed?"
      />,
      container,
    );

    const confirmButton = Array.from(document.body.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Confirm"));

    confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("only calls onClose when canceling", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Confirm"
        message="Proceed?"
        cancelText="Cancel"
      />,
      container,
    );

    const cancelButton = Array.from(document.body.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Cancel"));

    cancelButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
