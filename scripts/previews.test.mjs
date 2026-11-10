// A card page's move previews (previewOf in src/lib/cards.ts): a preview only where the battle fields a move of the
// card's own name, never the move that merely sits at the same place in the list, and only files the sync shipped.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
process.chdir(ROOT);
const { fighters, battleRoster, previewOf } = await import('../src/lib/cards.ts');
const engine = await import('../vendor/battle/vendor/engine.js');

test('a move has a preview exactly when the battle fields a move of the same name on that card', () => {
  let shown = 0;
  for (const f of fighters) {
    const fielded = engine.FIGHTERS.find((e) => e.id === f.id);
    for (const mv of f.moves) {
      const same = fielded?.moves.find((m) => m.name.toLowerCase() === mv.name.toLowerCase());
      const pv = previewOf(f, mv);
      if (!same) { assert.equal(pv, null, `${f.id}: "${mv.name}" is not a battle move's name, so it prints no preview`); continue; }
      shown++;
      assert.deepEqual(pv, { poster: `/battle/previews/${f.id}.${same.id}.webp`, clip: `/battle/previews/${f.id}.${same.id}.webm` });
      for (const file of [pv.poster, pv.clip]) assert.ok(fs.existsSync(path.join(ROOT, 'public', file)), file);
    }
  }
  assert.ok(shown > 0, 'no card move resolved to a preview');
});

test('a move the card renamed never shows the loop of the battle move at the same place in the list', () => {
  for (const e of engine.FIGHTERS) {
    const f = fighters.find((x) => x.id === e.id);
    e.moves.forEach((m, i) => {
      if (f.moves.some((mv) => mv.name.toLowerCase() === m.name.toLowerCase())) return;
      assert.equal(previewOf(f, f.moves[i]), null, `${f.id}: "${f.moves[i].name}" must not show the loop of "${m.name}"`);
    });
  }
});

test('a preview the sync did not ship stops the build', () => {
  const f = fighters.find((x) => battleRoster.moves[x.id]);
  const name = Object.keys(battleRoster.moves[f.id])[0];
  const id = battleRoster.moves[f.id][name];
  battleRoster.moves[f.id][name] = `${id}-not-shipped`;
  try { assert.throws(() => previewOf(f, { name, receipt: '' }), /has no preview/); } finally { battleRoster.moves[f.id][name] = id; }
});
