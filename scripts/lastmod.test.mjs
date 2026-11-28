// scripts/lastmod.mjs: a page's fingerprint moves with what it prints and its pictures' bytes, never with its scripts,
// stylesheets, links or content addresses.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fingerprint, pictures } from './lastmod.mjs';

const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'lastmod-'));
fs.mkdirSync(path.join(dist, 'ex/posters'), { recursive: true });
fs.mkdirSync(path.join(dist, 'og'), { recursive: true });
fs.writeFileSync(path.join(dist, 'ex/posters/a.webp'), 'art 1');
fs.writeFileSync(path.join(dist, 'og/a.jpg'), 'share 1');
const page = ({ text = 'Atlas', script = 'x()', css = '/_astro/Base.A.css', v = 'aaaaaaaaaa' } = {}) =>
  `<html><head><base href="/ex/"><link rel="stylesheet" href="${css}"><style>.a{}</style><script>${script}</script><script type="application/ld+json">{"name":"${text}"}</script><meta property="og:image" content="https://www.kevinliu.studio/og/a.jpg"></head><body><!-- c --><img src="posters/a.webp"><a href="ui.css?v=${v}">${text}</a></body></html>`;

test('scripts, stylesheets, links, comments and content addresses date no page', () => {
  const a = fingerprint(page(), dist);
  assert.equal(fingerprint(page({ script: 'y()' }), dist), a);
  assert.equal(fingerprint(page({ css: '/_astro/Base.B.css' }), dist), a);
  assert.equal(fingerprint(page({ v: 'bbbbbbbbbb' }), dist), a);
});

test('a changed line, JSON-LD or picture dates the page', () => {
  const a = fingerprint(page(), dist);
  assert.notEqual(fingerprint(page({ text: 'Atlas 2' }), dist), a);
  fs.writeFileSync(path.join(dist, 'ex/posters/a.webp'), 'art 2');
  assert.notEqual(fingerprint(page(), dist), a);
  const b = fingerprint(page(), dist);
  fs.writeFileSync(path.join(dist, 'og/a.jpg'), 'share 2');
  assert.notEqual(fingerprint(page(), dist), b);
});

test("pictures resolve against the page's <base> and the site's own origin only", () => {
  assert.deepEqual(pictures('<base href="/ex/"><img src="posters/a.webp" srcset="a.webp 1x, b@2x.webp 2x"><img src="https://cdn.example/x.png"><video poster="/media/p.jpg"><meta property="og:image" content="https://www.kevinliu.studio/og/a.jpg">'), ['/ex/a.webp', '/ex/b@2x.webp', '/ex/posters/a.webp', '/media/p.jpg', '/og/a.jpg']);
});
