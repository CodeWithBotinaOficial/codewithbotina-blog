export function handleSearch(searchInput: HTMLInputElement) {
  const clearButton = document.getElementById('clear-search');
  const resultsCount = document.getElementById('search-results-count');
  const countSpan = document.getElementById('count');
  const postsGrid = document.getElementById('posts-grid');
  const noResults = document.getElementById('no-results');

  let debounceTimer: number;

  searchInput.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();

    if (query.length > 0) {
      clearButton?.classList.remove('hidden');
    } else {
      clearButton?.classList.add('hidden');
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => filterPosts(query), 300);
  });

  clearButton?.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
    filterPosts('');
    clearButton.classList.add('hidden');
  });

  function filterPosts(query: string) {
    const posts = document.querySelectorAll('.post-card-wrapper');
    let visibleCount = 0;

    posts.forEach((post) => {
      const title = post.getAttribute('data-title')?.toLowerCase() || '';
      const excerpt = post.getAttribute('data-excerpt')?.toLowerCase() || '';

      if (title.includes(query) || excerpt.includes(query)) {
        (post as HTMLElement).style.display = 'block';
        visibleCount++;
      } else {
        (post as HTMLElement).style.display = 'none';
      }
    });

    if (query.length > 0) {
      resultsCount?.classList.remove('hidden');
      if (countSpan) countSpan.textContent = visibleCount.toString();
    } else {
      resultsCount?.classList.add('hidden');
    }

    if (visibleCount === 0 && query.length > 0) {
      noResults?.classList.remove('hidden');
      postsGrid?.classList.add('hidden');
    } else {
      noResults?.classList.add('hidden');
      postsGrid?.classList.remove('hidden');
    }
  }
}
