#!/usr/bin/env node
// Checks Release.astro's inline script in a built page without a browser: node scripts/check-release.mjs dist/index.html
// It runs the script with a touch screen stubbed in and asserts what a return from the back-forward cache does: the
// wall writes the dock's team into its address, then reloads; a page without a team, or without a dock, only reloads.
import fs from 'node:fs';
import vm from 'node:vm';
const file = process.argv[2];
if (!file) { console.error('usage: node scripts/check-release.mjs <built page>'); process.exit(2); }
const m = fs.readFileSync(file, 'utf8').match(/<script>(\(function\(\)\{if\(!matchMedia\("\(pointer: coarse\)"\)[\s\S]*?)<\/script>/);
if (!m) { console.error(`no Release script in ${file}`); process.exit(1); }
const run = (table, pathname) => {
  const calls = [], on = {};
  const ctx = {
    matchMedia: () => ({ matches: true }),
    HTMLCanvasElement: function () {},
    addEventListener: (type, fn) => { on[type] = fn; },
    document: { querySelectorAll: () => [] },
    history: { state: null, replaceState: (state, title, url) => calls.push(`replace ${url}`) },
    location: { pathname, search: '', reload: () => calls.push('reload') },
  };
  ctx.self = ctx;
  if (table) ctx.__table = table;
  vm.runInNewContext(m[1], ctx);
  on.pageshow({ persisted: false });
  if (calls.length) throw new Error('acted on a pageshow that was not from the back-forward cache');
  on.pageshow({ persisted: true });
  return calls.join(' | ');
};
// [the dock's state (gallery.js __table) or null for a page without one, the path, what must happen]
const CASES = [
  [{ you: ['katagami', 'mailroom'], rival: [], seed: 30 }, '/', 'replace /#you=katagami,mailroom&rival=&seed=30 | reload'],
  [{ you: ['katagami', 'mailroom', 'elo'], rival: ['jarhead', 'cotfly', 'loop'], seed: 7 }, '/', 'replace /#you=katagami,mailroom,elo&rival=jarhead,cotfly,loop&seed=7 | reload'],
  [{ you: [], rival: [], seed: 30 }, '/', 'reload'],
  [{ you: ['elo'], rival: [], seed: 4 }, '/es', 'replace /es#you=elo&rival=&seed=4 | reload'],
  [{ you: ['elo'], rival: [], seed: 4 }, '/es/cards', 'reload'],
  [null, '/battle', 'reload'],
  [{ you: ['katagami'], rival: [], seed: 30 }, '/cards/katagami', 'reload'],
];
let bad = 0;
for (const [table, pathname, want] of CASES) {
  const got = run(table, pathname);
  if (got !== want) { bad++; console.error(`${JSON.stringify(table)} at ${pathname}: got "${got}", expected "${want}"`); }
}
if (bad) process.exit(1);
console.log(`release: ${CASES.length} cases pass`);
