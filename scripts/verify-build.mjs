#!/usr/bin/env node
// The release guard: runs after every build and fails it when a page would ship incomplete or carry something it must
// not. Checks, per HTML page: a closed document, one h1, a title, a description, a canonical on the production host,
// a 1200 x 630 JPEG share image with alt text (and its loop where one is named) that exist, JSON-LD that parses into
// one @graph whose references resolve and that claims no ratings, reviews, offers or FAQ, and a Markdown twin. Site-wide: every local address a page
// references exists in dist (resolved against its <base>), the sitemap, robots.txt and llms files exist, no image
// carries GPS metadata, no image, video or audio file carries location metadata, no banned name or route appears, and
// every round file scripts/phone-memory.mjs patches carries its patches (a phone's tab stays under its memory limit).
// A face under /fonts is named with ?v=, and that token, like a /ex/borders or /ex/fx drawing's, is the file's own sha-256
// (they are kept for a year).
// Each llms.txt keeps the llms.txt shape: an H1, a summary, and ## sections that are lists of links.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { scanBuffer } from './rules.mjs';
import { PHONE } from './phone-memory.mjs';
import { check as budgets } from './budgets.mjs';
import { jpegSize, shareTagProblems, PAGES_MIN } from './lib/checks.mjs';
import { LOCALES, OTHER } from '../src/i18n/locales.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.resolve(process.argv[2] ?? path.join(ROOT, 'dist'));
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
// sha-256 of a dist file, read once
const hashes = new Map();
const sha256 = (f) => hashes.get(f) ?? hashes.set(f, createHash('sha256').update(fs.readFileSync(f)).digest('hex')).get(f);

// a phone's memory: every file scripts/phone-memory.mjs patches ships patched (a sync that dropped them, or a hand copy)
for (const dest of Object.keys(PHONE)) {
  const f = path.join(DIST, dest.replace(/^public\//, ''));
  if (!fs.existsSync(f) || !fs.readFileSync(f, 'utf8').includes('kevinliu.studio phone memory')) fail('/' + dest.replace(/^public\//, ''), 'lacks the phone memory patches (scripts/phone-memory.mjs)');
}

// Astro publishes any .md under src/pages as a page (agent-docs scaffold writes a SKILL.md there; AGENTS.md)
for (const f of walk(path.join(ROOT, 'src/pages')).filter((f) => f.endsWith('.md'))) fail(path.relative(ROOT, f), 'Astro publishes a .md under src/pages as a page; the routes skill is src/SKILL.md');

for (const need of ['/index.html', '/cards.html', '/cards.md', '/share/about.jpg', '/share/cards.jpg', '/share/battle.jpg', '/share/arena.jpg', '/share/404.jpg', '/about.html', '/battle.html', '/battle/arena.html', '/404.html', '/robots.txt', '/llms.txt', '/llms-full.txt', '/index.md', '/sitemap-index.xml', '/favicon.ico', '/site.webmanifest']) {
  if (!exists(need)) fail(need, 'missing');
}
// every page and text file in every language (src/i18n/locales.mjs)
for (const c of OTHER) for (const need of [`/${c}.html`, `/${c}/index.md`, `/${c}/cards.html`, `/${c}/cards.md`, `/${c}/about.html`, `/${c}/about.md`, `/${c}/battle.html`, `/${c}/battle.md`, `/${c}/battle/arena.html`, `/${c}/battle/arena.md`, `/${c}/404.html`, `/${c}/llms.txt`, `/${c}/llms-full.txt`, `/${c}/gallery.js`, `/${c}/battle-strings.js`, `/${c}/cards/atlas.html`, `/${c}/cards/atlas.md`]) {
  if (!exists(need)) fail(need, 'missing');
}
// llms.txt follows its convention (llmstxt.org): an H1, a blockquote summary, free text, then `##` sections that hold
// only lists of links, so a reader that takes each section as a link list (llms_txt2ctx) loses nothing
for (const c of ['', ...OTHER]) {
  const name = `${c && `/${c}`}/llms.txt`, f = path.join(DIST, name);
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  if (!/^# \S/.test(lines[0])) fail(name, 'line 1 is not an H1');
  if (!lines.some((l) => l.startsWith('> '))) fail(name, 'no blockquote summary');
  let h2 = null;
  lines.forEach((l, i) => {
    if (/^## /.test(l)) { h2 = l; return; }
    if (i > 0 && /^#/.test(l)) fail(name, `line ${i + 1} is a heading that is not an H2: ${l}`);
    if (h2 && l.trim() && !/^- \[[^\]]+\]\([^)\s]+\)(: .+)?$/.test(l)) fail(name, `line ${i + 1} under "${h2}" is not a link item: ${l.slice(0, 70)}`);
  });
  if (!h2) fail(name, 'no ## section');
}
const is404 = (page) => page === '/404.html' || new RegExp(`^/(${OTHER.join('|')})/404\\.html$`).test(page);
// a language's pages, by their prefix
const langOf = (page) => OTHER.find((c) => page === `/${c}.html` || page.startsWith(`/${c}/`)) ?? 'en';
// the characters each face holds (scripts/i18n-fonts.py): a translated page prints only what its faces hold
const FACES = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/fonts.json'), 'utf8'));
const held = (code, base) => new Set(Object.values(FACES).filter((f) => f.base === base || (f.locales.length && (f.locales.length > 1 || f.locales.includes(code)))).flatMap((f) => [...f.chars]));



// one @graph: every node typed, every {"@id"} reference names a node in it (or a repository's own #code node), every
// url absolute, and none of the markup this site must never claim
const NEVER = new Set(['AggregateRating', 'Review', 'Rating', 'Offer', 'FAQPage', 'Question', 'Answer', 'HowTo']);
function checkGraph(ld, page) {
  const out = [];
  if (ld['@context'] !== 'https://schema.org' || !Array.isArray(ld['@graph'])) return ['not one @graph with the schema.org context'];
  const ids = new Set(ld['@graph'].map((n) => n['@id']).filter(Boolean));
  const has = (t) => ld['@graph'].some((n) => n['@type'] === t);
  for (const t of ['WebSite', 'Person']) if (!has(t)) out.push(`no ${t} node`);
  if (!/404\.html$/.test(page) && !ld['@graph'].some((n) => /Page$/.test(n['@type'] ?? ''))) out.push('no page node');
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
  // a CJK sentence says in about half the characters what a Latin one does
  const cjk = /^(ja|ko|zh)$/.test(langOf(page));
  if (desc.length < (cjk ? 25 : 50) || desc.length > 170) fail(page, `description is ${desc.length} characters`);
  const code = langOf(page), want = LOCALES.find((l) => l.code === code).lang;
  if (html.match(/<html lang="([^"]+)"/)?.[1] !== want) fail(page, `html lang is not ${want}`);
  const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  // the same page in every language, each one existing, and English as x-default
  if (!is404(page)) {
    const alts = Object.fromEntries([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]));
    for (const l of [...LOCALES.map((x) => x.lang), 'x-default']) {
      const u = alts[l];
      if (!u?.startsWith(SITE)) { fail(page, `no hreflang ${l}`); continue; }
      if (!exists(u.slice(SITE.length) || '/index.html')) fail(page, `hreflang ${l} ${u} does not exist in dist`);
    }
    if (canon && alts[want] !== canon) fail(page, `hreflang ${want} is not the canonical`);
  }
  // every character a translated page shows is held by one of its faces (the language list names each language in
  // the system face and is left out, as is /about's 𝕏, a span.sym in the system's symbol face)
  if (code !== 'en') {
    const shown = html.replace(/<(script|style|template)\b[\s\S]*?<\/\1>/g, '').replace(/<details class="lang[ "][\s\S]*?<\/details>/g, '').replace(/<span class="sym">[^<]*<\/span>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[#\w]+;/g, ' ');
    const have = held(code, /<base href="\/battle\//.test(html) ? 'battle' : 'site'), missing = new Set([...shown].filter((ch) => ch > '~' && !have.has(ch)));
    if (missing.size) fail(page, `prints ${[...missing].slice(0, 12).join('')} that no face holds (python3 scripts/i18n-fonts.py)`);
  }
  if (is404(page)) { if (canon || !/<meta name="robots" content="noindex/.test(html)) fail(page, 'the 404 page must be noindex without a canonical'); }
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
  for (const why of shareTagProblems(html)) fail(page, why);
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
  // a face under /fonts is kept for a year only when it is named with its ?v= content address (vercel.json); named
  // without it, it would be fetched again on every visit, and the face blocks text
  for (const m of html.matchAll(/(?<![\w.-])\/fonts\/[\w-]+\.woff2(?!\?v=[0-9a-f])/g)) fail(page, `${m[0]} is named without its ?v= content address`);
  const twin = html.match(/<link rel="alternate" type="text\/markdown" href="([^"]+)"/)?.[1];
  if (!is404(page) && (!twin || !exists(twin))) fail(page, `Markdown twin ${twin} missing`);
  // every local reference, resolved the way the browser will
  // a link to a bare fragment is safe only without <base>: with one, "#x" goes to the base folder, not this page
  // (SVG <use href="#icon"> stays in the document, so only <a> is checked)
  if (/<base href=/.test(html)) for (const m of html.matchAll(/<a\b[^>]*\shref="(#[^"]*)"/g)) fail(page, `link ${m[1]} resolves against <base>`);
  const base = html.match(/<base href="([^"]+)"/)?.[1] ?? page.replace(/[^/]*$/, '');
  for (const m of html.replace(/<base [^>]*>/, '').matchAll(/\s(?:src|href|poster|data-plainfx)="([^"]+)"|url\(["']?([^"')]+)["']?\)/g)) {
    const u = m[1] ?? m[2];
    // %23 is an encoded fragment inside an inline SVG data URI (a filter or gradient id), not a file
    if (!u || /^(https?:|mailto:|data:|#|%23|javascript:|blob:)/.test(u) || u.includes('${')) continue;
    const abs = new URL(u, `https://x${base}`).pathname;
    if (!exists(abs)) fail(page, `broken reference ${u} (resolves to ${abs})`);
    // a face under /fonts, and a frame or effect drawing under /ex/borders or /ex/fx, named with ?v= is kept for a
    // year (vercel.json), so the token must be the served file's own sha-256: a changed file then always gets a new address
    const v = /^\/fonts\/|^\/ex\/(?:borders|fx)\/.*\.svg$/.test(abs) ? /[?&]v=([0-9a-f]+)/.exec(u)?.[1] : null;
    if (v && exists(abs) && !sha256(path.join(DIST, abs)).startsWith(v)) fail(page, `${abs}?v=${v} is not the file's sha-256, and it is kept for a year`);
  }
  // every card prints plain with its framed print in a template right after it (frames on desktop only,
  // src/lib/cards.ts): the same card, in its family (design/card.js, data-fam), never the plain fallback markup.js prints
  // when the family modules are missing. A card printed in a style has that style's sheet (the sync's page closure)
  const cardTag = /<div class="card\b[^"]*"[^>]*\sdata-id="([\w-]+)"[^>]*>/g;
  const parts = html.split('<template class="framed">');
  for (let i = 1; i < parts.length; i++) {
    const end = parts[i].indexOf('</template>');
    const framed = parts[i].slice(0, end), before = parts[i - 1].slice(parts[i - 1].lastIndexOf('</template>') + 1);
    const plain = [...before.matchAll(cardTag)].at(-1), fr = [...framed.matchAll(cardTag)];
    if (!plain) { fail(page, 'a framed print with no plain card before it'); continue; }
    if (fr.length !== 1 || fr[0][1] !== plain[1]) { fail(page, `card ${plain[1]}: its template holds ${fr.map((m) => m[1]).join(', ') || 'no card'}`); continue; }
    if (!/\sdata-fam="/.test(fr[0][0])) fail(page, `card ${plain[1]} prints without its family (design/card.js)`);
    // what the framed print shares with the plain one it names by path (src/lib/cards.ts delta), never by a fresh copy
    if (!/<b data-same="[\d.]+"><\/b>/.test(framed)) fail(page, `card ${plain[1]}: its framed print repeats the plain print`);
  }
  const outside = html.replace(/<template class="framed">[\s\S]*?<\/template>/g, '');
  const printed = [...outside.matchAll(cardTag)].length;
  if (printed !== parts.length - 1) fail(page, `${printed} cards outside templates and ${parts.length - 1} framed prints`);
  if (/\sdata-card-style="breakout"/.test(html) && !/href="\/ex\/styles\/breakout\/breakout\.css\?v=/.test(html)) fail(page, 'a Breakout card without breakout.css');
  for (const m of html.matchAll(/\s(?:srcset|data-plainfxset)="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u && !/^(https?:|data:)/.test(u) && !exists(new URL(u, `https://x${base}`).pathname)) fail(page, `broken srcset ${u}`);
    }
  }
}

// the content rules (scripts/rules.mjs), on every built file and its path: the same scan the sync runs on the way in
for (const f of files) {
  const p = rel(f);
  for (const why of scanBuffer(p, fs.readFileSync(f))) fail(p, why);
}

const sitemap = files.filter((f) => /sitemap-\d+\.xml$/.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('');
const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (listed.length < PAGES_MIN * LOCALES.length) fail('sitemap', `${listed.length} URLs`);
for (const c of ['', ...OTHER.map((x) => `/${x}`)]) if (!listed.includes(`${SITE}${c}/cards`)) fail('sitemap', `does not list ${c}/cards`);
if ((sitemap.match(/<xhtml:link rel="alternate" hreflang=/g) ?? []).length < listed.length * LOCALES.length) fail('sitemap', 'a page lacks its alternates in every language');
// lastmod is left out where git history cannot date a page (astro.config.mjs), so only its shape is checked
for (const m of sitemap.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)) if (Number.isNaN(Date.parse(m[1])) || Date.parse(m[1]) > Date.now() + 864e5) fail('sitemap', `lastmod ${m[1]}`);
for (const u of listed) if (/\/404$|\/$(?<!studio\/)/.test(u)) fail('sitemap', `lists ${u}`);

// each page's bytes on the wire stay inside its kind's budget (scripts/budgets.json, docs/performance.md)
for (const [page, why] of budgets(DIST)) fail(page, why);

if (errors.length) {
  console.error(`verify-build: ${errors.length} problem(s)`);
  for (const e of errors.slice(0, 60)) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`verify-build: ${htmls.length} pages, ${listed.length} sitemap URLs, ${files.length} files: all checks pass`);
