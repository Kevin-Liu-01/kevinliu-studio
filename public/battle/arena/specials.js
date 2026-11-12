// Per-card board specials for the Arena (ROUND6.md sections 4.1 and 4.4): what a card's attack does on the field
// itself at its contact, made of the card's own pieces (arena/exfx.js), never a generic spark or glow (Kevin, 11-02:
// "too much of the fake fireworks"). All eighteen fielded cards have one, and Princeton TD fires the tower it stands as
// the game draws that tower's shot. The most specific definition wins (card and move, then card), as the cutscene
// registry does.
//
// Called at the board cue (impact - 130) or a cut's contact; each flight lands at the impact (`c.impactIn`, 130 by
// default; a longer flight starts at the charge when the board calls it earlier). Everything draws in board px, moves
// with the camera, and writes transform, opacity or an SVG stroke offset only. Delays run as Web Animations through
// the board's motion registry (`c.anim`), never timers, so a skip finishes them and a hold pauses them. A stroke aimed
// at the far figure goes in the layer behind the near one (`c.layerFor`); what lands on a figure goes in front.
// Every beat adds no luminance flash: thin strokes, small pieces, opacity ramps.
import { registry, rnd, NS } from '../shared/fx.js';
import { unproject, ppm, matrix3d, mul3 } from './ground.js';
import { piecesNow, piecesOf, pieceNode, hueOf, adoptStyles } from './exfx.js';

export const specials = registry();
/** Each definition's `lead`: how long its flight is, so a board that calls it `lead` ms before the impact (passing
 *  `impactIn`) lands it exactly there; called at the board cue (impact - 130) it lands at the impact or as near as 110
 *  ms of travel allows. */
const defineSpecial = (d) => specials.define({ ...d, play: (c) => { thNow = c.g?.th ?? thNow; return d.play(c); } });
const F = (n) => +Number(n).toFixed(1);
const S = 100; // floor px a metre (arena/board.js floorBox)
const OUT = 'cubic-bezier(.2,.8,.2,1)', IN = 'cubic-bezier(.5,0,.75,0)', ARC = 'cubic-bezier(.3,.6,.4,1)';

adoptStyles(`
.sp-p, .sp-f { position: absolute; left: 0; top: 0; pointer-events: none; will-change: transform, opacity; }
.sp-p { transform-origin: 50% 50%; } .sp-f { transform-origin: 0 0; }
.sp-p > svg, .sp-p > img, .sp-f > svg, .sp-f > img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
.sp-f > svg { transform-origin: 50% 50%; }
.sp-f > svg.sp-floor { overflow: visible; transform-origin: 0 0; }
`);
// the pieces a special flies are cut while the auras set up; ask early so the first attack has them
const warm = (id) => { piecesOf(id); return piecesNow(id); };

// ---------------------------------------------------------------- the shared kit
/** The layers for a stroke aimed at `to`: behind the near figure when the target stands farther, else in front. */
const layersFor = (c, to) => {
  const l = c.layerFor?.(to);
  if (l?.layer || l?.svg) return { layer: l.layer ?? c.layer, svg: l.svg ?? c.svg };
  return { layer: c.layer, svg: c.svg };
};
const front = (c) => ({ layer: c.layer, svg: c.svg });
/** The beat's clock: `flight` ms of travel landing at the impact (or as early as the call allows). */
const clock = (c, natural) => {
  const until = c.impactIn ?? 130;
  const flight = until >= natural ? natural : Math.max(110, until);
  return { delay: Math.max(0, until - flight), flight, I: until };
};
/** Run `f` after `ms` on the board's motion clock (skip finishes it, hold pauses it). */
function after(c, host, ms, f) {
  if (ms <= 0) { f(); return Promise.resolve(); }
  const a = c.anim(host, [{ opacity: 1 }, { opacity: 1 }], { duration: ms });
  return a.finished.catch(() => {}).then(f);
}
const done = (jobs) => Promise.all(jobs.map((a) => a?.finished?.catch(() => {}) ?? a));
const group = (svg) => { const g = document.createElementNS(NS, 'g'); svg.append(g); return g; };
function node(tag, parent, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, typeof v === 'number' ? String(F(v)) : v);
  parent.append(e);
  return e;
}
/** A stroke drawn along its own length (pathLength 1), `0 -> 1` over the flight. */
function stroke(c, G, d, attrs, { delay = 0, ms = 200, easing = OUT, tail = false } = {}) {
  const p = node('path', G, { d, pathLength: 1, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': tail ? '0.28 2' : '1 1', ...attrs });
  p.style.strokeDashoffset = tail ? '0.28' : '1';
  return c.anim(p, tail ? [{ strokeDashoffset: 0.28 }, { strokeDashoffset: -1 }] : [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: ms, delay, easing, fill: 'both' });
}
/** The figure's centre and points on it, board px. */
const mid = (b, fy = 0.5) => ({ x: b.x + b.w / 2, y: b.y + b.h * fy });
/** Where a stroke lands: on the target's body, or past it on the floor for a miss. */
const landOf = (c, fy = 0.5, i = 0) => {
  const t = c.to;
  if (!c.miss) return { x: t.x + t.w * (0.5 + (rnd(c.seed, i + 11) - 0.5) * 0.3), y: t.y + t.h * (fy + (rnd(c.seed, i + 13) - 0.5) * 0.18) };
  const s = rnd(c.seed, i + 9) < 0.5 ? -1 : 1;
  return { x: t.foot.x + s * c.g.tw * (0.8 + 0.4 * rnd(c.seed, i + 3)), y: t.foot.y + c.g.th * (0.6 + 0.3 * rnd(c.seed, i + 4)) };
};
/** A quadratic arc from a to b, apex `lift` px over their midpoint. */
const arcD = (a, b, lift) => `M${F(a.x)} ${F(a.y)}Q${F((a.x + b.x) / 2)} ${F(Math.min(a.y, b.y) - lift)} ${F(b.x)} ${F(b.y)}`;
const qAt = (a, b, lift, t) => { const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - lift, u = 1 - t; return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y }; };
/** A card's piece, flown as its own box in a layer: keyframes give its centre, scale, rotation, opacity. */
function fly(c, layer, p, size, frames, opts) {
  const b = document.createElement('div');
  b.className = 'sp-p';
  const w = p.w * size, h = p.h * size;
  b.style.width = `${F(w)}px`; b.style.height = `${F(h)}px`;
  b.append(pieceNode(p));
  layer.append(b);
  const kf = frames.map((f) => ({ ...(f.offset !== undefined ? { offset: f.offset } : {}), opacity: f.o ?? 1, transform: `translate3d(${F(f.x - w / 2)}px,${F(f.y - h / 2)}px,0) rotate(${F(f.r ?? 0)}deg) scale(${(f.sx ?? f.s ?? 1).toFixed(3)},${(f.s ?? 1).toFixed(3)})` }));
  const a = c.anim(b, kf, { fill: 'both', ...opts });
  a.finished.catch(() => {}).then(() => b.remove());
  return a;
}
/** Px per card unit for pieces flown from figure `b` (1000 units = the figure's mean box side, times `u`). */
let thNow = 40;
const unitOf = (b, u = 1) => (Math.max(Math.sqrt(b.w * b.h), thNow * 4.5) / 1000) * u * 1.5;
/** A box lying on the floor at board point `at`, `wM` by `dM` metres, turned `rot` degrees: a floor mark's frame. */
function floorAt(c, host, at, wM, dM, rot = 0) {
  const g = c.g, p = unproject(g.P, at.x, at.y);
  if (!(p.Z > 0) || !g.Hf) return null;
  const e = document.createElement('div');
  e.className = 'sp-f';
  e.style.width = `${F(wM * S)}px`; e.style.height = `${F(dM * S)}px`;
  const r = (rot * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r);
  // own px -> floor metres about the box's centre, turned on the floor, then the floor's homography
  const A = [[cs / S, sn / S, p.X - (cs * wM + sn * dM) / 2], [sn / S, -cs / S, p.Z - (sn * wM - cs * dM) / 2], [0, 0, 1]];
  e.style.transform = matrix3d(mul3(g.Hf, A));
  host.append(e);
  return { el: e, X: p.X, Z: p.Z, k: ppm(g.P, p.X, p.Z) };
}
/** The floor layer for marks under the figures: the back layer when the board has one. */
const floorHost = (c) => c.fxBack?.layer ?? c.layer;
/** A floor mark at board point `at` nearer the camera than both figures' feet lies in front (nothing stands on it to
 *  hide it); one farther lies in the back layer, under the figures. */
const floorLayerAt = (c, at) => (at.y > Math.max(c.from.foot.y, c.to.foot.y) + 2 ? c.layer : floorHost(c));
/** A floor mark's side in metres that reads on screen: at least `frac` of the frame's width (the camera's grazing
 *  floor shrinks a mark the far side of the arena), and never under `minM`. */
const readM = (c, at, frac, minM) => {
  const p = unproject(c.g.P, at.x, at.y);
  if (!(p.Z > 0)) return minM;
  return Math.max(minM, (frac * (c.g.W ?? innerWidth)) / Math.max(1, ppm(c.g.P, p.X, p.Z)));
};
/** Whether a board point lies inside a figure's box (a floor mark there would be hidden by its body). */
const inside = (b, at, pad = 0) => at.x > b.x - pad && at.x < b.x + b.w + pad && at.y > b.y - pad && at.y < b.foot.y - 2;
const lend = (c, ms) => c.me?.aura?.lend?.(ms);
const towardFoe = (c) => (c.to.foot.x > c.from.foot.x ? 1 : -1);
/** The figure's own effect anchor (manifest `fx.anchor`, view px), as a board point; else a share of its box. */
function anchorOf(c, fx = 0.82, fy = 0.42) {
  const m = typeof c.muzzle === 'function' ? c.muzzle() : c.muzzle;
  if (m && Number.isFinite(m.x)) return m;
  const f = c.from, d = towardFoe(c);
  return { x: f.x + f.w / 2 + d * f.w * (fx - 0.5), y: f.y + f.h * fy };
}

// ---------------------------------------------------------------- Turboslide: one slide dealt onto the foe's pad
defineSpecial({
  card: 'turboslide', lead: 220,
  play(c) {
    const ps = warm('turboslide'), p = ps?.[0];
    if (!p) return null;
    // in front: the slide lands on the near half of the foe's pad, where the figure does not hide it
    const { delay, flight } = clock(c, 220), L = front(c);
    const U = unitOf(c.from, 1.3), a = mid(c.from, 0.45);
    const t = c.miss ? landOf(c) : { x: c.to.foot.x - towardFoe(c) * c.g.tw * 0.15, y: c.to.foot.y + c.g.th * 0.32 };
    lend(c, flight + delay + 160);
    // it spins once in the air and lands flat on the pad, foreshortened by the floor
    return fly(c, L.layer, p, U, [
      { x: a.x, y: a.y, s: 1, r: -10, o: 0 },
      { x: a.x, y: a.y - c.g.th * 0.3, s: 1.05, r: -14, o: 1, offset: 0.12 },
      { x: (a.x + t.x) / 2, y: Math.min(a.y, t.y) - c.g.th * 1.1, s: 0.95, sx: 0.2, r: 160, offset: 0.4 },
      { x: t.x, y: t.y, s: 0.9, sx: 1.15, r: 360 - 6 * towardFoe(c), offset: 0.6 },
      { x: t.x, y: t.y, s: 0.38, sx: 1.25, r: 354, offset: 0.66 },
      { x: t.x, y: t.y, s: 0.38, sx: 1.25, r: 354, offset: 0.86 },
      { x: t.x, y: t.y + 2, s: 0.36, sx: 1.25, r: 354, o: 0 },
    ], { duration: (flight / 0.6), delay, easing: 'linear' });
  },
});

// ---------------------------------------------------------------- Glyphfield: letters line up and stream to the foe
defineSpecial({
  card: 'glyphfield', lead: 260,
  play(c) {
    const ps = warm('glyphfield');
    if (!ps?.length) return null;
    const { delay, flight } = clock(c, 260), L = layersFor(c, c.to), U = unitOf(c.from, 2.4);
    const a = mid(c.from, 0.35), d = towardFoe(c), n = Math.min(6, ps.length);
    lend(c, delay + flight + 200);
    const jobs = [];
    for (let i = 0; i < n; i++) {
      const p = ps[i % ps.length];
      const start = { x: a.x + (rnd(c.seed, i) - 0.5) * c.from.w * 0.9, y: c.from.y + c.from.h * (0.15 + 0.7 * rnd(c.seed, i + 3)) };
      const line = { x: a.x + d * (i - n / 2) * p.w * U * 0.45, y: a.y - c.g.th * 0.2 };
      const t = landOf(c, 0.45, i);
      jobs.push(fly(c, L.layer, p, U, [
        { x: start.x, y: start.y, s: 0.8, o: 0 },
        { x: line.x, y: line.y, s: 0.9, o: 1, offset: 0.35 },
        { x: t.x, y: t.y, s: 0.55, o: 1, offset: 0.92 },
        { x: t.x, y: t.y, s: 0.4, o: 0 },
      ], { duration: flight + 60, delay: delay + i * 30 - 30 * (n - 1), easing: 'cubic-bezier(.55,0,.35,1)' }));
    }
    return done(jobs);
  },
});

// ---------------------------------------------------------------- Jarhead: the blob hops; its capture corners lock on
// (fix 3 A3: the hop's flight is the shot's: where the shot's post leaves less than its 860 ms, the flight home is cut to
// end inside it, `carries` re-read by the board after the call; and the figure it carries holds `carrying`, a promise
// that resolves as it lands, and `land()`, which snaps it home at once, for the next shot's first frame)
const JH = defineSpecial({
  card: 'jarhead',
  // the hop is the figure itself: it leaves its pad as the blob sets off and stands again as the blob lands home
  // (arena/board.js special), so one Jarhead is ever in frame; 860 ms, inside a short scene
  carries: { back: 0.92, ms: 860 },
  play(c) {
    const { layer, from, to, miss, anim, subject, g } = c;
    const jobs = [];
    // the four corners leave its own frame at the cue and close on the target's box at the impact (the lock)
    const ps = warm('jarhead');
    if (ps?.length >= 4 && !miss) {
      const { flight } = clock(c, 130);
      // (its own corners, shown through the act, are these: the aura hides while they fly)
      lend(c, flight + 260);
      const leg = Math.min(to.w, to.h) * 0.24, pad = leg * 0.25;
      const fromC = [[from.x, from.y], [from.x + from.w, from.y], [from.x, from.y + from.h], [from.x + from.w, from.y + from.h]];
      const toC = [[to.x - pad, to.y - pad], [to.x + to.w + pad, to.y - pad], [to.x - pad, to.y + to.h + pad], [to.x + to.w + pad, to.y + to.h + pad]];
      for (let i = 0; i < 4; i++) {
        // (fix 3 A6: the print's fourth piece is its lower-right corner merged with the system arrow and its click
        // marks; the fourth bracket is the first, the upper-left one, turned half round, so all four match)
        const p = i === 3 ? ps[0] : ps[i], turn = i === 3 ? 180 : 0, s = leg / p.w, [ax, ay] = fromC[i], [bx, by] = toC[i];
        const ix = i % 2 ? -1 : 1, iy = i < 2 ? 1 : -1;
        jobs.push(fly(c, layer, p, s, [
          { x: ax + (ix * leg) / 2, y: ay + (iy * leg) / 2, s: 0.7, r: turn, o: 0 },
          { x: bx + (ix * leg) / 2 - ix * leg * 0.3, y: by + (iy * leg) / 2 - iy * leg * 0.3, s: 1.15, r: turn, o: 1, offset: 0.7 },
          { x: bx + (ix * leg) / 2, y: by + (iy * leg) / 2, s: 1, r: turn, o: 1, offset: 0.82 },
          { x: bx + (ix * leg) / 2, y: by + (iy * leg) / 2, s: 1, r: turn, o: 0 },
        ], { duration: flight + 260, easing: OUT }));
      }
    }
    if (!subject) return done(jobs);
    // half the figure's size in flight; at both ends it is the figure itself (full size, standing where it stands), so
    // the hand-off between the picture and the flier changes nothing on screen
    const w = Math.max(32, from.w * (g.phone ? 0.34 : 0.5)), h = w * (from.h / Math.max(1, from.w)), F2 = from.w / w;
    // one hop at a time: a repeat that comes before the last hop has landed takes its place
    for (const x of layer.querySelectorAll(':scope > .jh-blob, :scope > .jh-shade')) x.remove();
    const blob = document.createElement('img'); blob.className = 'jh-blob'; layer.append(blob);
    blob.alt = ''; blob.decoding = 'async'; blob.src = subject;
    // the painting's light on its side, as on the figure, so the hand-off between them changes nothing
    if (document.getElementById(`ag-${c.side}`)) blob.style.filter = `url(#ag-${c.side})`;
    const shade = document.createElement('i'); shade.className = 'jh-shade'; layer.append(shade);
    blob.style.width = `${w}px`; blob.style.height = `${h}px`;
    shade.style.width = `${w * 0.8}px`; shade.style.height = `${w * 0.3}px`;
    const at = (x, y, sx = 1, sy = 1) => `translate3d(${F(x - w / 2)}px,${F(y - h)}px,0) scale(${sx},${sy})`;
    const sh = (x, y, s = 1, o = 1) => ({ transform: `translate3d(${F(x - w * 0.4)}px,${F(y - w * 0.15)}px,0) scale(${s})`, opacity: o });
    const home = { x: from.foot.x, y: from.foot.y - from.h * 0.15 }, stand = { x: from.x + from.w / 2, y: from.y + from.h };
    const landFloor = miss ? { x: to.foot.x + (to.side === 'rival' ? 1 : -1) * g.tw * 0.9, y: to.foot.y + g.th * 0.9 } : { x: to.foot.x, y: to.foot.y };
    const land = miss ? landFloor : { x: to.foot.x, y: to.y + to.h * 0.25 };
    const md = { x: (home.x + landFloor.x) / 2, y: (from.foot.y + landFloor.y) / 2 };
    const apex1 = { x: (home.x + md.x) / 2, y: Math.min(home.y, md.y) - g.th * 3.0 };
    const apex2 = { x: (md.x + land.x) / 2, y: Math.min(md.y, land.y) - g.th * 2.4 };
    const back = { x: (land.x + home.x) / 2, y: Math.min(land.y, home.y) - g.th * 4.0 };
    // (fix 3 A3: the flight out keeps its 860 ms timing to the touch-down at 0.53; the flight home is cut to end inside
    // the shot, its post after the impact plus the lead from the call, never under 220 ms; the board reads `carries`
    // after this call, so the figure stands again the frame the blob lands)
    const N = 860, OUT0 = 0.53, BACK0 = 0.92;
    const post = Number.isFinite(c.shot?.compiled?.duration) && Number.isFinite(c.shot?.compiled?.impact) ? c.shot.compiled.duration - c.shot.compiled.impact + (c.impactIn ?? 130) + (c.shot.postMs ?? 0) : Infinity;
    const backMs = Math.max(220, Math.min((BACK0 - OUT0) * N, post - OUT0 * N - 20));
    const ms = Math.round(OUT0 * N + backMs / (BACK0 - OUT0) * (1 - BACK0) + backMs), u = (o) => (o <= OUT0 ? (o * N) / ms : (OUT0 * N + ((o - OUT0) / (BACK0 - OUT0)) * backMs) / ms);
    JH.carries = { back: +u(BACK0).toFixed(4), ms };
    jobs.push(anim(blob, [
      { transform: at(stand.x, stand.y, F2, F2), opacity: 1 },
      { transform: at(stand.x, stand.y, F2 * 1.06, F2 * 0.84), opacity: 1, offset: 0.04 },
      { transform: at((stand.x + apex1.x) / 2, (stand.y + apex1.y) / 2, (F2 + 0.9) / 2, (F2 + 1.12) / 2), offset: 0.1 },
      { transform: at(apex1.x, apex1.y, 0.9, 1.12), offset: 0.17 },
      { transform: at(md.x, md.y, 1.3, 0.66), offset: 0.26 },
      { transform: at(apex2.x, apex2.y, 0.92, 1.1), offset: 0.36 },
      { transform: at(land.x, land.y, 1.42, 0.58), offset: 0.46 },
      { transform: at(land.x, land.y, 0.9, 1.14), offset: 0.53 },
      { transform: at(back.x, back.y, 1, 1), offset: u(0.64) },
      { transform: at((back.x + stand.x) / 2, (back.y + stand.y) / 2, 0.65 + 0.35 * F2, 0.65 + 0.35 * F2), offset: u(0.77) },
      { transform: at(stand.x, stand.y, F2 * 1.04, F2 * 0.9), opacity: 1, offset: u(0.88) },
      { transform: at(stand.x, stand.y, F2, F2), opacity: 1, offset: u(0.92) },
      { transform: at(stand.x, stand.y, F2, F2), opacity: 0, offset: u(0.921) },
      { transform: at(stand.x, stand.y, F2, F2), opacity: 0 },
    ], { duration: ms, easing: 'linear', fill: 'both' }));
    const fy = (x) => from.foot.y + (landFloor.y - from.foot.y) * ((x - from.foot.x) / ((landFloor.x - from.foot.x) || 1));
    jobs.push(anim(shade, [
      sh(home.x, from.foot.y, 0.8, 0),
      { ...sh(home.x, from.foot.y, 1, 0.9), offset: 0.06 },
      { ...sh(apex1.x, fy(apex1.x), 0.55, 0.5), offset: 0.16 },
      { ...sh(md.x, fy(md.x), 1.1, 0.9), offset: 0.26 },
      { ...sh(apex2.x, fy(apex2.x), 0.6, 0.5), offset: 0.36 },
      { ...sh(landFloor.x, landFloor.y, 1, 0.9), offset: 0.46 },
      { ...sh(landFloor.x, landFloor.y, 1, 0.9), offset: 0.53 },
      { ...sh((landFloor.x + home.x) / 2, (landFloor.y + from.foot.y) / 2, 0.45, 0.4), offset: u(0.64) },
      { ...sh(home.x, from.foot.y, 1, 0.9), offset: u(0.92) },
      sh(home.x, from.foot.y, 0.6, 0),
    ], { duration: ms, easing: 'linear', fill: 'both' }));
    if (!miss) after(c, shade, N * 0.46, () => c.shake(0.007, 200));
    const flying = jobs.slice(-2), fig = c.me;
    const landed = done(jobs).then(() => { blob.remove(); shade.remove(); if (fig?.carrying === landed) { fig.carrying = null; fig.land = null; } });
    if (fig) {
      fig.carrying = landed;
      // (the flight finished at once: the blob gone, the figure standing on its pad again)
      fig.land = () => { for (const a of [...flying, ...(fig.carry ?? [])]) { try { a.finish(); } catch { /* gone */ } } blob.remove(); shade.remove(); };
    }
    return landed;
  },
});

// ---------------------------------------------------------------- Katagami: a curve constructed; its counters snap on
function construct(c, weight = false) {
  const { svg, from, to, miss, anim, seed, g } = c;
  const G = group(svg);
  G.setAttribute('class', 'kg');
  const p0 = { x: from.foot.x, y: from.foot.y + g.th * 0.5 };
  const p3 = miss ? { x: to.foot.x + (to.side === 'rival' ? 1 : -1) * g.tw, y: to.foot.y + g.th * 0.8 } : { x: to.foot.x, y: to.y + to.h * 0.45 };
  const dx = p3.x - p0.x, dy = p3.y - p0.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const bend = len * (0.34 + rnd(seed, 1) * 0.18) * (rnd(seed, 2) < 0.5 ? -1 : 1);
  const p1 = { x: p0.x + dx * 0.28 + nx * bend, y: p0.y + dy * 0.28 + ny * bend };
  const p2 = { x: p0.x + dx * 0.74 - nx * bend * 0.7, y: p0.y + dy * 0.74 - ny * bend * 0.7 };
  const d = `M${F(p0.x)} ${F(p0.y)} C${F(p1.x)} ${F(p1.y)} ${F(p2.x)} ${F(p2.y)} ${F(p3.x)} ${F(p3.y)}`;
  const jobs = [];
  for (const [a, b] of [[p0, p1], [p3, p2]]) jobs.push(stroke(c, G, `M${F(a.x)} ${F(a.y)} L${F(b.x)} ${F(b.y)}`, { class: 'kg-handle' }, { delay: 80, ms: 180, easing: 'ease-out' }));
  const w0 = weight ? 1.5 : 4, w1 = weight ? (g.phone ? 9 : 14) : 4;
  // the curve draws at its start weight; a weighted cut (`weight`) gains its full weight as a second stroke drawn with
  // it and faded in (stroke offset and opacity only, never an animated width)
  for (const cls of ['kg-under', 'kg-curve']) {
    const extra = cls === 'kg-under' ? 6 : 0;
    for (const [wd, grow] of weight ? [[w0, false], [w1, true]] : [[w0, false]]) {
      const p = node('path', G, { d, class: cls, pathLength: 1, 'stroke-dasharray': '1 1' });
      p.style.strokeDashoffset = '1';
      p.style.strokeWidth = `${wd + extra}px`;
      jobs.push(anim(p, grow ? [{ strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 0, opacity: 1 }] : [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 340, delay: 160, easing: 'cubic-bezier(.3,.6,.2,1)', fill: 'both' }));
    }
  }
  [p0, p1, p2, p3].forEach((p, i) => {
    const s = (i === 0 || i === 3 ? 10 : 8) * (g.phone ? 0.75 : 1);
    const r = node('rect', G, { x: p.x - s / 2, y: p.y - s / 2, width: s, height: s, class: i === 0 || i === 3 ? 'kg-anchor' : 'kg-ctl' });
    r.style.transformBox = 'fill-box'; r.style.transformOrigin = '50% 50%';
    jobs.push(anim(r, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.7)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 200, delay: 30 + i * 60, easing: 'ease-out', fill: 'both' }));
  });
  // the card's cut counters fly in and snap onto the two control points as the handles draw
  const ps = warm('katagami');
  if (ps?.length) {
    const U = unitOf(from, 1.1), a = mid(from, 0.3);
    [p1, p2].forEach((p, i) => {
      const pc = ps[i % ps.length];
      jobs.push(fly(c, c.layer, pc, U, [
        { x: a.x, y: a.y, s: 0.6, r: -20, o: 0 },
        { x: p.x, y: p.y, s: 1.35, r: 8, o: 1, offset: 0.55 },
        { x: p.x, y: p.y, s: 0.9, r: 0, offset: 0.7 },
        { x: p.x, y: p.y, s: 0.9, r: 0, offset: 0.9 },
        { x: p.x, y: p.y, s: 0.8, o: 0 },
      ], { duration: 560, delay: 40 + i * 60, easing: OUT }));
    });
    lend(c, 600);
  }
  if (!miss) after(c, G, 480, () => c.shake(0.005, 200));
  return done(jobs).then(() => done([anim(G, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, delay: 420, fill: 'both' })])).then(() => G.remove());
}
defineSpecial({ card: 'katagami', lead: 130, play: (c) => construct(c, false) });
defineSpecial({ card: 'katagami', move: 'weight-axis', play: (c) => construct(c, true) });

// ---------------------------------------------------------------- Claude of Tanks: tracers from the muzzle, dirt off the tracks
function volley(c, perHit = 4, column = false) {
  const { from, to, hits, miss, seed, g } = c;
  const L = layersFor(c, to);
  const G = group(L.svg);
  const n = Math.min(14, perHit + Math.max(1, hits) * (column ? 3 : 1));
  const m = anchorOf(c, 0.82, 0.42);
  const { delay, flight } = clock(c, 240);
  const jobs = [];
  // the card's tracer: an amber halo, a gold body and a cream core, as the ex card prints it
  const bursts = Math.min(3, Math.ceil(n / 4));
  for (let i = 0; i < n; i++) {
    let tx, ty;
    if (miss) {
      const side = rnd(seed, i + 9) < 0.5 ? -1 : 1;
      tx = to.foot.x + side * g.tw * (0.7 + rnd(seed, i + 3) * 0.6); ty = to.foot.y + side * g.th * (0.7 + rnd(seed, i + 3) * 0.6);
    } else if (column) {
      const k = i / Math.max(1, n - 1);
      tx = from.foot.x + (to.foot.x - from.foot.x) * (0.55 + 0.45 * k) + (rnd(seed, i) - 0.5) * g.tw * 0.4;
      ty = (from.foot.y + (to.foot.y - from.foot.y) * (0.55 + 0.45 * k)) - (k > 0.7 ? to.h * 0.4 * rnd(seed, i + 5) : 0);
    } else {
      tx = to.foot.x + (rnd(seed, i + 5) - 0.5) * to.w * 0.6; ty = to.y + to.h * (0.3 + rnd(seed, i + 7) * 0.5);
    }
    const x0 = m.x + (rnd(seed, i) - 0.5) * 6, y0 = m.y + (rnd(seed, i + 1) - 0.5) * 4;
    const d = `M${F(x0)} ${F(y0)} L${F(tx)} ${F(ty)}`;
    const burst = Math.floor((i / n) * bursts);
    const at = delay + burst * 70 + (i % 4) * 22 - (bursts - 1) * 70;
    jobs.push(stroke(c, G, d, { stroke: '#ff9a2e', 'stroke-width': g.phone ? 6 : 8, opacity: 0.32 }, { delay: Math.max(0, at), ms: flight, easing: 'cubic-bezier(.4,0,.9,.7)', tail: true }));
    jobs.push(stroke(c, G, d, { stroke: '#ffc861', 'stroke-width': g.phone ? 2.4 : 3.2 }, { delay: Math.max(0, at), ms: flight, easing: 'cubic-bezier(.4,0,.9,.7)', tail: true }));
    jobs.push(stroke(c, G, d, { stroke: '#fffbea', 'stroke-width': 1.2 }, { delay: Math.max(0, at), ms: flight, easing: 'cubic-bezier(.4,0,.9,.7)', tail: true }));
    if ((miss || column) && i % 3 === 0) after(c, G, Math.max(0, at) + flight, () => c.decal('scorch', { x: tx, y: ty, r: g.tw * 0.32 }));
  }
  // the dirt the card sprays off its rear track, kicked once a burst
  const ps = warm('claude-of-tanks'), dirt = ps?.at(-1);
  if (dirt) {
    const U = unitOf(from, 0.7), d = towardFoe(c), rx = from.foot.x - d * from.w * 0.36, ry = from.foot.y - from.h * 0.12;
    for (let b = 0; b < bursts; b++) {
      jobs.push(fly(c, floorHost(c), dirt, U, [
        { x: rx, y: ry, s: 0.35, sx: -d * 0.35, o: 0 },
        { x: rx - d * 6, y: ry - 6, s: 0.9, sx: -d * 0.9, o: 0.8, offset: 0.25 },
        { x: rx - d * 14, y: ry - 10, s: 1.05, sx: -d * 1.05, o: 0 },
      ], { duration: 460, delay: Math.max(0, delay + b * 70 - (bursts - 1) * 70), easing: OUT }));
    }
  }
  if (!miss && !column) after(c, G, delay + flight + 20, () => c.decal('scorch', { x: to.foot.x + (rnd(seed, 2) - 0.5) * g.tw * 0.5, y: to.foot.y + g.th * 0.2, r: g.tw * 0.42 }));
  if (!miss) after(c, G, delay + flight - 10, () => c.shake(0.006, 220));
  return done(jobs).then(() => G.remove());
}
defineSpecial({ card: 'claude-of-tanks', lead: 240, play: (c) => volley(c, 4) });
defineSpecial({ card: 'claude-of-tanks', move: 'column-fire', play: (c) => volley(c, 6, true) });

// ---------------------------------------------------------------- Mailroom: cancel bars sweep across; the postmark stamps a status
defineSpecial({
  card: 'mailroom', lead: 220,
  play(c) {
    const ps = warm('mailroom');
    if (!ps?.length) return null;
    const { delay, flight } = clock(c, 220), L = layersFor(c, c.to), U = unitOf(c.from, 1.2);
    const a = mid(c.from, 0.35), jobs = [], bars = ps.slice(1, 6);
    bars.forEach((p, i) => {
      const t = c.miss ? landOf(c, 0.5, i) : { x: c.to.x + c.to.w * 0.5, y: c.to.y + c.to.h * (0.22 + 0.14 * i) };
      jobs.push(fly(c, L.layer, p, U * 1.1, [
        { x: a.x, y: a.y + (i - 2) * 6, s: 0.7, o: 0 },
        { x: (a.x + t.x) / 2, y: (a.y + t.y) / 2 - c.g.th * 0.4, s: 1, o: 1, offset: 0.4 },
        { x: t.x, y: t.y, s: 1.25, sx: 1.6, o: 1, offset: 0.75 },
        { x: t.x + towardFoe(c) * 10, y: t.y, s: 1.2, sx: 1.7, o: 0 },
      ], { duration: flight + 140, delay: delay + i * 18 - 36, easing: 'cubic-bezier(.5,0,.3,1)' }));
    });
    // a status the hit applies: the postmark lands on the defender at the contact, 1.4 -> 1 in 140 ms
    const applied = (c.shot?.post ?? []).some((e) => e.kind === 'status' && e.change === 'applied');
    if (applied && !c.miss && ps[0]) {
      const t = mid(c.to, 0.42), s = (Math.min(c.to.w, c.to.h) * 0.55) / ps[0].w;
      jobs.push(fly(c, c.layer, ps[0], s, [
        { x: t.x, y: t.y, s: 1.4, r: -18, o: 0 },
        { x: t.x, y: t.y, s: 1, r: -12, o: 1, offset: 0.14 },
        { x: t.x, y: t.y, s: 1, r: -12, o: 1, offset: 0.75 },
        { x: t.x, y: t.y, s: 1.02, r: -12, o: 0 },
      ], { duration: 1000, delay: delay + flight, easing: 'cubic-bezier(.2,.9,.1,1)' }));
      lend(c, delay + flight + 1000);
    }
    return done(jobs);
  },
});

// ---------------------------------------------------------------- Local Search: the query strips stream down lanes
defineSpecial({
  card: 'local-search', lead: 220,
  play(c) {
    const ps = warm('local-search');
    if (!ps?.length) return null;
    const { delay, flight } = clock(c, 220), L = layersFor(c, c.to), U = unitOf(c.from, 1.0);
    const a = mid(c.from, 0.4), dx = c.to.foot.x - c.from.foot.x, dy = c.to.foot.y - c.from.foot.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    lend(c, delay + flight + 220);
    return done(ps.slice(0, 3).map((p, i) => {
      const lane = (i - 1) * c.g.th * 0.55;
      const t = landOf(c, 0.3 + 0.18 * i, i);
      return fly(c, L.layer, p, U, [
        { x: a.x + nx * lane, y: a.y + ny * lane, s: 0.85, o: 0 },
        { x: a.x + nx * lane + dx * 0.15, y: a.y + ny * lane + dy * 0.15, s: 0.9, o: 1, offset: 0.18 },
        { x: t.x + nx * lane * 0.4, y: t.y + ny * lane * 0.4, s: 0.6, o: 1, offset: 0.85 },
        { x: t.x, y: t.y, s: 0.45, o: 0 },
      ], { duration: flight + 40, delay: delay + i * 34 - 68, easing: 'cubic-bezier(.55,0,.35,1)' });
    }));
  },
});

// ---------------------------------------------------------------- Agent Pets: paw prints run the duel axis under the pounce
defineSpecial({
  card: 'agent-pets', lead: 260,
  play(c) {
    const ps = warm('agent-pets'), paw = ps?.[3];
    if (!paw) return null;
    const { delay, flight } = clock(c, 260), jobs = [];
    const a = c.from.foot, b = c.miss ? landOf(c) : c.to.foot, n = 6;
    const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    // the prints run the open floor between the two, left and right in turn, each stamped (1.3 -> 1) as the pounce
    // passes, sized to read (6.5% of the frame); never where a body stands over them: a run the near figure hides
    // bends to end on the floor in front of the foe instead (the pounce lands at its feet)
    const pt = (t, end) => ({ x: a.x + (end.x - a.x) * t, y: a.y + (end.y - a.y) * t });
    const seen = (q) => !inside(c.from, q, 8) && !inside(c.to, q, 8);
    const open = (end) => Array.from({ length: 41 }, (_, k) => 0.08 + (0.9 * k) / 40).filter((t) => seen(pt(t, end)));
    let end = b, ts = open(b);
    if (ts.length < 14 && !c.miss) {
      const front = { x: c.to.foot.x - towardFoe(c) * c.to.w * 0.35, y: c.to.foot.y + c.g.th * 0.55 };
      const alt = open(front);
      if (alt.length > ts.length) { end = front; ts = alt; }
    }
    if (!ts.length) return null;
    for (let i = 0; i < n; i++) {
      const t = ts[Math.round((i * (ts.length - 1)) / (n - 1))], side = i % 2 ? 1 : -1, q = pt(t, end);
      const at = { x: q.x + side * c.g.th * 0.14, y: q.y + side * c.g.th * 0.1 };
      // (the floor lies at a grazing angle: a print a twentieth of the frame across reads as a print, not a smudge)
      const m = readM(c, at, c.g.phone ? 0.17 : 0.065, 0.55);
      const f = floorAt(c, floorLayerAt(c, at), at, m, m, -ang + 90);
      if (!f) continue;
      f.el.append(pieceNode(paw));
      const sv = f.el.firstElementChild;
      if (sv) sv.style.transformOrigin = '50% 50%';
      const at0 = delay + (flight * i) / n;
      jobs.push(c.anim(f.el, [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: 760, delay: at0, fill: 'both' }));
      if (sv) jobs.push(c.anim(sv, [{ transform: 'scale(1.3)' }, { transform: 'scale(1)', offset: 0.14 }, { transform: 'scale(1)' }], { duration: 760, delay: at0, easing: OUT, fill: 'both' }));
      jobs.at(-1).finished.catch(() => {}).then(() => f.el.remove());
    }
    return done(jobs);
  },
});

// ---------------------------------------------------------------- Loop: diff rows fan toward the foe
defineSpecial({
  card: 'loop', lead: 240,
  play(c) {
    const ps = warm('loop');
    if (!ps?.length) return null;
    const { delay, flight } = clock(c, 240), L = layersFor(c, c.to), U = unitOf(c.from, 1.05);
    const a = { x: c.from.x + c.from.w / 2, y: c.from.y + c.from.h * 0.12 };
    lend(c, delay + flight + 200);
    return done(ps.slice(0, 4).map((p, i) => {
      const t = c.miss ? landOf(c, 0.4, i) : { x: c.to.x + c.to.w * (0.25 + 0.17 * i), y: c.to.y + c.to.h * (0.2 + 0.18 * i) };
      const fan = (i - 1.5) * 9;
      return fly(c, L.layer, p, U, [
        { x: a.x, y: a.y, s: 0.8, r: 0, o: 0 },
        { x: a.x + (t.x - a.x) * 0.3, y: a.y - c.g.th * 0.6 + (t.y - a.y) * 0.3, s: 1, r: fan, o: 1, offset: 0.3 },
        { x: t.x, y: t.y, s: 0.9, r: fan * 0.4, o: 1, offset: 0.82 },
        { x: t.x, y: t.y, s: 0.8, r: 0, o: 0 },
      ], { duration: flight + 60, delay: delay + i * 26 - 52, easing: ARC });
    }));
  },
});

// ---------------------------------------------------------------- Agent Machines: the trace is laid on the floor to the foe, the chip rides it
defineSpecial({
  card: 'agent-machines', lead: 240,
  play(c) {
    const ps = warm('agent-machines'), chip = ps?.[1];
    // a foe nearer the camera stands over its own foot: the trace then turns toward the camera first and runs in
    // front of the foe's feet (the front layer), so the near body never hides where it lands
    const nearT = !c.miss && c.to.foot.y > c.from.foot.y + 2;
    const { delay, flight } = clock(c, 240), g = c.g, host = nearT ? c.layer : floorHost(c);
    const bp = c.miss ? landOf(c) : nearT ? { x: c.to.foot.x - towardFoe(c) * c.to.w * 0.15, y: c.to.foot.y + g.th * 0.6 } : c.to.foot;
    const a = unproject(g.P, c.from.foot.x, c.from.foot.y), b = unproject(g.P, bp.x, bp.y);
    if (!(a.Z > 0 && b.Z > 0) || !g.Hf) return null;
    // one floor frame spanning both stands (own px S a metre), the trace a right angle in it, as the card draws it
    const X0 = Math.min(a.X, b.X) - 0.5, Z1 = Math.max(a.Z, b.Z) + 0.5, wM = Math.abs(a.X - b.X) + 1, dM = Math.abs(a.Z - b.Z) + 1;
    const e = document.createElement('div');
    e.className = 'sp-f';
    e.style.width = `${F(wM * S)}px`; e.style.height = `${F(dM * S)}px`;
    e.style.transform = matrix3d(mul3(g.Hf, [[1 / S, 0, X0], [0, -1 / S, Z1], [0, 0, 1]]));
    host.append(e);
    const px = (p) => ({ x: (p.X - X0) * S, y: (Z1 - p.Z) * S });
    const A = px(a), Bp = px(b), corner = nearT ? { x: A.x, y: Bp.y } : { x: Bp.x, y: A.y };
    const r = Math.min(18, Math.abs(Bp.y - A.y) / 2, Math.abs(Bp.x - A.x) / 2);
    const sx = Math.sign(Bp.x - A.x) || 1, sy = Math.sign(Bp.y - A.y) || 1;
    const d = nearT
      ? `M${F(A.x)} ${F(A.y)}V${F(corner.y - sy * r)}Q${F(corner.x)} ${F(corner.y)} ${F(corner.x + sx * r)} ${F(corner.y)}H${F(Bp.x)}`
      : `M${F(A.x)} ${F(A.y)}H${F(corner.x - sx * r)}Q${F(corner.x)} ${F(corner.y)} ${F(corner.x)} ${F(corner.y + sy * r)}V${F(Bp.y)}`;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'sp-floor');
    svg.setAttribute('viewBox', `0 0 ${F(wM * S)} ${F(dM * S)}`);
    e.append(svg);
    const pk = g.phone ? 1.5 : 1;
    const jobs = [
      // the card's trace at a width that reads across the arena's grazing floor (16 cm, its keyline 30)
      // (a phone's floor is steeper still: half again as wide)
      stroke(c, svg, d, { stroke: '#062e16', 'stroke-width': 30 * pk, opacity: 0.6 }, { delay, ms: flight, easing: 'cubic-bezier(.4,0,.2,1)' }),
      stroke(c, svg, d, { stroke: '#22c55e', 'stroke-width': 16 * pk }, { delay, ms: flight, easing: 'cubic-bezier(.4,0,.2,1)' }),
      stroke(c, svg, d, { stroke: '#bbf7d0', 'stroke-width': 4 * pk, opacity: 0.85 }, { delay, ms: flight, easing: 'cubic-bezier(.4,0,.2,1)' }),
    ];
    for (const v of [A, Bp]) node('circle', svg, { cx: v.x, cy: v.y, r: 16, fill: '#d4af37', stroke: '#062e16', 'stroke-width': 5 });
    if (chip) {
      const sz = 0.62 * S, cb = document.createElement('div');
      cb.className = 'sp-p';
      Object.assign(cb.style, { width: `${sz}px`, height: `${sz}px` });
      cb.append(pieceNode(chip));
      e.append(cb);
      const len1 = Math.hypot(corner.x - A.x, corner.y - A.y), len2 = Math.hypot(Bp.x - corner.x, Bp.y - corner.y), k = len1 / (len1 + len2 || 1);
      const at = (p) => `translate3d(${F(p.x - sz / 2)}px,${F(p.y - sz / 2)}px,0)`;
      jobs.push(c.anim(cb, [{ transform: at(A), opacity: 0 }, { transform: at(A), opacity: 1, offset: 0.05 }, { transform: at(corner), offset: 0.05 + 0.75 * k }, { transform: at(Bp), opacity: 1, offset: 0.8 }, { transform: at(Bp), opacity: 0 }], { duration: flight + 180, delay, easing: 'linear', fill: 'both' }));
      lend(c, delay + flight + 200);
    }
    return done(jobs).then(() => done([c.anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 280, delay: 260, fill: 'both' })])).then(() => e.remove());
  },
});

// ---------------------------------------------------------------- Prototemplate: its horizon rings ripple along the floor to the foe
defineSpecial({
  card: 'prototemplate', lead: 260,
  play(c) {
    const { delay, flight } = clock(c, 260), jobs = [];
    const cols = ['#4b3bff', '#00b3ff', '#27d17e', '#ffc53b', '#ff3b6b'];
    const a = c.from.foot, b = c.miss ? landOf(c) : c.to.foot;
    cols.forEach((col, i) => {
      const t = 0.2 + (0.8 * i) / (cols.length - 1);
      const at = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      // each ring sized to read across the floor, in front where nothing stands on it
      const m = readM(c, at, c.g.phone ? 0.22 : 0.1, 1.6);
      const f = floorAt(c, floorLayerAt(c, at), at, m, m);
      if (!f) return;
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '-62 -62 124 124');
      f.el.append(svg);
      node('circle', svg, { cx: 0, cy: 0, r: 50, fill: 'none', stroke: '#0f1113', 'stroke-width': c.g.phone ? 14 : 11, opacity: 0.55 });
      node('circle', svg, { cx: 0, cy: 0, r: 50, fill: 'none', stroke: col, 'stroke-width': c.g.phone ? 8 : 6, 'stroke-dasharray': '9 4' });
      jobs.push(c.anim(svg, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(.8)', opacity: 1, offset: 0.4 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: 420, delay: delay + (flight * i) / cols.length, easing: OUT, fill: 'both' }));
      jobs.at(-1).finished.catch(() => {}).then(() => f.el.remove());
    });
    return done(jobs);
  },
});

// ---------------------------------------------------------------- Bday Land: the stickers arc onto the foe
defineSpecial({
  card: 'bday-land', lead: 260,
  play(c) {
    const ps = warm('bday-land');
    if (!ps?.length) return null;
    const { delay, flight } = clock(c, 260), L = layersFor(c, c.to), U = unitOf(c.from, 1.1);
    lend(c, delay + flight + 300);
    return done(ps.slice(0, 4).map((p, i) => {
      const a = { x: c.from.x + c.from.w * (0.25 + 0.17 * i), y: c.from.y + c.from.h * (0.3 + 0.1 * (i % 2)) };
      const t = landOf(c, 0.3 + 0.12 * i, i), lift = c.g.th * (1.4 + 0.3 * i);
      const q = (u) => qAt(a, t, lift, u);
      return fly(c, L.layer, p, U, [
        { ...q(0), s: 0.8, r: -20, o: 0 },
        { ...q(0.3), s: 1.05, r: 60, o: 1, offset: 0.25 },
        { ...q(0.65), s: 1, r: 160, offset: 0.55 },
        { ...q(1), s: 1.1, sx: 1.3, r: 350, offset: 0.78 },
        { x: t.x, y: t.y - 4, s: 1, r: 360, offset: 0.88 },
        { x: t.x, y: t.y, s: 0.9, r: 360, o: 0 },
      ], { duration: (flight / 0.78), delay: delay + i * 22 - 44, easing: 'linear' });
    }));
  },
});

// ---------------------------------------------------------------- Powerlifting: a chalk puff at the foot, the handprint on the defender
defineSpecial({
  card: 'powerlifting', lead: 130,
  play(c) {
    const ps = warm('powerlifting');
    if (!ps?.length) return null;
    const { delay, flight } = clock(c, 130), jobs = [], U = unitOf(c.from, 1.4);
    // the wind-up: four grains puff off the platform at its feet
    const f = c.from.foot;
    ps.slice(1, 5).forEach((p, i) => {
      const ang = (-0.5 + i / 3) * Math.PI * 0.8 - Math.PI / 2;
      jobs.push(fly(c, c.layer, p, U * 1.4, [
        { x: f.x, y: f.y - c.from.h * 0.06, s: 0.5, o: 0 },
        { x: f.x + Math.cos(ang) * c.g.tw * 0.5, y: f.y - c.from.h * 0.06 + Math.sin(ang) * c.g.th * 1.1, s: 1.3, o: 0.85, offset: 0.4 },
        { x: f.x + Math.cos(ang) * c.g.tw * 0.7, y: f.y + Math.sin(ang) * c.g.th * 1.3, s: 1.6, o: 0 },
      ], { duration: 520, delay: i * 25, easing: OUT }));
    });
    // the contact: the dusted handprint stamps the struck figure
    const hand = ps[5];
    if (hand && !c.miss) {
      const t = mid(c.to, 0.45), s = (Math.min(c.to.w, c.to.h) * 0.42) / hand.h;
      jobs.push(fly(c, c.layer, hand, s, [
        { x: t.x, y: t.y, s: 1.5, r: -24, o: 0 },
        { x: t.x, y: t.y, s: 1, r: -18, o: 0.92, offset: 0.14 },
        { x: t.x, y: t.y, s: 1, r: -18, o: 0.92, offset: 0.6 },
        { x: t.x, y: t.y + 3, s: 1.02, r: -18, o: 0 },
      ], { duration: 900, delay: delay + flight - 20, easing: 'cubic-bezier(.2,.9,.1,1)' }));
    }
    return done(jobs);
  },
});

// ---------------------------------------------------------------- Elo: the two chips (no digits) swap across the duel
defineSpecial({
  card: 'elo', lead: 220,
  play(c) {
    const ps = warm('elo');
    if (!ps?.length || c.miss) return null;
    const { delay, flight } = clock(c, 220), U = unitOf(c.from, 1.7), L = layersFor(c, c.to);
    const a = { x: c.from.x + c.from.w / 2, y: c.from.y - c.g.th * 0.2 }, b = { x: c.to.x + c.to.w / 2, y: c.to.y - c.g.th * 0.2 };
    const lift = c.g.th * 0.9;
    // the winner's chip (up) crosses to the attacker, the loser's (down) to the defender: the rating changes hands
    return done([[ps[0], b, a, lift], [ps[1], a, b, -lift * 0.4]].map(([p, s, t, l], i) => fly(c, i ? L.layer : c.layer, p, U, [
      { x: s.x, y: s.y, s: 0.7, o: 0 },
      { x: s.x, y: s.y, s: 1, o: 1, offset: 0.2 },
      { ...qAt(s, t, l, 0.5), s: 1.05, offset: 0.55 },
      { x: t.x, y: t.y, s: 1, o: 1, offset: 0.82 },
      { x: t.x, y: t.y - 6, s: 0.95, o: 0 },
    ], { duration: (flight / 0.82) + 120, delay, easing: OUT })));
  },
});

// ---------------------------------------------------------------- Cotfly: the trace climbs to threshold and fires down the duel
defineSpecial({
  card: 'cotfly', lead: 130,
  play(c) {
    const ps = warm('cotfly'), trace = ps?.[0];
    if (!trace) return null;
    const { delay, flight, I } = clock(c, 130), U = unitOf(c.from, 0.85), jobs = [];
    const h = { x: c.from.x + c.from.w * 0.5, y: c.from.y + c.from.h * 0.06 };
    // the membrane trace over the fly's head: flat, climbing to its threshold, a spike at the contact
    const D = Math.max(520, I + 320), k = I / D;
    jobs.push(fly(c, c.layer, trace, U, [
      { x: h.x, y: h.y, s: 1, o: 0 },
      { x: h.x, y: h.y - 4, s: 1, o: 0.9, offset: Math.min(0.1, k * 0.4) },
      { x: h.x, y: h.y - 10, s: 1.25, sx: 0.8, o: 1, offset: k * 0.92 },
      { x: h.x, y: h.y - 18, s: 2.1, sx: 0.85, o: 1, offset: k },
      { x: h.x, y: h.y - 4, s: 0.9, sx: 1, o: 0.75, offset: k + 0.18 },
      { x: h.x, y: h.y, s: 1, o: 0 },
    ], { duration: D, delay: 0, easing: 'linear' }));
    // the spike propagates: one pale line from the head to the struck body
    const L = layersFor(c, c.to), G = group(L.svg), t = landOf(c, 0.35);
    jobs.push(stroke(c, G, arcD(h, t, c.g.th * 0.6), { stroke: '#fff1d6', 'stroke-width': 2.4, opacity: 0.9 }, { delay, ms: flight, tail: true, easing: 'cubic-bezier(.4,0,.9,.7)' }));
    lend(c, Math.max(420, I / 0.6));
    return done(jobs).then(() => G.remove());
  },
});

// ---------------------------------------------------------------- Relay: the tile is handed over, onto the foe's pad
defineSpecial({
  card: 'relay', lead: 240,
  play(c) {
    const ps = warm('relay'), tile = ps?.[3], dots = ps?.[0];
    if (!tile) return null;
    const { delay, flight } = clock(c, 240), L = layersFor(c, c.to), U = unitOf(c.from, 1.0);
    const a = mid(c.from, 0.18), t = c.miss ? landOf(c) : { x: c.to.foot.x, y: c.to.foot.y - c.g.th * 0.15 };
    const lift = c.g.th * 1.8, jobs = [];
    // the dotted handoff, as the card draws it, along the throw
    const G = group(L.svg);
    const dk = node('path', G, { d: arcD(a, t, lift), fill: 'none', stroke: '#1b1530', 'stroke-width': c.g.phone ? 6 : 8, 'stroke-dasharray': '0.1 12', 'stroke-linecap': 'round', opacity: 0 });
    const dl = node('path', G, { d: arcD(a, t, lift), fill: 'none', stroke: '#fbf7ff', 'stroke-width': c.g.phone ? 3.4 : 4.4, 'stroke-dasharray': '0.1 12', 'stroke-linecap': 'round', opacity: 0 });
    for (const [e, op] of [[dk, 0.5], [dl, 0.95]]) jobs.push(c.anim(e, [{ opacity: 0 }, { opacity: op, offset: 0.3 }, { opacity: op, offset: 0.7 }, { opacity: 0 }], { duration: flight + 260, delay, fill: 'both' }));
    jobs.push(fly(c, L.layer, tile, U * 1.3, [
      { ...qAt(a, t, lift, 0), s: 0.8, r: -12, o: 0 },
      { ...qAt(a, t, lift, 0.15), s: 1, r: 0, o: 1, offset: 0.12 },
      { ...qAt(a, t, lift, 0.6), s: 1, r: 90, offset: 0.5 },
      { ...qAt(a, t, lift, 1), s: 0.9, sx: 1.2, r: 180, offset: 0.78 },
      { x: t.x, y: t.y, s: 0.85, sx: 1.25, r: 180, offset: 0.9 },
      { x: t.x, y: t.y, s: 0.8, r: 180, o: 0 },
    ], { duration: flight / 0.78, delay, easing: 'linear' }));
    void dots;
    lend(c, delay + flight + 200);
    return done(jobs).then(() => G.remove());
  },
});

// ---------------------------------------------------------------- Kevin Wiki: the thread runs to the foe and the link closes on it
defineSpecial({
  card: 'kevin-wiki', lead: 240,
  play(c) {
    const ps = warm('kevin-wiki'), link = ps?.[1];
    const { delay, flight } = clock(c, 240), L = layersFor(c, c.to), G = group(L.svg), jobs = [];
    const a = { x: c.from.foot.x, y: c.from.foot.y - c.g.th * 0.2 }, t = c.miss ? landOf(c) : mid(c.to, 0.55);
    const corner = { x: t.x, y: a.y };
    const d = `M${F(a.x)} ${F(a.y)}H${F(corner.x)}V${F(t.y)}`;
    jobs.push(stroke(c, G, d, { stroke: '#11100e', 'stroke-width': c.g.phone ? 5 : 7, opacity: 0.55 }, { delay, ms: flight, easing: 'cubic-bezier(.4,0,.2,1)' }));
    jobs.push(stroke(c, G, d, { stroke: '#f4f1ea', 'stroke-width': c.g.phone ? 2.5 : 3.5 }, { delay, ms: flight, easing: 'cubic-bezier(.4,0,.2,1)' }));
    if (link) {
      const U = unitOf(c.from, 0.9);
      jobs.push(fly(c, c.layer, link, U, [
        { x: t.x, y: t.y, s: 1.8, sx: 2.6, o: 0 },
        { x: t.x, y: t.y, s: 1.1, sx: 1.1, o: 1, offset: 0.25 },
        { x: t.x, y: t.y, s: 1, sx: 1, o: 1, offset: 0.7 },
        { x: t.x, y: t.y, s: 1, o: 0 },
      ], { duration: 640, delay: delay + flight - 60, easing: 'cubic-bezier(.2,.9,.1,1)' }));
      lend(c, delay + flight + 500);
    }
    return done(jobs).then(() => done([c.anim(G, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 200, fill: 'both' })])).then(() => G.remove());
  },
});

// ---------------------------------------------------------------- Princeton TD: the tower it stands fires its own shot
/** The game's lightning bolt (Princeton-Tower-Defense helpers.ts drawLightningBolt) as one SVG path: jittered
 *  segments every 25 px, tapered at both ends, seeded per hit so a bolt never flickers between frames. */
function boltD(a, b, seed, k = 1) {
  const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1, px = -dy / dist, py = dx / dist;
  const n = Math.max(5, Math.floor(dist / 25)), jitter = 18 * k;
  let d = `M${F(a.x)} ${F(a.y)}`;
  for (let i = 1; i < n; i++) {
    const t = i / n, taper = 1 - Math.abs(t - 0.5) * 1.6, o = (rnd(seed, i * 17) - 0.5) * 2 * jitter * Math.max(0, taper);
    d += `L${F(a.x + dx * t + px * o)} ${F(a.y + dy * t + py * o)}`;
  }
  return `${d}L${F(b.x)} ${F(b.y)}`;
}
const PTD = {
  /** A ballistic trail from the muzzle (the card's halo and core), and a mark where it lands. */
  shell(c, G, m, t, { halo, core, lift, ms, delay, w = 1, head = null }) {
    const d = arcD(m, t, lift), jobs = [];
    // weights that read across the arena (a phone draws them at 0.75)
    const k = c.g.phone ? 0.75 : 1;
    jobs.push(stroke(c, G, d, { stroke: halo, 'stroke-width': 15 * w * k, opacity: 0.5 }, { delay, ms, tail: true, easing: 'cubic-bezier(.35,0,.65,1)' }));
    jobs.push(stroke(c, G, d, { stroke: core, 'stroke-width': 6 * w * k }, { delay, ms, tail: true, easing: 'cubic-bezier(.35,0,.65,1)' }));
    if (head) {
      const b = node('circle', G, { cx: 0, cy: 0, r: head * 1.7 * k, fill: core, stroke: halo, 'stroke-width': 3 * k });
      const fr = Array.from({ length: 9 }, (_, i) => { const p = qAt(m, t, lift, i / 8); return { transform: `translate(${F(p.x)}px,${F(p.y)}px)`, opacity: i === 8 ? 0 : 1 }; });
      jobs.push(c.anim(b, fr, { duration: ms, delay, easing: 'cubic-bezier(.35,0,.65,1)', fill: 'both' }));
    }
    return jobs;
  },
  ring(c, host, at, wM, color, delay, ms = 360, width = 4) {
    // never under 5% of the frame across, so a ring on the far side still reads; in front where nothing stands on it
    const m = Math.max(wM, readM(c, at, c.g.phone ? 0.12 : 0.08, wM));
    const f = floorAt(c, host === floorHost(c) ? floorLayerAt(c, at) : host, at, m, m);
    if (!f) return null;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-60 -60 120 120');
    f.el.append(svg);
    node('circle', svg, { cx: 0, cy: 0, r: 50, fill: `color-mix(in srgb, ${color} 18%, transparent)`, stroke: '#141312', 'stroke-width': width + 4, 'stroke-opacity': 0.5 });
    node('circle', svg, { cx: 0, cy: 0, r: 50, fill: 'none', stroke: color, 'stroke-width': width });
    const a = c.anim(svg, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.45 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: ms, delay, easing: OUT, fill: 'both' });
    a.finished.catch(() => {}).then(() => f.el.remove());
    return a;
  },
};
function towerShot(c) {
  const key = c.form?.key ?? 'lab-4b', [type, lvl = '1'] = key.split('-');
  const L = layersFor(c, c.to), G = group(L.svg), host = floorHost(c);
  const m = anchorOf(c, 0.5, 0.06), hits = Math.max(1, c.hits ?? 1), jobs = [];
  const g = c.g, tw = g.tw, th = g.th, T = c.from.h;
  const t0 = landOf(c, 0.45);
  const A = lvl === '4a', Bb = lvl === '4b';
  switch (type) {
    case 'cannon': {
      if (A) {
        // Gatling Gun: one tracer a hit, 90 ms apart, the first landing at the contact
        const { delay, flight } = clock(c, 160);
        for (let i = 0; i < Math.max(5, hits); i++) {
          const t = landOf(c, 0.45, i);
          jobs.push(stroke(c, G, `M${F(m.x)} ${F(m.y)}L${F(t.x)} ${F(t.y)}`, { stroke: '#ff6600', 'stroke-width': c.g.phone ? 4 : 6, opacity: 0.55 }, { delay: delay + i * 90, ms: flight, tail: true, easing: 'linear' }));
          jobs.push(stroke(c, G, `M${F(m.x)} ${F(m.y)}L${F(t.x)} ${F(t.y)}`, { stroke: '#ffe2a6', 'stroke-width': c.g.phone ? 1.8 : 2.4 }, { delay: delay + i * 90, ms: flight, tail: true, easing: 'linear' }));
        }
      } else if (Bb) {
        // Flamethrower: a cone of three widening wedges, and a burn on the floor
        const { delay, flight } = clock(c, 300);
        const dx = t0.x - m.x, dy = t0.y - m.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
        [0.5, 0.72, 0.92].forEach((k, i) => {
          const tip = { x: m.x + dx * k, y: m.y + dy * k }, wd = th * (0.22 + 0.38 * k);
          const p = node('path', G, { d: `M${F(m.x)} ${F(m.y)}L${F(tip.x + nx * wd)} ${F(tip.y + ny * wd)}Q${F(tip.x + dx * 0.08)} ${F(tip.y + dy * 0.08)} ${F(tip.x - nx * wd)} ${F(tip.y - ny * wd)}Z`, fill: ['#ffb347', '#ff6600', '#d64000'][i], opacity: 0 });
          p.style.transformOrigin = `${F(m.x)}px ${F(m.y)}px`;
          jobs.push(c.anim(p, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.42 - i * 0.08, offset: 0.4 }, { transform: 'scale(1.05)', opacity: 0.3 - i * 0.06, offset: 0.75 }, { transform: 'scale(1.08)', opacity: 0 }], { duration: flight + 220, delay: delay + i * 40, easing: OUT, fill: 'both' }));
        });
        after(c, G, delay + flight, () => c.decal('scorch', { x: c.to.foot.x, y: c.to.foot.y + th * 0.15, r: tw * 0.4 }));
      } else {
        // Cannon Shot to Heavy Cannon: the ball on its arc (the card's cannonball trail), a scorch where it lands
        const { delay, flight } = clock(c, 240);
        jobs.push(...PTD.shell(c, G, m, t0, { halo: '#6b4a2b', core: '#ffb347', lift: th * 1.2, ms: flight, delay, w: 0.9 + 0.15 * Number(lvl), head: 4 + Number(lvl) }));
        after(c, G, delay + flight, () => c.decal('scorch', { x: c.miss ? t0.x : c.to.foot.x, y: (c.miss ? t0.y : c.to.foot.y) + th * 0.15, r: tw * 0.36 }));
      }
      break;
    }
    case 'lab': {
      if (A) {
        // Focused Beam: one held beam, its width growing to the contact (a bar along the beam scaled across its axis:
        // transform and opacity only)
        const { delay, flight } = clock(c, 300);
        const len = Math.hypot(t0.x - m.x, t0.y - m.y), ang = (Math.atan2(t0.y - m.y, t0.x - m.x) * 180) / Math.PI;
        const beam = node('g', G, { transform: `translate(${F(m.x)} ${F(m.y)}) rotate(${F(ang)})` });
        const bar = (fill) => { const r = node('rect', beam, { x: 0, y: -0.5, width: len, height: 1, rx: 0.5, fill, opacity: 0 }); r.style.transformBox = 'fill-box'; r.style.transformOrigin = '50% 50%'; return r; };
        const outer = bar('#5b3fa8'), core = bar('#efe6ff');
        jobs.push(c.anim(outer, [{ transform: 'scaleY(1)', opacity: 0.2 }, { transform: 'scaleY(12)', opacity: 0.55, offset: 0.7 }, { transform: 'scaleY(12)', opacity: 0.5, offset: 0.85 }, { transform: 'scaleY(2)', opacity: 0 }], { duration: flight + 260, delay, fill: 'both' }));
        jobs.push(c.anim(core, [{ transform: 'scaleY(.6)', opacity: 0.4 }, { transform: 'scaleY(4)', opacity: 0.95, offset: 0.7 }, { transform: 'scaleY(4)', opacity: 0.9, offset: 0.85 }, { transform: 'scaleY(.6)', opacity: 0 }], { duration: flight + 260, delay, fill: 'both' }));
      } else {
        // Tesla Zapper to Tesla Coil, Chain Lightning: one bolt a hit from the coil's top (3, 4, 5; 7), 90 ms apart
        const { delay, flight } = clock(c, 120);
        const n = Bb ? 7 : Math.max(hits, Number(lvl) + 2);
        for (let i = 0; i < n; i++) {
          const t = landOf(c, 0.4, i), d = boltD(m, t, (c.seed ?? 1) * 31 + i, 1);
          const at = delay + i * 90;
          for (const [col, wd, op] of [['#5b3fa8', 7, 0.35], ['#b48cff', 3, 0.7], ['#efe6ff', 1.2, 0.9]]) {
            const p = node('path', G, { d, fill: 'none', stroke: col, 'stroke-width': wd, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0 });
            jobs.push(c.anim(p, [{ opacity: 0 }, { opacity: op, offset: 0.12 }, { opacity: op * 0.8, offset: 0.55 }, { opacity: 0 }], { duration: flight + 100, delay: at, easing: 'linear', fill: 'both' }));
          }
        }
      }
      break;
    }
    case 'library': {
      // Slowing Field to Arcane Library, EQ Smasher, Blizzard: a frost ring on the target's pad
      const { delay, flight } = clock(c, 280);
      const at = c.miss ? t0 : c.to.foot;
      jobs.push(PTD.ring(c, host, at, A ? 1.9 : 1.5, '#67e8f9', delay, flight + 260, A ? 8 : 6.5));
      if (Bb || A) jobs.push(PTD.ring(c, host, at, A ? 1.3 : 1.1, '#e0fbff', delay + 90, flight + 200, 4));
      jobs.push(stroke(c, G, arcD(m, mid(c.to, 0.3), th * 0.4), { stroke: '#67e8f9', 'stroke-width': 2, opacity: 0.6, 'stroke-dasharray': '1 1' }, { delay, ms: flight * 0.6, tail: true }));
      break;
    }
    case 'mortar': {
      const { delay, flight } = clock(c, 320);
      if (A) {
        // Missile Battery: six missiles on staggered arcs, 40 ms apart
        for (let i = 0; i < 6; i++) {
          const t = landOf(c, 0.45, i), lift = T * (1.2 + 0.15 * (i % 3));
          jobs.push(...PTD.shell(c, G, { x: m.x + (i - 2.5) * 3, y: m.y }, t, { halo: '#7a5c3a', core: '#ffd2a1', lift, ms: flight - 40, delay: delay + i * 40 - 100, w: 0.85, head: 3 }));
        }
      } else {
        // Field Mortar to Grand Mortar: the shell's arc, apex 1.6 times the tower's height; Ember Foundry three ember shells
        const n = Bb ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const t = landOf(c, 0.55, i);
          jobs.push(...PTD.shell(c, G, m, t, { halo: Bb ? '#ff4400' : '#7a5c3a', core: Bb ? '#ffb347' : '#ffcf8a', lift: T * 1.6 * 0.6, ms: flight, delay: delay + i * 50 - (n - 1) * 50, w: 1, head: 5 }));
          after(c, G, delay + flight + i * 50 - (n - 1) * 50, () => c.decal('scorch', { x: t.x, y: c.to.foot.y + th * (0.1 + 0.2 * i), r: tw * (Bb ? 0.3 : 0.42) }));
        }
      }
      break;
    }
    case 'arch': {
      // Crescendo to Forte, Shockwave Siren: three sonic ellipses from the portal; Symphony Hall one a hit
      const { delay, flight } = clock(c, 300);
      const n = Bb ? Math.max(2, hits) : 3, dx = t0.x - m.x, dy = t0.y - m.y, ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      for (let i = 0; i < n; i++) {
        // each wave a keyed ellipse (dark under, the tower's blue over) that reads against any floor
        const wv = node('g', G, { opacity: 0 });
        node('ellipse', wv, { cx: 0, cy: 0, rx: th * 0.6, ry: th * 1.3, fill: 'color-mix(in srgb, #60a5fa 10%, transparent)', stroke: '#141312', 'stroke-width': c.g.phone ? 8 : 12, 'stroke-opacity': 0.45 });
        node('ellipse', wv, { cx: 0, cy: 0, rx: th * 0.6, ry: th * 1.3, fill: 'none', stroke: '#93c5fd', 'stroke-width': c.g.phone ? 4.5 : 7 });
        const fr = [0, 0.5, 1].map((k) => ({ transform: `translate(${F(m.x + dx * k)}px,${F(m.y + dy * k)}px) rotate(${F(ang)}deg) scale(${(0.5 + 0.8 * k).toFixed(2)})`, opacity: k === 0 ? 0 : k === 1 ? 0 : 0.9 }));
        fr[1].offset = 0.35;
        jobs.push(c.anim(wv, fr, { duration: flight, delay: delay + i * (Bb ? 90 : 60) - (Bb ? 0 : 60), easing: 'cubic-bezier(.3,.5,.4,1)', fill: 'both' }));
      }
      if (A && !c.miss) jobs.push(PTD.ring(c, host, c.to.foot, 1.4, '#60a5fa', delay + flight - 40, 320, 3));
      break;
    }
    case 'club': {
      // Club Dues and its rungs: gold coins arc to the foe on the hit, back to the club on the drain
      const { delay, flight } = clock(c, 300);
      const n = 5;
      for (let i = 0; i < n; i++) {
        const t = landOf(c, 0.4, i), lift = th * (1 + 0.25 * i);
        const coin = node('circle', G, { cx: 0, cy: 0, r: c.g.phone ? 6 : 8.5, fill: '#ffd700', stroke: '#5c4600', 'stroke-width': 2.4, opacity: 0 });
        const fr = Array.from({ length: 7 }, (_, k) => { const p = qAt(m, t, lift, k / 6); return { transform: `translate(${F(p.x)}px,${F(p.y)}px)`, opacity: k === 0 ? 0 : 1 }; });
        jobs.push(c.anim(coin, fr, { duration: flight, delay: delay + i * 30 - 60, easing: 'cubic-bezier(.35,0,.65,1)', fill: 'both' }));
        // the drain: coins come home
        if (!c.miss && /drain/.test(JSON.stringify(c.shot?.post?.map((e) => e.effect) ?? []))) {
          const back = node('circle', G, { cx: 0, cy: 0, r: c.g.phone ? 5 : 7, fill: '#ffd700', stroke: '#5c4600', 'stroke-width': 2, opacity: 0 });
          const fb = Array.from({ length: 7 }, (_, k) => { const p = qAt(t, mid(c.from, 0.3), lift * 0.6, k / 6); return { transform: `translate(${F(p.x)}px,${F(p.y)}px)`, opacity: k === 6 ? 0 : 1 }; });
          jobs.push(c.anim(back, fb, { duration: 320, delay: delay + flight + 300 + i * 40, easing: 'cubic-bezier(.35,0,.65,1)', fill: 'both' }));
        }
      }
      break;
    }
    case 'station': {
      // Foot Soldiers to Elite Guard: dust kicks along the floor; Centaur Stables and Royal Cavalry a three-chevron charge
      const { delay, flight } = clock(c, 300);
      const a = c.from.foot, b = c.miss ? t0 : c.to.foot;
      if (A || Bb) {
        const dx = b.x - a.x, dy = b.y - a.y, ang = (Math.atan2(dy, dx) * 180) / Math.PI, s = th * 0.5;
        for (let i = 0; i < 3; i++) {
          const ch = node('g', G, { opacity: 0 });
          node('path', ch, { d: `M${F(-s)} ${F(-s)}L0 0L${F(-s)} ${F(s)}`, fill: 'none', stroke: '#141312', 'stroke-width': c.g.phone ? 8 : 10, 'stroke-opacity': 0.45, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
          node('path', ch, { d: `M${F(-s)} ${F(-s)}L0 0L${F(-s)} ${F(s)}`, fill: 'none', stroke: '#a78bfa', 'stroke-width': c.g.phone ? 4.5 : 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
          const at = (k) => `translate(${F(a.x + dx * k + i * -10 * Math.cos((ang * Math.PI) / 180))}px,${F(a.y + dy * k - th * 0.4 - i * 10 * Math.sin((ang * Math.PI) / 180))}px) rotate(${F(ang)}deg)`;
          jobs.push(c.anim(ch, [{ transform: at(0.1), opacity: 0 }, { transform: at(0.3), opacity: 0.9, offset: 0.2 }, { transform: at(1), opacity: 0.9, offset: 0.85 }, { transform: at(1.05), opacity: 0 }], { duration: flight, delay: delay + i * 40 - 80, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' }));
        }
      }
      const n = Number(lvl) >= 3 || A || Bb ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const k = 0.35 + (0.6 * i) / n;
        jobs.push(PTD.ring(c, host, { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, 0.9, '#efe2c8', delay + (flight * i) / n, 360, 8));
      }
      break;
    }
    default: break;
  }
  return done(jobs.filter(Boolean)).then(() => G.remove());
}
defineSpecial({ card: 'princeton-td', lead: 320, play: towerShot });

// the auras cut every fielded card's pieces as they set up; nothing here is fetched before the first special asks
void hueOf;
