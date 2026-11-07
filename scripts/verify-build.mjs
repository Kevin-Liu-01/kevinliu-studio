#!/usr/bin/env node
// The release guard: runs after every build and fails it when a page would ship incomplete or carry something it must
// not. Checks, per HTML page: a closed document, one h1, a title, a description, a canonical on the production host,
// a share image and loop that exist, JSON-LD that parses, and a Markdown twin. Site-wide: every local address a page
// references exists in dist (resolved against its <base>), the sitemap, robots.txt and llms files exist, no image
// carries GPS metadata, no image, video or audio file carries location metadata, no banned name or route appears, and
// every round file scripts/phone-memory.mjs patches carries its patches (a phone's tab stays under its memory limit).
import fs from 'node:fs';
import path from 'node:path';
import { MEDIA, hasLocation } from './location.mjs';
import { PHONE } from './phone-memory.mjs';

const DIST = path.resolve(process.argv[2] ?? 'dist');
const SITE = 'https://www.kevinliu.studio';
const errors = [];
const fail = (where, what) => errors.push(`${where}: ${what}`);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(DIST);
const rel = (f) => '/' + path.relative(DIST, f).split(path.sep).join('/');
const exists = (p) => {
  const clean = decodeURIComponent(p.split(/[?#]/)[0]);
  const f = path.join(DIST, clean);
  return fs.existsSync(f) && fs.statSync(f).isFile() || fs.existsSync(f + '.html') || fs.existsSync(path.join(f, 'index.html'));
};

// a phone's memory: every file scripts/phone-memory.mjs patches ships patched (a sync that dropped them, or a hand copy)
for (const dest of Object.keys(PHONE)) {
  const f = path.join(DIST, dest.replace(/^public\//, ''));
  if (!fs.existsSync(f) || !fs.readFileSync(f, 'utf8').includes('kevinliu.studio phone memory')) fail('/' + dest.replace(/^public\//, ''), 'lacks the phone memory patches (scripts/phone-memory.mjs)');
}

// Astro publishes any .md under src/pages; agent-docs scaffold writes a SKILL.md there (AGENTS.md)
if (fs.existsSync(path.join(DIST, '..', 'src/pages/SKILL.md'))) fail('src/pages/SKILL.md', 'Astro publishes this as a page; the routes skill is src/SKILL.md');

for (const need of ['/index.html', '/about.html', '/battle.html', '/battle/arena.html', '/404.html', '/robots.txt', '/llms.txt', '/llms-full.txt', '/index.md', '/sitemap-index.xml', '/favicon.ico', '/site.webmanifest']) {
  if (!exists(need)) fail(need, 'missing');
}

const GT = /general\s?translation|generaltranslation/i;
const GT_PAGES = new Set(['/index.html', '/404.html', '/about.html', '/cards/atlas.html', '/index.md', '/about.md', '/cards/atlas.md', '/llms.txt', '/llms-full.txt', '/ex/fighters.js', '/ex/media.gen.js']);
const BANNED = [[/pok[eé]\s?(mon|ball)|nintendo|game\s?freak/i, 'franchise name'], [/\/api\/(submissions|emails)\b/, 'OMMC participant route'], [/xi-api-key|\bsk_[a-f0-9]{40,}\b/i, 'key shape']];

const htmls = files.filter((f) => f.endsWith('.html'));
for (const f of htmls) {
  const page = rel(f);
  const html = fs.readFileSync(f, 'utf8');
  if (!/<\/html>\s*$/.test(html)) fail(page, 'document not closed');
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) fail(page, `${h1} h1 elements`);
  if (!/<title>[^<]{3,}<\/title>/.test(html)) fail(page, 'no title');
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (desc.length < 50 || desc.length > 170) fail(page, `description is ${desc.length} characters`);
  const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (page === '/404.html') { if (canon || !/<meta name="robots" content="noindex/.test(html)) fail(page, 'the 404 page must be noindex without a canonical'); }
  else if (!canon?.startsWith(SITE)) fail(page, `canonical ${canon}`);
  for (const k of ['og:image', 'og:video']) {
    const u = html.match(new RegExp(`<meta property="${k}" content="([^"]+)"`))?.[1];
    if (!u?.startsWith(SITE) || !exists(u.slice(SITE.length))) fail(page, `${k} ${u} does not exist in dist`);
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { fail(page, `JSON-LD does not parse: ${e.message}`); }
  }
  // the face is one cached file, preloaded first; never inlined into a page again (docs/architecture.md, Fonts)
  if (/font\/woff2;base64/.test(html)) fail(page, 'a font is inlined as base64');
  // each stylesheet and deferred script a page names under /ex/ carries its content address (vercel.json caches it)
  for (const m of html.matchAll(/\s(?:href|src)="(\/ex\/[^"]+\.(?:css|js))"/g)) fail(page, `${m[1]} has no ?v= content address`);
  const twin = html.match(/<link rel="alternate" type="text\/markdown" href="([^"]+)"/)?.[1];
  if (page !== '/404.html' && (!twin || !exists(twin))) fail(page, `Markdown twin ${twin} missing`);
  // every local reference, resolved the way the browser will
  // a link to a bare fragment is safe only without <base>: with one, "#x" goes to the base folder, not this page
  // (SVG <use href="#icon"> stays in the document, so only <a> is checked)
  if (/<base href=/.test(html)) for (const m of html.matchAll(/<a\b[^>]*\shref="(#[^"]*)"/g)) fail(page, `link ${m[1]} resolves against <base>`);
  const base = html.match(/<base href="([^"]+)"/)?.[1] ?? page.replace(/[^/]*$/, '');
  for (const m of html.replace(/<base [^>]*>/, '').matchAll(/\s(?:src|href|poster)="([^"]+)"|url\(["']?([^"')]+)["']?\)/g)) {
    const u = m[1] ?? m[2];
    // %23 is an encoded fragment inside an inline SVG data URI (a filter or gradient id), not a file
    if (!u || /^(https?:|mailto:|data:|#|%23|javascript:|blob:)/.test(u) || u.includes('${')) continue;
    const abs = new URL(u, `https://x${base}`).pathname;
    if (!exists(abs)) fail(page, `broken reference ${u} (resolves to ${abs})`);
  }
  for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u && !/^(https?:|data:)/.test(u) && !exists(new URL(u, `https://x${base}`).pathname)) fail(page, `broken srcset ${u}`);
    }
  }
}

for (const f of files) {
  const p = rel(f);
  if (/\.(html|md|txt|js|css|json|svg|xml)$/.test(f)) {
    const t = fs.readFileSync(f, 'utf8');
    for (const [re, why] of BANNED) if (re.test(t)) fail(p, why);
    if (GT.test(t) && !GT_PAGES.has(p) && !/\/atlas[./]/.test(p)) fail(p, 'General Translation outside the Atlas card');
  } else if (MEDIA.test(f)) {
    const where = hasLocation(fs.readFileSync(f));
    if (where) fail(p, where);
  }
}

const sitemap = files.filter((f) => /sitemap-\d+\.xml$/.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('');
const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (listed.length < 30) fail('sitemap', `${listed.length} URLs`);
for (const u of listed) if (/\/404$|\/$(?<!studio\/)/.test(u)) fail('sitemap', `lists ${u}`);

if (errors.length) {
  console.error(`verify-build: ${errors.length} problem(s)`);
  for (const e of errors.slice(0, 60)) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`verify-build: ${htmls.length} pages, ${listed.length} sitemap URLs, ${files.length} files: all checks pass`);
