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
      const canvas = await html2canvas(elementRef.current, { backgroundColor: '#ffffff', scale: 2 });
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

  return <button onClick={handleDownload} disabled={downloading}>⬇ Download PNG</button>;
}

