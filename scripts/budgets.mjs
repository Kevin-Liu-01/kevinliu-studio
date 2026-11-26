#!/usr/bin/env node
// Byte budgets for what each built page asks for (scripts/budgets.json), checked by the release guard so a change that
// makes a page heavier fails the build instead of a later measurement. Per page, brotli at quality 5 (about the level
// Vercel compresses at on the fly): the HTML; its render-blocking stylesheets (every <link rel="stylesheet"> in the
// HTML); and its scripts (every <script src> and <link rel="modulepreload">, deferred or not). The battle's mode sheet
// and the files the rounds' own scripts load later are not counted. A page's kind is the first rule in budgets.json
// whose pattern matches its path; a page that matches none has no budget.
//   node scripts/budgets.mjs [dist]   prints each kind's largest page against its budget (verify-build.mjs imports check)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const BUDGETS = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'budgets.json'), 'utf8'));
const sizes = new Map();
const br = (f) => sizes.get(f) ?? sizes.set(f, zlib.brotliCompressSync(fs.readFileSync(f), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }).length).get(f);

/** Each budgeted page's bytes: { page, kind, html, css, js } in bytes, and the files it names. */
export function measure(dist) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []));
  const out = [];
  for (const file of walk(dist)) {
    const page = '/' + path.relative(dist, file).split(path.sep).join('/');
    const rule = BUDGETS.pages.find((r) => new RegExp(r.match).test(page));
    if (!rule) continue;
    const html = fs.readFileSync(file, 'utf8');
    const base = html.match(/<base href="([^"]+)"/)?.[1] ?? page;
    const local = (u) => { if (/^(https?:|data:|\/\/)/.test(u)) return null; const p = new URL(u, `https://x${base}`).pathname; const f = path.join(dist, decodeURIComponent(p)); return fs.existsSync(f) && fs.statSync(f).isFile() ? f : null; };
    const css = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/g)].map((m) => local(m[1])).filter(Boolean);
    const js = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g), ...html.matchAll(/<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"/g)].map((m) => local(m[1])).filter(Boolean);
    const sum = (fs_) => [...new Set(fs_)].reduce((a, f) => a + br(f), 0);
    out.push({ page, kind: rule.kind, html: br(file), css: sum(css), js: sum(js) });
  }
  return out;
}

/** The pages over their kind's budget, as guard messages. */
export function check(dist) {
  const problems = [];
  for (const m of measure(dist)) {
    const b = BUDGETS.pages.find((r) => r.kind === m.kind);
    for (const k of ['html', 'css', 'js']) if (b[k] !== undefined && m[k] > b[k] * 1024) problems.push([m.page, `${k} is ${(m[k] / 1024).toFixed(1)} KB on the wire, over the ${m.kind} budget of ${b[k]} KB (scripts/budgets.json)`]);
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = path.resolve(process.argv[2] ?? 'dist');
  const worst = {};
  for (const m of measure(dist)) for (const k of ['html', 'css', 'js']) if (!worst[m.kind]?.[k] || m[k] > worst[m.kind][k][0]) (worst[m.kind] ??= {})[k] = [m[k], m.page];
  for (const r of BUDGETS.pages) {
    const w = worst[r.kind];
    if (!w) continue;
    console.log(r.kind.padEnd(8), ['html', 'css', 'js'].map((k) => `${k} ${(w[k][0] / 1024).toFixed(1)}/${r[k] ?? '-'} KB (${w[k][1]})`).join('  '));
  }
  const p = check(dist);
  for (const [page, why] of p) console.error(`${page}: ${why}`);
  process.exit(p.length ? 1 : 0);
}
