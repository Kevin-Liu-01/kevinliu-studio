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
const pages = ['/', '/cards', '/about', '/battle', '/battle/arena', '/cards/claude-of-tanks', '/cards/katagami', '/cards/atlas'];
for (const p of pages) {
  const { r, text } = await get(p);
  if (r.status !== 200) fails.push(`${p}: ${r.status}`);
  else if (!text.includes('<link rel="canonical"')) fails.push(`${p}: no canonical`);
  const md = await get(p, { Accept: 'text/markdown' });
  if (md.r.status !== 200 || !/^# /.test(md.text)) fails.push(`${p}: Accept text/markdown gave ${md.r.status}`);
}
for (const p of ['/llms.txt', '/llms-full.txt', '/robots.txt', '/sitemap-index.xml', '/index.md', '/battle/arena.md', '/cards/elo.md', '/og/home.jpg', '/og/home.mp4', '/share/about.jpg', '/cards.md', '/favicon.ico', '/sound/manifest.gallery.json']) {
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
// a client that prefers HTML, or refuses Markdown, gets HTML; one that prefers Markdown gets the twin
for (const [accept, want] of [['text/html, text/markdown;q=0.1', 'text/html'], ['text/markdown;q=0, text/html', 'text/html'], ['text/markdown, text/html;q=0.9', 'text/markdown'], ['application/json, text/markdown', 'text/markdown']]) {
  const { r } = await get('/cards', { Accept: accept });
  const type = r.headers.get('content-type') ?? '';
  if (r.status !== 200 || !type.startsWith(want)) fails.push(`/cards with Accept "${accept}": ${r.status} ${type}, expected ${want}`);
}
// a missing .md address is a 404 that does not claim to be Markdown
for (const p of ['/no-such-page.md', '/.md']) {
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
for (const [p, to] of [['/about/', '/about'], ['/index', '/'], ['/about.html', '/about'], ['/en', '/'], ['/kevin_liu_resume_25.pdf', 'https://portfoliomon.kevinliu.studio/kevin_liu_resume_25.pdf']]) {
  const { r } = await get(p);
  const at = r.headers.get('location') ?? '';
  if (![301, 308].includes(r.status) || !(at === to || at.endsWith(to) && to.startsWith('/'))) fails.push(`${p}: ${r.status} to ${at}, expected a redirect to ${to}`);
}
const md = await get('/about.md');
if (!/^text\/markdown/.test(md.r.headers.get('content-type') ?? '')) fails.push(`/about.md: content-type ${md.r.headers.get('content-type')}`);
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log(`smoke: ${base} passes`);
