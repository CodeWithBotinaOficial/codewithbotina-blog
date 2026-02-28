import { marked } from "marked";
import DOMPurify from "dompurify";

interface Props {
  content: string;
}

export default function MarkdownPreview({ content }: Props) {
  const html = marked.parse(content);
  const sanitized = DOMPurify.sanitize(html);

  return (
    <div
      class="markdown-preview prose max-w-none rounded-lg border border-[var(--color-border)] bg-white p-4"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
