import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "preact";
import Modal from "../../../src/components/ui/Modal";

describe("Modal component", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    document.body.removeChild(container);
    document.body.style.overflow = "unset";
  });

  it("renders when open", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
      container,
    );

    expect(document.body.textContent).toContain("Test Modal");
    expect(document.body.textContent).toContain("Modal content");
  });

  it("does not render when closed", () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
      container,
    );

    expect(document.body.querySelector("[data-modal-backdrop]")).toBeNull();
  });

  it("calls onClose when clicking backdrop", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
      container,
    );

    const backdrop = document.body.querySelector("[data-modal-backdrop]") as HTMLDivElement;
    backdrop.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking close button", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
      container,
    );

    const closeButton = document.body.querySelector("button[aria-label=\"Close\"]") as HTMLButtonElement;
    closeButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll when open", async () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
      container,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.style.overflow).toBe("hidden");
  });
});
