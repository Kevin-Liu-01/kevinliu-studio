// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { execFileSync } from 'node:child_process';

export const SITE = 'https://www.kevinliu.studio';

// A page's lastmod is the date of the last commit that changed what it prints: the cards' data (synced from the
// rounds), its own source, or, for a card, its art. A clone without that history (a shallow build) falls back to
// the build's own commit date, and without git to none at all.
const gitDate = (...paths) => {
  try { return execFileSync('git', ['log', '-1', '--format=%cI', '--', ...paths], { encoding: 'utf8' }).trim() || undefined; } catch { return undefined; }
};
const HEAD = gitDate('.');
const SOURCES = [
  [/^\/$/, () => ['public/ex/fighters.js', 'src/pages/index.astro']],
  [/^\/cards$/, () => ['public/ex/fighters.js', 'src/pages/cards.astro']],
  [/^\/cards\/([\w-]+)$/, (id) => ['public/ex/fighters.js', `public/og/${id}.jpg`, `public/ex/media/${id}`, 'src/pages/cards/[id].astro']],
  [/^\/about$/, () => ['src/lib/site.ts', 'src/pages/about.astro']],
  [/^\/battle(\/arena)?$/, () => ['vendor/battle', 'public/battle', 'src/components/BattlePage.astro']],
];
const lastmod = (url) => {
  const p = new URL(url).pathname;
  for (const [re, paths] of SOURCES) { const m = p.match(re); if (m) return gitDate(...paths(m[1])) ?? HEAD; }
  return HEAD;
};

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [sitemap({
    filter: (page) => !page.includes('/404'),
    serialize: (item) => ({ ...item, lastmod: lastmod(item.url) }),
  })],
  vite: { build: { assetsInlineLimit: 0 } },
});
