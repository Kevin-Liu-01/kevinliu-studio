// scripts/budgets.json: every page lands in the kind it should, so each is held to its own budget
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const { pages } = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'budgets.json'), 'utf8'));
const kind = (p) => pages.find((r) => new RegExp(r.match).test(p))?.kind;

test('each page is held to its own kind', () => {
  const cases = [
    ['/index.html', 'wall'], ['/es.html', 'wall'], ['/pt-BR.html', 'wall'], ['/zh-Hans.html', 'wall'],
    ['/battle.html', 'battle'], ['/battle/arena.html', 'battle'], ['/ja/battle.html', 'battle'], ['/ko/battle/arena.html', 'battle'],
    ['/cards/claude-of-tanks.html', 'card'], ['/zh/cards/atlas.html', 'card'],
    ['/cards.html', 'page'], ['/about.html', 'page'], ['/es/about.html', 'page'], ['/404.html', 'page'],
  ];
  for (const [p, k] of cases) assert.equal(kind(p), k, p);
});

test('every kind sets all three budgets', () => {
  for (const r of pages) for (const k of ['html', 'css', 'js']) assert.ok(r[k] > 0, `${r.kind} ${k}`);
});
