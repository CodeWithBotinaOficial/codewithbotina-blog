import { Marked, Renderer } from "marked";

const DIAGRAM_LANGS = new Set(["mermaid", "plantuml", "puml", "graphviz", "dot", "viz"]);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function encodeBase64Utf8(value: string): string {
  const text = value ?? "";
  // SSR (Node): Buffer is available. Client: fall back to TextEncoder + btoa.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maybeBuffer = (globalThis as any).Buffer as typeof Buffer | undefined;
  if (maybeBuffer) return maybeBuffer.from(text, "utf8").toString("base64");

  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/**
 * Render markdown to HTML, adding lightweight placeholders for diagram code blocks and tables.
 * Interactivity is added client-side by MarkdownEnhancer.
 */
export function renderMarkdownHtml(markdown: string): string {
  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      code(token) {
        const normalizedLang = String(token.lang ?? "").trim().toLowerCase();
        const fallback = Renderer.prototype.code.call(this, token);

        if (!normalizedLang || !DIAGRAM_LANGS.has(normalizedLang)) {
          return fallback;
        }

        const code = String(token.text ?? "");
        const dataLang = normalizedLang;
        const dataCode = encodeBase64Utf8(code);

        // Keep a <pre><code> fallback for no-JS and for the "View Code" toggle.
        return [
          `<div class="md-diagram" data-diagram-lang="${escapeHtml(dataLang)}" data-diagram-code="${dataCode}">`,
          fallback,
          `</div>`,
        ].join("");
      },
      table(token) {
        const tableHtml = Renderer.prototype.table.call(this, token);
        const dataTable = encodeBase64Utf8(tableHtml);
        return [
          `<div class="md-table" data-table-html="${dataTable}">`,
          tableHtml,
          `</div>`,
        ].join("");
      },
    },
  });

  return String(marked.parse(markdown ?? ""));
}
