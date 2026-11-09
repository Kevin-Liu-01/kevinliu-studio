// The leaders, one pipeline for both modes: the Landing showdown's eight original characters from the cleaned native
// atlases in media/trainers (384x512, a 4x4 grid of 96x128 cells in Landing pose order) and roster.json (names,
// titles, accents, quotes, each pose's opaque box and foot anchor, cut from trainers.json). Only the two leaders'
// atlases load and decode. A pose
// is drawn so its measured foot anchor lands on the leader's foot, nearest-neighbour, never smoothed and never
// mirrored. Yours stands with its back to you all battle long, the result included (the sheet's bottom row, poses 12
// to 15); the rival faces you (the front rows).
import { el } from './fx.js';

export const POSE = {
  idle: 0, breath: 1, talkClosed: 2, talkOpen: 3, command: 4, windup: 5, release: 6, hit: 7,
  victory: 8, defeat: 9, special: 10, specialReturn: 11, rearIdle: 12, rearCommand: 13, rearWindup: 14, rearThrow: 15,
};
export const IDS = ['noor', 'bram', 'mae', 'sol', 'tavi', 'iona', 'oren', 'coda'];
const BASE = new URL('../media/trainers/', import.meta.url).href;
let DATA = null, dataP = null;
const atlases = new Map();
export const atlasUrl = (id) => new URL(`${id}.png`, BASE).href;

/** The roster, and the named leaders' atlases decoded, so no pose ever waits on a picture. */
export async function loadLeaders(ids) {
  dataP ??= fetch(new URL('roster.json', BASE)).then((r) => r.json()).then((d) => { DATA = { atlas: d.atlas, byId: Object.fromEntries(d.trainers.map((t) => [t.id, backInward(t)])) }; });
  await dataP;
  await Promise.all(ids.map((id) => {
    if (!atlases.has(id)) { const im = new Image(); im.src = atlasUrl(id); atlases.set(id, im.decode().catch(() => {})); }
    return atlases.get(id);
  }));
  return DATA;
}
export const leaderData = (id) => DATA?.byId[id] ?? null;
/** Your leader stands beside its figure on the outer side, so no back pose reaches farther toward the figure than
 *  its rest does: a pose that would (the throw's arm) stands that many atlas px farther out. Changes the roster's
 *  foot anchors in place, once. */
export function backInward(t) {
  if (t.inward) return t;
  const edge = (p) => t.cells[p][0] + t.cells[p][2] - t.anchors[p][0], rest = edge(POSE.rearIdle);
  for (const p of [POSE.rearCommand, POSE.rearWindup, POSE.rearThrow]) { const e = edge(p) - rest; if (e > 0) t.anchors[p] = [t.anchors[p][0] + e, t.anchors[p][1]]; }
  t.inward = true;
  return t;
}
/** The two leaders from the seed (yours `IDS[seed % 8]`, the rival's three on), or `&leaders=`. */
export function leadersFor(seed, given) {
  const g = String(given ?? '').split(',').filter((x) => IDS.includes(x));
  return g.length === 2 ? g : [IDS[seed % 8], IDS[(seed + 3) % 8]];
}
/** The leader's tallest pose in atlas pixels (foot anchor to top). */
export function tallOf(id) { const t = DATA.byId[id]; return Math.max(...t.cells.map((c, i) => t.anchors[i][1] - c[1])); }
/** The largest scale at whole device pixels per atlas pixel at which the leader's tallest pose stands in `h` px. */
export function wholeScale(id, h, dpr = devicePixelRatio || 1) {
  const t = DATA.byId[id];
  const tall = Math.max(...t.cells.map((c, i) => t.anchors[i][1] - c[1]));
  return Math.max(1, Math.floor((dpr * h) / tall)) / dpr;
}
/** A command pose as a background cropped to its opaque box, `k` css px per atlas px: the cut-in (the rival's front
 *  command 4, yours the back command 13, so each points across at the other). */
export function faceOf(id, k = 1, pose = POSE.command) {
  const A = DATA.atlas, c = DATA.byId[id].cells[pose];
  return { image: `url("${atlasUrl(id)}")`, size: `${A.size[0] * k}px ${A.size[1] * k}px`, position: `${-c[0] * k}px ${-c[1] * k}px`, w: c[2] * k, h: c[3] * k };
}

/** The result: the winner's leader takes its victory pose and line, the loser its defeat pose and, after `ms`, its line. */
export function finalePoses(leaders, winner, verb, ms) {
  if (verb === 'draw') { for (const L of Object.values(leaders)) L.act('defeat'); return; }
  const loser = winner === 'player' ? 'rival' : 'player';
  leaders[winner].act('victory'); leaders[winner].say('victory', false, 0);
  leaders[loser].act('defeat');
  setTimeout(() => leaders[loser].say('defeat', false, 0), ms);
}

export class Leader {
  /** o: { reduced(), frozen(), said (the battle's quotes said, kept across a mode switch), onQuote(q), quoteLayer,
   *  quoteAt(leader) } */
  constructor(parent, id, side, o = {}) {
    this.t = DATA.byId[id];
    this.id = id; this.side = side; this.o = o;
    this.el = el('div', 'leader', parent);
    this.el.dataset.side = side;
    this.el.style.setProperty('--accent', this.t.accent);
    this.shade = el('i', 'leader-shade', this.el);
    this.sprite = el('i', 'leader-sprite', this.el);
    this.atlas = atlasUrl(id);
    this.sprite.style.backgroundImage = `url("${this.atlas}")`;
    this.quote = el('p', 'leader-quote', o.quoteLayer ?? this.el);
    this.quote.dataset.side = side;
    this.quote.hidden = true;
    this.quote.style.setProperty('--accent', this.t.accent);
    this.qName = el('b', '', this.quote, this.t.name);
    this.qText = el('span', '', this.quote);
    this.k = 1; this.foot = { x: 0, y: 0 };
    this.cur = -1; this.timers = [];
    this.rest = side === 'player' ? POSE.rearIdle : POSE.idle;
  }
  /** The leader's own box in its parent (the Mat's zone); the Arena leaves it at the origin, its foot in board px. */
  box(b) {
    this.el.style.width = `${b.w}px`; this.el.style.height = `${b.h}px`;
    this.el.style.transform = `translate3d(${Math.round(b.x)}px,${Math.round(b.y)}px,0)`;
  }
  /** Stand on `foot` (px in the leader's box) at `k` css px per atlas px. */
  place(foot, k) {
    this.foot = foot; this.k = k;
    const A = DATA.atlas, st = this.sprite.style;
    st.backgroundSize = `${A.size[0] * k}px ${A.size[1] * k}px`;
    st.setProperty('--bs', st.backgroundSize);
    this.shade.style.transform = `translate3d(${foot.x.toFixed(1)}px,${foot.y.toFixed(1)}px,0)`;
    this.shade.style.width = `${(56 * k).toFixed(0)}px`; this.shade.style.height = `${(14 * k).toFixed(0)}px`;
    const p = this.cur; this.cur = -1; this.pose(p < 0 ? this.rest : p);
    this.placeQuote();
  }
  /** The head's box (for the quote's leader line and the camera). */
  head() {
    const i = this.cur < 0 ? this.rest : this.cur, c = this.t.cells[i], a = this.t.anchors[i];
    return { x: this.foot.x + (c[0] + c[2] / 2 - a[0]) * this.k, y: this.foot.y + (c[1] - a[1]) * this.k, w: c[2] * this.k, h: c[3] * this.k };
  }
  /** A pose's opaque box. */
  bounds(i = this.cur) {
    const c = this.t.cells[i], a = this.t.anchors[i], k = this.k;
    return { x: this.foot.x + (c[0] - a[0]) * k, y: this.foot.y + (c[1] - a[1]) * k, w: c[2] * k, h: c[3] * k };
  }
  pose(i) {
    if (i === this.cur || !this.t) return;
    this.cur = i;
    const k = this.k, c = this.t.cells[i];
    const [ax, ay] = this.t.anchors[i];
    // the sprite is the pose's opaque box (and one atlas px round it), so what it covers is the leader itself; its
    // origin sits so that the anchor lands on the foot: whole px
    const x0 = c[0] - 1, y0 = c[1] - 1, st = this.sprite.style;
    st.width = `${(c[2] + 2) * k}px`; st.height = `${(c[3] + 2) * k}px`;
    st.transform = `translate3d(${Math.round(this.foot.x - (ax - x0) * k)}px,${Math.round(this.foot.y - (ay - y0) * k)}px,0)`;
    st.backgroundPosition = `${-x0 * k}px ${-y0 * k}px`;
    st.setProperty('--bx', `${-x0 * k}px`); st.setProperty('--by', `${-y0 * k}px`);
    this.el.dataset.pose = String(i);
    this.o.onPose?.(this, i);
  }
  clear() { for (const t of this.timers) clearTimeout(t); this.timers.length = 0; clearInterval(this.breath); this.breath = 0; }
  later(ms, f) { this.timers.push(setTimeout(f, ms)); }
  /** Idle: the front rows breathe between idle and breath (the sheet's own two cells); the rear has one, so it rests. */
  breathe() {
    clearInterval(this.breath);
    if (this.o.reduced?.() || this.o.frozen?.()) return;
    if (this.side !== 'rival') return;
    let on = false;
    this.breath = setInterval(() => {
      if (this.cur !== POSE.idle && this.cur !== POSE.breath) return;
      on = !on; this.pose(on ? POSE.breath : POSE.idle);
    }, (this.t.breath * 1000) / 2);
  }
  /** A pose sequence [[pose, ms], ...], then rest (unless `hold`). Reduced motion shows the last pose, held 1.6 s. */
  seq(steps, hold = false) {
    this.clear();
    if (this.o.reduced?.()) { this.pose(steps.at(-1)[0]); if (!hold) this.later(1600, () => { this.pose(this.rest); this.breathe(); }); return; }
    let t = 0;
    for (const [p, ms] of steps) { this.later(t, () => this.pose(p)); t += ms; }
    if (!hold) this.later(t, () => { this.pose(this.rest); this.breathe(); });
  }
  /** A rear reaction the sheet lacks rests on rear idle with a 2 px recoil. */
  recoil() {
    if (this.o.reduced?.()) return;
    this.sprite.animate([{ translate: '0 0' }, { translate: `${-this.k}px ${this.k}px` }, { translate: '0 0' }], { duration: 240, easing: 'ease-out' });
  }
  /** The verb's pose (MODES.md section 4, Poses and quotes). Yours keeps its back to you through the result too: it
   *  raises its arm (the back windup) for a victory and stands at rest for a defeat. */
  act(verb, extra = {}) {
    const r = this.side === 'rival';
    switch (verb) {
      case 'entrance': case 'switch': return r ? this.seq([[POSE.windup, 180], [POSE.release, 260]]) : this.seq([[POSE.rearWindup, 180], [POSE.rearThrow, 260]]);
      case 'command': return r ? this.seq([[POSE.command, 240 + (extra.hold ?? 0)]]) : this.seq([[POSE.rearCommand, 240 + (extra.hold ?? 0)]]);
      case 'charge': return r ? this.seq([[POSE.windup, extra.impact ?? 300], [POSE.release, 260]]) : this.seq([[POSE.rearWindup, extra.impact ?? 300], [POSE.rearThrow, 260]]);
      case 'taken': if (r) return this.seq([[POSE.hit, 120], [POSE.hit, 120]]); this.recoil(); return undefined;
      case 'special': return r ? this.seq([[POSE.special, 120], [POSE.specialReturn, 120]]) : this.seq([[POSE.rearCommand, 240]]);
      case 'victory': case 'defeat': {
        this.rest = r ? (verb === 'victory' ? POSE.victory : POSE.defeat) : verb === 'victory' ? POSE.rearWindup : POSE.rearIdle;
        if (!r && verb === 'defeat') this.recoil();
        return this.seq([[this.rest, 1]], true);
      }
      default: return undefined;
    }
  }
  /** Say a quote once a battle per key (enter, command, hit, special), or always (victory, defeat). The page may take
   *  it (a cut-in in the top matte, the console's line on a phone); otherwise it shows on the board for `ms`. */
  say(key, once = true, ms = 2200) {
    const said = this.o.said, k = `${this.side}:${key}`;
    if (once && said?.has(k)) return false;
    said?.add(k);
    const text = this.t.quotes[key];
    if (!text) return false;
    if (this.o.onQuote?.({ side: this.side, id: this.id, name: this.t.name, key, text }) === false) return true;
    this.qText.textContent = text;
    this.quote.hidden = false;
    this.placeQuote();
    clearTimeout(this.qt);
    if (!this.o.reduced?.()) this.quote.animate([{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: 180, easing: 'cubic-bezier(.2,.9,.1,1)' });
    if (ms) this.qt = setTimeout(() => { this.quote.hidden = true; }, ms);
    // the front rows talk while the quote shows (talk-closed and talk-open at 140 ms)
    if (this.side === 'rival' && this.rest === POSE.idle && !this.o.reduced?.()) this.seq(Array.from({ length: 8 }, (_, i) => [i % 2 ? POSE.talkOpen : POSE.talkClosed, 140]));
    return true;
  }
  /** The plate above the leader's head, its leader line dropping to the head, where the layout puts it. */
  placeQuote() {
    const q = this.o.quoteAt?.(this);
    if (!q) return;
    this.quote.style.transform = `translate3d(${Math.round(q.x)}px,${Math.round(q.y)}px,0)`;
    this.quote.style.setProperty('--line', `${Math.max(0, Math.round(q.line))}px`);
    this.quote.style.setProperty('--line-x', `${Math.round(q.lineX)}px`);
    this.quote.style.maxWidth = `${Math.round(q.w)}px`;
  }
  hush() { clearTimeout(this.qt); this.quote.hidden = true; }
  destroy() { this.clear(); clearTimeout(this.qt); this.el.remove(); this.quote.remove(); }
}
