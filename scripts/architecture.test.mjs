// The architecture's single sources, enforced (docs/entropy.md, docs/adr/0001-one-build-gate.md). Each rule names the
// one place a concept lives; a second definition anywhere in src/ or scripts/ fails the build.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const SOURCES = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'scripts')), path.join(ROOT, 'astro.config.mjs')]
  .filter((f) => /\.(m?js|ts|astro)$/.test(f) && !f.endsWith('.test.mjs'))
  .map((f) => ({ rel: path.relative(ROOT, f), text: fs.readFileSync(f, 'utf8') }));
// the files that hold `needle` outside comments' leading `//` lines
const holders = (needle) => SOURCES.filter((s) => s.text.split('\n').some((l) => !/^\s*(\/\/|\*)/.test(l) && (typeof needle === 'string' ? l.includes(needle) : needle.test(l)))).map((s) => s.rel);

test("the site's origin is written once, in src/lib/site.ts", () => {
  assert.deepEqual(holders("'https://www.kevinliu.studio'"), ['src/lib/site.ts']);
});

test('the ?v= content address is computed once, in src/lib/assets.ts contentHash', () => {
  assert.deepEqual(holders(/digest\('hex'\)\.slice\(0, ?10\)/), ['src/lib/assets.ts']);
});

test('the language list is written once, in src/i18n/locales.mjs (vercel.json is checked by negotiation.test.mjs)', () => {
  assert.deepEqual(holders(/\b(?:es\|fr|fr\|de|ja\|ko)\b/), []);
});

test("English has no word branch of its own: twins.ts reads Kevin's words through L(code), not from site.ts", () => {
  const twins = SOURCES.find((s) => s.rel === 'src/lib/twins.ts').text;
  const fromSite = /import \{([^}]*)\} from '\.\/site'/.exec(twins)[1].split(',').map((x) => x.trim());
  for (const word of ['BIO', 'ABOUT', 'FACTS', 'QA', 'DESCRIPTION']) assert.ok(!fromSite.includes(word), `twins.ts imports ${word} from site.ts`);
});

test('src/lib and src/i18n import each other without a cycle', () => {
  const mods = SOURCES.filter((s) => /^src\/(lib|i18n)\/[^/]+\.(ts|mjs)$/.test(s.rel));
  const id = (rel) => rel.replace(/\.(ts|mjs)$/, '').replace(/\/index$/, '');
  const graph = new Map(mods.map((m) => [id(m.rel), [...m.text.matchAll(/^import[^'"]*['"](\.{1,2}\/[^'"]+)['"]/gm)].map((x) => id(path.join(path.dirname(m.rel), x[1]).replace(/\.(json|ts|mjs)(\?raw)?$/, ''))).filter((d) => d !== id(m.rel))]));
  const state = new Map();
  const visit = (n, trail) => {
    if (state.get(n) === 'done' || !graph.has(n)) return;
    assert.notEqual(state.get(n), 'open', `import cycle: ${[...trail, n].join(' -> ')}`);
    state.set(n, 'open');
    for (const d of graph.get(n)) visit(d, [...trail, n]);
    state.set(n, 'done');
  };
  for (const n of graph.keys()) visit(n, []);
  assert.ok(graph.size >= 15, `read ${graph.size} modules`);
});
