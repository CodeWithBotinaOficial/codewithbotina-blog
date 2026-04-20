import { useEffect } from "preact/hooks";
import { render } from "preact";
import DiagramRenderer from "./DiagramRenderer";
import TableWrapper from "./TableWrapper";
import type { MarkdownFeatureLabels } from "../../lib/markdown-labels";
import type { SupportedLanguage } from "../../lib/i18n";

function decodeBase64Utf8(value: string): string {
  const raw = value ?? "";
  if (!raw) return "";

  // Prefer browser `atob`, but fall back to Node `Buffer` for test environments.
  try {
    if (typeof atob === "function") {
      const binary = atob(raw);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }
  } catch (_err) {
    // fall through
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buf = (globalThis as any).Buffer;
    if (buf?.from) {
      const bytes = buf.from(raw, "base64") as Uint8Array;
      return new TextDecoder().decode(bytes);
    }
  } catch (_err) {
    // ignore
  }

  return "";
}

interface Props {
  containerId: string;
  language: SupportedLanguage;
  labels: MarkdownFeatureLabels;
  title?: string;
  version?: number | string;
}

export default function MarkdownEnhancer({ containerId, language, labels, title, version }: Props) {
  useEffect(() => {
    const root = document.getElementById(containerId);
    if (!root) return;

    const diagramNodes = Array.from(root.querySelectorAll<HTMLElement>(".md-diagram"));
    for (const node of diagramNodes) {
      if (node.dataset.enhanced) continue;
      const diagramLangRaw = String(node.getAttribute("data-diagram-lang") ?? node.dataset.diagramLang ?? "");
      const diagramLang = diagramLangRaw.trim().toLowerCase();

      const codeB64 = String(node.getAttribute("data-diagram-code") ?? node.dataset.diagramCode ?? "");
      const fallbackCodeEl = node.querySelector("pre code") as HTMLElement | null;
      const fallbackCode = String(fallbackCodeEl?.textContent ?? "");

      let code = "";
      if (codeB64) {
        try {
          code = decodeBase64Utf8(codeB64);
        } catch (_err) {
          code = "";
        }
      }
      if (!code) code = fallbackCode;
      if (!code.trim()) continue;

      const fallbackClassLang = (() => {
        const className = String(fallbackCodeEl?.className ?? "");
        const match = className.match(/(?:^|\s)language-([a-z0-9_-]+)(?:\s|$)/i);
        return match?.[1] ? String(match[1]).toLowerCase() : "";
      })();

      const effectiveLang = diagramLang || fallbackClassLang || "mermaid";
      node.dataset.enhanced = "1";
      // Remove the SSR fallback <pre><code> so only the toggle-controlled code view is visible.
      node.innerHTML = "";
      render(
        <DiagramRenderer
          code={code}
          diagramLang={effectiveLang}
          labels={labels.diagram}
          language={language}
          filenameBase={title}
        />,
        node,
      );
    }

    const tableNodes = Array.from(root.querySelectorAll<HTMLElement>(".md-table"));
    for (const node of tableNodes) {
      if (node.dataset.enhanced) continue;
      const tableB64 = String(node.getAttribute("data-table-html") ?? node.dataset.tableHtml ?? "");
      if (!tableB64) continue;
      node.dataset.enhanced = "1";
      // Replace SSR HTML with the interactive wrapper (copy controls, scroll hint).
      node.innerHTML = "";
      const tableHtml = decodeBase64Utf8(tableB64);
      render(<TableWrapper tableHtml={tableHtml} labels={labels.table} language={language} />, node);
    }
  }, [containerId, language, labels, title, version]);

  return null;
}
