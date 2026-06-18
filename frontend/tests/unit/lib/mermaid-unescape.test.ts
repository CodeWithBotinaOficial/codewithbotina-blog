import { describe, expect, it } from "vitest";
import {
  isSafeMermaidContent,
  prepareMermaidContent,
  restoreMermaidLineBreaks,
  unescapeMermaidEntities,
} from "../../../src/lib/mermaid-unescape";

describe("mermaid-unescape", () => {
  it("decodes escaped Mermaid arrows", () => {
    expect(unescapeMermaidEntities("A --&gt; B")).toBe("A --> B");
    expect(unescapeMermaidEntities("A &lt;--&gt; B")).toBe("A <--> B");
  });

  it("decodes double-escaped arrow entities", () => {
    expect(unescapeMermaidEntities("A --&amp;gt; B")).toBe("A --> B");
    expect(unescapeMermaidEntities("A &amp;lt;--&amp;gt; B")).toBe("A <--> B");
  });

  it("decodes labels without broad HTML parsing", () => {
    expect(unescapeMermaidEntities("A[&quot;One &amp; Two&quot;]")).toBe('A["One & Two"]');
  });

  it("restores escaped line breaks and br tags", () => {
    expect(restoreMermaidLineBreaks("graph LR&#10;A --&gt; B")).toBe("graph LR\nA --&gt; B");
    expect(restoreMermaidLineBreaks("graph LR&lt;br&gt;A --&gt; B")).toBe("graph LR\nA --&gt; B");
  });

  it("prepares escaped Mermaid content for rendering", () => {
    const result = prepareMermaidContent("graph LR\n  A --&gt; B\n  A &lt;--&gt; C");
    expect(result).toBe("graph LR\n  A --> B\n  A <--> C");
  });

  it("allows normal Mermaid syntax", () => {
    expect(isSafeMermaidContent("graph LR\n  A --> B\n  A <--> C")).toBe(true);
  });

  it("rejects dangerous HTML and script vectors after decoding", () => {
    expect(prepareMermaidContent("graph LR\nA --&gt; &lt;script&gt;alert(1)&lt;/script&gt;")).toBe("");
    expect(prepareMermaidContent("graph LR\nA --&gt; &lt;img src=x onerror=alert(1)&gt;")).toBe("");
    expect(prepareMermaidContent("graph LR\nA --&gt; javascript:alert(1)")).toBe("");
    expect(prepareMermaidContent("graph LR\nA --&gt; data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;")).toBe("");
  });
});
