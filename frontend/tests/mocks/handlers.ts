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
];
