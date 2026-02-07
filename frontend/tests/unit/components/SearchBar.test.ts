import { describe, it, expect, vi } from 'vitest';
import { handleSearch } from '../../../src/lib/search';
import { JSDOM } from 'jsdom';

describe('handleSearch', () => {
  it('filters posts based on search query', async () => {
    const dom = new JSDOM(`
      <div>
        <input id="search-input" />
        <div id="posts-grid">
          <div class="post-card-wrapper" data-title="Astro"></div>
          <div class="post-card-wrapper" data-title="React"></div>
        </div>
      </div>
    `);

    global.document = dom.window.document;
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    
    handleSearch(searchInput);

    searchInput.value = 'Astro';
    searchInput.dispatchEvent(new dom.window.Event('input'));

    // Use a timeout to account for debounce
    await new Promise(resolve => setTimeout(resolve, 350));

    const post1 = document.querySelector('[data-title="Astro"]') as HTMLElement;
    const post2 = document.querySelector('[data-title="React"]') as HTMLElement;

    expect(post1.style.display).toBe('block');
    expect(post2.style.display).toBe('none');
  });
});
