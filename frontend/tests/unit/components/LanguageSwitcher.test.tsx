import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "preact";
import LanguageSwitcher from "../../../src/components/LanguageSwitcher";

describe("LanguageSwitcher", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });
    document.cookie = "";
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("switches language and updates location", async () => {
    render(
      <LanguageSwitcher currentLanguage="en" currentPath="/en/posts/hello" />,
      container,
    );

    const toggle = container.querySelector("button");
    toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const esButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Español")
    );
    esButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(window.location.href).toBe("/es/posts/hello");
    expect(document.cookie).toContain("preferred_language=es");
  });
});
