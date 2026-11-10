import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { jpegSize, metaOf, shareTagProblems, PAGES_MIN } from './checks.mjs';
import { bypassHeaders, get, follow } from './http.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const page = (tags) => `<html><head>${Object.entries(tags).map(([k, v]) => `<meta ${k.startsWith('og:') ? 'property' : 'name'}="${k}" content="${v}">`).join('')}</head></html>`;
const GOOD = { 'og:title': 'T', 'og:description': 'D', 'og:image': 'https://x/i.jpg', 'og:image:alt': 'A', 'twitter:card': 'summary_large_image', 'twitter:image': 'https://x/i.jpg', 'twitter:image:alt': 'A' };

test('the JPEG reader gives width and height, and null for anything else', () => {
  assert.deepEqual(jpegSize(fs.readFileSync(path.join(ROOT, 'public/og/home.jpg'))), [1200, 630]);
  assert.equal(jpegSize(Buffer.from('nope, not a picture')), null);
  assert.equal(jpegSize(Buffer.from([0xff, 0xd8, 0x00, 0x00, 0, 0, 0, 0, 0, 0, 0, 0])), null);
});
test('share tags: a complete page has no problem, and each missing or wrong tag is named', () => {
  assert.deepEqual(shareTagProblems(page(GOOD)), []);
  assert.deepEqual(shareTagProblems('<html></html>'), ['twitter:card is not summary_large_image', 'no og:image:alt', 'no twitter:image:alt', 'no og:title', 'no og:description']);
  assert.deepEqual(shareTagProblems(page({ ...GOOD, 'twitter:image': 'https://x/other.jpg' })), ['twitter:image differs from og:image']);
  assert.deepEqual(shareTagProblems(page({ ...GOOD, 'twitter:card': 'summary' })), ['twitter:card is not summary_large_image']);
  assert.deepEqual(shareTagProblems(page({ ...GOOD, 'og:image:alt': ' ' })), ['no og:image:alt']);
  assert.equal(metaOf(page(GOOD))('og:title'), 'T');
  assert.equal(PAGES_MIN, 31);
});
test('the preview bypass header: the secret wins over the token, and neither set means none', () => {
  assert.deepEqual(bypassHeaders({}), {});
  assert.deepEqual(bypassHeaders({ VERCEL_OIDC_TOKEN: 't' }), { 'x-vercel-trusted-oidc-idp-token': 't' });
  assert.deepEqual(bypassHeaders({ VERCEL_AUTOMATION_BYPASS_SECRET: 's', VERCEL_OIDC_TOKEN: 't' }), { 'x-vercel-protection-bypass': 's' });
});
test('a redirect that leaves the site never carries the bypass header', async (t) => {
  const seen = [];
  const answers = { 'https://site.test/a': [308, 'https://site.test/b'], 'https://site.test/b': [302, 'https://elsewhere.test/c'], 'https://elsewhere.test/c': [200, null], 'https://site.test/loop': [302, '/loop'] };
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    seen.push([url, init.headers['x-vercel-protection-bypass'] ?? null, init.redirect]);
    const [status, location] = answers[url];
    return new Response(null, { status, headers: location ? { location } : {} });
  });
  const before = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET = 's';
  t.after(() => { if (before === undefined) delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET; else process.env.VERCEL_AUTOMATION_BYPASS_SECRET = before; });
  const { r, url } = await follow('https://site.test', 'https://site.test/a');
  assert.equal(r.status, 200);
  assert.equal(url, 'https://elsewhere.test/c');
  assert.deepEqual(seen, [['https://site.test/a', 's', 'manual'], ['https://site.test/b', 's', 'manual'], ['https://elsewhere.test/c', null, 'manual']]);
  seen.length = 0;
  const one = await get('https://site.test', 'https://site.test/a');
  assert.equal(one.status, 308);
  assert.equal(seen.length, 1);
  seen.length = 0;
  const loop = await follow('https://site.test', 'https://site.test/loop');
  assert.equal(loop.r.status, 302);
  assert.equal(seen.length, 6);
});
