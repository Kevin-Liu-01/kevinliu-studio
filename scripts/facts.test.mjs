// Kevin may strike any fact in src/lib/site.ts by deleting its line (docs/seo.md). These tests strike lines from a
// copy of the file and read what /about's questions would then say: no other answer moves, and a question left with
// no fact stops the build. Needs Node 24, which strips the types.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const FILE = path.resolve(import.meta.dirname, '../src/lib/site.ts');
const lines = fs.readFileSync(FILE, 'utf8').split('\n');
// the line of each fact, in order
const rows = lines.flatMap((l, i) => (/^\s*\{ text: '/.test(l) ? [i] : []));
let n = 0;
// site.ts without the given fact lines, imported from a copy
async function load(strike = []) {
  const gone = new Set(strike.map((k) => rows[k]));
  const f = path.join(os.tmpdir(), `site-facts-${process.pid}-${n++}.ts`);
  fs.writeFileSync(f, lines.filter((_, i) => !gone.has(i)).join('\n'));
  try { return await import(pathToFileURL(f).href); } finally { fs.rmSync(f, { force: true }); }
}
const whole = await load();
// what a question should answer once some facts are struck: the facts still filed under it, in order
const answer = (q, strike) => whole.FACT_LIST.filter((f, k) => f.q === q && !strike.includes(k)).map((f) => f.text).join(' ').replace(/^Before General Translation he/, 'He');

test('every fact is one line the test can strike, and both questions have facts', () => {
  assert.equal(rows.length, whole.FACT_LIST.length);
  assert.ok(rows.length > 0);
  assert.deepEqual(whole.QA.map(([q]) => q), ['What did he do before General Translation?', 'What else has he done?']);
  assert.deepEqual(whole.QA.map(([, a]) => a), [answer('before', []), answer('else', [])]);
  assert.ok(whole.factsFor('before').length > 0 && whole.factsFor('else').length > 0);
});
test('striking any one fact shortens only its own answer', async () => {
  for (let k = 0; k < rows.length; k++) {
    const q = whole.FACT_LIST[k].q;
    // the last fact under a question cannot be struck without stopping the build; the next test covers that
    if (q && whole.factsFor(q).length === 1) continue;
    const m = await load([k]);
    assert.equal(m.FACTS.length, whole.FACTS.length - 1, `fact ${k + 1}: the list loses one line`);
    assert.equal(m.FACTS.includes(whole.FACTS[k]), false, `fact ${k + 1}: it is gone from the list`);
    assert.deepEqual(m.QA.map(([, a]) => a), [answer('before', [k]), answer('else', [k])], `fact ${k + 1}: answers`);
  }
});
test('a question left with no fact stops the build and says what to do', async () => {
  for (const q of ['before', 'else']) {
    const all = whole.FACT_LIST.flatMap((f, k) => (f.q === q ? [k] : []));
    await assert.rejects(load(all), new RegExp(`no fact is filed under q: '${q}'`));
  }
});
