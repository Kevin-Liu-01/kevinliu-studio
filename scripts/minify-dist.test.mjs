// The build's minifier (scripts/minify-dist.mjs) only shortens: it renames nothing, removes nothing as unused, lowers
// no syntax and keeps a module a module, so round code runs the same minified as the rounds wrote it.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { minify } from './minify-dist.mjs';

test('a classic script keeps its globals, names and unused code', () => {
  const src = `// a comment\nconst FIGHTERS = [{ id: 'a' }];\nvar unused = 2;\nfunction card(f) { return f.id + 'é'; }\n(function () { 'use strict'; globalThis.got = card(FIGHTERS[0]) + card.name; })();\n`;
  const out = minify(src, 'js');
  assert.ok(out.length < src.length);
  assert.ok(!out.includes('a comment'));
  for (const name of ['FIGHTERS', 'unused', 'function card', 'use strict', 'é']) assert.ok(out.includes(name), name);
  const ctx = vm.createContext({});
  vm.runInContext(out, ctx);
  assert.equal(ctx.got, 'aécard');
});

test('a module stays a module, import.meta and all', () => {
  const out = minify(`import { a } from './a.js';\nexport const b = a + 1;\nconst url = new URL('../x/', import.meta.url);\nexport default class Board { prepare() { return url; } }\n`, 'js');
  assert.match(out, /^import\{a\}from"\.\/a\.js";/);
  for (const s of ['export const b', 'import.meta.url', 'class Board', 'prepare()']) assert.ok(out.includes(s), s);
});

test('newer syntax is not lowered', () => {
  const out = minify('const x = a?.b ?? c; class K { #p = 1; static { K.n = 1; } }\n', 'js');
  for (const s of ['?.', '??', '#p', 'static{']) assert.ok(out.includes(s), s);
});

test('the phone memory marker survives', () => {
  const out = minify('let x = 1; // kevinliu.studio phone memory: a patch\n', 'js');
  assert.ok(out.includes('kevinliu.studio phone memory'));
});

test('a stylesheet loses only whitespace and comments', () => {
  const out = minify('/* the card */\n.card {\n  --card: calc(100% - 2px);\n  grid-template-areas: "a b" "c d";\n}\n', 'css');
  assert.equal(out, '.card{--card: calc(100% - 2px);grid-template-areas:"a b" "c d"}\n');
});

test('text that does not parse fails loudly', () => {
  assert.throws(() => minify('const = ;', 'js'));
});
