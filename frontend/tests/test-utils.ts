import { render } from 'astro/runtime/server/index.js';
import { vi } from 'vitest';

// Mock Astro's global object
vi.stubGlobal('Astro', {
  props: {},
  slots: {},
});

export async function getRenderedHTML(Component, props = {}) {
  const result = await render({
    request: new Request('http://localhost'),
    props,
    slots: {},
    component: Component,
    ssr: true,
  });
  return result.html;
}
