#!/usr/bin/env node
// The release guard: runs after every build and fails it when a page would ship incomplete or carry something it must
// not. Checks, per HTML page: a closed document, one h1, a title, a description, a canonical on the production host,
// a 1200 x 630 JPEG share image with alt text (and its loop where one is named) that exist, JSON-LD that parses into
// one @graph whose references resolve and that claims no ratings, reviews, offers or FAQ, and a Markdown twin. Site-wide: every local address a page
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

for (const need of ['/index.html', '/cards.html', '/cards.md', '/share/about.jpg', '/share/cards.jpg', '/share/battle.jpg', '/share/arena.jpg', '/share/404.jpg', '/about.html', '/battle.html', '/battle/arena.html', '/404.html', '/robots.txt', '/llms.txt', '/llms-full.txt', '/index.md', '/sitemap-index.xml', '/favicon.ico', '/site.webmanifest']) {
  if (!exists(need)) fail(need, 'missing');
}

const GT = /general\s?translation|generaltranslation/i;
// the wall and the cards index print every card, Atlas's line among them
const GT_PAGES = new Set(['/index.html', '/cards.html', '/cards.md', '/404.html', '/about.html', '/cards/atlas.html', '/index.md', '/about.md', '/cards/atlas.md', '/llms.txt', '/llms-full.txt', '/ex/fighters.js', '/ex/media.gen.js']);
const BANNED = [[/pok[eé]\s?(mon|ball)|nintendo|game\s?freak/i, 'franchise name'], [/\/api\/(submissions|emails)\b/, 'OMMC participant route'], [/xi-api-key|\bsk_[a-f0-9]{40,}\b/i, 'key shape']];

// width and height from a JPEG's start-of-frame marker
function jpegSize(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return null;
}

// one @graph: every node typed, every {"@id"} reference names a node in it (or a repository's own #code node), every
// url absolute, and none of the markup this site must never claim
const NEVER = new Set(['AggregateRating', 'Review', 'Rating', 'Offer', 'FAQPage', 'Question', 'Answer', 'HowTo']);
function checkGraph(ld, page) {
  const out = [];
  if (ld['@context'] !== 'https://schema.org' || !Array.isArray(ld['@graph'])) return ['not one @graph with the schema.org context'];
  const ids = new Set(ld['@graph'].map((n) => n['@id']).filter(Boolean));
  const has = (t) => ld['@graph'].some((n) => n['@type'] === t);
  for (const t of ['WebSite', 'Person']) if (!has(t)) out.push(`no ${t} node`);
  if (page !== '/404.html' && !ld['@graph'].some((n) => /Page$/.test(n['@type'] ?? ''))) out.push('no page node');
  const walk = (v, at) => {
    if (Array.isArray(v)) return v.forEach((x) => walk(x, at));
    if (!v || typeof v !== 'object') return;
    if (v['@type'] && NEVER.has(v['@type'])) out.push(`${at} claims ${v['@type']}`);
    for (const k of ['aggregateRating', 'review', 'offers']) if (k in v) out.push(`${at} has ${k}`);
    const keys = Object.keys(v);
    if (keys.length === 1 && keys[0] === '@id' && !ids.has(v['@id'])) out.push(`${at} refers to ${v['@id']}, not in the graph`);
    for (const k of ['url', 'item', 'image', 'codeRepository']) if (typeof v[k] === 'string' && !/^https:\/\//.test(v[k])) out.push(`${at}.${k} is not an absolute https URL: ${v[k]}`);
    for (const [k, x] of Object.entries(v)) if (k !== '@id') walk(x, `${at}.${k}`);
  };
  ld['@graph'].forEach((n, i) => { if (!n['@type']) out.push(`node ${i} has no @type`); walk(n, n['@type'] ?? i); });
  return out;
}

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
  const meta = (k) => html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]*)"`))?.[1];
  for (const k of ['og:image', 'og:video']) {
    const u = meta(k);
    if (!u && k === 'og:video') continue; // only the rounds' share images have a loop
    if (!u?.startsWith(SITE) || !exists(u.slice(SITE.length))) { fail(page, `${k} ${u} does not exist in dist`); continue; }
    if (k === 'og:image') {
      const b = fs.readFileSync(path.join(DIST, u.slice(SITE.length)));
      const size = jpegSize(b);
      if (!size || size[0] !== 1200 || size[1] !== 630) fail(page, `og:image ${u} is ${size ? size.join(' x ') : 'not a JPEG'}, not 1200 x 630`);
    }
  }
  if (meta('twitter:card') !== 'summary_large_image') fail(page, 'twitter:card is not summary_large_image');
  if (meta('twitter:image') !== meta('og:image')) fail(page, 'twitter:image differs from og:image');
  for (const k of ['og:image:alt', 'twitter:image:alt', 'og:title', 'og:description']) if (!meta(k)?.trim()) fail(page, `no ${k}`);
  const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (lds.length !== 1) fail(page, `${lds.length} JSON-LD blocks, expected one @graph`);
  for (const m of lds) {
    let ld;
    try { ld = JSON.parse(m[1]); } catch (e) { fail(page, `JSON-LD does not parse: ${e.message}`); continue; }
    for (const why of checkGraph(ld, page)) fail(page, `JSON-LD: ${why}`);
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
if (listed.length < 31) fail('sitemap', `${listed.length} URLs`);
if (!listed.includes(`${SITE}/cards`)) fail('sitemap', 'does not list /cards');
// lastmod is left out where git history cannot date a page (astro.config.mjs), so only its shape is checked
for (const m of sitemap.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)) if (Number.isNaN(Date.parse(m[1])) || Date.parse(m[1]) > Date.now() + 864e5) fail('sitemap', `lastmod ${m[1]}`);
for (const u of listed) if (/\/404$|\/$(?<!studio\/)/.test(u)) fail('sitemap', `lists ${u}`);

if (errors.length) {
  console.error(`verify-build: ${errors.length} problem(s)`);
  for (const e of errors.slice(0, 60)) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`verify-build: ${htmls.length} pages, ${listed.length} sitemap URLs, ${files.length} files: all checks pass`);
