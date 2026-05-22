import { Download, Copy, FileCode } from "lucide-preact";
import type { LatexLabels } from "../../lib/markdown-labels";

interface Props {
  formula: string;
  position: { x: number; y: number };
  labels: LatexLabels;
  onDownloadPng: () => void;
  onCopyLatex: () => void;
  onCopyRendered: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function LatexContextMenu({
  position,
  labels,
  onDownloadPng,
  onCopyLatex,
  onCopyRendered,
}: Props) {
  const menuWidth = 220;
  const menuHeight = 136;
  const x = clamp(position.x, 8, window.innerWidth - menuWidth - 8);
  const y = clamp(position.y, 8, window.innerHeight - menuHeight - 8);

  return (
    <div
      class="md-latex__menu"
      role="menu"
      style={{ left: `${x}px`, top: `${y}px` }}
      data-md-latex-menu
    >
      <button type="button" class="md-latex__menuitem" role="menuitem" onClick={onDownloadPng}>
        <Download className="h-4 w-4" aria-hidden="true" />
        <span>{labels.downloadPNG}</span>
      </button>
      <button type="button" class="md-latex__menuitem" role="menuitem" onClick={onCopyLatex}>
        <FileCode className="h-4 w-4" aria-hidden="true" />
        <span>{labels.copyLatex}</span>
      </button>
      <button type="button" class="md-latex__menuitem" role="menuitem" onClick={onCopyRendered}>
        <Copy className="h-4 w-4" aria-hidden="true" />
        <span>{labels.copyRendered}</span>
      </button>
    </div>
  );
}
