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
import sharp from 'sharp';
import { MEDIA, hasLocation } from './location.mjs';
import { PHONE } from './phone-memory.mjs';

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
    { from: EX, to: 'public/ex', files: (l) => l.filter((f) => CARD_MEDIA.test(f) || f === 'media/prototemplate/window@2x.webp') },
    { from: EX, to: 'public/ex', files: (l) => l.filter((f) => /^(borders\/[\w-]+\/(border|over|trim)\.svg|fx\/[\w-]+\/fx\.svg|design\/(frames|lit|fxcut)\/[\w.-]+\.svg|icons\/frost(@2x)?\.webp)$/.test(f)) },
    { from: `${EX}/og`, to: 'public/og', files: (l) => l.filter((f) => /^[\w-]+\.(jpg|mp4)$/.test(f)) },
    // everything the round's own page loads and prints: its sheets and scripts, the card families markup.js prints
    // through at build (design/card.js, design/plan.gen.js), and every file those name (pageFiles below). A file the round
    // adds to its page ships with no new rule here, so the wall never falls back to plain cards again.
    { from: EX, to: 'public/ex', files: pageFiles },
    // the round page's head alone (its sheets and scripts, in order): src/lib/cards.ts loads the same list
    { from: EX, to: 'vendor/ex', files: only('index.html') },
    { from: EX, to: 'vendor/ex', files: only('face.gen.js', 'bands.json', 'fonts/OFL.txt', 'vendor/neu-tokens.css', 'icons/icons.svg', 'icons/card-symbols.svg', 'icons/icons.js', 'tools/wall-rule.mjs', 'roster/battle-roster.json', 'copy/overrides.json') },
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
  const head = html.slice(0, html.indexOf('</head>'));
  return [...head.matchAll(/<link rel="stylesheet" href="([^"]+)"[^>]*>|<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)].map((m) => m[1] ?? m[2]);
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
  return [...out].sort();
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
const TRANSFORMS = {
  // the round page's head only, for src/lib/cards.ts: its body prints every card, which the site prints itself
  'vendor/ex/index.html': (t) => pageHead(t).map((f) => (/\.css$/.test(f) ? `<link rel="stylesheet" href="${f}"${/data-card-style-sheet/.test(t.slice(t.indexOf(`href="${f}"`), t.indexOf('>', t.indexOf(`href="${f}"`)))) ? ' data-card-style-sheet' : ''}>` : `<script defer src="${f}"></script>`)).join('\n') + '\n',
  // the battle page lives at /battle and /battle/arena here, and returns to the cards at /
  'public/battle/shared/battle.js': (t) => patch('battle.js', t, [
    // the layout switch renames the tab; it keeps this site's page titles instead
    ["const TITLES = { mat: 'Card Mat', arena: 'Arena' };", "const TITLES = { mat: 'Battle | Kevin Liu', arena: 'Battle, Arena | Kevin Liu' };"],
    ["/\\/arena\\//.test(location.pathname)", "/\\/arena(\\/|$)/.test(location.pathname)"],
    ["return `../../../r3/cards/index.html${p}`;", "return `/${p}`;"],
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
  // the battle's wordmark is this page's h1 (src/lib/battle.ts); on phones it leaves the layout but stays in the
  // accessibility tree
  // a key's raise and colour change at once; only its press moves (transform), so no frame repaints a shadow
  'public/battle/mat/mat.css': (t) => patch('mat.css', t, [['  .mark { display: none; }', HIDE], [KEY_EASE, KEY_MOVE]]),
  // at 320 px the Arena's team rail (two teams of pips and the turn) was 33 px wider than the rail, and the grid column
  // it shares with the keys grew with it, so Leave slid off screen: the column holds the rail's width, and the pips and
  // gaps tighten until the team rail fits
  'public/battle/arena/arena.css': (t) => patch('arena.css', everyOf('arena.css', t, '  .mark { display: none; }', HIDE, 2), [
    ['/* ============================================================ reduced motion: every step a still */', before(NARROW_ARENA)],
    [KEY_EASE, KEY_MOVE],
  ]),
  // the lens's Visit link gets its address when a card opens; a placeholder "#" would resolve against <base> to /ex/
  'public/ex/markup.js': (t) => patch('markup.js', t, [['<a class="press visit" target="_blank" rel="noopener" href="#">', '<a class="press visit" target="_blank" rel="noopener">']]),
  // on a phone the floating tray is as wide as what it holds; a card with three art printings ran its row past the
  // screen's edge (Agent Machines, release 11-07 ship checks), so the tray stops 8 in from each edge and its rows wrap
  'public/ex/ui.css': (t) => patch('ui.css', t, [['  .acts { position: fixed; left: 50%; bottom: max(8px, env(safe-area-inset-bottom)); translate: -50% 0; margin: 0; z-index: 2; background: none; box-shadow: none; }\n', after('  .acts { width: max-content; max-width: calc(100vw - 16px); justify-content: center; }\n  .arts { flex: 0 1 auto; flex-wrap: wrap; justify-content: center; min-width: 0; }\n')]]),
  // family K's rule under each power's name is set 4.9cqw down its row, and WebKit sets the row's first text line higher
  // than Chromium does, so in Safari the rule struck through that line (release 11-07 ship checks); the rule is left out.
  // Family B bands each description line, and in WebKit the first line's band rose 4 px over the bottom of the power's
  // name and points above it (Claude of Tanks' "Sabot Round"); the description sits 1.2cqw lower, the row grows to fit
  'public/ex/card.css': (t) => patch('card.css', t, [
    ['background: linear-gradient(color-mix(in oklab, var(--k) 82%, transparent), color-mix(in oklab, var(--k) 82%, transparent)) 2.4cqw 4.9cqw / calc(100% - 4.8cqw) 0.3cqw no-repeat,\n    linear-gradient(', 'background: linear-gradient('],
    ['.card.dz[data-fam="B"] .mp { margin-right: -1.2cqw; }\n', after('.card.dz[data-fam="B"] .move .md { margin-top: 1.2cqw; }\n')],
  ]),
  // the gallery's music loop is left out: sound answers the visitor's own actions (docs/sound.md)
  'public/sound/boot.gallery.js': (t) => patch('boot.gallery.js', t, [[/^Sound\.music\('mus\.gallery'.*\n/m.exec(t)?.[0] ?? '<none>', '']]),
  'public/ex/gallery.js': (t) => patch('gallery.js', t, [
    ["const BATTLE = new URL($('meta[name=\"battle\"]').content, document.baseURI).href;", after(SND + "\n  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('a, button'); if (b && !b.closest('.card, #pause, #sound, [data-mode-set], #play, #pack, .addbtn, .close')) snd('ui.tap'); });")],
    ["if (b) setMode(b.dataset.modeSet); });", "if (b) { snd('ui.mode'); setMode(b.dataset.modeSet); } });"],
    ["pauseBtn.addEventListener('click', () => setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true'));", "pauseBtn.addEventListener('click', () => { snd('ui.toggle'); setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true'); });"],
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
    ["if (push) { history.pushState({ card: id }, '', `cards/${id}/`); I.pushed = true; }", "if (push) { history.pushState({ card: id }, '', `/cards/${id}`); I.pushed = true; }"],
    ["history.replaceState({ card: id }, '', `cards/${id}/`);", "history.replaceState({ card: id }, '', `/cards/${id}`);"],
    ["else history.replaceState(null, '', document.baseURI.replace(location.origin, '') + location.search + location.hash);", "else history.replaceState(null, '', '/' + location.search + location.hash);"],
    ["location.pathname.replace(/cards\\/[^/]+\\/$/, '')", "location.pathname.replace(/\\/cards\\/[^/]+$/, '/')"],
    // the lens's frame row stays in the rounds: its buttons carry the design lanes' working names ("studio border lane,
    // studio2-before") and one unwrapped row of up to seven ran off both edges of a phone (release 11-07 ship checks);
    // every card prints its primary frame
    ['    frs.hidden = !F || F.length < 2;', '    frs.hidden = true;'],
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
    const where = MEDIA.test(dest) && hasLocation(buf);
    if (where) hits.push(where);
  }
  return hits;
}

// ---------- run: read, transform and scan everything first; write only when nothing failed ----------
const LOCK = path.join(REPO, 'sync.lock.json');
const prev = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, 'utf8')) : { stages: {} };
const lock = { rounds: ROUNDS, head: null, synced: null, stages: {} };
const problems = [];
const writes = [], removes = [];
for (const [stage, rules] of Object.entries(STAGES)) {
  const files = {};
  for (const r of rules) {
    const where = `${stage}: ${rel(ROUNDS, r.from) || '.'} -> ${r.to}`;
    if (!fs.existsSync(r.from)) { problems.push(`${where}: missing source`); continue; }
    let picked;
    try { picked = r.files(walk(r.from).map((f) => rel(r.from, f))); } catch (e) { problems.push(`${where}: ${e.message}`); continue; }
    if (!picked.length) { problems.push(`${where}: matched no files`); continue; }
    for (const f of picked) {
      const src = path.join(r.from, f), dest = `${r.to}/${f}`;
      if (files[dest]) continue; // two rules may pick the same file
      let buf = fs.readFileSync(src);
      try {
        if (TRANSFORMS[dest]) buf = Buffer.from(TRANSFORMS[dest](buf.toString('utf8')));
        if (PHONE[dest]) buf = Buffer.from(PHONE[dest](buf.toString('utf8')));
        if (BINARY[dest]) buf = await BINARY[dest](buf);
      } catch (e) { problems.push(`${dest}: ${e.message}`); continue; }
      for (const h of scan(dest, buf)) problems.push(`${dest}: ${h}`);
      files[dest] = { src: rel(ROUNDS, src), sha256: sha(buf), bytes: buf.length };
      const abs = path.join(REPO, dest);
      if (!(fs.existsSync(abs) && sha(fs.readFileSync(abs)) === files[dest].sha256)) writes.push([abs, buf]);
    }
  }
  // a file this stage shipped last time and no longer ships leaves the repo; nothing the sync never wrote is touched
  for (const dest of Object.keys(prev.stages[stage]?.list ?? {})) if (!files[dest] && fs.existsSync(path.join(REPO, dest))) removes.push(path.join(REPO, dest));
  lock.stages[stage] = { files: Object.keys(files).length, bytes: Object.values(files).reduce((a, f) => a + f.bytes, 0), list: files };
}
// the rounds' commit, marked only when a file this sync ships differs from it (other rounds' scratch work does not count)
lock.head = gitHead(ROUNDS, new Set(Object.values(lock.stages).flatMap((s) => Object.values(s.list).map((f) => f.src))));
for (const [stage, s] of Object.entries(lock.stages)) console.log(`${stage}: ${s.files} files, ${(s.bytes / 1e6).toFixed(1)} MB`);
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
const same = JSON.stringify(prev.stages) === JSON.stringify(lock.stages) && prev.head === lock.head;
if (!same) { lock.synced = new Date().toISOString(); fs.writeFileSync(LOCK, JSON.stringify(lock, null, 1) + '\n'); }
console.log(`synced from ${lock.head ?? 'a folder without git'}: ${writes.length} written, ${removes.length} removed${same ? ', lock unchanged' : ''}`);

function gitHead(dir, shipped) {
  try {
    const head = execFileSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
    // porcelain paths are relative to the repo's top, which may sit above the rounds folder
    const prefix = execFileSync('git', ['-C', dir, 'rev-parse', '--show-prefix'], { encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['-C', dir, 'status', '--porcelain', '--untracked-files=no', '-z', '--', '.'], { encoding: 'utf8', maxBuffer: 1 << 28 })
      .split('\0').filter(Boolean).map((l) => l.slice(3)).filter((f) => f.startsWith(prefix) && shipped.has(f.slice(prefix.length)));
    return head + (dirty.length ? ` (with ${dirty.length} uncommitted shipped file${dirty.length > 1 ? 's' : ''})` : '');
  } catch { return null; }
}
