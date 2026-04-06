import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  Code,
  Download,
  Eye,
  Maximize,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from "lucide-preact";
import Modal from "../ui/Modal";
import type { DiagramLabels } from "../../lib/markdown-labels";
import type { SupportedLanguage } from "../../lib/i18n";

type ViewMode = "diagram" | "code";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

const mermaidCache = new Map<string, string>();
let mermaidImportPromise: Promise<any> | null = null;
let mermaidInitialized = false;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function decodeSvgSize(svg: string): { width: number; height: number } {
  const viewBoxMatch = svg.match(/viewBox\s*=\s*"([^"]+)"/i);
  if (viewBoxMatch?.[1]) {
    const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [, , w, h] = parts;
      if (w > 0 && h > 0) return { width: w, height: h };
    }
  }

  const widthMatch = svg.match(/width\s*=\s*"([0-9.]+)(px)?"/i);
  const heightMatch = svg.match(/height\s*=\s*"([0-9.]+)(px)?"/i);
  const w = widthMatch ? Number(widthMatch[1]) : NaN;
  const h = heightMatch ? Number(heightMatch[1]) : NaN;
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return { width: w, height: h };

  return { width: 800, height: 600 };
}

function ensureSvgNamespace(svg: string): string {
  if (/xmlns=/.test(svg)) return svg;
  return svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
}

async function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([ensureSvgNamespace(svg)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".svg") ? filename : `${filename}.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function downloadPng(svg: string, filename: string, zoom: number) {
  const { width, height } = decodeSvgSize(svg);
  const dpr = window.devicePixelRatio || 1;
  const scale = clamp(zoom, MIN_ZOOM, MAX_ZOOM);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale * dpr));
  canvas.height = Math.max(1, Math.round(height * scale * dpr));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale * dpr, scale * dpr);

  const svgBlob = new Blob([ensureSvgNamespace(svg)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG image"));
      img.src = url;
    });
    ctx.drawImage(img, 0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Failed to export PNG"));
      else resolve(blob);
    }, "image/png");
  });

  const pngUrl = URL.createObjectURL(pngBlob);
  const a = document.createElement("a");
  a.href = pngUrl;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(pngUrl);
}

async function loadMermaid() {
  if (!mermaidImportPromise) {
    mermaidImportPromise = import("mermaid").then((m) => (m as any).default ?? m);
  }
  return mermaidImportPromise;
}

function initMermaid(mermaid: any) {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
  });
  mermaidInitialized = true;
}

function clampOffset(
  offset: { x: number; y: number },
  scale: number,
  container: { w: number; h: number },
  content: { w: number; h: number },
) {
  const scaledW = content.w * scale;
  const scaledH = content.h * scale;

  let x = offset.x;
  let y = offset.y;

  if (scaledW <= container.w) {
    x = (container.w - scaledW) / 2;
  } else {
    x = clamp(x, container.w - scaledW, 0);
  }

  if (scaledH <= container.h) {
    y = (container.h - scaledH) / 2;
  } else {
    y = clamp(y, container.h - scaledH, 0);
  }

  return { x, y };
}

interface ViewerProps {
  svg: string;
  labels: DiagramLabels;
  downloadBaseName: string;
  showDownload?: boolean;
  showFullscreen?: boolean;
  onRequestFullscreen?: () => void;
}

function DiagramViewer({
  svg,
  labels,
  downloadBaseName,
  showDownload = true,
  showFullscreen = true,
  onRequestFullscreen,
}: ViewerProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState({ w: 1, h: 1 });
  const content = useMemo(() => {
    const size = decodeSvgSize(svg);
    return { w: size.width, h: size.height };
  }, [svg]);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{
    distance: number;
    scale: number;
    center: { x: number; y: number };
    offset: { x: number; y: number };
  } | null>(null);

  const [downloadOpen, setDownloadOpen] = useState(false);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainer({ w: el.clientWidth || 1, h: el.clientHeight || 1 });
    });
    ro.observe(el);
    setContainer({ w: el.clientWidth || 1, h: el.clientHeight || 1 });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // Keep centered/clamped as container changes.
    setOffset((prev) => clampOffset(prev, scale, container, content));
  }, [container.w, container.h, content.w, content.h, scale]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!downloadOpen) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest?.("[data-md-diagram-menu]")) return;
      setDownloadOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [downloadOpen]);

  const downloadName = useMemo(() => {
    const base = downloadBaseName ? slugify(downloadBaseName) : "";
    if (base) return `${base}-diagram`;
    return `diagram-${Date.now()}`;
  }, [downloadBaseName]);

  const zoomTo = (nextScale: number, pivot: { x: number; y: number }) => {
    setScale((prevScale) => {
      const clampedScale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
      setOffset((prevOffset) => {
        const ratio = clampedScale / prevScale;
        const nextOffset = {
          x: pivot.x - (pivot.x - prevOffset.x) * ratio,
          y: pivot.y - (pivot.y - prevOffset.y) * ratio,
        };
        return clampOffset(nextOffset, clampedScale, container, content);
      });
      return clampedScale;
    });
  };

  const zoomIn = () => zoomTo(scale * 1.2, { x: container.w / 2, y: container.h / 2 });
  const zoomOut = () => zoomTo(scale / 1.2, { x: container.w / 2, y: container.h / 2 });
  const reset = () => {
    setScale(1);
    setOffset(clampOffset({ x: 0, y: 0 }, 1, container, content));
  };

  const onPointerDown = (event: PointerEvent) => {
    const el = viewportRef.current;
    if (!el) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const points = Array.from(pointersRef.current.values());
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      const distance = Math.hypot(dx, dy);
      pinchRef.current = {
        distance: distance || 1,
        scale,
        center: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 },
        offset,
      };
      setIsDragging(false);
      dragRef.current = null;
      return;
    }

    if (pointersRef.current.size === 1) {
      setIsDragging(true);
      dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!viewportRef.current) return;
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const points = Array.from(pointersRef.current.values());
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      const distance = Math.hypot(dx, dy) || 1;
      const center = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };

      const start = pinchRef.current;
      const nextScale = clamp(start.scale * (distance / start.distance), MIN_ZOOM, MAX_ZOOM);
      const ratio = nextScale / start.scale;
      const nextOffset = {
        x: center.x - (center.x - start.offset.x) * ratio,
        y: center.y - (center.y - start.offset.y) * ratio,
      };

      setScale(nextScale);
      setOffset(clampOffset(nextOffset, nextScale, container, content));
      return;
    }

    if (!isDragging || !dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    const next = { x: dragRef.current.ox + dx, y: dragRef.current.oy + dy };
    setOffset(clampOffset(next, scale, container, content));
  };

  const endPointer = (pointerId: number) => {
    pointersRef.current.delete(pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      setIsDragging(false);
      dragRef.current = null;
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 50 : 20;
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    setOffset((prev) => {
      const next = { ...prev };
      if (event.key === "ArrowUp") next.y += step;
      if (event.key === "ArrowDown") next.y -= step;
      if (event.key === "ArrowLeft") next.x += step;
      if (event.key === "ArrowRight") next.x -= step;
      return clampOffset(next, scale, container, content);
    });
  };

  return (
    <div class="md-diagram__viewer">
      <div class="md-diagram__toolbar" data-md-diagram-menu>
        <div class="md-diagram__group">
          <button type="button" class="md-diagram__btn" onClick={zoomIn} aria-label={labels.zoomIn} title={labels.zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </button>
          <button type="button" class="md-diagram__btn" onClick={zoomOut} aria-label={labels.zoomOut} title={labels.zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </button>
          <button type="button" class="md-diagram__btn" onClick={reset} aria-label={labels.resetZoom} title={labels.resetZoom}>
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {showDownload ? (
          <div class="md-diagram__group">
            <button
              type="button"
              class="md-diagram__btn"
              onClick={() => setDownloadOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={downloadOpen}
              aria-label={labels.download}
              title={labels.download}
            >
              <Download className="h-4 w-4" />
            </button>
            {downloadOpen ? (
              <div class="md-diagram__menu" role="menu">
                <button
                  type="button"
                  class="md-diagram__menuitem"
                  role="menuitem"
                  onClick={async () => {
                    setDownloadOpen(false);
                    await downloadPng(svg, downloadName, scale);
                  }}
                >
                  {labels.downloadPNG}
                </button>
                <button
                  type="button"
                  class="md-diagram__menuitem"
                  role="menuitem"
                  onClick={async () => {
                    setDownloadOpen(false);
                    await downloadSvg(svg, downloadName);
                  }}
                >
                  {labels.downloadSVG}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {showFullscreen && onRequestFullscreen ? (
          <div class="md-diagram__group">
            <button
              type="button"
              class="md-diagram__btn"
              onClick={onRequestFullscreen}
              aria-label={labels.fullscreen}
              title={labels.fullscreen}
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <button
        class={`md-diagram__viewport ${isDragging ? "is-dragging" : ""}`}
        ref={viewportRef}
        type="button"
        aria-label="Diagram viewport"
        onPointerDown={onPointerDown as any}
        onPointerMove={onPointerMove as any}
        onPointerUp={(e) => endPointer((e as PointerEvent).pointerId)}
        onPointerCancel={(e) => endPointer((e as PointerEvent).pointerId)}
        onKeyDown={onKeyDown as any}
      >
        <div
          class="md-diagram__content"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </button>
    </div>
  );
}

interface Props {
  code: string;
  diagramLang: string;
  labels: DiagramLabels;
  language: SupportedLanguage;
  filenameBase?: string;
}

export default function DiagramRenderer({ code, diagramLang, labels, filenameBase }: Props) {
  const [mode, setMode] = useState<ViewMode>("diagram");
  const [svg, setSvg] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const renderIdRef = useRef(0);
  const mermaidIdRef = useRef(`mdm_${Math.random().toString(36).slice(2)}`);

  const normalizedLang = useMemo(() => String(diagramLang ?? "").trim().toLowerCase(), [diagramLang]);
  const isMermaid = normalizedLang === "mermaid";

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const margin = 200;
    const forceStart = () => setInView(true);

    // Immediate check (avoids relying on IntersectionObserver firing).
    try {
      const rect = node.getBoundingClientRect();
      const withinViewport =
        rect.top < (window.innerHeight || 0) + margin && rect.bottom > -margin;
      if (withinViewport) {
        forceStart();
        return;
      }
    } catch (_err) {
      forceStart();
      return;
    }

    let io: IntersectionObserver | null = null;
    try {
      if (typeof IntersectionObserver !== "undefined") {
        io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                forceStart();
                io?.disconnect();
                io = null;
              }
            }
          },
          { rootMargin: `${margin}px 0px` },
        );
        io.observe(node);
      }
    } catch (_err) {
      // If IO is broken, do not block rendering.
      forceStart();
    }

    // Hard fallback to ensure we start within ~1s even if observers don't fire.
    const timer = window.setTimeout(forceStart, 900);
    return () => {
      io?.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!isMermaid) {
      setStatus("error");
      setError(labels.errorDetail);
      setSvg("");
      return;
    }
    setStatus("idle");
    setError("");
    setSvg("");
  }, [code, isMermaid, inView, labels.errorDetail]);

  useEffect(() => {
    if (!isMermaid) return;
    if (!inView) return;

    const trimmed = String(code ?? "").trim();
    if (!trimmed) {
      setStatus("error");
      setError(labels.errorDetail);
      return;
    }

    const cacheKey = `mermaid:${trimmed}`;
    const cached = mermaidCache.get(cacheKey);
    if (cached) {
      setSvg(cached);
      setStatus("ready");
      return;
    }

    const currentRenderId = (renderIdRef.current += 1);
    setStatus("loading");

    const timer = window.setTimeout(async () => {
      try {
        const mermaid = await loadMermaid();
        initMermaid(mermaid);

        const hiddenHost = document.createElement("div");
        hiddenHost.style.position = "fixed";
        hiddenHost.style.left = "-9999px";
        hiddenHost.style.top = "0";
        hiddenHost.style.width = "1px";
        hiddenHost.style.height = "1px";
        hiddenHost.style.overflow = "hidden";
        document.body.appendChild(hiddenHost);

        let renderedSvg = "";
        let bindFunctions: any = undefined;
        try {
          const result = await mermaid.render(mermaidIdRef.current, trimmed, hiddenHost);
          renderedSvg = String(result?.svg ?? "");
          bindFunctions = result?.bindFunctions;
        } finally {
          hiddenHost.remove();
        }

        if (renderIdRef.current !== currentRenderId) return;
        mermaidCache.set(cacheKey, renderedSvg);
        setSvg(renderedSvg);
        setStatus("ready");

        // Some diagram types attach interactivity (links, callbacks) via bindFunctions.
        window.setTimeout(() => {
          try {
            const host = rootRef.current?.querySelector(".md-diagram__content");
            const svgEl = host?.querySelector("svg") as SVGElement | null;
            if (svgEl && typeof bindFunctions === "function") bindFunctions(svgEl);
          } catch (_err) {
            // Ignore bind failures.
          }
        }, 0);
      } catch (e: any) {
        if (renderIdRef.current !== currentRenderId) return;
        setStatus("error");
        setError(e?.message ? String(e.message) : labels.errorDetail);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [code, isMermaid, labels.errorDetail]);

  const toggleMode = (next: ViewMode) => setMode(next);

  return (
    <div class="md-diagram__container" ref={rootRef}>
      <div class="md-diagram__topbar">
        <div class="md-diagram__toggles" role="tablist" aria-label="Diagram view mode">
          <button
            type="button"
            class={`md-diagram__toggle ${mode === "diagram" ? "is-active" : ""}`}
            onClick={() => toggleMode("diagram")}
            aria-pressed={mode === "diagram"}
            title={labels.viewDiagram}
          >
            <Eye className="h-4 w-4" />
            <span class="md-diagram__toggletext">{labels.viewDiagram}</span>
          </button>
          <button
            type="button"
            class={`md-diagram__toggle ${mode === "code" ? "is-active" : ""}`}
            onClick={() => toggleMode("code")}
            aria-pressed={mode === "code"}
            title={labels.viewCode}
          >
            <Code className="h-4 w-4" />
            <span class="md-diagram__toggletext">{labels.viewCode}</span>
          </button>
        </div>
      </div>

      {mode === "code" ? (
        <pre class="md-diagram__code">
          <code>{code}</code>
        </pre>
      ) : status === "loading" || status === "idle" ? (
        <div class="md-diagram__loading" role="status" aria-live="polite">
          <div class="md-diagram__spinner" aria-hidden="true" />
          <span>{labels.rendering}</span>
        </div>
      ) : status === "error" ? (
        <div class="md-diagram__error" role="alert">
          <div class="md-diagram__errorrow">
            <strong>{labels.error}</strong>
            <span class="md-diagram__errorhint">{error || labels.errorDetail}</span>
          </div>
          <pre class="md-diagram__code">
            <code>{code}</code>
          </pre>
        </div>
      ) : (
        <>
          <DiagramViewer
            svg={svg}
            labels={labels}
            downloadBaseName={filenameBase || ""}
            onRequestFullscreen={() => setIsFullscreen(true)}
          />

          <Modal
            isOpen={isFullscreen}
            onClose={() => setIsFullscreen(false)}
            title={labels.fullscreen}
            maxWidthClass="max-w-5xl"
          >
            <div class="md-diagram__fullscreen">
              <DiagramViewer
                svg={svg}
                labels={labels}
                downloadBaseName={filenameBase || ""}
                showFullscreen={false}
                onRequestFullscreen={undefined}
              />
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
