// Each Arena fighter wears its own card (ROUND6.md section 4.1): the card's floor matter under it, its fx pieces
// orbiting in depth, the same pieces as its beats. Nothing generic: every piece is a drawing the product made on its ex
// card (arena/exfx.js), and every motion is the card's own (a slide flips, a postmark turns, a query strip orbits).
//
// Compositor only. Each piece is a box with one infinite Web Animation of transform and opacity, its keyframes sampled
// from a floor circle (or path) projected through the painting's camera once per layout; the camera itself lives on
// `.arena-cam`, so nothing is recomputed per frame and no ticker runs. A piece that orbits exists twice, a back copy in
// `.aura-back` (behind the picture) and a front copy in `.aura-front`, their opacities stepping at the two tangents, so
// a piece passes behind and in front of the figure with no z change. Floor work (the matter tile, rings, a trace, paw
// prints) lies in the floor's plane through the floor homography. Every running animation is kept in `Aura.running`,
// outside the board's Motion registry, and paused as one (a hold, a hidden tab, a covering scene, the result, the Log).
// Reduced motion: no animation at all; each piece stands at its three-quarter-front point, front copies at 0.6.
import { upright, project, ppm, matrix3d, mul3 } from './ground.js';
import { hueOf, FLOW, piecesOf, pieceNode, matterTile, viewOf, adoptStyles, later, glinted } from './exfx.js';
import { FORMS } from '../shared/forms.js';

/** The beats a layout may send an aura. */
export const AURA_KINDS = Object.freeze(['act', 'release', 'hit', 'ko', 'switch-out', 'switch-in', 'transform', 'victory']);

// ---------------------------------------------------------------- one pause for every aura
const holds = new Set();
/** Every running aura animation, paused and resumed as one (hold, hidden, a covering scene, result, Pause Motion).
 *  `Aura.hold(reason, on)` adds or lifts one reason; the auras run only while none stands. */
export const Aura = {
  running: new Set(),
  hold(reason, on) { if (on) holds.add(reason); else holds.delete(reason); sync(); },
  /** Whether a hold stands that stops the board's own idles too (a phone's busy hold stops the auras' loops alone:
   *  the figures keep breathing, hovering and swaying through a batch). */
  get held() { for (const r of holds) if (r !== 'busy') return true; return false; },
  /** Whether a hold that stops beats too stands (a busy batch on a phone holds the loops only, never a beat). */
  get heldBeats() { for (const r of holds) if (r !== 'busy') return true; return false; },
  get reasons() { return [...holds]; },
};
const pace = () => globalThis.battlePace;
function sync() {
  const manual = Boolean(pace()?.manual), busyOnly = holds.size === 1 && holds.has('busy');
  for (const a of Aura.running) {
    // (an aura in its own beat, a gather or a construction, keeps its loops through a phone's busy hold, and the
    // board's figure idles, registered here too, never stop for it)
    const stop = holds.size > 0 && !(busyOnly && (a.aura?.live || !a.aura?.own));
    try {
      if (stop || a.aura?.paused) { if (a.playState !== 'paused') a.pause(); }
      else if (!manual && a.playState === 'paused') a.play();
    } catch { /* gone */ }
  }
}
let watching = false;
/** Every mounted aura, so a live change of reduced motion redraws each as its stills (or back to its loops). */
const mounted = new Set();
/** Every figure wearing an aura (fix 2 critic: each aura keeps its pieces off the other figure's middle 60%). */
const figures = new Set();
// (a level's attached part cut round a leader: each cut's clip id, unique in the document)
let cutSerial = 0;
/** The other standing figures an aura laid its pieces round (fix 3 A5 critic: an aura drawn while the rival was still
 *  in flight laid Local Search's strips across the rival's middle once it stood; the key tells a redraw is due). */
const foesOf = (fig) => [...figures].filter((o) => o !== fig && o.box && !o.el?.hidden && o.el?.isConnected && o.el.parentNode === fig?.el?.parentNode).map((o) => `${o.uid ?? o.id}@${Math.round(o.box.x)},${Math.round(o.box.y)},${Math.round(o.box.w)},${Math.round(o.box.h)}`).sort().join('|');
/** The moments the page pauses the board on its own: a hidden tab, the result, the open Log, the board scrolled out
 *  of view; reduced motion runs none (and a live toggle redraws every aura at once). Pause Motion and the site's
 *  `groundG.paused` call `Aura.hold('motion' | 'ground', on)`. */
function watch() {
  if (watching || typeof document === 'undefined') return;
  watching = true;
  const hidden = () => Aura.hold('hidden', document.hidden);
  document.addEventListener('visibilitychange', hidden);
  hidden();
  const redraw = () => { for (const h of mounted) { try { h.redraw?.(); } catch { /* the next aura still redraws */ } } };
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  mq?.addEventListener?.('change', redraw);
  new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-reduced'] });
  const app = document.querySelector('#app'), log = document.querySelector('#log');
  const look = () => {
    Aura.hold('result', app?.dataset.phase === 'result');
    Aura.hold('log', Boolean(log?.open));
    // a phone holds every aura's idle loop for the whole batch (the figures act and keep their own idles; the beats
    // still play), released at command; the transform scene too (fix 2 A4): the construction's gather and burst are
    // the aura's own beats (`me.live`), which `sync()` spares, so only the idle loops hold through it
    Aura.hold('busy', coarse() && app?.dataset.busy === 'true');
    dealt = !app || !/^(boot|deal)$/.test(app.dataset.phase ?? '');
    if (dealt) for (const f of waiting.splice(0)) f();
  };
  const mo = new MutationObserver(look);
  if (app) mo.observe(app, { attributes: true, attributeFilter: ['data-phase', 'data-busy', 'data-scene'] });
  if (log) mo.observe(log, { attributes: true, attributeFilter: ['open'] });
  look();
}
let dealt = true;
const waiting = [];
/** Setup waits for the deal to end (never in the prepared frame or the deal, test 26), then one card a task. */
const afterDeal = () => (dealt ? Promise.resolve() : new Promise((r) => waiting.push(r)));
let seeing = null;
/** Offscreen: the board scrolled out of view holds every aura (one observer for the page's board). */
function watchView(fig) {
  const board = fig?.el?.closest?.('.board') ?? fig?.el?.parentNode;
  if (!board || seeing === board || typeof IntersectionObserver !== 'function') return;
  seeing = board;
  new IntersectionObserver((es) => { for (const e of es) Aura.hold('offscreen', !e.isIntersecting); }).observe(board);
}

const reducedNow = (ctx) => Boolean(ctx?.reduced?.()) || document.documentElement.hasAttribute('data-reduced') || matchMedia('(prefers-reduced-motion: reduce)').matches;
/** A phone (coarse pointer): two pieces a figure, one copy each, the floor drawings and the matter still. */
export const coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
/** Pieces a figure may wear on this device (ROUND6 section 4.1 budgets; fix 1 A3: a phone affords two). */
export const budget = () => (coarse() ? 2 : (navigator.deviceMemory ?? 8) <= 4 ? 3 : 6);

// ---------------------------------------------------------------- styles
adoptStyles(`
.aura-back, .aura-front { position: absolute; inset: 0; pointer-events: none; overflow: visible; }
.aura-back { z-index: 0; } .aura-front { z-index: 2; }
.au-w { position: absolute; inset: 0; }
.au-p { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; opacity: 0; }
.au-p.au-o0 { transform-origin: 0 0; }
.au-p > svg, .au-p > img, .au-f > svg, .au-f > img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
.au-p > img, .au-f > img { image-rendering: auto; }
.au-floor, .au-ringf { position: absolute; left: 0; top: 0; transform-origin: 0 0; pointer-events: none; }
.au-over { position: absolute; left: 0; top: 0; width: 0; height: 0; pointer-events: none; }
.au-clock { display: none; }
.au-floor-w { position: absolute; inset: 0; transform-origin: 50% 50%; }
.au-matter { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; opacity: 1; mix-blend-mode: screen;
  -webkit-mask: radial-gradient(closest-side, #000 45%, rgb(0 0 0 / .6) 72%, transparent 100%); mask: radial-gradient(closest-side, #000 45%, rgb(0 0 0 / .6) 72%, transparent 100%); }
.au-tile { position: absolute; background-repeat: repeat; }
.au-deco { position: absolute; left: 0; top: 0; width: 0; height: 0; overflow: visible; }
.au-deco svg { position: absolute; overflow: visible; }
.au-f { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; }
.au-near { position: absolute; inset: 0; overflow: visible; }
.au-shield { position: absolute; left: 0; top: 0; overflow: visible; opacity: 0; transform-origin: 50% 100%; }
`);

// ---------------------------------------------------------------- what each card wears
const F = (n) => +n.toFixed(2);
const TAU = Math.PI * 2;
const ease = (t) => t * t * (3 - 2 * t);
/** An opacity envelope: in over `a` of the cycle, out over the last `b`. */
const env = (a, b, top = 1) => (t) => top * Math.min(1, a > 0 ? t / a : 1, b > 0 ? (1 - t) / b : 1);
/** Princeton TD's seven towers: accent (r4 ptd.md section 1) and the range ring's radius in figure widths. */
const TOWER = {
  cannon: ['#f87171', 0.95], library: ['#67e8f9', 1.05], lab: ['#facc15', 1.0], arch: ['#60a5fa', 1.15],
  club: ['#f59e0b', 0.9], mortar: ['#fb923c', 1.2], station: ['#a78bfa', 0.92],
};
const towerAccent = (form) => FORMS?.['princeton-td']?.forms?.[form]?.accent ?? TOWER[form]?.[0] ?? hueOf('princeton-td').energy;
/** A level as the pieces read it: '1', '2', '3', '4a' or '4b' (null where none is known). */
const lvlOf = (l) => (l == null || l === '' ? null : String(l).toLowerCase());
/** The form's accent at its level (fix 3 A2): the Lab's branches wear their own, the 4A dome's gold and the 4B's
 *  violet; every other tower its accent at every level. */
const formAccent = (form, level) => { const l = lvlOf(level); if (form === 'lab' && l === '4a') return '#fbbf24'; if (form === 'lab' && l === '4b') return '#a78bfa'; return towerAccent(form); };

/** Per card: `u` its pieces' size (1000 card units = u times the figure's mean box side), `pieces` in the order the
 *  budget keeps them, `hit` its reaction. Units: `a` angle round the stand from the camera side (0 front, PI/2 the
 *  figure's right), `r` floor radius in figure widths, `h` height in figure heights, T the cycle in seconds. */
const CARDS = {
  // four slides orbit, their moment by angle: face toward the camera, edge-on at the tangents (the card's flip); four,
  // so three read while one passes behind
  turboslide: { u: 1.15, hit: 'fan', idle: (B) => [0, 1, 2, 3].map((i) => B.path(0, { T: 7, phase: i / 4, flip: true, pos: (t) => ({ a: TAU * t, r: 0.62, h: 0.55 + 0.05 * Math.sin(TAU * (t + i / 4)) }), rot: () => -10 })) },
  // dot-matrix letters rise in columns from a floor ring and fade at the top
  // (spaced evenly through the cycle by as many as the device wears, each showing most of its rise)
  glyphfield: { u: 2.2, hit: 'scatter', idle: (B) => B.list(6).map((p, i, all) => B.path(p, { T: 4.2, delay: (i * 4.2) / Math.min(all.length, B.max), twin: false, pos: (t) => ({ a: (i / 6) * TAU + 0.4, r: 0.55, h: 0.05 + 1.05 * t }), op: env(0.06, 0.16), sc: (t) => 0.8 + 0.2 * t })) },
  // the print's pointer clicks beside it (a double click a lap); two capture arcs turn slowly round it, just off its
  // body, a deep-hue dash on a light keyline: pieces, never the reticle (the four solid corners are the act's, B.act)
  jarhead: {
    u: 1.0, hit: 'blink',
    idle: (B) => [
      B.path(B.drawn('pointer'), { T: 5.6, twin: false, samples: 56, reticle: 'strict', pos: (t) => ({ a: 1.1 + 0.32 * Math.sin(TAU * t), r: 0.62, h: 0.84 + 0.05 * Math.sin(TAU * 2 * t) }), sc: (t) => 1 - 0.14 * Math.max(0, 1 - Math.abs(t - 0.46) / 0.035) - 0.14 * Math.max(0, 1 - Math.abs(t - 0.53) / 0.035) }),
      B.arcs({ T: 16 }),
    ],
  },
  // the cut counters climb round its front in rising arcs, turning as they go, each from one side to the other (every
  // other the other way), fading in and out at the ends where they pass behind: four, so three show at any moment.
  // Each climbs its side and crosses the front over the lid (fix 2 A2: never across the face)
  katagami: { u: 1.25, hit: 'tilt', idle: (B) => [0, 1, 0, 1].map((p, i) => B.path(p, { T: 9, delay: i * 2.25, pos: (t) => ({ a: (i % 2 ? -1 : 1) * (-0.6 + 1.2 * t) * Math.PI, r: 0.52, h: 0.22 + 0.86 * Math.sin((Math.min(1, t / 0.46) * Math.PI) / 2) + 0.08 * Math.max(0, t - 0.46) }), op: env(0.1, 0.18), rot: (t) => 162 * t + i * 40 })) },
  // a vehicle: smoke rings rise off the rear deck, spent casings eject from it and tumble to the floor, and dirt
  // sprays off the rear track every 8 s
  'claude-of-tanks': {
    u: 1.0, hit: 'puff',
    idle: (B) => {
      const back = B.G.foeAng + Math.PI;
      const smoke = (i) => B.path(B.drawn('smoke'), { T: 4.4, delay: i * 2.2, twin: false, size: 0.72, pos: (t) => ({ a: back + (i ? 0.3 : -0.3), r: 0.26 + 0.12 * t, h: 0.62 + 0.55 * ease(t) }), sc: (t) => 0.6 + 0.8 * t, op: env(0.1, 0.4, 1) });
      const casing = (i) => B.path(B.drawn('casing'), { T: 3.6, delay: 0.6 + i * 1.8, twin: false, samples: 36, size: 0.5, still: 0.3 + 0.12 * i, pos: (t) => { const u = Math.min(1, t / 0.6); return { a: back + (i ? 0.95 : -0.95) * u, r: 0.24 + 0.3 * u, h: Math.max(0.03, 0.6 + 0.5 * u - 1.08 * u * u) }; }, rot: (t) => 640 * Math.min(1, t / 0.6) + 90 * i, op: env(0.05, 0.12) });
      return [smoke(0), casing(0), smoke(1), casing(1), B.kick(B.pieces.length - 1, { T: 8 })];
    },
  },
  // its letter orbits, rocking, three of the postmark's cancel bars a quarter of a lap apart behind it, so three show
  // while one passes behind (fix 2 A2: the postmark's ring and cross read as a crosshair beside the reticle; the
  // letter is the card's own subject)
  mailroom: { u: 1.05, hit: 'scatter', idle: (B) => [B.path(B.drawn('envelope'), { T: 8, pos: (t) => ({ a: TAU * t + 0.6, r: 0.55, h: 0.85 }), rot: (t) => 12 * Math.sin(TAU * t) }), ...[1, 3, 1].map((p, i) => B.path(p, { T: 8, phase: (i + 1) / 4, keyline: true, size: 1.9, pos: (t) => ({ a: TAU * t + 0.6, r: 0.55, h: [0.6, 0.42, 0.72][i] }), rot: (t) => -10 + 20 * Math.sin(TAU * t) }))] },
  // the three query strips rise off the box in turn, as queries sent, each up one side of it (left, right, left) and
  // drifting out as it climbs, a strip every 2.4 s (fix 2 A2: two strips on one side are 4.8 s apart, so no strip ever
  // lies on another; each keeps to the side, never across the box's face, inside the stage and left of the log rail)
  'local-search': {
    u: 0.9, hit: 'jolt',
    idle: (B) => {
      // (a side too narrow for a strip beside the box, a leader or the rail close by, sends its strips up the other)
      const G = B.G, cx = G.box.x + G.box.w / 2, R = G.roomO;
      const near = (G.hud ?? []).filter((r) => r.y0 < R.y1 && r.y1 > R.y0 && r.y0 < G.box.y + G.box.h);
      // (fix 2 critic: a side has room when a whole strip stands between the box's middle 60% and the nearest rect
      // there, the other figure's whole drawn box included; the strip may not cover the box's middle at all)
      const free = (s) => (s > 0 ? Math.min(R.x1, ...near.filter((r) => r.x0 > cx).map((r) => r.foe?.x0 ?? r.x0)) - cx : cx - Math.max(R.x0, ...near.filter((r) => r.x1 < cx).map((r) => r.foe?.x1 ?? r.x1))) - 0.3 * G.box.w - 4;
      const half = (i) => { const q = B.pieces[i]; return q ? Math.max(q.w, q.h) * G.U : 0; };
      // (three strips, never more than the device wears: a third of the rise parts two on one side)
      const n = Math.min(B.max, 3), T = 2.4 * n;
      // (where neither side has room for a strip beside the box, a phone's wide box, the strips rise in turn over its
      // lid instead, off its face)
      return [0, 1, 2, 0].slice(0, n).map((p, i) => {
        let s = i % 2 ? 1 : -1;
        // (fix 2 critic: a strip takes the other side only where a whole strip stands there; where neither side has
        // room, between a leader and the other figure, the strips rise in turn over the lid, full size, fading out
        // over the room's top)
        if (free(s) < half(p) && free(-s) >= half(p)) s = -s;
        const lid = free(s) < half(p) && free(-s) < half(p);
        // (over the lid, fix 2 critic: two columns either side of its centre, a strip's width apart, so neighbours in
        // time never share one; each rises inside the room)
        // (the columns' gap read on screen: a strip's drawn width, at least the size floor, and 8 px)
        const sep = Math.abs(G.at(Math.PI / 2, 1, 0.9).x - G.at(-Math.PI / 2, 1, 0.9).x) || G.box.w, wS = Math.max(half(p), 1.06 * G.bigSide);
        // (a phone's two strips swing to and fro rather than fade, so their phases drift: each keeps a band of its own
        // over the lid, the bands a strip's height and more apart, so they never meet)
        const rc = Math.max(0.25, (wS + 8) / sep), band = coarse() && B.max <= 2;
        const pos = lid ? (band ? (t) => ({ a: s * (Math.PI / 2), r: 0.06, h: (i ? 1.18 : 0.82) + 0.12 * t }) : (t) => ({ a: s * (Math.PI / 2), r: rc, h: 0.84 + 0.46 * t })) : (t) => ({ a: s * (Math.PI / 2 - 0.3), r: 0.6 + 0.12 * t, h: 0.22 + 1.08 * t });
        // (over the lid a column's two strips are half a cycle apart: i 0 and 2 on one side, 1 on the other between)
        return B.path(p, { T, delay: lid ? (i * T) / 4 : i * 2.4, twin: false, samples: 30, lockH: true, clearMid: !lid, pos, op: env(0.05, 0.1), rot: (t) => s * 3 * Math.sin(Math.PI * t) });
      });
    },
  },
  // four hearts rise off the head (three show at any moment); paw prints walk the pad ring
  'agent-pets': {
    u: 0.95, hit: 'break',
    idle: (B) => [
      // (spread round the head, so no heart rises over another, and each holds most of its rise)
      ...[0, 1, 2, 1].map((p, i) => B.path(p, { T: 4.8, delay: i * 1.2, twin: false, pos: (t) => ({ a: [-1.1, 0.45, 1.6, -0.35][i], r: 0.32 + 0.12 * t, h: 0.9 + 0.32 * ease(t) }), op: env(0.06, 0.22), sc: (t) => 0.75 + 0.25 * t })),
      B.walk([3, 4], { T: 6, steps: 12, r: 0.62 }),
    ],
  },
  // a diff row (bars, no glyphs) peels off the top every 2.4 s
  loop: { u: 1.1, hit: 'scatter', idle: (B) => [0, 1, 2, 3].map((p, i) => B.path(p, { T: 9.6, delay: i * 2.4, twin: false, pos: (t) => ({ a: 0.7 + i * 0.45, r: 0.12 + 0.4 * t, h: 0.9 + 0.38 * ease(t) }), op: env(0.08, 0.4), sc: (t) => 1 - 0.25 * t, rot: (t) => -8 * t })) },
  // the worker chip rides its green trace round the pad, on the floor; two more lift off the trace, ride the air to
  // the next corner and set down on it again; the agent's cloud floats over its head
  'agent-machines': {
    u: 1.2, hit: 'hop', room: [0.05, 0.25],
    idle: (B) => [
      B.trace(1, { T: 6, r: 0.78 }),
      B.lift(1, { i: 0, T: 6, r: 0.78, top: 0.72, phase: 0 }),
      B.lift(1, { i: 2, T: 6, r: 0.78, top: 0.56, phase: 0.5 }),
      B.path(3, { T: 11, size: 1.1, pos: (t) => ({ a: TAU * t + 2.4, r: 0.42, h: 1.0 + 0.03 * Math.sin(TAU * 2 * t) }), rot: (t) => 6 * Math.sin(TAU * t) }),
    ],
  },
  // the five horizon arcs closed into floor rings, each turning; on a barrier they rise into a cylinder
  // and four horizon arcs in the hub's chroma (drawn at the piece floor: the window's own arcs are hairlines that do
  // not read) rise off them in turn, and circle back down
  prototemplate: {
    u: 1, hit: 'scatter', room: [0.05, 0.25], shield: true,
    idle: (B) => [
      ...['#00b3ff', '#ffc53b', '#ff3b6b', '#27d17e'].map((col, i) => B.path(B.drawn('horizon', col), { T: 12, phase: i / 4, pos: (t) => ({ a: TAU * t + 0.5, r: 0.55, h: 0.2 + 0.5 * Math.sin(Math.PI * t) ** 2 }), rot: (t) => 6 * Math.sin(TAU * t) })),
      B.rings(['#4b3bff', '#00b3ff', '#27d17e', '#ffc53b', '#ff3b6b'], { T: 12, r0: 0.4, dr: 0.055, key: '#0f1113', dash: true }),
    ],
  },
  // the taped card and its two tapes orbit, bobbing, a ring round its head (fix 2 A2: over the face's band, so a
  // front pass never crosses the face and a back pass still shows over the head)
  'bday-land': { u: 1.15, hit: 'jump', idle: (B) => [0, 1, 2, 1].map((p, i) => B.path(p, { T: 8, phase: i / 4, pos: (t) => ({ a: TAU * t, r: 0.62, h: [0.86, 0.98, 1.1, 0.92][i] + 0.035 * Math.sin(TAU * (3 * t + i / 4)) }), rot: (t) => 14 * Math.sin(TAU * (t + i / 4)) })) },
  // chalk grains drift down past the figure
  powerlifting: { u: 1.3, hit: 'scatter', idle: (B) => [1, 2, 3, 4].map((p, i) => B.path(p, { T: 5, delay: i * 1.25, twin: false, pos: (t) => ({ a: [0.6, -0.5, 1.2, -1.1][i], r: 0.36 + 0.08 * t, h: 1.08 - 1.0 * t }), op: env(0.15, 0.25, 0.75), sc: () => 0.95 })) },
  // matter only: its chips are a "what changed" read and never orbit (decision 19)
  elo: { u: 1, hit: 'none', idle: () => [] },
  // the membrane trace floats flat by the head; the wing strokes beat
  cotfly: { u: 1.0, hit: 'flat', idle: (B) => [B.perch(0, { a: 0.55, r: 0.32, h: 1.06, breathe: 3.2 }), B.perch(1, { a: -0.9, r: 0.38, h: 0.78, beat: 6 }), B.perch(1, { a: 0.95, r: 0.38, h: 0.74, beat: 6, mirror: true, delay: 0.08 })] },
  // the tile passes hook to hook over it
  relay: { u: 1.0, hit: 'scatter', idle: (B) => B.handoff({ hooks: [1, 2], tile: 3 }) },
  // the thread draws round the pad, holds, retracts; the link rides its head; the page's brackets and its caret orbit
  'kevin-wiki': {
    u: 1.5, hit: 'snap', room: [0.05, 0.25],
    idle: (B) => [
      B.path(0, { T: 9, pos: (t) => ({ a: TAU * t + 2, r: 0.58, h: 0.84 }), rot: (t) => 8 * Math.sin(TAU * t) }),
      B.thread(1, { T: 5.6, r: 0.6 }),
      // (fix 3 A5 critic: the caret is a thin bar over the graph's own orange points, so at size 1 it read in 2 of 5
      // samples at 1024 and 1440 (93-613 px against a 242 floor); a desktop caret flies at 1.45)
      B.path(2, { T: 9, phase: 0.5, size: coarse() ? 1 : 1.45, pos: (t) => ({ a: TAU * t + 2, r: 0.58, h: 0.32 + 0.04 * Math.sin(TAU * 3 * t) }) }),
      // (and a desktop's second pair of brackets, smaller, opposite the first over the graph's top, where a bracket reads
      // on every pass: the caret behind the graph and the thread retracting fell in one sample, 2,3,2,3,3 at 1024)
      coarse() ? null : B.path(0, { T: 9, phase: 0.5, size: 0.78, pos: (t) => ({ a: TAU * t + 2, r: 0.58, h: 0.9 }), rot: (t) => -8 * Math.sin(TAU * t) }),
    ],
  },
  // the game's dashed range ring in the tower's accent, its halves either side of the tower, and pieces of the tower's
  // own energy that step with its form and level (fix 3 A2), in its accent: two sparks at Level 1, one star at 2, two
  // stars and an arc at 3, motes over a 4A dome, chain arcs round a 4B. A Level 2 wears a coil ring fixed round its
  // drawn box and a Level 3 a lit plinth under it as well (`B.attach`, not orbiting: the level's silhouette step). The
  // road tile is the third piece, hovering over the side of the top with the most room (fix 3 A5, off the badge)
  'princeton-td': {
    u: 1, hit: 'scatter', room: [0.05, 0.25], shell: true,
    idle: (B) => {
      const L = B.level ?? '1';
      const bob = (h, i, n) => (t) => h + 0.04 * Math.sin(TAU * (2 * t + i / n));
      // (fix 3 A5 critic: a piece fades where its loop would cross the tower's middle or a leader, and those runs lie
      // half a loop apart, at the front and the back; two pieces half a loop apart faded together, so a Level 1 tower
      // stood bare for a third of a second at a time. Two pieces stand a quarter of a loop apart, where a phone's one
      // whole copy each keeps the half)
      const q2 = coarse() ? 0.5 : 0.25;
      const orbit = (kind, i, n, h, o = {}) => B.path(B.drawn(kind), { T: 9, phase: o.phase ?? i / n, tint: true, pos: (t) => ({ a: TAU * t + (o.a0 ?? 0), r: o.r ?? 0.7, h: bob(h, i, n)(t) }), rot: o.rot ?? ((t) => 12 * Math.sin(TAU * (t + i / n))), size: o.size ?? 1 });
      const crown = () => B.path(B.drawn('tile'), { T: 7, twin: false, size: 0.82, still: 0.25, pos: (t) => ({ a: B.roomy * (Math.PI / 2 - 0.35), r: 0.36 + 0.04 * Math.sin(TAU * t), h: 1.04 + 0.04 * Math.sin(TAU * t) }), rot: (t) => -10 + 8 * Math.sin(TAU * t) });
      const sets = {
        // (fix 3 A5 critic: a desktop Level 1 flies three sparks a third of a loop apart, so its fade runs (front and back,
        // half a loop apart) fall a sixth of a loop apart and at most one spark is out at a time; two left it at one spark
        // and the tile in 2 of 5 read samples. A phone keeps two, half a loop apart, its two-piece budget)
        1: () => (coarse() ? [orbit('spark', 0, 2, 0.62, { rot: (t) => 180 * t }), orbit('spark', 1, 2, 0.76, { phase: q2, rot: (t) => -180 * t })]
          : [0, 1, 2].map((i) => orbit('spark', i, 3, [0.62, 0.76, 0.69][i], { rot: (t) => (i % 2 ? -180 : 180) * t }))),
        2: () => [B.attach('coil'), orbit('star', 0, 1, 0.84)],
        3: () => [B.attach('plinth'), orbit('star', 0, 2, 0.86), orbit('star', 1, 2, 0.6, { phase: q2 }), orbit('arc', 0.5, 2, 0.72, { phase: coarse() ? 0.25 : 0.625, rot: (t) => 10 * Math.sin(TAU * t) })],
        '4a': () => [0, 1, 2].map((i) => orbit('motes', i, 3, 1.0 + 0.06 * (i % 2), { r: 0.5, rot: (t) => 40 * Math.sin(TAU * (t + i / 3)) })),
        '4b': () => [0, 1, 2].map((i) => orbit('chain', i, 3, [0.78, 0.5, 0.64][i], { r: 0.72, rot: (t) => -14 + 28 * Math.sin(TAU * (t + i / 3)) })),
      };
      return [B.range(), ...(sets[L] ?? sets[1])(), crown()];
    },
  },
};

// ---------------------------------------------------------------- mount
/** `ctx`: { ground (the floor layer under the pads, board px: the matter), ringFront (accepted; the floor drawings now
 *  lie in the figure's own aura layers, so they sort with it), hue, paused, anim?, ptd?, reduced? }. Returns the aura's handle; nothing is fetched or built in this call (idle tasks do it, after the deal). */
export function mountAura(fig, ctx = {}) {
  watch();
  if (fig) figures.add(fig);
  const id = fig?.id ?? '', def = CARDS[id] ?? { u: 1, hit: 'scatter', idle: () => [] };
  const hue = { ...hueOf(id), ...(ctx.hue ?? {}) };
  const L = layers(fig);
  const me = {
    paused: Boolean(typeof ctx.paused === 'function' ? ctx.paused() : ctx.paused), geo: null, built: false, disposed: false, snap: null, form: null,
    anims: new Set(), beats: new Set(), wrapA: null, floorA: null, hold: { act: false }, own: true,
  };
  const reduced = () => reducedNow(ctx);
  const rates = new Map();
  const animate = (e, frames, opts) => (ctx.anim ? ctx.anim(e, frames, opts) : e.animate(frames, opts));
  /** A looping animation, owned by this aura and the pause registry. */
  const loop = (e, frames, opts) => {
    const a = e.animate(frames, { iterations: Infinity, easing: 'linear', fill: 'both', ...opts });
    a.aura = me;
    me.anims.add(a); Aura.running.add(a);
    a.addEventListener('cancel', () => { me.anims.delete(a); Aura.running.delete(a); });
    const f = [...rates.values()].reduce((x, y) => x * y, 1);
    if (f !== 1 && e !== tile) a.playbackRate *= f;
    // (fix 3 A5 critic: a loop laid by a redraw starts where the loops it replaces had reached, not at 0, so a relook
    // or a re-key moves no piece by more than its new path asks; every loop of one laying shares one clock, its phase
    // in its own negative delay, and the tile alone runs off the act's and low HP's rate)
    if (me.laying) { a.lay = true; const T = me.phaseIn?.[e === tile ? 't' : 'p']; if (T != null) a.currentTime = T; }
    if ((holds.size && !(holds.size === 1 && holds.has('busy') && me.live)) || me.paused || pace()?.manual) a.pause();
    return a;
  };
  /** A beat: finite, also paused by a hold. */
  const beat = (e, frames, opts) => {
    const a = animate(e, frames, { fill: 'both', ...opts });
    me.beats.add(a);
    a.finished.catch(() => {}).then(() => me.beats.delete(a));
    if (Aura.heldBeats || me.paused) a.pause();
    return a;
  };

  // the floor: one host on the floor's plane, the matter (masked) and the card's floor drawings over it
  const groundHost = ctx.ground && !(ctx.ground instanceof SVGElement) ? ctx.ground : fallbackGround(fig);
  const floor = el('div', 'au-floor', null);
  floor.dataset.card = id;
  const floorW = el('div', 'au-floor-w', floor);
  const matter = el('i', 'au-matter', floorW);
  const tile = el('b', 'au-tile', matter);
  if (coarse()) Object.assign(matter.style, { mixBlendMode: 'normal', webkitMask: 'none', mask: 'none' });
  // the card's floor drawings (rings, a trace, paw prints) lie on the floor round the pad, never on the body (a lunge,
  // a hover or a sway leaves them on the floor): the far half on the floor under every figure (just over the pads),
  // the near half in the board's `.fig-ring-front` sorted just before this figure; each a floor plane in board px,
  // clipped to its half by the line through the stand across the camera's view
  const farHost = overGround(fig), nearHost = ctx.ringFront ?? null;
  const backF = el('div', 'au-ringf', null);
  const backW = el('div', 'au-floor-w', backF);
  const deco = el('div', 'au-deco', backW);
  const ringF = el('div', 'au-ringf', null);
  // (fix 3 A1: a floor host names its card and side, so its `data-solid` rings are found by the figure they belong to)
  for (const h of [backF, ringF]) { h.dataset.card = id; h.dataset.side = fig?.side ?? ''; }
  const ringW = el('div', 'au-floor-w', ringF);
  const near = el('div', 'au-near', ringW);
  const decoF = el('div', 'au-deco', near);
  // without the board's floor layers (a bare mount), the halves ride the figure's own aura layers as before
  const hostFar = () => farHost ?? L.back, hostNear = () => nearHost ?? L.front;
  // the act's release runs on the board's animation clock (skip finishes it, a hold pauses it)
  const clockEl = el('i', 'au-clock', L.front);
  matter.style.background = `radial-gradient(closest-side, color-mix(in srgb, ${hue.energy} 16%, transparent), color-mix(in srgb, ${hue.deep} 10%, transparent) 70%, transparent)`;
  let tileUrl = null;

  /** Build the pieces for the stand in hand: on the first place after the deal, when the figure shows. */
  const build = async () => {
    if (me.built || me.disposed || !me.geo || fig.el?.hidden) return;
    me.built = true;
    await afterDeal();
    // the matter tile at 55% (the pad covers the contract's 22% at 2.2 x 1.4 m; ROUND6 deviation, .work/r6/l3/look/
    // mcmp.png); only a standing figure builds, so a low-memory phone decodes its two (section 4.1 budgets)
    // (a phone's matter is the hue's own radial wash: no tile to decode, no mask or blend for its compositor to redo
    // under every camera move; fix 1 A3)
    const [pieces, url] = await Promise.all([piecesOf(id), coarse() ? null : matterTile(id, hue.energy, 0.55)]);
    if (me.disposed || !me.geo) { me.built = false; return; }
    tileUrl = url;
    await later(() => draw(pieces));
  };
  /** Empty the aura (`keep`: a redraw under a standing construction keeps it, `draw` lays it again). */
  const clear = (keep = false) => {
    const tfm = keep ? me.tfm : null, mine = new Set(tfm?.anims ?? []);
    // (fix 3 A4: a shell flash standing through a redraw is laid again where it had reached)
    const fa = me.flashA?.[0];
    me.flashT = keep && fa && fa.playState !== 'finished' && fa.currentTime != null ? fa.currentTime : null;
    for (const a of [...me.anims]) a.cancel();
    for (const a of [...me.beats]) if (!mine.has(a)) a.cancel();
    for (const w of [L.wb, L.wf, L.wab, L.wa]) w.textContent = '';
    deco.textContent = ''; decoF.textContent = '';
    tile.getAnimations?.().forEach((a) => a.cancel());
    me.drawn = null;
    me.shieldEls = me.shellEls = me.perch = me.kickBox = me.chip = me.thread = me.ringSvgs = me.corners = me.ringR = me.tinted = me.traceR = me.att = null;
    if (!keep && me.tfm) endTfm();
  };
  /** Lay every piece for the current stand (also on a new layout), on the clock of the loops it replaces. */
  const draw = (pieces) => {
    if (me.disposed || !me.geo) return;
    const lay = [...me.anims].filter((a) => a.lay && a.currentTime != null), pick = (t) => lay.find((a) => (a.effect?.target === tile) === t)?.currentTime ?? null;
    me.phaseIn = lay.length ? { p: pick(false), t: pick(true) } : null;
    me.laying = true;
    try { lay0(pieces); } finally { me.laying = false; me.phaseIn = null; }
  };
  const lay0 = (pieces) => {
    clear(true);
    const G = me.geo, rd = reduced();
    me.pad = G.pad; me.shift = null;
    // the HUD plates as they stand now (the hud lays them after the board's first layout)
    G.room.plates = G.roomO.plates = G.platesNow();
    G.hud = G.hudNow();
    me.foes = foesOf(fig);
    groundHost?.append?.(floor);
    hostFar()?.append(backF);
    if (coarse()) { ringF.remove(); backF.style.clipPath = 'none'; } else hostNear()?.append(ringF);
    // the matter tile: an oversized child translated one tile per 6 s in the card's flow, transform only
    if (tileUrl) {
      const T = G.tilePx, [flow, param] = FLOW[id] ?? ['grid', 0];
      const v = flowVector(flow, param);
      const m = Math.max(1, Math.abs(v[0]), Math.abs(v[1]));
      Object.assign(tile.style, { left: `${-m * T}px`, top: `${-m * T}px`, width: `${G.fw + 2 * m * T}px`, height: `${G.fd + 2 * m * T}px`, backgroundImage: `url("${tileUrl}")`, backgroundSize: `${T}px ${T}px` });
      matter.style.background = 'none';
      // (a phone's matter lies still: a moving masked, blended layer is what a software compositor pays for each frame)
      if (!rd && !coarse()) {
        if (flow === 'burst' || flow === 'rings') loop(tile, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.18)', opacity: 0.55, offset: 0.85 }, { transform: 'scale(1.2)', opacity: 1 }], { duration: 6000, easing: 'ease-in-out', direction: 'alternate' });
        else loop(tile, [{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(${F(v[0] * T)}px,${F(v[1] * T)}px,0)` }], { duration: 6000 * Math.hypot(v[0], v[1]) });
      }
    }
    for (const d of [deco, decoF]) d.style.transformOrigin = `${F(G.fw / 2)}px ${F(G.fd / 2)}px`;
    const B = builder(me, fig, G, pieces, def, { loop, beat, rd, L, deco, decoF, hue, reduced: rd });
    const items = def.idle(B).flat().filter(Boolean);
    me.drawn = { B, items };
    me.attIn = false;
    if (coarse() && !deco.childElementCount) backF.remove();
    me.low = undefined; me.bar = undefined;
    if (me.snap) applyState(true);
    // (a construction standing through the redraw: laid again on these pieces, about this pad, where it had reached)
    if (me.tfm) { if (rd) endTfm(); else relayTfm(); }
  };
  const applyState = (quiet = false) => {
    const s = me.snap;
    if (!s || !me.drawn) return;
    const B = me.drawn.B;
    // HP at a quarter or under: one piece in three dims, the orbit slows
    const low = s.hp > 0 && s.hp <= s.maxHp / 4;
    if (low !== me.low) {
      me.low = low;
      me.drawn.items.forEach((it, i) => { if (i % 3 === 2) for (const b of [...(it.boxes ?? []), ...(it.trails ?? [])]) b.style.filter = low ? 'opacity(.35)' : ''; });
      rate(low ? 0.7 : 1, 'low');
    }
    // net stat stages: the orbit widens or tightens 10% a stage (cap 2)
    const st = s.stages ?? {}, net = Math.max(-2, Math.min(2, (st.atk ?? 0) + (st.def ?? 0) + (st.spd ?? 0)));
    if (net !== me.net) {
      const was = me.net ?? 0;
      me.net = net;
      const k = Math.pow(net >= 0 ? 1.1 : 0.9, Math.abs(net));
      wrapTo(`scale(${F(k)})`, quiet || reduced() ? 0 : 260);
      if (!quiet && id === 'loop' && net !== was) B.rows(net > was, 450);
    }
    // barrier: Prototemplate's rings rise into a cylinder; Princeton TD wears a hex shell in its side's hue at 0.35
    // round the tower's drawn box (fix 2 A1: the scaffold is the construction's alone, never the barrier's)
    const bv = s.barrier ?? 0, bar = bv > 0;
    // (fix 3 A4: a blow the barrier takes shows the whole shell again for 600 ms)
    if (!quiet && def.shell && me.bar && me.barV != null && bv < me.barV && bv > 0) B.shellFlash?.();
    me.barV = bv;
    if (bar !== me.bar) {
      me.bar = bar;
      if (def.shield) B.shield?.(bar, quiet || reduced());
      if (def.shell) B.shell?.(bar, quiet || reduced());
      (ctx.ptd ?? fig.ptd)?.barrier?.(false, 0);
    }
  };
  // the wrapper's resting transform (stat stages, victory); beats play over it and return to it
  let rest = 'none';
  const wrapTo = (to, ms) => {
    const from = rest;
    rest = to;
    for (const w of [L.wb, L.wf]) {
      w.style.transform = to === 'none' ? '' : to;
      if (ms) beat(w, [{ transform: from }, { transform: to }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' });
    }
  };
  /** Every looping piece of this aura at `f` times its pace (`why` keyed so act and low HP compose). */
  const rate = (f, why) => {
    const was = [...rates.values()].reduce((a, b) => a * b, 1);
    if (f === 1) rates.delete(why); else rates.set(why, f);
    const now = [...rates.values()].reduce((a, b) => a * b, 1);
    if (now === was) return;
    for (const a of me.anims) if (a.effect?.target !== tile) a.playbackRate = (a.playbackRate / was) * now;
  };
  // (only a layer that holds a piece: a phone's back layer is mostly empty, and a beat on it is a wasted start)
  const both = (frames, opts) => [L.wb, L.wf].filter((w) => w.childElementCount).map((w) => beat(w, frames, opts));

  // a figure on the bench wears nothing; it builds when it shows and is cleared when it goes
  const mo = new MutationObserver(() => {
    if (fig.el?.hidden) { clear(); me.built = false; floor.remove(); backF.remove(); ringF.remove(); }
    else if (me.geo) { build(); entrance(); }
    // (a figure that stands or leaves changes what every other aura laid its pieces round: each lays them again, in
    // an idle task, where its key moved)
    for (const h of mounted) if (h !== handle) h.relook?.();
  });
  if (fig.el) mo.observe(fig.el, { attributes: true, attributeFilter: ['hidden'] });
  /** The pieces spiral out of the pad (a send-in), the floor grows from it. */
  const entrance = (o = {}) => {
    if (reduced()) return;
    const now = performance.now();
    if (me.enteredAt && now - me.enteredAt < 120 && !o.ms) return;
    me.enteredAt = now;
    const ms = o.ms ?? 380, rise = o.rise ?? 320;
    if (me.floorA) me.floorA.cancel();
    for (const w of [backW, ringW]) beat(w, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    me.floorA = beat(floorW, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    // the pieces spiral out once the figure has risen (`at`, the board's own timing, else rise + 80), over `pieces`
    both([{ transform: `${rest === 'none' ? '' : rest} scale(0) rotate(-180deg)`, opacity: 0 }, { transform: rest, opacity: 1 }], { duration: o.pieces ?? 400, delay: o.at ?? rise + 80, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
  };

  // ---------------------------------------------------------------- the construction (fix 1 A2; fix pass 2)
  // A build's or a full upgrade's pieces spiral into the pad (the `'in'` call), gathered there by position: the
  // wrappers close to GK about the pad while the orbit runs 3.5 times, and each piece's drawing is counter-scaled so it keeps its size, and
  // the back layer stands over the figure so the whole gathered ring reads in front of the tower's foot. The new form's
  // state at the board's impact (`state()`, from `wear()`) bursts them out past the orbit (1.55) in the new accent with a
  // floor ring, and they settle home by impact + 900. A Level 2 or 3 upgrade's impact bursts them from the orbit. The
  // construction outlives a redraw (the rise or the impact re-keys the tower, `place()`): `draw()` lays it again on the
  // new pieces about the new pad at the same time, so it never drops back to the orbit mid-build.
  // (a phone gathers tighter and bursts wider, fix 2 critic: its two pieces' rest orbit is cramped, so the same scale
  // reads less there)
  const GK = coarse() ? 0.34 : 0.42, HOLD = 2600, BK = coarse() ? 1.18 : 1;
  /** The wrappers scaled `k` about the pad the pieces were laid round (the foot), over their rest. Never turned in the
   *  screen's plane: a turn about the foot swings a piece under the floor; the swirl is the orbit's own, spun up. */
  // (`me.shift`: pieces laid about an older pad, the tower re-keyed under a standing construction until they are laid
  // again, carried onto the new pad so the gathered cluster never hops with the figure's origin)
  const pivot = (k) => { const d = me.pad ?? me.geo?.pad ?? { x: 0, y: 0 }, sh = me.shift; return `${rest === 'none' ? '' : rest} translate3d(${F(d.x)}px,${F(d.y)}px,0) scale(${F(k)}) translate3d(${F(-d.x)}px,${F(-d.y)}px,0)${sh ? ` translate3d(${F(sh.x)}px,${F(sh.y)}px,0)` : ''}`; };
  const endTfm = () => { for (const a of me.tfm?.anims ?? []) a.cancel(); me.tfm = null; rate(1, 'build'); me.live = Boolean(me.hold.act); sync(); };
  /** Lay the construction `t` ({ phase, D, keys, z, ring? }) on the wrappers, the pieces and the back layer, `at` ms in. */
  const runTfm = (t, at = 0) => {
    // (the one standing before it, a gather under its burst, goes: it would show again when the burst ends)
    for (const a of [...(t.anims ?? []), ...(me.tfm && me.tfm !== t ? me.tfm.anims ?? [] : [])]) a.cancel();
    const ks = t.keys, opts = { duration: t.D, fill: 'none' };
    const anims = both(ks.map((q) => ({ offset: q.o, easing: q.e ?? 'linear', transform: pivot(q.k) })), opts);
    // each piece's drawing at size / k: a gathered piece keeps its size (the floor), a burst one swells a little
    const inv = ks.map((q) => ({ offset: q.o, easing: q.e ?? 'linear', transform: `scale(${F((q.size ?? 1) / q.k)})` }));
    for (const w of [L.wb, L.wf]) for (const d of w.querySelectorAll(':scope > .au-p > :first-child')) anims.push(beat(d, inv, opts));
    // (the back copies over the figure while gathered: discrete steps, never a crossfade)
    if (t.z) anims.push(beat(L.back, t.z.map(([o, z]) => ({ offset: o, zIndex: z, easing: 'steps(1, end)' })), opts));
    if (t.ring && me.drawn) anims.push(...me.drawn.B.burstRing(t.ring, Math.round(t.D * 0.62)));
    if (at) for (const a of anims) { try { a.currentTime = Math.min(at, t.D - 1); } catch { /* gone */ } }
    t.anims = anims;
    me.tfm = t;
    me.live = true; sync();
    anims[0]?.finished.then(() => { if (me.tfm === t) endTfm(); }, () => {});
  };
  /** The construction standing, laid again on new pieces at the time it had reached (a redraw under it). */
  const relayTfm = () => {
    const t = me.tfm;
    if (!t) return;
    const at = Math.max(0, t.anims?.[0]?.currentTime ?? 0);
    runTfm(t, at);
  };
  /** Where a gather stands `e` ms in: its scale. */
  const gatherAt = (t, e) => { const m = t.land ?? t.ms; return { k: e < m ? 1 - (1 - GK) * Math.min(1, e / Math.max(1, m)) : GK }; };
  /** Spiral into the pad over `ms`, then turn there (GK) until the burst; alone, it returns by itself. */
  const gather = (ms) => {
    endTfm();
    if (!me.drawn) return;
    // (the act's own tighten gives the wrappers to the construction)
    for (const a of me.actA ?? []) a.cancel();
    me.actA = [];
    // (the spiral lands 50 ms early, a quarter of a short one at most: its first frame comes a frame or two after the
    // board's call, and a short (Auto) build stood barely gathered at its spiral's end, fix 3 A2 critic)
    const land = ms - Math.min(50, ms / 4), D = ms + HOLD, a = land / D, b = (ms + HOLD * 0.9) / D;
    me.cons = { burst: false };
    // (fix 3 A2: the old level's attached part goes with the old tower over the spiral, and stays gone until the new
    // form lays its own; a redraw cancels this, so the new part shows)
    for (const w of [L.wa, L.wab]) if (w.querySelector('.au-att')) for (const e of w.querySelectorAll(':scope > .au-att')) beat(e, [{ opacity: 1 }, { opacity: 0, offset: Math.min(0.9, a) }, { opacity: 0, offset: 0.98 }, { opacity: 1 }], { duration: D, fill: 'none' });
    rate(3.5, 'build');
    runTfm({
      phase: 'gather', D, ms, land, full: ms >= 300,
      keys: [{ o: 0, k: 1, e: 'cubic-bezier(.45,0,.7,.4)' }, { o: a, k: GK }, { o: b, k: GK, e: 'cubic-bezier(.2,.8,.2,1)' }, { o: 1, k: 1 }],
      z: [[0, 0], [a * 0.6, 3], [b, 0], [1, 0]],
    });
  };
  /** The impact: out past the orbit (1.55) in the new accent, held wide (1.42 to impact + 340), home by impact + 900.
   *  With no gather standing (a Level 2 or 3 upgrade, which wraps the standing tower), from the orbit itself. */
  const burst = (fromRest = false) => {
    const t = me.tfm;
    if (!me.drawn || (!fromRest && t?.phase !== 'gather')) return;
    const g = fromRest ? { k: 1 } : gatherAt(t, Math.max(0, t.anims?.[0]?.currentTime ?? 0));
    const D = fromRest ? 760 : 900;
    if (me.cons) me.cons.burst = true;
    rate(1, 'build');
    runTfm({
      phase: 'burst', D,
      keys: [{ o: 0, k: g.k, e: 'cubic-bezier(.2,.8,.2,1)' }, { o: 0.1, k: F(1.55 * BK), size: 1.15 }, { o: 0.38, k: F(1.42 * BK), size: 1.08, e: 'cubic-bezier(.4,0,.2,1)' }, { o: 1, k: 1 }],
      ring: formAccent(me.form ?? 'lab', me.level),
    });
  };

  /** The tower's level star on its plate lights once an upgrade has grown (fix 3 A2): the plate's newest star (or its
   *  branch mark) glows in the side's hue, up and down over 1.2 s, opacity only, on the board's clock (a glow laid
   *  over the star, fixed to the screen like the plate, so the plate's own markup is never touched and nothing shifts);
   *  never under reduced motion. */
  const lightStar = (delay = 0) => {
    if (reduced()) return;
    const go = (tries = 3) => {
      if (me.disposed || reduced()) return;
      const row = document.querySelector(`.plate[data-side="${fig.side}"] .pl-form:not([hidden])`);
      const stars = row ? [...row.querySelectorAll('.tw-star[data-on="true"], .tw-branch')] : [];
      const t = stars.at(-1), r = t?.getBoundingClientRect();
      // (the plate may redraw its row a beat after the impact: look again, 120 ms on, three times)
      if (!r || !r.width) { if (tries > 0) animate(clockEl, [{ opacity: 0 }, { opacity: 0 }], { duration: 120, fill: 'none' }).finished.then(() => go(tries - 1), () => {}); return; }
      document.querySelector(`.au-starlight[data-side="${fig.side}"]`)?.remove();
      const g = el('i', 'au-starlight', null), d = Math.max(r.width, r.height) * 2.6;
      g.dataset.side = fig.side;
      const col = fig.side === 'player' ? 'var(--you, #5f87e8)' : 'var(--rival, #e5683f)';
      g.style.cssText = `position:fixed;left:${F(r.left + r.width / 2 - d / 2)}px;top:${F(r.top + r.height / 2 - d / 2)}px;width:${F(d)}px;height:${F(d)}px;border-radius:50%;pointer-events:none;z-index:60;opacity:0;mix-blend-mode:screen;background:radial-gradient(closest-side, color-mix(in srgb, ${col} 70%, #fff) 0%, color-mix(in srgb, ${col} 55%, transparent) 42%, transparent 100%)`;
      document.body.append(g);
      // (the board's own clock, not the aura's beats: a redraw of the pieces never cancels it)
      animate(g, [{ opacity: 0 }, { opacity: 1, offset: 0.14 }, { opacity: 0.85, offset: 0.62 }, { opacity: 0 }], { duration: 1200, easing: 'ease-out', fill: 'both' }).finished.catch(() => {}).then(() => g.remove());
    };
    if (delay > 0) animate(clockEl, [{ opacity: 0 }, { opacity: 0 }], { duration: delay, fill: 'none' }).finished.then(() => go(), () => {}); else go();
  };
  const handle = {
    /** Lay the floor matter and sample the orbits for the figure's stand `st` in geometry `g` (on `layout()` only). */
    place(st, g) {
      if (!st || !g?.P || !fig?.box) return;
      me.geo = geometry(fig, st, g, def.u, def.room);
      floor.style.cssText = `width:${F(me.geo.fw)}px;height:${F(me.geo.fd)}px;transform:${me.geo.floorM}`;
      // in board px on the board's floor layers; in the figure's px on its own layers (a bare mount)
      const at = (board) => `width:${F(me.geo.fw)}px;height:${F(me.geo.fd)}px;transform:${board ? '' : `translate3d(${F(-me.geo.ox)}px,${F(-me.geo.oy)}px,0) `}${me.geo.floorM}`;
      backF.style.cssText = `${at(Boolean(farHost))};clip-path:${coarse() ? 'none' : me.geo.half(-1)}`;
      ringF.style.cssText = `${at(Boolean(nearHost))};clip-path:${me.geo.half(1)}`;
      if (nearHost) nearHost.style.zIndex ||= String(Math.round(st.y) + 1);
      // (a construction standing while the tower re-keys: its pieces, still laid about the old pad until the idle redraw,
      // are carried onto the new one at once, fix 3 A2 critic: the gathered cluster hopped by the figure's new origin
      // for a frame or more at 390)
      const P = me.geo.pad, P0 = me.pad;
      if (me.tfm && me.drawn && P0 && P && (P.x !== P0.x || P.y !== P0.y)) { me.shift = { x: P.x - P0.x + (me.shift?.x ?? 0), y: P.y - P0.y + (me.shift?.y ?? 0) }; me.pad = P; relayTfm(); }
      // (the pieces are read now: a draw or a dispose before the idle task may clear `me.drawn`)
      if (me.drawn) { const pcs = me.drawn.B.pieces; later(() => draw(pcs)); }
      else build();
    },
    /** One beat of `AURA_KINDS`; `o` carries its timing ({ ms, at, share, crit, rise, phase, accent }). */
    beat(kind, o = {}) {
      if (me.disposed || reduced()) {
        if (kind === 'transform' && o.form) handle.state({ ...(me.snap ?? {}), form: o.form });
        return;
      }
      switch (kind) {
        case 'act': {
          // the pieces gather (the wrapper tightens to 0.7 and the orbit runs 2.5 times) and the floor brightens,
          // until the release (or `ms`, the time to impact - 40)
          me.hold.act = true;
          // (a phone keeps its loops held through the act: the batch's own beats are what it pays for, fix pass 2)
          if (!coarse()) { me.live = true; sync(); }
          rate(2.5, 'act');
          // (a construction owns the wrappers: the act only speeds the orbit)
          if (!me.tfm) both([{ transform: rest }, { transform: `${rest === 'none' ? '' : rest} scale(.7)` }], { duration: 160, easing: 'cubic-bezier(.3,.7,.1,1)', fill: 'forwards' }).forEach((a) => { me.actA = (me.actA ?? []).concat(a); });
          me.matterA?.cancel();
          me.matterA = beat(matter, [{ opacity: 0.85 }, { opacity: 1 }], { duration: 160, fill: 'forwards' });
          me.drawn?.B.act?.(true);
          // released at `ms` (the time to impact - 40) unless the board releases it first; a newer act re-arms it
          const n = (me.actN = (me.actN ?? 0) + 1);
          me.actT?.cancel();
          me.actT = beat(clockEl, [{ opacity: 0 }, { opacity: 0 }], { duration: Math.min(2600, o.ms ?? 900), fill: 'none' });
          me.actT.finished.then(() => { if (me.hold.act && me.actN === n) handle.beat('release'); }, () => {});
          return;
        }
        case 'release': {
          // after a full scene the board re-lights the attacker (`relight` ms): its floor matter up 0.2 and back
          if (o.relight && !me.hold.act) { beat(matter, [{ opacity: 0.85 }, { opacity: 1, offset: 0.3 }, { opacity: 0.85 }], { duration: o.relight, fill: 'none' }); return; }
          rate(1, 'act');
          for (const a of me.actA ?? []) a.cancel();
          me.actA = [];
          // (fix 2 A3: the release flings the gathered orbit out past its rest, 1.3, and home over 400 ms)
          if (me.hold.act && !me.tfm) { const r0 = rest === 'none' ? '' : rest; both([{ transform: `${r0} scale(.7)`, easing: 'cubic-bezier(.15,.85,.3,1)' }, { transform: `${r0} scale(1.3)`, offset: 0.32, easing: 'cubic-bezier(.45,0,.25,1)' }, { transform: rest }], { duration: 400, fill: 'none' }); }
          me.matterA?.cancel(); me.matterA = null;
          me.hold.act = false;
          me.live = Boolean(me.tfm); sync();
          me.drawn?.B.act?.(false);
          return;
        }
        case 'hit': {
          // (fix 3 A4: a blow on a standing barrier shows the whole shell for 600 ms)
          if (def.shell && me.bar && !o.status) me.drawn?.B.shellFlash?.();
          const share = Math.max(0, Math.min(1, o.share ?? 0.2));
          const r = rest === 'none' ? '' : rest;
          const style = def.hit;
          if (style === 'none') return;
          if (style === 'blink') { both([{ opacity: 1 }, { opacity: 0, offset: 0.2 }, { opacity: 1, offset: 0.4 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }], { duration: 420, easing: 'steps(1, end)', fill: 'none' }); return; }
          if (style === 'tilt') { both([{ transform: r || 'none' }, { transform: `${r} rotate(${fig.side === 'player' ? -8 : 8}deg)`, offset: 0.3 }, { transform: r || 'none' }], { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' }); return; }
          if (style === 'jump') { const d = -0.1 * (me.geo?.hPx ?? 100); both([{ transform: r || 'none' }, { transform: `translate3d(0,${F(d)}px,0) ${r}`, offset: 0.3 }, { transform: `translate3d(0,${F(d * -0.12)}px,0) ${r}`, offset: 0.62 }, { transform: r || 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' }); return; }
          if (style === 'flat' || style === 'break' || style === 'puff' || style === 'hop' || style === 'snap') { me.drawn?.B.react?.(style, share); if (style !== 'flat') return; }
          const k = style === 'jolt' ? 1.28 : 1.5;
          const ms = style === 'jolt' ? 300 : 600;
          both([{ transform: r || 'none' }, { transform: `${r} scale(${F(1 + (k - 1) * (0.6 + 0.4 * share))})`, offset: 0.28 }, { transform: r || 'none' }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' });
          return;
        }
        case 'ko': {
          // the pieces drop to the floor in a 300 ms arc and fade with the sink; the floor dims
          const d = me.geo ? me.geo.hPx * 0.5 : 60;
          both([{ transform: rest, opacity: 1 }, { transform: `translate3d(0,${F(d)}px,0) scale(1,.35)`, opacity: 0.85, offset: 0.55 }, { transform: `translate3d(0,${F(d)}px,0) scale(1.1,.1)`, opacity: 0 }], { duration: o.ms ?? 560, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
          for (const w of [floorW, backW, ringW, L.wa, L.wab]) beat(w, [{ opacity: 1 }, { opacity: 0 }], { duration: (o.ms ?? 560) + 200, fill: 'forwards' });
          return;
        }
        case 'switch-out': {
          const ms = o.ms ?? 260;
          both([{ transform: rest, opacity: 1 }, { transform: 'scale(0) rotate(180deg)', opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
          for (const w of [floorW, backW, ringW]) beat(w, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.2)', opacity: 0 }], { duration: ms + 120, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
          for (const w of [L.wa, L.wab]) beat(w, [{ opacity: 1 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
          return;
        }
        case 'switch-in': entrance(o); return;
        case 'transform': {
          // Princeton TD (re)built or upgraded (fix 1 A2): the pieces spiral into the pad (phase 'in') and turn there,
          // gathered, until the impact, where the new form's state (`wear()`) bursts them out in its accent; they are
          // home by impact + 900, so the board's later 'out' is a no-op once a burst has played
          if (o.phase === 'in') { gather(o.ms ?? 300); return; }
          if (o.form) handle.state({ ...(me.snap ?? {}), form: o.form, level: o.level ?? me.snap?.level });
          if (me.tfm?.phase === 'burst' || (o.phase === 'out' && me.cons?.burst)) return;
          me.drawn?.B.foundation?.(o.ms ?? 300);
          if (me.tfm?.phase === 'gather') { burst(); return; }
          // (a Level 2 or 3 upgrade's impact: no gather, the pieces burst from their orbit)
          if (!o.phase) { burst(true); return; }
          // (no gather stood: a cue cut short) they spiral out as they came
          both([{ transform: 'scale(.15) rotate(-160deg)', opacity: 0 }, { transform: rest, opacity: 1 }], { duration: o.ms ?? 300, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
          return;
        }
        case 'victory': {
          wrapTo('scale(1.3)', 600);
          rate(1 / 1.5, 'victory');
          return;
        }
        default:
      }
    },
    /** The fighter's state from a snapshot (HP share, stat stages, barrier; a form card's form and level). */
    state(snap) {
      if (!snap) return;
      const form = snap.form ?? null, level = snap.level ?? null;
      // (under a gather any new form or level is the construction landing, a first build's included)
      const gathering = me.tfm?.phase === 'gather';
      const changed = (form && (me.form || gathering) && form !== me.form) || (level != null && (me.level != null || gathering) && level !== me.level);
      me.snap = { ...snap };
      const was = `${me.form}|${lvlOf(me.level)}`, up = form && form === me.form && me.level != null && level != null && lvlOf(level) !== lvlOf(me.level);
      if (level != null) me.level = level;
      if (form && form !== me.form) { me.form = form; me.drawn?.B.accent?.(formAccent(form, me.level), TOWER[form]?.[1]); }
      // (fix 3 A2: the pieces are the form's at its level, so a new form or level lays them again, in an idle task; a
      // construction standing is laid again on them where it had reached; a level's attached part comes in with it,
      // and an upgrade lights the level star once it has grown)
      if (`${me.form}|${lvlOf(me.level)}` !== was && me.drawn && id === 'princeton-td') {
        if (!reduced()) me.attIn = true;
        const pcs = me.drawn.B.pieces;
        later(() => draw(pcs));
        if (up && !reduced()) lightStar(280);
      }
      // the new form's state lands at the transform's impact: the gathered pieces burst out in its accent
      if (changed && me.tfm?.phase === 'gather' && !reduced()) burst();
      applyState(false);
    },
    pause(b) { me.paused = Boolean(b); for (const a of me.anims) { try { if (me.paused) a.pause(); else if (!holds.size && !pace()?.manual) a.play(); } catch { /* gone */ } } for (const a of me.beats) { try { if (me.paused) a.pause(); else if (!Aura.heldBeats) a.play(); } catch { /* gone */ } } },
    dispose() {
      me.disposed = true;
      mo.disconnect();
      clear();
      floor.remove(); backF.remove(); ringF.remove(); clockEl.remove();
      mounted.delete(handle);
      figures.delete(fig);
      L.dispose();
    },
    /** For the board's specials (arena/specials.js): hide the pieces while they fly as the attack, `ms` long. */
    lend(ms = 300) {
      if (reduced() || !me.drawn) return;
      both([{ opacity: 0 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: ms + 160, easing: 'linear', fill: 'none' });
    },
    /** Where the aura stands (debug and probes): its floor box and the boxes it laid. */
    get info() { const els = handle.els(); return { id, built: me.built, pieces: me.drawn?.B.used ?? 0, items: me.drawn?.items.length ?? 0, boxes: els.length, pieceBoxes: els.filter((e) => e.matches('.au-p, .au-f')).length, running: me.anims.size, phone: me.drawn?.B.phoneDbg ?? null, geo: me.geo && { fw: me.geo.fw, fd: me.geo.fd, U: me.geo.U, hPx: me.geo.hPx, minSide: me.geo.minSide } }; },
    /** Every box the aura draws (pieces, floor drawings, the guard), for the probe's budget and box checks. */
    els() { return [L.wb, L.wf, L.wab, L.wa, deco, decoF].flatMap((w) => [...w.querySelectorAll(':scope > .au-p:not(.au-beat):not(.au-trail), :scope > .au-f, :scope > .au-shield, :scope > svg:not(.au-beat)')]); },
    /** The aura's opaque matter (fix 3 A1, ruling 13): every element marked `data-solid`, `"body"` for matter that stands
     *  on or beside the figure (a level's attached part, a perched piece, a guard's arcs), `"floor"` for a ring or a
     *  disc 24 px across or more lying on the floor round it; orbiting pieces are never marked. The board's hide test
     *  and `share()` union their rects with the figure's (read once a solve). */
    solids() { return [L.wb, L.wf, L.wab, L.wa, deco, decoF].flatMap((w) => [...w.querySelectorAll('[data-solid]')]).filter((e) => e.isConnected); },
    /** The after-image copies (fix 2 A3; not pieces: the probe counts them apart). */
    trails() { return [L.wb, L.wf].flatMap((w) => [...w.querySelectorAll(':scope > .au-trail')]); },
    /** Redraw as the device stands now (a live toggle of reduced motion: stills at once, or the loops back). */
    redraw() { if (me.drawn && !me.disposed) { const pcs = me.drawn.B.pieces; later(() => draw(pcs)); } },
    /** Lay the pieces again if the other standing figures moved since they were laid (one figure stood or left). */
    relook() {
      if (!me.drawn || me.disposed || fig.el?.hidden || foesOf(fig) === me.foes) return;
      // (its own entrance spiral is never cut: the pieces are laid again once it has played)
      const left = 1600 - (performance.now() - (me.enteredAt ?? -1e9));
      if (left > 0) { clearTimeout(me.relookT); me.relookT = setTimeout(() => handle.relook(), left); return; }
      me.foes = foesOf(fig); handle.redraw();
    },
  };
  fig.aura = handle;
  mounted.add(handle);
  watchView(fig);
  return handle;
}

// ---------------------------------------------------------------- layers and geometry
function el(tag, cls, parent) { const e = document.createElement(tag); e.className = cls; parent?.append(e); return e; }
/** The figure's two aura layers (arena/board.js builds them; made here when a board has not). */
function layers(fig) {
  const body = fig?.body;
  let back = fig?.auraBack ?? body?.querySelector?.(':scope > .aura-back');
  let front = fig?.auraFront ?? body?.querySelector?.(':scope > .aura-front');
  const made = [];
  if (body && !back) { back = el('div', 'aura-back', null); body.insertBefore(back, fig.breath ?? body.firstChild); made.push(back); }
  if (body && !front) { front = el('div', 'aura-front', body); made.push(front); }
  if (made.length && fig.breath) { fig.breath.style.zIndex = '1'; }
  back ??= el('div', 'aura-back', null); front ??= el('div', 'aura-front', null);
  const wb = el('div', 'au-w', back), wf = el('div', 'au-w', front);
  // (fix 3 A2, A4: what stands fixed to the drawn box, a level's attached part and the barrier, in wrappers of their
  // own that no beat scales: a gather or an act tightens the orbit, never the tower's own parts)
  const wab = el('div', 'au-w au-wa', back), wa = el('div', 'au-w au-wa', front);
  return { back, front, wb, wf, wab, wa, dispose() { wb.remove(); wf.remove(); wab.remove(); wa.remove(); for (const m of made) m.remove(); } };
}
/** The floor layer the far halves of the floor drawings lie on: just over the pads (`.arena-ground`), under every
 *  figure and the back effects layer; one for the board, made here (a DOM sibling, no board file changes). */
function overGround(fig) {
  const actors = fig?.el?.parentNode, shake = actors?.parentNode;
  if (!shake?.querySelector) return null;
  let host = shake.querySelector(':scope > .au-over');
  if (!host) {
    host = el('div', 'au-over', null);
    const ground = shake.querySelector(':scope > .arena-ground');
    if (ground) ground.after(host); else shake.insertBefore(host, actors);
  }
  return host;
}
/** Without a board-made floor layer: the floor host sits under the pads, over the painted floor. */
function fallbackGround(fig) {
  const actors = fig?.el?.parentNode, shake = actors?.parentNode;
  if (!shake) return null;
  let host = shake.querySelector(':scope > .au-ground');
  if (!host) {
    host = el('div', 'au-ground', null);
    host.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none';
    shake.insertBefore(host, shake.querySelector(':scope > .arena-ground') ?? actors);
  }
  return host;
}
const footOf = (fig) => {
  const m = /([-\d.]+)px\s+([-\d.]+)px/.exec(fig.body?.style.transformOrigin ?? '');
  if (m) return { x: +m[1], y: +m[2] };
  const v = viewOf(fig.id, fig.el?.dataset.view ?? (fig.side === 'player' ? 'rear' : 'front'));
  return v && fig.s ? { x: v.foot[0] * fig.s, y: v.foot[1] * fig.s } : { x: (fig.box?.w ?? 0) / 2, y: fig.h ?? 0 };
};
const S = 100; // floor px a metre (arena/board.js floorBox)
/** Everything a layout fixes: the figure's local frame, its size in metres, the floor's directions at its stand, and
 *  the projection of a floor point at a height into the figure's own px. */
function geometry(fig, st, g, u = 1, share = [0.15, 0.15]) {
  const foot = footOf(fig);
  const ox = st.x - foot.x, oy = st.y - foot.y, P = g.P, k0 = st.k;
  const wM = fig.box.w / k0, hM = (fig.h ?? fig.box.h) / k0;
  // toward the camera on the floor (the way the floor's projection moves down the frame) and the figure's right
  const e = 0.05, a = project(P, st.X, st.Z), bx = project(P, st.X + e, st.Z), bz = project(P, st.X, st.Z + e);
  let fx = bx.y - a.y, fz = bz.y - a.y;
  const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
  let rx = fz, rz = -fx;
  if ((project(P, st.X + rx * e, st.Z + rz * e).x - a.x) < 0) { rx = -rx; rz = -rz; }
  const box = { x: fig.box.x - ox, y: fig.box.y - oy, w: fig.box.w, h: fig.box.h };
  const at = (ang, rW, hH) => {
    const d = rW * wM, dX = d * (Math.cos(ang) * fx + Math.sin(ang) * rx), dZ = d * (Math.cos(ang) * fz + Math.sin(ang) * rz);
    const q = upright(P, st.X + dX, st.Z + dZ, hH * hM);
    return { x: q.x - ox, y: q.y - oy, k: ppm(P, st.X + dX, st.Z + dZ) / k0, f: Math.cos(ang) };
  };
  // the floor host: a 2.2 x 1.4 m box (wider for a wide figure), centred on the stand (the matter's area, section 4.1)
  const grow = Math.max(0.85, Math.min(1.25, wM / 1.6));
  const fw = 2.8 * grow * S, fd = 1.8 * grow * S;
  const floorM = matrix3d(mul3(g.Hf, [[1 / S, 0, st.X - fw / S / 2], [0, -1 / S, st.Z + fd / S / 2], [0, 0, 1]]));
  /** A floor point (angle, radius in figure widths) in the floor host's px. */
  const onFloor = (ang, rW) => {
    const d = rW * wM, dX = d * (Math.cos(ang) * fx + Math.sin(ang) * rx), dZ = d * (Math.cos(ang) * fz + Math.sin(ang) * rz);
    return { x: fw / 2 + dX * S, y: fd / 2 - dZ * S };
  };
  // the near and far halves of the floor round the stand, split by the line across the camera's view through it, as
  // clip paths in the floor host's px (toward the camera is (fx, -fz) there)
  const half = (sgn) => {
    const c = { x: fw / 2, y: fd / 2 }, n = { x: fx * sgn, y: -fz * sgn }, t = { x: -n.y, y: n.x }, E = 8 * Math.max(fw, fd);
    const pts = [[c.x + t.x * E, c.y + t.y * E], [c.x + t.x * E + n.x * E, c.y + t.y * E + n.y * E], [c.x - t.x * E + n.x * E, c.y - t.y * E + n.y * E], [c.x - t.x * E, c.y - t.y * E]];
    return `polygon(${pts.map(([x, y]) => `${F(x)}px ${F(y)}px`).join(',')})`;
  };
  // the room the aura may take (figure px): 1.3 times the figure's box (test 31; the figure's height from its top to
  // its foot, so a floater's pad counts), its 0.3 split above and below by the card (`room`: a card whose drawings lie
  // on the floor takes more below), on the board between the rail and the console, and clear of any HUD plate the
  // figure itself stands clear of
  const hF = Math.max(fig.box.h, st.y - fig.box.y), cxB = box.x + box.w / 2;
  // (fix 2 A2: 8 px clear of the console's top, and 12 px left of the log rail where one stands beside the stage)
  const top = (g.rail ?? 0) + 2 - oy, bottom = Math.max((g.con?.y ?? g.H ?? 1e5) - 8, st.y + 0.04 * hF) - oy;
  const railX = railLeft(fig), right = Math.min((g.W ?? 1e5) - 4, railX - 12) - ox;
  const room = {
    x0: Math.max(cxB - 0.65 * box.w, 4 - ox), x1: Math.min(cxB + 0.65 * box.w, right),
    y0: Math.max(box.y - share[0] * hF, top), y1: Math.min(box.y + (1 + share[1]) * hF, bottom),
    plates: platesNear(fig, ox, oy).filter((r) => !(r.x < box.x + box.w && r.x + r.w > box.x && r.y < box.y + hF && r.y + r.h > box.y)),
  };
  /** Whether a box (figure px) lies in the room. */
  const fits = (x0, y0, x1, y1) => x0 >= room.x0 - 0.5 && x1 <= room.x1 + 0.5 && y0 >= room.y0 - 0.5 && y1 <= room.y1 + 0.5 && !room.plates.some((r) => x0 < r.x + r.w && x1 > r.x && y0 < r.y + r.h && y1 > r.y);
  // the orbit's room (fix 1 A1): a floating piece may take 1.6 times the figure's box (0.35 of its height over its
  // head, 0.25 under its foot), the floor drawings keep the 1.3 room above; the same rails, console and plates
  const roomO = {
    x0: Math.max(cxB - 0.8 * box.w, 4 - ox), x1: Math.min(cxB + 0.8 * box.w, right),
    y0: Math.max(box.y - 0.35 * hF, top), y1: Math.min(box.y + 1.25 * hF, bottom), plates: room.plates,
  };
  // (a half px inside it: the 1.6 is a gate on the drawn boxes, and a phone's figure is small enough for a px to show)
  const fitsO = (x0, y0, x1, y1) => x0 >= roomO.x0 + 0.5 && x1 <= roomO.x1 - 0.5 && y0 >= roomO.y0 + 0.5 && y1 <= roomO.y1 - 0.5 && !roomO.plates.some((r) => x0 < r.x + r.w && x1 > r.x && y0 < r.y + r.h && y1 > r.y);
  /** The largest radius (figure widths, at most `rW`) a floor circle may take: its drawn box (its svg margin `pad`
   *  floor px, grown by `infl` for a box that turns) inside the room. */
  const fitR = (rW, pad = 6, infl = 1) => {
    let r = rW;
    for (let i = 0; i < 40 && r > 0.05; i++) {
      const R = (r * wM * S * infl + pad) / (wM * S);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let j = 0; j < 32; j++) { const q = at((j / 32) * TAU, R, 0); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
      if (fits(x0, y0, x1, y1)) return r;
      r *= 0.94;
    }
    return r;
  };
  /** A floor px point of the floor host (S a metre, its frame `fw` x `fd` centred on the stand) in figure px. */
  const floorPt = (x, y) => { const q = upright(P, st.X + (x - fw / 2) / S, st.Z - (y - fd / 2) / S, 0); return { x: q.x - ox, y: q.y - oy }; };
  /** The largest radius (figure widths, at most `rW`) whose square box (half side r + `pad` floor px, as an svg box
   *  round a floor circle is laid) fits the room, turned anywhere within +-`turn` degrees: every corner of the box is
   *  projected, so the box's own on-screen rect (what a reader of rects sees) stays inside, not only the circle. */
  const fitBox = (rW, pad = 6, turn = 0) => {
    let r = rW;
    const phis = turn ? [-turn, -turn / 2, 0, turn / 2, turn] : [0];
    for (let i = 0; i < 50 && r > 0.04; i++) {
      const a = r * wM * S + pad;
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const ph of phis) {
        const c = Math.cos((ph * Math.PI) / 180), sn = Math.sin((ph * Math.PI) / 180);
        for (const [u, v] of [[-a, -a], [a, -a], [a, a], [-a, a]]) { const q = floorPt(fw / 2 + u * c - v * sn, fd / 2 + u * sn + v * c); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
      }
      if (fits(x0, y0, x1, y1)) return r;
      r *= 0.95;
    }
    return r;
  };
  // toward the foe along the duel axis (floor), and its angle in this frame
  const s = fig.side === 'player' ? 1 : -1, ux = (g.u?.[0] ?? 1) * s, uz = (g.u?.[1] ?? 0) * s;
  const foeAng = Math.atan2(ux * rx + uz * rz, ux * fx + uz * fz);
  // pieces read at hero scale: 1000 card units = 1.6 times the figure's mean box side, times the card's own `u`
  // (a flat or far figure keeps pieces that read: never under 4.5 floor tiles of side)
  const U = (Math.max(Math.sqrt(fig.box.w * fig.box.h), (g.th ?? 40) * 4.5) / 1000) * u * 1.6;
  const platesNow = () => platesNear(fig, ox, oy).filter((r) => !(r.x < box.x + box.w && r.x + r.w > box.x && r.y < box.y + hF && r.y + r.h > box.y));
  // the smallest piece's longest side on screen (fix 1 A1): 62 px from 1280 up, 29 on a phone, between in proportion;
  // in figure px through the actors layer's own scale (the rest camera)
  const actors = fig.el?.parentNode, ar = actors?.getBoundingClientRect?.();
  const ks = ar && actors.offsetWidth ? ar.width / actors.offsetWidth || 1 : 1;
  const vw = typeof innerWidth === 'number' ? innerWidth : 1440;
  // (fix 2 A3: a phone's largest piece at least 40 px, `bigSide`, the rest at a 34 floor (from 29), so a small
  // rival's room still holds its second piece)
  const minSide = (vw >= 1280 ? 62 : vw < 720 ? 34 : 34 + ((vw - 720) / 560) * 28) / ks;
  const bigSide = (vw >= 1280 ? 62 : vw < 720 ? 43 : 43 + ((vw - 720) / 560) * 19) / ks;
  // what no piece may lie over (fix 2 A2), figure px: the console and its turn tab (8 px over their tops) and both
  // leaders' drawn boxes, read as they stand; the reticle's four corner legs round this figure's drawn box (1.08, its
  // legs 14% of the short side and their keyline); and the drawn box's middle 60%, which no front pass may cross
  // (a leader standing beside the figure, clear of its drawn box, bounds the rooms' sides instead, so an orbit
  // tightens smoothly rather than its pieces fading where they would pass over the leader)
  const base = { r: { x0: room.x0, x1: room.x1 }, o: { x0: roomO.x0, x1: roomO.x1 } };
  const hudNow = () => {
    const out = [];
    for (const [R, b] of [[room, base.r], [roomO, base.o]]) { R.x0 = b.x0; R.x1 = b.x1; }
    if (g.con) out.push({ x0: g.con.x - ox, y0: g.con.y - 8 - oy, x1: g.con.x + g.con.w - ox, y1: g.con.y + g.con.h - oy });
    for (const r of rectsNear(fig, ox, oy, '.ttab, .leader-sprite')) {
      // (fix 3 A5: a leader's drawn box grown 8 px all round, so no piece lies on a hand or a hip at its edge)
      const gl = r.lead ? 8 : 0, q = { x0: r.x - gl, y0: r.y - (r.lead ? gl : 8), x1: r.x + r.w + gl, y1: r.y + r.h + gl, lead: r.lead };
      // (one standing at the box's side, its centre off the box's middle 60%, bounds that side down to the box's
      // outer fifth at most; it stays a rect no piece may cover too)
      const lc = (q.x0 + q.x1) / 2, inR = lc > box.x + 0.8 * box.w, inL = lc < box.x + 0.2 * box.w;
      if (r.lead && (inR || inL) && q.y0 < roomO.y1 && q.y1 > roomO.y0) {
        for (const R of [room, roomO]) { if (inR) R.x1 = Math.max(box.x + 0.8 * box.w, Math.min(R.x1, q.x0 - 4)); else R.x0 = Math.min(box.x + 0.2 * box.w, Math.max(R.x0, q.x1 + 4)); }
      }
      out.push(q);
    }
    // (fix 3 A5: a tower's level badge over its top, which no piece may cover)
    const badge = fig.ptd?.badge, ba = actors?.getBoundingClientRect?.(), br = badge?.isConnected ? badge.getBoundingClientRect() : null;
    if (br && br.width > 0 && ba) { const kk = ba.width / (actors.offsetWidth || ba.width || 1) || 1; out.push({ x0: (br.left - ba.left) / kk - ox - 4, y0: (br.top - ba.top) / kk - oy - 4, x1: (br.right - ba.left) / kk - ox + 4, y1: (br.bottom - ba.top) / kk - oy + 4 }); }
    // (fix 2 critic: the other standing figure's middle 60%, its drawn box as the board laid it, which no piece may
    // cover: a strip rising on the side that faces the rival tightens or takes the other side)
    for (const o of figures) {
      if (o === fig || !o.box || o.el?.hidden || !o.el?.isConnected || o.el.parentNode !== fig.el?.parentNode) continue;
      const b = o.box;
      out.push({ x0: b.x + 0.2 * b.w - ox, y0: b.y + 0.2 * b.h - oy, x1: b.x + 0.8 * b.w - ox, y1: b.y + 0.8 * b.h - oy, foe: { x0: b.x - ox, x1: b.x + b.w - ox } });
    }
    return out;
  };
  const rw = box.w * 1.08, rh = box.h * 1.08, leg = 0.14 * Math.min(rw, rh) + 4, rx0 = cxB - rw / 2, ry0 = box.y + box.h / 2 - rh / 2;
  const reticle = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([i, j]) => { const x = rx0 + i * rw, y = ry0 + j * rh; return { x0: x - (i ? leg : 2), y0: y - (j ? leg : 2), x1: x + (i ? 2 : leg), y1: y + (j ? 2 : leg) }; });
  const mid = { x0: box.x + 0.2 * box.w, y0: box.y + 0.2 * box.h, x1: box.x + 0.8 * box.w, y1: box.y + 0.8 * box.h };
  /** A floor offset (metres, X and Z) as an angle and a radius in figure widths. */
  const toAng = (dX, dZ) => { const d = Math.hypot(dX, dZ) || 1e-9; return { a: Math.atan2((dX * rx + dZ * rz) / d, (dX * fx + dZ * fz) / d), rW: d / wM }; };
  // the body's own px: the foot (the pad) and the wrappers' centre (their transform origin)
  const bw = fig.body?.offsetWidth || fig.box.w, bh = fig.body?.offsetHeight || hF;
  return { st, g, P, ox, oy, k0, wM, hM, wPx: fig.box.w, hPx: fig.box.h, box, at, onFloor, fw, fd, floorM, foeAng, U, tilePx: 0.75 * S, mFloor: S * wM, side: fig.side, half, room, fits, roomO, fitsO, fitR, fitBox, floorPt, platesNow, hudNow, hud: hudNow(), reticle, mid, ks, bigSide, cam: { x: fx, y: -fz }, minSide, toAng, foot, pad: { x: foot.x - bw / 2, y: foot.y - bh / 2 } };
}
/** The HUD plates on screen as figure px (read through the actors layer, so a pushed camera maps back to the board). */
function platesNear(fig, ox, oy) { return rectsNear(fig, ox, oy, '.plate'); }
/** Elements on screen (`sel`) as figure px, through the actors layer (`lead`: a leader's sprite). */
function rectsNear(fig, ox, oy, sel) {
  const actors = fig?.el?.parentNode;
  if (!actors?.getBoundingClientRect || typeof document === 'undefined') return [];
  const a = actors.getBoundingClientRect(), k = a.width / (actors.offsetWidth || a.width || 1) || 1;
  return [...document.querySelectorAll(sel)].map((p) => [p, p.getBoundingClientRect()]).filter(([, r]) => r.width > 0 && r.height > 0)
    .map(([p, r]) => ({ x: (r.left - a.left) / k - ox, y: (r.top - a.top) / k - oy, w: r.width / k, h: r.height / k, lead: p.classList.contains('leader-sprite') }));
}
/** The log rail's left edge in board px (the stage's right where none stands beside it). */
function railLeft(fig) {
  const actors = fig?.el?.parentNode, b = typeof document !== 'undefined' ? document.querySelector('.hud .blog') : null;
  if (!actors?.getBoundingClientRect || !b) return 1e5;
  const r = b.getBoundingClientRect(), a = actors.getBoundingClientRect(), k = a.width / (actors.offsetWidth || a.width || 1) || 1;
  if (r.width < 40 || r.height < 40 || getComputedStyle(b).display === 'none' || r.left < a.left + a.width * 0.5) return 1e5;
  return (r.left - a.left) / k;
}
function flowVector(flow, param) {
  // floor px: +y toward the camera (a fall), the tile's own lattice so the loop is seamless
  switch (flow) {
    case 'fall': return [0, 1];
    case 'rise': return [0, -1];
    case 'lanes': return [1, 0];
    case 'grid': return [1, 1];
    case 'diagonal': { const a = param; const c = Math.cos(a), s = -Math.sin(a); const n = Math.abs(c) > Math.abs(s) ? [Math.sign(c) * Math.max(1, Math.round(Math.abs(c / (s || 1e-9)))), Math.sign(s)] : [Math.sign(c), Math.sign(s) * Math.max(1, Math.round(Math.abs(s / (c || 1e-9))))]; return n; }
    default: return [0, 0];
  }
}

/** Where a piece's sample may stand (fix 2 A2): `fix(q, front)` returns the sample moved off what it may not cover,
 *  or null. A front pass keeps its centre off the middle 60% of the figure's drawn box (grown by a tenth of the
 *  piece), moved out along the ray from the box's centre; then the console and its tab (8 px over them), both leaders
 *  and (`ret`) the reticle's four corner legs, by the shortest step that clears all of them and stays in the room
 *  (`fits`: the orbit's room and the HUD plates), at most 0.6 of the piece's side. */
function placeFix(G, extent, fits, ret = true, area = false) {
  // (3 px round each, so a keyframe's straight run beside one stays clear of it too; the reticle's corners are kept
  // clear where a step does it and, but for a `strict` card (Jarhead, whose pointer sat on one), never cost a sample)
  const grow = (r) => ({ x0: r.x0 - 3, y0: r.y0 - 3, x1: r.x1 + 3, y1: r.y1 + 3 });
  const hard = (G.hud ?? []).map(grow), soft = ret ? (G.reticle ?? []).map(grow) : [];
  let forb = [...hard, ...soft];
  const M = G.mid, mx = (M.x0 + M.x1) / 2, my = (M.y0 + M.y1) / 2;
  const hit = (e, r) => e[0] < r.x1 && e[2] > r.x0 && e[1] < r.y1 && e[3] > r.y0;
  // (`area`: the piece's whole drawn box off the middle, not its centre alone: Local Search's wide strips, fix 2 critic)
  const inMid = (q, e) => (area ? hit(e, M) : q.x > M.x0 && q.x < M.x1 && q.y > M.y0 && q.y < M.y1);
  const ok = (q, front) => { const e = extent(q); return fits(...e) && !forb.some((r) => hit(e, r)) && !(front && inMid(q, e)); };
  /** The sample stepped off what it covers (the rects it may not lie on), the shortest step within the limit. */
  const step = (c, front) => {
    // (a soft corner, any card's but Jarhead's, is stepped off only by a small step: never a stack of pieces)
    const e = extent(c), lim = forb.length > hard.length && ret !== 'strict' ? 16 : 0.6 * Math.max(e[2] - e[0], e[3] - e[1]);
    let best = null;
    for (const r of forb) {
      if (!hit(e, r)) continue;
      for (const [dx, dy] of [[r.x0 - e[2] - 1, 0], [r.x1 - e[0] + 1, 0], [0, r.y0 - e[3] - 1], [0, r.y1 - e[1] + 1]]) {
        const d = Math.hypot(dx, dy);
        if (d > lim || (best && d >= best.d)) continue;
        const c2 = { ...c, x: c.x + dx, y: c.y + dy };
        if (ok(c2, front)) best = { c: c2, d };
      }
    }
    return best?.c ?? null;
  };
  const fix = (q, front) => {
    const cands = [q];
    if (front) {
      const e = extent(q), g = 0.1 * Math.min(e[2] - e[0], e[3] - e[1]);
      const hx = (M.x1 - M.x0) / 2 + (area ? (e[2] - e[0]) / 2 + 1 : g), hy = (M.y1 - M.y0) / 2 + (area ? (e[3] - e[1]) / 2 + 1 : g);
      const dx = q.x - mx, dy = q.y - my, t = Math.max(Math.abs(dx) / hx, Math.abs(dy) / hy);
      if (t < 1) {
        // out along the ray from the box's centre (at the very centre, out to the right); where that leaves the room
        // or lands on a rect, out by the nearest of the middle's four sides instead
        cands[0] = t < 1e-3 ? { ...q, x: mx + hx } : { ...q, x: mx + dx / t, y: my + dy / t };
        // (an `area` piece keeps its own side, never jumping across the figure or onto the lid where another rises)
        const sides = area ? [{ x: dx >= 0 ? mx + hx : mx - hx }] : [{ x: mx - hx }, { x: mx + hx }, { y: my - hy }, { y: my + hy }];
        cands.push(...sides.map((v) => ({ ...q, ...v })).sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y)));
      }
    }
    for (const c of cands) if (ok(c, front)) return c;
    for (const c of cands) { const c2 = step(c, front); if (c2) return c2; }
    if (ret === 'strict' || !soft.length || forb.length === hard.length) return null;
    forb = hard;
    try { return fix(q, front); } finally { forb = [...hard, ...soft]; }
  };
  fix.ok = ok;
  /** A point on a keyframe's straight run: clear of everything a sample must clear (a soft corner aside). */
  fix.run = (q, front) => { if (ret === 'strict') return ok(q, front); const was = forb; forb = hard; try { return ok(q, front); } finally { forb = was; } };
  return fix;
}

// ---------------------------------------------------------------- the builder: each card's pieces laid as boxes
function builder(me, fig, G, pieces, def, k) {
  const { beat, rd, L, deco, hue } = k;
  const max = budget(), one = coarse();
  // (a phone lays its floor drawings whole under the figures, one unclipped host: a clipped plane in 3D is what a
  // software compositor redraws under every camera move, fix 1 A3)
  const decoF = one ? deco : k.decoF, FLOORS = one ? [deco] : [deco, decoF];
  let used = 0, serial = 0, floors = 0;
  // the budget counts pieces; a piece is at most two boxes (its back and front copies, or a floor drawing's halves).
  // On a phone (`one`) every piece is one copy, the floor drawings lie still and cost no piece (a still layer is free
  // to a compositor), and a floor rider (a chip on its trace) stays home.
  const take = (n = 1) => { if (used + n > max) return false; used += n; return true; };
  /** Up to `n` pieces, as many as the budget has left. */
  const takeUpTo = (n) => { const k2 = Math.max(0, Math.min(n, max - used)); used += k2; return k2; };
  /** A floor drawing's share: free and still on a phone. */
  const takeFloor = (n = 1) => { if (one) { floors += n; return true; } if (!take(n)) return false; floors += n; return true; };
  const takeFloorUpTo = (n) => { if (one) { floors += n; return n; } const k2 = takeUpTo(n); floors += k2; return k2; };
  /** A loop, or on a phone a floor drawing's still (its first frame). */
  const loop = (e, frames, opts, floor = false) => (floor && one ? null : k.loop(e, frames, opts));
  const pieceAt = (i) => (typeof i === 'object' ? i : pieces[Math.min(i, pieces.length - 1)] ?? null);
  // the box a piece takes at the stand's depth, in figure px
  const sizeOf = (p, s = 1) => ({ w: p.w * G.U * s, h: p.h * G.U * s });
  const tf = (x, y, w, h, s, sx = 1, rot = 0) => `translate3d(${F(x - w / 2)}px,${F(y - h / 2)}px,0)${rot ? ` rotate(${F(rot)}deg)` : ''} scale(${F(s * sx * 100) / 100},${F(s * 100) / 100})`;
  /** A piece's box; its copies share one key (`data-k`), so a reader counts the piece once. Each wears the card's
   *  glint (fix 2 A3): a 1 px keyline in its energy hue baked into its drawing, sized for `scr` (the scale it is
   *  mostly drawn at), no filter. */
  const box = (layer, p, w, h, key = ++serial, scr = 1) => {
    const b = el('div', 'au-p', layer);
    b.style.width = `${F(w)}px`; b.style.height = `${F(h)}px`;
    b.dataset.k = String(key);
    b.dataset.p = p.drawn ? p.id : `${p.id}:${p.i}`;
    b.append(pieceNode(glinted(p, w * scr * G.ks, hue.energy)));
    return b;
  };
  // (fix 2 A3: the after-image, a fine pointer's alone and not a low-memory device's: two copies under the piece at
  // 0.4 and 0.2 of its opacity on its own keyframes, a little behind it; compositor only, held and paused with it)
  const trails = !one && !rd && max >= 6 && typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
  const trail = (b, frames, opts, T) => {
    if (!trails) return [];
    const lag = Math.max(33, T * 0.01);
    return [[0.4, lag], [0.2, 2 * lag]].map(([k, d]) => {
      const c = b.cloneNode(true);
      c.classList.add('au-trail');
      c.dataset.t = c.dataset.k;
      delete c.dataset.k;
      b.before(c);
      loop(c, frames.map((f) => ({ ...f, opacity: F(f.opacity * k) })), { ...opts, delay: (opts.delay ?? 0) + d });
      return c;
    });
  };
  /** A stroke-only piece (a horizon arc, a cancel bar) read at the floor: each unfilled stroke at least 4 px on screen
   *  over a dark keyline 3.5 px wider, in the piece's own px (`w` its box's width). */
  const keyline = (b, w) => {
    const svg = b.querySelector('svg'), vb = svg?.viewBox?.baseVal;
    if (!vb?.width) return;
    const k = w / vb.width;
    const eff = (e, a) => { for (let x = e; x && x !== b; x = x.parentNode) { const v = x.getAttribute?.(a); if (v != null) return v; } return null; };
    for (const e of [...svg.querySelectorAll('path,line,polyline,circle,ellipse,rect,polygon')]) {
      const st = eff(e, 'stroke'), fill = eff(e, 'fill');
      if (!st || st === 'none' || (fill && fill !== 'none')) continue;
      const want = Math.max(parseFloat(eff(e, 'stroke-width') ?? '1') || 1, 4 / k);
      e.setAttribute('stroke-width', F(want));
      const u = e.cloneNode(true);
      for (const [a, v] of [['stroke', '#0f1113'], ['stroke-width', F(want + 3.5 / k)], ['stroke-opacity', '0.6'], ['stroke-dasharray', 'none']]) u.setAttribute(a, v);
      e.before(u);
    }
  };
  /** Grow a piece's box until its longest side, at the largest it is drawn (`peak`), meets the size floor. */
  // (6% over the floor: a reader samples a piece's cycle at a few points and may miss its largest moment)
  const floorSize = (w, h, peak = 1, side = G.minSide) => { const m = Math.max(w, h) * Math.max(0.05, peak), want = side * 1.06; const f = m < want ? want / m : 1; return { w: w * f, h: h * f }; };
  // (fix 3 A5: a phone's pieces as laid, each its box over time (ms -> [x0, y0, x1, y1]); `clash` the most px2 a box
  // over time shares with any of them, over 36 s in 125 ms steps)
  const phoneLaid = [];
  const clash = (f, cap = Infinity) => {
    let m = 0;
    for (let j = 0; j < 288 && phoneLaid.length; j++) {
      const tau = j * 125, e = f(tau);
      for (const g of phoneLaid) { const q = g.f(tau), ov = Math.max(0, Math.min(e[2], q[2]) - Math.max(e[0], q[0]) + 1) * Math.max(0, Math.min(e[3], q[3]) - Math.max(e[1], q[1]) + 1); if (ov > m) m = ov; }
      // (no better than the best found so far: stop reading)
      if (m >= cap) return m;
    }
    return m;
  };
  // (fix 3 A2: a form card's form and level as it stands; the side of the top with the most room, for a hovering piece)
  const kf0 = /^([a-z]+)-(\w+)$/.exec(fig.key ?? '') ?? [];
  const form = me.form ?? kf0[1] ?? null, level = lvlOf(me.level ?? kf0[2] ?? null);
  const accentNow = () => formAccent(form ?? 'lab', level);
  const roomy = (() => {
    const cx = G.box.x + G.box.w / 2, right = G.at(Math.PI / 2, 0.4, 1).x > cx ? 1 : -1;
    const near = (G.hud ?? []).filter((r) => r.y1 > G.roomO.y0 && r.y0 < G.box.y + 0.3 * G.box.h);
    const rx = Math.min(G.roomO.x1, ...near.filter((r) => r.x0 > cx).map((r) => r.x0)) - cx, lx = cx - Math.max(G.roomO.x0, ...near.filter((r) => r.x1 < cx).map((r) => r.x1));
    return rx >= lx ? right : -right;
  })();
  const B = {
    pieces, G, max, level, form, roomy,
    /** A drawn piece (DRAWN) in this card's hue (`col`: a colour of its own). */
    drawn: (kind, col) => drawn(kind, hue, col),
    /** `n` pieces of the card, in its order (the budget keeps the first). */
    list: (n) => Array.from({ length: Math.min(n, pieces.length) }, (_, i) => i),
    /** A piece on a floor path at a height: `pos(t)` gives { a, r, h }; twins pass behind and in front at the tangents. */
    path(pi, o) {
      const p = pieceAt(pi);
      if (!p || !take()) return null;
      const wantTwin = o.twin !== false, twin = wantTwin && !one, n = o.samples ?? 24, T = (o.T ?? 8) * 1000;
      const op = o.op ?? (() => 1), sc = o.sc ?? (() => 1), rot = o.rot ?? (() => 0);
      // (each side of the stand tightens on its own, fix 2 A2: a leader or the rail close on one side leaves the other
      // side's orbit wide; the two radii blend round the front and back, so the path stays whole)
      let kL = 1, kR = 1;
      const sample = (t, kr = 1, kh = 1) => { const q = o.pos(t); const v = G.at(q.a, q.r * kr * (kL + ((kR - kL) * (1 + Math.sin(q.a))) / 2), q.h * kh); return { t, ...v, s: sc(t), rot: rot(t), o: op(t), flip: o.flip ? Math.max(0.12, Math.abs(Math.cos(q.a))) : 1 }; };
      // the size floor at the piece's median drawn moment while it shows (its scale and depth), not its largest: a
      // smoke ring born small or a casing far round the stand still reads for most of its life (fix pass 2)
      const seen = [];
      for (let i = 0; i <= n; i++) { const q = sample(i / n); if (op(i / n) >= 0.25) seen.push(q.s * q.k); }
      seen.sort((x, y) => x - y);
      const peak = seen.length ? seen[Math.floor((seen.length - 1) / 2)] : 0;
      // (the first piece laid holds the larger floor: on a phone, its largest)
      const fl = B.bigTaken ? G.minSide : G.bigSide, tookBig = !B.bigTaken;
      B.bigTaken = true;
      let { w, h } = floorSize(...Object.values(sizeOf(p, o.size ?? 1)), peak || 1, fl);
      // (it may shrink to fit its room down to the floor, never under it)
      const wMin = w * Math.min(1, (fl * 1.06) / Math.max(1e-6, Math.max(w, h) * (peak || 1))), room = G.roomO, fitsR = G.fitsO;
      // keep the aura within the room (1.3 times the figure's box, on the board, clear of the plates; test 31): each
      // sample's drawn box (turned and flipped as it plays) must fit; a box past the sides or the floor tightens the
      // radius, one over the top lowers the height
      const extent = (q) => {
        const a = (q.rot * Math.PI) / 180, c = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a)), ww = w * q.flip * q.s * q.k, hh = h * q.s * q.k;
        const hw = (ww * c + hh * sn) / 2, hv = (ww * sn + hh * c) / 2;
        return [q.x - hw, q.y - hv, q.x + hw, q.y + hv];
      };
      // (a piece larger than the room itself, on a small or flat figure, is drawn smaller until it fits, never under
      // the size floor: past it the orbit tightens alone)
      let kr = 1, kh = 1;
      const aspect = h / w;
      for (let shrink = 0; shrink < 14; shrink++) {
      if (shrink) { if (w <= wMin + 1e-6) break; w = Math.max(wMin, w * 0.88); h = w * aspect; }
      let ok = false;
      kr = 1; kh = 1; kL = 1; kR = 1;
      for (let pass = 0; pass < 60; pass++) {
        let side = false, up = false, low = false, sL = false, sR = false;
        for (let i = 0; i <= n; i++) {
          const q = sample(i / n, kr, kh);
          if (op(i / n) < 0.02) continue;
          const [x0, y0, x1, y1] = extent(q);
          if (fitsR(x0, y0, x1, y1)) continue;
          const R = room, out = x0 < R.x0 || x1 > R.x1, high = y0 < R.y0, under = y1 > R.y1;
          if (out) side = true;
          if (x0 < R.x0) sL = true;
          if (x1 > R.x1) sR = true;
          if (high) up = true;
          if (under) low = true;
          if (!out && !high && !under) { side = true; up = true; } // a plate: pull in and down
        }
        if (!side && !up && !low) { ok = true; break; }
        // (`lockH`: a rise past the room's top fades out there, fix 2 critic; never drawn smaller for it)
        if (o.lockH && up && !side && !low) { ok = true; break; }
        // (past the sides, or under the floor's share in front of the stand: tighten the orbit; over the top: lower it;
        // under the floor's share: raise it as well; both over and under: the piece is taller than its room)
        // (each squeeze has a floor, fix 2 A2: past it the orbit keeps its shape and a sample that still cannot stand
        // fades out where it would leave the room, rather than the whole path collapsing onto the stand)
        const KS = 0.35, KH = 0.55;
        if (sL && kL > KS) kL *= 0.95;
        if (sR && kR > KS) kR *= 0.95;
        if (((side && !sL && !sR) || low) && kr > KS) kr *= 0.95;
        // (`lockH`: pieces that keep their heights apart, Local Search's rising strips, never lower: a strip over the
        // room's top fades out there instead)
        if (up && !low && !o.lockH && kh > KH) kh *= 0.93;
        else if (low && !up) kh = Math.min(kh * 1.04, 3);
        const sideStuck = (!sL || kL <= KS) && (!sR || kR <= KS) && (!(side && !sL && !sR) || kr <= KS);
        if ((!side || sideStuck) && (!up || kh <= KH || o.lockH) && (!low || kr <= KS)) break;
        if (low && up) break;
      }
      if (ok) break;
      }
      // (a floor piece that must ride wide of the stand, Princeton TD's road tile: where the room keeps it nearer than
      // `minR`, a spark of its accent stands in for it)
      if (o.minR && o.fallback) { const r0 = o.pos(0).r * kr * Math.min(kL, kR); if (r0 < o.minR) { used--; return B.path(o.fallback.p, o.fallback.o); } }
      const raw = Array.from({ length: n + 1 }, (_, i) => sample(i / n, kr, kh));
      // which samples lie over the figure: a front copy's (its twin's front half), a phone's one copy (always drawn in
      // front), a single copy laid in the front layer
      const frontLayer = raw.reduce((a, q) => a + q.f, 0) >= 0;
      // (a back pass keeps off the middle too, fix 2 A3: a piece behind the figure peeks out at its edges, so it still
      // reads, rather than passing wholly hidden behind the body; a phone's one copy passes behind at 0.4 as before)
      // (fix 2 critic: a phone's one copy too, which no longer steps to 0.4 through the far half: it stays whole and
      // off the middle on every sample, so it reads wherever its loop stands)
      const isFront = () => true;
      const fix = placeFix(G, extent, fitsR, o.reticle ?? true, Boolean(o.clearMid));
      // every sample moved off what it may not cover (fix 2 A2): the middle 60% of the figure's drawn box for a front
      // pass, out radially; the console, its tab, the leaders and the reticle's corners by the shortest step; a sample
      // that cannot be moved (or leaves the room, or lies on a HUD plate) fades out with the samples either side
      const hide = new Set();
      const S0 = raw.map((q, i) => { if (q.o < 0.02) return q; const c = fix(q, isFront(q)); if (!c) { for (const j of [i - 1, i, i + 1]) if (j >= 0 && j <= n) hide.add(j); return q; } return c; });
      // (and the straight run between two samples where either shows, as the keyframes play it: its third and two
      // thirds tested too, until no run crosses)
      for (let pass = 0, more = true; pass < 4 && more; pass++) {
        more = false;
        for (let i = 0; i < n; i++) {
          const a = S0[i], b = S0[i + 1], va = !hide.has(i) && a.o >= 0.02, vb = !hide.has(i + 1) && b.o >= 0.02;
          if (!va && !vb) continue;
          const fr2 = isFront(a) || isFront(b);
          for (const u of [1 / 3, 2 / 3]) {
            const L2 = (x, y) => x + (y - x) * u, m = { ...a, x: L2(a.x, b.x), y: L2(a.y, b.y), s: L2(a.s, b.s), k: L2(a.k, b.k), rot: L2(a.rot, b.rot), flip: L2(a.flip, b.flip) };
            if (!fix.run(m, fr2)) { for (const j of [i, i + 1]) if (!hide.has(j)) { hide.add(j); more = true; } break; }
          }
        }
      }
      if (hide.size) { if (hide.has(0) || hide.has(n)) { hide.add(0); hide.add(n); } for (const i of hide) S0[i] = { ...S0[i], o: 0 }; }
      // (fix 3 A5: a piece that cannot stand anywhere on its path, a leader's grown box beside a phone's small figure,
      // takes the next stand it names, `alts`, before anything is laid)
      if (o.alts?.length && S0.every((q) => q.o < 0.02)) { used--; if (tookBig) B.bigTaken = false; return B.path(pi, { ...o, pos: () => o.alts[0], alts: o.alts.slice(1) }); }
      // (fix 2 critic: a phone's piece reads on every moment of its loop. A loop that keeps every sample shown stands
      // whole at full opacity; a rise that fades at its ends, or a path a cramped room cuts, swings to and fro over
      // its longest shown run, eased at the turns, never fading; a run under a quarter of the loop holds at its
      // clearest moment, breathing)
      let shiftT = 0, phoneEntry = null;
      if (one && !rd) {
        const S0pre = S0.map((q) => ({ ...q }));
        const top = Math.max(...raw.map((q) => q.o)) || 1, kept = (i) => !hide.has(i) && S0pre[i].o >= 0.5 * top;
        const closed = Math.hypot(S0pre[0].x - S0pre[n].x, S0pre[0].y - S0pre[n].y) < 2 && kept(0) === kept(n);
        const M = closed ? n : n + 1, idx = (j) => ((j % M) + M) % M;
        let run = { a: 0, len: 0 };
        if (Array.from({ length: M }, (_, i) => i).every(kept)) run = { a: 0, len: Infinity };
        else for (let a = 0; a < M; a++) {
          if (!kept(a) || (closed ? kept(idx(a - 1)) : a > 0 && kept(a - 1))) continue;
          let len = 0;
          while (len < M && kept(idx(a + len)) && (closed || a + len < M)) len++;
          if (len > run.len) run = { a, len };
        }
        // (out along `len` of the run's own samples from `a` and back, so every straight run between keyframes is one
        // the placement tested; eased by the keyframes' times, slow at the turns)
        const swing = (a, len) => {
          const Ln = len - 1, out = [];
          for (let m = 0; m <= 2 * Ln; m++) {
            const fw = m <= Ln, j = fw ? m : 2 * Ln - m, u = (fw ? m : m - Ln) / Ln;
            out.push({ ...S0pre[idx(a + j)], t: (fw ? 0 : 0.5) + Math.acos(1 - 2 * u) / TAU, o: 1 });
          }
          for (const q of out) q.f = Math.max(0.01, q.f);
          return out;
        };
        const hold = (at) => Array.from({ length: n + 1 }, (_, i) => ({ ...at, t: i / n, y: at.y - 2 * Math.sin(TAU * (i / n)), f: Math.max(0.01, at.f), o: 1 }));
        // (a held piece stands at its clearest moment among those drawn at least its median size, so the size floor,
        // set at that median, holds while it stands: a smoke ring is not held at its small birth)
        const big = (q) => q.s * q.k >= 0.95 * (peak || 0), score = (q) => Math.abs(q.f - 0.7) + (big(q) ? 0 : 2);
        const clearest = (list) => list.reduce((b, q) => (score(q) < score(b) ? q : b), list[0]);
        // (fix 3 A5: a swing takes at most 0.45 of the loop, about its clearest moment, so a second piece on the same
        // path has a stretch of its own, or swings in step with the first a piece's length along)
        const W0 = Math.max(2, Math.floor(0.45 * n) + 1);
        let S;
        if (run.len === Infinity) S = S0pre.map((q) => ({ ...q, o: 1 }));
        else if (run.len - 1 >= 0.25 * n) {
          const len = Math.min(run.len, W0), c = Array.from({ length: run.len }, (_, j) => j).reduce((bj, j) => (score(S0pre[idx(run.a + j)]) < score(S0pre[idx(run.a + bj)]) ? j : bj), 0);
          const a0 = run.a + Math.max(0, Math.min(run.len - len, c - Math.floor(len / 2)));
          S = swing(a0, len);
        } else {
          const ks = S0pre.filter((q, i) => kept(i));
          S = ks.length ? hold(clearest(ks)) : S0pre;
        }
        // (fix 3 A5: a phone's pieces never lie on one another. Each piece laid is kept as its box over time; the next
        // tries its swing at eighths of a lap later, then over other stretches of its run, then held at each of its own
        // clear moments, and takes the first that never meets one laid before over 36 s, else the one that meets least)
        const off0 = (o.phase ?? 0) * T + (o.delay ?? 0) * 1000;
        const boxAt = (Sq, off) => (tau) => {
          let t = ((tau + off) / T) % 1; if (t < 0) t += 1;
          let i = 0; while (i < Sq.length - 2 && Sq[i + 1].t <= t) i++;
          const a = Sq[i], b = Sq[Math.min(Sq.length - 1, i + 1)], u = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0, l2 = (x, y) => x + (y - x) * u;
          return extent({ x: l2(a.x, b.x), y: l2(a.y, b.y), s: l2(a.s, b.s), k: l2(a.k, b.k), rot: l2(a.rot, b.rot), flip: l2(a.flip, b.flip) });
        };
        if (phoneLaid.length) {
          const cands = [];
          for (let k2 = 0; k2 < 8; k2++) cands.push({ S, shift: k2 / 8 });
          // (a whole loop too: two orbits round a phone's small figure meet where the circle turns edge-on)
          const rl = run.len === Infinity ? M : run.len;
          if (rl - 1 >= 0.25 * n) {
            for (const len of [Math.min(rl, W0), Math.max(2, Math.min(rl, Math.floor(0.3 * n) + 1))]) {
              const span = run.len === Infinity && closed ? M : rl - len + 1;
              for (let st = 0; st < span; st += Math.max(1, Math.floor(span / 8))) { const Sw = swing(run.a + st, len); for (let k2 = 0; k2 < 8; k2++) cands.push({ S: Sw, shift: k2 / 8 }); }
            }
          }
          const holds = S0pre.filter((q, i) => kept(i)).sort((a, b) => score(a) - score(b)), holdPts = [...holds];
          for (const at of holds) cands.push({ S: hold(at), shift: 0 });
          const pick = () => { let best = null; for (const c of cands) { const v = clash(boxAt(c.S, off0 + c.shift * T), best ? best.v : Infinity); if (!best || v < best.v) best = { ...c, v }; if (v === 0) break; } return best; };
          let best = pick();
          // (where every way still meets a piece laid before, those pieces hold at their own clearest moments, breathing,
          // and this one looks again: a stretch of the path is left to it)
          if (best.v > 0 && phoneLaid.some((g) => !g.held)) { for (const g of phoneLaid) g.hold?.(); best = pick(); }
          // (still meeting one: held a little higher or lower on its own path, a small figure's orbit being narrower than
          // two pieces side by side)
          const cands0 = cands.slice();
          if (best.v > 0) {
            cands.length = 0;
            for (const m of [1.25, 0.8, 1.45, 0.65]) for (let i = 0; i <= n; i += 2) { const c0 = sample(i / n, kr, kh * m), c = fix(c0, true); if (c && fitsR(...extent(c)) && c.o >= 0.02) { cands.push({ S: hold({ ...c, f: Math.max(0.01, c.f) }), shift: 0 }); holdPts.push({ ...c, f: Math.max(0.01, c.f) }); } }
            const b2 = pick();
            if (b2 && b2.v < best.v) best = b2;
          }
          // (and drawn a little smaller, down to the size floor, every way again)
          if (best.v > 0 && w > wMin + 1e-6) {
            const w0 = w, h0 = h, all = [...cands0, ...cands];
            cands.length = 0; cands.push(...all);
            for (let k2 = 0; k2 < 4 && best.v > 0 && w > wMin + 1e-6; k2++) { w = Math.max(wMin, w * 0.92); h = w * aspect; const b3 = pick(); if (b3 && b3.v < best.v) best = b3; }
            if (best.v > 0) { w = w0; h = h0; }
          }
          // (one piece laid before and held: the two held stands are chosen together, its own clear moments against
          // this one's, the first pair that does not meet)
          const one0 = phoneLaid.length === 1 && phoneLaid[0].held && phoneLaid[0].pts ? phoneLaid[0] : null;
          if (best.v > 0 && one0) {
            const meet = (a, b) => Math.min(a[2], b[2]) - Math.max(a[0], b[0]) + 2 > 0 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) + 5 > 0; // (each breathes 2 px up and down)
            pair: for (const qa of one0.pts) { const A = one0.ext(qa); for (const qb of holdPts) if (!meet(A, extent(qb))) { one0.holdAt(qa); best = { S: hold(qb), shift: 0, v: 0 }; break pair; } }
          }
          // (still meeting one: the next stand it names, else the card's next piece takes its place, twice at most)
          if (best.v > 0 && o.alts?.length) { used--; if (tookBig) B.bigTaken = false; return B.path(pi, { ...o, pos: () => o.alts[0], alts: o.alts.slice(1) }); }
          if (best.v > 0 && (B.phoneSkips ?? 0) < 2) { B.phoneSkips = (B.phoneSkips ?? 0) + 1; used--; if (tookBig) B.bigTaken = false; (B.phoneDbg ??= []).push({ p: p.id, skipped: Math.round(best.v) }); return null; }
          S = best.S; shiftT = best.shift * T;
          (B.phoneDbg ??= []).push({ p: p.id, v: Math.round(best.v), n: cands.length, shift: best.shift, len: S.length, run: run.len });
        } else (B.phoneDbg ??= []).push({ p: p.id, first: true, len: S.length, run: run.len });
        S0.length = 0; S0.push(...S);
        const entry = { f: boxAt(S0.slice(), off0 + shiftT), held: S.length === n + 1 && S.every((q) => q.x === S[0].x), boxes: null };
        // (its clear moments, best first, and its box at one, for a later piece choosing two held stands together)
        entry.pts = S0pre.filter((q, i) => kept(i)).sort((a, b) => score(a) - score(b));
        entry.ext = (q) => extent(q);
        entry.holdAt = (q) => {
          if (!entry.boxes) return;
          S0.length = 0; S0.push(...hold(q));
          entry.f = boxAt(S0.slice(), off0 + shiftT); entry.held = true;
          for (const b of entry.boxes) for (const a of b.getAnimations?.() ?? []) if (a.aura) a.effect.setKeyframes(frames('phone'));
        };
        entry.hold = () => { if (!entry.held && entry.pts.length) entry.holdAt(entry.pts[0]); };
        phoneLaid.push(entry);
        phoneEntry = entry;
      }
      o.report?.(kr * Math.min(kL, kR));
      const mark = (r) => { if (o.solid) for (const b of r.boxes ?? []) b.dataset.solid = o.solid; return r; };
      if (rd) {
        // the still: the card's one moment, where its first piece stands at its three-quarter-front point (or the
        // cycle's middle for a rise); each piece at that moment by its own phase and delay, so pieces that share a
        // path spread round it as they do in play, never stacked at one point. Front copies at 0.6
        const lag = (o.phase ?? 0) + ((o.delay ?? 0) * 1000) / T, fr0 = (x) => x - Math.floor(x);
        // (the moment is the card's: its first orbiting piece's three-quarter-front point, shared by the rest)
        const t0 = twin ? (B.tau ??= fr0(S0.reduce((b, s) => (Math.abs(s.f - 0.7) < Math.abs(b.f - 0.7) && s.f > 0 ? s : b), S0[0]).t - lag)) : 0.45;
        // (and where that moment stacks it on a still already laid, the nearest moment of its own path that stands
        // clear of the rest: overlap at most 12% of the smaller box, else the least)
        const want = o.still ?? fr0(t0 + lag), laid = (B.stills ??= []);
        const cover = (q) => { const [x0, y0, x1, y1] = extent(q), a = (x1 - x0) * (y1 - y0); return laid.reduce((m, [u0, v0, u1, v1]) => Math.max(m, (Math.max(0, Math.min(x1, u1) - Math.max(x0, u0)) * Math.max(0, Math.min(y1, v1) - Math.max(y0, v0))) / Math.max(1, Math.min(a, (u1 - u0) * (v1 - v0)))), 0); };
        const ts = [want, ...Array.from({ length: n }, (_, i) => i / n).filter((t) => op(t) >= 0.25).sort((a, b) => Math.min(Math.abs(a - want), 1 - Math.abs(a - want)) - Math.min(Math.abs(b - want), 1 - Math.abs(b - want)))];
        // (its own path first, then the same path a little lower or higher, inside the room: a small figure's orbit
        // may be too tight to part two pieces at one height)
        let q = null, best = Infinity;
        search: for (const [m, mr] of [1, 0.85, 1.15, 0.7, 1.3, 0.55, 1.5, 0.4, 1.75].flatMap((m) => [[m, 1], [m, 0.8], [m, 1.2], [m, 0.65], [m, 1.4]])) for (const t of ts) {
          const c0 = sample(t, kr * mr, kh * m), c = fix(c0, isFront(c0));
          if (!c) continue;
          if (m !== 1 && !fitsR(...extent(c))) continue;
          const v = cover(c);
          if (v < best) { best = v; q = c; }
          if (v <= 0.12) break search;
        }
        q ??= sample(want, kr, kh);
        // (a still that cannot stand clear of those laid, a cramped room, is left out: fix 2 critic)
        if (laid.length && best > 0.14) return { boxes: [] };
        laid.push(extent(q));
        const front = q.f >= 0 || !twin;
        const b = box(front ? L.wf : L.wb, p, w, h, undefined, q.s * q.k);
        b.style.transform = tf(q.x, q.y, w, h, q.s * q.k, q.flip, q.rot);
        b.style.opacity = String(F((front ? 0.6 : 1) * Math.max(0.5, q.o)));
        if (o.tint) { b.style.color = accentNow(); (me.tinted ??= []).push(b); }
        if (o.keyline) keyline(b, w);
        return mark({ boxes: [b] });
      }
      const frames = (side) => {
        const out = [];
        const push = (s, vis) => out.push({ offset: Math.min(1, Math.max(0, s.t)), transform: tf(s.x, s.y, w, h, s.s * s.k, s.flip, s.rot), opacity: F(vis * s.o) });
        for (let i = 0; i < S0.length; i++) {
          // (a phone's one copy stands in front, whole, all the way round: fix 2 critic)
          const s = S0[i], vis = (f) => (side === 'single' ? 1 : side === 'phone' ? 1 : side === 'front' ? (f >= 0 ? 1 : 0) : (f >= 0 ? 0 : 1));
          push(s, vis(s.f));
          const nx = S0[i + 1];
          if (nx && side !== 'single' && Math.sign(s.f || 1e-9) !== Math.sign(nx.f || 1e-9)) {
            const c = s.f / (s.f - nx.f), tc = s.t + (nx.t - s.t) * c, m = (a, b) => a + (b - a) * c;
            const mid = { t: tc, x: m(s.x, nx.x), y: m(s.y, nx.y), k: m(s.k, nx.k), s: m(s.s, nx.s), rot: m(s.rot, nx.rot), o: m(s.o, nx.o), flip: m(s.flip, nx.flip) };
            const t1 = Math.max(s.t + 1e-6, Math.min(nx.t - 2e-6, tc - 1e-4)), t2 = Math.min(nx.t - 1e-6, Math.max(t1 + 1e-6, tc + 1e-4));
            push({ ...mid, t: t1 }, vis(s.f));
            push({ ...mid, t: t2 }, vis(nx.f));
          }
        }
        return out;
      };
      const opts = { duration: T, delay: -((o.phase ?? 0) * T) - (o.delay ?? 0) * 1000 - shiftT };
      const boxes = [], trailEls = [], scr = peak || 1;
      const lay = (layer, side, key) => {
        const b = box(layer, p, w, h, key, scr), fr0 = frames(side);
        if (o.keyline) keyline(b, w);
        // a spark in the tower's accent: its colour follows the form (B.accent)
        if (o.tint) { b.style.color = accentNow(); (me.tinted ??= []).push(b); }
        loop(b, fr0, opts);
        const tr = trail(b, fr0, opts, T);
        trailEls.push(...tr);
        if (o.tint) me.tinted.push(...tr);
        boxes.push(b);
      };
      if (twin) {
        const key = ++serial;
        for (const side of ['back', 'front']) lay(side === 'back' ? L.wb : L.wf, side, key);
      } else if (wantTwin) lay(L.wf, 'phone');
      // a single copy stands on the side its path mostly keeps
      else lay(frontLayer ? L.wf : L.wb, 'single');
      if (phoneEntry) phoneEntry.boxes = boxes;
      return mark({ boxes, trails: trailEls, p });
    },
    /** Jarhead at rest: two opposite capture arcs (top left and bottom right) turning slowly round it, off its body:
     *  each a 70-degree dashed arc of the ellipse 1.22 times its box's half-sides (the room's 1.6 taking the arc's own
     *  turned box), a light keyline under a dash in its deep hue, so each reads as a piece and never as the reticle's
     *  four solid corners, which are the act's alone (`B.act`, section 5.3). Each arc's box hugs the arc (a slab, its
     *  pivot the body's centre), so its drawn box is the arc's. A phone wears the pair as one piece, still. */
    arcs(o) {
      const n = one ? Math.min(1, takeUpTo(1)) : takeUpTo(2);
      if (!n) return null;
      const bx = G.box, cx = bx.x + bx.w / 2, cy = bx.y + bx.h / 2, HALF = 35, c35 = Math.cos((HALF * Math.PI) / 180), s35 = Math.sin((HALF * Math.PI) / 180);
      // the largest ellipse (at most 1.22 of the half-sides, at least the box's own) whose turned slabs fit the room
      const e = bx.h / Math.max(1, bx.w), sw = Math.max(4, G.minSide * 0.075), kl = sw + 4;
      let f = 1.22;
      const reach = (ff) => { const rx = (ff * bx.w) / 2; return [rx, rx * e]; };
      for (; f > 1.0; f -= 0.02) {
        const [rx, ry] = reach(f), m = 1.153 * rx + kl, mv = 1.153 * ry + kl;
        if (G.fitsO(cx - m, cy - mv, cx + m, cy + mv)) break;
      }
      const [r] = reach(f);
      // the slab: radially from r cos 35 to r, across +-r sin 35, the strokes' margin round it (px; uniform in x)
      const m = kl / 2 + 1, w = r * (1 - c35) + 2 * m, h = 2 * r * s35 + 2 * m;
      const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', `${F(r * c35 - m)} ${F(-r * s35 - m)} ${F(w)} ${F(h)}`);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');
      const d = `M${F(r * c35)} ${F(-r * s35)}A${F(r)} ${F(r)} 0 0 1 ${F(r * c35)} ${F(r * s35)}`, dash = `${F(sw * 2.6)} ${F(sw * 1.7)}`;
      for (const [stroke, width, op] of [[hue.glint ?? '#f2f2f4', kl, 0.6], [hue.deep, sw, 0.92]]) {
        const pa = document.createElementNS(NS, 'path');
        for (const [k2, v] of Object.entries({ d, fill: 'none', stroke, 'stroke-width': F(width), 'stroke-linecap': 'round', 'stroke-dasharray': dash, opacity: op })) pa.setAttribute(k2, String(v));
        svg.append(pa);
      }
      const p = { id: 'arc', i: -1, w, h, raster: false, node: svg, drawn: true };
      // turned `deg` about the body's centre on the ellipse: centre, squash, turn, then the slab's own corner
      const at = (deg) => `translate3d(${F(cx)}px,${F(cy)}px,0) scale(1,${F(e)}) rotate(${F(deg)}deg) translate3d(${F(r * c35 - m)}px,${F(-h / 2)}px,0)`;
      // (fix 2 A2: an arc fades where its slab would lie over the console, its tab or a leader)
      const slab = (deg) => {
        const t = (deg * Math.PI) / 180, c = Math.cos(t), sn = Math.sin(t), pts = [[0, 0], [w, 0], [w, h], [0, h]].map(([u, v]) => { const x = u + r * c35 - m, y = v - h / 2; return [cx + x * c - y * sn, cy + e * (x * sn + y * c)]; });
        const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
        return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      };
      const clear = (deg) => { const [x0, y0, x1, y1] = slab(deg); return !(G.hud ?? []).some((q) => x0 < q.x1 + 3 && x1 > q.x0 - 3 && y0 < q.y1 + 3 && y1 > q.y0 - 3); };
      const key = ++serial, out = [];
      for (let i = 0; i < 2; i++) {
        const b = box(L.wf, p, w, h, one ? key : undefined);
        b.classList.add('au-o0');
        // (top left is 225 degrees on screen, bottom right 45)
        let a0 = 225 + i * 180 + (o.at ?? 0);
        if (rd || one) {
          // (a still arc, or a phone's: the nearest clear turn)
          // (fix 3 A5: on a phone, and off every piece laid before it over time)
          const d0 = Array.from({ length: 25 }, (_, j) => (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 15).find((d) => clear(a0 + d) && (!one || rd || clash(() => slab(a0 + d), 1) === 0)) ?? (one && !rd ? Array.from({ length: 25 }, (_, j) => (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 15).find((d) => clear(a0 + d)) : undefined);
          if (d0 === undefined) { b.remove(); continue; }
          a0 += d0;
          b.style.transform = at(a0); b.style.opacity = rd ? '0.6' : '1'; out.push(b); continue;
        }
        const N = 24, vis = Array.from({ length: N + 1 }, (_, j) => clear(a0 + (360 * j) / N));
        const op = vis.map((v, j) => (v && vis[Math.max(0, j - 1)] && vis[Math.min(N, j + 1)] ? 1 : 0));
        loop(b, op.map((v, j) => ({ offset: j / N, transform: at(a0 + (360 * j) / N), opacity: v })), { duration: o.T * 1000 });
        out.push(b);
      }
      return { boxes: out };
    },
    /** A level's attached part (fix 3 A2): fixed to the drawn box, never orbiting, in wrappers no beat scales, its far
     *  half behind the figure and its near half before it; marked `data-solid`. `coil` (Level 2): two turns of a coil
     *  ring round the tower's middle, wider than its body, in its accent over an ink keyline; `plinth` (Level 3): the
     *  coil and a lit plinth under the tower, wider than its base. One piece of the budget; it rises in once with the
     *  level (`me.attIn`), stands still otherwise, and its drawing is the level's silhouette step (IoU at most 0.85). */
    attach(kind) {
      // (a still drawing fixed to the box, like the floor drawings: a phone's two-piece budget is its orbiting pieces',
      // so its Level 2 and 3 keep two of them besides the part)
      if (!one && !take()) return null;
      const NS = 'http://www.w3.org/2000/svg', bx = G.box, acc = accentNow(), key = ++serial, boxes = [];
      const sw = Math.max(3, 0.026 * bx.h), kl = sw + Math.max(2.5, 0.014 * bx.h);
      // (a radius in box widths as a floor radius: G.at's widths are the figure's own)
      const part = (layer, half, draws) => {
        const pts = draws.flatMap((d) => d.pts);
        const m = kl + 2, x0 = Math.min(...pts.map((q) => q.x)) - m, y0 = Math.min(...pts.map((q) => q.y)) - m, x1 = Math.max(...pts.map((q) => q.x)) + m, y1 = Math.max(...pts.map((q) => q.y)) + m;
        const b = el('div', 'au-p au-att', layer);
        Object.assign(b.style, { width: `${F(x1 - x0)}px`, height: `${F(y1 - y0)}px`, transform: `translate3d(${F(x0)}px,${F(y0)}px,0)`, opacity: rd ? '1' : '1', color: acc });
        b.dataset.k = String(key); b.dataset.p = `${kind}:${half}`; b.dataset.solid = 'body';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', `${F(x0)} ${F(y0)} ${F(x1 - x0)} ${F(y1 - y0)}`);
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('preserveAspectRatio', 'none');
        // (fix 3 A5 critic: the part never lies on a leader: each leader's drawn box grown 8 px, as the orbits' forbidden
        // rects, is cut out of it, one clip a leader, so the coil reads as passing behind the leader and the plinth
        // stops at its feet; 390 had both coil rings across Tavi's shoulders and the plinth under his feet)
        let host = svg;
        const cuts = (G.hud ?? []).filter((q) => q.lead && q.x0 < x1 && q.x1 > x0 && q.y0 < y1 && q.y1 > y0);
        if (cuts.length) {
          const defs = document.createElementNS(NS, 'defs');
          svg.append(defs);
          for (const q of cuts) {
            const id = `au-cut-${++cutSerial}`, cp = document.createElementNS(NS, 'clipPath'), pa = document.createElementNS(NS, 'path');
            cp.setAttribute('id', id); cp.setAttribute('clipPathUnits', 'userSpaceOnUse');
            pa.setAttribute('clip-rule', 'evenodd');
            pa.setAttribute('d', `M${F(x0 - 1)} ${F(y0 - 1)}H${F(x1 + 1)}V${F(y1 + 1)}H${F(x0 - 1)}Z M${F(q.x0)} ${F(q.y0)}H${F(q.x1)}V${F(q.y1)}H${F(q.x0)}Z`);
            cp.append(pa); defs.append(cp);
            const gg = document.createElementNS(NS, 'g');
            gg.setAttribute('clip-path', `url(#${id})`);
            host.append(gg); host = gg;
          }
          b.dataset.cut = String(cuts.length);
        }
        for (const d of draws) for (const a of d.paint) { const e = document.createElementNS(NS, 'path'); e.setAttribute('d', d.d); for (const [k2, v] of Object.entries(a)) e.setAttribute(k2, String(v)); host.append(e); }
        b.append(svg);
        boxes.push(b);
        // (it comes in with its level, a rise of 0.06 of the box and a fade, 320 ms; a redraw lays it still)
        if (me.attIn && !rd) beat(b, [{ opacity: 0, transform: `translate3d(${F(x0)}px,${F(y0 + 0.06 * bx.h)}px,0)` }, { opacity: 1, transform: `translate3d(${F(x0)}px,${F(y0)}px,0)` }], { duration: 320, delay: 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
        return b;
      };
      // (a ring round the box at a height, on screen: centred on the stand's axis, as wide as the floor circle projects,
      // and never flatter than `flat` of its width, so a low camera still sees a ring and not a bar; its far half the
      // upper arc, its near half the lower)
      const ellipse = (rW, hH, flat) => {
        const c = G.at(0, 0, hH), l = G.at(-Math.PI / 2, rW, hH), r = G.at(Math.PI / 2, rW, hH), fr = G.at(0, rW, hH);
        const rx = Math.abs(r.x - l.x) / 2, ry = Math.max(Math.abs(fr.y - c.y), flat * rx);
        return { cx: (l.x + r.x) / 2, cy: (l.y + r.y) / 2, rx, ry };
      };
      const ring = (rW, hH, front, flat = 0.2) => { const E = ellipse(rW, hH, flat), pts = Array.from({ length: 25 }, (_, j) => { const a = Math.PI * (j / 24); return { x: E.cx - E.rx * Math.cos(a), y: E.cy + (front ? 1 : -1) * E.ry * Math.sin(a) }; }); return { pts, d: `M${pts.map((q) => `${F(q.x)} ${F(q.y)}`).join('L')}` }; };
      const stroke = (w, col, op = 1) => ({ fill: 'none', stroke: col, 'stroke-width': F(w), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: op });
      const rC = 0.62, hC = [0.5, 0.6];
      const coil = (front) => hC.map((h) => { const r = ring(rC, h, front); return { ...r, paint: [stroke(kl, '#141312', 0.8), stroke(sw, 'currentColor'), stroke(Math.max(1, sw * 0.28), '#fffdf3', front ? 0.75 : 0.35)] }; });
      const back = [], front = [];
      if (kind === 'plinth') {
        // the plinth: a disc on the floor under the tower, its rim lit; all of it behind the figure (it lies under it)
        const E = ellipse(0.76, 0, 0.24), disc = (k) => Array.from({ length: 49 }, (_, j) => ({ x: E.cx + E.rx * k * Math.cos((j / 48) * TAU), y: E.cy + E.ry * k * Math.sin((j / 48) * TAU) })), all = disc(1), inner = disc(0.82);
        const dAll = `M${all.map((q) => `${F(q.x)} ${F(q.y)}`).join('L')}Z`, dIn = `M${inner.map((q) => `${F(q.x)} ${F(q.y)}`).join('L')}Z`;
        back.push({ pts: all, d: dAll, paint: [{ fill: '#17130f', 'fill-opacity': 0.85, stroke: '#141312', 'stroke-width': F(kl * 0.7) }, { fill: 'none', stroke: 'currentColor', 'stroke-width': F(sw * 0.55), 'stroke-opacity': 0.9 }] }, { pts: inner, d: dIn, paint: [{ fill: 'currentColor', 'fill-opacity': 0.16, stroke: 'currentColor', 'stroke-width': F(Math.max(1, sw * 0.3)), 'stroke-opacity': 0.55, 'stroke-dasharray': `${F(sw * 1.6)} ${F(sw * 1.1)}` }] });
      }
      back.push(...coil(false)); front.push(...coil(true));
      part(L.wab, 'back', back);
      part(L.wa, 'front', front);
      me.att = boxes;
      return { boxes };
    },
    /** Agent Machines: a worker chip lifts off its trace at one corner, rides the air to the next and sets down on the
     *  trace again, `i` of `n` round the square. */
    lift(pi, o) {
      const p = pieceAt(pi);
      if (!p) return null;
      // the trace's corners as angles round the stand (the square lies on the floor's own X and Z)
      const R = (o.r * (me.traceR?.kf ?? 1) * G.wM), cs = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, z]) => G.toAng(x * R, z * R));
      const c0 = cs[o.i % 4], c1 = cs[(o.i + 1) % 4];
      let da = c1.a - c0.a;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      const lerp = (u) => ({ a: c0.a + da * u, r: c0.rW + (c1.rW - c0.rW) * u });
      // up 0-0.18, through the air 0.18-0.62 (h to 0.6-0.8), down 0.62-0.8, home on the trace 0.8-1
      const pos = (t) => {
        if (t < 0.18) { const u = ease(t / 0.18); return { ...lerp(0.08 * u), h: o.top * u * 0.8 }; }
        if (t < 0.62) { const u = (t - 0.18) / 0.44; return { ...lerp(0.08 + 0.84 * ease(u)), h: o.top * (0.8 + 0.2 * Math.sin(Math.PI * u)) }; }
        if (t < 0.8) { const u = ease((t - 0.62) / 0.18); return { ...lerp(0.92 + 0.08 * u), h: o.top * 0.8 * (1 - u) + 0.02 }; }
        return { ...lerp(1), h: 0.02 };
      };
      return B.path(p, { T: o.T, phase: o.phase ?? 0, pos, size: o.size ?? 1, rot: (t) => (t < 0.8 ? 10 * Math.sin(TAU * t) : 0), samples: 32 });
    },
    /** Claude of Tanks: the dirt spray kicks off the rear track, one kick a cycle. */
    kick(pi, o) {
      const p = pieceAt(pi);
      if (!p) return null;
      // off the rear track, or the nearest rear quarter whose spray (at its largest) clears the room and the HUD plates
      const B0 = G.foeAng + Math.PI;
      let behind = B0, q = G.at(B0, 0.42, 0.06), w = 0, h = 0;
      const tries = [[0, 0.42], [0.5, 0.42], [-0.5, 0.42], [0.9, 0.4], [-0.9, 0.4], [0, 0.3]];
      let found = false;
      for (const [da, r] of tries) {
        const a = B0 + da, qq = G.at(a, r, 0.06), sz = floorSize(...Object.values(sizeOf(p, 0.8)), 1.1 * qq.k), fl = Math.sin(a) < 0 ? -1 : 1;
        const cx = qq.x + fl * sz.w * 0.15, cy = qq.y - sz.h * 0.35 - sz.h * 0.14, k2 = 1.1 * qq.k;
        const ex = [cx - (sz.w * k2) / 2, cy - (sz.h * k2) / 2, cx + (sz.w * k2) / 2, cy + (sz.h * k2) / 2];
        // (fix 2 A2: and off the console and the leaders)
        if (G.fitsO(...ex) && !(G.hud ?? []).some((r) => ex[0] < r.x1 + 3 && ex[2] > r.x0 - 3 && ex[1] < r.y1 + 3 && ex[3] > r.y0 - 3)) { behind = a; q = qq; ({ w, h } = sz); found = true; break; }
      }
      if (!found) return null;
      // the spray leans away from the foe
      const flip = Math.sin(behind) < 0 ? -1 : 1;
      // (a reduced still: left out where it would lie over a still already laid, fix 2 critic)
      if (rd) {
        const k2 = 0.9 * q.k, cx = q.x + flip * w * 0.15, cy = q.y - h * 0.35, e = [cx - (w * k2) / 2, cy - (h * k2) / 2, cx + (w * k2) / 2, cy + (h * k2) / 2], a = (e[2] - e[0]) * (e[3] - e[1]);
        if ((B.stills ?? []).some(([u0, v0, u1, v1]) => (Math.max(0, Math.min(e[2], u1) - Math.max(e[0], u0)) * Math.max(0, Math.min(e[3], v1) - Math.max(e[1], v0))) / Math.max(1, Math.min(a, (u1 - u0) * (v1 - v0))) > 0.14)) return null;
      }
      if (!take()) return null;
      const b = box(q.f >= 0 ? L.wf : L.wb, p, w, h);
      const at = (s, op, dy = 0) => ({ transform: `${tf(q.x + flip * w * 0.15, q.y - h * 0.35 + dy, w, h, s * q.k, flip)}`, opacity: op });
      if (rd) { Object.assign(b.style, { transform: at(0.9, 0).transform, opacity: '0.35' }); return { boxes: [b] }; }
      const T = o.T * 1000;
      loop(b, [at(0.35, 0), { ...at(1, 0.9, -h * 0.08), offset: 0.05 }, { ...at(1.08, 0.5, -h * 0.12), offset: 0.14 }, { ...at(1.1, 0, -h * 0.14), offset: 0.3 }, { ...at(0.35, 0), offset: 0.31 }, at(0.35, 0)], { duration: T, easing: 'cubic-bezier(.2,.8,.2,1)', delay: -T * 0.4 });
      me.kickBox = { b, at };
      return { boxes: [b] };
    },
    /** A piece standing still beside the head: Cotfly's trace breathing, its wing strokes beating. */
    perch(pi, o) {
      const p = pieceAt(pi);
      if (!p || !take()) return null;
      const q0 = G.at(o.a, o.r, o.h), { w, h } = floorSize(...Object.values(sizeOf(p, o.size ?? 1)), q0.k), sx = o.mirror ? -1 : 1;
      // (fix 2 A2: off the figure's middle, the console, the leaders, its breath's rise included)
      const ext = (c) => [c.x - (w * c.k) / 2, c.y - (h * c.k) / 2 - h * 0.15, c.x + (w * c.k) / 2, c.y + (h * c.k) / 2];
      const pf = placeFix(G, ext, G.fitsO, true), q1 = G.at(-o.a, o.r, o.h);
      // (where it cannot stand clear, it stands at its mirror angle; where neither can, it is not worn)
      const q = pf({ ...q0 }, true) ?? pf({ ...q1 }, true);
      if (!q) { used--; return null; }
      const b = box(q.f >= 0 || one ? L.wf : L.wb, p, w, h);
      b.dataset.solid = 'body';
      const base = tf(q.x, q.y, w, h, q.k, sx);
      if (rd) { b.style.transform = base; b.style.opacity = '0.6'; return { boxes: [b] }; }
      if (o.beat) loop(b, [{ transform: base, opacity: 0.85 }, { transform: tf(q.x, q.y - 1.5, w, h, q.k * 1.02, sx), opacity: 0.6 }, { transform: base, opacity: 0.85 }], { duration: 1000 / o.beat, delay: -(o.delay ?? 0) * 1000 });
      else loop(b, [{ transform: base, opacity: 0.95 }, { transform: tf(q.x, q.y - h * 0.15, w, h, q.k, sx), opacity: 0.7 }, { transform: base, opacity: 0.95 }], { duration: o.breathe * 1000, easing: 'ease-in-out' });
      (me.perch ??= []).push({ b, base, q, w, h });
      return { boxes: [b] };
    },
    /** Agent Pets: paw prints walk the pad ring, each print fading in ahead of the last (on the floor: each print's
     *  far and near copies, the floor's halves showing the one on its side). */
    walk(ix, o) {
      const ps = ix.map(pieceAt).filter(Boolean).slice(0, takeUpTo(ix.length));
      if (!ps.length) return null;
      // each print lives until this paw's next step (three paws: three steps; fewer on a smaller budget)
      const steps = o.steps, T = o.T * 1000, life = Math.min(3, ps.length) / steps;
      // the walk's ring inside the room, the print's own half-diagonal included
      const kf = G.fitR(o.r + 0.05 + 0.19, 2) / (o.r + 0.05 + 0.19), r = o.r * kf, szW = Math.max(0.18, 0.26 * kf);
      // (a print on the floor reads its width on screen: S floor px a metre, k0 px a metre at the stand)
      const sz = Math.max(szW * G.mFloor, (1.06 * G.minSide * S) / G.k0), boxes = [];
      const blocked = (i) => {
        const a = (i / steps) * TAU, c = G.onFloor(a, r + (i % 2 ? 0.05 : -0.05)), h2 = sz * 0.75;
        const qs = [[-h2, -h2], [h2, -h2], [h2, h2], [-h2, h2]].map(([u, v]) => G.floorPt(c.x + u, c.y + v));
        const x0 = Math.min(...qs.map((q) => q.x)), x1 = Math.max(...qs.map((q) => q.x)), y0 = Math.min(...qs.map((q) => q.y)), y1 = Math.max(...qs.map((q) => q.y));
        return (G.hud ?? []).some((h) => x0 < h.x1 + 3 && x1 > h.x0 - 3 && y0 < h.y1 + 3 && y1 > h.y0 - 3);
      };
      ps.forEach((p, j) => {
        const key = ++serial;
        const at = (i) => {
          const a = (i / steps) * TAU, c = G.onFloor(a, r + (i % 2 ? 0.05 : -0.05));
          // the print points along the walk
          return `translate3d(${F(c.x - sz / 2)}px,${F(c.y - sz / 2)}px,0) rotate(${F((-a * 180) / Math.PI - 90)}deg)`;
        };
        for (const host of FLOORS) {
          const b = el('div', 'au-f', host);
          Object.assign(b.style, { width: `${F(sz)}px`, height: `${F(sz)}px` });
          b.dataset.k = String(key);
          b.append(pieceNode(p));
          boxes.push(b);
          if (rd) { b.style.transform = at(j * 2); b.style.opacity = '0.6'; continue; }
          const frames = [];
          for (let i = j; i < steps; i += ps.length) {
            // (fix 2 A2: a step whose print would lie on a leader's feet or the console is skipped)
            if (blocked(i)) continue;
            const t0 = i / steps;
            frames.push({ offset: t0, transform: at(i), opacity: 0 }, { offset: t0 + 0.03, transform: at(i), opacity: 0.9 }, { offset: Math.min(0.999, t0 + life - 0.01), transform: at(i), opacity: 0 });
          }
          if (!frames.length) { b.style.opacity = '0'; continue; }
          if (frames[0].offset > 0) frames.unshift({ ...frames[0], offset: 0, opacity: 0 });
          frames.push({ ...frames.at(-1), offset: 1, opacity: 0 });
          loop(b, frames, { duration: T });
        }
      });
      return { boxes };
    },
    /** Agent Machines: the green trace laid round the pad as a rounded square, the worker chip riding it (both on the
     *  floor, far and near halves). */
    trace(pi, o) {
      const p = pieceAt(pi);
      if (!p || !takeFloor(1)) return null;
      const ride = !one && take(1);
      // the square's corner (1.32 r) and the chip's half-diagonal inside the room
      const kf = G.fitBox(o.r, 10 + 0.14 * G.mFloor) / o.r;
      const r = o.r * kf * G.wM * S, c = { x: G.fw / 2, y: G.fd / 2 }, sz = Math.max(Math.max(0.2, 0.28 * kf) * G.mFloor, (1.06 * G.minSide * S) / G.k0);
      me.traceR = { r, kf };
      const boxes = [];
      for (const host of FLOORS) {
        const svg = svgEl(host, c.x - r - 10, c.y - r - 10, 2 * r + 20, 2 * r + 20);
        svgEl.rect(svg, 10, 10, 2 * r, 2 * r, r * 0.22, { stroke: '#062e16', 'stroke-width': 10, fill: 'none', opacity: 0.6 });
        svgEl.rect(svg, 10, 10, 2 * r, 2 * r, r * 0.22, { stroke: '#22c55e', 'stroke-width': 5, fill: 'none', opacity: 0.9 });
        for (const [vx, vy] of [[10, 10], [10 + 2 * r, 10 + 2 * r]]) svgEl.circle(svg, vx, vy, 6, { fill: '#d4af37', stroke: '#062e16', 'stroke-width': 2 });
        svg.dataset.solid = 'floor';
        boxes.push(svg);
      }
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => ({ x: c.x + x * r - sz / 2, y: c.y + y * r - sz / 2 }));
      const fr = [...corners, corners[0]].map((q, i) => ({ offset: i / 4, transform: `translate3d(${F(q.x)}px,${F(q.y)}px,0)` }));
      me.chip = [];
      const key = ++serial;
      for (const host of ride ? FLOORS : []) {
        const b = el('div', 'au-f', host);
        Object.assign(b.style, { width: `${F(sz)}px`, height: `${F(sz)}px` });
        b.dataset.k = String(key);
        b.append(pieceNode(p));
        if (rd) b.style.transform = fr[1].transform;
        else loop(b, fr, { duration: o.T * 1000 });
        me.chip.push(b);
        boxes.push(b);
      }
      return { boxes };
    },
    /** Prototemplate: concentric floor rings in the hub's chroma, one floor drawing (its two halves) turning its dash
     *  pattern by one dash a period (36 dashes on every ring, so the turn is seamless for all of them). */
    rings(colors, o) {
      if (!takeFloor(1)) return null;
      const n = one ? Math.min(3, colors.length) : colors.length, DASH = 36, turn = 360 / DASH;
      const outer = o.r0 + o.dr * (n - 1), kf = G.fitBox(outer, 6, turn) / outer, R = outer * kf * G.wM * S;
      const items = [];
      for (const host of FLOORS) {
        const svg = svgEl(host, G.fw / 2 - R - 6, G.fd / 2 - R - 6, 2 * R + 12, 2 * R + 12);
        svg.style.transformOrigin = '50% 50%';
        colors.slice(0, n).forEach((col, i) => {
          const r = (o.r0 + o.dr * i) * kf * G.wM * S, seg = (TAU * r) / DASH, dash = o.dash ? `${F(seg * 0.68)} ${F(seg * 0.32)}` : null;
          svgEl.circle(svg, R + 6, R + 6, r, { fill: 'none', stroke: o.key, 'stroke-width': 5, opacity: 0.55, ...(dash ? { 'stroke-dasharray': dash } : {}) });
          svgEl.circle(svg, R + 6, R + 6, r, { fill: 'none', stroke: col, 'stroke-width': 2.6, ...(dash ? { 'stroke-dasharray': dash } : {}) });
        });
        if (!rd) loop(svg, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${F(turn)}deg)` }], { duration: (o.T * 1000) / DASH }, true);
        svg.dataset.solid = 'floor';
        items.push(svg);
      }
      me.ringR = outer * kf;
      me.ringN = n;
      return { boxes: items };
    },
    /** Relay: the ivory and lilac hooks over the figure, the tile passed between them, the dotted handoff. */
    handoff(o) {
      const out = [];
      const A = { a: -1.15, r: 0.42, h: 0.98 }, Bh = { a: 1.15, r: 0.42, h: 0.86 };
      out.push(B.path(o.hooks[0], { T: 6.6, twin: false, pos: () => A, size: 0.8, still: 0.5, solid: 'body', alts: [{ a: -0.75, r: 0.4, h: 1.12 }, { a: -1.5, r: 0.45, h: 0.7 }] }));
      out.push(B.path(o.hooks[1], { T: 6.6, twin: false, pos: () => Bh, size: 0.8, still: 0.5, solid: 'body', alts: [{ a: 0.75, r: 0.4, h: 1.1 }, { a: 1.5, r: 0.45, h: 0.65 }] }));
      // there 1.8 s, rest 1.5 s, back 1.8 s, rest 1.5 s, on a lifted arc
      const go = (t) => { const u = ease(Math.max(0, Math.min(1, t))); return { a: A.a + (Bh.a - A.a) * u, r: 0.42, h: A.h + (Bh.h - A.h) * u + 0.22 * Math.sin(Math.PI * u) }; };
      out.push(B.path(o.tile, { T: 6.6, twin: false, size: 0.7, still: 0.6, pos: (t) => (t < 0.273 ? go(t / 0.273) : t < 0.5 ? go(1) : t < 0.773 ? go(1 - (t - 0.5) / 0.273) : go(0)), rot: (t) => 8 * Math.sin(TAU * t), samples: 36 }));
      return out;
    },
    /** Kevin Wiki: the thread draws round the pad in arcs (2.4 s), holds (1.6 s), retracts; the link rides its head.
     *  The arcs meet at the tangents, so each lies whole in the floor's near or far half (one box each). */
    thread(pi, o) {
      const n = max >= 6 ? 6 : 4;
      if (!takeFloor(max >= 6 ? 2 : 1)) return null;
      const T = o.T * 1000;
      // the head first: the thread's radius is what the link may ride inside the room
      const r1 = G.fitBox(o.r, 8);
      let kr = 1;
      const head = B.path(pi, { T: o.T, twin: true, size: 1.05, still: 0.3, samples: 32, pos: (t) => { const u = t < 2.4 / o.T ? t / (2.4 / o.T) : t < 4.0 / o.T ? 1 : Math.max(0, 1 - (t - 4.0 / o.T) / (1.2 / o.T)); return { a: -Math.PI / 2 + u * TAU, r: r1, h: 0.08 }; }, op: (t) => (t > 5.2 / o.T ? 0 : 1), report: (k2) => { kr = k2; } });
      const rW = r1 * kr, segs = [];
      for (let i = 0; i < n; i++) {
        const a0 = -Math.PI / 2 + (i / n) * TAU, a1 = -Math.PI / 2 + ((i + 1) / n) * TAU, nearArc = Math.cos((a0 + a1) / 2) > 0;
        const pts = Array.from({ length: 13 }, (_, j) => G.onFloor(a0 + ((a1 - a0) * j) / 12, rW));
        const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y), x0 = Math.min(...xs) - 8, y0 = Math.min(...ys) - 8;
        const svg = svgEl(nearArc ? decoF : deco, x0, y0, Math.max(...xs) - x0 + 8, Math.max(...ys) - y0 + 8);
        const d = pts.map((q, j) => `${j ? 'L' : 'M'}${F(q.x - x0)} ${F(q.y - y0)}`).join('');
        svgEl.path(svg, d, { fill: 'none', stroke: '#11100e', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.6 });
        svgEl.path(svg, d, { fill: 'none', stroke: '#f4f1ea', 'stroke-width': 3.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        const on = (2.4 / o.T) * (i / n), off = (4.0 / o.T) + (1.2 / o.T) * ((n - 1 - i) / n);
        svg.dataset.solid = 'floor';
        if (rd || one) svg.style.opacity = rd ? '0.6' : '0.9';
        else loop(svg, [{ offset: 0, opacity: 0 }, { offset: on, opacity: 0 }, { offset: on + 0.012, opacity: 1 }, { offset: off, opacity: 1 }, { offset: Math.min(0.999, off + 0.012), opacity: 0 }, { offset: 1, opacity: 0 }], { duration: T });
        segs.push(svg);
      }
      me.thread = segs;
      return { boxes: [...segs, ...(head?.boxes ?? [])] };
    },
    /** Princeton TD: the game's dashed range ring in the tower's accent, its near half in front of the tower; its
     *  radius by the tower's range, the longest range the room allows. */
    range() {
      if (!takeFloor(1)) return null;
      const items = [], dashes = 48, turn = 360 / dashes;
      const rMax = G.fitBox(1.2 * 1.35, 6, turn);
      const draw = (accent, rW) => {
        for (const x of items.splice(0)) x.remove();
        // the game's range, in figure widths: the longest (Palmer Mortar) the room's, a shorter one in proportion
        const r = (rMax * Math.min(1.2, rW)) / 1.2 * G.wM * S, seg = (TAU * r) / dashes;
        for (const host of FLOORS) {
          const svg = svgEl(host, G.fw / 2 - r - 6, G.fd / 2 - r - 6, 2 * r + 12, 2 * r + 12);
          svg.style.transformOrigin = '50% 50%';
          const dash = `${F(seg * 0.62)} ${F(seg * 0.38)}`;
          // the room keeps a thin tower's ring near its base, so it reads by weight: a 12% fill, a heavier dash
          svgEl.circle(svg, r + 6, r + 6, r, { fill: `color-mix(in srgb, ${accent} 12%, transparent)`, stroke: 'none' });
          svgEl.circle(svg, r + 6, r + 6, r, { fill: 'none', stroke: '#141312', 'stroke-width': 6.5, opacity: 0.5, 'stroke-dasharray': dash });
          svgEl.circle(svg, r + 6, r + 6, r, { fill: 'none', stroke: accent, 'stroke-width': 3.6, opacity: 0.95, 'stroke-dasharray': dash });
          // the dash phase, T 14 s a lap: one dash a period
          if (!rd) loop(svg, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${F(turn)}deg)` }], { duration: 14000 / dashes }, true);
          svg.dataset.solid = 'floor';
          items.push(svg);
        }
        me.ringSvgs = items;
      };
      const f = form ?? 'lab';
      draw(accentNow(), TOWER[f]?.[1] ?? 1);
      B.accent = (accent, rW) => { draw(accent, rW ?? 1); for (const b of me.tinted ?? []) b.style.color = accent; };
      // the game's level badge bobs 2 px over 3 s (arena/ptd-figure.js badge, mounted by the board)
      const badge = fig.ptd?.badge ?? fig.body?.querySelector?.('.ptd-badge');
      if (badge && !rd && !one) loop(badge, [{ translate: '0 0' }, { translate: '0 -2px' }, { translate: '0 0' }], { duration: 3000, easing: 'ease-in-out' });
      return { boxes: items };
    },
  };
  /** The card's own reaction beats that touch one piece. */
  B.react = (style, share) => {
    if (rd) return;
    // every beat runs on the board's clock (`beat`: the motion registry, so a skip finishes it and a hold pauses it)
    if (style === 'puff' && me.kickBox) { const { b, at } = me.kickBox; beat(b, [at(0.4, 0), { ...at(1, 0.85), offset: 0.25 }, at(1.15, 0)], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)', composite: 'replace', fill: 'none' }); }
    if (style === 'break') { const b = L.wf.querySelector('.au-p:not(.au-trail)') ?? L.wb.querySelector('.au-p:not(.au-trail)'); const tr = b ? [L.wb, L.wf].flatMap((w) => [...w.querySelectorAll(`:scope > .au-trail[data-t="${b.dataset.k}"]`)]) : []; for (const x of [b, ...tr]) if (x?.firstElementChild) beat(x.firstElementChild, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)', offset: 0.25 }, { transform: 'scaleX(0)', offset: 0.7 }, { transform: 'scaleX(1)' }], { duration: 480, easing: 'ease-out', fill: 'none' }); }
    if (style === 'hop' && me.chip) for (const c of me.chip) if (c.firstElementChild) beat(c.firstElementChild, [{ transform: 'none' }, { transform: 'scale(1.5) translate3d(0,-30%,0)', offset: 0.35 }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' });
    if (style === 'snap' && me.thread) for (const d of FLOORS) beat(d, [{ opacity: 1 }, { opacity: 0.08, offset: 0.15 }, { opacity: 0.08, offset: 0.45 }, { opacity: 1 }], { duration: 700, easing: 'ease-out', fill: 'none' });
    if (style === 'flat' && me.perch?.[0]) { const { b } = me.perch[0]; if (b.firstElementChild) beat(b.firstElementChild, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.15)', offset: 0.2 }, { transform: 'scaleY(.15)', offset: 0.6 }, { transform: 'scaleY(1)' }], { duration: 600, easing: 'ease-out', fill: 'none' }); }
    void share;
  };
  /** The charge: Cotfly's trace climbs toward its threshold, every other card's pieces only gather. */
  B.act = (on) => {
    if (rd) return;
    if (fig.id === 'jarhead') { corners(on); return; }
    if (!me.perch?.[0] || fig.id !== 'cotfly') return;
    const n = me.perch[0].b.firstElementChild;
    if (!n) return;
    if (on) me.cotA = beat(n, [{ transform: 'translateY(0) scaleY(1)' }, { transform: 'translateY(-18%) scaleY(1.9)' }], { duration: 400, easing: 'cubic-bezier(.3,.7,.1,1)', fill: 'forwards' });
    else { me.cotA?.cancel(); beat(n, [{ transform: 'translateY(-30%) scaleY(2.6)' }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' }); }
  };
  /** Jarhead's act: its four solid capture corners close on its own box (1.08) for the gather and leave at the
   *  release, where the special flies them as the reticle (section 5.3); a beat's boxes, never an idle piece. */
  const corners = (on) => {
    if (on) {
      if (me.corners) return;
      const bx = G.box, cx = bx.x + bx.w / 2, cy = bx.y + bx.h / 2, hw = (bx.w * 1.08) / 2, hh = (bx.h * 1.08) / 2;
      const leg = Math.max(Math.min(bx.w, bx.h) * 0.22, G.minSide * 0.6);
      me.corners = [0, 1, 2, 3].map((i) => {
        // (fix 3 A6: the print's fourth piece carries the system arrow and its click marks; the fourth corner is the
        // first turned half round, so the four brackets match and no white arrow is worn)
        const p = pieceAt(i === 3 ? 0 : i), turn = i === 3 ? 180 : 0;
        if (!p || p.drawn) return null;
        const b = box(L.wf, p, leg, leg);
        b.classList.add('au-beat');
        const x = i % 2 ? cx + hw - leg / 2 : cx - hw + leg / 2, y = i < 2 ? cy - hh + leg / 2 : cy + hh - leg / 2;
        const dx = (i % 2 ? 1 : -1) * leg * 0.5, dy = (i < 2 ? -1 : 1) * leg * 0.5;
        beat(b, [{ transform: tf(x + dx, y + dy, leg, leg, 1.2, 1, turn), opacity: 0 }, { transform: tf(x, y, leg, leg, 1, 1, turn), opacity: 1 }], { duration: 140, delay: i * 25, easing: 'cubic-bezier(.2,.9,.1,1)', fill: 'both' });
        return b;
      }).filter(Boolean);
      return;
    }
    const els = me.corners ?? [];
    me.corners = null;
    for (const b of els) beat(b, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {}).then(() => b.remove());
  };
  /** A construction's burst (fix 1 A2): one ring in the new tower's accent leaves the pad along the floor. */
  B.burstRing = (accent, ms) => {
    if (rd) return [];
    const r = G.mFloor * 0.55, out = [];
    for (const host of FLOORS) {
      const svg = svgEl(host, G.fw / 2 - r - 8, G.fd / 2 - r - 8, 2 * r + 16, 2 * r + 16);
      svg.classList.add('au-beat');
      svg.style.transformOrigin = '50% 50%';
      svgEl.circle(svg, r + 8, r + 8, r, { fill: 'none', stroke: '#141312', 'stroke-width': 9, opacity: 0.5 });
      svgEl.circle(svg, r + 8, r + 8, r, { fill: 'none', stroke: accent, 'stroke-width': 4.5 });
      const a = beat(svg, [{ transform: 'scale(.25)', opacity: 0.95 }, { transform: 'scale(1.1)', opacity: 0.8, offset: 0.45 }, { transform: 'scale(1.6)', opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
      a.finished.catch(() => {}).then(() => svg.remove());
      out.push(a);
    }
    return out;
  };
  /** Loop: a stat change reads as its own diff rows, + rows for a raise, - rows for a drop, from impact + 450. */
  B.rows = (up, at) => {
    if (rd) return;
    const ix = up ? [0, 2] : [1, 3];
    ix.forEach((pi, j) => {
      const p = pieceAt(pi);
      if (!p) return;
      const { w, h } = sizeOf(p, 1.1), q0 = G.at(0.35 - j * 0.6, 0.1, 0.95), q1 = G.at(0.35 - j * 0.6, 0.3, 1.25);
      const b = box(L.wf, p, w, h);
      beat(b, [{ transform: tf(q0.x, q0.y, w, h, 0.6), opacity: 0 }, { transform: tf(q0.x, q0.y, w, h, 1), opacity: 1, offset: 0.2 }, { transform: tf(q1.x, q1.y, w, h, 1), opacity: 1, offset: 0.75 }, { transform: tf(q1.x, q1.y - 8, w, h, 0.9), opacity: 0 }], { duration: 900, delay: at + j * 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }).finished.catch(() => {}).then(() => b.remove());
    });
  };
  /** Prototemplate's guard: while a barrier stands, the five rings rise and close into a cylinder of arcs. */
  B.shield = (on, still) => {
    if (!me.ringR) return;
    if (on && !me.shieldEls) {
      const els = [];
      const cols = ['#4b3bff', '#00b3ff', '#27d17e', '#ffc53b', '#ff3b6b'].slice(0, me.ringN ?? 5);
      // the floor rings give way to the cylinder they rise into (the box count stays the rings')
      for (const d of FLOORS) beat(d, [{ opacity: 1 }, { opacity: 0 }], { duration: still ? 0 : 240, fill: 'forwards' });
      cols.forEach((col, i) => {
        const hH = 0.12 + i * 0.16;
        // the floor circle at this height, as its projected ellipse (sampled), back half behind, front half before
        const pts = Array.from({ length: 24 }, (_, j) => G.at((j / 24) * TAU, me.ringR, hH));
        const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        for (const [layer, half] of [[L.wb, 'back'], [L.wf, 'front']]) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('class', 'au-shield');
          svg.setAttribute('viewBox', `${F(x0 - 4)} ${F(y0 - 4)} ${F(x1 - x0 + 8)} ${F(y1 - y0 + 8)}`);
          Object.assign(svg.style, { left: `${F(x0 - 4)}px`, top: `${F(y0 - 4)}px`, width: `${F(x1 - x0 + 8)}px`, height: `${F(y1 - y0 + 8)}px` });
          const cy = (y0 + y1) / 2;
          const d = half === 'back' ? `M${F(x0)} ${F(cy)}A${F((x1 - x0) / 2)} ${F((y1 - y0) / 2)} 0 0 1 ${F(x1)} ${F(cy)}` : `M${F(x1)} ${F(cy)}A${F((x1 - x0) / 2)} ${F((y1 - y0) / 2)} 0 0 1 ${F(x0)} ${F(cy)}`;
          svgEl.path(svg, d, { fill: 'none', stroke: '#0f1113', 'stroke-width': 3.6, opacity: 0.5 });
          svgEl.path(svg, d, { fill: 'none', stroke: col, 'stroke-width': 1.8, opacity: half === 'back' ? 0.7 : 0.9 });
          svg.dataset.solid = 'body';
          layer.append(svg);
          els.push(svg);
          if (still) svg.style.opacity = '1';
          else beat(svg, [{ transform: 'translate3d(0,40%,0) scaleY(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, delay: i * 50, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
        }
      });
      me.shieldEls = els;
    } else if (!on && me.shieldEls) {
      const els = me.shieldEls;
      me.shieldEls = null;
      for (const d of FLOORS) { d.getAnimations?.().forEach((a) => { if (me.beats.has(a)) a.cancel(); }); if (!still) beat(d, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'none' }); }
      if (still) { for (const e of els) e.remove(); return; }
      for (const e of els) beat(e, [{ opacity: 1 }, { opacity: 0, transform: 'translate3d(0,30%,0) scaleY(.4)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {}).then(() => e.remove());
    }
  };
  /** Princeton TD's barrier (fix 2 A1; fix 3 A4, ruling 13): a shell of six rows of near-regular hexes over the tower,
   *  a dome on the floor round its drawn box in its side's hue, shown whole at 0.35 for 600 ms when the barrier is
   *  raised and when a blow lands on it (`B.shellFlash`), its far half behind the figure and its near half before it;
   *  between those it rests as a 1.5 px rim arc on the floor before the tower and a ground ring at 0.25 round it, so
   *  the tower stands clear (the plate's chip carries the state). Reduced motion: the rim and the ring, still. Laid once
   *  per layout from the floor's own projection, in wrappers no beat scales; opacity and transform only. */
  B.shell = (on, still) => {
    if (on && !me.shellEls) {
      const NS = 'http://www.w3.org/2000/svg', col = fig.side === 'player' ? 'var(--you, #5f87e8)' : 'var(--rival, #e5683f)';
      // the dome's floor radius (figure widths) and height (figure heights) wrapping the drawn box with a margin
      const bx = G.box, rW = Math.max(0.62, (0.62 * bx.w) / Math.max(1, G.wM * G.k0)), hH = Math.max(1, (1.08 * (G.foot.y - bx.y)) / Math.max(1, G.hM * G.k0));
      const P = (th, ph) => G.at(th, rW * Math.cos(ph), hH * Math.sin(ph));
      const svgOf = (cls, layer, pts, first = true) => {
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', `au-shield ${cls}`);
        svg.setAttribute('aria-hidden', 'true');
        const x0 = Math.min(...pts.map((q) => q.x)) - 4, y0 = Math.min(...pts.map((q) => q.y)) - 4, x1 = Math.max(...pts.map((q) => q.x)) + 4, y1 = Math.max(...pts.map((q) => q.y)) + 4;
        svg.setAttribute('viewBox', `${F(x0)} ${F(y0)} ${F(x1 - x0)} ${F(y1 - y0)}`);
        Object.assign(svg.style, { left: `${F(x0)}px`, top: `${F(y0)}px`, width: `${F(x1 - x0)}px`, height: `${F(y1 - y0)}px`, transformOrigin: `${F(G.foot.x - x0)}px ${F(G.foot.y - y0)}px` });
        if (first) layer.prepend(svg); else layer.append(svg);
        return svg;
      };
      const add = (svg, d, a) => { const e = document.createElementNS(NS, 'path'); e.setAttribute('d', d); for (const [k2, v] of Object.entries(a)) e.style.setProperty(k2, v); svg.append(e); return e; };
      const line = (pts, close = false) => `M${pts.map((q) => `${F(q.x)} ${F(q.y)}`).join('L')}${close ? 'Z' : ''}`;
      // the hexes: six rows up the dome, each cell a regular hexagon on screen (its width to its height 1 : 0.87), the
      // rows staggered half a cell; a row's count from the screen's own speeds at the front of the dome
      const ROWS = 6, span = (Math.PI / 2) * 0.97, dP = span / ROWS;
      const cells = { front: [], back: [] }, fills = { front: [], back: [] };
      for (let r = 0; r < ROWS; r++) {
        const ph = (r + 0.5) * dP, e = 1e-3;
        const vs = Math.hypot(P(0, ph + e).x - P(0, ph).x, P(0, ph + e).y - P(0, ph).y) / e, hs = Math.max(1e-6, Math.hypot(P(e, ph).x - P(0, ph).x, P(e, ph).y - P(0, ph).y) / e);
        // (honeycomb: rows (sqrt 3 / 2) R apart, so R from the row pitch; a cell's corners R across, sqrt 3 R tall)
        const Rp = ((dP * vs) * 2) / Math.sqrt(3), Rt = Rp / hs, n = Math.max(5, Math.round(TAU / (3 * Rt))), Rth = (TAU / (3 * n)) * 0.88, Rph = (Rp / vs) * 0.88;
        for (let c = 0; c < n; c++) {
          const th = ((c + (r % 2) * 0.5) / n) * TAU, side = Math.cos(th) >= 0 ? 'front' : 'back';
          const pts = Array.from({ length: 6 }, (_, k) => { const a = (k * Math.PI) / 3; return P(th + Rth * Math.cos(a), Math.min(Math.PI / 2, Math.max(0, ph + Rph * Math.sin(a)))); });
          const d = line(pts, true);
          cells[side].push(d); if ((r + c) % 3 === 0) fills[side].push(d);
        }
      }
      const rimF = Array.from({ length: 25 }, (_, j) => P(-Math.PI / 2 + (j / 24) * Math.PI, 0)), rimB = Array.from({ length: 25 }, (_, j) => P(Math.PI / 2 + (j / 24) * Math.PI, 0));
      const arc = Array.from({ length: 25 }, (_, j) => P(Math.PI / 2, (j / 24) * Math.PI)).map((q, j) => (j <= 12 ? q : P(-Math.PI / 2, Math.PI - (j / 24) * Math.PI)));
      const els = [], full = [];
      for (const [layer, half] of [[L.wab, 'back'], [L.wa, 'front']]) {
        const all = [...(half === 'front' ? rimF : rimB), ...arc, ...cells[half].flatMap((d) => d.match(/-?[\d.]+ -?[\d.]+/g).map((t) => { const [x, y] = t.split(' ').map(Number); return { x, y }; }))];
        const svg = svgOf('au-hex', layer, all);
        // (a surface of cells, each lightly filled, every third brighter, their edges a light tint of the hue: a shield,
        // never an outline over bars, so no dome silhouette is drawn)
        add(svg, cells[half].join(''), { fill: col, 'fill-opacity': half === 'front' ? '0.16' : '0.1', stroke: `color-mix(in srgb, ${col} 60%, #fff)`, 'stroke-width': half === 'front' ? '1.8' : '1.2', 'stroke-linejoin': 'round' });
        if (fills[half].length) add(svg, fills[half].join(''), { fill: `color-mix(in srgb, ${col} 70%, #fff)`, 'fill-opacity': half === 'front' ? '0.2' : '0.12', stroke: 'none' });
        add(svg, line(half === 'front' ? rimF : rimB), { fill: 'none', stroke: col, 'stroke-width': '2.4' });
        svg.style.opacity = '0';
        els.push(svg); full.push(svg);
      }
      // the rest: the ground ring round the dome's foot at 0.25 (behind the figure) and the rim arc before it, 1.5 px
      const ring = svgOf('au-bar-ring', L.wab, [...rimF, ...rimB]);
      add(ring, line([...rimB, ...rimF.slice(1)], true), { fill: 'none', stroke: col, 'stroke-width': '4', opacity: '0.25' });
      ring.dataset.solid = 'floor';
      const rim = svgOf('au-bar-rim', L.wa, rimF, false);
      add(rim, line(rimF), { fill: 'none', stroke: col, 'stroke-width': '1.5', opacity: '0.85', 'stroke-linecap': 'round' });
      const rest = [ring, rim];
      for (const e of rest) e.style.opacity = '1';
      els.push(...rest);
      me.shellEls = els; me.shellFull = full; me.shellRest = rest;
      if (!still) {
        for (const e of rest) beat(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
        B.shellFlash();
      } else if (!rd && me.flashT != null && me.flashT < 690) {
        const at = me.flashT;
        me.flashA = full.map((e) => { const a = beat(e, FLASH, { duration: 700, easing: 'linear', fill: 'none' }); try { a.currentTime = at; } catch { /* gone */ } return a; });
      }
      me.flashT = null;
    } else if (!on && me.shellEls) {
      const els = me.shellEls, full = me.shellFull ?? [], rest = me.shellRest ?? [];
      me.shellEls = me.shellFull = me.shellRest = null;
      if (still) { for (const e of els) e.remove(); return; }
      // (the blow that takes the barrier shows the whole shell once more, 600 ms, then the rim and ring go with it)
      for (const e of full) { e.getAnimations?.().forEach((a) => { if (me.beats.has(a)) a.cancel(); }); beat(e, FLASH, { duration: 700, easing: 'linear', fill: 'forwards' }).finished.catch(() => {}).then(() => e.remove()); }
      for (const e of rest) beat(e, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 700, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {}).then(() => e.remove());
    }
  };
  const FLASH = [{ opacity: 0, transform: 'scale(.94)' }, { opacity: 0.35, transform: 'none', offset: 0.06 }, { opacity: 0.35, offset: 0.86 }, { opacity: 0, transform: 'none' }];
  /** The whole shell for 600 ms (in over 40, out over 60), at 0.35: raised, or a blow landing on the barrier. */
  B.shellFlash = () => {
    if (rd || !me.shellFull) return;
    const now = performance.now();
    if (me.shellAt && now - me.shellAt < 300) return;
    me.shellAt = now;
    me.flashA = me.shellFull.map((e) => {
      e.getAnimations?.().forEach((a) => { if (me.beats.has(a)) a.cancel(); });
      return beat(e, FLASH, { duration: 700, easing: 'linear', fill: 'none' });
    });
  };
  /** Princeton TD's build: the range ring's dashes draw round the pad in the new accent (the foundation). */
  B.foundation = (ms) => {
    if (rd || !me.ringSvgs) return;
    for (const d of FLOORS) beat(d, [{ opacity: 0, transform: 'scale(.55) rotate(-40deg)' }, { opacity: 1, transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' });
  };
  Object.defineProperty(B, 'used', { get: () => used });
  return B;
}
/** The pieces a card's fx window never drew, drawn here from the card's own print and game (fix 1 A1): Jarhead's
 *  pointer, Princeton TD's level star (the badge's twin, no numeral: decision 19), a spark in the
 *  tower's accent (currentColor) and a road tile, Claude of Tanks' shell casing and smoke ring, Prototemplate's
 *  horizon arc at a weight that reads (its hub's chroma, `col`). In card units, as a cut
 *  piece is (1000 = the card's width). */
const DRAWN = {
  // (fix 2 A2: Jarhead's own pointer, never the system's: in its hue over its deep keyline, 60% of the old size, turned
  // 38 degrees off the system arrow's lean, a two-stroke trail off its tail)
  pointer: (h) => [68, 99, `<g transform="rotate(38 31 44)"><path d="M28 70L22 84M38 66L35 86" fill="none" stroke="${h.deep ?? '#04566a'}" stroke-width="7" stroke-linecap="round" opacity=".7"/><path d="M28 70L22 84M38 66L35 86" fill="none" stroke="${h.energy ?? '#66d2f4'}" stroke-width="3.2" stroke-linecap="round"/><path d="M14 6V58L26 47L35 68L44 64L35 43H52Z" fill="${h.energy ?? '#66d2f4'}" stroke="${h.deep ?? '#04566a'}" stroke-width="5" stroke-linejoin="round"/><path d="M19 17V44" stroke="${h.glint ?? '#d8f4fe'}" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></g>`, '-6 -2 60 88'],
  // (fix 2 A2: Mailroom's postmark read as a crosshair; its letter instead, a cancel wave across the stamp)
  envelope: (h) => [210, 150, `<rect x="2" y="2" width="76" height="52" rx="5" fill="${h.panel ?? '#e2b3d9'}" stroke="${h.ink ?? '#1e111c'}" stroke-width="3.4"/><path d="M4 6L40 32L76 6" fill="none" stroke="${h.deep ?? '#742c6b'}" stroke-width="3.4" stroke-linejoin="round"/><path d="M4 52L30 30M76 52L50 30" fill="none" stroke="${h.deep ?? '#742c6b'}" stroke-width="2.4" opacity=".7"/><rect x="56" y="8" width="16" height="14" rx="1.5" fill="${h.energy ?? '#dd60cc'}" stroke="${h.ink ?? '#1e111c'}" stroke-width="2"/><path d="M46 16q4 -4 8 0t8 0t8 0t8 0" fill="none" stroke="${h.ink ?? '#1e111c'}" stroke-width="1.8" stroke-linecap="round"/>`, '-1 -1 82 58'],
  // (fix 3 A2: Princeton TD's pieces are the tower's own energy in its form's accent, `currentColor`, and step with its
  // level: two sparks at Level 1, a star at 2, two stars and an arc at 3, motes over a 4A dome, chain arcs round a 4B;
  // each a light core and a soft halo of the accent over a fine ink keyline, never the old flat clip-art)
  star: () => [150, 150, `<circle r="9" fill="currentColor" opacity=".22"/><polygon points="${Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 3.4 : 8, a = -Math.PI / 2 + (i * Math.PI) / 5; return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`; }).join(' ')}" fill="currentColor" stroke="#141312" stroke-width="1.5" stroke-linejoin="round"/><polygon points="${Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 1.5 : 3.6, a = -Math.PI / 2 + (i * Math.PI) / 5; return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`; }).join(' ')}" fill="#fffdf3" opacity=".85"/>`, '-10 -10 20 20'],
  spark: () => [150, 150, '<circle r="7.4" fill="currentColor" opacity=".2"/><path d="M0 -9.6C.8 -2.2 2.2 -.8 9.6 0C2.2 .8 .8 2.2 0 9.6C-.8 2.2 -2.2 .8 -9.6 0C-2.2 -.8 -.8 -2.2 0 -9.6Z" fill="currentColor" stroke="#141312" stroke-width="1.1" stroke-linejoin="round"/><path d="M-4.6 -4.6L4.6 4.6M4.6 -4.6L-4.6 4.6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".75"/><circle r="1.9" fill="#fffdf3"/>', '-10 -10 20 20'],
  // a crackling arc between two sparks of light (Level 3)
  arc: () => [210, 120, '<path d="M-12 4C-8 -6 8 -6 12 4" fill="none" stroke="#141312" stroke-width="5.2" stroke-linecap="round" opacity=".7"/><path d="M-12 4L-9.4 -1.4L-6.6 .4L-3.4 -4.6L-.2 -2.6L3.2 -5L6.2 -.8L9.2 -2.2L12 4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M-9.4 -1.4L-6.6 .4L-3.4 -4.6L-.2 -2.6L3.2 -5L6.2 -.8" fill="none" stroke="#fffdf3" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/><circle cx="-12" cy="4" r="2.4" fill="currentColor" stroke="#141312" stroke-width=".9"/><circle cx="12" cy="4" r="2.4" fill="currentColor" stroke="#141312" stroke-width=".9"/>', '-15 -8 30 16'],
  // three motes of light in a little drift (a 4A dome's)
  motes: () => [160, 160, '<circle cx="-3.4" cy="2.6" r="5.6" fill="currentColor" opacity=".22"/><circle cx="4.4" cy="-3.6" r="4.4" fill="currentColor" opacity=".22"/><circle cx="-3.4" cy="2.6" r="3.4" fill="currentColor" stroke="#141312" stroke-width="1"/><circle cx="4.4" cy="-3.6" r="2.6" fill="currentColor" stroke="#141312" stroke-width=".9"/><circle cx="5" cy="5.4" r="1.9" fill="currentColor" stroke="#141312" stroke-width=".8"/><circle cx="-3.9" cy="1.9" r="1.3" fill="#fffdf3"/><circle cx="4" cy="-4" r="1" fill="#fffdf3"/>', '-10 -10 20 20'],
  // a forked chain of lightning (a 4B's)
  chain: () => [200, 150, '<path d="M-11 -6L-5.4 -1.6L-7.4 1.4L-1 5.6L1.2 1.8L5.6 4.6L11 -5.4M1.2 1.8L2.6 -4.2L6.4 -6.4" fill="none" stroke="#141312" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/><path d="M-11 -6L-5.4 -1.6L-7.4 1.4L-1 5.6L1.2 1.8L5.6 4.6L11 -5.4M1.2 1.8L2.6 -4.2L6.4 -6.4" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M-5.4 -1.6L-7.4 1.4L-1 5.6L1.2 1.8L5.6 4.6" fill="none" stroke="#fffdf3" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/><circle cx="-11" cy="-6" r="1.8" fill="#fffdf3" stroke="#141312" stroke-width=".7"/><circle cx="11" cy="-5.4" r="1.8" fill="#fffdf3" stroke="#141312" stroke-width=".7"/>', '-14 -9 28 18'],
  tile: () => [150, 150, '<rect x="-8.6" y="-8.6" width="17.2" height="17.2" rx="2.2" fill="#efb14c" stroke="#141312" stroke-width="1.4"/><path d="M-8 -.4H8M-.4 -8V-.4M3.8 -.4V8" stroke="#8a5a1c" stroke-width="1.2"/><path d="M-6.6 -6.4H-2.6" stroke="#ffe3a6" stroke-width="1" stroke-linecap="round"/>', '-10 -10 20 20'],
  casing: () => [64, 190, '<rect x="1.4" y="7" width="9.2" height="27" rx="1.6" fill="#d9a441" stroke="#2b1e0c" stroke-width="1.4"/><rect x="2.8" y="1.6" width="6.4" height="6.4" rx="1" fill="#ffc861" stroke="#2b1e0c" stroke-width="1.2"/><path d="M1.6 30.6H10.4" stroke="#8a7034" stroke-width="1.4"/><path d="M4 10V28" stroke="#fffbea" stroke-width="1.2" stroke-linecap="round" opacity=".85"/>', '0 0 12 36'],
  horizon: (h, col) => [230, 96, `<path d="M-44 15Q0 -27 44 15" fill="none" stroke="#0f1113" stroke-width="12" stroke-linecap="round" opacity=".7"/><path d="M-44 15Q0 -27 44 15" fill="none" stroke="${col}" stroke-width="6.5" stroke-linecap="round"/><path d="M-30 4Q-14 -8 0 -9" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".55"/>`, '-50 -21 100 42'],
  // (fix 3 A6: an open puff of three grey-brown lobes, never a ring: it read as a gold halo over the turret)
  smoke: () => [230, 150, '<g opacity=".62"><circle cx="-20" cy="6" r="17" fill="#81776b"/><circle cx="4" cy="-4" r="21" fill="#8d8275"/><circle cx="25" cy="8" r="14" fill="#7a7065"/><circle cx="-18" cy="2" r="11" fill="#aea392"/><circle cx="2" cy="-10" r="12" fill="#b9ae9c"/><circle cx="24" cy="4" r="8" fill="#a69b8a"/></g><path d="M-30 -2Q-22 -14 -10 -10M-8 -18Q4 -28 16 -16" fill="none" stroke="#c9bfae" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>', '-42 -30 84 56'],
};
const drawnCache = new Map();
/** A drawn piece, shaped as a cut one: `{ w, h, node }` (an inline SVG, cloned by `pieceNode`). */
function drawn(kind, h = {}, col = '') {
  const key = `${kind}|${h.deep ?? ''}|${h.energy ?? ''}|${col}`;
  if (!drawnCache.has(key)) {
    const [w, hh, body, vb] = DRAWN[kind](h, col);
    const node = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="none" overflow="visible">${body}</svg>`, 'image/svg+xml').documentElement;
    node.setAttribute('aria-hidden', 'true');
    drawnCache.set(key, { id: kind, i: -1, w, h: hh, box: { x: 0, y: 0, w, h: hh }, raster: false, node: document.importNode(node, true), drawn: true });
  }
  return drawnCache.get(key);
}
/** A small SVG in floor (or figure) px. */
function svgEl(host, x, y, w, h) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', `0 0 ${F(w)} ${F(h)}`);
  s.setAttribute('aria-hidden', 'true');
  Object.assign(s.style, { left: `${F(x)}px`, top: `${F(y)}px`, width: `${F(w)}px`, height: `${F(h)}px` });
  host.append(s);
  return s;
}
const shape = (tag) => (svg, ...a) => {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  const attrs = a.pop();
  const names = { rect: ['x', 'y', 'width', 'height', 'rx'], circle: ['cx', 'cy', 'r'], path: ['d'] }[tag];
  names.forEach((n, i) => { if (a[i] !== undefined) e.setAttribute(n, typeof a[i] === 'number' ? String(F(a[i])) : a[i]); });
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  svg.append(e);
  return e;
};
svgEl.rect = shape('rect'); svgEl.circle = shape('circle'); svgEl.path = shape('path');

/** For the probe (tools/aura-probe.mjs A1): each standing figure's aura box against its figure box, over its loops.
 *  Every aura loop is sampled at `n` points of its own cycle; at each, the union of the boxes the aura draws (with any
 *  visible opacity, its ancestors' included) is taken in screen px; the figure box is the board's `fig.box` (its top
 *  to its foot) mapped through the actors layer. Returns the widest union against the figure: width and height
 *  ratios (every box, and the floor drawings alone), whether it leaves the screen, and the px it lays over a HUD plate
 *  the figure does not. Fix 1 A1: the pieces shown (a piece's copies counted once, at 0.25 opacity or more, on
 *  screen) at each sample, their median, and each piece's unturned longest side at its median shown moment (the
 *  smallest of those). Whether a shown piece reads against what is behind it is the probe's own screenshot test. */
export function auraBoxes(L, n = 12) {
  const figs = [...L.figs.values()].filter((f) => !f.el.hidden && f.aura);
  const anims = [...Aura.running].filter((a) => a.aura && a.effect?.target?.isConnected);
  const was = anims.map((a) => [a.currentTime, a.playState]);
  for (const a of anims) a.pause();
  const opacityOf = (e, stop) => { let o = 1; for (let x = e; x && x !== stop; x = x.parentElement) o *= Number(getComputedStyle(x).opacity); return o; };
  const plates = [...document.querySelectorAll('.plate')].map((p) => p.getBoundingClientRect()).filter((r) => r.width > 0);
  const W = innerWidth, H = innerHeight;
  // (fix 2 A2) what no piece may cover: the console and its tab 8 px over their tops, the leaders' drawn boxes; the log
  // rail's left less 12 px is the stage's right for a piece
  const con = document.querySelector('#console')?.getBoundingClientRect(), tab = document.querySelector('.hud .ttab')?.getBoundingClientRect();
  const leads = [...document.querySelectorAll('.leader-sprite')].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
  const hud = [con, tab].filter((r) => r && r.width > 0).map((r) => ({ left: r.left, top: r.top - 8, right: r.right, bottom: r.bottom })).concat(leads);
  const blog = document.querySelector('.hud .blog'), br = blog?.getBoundingClientRect();
  const railX = br && br.width > 40 && getComputedStyle(blog).display !== 'none' && br.left > W / 2 ? br.left - 12 : W;
  const area = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const out = figs.map((f) => {
    const actors = f.el.parentNode, ar = actors.getBoundingClientRect(), k = ar.width / (actors.offsetWidth || ar.width);
    const hF = Math.max(f.box.h, f.foot.y - f.box.y);
    const fr = { x0: ar.left + f.box.x * k, y0: ar.top + f.box.y * k, x1: ar.left + (f.box.x + f.box.w) * k, y1: ar.top + (f.box.y + hF) * k };
    const mid = { x0: ar.left + (f.box.x + 0.2 * f.box.w) * k, y0: ar.top + (f.box.y + 0.2 * f.box.h) * k, x1: ar.left + (f.box.x + 0.8 * f.box.w) * k, y1: ar.top + (f.box.y + 0.8 * f.box.h) * k };
    return { f, fr, k, mid, u: { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }, uf: { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }, stop: actors.parentNode, plate: 0, counts: [], side: new Map(), outPx: 0, railPx: 0, hudPx: 0, foePx: 0, midHits: 0, midN: 0, stripGap: Infinity, ppPx: 0, leadPx: 0 };
  });
  // (fix 2 critic: each figure's middle 60% on screen, which the other figure's pieces may not cover)
  const mids = out.map((o) => ({ f: o.f, r: { left: o.mid.x0, top: o.mid.y0, right: o.mid.x1, bottom: o.mid.y1 } }));
  const grow = (u, r) => { u.x0 = Math.min(u.x0, r.left); u.y0 = Math.min(u.y0, r.top); u.x1 = Math.max(u.x1, r.right); u.y1 = Math.max(u.y1, r.bottom); };
  for (let i = 0; i < n; i++) {
    anims.forEach((a, j) => { const d = a.effect.getTiming().duration; if (Number.isFinite(d)) a.currentTime = (was[j][0] ?? 0) + (d * i) / n; });
    for (const o of out) {
      const seen = new Set();
      for (const e of o.f.aura.els()) {
        const r = e.getBoundingClientRect(), op = opacityOf(e, o.stop);
        if (r.width < 0.5 || r.height < 0.5 || op < 0.03) continue;
        grow(o.u, r);
        const piece = e.matches('.au-p, .au-f');
        if (!piece) grow(o.uf, r);
        // a piece shown: a copy at 0.25 or more, on screen; its longest side unturned (its box times its own scale,
        // in screen px; a floor piece by its drawn box), every shown sample kept, the median read (fix pass 2)
        if (piece && op >= 0.25 && r.right > 0 && r.bottom > 0 && r.left < W && r.top < H) {
          const key = e.dataset.k ?? e;
          seen.add(key);
          let side = Math.max(r.width, r.height);
          if (e.matches('.au-p')) { const m = new DOMMatrix(getComputedStyle(e).transform); side = Math.max(e.offsetWidth * Math.hypot(m.a, m.b), e.offsetHeight * Math.hypot(m.c, m.d)) * o.k; }
          if (!o.side.has(key)) o.side.set(key, []);
          o.side.get(key).push(side);
        }
        // (fix 2 A2) a piece shown: inside the stage and the rail, off the console and the leaders, and a front copy's
        // centre off the middle 60% of its figure's drawn box
        if (piece && op >= 0.03) {
          o.outPx = Math.max(o.outPx, -r.left, -r.top, r.right - W, r.bottom - H);
          o.railPx = Math.max(o.railPx, r.right - railX);
          for (const m of mids) { if (m.f === o.f) continue; const a = area(r, m.r); if (a > o.foePx) { o.foePx = a; o.foeWhy = { p: e.dataset.p, k: e.dataset.k, at: i, r: [r.left, r.top, r.right, r.bottom].map(Math.round), op: +op.toFixed(2) }; } }
          hud.forEach((q, j) => { const a = area(r, q); if (a > o.hudPx) { o.hudPx = a; o.hudWhy = { p: e.dataset.p, k: e.dataset.k, at: i, rect: j, r: [r.left, r.top, r.right, r.bottom].map(Math.round), q: [q.left, q.top, q.right, q.bottom].map(Math.round), op: +op.toFixed(2) }; } });
          // (fix 3 A5: a piece over a leader's drawn box, the leader's own rect)
          for (const q of leads) { const a = area(r, q); if (a > o.leadPx) { o.leadPx = a; o.leadWhy = { p: e.dataset.p, k: e.dataset.k, at: i, r: [r.left, r.top, r.right, r.bottom].map(Math.round), q: [q.left, q.top, q.right, q.bottom].map(Math.round) }; } }
          // (a front pass: every front copy shown at 0.25 or more, a phone's one copy included: fix 2 critic; a level's
          // attached part stands on the box by design, fix 3 A2)
          if (e.closest('.aura-front') && op >= 0.25 && !e.matches('.au-att')) { const cx = r.left + r.width / 2, cy = r.top + r.height / 2; o.midN++; if (cx > o.mid.x0 && cx < o.mid.x1 && cy > o.mid.y0 && cy < o.mid.y1) o.midHits++; }
        }
        // each drawn box over a plate the figure itself is clear of (the largest such overlap seen)
        for (const pr of plates) {
          if (Math.min(o.fr.x1, pr.right) > Math.max(o.fr.x0, pr.left) && Math.min(o.fr.y1, pr.bottom) > Math.max(o.fr.y0, pr.top)) continue;
          o.plate = Math.max(o.plate, Math.max(0, Math.min(r.right, pr.right) - Math.max(r.left, pr.left)) * Math.max(0, Math.min(r.bottom, pr.bottom) - Math.max(r.top, pr.top)));
        }
      }
      o.counts.push(seen.size);
      // (fix 3 A5: piece over piece of one figure: any two shown orbiting pieces, different keys, at 0.25 or more; a
      // level's attached part and the floor drawings are not orbiting pieces)
      {
        const rs = [...new Map(o.f.aura.els().filter((e) => e.matches('.au-p:not(.au-att)') && opacityOf(e, o.stop) >= 0.25).map((e) => [e.dataset.k, [e.getBoundingClientRect(), e.dataset.p]])).entries()];
        for (let a = 0; a < rs.length; a++) for (let b = a + 1; b < rs.length; b++) { const [ka, [A, pa]] = rs[a], [kb, [Bq, pb]] = rs[b], v = area(A, Bq); if (v > o.ppPx) { o.ppPx = v; o.ppWhy = { at: i, A: [ka, pa, ...[A.left, A.top, A.right, A.bottom].map(Math.round)], B: [kb, pb, ...[Bq.left, Bq.top, Bq.right, Bq.bottom].map(Math.round)] }; } }
      }
      // (Local Search's strips: the least gap between two shown, any two copies of different strips)
      if (o.f.id === 'local-search') {
        const rs = [...new Map(o.f.aura.els().filter((e) => e.matches('.au-p') && opacityOf(e, o.stop) >= 0.25).map((e) => [e.dataset.k, e.getBoundingClientRect()])).values()];
        for (let a = 0; a < rs.length; a++) for (let b = a + 1; b < rs.length; b++) { const A = rs[a], Bq = rs[b], gp = Math.max(Bq.left - A.right, A.left - Bq.right, Bq.top - A.bottom, A.top - Bq.bottom); if (gp < o.stripGap) { o.stripGap = gp; o.stripWhy = { at: i, A: [A.left, A.top, A.right, A.bottom].map(Math.round), B: [Bq.left, Bq.top, Bq.right, Bq.bottom].map(Math.round) }; } }
      }
    }
  }
  anims.forEach((a, i) => { if (was[i][0] !== null) a.currentTime = was[i][0]; if (was[i][1] === 'running') a.play(); });
  return out.map(({ f, fr, u, uf, plate, counts, side, outPx, railPx, hudPx, hudWhy, foePx, foeWhy, midHits, midN, stripGap, stripWhy, ppPx, ppWhy, leadPx, leadWhy }) => {
    const any = Number.isFinite(u.x0), x0 = Math.min(u.x0, fr.x0), x1 = Math.max(u.x1, fr.x1), y0 = Math.min(u.y0, fr.y0), y1 = Math.max(u.y1, fr.y1);
    const anyF = Number.isFinite(uf.x0);
    const c = [...counts].sort((a, b) => a - b), sides = [...side.values()].map((v) => v.sort((a, b) => a - b)[Math.floor((v.length - 1) / 2)]);
    return {
      id: f.id, side: f.side, any,
      rw: any ? (x1 - x0) / (fr.x1 - fr.x0) : 0, rh: any ? (y1 - y0) / (fr.y1 - fr.y0) : 0,
      frw: anyF ? (Math.max(uf.x1, fr.x1) - Math.min(uf.x0, fr.x0)) / (fr.x1 - fr.x0) : 0, frh: anyF ? (Math.max(uf.y1, fr.y1) - Math.min(uf.y0, fr.y0)) / (fr.y1 - fr.y0) : 0,
      out: any && (u.x0 < -0.5 || u.y0 < -0.5 || u.x1 > W + 0.5 || u.y1 > H + 0.5),
      plate: Math.round(plate),
      pieces: c.length ? c[Math.floor((c.length - 1) / 2)] : 0, piecesMin: c[0] ?? 0, smallest: sides.length ? Math.round(Math.min(...sides)) : 0, largest: sides.length ? Math.round(Math.max(...sides)) : 0,
      aura: any ? [u.x0, u.y0, u.x1, u.y1] : [], fig: [fr.x0, fr.y0, fr.x1, fr.y1],
      outPx: Math.round(Math.max(0, outPx)), railPx: Math.round(Math.max(0, railPx)), hudPx: Math.round(hudPx), hudWhy: hudWhy ?? null, foePx: Math.round(foePx), foeWhy: foeWhy ?? null, midHits, midN,
      stripGap: Number.isFinite(stripGap) ? Math.round(stripGap) : null, stripWhy: stripWhy ?? null,
      ppPx: Math.round(ppPx), ppWhy: ppWhy ?? null, leadPx: Math.round(leadPx), leadWhy: leadWhy ?? null,
      solids: f.aura.solids?.().map((e) => `${e.dataset.solid}:${e.dataset.p ?? e.getAttribute('class') ?? e.tagName}`) ?? [],
      white: f.aura.els().concat(f.aura.trails?.() ?? []).flatMap((e) => [...e.querySelectorAll('path,rect,circle,ellipse,polygon,polyline')]).filter((e) => /^(rgb\(255, 255, 255\)|#fff(fff)?|white)$/i.test(getComputedStyle(e).fill.trim()) && getComputedStyle(e).fillOpacity !== '0').length,
      kinds: [...new Set(f.aura.els().map((e) => e.dataset.p).filter(Boolean))],
      trails: f.aura.trails?.().length ?? 0,
    };
  });
}
