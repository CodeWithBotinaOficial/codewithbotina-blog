import html2canvas from 'html2canvas';
import { useState } from 'preact/hooks';

interface Props {
  elementRef: any;
  filename: string;
}

export default function DownloadButton({ elementRef, filename }: Props) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!elementRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(elementRef.current, { backgroundColor: null, scale: 2, logging: false });
      const link = document.createElement('a');
      link.download = `${filename}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button type="button" className="btn-secondary" onClick={handleDownload} disabled={downloading}>
      {downloading ? "Downloading..." : "Download PNG"}
    </button>
  );
}
