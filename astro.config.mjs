// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { DEFAULT, LOCALES, OTHER } from './src/i18n/locales.mjs';

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
// a file belongs in a page's list when a change to it changes what the page shows a reader: the cards' data, the
// battle's roster (a card page's Battle link, the home page's dock), and site.ts (Kevin's description, facts and
// the questions on /about)
const SOURCES = [
  [/^\/$/, () => ['public/ex/fighters.js', 'vendor/battle/vendor/engine.js', 'src/lib/site.ts', 'src/views/Home.astro']],
  [/^\/cards$/, () => ['public/ex/fighters.js', 'src/views/Cards.astro']],
  [/^\/cards\/([\w-]+)$/, (id) => ['public/ex/fighters.js', 'vendor/battle/vendor/engine.js', `public/og/${id}.jpg`, `public/ex/media/${id}`, 'src/views/Card.astro']],
  [/^\/about$/, () => ['public/ex/fighters.js', 'src/lib/site.ts', 'src/views/About.astro']],
  [/^\/battle(\/arena)?$/, () => ['vendor/battle', 'public/battle', 'src/components/BattlePage.astro']],
];
// a translated page changes when its English page does, or when its language's translations do
const LANG = new RegExp(`^/(${OTHER.join('|')})(?=/|$)`);
const lastmod = (url) => {
  const full = new URL(url).pathname, lang = LANG.exec(full)?.[1];
  const p = lang ? full.slice(lang.length + 1) || '/' : full;
  const gt = LOCALES.find((l) => l.code === lang)?.gt;
  for (const [re, paths] of SOURCES) { const m = p.match(re); if (m) return gitDate(...paths(m[1]), ...(gt ? [`src/i18n/${gt}`] : [])); }
  return undefined;
};

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  // English at the root, every other language under its code (/es/cards/turboslide); the pages are src/pages/[lang]
  i18n: { defaultLocale: DEFAULT, locales: LOCALES.map((l) => l.code), routing: { prefixDefaultLocale: false } },
  integrations: [sitemap({
    filter: (page) => !page.includes('/404'),
    // each page lists itself in every language (xhtml:link hreflang)
    i18n: { defaultLocale: DEFAULT, locales: Object.fromEntries(LOCALES.map((l) => [l.code, l.lang])) },
    serialize: (item) => ({ ...item, lastmod: lastmod(item.url) }),
  })],
  vite: { build: { assetsInlineLimit: 0 } },
});
