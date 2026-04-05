import DOMPurify from "dompurify";
import { renderMarkdownHtml } from "../../lib/markdown";
import MarkdownEnhancer from "../markdown/MarkdownEnhancer";
import { useMemo } from "preact/hooks";
import type { MarkdownFeatureLabels } from "../../lib/markdown-labels";
import type { SupportedLanguage } from "../../lib/i18n";

interface Props {
  content: string;
  language: SupportedLanguage;
  labels: MarkdownFeatureLabels;
  title?: string;
}

export default function MarkdownPreview({ content, language, labels, title }: Props) {
  const containerId = useMemo(() => `md-preview-${Math.random().toString(36).slice(2)}`, []);
  const html = renderMarkdownHtml(content);
  const sanitized = DOMPurify.sanitize(html);

  return (
    <div class="markdown-preview prose max-w-none rounded-lg border border-[var(--color-border)] bg-white p-4">
      <div id={containerId} dangerouslySetInnerHTML={{ __html: sanitized }} />
      <MarkdownEnhancer
        containerId={containerId}
        language={language}
        labels={labels}
        title={title}
        version={content}
      />
    </div>
  );
}
