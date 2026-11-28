#!/usr/bin/env node
// Checks a served copy of the site the way a crawler, an unfurler and an answer engine meet it:
//   node scripts/check-seo.mjs <base-url> [--external]
// For every page in the sitemap, plus the 404: the share tags are present (og:image, its alt, twitter:card
// summary_large_image, twitter:image and its alt), the image answers 200 as a 1200 x 630 JPEG, the JSON-LD parses, and
// every link on the page answers (site links against <base-url>; with --external, every outside link too, without a
// sign-in, so a private repository fails). Each Markdown twin answers 200 as text/markdown. Production URLs inside a
// page are read against <base-url>, so a local serve of dist checks itself.
import { jpegSize, metaOf, shareTagProblems, PAGES_MIN } from './lib/checks.mjs';
import { get, follow } from './lib/http.mjs';
import { LOCALES } from '../src/i18n/locales.mjs';

const base = (process.argv[2] ?? '').replace(/\/$/, '');
const external = process.argv.includes('--external');
if (!base) { console.error('usage: node scripts/check-seo.mjs <base-url> [--external]'); process.exit(2); }
import { SITE } from '../src/lib/site.ts';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
// sites that refuse every scripted request, whatever it asks for: reported, never failed
const WALLED = /^https:\/\/(www\.)?(linkedin\.com|princeton\.edu|x\.com|devpost\.com)\//;
const local = (u) => (u.startsWith(SITE) ? base + u.slice(SITE.length) : u);
const fails = [];
const notes = [];
const seen = new Map();

async function status(u, headers = {}) {
  if (seen.has(u)) return seen.get(u);
  const p = (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // redirects are followed by hand, so one that leaves this site never carries the preview's bypass header
        const { r, url } = await follow(base, u, { 'user-agent': UA, accept: 'text/html,*/*', ...headers }, { signal: AbortSignal.timeout(20000) });
        await r.body?.cancel();
        return { code: r.status, at: url };
      } catch (e) { if (attempt) return { code: 0, at: String(e.cause?.code ?? e.message) }; }
    }
  })();
  seen.set(u, p);
  return p;
}

// the index names each sitemap file, as a crawler meets them; a second file would be read too
const index = await (await get(base, `${base}/sitemap-index.xml`)).text();
const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => local(m[1]));
if (!maps.length) fails.push('sitemap-index.xml lists no sitemap');
const sitemap = (await Promise.all(maps.map(async (u) => (await get(base, u)).text()))).join('');
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].slice(SITE.length) || '/');
if (pages.length < PAGES_MIN * LOCALES.length) fails.push(`sitemap lists ${pages.length} pages`);

const links = new Map(); // url -> first page that links it
for (const p of [...pages, '/no-such-page']) {
  const r = await get(base, base + p, { accept: 'text/html' });
  const html = await r.text();
  if (r.status !== (p === '/no-such-page' ? 404 : 200)) fails.push(`${p}: ${r.status}`);
  const image = metaOf(html)('og:image');
  if (!image) { fails.push(`${p}: no og:image`); continue; }
  for (const why of shareTagProblems(html)) fails.push(`${p}: ${why}`);
  const ir = await get(base, local(image));
  const buf = Buffer.from(await ir.arrayBuffer());
  const size = jpegSize(buf);
  if (ir.status !== 200 || !/^image\/jpeg/.test(ir.headers.get('content-type') ?? '') || size?.join('x') !== '1200x630') fails.push(`${p}: og:image ${image} is ${ir.status} ${ir.headers.get('content-type')} ${size?.join('x')}`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { fails.push(`${p}: JSON-LD does not parse`); } }
  // links, resolved against the page's <base> the way a browser resolves them
  const at = new URL(html.match(/<base href="([^"]+)"/)?.[1] ?? p, base + '/');
  for (const m of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
    const h = m[1].replace(/&amp;/g, '&');
    if (/^(mailto:|javascript:|#)/.test(h)) continue;
    const u = new URL(h, at);
    u.hash = '';
    const key = local(u.href);
    if (!links.has(key)) links.set(key, p);
  }
  if (p !== '/no-such-page') {
    // a home's twin is its index.md: /index.md, and /es/index.md for a language's home (src/lib/twins.ts twinPath)
    const twin = p === '/' ? '/index.md' : /^\/[a-z]{2}$/.test(p) ? `${p}/index.md` : `${p}.md`;
    const tr = await get(base, base + twin);
    if (tr.status !== 200 || !/^text\/markdown/.test(tr.headers.get('content-type') ?? '')) fails.push(`${twin}: ${tr.status} ${tr.headers.get('content-type')}`);
    await tr.body?.cancel();
  }
}

let checked = 0;
const queue = [...links].filter(([u]) => u.startsWith(base) || external);
await Promise.all(Array.from({ length: 8 }, async () => {
  for (let item; (item = queue.shift());) {
    const [u, from] = item;
    const r = await status(u);
    checked++;
    if (r.code >= 200 && r.code < 400) continue;
    if (WALLED.test(u)) notes.push(`${u}: ${r.code} (refuses scripts; check by hand)`);
    else fails.push(`${u} (linked from ${from}): ${r.code} ${r.at}`);
  }
}));

for (const n of notes) console.log(`note: ${n}`);
if (fails.length) { console.error(`check-seo: ${fails.length} problem(s)`); for (const f of fails) console.error(`  ${f}`); process.exit(1); }
console.log(`check-seo: ${pages.length + 1} pages, ${checked} links${external ? '' : ' on the site'}: share images, JSON-LD, twins and links pass`);
