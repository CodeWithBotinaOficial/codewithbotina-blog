const MERMAID_ENTITY_MAP: Record<string, string> = {
  "&gt;": ">",
  "&lt;": "<",
  "&amp;": "&",
  "&quot;": '"',
  "&#34;": '"',
  "&#x22;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&apos;": "'",
};

const DANGEROUS_MERMAID_PATTERNS = [
  /<\s*script\b/i,
  /<\s*iframe\b/i,
  /<\s*object\b/i,
  /<\s*embed\b/i,
  /<\s*img\b/i,
  /<\s*svg\b/i,
  /<\s*math\b/i,
  /<\s*link\b/i,
  /<\s*meta\b/i,
  /<\s*base\b/i,
  /<\s*style\b/i,
  /\bon[a-z]+\s*=/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
];

export function restoreMermaidLineBreaks(text: string): string {
  return String(text ?? "")
    .replace(/&#10;|&#x0a;|&#x0A;/g, "\n")
    .replace(/&#13;|&#x0d;|&#x0D;/g, "\n")
    .replace(/&lt;br\s*\/?&gt;/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
}

export function unescapeMermaidEntities(text: string): string {
  let decoded = String(text ?? "");

  for (let pass = 0; pass < 3; pass += 1) {
    const previous = decoded;
    decoded = decoded.replace(
      /&(gt|lt|amp|quot|apos);|&#(?:34|39);|&#x(?:22|27);/gi,
      (entity) => MERMAID_ENTITY_MAP[entity.toLowerCase()] ?? entity,
    );
    if (decoded === previous) break;
  }

  return decoded;
}

export function isSafeMermaidContent(code: string): boolean {
  const text = String(code ?? "");
  return !DANGEROUS_MERMAID_PATTERNS.some((pattern) => pattern.test(text));
}

export function prepareMermaidContent(rawContent: string): string {
  if (!rawContent) return "";

  const restored = restoreMermaidLineBreaks(rawContent);
  const decoded = restoreMermaidLineBreaks(unescapeMermaidEntities(restored)).trim();

  if (!decoded || !isSafeMermaidContent(decoded)) {
    return "";
  }

  return decoded;
}
