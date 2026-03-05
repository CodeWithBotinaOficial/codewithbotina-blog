import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "preact";
import { useToast } from "../../../src/hooks/useToast";

function ToastHarness() {
  const { toasts, showToast, removeToast } = useToast();

  return (
    <div>
      <button
        id="add-toast"
        onClick={() => showToast("Test message", "success")}
      >
        Add
      </button>
      <button
        id="remove-toast"
        onClick={() => removeToast(toasts[0]?.id ?? 0)}
      >
        Remove
      </button>
      <div id="toast-count">{toasts.length}</div>
      <div id="toast-type">{toasts[0]?.type ?? ""}</div>
      <div id="toast-message">{toasts[0]?.message ?? ""}</div>
    </div>
  );
}

describe("useToast hook", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("adds a toast when showToast is called", async () => {
    render(<ToastHarness />, container);

    const addButton = container.querySelector("#add-toast") as HTMLButtonElement;
    addButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.querySelector("#toast-count")?.textContent).toBe("1");
    expect(container.querySelector("#toast-type")?.textContent).toBe("success");
    expect(container.querySelector("#toast-message")?.textContent).toBe("Test message");
  });

  it("removes a toast when removeToast is called", () => {
    render(<ToastHarness />, container);

    const addButton = container.querySelector("#add-toast") as HTMLButtonElement;
    const removeButton = container.querySelector("#remove-toast") as HTMLButtonElement;
    addButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    removeButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(container.querySelector("#toast-count")?.textContent).toBe("0");
  });
});
