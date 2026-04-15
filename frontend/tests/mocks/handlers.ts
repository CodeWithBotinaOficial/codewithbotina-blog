import { http, HttpResponse } from 'msw';
import { mockPosts } from '../fixtures/testData';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;

export const handlers = [
  // Supabase Posts
  http.get(`${supabaseUrl}/rest/v1/posts`, ({ request }) => {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');

    // If a slug is present, it's a request for a single post
    if (slug) {
      const post = mockPosts.find(p => p.slug === slug.replace('eq.', ''));
      return HttpResponse.json(post ? [post] : []);
    }
    
    // Otherwise, it's a request for all posts
    return HttpResponse.json(mockPosts);
  }),

  // Contact Form API
  http.post('https://api.codewithbotina.com/api/contact', async ({ request }) => {
    const data = await request.json();
    if (data.email === 'fail@example.com') {
      return HttpResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
    return HttpResponse.json({ success: true, data: { id: '123' } }, { status: 201 });
  }),

  // Backend tag endpoints used by the search UI
  http.get('http://localhost:8000/api/tags', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') ?? '';
    const tags = q
      ? [{ id: 'tag-1', name: q, slug: q.toLowerCase(), usage_count: 1 }]
      : [];
    return HttpResponse.json({ success: true, data: { tags, total: tags.length, limit: 10, offset: 0 } });
  }),
  http.get('http://localhost:8000/api/tags/autocomplete', ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const tags = q.length >= 2
      ? [{ id: 'tag-1', name: q, slug: q.toLowerCase(), usage_count: 1 }]
      : [];
    return HttpResponse.json({ success: true, data: { tags } });
  }),
];
