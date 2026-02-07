import rss from '@astrojs/rss';
import { supabase } from '../lib/supabase';
import type { Post } from '../types/post';

export async function GET(context: any) {
  const { data: posts } = await supabase
    .from('posts')
    .select('titulo, slug, body, fecha')
    .order('fecha', { ascending: false });

  const items = (posts || []).map((post: Post) => ({
    title: post.titulo,
    pubDate: new Date(post.fecha),
    description: post.body.slice(0, 160) + '...',
    link: `/posts/${post.slug}/`,
  }));

  return rss({
    title: 'CodeWithBotina',
    description: 'Technical insights on software development, web technologies, and programming best practices.',
    site: context.site,
    items: items,
    customData: `<language>en-us</language>`,
  });
}
