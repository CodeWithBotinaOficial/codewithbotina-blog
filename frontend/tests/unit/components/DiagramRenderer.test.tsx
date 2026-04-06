import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "preact";
import DiagramRenderer from "../../../src/components/markdown/DiagramRenderer";

const renderMock = vi.fn(async () => {
  return {
    svg: '<svg viewBox="0 0 100 50"><text x="5" y="20">ok</text></svg>',
    bindFunctions: undefined,
  };
});

vi.mock("mermaid", () => {
  return {
    default: {
      initialize: vi.fn(),
      render: (...args: any[]) => renderMock(...args),
      mermaidAPI: {
        render: (...args: any[]) => renderMock(...args),
      },
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
        code={`graph TD\nH${Math.random().toString(36).slice(2)} --> I\n`}
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

  it("starts rendering after inView flips true (observer fallback)", async () => {
    vi.useFakeTimers();

    // IntersectionObserver exists, so inView starts false.
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
      root = null;
      rootMargin = "";
      thresholds = [];
      constructor(_cb: any) {}
    } as any);

    // Make the immediate bounding-box check think the node is far below the fold.
    const originalRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = () =>
      ({ top: 99999, bottom: 100000, left: 0, right: 0, width: 0, height: 1 } as any);

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

    // Advance past the inView hard fallback (900ms) and debounce (75ms).
    await vi.advanceTimersByTimeAsync(1100);
    await Promise.resolve();

    const svg = container.querySelector(".md-diagram__content svg");
    expect(svg).toBeTruthy();

    HTMLElement.prototype.getBoundingClientRect = originalRect;
    vi.useRealTimers();
  });

  // Note: render timeout behavior is validated in e2e/manual testing; unit tests here focus on the
  // inView gating regression that caused diagrams to stay in the loading state indefinitely.
});
