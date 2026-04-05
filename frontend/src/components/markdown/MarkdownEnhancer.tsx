import { useEffect } from "preact/hooks";
import { render } from "preact";
import DiagramRenderer from "./DiagramRenderer";
import TableWrapper from "./TableWrapper";
import type { MarkdownFeatureLabels } from "../../lib/markdown-labels";
import type { SupportedLanguage } from "../../lib/i18n";

function decodeBase64Utf8(value: string): string {
  const raw = value ?? "";
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
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

    const diagramNodes = Array.from(
      root.querySelectorAll<HTMLElement>(".md-diagram[data-diagram-code]:not([data-enhanced])"),
    );
    for (const node of diagramNodes) {
      const diagramLang = String(node.dataset.diagramLang ?? "").trim().toLowerCase();
      const codeB64 = String(node.dataset.diagramCode ?? "");
      if (!codeB64) continue;
      node.dataset.enhanced = "1";
      const code = decodeBase64Utf8(codeB64);
      render(
        <DiagramRenderer
          code={code}
          diagramLang={diagramLang || "mermaid"}
          labels={labels.diagram}
          language={language}
          filenameBase={title}
        />,
        node,
      );
    }

    const tableNodes = Array.from(
      root.querySelectorAll<HTMLElement>(".md-table[data-table-html]:not([data-enhanced])"),
    );
    for (const node of tableNodes) {
      const tableB64 = String(node.dataset.tableHtml ?? "");
      if (!tableB64) continue;
      node.dataset.enhanced = "1";
      const tableHtml = decodeBase64Utf8(tableB64);
      render(<TableWrapper tableHtml={tableHtml} labels={labels.table} language={language} />, node);
    }
  }, [containerId, language, labels, title, version]);

  return null;
}

