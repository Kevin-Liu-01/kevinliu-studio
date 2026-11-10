// vercel.json's cache rules, read without a deployment: a file is kept for a year only when its address holds its
// content (docs/performance.md, Content addresses). Each address below must meet exactly one cache rule, so the
// answer never depends on the order of the routes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const { routes } = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../vercel.json'), 'utf8'));
const YEAR = 'public, max-age=31536000, immutable', DAY = 'public, max-age=86400, stale-while-revalidate=604800';
const isV = (c) => c.type === 'query' && c.key === 'v';
// every Cache-Control a request for `p` meets, with or without ?v=
function cache(p, v) {
  return routes.filter((r) => {
    if (!r.continue || !r.headers?.['Cache-Control'] || !new RegExp(r.src).test(p)) return false;
    for (const c of [...(r.has ?? []), ...(r.missing ?? [])]) assert.ok(isV(c), `${r.src}: this test only reads conditions on the query key v`);
    return (r.has ?? []).every(() => v) && (r.missing ?? []).every(() => !v);
  }).map((r) => r.headers['Cache-Control']);
}

test('a year only for an address that holds its content', () => {
  const cases = [
    ['/_astro/Base.Jy14gAa_.css', false, YEAR],
    ['/fonts/katagami-sans-site.woff2', true, YEAR],
    ['/fonts/katagami-mono-site.woff2', true, YEAR],
    ['/fonts/katagami-cjk-ja.woff2', true, YEAR],
    ['/ex/ui.css', true, YEAR],
    ['/battle/shared/battle.js', true, YEAR],
    ['/es/gallery.js', true, YEAR],
    ['/ex/fx/turboslide/fx.svg', true, YEAR],
    ['/ex/borders/turboslide/frames/dir-a/border.svg', true, YEAR],
    ['/ex/fx/turboslide/fx.svg', false, DAY],
    ['/ex/borders/turboslide/frames/dir-a/border.svg', false, DAY],
    // a design drawing's ?v= is another file's hash, so it never gets the year
    ['/ex/design/lit/katagami.svg', true, DAY],
    ['/ex/design/lit/katagami.svg', false, DAY],
    ['/ex/posters/elo.webp', false, DAY],
    ['/ex/fx/turboslide/fx.webp', true, DAY],
    ['/og/home.jpg', false, DAY],
    ['/battle/vendor/fonts/katagami-sans-battle.woff2', false, DAY],
    ['/sound/out/card.flip.webm', false, DAY],
  ];
  for (const [p, v, want] of cases) assert.deepEqual(cache(p, v), [want], `${p}${v ? '?v=…' : ''}`);
});
test('a face, stylesheet or script asked for without its content address is not kept', () => {
  for (const p of ['/fonts/katagami-sans-site.woff2', '/fonts/katagami-mono-site.woff2', '/ex/ui.css', '/battle/shared/battle.js', '/es/gallery.js']) assert.deepEqual(cache(p, false), [], p);
  for (const p of ['/', '/about', '/cards/elo', '/about.md', '/llms.txt', '/sitemap-index.xml']) assert.deepEqual(cache(p, false), [], p);
});
