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
import { Leader, loadLeaders, POSE, leaderData, finalePoses } from '../shared/leaders.js';
import { Layout, el, sv, wait, clamp, lerp, R, SIDES, other, EASE, chipsHtml, setChips, countTo, numeral, hitTags, frameOn, inkOn } from '../shared/fx.js';
import { specials } from './specials.js';
import { loadGround, groundNow, stage, stageAsync, project, ppm, unproject, floorH, mul3, matrix3d, grade, castAt, envelope, leaderEnv, figureMpp, FIG, LEADER, PAD } from './ground.js';

const K = window.bcKit;
const { SLAM, OUT, IN_OUT, WHIP } = EASE;
/** The map is the rival leader's home ground (MODES.md section 4), or `&map=`. */
export const HOME = { noor: 'atelier', tavi: 'atelier', bram: 'runtime', mae: 'archive', sol: 'terrace', oren: 'terrace', iona: 'observatory', coda: 'foundry' };
export const MAPS = { archive: 'Lantern Archive', atelier: 'Design Atelier', foundry: 'Red Machine Foundry', observatory: 'Cloud Observatory', runtime: 'Runtime Engine Hall', terrace: 'Moss Survey Terrace' };
const SUBJECT_1X = (src) => src.replace('@2x.', '.');
/** A frame under 600 px wide skips the atelier (its floor ends 7.7 m from the camera, too shallow for a phone duel
 *  with depth) for the terrace, its daylight neighbour; Kevin can reverse this (MODES.md section 4). */
export const PHONE_SKIP = { atelier: 'terrace' };
const mapOf = (ctx) => {
  const map = ctx.map && Object.hasOwn(MAPS, ctx.map) ? ctx.map : HOME[ctx.leaders[1]] ?? 'atelier';
  return innerWidth < 600 ? PHONE_SKIP[map] ?? map : map;
};
const mapSrc = (map) => new URL(`../assets/maps/${map}.webp`, import.meta.url).href;
/** Each side's view of a project: yours from behind, the rival's from the front (media/figures/manifest.json). */
const VIEW = { player: 'rear', rival: 'front' };
const FIGURES = new URL('../media/figures/', import.meta.url);
let figuresP = null, figuresNow = null;
const loadFigures = () => (figuresP ??= fetch(new URL('manifest.json', FIGURES)).then((r) => r.json()).then((m) => (figuresNow = m)));
/** A leader's atlas px per metre: a leader's idle pose is about 100 atlas px tall and stands 1.7 m. */
const ATLAS_PER_M = 100 / LEADER.h;
/** Floor elements are drawn at this many of their own px per metre, then projected (never magnified much). */
const S = 100;
/** Pictures decoded once a visit (the map and the figures), so a mount draws at once. */
const decoded = new Map();
function decode(src) {
  if (!decoded.has(src)) { const im = new Image(); im.decoding = 'async'; im.src = src; decoded.set(src, { im, ready: im.decode().catch(() => {}) }); }
  return decoded.get(src);
}
/** The picture a figure stands as: its 2x file where the screen shows more than its 1x holds, else its 1x. */
const viewSrc = (v, cssH, dpr) => new URL(cssH * dpr * 1.15 > v.h / 2 ? v.src : v.lo, FIGURES).href;

// ============================================================ geometry (MODES.md section 4), board px
/** What each side's three figures take on the floor in its view (ground.js `envelope`), so the duel is solved for the
 *  battle's own cards and the two sides never overlap whichever card stands. */
export function envelopes(man, view, leaders) {
  const ids = (s) => view.sides[s].team.map((f) => f.id);
  const near = envelope(man.figures, ids('player'), VIEW.player), far = envelope(man.figures, ids('rival'), VIEW.rival);
  // and what each leader takes in every pose of its side (yours the back row, the rival's the front rows)
  const t = leaders.map((id) => leaderData(id));
  // (yours also pose by pose, each kept from reaching farther toward its figure than its rest, leaders.js backInward)
  const lead = t[0] && t[1] ? { near: leaderEnv(t[0], POSE.rearIdle, [12, 13, 14, 15]), far: leaderEnv(t[1], POSE.idle, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) } : null;
  return near && far ? { near, far, lead, key: `${ids('player')}|${ids('rival')}|${leaders}` } : null;
}
/** The frame for this window: the rails, the console, and the band where the painting must always show (the whole
 *  frame on a wide screen; on a phone, from under the team rail to under the console's top, so a phone may show more
 *  of the painting, ground.js stage). */
function frameOf(W, H) {
  const phone = W < 720;
  let g;
  if (phone) {
    const rail = 52, team = 46;
    const conH = 268; // the Mat's phone console: four whole moves scroll inside it and the duel keeps the rest
    const con = { x: 8, y: H - 8 - conH, w: W - 16, h: conH };
    const th = Math.round(clamp(W / 390, 0.82, 1.25) * 32);
    g = { phone, W, H, rail, team, con, tw: th * 2, th };
  } else {
    const t = clamp((W - 1024) / (1440 - 1024));
    const rail = R(lerp(48, 56, t));
    const conH = R(lerp(128, 146, t)), bottom = R(lerp(12, 16, t));
    // round 5: from 1280 up the battle log stands at the right edge, from under the rail to the floor
    const logW = W >= 1280 ? R(lerp(256, 288, clamp((W - 1280) / 320))) : 0;
    const conW = Math.min(1296, W - 48 - (logW ? logW + 12 : 0));
    const con = { x: logW ? 24 : R((W - conW) / 2), y: H - bottom - conH, w: conW, h: conH };
    const th = R(lerp(40, 56, t));
    g = { phone, W, H, rail, team: 0, con, tw: th * 2, th };
    if (logW) g.log = { x: W - 24 - logW, y: rail + 12, w: logW, h: H - bottom - rail - 12 };
  }
  // the duel's floor: on a phone your plate strip (36 px, 6 over the console) stands above the console, so the figures
  // and their pads end above it
  g.floor = phone ? g.con.y - 42 : g.con.y;
  g.band = phone ? { top: g.rail + g.team, bottom: g.floor + 24 } : { top: 0, bottom: H };
  return g;
}
const duels = new Map();
const duelKey = (ground, W, H, env) => `${ground.map}|${W}|${H}|${env?.key ?? ''}`;
/** Your plate on a wide screen: at the console's left end, 40 px over it; 102 px tall at 272 wide, and 112 at 244,
 *  where a long name takes two lines (measured, shared/hud.css). */
const deskPlate = (g) => ({ x: g.con.x, bottom: g.con.y - 40, w: g.W >= 1280 ? 272 : 244, h: g.W >= 1280 ? 102 : 112 });
// (the duel keeps your opening figure and your leader at rest off exactly that box)
const keepOf = (g) => { if (g.phone) return []; const p = deskPlate(g); return [{ x0: p.x, y0: p.bottom - p.h, x1: p.x + p.w, y1: p.bottom }]; };
const stageFrame = (g, env) => ({ W: g.W, H: g.H, phone: g.phone, top: g.rail + g.team, bottom: g.floor, band: g.band, keep: keepOf(g), env });
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
  if (!solving.has(key)) solving.set(key, stageAsync(ground, stageFrame(frameOf(W, H), env), pause).then((set) => { if (!duels.has(key)) duels.set(key, set); solving.delete(key); }));
  await solving.get(key);
}
/** The frame (rails and console), the map's fit, the floor's projection and the duel on it, for this window. */
export function geometry(W, H, ground, env = null) {
  const g = frameOf(W, H);
  g.ground = ground;
  const key = duelKey(ground, W, H, env);
  if (!duels.has(key)) duels.set(key, stage(ground, stageFrame(g, env)));
  const set = duels.get(key);
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
  g.letterbox = set.scale < 1;
  g.k = g.ld.player.k / ATLAS_PER_M;
  /** A floor point off a stand: `a` metres along the duel axis, `b` across it. */
  g.off = (s, a, b) => { const f = g.st[s]; return { X: f.X + g.u[0] * a + g.v[0] * b, Z: f.Z + g.u[1] * a + g.v[1] * b }; };
  g.pt = (p) => project(g.P, p.X, p.Z);
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
  }
  /** The two leaders' atlases, the map, its floor and the six figures in their side's view, decoded. */
  async prepare(ctx) {
    const map = mapOf(ctx);
    const [, , ground, man] = await Promise.all([loadLeaders(ctx.leaders), decode(mapSrc(map)).ready, loadGround(map), loadFigures()]);
    this.gd = ground; this.man = man;
    this.env = envelopes(man, ctx.view, ctx.leaders);
    // (a boot solves between tasks; the other mode's battle, warming this one, only in idle time)
    await solveDuel(innerWidth, innerHeight, ground, this.env, ctx.dealing ? yieldTask : yieldIdle);
    const g = geometry(innerWidth, innerHeight, ground, this.env);
    const dpr = devicePixelRatio || 1, list = [];
    for (const s of SIDES) for (const f of ctx.view.sides[s].team) {
      const m = man.figures[f.id];
      if (m) list.push(viewSrc(m[VIEW[s]], g.box[s].h, dpr));
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
    this.env ??= envelopes(this.man, this.view, ctx.leaders);
    const h = host;
    h.textContent = '';
    h.setAttribute('aria-label', 'Arena');
    h.dataset.map = this.map;
    this.camEl = el('div', 'arena-cam', h);
    this.shakeEl = el('div', 'arena-shake', this.camEl);
    // the painting and everything on its floor are one picture under one camera
    this.mapImg = el('img', 'arena-map', this.shakeEl);
    this.mapImg.alt = ''; this.mapImg.decoding = 'async'; this.mapImg.src = mapSrc(this.map);
    this.floorEl = el('div', 'arena-floor', this.shakeEl);
    this.groundSvg = sv('svg', { class: 'arena-svg arena-ground' }, this.shakeEl);
    this.padG = {};
    for (const s of SIDES) this.padG[s] = sv('g', { class: 'arena-pad', 'data-side': s, ...(this.ctx.dealing ? { 'data-on': 'false' } : {}) }, this.groundSvg); // kevinliu.studio: on a deal the pads start hidden, as drawSides marks them a moment later (scripts/sync.mjs)
    this.decals = el('div', 'arena-decals', this.floorEl);
    this.shadows = el('div', 'arena-shadows', this.floorEl);
    this.rings = el('div', 'arena-rings', this.shakeEl);
    this.actors = el('div', 'arena-actors', this.shakeEl);
    this.flagsEl = el('div', 'arena-flags', this.shakeEl);
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
    }

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
    this.flags = {};
    for (const s of SIDES) this.flags[s] = this.makeFlag(s);
    for (const s of SIDES) this.hands[s] = this.makeHand(s);
    this.buildRail(ctx.leaders);
    if (!ctx.dealing) for (const s of SIDES) this.revealed.add(v.sides[s].team[v.sides[s].active].uid);
    // a boot that mounts unseen in steps (ctx.split, shared/battle.js) lays the board out in `set`, a task later
    if (ctx.split) this.pending = true; else this.settle();
  }
  /** The mounted board laid out on the floor, and the leaders breathing. */
  settle() {
    this.pending = false;
    this.layout();
    for (const s of SIDES) this.leaders[s].breathe();
  }
  /** A figure: the card's project in its side's view, standing on its foot; its shadows lie on the floor beneath. */
  makeFigure(side, f, i) {
    const fig = { side, uid: f.uid, id: f.id, slot: i };
    fig.el = el('div', 'fig', this.actors);
    fig.el.dataset.side = side; fig.el.dataset.card = f.id; fig.el.dataset.view = VIEW[side];
    fig.el.hidden = true;
    fig.el.style.setProperty('--c', K.accent(f.id));
    fig.el.style.setProperty('--breath', `${(2.8 + ((f.id.length * 7 + i * 3) % 7) / 10).toFixed(2)}s`);
    fig.el.style.setProperty('--breath-at', `${-((f.id.length * 13) % 30) / 10}s`);
    fig.body = el('div', 'fig-body', fig.el);
    fig.breath = el('div', 'fig-breath', fig.body);
    fig.breath.style.filter = `url(#ag-${side})`;
    fig.img = el('img', 'fig-img', fig.breath);
    fig.img.alt = ''; fig.img.decoding = 'async'; fig.img.draggable = false;
    fig.shade = el('i', 'lit-shade', fig.breath);
    fig.rim = el('i', 'lit-rim', fig.breath);
    fig.flash = el('img', 'fig-flash', fig.breath);
    fig.flash.alt = ''; fig.flash.draggable = false;
    const gr = el('div', 'fig-ground', this.shadows);
    gr.hidden = true;
    fig.ground = { el: gr, ao: el('i', 'shadow-ao', gr), cast: el('img', 'fig-cast', gr) };
    fig.ground.cast.alt = '';
    return fig;
  }
  /** Shown or not: the figure and its shadows together. */
  showing(fig, on) { fig.el.hidden = !on; fig.ground.el.hidden = !on; }
  makeFlag(side) {
    const f = el('div', 'flag', this.flagsEl);
    f.dataset.side = side;
    const pole = el('i', 'flag-pole', f);
    const cloth = el('div', 'flag-cloth', f);
    const name = el('b', 'flag-name', cloth);
    const hp = el('p', 'flag-hp', cloth);
    const num = el('b', 'flag-num', hp);
    num.dataset.hpShown = side;
    const max = el('span', 'flag-max', hp);
    const chips = el('div', 'flag-chips', f);
    return { el: f, pole, cloth, name, num, max, chips, uid: null, hp: -1 };
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
    if (pics.length || !document.fonts.check('700 1em "Katagami Sans Cards"')) {
      box.style.visibility = 'hidden';
      Promise.all([document.fonts.load('700 1em "Katagami Sans Cards"').catch(() => {}), ...pics.map((im) => im.decode().catch(() => {}))])
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
        const face = el('i', 'pip-face', li);
        face.style.backgroundImage = `url("${K.groundOf(f.id)}")`;
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
    if (side === 'rival') return { x: (g.log ? g.log.x - 12 : g.W - 24) - w - Math.round(g.W * 0.08), y: g.rail + 12, w };
    const p = deskPlate(g);
    return { x: p.x, bottom: p.bottom, w: p.w };
  }
  logBox() { return this.g?.log ?? null; }
  /** The turn the battle is waiting on (round 5), on the team rail. */
  turnTo(n) { if (!this.turnEl) return; const t = `T${n}`; if (this.turnEl.textContent !== t) this.turnEl.textContent = t; this.turnEl.setAttribute('aria-label', `Turn ${n}`); }
  layout() {
    const ground = this.gd;
    const g = this.g = geometry(innerWidth, innerHeight, ground, this.env);
    const st = document.documentElement.style;
    for (const [k, v] of Object.entries({ '--rail-h': g.rail, '--team-h': g.team, '--console-x': g.con.x, '--console-y': g.con.y, '--console-w': g.con.w, '--console-h': g.con.h })) st.setProperty(k, `${v}px`);
    this.clothWidth = null;
    const W = g.W, H = g.H;
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
      this.grades[s].setAttribute('values', L.matrix.join(' '));
    }
    const shadowA = clamp(0.3 + 0.07 * (ground.light.key.strength ?? 3), 0.45, 0.62);
    this.host.style.setProperty('--shadow-a', shadowA.toFixed(2));
    for (const s of SIDES) this.buildPad(s);
    for (const fig of this.figs.values()) this.placeFigure(fig);
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
    this.placeFlags();
    for (const s of SIDES) this.placeHand(s);
    if (this.view) this.drawSides(this.view);
    this.camTo({ x: 0, y: 0, k: 1 }, 0);
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
  placeFigure(fig) {
    const g = this.g, st = g.st[fig.side], m = this.man?.figures[fig.id];
    if (!m) return;
    const v = m[VIEW[fig.side]];
    fig.mpp = figureMpp(m);
    const s = fig.mpp * st.k, w = v.w * s, h = v.h * s;
    const src = viewSrc(v, (v.box[3] - v.box[1]) * s, devicePixelRatio || 1);
    if (fig.img.getAttribute('src') !== src) { fig.img.src = src; fig.flash.src = src; fig.ground.cast.src = src; }
    fig.el.style.setProperty('--m', `url("${src}")`);
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
    const gr = fig.ground, bw2 = (v.base.w * fig.mpp) / 2, bd = Math.max(0.25, (v.base.d * fig.mpp) / 2), lift = Math.max(0, v.foot[1] - v.box[3]) * fig.mpp;
    Object.assign(gr.ao.style, { width: `${2 * bw2 * S}px`, height: `${2 * bd * S}px`, transform: floorBox(g, st.X, st.Z, 2 * bw2, 2 * bd), opacity: lift > 0.05 ? '0.55' : '1' });
    gr.el.style.transformOrigin = `${st.x.toFixed(1)}px ${st.y.toFixed(1)}px`;
    this.castShadow(gr.cast, st, w, h, v.foot[0] * s, v.foot[1] * s, Math.max(2, 0.03 * st.k));
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
  /** The flags, yours first: each planted at a corner of its pad (the front one if it can), its cloth flown to the
   *  side, at the spot that covers least of every card's picture, the leaders, the other flag and the frame's edges;
   *  then the hands are placed clear of them. */
  placeFlags() {
    const g = this.g;
    // a phone's cloth carries the name over the numerals, so it is narrow enough to fly clear of the duel
    const small = g.phone || g.th < 50, ch = g.phone ? 40 : small ? 32 : 44;
    const cw = this.clothWidth ??= this.measureCloth(g);
    const hit = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const lead = (t) => this.reach(t);
    const placed = [];
    // on a phone the hands wait in the top corners (placeHand)
    if (g.phone) for (const t of SIDES) { const sz = this.handSize(g); placed.push({ x: t === 'player' ? 8 : g.W - 8 - sz.bw, y: g.rail + g.team + 48 - 0.3 * sz.h, w: sz.bw, h: sz.bh + 0.3 * sz.h }); }
    for (const s of SIDES) {
      const F = this.flags[s], P = this.pad[s];
      const pref = s === 'player' ? -1 : 1;
      // the pad's corners on screen: the front one, then the outer and the inner side ones
      const byX = [...P.corners].sort((p, q) => p[0] - q[0]);
      const corners = [P.front, pref < 0 ? byX[0] : byX[3], pref < 0 ? byX[3] : byX[0]];
      // every card's picture as it would stand on either pad (a picture reaches below its foot by the near half of
      // its footprint), so a flag stays put while cards come and go
      // a leader in any pose of its side is never under a cloth or its chips
      const avoid = [[lead(s), 60], [lead(other(s)), 60], [this.pad[other(s)].bbox, 0.5], ...placed.map((r) => [r, 30])];
      for (const f of this.figs.values()) if (f.box) avoid.push([{ x: f.box.x - 3, y: f.box.y - 3, w: f.box.w + 6, h: f.box.h + 6 }, f.side === s ? 4 : 3]);
      // a phone also tries the pad's far corner
      if (g.phone) corners.push(P.corners.reduce((m, p) => (p[1] < m[1] ? p : m)));
      let best = null;
      corners.forEach((c, ci) => {
        // the cloth at the foot of its pole, hoisted a cloth or two higher up it, or on a phone's crowded frame hung
        // under the corner where the floor in front is clear
        for (const lift of g.phone ? [0, ch + 6, 2 * (ch + 6), -(ch + 4)] : [0, ch + 6]) for (const dir of [pref, -pref]) {
          const r = { x: dir < 0 ? c[0] - 2 - cw : c[0] + 2, y: c[1] - ch - lift, w: cw, h: ch };
          const chips = { x: r.x, y: lift < 0 ? r.y + ch + 4 : c[1], w: cw, h: 24 };
          let cost = ci * 400 + (dir === pref ? 0 : 200) + (lift ? 300 + 2 * Math.abs(lift) : 0);
          for (const [b, k] of avoid) cost += k * (hit(r, b) + 0.5 * hit(chips, b));
          // what of the cloth leaves the open frame
          cost += 30 * (cw * ch - hit(r, { x: 4, y: g.rail + g.team, w: g.W - 8, h: g.con.y - g.rail - g.team }));
          if (!best || cost < best.cost) best = { cost, c, dir, r, lift };
        }
      });
      const { c, dir, r, lift } = best;
      placed.push(r, { x: r.x, y: lift < 0 ? r.y + ch + 4 : c[1], w: cw, h: 24 });
      F.el.style.transform = `translate3d(${R(c[0])}px,${R(c[1])}px,0)`;
      F.el.style.zIndex = String(R(c[1]));
      F.el.dataset.dir = dir < 0 ? 'left' : 'right';
      F.el.dataset.size = small ? 's' : 'l';
      F.el.dataset.stack = g.phone ? 'true' : 'false';
      F.el.style.setProperty('--ch', `${ch}px`);
      F.el.style.setProperty('--cw', `${cw}px`);
      F.el.style.setProperty('--lift', `${lift}px`);
      F.el.dataset.hung = lift < 0 ? 'true' : 'false';
      F.el.style.setProperty('--pole', `${lift < 0 ? 0 : R(Math.max(lift + ch, clamp(0.3 * g.st[s].k, ch - 10, 64)))}px`);
      F.rect = r;
    }
  }
  /** Where a leader holds its hand: the card size (at least 64 px tall on a wide screen, 63 on a phone, so a card is a
   *  44 px target), and a spot by its leader, the first of these clear of both figures' largest boxes, their pads, the
   *  flags, the other leader and the frame's edges: at its hip on the outer side, under its feet, under its figure's
   *  pad, then at its hip on the inner side, each also slid inside the frame. The spot holds two cards side by side,
   *  each HP tab clear of the next card; a third (a card on its way back while its pad is empty) closes them up. */
  /** A hand's card size and the spot two cards side by side take. */
  handSize(g) {
    // (a short phone, under 700 px tall, has no free corner for 63 px cards beside the duel: its hands are 52 px)
    const h = g.phone ? (g.H < 700 ? 52 : 63) : Math.max(64, R(g.th * 1.58)), w = R((h * 63) / 88);
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
  placeHand(s) {
    const g = this.g, H = this.hands[s];
    if (!H) return;
    const { h, w, step, bw, bh } = this.handSize(g);
    const L = this.leaders[s], lb = L.bounds(s === 'player' ? POSE.rearIdle : POSE.idle);
    const outer = s === 'player' ? -1 : 1;
    const avoid = [];
    // every card's picture as it would stand on either pad, with room for its recoil, its lunge and its sink into
    // the pad (the hand stays put while cards come and go)
    for (const f of this.figs.values()) if (f.box) { const m = 0.12 * f.k; avoid.push({ x: f.box.x - m, y: f.box.y - m, w: f.box.w + 2 * m, h: f.box.h + 2 * m }); }
    // round 5: the HUD's plates stand all battle long (shared/hud.js); a hand keeps off them
    if (!g.phone) for (const t of SIDES) { const pb = this.plateBox(t); if (pb) avoid.push({ x: pb.x - 8, y: (pb.y ?? pb.bottom - 150) - 8, w: pb.w + 16, h: 166, k: 60 }); }
    // a phone's two plate strips (36 px each) are never under a hand either
    else for (const t of SIDES) { const pb = this.plateBox(t); if (pb) avoid.push({ x: pb.x - 4, y: (pb.y ?? pb.bottom - 36) - 4, w: pb.w + 8, h: 44, k: 60 }); }
    for (const t of SIDES) {
      const b = g.box[t], p = this.pad[t].bbox;
      avoid.push(b, { x: p.x - 8, y: p.y - 8, w: p.w + 16, h: p.h + 16 });
      // a flag is there all battle long, so covering it costs four times what covering anything else does
      if (this.flags[t]?.rect) { const r = this.flags[t].rect; avoid.push({ x: r.x - 4, y: r.y - 26, w: r.w + 8, h: r.h + 56, k: 4 }); }
      // and both leaders in every pose: a hand is held beside its leader, never over it
      const rr = this.reach(t);
      avoid.push({ x: rr.x - 4, y: rr.y - 4, w: rr.w + 8, h: rr.h + 8, k: 60 });
    }
    const top = g.rail + g.team + (g.phone ? 48 : 8), bottom = g.con.y - 8;
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
    const corner = g.phone ? [{ x: outer < 0 ? 8 : g.W - 8 - bw, y: g.rail + g.team + 48, w: bw, h: bh }] : [];
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
    for (const r of inside.length ? inside : cands) { const c = cost(r); if (c < bc) { bc = c; best = r; } if (c === 0) break; }
    H.box = best; H.w = w; H.h = h; H.step = step; H.dir = outer;
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
        c.el.setAttribute('aria-label', `${this.ctx.title(f.id)}, ${f.hp} of ${f.maxHp} HP${f.hp > 0 ? '' : ', out'}`);
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
  /** The flag cloth's one width: the widest of the six names beside the widest numerals, in the flag's own type. */
  measureCloth(g) {
    const c = document.createElement('canvas').getContext('2d');
    const fs = g.phone || g.th < 50 ? [11, 18, 11] : [13, 24, 11];
    c.font = `700 ${fs[0]}px "Katagami Sans"`;
    let name = 0;
    for (const f of this.figs.values()) name = Math.max(name, c.measureText(this.ctx.title(f.id)).width);
    c.font = `800 ${fs[1]}px "Katagami Sans"`;
    const num = c.measureText('000').width;
    c.font = `700 ${fs[2]}px "Katagami Sans"`;
    const max = c.measureText('/000').width;
    // a phone's cloth stacks the name over the numerals
    if (g.phone) return Math.ceil(Math.max(name, num + max + 1) + 24 + 4);
    return Math.ceil(name + num + max + (g.phone || g.th < 50 ? 6 : 8) + (g.phone || g.th < 50 ? 24 : 30) + 4);
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
    for (const s of SIDES) for (const f of view.sides[s].team) { const fig = this.figs.get(f.uid); if (fig) { fig.hp = f.hp; fig.maxHp = f.maxHp; fig.fallen = f.hp <= 0; } }
    this.falling.clear();
    this.away.clear();
    for (const s of SIDES) {
      const side = view.sides[s], f = side.team[side.active];
      const show = f && f.hp > 0 && (this.revealed.has(f.uid) || !this.ctx.dealing) ? f.uid : null;
      this.showFig(s, show);
      if (show) this.revealed.add(show);
    }
    this.drawSides(view);
  }
  showFig(s, uid) {
    this.shown[s] = uid;
    for (const fig of this.figs.values()) if (fig.side === s) {
      const on = fig.uid === uid;
      this.showing(fig, on);
      if (on) { K.bayer(fig.body, 16); fig.body.style.transform = ''; fig.el.style.opacity = ''; fig.img.style.filter = ''; fig.fallen = false; this.clearMarks(s, uid); }
    }
  }
  drawSides(v) {
    for (const s of SIDES) {
      const side = v.sides[s];
      const f = side.team.find((x) => x.uid === this.shown[s]) ?? side.team[side.active];
      this.drawPad(s, f, Boolean(this.shown[s]));
      this.drawFlag(s, f, Boolean(this.shown[s]));
      side.team.forEach((x, i) => this.drawPip(s, i, x, i === side.active && x.hp > 0 && Boolean(this.shown[s])));
      this.drawHand(s);
    }
    if (this.turnEl) { const t = `T${v.turn}`; if (this.turnEl.textContent !== t) this.turnEl.textContent = t; this.turnEl.setAttribute('aria-label', `Turn ${v.turn}`); }
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
  drawFlag(s, f, on) {
    const F = this.flags[s];
    F.el.dataset.on = on ? 'true' : 'false';
    if (!f) return;
    F.el.style.setProperty('--c', K.accent(f.id));
    const name = this.ctx.title(f.id);
    if (F.name.textContent !== name) F.name.textContent = name;
    if (F.uid !== f.uid) { F.uid = f.uid; F.hp = f.hp; F.num.textContent = String(f.hp); }
    const mx = `/${f.maxHp}`;
    if (F.max.textContent !== mx) F.max.textContent = mx;
    F.el.dataset.low = f.hp > 0 && f.hp <= f.maxHp * 0.25 ? 'true' : 'false';
    if (F.hp !== f.hp) { F.hp = f.hp; countTo(F.num, f.hp, this.reduced() ? 0 : 420); }
    // the chips on the pole: status, the stat stages by the card's own names, the barrier
    setChips(F.chips, chipsHtml(f));
  }
  drawPip(s, i, f, active) {
    const p = this.rail?.[s]?.pips[i];
    if (!p) return;
    const out = f.hp <= 0 && p.li.dataset.flown !== 'pending';
    const st = out ? 'out' : active ? 'active' : 'bench';
    if (p.li.dataset.state !== st) p.li.dataset.state = st;
    const n = f.hp <= 0 ? 0 : Math.max(1, Math.ceil((10 * f.hp) / f.maxHp));
    if (p.n !== n) { p.n = n; [...p.ticks.children].forEach((t, k) => { t.dataset.on = k < n ? 'true' : 'false'; }); }
    const label = `${this.ctx.title(f.id)}, ${f.hp} of ${f.maxHp} HP${out ? ', out' : active ? ', in play' : ''}`;
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
    }
    this.drawSides(v);
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
        this.numeral(fig, { value: hit?.damage ?? lost, hits: hit?.hits ?? 1, tags: hitTags(hit, out), kind: hit?.crit ? 'crit' : 'hit', color: hit?.crit ? K.accent(this.ctx.cardOf(hit.actor ?? '')) : null, every: 70 });
        if (r.to > 0) this.recoil(fig);
        if (hit) this.flash(fig);
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
  /** The figure recoils along the duel axis, away from its foe, and back. */
  recoil(fig, m = 0.28) {
    if (!fig || this.reduced()) return;
    const o = this.step(fig, -m), r = fig.side === 'player' ? -1 : 1;
    this.anim(fig.body, [
      { transform: 'translate3d(0,0,0)' },
      { transform: `translate3d(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px,0) rotate(${(r * 4).toFixed(1)}deg) scale(${(1.04 * o.k).toFixed(4)},${(0.94 * o.k).toFixed(4)})`, offset: 0.22 },
      { transform: `translate3d(${(o.x * 0.3).toFixed(1)}px,${(o.y * 0.3).toFixed(1)}px,0) scale(${(1 + (o.k - 1) * 0.3).toFixed(4)})`, offset: 0.6 },
      { transform: 'translate3d(0,0,0)' },
    ], { duration: 340, easing: OUT });
    this.anim(fig.ground.el, [
      { transform: 'translate3d(0,0,0)' },
      { transform: `translate3d(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px,0) scale(${o.k.toFixed(4)})`, offset: 0.22 },
      { transform: `translate3d(${(o.x * 0.3).toFixed(1)}px,${(o.y * 0.3).toFixed(1)}px,0) scale(${(1 + (o.k - 1) * 0.3).toFixed(4)})`, offset: 0.6 },
      { transform: 'translate3d(0,0,0)' },
    ], { duration: 340, easing: OUT });
  }
  /** The attacker lunges at its foe along the duel axis and back: farther and smaller for yours, nearer and larger for
   *  the rival's. */
  lunge(fig, m = 0.5, ms = 320) {
    if (!fig || this.reduced()) return;
    const o = this.step(fig, m);
    const at = (p, k = 1) => `translate3d(${(o.x * p).toFixed(1)}px,${(o.y * p).toFixed(1)}px,0) scale(${(1 + (o.k - 1) * p).toFixed(4)})`;
    this.moveFig(fig, [{ transform: at(0) }, { transform: at(1), offset: 0.38 }, { transform: at(0.85), offset: 0.55 }, { transform: at(0) }], { duration: ms, easing: OUT });
  }
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
  /** The figure rears as its scene opens (scale y 0.94 to 1.04 about the foot, 120 ms). */
  rear(fig) {
    if (!fig || this.reduced()) return;
    this.anim(fig.body, [{ transform: 'scale(1.03,.94)' }, { transform: 'scale(.98,1.04)', offset: 0.6 }, { transform: 'none' }], { duration: 220, easing: OUT });
  }
  /** Sink into the pad (`on` false) or rise out of it, through the 4x4 Bayer: 16 to 0 cells, or 0 to 16; its shadows
   *  go and come with it. */
  bayerFade(fig, on, ms) {
    if (!fig) return Promise.resolve();
    if (on) this.showing(fig, true);
    const done = () => { K.bayer(fig.body, on ? 16 : 0); fig.body.style.transform = ''; fig.ground.el.style.opacity = ''; if (!on) this.showing(fig, false); };
    if (this.reduced() || !ms) { done(); return Promise.resolve(); }
    // 17 steps of the 4x4 Bayer as one Web Animation (so a press skips it and a dialog holds it), with the sink or rise
    const frames = [], sink = 0.12 * fig.k;
    for (let i = 0; i <= 16; i++) {
      const n = on ? i : 16 - i, p = i / 16;
      const m = n >= 16 ? 'none' : K.MASKS[n];
      frames.push({ offset: p, maskImage: m, WebkitMaskImage: m, transform: `translate3d(0,${((on ? 1 - p : p) * sink).toFixed(1)}px,0)` });
    }
    K.bayer(fig.body, on ? 0 : 16);
    this.anim(fig.ground.el, [{ opacity: on ? 0 : 1 }, { opacity: on ? 1 : 0 }], { duration: ms, easing: 'linear' });
    const a = this.anim(fig.body, frames, { duration: ms, easing: 'linear', id: on ? 'rise' : 'sink' });
    return a.finished.catch(() => {}).then(done);
  }
  /** The card's world pours up out of its pad: its ground, through a soft disc and the Bayer, 360 ms. */
  pourUp(side, id, ms = 360) {
    if (this.reduced() || !ms) return;
    const g = this.g, f = g.foot[side], b = this.pad[side].bbox;
    const w = b.w * 1.25, h = Math.max(b.h * 1.25, w * 0.6);
    const im = el('img', 'pour', this.fx);
    im.alt = ''; im.src = K.groundOf(id);
    Object.assign(im.style, { width: `${R(w)}px`, height: `${R(h)}px`, transform: `translate3d(${R(f.x - w / 2)}px,${R(f.y - h / 2)}px,0)` });
    const a = this.anim(im, [{ scale: '0.3', opacity: 1 }, { scale: '1', opacity: 0.9, offset: 0.55 }, { scale: '1.25', opacity: 0 }], { duration: ms, easing: OUT });
    a.finished.catch(() => {}).then(() => im.remove());
  }

  // ---------------------------------------------------------------- the camera: one picture, the painting and the duel
  /** The camera is one 2D transform on the whole picture: the map and everything standing on its floor move as one,
   *  so every foot stays on its painted floor. It never shows the painting's edge inside the frame's band (the whole
   *  frame on a wide screen), with room for a shake. */
  camTo(to, ms, easing = IN_OUT) {
    const g = this.g, m = g.map, e = R(g.W * 0.012) + 2, b = g.band;
    let k = Math.max(to.k, (g.W + 2 * e) / m.w, (b.bottom - b.top + 2 * e) / m.h);
    const fitIn = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
    const x = fitIn(to.x, g.W + e - k * (m.x + m.w), -e - k * m.x), y = fitIn(to.y, b.bottom + e - k * (m.y + m.h), b.top - e - k * m.y);
    this.cam = { x, y, k };
    const tf = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${k.toFixed(4)})`;
    return this.tween(this.camEl, tf, this.reduced() ? 0 : ms, easing);
  }
  /** Put board point `p` at the frame's (fx, fy) share, at scale k. */
  pushOn(p, k, ms, fx = 0.5, fy = 0.5, easing = 'cubic-bezier(.3,.7,.1,1)') {
    if (this.reduced()) return Promise.resolve();
    const g = this.g;
    return this.camTo({ x: g.W * fx - k * p.x, y: g.H * fy - k * p.y, k }, ms, easing);
  }
  rest(ms) { return this.camTo({ x: 0, y: 0, k: 1 }, ms); }
  /** The board ending's push on a defender: 1.12 (MODES.md), raised for a small or far subject until it fills 6.5% of
   *  the frame (at most 2.4), never past what keeps it whole inside the open frame (bars at 0.86). */
  pushFor(fig) {
    const g = this.g, A = g.W * g.H, open = g.H * 0.86;
    const want = Math.sqrt((0.065 * A) / Math.max(1, fig.w * fig.h));
    const fit = Math.min((open * 0.8) / fig.h, (g.W * 0.7) / fig.w);
    return Math.max(1.12, Math.min(want, fit, 2.4));
  }
  /** The camera onto a figure at a contact: its centre at (fx, fy) of the frame, pushed `kPref`, but never so far or
   *  so off-centre that any of what reads the contact leaves the open frame (bars at 0.86): the figure, the numeral's
   *  headroom over it, its pad, and its flag with the chips. On a phone that bounds the push; on wide screens it
   *  only nudges. */
  frameOn(fig, kPref, fx = 0.5, fy = 0.54) {
    const g = this.g, b = fig.box, p = this.pad[fig.side].bbox;
    const F = this.flags?.[fig.side]?.rect;
    const pts = [[b.x, b.y - (g.phone ? 64 : 100)], [b.x + b.w, fig.foot.y], [p.x, p.y], [p.x + p.w, p.y + p.h + 6]];
    const on = (q) => { const xs = q.map((v) => v[0]), ys = q.map((v) => v[1]); return frameOn({ box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], c: this.centreOf(fig), k: kPref, W: g.W, H: g.H, fx, fy, margin: g.phone ? 8 : 16 }); };
    if (!F) return on(pts);
    const all = on([...pts, [F.x, F.y - 4], [F.x + F.w, F.y + F.h + 28]]);
    // on a phone the flag may fly well away from its pad: where keeping it would leave a small far figure under 5% of
    // the frame, the contact's frame is the figure, its number and its pad
    if (g.phone && all.k * all.k * b.w * b.h < 0.052 * g.W * g.H) return on(pts);
    return all;
  }
  /** The camera toward point `c` at the frame's (fx, fy) share and scale `kPref`, but never so far or so off-centre
   *  that the duel leaves the frame between the rails and the console: both figures standing, both leaders in any pose
   *  of a turn, both flags with their chips. */
  keepDuel(c, kPref, fx = 0.5, fy = 0.5, kMin = 1) {
    const g = this.g, boxes = [];
    for (const s of SIDES) {
      const f = this.active(s);
      if (f && !f.el.hidden && !f.fallen) boxes.push(f.box);
      boxes.push(this.reach(s));
      const F = this.flags[s];
      if (F?.rect && F.el.dataset.on === 'true') boxes.push({ x: F.rect.x, y: F.rect.y - 4, w: F.rect.w, h: F.rect.h + 32 });
      // and its hand, now held beside its leader
      const hb = this.hands[s]?.box;
      if (hb) boxes.push(hb);
    }
    const x0 = Math.min(...boxes.map((b) => b.x)), x1 = Math.max(...boxes.map((b) => b.x + b.w));
    const y0 = Math.min(...boxes.map((b) => b.y)), y1 = Math.max(...boxes.map((b) => b.y + b.h));
    const A = { x0: 6, y0: g.rail + 4, x1: g.W - 6, y1: g.floor - 4 };
    const keep = (want, lo, hi) => Math.min(hi, Math.max(lo, want));
    // on a wide screen a scene's call-out lands across the lower 30% of the frame: the hands stay above it
    const handsLow = g.phone ? 0 : Math.max(0, ...SIDES.map((t) => { const h = this.hands[t]?.box; return h ? h.y + h.h : 0; }));
    // the largest scale up to kPref at which the duel fits (and kMin where it must), else the camera at rest
    for (let k = Math.max(kMin, Math.min(kPref, (A.x1 - A.x0) / Math.max(1, x1 - x0), (A.y1 - A.y0) / Math.max(1, y1 - y0))); k >= kMin - 1e-9; k -= 0.02) {
      const xr = [A.x0 - k * x0, A.x1 - k * x1], yr = [A.y0 - k * y0, Math.min(A.y1 - k * y1, handsLow ? g.H * 0.7 - k * handsLow : Infinity)];
      if (xr[0] <= xr[1] && yr[0] <= yr[1]) return { x: keep(g.W * fx - k * c.x, ...xr), y: keep(g.H * fy - k * c.y, ...yr), k };
    }
    return { x: 0, y: 0, k: 1 };
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
    if (at === 'start') return undefined;
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
            if (them) await this.untilRead(them.uid, rd ? 0 : 190);
            const F = this.flags[side]?.rect;
            if (me && F) this.stamp(me, s.move?.name ?? s.title, 'move', 560, { x: F.x + F.w / 2, y: F.y - (this.g.phone ? 14 : 18) });
            if (rd) return undefined;
            this.rear(me);
            this.lunge(me, 0.5, 260);
            await wait(90);
            if (them) this.camTo(this.frameOn(them, this.pushFor(them), them.side === 'rival' ? 0.58 : 0.42), 100, WHIP);
            await wait(100);
            return undefined;
          }
          // the push leans on the attacker (and its leader) but keeps the whole duel in frame: both figures, both
          // leaders in any pose of the turn, both flags with their chips
          if (me && !rd) {
            const c = this.centreOf(me), lh = L.head();
            const to = special && full ? this.keepDuel(c, 1.14, 0.5, 0.52) : this.keepDuel({ x: (c.x + lh.x) / 2, y: (c.y + lh.y + lh.h) / 2 }, 1.06);
            this.camTo(to, special && full ? 220 : 200, 'cubic-bezier(.3,.7,.1,1)');
          }
          await wait(budget);
          this.rear(me);
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
            const sink = this.bayerFade(out, false, rd ? 0 : quick ? 110 : 300);
            // its card goes back to its leader's hand as the pad empties
            if (this.shown[side] === out.uid) { this.shown[side] = null; this.drawSides(this.view); }
            this.cardFly(out, rd ? 0 : quick ? 180 : 300);
            await sink;
          }
          L?.act('switch');
          if (inc) await this.throwIn(inc, rd ? 0 : quick ? 190 : 380, quick);
          return undefined;
        }
        case 'item': {
          const e = shot.post[0];
          await this.untilRead(e?.target, rd ? 0 : this.ctx.auto?.() ? 200 : 300);
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
      this.special(shot, me, them, verb);
      this.lunge(me);
      if (them) return this.camTo(this.frameOn(them, this.pushFor(them), them.side === 'rival' ? 0.58 : 0.42), 120, WHIP);
      return undefined;
    }
    if (at === 'impact') {
      if (shot.cut && verb !== 'support') this.special(shot, me, them, verb);
      switch (verb) {
        case 'hit': case 'crit': {
          if (shot.board) { this.flush(shot); this.shake(); }
          else this.flush(shot, { quiet: true });
          this.fallNow();
          Lo?.act('taken');
          const f = this.view?.sides[foe].team.find((x) => x.uid === them?.uid);
          if (f && f.hp > 0 && f.hp <= f.maxHp / 2) Lo?.say('hit');
          if (verb === 'crit') { L?.act('special'); L?.say('special'); }
          return undefined;
        }
        case 'miss': {
          if (shot.board) { this.sidestep(them); this.stamp(them, 'Miss', 'miss', 700); }
          return undefined;
        }
        case 'support': {
          if (shot.board) { this.ring(side, 'support'); this.flush(shot); if (s?.label) this.stamp(me, s.label, 'support', 900); }
          else this.flush(shot, { quiet: true });
          return undefined;
        }
        case 'status': {
          this.flush(shot);
          this.fallNow();
          const e = shot.post[0];
          const F = this.flags[e?.side ?? side];
          if (F && !rd) this.anim(F.chips, [{ rotate: '-6deg' }, { rotate: '5deg' }, { rotate: '0deg' }], { duration: 240 });
          if (e?.change === 'applied') { this.stamp(this.figs.get(e.fighter), e.status === 'stun' ? 'Stunned' : e.status, 'status', 700); this.leaders[e.side]?.act('taken'); }
          return undefined;
        }
        case 'guard': { this.shield(side); this.flush(shot); return undefined; }
        case 'trait': { this.flush(shot); if (off) this.stamp(this.figs.get(shot.post[0]?.fighter) ?? me, s.title, 'trait', 600); return undefined; }
        case 'item': { this.flush(shot); return undefined; }
        default: this.flush(shot); this.fallNow(); return undefined;
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
            if (!rd) this.camTo(this.frameOn(them, this.pushFor(them), them.side === 'rival' ? 0.58 : 0.42), 160, WHIP);
            // the scene's own number was the hit's one number; the figure only takes the landing (a beaten one has gone)
            if (verb === 'miss') { this.sidestep(them); this.stamp(them, 'Miss', 'miss', 700); }
            else if (!them.fallen) this.recoil(them);
            // a beaten figure has already gone down under the scene: its knockout follows at once. Under Auto the
            // landing takes as long as a short attack's (the whip lands on the defender), as on the Mat
            // By hand it holds until the recoil has played (340 ms), as long as the Mat's settle
            await wait(rd ? 0 : this.ctx.auto?.() ? Math.min(budget, 140) : them.fallen ? budget : 340);
          } else if (verb === 'support') { this.ring(side, 'support'); if (s?.label) this.stamp(me, s.label, 'support', 900); }
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
    try {
      const p = d.play({
        svg: this.fxSvg, layer: this.fx, g: this.g, from: box(me), to: box(them), side: s.side, hits: s.hits ?? 1, crit: verb === 'crit', miss: verb === 'miss',
        seed: (this.view?.turn ?? 1) * 7 + (s.move.index ?? 0), subject: me.img.currentSrc || me.img.src,
        ...this.fxKit(), shake: (a, ms) => this.shake(a, ms), move: s.move.id,
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
    if (this.reduced() || !ms) { this.showing(fig, true); K.bayer(fig.body, 16); this.drawSides(this.view); return; }
    this.showing(fig, false);
    if (!quick) await wait(160);
    // it lands lying flat on the painted floor, face up, on its pad, in the floor's perspective
    const to = this.padCard(side);
    await this.flyCard(fig.id, from, to, ms, { lift: this.g.th * (quick ? 1.6 : 2.6), spin: side === 'player' ? 14 : -14, endExtra: to.lie, hold: quick ? 0 : 140 });
    this.pourUp(side, fig.id, quick ? 260 : 380);
    this.drawSides(this.view);
    await this.bayerFade(fig, true, quick ? 110 : 320);
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
    if (this.reduced() || fig.el.hidden) { fig.img.style.filter = 'grayscale(1) brightness(.42)'; fig.sinking = this.bayerFade(fig, false, 0); return fig.sinking; }
    fig.img.style.filter = 'grayscale(1) brightness(.42)';
    this.anim(fig.img, [{ filter: 'grayscale(.6) brightness(.7)' }, { filter: 'grayscale(1) brightness(.42)' }], { duration: 200, easing: OUT });
    // it holds drained under its number a moment, then goes down through the Bayer
    const auto = this.ctx.auto?.();
    fig.sinking = wait(140).then(() => (fig.fallen && !fig.el.hidden ? this.bayerFade(fig, false, auto ? 420 : 560) : null));
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
    this.camTo(this.keepDuel({ x: (a.x + a.w / 2 + b.x + b.w / 2) / 2, y: (a.y + a.h / 2 + b.y + b.h / 2) / 2 }, 0.94, 0.5, 0.5, Math.min(0.94, g.phone ? 0.8 : 0.9)), rd ? 0 : 600, OUT);
    finalePoses(this.leaders, winner, verb, rd ? 0 : 1100);
    if (verb === 'draw') return;
    this.host.dataset.finale = winner;
    await wait(rd ? 0 : this.ctx.auto?.() ? 300 : 600);
  }
  unmount() {
    this.motion.skip();
    for (const s of SIDES) this.leaders[s]?.destroy();
    this.host.textContent = '';
    delete this.host.dataset.map; delete this.host.dataset.phone; delete this.host.dataset.finale; delete this.host.dataset.letterbox;
    const r = this.ctx.rail;
    r.textContent = ''; r.hidden = true;
  }
}
