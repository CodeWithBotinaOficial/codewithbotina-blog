import { Marked, Renderer } from "marked";

const DIAGRAM_LANGS = new Set(["mermaid", "plantuml", "puml", "graphviz", "dot", "viz"]);
const LATEX_ATTR_PREFIX = "md-latex";

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

function maskLatexInQuotedStrings(markdown: string): string {
  // Requirement: LaTeX inside quoted strings ("..." or '...') should not render.
  // We avoid math parsing inside quoted strings by escaping the math openers there.
  //
  // Scope: only outside fenced code blocks and inline code spans.
  const fenced = new Map<string, string>();
  let fencedIdx = 0;
  const fencedRegex = /```[^\n]*\n[\s\S]*?```/g;
  let working = (markdown ?? "").replace(fencedRegex, (match) => {
    const key = `__MD_FENCED_${fencedIdx++}__`;
    fenced.set(key, match);
    return key;
  });

  const inline = new Map<string, string>();
  let inlineIdx = 0;
  const inlineCodeRegex = /`[^`]*`/g;
  working = working.replace(inlineCodeRegex, (match) => {
    const key = `__MD_INLINE_${inlineIdx++}__`;
    inline.set(key, match);
    return key;
  });

  // Quote matcher with basic escape support.
  const quotedRegex = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g;
  working = working.replace(quotedRegex, (match) => {
    // Escape $ and \[ / \] so the math tokenizer won't see them as delimiters.
    return match
      .replaceAll("$", "\\$")
      .replaceAll("\\[", "\\\\[")
      .replaceAll("\\]", "\\\\]");
  });

  // Restore inline code and fenced blocks.
  // IMPORTANT: use a function replacer so `$` inside code spans is not treated as a replacement pattern.
  for (const [key, value] of inline) working = working.replaceAll(key, () => value);
  for (const [key, value] of fenced) working = working.replaceAll(key, () => value);
  return working;
}

function findClosingDollar(src: string, startIndex: number): number {
  for (let i = startIndex; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === "\n") return -1;
    if (ch !== "$") continue;
    if (src[i - 1] === "\\") continue; // escaped \$ inside formula
    return i;
  }
  return -1;
}

/**
 * Render markdown to HTML, adding lightweight placeholders for diagram code blocks and tables.
 * Interactivity is added client-side by MarkdownEnhancer.
 */
export function renderMarkdownHtml(markdown: string): string {
  const marked = new Marked({ gfm: true, breaks: false });
  const withPollEmbeds = processMarkdownWithPolls(markdown ?? "");
  const normalized = maskLatexInQuotedStrings(withPollEmbeds);

  marked.use({
    extensions: [
      {
        name: "latex_block",
        level: "block",
        start(src: string) {
          const a = src.indexOf("$$");
          const b = src.indexOf("\\[");
          if (a === -1) return b === -1 ? undefined : b;
          if (b === -1) return a;
          return Math.min(a, b);
        },
        tokenizer(src: string) {
          const match = /^(?: {0,3}\$\$([\s\S]+?)\$\$[ \t]*(?:\n+|$)| {0,3}\\\[([\s\S]+?)\\\][ \t]*(?:\n+|$))/.exec(
            src,
          );
          if (!match) return;
          const formula = String(match[1] ?? match[2] ?? "").trim();
          if (!formula) return;
          return {
            type: "latex_block",
            raw: match[0],
            text: formula,
            displayMode: true,
          };
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        renderer(token: any) {
          const formula = String(token.text ?? "");
          const b64 = encodeBase64Utf8(formula);
          const fallback = `<code class="${LATEX_ATTR_PREFIX}__fallback">${escapeHtml(formula)}</code>`;
          return `<div class="${LATEX_ATTR_PREFIX} ${LATEX_ATTR_PREFIX}--display" data-latex-b64="${b64}" data-display="1">${fallback}</div>`;
        },
      },
      {
        name: "latex_inline",
        level: "inline",
        start(src: string) {
          const idx = src.indexOf("$");
          return idx === -1 ? undefined : idx;
        },
        tokenizer(src: string) {
          if (!src.startsWith("$")) return;
          if (src.startsWith("$$")) return; // handled by block rule
          if (src.startsWith("\\$")) return; // escaped delimiter

          const close = findClosingDollar(src, 1);
          if (close <= 1) return;
          const raw = src.slice(0, close + 1);
          const formula = src.slice(1, close).trim();
          if (!formula) return;
          return {
            type: "latex_inline",
            raw,
            text: formula,
            displayMode: false,
          };
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        renderer(token: any) {
          const formula = String(token.text ?? "");
          const b64 = encodeBase64Utf8(formula);
          const fallback = `<code class="${LATEX_ATTR_PREFIX}__fallback">${escapeHtml(formula)}</code>`;
          return `<span class="${LATEX_ATTR_PREFIX}" data-latex-b64="${b64}" data-display="0">${fallback}</span>`;
        },
      },
    ],
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

  return String(marked.parse(normalized));
}

/**
 * Parse poll embeds from markdown.
 * Syntax: [Poll Title](poll:slug) or [Poll Title](poll:slug|language)
 * Example: [Vote Now](poll:favorite-language-2024|es)
 */
export function parsePollLinks(content: string): string {
  const pollLinkRegex = /\[([^\]]+)\]\(poll:([a-z0-9-]+)(?:\|([a-z-]+))?\)/g;

  return content.replace(pollLinkRegex, (match, text, slug, lang) => {
    const safeSlug = String(slug ?? "").trim();
    const safeText = escapeHtml(String(text ?? ""));
    const safeLang = lang ? String(lang).trim() : "";

    let html = `<div class="md-poll" data-poll-slug="${safeSlug}" data-poll-text="${safeText}"`;
    if (safeLang) {
      html += ` data-poll-lang="${safeLang}"`;
    }
    html += `><span class="md-poll__fallback">${safeText}</span></div>`;
    return html;
  });
}

/**
 * Process markdown with poll embeds.
 * Poll embeds must not render inside fenced code blocks or inline code spans.
 */
export function processMarkdownWithPolls(content: string): string {
  let working = content ?? "";

  const fenced = new Map<string, string>();
  let fencedIdx = 0;
  working = working.replace(/```[^\n]*\n[\s\S]*?```/g, (match) => {
    const key = `__MD_POLL_FENCED_${fencedIdx++}__`;
    fenced.set(key, match);
    return key;
  });

  const inline = new Map<string, string>();
  let inlineIdx = 0;
  working = working.replace(/`[^`]*`/g, (match) => {
    const key = `__MD_POLL_INLINE_${inlineIdx++}__`;
    inline.set(key, match);
    return key;
  });

  working = parsePollLinks(working);

  for (const [key, value] of inline) working = working.replaceAll(key, () => value);
  for (const [key, value] of fenced) working = working.replaceAll(key, () => value);

  return working;
}
