#!/usr/bin/env node
// Phone memory: patches to round code that keep a phone's tab under its memory limit (docs/performance.md, "Memory").
// sync.mjs applies them after TRANSFORMS, so every sync writes them. When the rounds are not at hand,
//   node scripts/phone-memory.mjs           applies them once to the synced files here and records the new bytes in
//                                           sync.lock.json (only to a file whose bytes are still the lock's)
//                                           A file that already carries the marker is skipped, so a NEW patch for it
//                                           needs the full sync (ROUNDS=<export> pnpm sync), not this command.
//   node scripts/phone-memory.mjs --check   exits 1 when a synced file lacks them
// The same anchored-patch contract as TRANSFORMS: each anchor must occur exactly once.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function patch(file, text, pairs) {
  for (const [find, replace] of pairs) {
    const n = text.split(find).length - 1;
    if (n !== 1) throw new Error(`${file}: phone-memory anchor found ${n} times, expected once:\n  ${find.slice(0, 120)}`);
    text = text.replace(find, () => replace);
  }
  return text;
}
const MARK = 'kevinliu.studio phone memory';

export const PHONE = {
  // The card energy (r4/ex ground.js): the rounds carry these patches themselves from cards pin 8c77bd35 (ported
  // 11-08: the 2048 shared canvas, the 1.5 density and the held prints' 0 x 0 canvases on a touch screen), so none here.
  // The wall (r4/ex gallery.js) asks the browser to prerender the whole battle the moment both teams exist
  // (speculationrules, eagerness immediate). On a touch screen or a small-memory device that boots a second heavy
  // page behind the wall before any press, so the rule is left out there; Play still navigates.
  'public/ex/gallery.js': (t) => patch('gallery.js', t, [
    ["      if (url && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {", `      // ${MARK}: no battle prerender on a touch screen or a small-memory device (scripts/phone-memory.mjs)
      if (url && !(matchMedia('(pointer: coarse)').matches || navigator.deviceMemory <= 4) && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {`],
  ]),
  // The rituals (r4/ex rituals.js) keep the next pack rastered at all times on a desktop: three full 3D card copies
  // and the packet on the stage at opacity 0.001, and their well cards in the dock. On a touch screen or a
  // small-memory device they are cut when the pack is pressed instead (the press path's own prepare()), as under
  // reduced motion: the first frames of the tear pay for them, and the tab does not hold them.
  'public/ex/rituals.js': (t) => patch('rituals.js', t, [
    ['        if (packOff() || RM()) {', `        if (packOff() || RM() || LEAN) { // ${MARK} (scripts/phone-memory.mjs)`],
    ['    const live = () => !!(Ground && Ground.available);', "    const live = () => !!(Ground && Ground.available);\n    const LEAN = matchMedia('(pointer: coarse)').matches || navigator.deviceMemory <= 4;"],
    // the battle's opening cast (six subjects on the stage at opacity 0.001, six leads drawn into the shared canvas) is
    // built at idle once both teams exist; on a touch screen or a small-memory device only the battle's acceptance is
    // read then (probe), and the press builds the cast (pointerenter on #play and entry() call warm() themselves)
    ['own(T); idle(warm); });', 'own(T); idle(LEAN ? probe : warm); });'],
    ['        if ((!sized || !warm()) && ++tries < 40) setTimeout(boot, 250);', '        if (LEAN && sized) { if (G.S.you.length + G.S.rival.length === 6) probe(); } else if ((!sized || !warm()) && ++tries < 40) setTimeout(boot, 250);'],
  ]),
  // The battle's media preload (r4/play vendor/broadcast/kit.js, preload()) warms each move's clips with a detached
  // <video preload="auto"> it never lets go, so every cutscene left decoders and buffers behind until a collection. Once
  // its first frame has loaded (the cache is warm and its size is known) the element drops its source.
  'public/battle/vendor/broadcast/kit.js': (t) => patch('kit.js', t, [
    ['i.addEventListener("loadeddata",s,{once:!0}),i.addEventListener("error",s,{once:!0})', `i.addEventListener("loadeddata",()=>{i.removeAttribute("src"),i.load(),s()},{once:!0}),i.addEventListener("error",s,{once:!0})/* ${MARK} */`],
  ]),
  // The battle's lean grounds (shared/runtime.js) and the paused live prints at the result and under the Log
  // (shared/battle.js) are round 6's own code from battle pin 3bc364c1, so none here (applying them again would
  // declare LEAN_GROUNDS twice).
};

// ---------- applying to the synced files without the rounds ----------
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const CHECK = process.argv.includes('--check');
  const sha = (buf) => createHash('sha256').update(buf).digest('hex');
  const LOCK = path.join(REPO, 'sync.lock.json');
  const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
  // Read and patch everything first; write only when every file's patches applied. A patch that throws (its anchor
  // moved) leaves every file and the lock as they were.
  const todo = [];
  let missing = 0;
  for (const [dest, fn] of Object.entries(PHONE)) {
    const abs = path.join(REPO, dest);
    const text = fs.readFileSync(abs, 'utf8');
    if (text.includes(MARK)) { console.log(`${dest}: has the phone patches`); continue; }
    if (CHECK) { console.log(`${dest}: missing the phone patches`); missing++; continue; }
    const stage = Object.values(lock.stages).find((s) => s.list[dest]);
    const rec = stage && stage.list[dest];
    if (!rec || rec.sha256 !== sha(Buffer.from(text))) throw new Error(`${dest}: not the bytes sync.lock.json records; run pnpm sync instead`);
    todo.push({ dest, abs, stage, rec, out: Buffer.from(fn(text)) });
  }
  // each file, then the lock, by a temp file and a rename: a stop halfway never leaves a half-written file
  const put = (file, data) => { fs.writeFileSync(`${file}.tmp`, data); fs.renameSync(`${file}.tmp`, file); };
  for (const { dest, abs, stage, rec, out } of todo) {
    put(abs, out);
    stage.bytes += out.length - rec.bytes;
    Object.assign(rec, { sha256: sha(out), bytes: out.length });
    console.log(`${dest}: patched (${rec.bytes} bytes)`);
  }
  if (todo.length) put(LOCK, JSON.stringify(lock, null, 1) + '\n');
  process.exit(missing ? 1 : 0);
}
