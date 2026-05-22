import { describe, expect, test } from "vitest";
import { renderMarkdownHtml } from "../../../src/lib/markdown";

describe("markdown LaTeX rendering placeholders", () => {
  test("renders inline math as md-latex placeholder", () => {
    const html = renderMarkdownHtml("The formula $x^2$ is simple.");
    expect(html).toContain('class="md-latex"');
    expect(html).toContain('data-display="0"');
  });

  test("renders display math (\\\\[...\\\\]) as md-latex placeholder", () => {
    const html = renderMarkdownHtml("\\[\n\\int_0^1 x\\,dx\n\\]\n");
    expect(html).toContain('class="md-latex md-latex--display"');
    expect(html).toContain('data-display="1"');
  });

  test("renders display math ($$...$$) as md-latex placeholder", () => {
    const html = renderMarkdownHtml("$$\n\\int_0^1 x\\,dx\n$$\n");
    expect(html).toContain('class="md-latex md-latex--display"');
    expect(html).toContain('data-display="1"');
  });

  test("ignores LaTeX inside quoted strings", () => {
    const html = renderMarkdownHtml('Here is a quote: "The formula $x^2$ is wrong".');
    expect(html).not.toContain('class="md-latex"');
    expect(html).toContain("$x^2$");
  });

  test("ignores LaTeX inside inline code", () => {
    const html = renderMarkdownHtml("Use `$x^2$` for squares.");
    expect(html).not.toContain('class="md-latex"');
    expect(html).toContain("$x^2$");
  });

  test("ignores LaTeX inside fenced code blocks", () => {
    const html = renderMarkdownHtml("```python\n# $x^2$\n```\n");
    expect(html).not.toContain('class="md-latex"');
    expect(html).toContain("$x^2$");
  });

  test("coexists with Mermaid diagram fences", () => {
    const html = renderMarkdownHtml("$x^2$\n\n```mermaid\ngraph TD\n  A-->B\n```\n");
    expect(html).toContain('class="md-latex"');
    expect(html).toContain('class="md-diagram"');
  });
});

