import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "preact";
import MarkdownEnhancer from "../../../src/components/markdown/MarkdownEnhancer";

const labels = {
  diagram: {
    viewDiagram: "View Diagram",
    viewCode: "View Code",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    resetZoom: "Reset Zoom",
    download: "Download",
    downloadPNG: "Download as PNG",
    downloadSVG: "Download as SVG",
    fullscreen: "Fullscreen",
    rendering: "Rendering diagram...",
    error: "Unable to render diagram",
    errorDetail: "Check diagram syntax",
  },
  table: {
    copy: "Copy table",
    copied: "Table copied!",
    copyAsMarkdown: "Copy as Markdown",
    copyAsTSV: "Copy as TSV",
    copyAsCSV: "Copy as CSV",
    scrollToSee: "Scroll to see more",
  },
};

function b64(text: string) {
  return Buffer.from(text, "utf8").toString("base64");
}

describe("MarkdownEnhancer", () => {
  let container: HTMLDivElement;
  let mount: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.id = "md-root";
    document.body.appendChild(container);

    mount = document.createElement("div");
    document.body.appendChild(mount);
  });

  afterEach(() => {
    document.body.removeChild(container);
    document.body.removeChild(mount);
    vi.restoreAllMocks();
  });

  it("clears SSR diagram fallback code when enhancing", async () => {
    // Avoid real Mermaid work; we just need to validate SSR fallback removal.
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
      root = null;
      rootMargin = "";
      thresholds = [];
    } as any);

    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
      unobserve() {}
    } as any);

    if (!("atob" in globalThis)) {
      vi.stubGlobal("atob", (input: string) => Buffer.from(input, "base64").toString("binary"));
    }

    const code = "graph TD\nA[Start] --> B[End]\n";
    container.innerHTML = `
      <div class="md-diagram" data-diagram-lang="mermaid" data-diagram-code="${b64(code)}">
        <pre><code>SSR fallback</code></pre>
      </div>
    `;
    const before = container.querySelector(".md-diagram") as HTMLDivElement;
    expect(before).toBeTruthy();
    expect(before.getAttribute("data-diagram-code")).toBeTruthy();

    render(
      <MarkdownEnhancer
        containerId="md-root"
        // @ts-expect-error tests
        language="en"
        // @ts-expect-error tests
        labels={labels}
      />,
      mount,
    );

    await new Promise((r) => setTimeout(r, 20));

    const wrapper = container.querySelector(".md-diagram") as HTMLDivElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.querySelector("pre")).toBeNull();
    expect(wrapper.querySelector(".md-diagram__container")).toBeTruthy();
  });

  it("clears SSR table markup when enhancing", async () => {
    const tableHtml = "<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>";
    container.innerHTML = `
      <div class="md-table" data-table-html="${b64(tableHtml)}">
        ${tableHtml}
      </div>
    `;

    render(
      <MarkdownEnhancer
        containerId="md-root"
        // @ts-expect-error tests
        language="en"
        // @ts-expect-error tests
        labels={labels}
      />,
      mount,
    );

    await new Promise((r) => setTimeout(r, 0));

    const wrapper = container.querySelector(".md-table") as HTMLDivElement;
    // TableWrapper should replace the SSR HTML; at least one toolbar button should exist.
    expect(wrapper.querySelector(".md-table__toolbar")).toBeTruthy();
  });
});
