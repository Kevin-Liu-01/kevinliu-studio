import test from 'node:test';
import assert from 'node:assert/strict';
import { safeKey, SYNCED } from './lock-check.mjs';

test('a lock key is a plain path inside a synced folder', () => {
  for (const k of ['public/ex/a.js', 'vendor/battle/mat/index.html', 'public/og/home.jpg', 'public/sound/out/x.webm']) assert.equal(safeKey(k), true, k);
  for (const k of ['public/ex/../../x', '../x', '/etc/passwd', 'src/pages/index.astro', 'public/exx/a', 'public/ex//a', 'public/ex/./a', 'public\\ex\\a', 'public/ex', '', null, 3]) assert.equal(safeKey(k), false, String(k));
});
test('the synced folders are the six the sync writes', () => {
  assert.deepEqual(SYNCED, ['public/ex', 'public/og', 'public/sound', 'public/battle', 'vendor/ex', 'vendor/battle']);
});
