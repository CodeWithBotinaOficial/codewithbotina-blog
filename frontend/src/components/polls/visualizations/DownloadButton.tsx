import html2canvas from "html2canvas";
import { useState } from "preact/hooks";
import { Download } from "lucide-preact";
import { useToast } from "../../../hooks/useToast";
import { t, type SupportedLanguage } from "../../../lib/i18n";

interface Props {
  elementRef: { current: HTMLElement | null };
  filename: string;
  type?: 'chart' | 'list';
  language: SupportedLanguage;
}

export default function DownloadButton({ elementRef, filename, type = 'chart', language }: Props) {
  const [downloading, setDownloading] = useState(false);
  const { showToast } = useToast();

  async function handleDownload() {
    if (!elementRef.current) return;
    setDownloading(true);

    try {
      const element = elementRef.current;
      
      // Clone element for measurement and modification
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '-9999px';
      clone.style.display = 'block';
      clone.style.background = '#ffffff';
      clone.style.boxSizing = "border-box";
      document.body.appendChild(clone);
      
      // Hide download buttons in clone
      const buttons = clone.querySelectorAll<HTMLElement>(".download-btn");
      buttons.forEach(b => b.style.display = "none");
      
      // Add generous padding so headings never clip.
      clone.style.padding = "28px";
      clone.style.borderRadius = '12px';

      // Allow the clone to lay out at its natural width first, then measure.
      const rect = clone.getBoundingClientRect();
      const naturalW = Math.max(rect.width, clone.scrollWidth);
      const naturalH = Math.max(rect.height, clone.scrollHeight);
      const width = Math.ceil(naturalW) + 24;
      const height = Math.ceil(naturalH) + 24;
      clone.style.width = `${width}px`;
      
      // Ensure specific elements are visible/formatted correctly
      if (type === 'list') {
        const listItems = clone.querySelectorAll<HTMLElement>('.top-list-item');
        listItems.forEach(item => {
          item.style.wordWrap = 'break-word';
          item.style.whiteSpace = 'normal';
          item.style.overflow = 'visible';
        });
      }

      // Render canvas with higher scale for better quality
      const canvas = await html2canvas(clone, { 
        backgroundColor: '#ffffff', 
        scale: 3, 
        logging: false,
        useCORS: true,
        allowTaint: false,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
      });
      
      // Cleanup
      document.body.removeChild(clone);

      const link = document.createElement('a');
      link.download = `${filename}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      showToast(t(language, "polls.results.downloadSuccess", "post"), 'success');
    } catch (err) {
      console.error('Download failed', err);
      showToast(t(language, "polls.results.downloadFailed", "post"), 'error');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button 
      type="button" 
      className="btn-secondary download-btn flex items-center gap-2" 
      onClick={handleDownload} 
      disabled={downloading}
      title={t(language, "polls.results.downloadAsPNG", "post")}
    >
      <Download size={16} />
      <span>{downloading ? t(language, "polls.results.downloading", "post") : t(language, "polls.results.downloadPNG", "post")}</span>
    </button>
  );
}
