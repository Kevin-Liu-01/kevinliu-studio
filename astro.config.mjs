// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

export const SITE = 'https://www.kevinliu.studio';

// A page's lastmod is the date of the last commit that changed what it prints: the cards' data (synced from the
// rounds), its own source, or, for a card, its art. In a shallow clone (Vercel's) a path untouched since the clone's
// oldest commit would take that commit's date, which is not when it changed, so it gets no lastmod; without git, none.
const git = (...args) => { try { return execFileSync('git', args, { encoding: 'utf8' }).trim(); } catch { return ''; } };
const SHALLOW = new Set((() => { const f = git('rev-parse', '--git-path', 'shallow'); try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean); } catch { return []; } })());
const gitDate = (...paths) => {
  const [sha, date] = git('log', '-1', '--format=%H %cI', '--', ...paths).split(' ');
  return sha && !SHALLOW.has(sha) ? date : undefined;
};
const SOURCES = [
  [/^\/$/, () => ['public/ex/fighters.js', 'src/pages/index.astro']],
  [/^\/cards$/, () => ['public/ex/fighters.js', 'src/pages/cards.astro']],
  [/^\/cards\/([\w-]+)$/, (id) => ['public/ex/fighters.js', `public/og/${id}.jpg`, `public/ex/media/${id}`, 'src/pages/cards/[id].astro']],
  [/^\/about$/, () => ['src/lib/site.ts', 'src/pages/about.astro']],
  [/^\/battle(\/arena)?$/, () => ['vendor/battle', 'public/battle', 'src/components/BattlePage.astro']],
];
const lastmod = (url) => {
  const p = new URL(url).pathname;
  for (const [re, paths] of SOURCES) { const m = p.match(re); if (m) return gitDate(...paths(m[1])); }
  return undefined;
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
