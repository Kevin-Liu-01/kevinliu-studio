#!/usr/bin/env node
// A page's sitemap lastmod is the day what it prints last changed (Kevin, 2026-11-28; docs/adr/0003-lastmod-from-output.md).
// What a page prints is its built HTML without its scripts (but its JSON-LD), stylesheets, <link>s, comments and
// content addresses, plus the bytes of every picture it shows (img, source, video poster, og:image), so a refactor,
// a stylesheet or a script change dates no page, and a new card art or a reworded line does. lastmod.json (checked
// in) holds each page's fingerprint and date. This runs in `pnpm build` after the minifier: a page whose fingerprint
// differs from the ledger takes the date of HEAD's commit (now, in a tree with uncommitted changes), the ledger is
// rewritten, and every <lastmod> in the sitemap is written from it. Commit lastmod.json with the change that moved it.
//   node scripts/lastmod.mjs [dist]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const LEDGER = path.join(ROOT, 'lastmod.json');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

/** The local files a page's pictures come from, as paths under dist (resolved against its <base>). */
export function pictures(html) {
  const base = /<base href="([^"]*)"/.exec(html)?.[1] ?? '/';
  const refs = [];
  for (const m of html.matchAll(/<(?:img|source|video)\b[^>]*>/g)) {
    for (const a of m[0].matchAll(/\s(src|poster|srcset)="([^"]*)"/g)) refs.push(...(a[1] === 'srcset' ? a[2].split(',').map((s) => s.trim().split(/\s+/)[0]) : [a[2]]));
  }
  for (const m of html.matchAll(/<meta (?:property|name)="(?:og|twitter):image" content="([^"]*)"/g)) refs.push(m[1]);
  return [...new Set(refs.filter((r) => r && !r.startsWith('data:')).map((r) => {
    const u = new URL(r, new URL(base, 'https://x/'));
    return u.hostname === 'x' || u.hostname.endsWith('kevinliu.studio') ? decodeURIComponent(u.pathname) : null;
  }).filter(Boolean))].sort();
}

/** The text a page prints: no scripts but its JSON-LD, no styles, links, comments or ?v= content addresses. */
export function printed(html) {
  return html
    .replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<link\b[^>]*>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\?v=[0-9a-f]+/g, '')
    .replace(/\s+/g, ' ');
}

/** A page's fingerprint: what it prints and the bytes of its pictures (a missing file counts as missing). */
export function fingerprint(html, dist) {
  const h = crypto.createHash('sha256').update(printed(html));
  for (const p of pictures(html)) {
    let bytes = null;
    try { bytes = fs.readFileSync(path.join(dist, p)); } catch {}
    h.update(`\n${p} ${bytes ? sha(bytes) : 'missing'}`);
  }
  return h.digest('hex').slice(0, 16);
}

const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return ''; } };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = path.resolve(process.argv[2] ?? path.join(ROOT, 'dist'));
  const maps = fs.readdirSync(dist).filter((f) => /^sitemap-\d+\.xml$/.test(f)).map((f) => path.join(dist, f));
  const ledger = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : {};
  // the date a changed page takes: HEAD's commit in a clean tree (Vercel's), else now
  const dirty = git('status', '--porcelain', '--untracked-files=no', '--', '.', ':!lastmod.json') !== '';
  const today = (!dirty && git('log', '-1', '--format=%cI')) || new Date().toISOString();
  const now = new Date(today).toISOString();
  const next = {}, newest = {};
  let moved = 0;
  for (const file of maps) {
    let xml = fs.readFileSync(file, 'utf8');
    const name = path.basename(file);
    xml = xml.replace(/<url><loc>([^<]+)<\/loc>(?:<lastmod>[^<]*<\/lastmod>)?/g, (_, loc) => {
      const p = new URL(loc).pathname;
      const html = fs.readFileSync(path.join(dist, p === '/' ? 'index.html' : `${p.slice(1)}.html`), 'utf8');
      const hash = fingerprint(html, dist);
      const was = ledger[p];
      next[p] = was?.hash === hash ? was : { hash, date: now };
      if (next[p] !== was) moved++;
      if (!newest[name] || next[p].date > newest[name]) newest[name] = next[p].date;
      return `<url><loc>${loc}</loc><lastmod>${next[p].date}</lastmod>`;
    });
    fs.writeFileSync(file, xml);
  }
  // the index dates each sitemap by its newest page
  const index = path.join(dist, 'sitemap-index.xml');
  if (fs.existsSync(index)) fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace(/<sitemap><loc>([^<]+)<\/loc>(?:<lastmod>[^<]*<\/lastmod>)?/g, (all, loc) => {
    const d = newest[loc.split('/').pop()];
    return d ? `<sitemap><loc>${loc}</loc><lastmod>${d}</lastmod>` : all;
  }));
  const sorted = Object.fromEntries(Object.keys(next).sort().map((k) => [k, next[k]]));
  const text = `${JSON.stringify(sorted, null, 1)}\n`;
  if (!fs.existsSync(LEDGER) || fs.readFileSync(LEDGER, 'utf8') !== text) fs.writeFileSync(LEDGER, text);
  console.log(`lastmod: ${Object.keys(next).length} pages, ${moved} changed since lastmod.json${moved ? ` (dated ${now}; commit lastmod.json)` : ''}`);
}
