import { describe, it, expect } from "vitest";
import {
  DEFAULT_LANGUAGE,
  detectLanguage,
  getLanguageFromPath,
  getLocalizedPath,
  t,
} from "../../../src/lib/i18n";
import { getPostEditorLabels } from "../../../src/lib/admin-editor";

const makeCookies = (value?: string) =>
  ({
    get: (name: string) => (name === "preferred_language" && value ? { value } : undefined),
  }) as unknown;

describe("i18n helpers", () => {
  it("detects language from cookie first", () => {
    const language = detectLanguage(makeCookies("es") as never, "en-US,en;q=0.9");
    expect(language).toBe("es");
  });

  it("falls back to browser language and default", () => {
    const language = detectLanguage(makeCookies() as never, "es-ES,es;q=0.9,en;q=0.8");
    expect(language).toBe("es");
    const fallback = detectLanguage(makeCookies() as never, "fr-FR,fr;q=0.9");
    expect(fallback).toBe(DEFAULT_LANGUAGE);
  });

  it("builds localized paths", () => {
    expect(getLocalizedPath("/en/posts/hello", "es")).toBe("/es/posts/hello");
    expect(getLocalizedPath("/posts/hello", "en")).toBe("/en/posts/hello");
  });

  it("extracts language from path", () => {
    expect(getLanguageFromPath("/es/posts/hello")).toBe("es");
    expect(getLanguageFromPath("/unknown")).toBe(DEFAULT_LANGUAGE);
  });

  it("returns translated admin labels instead of raw keys", () => {
    expect(t("en", "editor.titleLabel", "admin")).not.toBe("editor.titleLabel");
    expect(getPostEditorLabels("es").titleLabel).toBe("Título");
  });
});
