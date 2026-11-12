// The Arena: the board under the Stage (MODES.md section 4). The rival leader's home map is the set, and the duel
// stands on its painted floor in the painting's own perspective (arena/ground.js, the map's calibrated camera): your
// project near the camera at lower left, seen from behind and turned toward the rival; the rival's farther back,
// seen from the front and turned toward yours (media/figures, one view per side all battle long). Each leader (the
// Landing's original characters, media/trainers) stands beside its figure, yours in its back poses, the rival's in its
// front poses. Everything scales with depth from its foot, its pad and shadows lie on the floor through the floor's
// homography, its light is the painting's (the key's colour and direction, the ambient, the far side's haze), and the
// map and everything on it move as one picture. The board is the HUD: each pad's rim is its HP in 20 segments, a flag
// at the pad's front corner carries the name, the HP numerals and the chips; each leader holds its side's other cards
// in its hand, real cards with their HP, and the team rail sums all six. The page calls it only through the seam
// (MODES.md section 2). Every motion writes transform, opacity, mask or SVG stroke only, so the page never shifts.
// Round 6 (ROUND6.md section 4): the projects stand as heroes (ground.js FIG), each wears its own card (arena/aura.js:
// its floor matter under it, its pieces orbiting in depth), moves by its body class (arena/body.js), and Princeton TD
// stands the game's own tower (arena/ptd-figure.js), built and upgraded on its pad (`cue('transform')`).
import { Leader, loadLeaders, POSE, leaderData, finalePoses } from '../shared/leaders.js';
import * as FX from '../shared/fx.js';
import { Layout, el, sv, wait, clamp, lerp, R, SIDES, other, EASE, numeral, hitTags, frameOn, inkOn } from '../shared/fx.js';
import { specials } from './specials.js';
import { loadGround, groundNow, stage, stageAsync, project, ppm, unproject, floorH, mul3, matrix3d, grade, castAt, envelope, leaderEnv, figureMpp, formView, formScale, drawnH, paintOf, frameOf, deskPlate, rivalPlate, rivalSpots, stageFrame, rivalInRail, FIG, FIG_PHONE, LEADER, PAD, PHONE_W } from './ground.js';
import { classOf, verbsOf, breathOf, hitSize, ENERGY } from './body.js';
import { mountAura, Aura } from './aura.js';
import { t as txt } from '../shared/strings.js';

const K = window.bcKit;
const { SLAM, OUT, IN_OUT, WHIP } = EASE;
/** The map is the rival leader's home ground (MODES.md section 4), or `&map=`. */
export const HOME = { noor: 'atelier', tavi: 'atelier', bram: 'runtime', mae: 'archive', sol: 'terrace', oren: 'terrace', iona: 'observatory', coda: 'foundry' };
export const MAPS = { archive: 'Lantern Archive', atelier: 'Design Atelier', foundry: 'Red Machine Foundry', observatory: 'Cloud Observatory', runtime: 'Runtime Engine Hall', terrace: 'Moss Survey Terrace' };
const SUBJECT_1X = (src) => src.replace('@2x.', '.');
/** A fighter's form key (`lab-2`, `cannon-4a`) from its snapshot (shared/rules.js decorates it), or none. */
const formKey = (f) => (f?.form ? `${f.form}-${f.level}` : null);
/** Princeton TD with forms off stands its E-Quad Lab at Level 4B, the card's own art (ROUND6.md decision 10). */
const PTD_PLAIN = 'lab-4b';
/** A card's colours (its ex card's FACE hue; body.js ENERGY before FACE has loaded). */
const hueOf = (id) => { const h = globalThis.FACE?.[id]?.hue ?? {}; return { ...h, energy: h.energy ?? ENERGY[id] ?? K.accent(id) }; };
/** May Princeton TD's sprite draw live frames here (section 3.1): not under reduced motion, a small device, Save-Data
 *  or `?ptd=still`. */
const ptdLive = (reduced) => !reduced && !(navigator.deviceMemory <= 4) && !navigator.connection?.saveData && !/[?&]ptd=still\b/.test(location.search);
/** A phone frame (the phone class, under 720 px wide, ground.js PHONE_W) skips the atelier (its floor ends 7.7 m from
 *  the camera, too shallow for a phone duel with depth) for the terrace, its daylight neighbour, at load and on every
 *  layout (a turned phone); Kevin can reverse this (MODES.md section 4). */
export const PHONE_SKIP = { atelier: 'terrace' };
const mapOf = (ctx, W = innerWidth) => {
  const map = ctx.map && Object.hasOwn(MAPS, ctx.map) ? ctx.map : HOME[ctx.leaders[1]] ?? 'atelier';
  return W < PHONE_W ? PHONE_SKIP[map] ?? map : map;
};
/** The figures' caps for a frame: a phone may step `tall` down (ground.js FIG_PHONE). */
const capsOf = (W) => (W < PHONE_W ? FIG_PHONE : FIG);
const mapSrc = (map) => new URL(`../assets/maps/${map}.webp`, import.meta.url).href;
/** Each side's view of a project: yours from behind, the rival's from the front (media/figures/manifest.json). */
const VIEW = { player: 'rear', rival: 'front' };
const FIGURES = new URL('../media/figures/', import.meta.url);
let figuresP = null, figuresNow = null;
const loadFigures = () => (figuresP ??= fetch(new URL('manifest.json', FIGURES)).then((r) => r.json()).then((m) => (figuresNow = m)));
/** A leader's atlas px per metre: a leader's idle pose is about 100 atlas px tall and stands LEADER.h (1.5 m). */
const ATLAS_PER_M = 100 / LEADER.h;
/** Floor elements are drawn at this many of their own px per metre, then projected (never magnified much). */
const S = 100;
/** Pictures decoded once a visit (the map and the figures), so a mount draws at once. */
const decoded = new Map();
function decode(src) {
  if (!decoded.has(src)) { const im = new Image(); im.decoding = 'async'; im.src = src; decoded.set(src, { im, ready: im.decode().catch(() => {}) }); }
  return decoded.get(src);
}
/** A picture's mean colour over its opaque pixels, sRGB 0-1, from a 64 px copy, once a visit (round 6 fix H7's key
 *  light reads a dark hero by it); null where it cannot be read. */
const meanOf = new Map();
function meanColour(src) {
  if (!meanOf.has(src)) meanOf.set(src, decode(src).ready.then(() => {
    const im = decode(src).im, n = 64, c = document.createElement('canvas');
    c.width = c.height = n;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0, n, n);
    const d = x.getImageData(0, 0, n, n).data, sum = [0, 0, 0], ls = [], px = [];
    let w = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2]; w++; ls.push((0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255); px.push(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255); }
    if (!w) return null;
    // (and its 5th percentile luma: the blacks the key light must hold, fix pass 2 H2; and its opaque pixels, which the
    // key light's guards run through, `keySolve`)
    ls.sort((a, b) => a - b);
    const out = sum.map((v) => v / w / 255);
    out.p5 = ls[Math.floor(ls.length * 0.05)];
    out.px = Float32Array.from(px);
    return out;
  }).catch(() => null));
  return meanOf.get(src);
}
const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
/** The key light's solve (round 6 fix H7, fix pass 2 H2, and after its critic): the brightness b and contrast c (CSS
 *  `brightness(b) contrast(c)` after the side's grade M) that lift a picture's graded mean luma toward its target, its
 *  floor's luma plus 32 grey for your hero and plus 15 for the rival, with four guards over its own opaque pixels (a
 *  64 px copy, which the screen's darkest and brightest px still outrun a little, so the guards are tighter than the checks): the
 *  graded 5th percentile lifts at most 4 grey and falls at most 6 (no milky blacks, no crushed ones), the 95th rises at most 64 grey and stays at most 184 and at most 1.5% of them newly reach
 *  250 in any channel (no washed or blown highlights), and the mean never passes its target. A dark hero on a bright
 *  floor (the tank on the terrace, a 98 grey floor) stops at the guards, short of its target: a washed tank is worse. A rival is keyed only where it stands darker
 *  than its floor: on a bright map a light rival (Jarhead on the terrace, 1.76 before) and a dark one (Claude of Tanks,
 *  2.6, a pale ghost) keep the grade alone or near it. Your hero brighter than its target keeps the grade alone. */
const keyMemo = new Map();
export function keySolve(c, M, floorL, mine) {
  const memo = `${M.join()}|${floorL}|${mine}`;
  let per = keyMemo.get(c);
  if (!per) keyMemo.set(c, (per = new Map()));
  if (!per.has(memo)) per.set(memo, keySolve0(c, M, floorL, mine));
  return per.get(memo);
}
function keySolve0(c, M, floorL, mine) {
  const px = c.px, n = px ? px.length / 3 : 0, cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const none = { b: 1, c: 1 };
  if (!n) return none;
  // (the grade once per pixel; each try below is then a few multiplies a pixel, and the push is found by bisection, so
  // the solve stays a few ms on a phone)
  const G = new Float32Array(3 * n);
  for (let i = 0; i < 3 * n; i += 3) for (let ch = 0; ch < 3; ch++) G[i + ch] = cl(M[ch * 5] * px[i] + M[ch * 5 + 1] * px[i + 1] + M[ch * 5 + 2] * px[i + 2] + M[ch * 5 + 4]);
  const stats = (b, con) => {
    const hist = new Uint32Array(256);
    let sum = 0, hot = 0;
    for (let i = 0; i < 3 * n; i += 3) {
      const r = cl((cl(G[i] * b) - 0.5) * con + 0.5), gg = cl((cl(G[i + 1] * b) - 0.5) * con + 0.5), bb = cl((cl(G[i + 2] * b) - 0.5) * con + 0.5), l = 0.2126 * r + 0.7152 * gg + 0.0722 * bb;
      hist[Math.round(l * 255)]++; sum += l; if ((r > gg ? (r > bb ? r : bb) : gg > bb ? gg : bb) >= 250 / 255) hot++;
    }
    let p5 = -1, p95 = 1;
    for (let v = 0, acc = 0; v < 256; v++) { acc += hist[v]; if (p5 < 0 && acc > n * 0.05) p5 = v / 255; if (acc > n * 0.95) { p95 = v / 255; break; } }
    return { mean: sum / n, p5, p95, hot: hot / n };
  };
  const s0 = stats(1, 1), T = floorL + (mine ? 32 : 15) / 255;
  if (s0.mean >= T || (!mine && s0.mean >= floorL)) return none;
  const bMax = mine ? 2.6 : 1.8, cMax = mine ? 1.5 : 1.25;
  // the lowest contrast that passes the guards at brightness b (the highest mean there), or null
  const at = (b) => {
    for (let con = 1; con <= cMax + 1e-9; con += 0.05) {
      const q = stats(b, con);
      if (q.p5 > s0.p5 + 4 / 255 || q.p5 < s0.p5 - 6 / 255 || q.hot > s0.hot + 0.015 || q.p95 > Math.max(s0.p95, Math.min(0.72, s0.p95 + 64 / 255)) || q.mean > T) continue;
      return { b, c: con };
    }
    return null;
  };
  let lo = 1, hi = bMax, best = none;
  const top = at(bMax);
  if (top) return top;
  for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2, r = at(mid); if (r) { best = r; lo = mid; } else hi = mid; }
  return best.b > 1.01 ? { b: +best.b.toFixed(3), c: +best.c.toFixed(2) } : none;
}
/** The picture a figure stands as: its 2x file where the screen shows more than its 1x holds, else its 1x. */
const viewSrc = (v, cssH, dpr) => new URL(cssH * dpr * 1.15 > v.h / 2 ? v.src : v.lo, FIGURES).href;

// ============================================================ geometry (MODES.md section 4), board px
/** What each side's three figures take on the floor in its view (ground.js `envelope`), so the duel is solved for the
 *  battle's own cards and the two sides never overlap whichever card stands. */
export function envelopes(man, view, leaders, caps = FIG) {
  const ids = (s) => view.sides[s].team.map((f) => f.id);
  // (each card as it stands now: a form card's opening form, round 6 fix H1)
  const keys = (s) => view.sides[s].team.map((f) => formKey(f) ?? (f.id === 'princeton-td' && man.figures[f.id]?.forms?.[PTD_PLAIN] ? PTD_PLAIN : null));
  const near = envelope(man.figures, ids('player'), VIEW.player, caps, keys('player')), far = envelope(man.figures, ids('rival'), VIEW.rival, caps, keys('rival'));
  // and what each leader takes in every pose of its side (yours the back row, the rival's the front rows)
  const t = leaders.map((id) => leaderData(id));
  // (yours also pose by pose, each kept from reaching farther toward its figure than its rest, leaders.js backInward)
  const lead = t[0] && t[1] ? { near: leaderEnv(t[0], POSE.rearIdle, [12, 13, 14, 15]), far: leaderEnv(t[1], POSE.idle, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) } : null;
  // (`remake`: the same sides at smaller caps, for a floor that cannot stand them at full size, ground.js capSteps)
  return near && far ? { near, far, lead, caps, key: `${ids('player')}|${ids('rival')}|${keys('player')}|${keys('rival')}|${leaders}|${caps.tall}`, remake: (c) => envelopes(man, view, leaders, c) } : null;
}
const duels = new Map();
const duelKey = (ground, W, H, env) => `${ground.map}|${W}|${H}|${env?.key ?? ''}`;
/** A new task at once (a message, never a clamped timer), so a boot's solve in 4 ms slices costs no idle waits. */
const yieldTask = () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
/** An idle moment (a frame's spare time), for a solve while another mode's battle plays: its slices never crowd a
 *  frame of the battle on screen. */
const yieldIdle = () => new Promise((r) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(() => r(), { timeout: 600 }) : setTimeout(r, 16)));
/** Solve the duel for this window ahead of its first frame, a step a task (ground.js stageAsync), so the search never
 *  makes a long task; `geometry` then finds it solved. */
const solving = new Map();
export async function solveDuel(W, H, ground, env, pause = yieldTask) {
  const key = duelKey(ground, W, H, env);
  if (duels.has(key)) return;
  // one solve a key: a switch that comes while the warm-up still solves waits on that solve
  if (!solving.has(key)) solving.set(key, stageAsync(ground, stageFrame(frameOf(W, H), env), pause, env?.remake).then((set) => { if (!duels.has(key)) duels.set(key, set); solving.delete(key); }));
  await solving.get(key);
}
/** Is the duel for this window solved (so `geometry` takes no search)? */
export const solved = (W, H, ground, env) => duels.has(duelKey(ground, W, H, env));
/** The frame (rails and console), the map's fit, the floor's projection and the duel on it, for this window. */
export function geometry(W, H, ground, env = null) {
  const g = frameOf(W, H);
  g.ground = ground;
  const key = duelKey(ground, W, H, env);
  if (!duels.has(key)) duels.set(key, stage(ground, stageFrame(g, env), env?.remake));
  const set = duels.get(key);
  // the caps and the sides' envelopes the duel stands at (smaller than the class's where the floor needed it)
  g.caps = set.caps ?? env?.caps ?? capsOf(W);
  env = set.env ?? env;
  g.map = set.map; g.P = set.P; g.at = set.at;
  g.Hf = floorH(g.P);
  const d = g.duel = set.d;
  // the duel axis on the floor, from your figure to the rival's, and across it (to the right of the axis)
  const ax = d.far.X - d.near.X, az = d.far.Z - d.near.Z, al = Math.hypot(ax, az) || 1;
  g.u = [ax / al, az / al]; g.v = [g.u[1], -g.u[0]];
  const stand = (p) => ({ X: p.X, Z: p.Z, ...project(g.P, p.X, p.Z), k: ppm(g.P, p.X, p.Z) });
  g.st = { player: stand(d.near), rival: stand(d.far) };
  g.ld = { player: stand(d.yl), rival: stand(d.rl) };
  g.foot = { player: { x: g.st.player.x, y: g.st.player.y }, rival: { x: g.st.rival.x, y: g.st.rival.y } };
  g.lead = { player: { x: g.ld.player.x, y: g.ld.player.y }, rival: { x: g.ld.rival.x, y: g.ld.rival.y } };
  // the largest box a figure of the side may take, standing on its foot
  g.box = {};
  for (const s of SIDES) {
    const f = g.st[s], e = env?.[s === 'player' ? 'near' : 'far'] ?? { l: FIG.w / 2, r: FIG.w / 2, t: FIG.h, b: 0 };
    g.box[s] = { x: f.x - e.l * f.k, y: f.y - e.t * f.k, w: (e.l + e.r) * f.k, h: (e.t + Math.max(0, e.b)) * f.k };
  }
  // every card's opaque box in every view and form it may stand on the side's foot (what a plate never covers, H2)
  g.obox = {};
  for (const s of SIDES) { const f = g.st[s], e = env?.[s === 'player' ? 'near' : 'far']; g.obox[s] = (e?.oboxes ?? []).map((o) => ({ x: f.x - o.l * f.k, y: f.y - o.t * f.k, w: (o.l + o.r) * f.k, h: (o.t + o.b) * f.k })); }
  g.letterbox = set.scale < 1;
  g.k = g.ld.player.k / ATLAS_PER_M;
  /** A floor point off a stand: `a` metres along the duel axis, `b` across it. */
  g.off = (s, a, b) => { const f = g.st[s]; return { X: f.X + g.u[0] * a + g.v[0] * b, Z: f.Z + g.u[1] * a + g.v[1] * b }; };
  g.pt = (p) => project(g.P, p.X, p.Z);
  // for the auras (arena/aura.js): a floor element's homography from its own px (S a metre) at floor (X, Z)
  g.S = S;
  g.floorBox = (X, Z, w, d) => floorBox(g, X, Z, w, d);
  return g;
}
/** The floor element's homography: its own px (S a metre, `w` by `d` metres, its top left at floor (X0, Z0 + d)) to
 *  board px. */
function floorBox(g, X0, Z0, w, d) {
  return matrix3d(mul3(g.Hf, [[1 / S, 0, X0 - w / 2], [0, -1 / S, Z0 + d / 2], [0, 0, 1]]));
}
const poly = (pts) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

export class ArenaBoard extends Layout {
  constructor() {
    super();
    this.reactions = [];
    this.figs = new Map();
    this.shown = { player: null, rival: null };
    this.revealed = new Set();
    this.cam = { x: 0, y: 0, k: 1 };
    this.leaders = {};
    this.mode = 'arena';
    this.falling = new Set();
    /** The cards in flight between a hand and a pad: neither in the hand nor standing. */
    this.away = new Set();
    this.hands = {};
    /** The idle loops (each figure's body verb, your leader's breath): infinite, so kept out of `motion.running` (a
     *  skip would finish them) and in `Aura.running`, paused and played with the auras. */
    this.idles = new Set();
    /** Why the living layer (auras, idles, the tower's live frames) is paused: hold, hidden, a covering scene. */
    this.still = new Set();
  }
  /** The two leaders' atlases, the map, its floor and the six figures in their side's view, decoded. */
  async prepare(ctx) {
    const map = mapOf(ctx);
    // Princeton TD's tower module, only when a team holds it (ROUND6.md section 3.1)
    const ptd = SIDES.some((s) => ctx.view.sides[s].team.some((f) => f.id === 'princeton-td'));
    const [, , ground, man, mod] = await Promise.all([loadLeaders(ctx.leaders), decode(mapSrc(map)).ready, loadGround(map), loadFigures(), ptd ? import('./ptd-figure.js').catch(() => null) : null]);
    this.gd = ground; this.man = man; this.ptdMod = mod;
    this.env = envelopes(man, ctx.view, ctx.leaders, capsOf(innerWidth));
    // (a boot solves between tasks; the other mode's battle, warming this one, only in idle time)
    await solveDuel(innerWidth, innerHeight, ground, this.env, ctx.dealing ? yieldTask : yieldIdle);
    const g = geometry(innerWidth, innerHeight, ground, this.env);
    const dpr = devicePixelRatio || 1, list = [];
    for (const s of SIDES) for (const f of ctx.view.sides[s].team) {
      const m = man.figures[f.id];
      if (m) list.push(viewSrc(formView(m, VIEW[s], formKey(f)), g.box[s].h, dpr));
    }
    await Promise.all(list.map((src) => decode(src).ready));
    // before a deal, the hands' six cards are printed ahead into an unseen box at their size, one a task, so the
    // boot's mount only places what is already printed (a mode switch prints at its mount); as the Mat does
    this.printed = new Map();
    if (ctx.dealing) {
      const { w, h } = this.handSize(g), hold = el('div', 'arena-print', document.body);
      for (const s of SIDES) for (const f of ctx.view.sides[s].team) {
        await yieldTask();
        const box = el('div', '', hold);
        box.style.cssText = `position:absolute;width:${w}px;height:${h}px`;
        this.printed.set(f.uid, K.cardParts(f.id, { size: 'mini', back: false, live: false, parent: box }));
      }
      await yieldTask();
      this.printHold = hold;
    }
  }

  // ---------------------------------------------------------------- mount: the set, the floor, the six figures, two leaders
  mount(host, ctx) {
    this.ctx = ctx; this.host = host;
    this.view = ctx.view;
    queueMicrotask(() => { this.printHold?.remove(); this.printHold = null; });
    document.documentElement.dataset.theme = 'dark';
    this.map = mapOf(ctx);
    // the seam awaits prepare before a mount, so the floor and the figures' manifest are in hand
    this.gd ??= groundNow(this.map); this.man ??= figuresNow;
    if (!this.gd || !this.man) throw new Error('arena: mount before prepare');
    this.env ??= envelopes(this.man, this.view, ctx.leaders, capsOf(innerWidth));
    const h = host;
    h.textContent = '';
    h.setAttribute('aria-label', txt('arena.aria'));
    h.dataset.map = this.map;
    this.camEl = el('div', 'arena-cam', h);
    this.shakeEl = el('div', 'arena-shake', this.camEl);
    // the painting and everything on its floor are one picture under one camera
    this.mapImg = el('img', 'arena-map', this.shakeEl);
    this.mapImg.alt = ''; this.mapImg.decoding = 'async'; this.mapImg.src = mapSrc(this.map);
    this.floorEl = el('div', 'arena-floor', this.shakeEl);
    // each card's floor matter (its aura's ground, arena/aura.js) lies on the painting under its pad's rim
    this.matter = el('div', 'arena-matter', this.floorEl);
    this.groundSvg = sv('svg', { class: 'arena-svg arena-ground' }, this.shakeEl);
    this.padG = {};
    // on a deal the pads start hidden, as drawSides marks them a moment later (REQUESTS :62; they faded out at the reveal)
    for (const s of SIDES) this.padG[s] = sv('g', { class: 'arena-pad', 'data-side': s, ...(this.ctx.dealing ? { 'data-on': 'false' } : {}) }, this.groundSvg);
    this.decals = el('div', 'arena-decals', this.floorEl);
    this.shadows = el('div', 'arena-shadows', this.floorEl);
    this.rings = el('div', 'arena-rings', this.shakeEl);
    // what flies at the far figure passes behind the near one (specials pick it by the target's foot, `layerFor`)
    this.fxBack = el('div', 'arena-fx arena-fx-back', this.shakeEl);
    this.fxBackSvg = sv('svg', { class: 'arena-svg arena-fxsvg' }, this.fxBack);
    this.actors = el('div', 'arena-actors', this.shakeEl);
    this.fx = el('div', 'arena-fx', this.shakeEl);
    this.fxSvg = sv('svg', { class: 'arena-svg arena-fxsvg' }, this.fx);
    this.quotes = el('div', 'arena-quotes', this.shakeEl);
    this.haze = el('i', 'arena-haze', h);
    this.fly = el('div', 'arena-fly', h);
    // the painting's light on each side (a colour matrix per stand, applied to its figure and its leader)
    this.defs = sv('svg', { class: 'arena-defs', width: 0, height: 0, 'aria-hidden': 'true' }, h);
    this.grades = {};
    for (const s of SIDES) {
      const f = sv('filter', { id: `ag-${s}`, x: 0, y: 0, width: 1, height: 1, 'color-interpolation-filters': 'sRGB' }, this.defs);
      this.grades[s] = sv('feColorMatrix', { type: 'matrix', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0' }, f);
    }
    this.ringEls = {};
    for (const s of SIDES) {
      const box = el('div', 'floor-at', this.rings);
      this.ringEls[s] = { box, ring: el('i', 'pad-ring', box), shield: el('i', 'pad-shield', box) };
      // the foundation a tower is built on: a dashed ring drawn round the pad (cue('transform'))
      const build = sv('svg', { class: 'pad-build', viewBox: '0 0 100 100', 'aria-hidden': 'true' }, box);
      this.ringEls[s].build = sv('circle', { cx: 50, cy: 50, r: 46, pathLength: 1 }, build);
    }
    // the clock a timed board step runs on: an empty Web Animation, so a press lands it and a dialog holds it
    this.clockEl = el('i', 'arena-clock', h);

    const v = this.view;
    for (const s of SIDES) v.sides[s].team.forEach((f, i) => this.figs.set(f.uid, this.makeFigure(s, f, i)));
    // the leaders; their quotes live in the quote layer, above every actor; each casts its shadow on the floor
    for (const [i, s] of SIDES.entries()) {
      const L = this.leaders[s] = new Leader(this.actors, ctx.leaders[i], s, { reduced: () => this.reduced(), frozen: ctx.frozen, said: ctx.said, onQuote: ctx.onQuote, quoteLayer: this.quotes, quoteAt: (l) => this.quoteAt(l), onPose: (l) => this.leaderShadow(l) });
      L.sprite.style.setProperty('--m', `url("${L.atlas}")`);
      L.sprite.style.filter = `url(#ag-${s})`;
      el('i', 'lit-shade', L.sprite); el('i', 'lit-rim', L.sprite);
      const gr = el('div', 'fig-ground', this.shadows);
      L.ground = { el: gr, ao: el('i', 'shadow-ao', gr), cast: el('i', 'lead-cast', gr) };
      L.ground.cast.style.backgroundImage = `url("${L.atlas}")`;
    }
    for (const s of SIDES) this.hands[s] = this.makeHand(s);
    this.buildRail(ctx.leaders);
    if (!ctx.dealing) for (const s of SIDES) this.revealed.add(v.sides[s].team[v.sides[s].active].uid);
    // a boot that mounts unseen in steps (ctx.split, shared/battle.js) lays the board out in `set`, a task later
    if (ctx.split) this.pending = true; else this.settle();
    // a hidden tab stills the living layer (the auras, the idles, the tower)
    this.onVis = () => this.living('hidden', document.hidden);
    document.addEventListener('visibilitychange', this.onVis);
    // reduced motion turned on (or off) mid-battle: the idles, your leader's breath and the auras go to their rest
    // frame at once (or come back), with no reload
    this.mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    this.onMq = () => this.living('reduced', Boolean(this.mq?.matches));
    this.mq?.addEventListener?.('change', this.onMq);
    this.watchBusy();
  }
  /** The mounted board laid out on the floor, and the leaders breathing; each card's aura is set up one an idle task
   *  after the deal (never in a prepared frame). */
  settle() {
    this.pending = false;
    this.layout();
    for (const s of SIDES) this.leaders[s].breathe();
    this.leaderIdle();
    this.mountAuras();
  }
  /** A figure: the card's project in its side's view, standing on its foot; its shadows lie on the floor beneath. */
  makeFigure(side, f, i) {
    const fig = { side, uid: f.uid, id: f.id, slot: i };
    fig.el = el('div', 'fig', this.actors);
    fig.el.dataset.side = side; fig.el.dataset.card = f.id; fig.el.dataset.view = VIEW[side];
    fig.el.hidden = true;
    fig.el.style.setProperty('--c', K.accent(f.id));
    fig.el.dataset.body = fig.cls = classOf(f.id);
    fig.verbs = verbsOf(f.id);
    fig.idleAt = breathOf(f.id, i);
    fig.body = el('div', 'fig-body', fig.el);
    // the card it wears (arena/aura.js fills these): its pieces' back copies behind the picture, front copies before
    // it; outside the picture's grade (they are lit by their own colour), inside the body (every move carries them)
    fig.auraBack = el('div', 'aura-back', fig.body);
    fig.breath = el('div', 'fig-breath', fig.body);
    fig.breath.style.filter = `url(#ag-${side})`;
    fig.img = el('img', 'fig-img', fig.breath);
    fig.img.alt = ''; fig.img.decoding = 'async'; fig.img.draggable = false;
    fig.shade = el('i', 'lit-shade', fig.breath);
    fig.rim = el('i', 'lit-rim', fig.breath);
    fig.flash = el('img', 'fig-flash', fig.breath);
    fig.flash.alt = ''; fig.flash.draggable = false;
    fig.auraFront = el('div', 'aura-front', fig.body);
    // its floor matter (under the pads, on the painting) and the front half of its floor rings (passing before it)
    fig.matter = el('div', 'fig-matter', this.matter);
    fig.matter.hidden = true;
    fig.ringFront = el('div', 'fig-ring-front', this.actors);
    fig.ringFront.hidden = true;
    const gr = el('div', 'fig-ground', this.shadows);
    gr.hidden = true;
    fig.ground = { el: gr, ao: el('i', 'shadow-ao', gr), cast: el('img', 'fig-cast', gr) };
    fig.ground.cast.alt = '';
    return fig;
  }
  /** Shown or not: the figure, its shadows, its floor matter and rings together; a benched figure's aura and idle rest. */
  showing(fig, on) {
    // (fix pass 2 H8: a card in flight to its pad keeps its figure unseen whatever redraws the board meanwhile, a
    // snapshot's `set` too, until `throwIn` lets it rise)
    if (on && fig.arriving) on = false;
    fig.el.hidden = !on; fig.ground.el.hidden = !on; fig.matter.hidden = !on; fig.ringFront.hidden = !on;
    if (on) this.idle(fig); else this.idle(fig, false);
    fig.aura?.pause(!on || this.still.size > 0);
    fig.ptd?.pause(!on || this.still.size > 0);
  }
  /** A leader's hand: the side's three cards as real cards (the gallery's mini print), each with its HP on a die-cut
   *  tab in its colour; the one standing on the pad is out of the hand, and a card that is out lies face down in it.
   *  Your bench cards are buttons that open Switch with that card chosen, as the Mat's bench wells are. */
  makeHand(side) {
    const box = el('div', 'hand', this.actors);
    box.dataset.side = side;
    const cards = new Map();
    this.view.sides[side].team.forEach((f, i) => {
      const c = el(side === 'player' ? 'button' : 'div', 'hcard', box);
      c.dataset.uid = f.uid; c.dataset.in = 'false';
      if (side === 'player') { c.type = 'button'; c.tabIndex = -1; c.addEventListener('click', () => this.ctx.onBench?.(i)); }
      c.style.setProperty('--c', K.accent(f.id));
      const pre = this.printed?.get(f.uid);
      if (pre) { this.printed.delete(f.uid); c.append(pre.root); } else K.cardParts(f.id, { size: 'mini', back: false, live: false, parent: c });
      el('i', 'hcard-back', c);
      const tab = el('b', 'hcard-hp', c);
      tab.style.setProperty('--tab', K.accent(f.id));
      tab.style.setProperty('--tab-ink', inkOn(K.accent(f.id)));
      cards.set(f.uid, { el: c, tab, id: f.id, i, hp: -1 });
    });
    // the cards' own print lays itself out again when its face and its pictures arrive: they show once all have, so
    // nothing in a hand shifts on screen
    const pics = [...box.querySelectorAll('img')].filter((im) => !im.complete);
    // (the HP tab's own face too, Katagami Sans 800: a tab whose face lands late widens and shifts)
    if (pics.length || !document.fonts.check('700 1em "Katagami Sans Cards"') || !document.fonts.check('800 1em "Katagami Sans"')) {
      box.style.visibility = 'hidden';
      Promise.all([document.fonts.load('700 1em "Katagami Sans Cards"').catch(() => {}), document.fonts.load('800 1em "Katagami Sans"').catch(() => {}), ...pics.map((im) => im.decode().catch(() => {}))])
        .then(() => requestAnimationFrame(() => { box.style.visibility = ''; }));
    }
    return { el: box, cards };
  }
  buildRail(leaders) {
    const r = this.ctx.rail;
    r.textContent = '';
    r.hidden = false;
    this.rail = {};
    for (const [i, s] of SIDES.entries()) {
      const box = el('div', 'team', r);
      box.dataset.side = s;
      const t = leaderData(leaders[i]);
      const name = el('p', 'team-lead', box);
      el('b', '', name, t.name);
      el('span', '', name, t.title);
      name.style.setProperty('--accent', t.accent);
      const ol = el('ol', 'pips', box);
      const pips = this.view.sides[s].team.map((f) => {
        const li = el('li', 'pip', ol);
        li.dataset.uid = f.uid;
        li.style.setProperty('--c', K.accent(f.id));
        // (the card's colours, never its ground picture: the Arena decodes no grounds/<id>.webp, ROUND6.md M4)
        const face = el('i', 'pip-face', li), hue = hueOf(f.id);
        face.style.backgroundImage = `radial-gradient(circle at 50% 38%, ${hue.energy}, ${hue.deep ?? 'oklch(18% 0.02 70)'} 78%)`;
        const im = el('img', 'pip-sub', face);
        im.alt = ''; im.decoding = 'async'; im.src = SUBJECT_1X(K.subjectOf(f.id).src);
        el('i', 'pip-back', li);
        const ticks = el('i', 'pip-ticks', li);
        for (let k = 0; k < 10; k++) el('i', '', ticks);
        const lab = el('span', 'sr', li, '');
        return { li, ticks, lab, uid: f.uid, id: f.id };
      });
      this.rail[s] = { box, pips };
      if (i === 0) this.turnEl = el('b', 'team-turn', r);
    }
    r.append(this.rail.rival.box);
  }

  // ---------------------------------------------------------------- layout: every box from the floor, no motion
  /** Where each side's plate stands (round 5, shared/hud.js): the rival's top right under the rail, yours right above
   *  the console. */
  plateBox(side) {
    const g = this.g;
    if (!g) return null;
    // a phone: a one-line plate under the team rail for the rival, over the console for you
    if (g.phone) return side === 'rival' ? { x: 8, y: g.rail + g.team + 4, w: g.W - 16, strip: true } : { x: 8, bottom: g.con.y - 6, w: g.W - 16, strip: true };
    const w = g.W >= 1280 ? 272 : 244;
    // the rival's over its own half of the floor (the right), clear of your hand at the top left
    if (side === 'rival') { const p = this.rivalAt ?? rivalPlate(g); return { x: p.x, y: p.y, w: p.w }; }
    const p = deskPlate(g);
    return { x: p.x, bottom: p.bottom, w: p.w };
  }
  logBox() { return this.g?.log ?? null; }
  /** Round 6: the rival's plate stands under the rail where it covers neither hero (nor the card it wears, a tenth
   *  round its box) nor either leader in any pose: its usual spot if that is clear, else the clearest of its spots
   *  over the rival's half (ground.js rivalSpots, the same the duel was solved against; test 11: no HUD over a figure),
   *  so the plate never crosses to your half. */
  placeRivalPlate() {
    const g = this.g;
    if (!g || g.phone) return null;
    const p0 = rivalPlate(g), avoid = [];
    for (const s of SIDES) { const b = g.box[s], m = 0.1; avoid.push({ x: b.x - m * b.w, y: b.y - m * b.h - 28, w: b.w * (1 + 2 * m), h: b.h * (1 + 2 * m) + 28, k: 10 }); const r = this.reach(s); avoid.push({ ...r, k: 10 }); }
    // (round 6 fix H2: never over a rival card's opaque box, its reticle 8% round it or 10 px over its head, in any form)
    for (const o of g.obox.rival ?? []) avoid.push({ x: o.x - 0.08 * o.w, y: o.y - 0.08 * o.h - 10, w: o.w * 1.16, h: o.h * 1.08 + 10, k: 1e4 });
    const you = deskPlate(g);
    avoid.push({ x: you.x, y: you.bottom - you.h, w: you.w, h: you.h, k: 10 });
    // (and the hands' top corners, where a crowded duel's hands wait)
    const hs = this.handSize(g);
    avoid.push({ x: 0, y: g.rail, w: 24 + hs.bw + 24, h: hs.bh + 40, k: 40 }, { x: (g.log ? g.log.x : g.W) - 24 - hs.bw - 24, y: g.rail, w: hs.bw + 48, h: hs.bh + 40, k: 40 });
    const lap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    let best = null;
    for (const r of rivalSpots(g)) {
      const c = avoid.reduce((n, b) => n + b.k * lap(r, b), 0) + Math.abs(r.x - p0.x) * 0.5 + (r.y - p0.y) * 4;
      if (!best || c < best.c) best = { c, r };
    }
    return best?.r ?? p0;
  }
  /** The turn the battle is waiting on (round 5), on the team rail. */
  turnTo(n) { if (!this.turnEl) return; const t = txt('turn.short', { n }); if (this.turnEl.textContent !== t) this.turnEl.textContent = t; this.turnEl.setAttribute('aria-label', txt('log.turn', { n })); }
  layout() {
    const W = innerWidth, H = innerHeight;
    // a turned or resized window: the phone class may change the map (PHONE_SKIP) and the figures' caps, and a new
    // size's duel is solved a slice a task (REQUESTS :7); the board keeps its old geometry until both have landed
    const map = mapOf(this.ctx, W), caps = capsOf(W);
    if (map !== this.map || caps !== this.env?.caps || !solved(W, H, this.gd, this.env)) {
      if (this.g && !this.pending) return this.relayout(W, H, map, caps);
      if (map !== this.map) this.useMap(map, groundNow(map) ?? this.gd);
      if (caps !== this.env?.caps) this.env = envelopes(this.man, this.view, this.ctx.leaders, caps);
    }
    return this.layoutNow();
  }
  /** The new size's map and duel, solved off the frame, then laid out (the latest request wins). */
  async relayout(W, H, map, caps) {
    const n = (this.relayoutN = (this.relayoutN ?? 0) + 1);
    const ground = map === this.map ? this.gd : await Promise.all([loadGround(map), decode(mapSrc(map)).ready]).then(([gd]) => gd).catch(() => null);
    if (n !== this.relayoutN || !ground || !this.host?.isConnected) return;
    const env = caps === this.env?.caps ? this.env : envelopes(this.man, this.view, this.ctx.leaders, caps);
    await solveDuel(W, H, ground, env, yieldTask);
    if (n !== this.relayoutN || !this.host?.isConnected || innerWidth !== W || innerHeight !== H) return;
    if (map !== this.map) this.useMap(map, ground);
    this.env = env;
    this.layoutNow();
    // the HUD places its plates against the new geometry: through the battle's own hook when it passes one, else by
    // the resize the battle already answers (its handler finds this size solved and lays out at once)
    if (this.ctx.onLayout) this.ctx.onLayout(); else dispatchEvent(new Event('resize'));
  }
  useMap(map, ground) {
    this.map = map; this.gd = ground;
    this.host.dataset.map = map;
    this.mapImg.src = mapSrc(map);
  }
  layoutNow() {
    const ground = this.gd;
    const g = this.g = geometry(innerWidth, innerHeight, ground, this.env);
    const st = document.documentElement.style;
    for (const [k, v] of Object.entries({ '--rail-h': g.rail, '--team-h': g.team, '--console-x': g.con.x, '--console-y': g.con.y, '--console-w': g.con.w, '--console-h': g.con.h })) st.setProperty(k, `${v}px`);
    this.clothWidth = null;
    const { W, H } = g;
    this.host.dataset.phone = g.phone ? 'true' : 'false';
    this.host.dataset.letterbox = g.letterbox ? 'true' : 'false';
    this.host.style.setProperty('--tw', `${g.tw}px`);
    this.host.style.setProperty('--th', `${g.th}px`);
    Object.assign(this.mapImg.style, { width: `${g.map.w}px`, height: `${g.map.h}px`, transform: `translate3d(${g.map.x}px,${g.map.y}px,0)` });
    for (const svg of [this.groundSvg, this.fxSvg]) { svg.setAttribute('width', String(W)); svg.setAttribute('height', String(H)); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); }
    // the painting's light, per stand: the figure and the leader on each side take the same grade
    this.light = {};
    for (const s of SIDES) {
      const L = this.light[s] = grade(ground, s === 'player' ? 'near' : 'far', g.phone);
      // round 6 fix H7: your side stands in a rest key light (the grade's gain 1.18), so your hero reads brighter than
      // the floor it stands on, a dark tank too (fix pass 2 H2: no lift on the offsets, which raised its blacks and read
      // milky, a fainted fighter)
      const M = s === 'player' ? L.matrix.map((v, i) => (i < 15 && i % 5 === Math.floor(i / 5) ? v * 1.18 : v)) : L.matrix;
      this.grades[s].setAttribute('values', M.map((v) => +v.toFixed(4)).join(' '));
      (this.gradeM ??= {})[s] = M;
    }
    const shadowA = clamp(0.3 + 0.07 * (ground.light.key.strength ?? 3), 0.45, 0.62);
    this.host.style.setProperty('--shadow-a', shadowA.toFixed(2));
    for (const s of SIDES) this.buildPad(s);
    for (const fig of this.figs.values()) this.placeFigure(fig);
    for (const fig of this.figs.values()) this.aim(fig, 0);
    // the leaders at the floor's scale where they stand (atlas px drawn nearest-neighbour, never smoothed), each with
    // its footprint's shade and its pose's shadow on the floor
    for (const s of SIDES) {
      const L = this.leaders[s], at = g.ld[s];
      L.place(g.lead[s], at.k / ATLAS_PER_M);
      L.el.style.zIndex = String(R(at.y));
      L.el.dataset.k = String(+L.k.toFixed(4));
      this.light2(L.sprite, this.light[s], Math.max(1, L.k));
      Object.assign(L.ground.ao.style, { width: `${0.8 * S}px`, height: `${0.5 * S}px`, transform: floorBox(g, at.X, at.Z, 0.8, 0.5) });
    }
    this.rivalAt = this.placeRivalPlate();
    for (const s of SIDES) this.placeHand(s);
    if (this.view) this.drawSides(this.view);
    // the camera at rest (k 1: the duel is composed at the heroes' size)
    this.camTo(this.restCam(), 0);
    if (!this.pending && this.leaders.player && this.leadAt !== undefined && this.leadAt !== `${this.leaders.player.foot.x}|${this.leaders.player.foot.y}`) this.leaderIdle();
  }
  /** The painting's light on a picture: the side toward the key lit in its colour, the other in shade, and a rim of
   *  the key on the edges that face it (the picture's own alpha, shifted toward the light, cut away). */
  light2(e, L, d) {
    const ang = (Math.atan2(L.toward[0], -L.toward[1]) * 180) / Math.PI;
    e.style.setProperty('--la', `${ang.toFixed(1)}deg`);
    e.style.setProperty('--key', L.key);
    e.style.setProperty('--rx', `${(-L.toward[0] * d).toFixed(2)}px`);
    e.style.setProperty('--ry', `${(-L.toward[1] * d).toFixed(2)}px`);
    e.style.setProperty('--shade-a', (0.12 + 0.12 * L.back).toFixed(3));
    e.style.setProperty('--rim-a', (0.34 + 0.3 * L.back).toFixed(3));
  }
  /** A pad: a square on the floor under the figure, its edges along the duel axis and across, as wide as the pad's
   *  circle allows; its rim is the HP in 20 segments, 5 an edge, clockwise from the far corner, drawn on the floor in
   *  its perspective (thinner where the floor is farther). */
  buildPad(s) {
    const g = this.g, G = this.padG[s];
    G.textContent = '';
    const P = (this.pad ??= {})[s] = { segs: [] };
    const a = PAD / Math.SQRT2;
    const square = (h) => {
      const c = [[h, h], [h, -h], [-h, -h], [-h, h]].map(([p, q]) => g.pt(g.off(s, p, q)));
      // clockwise on screen from the far corner (the one highest on screen)
      const f = g.foot[s];
      c.sort((A, B) => Math.atan2(A.x - f.x, -(A.y - f.y)) - Math.atan2(B.x - f.x, -(B.y - f.y)));
      const top = c.reduce((m, p, i) => (p.y < c[m].y ? i : m), 0);
      return [...c.slice(top), ...c.slice(0, top)].map((p) => [p.x, p.y]);
    };
    P.corners = square(a);
    P.fill = sv('polygon', { class: 'pad-fill', points: poly(P.corners) }, G);
    P.edge = sv('polygon', { class: 'pad-edge', points: poly(square(a * 0.84)) }, G);
    const D = square(a + 0.07);
    const k0 = g.st[s].k, base = g.phone ? 3.5 : 6;
    for (let e = 0; e < 4; e++) {
      const A = D[e], B = D[(e + 1) % 4];
      for (let i = 0; i < 5; i++) {
        const t0 = (i + 0.08) / 5, t1 = (i + 0.92) / 5;
        const x1 = lerp(A[0], B[0], t0), y1 = lerp(A[1], B[1], t0), x2 = lerp(A[0], B[0], t1), y2 = lerp(A[1], B[1], t1);
        // the stroke as wide as the floor is near: a segment's width follows the floor's scale at its middle
        const mid = unproject(g.P, (x1 + x2) / 2, (y1 + y2) / 2), w = base * clamp(ppm(g.P, mid.X, mid.Z) / k0, 0.6, 1.4);
        P.segs.push(sv('line', { class: 'pad-seg', x1, y1, x2, y2, 'stroke-width': w.toFixed(2) }, G));
      }
    }
    P.front = P.corners.reduce((m, p) => (p[1] > m[1] ? p : m));
    const xs = P.corners.map((p) => p[0]), ys = P.corners.map((p) => p[1]);
    P.bbox = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    // the support ring and the Guard shield lie on the floor round the pad, and grow in its plane
    const f = g.st[s], r = this.ringEls[s];
    Object.assign(r.box.style, { width: `${2 * PAD * S}px`, height: `${2 * PAD * S}px`, transform: floorBox(g, f.X, f.Z, 2 * PAD, 2 * PAD) });
  }
  /** A figure stands on its foot at the floor's scale there: its opaque box covers 2.4 square metres (a tall one at
   *  most 1.6 m high, a wide one at most 2 m across), the larger of its two views deciding, so a card is one size
   *  whichever side it is on, and the far one is smaller by the floor's depth alone. */
  /** Round 6 fix H7, your hero's rest key: the side's grade lifts every figure on your side; a subject whose own mean
   *  luma, graded, still stands under its floor's plus 32 (of 255; the map's floor sample reads about 10 under the
   *  painting round the foot) takes a brightness on its picture up to that, at most 2 (Claude of Tanks on the foundry's
   *  dark floor), so a dark hero reads off the floor it stands on. A lighter
   *  hero keeps the grade alone. */
  // (fix pass 2 H2: a brightness under a contrast, solved as one line through two points, so the mean rises to its
  // target and the blacks hold: the graded 5th percentile lifts at most 4 grey, the contrast 1 to 1.5 (under 1 it would
  // lift them, over 1.5 it crushes them), the brightness at most 2.6. The rival takes the same key against its own floor, its own grade and no
  // 1.18 gain, so a dark rival reads off a dark forge and yours stays the brighter)
  keyLight(fig, src) {
    fig.keySrc = src;
    const g = this.g, s = fig.side, M = this.gradeM?.[s], floor = this.gd?.light?.at?.[g.phone ? 'phone' : 'desktop']?.[s === 'player' ? 'near' : 'far'];
    if (!M || !floor) return;
    meanColour(src).then((c) => {
      if (!c || fig.keySrc !== src || !fig.breath?.isConnected) return;
      const k = keySolve(c, M, luma(hexRGB(floor)), s === 'player');
      fig.keyLit = k.b;
      fig.breath.style.filter = k.b > 1.01 ? `url(#ag-${s}) brightness(${k.b.toFixed(3)}) contrast(${k.c.toFixed(3)})` : `url(#ag-${s})`;
      fig.breath.dataset.key = k.b.toFixed(3);
    });
  }
  placeFigure(fig) {
    const g = this.g, st = g.st[fig.side], m = this.man?.figures[fig.id];
    if (!m) return;
    // a form card stands its current form (its snapshot's key; Princeton TD with forms off, its Lab at Level 4B), at
    // the one scale every form shares
    const key = fig.key ?? (fig.id === 'princeton-td' && m.forms?.[PTD_PLAIN] ? PTD_PLAIN : null);
    const v = formView(m, VIEW[fig.side], key);
    fig.view = v;
    fig.mpp = figureMpp(m, g.caps, fig.side === 'rival');
    // (a form card's view at its drawn size: its growth compressed, ground.js formScale, round 6 fix H1)
    fig.fs = formScale(m, v, g.caps.formExp);
    const s = fig.mpp * fig.fs * st.k, w = v.w * s, h = v.h * s;
    const src = viewSrc(v, (v.box[3] - v.box[1]) * s, devicePixelRatio || 1);
    if (fig.img.getAttribute('src') !== src) { fig.img.src = src; fig.flash.src = src; fig.ground.cast.src = src; }
    fig.el.style.setProperty('--m', `url("${src}")`);
    this.keyLight(fig, src);
    fig.el.dataset.pixel = fig.ground.cast.dataset.pixel = m.pixel ? 'true' : 'false';
    fig.sub = { w: v.w, h: v.h };
    fig.s = s; fig.k = st.k;
    const ox = st.x - v.foot[0] * s, oy = st.y - v.foot[1] * s;
    fig.foot = { x: st.x, y: st.y };
    fig.box = { x: ox + v.box[0] * s, y: oy + v.box[1] * s, w: (v.box[2] - v.box[0]) * s, h: (v.box[3] - v.box[1]) * s };
    fig.w = fig.box.w; fig.h = st.y - fig.box.y;
    fig.el.dataset.mpp = String(+fig.mpp.toPrecision(6));
    Object.assign(fig.el.style, { width: `${w.toFixed(2)}px`, height: `${h.toFixed(2)}px`, transform: `translate3d(${ox.toFixed(2)}px,${oy.toFixed(2)}px,0)`, zIndex: String(R(st.y)) });
    const origin = `${(v.foot[0] * s).toFixed(1)}px ${(v.foot[1] * s).toFixed(1)}px`;
    fig.body.style.transformOrigin = origin; fig.breath.style.transformOrigin = origin;
    // the light: a pixel subject keeps whole cells in its rim
    const cell = m.pixel?.cell ? m.pixel.cell * s : 0;
    this.light2(fig.el, this.light[fig.side], cell ? Math.max(cell, 1.5) : Math.max(1.5, 0.016 * fig.h));
    // on the floor: its contact shade (its footprint) and its cast shadow along the key
    // (at the drawn scale, mpp times the form scale: a compressed Level 1 tower's shade is its drawn footprint)
    const gr = fig.ground, dm = fig.mpp * fig.fs, bw2 = ((v.base?.w ?? 0.6 * (v.box[2] - v.box[0])) * dm) / 2, bd = Math.max(0.25, ((v.base?.d ?? 0.3 * (v.box[2] - v.box[0])) * dm) / 2), lift = Math.max(0, v.foot[1] - v.box[3]) * dm;
    fig.lift = lift;
    Object.assign(gr.ao.style, { width: `${2 * bw2 * S}px`, height: `${2 * bd * S}px`, transform: floorBox(g, st.X, st.Z, 2 * bw2, 2 * bd), opacity: lift > 0.05 ? '0.55' : '1' });
    gr.el.style.transformOrigin = `${st.x.toFixed(1)}px ${st.y.toFixed(1)}px`;
    this.castShadow(gr.cast, st, w, h, v.foot[0] * s, v.foot[1] * s, Math.max(2, 0.03 * st.k));
    // its card on and round it, and its front floor ring sorted just before it
    fig.ringFront.style.zIndex = String(R(st.y) + 1);
    fig.matter.style.transformOrigin = `${st.x.toFixed(1)}px ${st.y.toFixed(1)}px`;
    fig.aura?.place(st, g);
    if (fig.ptd) this.placePtd(fig);
    if (!fig.el.hidden) this.idle(fig);
  }
  /** A picture's shadow on the floor: the picture turned to face the key (the silhouette the light sees, so a light
   *  from the side still throws a shadow with width), each of its px `m` metres up falling along the key to the floor
   *  (ground.js castAt). The picture maps to the floor by one homography (local px to board px). */
  castShadow(e, st, w, h, fx, fy, blur) {
    const g = this.g, k = st.k, c = castAt(g.ground, 0, 0, 1), [dx, dz] = g.ground.light.key.floor_dir;
    // across the light on the floor (p); (x, y) local px: u = (x - fx) / k across, m = (fy - y) / k up; the floor
    // point (X + u pX + m cX, Z + u pZ + m cZ)
    const pX = -dz, pZ = dx;
    const A = [[pX / k, -c.X / k, st.X - (pX * fx) / k + (c.X * fy) / k], [pZ / k, -c.Z / k, st.Z - (pZ * fx) / k + (c.Z * fy) / k], [0, 0, 1]];
    Object.assign(e.style, { width: `${w.toFixed(2)}px`, height: `${h.toFixed(2)}px`, transform: matrix3d(mul3(g.Hf, A)) });
    e.style.setProperty('--blur', `${blur.toFixed(1)}px`);
    e.style.setProperty('--fade', `${(fy / h * 100).toFixed(1)}%`);
  }
  /** A leader's pose casts its shadow too: the pose's own picture on the floor, from its foot (Leader onPose). */
  leaderShadow(l) {
    const gr = l.ground;
    if (!gr || !this.g || l.cur < 0) return;
    const g = this.g, st = g.ld[l.side], A = l.t.anchors[l.cur], k = l.k, cell = [96, 128];
    const cx = (l.cur % 4) * cell[0], cy = Math.floor(l.cur / 4) * cell[1];
    const st2 = gr.cast.style;
    st2.backgroundSize = `${384 * k}px ${512 * k}px`;
    st2.backgroundPosition = `${-cx * k}px ${-cy * k}px`;
    this.castShadow(gr.cast, st, cell[0] * k, cell[1] * k, (A[0] - cx) * k, (A[1] - cy) * k, Math.max(2, 0.03 * st.k));
  }
  /** Where a leader holds its hand: the card size (at least 64 px tall on a wide screen, 63 on a phone, so a card is a
   *  44 px target), and a spot by its leader, the first of these clear of both figures' largest boxes, their pads, the
   *  plates, the other leader and the frame's edges: at its hip on the outer side, under its feet, under its figure's
   *  pad, then at its hip on the inner side, each also slid inside the frame. The spot holds two cards side by side,
   *  each HP tab clear of the next card; a third (a card on its way back while its pad is empty) closes them up. */
  /** A hand's card size and the spot two cards side by side take. */
  handSize(g, rail = false) {
    // (a short phone, under 700 px tall, has no free corner beside the duel: its hands stand in the team rail, 46 px;
    // so does a taller phone's hand whose corner a hero reaches, `placeHand`)
    const h = g.phone ? (g.H < 700 || rail ? 46 : 63) : Math.max(64, R(g.th * 1.58)), w = R((h * 63) / 88);
    const f = Math.max(12, h * 0.2), step = R(Math.max(w * 0.62, 2.7 * f + 6));
    return { h, w, step, bw: w + step + R(h * 0.1), bh: h + R(h * 0.3) };
  }
  /** What a leader takes in every pose of its side (yours the back row, the rival's the front rows). */
  reach(t) {
    const L = this.leaders[t], bs = [];
    for (let p = t === 'player' ? 12 : 0; p < (t === 'player' ? 16 : 12); p++) bs.push(L.bounds(p));
    const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
    return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y };
  }
  placeHand(s, rail = false) {
    const g = this.g, H = this.hands[s];
    if (!H) return;
    // (fix pass 2 H1: a phone 412 px wide or less seats the rival's hand at its plate's end in the team rail, as a short
    // phone does (ruling 5): its cards never stand on the floor in front of your figure)
    if (!rail && s === 'rival' && rivalInRail(g)) return this.placeHand(s, true);
    const { h, w, step, bw, bh } = this.handSize(g, rail);
    const L = this.leaders[s], lb = L.bounds(s === 'player' ? POSE.rearIdle : POSE.idle);
    const outer = s === 'player' ? -1 : 1;
    const avoid = [];
    // every card's picture as it would stand on either pad, with room for its recoil, its lunge and its sink into
    // the pad (the hand stays put while cards come and go)
    // (round 6: a hand over a hero costs what one over a plate does, test 28's 0 px)
    for (const f of this.figs.values()) if (f.box) { const m = 0.12 * f.k; avoid.push({ x: f.box.x - m, y: f.box.y - m, w: f.box.w + 2 * m, h: f.box.h + 2 * m, k: f.side === s || g.phone ? 30 : 6 }); }
    // round 5: the HUD's plates stand all battle long (shared/hud.js); a hand keeps off them
    if (!g.phone) for (const t of SIDES) { const pb = this.plateBox(t); if (pb) avoid.push({ x: pb.x - 8, y: (pb.y ?? pb.bottom - 150) - 8, w: pb.w + 16, h: 166, k: 60 }); }
    // a phone's two plate strips (36 px each) are never under a hand either
    else for (const t of SIDES) { const pb = this.plateBox(t); if (pb) avoid.push({ x: pb.x - 4, y: (pb.y ?? pb.bottom - 36) - 4, w: pb.w + 8, h: 44, k: 60 }); }
    for (const t of SIDES) {
      const b = g.box[t], p = this.pad[t].bbox;
      avoid.push(b, { x: p.x - 8, y: p.y - 8, w: p.w + 16, h: p.h + 16 });
      // and both leaders in every pose: a hand is held beside its leader, never over it
      const rr = this.reach(t);
      avoid.push({ x: rr.x - 4, y: rr.y - 4, w: rr.w + 8, h: rr.h + 8, k: 60 });
    }
    const top = g.phone && (g.H < 700 || rail) ? g.rail : g.rail + g.team + (g.phone ? 48 : 8), bottom = g.con.y - 8;
    // round 5: from 1280 the log rail holds the right edge, so the frame's usable right edge is the rail's
    const right = g.log ? g.log.x - 8 : g.W - 8;
    if (g.log) avoid.push({ x: g.log.x - 8, y: 0, w: g.W, h: g.H, k: 60 });
    // on a wide screen a scene's call-out lands across the lower part of the frame, over the board, at rest and while
    // the camera whips onto either defender at a board ending (the call-out fades as the whip begins)
    if (!g.phone) {
      avoid.push({ x: 0, y: g.H * 0.7, w: g.W, h: g.H * 0.3 });
      for (const t of SIDES) {
        const b = g.box[t], fig = { side: t, box: b, foot: g.foot[t], w: b.w, h: b.h };
        const c = this.frameOn(fig, this.pushFor(fig), t === 'rival' ? 0.58 : 0.42);
        avoid.push({ x: -c.x / c.k, y: (g.H * 0.7 - c.y) / c.k, w: g.W / c.k, h: (g.H * 0.3) / c.k, k: 0.3 });
      }
    }
    const at = (x, y) => ({ x: outer < 0 ? x - bw : x, y, w: bw, h: bh });
    const pad = this.pad[s].bbox;
    // a phone's frame is the duel's: there the hand waits under its leader's name on the team rail, at its side's top
    // corner, unless that corner is taken
    // (a phone's rival plate strip, about 40 px, sits under the team rail: the corner starts under it)
    // (a short phone's hand stands in the team rail itself, REQUESTS :48)
    const short = g.phone && (g.H < 700 || rail);
    const corner = g.phone ? [{ x: outer < 0 ? 8 : g.W - 8 - bw, y: short ? g.rail + g.team - bh + 4 : g.rail + g.team + 48, w: bw, h: bh }] : [];
    // round 6 (REQUESTS :48): on a phone a hand is never over your figure, nor over the card it wears (its aura box)
    // (and, test 28, over neither hero: the rival's opaque box at a lower cost than yours, so where only one can be
    // spared, your figure is)
    if (g.phone) { const b = g.box.player, mx = 0.15 * b.w, my = 0.15 * b.h; avoid.push({ x: b.x - mx, y: b.y - my, w: b.w + 2 * mx, h: b.h + 2 * my, k: 1e6 }); const r = g.box.rival; avoid.push({ ...r, k: 1e4 }); }
    const rb = this.reach(s);
    // beside its leader on the outer side (at the hip, the shoulder, the knee), over its head, under its feet, under
    // its figure's pad, beside it on the inner side: each clear of the leader in every pose (`reach`)
    const cands = [
      ...corner,
      at(outer < 0 ? rb.x - 6 : rb.x + rb.w + 6, lb.y + lb.h * 0.8 - bh),
      at(outer < 0 ? rb.x - 6 : rb.x + rb.w + 6, rb.y + 4),
      at(outer < 0 ? rb.x - 6 : rb.x + rb.w + 6, lb.y + lb.h - bh),
      at(outer < 0 ? rb.x + rb.w : rb.x, rb.y - bh - 8),
      at(outer < 0 ? lb.x + lb.w : lb.x, g.lead[s].y + 6),
      at(outer < 0 ? lb.x + lb.w : lb.x, Math.max(g.lead[s].y, pad.y + pad.h) + 8),
      { x: outer < 0 ? rb.x + rb.w + 6 : rb.x - 6 - bw, y: lb.y + lb.h * 0.8 - bh, w: bw, h: bh },
      // then its side's top corner under the rail
      ...(g.phone ? [] : [{ x: outer < 0 ? 8 : right - bw, y: top, w: bw, h: bh }]),
    ];
    for (const r of cands.slice()) cands.push({ ...r, x: clamp(r.x, 8, right - bw) });
    const hit = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    // a card the frame's edge cuts cannot be read, so the edges cost three times what covering something does
    const cost = (r) => avoid.reduce((n, b) => n + (b.k ?? 1) * hit(r, b), 0) + 3 * (hit(r, { x: -1e4, y: -1e4, w: 2e4 + 0, h: 1e4 + top }) + hit(r, { x: -1e4, y: bottom, w: 2e4, h: 1e4 })
      + hit(r, { x: -1e4, y: -1e4, w: 1e4 + 8, h: 2e4 }) + hit(r, { x: right, y: -1e4, w: 1e4, h: 2e4 })) + (this.hands[other(s)]?.box ? 60 * hit(r, this.hands[other(s)].box) : 0);
    // a spot the window's side cuts is never taken while one inside it is there (the clamped copies always are), and
    // the two hands never stack (the other hand costs what a plate does)
    const inside = cands.filter((r) => r.x >= 8 && r.x + r.w <= right);
    let best = inside[0] ?? cands[0], bc = Infinity;
    // (fix pass 3 H6: a phone 412 px wide or less seats your stack in its top-left slot in every pair, clear of every
    // card's opaque box in any form, else in the team rail; under 380 px it stands in the team rail (ruling 5), so no
    // bench card stands on the floor between the duel and your plate)
    if (g.phone && s === 'player' && !short && g.W <= 412) {
      const c0 = corner[0], solid = SIDES.flatMap((t) => (g.obox[t]?.length ? g.obox[t] : [g.box[t]]));
      if (g.W < 380 || solid.some((b) => hit(c0, b) > 0) || (this.hands.rival?.box && this.hands.rival.el.dataset.rail !== 'true' && hit(c0, this.hands.rival.box) > 0)) return this.placeHand(s, true);
      best = c0; bc = 0;
    } else for (const r of inside.length ? inside : cands) { const c = cost(r); if (c < bc) { bc = c; best = r; } if (c === 0) break; }
    // round 6: on a taller phone a hand that would stand over either hero's box (the bigger heroes reach the corners
    // under the team rail) stands in the team rail instead, as a short phone's does (REQUESTS :48, crowd.mjs)
    if (g.phone && !short && !(s === 'player' && g.W <= 412) && SIDES.some((t) => hit(best, g.box[t]) > 0)) return this.placeHand(s, true);
    H.box = best; H.w = w; H.h = h; H.step = step; H.dir = outer;
    // a hand in the team rail is the rail's own pips (the team, its HP and who is in play): its cards would only peek out
    // from behind them, so they are not drawn there; a card's flight still starts from its slot (`handRect`)
    H.el.dataset.rail = String(short);
    // (a phone's hand may have to stand over a figure: it is drawn in front, so its cards stay readable)
    H.el.style.zIndex = String(g.phone ? 5000 : R(best.y + bh));
    H.el.style.setProperty('--hw', `${w}px`); H.el.style.setProperty('--hh', `${h}px`);
    this.drawHand(s, true);
  }
  /** The cards in a hand now: the side's team in order, but the card on the pad and the cards in flight. */
  inHand(side, extra = null) {
    return (this.view?.sides[side].team ?? []).filter((f) => f.uid === extra || (f.uid !== this.shown[side] && !this.away.has(f.uid))).map((f) => f.uid);
  }
  /** A card's place in its hand (board px, unrotated), with `extra` counted in. */
  slotOf(side, uid, extra = null) {
    const H = this.hands[side];
    if (!H?.box) return null;
    const list = this.inHand(side, extra ?? uid), n = list.length, i = Math.max(0, list.indexOf(uid));
    const step = n > 2 ? Math.min(H.step, (H.box.w - R(H.h * 0.1) - H.w) / (n - 1)) : H.step;
    const span = H.w + (n - 1) * step;
    // side by side from the leader's side of the spot outward, each tab clear of the next card, each card turned a little
    const x0 = H.dir < 0 ? H.box.x + H.box.w - span : H.box.x;
    const k = H.dir < 0 ? n - 1 - i : i;
    const rot = n > 1 ? (-4 + (8 * i) / (n - 1)) * (H.dir < 0 ? 1 : -1) : 0;
    return { x: x0 + k * step, y: H.box.y + H.box.h - H.h - 4, w: H.w, h: H.h, rot, z: k };
  }
  /** The hand from the snapshot: who is in it, face up with HP or face down, where each card sits. */
  drawHand(side, now = false) {
    const H = this.hands[side];
    if (!H?.box || !this.view) return;
    const inHand = new Set(this.inHand(side));
    for (const f of this.view.sides[side].team) {
      const c = H.cards.get(f.uid);
      if (!c) continue;
      const on = inHand.has(f.uid);
      const was = c.el.dataset.in === 'true';
      c.el.dataset.in = on ? 'true' : 'false';
      const out = f.hp <= 0 ? 'true' : 'false';
      if (c.el.dataset.out !== out) c.el.dataset.out = out;
      if (c.hp !== f.hp) { c.hp = f.hp; c.tab.textContent = String(f.hp); }
      if (side === 'player') {
        const live = on && f.hp > 0;
        c.el.tabIndex = live ? 0 : -1;
        c.el.disabled = !live;
        c.el.setAttribute('aria-label', txt(f.hp > 0 ? 'arena.card' : 'arena.card.out', { card: this.ctx.title(f.id), hp: f.hp, max: f.maxHp }));
      }
      if (!on) continue;
      const r = this.slotOf(side, f.uid);
      c.el.dataset.fan = String((r?.z ?? 0) % 2); // its HP tab's corner alternates along the fan, left to right on screen
      const tf = `translate3d(${R(r.x)}px,${R(r.y)}px,0) rotate(${r.rot.toFixed(1)}deg)`;
      if (now || !was || this.reduced()) { c.el.style.transition = 'none'; c.el.style.transform = tf; void c.el.offsetWidth; c.el.style.transition = ''; }
      else c.el.style.transform = tf;
      c.el.style.zIndex = String(r.z);
    }
  }
  /** Where a leader's quote plate goes (board px): above its head, never over a figure. */
  quoteAt(l) {
    const g = this.g;
    if (!g || g.phone) return null;
    const b = l.bounds(l.side === 'player' ? POSE.rearIdle : POSE.idle);
    const w = g.W >= 1200 ? 250 : 210;
    if (l.side === 'player') return { x: b.x + b.w * 0.3, y: b.y - 12, line: 12, lineX: 14, w };
    return { x: b.x + b.w * 0.75, y: b.y - 10, line: 10, lineX: -14, w };
  }

  // ---------------------------------------------------------------- the snapshot on the board
  /** Draw the board from a snapshot with no motion: first frame, mode switch, reload. */
  set(view) {
    if (this.pending) this.settle();
    this.view = view;
    for (const s of SIDES) for (const f of view.sides[s].team) { const fig = this.figs.get(f.uid); if (fig) { fig.hp = f.hp; fig.maxHp = f.maxHp; fig.fallen = f.hp <= 0; this.formTo(fig, f); } }
    this.falling.clear();
    this.away.clear();
    for (const s of SIDES) {
      const side = view.sides[s], f = side.team[side.active];
      const show = f && f.hp > 0 && (this.revealed.has(f.uid) || !this.ctx.dealing) ? f.uid : null;
      this.showFig(s, show);
      if (show) this.revealed.add(show);
    }
    this.drawSides(view);
    this.wear(view);
  }
  showFig(s, uid) {
    this.shown[s] = uid;
    for (const fig of this.figs.values()) if (fig.side === s) {
      const on = fig.uid === uid;
      this.showing(fig, on);
      if (on) { this.unpose(fig); this.clearPic(fig); K.bayer(fig.body, 16); fig.body.style.transform = ''; fig.el.style.opacity = ''; fig.img.style.filter = ''; fig.fallen = false; this.clearMarks(s, uid); }
    }
    for (const f of this.figs.values()) if (f.side !== s) this.aim(f, 0);
  }
  /** A form card's form from its snapshot (reload, mode switch, replay seek, or an event landing): its key re-keys the
   *  picture at the one scale, with no motion; the tower's live sprite takes the same key. */
  formTo(fig, f) {
    const key = formKey(f);
    if (!key || key === fig.key) return false;
    const from = fig.key;
    fig.key = key;
    if (this.g) this.placeFigure(fig);
    // (fix pass 2 H3: the tower's own growth settles from the drawn heights, the level steps included: the exponent
    // that carries the raw heights' ratio to the drawn one)
    let exp = this.g?.caps?.formExp ?? FIG.formExp;
    const m = this.man?.figures[fig.id];
    if (from && m?.forms?.[from] && m.forms[key]) {
      const va = formView(m, VIEW[fig.side], from), vb = formView(m, VIEW[fig.side], key), ra = (va.box[3] - va.box[1]) / (vb.box[3] - vb.box[1]);
      if (Math.abs(Math.log(ra)) > 1e-3) exp = clamp(Math.log(drawnH(m, va, exp) / drawnH(m, vb, exp)) / Math.log(ra), 0.05, 3);
    }
    fig.ptd?.set(key, { growFrom: from ?? undefined, exp });
    return true;
  }
  /** What each standing card wears says its state: its aura (HP share, stat stages, barrier: arena/aura.js draws the
   *  barrier's shell). */
  wear(view) {
    for (const s of SIDES) for (const f of view.sides[s].team) {
      const fig = this.figs.get(f.uid);
      if (!fig || fig.el.hidden) continue;
      fig.aura?.state(f);
      // (fix pass 2 H3: under ?aura=0 the barrier is read from the plate's chip; the scaffold is the construction's
      // alone, never a cage round a finished tower, so the fallback takes it down)
      if (fig.ptd && !fig.aura && fig.barrierOn !== false) { fig.barrierOn = false; fig.ptd.barrier(false, 0); }
    }
  }
  drawSides(v) {
    for (const s of SIDES) {
      const side = v.sides[s];
      const f = side.team.find((x) => x.uid === this.shown[s]) ?? side.team[side.active];
      this.drawPad(s, f, Boolean(this.shown[s]));
      side.team.forEach((x, i) => this.drawPip(s, i, x, i === side.active && x.hp > 0 && Boolean(this.shown[s])));
      this.drawHand(s);
    }
    if (this.turnEl) { const t = txt('turn.short', { n: v.turn }); if (this.turnEl.textContent !== t) this.turnEl.textContent = t; this.turnEl.setAttribute('aria-label', txt('log.turn', { n: v.turn })); }
  }
  drawPad(s, f, on) {
    const P = this.pad?.[s];
    if (!P) return;
    const G = this.padG[s];
    G.dataset.on = on ? 'true' : 'false';
    if (!f) return;
    G.style.setProperty('--c', K.accent(f.id));
    this.ringEls[s].box.style.setProperty('--c', K.accent(f.id));
    const n = f.hp <= 0 ? 0 : Math.max(1, Math.ceil((20 * f.hp) / f.maxHp));
    const low = f.hp > 0 && f.hp <= f.maxHp * 0.25;
    G.dataset.low = low ? 'true' : 'false';
    P.segs.forEach((seg, i) => { const v = i < n ? 'on' : 'off'; if (seg.dataset.v !== v) { seg.dataset.v = v; seg.setAttribute('data-v', v); } });
    P.n = n;
  }
  drawPip(s, i, f, active) {
    const p = this.rail?.[s]?.pips[i];
    if (!p) return;
    const out = f.hp <= 0 && p.li.dataset.flown !== 'pending';
    const st = out ? 'out' : active ? 'active' : 'bench';
    if (p.li.dataset.state !== st) p.li.dataset.state = st;
    const n = f.hp <= 0 ? 0 : Math.max(1, Math.ceil((10 * f.hp) / f.maxHp));
    if (p.n !== n) { p.n = n; [...p.ticks.children].forEach((t, k) => { t.dataset.on = k < n ? 'true' : 'false'; }); }
    const label = txt(out ? 'arena.card.out' : active ? 'arena.card.active' : 'arena.card', { card: this.ctx.title(f.id), hp: f.hp, max: f.maxHp });
    if (p.lab.textContent !== label) p.lab.textContent = label;
  }

  // ---------------------------------------------------------------- events land: HP, chips, the rail; reactions queue
  land(e, view) {
    this.view = view ?? this.view;
    const v = this.view;
    if (!v) return;
    for (const s of SIDES) for (const f of v.sides[s].team) {
      const fig = this.figs.get(f.uid);
      if (!fig) continue;
      const before = fig.hp ?? f.maxHp;
      fig.hp = f.hp; fig.maxHp = f.maxHp;
      if (f.hp !== before) this.reactions.push({ uid: f.uid, from: before, to: f.hp, e });
      if (f.hp <= 0 && before > 0) this.falling.add(f.uid);
      // a build or an upgrade the board has not staged already (a skip, a replay seek) lands as its new form at once
      if (formKey(f) && formKey(f) !== fig.key && !(this.building?.uid === f.uid && this.building.n === this.cueN)) this.formTo(fig, f);
    }
    this.drawSides(v);
    this.wear(v);
  }
  /** The reactions the landed events left: numerals over the figure, the rim's drain, recoils. */
  flush(shot, o = {}) {
    const list = this.reactions.splice(0);
    for (const r of list) {
      const fig = this.figs.get(r.uid);
      if (!fig || fig.el.hidden) continue;
      const lost = r.from - r.to;
      const hit = r.e.kind === 'hit' && r.e.target === r.uid ? r.e : null;
      // under a full scene's cover only the rim drains; the reaction plays after the scene, on the board
      if (o.quiet) { if (lost > 0) this.drain(fig.side, r); continue; }
      if (lost > 0) {
        // one number per hit at the contact (the board ending dropped the scene's own), the damage that landed from its
        // first frame (past 0 HP too); why it mattered (Critical, the ring, Out) hangs right under it
        const out = r.to <= 0 && !shot?.told?.(fig.uid);
        this.numeral(fig, { value: hit?.damage ?? lost, hits: hit?.hits ?? 1, tags: hitTags(hit, out), kind: hit?.crit ? 'crit' : 'hit', color: hit?.crit ? K.accent(this.ctx.cardOf(hit.actor ?? '')) : null, every: 70, ticks: true });
        // the body takes it by its class (hit-stop, then the rock sized by the damage share), its card scatters
        // round it, and its rim lights in the striker's own colour (hue, not light: the one flash stays the only one)
        const att = hit ? this.figs.get(hit.actor) ?? this.active(other(fig.side)) : null;
        if (r.to > 0) this.recoil(fig, { share: lost / Math.max(1, fig.maxHp), crit: Boolean(hit?.crit) });
        if (hit) { this.flash(fig); this.rimPulse(fig, hueOf(att?.id ?? this.ctx.cardOf(hit.actor ?? '') ?? fig.id).energy); }
        fig.aura?.beat('hit', { share: lost / Math.max(1, fig.maxHp), crit: Boolean(hit?.crit), out: r.to <= 0 });
        this.drain(fig.side, r);
      } else if (lost < 0) {
        this.numeral(fig, { value: `+${-lost}`, kind: 'heal' });
        this.ring(fig.side, 'heal');
      }
    }
  }
  drain(side, r) {
    const P = this.pad?.[side];
    if (!P || this.reduced()) return;
    const fig = this.figs.get(r.uid);
    const was = r.from <= 0 ? 0 : Math.max(1, Math.ceil((20 * r.from) / (fig?.maxHp || 1)));
    const now = P.n ?? 0;
    for (let i = now; i < Math.min(20, was); i++) this.anim(P.segs[i], [{ opacity: 1, strokeWidth: 9 }, { opacity: 1, offset: 0.3 }, { opacity: 0.5 }], { duration: 520, delay: (i - now) * 22, easing: OUT });
  }

  // ---------------------------------------------------------------- small board effects
  /** The numeral over a figure's head: a multi-hit is one running total (shared/fx.js numeral). */
  numeral(fig, o) {
    if (o.kind !== 'heal') this.numbered(fig.uid);
    numeral(this.motion, this.fx, { x: fig.box.x + fig.box.w / 2, y: fig.box.y - (this.g.phone ? 8 : 14), ...o, side: fig.side, uid: fig.uid });
  }
  stamp(fig, text, kind, ms = 600, pos = null) {
    if (!fig) return;
    const g = this.g;
    // one plate at a time in a figure's middle slot (Miss, a trait, a status, Out): the newest replaces the last
    const mid = !pos;
    if (mid) for (const x of this.fx.querySelectorAll(':scope > .stamp[data-slot="mid"]')) if (x.dataset.uid === fig.uid) x.remove();
    const s = el('b', 'stamp', this.fx, text);
    s.dataset.kind = kind; s.dataset.side = fig.side; s.dataset.uid = fig.uid;
    if (mid) s.dataset.slot = 'mid';
    let y = pos ? pos.y : fig.foot.y - fig.h * 0.6;
    let x = pos ? pos.x : fig.box.x + fig.box.w / 2;
    ({ x, y } = this.clearOfLeaders(s, x, y));
    if (pos) s.style.setProperty('--c', K.accent(fig.id));
    const at = (k, dy = 0) => `translate3d(${R(x)}px,${R(y)}px,0) translate(-50%,${-50 + dy}%) scale(${k})`;
    s.style.transform = at(1);
    if (this.reduced()) { setTimeout(() => s.remove(), Math.max(ms, 1400)); return; }
    this.anim(s, [{ transform: at(1.5), opacity: 0 }, { transform: at(1), opacity: 1, offset: 0.16 }, { transform: at(1), opacity: 1, offset: 0.8 }, { transform: at(1, -10), opacity: 0 }], { duration: ms, easing: 'linear', fill: 'forwards' }).finished.catch(() => {}).then(() => s.remove());
  }
  /** A plate centred at (x, y) moved the least way that keeps it, at its entrance's 1.5 scale, off both leaders in
   *  every pose of their sides (MODES.md section 4) and inside the frame. Its size is reckoned from its text and its
   *  type (arena.css .stamp: 800 weight, 15 px, 17 px for a move's name, 13 px on a phone; .32em .7em .38em padding),
   *  never read, so a plate never forces a layout mid-shot. */
  clearOfLeaders(e, x, y) {
    const g = this.g, kind = e.dataset.kind, fs = kind === 'move' ? (g.phone ? 13 : 17) : 15;
    const w = ([...e.textContent].length * 0.64 + 1.4) * fs * 1.5 + 4, h = 1.7 * fs * 1.5 + 4;
    const boxes = SIDES.map((t) => this.reach(t));
    const hit = (cx, cy) => boxes.some((b) => cx + w / 2 > b.x && cx - w / 2 < b.x + b.w && cy + h / 2 > b.y && cy - h / 2 < b.y + b.h);
    const inFrame = (cx, cy) => cx - w / 2 >= 4 && cx + w / 2 <= g.W - 4 && cy - h / 2 >= g.rail + g.team && cy + h / 2 <= g.floor;
    if (!hit(x, y)) return { x, y };
    let best = null;
    for (let i = 1; i <= 24; i++) for (const [dx, dy] of [[0, -1], [0, 1], [1, 0], [-1, 0], [1, -1], [-1, -1], [1, 1], [-1, 1]]) {
      const cx = x + dx * i * 8, cy = y + dy * i * 6;
      if (hit(cx, cy) || !inFrame(cx, cy)) continue;
      const d = Math.hypot(cx - x, cy - y);
      if (!best || d < best.d) best = { x: cx, y: cy, d };
    }
    return best ?? { x, y };
  }
  /** A move of the figure on the floor: `a` metres along the duel axis (toward its foe when positive) and `b` across,
   *  as its screen offset and its scale there (farther is smaller), so it moves in the painting's perspective. */
  step(fig, a, b = 0) {
    const g = this.g, st = g.st[fig.side], d = fig.side === 'player' ? 1 : -1;
    const p = g.off(fig.side, a * d, b * d), q = g.pt(p);
    return { x: q.x - st.x, y: q.y - st.y, k: ppm(g.P, p.X, p.Z) / st.k };
  }
  /** The figure and its shadows move together: the same keyframes about its foot (the body in its own px, its shadows
   *  in board px, both 1:1). */
  moveFig(fig, frames, opts) {
    this.anim(fig.ground.el, frames, opts);
    return this.anim(fig.body, frames, opts);
  }
  // ---------------------------------------------------------------- the body verbs (arena/body.js, ROUND6.md 4.3)
  /** Which way is toward the foe on screen (+1 right, -1 left): a lean in is a turn that way about the foot. */
  dirOf(fig) {
    const g = this.g, a = g.foot[fig.side], b = g.foot[other(fig.side)];
    return Math.sign(b.x - a.x) || (fig.side === 'player' ? 1 : -1);
  }
  /** One body pose as a transform about the foot: an offset on the floor (`a` metres toward the foe, `b` across), a
   *  lift (metres up, negative down), a turn (degrees toward the foe) and a squash, all in the painting's perspective. */
  poseOf(fig, { a = 0, b = 0, up = 0, rot = 0, sx = 1, sy = 1 } = {}) {
    const o = a || b ? this.step(fig, a, b) : { x: 0, y: 0, k: 1 }, d = this.dirOf(fig);
    const y = o.y - up * fig.k * o.k;
    return { body: `translate3d(${o.x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${(d * rot).toFixed(2)}deg) scale(${(sx * o.k).toFixed(4)},${(sy * o.k).toFixed(4)})`, ground: `translate3d(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px,0) scale(${o.k.toFixed(4)})` };
  }
  /** Run poses on the body (and its shadows along the floor): `keys` [[offset, pose], ...]. */
  posed(fig, keys, opts) {
    const body = keys.map(([offset, p]) => ({ offset, transform: this.poseOf(fig, p).body }));
    const ground = keys.map(([offset, p]) => ({ offset, transform: this.poseOf(fig, { a: p.a, b: p.b }).ground }));
    const g = this.anim(fig.ground.el, ground, opts), a = this.anim(fig.body, body, opts);
    a.pair = g;
    return a;
  }
  /** A held pose ends: the anticipation the attack replaces, a knockout pose a rise clears. */
  unpose(fig) { for (const a of fig.held ?? []) for (const x of [a, a.pair]) { try { x?.cancel(); } catch { /* gone */ } } fig.held = []; }
  /** The idle loop of the figure's class on its picture (never on its card, which orbits on its own): a machine
   *  settles, a character breathes, a floater hovers over its breathing shade, a mark sways about its foot. Infinite,
   *  so out of the motion registry, and paused with the auras. */
  idle(fig, on = true) {
    // (a layout that leaves the figure as it stood keeps its loop running, so a turn never restarts a breath)
    const key = on && fig.box ? `${fig.h.toFixed(1)}|${fig.k.toFixed(3)}|${fig.lift ?? 0}` : '';
    if (on && key === fig.idleKey && fig.idles?.length && !this.reduced() && !fig.el.hidden && !fig.fallen) return;
    fig.idleKey = key;
    for (const a of fig.idles ?? []) { try { a.cancel(); } catch { /* gone */ } this.idles.delete(a); Aura.running.delete(a); }
    fig.idles = [];
    if (!on || this.reduced() || !fig.box || fig.el.hidden || fig.fallen) return;
    const v = fig.verbs.idle, { period, at } = fig.idleAt, h = fig.h, k = fig.k;
    let frames;
    if (v.kind === 'settle') frames = [{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(0,${(v.dy * h).toFixed(2)}px,0)` }, { transform: 'translate3d(0,0,0)' }];
    else if (v.kind === 'breath') frames = [{ transform: 'scale(1,1)' }, { transform: `scale(${v.scale[0]},${v.scale[1]})` }, { transform: 'scale(1,1)' }];
    else if (v.kind === 'hover') { const m = v.m[fig.slot % 2] * k; frames = [{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(0,${(-m).toFixed(2)}px,0)` }, { transform: 'translate3d(0,0,0)' }]; }
    else frames = [{ transform: 'rotate(0deg)' }, { transform: `rotate(${v.deg}deg)`, offset: 0.25 }, { transform: `rotate(${-v.deg}deg)`, offset: 0.75 }, { transform: 'rotate(0deg)' }];
    const opts = { duration: period, delay: at, iterations: Infinity, easing: 'ease-in-out' };
    const list = [fig.breath.animate(frames, opts)];
    if (v.kind === 'hover' && fig.lift > 0.02) list.push(fig.ground.ao.animate([{ opacity: v.shade[0] }, { opacity: v.shade[1] }, { opacity: v.shade[0] }], opts));
    for (const a of list) { this.idles.add(a); Aura.running.add(a); a.aura = this.idleGate(); if (this.still.size || Aura.held) a.pause(); }
    fig.idles = list;
  }
  /** Your leader breathes too (1% on its rear cell, about its foot): the rear rows have one idle cell. */
  leaderIdle() {
    const L = this.leaders.player;
    for (const a of this.leadIdle ?? []) { try { a.cancel(); } catch { /* gone */ } this.idles.delete(a); Aura.running.delete(a); }
    this.leadIdle = [];
    this.leadAt = L ? `${L.foot.x}|${L.foot.y}` : '';
    if (!L || this.reduced()) return;
    const v = verbsOf('').leader;
    L.el.style.transformOrigin = `${L.foot.x.toFixed(1)}px ${L.foot.y.toFixed(1)}px`;
    // section 4.3's 1%, but never more than 0.9 px at the sprite's top (test 31 reads the drawn anchor off the sprite's
    // box: 1% of a 250 px leader moves that box 2.5 px though the foot holds still); a phone's leader gets about 0.8%
    const hPx = Math.max(1, L.bounds(POSE.rearIdle).h), sy = 1 + Math.min(v.scale - 1, 0.9 / hPx);
    const a = L.el.animate([{ transform: 'scale(1,1)' }, { transform: `scale(1,${sy.toFixed(5)})` }, { transform: 'scale(1,1)' }], { duration: v.ms, iterations: Infinity, easing: 'ease-in-out' });
    this.idles.add(a); Aura.running.add(a); a.aura = this.idleGate(); if (this.still.size || Aura.held) a.pause();
    this.leadIdle = [a];
  }
  /** The pause gate the aura registry reads on an idle (`Aura` plays a loop again only while its gate is not paused),
   *  so lifting a page hold never restarts an idle the board itself still holds. */
  idleGate() { const board = this; return (this.gate ??= { get paused() { return board.still.size > 0; } }); }
  /** Why the living layer rests: `reason` on or off (hold, hidden, a covering scene, the result). */
  living(reason, on) {
    if (on) this.still.add(reason); else this.still.delete(reason);
    const p = this.still.size > 0;
    // (reduced motion cancels the loops to their rest frame rather than pausing them mid-sway, and holds the auras
    // still while it lasts; off again, the loops restart)
    if (reason === 'reduced') { for (const fig of this.figs.values()) this.idle(fig, !on); this.leaderIdle(); }
    // (a page hold the auras keep, the result or the open Log, holds the idles too)
    for (const a of this.idles) { try { if (p || Aura.held) a.pause(); else a.play(); } catch { /* gone */ } }
    for (const fig of this.figs.values()) { const off = p || fig.el.hidden; fig.aura?.pause(off); fig.ptd?.pause(off); }
  }
  /** Anticipation, inside the pre-roll: the class's wind-up (a brace, a crouch, a rise, a lean back) eased in over
   *  its window, held until the attack takes the body (`hold` ms), then eased out if nothing did. */
  anticipate(fig, budget, hold) {
    if (!fig || this.reduced() || fig.el.hidden) return;
    const v = fig.verbs.anticipation, inMs = Math.max(60, Math.min(v.ms, budget || v.ms)), out = 120, T = inMs + Math.max(0, hold) + out;
    const pose = v.kind === 'brace' ? { a: -v.back, rot: v.tilt } : v.kind === 'crouch' ? { rot: v.tilt, sx: v.squash[0], sy: v.squash[1] } : v.kind === 'rise' ? { up: v.rise } : { rot: v.tilt };
    this.unpose(fig);
    const a = this.posed(fig, [[0, {}], [inMs / T, pose], [(T - out) / T, pose], [1, {}]], { duration: T, easing: OUT });
    fig.held = [a];
  }
  /** The attack, from the board cue (impact - 130): a machine fires and recoils from its own fire (never lunges); a
   *  character lunges with a stretch and a lean in and lands past its mark; a floater dives low and lunges; a mark rises
   *  as its pieces fly. `ms` caps it (a cut's is 260). */
  attack(fig, ms = Infinity) {
    const a = this.attackPose(fig, ms);
    // (fix pass 2 H5: the flight out and home, which the next read waits on, `home`)
    if (a) fig.flight = a;
    return a;
  }
  /** Every figure a special still carries (arena/specials.js `carrying`, fixes-3 A3) lands before the next shot (H4,
   *  after its critic): a figure of the side that does not act next lands at the cut, at once (its critic saw Jarhead's
   *  return hang over your tower through the next shot's headline while the pre-roll waited on it); one of the side that
   *  acts is awaited up to 300 ms, then snapped home, so nothing carried crosses into a shot. */
  async landCarried(shot) {
    const flying = [...this.figs.values()].filter((f) => f.carrying);
    if (!flying.length) return;
    // (landed means landed at once: the special's own promise clears `carrying` a microtask after its flights finish,
    // so the shot's first frame still read Jarhead as carried at 1440, H4's critic; the board clears it with the landing)
    const side = shot?.scene?.side, land = (f) => { if (f.carrying) { try { f.land?.(); } catch { /* gone */ } f.carrying = null; f.land = null; } };
    const wait = this.reduced() ? [] : flying.filter((f) => side && f.side === side);
    for (const f of flying) if (!wait.includes(f)) land(f);
    if (!wait.length) return;
    let cap;
    await Promise.race([Promise.all(wait.map((f) => f.carrying?.catch(() => {}))), new Promise((r) => { cap = setTimeout(r, 300); })]);
    clearTimeout(cap);
    for (const f of wait) land(f);
  }
  /** The attacker back on its pad: its last attack's flight finished (now, when none is running). */
  home(fig) {
    const a = fig?.flight;
    if (!a || a.playState === 'finished' || a.playState === 'idle') return Promise.resolve();
    return a.finished.then(() => {}, () => {});
  }
  attackPose(fig, ms = Infinity) {
    if (!fig || this.reduced() || fig.el.hidden) return;
    this.unpose(fig);
    const v = fig.verbs.attack;
    if (v.kind === 'fire') {
      const T = Math.min(ms, v.out + v.back), o = v.out / (v.out + v.back);
      return this.posed(fig, [[0, {}], [o, { a: -v.m, rot: v.tilt }], [o + (1 - o) * 0.7, { a: v.m * (v.overshoot - 1), rot: 0.4 }], [1, {}]], { duration: T, easing: OUT });
    }
    if (v.kind === 'lunge') {
      const T = Math.min(ms, v.ms);
      return this.posed(fig, [[0, {}], [v.peak, { a: v.m, rot: v.tilt, sx: v.stretch[0], sy: v.stretch[1] }], [0.62, { a: v.m * 0.3, rot: v.tilt * 0.3 }], [0.82, { a: v.overshoot }], [1, {}]], { duration: T, easing: OUT });
    }
    if (v.kind === 'dive') {
      const T = Math.min(ms, v.ms), low = -Math.max(0, (fig.lift ?? 0) - v.low);
      return this.posed(fig, [[0, {}], [v.peak, { a: v.m, up: low, rot: 4 }], [0.7, { a: v.m * 0.2, up: low * 0.3 }], [1, {}]], { duration: T, easing: OUT });
    }
    const T = Math.min(ms, v.ms);
    return this.posed(fig, [[0, {}], [0.4, { up: v.rise, rot: v.tilt }], [1, {}]], { duration: T, easing: OUT });
  }
  /** The hit, from the contact: the defender's first frame held (60 ms, a critical 90: the hit-stop), then its class's
   *  rock, sized by the damage share (tilt 3 + 10 x share degrees, knock 0.18 + 0.5 x share metres, capped), back by
   *  I + 340. */
  recoil(fig, o = {}) {
    if (!fig || this.reduced()) return;
    this.unpose(fig);
    const V = fig.verbs, hp = V.hitPose, { tilt, knock } = hitSize(fig.id, o.share ?? 0.15), hold = o.crit ? V.hit.critHold : V.hit.hold, T = V.hit.ms;
    const k = knock * (hp.knockK ?? 1);
    let peak;
    if (hp.kind === 'rock') peak = { a: -k, rot: -tilt };
    else if (hp.kind === 'squash') peak = { a: -k, rot: -tilt * hp.tiltK, sx: hp.squash[0], sy: hp.squash[1] };
    else if (hp.kind === 'bob') peak = { a: -k, up: -hp.bob, rot: -hp.tilt };
    else peak = { a: -k, rot: -(hp.tilt[0] + (hp.tilt[1] - hp.tilt[0]) * Math.min(1, (o.share ?? 0.15) * 2.5)) };
    const h = hold / T, p = Math.min(0.5, h + 70 / T);
    const back = { ...peak, a: peak.a * 0.3, rot: (peak.rot ?? 0) * 0.25, sx: 1, sy: 1, up: (peak.up ?? 0) * 0.3 };
    this.posed(fig, [[0, {}], [h, {}], [p, peak], [0.68, back], [1, {}]], { duration: T, easing: OUT });
  }
  /** The struck card's rim lit in the striker's energy colour (0.34 -> 0.9 -> its own rim, 260 ms): hue, not light. */
  rimPulse(fig, color, peak = null, hold = null) {
    if (!fig || this.reduced()) return;
    const r = fig.verbs.rim, rest = fig.el.style.getPropertyValue('--rim-a') || '0.4';
    // (`hold` ms: lit at its peak from a fifth of the way to four fifths, then back: a held glow, never a second flash)
    if (hold) { this.anim(fig.rim, [{ backgroundColor: color, opacity: r.from }, { backgroundColor: color, opacity: peak ?? r.peak, offset: 0.2 }, { backgroundColor: color, opacity: peak ?? r.peak, offset: 0.8 }, { backgroundColor: color, opacity: +rest }], { duration: hold, easing: 'linear' }); return; }
    this.anim(fig.rim, [{ backgroundColor: color, opacity: r.from }, { backgroundColor: color, opacity: peak ?? r.peak, offset: 0.35 }, { backgroundColor: color, opacity: +rest }], { duration: r.ms, easing: OUT });
  }
  /** A hit's lunge, kept for what still calls it (a board ending): the class's attack. */
  lunge(fig, m, ms) { return this.attack(fig, ms); }
  /** One flash on the figure's silhouette only, at half strength: with the scene cuts either side of a short attack a
   *  full white silhouette made the fourth luminance flash in a second over a large figure under Auto (the battle's
   *  flash scan, on the recorded match); at 0.5 it reads as the hit and stays under the scan's 0.1 change. */
  flash(fig, color = '#fff') {
    if (!fig || this.reduced()) return;
    fig.flash.style.setProperty('--flash', color);
    this.anim(fig.flash, [{ opacity: 0.5 }, { opacity: 0.5, offset: 0.35 }, { opacity: 0 }], { duration: 150, easing: 'linear' });
  }
  /** Shake the picture 1.2% of the width, decaying over 300 ms (the painting with it: the camera shakes). */
  shake(amp = 0.012, ms = 300) {
    if (this.reduced()) return;
    const A = this.g.W * amp, f = [];
    for (let i = 0; i <= 8; i++) { const d = 1 - i / 8, s = i % 2 ? -1 : 1; f.push({ transform: `translate3d(${(s * A * d * (i % 3 ? 1 : 0.6)).toFixed(1)}px,${(-s * A * 0.5 * d).toFixed(1)}px,0)` }); }
    f[8] = { transform: 'translate3d(0,0,0)' };
    this.anim(this.shakeEl, f, { duration: ms, easing: 'linear' });
  }
  /** A ring that grows out of the pad in the floor's plane. */
  ring(side, kind = 'support') {
    const r = this.ringEls?.[side];
    if (!r || this.reduced()) return;
    r.ring.dataset.kind = kind;
    this.anim(r.ring, [{ transform: 'scale(.7)', opacity: 0.9 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 520, easing: OUT });
  }
  shield(side) {
    const r = this.ringEls?.[side];
    const fig = this.figs.get(this.shown[side]);
    if (this.reduced() || !r) return;
    this.anim(r.shield, [{ transform: 'scale(.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.35 }, { transform: 'scale(1.06)', opacity: 0 }], { duration: 700, easing: OUT });
    if (fig) this.anim(fig.body, [{ transform: 'none' }, { transform: 'translate3d(0,2px,0) scale(1.02,.95)', offset: 0.4 }, { transform: 'none' }], { duration: 420, easing: OUT });
  }
  /** A miss: the defender steps across the duel axis and back. */
  sidestep(fig) {
    if (!fig || this.reduced()) return;
    const o = this.step(fig, 0, 0.45);
    this.moveFig(fig, [{ transform: 'none' }, { transform: `translate3d(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px,0) scale(${o.k.toFixed(4)})`, offset: 0.4 }, { transform: 'none' }], { duration: 240, easing: OUT });
  }
  /** The figure rears as its scene opens: its class's anticipation, short (a cut, a full scene's opening). */
  rear(fig) { this.anticipate(fig, 120, 100); }
  /** Sink into the pad (`on` false) or rise out of it, through the 4x4 Bayer: 16 to 0 cells, or 0 to 16; its shadows
   *  go and come with it. */
  bayerFade(fig, on, ms, base = '') {
    if (!fig) return Promise.resolve();
    if (on) this.showing(fig, true);
    const done = () => { this.unpose(fig); K.bayer(fig.body, on ? 16 : 0); fig.body.style.transform = ''; fig.ground.el.style.opacity = ''; if (!on) this.showing(fig, false); };
    if (this.reduced() || !ms) { done(); return Promise.resolve(); }
    // 17 steps of the 4x4 Bayer as one Web Animation (so a press skips it and a dialog holds it), with the sink or rise
    const frames = [], sink = 0.12 * fig.k;
    for (let i = 0; i <= 16; i++) {
      const n = on ? i : 16 - i, p = i / 16;
      const m = n >= 16 ? 'none' : K.MASKS[n];
      frames.push({ offset: p, maskImage: m, WebkitMaskImage: m, transform: `translate3d(0,${((on ? 1 - p : p) * sink).toFixed(1)}px,0) ${base}` });
    }
    K.bayer(fig.body, on ? 0 : 16);
    this.anim(fig.ground.el, [{ opacity: on ? 0 : 1 }, { opacity: on ? 1 : 0 }], { duration: ms, easing: 'linear' });
    const a = this.anim(fig.body, frames, { duration: ms, easing: 'linear', id: on ? 'rise' : 'sink' });
    return a.finished.catch(() => {}).then(done);
  }
  /** The card's floor matter grows from its pad (0.2 -> 1, its aura's own beat when it wears one), in place of the
   *  ground picture the switch used to pour (8.6 MB decoded a send-in on a phone, ROUND6.md decision 22). */
  growMatter(fig, ms) {
    if (!fig || this.reduced() || !ms) return;
    if (!fig.aura) this.anim(fig.matter, [{ scale: '0.2', opacity: 0 }, { scale: '1', opacity: 1 }], { duration: ms, easing: OUT });
    this.ring(fig.side, 'support');
  }

  // ---------------------------------------------------------------- the camera: one picture, the painting and the duel
  /** The camera is one 2D transform on the whole picture: the map and everything standing on its floor move as one,
   *  so every foot stays on its painted floor. It never shows the painting's edge inside the frame's band (the whole
   *  frame on a wide screen), with room for a shake. */
  /** Where the camera actually lands for `to`: the painting always covers the frame's band, so a push may be held. */
  camAt(to) {
    const g = this.g, m = g.map, e = R(g.W * 0.012) + 2, b = g.band;
    const k = Math.max(to.k, (g.W + 2 * e) / m.w, (b.bottom - b.top + 2 * e) / m.h);
    const fitIn = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
    return { x: fitIn(to.x, g.W + e - k * (m.x + m.w), -e - k * m.x), y: fitIn(to.y, b.bottom + e - k * (m.y + m.h), b.top - e - k * m.y), k };
  }
  camTo(to, ms, easing = IN_OUT) {
    // (a phone's batch framing places itself, `batchCam`: it may carry the painting's top edge down into the black
    // under the top rail, where the HUD has gone)
    let { x, y, k } = to.raw ? to : this.camAt(to);
    // (a phone mid-batch: a push onto a defender keeps your foot line in the batch framing's band, 0.70 of the height or
    // lower, as far as the painting's top (brought down under the rail as the framing does) and every figure's head
    // under the rail allow, fix pass 3 H2)
    // (where the painting's top or a figure's head cannot come down that far at the push's scale, the push gives back
    // part of its scale and centre toward the batch framing until the foot line holds: fix pass 3 H2's critic, the board-
    // only contact pushes on Auto at 360 stood your foot at 0.65-0.68 for a whole shot)
    if (!to.raw && this.batching && this.g?.phone) {
      const g = this.g, fy = g.foot.player.y, m = g.map;
      const feet = SIDES.map((s) => this.active(s)).filter((f) => f?.foot && !f.el.hidden).map((f) => Math.max(f.foot.y, f.box ? f.box.y + f.box.h : 0));
      const down = (c) => {
        const want = 0.7 * g.H - (c.y + c.k * fy);
        if (want <= 0) return c;
        const room = Math.min(g.rail + g.team + 8 + 0.12 * g.H - (c.y + c.k * m.y), ...feet.map((fy2) => (this.batchFloor ?? g.H - 8) - 4 - (c.y + c.k * fy2)));
        return { ...c, y: c.y + Math.max(0, Math.min(want, room)) };
      };
      let c = down({ x, y, k });
      if (c.y + c.k * fy < 0.695 * g.H) {
        const b = this.batchCam();
        for (let t = 0.2; t <= 1 + 1e-9; t += 0.2) { c = down({ x: x + (b.x - x) * t, y: y + (b.y - y) * t, k: k + (b.k - k) * t }); if (c.y + c.k * fy >= 0.695 * g.H) break; }
      }
      ({ x, y, k } = c);
    }
    // (the painting's letterbox mask: on as the camera sets off, so the edge it brings down is faded all the way; off only
    // once the camera has arrived, so the mask never jumps at a tween's start: fix pass 3 H2's critic)
    const lbN = (this.lbN = (this.lbN ?? 0) + 1);
    let lbAfter = null;
    if (this.host && this.g?.phone) { const lb = to.raw || this.batching ? 'true' : this.g.letterbox ? 'true' : 'false'; if (this.host.dataset.letterbox !== lb) { if (lb === 'true' || !ms || this.reduced()) this.host.dataset.letterbox = lb; else lbAfter = lb; } }
    this.cam = { x, y, k };
    const tf = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${k.toFixed(4)})`;
    const done = this.tween(this.camEl, tf, this.reduced() ? 0 : ms, easing);
    if (lbAfter) Promise.resolve(done).then(() => { if (this.lbN === lbN && this.host) this.host.dataset.letterbox = lbAfter; });
    return done;
  }
  /** Put board point `p` at the frame's (fx, fy) share, at scale k. */
  pushOn(p, k, ms, fx = 0.5, fy = 0.5, easing = 'cubic-bezier(.3,.7,.1,1)') {
    if (this.reduced()) return Promise.resolve();
    const g = this.g;
    return this.camTo({ x: g.W * fx - k * p.x, y: g.H * fy - k * p.y, k }, ms, easing);
  }
  rest(ms) { return this.camTo(this.restCam(), ms); }
  /** The camera at rest: 1, on every frame. Round 6 composes the duel at the heroes' size itself (ground.js CLASS
   *  `hero`: your first card 0.34 of the height on a wide screen), so the 1.08 push section 4.2 planned (which the HUD's
   *  plates held at 1 on every map measured) is the duel's own scale; no idle drift. */
  restCam() { return this.batching ? this.batchCam() : { x: 0, y: 0, k: 1 }; }
  /** Fix pass 3 H2 (ruling 15): a phone's batch framing. While `#app[data-busy="true"]` the console and the plates are
   *  gone, so the duel takes the floor they left: your foot line at 0.70 to 0.74 of the height (0.74 first, the least
   *  empty floor under it), the rival's pad as near 0.62 to 0.68 as the duel's depth allows, the push the largest up to
   *  1.25 that keeps both figures, both leaders and both hands whole between the top rail and the window's foot, the
   *  duel centred across. Where the camera lands (`camAt`) is what is judged. */
  batchCam() {
    const g = this.g;
    if (!g?.phone) return { x: 0, y: 0, k: 1 };
    if (this.batchAt?.g === g) return this.batchAt.cam;
    const H = g.H, ny = g.foot.player.y, fy = this.pad?.rival?.bbox ? this.pad.rival.bbox.y + this.pad.rival.bbox.h / 2 : g.foot.rival.y;
    const boxes = [], figs = [];
    for (const s of SIDES) {
      // (every card and form the side may stand, opaque, so a switch or a build inside the batch never leaves the frame)
      const ob = g.obox[s]?.length ? g.obox[s] : [g.box[s]];
      for (const o of ob) { boxes.push(o); figs.push(o); }
      const f = this.active(s);
      if (f?.box && !f.el.hidden) { const d = this.drawnBox(f); boxes.push(d); figs.push(d); }
      if (this.leaders[s]) boxes.push(this.reach(s));
      const hb = this.hands[s]?.box;
      if (hb && this.hands[s]?.el?.dataset.rail !== 'true') boxes.push(hb);
    }
    const x0 = Math.min(...boxes.map((b) => b.x)), x1 = Math.max(...boxes.map((b) => b.x + b.w)), y0 = Math.min(...boxes.map((b) => b.y)), y1 = Math.max(...figs.map((b) => b.y + b.h)), yAll = Math.max(...boxes.map((b) => b.y + b.h));
    // (and every figure over your plate, dropped over the console's key row for the batch, `batchHud`; a leader's feet
    // and a hand stay whole in the window)
    const floorY = (this.batchFloor ?? H - 8) - 4;
    const dev = (v, lo, hi) => Math.max(0, lo - v, v - hi);
    // (the painting still covers the window across and to its foot, the console's floor included; its top edge may come
    // down under the rail, where a phone's frame is black while the HUD is gone, faded like a letterboxed painting's,
    // never closer than 24 px over the highest thing standing)
    const m = g.map, e = R(g.W * 0.012) + 2;
    const fitIn = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
    let best = null;
    for (let k = 1; k <= 1.25 + 1e-9; k += 0.01) {
      for (const at of [0.74, 0.73, 0.72, 0.71, 0.7]) {
        const mid = (x0 + x1) / 2, xr = [6 - k * x0, g.W - 6 - k * x1];
        let x = xr[0] <= xr[1] ? clamp(g.W / 2 - k * mid, xr[0], xr[1]) : (xr[0] + xr[1]) / 2;
        x = fitIn(x, g.W + e - k * (m.x + m.w), -e - k * m.x);
        const y = Math.max(at * H - k * ny, H + e - k * (m.y + m.h));
        const c = { x, y, k, raw: true };
        const n = (y + k * ny) / H, f = (y + k * fy) / H, top = y + k * y0, mtop = y + k * m.y;
        const out = Math.max(0, x + k * x1 - (g.W - 4)) + Math.max(0, 4 - (x + k * x0)) + Math.max(0, mtop - (top - 24)) + Math.max(0, mtop - (g.rail + g.team + 8 + 0.12 * H)) + Math.max(0, y + k * y1 - floorY) + Math.max(0, y + k * yAll - (H - 4));
        // (hard first: everything whole under the top rail and across, the painting under it all; then the foot line,
        // the far pad, the push)
        // (0.74 first: the H2 check holds the empty floor under your foot to 25% of the height, which the far pad's band
        // gives way to where the duel is shallow)
        const cost = 1e3 * (Math.max(0, g.rail + 6 - top) + out) + 400 * dev(n, 0.7, 0.74) + 150 * Math.max(0, 0.74 - n) + 100 * dev(f, 0.62, 0.68) - 4 * (k - 1);
        if (!best || cost < best.cost - 1e-9) best = { cost, cam: c };
      }
    }
    this.batchAt = { g, cam: best.cam };
    return best.cam;
  }
  /** A figure's drawn box, board px: its opaque box with what its form paints over it (a coil's arcs) and its card's
   *  opaque matter (aura `data-solid`, fix pass 3 H3, ruling 13), read once a call. */
  drawnBox(fig) {
    const b = fig.box;
    if (!b) return null;
    let x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h;
    const paint = fig.key ? paintOf(fig.key, VIEW[fig.side]) : 0;
    if (paint > 0) y0 -= paint * b.h;
    const c = this.cam ?? { x: 0, y: 0, k: 1 };
    let solids = [];
    try { solids = fig.aura?.solids?.() ?? []; } catch { solids = []; }
    for (const e of solids) {
      // (the matter that stands on or beside it, `"body"`; a ring or disc lying on the floor round it is no height)
      if (e.dataset.solid === 'floor') continue;
      const r = e.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) continue;
      const bx = (r.left - c.x) / c.k, by = (r.top - c.y) / c.k, bw = r.width / c.k, bh = r.height / c.k;
      // (matter that lies far off the figure, a stray ring a whole box away, is not its body)
      if (bx > x1 + b.w || bx + bw < x0 - b.w || by > y1 + b.h || by + bh < y0 - b.h) continue;
      x0 = Math.min(x0, bx); y0 = Math.min(y0, by); x1 = Math.max(x1, bx + bw); y1 = Math.max(y1, by + bh);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  /** The batch framing holds for the whole batch (fix pass 3 H2, after its critic): on a phone it applies the moment
   *  `#app[data-busy="true"]` and lets go only when the page is no longer busy (120 ms later, so Auto's 40 ms between
   *  two batches is no release), never between two scenes nor for a board-only shot. For that, the HUD steps aside for
   *  the batch as a scene's does (`#app[data-batch]`, arena.css): the console keeps only its key row (Auto stays in
   *  reach), the turn tab and the rail go, and your plate drops to stand over the key row (`batchHud`), so the duel
   *  framed on the floor never stands under them. */
  watchBusy() {
    const app = this.host?.closest?.('#app') ?? document.getElementById('app');
    if (!app || typeof MutationObserver !== 'function') return;
    const go = () => {
      const on = Boolean(this.g?.phone) && app.dataset.busy === 'true';
      clearTimeout(this.busyT);
      if (on === Boolean(this.batching)) return;
      const turn = () => {
        this.batching = on;
        this.batchAt = null;
        this.batchHud(app, on);
        // (a cue's push that begins after this one replaces it: the framing is that push's `rest`)
        this.camTo(this.restCam(), this.reduced() ? 0 : 240, IN_OUT);
      };
      if (on) turn(); else this.busyT = setTimeout(() => { if (app.dataset.busy !== 'true') turn(); }, 120);
    };
    this.busyObs = new MutationObserver(go);
    this.busyObs.observe(app, { attributes: true, attributeFilter: ['data-busy'] });
    go();
  }
  /** The HUD for a phone's batch (`watchBusy`): `#app[data-batch]` and your plate's drop (`--batch-plate`, a transform,
   *  so nothing shifts) to 6 px over the console's key row; `batchFloor` is the plate's top, what the framing keeps
   *  every figure over. Read once a batch. */
  batchHud(app, on) {
    if (!app) return;
    if (!on) { delete app.dataset.batch; app.style.setProperty('--batch-plate', '0px'); this.batchFloor = null; return; }
    const acts = app.querySelector('#console .acts')?.getBoundingClientRect(), pl = app.querySelector('.hud .plate[data-side="player"]');
    // (the plate where the HUD stands it: its box less the drop it may still be easing back from, a batch that starts
    // inside the last one's return)
    const q = pl?.getBoundingClientRect();
    let ty = 0;
    try { ty = pl ? new DOMMatrixReadOnly(getComputedStyle(pl).transform).m42 || 0 : 0; } catch { ty = 0; }
    const pb = q && q.height > 0 ? { top: q.top - ty, bottom: q.bottom - ty } : null;
    const drop = acts && pb && acts.top > pb.bottom ? Math.round(acts.top - 6 - pb.bottom) : 0;
    app.style.setProperty('--batch-plate', `${drop}px`);
    app.dataset.batch = 'true';
    this.batchFloor = pb ? pb.top + drop : acts ? acts.top - 6 : null;
  }
  /** The board ending's push on a defender: 1.12 (MODES.md), raised for a small or far subject until it fills 6.5% of
   *  the frame (at most 2.4), never past what keeps it whole inside the open frame (bars at 0.86). */
  pushFor(fig) {
    const g = this.g, A = g.W * g.H, open = g.H * 0.86;
    // (a phone pushes to 7.5% of its frame: test 13's 5% with room for the timing's jitter, REQUESTS :11)
    const want = Math.sqrt(((g.phone ? 0.075 : 0.065) * A) / Math.max(1, fig.w * fig.h));
    const fit = Math.min((open * 0.8) / fig.h, (g.W * 0.7) / fig.w);
    return Math.max(1.12, Math.min(want, fit, 2.4));
  }
  /** The camera onto a figure at a contact: its centre at (fx, fy) of the frame, pushed `kPref`, but never so far or
   *  so off-centre that any of what reads the contact leaves the open frame (bars at 0.86): the figure, the numeral's
   *  headroom over it and its pad. On a phone that bounds the push; on wide screens it only nudges. */
  frameOn(fig, kPref, fx = 0.5, fy = 0.54, att = null) {
    const g = this.g, b = fig.box, p = this.pad[fig.side].bbox;
    const pts = [[b.x, b.y - (g.phone ? 64 : 100)], [b.x + b.w, fig.foot.y], [p.x, p.y], [p.x + p.w, p.y + p.h + 6]];
    const xs = pts.map((v) => v[0]), ys = pts.map((v) => v[1]);
    const at = (k, f) => frameOn({ box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], c: this.centreOf(fig), k, W: g.W, H: g.H, fx: f, fy, margin: g.phone ? 8 : 16 });
    // round 6 fix H5: the whip keeps the attacker in the shot, at least 35% of its drawn width inside the open frame
    // (left of the log rail from 1280 up): the push steps down toward 1.06 and the defender's share slides toward the
    // middle until it does, so a contact never plays with its attacker behind the HUD or off the frame
    const a = att && !att.el.hidden && att.box ? att.box : null;
    if (!a) return at(kPref, fx);
    const open = g.log ? g.log.x : g.W, seen = (c) => Math.max(0, Math.min(c.x + c.k * (a.x + a.w), open) - Math.max(c.x + c.k * a.x, 0)) / Math.max(1, c.k * a.w);
    let last = null;
    // (fix pass 2 H4: a phone keeps the attacker's drawn box in frame, all of it where it can (else 85%) inside the 14 px
    // its actor tag needs at the edge (the fix list's 60% still left the tag pinned at x 8 on 49 frames of the 390 strip), its push
    // stepping all the way to 1 at each of the defender's shares before the share moves toward the middle, never past it)
    if (g.phone) {
      const seenP = (c) => Math.max(0, Math.min(c.x + c.k * (a.x + a.w), open - 14) - Math.max(c.x + c.k * a.x, 14)) / Math.max(1, c.k * a.w);
      // (judged where the camera lands, `camAt`: the painting's edge holds a push that would bare it; and where no share
      // toward the middle keeps it, the defender's own share at rest, so the push leans on the duel as it stands)
      const rest = clamp(this.centreOf(fig).x / g.W, 0.2, 0.8);
      let best = null, bs = -1;
      for (const want of [0.98, 0.85]) for (const f of [fx, (fx + 0.5) / 2, 0.5, rest]) for (let k = kPref; ; k = Math.max(1, k - 0.04)) {
        const c = at(k, f), sc = seenP(this.camAt(c));
        if (sc >= want) return c;
        if (sc > bs) { bs = sc; best = c; }
        if (k <= 1) break;
      }
      return best ?? last;
    }
    for (let k = kPref; ; k = Math.max(1.06, k - 0.04)) {
      for (const f of [fx, (fx + 0.5) / 2, 0.5]) { const c = at(k, f); last = c; if (seen(c) >= 0.35) return c; }
      if (k <= 1.06) break;
    }
    return last;
  }
  /** The camera toward point `c` at the frame's (fx, fy) share and scale `kPref`, but never so far or so off-centre
   *  that the duel leaves the frame between the rails and the console: both figures standing, both leaders in any pose
   *  of a turn, both hands. With `clear` (the camera at rest) it also keeps every figure, leader and hand card off the
   *  HUD's plates and the log rail (test 11, 36), stepping the push down until they are. */
  keepDuel(c, kPref, fx = 0.5, fy = 0.5, kMin = 1, clear = false, right = null) {
    const g = this.g, boxes = [], solid = [];
    for (const s of SIDES) {
      // (at rest, the largest box any of the side's cards takes, so a switch never brings a figure under a plate)
      const f = this.active(s);
      if (clear) { boxes.push(g.box[s]); solid.push(g.box[s]); } else if (f && !f.el.hidden && !f.fallen) boxes.push(f.box);
      const rb = this.reach(s);
      boxes.push(rb); solid.push(rb);
      // and its hand, now held beside its leader
      const hb = this.hands[s]?.box;
      if (hb) { boxes.push(hb); solid.push(hb); }
    }
    const hud = clear ? this.hudBoxes() : [];
    const x0 = Math.min(...boxes.map((b) => b.x)), x1 = Math.max(...boxes.map((b) => b.x + b.w));
    const y0 = Math.min(...boxes.map((b) => b.y)), y1 = Math.max(...boxes.map((b) => b.y + b.h));
    const A = { x0: 6, y0: g.rail + 4, x1: Math.min(g.W - 6, right ?? Infinity), y1: g.floor - 4 };
    const keep = (want, lo, hi) => Math.min(hi, Math.max(lo, want));
    // on a wide screen a scene's call-out lands across the lower 30% of the frame: the hands stay above it
    const handsLow = g.phone ? 0 : Math.max(0, ...SIDES.map((t) => { const h = this.hands[t]?.box; return h ? h.y + h.h : 0; }));
    // the largest scale up to kPref at which the duel fits (and kMin where it must), else the camera at rest
    const lap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    // (what overlaps a plate at the camera's rest at 1 is the duel's own choice, ground.js keepOf; a push may not add)
    const base = (cam) => solid.reduce((n, b) => n + hud.reduce((m, h) => m + lap({ x: cam.x + cam.k * b.x, y: cam.y + cam.k * b.y, w: cam.k * b.w, h: cam.k * b.h }, h), 0), 0);
    const at1 = hud.length ? base({ x: 0, y: 0, k: 1 }) : 0;
    for (let k = Math.max(kMin, Math.min(kPref, (A.x1 - A.x0) / Math.max(1, x1 - x0), (A.y1 - A.y0) / Math.max(1, y1 - y0))); k >= kMin - 1e-9; k -= 0.02) {
      const xr = [A.x0 - k * x0, A.x1 - k * x1], yr = [A.y0 - k * y0, Math.min(A.y1 - k * y1, handsLow ? g.H * 0.7 - k * handsLow : Infinity)];
      if (xr[0] <= xr[1] && yr[0] <= yr[1]) {
        const cam = { x: keep(g.W * fx - k * c.x, ...xr), y: keep(g.H * fy - k * c.y, ...yr), k };
        if (!hud.length || base(cam) <= at1 + 1) return cam;
      }
    }
    return { x: 0, y: 0, k: 1 };
  }
  /** The HUD's boxes on a wide screen, screen px: both plates (shared/hud.js, at `plateBox`) and the log rail. */
  hudBoxes() {
    const g = this.g, out = [];
    if (g.phone) return out;
    // (the rival's plate where it stands, `rivalAt`, not its usual spot)
    { const p = deskPlate(g), r = this.rivalAt ?? rivalPlate(g); out.push({ x: p.x, y: p.bottom - p.h, w: p.w, h: p.h }, { x: r.x, y: r.y, w: r.w, h: r.h ?? 130 }); }
    if (g.log) out.push({ x: g.log.x - 6, y: g.log.y, w: g.log.w + 6, h: g.log.h });
    return out;
  }
  centreOf(fig) { return fig ? { x: fig.box.x + fig.box.w / 2, y: fig.box.y + fig.box.h / 2 } : { x: this.g.W / 2, y: this.g.H / 2 }; }
  active(side) { return this.figs.get(this.shown[side]) ?? null; }

  // ---------------------------------------------------------------- the seam
  /** Where a scene opens from (a card lying on the attacker's pad) and lands on (the defender), viewport px. */
  anchor(role, side) {
    const g = this.g, fig = this.active(side);
    if (!fig) return null;
    const c = this.cam;
    if (role === 'source') {
      const h = g.th * 2.2 * c.k, w = (h * 63) / 88;
      const x = c.x + c.k * fig.foot.x, y = c.y + c.k * fig.foot.y;
      return new DOMRect(x - w / 2, y - h * 0.62, w, h);
    }
    const r = fig.img.getBoundingClientRect();
    return r.width ? r : null;
  }
  async cue(verb, shot, at) {
    if (verb === 'deal') return wait(this.reduced() ? 0 : 260);
    // (fix pass 3 H4: no figure still in flight from an earlier shot at a shot's first frame: its carried return lands
    // first, at most 300 ms, else, where the shot is the other side's, it is snapped home at the cut; and a rival dim a
    // skipped post left goes)
    if (at === 'pre') { if (this.dimmed && !this.building) this.dimFoe(null, false, 0); if (this.titleEl) { if (this.titleEl.isConnected) this.titleEl.style.translate = ''; this.titleEl = null; } await this.landCarried(shot); }
    // a full scene that covers the board stills the living layer under it (its auras, idles and the tower's frames);
    // the transform scene's middle is open, so the board keeps living under it
    if (at === 'start') { if (shot?.variant === 'full' && shot?.scene?.kind !== 'transform') this.living('scene', true); if (verb === 'transform') return this.build(shot, 'start'); return undefined; }
    if (at === 'end') { this.living('scene', false); return undefined; }
    if (at === 'post') this.living('scene', false);
    if (verb === 'transform') return this.build(shot, at);
    if (at === 'pre') this.cueN = (this.cueN ?? 0) + 1;
    const s = shot?.scene, side = s?.side ?? 'player', foe = other(side);
    const full = s?.variant === 'full', rd = this.reduced(), off = s?.variant === 'off';
    // under Auto a short attack's pre-roll is 90 ms (the command pose holds on into the scene's build either way)
    const budget = rd ? 0 : at === 'pre' ? (full ? 240 : this.ctx.auto?.() ? 90 : 120) : at === 'post' ? (full ? 260 : 140) : 0;
    const L = this.leaders[side], Lo = this.leaders[foe];
    const me = this.active(side), them = this.active(foe);
    const special = s?.kind === 'attack' && Boolean(specials.find(s.card, s.move?.id));
    if (at === 'pre') {
      switch (verb) {
        case 'command': {
          // the first command's line: a full scene's cut-in carries it, otherwise its plate on the board
          L?.act('command', { hold: full ? 60 : 0 });
          L?.say('command');
          if (shot.cut) {
            // a repeat on the board alone: the move's name stamped on the attacker's flag, the camera whips to the
            // defender, and the contact lands (190 ms), never before the defender's last number has been read; under
            // reduced motion only the name is stamped
            // (fix pass 2 H5: and never before the attacker is home from its last flight, so a second cut's tag never
            // stands on an empty pad)
            if (them) await Promise.all([this.untilRead(them.uid, rd ? 0 : 190), rd ? null : this.home(me)]);
            // (the move's name over the attacker's head, until the page's actor tag says it: `moveStamp` false)
            if (me && this.moveStamp !== false) this.stamp(me, s.move?.name ?? s.title, 'move', 560, { x: me.box.x + me.box.w / 2, y: me.box.y - (this.g.phone ? 14 : 22) });
            if (rd) return undefined;
            me?.aura?.beat('act', { ms: 90 });
            this.attack(me, 260);
            me?.ptd?.fire(performance.now() + 90);
            me?.aura?.beat('release', { ms: 260 });
            await wait(90);
            // (round 6 fix H5: a cut skips the whip; the defender's reaction plays in the rest framing)
            await wait(100);
            return undefined;
          }
          // the push leans on the attacker (and its leader) but keeps the whole duel in frame: both figures, both
          // leaders in any pose of the turn, both flags with their chips
          if (me && !rd) {
            const c = this.centreOf(me), lh = L.head();
            // (a phone mid-batch keeps its batch framing, the floor the console left: fix pass 3 H2)
            const to = this.g.phone && this.batching ? this.batchCam() : special && full ? this.keepDuel(c, 1.14, 0.5, 0.52) : this.keepDuel({ x: (c.x + lh.x) / 2, y: (c.y + lh.y + lh.h) / 2 }, 1.06);
            this.camTo(to, special && full ? 220 : 200, 'cubic-bezier(.3,.7,.1,1)');
            // the attacker winds up inside the pre-roll (its class's anticipation, held to the board cue at the
            // scene's impact - 130) and its card gathers round it until impact - 40
            const I = shot.compiled?.impact ?? 600;
            this.anticipate(me, budget, budget + Math.min(900, Math.max(0, I - 130)) - Math.min(me.verbs.anticipation.ms, budget));
            me.aura?.beat('act', { ms: budget + Math.max(0, I - 40) });
          }
          await wait(budget);
          L?.act('charge', { impact: Math.max(200, (shot.compiled?.impact ?? 600) - 40) });
          return undefined;
        }
        case 'entrance': {
          const e = shot.post[0];
          const fig = this.figs.get(e?.to);
          L?.act('entrance'); L?.say('enter');
          if (fig) await this.throwIn(fig, rd ? 0 : off ? 260 : 380);
          return undefined;
        }
        case 'switch': {
          const e = shot.post[0];
          const out = this.figs.get(e?.from ?? this.shown[side]);
          const inc = this.figs.get(e?.to);
          const quick = !full;
          if (out && !out.el.hidden && out.uid !== inc?.uid) {
            // its card's pieces spiral into the pad, then it sinks and its card goes home
            const so = out.verbs.switchOut, sv0 = quick ? so.quick : so;
            out.aura?.beat('switch-out', { ms: rd ? 0 : sv0.spiralMs });
            this.idle(out, false);
            const sink = this.bayerFade(out, false, rd ? 0 : sv0.sinkMs);
            // its card goes back to its leader's hand as the pad empties
            if (this.shown[side] === out.uid) { this.shown[side] = null; this.drawSides(this.view); }
            this.cardFly(out, rd ? 0 : quick ? 180 : 300);
            await sink;
          }
          L?.act('switch');
          // (fix pass 2 H8: the card's arc is 380 ms by hand, 190 on Auto, short or full; the figure rises only once it lands)
          if (inc) await this.throwIn(inc, rd ? 0 : this.ctx.auto?.() ? 190 : 380, quick);
          return undefined;
        }
        case 'item': {
          const e = shot.post[0];
          await Promise.all([this.untilRead(e?.target, rd ? 0 : this.ctx.auto?.() ? 200 : 300), rd ? null : this.home(me)]);
          L?.act('switch');
          await this.itemFly(side, e?.target, e?.name ?? '', rd ? 0 : this.ctx.auto?.() ? 200 : 300);
          return undefined;
        }
        case 'guard': L?.act('command'); return off ? undefined : wait(Math.min(budget, 120));
        case 'trait': if (!off) { L?.act('special'); L?.say('special'); } return off ? undefined : wait(Math.min(budget, 120));
        case 'ko': return undefined;
        case 'victory': case 'defeat': case 'draw': return undefined;
        default: return off ? undefined : wait(Math.min(budget, 120));
      }
    }
    if (at === 'board') {
      // the result is staged from the board: the camera pulls back on both leaders as they pose, while the title holds
      if (verb === 'victory' || verb === 'defeat' || verb === 'draw') { this.finaling = this.finale(s?.side ?? 'player', verb); return undefined; }
      // the board ending (impact - 130 ms): the camera whips to put the defender at 58% of the width, pushes 1.12
      if (rd) return undefined;
      if (verb === 'support') { if (me) return this.camTo(this.frameOn(me, 1.1, side === 'player' ? 0.42 : 0.58), 120, WHIP); return undefined; }
      // the attack by its body class, the card's own pieces released at the foe, the tower's own shot peaking at
      // impact - 40, and the card's signature beat (specials) landing at the impact
      me?.aura?.beat('release', { ms: 130, miss: verb === 'miss', crit: verb === 'crit' });
      me?.ptd?.fire(performance.now() + 90);
      this.special(shot, me, them, verb);
      this.attack(me);
      if (them) return this.camTo(this.frameOn(them, this.pushFor(them), them.side === 'rival' ? 0.58 : 0.42, 0.54, me), 120, WHIP);
      return undefined;
    }
    if (at === 'impact') {
      if (shot.cut && verb !== 'support') this.special(shot, me, them, verb);
      switch (verb) {
        case 'hit': case 'crit': {
          if (shot.board) { this.flush(shot); this.shake(); this.tags(shot); }
          else this.flush(shot, { quiet: true });
          this.fallNow();
          Lo?.act('taken');
          const f = this.view?.sides[foe].team.find((x) => x.uid === them?.uid);
          if (f && f.hp > 0 && f.hp <= f.maxHp / 2) Lo?.say('hit');
          if (verb === 'crit') { L?.act('special'); L?.say('special'); }
          return undefined;
        }
        case 'miss': {
          if (shot.board) { this.sidestep(them); this.stamp(them, txt('scene.miss'), 'miss', 700); }
          return undefined;
        }
        case 'support': {
          if (shot.board) { this.ring(side, 'support'); this.flush(shot); if (s?.label) this.stamp(me, s.label, 'support', 900); this.tags(shot); }
          else this.flush(shot, { quiet: true });
          return undefined;
        }
        case 'status': {
          this.flush(shot);
          this.fallNow();
          const e = shot.post[0];
          if (e?.change === 'applied') { const f = this.figs.get(e.fighter); this.stamp(f, txt(`stamp.${e.status}`) || e.status, 'status', 700); this.leaders[e.side]?.act('taken'); f?.aura?.beat('hit', { status: e.status, share: 0 }); }
          return undefined;
        }
        case 'guard': { this.shield(side); this.flush(shot); this.tags(shot); return undefined; }
        case 'trait': { this.flush(shot); if (off) this.stamp(this.figs.get(shot.post[0]?.fighter) ?? me, s.title, 'trait', 600); this.tags(shot); return undefined; }
        case 'item': { this.flush(shot); this.tags(shot); return undefined; }
        default: this.flush(shot); this.fallNow(); this.tags(shot); return undefined;
      }
    }
    // post
    switch (verb) {
      case 'hit': case 'crit': case 'miss': case 'support': {
        if (!shot.board && !off) {
          // a full scene kept its own ending (its contact, flash and number); back on the board the camera finds the
          // defender and the figure carries the consequence: the numeral over it and a recoil, the rim already drained.
          // No second shake, flash or special: the scene was the attack, so this reads as its landing, not a new hit.
          if (verb !== 'support' && them) {
            if (!rd) this.camTo(this.frameOn(them, this.pushFor(them), them.side === 'rival' ? 0.58 : 0.42, 0.54, me), 160, WHIP);
            // the scene's own number was the hit's one number; the figure only takes the landing (a beaten one has gone)
            if (verb === 'miss') { this.sidestep(them); this.stamp(them, txt('scene.miss'), 'miss', 700); }
            else if (!them.fallen) { const h = shot.post.find((e) => e.kind === 'hit' && e.target === them.uid); this.recoil(them, { share: (h?.damage ?? 0) / Math.max(1, them.maxHp ?? 1), crit: Boolean(h?.crit) }); them.aura?.beat('hit', { share: (h?.damage ?? 0) / Math.max(1, them.maxHp ?? 1) }); }
            // the attacker re-lit in the settle (its rim 0.6, its card a touch brighter), and what changed in chips
            if (me && !rd) { this.rimPulse(me, hueOf(me.id).energy, 0.6); me.aura?.beat('release', { relight: this.ctx.auto?.() ? 140 : 200 }); }
            this.tags(shot);
            // a beaten figure has already gone down under the scene: its knockout follows at once. Under Auto the
            // landing takes as long as a short attack's (the whip lands on the defender), as on the Mat
            // By hand it holds until the recoil has played (340 ms), as long as the Mat's settle
            await wait(rd ? 0 : this.ctx.auto?.() ? Math.min(budget, 140) : them.fallen ? budget : 340);
          } else if (verb === 'support') { this.ring(side, 'support'); if (s?.label) this.stamp(me, s.label, 'support', 900); this.tags(shot); }
          // the camera's return overlaps the next shot's pre-roll (which takes the camera from wherever it is): under
          // Auto at once, by hand after one beat
          if (this.ctx.auto?.()) { this.rest(260); return undefined; }
          this.rest(budget);
          return wait(rd ? 0 : 100);
        }
        // a cut holds its push on the defender while its number lands, then settles unless the next shot has begun
        if (shot.cut) { this.later(300, () => this.rest(budget)); return wait(rd ? 0 : 80); }
        await this.rest(budget);
        return undefined;
      }
      case 'entrance': this.flush(shot); return undefined;
      case 'switch': this.flush(shot); return undefined;
      case 'ko': return this.knockOut(shot.post[0], shot);
      case 'victory': case 'defeat': case 'draw': { const f = this.finaling ?? this.finale(s?.side ?? 'player', verb); this.finaling = null; return f; }
      default: this.flush(shot); return off ? undefined : wait(Math.min(budget, 120));
    }
  }

  /** The card's own answer on the board (specials.js): the most specific definition for its card and move. */
  special(shot, me, them, verb) {
    const s = shot?.scene;
    if (!s?.move || !me || !them || this.reduced()) return;
    const d = specials.find(s.card, s.move.id);
    if (!d) return;
    const box = (fig) => ({ foot: fig.foot, ...fig.box, side: fig.side });
    // round 6 (ROUND6.md section 7, specials ctx): the attacker's figure (`me`, so a body may answer its own shot),
    // the layer behind the near figure and the rule that picks it (`layerFor`: a target farther than the near figure
    // takes the back layer), the form a form card stands, and where its shot leaves it (`muzzle`, board px)
    const near = SIDES.map((t) => this.active(t)).filter(Boolean).reduce((m, f) => Math.max(m, f.foot.y), -Infinity);
    const layerFor = (to) => ((to?.foot?.y ?? Infinity) < near - 1 ? { layer: this.fxBack, svg: this.fxBackSvg } : { layer: this.fx, svg: this.fxSvg });
    const muzzle = () => me.ptd?.muzzle() ?? this.muzzleOf(me);
    try {
      const p = d.play({
        svg: this.fxSvg, layer: this.fx, g: this.g, from: box(me), to: box(them), side: s.side, hits: s.hits ?? 1, crit: verb === 'crit', miss: verb === 'miss',
        seed: (this.view?.turn ?? 1) * 7 + (s.move.index ?? 0), subject: me.img.currentSrc || me.img.src,
        ...this.fxKit(), shake: (a, ms) => this.shake(a, ms), move: s.move.id,
        me, fxBack: { layer: this.fxBack, svg: this.fxBackSvg }, layerFor, form: me.key ? { key: me.key, form: me.key.split('-')[0], level: me.key.split('-')[1] } : null, muzzle,
        // the shot itself, so a special answers what landed (Mailroom's postmark on a status applied, Club's coins home on a drain)
        shot,
      });
      // a special that flies the card's own picture carries the figure: the figure and its shadows leave the pad as
      // the picture sets off and stand again the frame it lands home, so the card is never in frame twice (MODES.md
      // section 4)
      const c = d.carries;
      if (c && p) {
        const frames = [{ opacity: 0 }, { opacity: 0, offset: c.back }, { opacity: 1, offset: c.back + 0.001 }, { opacity: 1 }];
        for (const a of me.carry ?? []) a.cancel();
        me.carry = [me.body, me.ground?.el].filter(Boolean).map((e) => this.anim(e, frames, { duration: c.ms, easing: 'linear' }));
      }
    } catch (err) { console.warn('special', s.card, err); }
  }
  /** A mark the battle leaves on the painted floor (a scorch) where a round lands, lying in its perspective; the last
   *  eight stay. `at` is a board point and a radius in px there. */
  decal(kind, at) {
    const g = this.g, p = unproject(g.P, at.x, at.y);
    if (!(p.Z > 0)) return;
    const r = at.r / ppm(g.P, p.X, p.Z);
    const box = el('div', 'floor-at', this.decals);
    // the pad it lies on, if any: a mark goes with its figure when the figure goes
    for (const s of SIDES) if (Math.hypot(p.X - g.st[s].X, p.Z - g.st[s].Z) < PAD * 1.6) box.dataset.side = s;
    Object.assign(box.style, { width: `${R(2 * r * S)}px`, height: `${R(2 * r * S)}px`, transform: floorBox(g, p.X, p.Z, R(2 * r * S) / S, R(2 * r * S) / S) });
    const d = el('i', `decal decal-${kind}`, box);
    if (!this.reduced()) this.anim(d, [{ opacity: 0, scale: '0.6' }, { opacity: 1, scale: '1' }], { duration: 260, easing: OUT });
    while (this.decals.children.length > 8) this.decals.firstElementChild.remove();
  }
  /** The marks on a pad fade with the figure that took them. */
  clearDecals(side) {
    for (const d of this.decals.querySelectorAll(`:scope > [data-side="${side}"]`)) {
      if (this.reduced()) { d.remove(); continue; }
      this.anim(d, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: OUT }).finished.catch(() => {}).then(() => d.remove());
    }
  }
  /** A card in flight in screen space (the fly layer, over the board): from a rect to a rect, an arc. */
  flyCard(id, from, to, ms, o = {}) {
    const c = el('div', 'flycard', this.fly);
    const p = K.cardParts(id, { size: 'mini', back: false, live: false, parent: c });
    // the card's back: the team rail's face-down pip, the same Bayer dots
    const back = el('i', 'flycard-back', c);
    back.style.opacity = o.down === 'end' ? '0' : o.down ? '1' : '0';
    void p;
    const w = from.w, h = from.h;
    Object.assign(c.style, { width: `${R(w)}px`, height: `${R(h)}px` });
    const at = (r, extra = '') => `translate3d(${(r.x + r.w / 2 - w / 2).toFixed(1)}px,${(r.y + r.h / 2 - h / 2).toFixed(1)}px,0) scale(${(r.w / w).toFixed(3)}) ${extra}`;
    // the arc's apex stays inside the frame
    const top = Math.max(8 + Math.max(from.h, to.h) / 2, Math.min(from.y, to.y) - (o.lift ?? 60));
    const mid = { x: (from.x + to.x) / 2, y: top, w: ((from.w + to.w) / 2) * 1.08, h: 0 };
    c.style.transform = at(to, o.endExtra ?? '');
    if (this.reduced() || !ms) { c.remove(); return Promise.resolve(); }
    const a = this.anim(c, [
      { transform: at(from, o.startExtra ?? 'rotate(-8deg)') },
      { transform: at(mid, `rotate(${o.spin ?? 6}deg) scale(${o.down === 'end' ? 0.05 : 1},1)`), offset: 0.5 },
      { transform: at(to, o.endExtra ?? '') },
    ], { duration: ms, easing: 'cubic-bezier(.3,.5,.4,1)' });
    // a card turned over on the way: its back shows from the middle of the arc
    if (o.down === 'end') this.anim(back, [{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1, offset: 0.501 }, { opacity: 1 }], { duration: ms, fill: 'forwards' });
    return a.finished.catch(() => {}).then(() => (o.hold ? wait(o.hold) : null)).then(() => { if (o.keep) return c; if (o.hold && !this.reduced()) this.anim(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished.catch(() => {}).then(() => c.remove()); else c.remove(); return null; });
  }
  screenRect(r) { const c = this.cam; return { x: c.x + c.k * r.x, y: c.y + c.k * r.y, w: r.w * c.k, h: r.h * c.k }; }
  /** A card's place in its leader's hand on screen (`extra`: counted in although it is not there yet). */
  handRect(side, uid, extra = null) {
    const r = this.slotOf(side, uid, extra);
    if (r) return { ...this.screenRect(r), rot: r.rot };
    const L = this.leaders[side], b = L.bounds(L.cur), h = this.g.th * 1.1;
    return { ...this.screenRect({ x: b.x + b.w / 2 - h * 0.36, y: b.y + b.h * 0.35, w: (h * 63) / 88, h }), rot: 0 };
  }
  /** The card lying on a pad: 0.8 m long down the duel axis, at the stand's scale, and the affine that lays a card of
   *  that size flat on the floor there (a card's own px to board px, about its centre). */
  padCard(side) {
    const g = this.g, st = g.st[side], C = g.foot[side], lm = 0.8, wm = (lm * 63) / 88;
    const h = lm * st.k, w = wm * st.k;
    const a = g.pt(g.off(side, 0, wm / 2)), b = g.pt(g.off(side, -lm / 2, 0));
    const lie = `matrix(${((a.x - C.x) / (w / 2)).toFixed(4)},${((a.y - C.y) / (w / 2)).toFixed(4)},${((b.x - C.x) / (h / 2)).toFixed(4)},${((b.y - C.y) / (h / 2)).toFixed(4)},0,0)`;
    return { ...this.screenRect({ x: C.x - w / 2, y: C.y - h / 2, w, h }), lie };
  }
  /** The leader throws the card in an arc onto the pad; it lands face up, its world pours up, the figure rises. */
  /** A pad's plates belong to the figure that stood there: they go when another one takes the pad. Its last number
   *  finishes on its own (it is read by then: the knockout and the send-in take longer than its hold). */
  clearMarks(side, uid) { for (const x of this.fx.querySelectorAll(`:scope > [data-side="${side}"]:not(.num)`)) if (x.dataset.uid !== uid) x.remove(); }
  async throwIn(fig, ms, quick = false) {
    const side = fig.side;
    // the card leaves its leader's hand
    const from = this.handRect(side, fig.uid);
    this.clearMarks(side, fig.uid);
    this.revealed.add(fig.uid);
    // the figure is not shown until its card lands
    for (const f of this.figs.values()) if (f.side === side && f !== fig) this.showing(f, false);
    this.shown[side] = fig.uid;
    this.drawHand(side);
    if (this.reduced() || !ms) { fig.arriving = false; this.showing(fig, true); K.bayer(fig.body, 16); this.drawSides(this.view); fig.aura?.beat('switch-in', { ms: 0 }); await this.standing(fig); return; }
    fig.arriving = true;
    this.showing(fig, false);
    const V = fig.verbs.switchIn, v = quick ? { ...V, ...V.quick } : V;
    // (never left unseen: a flight a skip or unmount cut short lets it stand)
    setTimeout(() => { if (fig.arriving) { fig.arriving = false; if (this.shown[side] === fig.uid && fig.el.isConnected) this.showing(fig, true); } }, v.waitMs + ms + 2000);
    if (!quick) await wait(v.waitMs);
    // it lands lying flat on the painted floor, face up, on its pad, in the floor's perspective
    const to = this.padCard(side);
    await this.flyCard(fig.id, from, to, ms, { lift: this.g.th * (quick ? 1.6 : 2.6), spin: side === 'player' ? 14 : -14, endExtra: to.lie, hold: quick ? 0 : 140 });
    // its card's floor matter grows from the pad, the figure rises out of it, and its pieces spiral out after the rise
    fig.arriving = false;
    fig.matter.hidden = false;
    this.growMatter(fig, v.growMs);
    fig.aura?.beat('switch-in', { ms: v.growMs, rise: v.riseMs, at: v.riseMs + v.piecesAt, pieces: v.piecesMs });
    this.drawSides(this.view);
    await this.bayerFade(fig, true, v.riseMs);
    this.wear(this.view);
    // (fix pass 3 H7: the entrance resolves once the figure stands: its still loaded and drawn, its card's aura built)
    await this.standing(fig);
  }
  /** Does the figure stand whole now: shown, its still decoded and laid, its aura built (where auras are on)? */
  stands(fig) {
    if (!fig || fig.el.hidden || fig.arriving || !fig.box) return false;
    const im = fig.img;
    if (!im.complete || !(im.naturalWidth > 0) || !im.getAttribute('src')) return false;
    const auraOff = /[?&]debug\b/.test(location.search) && new URLSearchParams(location.search).get('aura') === '0';
    if (auraOff || fig.auraFailed) return true;
    return Boolean(fig.aura?.info?.built);
  }
  /** Resolves when `stands(fig)`, checked every 50 ms on the paced clock, at most `cap` ms (never a stalled entrance). */
  standing(fig, cap = 2500) {
    if (this.stands(fig)) return Promise.resolve(true);
    return new Promise((r) => {
      const t0 = performance.now();
      const tick = () => { if (this.stands(fig)) return r(true); if (performance.now() - t0 > cap || !this.host?.isConnected) return r(false); setTimeout(tick, 50); };
      setTimeout(tick, 50);
    });
  }
  /** Fix pass 3 H7: the deal is done when both sides' figures stand (`stands`) and both hands stand drawn (their print's
   *  pictures and faces in, `makeHand`); shared/battle.js awaits it before the battle goes live (fixes-3 I2). */
  dealt(cap = 9500) {
    const ok = () => SIDES.every((s) => {
      const f = this.active(s), H = this.hands[s];
      return this.stands(f) && H?.box && H.el.style.visibility !== 'hidden';
    });
    if (ok()) return Promise.resolve(true);
    return new Promise((r) => {
      const t0 = performance.now();
      const tick = () => { if (ok()) return r(true); if (performance.now() - t0 > cap || !this.host?.isConnected) { this.dealStall = SIDES.map((s) => ({ side: s, stands: this.stands(this.active(s)), hand: Boolean(this.hands[s]?.box) && this.hands[s].el.style.visibility !== 'hidden' })); return r(false); } setTimeout(tick, 50); };
      setTimeout(tick, 50);
    });
  }
  /** The outgoing card flies back to its leader's hand, or a knocked-out one lands there face down. */
  cardFly(fig, ms, down = false) {
    if (!fig) return Promise.resolve();
    const side = fig.side, from = this.padCard(side);
    this.away.add(fig.uid);
    const to = this.handRect(side, fig.uid, fig.uid);
    const home = () => { this.away.delete(fig.uid); this.drawHand(side); };
    if (!ms || this.reduced()) { home(); return Promise.resolve(); }
    return this.flyCard(fig.id, from, to, ms, { down: down ? 'end' : false, lift: this.g.th * 1.4, spin: fig.side === 'player' ? -10 : 10, endExtra: `rotate(${to.rot.toFixed(1)}deg)` }).then(home);
  }
  async itemFly(side, target, name, ms) {
    const fig = this.figs.get(target);
    const L = this.leaders[side];
    const b = L.bounds(L.cur);
    const from = this.screenRect({ x: b.x + b.w / 2, y: b.y + b.h * 0.3, w: 1, h: 1 });
    let to;
    if (fig && !fig.el.hidden) to = this.screenRect({ x: fig.foot.x, y: fig.foot.y - fig.h * 0.55, w: 1, h: 1 });
    else { const r = this.handRect(side, target); to = { x: r.x + r.w / 2, y: r.y + r.h / 2, w: 1, h: 1 }; }
    const chip = el('b', 'item-chip', this.fly, name);
    chip.style.transform = `translate3d(${R(to.x)}px,${R(to.y)}px,0)`;
    if (ms && !this.reduced()) await this.anim(chip, [
      { transform: `translate3d(${R(from.x)}px,${R(from.y)}px,0) scale(.8)` },
      { transform: `translate3d(${R((from.x + to.x) / 2)}px,${R(Math.min(from.y, to.y) - 50)}px,0) scale(1.1)`, offset: 0.5 },
      { transform: `translate3d(${R(to.x)}px,${R(to.y)}px,0) scale(1)` },
    ], { duration: ms, easing: 'cubic-bezier(.3,.6,.4,1)' }).finished.catch(() => {});
    chip.remove();
    if (fig && !fig.el.hidden) this.ring(side, 'heal');
  }
  /** The lethal contact: the beaten figure drains to one ink at once (it reads as down on the contact's first frame)
   *  and sinks into its pad through the 4x4 Bayer, its rim already empty; nothing stands it back up but a Rollback. */
  fallNow() { for (const uid of this.falling) { const fig = this.figs.get(uid); if (fig && fig.hp <= 0) this.fall(fig); } this.falling.clear(); }
  fall(fig) {
    if (!fig || fig.fallen) return fig?.sinking ?? Promise.resolve();
    fig.fallen = true;
    const p = this.rail[fig.side]?.pips.find((x) => x.uid === fig.uid);
    // its pip turns out when its card arrives there
    if (p) p.li.dataset.flown = 'pending';
    this.leaders[fig.side]?.act('taken');
    const V = fig.verbs, pics = [fig.img, fig.ptd?.canvas].filter(Boolean);
    // drained to one ink on the contact's first frame (test 20): the state reads at once, whatever moves after
    for (const p of pics) p.style.filter = V.ko.to;
    this.idle(fig, false);
    fig.ptd?.freeze(true);
    if (this.reduced() || fig.el.hidden) { fig.sinking = this.bayerFade(fig, false, 0); return fig.sinking; }
    for (const p of pics) this.anim(p, [{ filter: V.ko.from }, { filter: V.ko.to }], { duration: V.ko.drainMs, easing: OUT });
    // its card goes down with it (the pieces drop to the floor and fade with the sink), its body takes its class's
    // knockout pose (a machine dips its nose, a character tips away, a floater falls to the floor, a mark tilts over),
    // held, then it sinks through the Bayer from that pose
    fig.aura?.beat('ko', { ms: V.koPose.ms });
    const kp = V.koPose, end = kp.kind === 'fall' ? { up: -(fig.lift ?? 0) } : { rot: kp.tilt, up: -(kp.drop ?? 0) };
    this.unpose(fig);
    fig.held = [this.posed(fig, [[0, {}], [1, end]], { duration: kp.ms, easing: 'cubic-bezier(.5,0,.75,.4)', fill: 'forwards' })];
    const base = this.poseOf(fig, end).body;
    const auto = this.ctx.auto?.();
    fig.sinking = wait(kp.ms).then(() => (fig.fallen && !fig.el.hidden ? this.bayerFade(fig, false, auto ? V.ko.auto.sinkMs : V.ko.sinkMs, base) : null));
    return fig.sinking;
  }
  /** The knockout: the card that lay under the fallen figure flies face down into its leader's hand. */
  async knockOut(e, shot) {
    const fig = this.figs.get(e?.fighter);
    if (!fig) return;
    const rd = this.reduced(), ms = rd ? 0 : this.ctx.auto?.() ? 340 : 420;
    const p = this.rail[fig.side].pips.find((x) => x.uid === fig.uid);
    const sink = this.fall(fig);
    const fly = this.cardFly(fig, ms, true);
    this.clearDecals(fig.side);
    await Promise.all([sink, fly]);
    fig.img.style.filter = '';
    if (fig.ptd) { fig.ptd.canvas.style.filter = ''; fig.ptd.freeze(false); }
    if (p) { delete p.li.dataset.flown; }
    if (this.shown[fig.side] === fig.uid) this.shown[fig.side] = null;
    this.drawSides(this.view);
    if (p && !rd) this.anim(p.li, [{ scale: '1.25' }, { scale: '1' }], { duration: 260, easing: SLAM });
    if (!rd) this.rest(220);
    void shot;
  }
  /** Victory or defeat: pull back to 0.94 to frame both leaders; they take their poses and say their lines. */
  async finale(winner, verb) {
    const rd = this.reduced(), g = this.g;
    // pull back to 0.94 about the two leaders, never so far that either leaves the frame between the rails and the
    // console in any pose (keepDuel), so both are whole for the title and the panel
    const a = this.reach('player'), b = this.reach('rival');
    // (fix pass 2 H2: and left of the log rail, 12 px clear of it, from 1280 up)
    this.camTo(this.keepDuel({ x: (a.x + a.w / 2 + b.x + b.w / 2) / 2, y: (a.y + a.h / 2 + b.y + b.h / 2) / 2 }, 0.94, 0.5, 0.5, 0.8, false, g.log ? g.log.x - 12 : null), rd ? 0 : 600, OUT);
    finalePoses(this.leaders, winner, verb, rd ? 0 : 1100);
    // the winner's card turns slower and wider round it; the loser's is gone with its figure
    if (verb !== 'draw') this.active(winner)?.aura?.beat('victory', {});
    if (verb === 'draw') return;
    this.host.dataset.finale = winner;
    await wait(rd ? 0 : this.ctx.auto?.() ? 300 : 600);
  }
  // ---------------------------------------------------------------- round 6: what each figure wears and stands
  /** Run `f` `ms` from now on the board's clock: an empty Web Animation, so a press lands it at once (in order), a
   *  dialog holds it and the pace scales it. */
  after(ms, f) {
    let done = false, t = 0;
    const a = this.anim(this.clockEl, [{ opacity: 0 }, { opacity: 0 }], { duration: Math.max(0, ms) });
    const go = () => { if (done) return; done = true; clearTimeout(t); try { a.cancel(); } catch { /* gone */ } f(); };
    // (and a timer on the paced clock, so the recorder's frozen clock steps it too; a held board waits for its play)
    t = setTimeout(() => { if (a.playState === 'paused' && !window.battlePace?.manual) return; go(); }, Math.max(0, ms));
    return a.finished.then(go, () => {});
  }
  /** Each card's aura (arena/aura.js): mounted once for every figure (nothing is fetched or built until it stands,
   *  after the deal), placed at every layout, paused on the bench and with the living layer. */
  mountAuras() {
    // (`?debug&aura=0` stands the figures bare: the perf probes' control for what the auras cost)
    // (Princeton TD's tower stands either way: the control changes the auras alone, round 6 fix H6)
    for (const fig of this.figs.values()) if (this.g) this.ensurePtd(fig);
    if (/[?&]debug\b/.test(location.search) && new URLSearchParams(location.search).get('aura') === '0') return;
    for (const fig of this.figs.values()) {
      if (fig.aura || !this.g) continue;
      try {
        fig.aura = mountAura(fig, { ground: fig.matter, ringFront: fig.ringFront, hue: hueOf(fig.id), paused: this.still.size > 0 || fig.el.hidden, anim: (e, f, o) => this.anim(e, f, o), ptd: fig.ptd ?? null, reduced: () => this.reduced(), side: fig.side });
        fig.aura.place(this.g.st[fig.side], this.g);
        fig.aura.pause(this.still.size > 0 || fig.el.hidden);
        const f = this.view?.sides[fig.side].team.find((x) => x.uid === fig.uid);
        if (f && !fig.el.hidden) fig.aura.state(f);
      } catch (err) { fig.aura = null; fig.auraFailed = true; console.warn('aura', fig.id, err); }
    }
  }
  /** Princeton TD stands the game's own tower (arena/ptd-figure.js): its canvas over the still in the picture's exact
   *  box, its level badge and scaffold on the card it wears; the still shows until the canvas has drawn. */
  ensurePtd(fig) {
    if (fig.id !== 'princeton-td' || fig.ptd || !this.ptdMod?.createPtdFigure) return;
    const board = this, foe = { get fig() { return board.active(other(fig.side)); }, get foot() { return board.active(other(fig.side))?.foot ?? board.g?.foot[other(fig.side)]; }, get box() { return board.active(other(fig.side))?.box; } };
    try {
      const p = fig.ptd = this.ptdMod.createPtdFigure(fig, { side: fig.side, live: ptdLive(this.reduced()), foe });
      p.canvas.classList.add('ptd-canvas');
      fig.img.after(p.canvas);
      fig.auraFront.append(p.scaffold, p.badge);
      p.view(VIEW[fig.side]);
      p.set(fig.key ?? PTD_PLAIN);
      p.pause(this.still.size > 0 || fig.el.hidden);
      // the still stays under the canvas until the canvas has drawn (CLS 0, nothing blank)
      p.ready?.then(() => { if (fig.ptd === p) fig.el.dataset.ptd = 'live'; }).catch(() => {});
      if (this.g) this.placePtd(fig);
    } catch (err) { fig.ptd = null; console.warn('ptd', err); }
  }
  /** The tower's canvas, badge and scaffold for its stand (they size from the picture's own box). */
  placePtd(fig) {
    const p = fig.ptd;
    if (!p) return;
    fig.el.style.setProperty('--fig-top', `${(fig.box.y - (fig.foot.y - fig.h)).toFixed(1)}px`);
    p.badge.style.setProperty('--k', String(+(fig.k / 100).toFixed(4)));
  }
  /** A turret's aim at the foe (cannon, mortar): atan2(2 dy, dx) of the foe's foot from its own (the floor's 2:1). */
  aim(fig, ms = 150) {
    if (!fig?.ptd || !this.g) return;
    const a = this.g.foot[fig.side], foe = this.active(other(fig.side)), b = foe?.foot ?? this.g.foot[other(fig.side)];
    fig.ptd.aim(Math.atan2(2 * (b.y - a.y), b.x - a.x), this.reduced() ? 0 : ms);
  }
  /** Where a figure's shot leaves it (board px): the manifest's per-view `fx.anchor`, else the top of its box. */
  muzzleOf(fig) {
    const v = fig.view, a = v?.fx?.anchor;
    if (a && fig.s) return { x: fig.foot.x - v.foot[0] * fig.s + a[0] * fig.s, y: fig.foot.y - v.foot[1] * fig.s + a[1] * fig.s };
    return { x: fig.box.x + fig.box.w / 2, y: fig.box.y + fig.box.h * 0.3 };
  }
  /** What a shot changed, as chips (shared/fx.js postTags): under the struck card's number, over the head of the card
   *  that acted; once a shot. */
  tags(shot) {
    if (!shot || shot.tagged || !FX.postTags) return;
    shot.tagged = true;
    const g = this.g;
    FX.postTags(shot.post ?? [], {
      motion: this.motion, reduced: this.reduced(), auto: this.ctx.auto?.(), at: performance.now(), icon: this.ctx.icon,
      anchorOf: (uid, o) => {
        const fig = this.figs.get(uid);
        if (!fig || fig.el.hidden || !fig.box) return null;
        const x = fig.box.x + fig.box.w / 2;
        return o?.self ? { layer: this.fx, x, y: fig.box.y - (g.phone ? 10 : 16) } : { layer: this.fx, x, y: fig.box.y + (g.phone ? 34 : 50), above: false };
      },
    });
  }

  // ---------------------------------------------------------------- a tower built or upgraded (ROUND6.md section 5.4)
  /** The game's construction on the pad, by the transform scene's clock: the old tower sinks, the foundation ring is
   *  drawn in the new tower's accent, the scaffold rises, the new tower rises behind it, and at the impact the badge
   *  lands and the turret turns; an upgrade wraps the standing tower, fires its own pulse and grows into the next
   *  level, its scaffold standing for the barrier. The board draws the change; the scene only frames it. */
  async build(shot, at) {
    const e = shot?.post?.find((x) => x.kind === 'transform'), side = e?.side ?? shot?.scene?.side ?? 'player';
    const fig = (e && this.figs.get(e.fighter)) ?? this.active(side);
    const rd = this.reduced(), auto = this.ctx.auto?.(), v = shot?.variant ?? 'short';
    if (!e || !fig || fig.el.hidden) { if (at === 'impact') { this.flush(shot); this.tags(shot); } return undefined; }
    const L = this.leaders[side], up = e.change === 'upgrade', toKey = `${e.to.form}-${e.to.level}`, accent = e.accent ?? hueOf(fig.id).energy;
    if (at === 'pre') {
      this.cueN = (this.cueN ?? 0) + 1;
      this.building = { uid: fig.uid, key: toKey, n: this.cueN };
      L?.act('command', { hold: v === 'full' ? 60 : 0 });
      // the new form's still decoded ahead, so its rise draws at once
      const m = this.man.figures[fig.id];
      if (m && this.g) decode(viewSrc(formView(m, VIEW[side], toKey), fig.box.h, devicePixelRatio || 1));
      if (rd) return undefined;
      // (the board's own 420 under Auto still takes a short attack's pre-roll, 90 ms: the actor tag reads before the
      // tower changes, S3; no camera push)
      if (v === 'off') return wait(auto ? 90 : 120);
      // round 6 fix H3: the camera pushes on the builder over the pre-roll until it fills 40% of the open frame's
      // height (at least 1.18), held to the impact and released as the scaffold comes down (`build('start')`)
      // (fix pass 2 H6: the push reads the form being built, its drawn box after the level steps, never the Level 4
      // envelope; the builder's foot stands 16 px over the transform title's top, so the title never lies on its base;
      // and the push grows until the rival, leaving the frame first, draws at most 0.7 of the builder)
      // (after its critic: every test reads where the camera lands, `camAt`, since the painting's edge holds a push;
      // the rival's share comes first, so the push grows, and the builder's share of the frame slides toward its own
      // side, until the rival is at most 0.7 of the builder or out of the frame; then the new tower's top in frame, then
      // its foot 16 px over the title, then 40% of the open height)
      // (fix pass 3 H2, H3, ruling 15: the sizes are drawn ones, the new form's paint over its box and the rival's arcs and
      // `data-solid` matter with its box, read once here; from 720 px up the builder's share slides up to 0.30 toward
      // its own side, so the rival may leave the frame; under 720 the rival stays 80% or more inside it; the builder's
      // foot stands 16 to 60 px over the title's top, hard, short and Auto alike; where the rival still draws more than
      // 0.7 of the builder it is dimmed for the transform, `dimFoe`)
      const g = this.g, open = g.floor - g.rail - g.team, fb0 = this.formBox(fig, toKey), tall0 = fb0?.h ?? fig.box.h;
      // (a tower's drawn base reaches under its foot point, its isometric plinth: the title keeps under that, the lower
      // of the standing tower's and the new one's)
      const base = Math.max(0, fb0?.below ?? 0, fig.box.y + fig.box.h - fig.foot.y);
      if (this.building) this.building.base = base;
      const tall = tall0 * (1 + Math.max(0, paintOf(toKey, VIEW[side])));
      const tTop = this.titleTop(), foe = this.active(other(side)), toward = side === 'player' ? -1 : 1;
      const rb = foe && !foe.el.hidden && foe.box ? this.drawnBox(foe) : null;
      const phone = g.phone, m0 = g.map, e0 = R(g.W * 0.012) + 2;
      // (a phone's push may bring the painting's top edge down under the rail, as its batch framing does: the HUD has gone)
      const land = (c) => {
        if (!phone) return this.camAt(c);
        const k = Math.max(c.k, (g.W + 2 * e0) / m0.w), fitIn = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
        return { x: fitIn(c.x, g.W + e0 - k * (m0.x + m0.w), -e0 - k * m0.x), y: fitIn(c.y, g.H + e0 - k * (m0.y + m0.h), g.rail + g.team + 8 + 0.12 * g.H - k * m0.y), k, raw: true };
      };
      const camOf = (k, fx) => {
        const c = this.frameOn(fig, k, fx, 0.56), top = fig.foot.y - tall, want = tTop - 16 - c.k * (fig.foot.y + base), low = g.rail + 8 - c.k * top;
        return land({ ...c, y: Math.max(want, low) });
      };
      const share = (c) => {
        if (!rb) return 0;
        // (a full scene hides the HUD, the log rail with it, so the rival is seen to the window's edge)
        // (any scene outside a band hides the HUD's log rail too, shared/hud.css, short ones included)
        const x0 = Math.max(0, c.x + c.k * rb.x), x1 = Math.min(g.log && shot?.box ? g.log.x : g.W, c.x + c.k * (rb.x + rb.w)), y0 = Math.max(g.rail, c.y + c.k * rb.y), y1 = Math.min(phone ? g.H : g.floor, c.y + c.k * (rb.y + rb.h));
        // (the new tower holds at 0.92 of its size until the impact, `holdSmall`)
        return x1 > x0 + 4 ? Math.max(0, y1 - y0) / Math.max(1, 0.92 * c.k * tall) : 0;
      };
      const inside = (c) => {
        if (!rb) return 1;
        const x0 = Math.max(0, c.x + c.k * rb.x), x1 = Math.min(g.W, c.x + c.k * (rb.x + rb.w)), y0 = Math.max(0, c.y + c.k * rb.y), y1 = Math.min(g.H, c.y + c.k * (rb.y + rb.h));
        return (Math.max(0, x1 - x0) * Math.max(0, y1 - y0)) / Math.max(1, c.k * c.k * rb.w * rb.h);
      };
      const score = (c) => {
        const sh = share(c), top = c.y + c.k * (fig.foot.y - tall), foot = c.y + c.k * (fig.foot.y + base);
        // (the new tower whole first, then its drawn base 16 px or more over the title, then a phone's rival in the
        // frame, then the title no more than 60 px under that base (fix pass 3 H2's critic: one reference, the drawn
        // base, and the 60 px bound ahead of the rival's share, which the dim answers), then the rival's share, then the
        // push's size)
        return [Math.max(0, g.rail + 4 - top), Math.max(0, foot - (tTop - 16)), phone ? Math.max(0, 0.8 - inside(c)) : 0, Math.max(0, tTop - 60 - foot), Math.max(0, sh - 0.7), Math.max(0, 0.4 * open - c.k * tall), -c.k];
      };
      const tol = [0.5, 0.5, 0.005, 0.5, 0.005, 0.5, 0.01];
      const worse = (a, b) => { for (let i = 0; i < a.length; i++) { if (a[i] > b[i] + tol[i]) return true; if (a[i] < b[i] - tol[i]) return false; } return false; };
      const ok = (q) => !q.slice(0, 5).some((x) => x > 0);
      const k0 = clamp((0.4 * open) / Math.max(1, tall), phone ? 1 : 1.18, 2.4), fx0 = side === 'player' ? 0.42 : 0.58;
      const fxs = (phone ? [0, 0.06, 0.12] : [0, 0.06, 0.12, 0.18, 0.24, 0.3]).map((d) => fx0 + d * toward);
      let cam = null, sc = null;
      for (const fx of fxs) {
        for (let k = k0; k <= 2.4 + 1e-9; k += 0.04) {
          const c = camOf(k, fx), q = score(c);
          if (!cam || worse(sc, q)) { cam = c; sc = q; }
          if (ok(q)) break;
        }
        if (ok(sc)) break;
      }
      // (and down from the first push, where a tall build under a low title fits only below it, or a phone's rival
      // stays in the frame only at a smaller push)
      if (!ok(sc)) for (const fx of fxs) for (let k = k0 - 0.04; k >= 1; k -= 0.04) { const c = camOf(k, fx), q = score(c); if (worse(sc, q)) { cam = c; sc = q; } }
      // (judged against the smaller of the builder's two towers: the standing one it sinks from and the new one it rises
      // into, so no frame of the change has the rival over 0.7 of it undimmed)
      const hNow = this.drawnBox(fig)?.h ?? fig.box.h, sh = share(cam) * Math.max(1, (0.92 * tall) / Math.max(1, hNow));
      this.buildCam = { k: +cam.k.toFixed(3), score: sc.map((x) => +x.toFixed(3)), share: +sh.toFixed(3), inside: +inside(cam).toFixed(3) };
      this.camTo(cam, v === 'full' ? 240 : auto ? 90 : 120, 'cubic-bezier(.3,.7,.1,1)');
      // (the rival over 0.7 of the builder where it still stands in the frame: dimmed for the transform, ruling 15)
      if (rb && sh > 0.7 + 0.005) this.dimFoe(foe, true, v === 'full' ? 240 : 120);
      return wait(v === 'full' ? 240 : auto ? 90 : 120);
    }
    if (at === 'start') {
      // (the title follows the builder's drawn base, 16 to 60 px under it, where the push could not put it there)
      if (v !== 'off') this.fitTitle(fig, this.building?.uid === fig.uid ? this.building.base : null);
      if (rd) return undefined;
      const n = this.cueN, I = shot.compiled?.impact ?? (v === 'full' ? 960 : 380);
      const board = v === 'off' || v === 'reduced';
      const k = board ? 1 : I / (v === 'full' ? (up ? 1000 : 960) : 380);
      const T = (ms) => Math.round(ms * k), live = () => n === this.cueN;
      const p = fig.ptd, sc = p?.scaffold, ring = this.ringEls[side].build;
      ring.style.setProperty('--tower', accent);
      fig.el.style.setProperty('--tower', accent);
      const draw = (ms, at0) => this.anim(ring, [{ strokeDashoffset: 1, opacity: 0.9 }, { strokeDashoffset: 0, opacity: 0.9, offset: 0.7 }, { strokeDashoffset: 0, opacity: 0 }], { duration: ms, delay: at0, easing: OUT });
      const scaffold = (a0, a1, b0, b1, stay, ease = OUT) => {
        if (!sc) return;
        this.anim(sc, [{ opacity: 0.8, clipPath: 'inset(100% -20% 0 -20%)' }, { opacity: 0.8, clipPath: 'inset(0 -20% 0 -20%)' }], { duration: a1 - a0, delay: a0, easing: ease, fill: 'backwards' });
        if (b0 != null) this.anim(sc, [{ opacity: 0.8, clipPath: 'inset(0 -20% 0 -20%)' }, { opacity: stay ? 0.35 : 0.8, clipPath: stay ? 'inset(0 -20% 0 -20%)' : 'inset(0 -20% 100% -20%)' }], { duration: b1 - b0, delay: b0, easing: IN_OUT });
        this.anim(sc, [{ opacity: 0.8 }, { opacity: 0.8 }], { duration: Math.max(0, (b0 ?? a1) - a1), delay: a1 });
      };
      if (!up) {
        // build: sink 0-300, foundation 260-560, scaffold 300-700, rise 560-960, badge 960-1140, turret 1140-1290,
        // scaffold out 1400-1700, pieces out 1500-1800 (short: 0-110, 90-220, 110-300, 180-380, 380-520, 520-670,
        // 560-700; board: sink 0-110, rise 110-270, badge 270-370)
        const t = board ? { sink: [0, 110], ring: [60, 270], sc: null, rise: [110, 270], badge: [270, 370], turn: [270, 370], out: null, pieces: [270, 370] }
          : v === 'full' ? { sink: [0, 300], ring: [260, 560], sc: [300, 700], rise: [560, 960], badge: [960, 1140], turn: [1140, 1290], out: [1400, 1700], pieces: [1500, 1800] }
            : { sink: [0, 110], ring: [90, 220], sc: [110, 300], rise: [180, 380], badge: [380, 520], turn: [520, 670], out: [560, 700], pieces: [600, 760] };
        fig.aura?.beat('transform', { phase: 'in', ms: T(t.sink[1] - t.sink[0]) + 90 });
        this.sinkPic(fig, T(t.sink[1] - t.sink[0]));
        draw(T(t.ring[1] - t.ring[0]) + 400, T(t.ring[0]));
        if (t.sc) scaffold(T(t.sc[0]), T(t.sc[1]), T(t.out[0]), T(t.out[1]), false);
        this.after(T(t.rise[0]), () => { if (!live()) { this.clearPic(fig); return; } this.formTo(fig, e.to); this.risePic(fig, T(t.rise[1] - t.rise[0])); this.holdSmall(fig); });
        // (the camera holds its push to the impact and lets go as the scaffold comes down)
        if (t.out) this.after(T(t.out[0]), () => { if (live()) this.rest(T(t.out[1] - t.out[0])); });
        this.after(T(t.badge[0]), () => { if (!live()) return; this.landBadge(fig, T(t.badge[1] - t.badge[0])); });
        this.after(T(t.turn[0]), () => { if (live()) this.aim(fig, T(t.turn[1] - t.turn[0])); });
        this.after(T(t.pieces[0]), () => { if (live()) fig.aura?.beat('transform', { phase: 'out', ms: T(t.pieces[1] - t.pieces[0]), form: e.to.form }); });
      } else {
        // upgrade: the scaffold wraps the standing tower, its own attack pulse runs once, and at the impact the next
        // level is drawn and grows into place (H(l)/H(l+1) -> 1.03 -> 1); the badge flips; the scaffold comes down (full, to 4A/4B: wrap 200-700, the card spirals in 300-1000, fire at 760)
        // (fix pass 3 H5: a full take-over's scaffold rises from the base over 560-960, and at 760 the old tower fires its
        // last shot, seen: its fire, a squash with a tremble and its coil's flash as the accent rim, at most 0.35)
        const t = board ? { wrap: [0, 110], fire: 60, spiral: null } : v === 'full' ? { wrap: [560, 960], fire: 760, spiral: [300, 1000] } : { wrap: [0, 240], fire: 240, spiral: null };
        // (fix pass 2 H3: the scaffold wraps the tower for the construction and comes down from the impact, so the
        // new level stands clear; the barrier that follows is its shell, arena/aura.js)
        // (a full take-over's scaffold climbs at an even pace, so its top is still rising through 960: its critic saw it
        // near its height by 737 on an ease-out)
        if (!board) scaffold(T(t.wrap[0]), T(t.wrap[1]), T(I), T(I) + (v === 'full' ? 300 : 160), false, v === 'full' ? 'linear' : OUT);
        if (t.spiral) fig.aura?.beat('transform', { phase: 'in', ms: T(t.spiral[1] - t.spiral[0]) });
        if (v === 'full') {
          this.after(T(t.fire), () => { if (live()) p?.fire(performance.now() + 60); });
          // (a tremble of 2.6% of its width under the squash, twelve beats over 360 ms, full until 1000 and dying out after:
          // the shot's recoil carries the old tower's motion through the take-over's 760-1000, transform only; its critic
          // measured 6 grey a frame over 870-1000 on the 240 ms tremble that died from its first beat)
          const w = Math.max(1, 0.026 * (fig.box?.w ?? 100)), fr = [], nB = 12;
          // (each beat squashes and stretches it a little too, 1.2% and less as it dies, so the whole silhouette shudders,
          // not its edges alone: the 4A's 933-1000 read 7.4 grey on a 2.6% sway)
          for (let i = 0; i <= nB; i++) { const d = i < 8 ? 1 : (nB - i) / (nB - 8), q = i && i < nB ? 0.012 * d * (i % 2 ? 1 : -0.6) : 0; fr.push({ offset: i / nB, translate: `${((i % 2 ? -1 : 1) * w * d * (i ? 1 : 0)).toFixed(1)}px 0`, scale: `${(1 + q).toFixed(4)} ${(1 - 1.2 * q).toFixed(4)}` }); }
          this.anim(fig.breath, fr, { duration: T(360), delay: T(t.fire), easing: 'linear' });
        } else {
          p?.fire(performance.now() + T(t.fire) + 100);
          this.anim(fig.breath, [{ scale: '1' }, { scale: '1.012 0.985', offset: 0.5 }, { scale: '1' }], { duration: 160, delay: T(t.fire), easing: OUT });
        }
        // (fix pass 2 H7: the old tower's last shot is seen: its rim takes the new tower's accent as it fires, at most
        // 0.35, a hue and never a flash)
        // (a full take-over holds the rim lit to 1000, so the cause stays on the old tower while the scaffold climbs)
        this.after(T(t.fire), () => { if (live()) this.rimPulse(fig, accent, 0.35, v === 'full' ? T(300) : null); });
        draw(T(I) + 260, 0);
      }
      return undefined;
    }
    if (at === 'impact') {
      // the post lands: the transform event (its plate row, the console, the log) and the upgrade's barrier
      this.flush(shot);
      const from = fig.key, h0 = fig.box?.h ?? 1, branch = up && /[ab]$/.test(String(e.to.level));
      // (round 6 fix H3: a 4A or 4B upgrade crossfades from the old tower's still, so no frame pair swaps hard)
      const ghost = up && !rd && v !== 'off' ? this.ghostPic(fig) : null;
      this.formTo(fig, e.to);
      if (ghost) this.placeGhost(fig, ghost, branch ? 260 : 160, branch);
      // (a rise that never ran, its cue cut short: the new form stands whole at the impact)
      if (fig.sunk) this.clearPic(fig);
      if (!rd) {
        this.rimPulse(fig, accent, 0.8);
        if (up) {
          // (a level up grows from the old tower's drawn height; a branch takes over at 0.92 -> 1.04 -> 1, its mark landing
          // beside the star over 260 ms)
          const s0 = branch ? 0.92 : Math.min(1, h0 / Math.max(1, fig.box.h));
          this.anim(fig.breath, [{ scale: String(s0.toFixed(4)) }, { scale: '1.04', offset: 0.55 }, { scale: '1' }], { duration: v === 'off' ? 200 : branch ? 260 : 220, easing: OUT });
          this.flipBadge(fig, 140);
          if (branch) this.landBranch(fig, 260);
          if (v === 'full') this.after(260, () => fig.aura?.beat('transform', { phase: 'out', ms: 300, form: e.to.form }));
          else fig.aura?.beat('transform', { ms: 260, form: e.to.form });
        } else {
          // (a build: the risen tower, held at 0.92, takes its size at the impact, 0.92 -> 1.04 -> 1)
          this.releaseSmall(fig, v === 'off' || v === 'reduced' ? 160 : 260);
          if (v === 'off' || v === 'reduced') this.aim(fig, 120);
        }
      } else this.aim(fig, 0);
      void from;
      this.wear(this.view);
      this.tags(shot);
      return undefined;
    }
    // post: the build is done; the camera settles
    if (at === 'post') {
      if (this.building?.uid === fig.uid) this.building = null;
      if (fig.sunk) this.clearPic(fig);
      if (fig.small) { fig.small.cancel(); fig.small = null; }
      this.flush(shot);
      // (fix pass 3 H2: the push holds while the transform's title still reads under the builder's foot, then settles;
      // on a phone mid-batch it settles to the batch framing, `restCam`)
      const n = this.cueN, title = !rd && v !== 'off' && this.titleUp();
      if (!rd) { if (title) this.after(Math.min(320, title), () => { if (n === this.cueN || this.batching) this.rest(auto ? 140 : 260); }); else this.rest(auto ? 140 : 260); }
      // (the board's own transform, a later build or Level 2 or 3 under Auto, holds its 420 (section 5.4: sink, swap,
      // rise, badge by 370) so the tower stands before it fires and the tag reads before the next shot; reduced, its
      // still holds 360)
      const done = v === 'off' ? wait(rd ? 360 : auto ? 280 : 300) : rd ? Promise.resolve() : wait(auto ? 0 : 100);
      // (the rival's dim ends with the post, ruling 15)
      return done.then(() => this.dimFoe(null, false, rd ? 0 : 160));
    }
    return undefined;
  }
  /** The standing picture sinks through the 4x4 Bayer (its card stays: the scaffold and the badge are on it). */
  sinkPic(fig, ms) {
    if (!ms || this.reduced()) return;
    fig.sunk = true;
    const frames = [];
    for (let i = 0; i <= 16; i++) { const m = i === 0 ? 'none' : K.MASKS[16 - i]; frames.push({ offset: i / 16, maskImage: m, WebkitMaskImage: m }); }
    this.anim(fig.breath, frames, { duration: ms, easing: 'linear', fill: 'forwards' }).finished.catch(() => {});
  }
  /** The picture whole again: the sink's forwards-filled mask and any rise clip gone (a build superseded before its
   *  rise, a switch, the cue's end), so a tower is never left invisible. */
  clearPic(fig) {
    if (!fig?.breath) return;
    for (const a of fig.breath.getAnimations()) if (a.effect?.getKeyframes?.().some((f) => f.maskImage)) a.cancel();
    fig.breath.style.clipPath = '';
    fig.sunk = false;
  }
  /** The new tower rises out of its foot (a translate under a clip at the foot line), from the sunk picture's place. */
  risePic(fig, ms) {
    this.clearPic(fig);
    if (!ms || this.reduced()) return;
    const below = Math.max(0, (fig.view?.h ?? 0) * fig.s - (fig.view?.foot[1] ?? 0) * fig.s);
    fig.breath.style.clipPath = `inset(-60% -60% ${below.toFixed(1)}px -60%)`;
    const a = this.anim(fig.breath, [{ translate: `0 ${(fig.h * 0.96).toFixed(1)}px` }, { translate: '0 0' }], { duration: ms, easing: 'cubic-bezier(.2,.75,.25,1)' });
    a.finished.catch(() => {}).then(() => { fig.breath.style.clipPath = ''; });
  }
  /** How long the transform title has left on screen (ms, 0 when none reads): its call-out's remaining animation. */
  titleUp() {
    const c = document.querySelector('#stage .sd-callout[data-style="transform"] .sd-callout-text');
    if (!c?.isConnected) return 0;
    const r = c.getBoundingClientRect();
    if (!(r.width > 0)) return 0;
    let o = 1;
    for (let x = c; x && x !== document.body; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.visibility === 'hidden' || cs.display === 'none') return 0; o *= Number(cs.opacity); }
    return o > 0.05 ? 320 : 0;
  }
  /** Fix pass 3 H2, H3 (ruling 15): the rival dimmed to 0.55 with a 2 px blur while the builder does not out-draw it,
   *  for the transform's length; opacity and filter only, on its figure (its card's pieces with it). */
  dimFoe(fig, on, ms = 160) {
    const d = this.dimmed;
    if (!on) {
      if (!d) return;
      this.dimmed = null;
      delete d.fig.el.dataset.dim;
      if (!d.fig.el.isConnected || this.reduced() || !ms) { d.a.cancel(); return; }
      const back = this.anim(d.fig.el, [{ opacity: 0.55, filter: 'blur(2px)' }, { opacity: 1, filter: 'blur(0px)' }], { duration: ms, easing: OUT });
      d.a.cancel();
      back.finished.catch(() => {});
      return;
    }
    if (d?.fig === fig) return;
    if (d) d.a.cancel();
    const a = this.anim(fig.el, [{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0.55, filter: 'blur(2px)' }], { duration: this.reduced() ? 0 : ms, easing: OUT, fill: 'forwards' });
    this.dimmed = { fig, a };
    fig.el.dataset.dim = 'true';
    a.finished.catch(() => {});
  }
  /** Fix pass 3 H2 step 3 (after its critic): the transform title follows the builder's drawn base. Once the scene has
   *  drawn it (a few frames at most), where the push left its top more than 60 px under the base or less than 16, it
   *  moves to 56 (or 20) px under it, by `translate` alone (no layout, no battle.css change), and stays inside the
   *  window. Undone at the next shot's pre-roll (`title`, the element moved). */
  fitTitle(fig, base = null, tries = 12) {
    const el = document.querySelector('#stage .sd-callout[data-style="transform"] .sd-callout-text');
    const r = el?.isConnected ? el.getBoundingClientRect() : null;
    // (not drawn yet: placed the moment the scene inserts it, before it paints, else a frame later, a few times)
    if (!r || !(r.height > 0)) {
      if (tries <= 0) return;
      const host = document.getElementById('stage');
      if (host && typeof MutationObserver === 'function' && !this.titleObs) {
        const obs = (this.titleObs = new MutationObserver(() => { const t = document.querySelector('#stage .sd-callout[data-style="transform"] .sd-callout-text'); if (t?.isConnected && t.getBoundingClientRect().height > 0) { obs.disconnect(); this.titleObs = null; this.fitTitle(fig, base, 0); } }));
        obs.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-style', 'class', 'style'] });
        setTimeout(() => { if (this.titleObs === obs) { obs.disconnect(); this.titleObs = null; } }, 1500);
      }
      requestAnimationFrame(() => this.fitTitle(fig, base, tries - 1));
      return;
    }
    if (this.titleObs) { this.titleObs.disconnect(); this.titleObs = null; }
    if (!fig?.foot || !fig.box) return;
    // (both bases the title stands under: the old form's, drawn until the impact, and the new form's after it, so a short
    // transform's first 200 ms on Auto no longer stood the title 77-79 px under the old Lab's base, H2's critic; where
    // one band cannot hold both, the new form's)
    const c = this.cam ?? { x: 0, y: 0, k: 1 }, b0 = Math.max(0, fig.box.y + fig.box.h - fig.foot.y), b = base ?? b0, by = c.y + c.k * (fig.foot.y + b), byOld = c.y + c.k * (fig.foot.y + b0);
    const ty = parseFloat(String(el.style.translate || '0 0').split(' ')[1] ?? '0') || 0, top = r.top - ty;
    // (and the new form's base once the push hands back to the rest framing at post 67, a phone's batch framing lowering
    // it 23 px at 360: the band that holds all three, else the new form's two, else the push's)
    const rc = this.restCam?.() ?? { x: 0, y: 0, k: 1 }, byRest = rc.y + rc.k * (fig.foot.y + b);
    const band = (ys) => [Math.max(...ys) + 16, Math.min(...ys) + 60];
    let want = top;
    for (const ys of [[by, byOld, byRest], [by, byRest], [by]]) { const [lo, hi] = band(ys); if (lo <= hi) { want = hi - lo < 8 ? (lo + hi) / 2 : Math.min(hi - 2, Math.max(lo + 2, top)); break; } }
    want = Math.min(want, (this.g?.H ?? innerHeight) - 8 - r.height);
    const dy = Math.round(want - top);
    el.style.translate = dy ? `0 ${dy}px` : '';
    this.titleEl = dy ? el : null;
  }
  /** The transform title's top on screen: measured where the scene has drawn it, else where battle.css sets it (its
   *  bottom at the aperture's 14% plus its line, its size up to 7% of the height). */
  titleTop() {
    const t = document.querySelector('.sd-callout[data-style="transform"] .sd-callout-text')?.getBoundingClientRect();
    if (t && t.height > 0) return t.top;
    const H = this.g.H, W = this.g.W;
    return H - (0.152 * H + 1.25 * Math.min(0.026 * H, 0.034 * W, 22) + 4) - Math.min(0.07 * H, 0.08 * W, 76);
  }
  /** A form's drawn box on the figure's stand (board px), without placing it: the push's target size. */
  formBox(fig, key) {
    const m = this.man?.figures[fig.id], st = this.g?.st[fig.side];
    if (!m || !st || !key) return null;
    const v = formView(m, VIEW[fig.side], key), s = figureMpp(m, this.g.caps, fig.side === 'rival') * formScale(m, v, this.g.caps.formExp) * st.k;
    return { w: (v.box[2] - v.box[0]) * s, h: (v.box[3] - v.box[1]) * s, below: (v.box[3] - v.foot[1]) * s };
  }
  /** The risen tower holds at 0.92 of its size until the impact (`releaseSmall`). */
  holdSmall(fig) {
    if (this.reduced()) return;
    fig.small?.cancel();
    fig.small = fig.breath.animate([{ scale: '0.92' }, { scale: '0.92' }], { duration: 1, fill: 'forwards' });
  }
  releaseSmall(fig, ms) {
    const was = Boolean(fig.small);
    fig.small?.cancel(); fig.small = null;
    if (this.reduced()) return;
    this.anim(fig.breath, [{ scale: was ? '0.92' : '0.96' }, { scale: '1.04', offset: 0.55 }, { scale: '1' }], { duration: ms, easing: OUT });
  }
  /** The standing tower's still, copied before a swap: what the next form crossfades from. */
  ghostPic(fig) {
    if (!fig.view || !fig.s) return null;
    const v = fig.view, s = fig.s;
    const im = el('img', 'fig-ghost');
    im.alt = ''; im.src = fig.img.currentSrc || fig.img.src;
    return { im, x: fig.foot.x - v.foot[0] * s, y: fig.foot.y - v.foot[1] * s, w: v.w * s, h: v.h * s };
  }
  placeGhost(fig, g, ms, hold = false) {
    const v = fig.view, s = fig.s, x0 = fig.foot.x - v.foot[0] * s, y0 = fig.foot.y - v.foot[1] * s;
    Object.assign(g.im.style, { position: 'absolute', left: `${(g.x - x0).toFixed(1)}px`, top: `${(g.y - y0).toFixed(1)}px`, width: `${g.w.toFixed(1)}px`, height: `${g.h.toFixed(1)}px`, pointerEvents: 'none', zIndex: '2', filter: `url(#ag-${fig.side})` });
    fig.body.append(g.im);
    // (fix pass 2 H7: a 4A or 4B take-over holds both towers in view through its first half, so at least three frames
    // show the old over the new as the new one steps 0.92 -> 1.04 -> 1)
    const frames = hold ? [{ opacity: 1, scale: '1' }, { opacity: 0.8, scale: '1.02', offset: 0.45 }, { opacity: 0, scale: '1.04' }] : [{ opacity: 1, scale: '1' }, { opacity: 0, scale: '1.04' }];
    this.anim(g.im, frames, { duration: ms, easing: hold ? 'linear' : OUT, fill: 'forwards' }).finished.catch(() => {}).then(() => g.im.remove());
  }
  /** A 4A or 4B branch's mark lands beside the star (0.3 m above, an ease-out-back). */
  landBranch(fig, ms) {
    const b = fig.ptd?.badge?.querySelector('.ptd-branch');
    if (!b || !ms || this.reduced()) return;
    this.anim(b, [{ translate: `0 ${(-0.3 * fig.k).toFixed(1)}px`, opacity: 0 }, { translate: '0 0', opacity: 1, offset: 0.7 }, { translate: '0 0', opacity: 1 }], { duration: ms, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  }
  /** The tower's badge lands from 0.4 m above (an ease-out-back to 1.04). */
  landBadge(fig, ms) {
    const b = fig.ptd?.badge;
    if (!b || !ms || this.reduced()) return;
    this.anim(b, [{ translate: `0 ${(-0.4 * fig.k).toFixed(1)}px`, opacity: 0 }, { translate: '0 0', opacity: 1, offset: 0.7 }, { translate: `0 ${(0.02 * fig.k).toFixed(1)}px`, offset: 0.85 }, { translate: '0 0', opacity: 1 }], { duration: ms, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  }
  /** The badge's numeral flips to the next level (scale y 1 -> 0 -> 1). */
  flipBadge(fig, ms) {
    const b = fig.ptd?.badge;
    if (!b || !ms || this.reduced()) return;
    this.anim(b, [{ scale: '1 1' }, { scale: '1 0', offset: 0.45 }, { scale: '1 1' }], { duration: ms, easing: IN_OUT });
  }
  /** Freeze the board (a dialog, a hidden tab): its motion and its living layer. */
  hold(paused) { super.hold(paused); this.living('hold', paused); }
  unmount() {
    this.motion.skip();
    document.removeEventListener('visibilitychange', this.onVis);
    this.mq?.removeEventListener?.('change', this.onMq);
    this.busyObs?.disconnect(); this.busyObs = null; clearTimeout(this.busyT); this.batching = false;
    this.batchHud(this.host?.closest?.('#app') ?? document.getElementById('app'), false);
    for (const fig of this.figs.values()) { this.idle(fig, false); try { fig.aura?.dispose(); } catch { /* gone */ } try { fig.ptd?.dispose(); } catch { /* gone */ } fig.aura = null; fig.ptd = null; fig.matter.remove(); }
    for (const a of this.leadIdle ?? []) { try { a.cancel(); } catch { /* gone */ } Aura.running.delete(a); }
    this.idles.clear();
    for (const s of SIDES) this.leaders[s]?.destroy();
    this.host.textContent = '';
    delete this.host.dataset.map; delete this.host.dataset.phone; delete this.host.dataset.finale; delete this.host.dataset.letterbox;
    const r = this.ctx.rail;
    r.textContent = ''; r.hidden = true;
  }
}
