#!/usr/bin/env node
// Checks a deployed copy of the site: node scripts/smoke.mjs https://www.kevinliu.studio
import { get as request } from './lib/http.mjs';

const base = (process.argv[2] ?? '').replace(/\/$/, '');
if (!base) { console.error('usage: node scripts/smoke.mjs <base-url>'); process.exit(2); }
const fails = [];
// one request, redirects not followed; a protected preview's bypass headers come from the environment (lib/http.mjs)
const get = async (path, headers = {}) => { const r = await request(base, base + path, headers); return { r, text: r.status === 200 ? await r.text() : '' }; };
// English at the root and two of the other languages (src/i18n/locales.mjs), one Latin and one CJK
const pages = ['/', '/cards', '/about', '/battle', '/battle/arena', '/cards/claude-of-tanks', '/cards/katagami', '/cards/atlas',
  '/es', '/es/cards', '/es/about', '/es/battle/arena', '/es/cards/katagami', '/ja', '/ja/about', '/ja/battle', '/ja/cards/atlas'];
for (const p of pages) {
  const { r, text } = await get(p);
  if (r.status !== 200) fails.push(`${p}: ${r.status}`);
  else if (!text.includes('<link rel="canonical"')) fails.push(`${p}: no canonical`);
  const md = await get(p, { Accept: 'text/markdown' });
  if (md.r.status !== 200 || !/^# /.test(md.text)) fails.push(`${p}: Accept text/markdown gave ${md.r.status}`);
}
for (const p of ['/llms.txt', '/llms-full.txt', '/robots.txt', '/sitemap-index.xml', '/index.md', '/battle/arena.md', '/cards/elo.md', '/og/home.jpg', '/og/home.mp4', '/share/about.jpg', '/cards.md', '/favicon.ico', '/sound/manifest.gallery.json', '/cb6a3653b4728bdc971aba0603513583.txt',
  '/es/llms.txt', '/ja/llms-full.txt', '/es/index.md', '/zh/cards/elo.md', '/ko/battle/arena.md']) {
  const { r } = await get(p);
  if (r.status !== 200) fails.push(`${p}: ${r.status}`);
}
// what a page names by content address is kept for a year (vercel.json): its stylesheets and scripts, both faces, and
// the frame and effect drawings whose ?v= is their own hash; the same face or drawing asked for without ?v= is not
const { text: home } = await get('/');
const border = home.match(/borders\/[\w/-]+\.svg\?v=[0-9a-f]+/)?.[0];
for (const u of [home.match(/\/ex\/ui\.css\?v=[0-9a-f]+/)?.[0], home.match(/\/fonts\/katagami-sans-site\.woff2\?v=[0-9a-f]+/)?.[0], home.match(/\/fonts\/katagami-mono-site\.woff2\?v=[0-9a-f]+/)?.[0], border && `/ex/${border}`]) {
  if (!u) { fails.push('/: no versioned /ex/ui.css, face, Machine face or border drawing'); continue; }
  const { r } = await get(u);
  if (r.status !== 200 || !/immutable/.test(r.headers.get('cache-control') ?? '')) fails.push(`${u}: ${r.status} cache-control ${r.headers.get('cache-control')}`);
}
for (const u of ['/fonts/katagami-sans-site.woff2', border && `/ex/${border.split('?')[0]}`]) {
  if (!u) continue;
  const { r } = await get(u);
  if (r.status !== 200 || /immutable/.test(r.headers.get('cache-control') ?? '')) fails.push(`${u} without ?v=: ${r.status} cache-control ${r.headers.get('cache-control')}, expected 200 and no immutable`);
}
const { r: nf } = await get('/no-such-page');
if (nf.status !== 404) fails.push(`/no-such-page: ${nf.status}, expected 404`);
// a miss under a language answers that language's 404
const { r: nfl } = await get('/de/no-such-page');
if (nfl.status !== 404) fails.push(`/de/no-such-page: ${nfl.status}, expected 404`);
// a translated home names its gallery shim and face by content address, kept a year
const { text: es } = await get('/es');
for (const u of [es.match(/\/es\/gallery\.js\?v=[0-9a-f]+/)?.[0], es.match(/\/fonts\/katagami-sans-ext\.woff2\?v=[0-9a-f]+/)?.[0]]) {
  if (!u) { fails.push('/es: no versioned gallery.js or accented-Latin face'); continue; }
  const { r } = await get(u);
  if (!/immutable/.test(r.headers.get('cache-control') ?? '')) fails.push(`${u}: cache-control ${r.headers.get('cache-control')}`);
}
// a client that prefers HTML, or refuses Markdown, gets HTML; one that prefers Markdown gets the twin
for (const [accept, want] of [['text/html, text/markdown;q=0.1', 'text/html'], ['text/markdown;q=0, text/html', 'text/html'], ['text/markdown, text/html;q=0.9', 'text/markdown'], ['application/json, text/markdown', 'text/markdown']]) {
  for (const p of ['/cards', '/es/cards']) {
    const { r } = await get(p, { Accept: accept });
    const type = r.headers.get('content-type') ?? '';
    if (r.status !== 200 || !type.startsWith(want)) fails.push(`${p} with Accept "${accept}": ${r.status} ${type}, expected ${want}`);
  }
}
// a missing .md address is a 404 that does not claim to be Markdown
for (const p of ['/no-such-page.md', '/.md', '/es/no-such-page.md']) {
  const { r } = await get(p);
  if (r.status !== 404 || /^text\/markdown/.test(r.headers.get('content-type') ?? '')) fails.push(`${p}: ${r.status} ${r.headers.get('content-type')}, expected a 404 that is not text/markdown`);
}
// only the negotiated pages vary on Accept, and no other site may frame a page
{
  const { r: page } = await get('/about');
  if (!/accept/i.test(page.headers.get('vary') ?? '')) fails.push(`/about: vary ${page.headers.get('vary')}, expected Accept`);
  if (!/frame-ancestors 'self'/.test(page.headers.get('content-security-policy') ?? '')) fails.push(`/about: content-security-policy ${page.headers.get('content-security-policy')}`);
  const { r: face } = await get('/fonts/katagami-sans-site.woff2');
  if (/accept(?!-encoding)/i.test(face.headers.get('vary') ?? '')) fails.push(`/fonts/katagami-sans-site.woff2: vary ${face.headers.get('vary')}, expected no Accept`);
}
for (const [p, to] of [['/about/', '/about'], ['/index', '/'], ['/about.html', '/about'], ['/en', '/'], ['/sitemap.xml', '/sitemap-index.xml'], ['/es/', '/es'], ['/ja/about/', '/ja/about'], ['/kevin_liu_resume_25.pdf', 'https://portfoliomon.kevinliu.studio/kevin_liu_resume_25.pdf']]) {
  const { r } = await get(p);
  const at = r.headers.get('location') ?? '';
  // the target itself, not any address that ends the same way: "/" must be this site's home
  const same = at !== '' && new URL(at, base + '/').href === new URL(to, base + '/').href;
  if (![301, 308].includes(r.status) || !same) fails.push(`${p}: ${r.status} to ${at}, expected a redirect to ${to}`);
}
const md = await get('/about.md');
if (!/^text\/markdown/.test(md.r.headers.get('content-type') ?? '')) fails.push(`/about.md: content-type ${md.r.headers.get('content-type')}`);
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log(`smoke: ${base} passes`);
