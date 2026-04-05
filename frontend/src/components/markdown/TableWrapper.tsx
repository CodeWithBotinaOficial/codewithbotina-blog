import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Check, ChevronDown, Copy } from "lucide-preact";
import Toast from "../ui/Toast";
import type { TableLabels } from "../../lib/markdown-labels";
import type { SupportedLanguage } from "../../lib/i18n";

type CopyFormat = "markdown" | "tsv" | "csv";

function escapePipes(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function toMarkdownTable(table: HTMLTableElement): string {
  const headerCells = Array.from(table.querySelectorAll("thead th"));
  const bodyRows = Array.from(table.querySelectorAll("tbody tr"));

  const headers = headerCells.length > 0
    ? headerCells.map((th) => (th.textContent ?? "").trim())
    : Array.from(table.querySelectorAll("tr:first-child th, tr:first-child td")).map((c) =>
        (c.textContent ?? "").trim(),
      );

  const body = bodyRows.length > 0
    ? bodyRows.map((tr) =>
        Array.from(tr.querySelectorAll("td, th")).map((c) => (c.textContent ?? "").trim()),
      )
    : Array.from(table.querySelectorAll("tr")).slice(headers.length > 0 ? 1 : 0).map((tr) =>
        Array.from(tr.querySelectorAll("td, th")).map((c) => (c.textContent ?? "").trim()),
      );

  const safeHeaders = headers.map(escapePipes);
  const headerLine = `| ${safeHeaders.join(" | ")} |`;
  const dividerLine = `| ${safeHeaders.map(() => "---").join(" | ")} |`;
  const bodyLines = body.map((row) => `| ${row.map((v) => escapePipes(v)).join(" | ")} |`);
  return [headerLine, dividerLine, ...bodyLines].join("\n");
}

function toTsv(table: HTMLTableElement): string {
  const rows = Array.from(table.querySelectorAll("tr"));
  return rows
    .map((tr) =>
      Array.from(tr.querySelectorAll("th, td"))
        .map((c) => (c.textContent ?? "").replaceAll("\t", " ").trim())
        .join("\t"),
    )
    .join("\n");
}

function csvEscape(value: string): string {
  const v = value.replaceAll("\r", "").replaceAll("\n", " ").trim();
  if (/[",\n]/.test(v)) return `"${v.replaceAll('"', '""')}"`;
  return v;
}

function toCsv(table: HTMLTableElement): string {
  const rows = Array.from(table.querySelectorAll("tr"));
  return rows
    .map((tr) => Array.from(tr.querySelectorAll("th, td")).map((c) => csvEscape(c.textContent ?? "")).join(","))
    .join("\n");
}

async function writeToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "true");
  el.style.position = "fixed";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

interface Props {
  tableHtml: string;
  labels: TableLabels;
  language: SupportedLanguage;
}

export default function TableWrapper({ tableHtml, labels }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [toastId, setToastId] = useState<number | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const tableEl = useMemo(() => {
    const container = document.createElement("div");
    container.innerHTML = tableHtml;
    const table = container.querySelector("table");
    if (!table) return null;

    // Ensure semantic helpers for a11y.
    table.querySelectorAll("thead th").forEach((th) => th.setAttribute("scope", "col"));
    table.querySelectorAll("tbody th").forEach((th) => th.setAttribute("scope", "row"));
    return table;
  }, [tableHtml]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const updateHint = () => {
      const overflows = scroller.scrollWidth > scroller.clientWidth + 2;
      const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
      setShowScrollHint(overflows && !atEnd);
    };

    updateHint();
    scroller.addEventListener("scroll", updateHint, { passive: true });

    const ro = new ResizeObserver(updateHint);
    ro.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateHint);
      ro.disconnect();
    };
  }, [tableHtml]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!formatOpen) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest?.("[data-md-table-menu]")) return;
      setFormatOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [formatOpen]);

  const copyAs = async (format: CopyFormat) => {
    if (!tableEl) return;

    const text = format === "markdown" ? toMarkdownTable(tableEl) : format === "tsv" ? toTsv(tableEl) : toCsv(tableEl);

    try {
      await writeToClipboard(text);
      setCopied(true);
      setFormatOpen(false);
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToastId(id);
      window.setTimeout(() => setCopied(false), 2000);
      window.setTimeout(() => setToastId(null), 2000);
    } catch (_error) {
      setFormatOpen(false);
    }
  };

  return (
    <div class="md-table__container">
      <div class="md-table__scroller" ref={scrollerRef}>
        <div class="md-table__toolbar" data-md-table-menu>
          <button
            type="button"
            class="md-table__btn"
            onClick={() => copyAs("markdown")}
            aria-label={labels.copy}
            title={labels.copy}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            type="button"
            class="md-table__btn"
            onClick={() => setFormatOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={formatOpen}
            aria-label="Copy options"
            title="Copy options"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          {formatOpen ? (
            <div class="md-table__menu" role="menu">
              <button type="button" class="md-table__menuitem" role="menuitem" onClick={() => copyAs("markdown")}>
                {labels.copyAsMarkdown}
              </button>
              <button type="button" class="md-table__menuitem" role="menuitem" onClick={() => copyAs("tsv")}>
                {labels.copyAsTSV}
              </button>
              <button type="button" class="md-table__menuitem" role="menuitem" onClick={() => copyAs("csv")}>
                {labels.copyAsCSV}
              </button>
            </div>
          ) : null}
        </div>

        {tableEl ? (
          <div dangerouslySetInnerHTML={{ __html: tableEl.outerHTML }} />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: tableHtml }} />
        )}
      </div>

      {showScrollHint ? (
        <div class="md-table__hint" aria-hidden="true">
          {labels.scrollToSee} →
        </div>
      ) : null}

      {toastId ? (
        <Toast
          message={labels.copied}
          type="success"
          onClose={() => setToastId(null)}
          duration={2000}
        />
      ) : null}
    </div>
  );
}

