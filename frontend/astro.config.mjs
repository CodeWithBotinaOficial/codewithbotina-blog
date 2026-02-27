import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://blog.codewithbotina.com',
  integrations: [preact()],
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
  },
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
    assets: '_astro',
  },
  compressHTML: true,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
