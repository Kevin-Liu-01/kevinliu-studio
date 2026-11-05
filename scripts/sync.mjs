#!/usr/bin/env node
// Pulls the finished round material into this repo by allow-list. The design rounds stay the source; nothing here is
// edited by hand. A rerun after a round finishes pulls its latest files, rewrites sync.lock.json and removes files the
// rounds no longer ship.
//   pnpm sync            copy, transform, scan, write sync.lock.json
//   pnpm sync --check    copy nothing; exit 1 when any synced file differs from the rounds
//   ROUNDS=<dir>         the rounds folder (default ~/Documents/ChatGPT/portfolio-design-rounds/2026-10-30)
// Stages and their owners are in docs/sync.md. Every destination folder below belongs to this script alone.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROUNDS = process.env.ROUNDS ?? path.join(os.homedir(), 'Documents/ChatGPT/portfolio-design-rounds/2026-10-30');
const CHECK = process.argv.includes('--check');

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
// scratch folders are never listed (r4/ex/.work alone is about 67 GB)
const PRUNE = new Set(['.work', '.git', 'shots', 'study', 'node_modules', 'takes', 'before', 'harness', 'src', 'game', 'repo', '__pycache__']);
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (PRUNE.has(e.name) ? [] : walk(path.join(dir, e.name))) : e.isFile() || e.isSymbolicLink() ? [path.join(dir, e.name)] : [])) : []);
const rel = (from, f) => path.relative(from, f).split(path.sep).join('/');

// ---------- what ships ----------
// A rule is { from, to, files } where files(listing) picks paths relative to `from`; `to` is relative to the repo.
const IMG = /\.(webp|avif|png|jpg|jpeg|svg|mp4|webm)$/i;
const SKIP = /(^|\/)(src|\.work|tools|shots|study|before|harness)\//;
const pick = (re) => (list) => list.filter((f) => re.test(f) && !SKIP.test(f));
const only = (...names) => (list) => names.filter((n) => list.includes(n));

const EX = `${ROUNDS}/r4/ex`;
const CARD_MEDIA = /^media\/[\w-]+\/(pop(@2x|@0\.5x|@0\.25x)?\.webp|cast\.webp|logo\.(svg|webp)|set@2x\.webp|glow(@2x)?\.webp|face@2x\.webp)$/;

const STAGES = {
  // r4/ex: the 26 cards. Runtime files go to public/ex (served at /ex/); build-only modules go to vendor/ex.
  cards: [
    { from: EX, to: 'public/ex', files: only('ui.css', 'card.css', 'rituals.css', 'fighters.js', 'engine.js', 'media.gen.js', 'art.js', 'motion.js', 'markup.js', 'rituals.js', 'gallery.js', 'ground.js', 'grounds/shell.js', 'grounds/recipes.js', 'grounds/programs.gen.js') },
    { from: EX, to: 'public/ex', files: (l) => l.filter((f) => /^posters\/[\w-]+(@0\.5x)?\.(webp|avif)$/.test(f) && !/-fx/.test(f)) },
    { from: EX, to: 'public/ex', files: (l) => l.filter((f) => /^grounds\/[\w-]+\.webp$/.test(f)) },
    { from: EX, to: 'public/ex', files: (l) => l.filter((f) => CARD_MEDIA.test(f) || f === 'media/prototemplate/window@2x.webp') },
    { from: EX, to: 'public/ex', files: (l) => l.filter((f) => /^(borders\/[\w-]+\/(border|over|trim)\.svg|fx\/[\w-]+\/fx\.svg|design\/(frames|lit|fxcut)\/[\w.-]+\.svg|icons\/frost(@2x)?\.webp)$/.test(f)) },
    { from: `${EX}/og`, to: 'public/og', files: (l) => l.filter((f) => /^[\w-]+\.(jpg|mp4)$/.test(f)) },
    { from: EX, to: 'vendor/ex', files: only('face.gen.js', 'bands.json', 'fonts/katagami-sans-cards.woff2', 'fonts/OFL.txt', 'vendor/neu-tokens.css', 'icons/icons.svg', 'icons/card-symbols.svg', 'icons/icons.js', 'tools/wall-rule.mjs', 'roster/battle-roster.json', 'copy/overrides.json') },
  ],
  // r4/sound: the kit's own allow-list (tools/ship.mjs): the player, its types, the gallery boot, two manifests, and
  // exactly the Opus and AAC files they name. Never the takes, the ledger or the receipts.
  sound: [{ from: `${ROUNDS}/r4/sound`, to: 'public/sound', files: soundFiles }],
  // r4/play: one battle page for Mat and Arena. It reads scene media from r3/battle and card pictures from r3/cards, so
  // those runtime folders come too. vendor/ is r4/play's bundle of r3 (rebuilt by battle-r4b's re-vendor step).
  battle: [
    { from: `${ROUNDS}/r4/play`, to: 'public/battle', files: (l) => l.filter((f) => /^(mat|arena)\/[\w.-]+\.(js|css)$/.test(f) || /^shared\/[\w.-]+\.(js|css)$/.test(f)) },
    { from: `${ROUNDS}/r4/play`, to: 'public/battle', files: (l) => l.filter((f) => /^vendor\/(cards|broadcast|fonts)\//.test(f) && !/\.md$/.test(f)) },
    { from: `${ROUNDS}/r4/play`, to: 'public/battle', files: (l) => l.filter((f) => /^media\//.test(f) && !/(proof\.png|@3x\.)/.test(f) && !SKIP.test(f) && /\.(webp|png|json)$/.test(f)) },
    { from: `${ROUNDS}/r4/play`, to: 'public/battle', files: (l) => l.filter((f) => /^assets\/maps\/[\w.-]+\.webp$/.test(f)) },
    { from: `${ROUNDS}/r4/play`, to: 'vendor/battle', files: only('mat/index.html') },
    { from: `${ROUNDS}/r3/battle`, to: 'public/battle/r3', files: (l) => l.filter((f) => /^(broadcast\/media|media|media-moves)\//.test(f) && !SKIP.test(f) && (IMG.test(f) || /^broadcast\/media\/.*\.json$/.test(f))) },
    { from: `${ROUNDS}/r3/cards`, to: 'public/battle/gallery', files: (l) => l.filter((f) => /^(posters|grounds|media)\//.test(f) && !SKIP.test(f) && IMG.test(f)) },
  ],
};

function soundFiles(list) {
  const out = ['sound.js', 'boot.gallery.js', 'manifest.gallery.json', 'manifest.battle.json'];
  for (const m of ['manifest.gallery.json', 'manifest.battle.json']) {
    const man = JSON.parse(fs.readFileSync(`${ROUNDS}/r4/sound/${m}`, 'utf8'));
    for (const c of Object.values(man.cues)) for (const f of c.files) for (const ext of [man.formats.primary, man.formats.fallback]) out.push(`out/${f}.${ext}`);
  }
  const set = [...new Set(out)];
  const missing = set.filter((f) => !list.includes(f));
  if (missing.length) throw new Error(`sound: the manifests name files the kit does not have: ${missing.slice(0, 5).join(', ')}`);
  return set;
}

// ---------- transforms: the only edits, applied on the way in ----------
// Each returns the new text. They exist because the round pages were written to be served from the rounds folder.
const TRANSFORMS = {
  // the battle's media manifest carries the rounds' gate notes, which the page never shows; ship them empty
  'public/battle/vendor/broadcast/media.js': (t) => t.replace(/"gates":\[(?:"(?:[^"\\]|\\.)*",?)*\]/g, '"gates":[]'),
};

// ---------- the scan ----------
const TEXT = /\.(js|mjs|css|html|json|md|txt|svg)$/;
const BANNED = [
  [/pok[eé]\s?(mon|ball)|nintendo|game\s?freak/i, 'franchise name'],
  [/\/api\/(submissions|emails)\b/, 'OMMC participant route'],
  [/xi-api-key/i, 'ElevenLabs header'],
  [/\bsk_[a-f0-9]{40,}\b/, 'API key shape'],
];
// General Translation appears only in the Atlas card's own records: the shared card data files print every card.
const GT = /general\s?translation|generaltranslation/i;
const GT_OK = new Set(['public/ex/fighters.js', 'public/ex/media.gen.js', 'vendor/ex/face.gen.js', 'vendor/ex/roster/battle-roster.json', 'vendor/ex/copy/overrides.json']);

function scan(dest, buf) {
  const hits = [];
  if (TEXT.test(dest)) {
    const t = buf.toString('utf8');
    for (const [re, why] of BANNED) if (re.test(t)) hits.push(why);
    if (GT.test(t) && !GT_OK.has(dest) && !/\/atlas[./]/.test(dest)) hits.push('General Translation outside the Atlas card');
  } else {
    const t = buf.toString('latin1');
    if (/xi-api-key/i.test(t) || /sk_[a-f0-9]{40,}/.test(t)) hits.push('key shape in binary');
    if (/\.(jpe?g|webp|png|avif)$/i.test(dest) && hasGps(buf)) hits.push('GPS in image metadata');
  }
  return hits;
}
// EXIF GPS: the GPS IFD pointer tag 0x8825 inside an Exif block, in either byte order
function hasGps(buf) {
  const at = buf.indexOf('Exif\0\0');
  if (at < 0) return false;
  const tiff = buf.subarray(at + 6, at + 6 + 65536);
  return tiff.includes(Buffer.from([0x88, 0x25])) || tiff.includes(Buffer.from([0x25, 0x88]));
}

// ---------- run ----------
const lock = { rounds: ROUNDS, head: gitHead(ROUNDS), synced: new Date().toISOString(), stages: {} };
const problems = [];
let changed = 0, removed = 0;
for (const [stage, rules] of Object.entries(STAGES)) {
  const files = {};
  const owned = new Set();
  for (const r of rules) {
    if (!fs.existsSync(r.from)) { problems.push(`${stage}: missing source ${r.from}`); continue; }
    const listing = walk(r.from).map((f) => rel(r.from, f));
    for (const f of r.files(listing)) {
      const src = path.join(r.from, f), dest = `${r.to}/${f}`;
      let buf = fs.readFileSync(src);
      if (TRANSFORMS[dest]) buf = Buffer.from(TRANSFORMS[dest](buf.toString('utf8')));
      for (const h of scan(dest, buf)) problems.push(`${dest}: ${h}`);
      const abs = path.join(REPO, dest);
      owned.add(abs);
      files[dest] = { src: rel(ROUNDS, src), sha256: sha(buf), bytes: buf.length };
      const same = fs.existsSync(abs) && sha(fs.readFileSync(abs)) === files[dest].sha256;
      if (same) continue;
      changed++;
      if (!CHECK) { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(`${abs}.tmp`, buf); fs.renameSync(`${abs}.tmp`, abs); }
    }
  }
  // files a stage no longer ships leave the repo
  for (const root of new Set(rules.map((r) => path.join(REPO, r.to)))) {
    for (const abs of walk(root)) {
      if (owned.has(abs) || abs.endsWith('.tmp')) continue;
      removed++;
      if (!CHECK) fs.rmSync(abs);
    }
  }
  lock.stages[stage] = { files: Object.keys(files).length, bytes: Object.values(files).reduce((a, f) => a + f.bytes, 0), list: files };
}
for (const [stage, s] of Object.entries(lock.stages)) console.log(`${stage}: ${s.files} files, ${(s.bytes / 1e6).toFixed(1)} MB`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s); nothing is committed until they are fixed at the source or by a transform:`);
  for (const p of problems.slice(0, 40)) console.error(`  ${p}`);
  process.exit(1);
}
if (CHECK) {
  console.log(changed || removed ? `stale: ${changed} changed, ${removed} to remove (run pnpm sync)` : 'in sync');
  process.exit(changed || removed ? 1 : 0);
}
fs.writeFileSync(path.join(REPO, 'sync.lock.json'), JSON.stringify(lock, null, 1) + '\n');
console.log(`synced from ${lock.head ?? 'a folder without git'}: ${changed} written, ${removed} removed`);

function gitHead(dir) {
  try { return execFileSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim() + (execFileSync('git', ['-C', dir, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim() ? ' (with uncommitted changes)' : ''); } catch { return null; }
}
