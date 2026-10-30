import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    vi.unstubAllGlobals();
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

  it("resolves translated post by id before switching language", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { slug: "hola-mundo" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window, "location", {
      value: { href: "", pathname: "/es/posts/hola" },
      writable: true,
    });

    render(
      <LanguageSwitcher currentLanguage="es" currentPath="/es/posts/hola" currentPostId="post-uuid" />,
      container,
    );

    const toggle = container.querySelector("button");
    toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const enButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("English")
    );
    enButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(window.location.href).toBe("/en/posts/hola-mundo");
  });

  it("redirects to translation-aware 404 when translation is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window, "location", {
      value: { href: "", pathname: "/es/posts/hola" },
      writable: true,
    });

    render(
      <LanguageSwitcher currentLanguage="es" currentPath="/es/posts/hola" currentPostId="post-uuid" />,
      container,
    );

    const toggle = container.querySelector("button");
    toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const enButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("English")
    );
    enButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(window.location.href).toContain("/en/404?missing_translation=true");
    expect(window.location.href).toContain("origin=%2Fes%2Fposts%2Fhola");
  });
});
