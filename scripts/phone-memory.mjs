#!/usr/bin/env node
// Phone memory: patches to round code that keep a phone's tab under its memory limit (docs/performance.md, "Memory").
// sync.mjs applies them after TRANSFORMS, so every sync writes them. When the rounds are not at hand,
//   node scripts/phone-memory.mjs           applies them once to the synced files here and records the new bytes in
//                                           sync.lock.json (only to a file whose bytes are still the lock's)
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
  // The card energy (r4/ex ground.js). On a phone, measured in WebKit at iPhone 14 (consolidate/mobile-fix.md), the
  // wall held 189 MB of canvas: the one shared WebGL canvas grew to 4096 x 4096 (128 MB with its two buffers) to print
  // every card's first frame at once, and each of the 26 cards kept two 2D canvases (2.1 MB) while scrolled away.
  'public/ex/ground.js': (t) => patch('ground.js', t, [
    // a touch screen or a small-memory device: the shared canvas stops at 2048 (16 MB a buffer); a frame whose prints
    // do not fit copies out the cells so far and reuses it (drawAll's flush), and the world canvas never outgrows it.
    // Its drawing density stops at 1.5 there: a phone's prints are already the 504 px poster or smaller.
    ['  const ATLAS_MAX = 4096;', `  // ${MARK}: the shared canvas and the density on a touch screen or a small-memory device (scripts/phone-memory.mjs)
  const SMALL = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || (typeof navigator !== 'undefined' && navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);
  const ATLAS_MAX = SMALL ? 2048 : 4096;`],
    ['  const dppx = () => Math.min(root.devicePixelRatio || 1, 2);', '  const dppx = () => Math.min(root.devicePixelRatio || 1, SMALL ? 1.5 : 2);'],
    ['Wd.k = [2, 1.5, 1].find((k) => k <= Math.max(1, dppx()) && cw * ch * k * k <= 6e6) || 1;', 'Wd.k = [2, 1.5, 1].find((k) => k <= Math.max(1, dppx()) && cw * ch * k * k <= 6e6 && Math.max(cw, ch) * k <= ATLAS_MAX) || 1;'],
    // a held print (off screen, its poster showing) gives its canvas's backing store back; it takes it again in the
    // frame that draws it, which is the frame a print that comes back on screen always gets (hold clears painted)
    ['    if (L.el.width !== w || L.el.height !== h) { L.el.width = w; L.el.height = h; }\n  }', `    L.bw = w; L.bh = h;
    if (L.el.style.display !== 'none') back(L);
  }
  // ${MARK}: a held print's canvas is 0 x 0; back() sizes it again before it is drawn
  function back(L) { if (L && L.bw && (L.el.width !== L.bw || L.el.height !== L.bh)) { L.el.width = L.bw; L.el.height = L.bh; } }`],
    ["    L.el.style.display = 'none';\n    L.painted = false;", "    L.el.style.display = 'none';\n    L.el.width = L.el.height = 0;\n    L.painted = false;"],
    ['  function jobsOf(s, rest, moving) {\n', '  function jobsOf(s, rest, moving) {\n    back(s); if (s.fx) back(s.fx);\n'],
    // and it is held as it leaves the screen, not at the next frame: a page whose loop has stopped (every print
    // painted and at rest) would otherwise keep every print it ever drew
    ['          s.seen = en.isIntersecting;\n', '          s.seen = en.isIntersecting;\n          if (!s.seen && !s.active && s.box !== s.el) { hold(s); hold(s.fx); }\n'],
  ]),
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
};

// ---------- applying to the synced files without the rounds ----------
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const CHECK = process.argv.includes('--check');
  const sha = (buf) => createHash('sha256').update(buf).digest('hex');
  const LOCK = path.join(REPO, 'sync.lock.json');
  const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
  let missing = 0, changed = 0;
  for (const [dest, fn] of Object.entries(PHONE)) {
    const abs = path.join(REPO, dest);
    const text = fs.readFileSync(abs, 'utf8');
    if (text.includes(MARK)) { console.log(`${dest}: has the phone patches`); continue; }
    if (CHECK) { console.log(`${dest}: missing the phone patches`); missing++; continue; }
    const stage = Object.values(lock.stages).find((s) => s.list[dest]);
    const rec = stage && stage.list[dest];
    if (!rec || rec.sha256 !== sha(Buffer.from(text))) throw new Error(`${dest}: not the bytes sync.lock.json records; run pnpm sync instead`);
    const out = Buffer.from(fn(text));
    fs.writeFileSync(abs, out);
    stage.bytes += out.length - rec.bytes;
    Object.assign(rec, { sha256: sha(out), bytes: out.length });
    changed++;
    console.log(`${dest}: patched (${rec.bytes} bytes)`);
  }
  if (changed) fs.writeFileSync(LOCK, JSON.stringify(lock, null, 1) + '\n');
  process.exit(missing ? 1 : 0);
}
