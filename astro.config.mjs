// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { DEFAULT, LOCALES } from './src/i18n/locales.mjs';
import { SITE } from './src/lib/site.ts';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  // English at the root, every other language under its code (/es/cards/turboslide); the pages are src/pages/[lang]
  i18n: { defaultLocale: DEFAULT, locales: LOCALES.map((l) => l.code), routing: { prefixDefaultLocale: false } },
  integrations: [sitemap({
    // each page's lastmod is written after the build from what it prints (scripts/lastmod.mjs, lastmod.json)
    filter: (page) => !page.includes('/404'),
    // each page lists itself in every language (xhtml:link hreflang)
    i18n: { defaultLocale: DEFAULT, locales: Object.fromEntries(LOCALES.map((l) => [l.code, l.lang])) },
  })],
  vite: { build: { assetsInlineLimit: 0 } },
});
