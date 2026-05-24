import dynamic from 'next/dynamic';
import { useRef } from 'preact/hooks';
import DownloadButton from './DownloadButton';

// Note: react-wordcloud may require React; in this project we add the dependency
// and rely on bundler compatibility. If issues arise, consider using a simple
// canvas-based word cloud or server-side generated image.
let ReactWordcloud: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ReactWordcloud = require('react-wordcloud');
} catch (_e) {
  ReactWordcloud = null;
}

interface Props {
  responses: string[];
}

export default function WordCloud({ responses = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const words = processResponses(responses || []);
  const options = { rotations: 2, rotationAngles: [0, 90], fontSizes: [12, 60], padding: 2 };

  return (
    <div ref={containerRef} className="poll-wordcloud">
      <h4>Response Cloud</h4>
      <div className="wordcloud-container">
        {ReactWordcloud ? <ReactWordcloud words={words} options={options} /> : <div>Word cloud unavailable</div>}
      </div>
      <DownloadButton elementRef={containerRef} filename="wordcloud" />
    </div>
  );
}

function processResponses(responses: string[]) {
  const wordCount = new Map<string, number>();
  responses.forEach((response) => {
    if (!response) return;
    const words = response.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    words.forEach(w => wordCount.set(w, (wordCount.get(w) || 0) + 1));
  });
  return Array.from(wordCount.entries()).map(([text, value]) => ({ text, value }));
}

