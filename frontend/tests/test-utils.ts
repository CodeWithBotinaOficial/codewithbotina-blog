import { render } from 'astro/runtime/server/index.js';
import { vi } from 'vitest';

vi.stubGlobal('Astro', {
  props: {},
  slots: {},
});

export async function getRenderedHTML(Component: any, props: Record<string, unknown> = {}) {
  const result = (render as any)({
    request: new Request('http://localhost'),
    props,
    slots: {},
    component: Component,
    ssr: true,
  }) as { html?: string };

  return result.html ?? '';
}
