#!/usr/bin/env node
// Checks a deployed copy of the site: node scripts/smoke.mjs https://www.kevinliu.studio
const base = (process.argv[2] ?? '').replace(/\/$/, '');
if (!base) { console.error('usage: node scripts/smoke.mjs <base-url>'); process.exit(2); }
const fails = [];
// a protected preview needs VERCEL_AUTOMATION_BYPASS_SECRET, or VERCEL_OIDC_TOKEN from `vercel project token
// kevinliu-studio` (short-lived, nothing to store); production URLs need neither
const env = process.env;
const bypass = env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': env.VERCEL_AUTOMATION_BYPASS_SECRET }
  : env.VERCEL_OIDC_TOKEN ? { 'x-vercel-trusted-oidc-idp-token': env.VERCEL_OIDC_TOKEN } : {};
const get = async (path, headers = {}) => { const r = await fetch(base + path, { headers: { ...bypass, ...headers }, redirect: 'manual' }); return { r, text: r.status === 200 ? await r.text() : '' }; };
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
for (const p of ['/llms.txt', '/llms-full.txt', '/robots.txt', '/sitemap-index.xml', '/index.md', '/battle/arena.md', '/cards/elo.md', '/og/home.jpg', '/og/home.mp4', '/share/about.jpg', '/cards.md', '/favicon.ico', '/sound/manifest.gallery.json',
  '/es/llms.txt', '/ja/llms-full.txt', '/es/index.md', '/zh/cards/elo.md', '/ko/battle/arena.md']) {
  const { r } = await get(p);
  if (r.status !== 200) fails.push(`${p}: ${r.status}`);
}
// the stylesheets, scripts and face a page names by content address are kept for a year (vercel.json)
const { text: home } = await get('/');
for (const u of [home.match(/\/ex\/ui\.css\?v=[0-9a-f]+/)?.[0], home.match(/\/fonts\/[\w-]+\.woff2/)?.[0]]) {
  if (!u) { fails.push('/: no versioned /ex/ui.css or preloaded face'); continue; }
  const { r } = await get(u);
  if (!/immutable/.test(r.headers.get('cache-control') ?? '')) fails.push(`${u}: cache-control ${r.headers.get('cache-control')}`);
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
for (const [p, to] of [['/about/', '/about'], ['/index', '/'], ['/about.html', '/about'], ['/en', '/'], ['/es/', '/es'], ['/ja/about/', '/ja/about'], ['/kevin_liu_resume_25.pdf', 'https://portfoliomon.kevinliu.studio/kevin_liu_resume_25.pdf']]) {
  const { r } = await get(p);
  const at = r.headers.get('location') ?? '';
  if (![301, 308].includes(r.status) || !(at === to || at.endsWith(to) && to.startsWith('/'))) fails.push(`${p}: ${r.status} to ${at}, expected a redirect to ${to}`);
}
const md = await get('/about.md');
if (!/^text\/markdown/.test(md.r.headers.get('content-type') ?? '')) fails.push(`/about.md: content-type ${md.r.headers.get('content-type')}`);
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log(`smoke: ${base} passes`);
