import html2canvas from "html2canvas";
import { useState } from "preact/hooks";

interface Props {
  elementRef: any;
  filename: string;
}

export default function DownloadButton({ elementRef, filename }: Props) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!elementRef.current) return;
    setDownloading(true);

    const rootEl = elementRef.current as HTMLElement;
    const buttons = Array.from(rootEl.querySelectorAll<HTMLElement>(".download-btn"));
    const originalDisplays = buttons.map((b) => b.style.display);
    try {
      // Hide download buttons so they don't appear in the PNG export.
      for (const b of buttons) b.style.display = "none";
      await new Promise((r) => setTimeout(r, 50));

      const canvas = await html2canvas(elementRef.current, { backgroundColor: null, scale: 2, logging: false });
      const link = document.createElement('a');
      link.download = `${filename}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      buttons.forEach((b, i) => b.style.display = originalDisplays[i] ?? "");
      setDownloading(false);
    }
  }

  return (
    <button type="button" className="btn-secondary download-btn" onClick={handleDownload} disabled={downloading}>
      {downloading ? "Downloading..." : "Download PNG"}
    </button>
  );
}
