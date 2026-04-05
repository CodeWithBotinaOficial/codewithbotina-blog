import { t, type SupportedLanguage } from "./i18n";

export interface DiagramLabels {
  viewDiagram: string;
  viewCode: string;
  zoomIn: string;
  zoomOut: string;
  resetZoom: string;
  download: string;
  downloadPNG: string;
  downloadSVG: string;
  fullscreen: string;
  rendering: string;
  error: string;
  errorDetail: string;
}

export interface TableLabels {
  copy: string;
  copied: string;
  copyAsMarkdown: string;
  copyAsTSV: string;
  copyAsCSV: string;
  scrollToSee: string;
}

export interface MarkdownFeatureLabels {
  diagram: DiagramLabels;
  table: TableLabels;
}

export function getMarkdownFeatureLabels(language: SupportedLanguage): MarkdownFeatureLabels {
  return {
    diagram: {
      viewDiagram: t(language, "diagram.viewDiagram", "post"),
      viewCode: t(language, "diagram.viewCode", "post"),
      zoomIn: t(language, "diagram.zoomIn", "post"),
      zoomOut: t(language, "diagram.zoomOut", "post"),
      resetZoom: t(language, "diagram.resetZoom", "post"),
      download: t(language, "diagram.download", "post"),
      downloadPNG: t(language, "diagram.downloadPNG", "post"),
      downloadSVG: t(language, "diagram.downloadSVG", "post"),
      fullscreen: t(language, "diagram.fullscreen", "post"),
      rendering: t(language, "diagram.rendering", "post"),
      error: t(language, "diagram.error", "post"),
      errorDetail: t(language, "diagram.errorDetail", "post"),
    },
    table: {
      copy: t(language, "table.copy", "post"),
      copied: t(language, "table.copied", "post"),
      copyAsMarkdown: t(language, "table.copyAsMarkdown", "post"),
      copyAsTSV: t(language, "table.copyAsTSV", "post"),
      copyAsCSV: t(language, "table.copyAsCSV", "post"),
      scrollToSee: t(language, "table.scrollToSee", "post"),
    },
  };
}

