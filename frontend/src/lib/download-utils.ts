import html2canvas from "html2canvas";

type InlineStyleProp =
  | "fill"
  | "stroke"
  | "stroke-width"
  | "stroke-dasharray"
  | "stroke-linecap"
  | "stroke-linejoin"
  | "opacity"
  | "fill-opacity"
  | "stroke-opacity"
  | "font-family"
  | "font-size"
  | "font-weight"
  | "font-style"
  | "text-anchor"
  | "dominant-baseline"
  | "alignment-baseline"
  | "paint-order"
  | "shape-rendering";

const SVG_STYLE_PROPS: InlineStyleProp[] = [
  "fill",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "alignment-baseline",
  "paint-order",
  "shape-rendering",
];

function ensureSvgNamespace(svg: SVGSVGElement) {
  if (!svg.getAttribute("xmlns")) {
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  if (!svg.getAttribute("xmlns:xlink")) {
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  }
}

function setSvgViewBoxWithPadding(svg: SVGSVGElement, bbox: DOMRect, padding: number) {
  const x = bbox.x - padding;
  const y = bbox.y - padding;
  const w = bbox.width + padding * 2;
  const h = bbox.height + padding * 2;
  svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  svg.setAttribute("width", `${w}`);
  svg.setAttribute("height", `${h}`);
  return { width: w, height: h };
}

function inlineComputedStyles(originalSvg: SVGSVGElement, cloneSvg: SVGSVGElement) {
  const originals = Array.from(originalSvg.querySelectorAll<SVGElement>("*"));
  const clones = Array.from(cloneSvg.querySelectorAll<SVGElement>("*"));
  const len = Math.min(originals.length, clones.length);

  for (let i = 0; i < len; i += 1) {
    const src = originals[i];
    const dst = clones[i];
    const computed = window.getComputedStyle(src as unknown as Element);
    const parts: string[] = [];
    for (const prop of SVG_STYLE_PROPS) {
      const val = computed.getPropertyValue(prop);
      if (!val) continue;
      const trimmed = val.trim();
      if (!trimmed) continue;
      // Avoid inlining defaults that bloat output.
      if (trimmed === "none" || trimmed === "normal" || trimmed === "auto") continue;
      parts.push(`${prop}:${trimmed}`);
    }
    if (parts.length) {
      dst.setAttribute("style", parts.join(";"));
    }
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadSvgElementAsSvg(
  svgElement: SVGSVGElement,
  filename: string,
  options: { padding?: number } = {},
) {
  const padding = options.padding ?? 20;
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  ensureSvgNamespace(clone);

  const bbox = svgElement.getBBox();
  setSvgViewBoxWithPadding(clone, bbox as unknown as DOMRect, padding);
  inlineComputedStyles(svgElement, clone);

  const svgData = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, filename.endsWith(".svg") ? filename : `${filename}.svg`);
}

export async function svgElementToPngBlob(
  svgElement: SVGSVGElement,
  options: { padding?: number; scale?: number; backgroundColor?: string } = {},
): Promise<Blob> {
  const padding = options.padding ?? 20;
  const scale = options.scale ?? 2;
  const backgroundColor = options.backgroundColor ?? "#ffffff";

  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  ensureSvgNamespace(clone);

  const bbox = svgElement.getBBox();
  const { width, height } = setSvgViewBoxWithPadding(clone, bbox as unknown as DOMRect, padding);
  inlineComputedStyles(svgElement, clone);

  const svgData = new XMLSerializer().serializeToString(clone);
  const encoded = encodeURIComponent(svgData);
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encoded}`;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load SVG image"));
    img.src = dataUrl;
  });

  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to export PNG"))), "image/png");
  });
  return blob;
}

export async function downloadSvgElementAsPng(
  svgElement: SVGSVGElement,
  filename: string,
  options: { padding?: number; scale?: number; backgroundColor?: string } = {},
) {
  const blob = await svgElementToPngBlob(svgElement, options);
  downloadBlob(blob, filename.endsWith(".png") ? filename : `${filename}.png`);
}

export async function elementToPngBlob(
  element: HTMLElement,
  options: { padding?: number; scale?: number; backgroundColor?: string } = {},
): Promise<Blob> {
  const padding = options.padding ?? 40;
  const scale = options.scale ?? 3;
  const backgroundColor = options.backgroundColor ?? "#ffffff";

  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width) + padding * 2;
  const height = Math.ceil(rect.height) + padding * 2;

  const temp = document.createElement("div");
  temp.style.position = "fixed";
  temp.style.left = "-9999px";
  temp.style.top = "-9999px";
  temp.style.width = `${width}px`;
  temp.style.height = `${height}px`;
  temp.style.padding = `${padding}px`;
  temp.style.background = backgroundColor;
  temp.style.display = "flex";
  temp.style.alignItems = "center";
  temp.style.justifyContent = "center";

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.margin = "0";
  temp.appendChild(clone);
  document.body.appendChild(temp);

  try {
    const canvas = await html2canvas(temp, {
      backgroundColor,
      scale,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      useCORS: true,
      allowTaint: false,
    });
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to export PNG"))), "image/png");
    });
    return blob;
  } finally {
    temp.remove();
  }
}

export async function downloadElementAsPng(
  element: HTMLElement,
  filename: string,
  options: { padding?: number; scale?: number; backgroundColor?: string } = {},
) {
  const blob = await elementToPngBlob(element, options);
  downloadBlob(blob, filename.endsWith(".png") ? filename : `${filename}.png`);
}
