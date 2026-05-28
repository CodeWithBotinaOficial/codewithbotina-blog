import { describe, expect, test } from "vitest";
import { renderMarkdownHtml } from "../../../src/lib/markdown";

describe("markdown poll embeds", () => {
  test("renders poll embed placeholder for [text](poll:slug)", () => {
    const html = renderMarkdownHtml("Try this: [Vote now](poll:favorite-language-2024)");
    expect(html).toContain('class="md-poll"');
    expect(html).toContain('data-poll-slug="favorite-language-2024"');
  });

  test("renders poll embed placeholder with explicit language [text](poll:slug|lang)", () => {
    const html = renderMarkdownHtml("Try this: [Vote now](poll:favorite-language-2024|pt-br)");
    expect(html).toContain('class="md-poll"');
    expect(html).toContain('data-poll-slug="favorite-language-2024"');
    expect(html).toContain('data-poll-lang="pt-br"');
  });

  test("does not render poll embed inside fenced code blocks", () => {
    const md = "```md\n[Vote now](poll:favorite-language-2024)\n```";
    const html = renderMarkdownHtml(md);
    expect(html).not.toContain('class="md-poll"');
    expect(html).toContain("poll:favorite-language-2024");
  });

  test("does not render poll embed inside inline code", () => {
    const html = renderMarkdownHtml("Use `[Vote now](poll:favorite-language-2024)` literally.");
    expect(html).not.toContain('class="md-poll"');
    expect(html).toContain("poll:favorite-language-2024");
  });
});

