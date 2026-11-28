// vercel.json's routing, read without a deployment. The Markdown negotiation: the Accept rule on the four routes that
// rewrite a page to its twin (English and the other languages, homes and pages), the one route that sends
// Vary: Accept, and no route that labels a missing .md as Markdown. The route contract: every language alternation in
// vercel.json is exactly src/i18n/locales.mjs OTHER, and every page alternation is exactly the pages src/pages holds,
// so adding a language or a page and forgetting vercel.json fails here instead of serving HTML to an agent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { OTHER } from '../src/i18n/locales.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const { routes } = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));

// the pages with a twin: every route file under src/pages but the home and the 404, a dynamic segment as [\w-]+
const PAGES = (function walk(dir, at = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return e.name.startsWith('[') ? [] : walk(path.join(dir, e.name), `${at}${e.name}/`);
    const m = /^(.+)\.astro$/.exec(e.name);
    return m && !(at === '' && ['index', '404'].includes(m[1])) ? [`${at}${m[1].replace(/^\[\w+\]$/, '[\\w-]+')}`] : [];
  });
})(path.join(ROOT, 'src/pages')).sort();

const groups = (src) => [...src.matchAll(/\((?:\?:)?([^()]*\|[^()]*)\)/g)].map((m) => m[1].split('|'));
const isLangs = (alts) => alts.every((a) => /^[a-z]{2}$/.test(a));
const isPages = (alts) => alts.includes('about');

test('every language alternation in vercel.json is locales.mjs OTHER', () => {
  let n = 0;
  for (const r of routes) for (const alts of groups(r.src ?? '').filter(isLangs)) { n++; assert.deepEqual([...alts].sort(), [...OTHER].sort(), r.src); }
  assert.ok(n >= 9, `expected the language list in at least 9 places, found ${n}`);
});

test('every page alternation in vercel.json is the set of pages src/pages holds', () => {
  let n = 0;
  for (const r of routes) for (const alts of groups(r.src ?? '').filter(isPages)) { n++; assert.deepEqual([...alts].sort(), PAGES, r.src); }
  assert.ok(n >= 5, `expected the page list in at least 5 places, found ${n}`);
});

// [Accept header, whether the twin is served]
const CASES = [
  ['text/markdown', true],
  ['text/markdown, text/html;q=0.9', true],
  ['text/markdown;q=0.9, text/html;q=0.8', true],
  ['text/markdown;charset=utf-8, text/html;q=0.5', true],
  ['text/plain, text/markdown;q=0.8, text/html;q=0.7', true],
  ['application/json, text/markdown', true],
  ['text/markdown;q=0.5', true],
  ['text/markdown;q=0.01', true],
  ['text/html, text/markdown;q=0.1', false],
  ['text/html,text/markdown', false],
  ['text/markdown;q=0, text/html', false],
  ['text/markdown;q=0.0', false],
  ['text/markdown; q=0', false],
  ['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', false],
  ['*/*', false],
  ['', false],
];
const twinRoutes = routes.filter((r) => typeof r.dest === 'string' && r.dest.endsWith('.md') && r.has?.some((h) => h.type === 'header' && h.key === 'accept'));

test('four routes rewrite a page to its twin on Accept, and each reads Accept the same way', () => {
  assert.equal(twinRoutes.length, 4);
  for (const r of twinRoutes) {
    const re = new RegExp(`^(?:${r.has.find((h) => h.key === 'accept').value})$`); // Vercel matches the whole header
    for (const [accept, want] of CASES) assert.equal(re.test(accept), want, `${r.src}: Accept "${accept}"`);
  }
});

test('one route sends Vary: Accept, on every page and on nothing else', () => {
  const vary = routes.filter((r) => r.headers && Object.keys(r.headers).some((k) => k.toLowerCase() === 'vary'));
  assert.equal(vary.length, 1);
  const re = new RegExp(vary[0].src);
  for (const p of ['/', '/about', '/cards', '/cards/atlas', '/battle', '/battle/arena', '/es', '/ja/about', '/zh/cards/atlas', '/pt/battle/arena']) assert.ok(re.test(p), p);
  for (const p of ['/fonts/katagami-sans-site.woff2', '/ex/ui.css', '/cards.md', '/og/home.jpg', '/llms.txt', '/es/gallery.js', '/es/cards.md', '/es/', '/fr/llms.txt']) assert.ok(!re.test(p), p);
});

test('no route labels a file Markdown before it is found', () => {
  for (const r of routes) assert.ok(!r.headers?.['Content-Type']?.startsWith('text/markdown'), r.src);
});

test('the Content-Security-Policy keeps framing, base and objects closed and leaves inline scripts alone', () => {
  const csp = routes.find((r) => r.src === '^/.*$' && r.continue)?.headers?.['Content-Security-Policy'] ?? '';
  for (const d of ["frame-ancestors 'self'", "base-uri 'self'", "object-src 'none'"]) assert.ok(csp.includes(d), d);
  assert.ok(!/script-src|default-src/.test(csp), 'the pages run inline scripts');
});
