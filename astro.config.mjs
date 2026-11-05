// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export const SITE = 'https://www.kevinliu.studio';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  vite: { build: { assetsInlineLimit: 0 } },
});
