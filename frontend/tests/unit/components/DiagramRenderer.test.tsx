import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "preact";
import DiagramRenderer from "../../../src/components/markdown/DiagramRenderer";

vi.mock("mermaid", () => {
  return {
    default: {
      initialize: vi.fn(),
      render: vi.fn(async () => {
        return {
          svg: '<svg viewBox="0 0 100 50"><text x="5" y="20">ok</text></svg>',
          bindFunctions: undefined,
        };
      }),
    },
  };
});

const labels = {
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
};

describe("DiagramRenderer", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    // Force immediate rendering path.
    vi.stubGlobal("IntersectionObserver", undefined as any);
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
      unobserve() {}
    } as any);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it("renders a Mermaid SVG after debounce", async () => {
    render(
      <DiagramRenderer
        code={"graph TD\nA --> B\n"}
        diagramLang="mermaid"
        // @ts-expect-error tests
        labels={labels}
        // @ts-expect-error tests
        language="en"
        filenameBase="Test"
      />,
      container,
    );

    expect(container.textContent).toContain(labels.rendering);

    await new Promise((r) => setTimeout(r, 450));

    const svg = container.querySelector(".md-diagram__content svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 100 50");
  });
});
