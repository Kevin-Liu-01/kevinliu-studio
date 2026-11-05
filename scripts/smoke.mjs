#!/usr/bin/env node
// Checks a deployed copy of the site: node scripts/smoke.mjs https://www.kevinliu.studio
const base = (process.argv[2] ?? '').replace(/\/$/, '');
if (!base) { console.error('usage: node scripts/smoke.mjs <base-url>'); process.exit(2); }
const fails = [];
const get = async (path, headers = {}) => { const r = await fetch(base + path, { headers, redirect: 'manual' }); return { r, text: r.status === 200 ? await r.text() : '' }; };
const pages = ['/', '/about', '/battle', '/battle/arena', '/cards/claude-of-tanks', '/cards/katagami', '/cards/atlas'];
for (const p of pages) {
  const { r, text } = await get(p);
  if (r.status !== 200) fails.push(`${p}: ${r.status}`);
  else if (!text.includes('<link rel="canonical"')) fails.push(`${p}: no canonical`);
  const md = await get(p, { Accept: 'text/markdown' });
  if (md.r.status !== 200 || !/^# /.test(md.text)) fails.push(`${p}: Accept text/markdown gave ${md.r.status}`);
}
for (const p of ['/llms.txt', '/llms-full.txt', '/robots.txt', '/sitemap-index.xml', '/index.md', '/cards/elo.md', '/og/home.jpg', '/og/home.mp4', '/favicon.ico', '/sound/manifest.gallery.json']) {
  const { r } = await get(p);
  if (r.status !== 200) fails.push(`${p}: ${r.status}`);
}
const { r: nf } = await get('/no-such-page');
if (nf.status !== 404) fails.push(`/no-such-page: ${nf.status}, expected 404`);
const { r: slash } = await get('/about/');
if (![301, 308].includes(slash.status)) fails.push(`/about/: ${slash.status}, expected a redirect`);
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log(`smoke: ${base} passes`);
