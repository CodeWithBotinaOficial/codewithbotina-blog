import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import Toast from "../ui/Toast";
import LatexContextMenu from "./LatexContextMenu";
import type { LatexLabels } from "../../lib/markdown-labels";
import type { SupportedLanguage } from "../../lib/i18n";
import { downloadElementAsPng, elementToPngBlob } from "../../lib/download-utils";

type KaTeXModule = typeof import("katex");

const formulaCache = new Map<string, string>();
let katexImportPromise: Promise<KaTeXModule> | null = null;

async function loadKaTeX(): Promise<KaTeXModule> {
  if (!katexImportPromise) {
    katexImportPromise = import("katex").then((m) => (m as any).default ?? m);
  }
  return katexImportPromise;
}

async function writeToClipboardText(text: string) {
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

async function renderElementToPngBlob(element: HTMLElement): Promise<Blob | null> {
  try {
    return await elementToPngBlob(element, { padding: 40, scale: 3, backgroundColor: "#ffffff" });
  } catch (_err) {
    return null;
  }
}

interface Props {
  formula: string;
  displayMode: boolean;
  labels: LatexLabels;
  language: SupportedLanguage;
}

export default function LatexRenderer({ formula, displayMode, labels }: Props) {
  const hostRef = useRef<HTMLDivElement | HTMLSpanElement | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const [html, setHtml] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [toastId, setToastId] = useState<number | null>(null);

  const cacheKey = useMemo(() => `${displayMode ? "D" : "I"}:${formula}`, [displayMode, formula]);

  useEffect(() => {
    let cancelled = false;
    const cached = formulaCache.get(cacheKey);
    if (cached) {
      setHtml(cached);
      return;
    }

    (async () => {
      try {
        const katex = await loadKaTeX();
        const rendered = katex.renderToString(formula, {
          displayMode,
          throwOnError: false,
          strict: false,
          errorColor: "#cc0000",
          trust: false,
          output: "html",
        });
        formulaCache.set(cacheKey, rendered);
        if (!cancelled) setHtml(rendered);
      } catch (_err) {
        if (!cancelled) setHtml(`<span class="md-latex__error">${escapeHtml(formula)}</span>`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, displayMode, formula]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!menuOpen) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest?.("[data-md-latex-menu]")) return;
      setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (!menuOpen) return;
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const showToast = () => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToastId(id);
    window.setTimeout(() => setToastId(null), 2000);
  };

  const openMenuAt = (x: number, y: number) => {
    setMenuPos({ x, y });
    setMenuOpen(true);
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    openMenuAt(e.clientX, e.clientY);
  };

  const onTouchStart = (e: TouchEvent) => {
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    const touch = e.touches[0];
    pressTimerRef.current = window.setTimeout(() => {
      openMenuAt(touch.clientX, touch.clientY);
    }, 500);
  };

  const onTouchEnd = () => {
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
  };

  const downloadPng = async () => {
    try {
      const host = hostRef.current as HTMLElement | null;
      if (!host) return;
      const target = (host.querySelector(".katex") as HTMLElement | null) ??
        (host.querySelector(".katex-display") as HTMLElement | null) ??
        host;
      await downloadElementAsPng(target, `formula-${Date.now()}.png`, { padding: 40, scale: 3, backgroundColor: "#ffffff" });
      showToast();
    } catch (_err) {
      // ignore
    } finally {
      setMenuOpen(false);
    }
  };

  const copyLatex = async () => {
    try {
      await writeToClipboardText(formula);
      showToast();
    } catch (_err) {
      // ignore
    } finally {
      setMenuOpen(false);
    }
  };

  const copyRendered = async () => {
    try {
      const host = hostRef.current as HTMLElement | null;
      if (!host) return;
      const target = (host.querySelector(".katex") as HTMLElement | null) ??
        (host.querySelector(".katex-display") as HTMLElement | null) ??
        host;
      const blob = await renderElementToPngBlob(target);
      if (blob && (navigator.clipboard as any)?.write && (globalThis as any).ClipboardItem) {
        const item = new (globalThis as any).ClipboardItem({ "image/png": blob });
        await (navigator.clipboard as any).write([item]);
        showToast();
        return;
      }
      const text = (target.textContent ?? "").trim();
      if (text) {
        await writeToClipboardText(text);
        showToast();
      }
    } catch (_err) {
      // ignore
    } finally {
      setMenuOpen(false);
    }
  };

  const Tag = displayMode ? "div" : "span";

  return (
    <>
      <Tag
        ref={hostRef as any}
        class={`md-latex__host ${displayMode ? "md-latex__host--display" : "md-latex__host--inline"}`}
        onContextMenu={onContextMenu as any}
        onTouchStart={onTouchStart as any}
        onTouchEnd={onTouchEnd as any}
        onTouchCancel={onTouchEnd as any}
        // KaTeX HTML is sanitized by our own rendering (no user-provided HTML execution).
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {menuOpen ? (
        <>
          <div class="md-latex__overlay" onClick={() => setMenuOpen(false)} />
          <LatexContextMenu
            formula={formula}
            position={menuPos}
            labels={labels}
            onDownloadPng={downloadPng}
            onCopyLatex={copyLatex}
            onCopyRendered={copyRendered}
          />
        </>
      ) : null}

      {toastId ? <Toast message={labels.copied} type="success" onClose={() => setToastId(null)} duration={2000} /> : null}
    </>
  );
}

function escapeHtml(value: string): string {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
