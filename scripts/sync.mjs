#!/usr/bin/env node
// Pulls the finished round material into this repo by allow-list. The design rounds stay the source; nothing here is
// edited by hand. A rerun after a round finishes pulls its latest files, rewrites sync.lock.json and removes files the
// rounds no longer ship.
//   pnpm sync            copy, transform, scan, write sync.lock.json
//   pnpm sync --check    copy nothing; exit 1 when any synced file differs from the rounds
//   --admit-unpinned     let a file the pin does not have ship with new bytes (looked at first)
//   ROUNDS=<dir>         the rounds folder to read (default ~/Documents/ChatGPT/portfolio-design-rounds/2026-10-30), or an
//                        export of it (git archive at the pins plus the git-ignored frame SVGs)
// Each stage ships the rounds as they were at its pinned commit (PIN below): a tracked file that differs from its stage's
// pin stops the sync, so a plain `pnpm sync` never pulls round work nobody has reviewed. A release moves a pin.
// Stages and their owners are in docs/sync.md. Every destination folder below belongs to this script alone.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { scanBuffer } from './rules.mjs';
import { PHONE } from './phone-memory.mjs';
import { safeKey } from './lock-check.mjs';
import { CLOSED } from '../src/lib/closed-repos.mjs';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// the rounds' git checkout: the pins are read from it, and the lock names it, whichever folder ROUNDS reads
const ROUNDS_GIT = path.join(os.homedir(), 'Documents/ChatGPT/portfolio-design-rounds/2026-10-30');
const ROUNDS = process.env.ROUNDS ?? ROUNDS_GIT;
// the rounds commit each stage ships, the one its release's ship checks passed: the cards and sound of 11-07 (Breakout
// final), the battle's round 5 with its sound (r4/play REQUESTS.md, judges at 2d8d89d1), and on it the battle's string table
// and the HUD's card-text overrides (0a919baa, branch play/strings-on-42ff51c7: round 5 with shared/strings.js, no round 6)
const PIN = { cards: 'cfc4c9fc', sound: '30e69931', battle: 'f28393ef' };
const CHECK = process.argv.includes('--check');
// a file the stage's pin does not have ships only with the bytes the last lock recorded, unless admitted on purpose
const ADMIT = process.argv.includes('--admit-unpinned');

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
// scratch folders are never listed (r4/ex/.work alone is about 67 GB)
const PRUNE = new Set(['.work', '.git', 'shots', 'study', 'node_modules', 'takes', 'before', 'harness', 'src', 'game', 'repo', '__pycache__']);
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (PRUNE.has(e.name) ? [] : walk(path.join(dir, e.name))) : e.isFile() || e.isSymbolicLink() ? [path.join(dir, e.name)] : [])) : []);
const rel = (from, f) => path.relative(from, f).split(path.sep).join('/');

// ---------- what ships ----------
// A rule is { from, to, files } where files(listing) picks paths relative to `from`; `to` is relative to the repo.
const IMG = /\.(webp|avif|png|jpg|jpeg|svg|mp4|webm)$/i;
const SKIP = /(^|\/)(src|\.work|tools|shots|study|before|harness)\//;
// a named file the round no longer has stops the sync instead of quietly leaving the site
const only = (...names) => (list) => {
  const missing = names.filter((n) => !list.includes(n));
  if (missing.length) throw new Error(`missing named files: ${missing.join(', ')}`);
  return names;
};
// round captures that show text the site may not ship: the Elo sign-in placeholder names General Translation, and the
// Turboslide hero prints a photographer's credit. The battle's media manifest points those cards elsewhere (TRANSFORMS).
const DROP = new Set(['media/elo/card-elo-hub.png', 'media/turboslide/ts-hero-agents-repo.webp']);

const EX = `${ROUNDS}/r4/ex`;
const CARD_MEDIA = /^media\/[\w-]+\/(pop(@2x|@0\.5x|@0\.25x)?\.webp|cast\.webp|logo\.(svg|webp)|set@2x\.webp|glow(@2x)?\.webp|face@2x\.webp)$/;

const STAGES = {
  // r4/ex: the 26 cards. Runtime files go to public/ex (served at /ex/); build-only modules go to vendor/ex.
  cards: [
    { from: EX, to: 'public/ex', files: only('ui.css', 'card.css', 'rituals.css', 'fighters.js', 'engine.js', 'media.gen.js', 'art.js', 'motion.js', 'markup.js', 'rituals.js', 'gallery.js', 'ground.js', 'grounds/shell.js', 'grounds/recipes.js', 'grounds/programs.gen.js') },
    { from: EX, to: 'public/ex', files: (l) => l.filter((f) => /^posters\/[\w-]+(@0\.5x)?\.(webp|avif)$/.test(f)) },
    { from: EX, to: 'public/ex', files: (l) => l.filter((f) => /^grounds\/[\w-]+\.webp$/.test(f)) },
    // the Arena's auras (round 6) read each card's grounds/matter.js through EX_CARD.base (/ex/), beside fx/<id>/fx.svg
    { from: EX, to: 'public/ex', files: only('grounds/matter.js') },
    { from: EX, to: 'public/ex', files: (l) => l.filter((f) => CARD_MEDIA.test(f) || f === 'media/prototemplate/window@2x.webp') },
    { from: EX, to: 'public/ex', files: (l) => l.filter((f) => /^(borders\/[\w-]+\/(border|over|trim)\.svg|fx\/[\w-]+\/fx\.svg|design\/(frames|lit|fxcut)\/[\w.-]+\.svg|icons\/frost(@2x)?\.webp)$/.test(f)) },
    { from: `${EX}/og`, to: 'public/og', files: (l) => l.filter((f) => /^[\w-]+\.(jpg|mp4)$/.test(f)) },
    // everything the round's own page loads and prints: its sheets and scripts, the card families markup.js prints
    // through at build (design/card.js, design/plan.gen.js), and every file those name (pageFiles below). A file the round
    // adds to its page ships with no new rule here, so the wall never falls back to plain cards again.
    { from: EX, to: 'public/ex', files: pageFiles },
    // the round page's head alone (its sheets and scripts, in order): src/lib/cards.ts loads the same list
    { from: EX, to: 'vendor/ex', files: only('index.html') },
    { from: EX, to: 'vendor/ex', files: only('face.gen.js', 'bands.json', 'fonts/OFL.txt', 'vendor/neu-tokens.css', 'icons/icons.svg', 'icons/card-symbols.svg', 'icons/icons.js', 'tools/wall-rule.mjs', 'roster/battle-roster.json', 'copy/overrides.json', 'posters/posters.json') },
    // the battle prints the wall's own card (r4/play shared/excard.js), so the page loads these at runtime from /ex/ too:
    // the faces, and the icon set it inlines beside the card's own symbols
    { from: EX, to: 'public/ex', files: only('face.gen.js', 'icons/icons.svg', 'icons/card-symbols.svg') },
  ],
  // r4/sound: the kit's own allow-list (tools/ship.mjs): the player, its types, the gallery boot, two manifests, and
  // exactly the Opus and AAC files they name. Never the takes, the ledger or the receipts.
  sound: [{ from: `${ROUNDS}/r4/sound`, to: 'public/sound', files: soundFiles }],
  // r4/play: one battle page for Mat and Arena (round 5: r4/play SPEC.md). It prints the wall's own cards from r4/ex
  // (public/ex, the cards stage), reads scene media from r3/battle and card pictures from r3/cards, so those runtime
  // folders come too, and plays r4/sound's battle slice from ../../sound (public/sound). vendor/ is r4/play's 11-01
  // bundle of r3.
  battle: [
    // the two layouts and the shared page code: battle, runtime, fx, leaders, plan, and round 5's pace, hud, icons and
    // excard scripts with its hud and room sheets
    { from: `${ROUNDS}/r4/play`, to: 'public/battle', files: (l) => l.filter((f) => /^(mat|arena)\/[\w.-]+\.(js|css)$/.test(f) || /^shared\/[\w.-]+\.(js|css)$/.test(f)) },
    { from: `${ROUNDS}/r4/play`, to: 'public/battle', files: only('shared/pace.js', 'shared/hud.js', 'shared/icons.js', 'shared/excard.js', 'shared/hud.css', 'shared/room.css') },
    // round 6: each Princeton TD still's ink box, read by shared/runtime.js and arena/ptd-worker.js
    { from: `${ROUNDS}/r4/play`, to: 'public/battle', files: only('arena/ptd-ink.json') },
    // what is left of the battle's card copies (round 5 prints r4/ex's): the art masks and the kit's card sprite
    { from: `${ROUNDS}/r4/play`, to: 'public/battle', files: (l) => l.filter((f) => /^vendor\/(cards|broadcast|fonts)\//.test(f) && !/\.md$/.test(f)) },
    // each move's loop and its poster at the contact, for the move tooltip (shared/hud.js PREVIEWS)
    { from: `${ROUNDS}/r4/play`, to: 'public/battle', files: (l) => l.filter((f) => /^previews\/[\w.-]+\.(webm|webp)$/.test(f)) },
    { from: `${ROUNDS}/r4/play`, to: 'public/battle', files: (l) => l.filter((f) => /^media\//.test(f) && !/(proof\.png|@3x\.)/.test(f) && !SKIP.test(f) && /\.(webp|png|json)$/.test(f)) },
    { from: `${ROUNDS}/r4/play`, to: 'public/battle', files: (l) => l.filter((f) => /^assets\/maps\/[\w.-]+\.webp$/.test(f)) },
    // build-only: the page itself (src/lib/battle.ts), and the engine's roster and rules (src/lib/cards.ts battleRoster),
    // bundled from the same r3/battle source as the kit
    { from: `${ROUNDS}/r4/play`, to: 'vendor/battle', files: only('mat/index.html', 'vendor/engine.js') },
    { from: `${ROUNDS}/r3/battle`, to: 'public/battle/r3', files: (l) => l.filter((f) => /^(broadcast\/media|media|media-moves)\//.test(f) && !SKIP.test(f) && !DROP.has(f) && (IMG.test(f) || /^broadcast\/media\/.*\.json$/.test(f))) },
    { from: `${ROUNDS}/r3/cards`, to: 'public/battle/gallery', files: (l) => l.filter((f) => /^(posters|grounds|media)\//.test(f) && !SKIP.test(f) && IMG.test(f)) },
  ],
};

// The round page's closure: the sheets and scripts r4/ex/index.html loads, the two build-time modules markup.js requires
// beside itself, and every picture, clip or font any of them (or the round's printed pages) names; a sheet's own names
// resolve against the sheet. Code ships only by name (the head and the rules above), never because some file mentions
// it. A name counts only when it is a file the round has outside the scratch folders.
const PAGE_REF = /(?:\.\.?\/)?(?:[\w@.-]+\/)*[\w@.-]+\.(?:webp|avif|png|jpg|jpeg|svg|mp4|webm|woff2)\b/g;
function pageHead(html) {
  const end = html.indexOf('</head>');
  if (end < 0) throw new Error('the round page has no </head>');
  const head = html.slice(0, end);
  const found = [...head.matchAll(/<link rel="stylesheet" href="([^"]+)"[^>]*>|<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)].map((m) => m[1] ?? m[2]);
  // every sheet and script the head loads, however its tag is written: one the pattern above cannot read would neither
  // ship nor load, and the wall would print without it
  const tags = (head.match(/<link\b[^>]*\brel=["']?stylesheet/gi) ?? []).length + (head.match(/<script\b[^>]*\bsrc=/gi) ?? []).length;
  if (found.length !== tags) throw new Error(`the round page's head loads ${tags} sheets and scripts, but ${found.length} are written the way the sync reads them (<link rel="stylesheet" href="..."> and <script src="..."></script>)`);
  return found;
}
function pageFiles(list) {
  const have = new Set(list.filter((f) => !SKIP.test(f) && !/\.(html|md)$/.test(f)));
  const seeds = [...pageHead(fs.readFileSync(`${EX}/index.html`, 'utf8')), 'design/card.js', 'design/plan.gen.js'];
  const missing = seeds.filter((f) => !have.has(f));
  if (missing.length) throw new Error(`the round page names files it does not have: ${missing.join(', ')}`);
  const out = new Set(), todo = [...seeds];
  // the printed pages name pictures relative to the round's root; a sheet names them relative to itself
  const read = (text, dir) => { for (const m of text.matchAll(PAGE_REF)) { const f = path.posix.normalize(path.posix.join(dir, m[0])); if (have.has(f) && !out.has(f)) todo.push(f); } };
  for (const page of list.filter((f) => f === 'index.html' || /^cards\/[\w-]+\/index\.html$/.test(f))) read(fs.readFileSync(`${EX}/${page}`, 'utf8'), '');
  while (todo.length) {
    const f = todo.pop();
    if (out.has(f)) continue;
    out.add(f);
    if (/\.(css|js)$/.test(f) && seeds.includes(f)) read(fs.readFileSync(`${EX}/${f}`, 'utf8'), f.endsWith('.css') ? path.posix.dirname(f) : '');
  }
  // design/bake/ holds the round page's baked rims, which it prints through data-bake; the site's pages print none, so
  // the rungs (2.3 MB) would ship unused (release ship check 2026-11-11)
  return [...out].filter((f) => !f.startsWith('design/bake/')).sort();
}

function soundFiles(list) {
  const out = ['sound.js', 'boot.gallery.js', 'manifest.gallery.json', 'manifest.battle.json'];
  for (const m of ['manifest.gallery.json', 'manifest.battle.json']) {
    const man = JSON.parse(fs.readFileSync(`${ROUNDS}/r4/sound/${m}`, 'utf8'));
    // the gallery room theme never plays here (the boot transform removes its only call), so its files stay behind
    for (const [id, c] of Object.entries(man.cues)) if (!id.startsWith('mus.gallery')) for (const f of c.files) for (const ext of [man.formats.primary, man.formats.fallback]) out.push(`out/${f}.${ext}`);
  }
  const set = [...new Set(out)];
  const missing = set.filter((f) => !list.includes(f));
  if (missing.length) throw new Error(`sound: the manifests name files the kit does not have: ${missing.slice(0, 5).join(', ')}`);
  return set;
}

// ---------- transforms: the only edits, applied on the way in ----------
// Each returns the new text. A patch names the exact text it attaches to; if a round changes that text the patch
// matches zero or two places and the sync stops, so a hook is never dropped quietly.
function patch(file, text, pairs) {
  for (const [find, replace] of pairs) {
    const n = text.split(find).length - 1;
    if (n !== 1) throw new Error(`${file}: patch anchor found ${n} times, expected once:\n  ${find.slice(0, 120)}`);
    text = text.replace(find, () => (typeof replace === 'function' ? replace(find) : replace));
  }
  return text;
}
// the same anchor in `n` places, each replaced
function everyOf(file, text, find, replace, n) {
  const got = text.split(find).length - 1;
  if (got !== n) throw new Error(`${file}: anchor found ${got} times, expected ${n}:\n  ${find.slice(0, 120)}`);
  return text.split(find).join(replace);
}
const HIDE = '  .mark { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }';
const KEY_EASE = 'transition: box-shadow 160ms, transform 90ms, background-color 160ms;', KEY_MOVE = 'transition: transform 90ms;';
const NARROW_ARENA = `/* ============================================================ kevinliu.studio: the rail at 320 px (scripts/sync.mjs) */
@media (max-width: 359px) {
  .rail { grid-template-columns: minmax(0, 1fr); }
  .team-rail { gap: 4px; }
  .pips { gap: 3px; }
  .pip, .pip-face, .pip-back { width: 22px; }
  .pip { height: 35px; }
  .pip-face, .pip-back { height: 31px; }
}

`;
const after = (add) => (find) => find + add;
const before = (add) => (find) => add + find;
// r4/sound INTEGRATION.md section 2, the gallery's hooks, as written for the merge run. The player is reached only
// through globalThis.Sound?. so a page whose sound failed to load behaves as before.
const SND = "\n  const SND = () => globalThis.Sound || null;\n  const snd = (id, o) => SND()?.play(id, o) ?? null;\n  const pan = (el) => SND()?.panOf(el) ?? 0;";
const TILT = "\n      { const w = c.box.w, t = e.timeStamp; if (c.tx !== undefined) { const v = ((e.clientX - c.tx) / Math.max(1, t - c.tt)) * 1000 / w; if (c.tdir && Math.sign(v) && Math.sign(v) !== c.tdir && Math.abs(v) > 0.6) snd('card.tilt', { key: el.dataset.id, pan: pan(el) }); if (Math.abs(v) > 0.05) c.tdir = Math.sign(v); } c.tx = e.clientX; c.tt = t; }";
const GRAIN = "\n        { const p = clamp((dx * st.P.dir) / st.P.r.w); if (Math.abs(p - (st.g ?? 0)) >= 0.05) { const speed = Math.abs(p - (st.g ?? 0)) / Math.max(0.001, (e.timeStamp - (st.gt ?? e.timeStamp)) / 1000); snd('pack.tear.grain', { gainDb: Math.max(-6, Math.min(0, 6 * Math.log2(speed / 2))), pan: pan(packEl) }); st.g = p; st.gt = e.timeStamp; } }";
const REVEAL = "const tier = Math.min(4, top); const S0 = SND(); const sh = S0?.schedule(S0.packCues({ n, top: tier, base, size: G.SIZE }), { t0: S0.context ? S0.context.currentTime - t0 / 1000 : undefined }); { const fin = T.finish; T.finish = () => { const S2 = SND(); if (sh && S2?.context && S2.context.currentTime < sh.t0 + Fj(0) / 1000) { sh.cancel(40); snd(`pack.reveal.${tier}`); snd(base + n >= G.SIZE ? 'team.complete' : 'team.add', { offsetMs: 0 }); } fin.call(T); }; }\n      ";
// a card's pinned commit links only where a visitor can open its repository (src/lib/closed-repos.mjs), on every card
// face (the battle prints the wall's markup.js)
const nolink = (t) => [/  const NOLINK = new Set\(\[[^\]]*\]\);/.exec(t)?.[0] ?? '<none>', `  const NOLINK = new Set(${JSON.stringify(CLOSED)});`];
// card.css carries the frosted slips' 1x tile as a 30 KB base64 data URL, the fallback of var(--frost, ...), so the
// sheet paints wherever the rounds serve it (r4/ex card.css, round ex.5). Every page here sets --frost (ui.css on the
// pages Base.astro frames, BattlePage.astro on the battle), so the fallback is never painted and it leaves the
// render-blocking sheet: about 25 KB less gzipped on every page that prints a card
const FROST = '.card { --frost-tile: var(--frost, url("data:image/webp;base64,';
const frost = (t) => { const a = t.indexOf(FROST), e = a < 0 ? -1 : t.indexOf('"))', a); return [e < 0 ? '<none>' : t.slice(a, e + 3), '.card { --frost-tile: var(--frost, none)']; };
const TRANSFORMS = {
  // the round page's head only, for src/lib/cards.ts: its body prints every card, which the site prints itself
  'vendor/ex/index.html': (t) => pageHead(t).map((f) => (/\.css$/.test(f) ? `<link rel="stylesheet" href="${f}"${/data-card-style-sheet/.test(t.slice(t.indexOf(`href="${f}"`), t.indexOf('>', t.indexOf(`href="${f}"`)))) ? ' data-card-style-sheet' : ''}>` : `<script defer src="${f}"></script>`)).join('\n') + '\n',
  // the battle page lives at /battle and /battle/arena here, and returns to the cards at /
  'public/battle/shared/battle.js': (t) => patch('battle.js', t, [
    // where only the speed in force shows (a phone), a press steps to the next and hides the pressed key; focus moves to
    // the key now shown, so a keyboard or a screen reader is not dropped to the page
    ["pace.setSpeed(pace.SPEEDS[(i + 1) % pace.SPEEDS.length]); } else pace.setSpeed(s); };", "pace.setSpeed(pace.SPEEDS[(i + 1) % pace.SPEEDS.length]); if (document.activeElement === b) sp.querySelector('[aria-pressed=\"true\"]')?.focus({ preventScroll: true }); } else pace.setSpeed(s); };"],
    // the layout switch renames the tab; it keeps this site's page titles instead
    ["const TITLES = { mat: 'Card Mat', arena: 'Arena' };", "const TITLES = { mat: 'Battle | Kevin Liu', arena: 'Battle, Arena | Kevin Liu' };"],
    ["/\\/arena\\//.test(location.pathname)", "/\\/arena(\\/|$)/.test(location.pathname)"],
    ["return `../../../r3/cards/index.html${p}`;", "return `/${p}`;"],
    // (plan 008's address and boot errors, the mode key, keptError, bootFailed and the fixture's catch, are round 6's own
    // code from battle pin 3bc364c1: r4/play REQUESTS.md "Round 6 closed")
    // one batch's outcomes are announced together: a shot lands all its events in one loop, and each one overwrote
    // the live region, so a hit was lost behind the knockout that followed it
    ["function live(text) { $('#live').textContent = text; }", "// kevinliu.studio: one batch's outcomes are announced together, not only the last one written (scripts/sync.mjs)\nlet liveLines = [];\nfunction live(text) { if (!liveLines.length) queueMicrotask(() => { $('#live').textContent = liveLines.join(' '); liveLines = []; }); liveLines.push(text); }"],
    // Enter or Space on a focused speed, mode or sound key presses that key instead of skipping the scene, as a
    // pointer press on them already does (r4/play SPEC.md: "the speed buttons never skip")
    ["  if (stage.playing && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); e.stopPropagation(); skip(); return; }", "  if (stage.playing && (e.key === ' ' || e.key === 'Enter') && !e.target?.closest?.('dialog, .seg, .speed, .tip, #sound')) { e.preventDefault(); e.stopPropagation(); skip(); return; } // kevinliu.studio: a focused speed, mode or sound key is pressed, not skipped (scripts/sync.mjs)"],
    // the page's h1 is its wordmark (src/lib/battle.ts); the result's title is the next level down
    ["  el('h1', '', r, txt(win === 'draw' ? 'result.draw' : win === 'player' ? 'result.victory' : 'result.defeat'));", "  el('h2', '', r, txt(win === 'draw' ? 'result.draw' : win === 'player' ? 'result.victory' : 'result.defeat')); // kevinliu.studio: the page keeps one h1 (scripts/sync.mjs)"],
    // a replay that a new battle overtakes leaves that battle's state alone, and one that throws unlocks the console
    ["  if (busy || !lastShot?.scene) return;\n  busy = true; render();\n  const s = { ...lastShot.scene, variant: reduced() ? 'reduced' : 'full' };", "  if (busy || !lastShot?.scene) return;\n  const my = gen; // kevinliu.studio: a replay that a new battle overtakes leaves that battle's state alone (scripts/sync.mjs)\n  busy = true; render();\n  try {\n  const s = { ...lastShot.scene, variant: reduced() ? 'reduced' : 'full' };"],
    ["  await stage.play(s, c, {});\n  delete app.dataset.scene;\n  busy = false; render();\n}\n$('#replay').onclick = () => replayLast();", "  await stage.play(s, c, {});\n  } finally {\n    if (app.dataset.scene === 'replay') delete app.dataset.scene;\n    if (my === gen) { busy = false; render(); }\n  }\n}\n$('#replay').onclick = () => replayLast();"],
    // a new hand lets the card kits of cards it does not hold go: each kit is 0.7 to 2.6 MB decoded and none was
    // ever released, so New Rival hands piled them up
    ["  soundReady.then((S) => { if (!S || my !== gen) return; S.stop(undefined, 120); for (const id of [...match.team, ...match.rival]) S.load(`card:${id}`); });", "  // kevinliu.studio: the last hand's card kits that this hand does not hold give their decoded audio back (scripts/sync.mjs)\n  soundReady.then((S) => { if (!S || my !== gen) return; S.stop(undefined, 120); const hand = new Set([...match.team, ...match.rival]); for (const id of soundCards) if (!hand.has(id)) S.unload?.(`card:${id}`); soundCards = hand; for (const id of hand) S.load(`card:${id}`); });"],
    ["let Sound = null, shotSound = null;", "let Sound = null, shotSound = null, soundCards = new Set();"],
  ]),
  // (the Arena's map key and the deal's hidden pads are round 6's own code from battle pin 3bc364c1)
  // the card code is the wall's, served at /ex/ (the rounds' ../../../r4/ex/). A phone prints each card plain, as the
  // wall does (Kevin, 11-08, "Desktop-only frames"): a family's frame SVG layers held about 250 MB on an iPhone
  'public/battle/shared/excard.js': (t) => patch('excard.js', t, [
    ["const EX = new URL('../../../r4/ex/', document.currentScript.src).href;", "const EX = new URL('/ex/', document.currentScript.src).href;\n  const PLAIN = matchMedia('(pointer: coarse)').matches || navigator.deviceMemory <= 4; // kevinliu.studio: frames on desktop only"],
    ['card: (f, opts, e) => resolve(M.card(', 'card: (f, opts, e) => resolve((PLAIN ? M.baseCard : M.card)('],
  ]),
  // A board card (the kit's "mini" print, both modes) prints with the wall's subject ladder: markup.js takes the
  // smallest cut at least as wide as the subject's device px, where the battle printed the full cut (941 to 1200 px)
  // for a card 46 to 220 px wide. The sizes are the widest a board card is ever drawn, measured through Auto battles in
  // both modes at 320 to 1440 wide (0.52 of the width standing, 0.36 of the height lying down; Auto's lunges and the
  // phone Mat's enlarged turn included), so no card draws a cut smaller than its device px. Scene cards print as
  // before. On the throttled phone the Mat shows 13.8 -> 11.0 s (docs/performance.md, 2026-11-26)
  'public/battle/vendor/broadcast/kit.js': (t) => patch('kit.js', t, [
    ['function O2(t){Ml();const a=tr(t),r=_2.card(a,{id:`bcc-${++Bl}`,focusable:!1},', 'function O2(t,z){Ml();const a=tr(t),r=_2.card(a,{id:`bcc-${++Bl}`,focusable:!1,...(z==="mini"?{sizes:[["(orientation: landscape)","37vh"],[null,"53vw"]]}:{})},'],
    ['const s=O2(t);e.append(s)', 'const s=O2(t,r);e.append(s)'],
  ]),
  // the battle's media manifest: the rounds' gate notes ship empty (the page never shows them), the two dropped
  // captures give way to clean ones from the same project, and the Prototemplate loop points at the clip that exists
  'public/battle/vendor/broadcast/media.js': (t) => {
    const keys = t.split('"gates":').length - 1;
    let n = 0;
    t = t.replace(/"gates":\[(?:"(?:[^"\\]|\\.)*",?)*\]/g, () => (n++, '"gates":[]'));
    if (!keys || n !== keys) throw new Error(`media.js: emptied ${n} of ${keys} gate lists`);
    return patch('media.js', t, [
      ['"card":{"src":"media/elo/card-elo-hub.png","kind":"image","w":2880,"h":1800}', '"card":{"src":"media-moves/elo/blind-pair.webp","kind":"image","w":1920,"h":1080}'],
      ['"card":{"src":"media/turboslide/ts-hero-agents-repo.webp","kind":"image","w":2560,"h":1280}', '"card":{"src":"media/turboslide/ts-same-actions.webp","kind":"image","w":2564,"h":1178}'],
      ['"src":"media/prototemplate/pt-every-sentence.mp4"', '"src":"media-moves/prototemplate/every-sentence.mp4"'],
    ]);
  },
  // round 5's rail (the mode pair, the speed key, the speaker, Log and Leave) fits down to 360 px; at 320 Leave ran 15 px
  // off the screen (next-release ship checks), so under 360 the keys and gaps tighten until it ends 8 px in
  'public/battle/shared/hud.css': (t) => patch('hud.css', t, [['  #app .rail-keys .seg .key { min-width: 0; }\n}\n', after(`/* kevinliu.studio: the rail at 320 px (scripts/sync.mjs) */
@media (max-width: 359px) {
  #app .rail-keys { gap: 3px; }
  #app .rail-keys .key { padding: 0 7px; }
  #app .speed .key { min-width: 38px; padding: 0 6px; }
  #app .key.snd { min-width: 34px; padding: 0 6px; }
}
`)],
    // round 6 on a short phone: the Switch, Send In and Kit sheets were capped under the rail (150 px at 320 x 568), so
    // their lower rows sat under the move console behind an inner scroll; they take the console's room, as the Tower
    // sheet already does. A tower tile's multiplier chip wraps inside its pill instead of running past the tile (14 to 29
    // px at 320); under 390 the tiles drop their number hints (aria-keyshortcuts stays) and under 360 the tower still
    // shrinks, so the chip fits whole. A keyboard-focused move keeps its ring while the mouse rests on another move
    ['#moves:has(.cmove:hover) .cmove:focus-visible:not(:hover) { outline-color: transparent; }', '#moves:has(.cmove:hover) .cmove:focus-visible:not(:hover):not([data-keyed]) { outline-color: transparent; }'],
    ['.pl-hpnum b { display: inline-block; min-width: 3ch; text-align: end; }\n', after(`/* kevinliu.studio: round 6's sheets and tower chips on a phone (scripts/sync.mjs) */
@media (max-width: 719px) and (max-height: 740px), (max-width: 359px) {
  #app .panel:not([data-kind="tower"]) { position: fixed; left: 8px; right: 8px; top: auto; bottom: 8px; max-height: min(78vh, calc(100vh - 80px), calc(100vh - var(--hud-rail-b, 36px) - 44px)); overflow-y: auto; overscroll-behavior: contain; }
}
#app .panel :is(.key.tw-tile, .key.tw-do) .hx { max-width: 100%; box-sizing: border-box; flex-wrap: wrap; white-space: normal; }
@media (max-width: 389px) {
  #app .panel .key.tw-tile { padding-left: 8px; }
  #app .panel .key.tw-tile kbd { display: none; }
}
@media (max-width: 359px) { #app .panel .key.tw-tile .tw-still { --h: 44px !important; } }
`)]]),
  // the battle's wordmark (a paragraph; the page's h1 is the site's own rules section, BattlePage.astro) leaves the layout
  // on phones but stays in the accessibility tree
  // a key's raise and colour change at once; only its press moves (transform), so no frame repaints a shadow
  // the result's title is an h2 here (the page has its own h1), so its two rules follow it. The Mat's
  // reduced-motion rule arrived from the round-5 merge with an unclosed selector list and no declarations, so the
  // browser dropped it and the Mat's rail, console, keys and slots kept their transitions under reduced motion; it is
  // the rule from before that merge again, less the retired .kit-chip
  'public/battle/mat/mat.css': (t) => patch('mat.css', everyOf('mat.css', t, '.result h1 {', '.result h2 {', 2), [
    ['  .mark { display: none; }', HIDE],
    [KEY_EASE, KEY_MOVE],
    ['  .rail, .console, .key, .slot-lift, .slot[data-dim], }', '  .rail, .console, .key, .slot-lift, .slot[data-dim], .result, #app[data-scene] .rail, #app[data-scene] .console, .slot[data-zone="finale"] :is(.chips, .tokens) { transition: none !important; }\n}'],
  ]),
  // at 320 px the Arena's team rail (two teams of pips and the turn) was 33 px wider than the rail, and the grid column
  // it shares with the keys grew with it, so Leave slid off screen: the column holds the rail's width, and the pips and
  // gaps tighten until the team rail fits
  'public/battle/arena/arena.css': (t) => patch('arena.css', everyOf('arena.css', everyOf('arena.css', t, '  .mark { display: none; }', HIDE, 2), '.result h1 {', '.result h2 {', 2), [
    ['/* ============================================================ reduced motion: every step a still */', before(NARROW_ARENA)],
    [KEY_EASE, KEY_MOVE],
  ]),
  // Local Search and Kevin Wiki moved to their own subdomains after the cards' pin (Kevin, 2026-11-13): the build, the
  // lens and the battle's card faces read their live link from here. Drop this when the rounds carry the new addresses
  'public/ex/fighters.js': (t) => patch('fighters.js', t, [
    ["    url: 'https://lsearch.dev/',", "    url: 'https://localsearch.kevinliu.studio/',"],
    ["    url: 'https://kevin-wiki.vercel.app',", "    url: 'https://wiki.kevinliu.studio/',"],
  ]),
  // the lens's Visit link gets its address when a card opens; a placeholder "#" would resolve against <base> to /ex/
  'public/ex/markup.js': (t) => patch('markup.js', t, [
    ['<a class="press visit" target="_blank" rel="noopener" href="#">', '<a class="press visit" target="_blank" rel="noopener">'],
    // aria-label on a div without a role is ignored: the rival's side is a group
    ['<div class="side rival" aria-label="Rival">', '<div class="side rival" role="group" aria-label="Rival">'],
    nolink(t),
  ]),
  // (the phone tray's wrap, 8ea1bfb, is in the rounds' own ui.css from cards pin 8c77bd35: no patch here)
  // family K's rule under each power's name is set 4.9cqw down its row, and WebKit sets the row's first text line higher
  // than Chromium does, so in Safari the rule struck through that line (release 11-07 ship checks); the rule is left out.
  // A trait's and a move's head row was `grid-template-rows: 4.9cqw auto`, and WebKit resolves cqw in a grid track
  // against half the card's width (6 px for 12 at 244 px), so every description started 6 px up into its name; family
  // B's opaque line bands then hid the names' lower half in Safari. An auto head row takes the name's own 4.9cqw height
  // (which WebKit resolves correctly): Chromium's rows are unchanged and Safari's match them (release 11-07 ship checks).
  // The foot row's `31cqw 28cqw 1fr` columns met the same bug, so Safari printed "x1.5" over the resistance icons on
  // every card; they are the same widths as shares of the foot's content box (100cqw less 6.8 of inset and 6.8 of padding)
  'public/ex/card.css': (t) => patch('card.css', t, [
    ['background: linear-gradient(color-mix(in oklab, var(--k) 82%, transparent), color-mix(in oklab, var(--k) 82%, transparent)) 2.4cqw 4.9cqw / calc(100% - 4.8cqw) 0.3cqw no-repeat,\n    linear-gradient(', 'background: linear-gradient('],
    ['.card .trait { grid-template-columns: auto auto 1fr; grid-template-rows: 4.9cqw auto;', '.card .trait { grid-template-columns: auto auto 1fr; grid-template-rows: auto auto;'],
    ['.card .move { grid-template-columns: auto 1fr auto; grid-template-rows: 4.9cqw auto;', '.card .move { grid-template-columns: auto 1fr auto; grid-template-rows: auto auto;'],
    ['  display: none; grid-template-columns: 31cqw 28cqw 1fr; align-items: center; }', '  display: none; grid-template-columns: calc(31 / 86.4 * 100%) calc(28 / 86.4 * 100%) 1fr; align-items: center; }'],
    frost(t),
  ]),
  // nothing is fetched before the first gesture (the player's own header): a cue played before one (the battle's deal)
  // called unlock() with no event, which counted as a gesture and loaded every wanted group, about 240 files and 2.3 MB
  // on /battle while the context stayed suspended and every cue was dropped (next-release ship checks). Such a call now
  // returns, unless the context already runs (resumeAtLoad on a page the browser lets play)
  'public/sound/sound.js': (t) => patch('sound.js', t, [['  if (e && e.isTrusted === false) return;\n  S.gestured = true;\n', "  if (e && e.isTrusted === false) return;\n  if (!e && !S.gestured && !(S.ctx && S.ctx.state === 'running')) return; // kevinliu.studio: no gesture, no fetch (scripts/sync.mjs)\n  S.gestured = true;\n"],
    // nothing is fetched before the context is unlocked: on the battle the player makes its context at load
    // (resumeAtLoad), so a cue played before any gesture (the deal, the leads' entrances) passed the old check, fetched
    // and decoded its file, and was dropped by the suspended context (10 files in 25 s with no input). The fanfare path
    // had the same check
    ['  if (!S.ctx || !S.unlocked) { unlock(); if (!S.ctx) return null; }', '  if (!S.ctx || !S.unlocked) { unlock(); if (!S.ctx || !S.unlocked) return null; } // kevinliu.studio: no unlocked context, no fetch (scripts/sync.mjs)'],
    ['  if (!c || !S.enabled || !S.ctx) return null;', '  if (!c || !S.enabled || !S.ctx || !S.unlocked) return null; // kevinliu.studio: no unlocked context, no fetch (scripts/sync.mjs)'],
    // a page shown again from the back-forward cache missed every storage event: it reads the saved choice
    ["      addEventListener('storage', (e) => { if (e.key === KEY && (e.newValue === 'on' || e.newValue === 'off')) setEnabled(e.newValue === 'on', { persist: false }); });\n", after("      // kevinliu.studio: a page shown again from the back-forward cache gets no storage event; it reads the saved choice (scripts/sync.mjs)\n      addEventListener('pageshow', (e) => { if (!e.persisted) return; const s = saved(); if (s !== null && s !== S.enabled) setEnabled(s, { persist: false }); });\n")],
    // the battle's manifest has no ui.sound.on and no gallery group: its speaker key answers with bt.ui.toggle
    ["    if (feedback) { play('ui.sound.on', { force: true, waitMs: 900 }); load('gallery'); }", "    if (feedback) { play(S.m && !S.m.cues['ui.sound.on'] && S.m.cues['bt.ui.toggle'] ? 'bt.ui.toggle' : 'ui.sound.on', { force: true, waitMs: 900 }); if (S.page !== 'battle') load('gallery'); } // kevinliu.studio: the battle answers with its own toggle cue (scripts/sync.mjs)"],
    // the battle's clock (shared/pace.js) runs every page timer in scene time, up to four times as fast in a rush;
    // the player's waits (a theme's stop, the eviction of a faded theme, lap changes, a prefetch) keep real time
    ["const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];", before("// kevinliu.studio: the battle's clock (shared/pace.js) runs every page timer in scene time; the player's waits keep real time (scripts/sync.mjs)\nconst setTimeout = (fn, ms, ...a) => (globalThis.battlePace?.realTimeout ?? globalThis.setTimeout)(fn, ms, ...a);\n")],
    // a manifest that fails (a dropped request, a 404 mid-deploy) was cached as a rejected promise: the page stayed
    // silent until a reload and every later hover logged an unhandled rejection. The fetch checks its status, a
    // failure clears the cache, the first-gesture loading re-arms for the next gesture, and no caller is left uncaught
    ['      S.m = await (await fetch(url)).json();', '      const res = await fetch(url);\n      if (!res.ok) throw new Error(`manifest ${res.status}`);\n      S.m = await res.json();'],
    ['    applyGraph();\n    return S.m;\n  })();\n  return S.mp;', '    applyGraph();\n    return S.m;\n  })().catch((e) => { S.mp = null; throw e; }); // kevinliu.studio: a manifest that failed is asked for again (scripts/sync.mjs)\n  return S.mp;'],
    ['    });\n  });\n}\nfunction bindGestures() {', '    });\n  }).catch(() => { S.unlocked = false; if (!S.gesturesBound) { bindGestures(); S.gesturesBound = true; } }); // kevinliu.studio: the next gesture asks again (scripts/sync.mjs)\n}\nfunction bindGestures() {'],
    ['    if (S.unlocked) { S.pendingIds.push({ id: id0, o, t: performance.now() }); ensureManifest(); }', '    if (S.unlocked) { S.pendingIds.push({ id: id0, o, t: performance.now() }); ensureManifest().catch(() => {}); }'],
    ['  if (!S.m) return ensureManifest().then(() => load(group));', '  if (!S.m) return ensureManifest().then(() => load(group)).catch(() => { S.wantGroups.add(group); });'],
    ['    ensureManifest(); // its request goes first', '    ensureManifest().catch(() => {}); // its request goes first'],
    ["    if (o.eager || o.resumeAtLoad || typeof o.manifest === 'object') await ensureManifest();", "    if (o.eager || o.resumeAtLoad || typeof o.manifest === 'object') await ensureManifest().catch(() => {});"],
    // a group's decoded files can be let go (the last hand's card kits): nothing but a faded theme ever was
    ['function evict(file) { const rec = S.files.get(file); if (rec) { rec.buf = null; S.files.delete(file); } }', after("\n/** kevinliu.studio: let a group's decoded files go (a hand's card kits when the next hand holds other cards); a later load fetches them again (scripts/sync.mjs) */\nfunction unload(group) { S.groups.delete(group); S.wantGroups.delete(group); for (const [file, rec] of [...S.files]) if (rec.group === group) { rec.buf = null; S.files.delete(file); } }")],
    ['  init, load, play, schedule, scene, board, music, intensity, stinger, duck, stop, setEnabled, setPage, bindToggle, unlock, panOf,', '  init, load, unload, play, schedule, scene, board, music, intensity, stinger, duck, stop, setEnabled, setPage, bindToggle, unlock, panOf,'],
  ]),
  // the gallery's music loop is left out: sound answers the visitor's own actions (docs/sound.md)
  'public/sound/boot.gallery.js': (t) => patch('boot.gallery.js', t, [[/^Sound\.music\('mus\.gallery'.*\n/m.exec(t)?.[0] ?? '<none>', '']]),
  'public/ex/gallery.js': (t) => patch('gallery.js', t, [
    ["const BATTLE = new URL($('meta[name=\"battle\"]').content, document.baseURI).href;", after(SND + "\n  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('a, button'); if (b && !b.closest('.card, #pause, #sound, [data-mode-set], #play, #pack, .addbtn, .close')) snd('ui.tap'); });")],
    ["if (b) setMode(b.dataset.modeSet); });", "if (b) { snd('ui.mode'); setMode(b.dataset.modeSet); } });"],
    ["pauseBtn.addEventListener('click', () => setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true'));", "pauseBtn.addEventListener('click', () => { snd('ui.toggle'); setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true', true); });"],
    ["if (e.pointerType !== 'mouse' || !fine.matches || RM() || G.ritual) return;", after(" snd('ui.hover', { pan: pan(el), key: el.dataset.id }); SND()?.load('sig:' + el.dataset.id);")],
    ["aim(c, clamp((e.clientX - r.x - 6) / (r.w - 12)), clamp((e.clientY - top - 6) / (r.h - 12)));", after(TILT)],
    ["if (!el.matches(':focus-visible') || RM()) return;", after(" snd('ui.step', { pan: pan(el) }); SND()?.load('sig:' + el.dataset.id);")],
    ["st = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), type: e.pointerType, moved: false, hold: 0 };", before("snd('ui.press', { pan: pan(c.el) }); ")],
    ["else if (k === 'f' || k === 'F') { e.preventDefault();", after(" snd('card.flip');")],
    ["function flipLens() {\n    const p = I.print;\n    if (!p) return;", after(" snd('card.flip');")],
    ["S.you.push(id);\n    teamChanged();", after("\n    if (!silent) snd(S.you.length === SIZE ? 'team.complete' : 'team.add', from && !RM() ? {} : { offsetMs: 0 });")],
    ["S.you = S.you.filter((x) => x !== id);", after(" snd('team.remove');")],
    ["const why = S.you.length >= SIZE ? 'Team Full' : 'Over Budget';", after(" snd('team.refuse');")],
    ["if (RM() || !Ground.available) { go(); return; }", "if (RM() || !Ground.available) { snd('ui.tap'); go(); return; }"],
    // the lens's address is the card's own page here (/cards/<id>), not a folder under the page's <base>
    ["if (push) { history.pushState({ card: id }, '', `cards/${id}/`); I.pushed = true; }", "if (push) { history.pushState({ card: id }, '', `/cards/${id}`); I.pushed = true; } retitle();"],
    ["history.replaceState({ card: id }, '', `cards/${id}/`);", "history.replaceState({ card: id }, '', `/cards/${id}`); retitle();"],
    ["else history.replaceState(null, '', document.baseURI.replace(location.origin, '') + location.search + location.hash);", "else { history.replaceState(null, '', '/' + location.search + location.hash); retitle(); }"],
    ["location.pathname.replace(/cards\\/[^/]+\\/$/, '')", "location.pathname.replace(/\\/cards\\/[^/]+$/, '/')"],
    // the lens's frame row stays in the rounds: its buttons carry the design lanes' working names ("studio border lane,
    // studio2-before") and one unwrapped row of up to seven ran off both edges of a phone (release 11-07 ship checks);
    // every card prints its primary frame, so the frame printings never run and src/lib/cards.ts loads none of their code
    ['    frs.hidden = !F || F.length < 2;', '    frs.hidden = true;'],
    // the bare P key played from anywhere on the page (WCAG 2.1.4); it plays while focus is in the dock, where the Play
    // button announces it (aria-keyshortcuts)
    ["(e.key === 'p' || e.key === 'P') && !e.target.closest('input, textarea')", "(e.key === 'p' || e.key === 'P') && e.target.closest && e.target.closest('.dock')"],
    // a pack says "Rival: ..." and "Pack: ..." in the same instant, and each say() cleared the line the other had asked
    // for; the messages of one 30 ms window now go out as one line
    ["  const say = (text) => { const s = insStatus && root.classList.contains('inspecting') ? insStatus : status; status.textContent = ''; if (insStatus) insStatus.textContent = ''; setTimeout(() => (s.textContent = text), 30); };", "  let sayQ = [], sayT = 0;\n  const say = (text) => { const s = insStatus && root.classList.contains('inspecting') ? insStatus : status; status.textContent = ''; if (insStatus) insStatus.textContent = ''; sayQ.push(text); clearTimeout(sayT); let n = 0; const flush = () => { if (G.ritual && G.ritual.rival && n++ < 20) { sayT = setTimeout(flush, 30); return; } s.textContent = sayQ.join('. '); sayQ = []; }; sayT = setTimeout(flush, 30); };"],
    // a pack's last landing deals the rival a frame later (dealNext); the say above holds the pack's line until that hold
    // is over, so the pack and the rival are spoken as one line, not the rival's alone
    ["    const hold = { kind: 'deal', finish() {", "    const hold = { kind: 'deal', rival: true, finish() {"],
    // the rival's wells hold copies hidden from assistive technology (copyOf), so each filled well names its card
    ["      w.classList.toggle('full', !!id);\n    });\n    const g = $('.gauge');", "      w.classList.toggle('full', !!id);\n      if (id) { w.setAttribute('role', 'img'); w.setAttribute('aria-label', titleOf(id)); } else { w.removeAttribute('role'); w.removeAttribute('aria-label'); }\n    });\n    const g = $('.gauge');"],
    // the lens's arrow keys step to cards the wall has not scrolled to; the card that takes focus back comes into view
    ["      focusSoon(() => { if (!I.id) cards[id].el.focus({ preventScroll: true }); });", "      focusSoon(() => { if (!I.id) { const el = cards[id].el, r = el.getBoundingClientRect(); if (r.bottom <= 0 || r.top >= innerHeight) el.scrollIntoView({ block: 'nearest' }); el.focus({ preventScroll: true }); } });"],
    // reduced motion starts the page paused (Base.astro), and the boot call saved that as the visitor's own choice; only
    // the Pause key's press saves now
    ["  function setPaused(on) {", "  function setPaused(on, save) {"],
    ["    try { localStorage.setItem('ill-pause', on ? '1' : '0'); } catch (e) {}", "    if (save) try { localStorage.setItem('ill-pause', on ? '1' : '0'); } catch (e) {}"],
    // a lens that Forward reopened is on its own history entry too: leaving it steps back, as a pushed lens does, where
    // replaceState left two identical entries
    ["        if (I.pushed && history.state && history.state.card) history.back();", "        if (history.state && history.state.card) history.back();"],
    // the Machine view hides the lens (machine.css), so a card's history entry opens nothing there
    ["    if (id && cards[id]) openInspect(id, { push: false });", "    if (id && cards[id] && root.dataset.mode !== 'machine') openInspect(id, { push: false });"],
    // while the lens holds /cards/<id> the tab, the history entry and a bookmark carry that card page's own title
    // (Seo.astro: "<card> | Kevin Liu"); the wall's own title comes back when the address does
    ["  const titleOf = (id) => F[id].title;", after("\n  const TITLE0 = document.title;\n  const retitle = () => { const c = history.state && history.state.card; document.title = c && F[c] ? `${F[c].title} | ${TITLE0}` : TITLE0; };")],
    ["  addEventListener('popstate', (e) => {\n    const id = e.state && e.state.card;", "  addEventListener('popstate', (e) => {\n    retitle();\n    const id = e.state && e.state.card;"],
  ]),
  'public/ex/rituals.js': (t) => patch('rituals.js', t, [
    ["const win = M.win;", after(SND.replace(/\n  /g, '\n    '))],
    // the view-transition probe reads the battle page's stylesheets against that page's own <base>
    ["if (href && VT.test(await text(new URL(href, url)))) return true;", "if (href && VT.test(await text(new URL(href, new URL((html.match(/<base\\b[^>]*href=[\"']?([^\"' >]+)/i) || [])[1] || '', url))))) return true;"],
    // a reduced-motion pack adds its cards at once; it still answers with the reveal (INTEGRATION.md section 2)
    ["const ids = dealt || G.draw();\n        if (!ids) return;", after(" snd('pack.reveal', { cost: Math.min(4, cost(ids.at(-1))) });")],
    ["T.kind = 'deal';", before("{ const sh = SND()?.schedule(SND().dealCues()); const fin = T.finish; T.finish = () => { sh?.cancel(40); fin.call(T); }; } ")],
    ["T.kind = 'entry';", before("SND()?.schedule(SND().entryCues()); SND()?.music(null, { fadeMs: 600 }); ")],
    ["st.P = ghostPack();", after(" snd('pack.grab', { pan: pan(packEl) });")],
    ["tearTo(st.P, clamp((dx * st.P.dir) / st.P.r.w), st.P.dir, dy);", after(GRAIN)],
    ["const from = P.p, fdy = P.dy, dir = P.dir;", after(" snd('pack.reseal');")],
    ["const p0 = P.p, dy0 = P.dy;", after(" snd('pack.rip', { delayMs: ms });")],
    ["T.skip = true;\n      T.kind = 'pack';", before(REVEAL)],
    ["if (I.id && !I.closing) { if (id !== I.id) step(id); return; }", after(" if (!instant) { snd('card.lift'); snd('lift', { card: id }); }")],
    ["function step(id) {\n      while (I.jobs.length) I.jobs.shift()();", after(" snd('card.step');")],
    ["if (!I.shown) { finish(); return; }\n      I.jobs = [];", after(" snd('card.close');")],
  ]),
};

// Binary edits, the same contract for images: the Elo API captures end in a Lifecycle paragraph that names General
// Translation's email domain. Its heading and two lines (rows 760 to 830 of 900, white ground) are painted out; the
// battle's own crop of that capture (rows 463 to 747) is untouched.
const paintOut = (top, bottom) => async (buf) => {
  const img = sharp(buf), { width, height, format } = await img.metadata();
  if (width !== 1440 || height !== 900) throw new Error(`Elo capture is ${width}x${height}, expected 1440x900; recheck the painted rows`);
  const box = await sharp({ create: { width, height: bottom - top, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const out = img.composite([{ input: box, top, left: 0 }]);
  return format === 'webp' ? out.webp({ lossless: true }).toBuffer() : out.png().toBuffer();
};
const BINARY = {
  'public/battle/r3/media/elo/llms-txt.png': paintOut(760, 830),
  'public/battle/r3/media-moves/elo/mcp-server.webp': paintOut(760, 830),
};

// ---------- the scan: scripts/rules.mjs, the same rules the release guard reads dist with ----------

// ---------- run: read, transform and scan everything first; write only when nothing failed ----------
const LOCK = path.join(REPO, 'sync.lock.json');
const prev = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, 'utf8')) : { stages: {} };
const lock = { rounds: ROUNDS_GIT, head: null, pins: PIN, synced: null, stages: {} };
const problems = [];
const writes = [], removes = [];
// every file a TRANSFORMS, PHONE or BINARY patch names must be one a rule ships (checked after the stages)
const PATCHED = new Set([...Object.keys(TRANSFORMS), ...Object.keys(PHONE), ...Object.keys(BINARY)]);
const shipped = new Set();
let unpinned = 0;
for (const [stage, rules] of Object.entries(STAGES)) {
  const files = {};
  const pinned = blobsAt(PIN[stage], rules.map((r) => rel(ROUNDS, r.from)));
  if (!pinned) { problems.push(`${stage}: cannot read pinned commit ${PIN[stage]} in ${ROUNDS_GIT}`); continue; }
  for (const r of rules) {
    const where = `${stage}: ${rel(ROUNDS, r.from) || '.'} -> ${r.to}`;
    if (!fs.existsSync(r.from)) { problems.push(`${where}: missing source`); continue; }
    let picked;
    try { picked = r.files(walk(r.from).map((f) => rel(r.from, f))); } catch (e) { problems.push(`${where}: ${e.message}`); continue; }
    if (!picked.length) { problems.push(`${where}: matched no files`); continue; }
    for (const f of picked) {
      const src = path.join(r.from, f), dest = `${r.to}/${f}`;
      if (files[dest]) continue; // two rules may pick the same file
      if (PATCHED.has(dest)) shipped.add(dest);
      let buf = fs.readFileSync(src);
      // the file as it was at the stage's pin. A file the pin does not have (the frame SVGs were generated and committed
      // only after 30e69931) cannot be checked against it, so it ships only as the last lock recorded it
      const at = pinned.get(rel(ROUNDS, src));
      if (at === undefined) unpinned++;
      else if (at !== blobSha(buf)) { problems.push(`${dest}: ${rel(ROUNDS, src)} differs from the ${stage} pin ${PIN[stage]}`); continue; }
      try {
        if (TRANSFORMS[dest]) buf = Buffer.from(TRANSFORMS[dest](buf.toString('utf8')));
        if (PHONE[dest]) buf = Buffer.from(PHONE[dest](buf.toString('utf8')));
        if (BINARY[dest]) buf = await BINARY[dest](buf);
      } catch (e) { problems.push(`${dest}: ${e.message}`); continue; }
      for (const h of scanBuffer(dest, buf)) problems.push(`${dest}: ${h}`);
      if (at === undefined && !ADMIT && prev.stages[stage]?.list?.[dest]?.sha256 !== sha(buf)) problems.push(`${dest}: ${rel(ROUNDS, src)} is not in the ${stage} pin ${PIN[stage]} and is ${prev.stages[stage]?.list?.[dest] ? 'not the bytes the lock records' : 'new'} (look at it, then --admit-unpinned)`);
      files[dest] = { src: rel(ROUNDS, src), sha256: sha(buf), bytes: buf.length };
      const abs = path.join(REPO, dest);
      if (!(fs.existsSync(abs) && sha(fs.readFileSync(abs)) === files[dest].sha256)) writes.push([abs, buf]);
    }
  }
  // a file this stage shipped last time and no longer ships leaves the repo; nothing the sync never wrote is touched
  for (const dest of Object.keys(prev.stages[stage]?.list ?? {})) {
    // only a plain path inside a synced folder is ever removed, whatever the previous lock says
    if (!safeKey(dest)) { problems.push(`${dest}: sync.lock.json lists a path outside the synced folders; restore the lock (git checkout sync.lock.json)`); continue; }
    if (!files[dest] && fs.existsSync(path.join(REPO, dest))) removes.push(path.join(REPO, dest));
  }
  lock.stages[stage] = { files: Object.keys(files).length, bytes: Object.values(files).reduce((a, f) => a + f.bytes, 0), list: files };
}
// a patch whose file no rule shipped was never applied: the round renamed or dropped the file, and the fix it carried
// (or the paint-out of a capture, which no text scan can see) would be lost without a word
for (const key of PATCHED) if (!shipped.has(key)) problems.push(`${key}: a TRANSFORMS, PHONE or BINARY patch names this file, but no rule shipped it (renamed or dropped in the rounds?)`);
// the rounds' commits: one per stage, every tracked file checked against it above
lock.head = [...new Set(Object.values(PIN))].join(' + ');
for (const [stage, s] of Object.entries(lock.stages)) console.log(`${stage}: ${s.files} files, ${(s.bytes / 1e6).toFixed(1)} MB, pinned at ${PIN[stage]}`);
if (unpinned) console.log(`${unpinned} shipped files are not in their pinned commit; each ships only as the lock records it${ADMIT ? ' (--admit-unpinned: new bytes admitted)' : ''}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s); nothing was written. Fix them at the source or by a transform:`);
  for (const p of problems.slice(0, 40)) console.error(`  ${p}`);
  process.exit(1);
}
if (CHECK) {
  console.log(writes.length || removes.length ? `stale: ${writes.length} changed, ${removes.length} to remove (run pnpm sync)` : 'in sync');
  for (const [abs] of writes) console.log(`  changed ${path.relative(REPO, abs)}`);
  for (const abs of removes) console.log(`  remove  ${path.relative(REPO, abs)}`);
  process.exit(writes.length || removes.length ? 1 : 0);
}
for (const [abs, buf] of writes) { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(`${abs}.tmp`, buf); fs.renameSync(`${abs}.tmp`, abs); }
for (const abs of removes) fs.rmSync(abs);
// the lock changes only when the shipped files or the rounds' commit do, so a no-op rerun leaves no diff
const same = JSON.stringify(prev.stages) === JSON.stringify(lock.stages) && prev.head === lock.head && JSON.stringify(prev.pins) === JSON.stringify(lock.pins);
if (!same) { lock.synced = new Date().toISOString(); fs.writeFileSync(`${LOCK}.tmp`, JSON.stringify(lock, null, 1) + '\n'); fs.renameSync(`${LOCK}.tmp`, LOCK); }
console.log(`synced from ${lock.head ?? 'a folder without git'}: ${writes.length} written, ${removes.length} removed${same ? ', lock unchanged' : ''}`);

// path -> git blob id of every file under `dirs` at `commit`, or null when the rounds' checkout cannot answer
function blobsAt(commit, dirs) {
  try {
    const prefix = execFileSync('git', ['-C', ROUNDS_GIT, 'rev-parse', '--show-prefix'], { encoding: 'utf8' }).trim();
    const out = execFileSync('git', ['-C', ROUNDS_GIT, 'ls-tree', '-r', '-z', '--full-tree', commit, '--', ...dirs.map((d) => prefix + d)], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const m = new Map();
    for (const line of out.split('\0').filter(Boolean)) { const [meta, f] = line.split('\t'); m.set(f.slice(prefix.length), meta.split(' ')[2]); }
    return m;
  } catch { return null; }
}
function blobSha(buf) { return createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex'); }
