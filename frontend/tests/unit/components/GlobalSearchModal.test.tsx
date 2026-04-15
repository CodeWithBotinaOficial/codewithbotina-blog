import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "preact";
import GlobalSearchModal from "../../../src/components/search/GlobalSearchModal";

describe("GlobalSearchModal", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    document.body.removeChild(container);
  });

  it("opens and closes with Escape", async () => {
    render(<GlobalSearchModal currentLanguage="en" />, container);

    const openButton = container.querySelector("button[aria-label=\"Search\"]") as HTMLButtonElement;
    expect(openButton).toBeTruthy();
    openButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await new Promise((r) => setTimeout(r, 0));

    const backdrop = document.body.querySelector("[data-modal-backdrop]") as HTMLDivElement | null;
    expect(backdrop).toBeTruthy();

    // Wait for keydown listener effect to attach.
    await new Promise((r) => setTimeout(r, 0));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    // Allow effect cleanup.
    await new Promise((r) => setTimeout(r, 0));
    expect(document.body.querySelector("[data-modal-backdrop]")).toBeNull();
  });
});
