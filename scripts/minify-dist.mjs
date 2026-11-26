#!/usr/bin/env node
// Minifies the round code in the built site. public/ keeps the rounds' bytes as sync.lock.json records them, comments
// and all; Astro copies them to dist/ verbatim, so every visitor downloaded the comments too. This rewrites each
// stylesheet and script under dist/ (not dist/_astro, which Vite has already minified) with whitespace and syntax
// minified and names kept: no identifier is renamed, nothing is removed as unused, no syntax is lowered, and a module
// stays a module. A file is written only when it gets smaller (kit.js and the generated tables already are).
// On the wire (brotli 5, about Vercel's level): the round scripts 953 -> 755 KB, the round stylesheets 103 -> 57 KB;
// render-blocking CSS on the wall 57 -> 26 KB (docs/performance.md, 2026-11-26). scripts/minify-dist.test.mjs holds
// the contract.
//   node scripts/minify-dist.mjs [dist]   runs in `pnpm build`, after astro build and before the guard
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const JS = { loader: 'js', minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false, treeShaking: false, target: 'esnext', charset: 'utf8', legalComments: 'inline' };
const CSS = { loader: 'css', minifyWhitespace: true, charset: 'utf8', legalComments: 'inline' };
const PHONE_MARK = 'kevinliu.studio phone memory';

/** One file's text, minified; `kind` is 'js' or 'css'. Throws when the text does not parse. */
export function minify(src, kind) {
  let out = transformSync(src, kind === 'css' ? CSS : JS).code;
  // the guard finds the phone memory patches (scripts/phone-memory.mjs) by their comment, which minifying drops; the
  // patched code itself is kept, so the marker goes back on the end
  if (src.includes(PHONE_MARK)) out += `/* ${PHONE_MARK} */\n`;
  return out;
}

function run(dist) {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return p === path.join(dist, '_astro') ? [] : walk(p);
    return /\.(m?js|css)$/.test(e.name) ? [p] : [];
  });
  let before = 0, after = 0, written = 0;
  const failed = [];
  for (const file of walk(dist)) {
    const src = fs.readFileSync(file, 'utf8');
    let out;
    try { out = minify(src, file.endsWith('.css') ? 'css' : 'js'); }
    catch (e) { failed.push(`${path.relative(dist, file)}: ${e.message.split('\n')[0]}`); continue; }
    const a = Buffer.byteLength(src), b = Buffer.byteLength(out);
    before += a;
    if (b < a) { fs.writeFileSync(file, out); after += b; written++; } else after += a;
  }
  if (failed.length) { console.error(`minify-dist: ${failed.length} file(s) did not parse:\n  ${failed.join('\n  ')}`); process.exit(1); }
  console.log(`minify-dist: ${written} files minified, ${(before / 1048576).toFixed(2)} -> ${(after / 1048576).toFixed(2)} MB before compression`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) run(path.resolve(process.argv[2] ?? 'dist'));
