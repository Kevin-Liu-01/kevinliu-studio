#!/usr/bin/env node
// Strikes facts from a copy of src/lib/site.ts (Kevin may delete any line, docs/seo.md) and checks what /about's
// questions would then say: no other answer moves, and a question left with no fact stops the build.
//   node scripts/check-facts.mjs        (run from the repo root; needs Node 24, which strips the types)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const src = fs.readFileSync('src/lib/site.ts', 'utf8');
const load = async (drop, name) => {
  const kept = src.split('\n').filter((l) => !drop.some((d) => l.includes(d))).join('\n');
  const f = path.join(os.tmpdir(), `site-${name}-${process.pid}.ts`);
  fs.writeFileSync(f, kept);
  try { return await import(f); } finally { fs.rmSync(f); }
};
const BEFORE = 'Before General Translation he was', INTERNED = 'He interned at';
const whole = await load([], 'whole');
const one = await load([BEFORE], 'one');
const none = await load([BEFORE, INTERNED], 'none');
const fails = [];
if (whole.factsFor('before').length !== 2 || whole.factsFor('else').length !== 4) fails.push('whole: expected 2 facts under before and 4 under else');
if (one.factsFor('before').length !== 1 || !one.factsFor('before')[0].startsWith(INTERNED)) fails.push('one struck: the before answer is not the internships line alone');
if (one.factsFor('else').join('|') !== whole.factsFor('else').join('|')) fails.push('one struck: the else answer moved');
if (one.FACTS.length !== whole.FACTS.length - 1) fails.push('one struck: the list did not lose exactly one line');
let threw = false;
try { none.factsFor('before'); } catch { threw = true; }
if (!threw) fails.push('both struck: factsFor("before") must throw, so the build stops');
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log('facts: striking a line moves no other answer; an emptied question stops the build');
