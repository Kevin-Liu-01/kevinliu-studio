// The battle page, one for both modes. One engine (the battle's own, vendor/broadcast/kit.js), the Broadcast's Stage,
// grammar, effects and every scene file, the Director with the seam (runtime.js), one shot plan (plan.js), the console,
// the matte HUD, the cut-in, the Log and the result. Under the Stage sits one stage layout at a time: the Mat (six
// cards on a clay mat) or the Arena (the leaders and their cards on a dimetric dais). The page talks to a layout only
// through the seam: prepare, mount, set, land, flush, cue, anchor, skip, hold, unmount and layout (MODES.md section 2).
// Switching modes is an unmount, a mount and a set(view) in one frame under the 4x4 Bayer dissolve (section 5).
import { install, Stage, Director, boardShort } from './runtime.js';
import { createStore, createPlan, words, STATWORD } from './plan.js';
import { leaderData, leadersFor, faceOf, POSE } from './leaders.js';

/** Each layout's code and sheet, loaded once: the mode on screen at boot, the other once the battle is under way. */
const MODES = { mat: () => import('../mat/board.js').then((m) => m.MatBoard), arena: () => import('../arena/board.js').then((m) => m.ArenaBoard) };
const loaded = {};
function layoutOf(name) {
  loaded[name] ??= Promise.all([MODES[name](), new Promise((done) => {
    let l = document.querySelector(`link[data-mode="${name}"]`);
    if (!l) { l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL(`../${name}/${name}.css`, import.meta.url).href; l.dataset.mode = name; l.media = 'not all'; document.head.append(l); }
    if (l.sheet) done(); else { l.addEventListener('load', done, { once: true }); l.addEventListener('error', done, { once: true }); }
  })]).then(([Layout]) => Layout);
  return loaded[name];
}
const TITLES = { mat: 'Battle | Kevin Liu', arena: 'Battle, Arena | Kevin Liu' };
const K = window.bcKit;
const sd = window.showdown;
const { runtime, engine } = sd;
const $ = (s) => document.querySelector(s);
const el = (tag, cls, parent, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; parent?.append(e); return e; };
const app = $('#app');
const q = new URLSearchParams(location.search);
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reducedQuery.matches || q.get('reduced') === '1';
if (reduced()) document.documentElement.dataset.reduced = 'true';
// the window's width, read when it changes: reading innerWidth mid-turn makes the page lay itself out at once
let VW = innerWidth;
addEventListener('resize', () => { VW = innerWidth; });
const narrow = () => VW < 720;
const title = (id) => engine.fighterDef(id).title;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const frozen = () => q.get('frozen') === '1' || q.get('gpu') === '0';

// ============================================================ the gallery's ground: only the battle's programs
// The gallery's ground (vendor/cards/ground.js) links a program for every card it knows (eighteen) in one task when it
// starts. The battle prints only its own six cards live, so it sees only theirs: a third of that task.
const groundCards = new Set();
(() => {
  let all = globalThis.GROUND_PROGRAMS;
  const seen = (o) => new Proxy(o, { get: (t, k) => (typeof k !== 'string' || groundCards.has(k) ? t[k] : undefined), has: (t, k) => groundCards.has(k) && k in t, ownKeys: (t) => Reflect.ownKeys(t).filter((k) => groundCards.has(k)), getOwnPropertyDescriptor: (t, k) => (groundCards.has(k) ? Reflect.getOwnPropertyDescriptor(t, k) : undefined) });
  Object.defineProperty(globalThis, 'GROUND_PROGRAMS', { configurable: true, get: () => (all ? seen(all) : all), set: (v) => { all = v; } });
})();

// ============================================================ the runtime: effects and scenes, the Stage, the matte HUD
install(K, engine, q.get('scenes') === 'three' ? K.SCENES.filter((d) => /^(claude-of-tanks|jarhead|katagami)\//.test(d.id)) : K.SCENES);
const media = runtime.createMedia(window.BROADCAST_MEDIA, window.MAT_BATTLE_BASE);
const shaderOn = q.get('gpu') !== '0' && q.get('shader') !== '0';
const stage = new Stage($('#stage'), { media, input: false, shaderGrounds: shaderOn, fit: (ref) => (narrow() || ref.kind === 'image' ? 'contain' : 'cover') });
K.ensureSprite();
// The gallery's ground (the live prints of the cards) starts its WebGL context in one long task: never during the deal
// or the entrances. It starts once the board waits for a command and the page is idle; until then every card, the
// scenes' dealt cards included, prints from its poster, which is its live print's first frame.
K.setLive(false);
let groundG = null, groundAsked = false;
function groundAtRest() {
  if (groundG || groundAsked || frozen() || reduced()) return;
  groundAsked = true;
  const idle = (f) => (window.requestIdleCallback ? requestIdleCallback(f) : setTimeout(f, 200));
  idle(() => {
    groundAsked = false;
    if (!match || busy || auto || match.state.phase === 'over') return;
    K.setLive(true);
    K.ground().then((G) => { groundG = G; if (G) layout?.ground?.(G); });
  });
}
const topBar = stage.root.querySelector('.sd-bar-top');
// both actives' HP ride the top matte during every scene (Broadcast's, main.ts 152) and drop at the impact
const mhud = (() => {
  const box = el('div', 'bc-mhud', topBar);
  const tags = {};
  for (const s of ['player', 'rival']) {
    const t = el('div', 'bc-mhud-tag', box);
    t.dataset.side = s;
    const name = el('b', 'bc-mhud-name', t);
    const hp = el('div', 'bc-mhud-hp', t);
    const ghost = el('i', 'bc-mhud-ghost', hp);
    const fill = el('i', 'bc-mhud-fill', hp);
    tags[s] = { t, name, ghost, fill, num: el('b', 'bc-mhud-num', t) };
  }
  return { box, tags, turn: el('b', 'bc-mhud-turn', box) };
})();
function drawMhud(v) {
  if (!v) return;
  mhud.turn.textContent = String(v.turn);
  for (const s of ['player', 'rival']) {
    const f = v.sides[s].team[v.sides[s].active];
    const m = mhud.tags[s];
    if (!f) continue;
    m.t.style.setProperty('--c', K.accent(f.id));
    if (m.name.textContent !== title(f.id)) m.name.textContent = title(f.id);
    m.fill.style.transform = m.ghost.style.transform = `scaleX(${f.maxHp ? f.hp / f.maxHp : 0})`;
    if (m.num.textContent !== String(f.hp)) m.num.textContent = String(f.hp);
  }
}
// The commanding leader's cut-in: the moment that ties commander to card. For every full attack, on every screen, the
// leader steps into the frame on its own side in its command pose (the rival's front, yours from behind), large (2, 1.5 or 1 css px per atlas px at
// whole device pixels), its name and title under it, and holds there until the contact, which belongs to the card.
// Where it stands is the layout's (cutinAt): the Arena puts it in the top corner on its side, over the top matte; the
// Mat beside the band a scene is staged in, on its side of the table. It never lies over the call-out, which every
// scene keeps on the bottom edge of its frame. Any line a leader says while a scene holds the screen rides its side's
// cut-in on a wide screen (on a phone the console's line carries it).
const cutins = {};
let staging = null;
/** The cut-in's scale: whole device pixels per atlas pixel. */
function cutinK() {
  const dpr = devicePixelRatio || 1, want = VW >= 1280 ? 2 : VW >= 720 ? 1.5 : 1;
  return Math.max(1, Math.floor(want * dpr + 1e-6)) / dpr;
}
function cutin(side, text = '', hideAt = 2200, face = true) {
  const c = cutinSet(side, text, face);
  if (!c) return false;
  c.style.opacity = '1';
  const dx = side === 'player' ? -36 : 36;
  c.animate([{ opacity: 0, transform: `translate3d(${dx}px,0,0)` }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.1,1)' });
  c.t = setTimeout(() => cutout(side), Math.max(600, hideAt));
  return true;
}
/** A cut-in set in its place, unseen: the face, the name, the line and where it stands (it reads its size once). The
 *  'prepared' phase sets it while the pre-roll runs, so the scene's first frame only shows it; a set that still holds
 *  (same side, line and face) is not set again. */
function cutinSet(side, text = '', face = true) {
  const id = leadersNow[side === 'player' ? 0 : 1], t = leaderData(id);
  if (!t || reduced()) return null;
  let c = cutins[side];
  const key = `${id}|${text}|${face}|${staging?.rect?.top ?? ''}|${VW}`;
  if (c && c.ready === key && c.style.opacity === '0') { clearTimeout(c.t); c.getAnimations().forEach((a) => a.cancel()); return c; }
  if (!c) {
    c = cutins[side] = el('div', 'cutin', app);
    c.dataset.side = side;
    c.face = el('i', 'cutin-face', c);
    const p = el('p', '', c);
    c.name = el('b', '', p); c.line = el('span', '', p);
  }
  // the rival's front command and your back command: each points across at the other, as on the board
  const pose = side === 'player' ? POSE.rearCommand : POSE.command;
  const f = faceOf(id, cutinK(), pose);
  c.dataset.pose = String(pose);
  c.style.setProperty('--accent', t.accent);
  Object.assign(c.face.style, { backgroundImage: f.image, backgroundSize: f.size, backgroundPosition: f.position, width: `${f.w}px`, height: `${f.h}px` });
  c.dataset.face = face ? 'true' : 'false';
  c.name.textContent = `${t.name}, ${t.title}`;
  c.line.textContent = text;
  c.dataset.line = text ? 'true' : 'false';
  // where it stands: the layout's place for it, or the top corner on its side
  c.style.transform = 'none';
  const b = c.getBoundingClientRect();
  const at = layout?.cutinAt?.(side, b.width, b.height, staging?.rect ?? null) ?? { x: side === 'player' ? 16 : VW - 16 - b.width, y: 12 };
  // placed by `translate`, never left and top: a cut-in taking its place never shifts the page's layout
  c.style.translate = `${Math.round(at.x)}px ${Math.round(at.y)}px`;
  clearTimeout(c.t);
  c.getAnimations().forEach((a) => a.cancel());
  c.style.opacity = '0';
  c.ready = key;
  return c;
}
/** The leader steps back out of the frame. */
function cutout(side, now = false) {
  const c = cutins[side];
  if (!c || c.style.opacity === '0') return;
  clearTimeout(c.t);
  c.style.opacity = '0';
  if (!now && !reduced()) c.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate3d(${side === 'player' ? -24 : 24}px,0,0)` }], { duration: 160, easing: 'cubic-bezier(.4,0,1,1)' });
}
/** A leader's line: the console's line on a phone, the cut-in while a scene holds the screen, else its plate. */
function onQuote(qt) {
  if (narrow()) { say(`${qt.name}: ${qt.text}`, 2200); return false; }
  if (!staging || staging.box) return true;
  if (staging.started) return !cutin(qt.side, qt.text, 2200, cutins[qt.side]?.dataset.face === 'true' && cutins[qt.side].style.opacity !== '0');
  if (qt.side !== staging.side) return true;
  staging.line = qt.text;
  return false;
}

// ============================================================ the battle's state
let match = null, view = null, busy = false, auto = false, gen = 0, panel = null, kitItem = null, lastShot = null;
let leadersNow = [], mapNow, said = new Set();
const logLines = [];
const store = createStore();
const plan = createPlan(store, { specials: q.get('specials') !== 'off', repeats: q.get('repeats') !== 'off' });
const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
let mode = MODES[hashParams.get('mode')] ? hashParams.get('mode') : /\/arena(\/|$)/.test(location.pathname) ? 'arena' : 'mat';
let layout = null, switching = null;

// ============================================================ instrumentation the tests read, only with ?debug
// (window.__battle and its names __mat and __arena, window.__battleApi, and the capture hook window.__hold)
const DEBUG = q.has('debug');
const M = { lands: [], shots: [], impacts: [], errors: [], phase: 'boot', firstCommandAt: 0, resultAt: 0, batches: 0, switches: [] };
if (DEBUG) {
  window.__battle = window.__mat = window.__arena = M;
  addEventListener('error', (e) => M.errors.push(String(e.message)));
  addEventListener('unhandledrejection', (e) => M.errors.push(String(e.reason)));
}
/** The HP each side's board shows now, read from the board's own figures (each layout marks them). */
M.hpShown = () => Object.fromEntries(['player', 'rival'].map((s) => [s, $(`#board [data-hp-shown="${s}"]`)?.textContent ?? '']));

// ============================================================ the stage layout, behind the seam
function ctxFor(dealing) {
  return {
    view, dealing, leaders: leadersNow, map: mapNow, rail: $('#team'), said,
    events: () => match?.events ?? [], cardOf: (uid) => match?.cardOf(uid) ?? uid, title, reduced, frozen, auto: () => auto,
    // a turn is under way (a batch plays, or Auto runs on): a phone's mat takes the room the console leaves
    turn: () => Boolean(match) && match.state.phase !== 'over' && (busy || auto),
    // the gallery's ground once the page has started it (null until the board first waits for a command)
    ground: () => groundG,
    onQuote,
    onBench: (slot) => { if (match?.mustReplace) { if (!busy) present(match.replace(slot)); return; } if (!busy && match?.state.phase === 'command') openPanel('switch', slot); },
    onKit: () => { if (!busy && match?.state.phase === 'command') openPanel('kit'); },
  };
}
/** Load what the next layout draws, then hand back the swap: unmount, mount and set(view), one frame. */
async function nextLayout(name, dealing) {
  const next = new (await layoutOf(name))();
  const c = ctxFor(dealing);
  await next.prepare(c);
  const swapIn = () => {
    for (const l of document.querySelectorAll('link[data-mode]')) l.media = l.dataset.mode === name ? 'all' : 'not all';
    layout?.unmount();
    layout = next; mode = name;
    document.title = TITLES[name];
    for (const m of Object.keys(MODES)) $(`#mode-${m}`).setAttribute('aria-pressed', String(m === name));
    next.mount($('#board'), c);
  };
  const done = () => { next.set(view); M.mode = name; };
  // the boot's swap, while the page is still unseen: the mount in one task and the board's layout in the next, so
  // neither is a long task (a mode switch swaps in one frame under its dissolve)
  const swap = () => { swapIn(); done(); };
  swap.steps = async () => { c.split = true; swapIn(); await yieldTask(); done(); };
  return swap;
}
/** A new task at once (a message, never a clamped timer). */
const yieldTask = () => new Promise((r) => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
/** The other mode, under the 280 ms 4x4 Bayer dissolve (none under reduced motion). The match, the Director, Auto,
 *  the console and the Stage go on untouched: a scene playing keeps playing over the new board. */
async function setMode(name) {
  if (name === mode || switching || !match) return;
  const t0 = performance.now();
  switching = (async () => {
    const swap = await nextLayout(name, false);
    const at = performance.now();
    const vt = !reduced() && document.startViewTransition ? document.startViewTransition(swap) : null;
    if (!vt) swap();
    else {
      await vt.ready.catch(() => {});
      const frames = Array.from({ length: 17 }, (_, i) => { const m = i >= 16 ? 'none' : K.MASKS[i]; return { offset: i / 16, maskImage: m, WebkitMaskImage: m }; });
      document.documentElement.animate(frames, { duration: 280, easing: 'linear', fill: 'both', pseudoElement: '::view-transition-new(root)' });
    }
    M.switches.push({ to: name, prepareMs: Math.round(at - t0), at: performance.now() });
    $(`#mode-${name}`).focus({ preventScroll: true });
    history.replaceState(null, '', withMode(location.hash, name));
    await vt?.finished.catch(() => {});
  })();
  await switching;
  switching = null;
}
const withMode = (h, name) => (/[#&]mode=/.test(h) ? h.replace(/([#&])mode=\w+/, `$1mode=${name}`) : `${h || '#'}&mode=${name}`);
const otherMode = () => (mode === 'mat' ? 'arena' : 'mat');
/** Once the battle is under way: every card's room (a send-in shows its world) and the other mode's code, sheet and
 *  pictures, so a switch is a swap, not a fetch. */
let warmed = false;
function warmOther() {
  if (warmed || !match) return;
  warmed = true;
  for (const id of [...match.team, ...match.rival]) { const im = new Image(); im.decoding = 'async'; im.src = K.groundOf(id); }
  layoutOf(otherMode()).then((L) => new L().prepare(ctxFor(false))).catch(() => {});
}

/** The media of every move the two cards in play may use next (the plan's variant for a first use), loaded behind the
 *  turn that just ended so the next turn's first scene never waits for its footage. Only once the battle is under way:
 *  the boot loads nothing the first command does not need. */
function warmAhead() {
  if (!view || !match || match.state.phase === 'over') return;
  const active = (side) => view.sides[side].team[view.sides[side].active];
  const list = [];
  for (const side of ['player', 'rival']) {
    const f = active(side), foe = active(side === 'player' ? 'rival' : 'player');
    if (!f || f.hp <= 0) continue;
    engine.fighterDef(f.id).moves.forEach((mv, index) => list.push({ kind: 'attack', side, card: f.id, target: foe?.id, move: { index }, variant: reduced() ? 'reduced' : 'short' }));
  }
  stage.ahead(list);
}

// ============================================================ the Director, with the seam
const STILL_BEATS = new Set(['ko', 'switch', 'item']), STILL_BEAT = 360;
const director = new Director(stage, {
  cardOf: (uid) => match.cardOf(uid), titleOf: title, reduced, session: store.session, seen: () => store.seen, plan,
  shaderGrounds: shaderOn, hold: DEBUG ? (shot) => window.__hold?.(shot) : null, // a test hook: a capture can stop between pre-roll and scene
  hooks: {
    event: onEvent,
    // the layout may stage a scene in a band over its board (the Mat: first uses and minor beats on the mat)
    box: (shot) => layout.stageBox?.(shot) ?? null,
    before: (shot) => layout.cue(shot.verbs.pre, shot, 'pre'),
    // the source is read once, before the scene plays; the target only if an effect asks for it
    anchors: (shot) => {
      const l = layout, foe = shot.scene.side === 'player' ? 'rival' : 'player';
      let target;
      return { source: l.anchor('source', shot.scene.side), get target() { return (target ??= l.anchor('target', foe)); } };
    },
    shot: onShot,
    // a short attack's settle under Auto overlaps the next shot; anything else is awaited within its budget
    // the scene has ended: what a leader says now (the result's lines) belongs on the board
    // a cut holds its contact 120 ms before the next shot may move the camera
    // under reduced motion a beat the board carries alone (a cut, a knockout, a send-in, an item) holds still as long
    // as it would move, so the battle keeps its pace and each state can be read
    after: (shot) => {
      staging = null;
      const p = layout.cue(shot.verbs.land, shot, 'post');
      if (reduced() && shot.variant === 'off' && (shot.cut || STILL_BEATS.has(shot.scene.kind))) return Promise.all([p, new Promise((r) => setTimeout(r, STILL_BEAT))]);
      return shot.board && auto && !shot.cut ? undefined : p;
    },
    flush: (shot) => layout.flush(shot),
    // the deciding blow's hit-stop: the board's reaction holds on its first frame (the contact) as the scene does
    stop: (shot, ms) => { if (reduced()) return; const l = layout; l.hold(true); setTimeout(() => l.hold(false), ms); },
  },
});

// ============================================================ events land: the board, the matte HUD, the Log
function logOf(e) {
  const who = (uid) => title(match?.cardOf(uid) ?? uid);
  switch (e.kind) {
    case 'hit': return { turn: e.turn, text: `${e.move.name} ${e.damage} to ${who(e.target)}${e.crit ? ', critical' : ''}${e.hits > 1 ? `, ${e.hits} hits` : ''}`, receipt: words(e.receipt.line) };
    case 'miss': return { turn: e.turn, text: `${e.move.name} missed ${who(e.target)}` };
    case 'effect': { const l = e.effect === 'heal' || e.effect === 'drain' ? `+${e.amount} HP` : e.effect === 'barrier' ? 'Barrier' : e.effect === 'recoil' ? `−${e.amount} HP` : e.effect === 'critUp' ? 'Crit Up' : `${STATWORD[e.effect.slice(0, 3).toUpperCase()] ?? e.effect} +${e.amount}`; return { turn: e.turn, text: `${who(e.fighter)} ${l}` }; }
    case 'status': return e.change === 'continue' ? null : { turn: e.turn, text: `${who(e.fighter)} ${e.status === 'stun' ? 'stunned' : e.status} ${e.change === 'applied' ? '' : e.change}${e.damage ? ` −${e.damage} HP` : ''}`.trim() };
    case 'trait': return { turn: e.turn, text: `${who(e.fighter)}: ${e.trait}${e.detail ? ` ${words(e.detail)}` : ''}` };
    case 'switch': return { turn: e.turn, text: `${e.side === 'player' ? 'You' : 'Rival'}: ${title(e.card)} ${e.reason === 'lead' ? 'leads' : 'in'}` };
    case 'ko': return { turn: e.turn, text: `${title(e.card)} is out` };
    case 'guard': return { turn: e.turn, text: `${who(e.fighter)} guards` };
    case 'item': return { turn: e.turn, text: `${e.name} on ${who(e.target)} ${words(e.detail)}` };
    case 'result': return { turn: e.turn, text: e.winner === 'draw' ? 'Draw' : e.winner === 'player' ? 'Victory' : 'Defeat' };
    default: return null;
  }
}
function onEvent(e) {
  if (e.state) view = e.state;
  M.lands.push(e.id);
  layout.land(e, view);
  drawMhud(view);
  const l = logOf(e);
  if (l) logLines.push(l);
  const who = (uid) => title(match?.cardOf(uid) ?? uid);
  if (e.kind === 'hit') live(`${e.move.name}, ${e.damage} to ${who(e.target)}.`);
  else if (e.kind === 'miss') live(`${e.move.name} missed.`);
  else if (e.kind === 'switch' && e.reason !== 'lead') live(`${title(e.card)} in for ${e.side === 'player' ? 'you' : 'the rival'}.`);
  else if (e.kind === 'ko') live(`${title(e.card)} is out.`);
}
function onShot(shot, phase) {
  const s = shot.scene;
  const v = shot.verbs;
  switch (phase) {
    case 'plan':
      shot.rec = { kind: s.kind, card: s.card, move: s.move?.id, variant: shot.variant, board: shot.board, framing: shot.framing ?? '', cut: Boolean(shot.cut), finish: Boolean(shot.finish), stops: shot.stops, t: performance.now(), duration: shot.compiled.duration, impact: shot.compiled.impact };
      M.shots.push(shot.rec);
      // every full attack brings its leader on; a scene in a band leaves the leaders' lines on the board
      staging = shot.variant === 'full' || shot.variant === 'short' ? { side: s.side, started: false, line: '', box: Boolean(shot.box), rect: shot.box, face: s.kind === 'attack' && shot.variant === 'full' } : null;
      return;
    case 'prepared':
      // while the pre-roll runs: the scene's look and its cut-in, set unseen (the first frame only shows them)
      dress(s, shot.compiled);
      shot.dressed = true;
      if (staging?.face && cutins[staging.side]?.style.opacity !== '1') cutinSet(staging.side, staging.line, true);
      return;
    case 'start':
      if (shot.rec) { shot.rec.preMs = shot.preMs; shot.rec.prepMs = shot.prepMs; shot.rec.start = performance.now(); }
      if (shot.variant !== 'off') app.dataset.scene = s.kind;
      if (shot.box) app.dataset.band = ''; else delete app.dataset.band;
      delete app.dataset.landed;
      if (!shot.dressed) dress(s, shot.compiled);
      if (s.kind === 'attack') lastShot = shot;
      layout.cue(v.land, shot, 'start');
      if (staging) {
        staging.started = true;
        // the leader holds the frame until the contact (at least 600 ms), then the card has it
        if (staging.face) cutin(staging.side, staging.line, (shot.compiled.impact ?? 900) - 60);
        else if (staging.line && !staging.box) cutin(staging.side, staging.line, 2200, false);
      }
      return;
    case 'board': layout.cue(v.land, shot, 'board'); return;
    case 'impact':
      M.impacts.push({ t: performance.now(), kind: s.kind, card: s.card, board: shot.board, ids: shot.post.map((e) => e.id) });
      layout.cue(v.land, shot, 'impact');
      app.dataset.landed = '';
      if (staging?.face) cutout(s.side);
      return;
    case 'end':
      if (shot.rec) { shot.rec.end = performance.now(); shot.rec.playMs = shot.playMs; shot.rec.afterMs = shot.afterMs; }
      delete app.dataset.scene; delete app.dataset.landed; delete app.dataset.band;
      endLook();
      staging = null;
      for (const side of Object.keys(cutins)) cutout(side, true);
      return;
    default:
  }
}
// a card's own call-out look (looks.ts), as the Broadcast's dress() sets it for the scene
let lookDone = null;
function endLook() { lookDone?.(); lookDone = null; }
function dress(s, compiled) {
  endLook();
  const r = stage.root;
  const m = s.move ? K.card(s.card)?.moves[s.move.index] : null;
  const kind = m?.media?.kind ?? (m?.still ? 'image' : 'none');
  r.dataset.feature = kind === 'video' ? 'video' : m ? 'still' : 'none';
  r.style.setProperty('--c', K.accent(s.card));
  if (s.move) { r.dataset.mi = String(s.move.index); r.dataset.move = s.move.id; } else { delete r.dataset.mi; delete r.dataset.move; }
  const label = [...s.label].length;
  r.dataset.label = /^\d+$/.test(s.label) ? 'number' : label ? 'word' : 'none';
  r.style.setProperty('--len', String(Math.max(1, label)));
  r.style.setProperty('--clen', String(Math.max(6, [...s.title].length)));
  const co = r.querySelector('.sd-callout');
  const style = compiled.calloutStyle;
  co.style.removeProperty('--spec-w');
  if (style === 'specimen') {
    const t = co.querySelector('.sd-callout-text');
    const probe = t.cloneNode(true);
    probe.style.cssText = `position:absolute;visibility:hidden;width:max-content;clip-path:none;font-variation-settings:"wght" ${s.move?.wght ?? 800}`;
    co.append(probe);
    co.style.setProperty('--spec-w', `${Math.ceil(probe.getBoundingClientRect().width) + 2}px`);
    probe.remove();
  }
  if (s.kind === 'attack' && !style) {
    const look = K.calloutLookOf(s.card);
    if (look) {
      const text = co.querySelector('.sd-callout-text');
      const set = [];
      if (look.face) set.push([text, 'font-family', look.face]);
      if (look.weight) set.push([co, '--sd-wght', String(look.weight)]);
      if (look.fill) set.push([text, 'color', look.fill]);
      if (look.stroke) set.push([co, '--sd-stroke', look.stroke]);
      if (look.extrude) set.push([co, '--ex', look.extrude === 'none' ? 'transparent' : look.extrude]);
      for (const [e, k, v] of set) e.style.setProperty(k, v);
      const undo = look.render?.(text, s);
      lookDone = () => { for (const [e, k] of set) e.style.removeProperty(k); if (typeof undo === 'function') undo(); };
    }
  }
  const cr = r.querySelector('.sd-credit');
  const credited = 'cotfly';
  const text = s.card === credited || (s.target === credited && s.kind === 'attack' && !s.outcome.has('support')) ? K.card(credited)?.credit ?? '' : '';
  if (cr.textContent !== text) cr.textContent = text;
}

// ============================================================ the console: one component in both modes
const KEYS = ['1', '2', '3', '4'];
const DESC = (mv) => {
  try {
    const d = document.createElement('div'); d.innerHTML = window.MARKUP.moveText(mv); d.querySelector('b')?.remove();
    const t = d.textContent.trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  } catch { return mv.feature ?? ''; }
};
let turnShown = false;
function render() {
  if (!match) return;
  const st = match.state;
  // the turn's start and end lay the board out again (a phone's mat grows into the console's room and back)
  const turn = st.phase !== 'over' && (busy || auto);
  app.dataset.turn = String(turn);
  if (turn !== turnShown) { turnShown = turn; layout?.layout(); }
  if (!turn && st.phase === 'command') groundAtRest();
  const me = engine.activeOf(st, 'player'), foe = engine.activeOf(st, 'rival');
  const d = engine.fighterDef(me.id);
  const can = !busy && st.phase === 'command';
  app.dataset.busy = busy ? 'true' : 'false';
  const legal = match.legal();
  const moves = $('#moves');
  if (moves.dataset.card !== me.uid) {
    moves.dataset.card = me.uid;
    moves.textContent = '';
    d.moves.forEach((m, i) => {
      const b = el('button', 'key move', moves);
      b.type = 'button';
      b.dataset.i = String(i);
      b.setAttribute('aria-keyshortcuts', KEYS[i]);
      b.style.setProperty('--d', K.DISCIPLINE_COLOR[m.discipline] ?? '#999');
      const head = el('span', 'move-head', b);
      head.innerHTML = K.icon(String(m.discipline).toLowerCase());
      el('span', 'move-name', head, m.name);
      el('span', 'move-ring', head);
      el('span', 'move-nums', b);
      el('span', 'move-desc', b, DESC(m));
      b.onclick = () => command(m.axis ? { kind: 'move', index: i, wght: 600 } : { kind: 'move', index: i });
      const show = () => { sayRest = `${m.name}: ${DESC(m)}`; if (narrow()) say(sayRest); };
      if (i === 0) sayRest = `${m.name}: ${DESC(m)}`;
      b.addEventListener('focus', show); b.addEventListener('pointerenter', show);
    });
    if (narrow()) say(sayRest);
  }
  [...moves.children].forEach((b, i) => {
    const m = d.moves[i];
    const nums = engine.moveNumbers(me, m, m.axis ? 600 : undefined);
    const ok = legal.some((a) => a.kind === 'move' && a.index === i);
    b.setAttribute('aria-disabled', String(!can || !ok));
    const ring = nums.power > 0 ? engine.matchup(m.discipline, engine.fighterDef(foe.id).disciplines) : 1;
    const parts = [nums.power > 0 ? `${nums.power} power` : '', `${Math.round(nums.accuracy * 100)}%`, `${me.pp[i]} of ${m.pp} PP`].filter(Boolean);
    const numsText = parts.join(VW < 1200 ? '  ' : '   ');
    const ne = b.querySelector('.move-nums');
    if (ne.textContent !== numsText) ne.textContent = numsText;
    const rt = ring > 1 ? '×1.5' : ring < 1 ? '×0.67' : '';
    const re = b.querySelector('.move-ring');
    if (re.textContent !== rt) re.textContent = rt;
    b.dataset.ring = ring > 1 ? 'up' : ring < 1 ? 'down' : '';
    b.setAttribute('aria-label', `${m.name}, ${m.discipline}, ${parts.join(', ')}${ring !== 1 ? `, times ${ring > 1 ? '1.5' : '0.67'}` : ''}. ${DESC(m)}`);
  });
  $('#guard').setAttribute('aria-disabled', String(!can));
  $('#switch').setAttribute('aria-disabled', String(!can || !legal.some((a) => a.kind === 'switch')));
  $('#kit').setAttribute('aria-disabled', String(!can || !legal.some((a) => a.kind === 'item')));
  $('#switch').setAttribute('aria-expanded', String(panel === 'switch'));
  $('#kit').setAttribute('aria-expanded', String(panel === 'kit'));
  $('#auto').setAttribute('aria-pressed', String(auto));
  $('#replay').setAttribute('aria-disabled', String(busy || !lastShot));
  if (narrow() && !$('#say').textContent && sayRest) $('#say').textContent = sayRest;
  if (!busy && match.mustReplace) { if (auto) queueMicrotask(() => { if (!busy && auto && match.mustReplace) present(match.step()); }); else if (panel !== 'replace') openPanel('replace'); }
  else if (panel === 'replace' && !match.mustReplace) closePanel();
}
let sayT = 0, sayRest = '';
function say(text, ms = 0) {
  const s = $('#say');
  if (s.textContent !== text) s.textContent = text;
  clearTimeout(sayT);
  if (ms) sayT = setTimeout(() => { s.textContent = narrow() ? sayRest : ''; }, ms);
}
function live(text) { $('#live').textContent = text; }

function command(action) {
  if (busy || !match || match.state.phase !== 'command') return;
  if (match.validate(action).length) return;
  closePanel();
  if (!M.firstCommandAt) M.firstCommandAt = performance.now();
  warmOther();
  present(match.act(action));
}
/** The address keeps the record, so a reload resumes this battle where it stands, in the mode it is in. */
function address() {
  const rec = match.record();
  const parts = [sd.toHash({ team: match.team, rival: match.rival, seed: match.seed })];
  if (rec.log) parts.push(`log=${rec.log}`, 'resume=1');
  parts.push(`mode=${mode}`, `leaders=${leadersNow.join(',')}`);
  if (mapNow) parts.push(`map=${mapNow}`);
  return parts.join('&');
}
async function present(events, o = {}) {
  const my = gen;
  busy = true;
  M.batches++;
  render();
  const t0 = performance.now(), n0 = M.shots.length;
  await director.play(events, { auto, ...o });
  (M.batchMs ??= []).push({ ms: Math.round(performance.now() - t0), shots: M.shots.slice(n0).map((x) => `${x.kind}:${x.variant}`) });
  if (my !== gen) return;
  busy = false;
  store.keep();
  warmAhead();
  if (!o.replay) history.replaceState(null, '', `#${address()}`);
  if (match.state.phase === 'over') { showResult(); return; }
  render();
  if (!auto) {
    const a = document.activeElement;
    if (!a || a === document.body || !a.isConnected || a.getAttribute('aria-disabled') === 'true') {
      if (panel) ($('#panel .panel-list button:not([aria-disabled="true"])') ?? $('#panel button'))?.focus({ preventScroll: true });
      else $('#moves button')?.focus({ preventScroll: true });
    }
  }
  // under Auto the next turn follows after one breath (two frames), so the console shows the turn that ended
  if (auto) setTimeout(() => { if (my === gen && !busy && auto && match.state.phase !== 'over') present(match.step()); }, 40);
}

// ---------- panels: the bench (switch, send in) and the Kit; focus goes to the first real choice
function openPanel(kind, chosen = null) {
  if (kind !== 'replace' && (busy || match.state.phase !== 'command')) return;
  panel = kind;
  const p = $('#panel');
  p.hidden = false;
  p.dataset.kind = kind;
  p.textContent = '';
  const head = el('div', 'panel-head', p);
  el('b', '', head, kind === 'kit' ? (kitItem ? `${engine.itemById(kitItem).name} on` : 'Kit') : kind === 'replace' ? 'Send In' : 'Switch');
  if (kind !== 'replace') { const c = el('button', 'key', head, 'Close'); c.type = 'button'; c.onclick = () => closePanel(true); }
  const list = el('div', 'panel-list', p);
  const team = match.state.sides.player.team;
  const bench = (f, i, ok, act) => {
    const b = el('button', 'key bench', list);
    b.type = 'button';
    b.innerHTML = `<b>${esc(title(f.id))}</b><span>${f.hp} of ${f.maxHp} HP</span>`;
    b.setAttribute('aria-disabled', String(!ok));
    b.onclick = () => { if (ok) act(); };
    return b;
  };
  if (kind === 'switch' || kind === 'replace') {
    const legal = kind === 'replace' ? match.reserves('player') : match.legal().filter((a) => a.kind === 'switch').map((a) => a.to);
    team.forEach((f, i) => {
      if ((i === match.state.sides.player.active && kind === 'switch') || f.hp <= 0) return;
      const b = bench(f, i, legal.includes(i), () => { closePanel(); present(kind === 'replace' ? match.replace(i) : match.act({ kind: 'switch', to: i })); });
      if (chosen === i) queueMicrotask(() => b.focus({ preventScroll: true }));
    });
  } else {
    const kit = match.kit('player');
    if (!kitItem) {
      for (const it of kit) {
        const b = el('button', 'key item', list);
        b.type = 'button';
        b.innerHTML = `<b>${esc(it.name)}</b><span>${esc(words(it.short))}</span><em>${it.left}</em>`;
        const ok = it.left > 0 && it.targets.length > 0;
        b.setAttribute('aria-disabled', String(!ok));
        b.onclick = () => { if (!ok) return; kitItem = it.id; openPanel('kit'); };
      }
    } else {
      const it = kit.find((x) => x.id === kitItem);
      team.forEach((f, i) => bench(f, i, it.targets.includes(i), () => { const item = kitItem; kitItem = null; closePanel(); present(match.act({ kind: 'item', item, target: i })); }));
    }
  }
  render();
  if (chosen === null) queueMicrotask(() => ($('#panel .panel-list button:not([aria-disabled="true"])') ?? $('#panel button'))?.focus({ preventScroll: true }));
}
function closePanel(refocus = false) {
  if (!panel) return;
  const was = panel;
  panel = null; kitItem = null;
  $('#panel').hidden = true;
  render();
  if (refocus) $(`#${was === 'kit' ? 'kit' : 'switch'}`)?.focus({ preventScroll: true });
}

// ---------- the result
function showResult() {
  M.resultAt = performance.now();
  M.phase = 'result';
  app.dataset.phase = 'result';
  const st = match.state;
  const win = st.winner;
  const r = $('#result');
  r.hidden = false;
  r.textContent = '';
  const out = (s) => st.sides[s].team.filter((f) => f.hp <= 0).length;
  el('h1', '', r, win === 'draw' ? 'Draw' : win === 'player' ? 'Victory' : 'Defeat');
  el('p', '', r, `${st.turn} turns   ${out('rival')} of 3 rival cards out   ${out('player')} of 3 yours out`);
  // on a phone the leaders' lines have no plate on the board: the winner's rides the result instead
  if (narrow() && win !== 'draw') {
    const t = leaderData(leadersNow[win === 'player' ? 0 : 1]);
    if (t?.quotes.victory) { const qe = el('p', 'result-say', r); el('b', '', qe, t.name); qe.append(' '); el('span', '', qe, t.quotes.victory); qe.style.setProperty('--accent', t.accent); }
  }
  const keys = el('div', 'result-keys', r);
  const k = (label, f, plate = false) => { const b = el('button', plate ? 'key plate' : 'key', keys, label); b.type = 'button'; b.onclick = f; return b; };
  const first = k('Rematch', () => start({ team: match.team, rival: match.rival, seed: (match.seed + 1) >>> 0 }), true);
  k('New Rival', () => { const seed = (match.seed * 7 + 13) >>> 0; start({ team: match.team, rival: engine.rivalFor(match.team, seed), seed }); });
  const log = match.record().log;
  k('Watch Replay', () => start({ team: match.team, rival: match.rival, seed: match.seed, log, leaders: leadersNow.join(','), map: mapNow }, true));
  el('a', 'key', keys, 'Leave').href = leaveHref();
  if (!reduced()) r.animate([{ opacity: 0, transform: 'translate3d(0,24px,0)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.2,.9,.1,1)' });
  first.focus({ preventScroll: true });
  render();
}
function leaveHref() {
  const p = match ? `#you=${match.team.join(',')}&rival=${match.rival.join(',')}&seed=${match.seed}` : '';
  return `/${p}`;
}
function openLog() {
  const d = $('#log');
  const list = d.querySelector('ol');
  list.textContent = '';
  let turn = 0;
  for (const l of logLines) {
    if (l.turn !== turn) { turn = l.turn; el('li', 'log-turn', list, `Turn ${turn}`); }
    const li = el('li', '', list, l.text);
    if (l.receipt) el('code', '', li, l.receipt);
  }
  d.showModal();
  stage.hold(true); layout.hold(true);
  list.lastElementChild?.scrollIntoView({ block: 'end' });
}
$('#log').addEventListener('close', () => { stage.hold(false); layout.hold(false); });
$('#log-close').onclick = () => $('#log').close();
$('#logb').onclick = openLog;

// the last attack again, as a replay: presentation only, no event lands twice
async function replayLast() {
  if (busy || !lastShot?.scene) return;
  busy = true; render();
  const s = { ...lastShot.scene, variant: reduced() ? 'reduced' : 'full' };
  const c = runtime.compileScene(s);
  await stage.prepare(s, c);
  dress(s, c);
  app.dataset.scene = 'replay';
  stage.anchors = { source: layout.anchor('source', s.side), target: null };
  await stage.play(s, c, {});
  delete app.dataset.scene;
  busy = false; render();
}
$('#replay').onclick = () => replayLast();

// ============================================================ keys: 1 to 4, G, S, K, A, M, R, L, Escape; a press skips
let swallowUntil = 0;
function skip() { stage.skip(); layout.skip(); }
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if ($('#log').open) return;
  if (stage.playing && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); e.stopPropagation(); skip(); return; }
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (panel && panel !== 'replace') { closePanel(true); e.preventDefault(); } return; }
  if (KEYS.includes(e.key)) { const b = $(`#moves [data-i="${Number(e.key) - 1}"]`); if (b && b.getAttribute('aria-disabled') !== 'true') { e.preventDefault(); b.click(); } return; }
  const map = { g: '#guard', s: '#switch', k: '#kit', a: '#auto', r: '#replay', l: '#logb', m: `#mode-${otherMode()}` };
  if (map[k]) { const b = $(map[k]); if (b && b.getAttribute('aria-disabled') !== 'true') { e.preventDefault(); b.click(); } }
}, true);
addEventListener('pointerdown', (e) => { if (stage.playing && !e.target.closest?.('dialog, .seg')) { swallowUntil = performance.now() + 800; skip(); } }, true);
addEventListener('click', (e) => { if (performance.now() < swallowUntil) { swallowUntil = 0; e.preventDefault(); e.stopPropagation(); } }, true);
$('#guard').onclick = () => { if ($('#guard').getAttribute('aria-disabled') !== 'true') command({ kind: 'guard' }); };
$('#switch').onclick = () => { if ($('#switch').getAttribute('aria-disabled') === 'true') return; panel === 'switch' ? closePanel(true) : openPanel('switch'); };
$('#kit').onclick = () => { if ($('#kit').getAttribute('aria-disabled') === 'true') return; panel === 'kit' ? closePanel(true) : openPanel('kit'); };
$('#auto').onclick = () => {
  auto = !auto;
  render();
  if (auto && !busy && match && match.state.phase !== 'over') { if (!M.firstCommandAt) M.firstCommandAt = performance.now(); warmOther(); present(match.step()); }
};
for (const m of Object.keys(MODES)) {
  const b = $(`#mode-${m}`);
  b.onclick = () => setMode(m);
  b.addEventListener('pointerenter', warmOther);
  b.addEventListener('focus', warmOther);
}
let resizeT = 0;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => layout?.layout(), 60); });

// ============================================================ starting a battle: the deal, then the leads' entrances
const DEFAULT = { team: ['claude-of-tanks', 'katagami', 'bday-land'], rival: ['jarhead', 'mailroom', 'cotfly'], seed: 30 };
async function start(p, replay = false, resume = false) {
  let next;
  try { next = sd.start({ team: p.team, rival: p.rival, seed: p.seed, log: replay || resume ? p.log : undefined }); }
  catch (err) { $('#error').textContent = String(err.message ?? err); if (!match) start(DEFAULT); return; }
  const my = ++gen;
  director.stop();
  match = next;
  for (const id of [...match.team, ...match.rival]) groundCards.add(id);
  auto = false;
  busy = true;
  panel = null; kitItem = null;
  $('#panel').hidden = true;
  $('#result').hidden = true;
  $('#error').textContent = '';
  logLines.length = 0;
  lastShot = null;
  store.begin(`${match.team.join(',')}|${match.rival.join(',')}|${match.seed}`, resume);
  said = new Set();
  warmed = false;
  M.lands.length = 0; M.shots.length = 0; M.impacts.length = 0; M.firstCommandAt = 0; M.resultAt = 0; M.batches = 0;
  leadersNow = leadersFor(match.seed, p.leaders);
  mapNow = p.map || undefined;
  M.leaders = leadersNow;
  const hp = sd.toHash({ team: match.team, rival: match.rival, seed: match.seed });
  history.replaceState(null, '', `#${hp}${(replay || resume) && p.log ? `&log=${p.log}${resume ? '&resume=1' : ''}` : ''}&mode=${mode}${p.leaders ? `&leaders=${leadersNow.join(',')}` : ''}${mapNow ? `&map=${mapNow}` : ''}`);
  $('#leave').href = leaveHref();
  const opening = match.opening;
  view = resume ? engine.snapshot(match.state) : opening.at(-1)?.state ?? engine.snapshot(match.state);
  app.dataset.phase = 'deal';
  M.phase = 'deal';
  const swap = await nextLayout(mode, !resume);
  if (my !== gen) return;
  if (document.documentElement.dataset.boot !== undefined) await swap.steps(); else swap();
  if (my !== gen) return;
  delete document.documentElement.dataset.boot;
  drawMhud(view);
  $('#moves').dataset.card = '';
  render();
  if (resume) {
    // the board from the snapshot, nothing presented again: the battle goes on where it stood
    for (const e of match.events) { M.lands.push(e.id); const l = logOf(e); if (l) logLines.push(l); }
  } else {
    await layout.cue('deal', null, 'pre');
    if (my !== gen) return;
    app.dataset.phase = 'entrance';
    M.phase = 'entrance';
    await director.play(opening, { replay });
    if (my !== gen) return;
  }
  app.dataset.phase = 'live';
  M.phase = 'live';
  if (replay) {
    await director.play(match.events.filter((e) => !opening.includes(e)), { replay: true });
    if (my !== gen) return;
  }
  busy = false;
  if (match.state.phase === 'over') { showResult(); return; }
  render();
  $('#moves button')?.focus({ preventScroll: true });
  if (q.get('auto') === '1') $('#auto').click();
}

// ============================================================ fixtures: a recorded match's batches through the Director
async function runFixture(n) {
  const fixture = await (await fetch(`../fixtures/replay-${n}.json`)).json();
  await start({ team: fixture.team, rival: fixture.rival, seed: fixture.seed, leaders: hashParams.get('leaders') ?? undefined });
  const my = gen;
  auto = true; busy = true; render();
  M.fixture = { n, hash: fixture.hash, result: fixture.result };
  // start() presented the opening (batch 0) from this page's match; the fixture's later batches follow it
  for (const b of fixture.batches.slice(1)) { if (my !== gen) return; await director.play(b.events, { auto: true }); }
  busy = false;
  const check = sd.start({ team: fixture.team, rival: fixture.rival, seed: fixture.seed, log: fixture.hash.match(/log=([^&]+)/)?.[1] });
  M.fixture.replayHash = check.hash();
  M.fixture.replayResult = { winner: check.state.winner, turns: check.state.turn };
  match = check;
  view = engine.snapshot(check.state);
  if (match.state.phase === 'over') showResult();
}

// ============================================================ boot
const first = sd.parseHash(location.hash);
const resuming = Boolean(first.log) && hashParams.get('resume') === '1';
if (q.get('fixture')) runFixture(q.get('fixture'));
else start({ ...DEFAULT, ...first, leaders: hashParams.get('leaders') ?? undefined, map: hashParams.get('map') ?? undefined }, Boolean(first.log) && !resuming, resuming);
const api = { stage, director, start, skip, setMode, boardShort, get layout() { return layout; }, get board() { return layout; }, get mode() { return mode; }, get match() { return match; }, get view() { return view; } };
if (DEBUG) window.__battleApi = window.__matApi = window.__arenaApi = api;
