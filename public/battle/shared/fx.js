// What both boards draw with (MODES.md section 2): one motion registry that a press skips and a dialog holds, the
// damage numeral (a multi-hit is one running total), the HP count, the chips, the camera framing that keeps a contact
// inside the open frame, and the registry each mode's specials.js fills. A board is only its own layout on top of this.
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const R = Math.round;
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const SIDES = ['player', 'rival'];
export const other = (s) => (s === 'player' ? 'rival' : 'player');
export const EASE = { SLAM: 'cubic-bezier(.2,.9,.1,1)', OUT: 'cubic-bezier(.2,.8,.2,1)', IN_OUT: 'cubic-bezier(.65,0,.35,1)', WHIP: 'cubic-bezier(.7,0,.2,1)' };
export const NS = 'http://www.w3.org/2000/svg';
import { t as txt, list as listOf } from './strings.js';
const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const STAT_NAME = { get atk() { return txt('stat.atk'); }, get def() { return txt('stat.def'); }, get spd() { return txt('stat.spd'); } };
import { stillHtml, formKey, pipsHtml } from './tower.js';
import { FORMS } from './forms.js';
import { ico, STATUS_INFO } from './icons.js';

export function el(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent?.append(e);
  return e;
}
export function sv(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs ?? {})) e.setAttribute(k, String(v));
  parent?.append(e);
  return e;
}
/** A multi-hit's damage as its hits: the engine reports the total and the count; the last hit takes the remainder. */
export const perHit = (lost, hits) => (hits > 1 ? Array.from({ length: hits }, (_, i) => (i < hits - 1 ? Math.floor(lost / hits) : lost - Math.floor(lost / hits) * (hits - 1))) : [lost]);

/** A card's status, stat stages (by the card's own names, never ATK, DEF or SPD) and barrier, as chips. */
export function chipsHtml(f, icon = null) {
  const out = [];
  if (f.status) out.push(`<i data-down>${esc(txt(`chip.status.${f.status}`) || f.status[0].toUpperCase() + f.status.slice(1))}</i>`);
  for (const k of ['atk', 'def', 'spd']) if (f.stages?.[k]) out.push(`<i${f.stages[k] < 0 ? ' data-down' : ''}>${icon ? icon(k) : ''}${esc(txt('stat.stage', { stat: STAT_NAME[k], n: `${f.stages[k] > 0 ? '+' : '−'}${Math.abs(f.stages[k])}` }))}</i>`);
  if (f.barrier) out.push(`<i>${esc(txt('chip.barrier'))}</i>`);
  return out.join('');
}
const lum = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
/** The ink that reads on a card's accent: an HP tab's figures. */
export const inkOn = (hex) => (lum(hex) > 0.36 ? '#141312' : '#fbf9f4');
export function setChips(box, html) { if (box.dataset.html !== html) { box.dataset.html = html; box.innerHTML = html; } }

/** HP figures count to `to` over `ms` from what they show now (a count still running carries on, it never jumps).
 *  `every` spaces the figures' changes (a phone counts in steps of 60 ms rather than every frame). */
export function countTo(num, to, ms, every = 0) {
  cancelAnimationFrame(num.raf);
  const shown = Number(num.textContent);
  const from = num.textContent !== '' && Number.isFinite(shown) ? shown : to;
  if (!ms || from === to) { num.textContent = String(to); return; }
  const t0 = performance.now();
  let last = -Infinity;
  const step = (now) => {
    const p = clamp((now - t0) / ms);
    if (p >= 1 || now - last >= every) {
      last = now;
      const t = String(R(from + (to - from) * (1 - (1 - p) ** 3)));
      if (num.textContent !== t) num.textContent = t;
    }
    if (p < 1) num.raf = requestAnimationFrame(step);
  };
  num.raf = requestAnimationFrame(step);
}

/** A transform part by part: its numbers and the text between them, so two transforms of one shape mix number by
 *  number. `none` takes the other's shape at rest (translate and rotate 0, scale 1). */
const NUM = /-?\d*\.?\d+(?:e-?\d+)?/g;
function shapeOf(t) { return { text: t.split(NUM), nums: (t.match(NUM) ?? []).map(Number) }; }
function restOf(t) { return t.replace(/(\w+)\(([^)]*)\)/g, (_, f, args) => `${f}(${args.replace(NUM, /^scale/.test(f) ? '1' : '0')})`); }
/** The transform `p` of the way from `a` to `b`, or null when their shapes differ. */
function mixTransform(a, b, p) {
  if (a === 'none' && b === 'none') return 'none';
  const A = shapeOf(a === 'none' ? restOf(b) : a), B = shapeOf(b === 'none' ? restOf(a) : b);
  if (A.nums.length !== B.nums.length || A.text.join('#') !== B.text.join('#')) return null;
  return A.text.map((s, i) => (i < A.nums.length ? s + +(A.nums[i] + (B.nums[i] - A.nums[i]) * p).toFixed(4) : s)).join('');
}

/** Every board animation goes through one registry, so a press finishes them all and a dialog holds them. */
export class Motion {
  constructor(reduced) { this.reduced = reduced; this.running = new Set(); this.moving = new WeakMap(); }
  anim(e, frames, opts) {
    const a = e.animate(frames, opts);
    this.running.add(a);
    a.finished.catch(() => {}).then(() => this.running.delete(a));
    // the transforms in flight on each element, so a tween can start from where one stands without reading styles
    if (frames.some?.((k) => 'transform' in k)) {
      let s = this.moving.get(e);
      if (!s) this.moving.set(e, (s = new Set()));
      s.add(a);
      a.finished.catch(() => {}).then(() => s.delete(a));
      a.addEventListener('cancel', () => s.delete(a));
    }
    return a;
  }
  /** Tween a transform from where it stands now (mid-flight included) to `to`; the end value is written first. Where
   *  it stands is worked out from the tween in flight (its keyframes at its eased progress), so retargeting a camera
   *  or a lift never forces the page to compute its styles mid-frame; only a foreign animation is read from the page. */
  tween(e, to, ms, easing = EASE.IN_OUT) {
    const live = [...(this.moving.get(e) ?? [])].filter((a) => a.playState !== 'finished' && a.playState !== 'idle');
    let from = e.style.transform || 'none';
    if (live.length) {
      const a = live.at(-1), tw = a.tween, p = a.effect?.getComputedTiming?.().progress;
      from = (live.length === 1 && tw && typeof p === 'number' ? mixTransform(tw.from, tw.to, p) : null) ?? getComputedStyle(e).transform;
    }
    for (const a of live) a.cancel();
    e.style.transform = to;
    if (!ms || this.reduced()) return Promise.resolve();
    const start = from === 'none' ? 'translate3d(0,0,0)' : from;
    const a = this.anim(e, [{ transform: start }, { transform: to }], { duration: ms, easing });
    a.tween = { from, to };
    return a.finished.catch(() => {});
  }
  skip() { for (const a of [...this.running]) { try { a.finish(); } catch { /* finished */ } } }
  hold(paused) { for (const a of this.running) { try { if (paused) a.pause(); else a.play(); } catch { /* done */ } } }
}

/** What every stage layout is made of: its context from the page, one motion registry, and the seam's skip and hold. */
export class Layout {
  constructor() { this.motion = new Motion(() => this.reduced()); }
  reduced() { return Boolean(this.ctx?.reduced?.()); }
  anim(e, frames, opts) { return this.motion.anim(e, frames, opts); }
  tween(e, to, ms, easing) { return this.motion.tween(e, to, ms, easing); }
  /** Settle any board motion now (a press that skips a scene skips the board too). */
  skip() { this.motion.skip(); }
  /** Freeze the board (a dialog, a hidden tab), as stage.hold does. */
  hold(paused) { this.motion.hold(paused); }
  /** The board's numbers: when each card or figure last took one. A cut waits until the last number on its target
   *  has been readable for `ms` before its own contact, so a quick run of repeats never lands one over another. */
  numbered(uid) { (this.numbers ??= new Map()).set(uid, performance.now()); }
  untilRead(uid, lead = 0, ms = 740) {
    const t = this.numbers?.get(uid);
    // under reduced motion a number stands still from its first frame, so it needs its 600 ms and no slam
    const left = t === undefined ? 0 : t + (this.reduced() ? READ_STILL : ms) - (performance.now() + lead);
    return left > 0 ? wait(left) : Promise.resolve();
  }
  /** Run `f` after `ms` unless the next shot has begun by then (a cut holds its push on the defender a moment). */
  later(ms, f) { const n = this.cueN; return wait(this.reduced() ? 0 : ms).then(() => (n === this.cueN ? f() : null)); }
  /** What a special needs from its board: its motion and its marks. */
  fxKit() { return { anim: this.motion.anim.bind(this.motion), decal: this.decal.bind(this) }; }
}

/** Run `f` in the first frame that begins after `t0` (performance time), so what it shows is never dated before it. */
export function afterFrame(t0, f) { requestAnimationFrame((ts) => (ts > t0 ? f() : afterFrame(t0, f))); }
/** How long a number standing still (reduced motion) is read before another lands on its card or figure, ms. */
export const READ_STILL = 640;
/** How long a hit's number holds at rest once slammed, ms: with its slam and its fade it reads for about 760 ms. */
export const NUMBER_HOLD = 600;
/** How long past its read a moving number the next shot cuts still stands (its slam's frames), inside its 120 ms leave. */
const NUM_GRACE = 80;
/** What a hit meant, as the tags its number carries. One multiplier, one colour, one place: a ring (x1.5, x0.67, a dual
 *  discipline's x2.25) or a critical is called once, large, beside the struck card (shared/hud.js callMultiplier, in
 *  your view's colour), so the number keeps only Out (when no knockout scene follows to say so) and, from numeral(),
 *  its count of hits. */
export function hitTags(_hit, out = false) {
  return out ? [{ text: txt('chip.out'), kind: 'out' }] : [];
}

// ======================================================== whose read is on screen (ROUND6 fixes-1, R2)
/** Every shot the page presents gets a number at its pre-roll 0 (`noteShot`, from the actor tag's call); each numeral
 *  and chip row is stamped `data-shot` with the shot that made it (a chip row with the shot its events belong to), so
 *  the next shot can clear what an earlier one left and never show it inside its own. */
const SHOTS = { n: 0, cur: 0, of: new WeakMap(), ev: new Map() };
const evKey = (id) => String(id ?? '').split(':')[0];
export function noteShot(shot, o = {}) {
  if (!shot) return SHOTS.cur;
  let n = SHOTS.of.get(shot);
  if (!n) {
    // (a shot that `join`s, a knockout or a trait, is the blow before it: its events and reads carry the blow's number,
    // so the blow's chips still due are made and nothing of it counts as an earlier shot's)
    n = o.join && SHOTS.cur ? SHOTS.cur : ++SHOTS.n;
    SHOTS.of.set(shot, n);
    for (const e of [...(shot.pre ?? []), ...(shot.post ?? [])]) if (e?.id !== undefined) SHOTS.ev.set(evKey(e.id), n);
    if (SHOTS.ev.size > 4000) for (const k of [...SHOTS.ev.keys()].slice(0, 2000)) SHOTS.ev.delete(k);
  }
  SHOTS.cur = n;
  return n;
}
/** The shot now presented (0 before the first). */
export const shotNow = () => SHOTS.cur;
/** How long the multiplier call-out takes to leave when the next shot begins, ms. */
export const CLEAR_MS = 120;
/** The multiplier call-out (.mcall) leaves over 120 ms (at once standing still): the next shot's pre-roll, and a
 *  knockout's card, which is its own read (fixes-2 R3). On, or still in its own fade: either way it is gone 120 ms in. */
export function clearCall(o = {}) {
  if (typeof document === 'undefined') return;
  const rd = Boolean(o.reduced);
  for (const c of document.querySelectorAll('.mcall')) {
    if (c.dataset.on !== 'true' && Number(getComputedStyle(c).opacity) < 0.02) continue;
    const from = rd ? 0 : Number(getComputedStyle(c).opacity) || 0;
    c.dataset.on = 'false';
    // (the sheet's own 250 ms fade gives way to this 120 ms one, which ends at 0 and leaves nothing behind it)
    for (const a of c.getAnimations()) a.cancel();
    if (from > 0.01) { const a = c.animate([{ opacity: from }, { opacity: 0 }], { duration: CLEAR_MS, easing: 'ease-in' }); a.finished.catch(() => {}).then(() => a.cancel()); }
  }
}
/** At the pre-roll 0 of an attack or a transform shot: nothing the last shot read stays inside this one. The multiplier
 *  call-out (.mcall) fades over 120 ms; every chip row from an earlier shot fades out over the same 120 ms; a numeral
 *  from an earlier shot does too once it has been read (600 ms from its slam, 640 standing still under reduced motion; test 19's read
 *  outranks the clear), else the moment it has. Returns this shot's number. */
export function clearReads(shot, o = {}) {
  const n = noteShot(shot);
  // (a "Miss" is not a hit's damage: it leaves at the next plan, fixes-3 R2. A hit's number keeps its read even into a
  // transform's pre-roll: test 19's 600 ms outranks the clear, then it leaves over the rest of the 120 ms)
  if (typeof document === 'undefined') return n;
  const rd = Boolean(o.reduced), now = performance.now(), readMs = rd ? READ_STILL : NUMBER_HOLD;
  clearCall(o);
  // (a read leaves over the same 120 ms, never a cut to nothing; standing still, it goes at once)
  const leave = (e, ms = CLEAR_MS) => {
    if (rd || !e.isConnected || Number(getComputedStyle(e).opacity) < 0.02) { e.remove(); return; }
    e.dataset.leaving = '';
    const a = e.animate([{ opacity: getComputedStyle(e).opacity }, { opacity: 0 }], { duration: ms, easing: 'ease-in', fill: 'forwards' });
    a.finished.catch(() => {}).then(() => e.remove());
  };
  for (const r of document.querySelectorAll('.ptags')) if ((+r.dataset.shot || 0) < n && !('leaving' in r.dataset)) leave(r);
  // (a moving number cut by the next shot keeps NUM_GRACE past its 600 ms read, so the slam's own frames never eat into
  // it, and leaves over the rest of the 120 ms: it is read 600 ms or more and gone by its read + 120, as before R2)
  const grace = rd ? 0 : NUM_GRACE;
  for (const e of document.querySelectorAll('.num')) {
    if ((+e.dataset.shot || 0) >= n || 'leaving' in e.dataset) continue;
    if (e.dataset.kind === 'miss') { leave(e); continue; }
    const left = (+e.dataset.born || 0) + readMs + grace - now;
    if (left <= 0) leave(e, Math.max(40, CLEAR_MS - grace + left));
    else { e.dataset.stale = ''; setTimeout(() => leave(e, CLEAR_MS - grace), left); }
  }
  return n;
}

// ======================================================== a figure's drawn box (the reticle, the tag, the call-out)
/** A figure's drawn box on screen (viewport px): its picture's opaque box (the manifest view's `box`, for a form card
 *  its form's) carried by the picture's own transform as the page lays it out, so the camera, a lunge, a recoil and
 *  any scale on the figure all carry it. A turned picture (a recoil's lean, an idle sway) keeps its own box's size,
 *  its centre carried by the turn (every transform from the picture up to the figure): a turned rectangle's bounding
 *  box is wider than the figure in it (a 5 degree lean made the reticle 1.54 times the figure's pixels), and a
 *  reticle that swelled with each lean would pump. Null where the layout `l` has no such figure. */
const turnOf = (e, stop) => {
  let t = 0;
  for (let x = e; x && x !== stop?.parentElement && x !== document.body; x = x.parentElement) {
    const cs = getComputedStyle(x);
    if (cs.transform && cs.transform !== 'none') { const m = cs.transform.match(/matrix(3d)?\(([^)]+)\)/); if (m) { const v = m[2].split(',').map(Number); t += Math.atan2(v[1], v[0]); } }
    if (cs.rotate && cs.rotate !== 'none') { const d = parseFloat(cs.rotate.split(' ').at(-1)); if (Number.isFinite(d)) t += (d * Math.PI) / 180; }
    if (x === stop) break;
  }
  return t;
};
export function drawnBox(l, side) {
  try {
    const f = l?.active?.(side), v = f?.view, img = f?.img;
    if (!v?.box || !v.w || !v.h || !img || f.el?.hidden) return null;
    const q = img.getBoundingClientRect(), w = img.offsetWidth, h = img.offsetHeight;
    if (q.width < 2 || q.height < 2) return null;
    const th = w && h ? turnOf(img, f.el) : 0, c = Math.cos(th), sn = Math.sin(th), ac = Math.abs(c), as = Math.abs(sn);
    if (as < 1e-3) {
      const sx = q.width / v.w, sy = q.height / v.h;
      return new DOMRect(q.left + v.box[0] * sx, q.top + v.box[1] * sy, (v.box[2] - v.box[0]) * sx, (v.box[3] - v.box[1]) * sy);
    }
    // (the picture's scale on each axis from its turned bounding box; its opaque box about its centre, turned)
    const kx = q.width / (w * ac + h * as), ky = q.height / (w * as + h * ac), ux = w / v.w, uy = h / v.h;
    const dx = ((v.box[0] + v.box[2]) / 2 - v.w / 2) * ux * kx, dy = ((v.box[1] + v.box[3]) / 2 - v.h / 2) * uy * ky;
    const bw = (v.box[2] - v.box[0]) * ux * kx, bh = (v.box[3] - v.box[1]) * uy * ky;
    const cx = q.left + q.width / 2 + dx * c - dy * sn, cy = q.top + q.height / 2 + dx * sn + dy * c;
    return new DOMRect(cx - bw / 2, cy - bh / 2, bw, bh);
  } catch { return null; }
}

/** A figure's body as drawn now (viewport px): its drawn box, or, while a special carries it (the figure off its pad
 *  and its own picture flying, Jarhead's hop), that flier's opaque box, so a read that follows the actor follows the
 *  body and not the empty pad (fixes-3 R5). Null where the layout has no such figure. */
export function bodyBox(l, side) {
  const d = drawnBox(l, side);
  try {
    const f = l?.active?.(side), v = f?.view;
    const carried = [...(f?.carry ?? []), f?.flight].some((a) => a && a.playState === 'running');
    if (!carried || !v?.box || !f.img) return d;
    // (a flier is drawn in the board's effect layers; the figure's own cast shadow, the same picture squashed on the
    // floor, is not)
    const src = f.img.currentSrc || f.img.src, layers = [l.fx, l.fxBack].filter((e) => e?.querySelectorAll);
    for (const im of layers.flatMap((e) => [...e.querySelectorAll('img')])) {
      if (im === f.img || f.el?.contains(im) || (im.currentSrc || im.src) !== src) continue;
      const q = im.getBoundingClientRect();
      if (q.width < 4 || q.height < 4 || +getComputedStyle(im).opacity < 0.3) continue;
      const sx = q.width / v.w, sy = q.height / v.h;
      return new DOMRect(q.left + v.box[0] * sx, q.top + v.box[1] * sy, (v.box[2] - v.box[0]) * sx, (v.box[3] - v.box[1]) * sy);
    }
  } catch { /* the drawn box */ }
  return d;
}

// ---------- every chip inside the window: 8 px from each edge, whatever the camera does under it
const EDGE = 8;
const kept = new Set();
let keepRaf = 0;
/** Keep `e` (a chip row, a number's tags) `EDGE` px inside the viewport while it stands: its CSS `translate` takes the
 *  shift, in its layer's px (the layer's scale is read from the element's own box). `base` is its CSS translate. */
function keepIn(e, base = ['0px', '0px']) {
  e.__keep = base;
  kept.add(e);
  nudge(e);
  if (!keepRaf && typeof requestAnimationFrame === 'function') keepRaf = requestAnimationFrame(keepAll);
}
function nudge(e) {
  const q = e.getBoundingClientRect(), w = e.offsetWidth;
  if (!q.width || !w) return;
  const k = q.width / w, cur = e.__dx ?? 0, cury = e.__dy ?? 0;
  // where it would stand unshifted, in viewport px
  const L0 = q.left - cur * k, R0 = q.right - cur * k, T0 = q.top - cury * k, B0 = q.bottom - cury * k;
  const W = innerWidth, H = innerHeight;
  let dx = 0, dy = 0;
  if (R0 - L0 <= W - 2 * EDGE) dx = L0 < EDGE ? EDGE - L0 : R0 > W - EDGE ? W - EDGE - R0 : 0;
  if (B0 - T0 <= H - 2 * EDGE) dy = T0 < EDGE ? EDGE - T0 : B0 > H - EDGE ? H - EDGE - B0 : 0;
  // (rounded away from the edge, so a shift never stops a pixel short of it)
  const out = (v) => (v > 0 ? Math.ceil(v - 1e-6) : v < 0 ? Math.floor(v + 1e-6) : 0);
  const lx = out(dx / k), ly = out(dy / k);
  if (lx === cur && ly === cury) return;
  e.__dx = lx; e.__dy = ly;
  const [bx, by] = e.__keep;
  e.style.translate = lx || ly ? `calc(${bx} + ${lx}px) calc(${by} + ${ly}px)` : '';
}
function keepAll() {
  keepRaf = 0;
  for (const e of kept) { if (!e.isConnected) kept.delete(e); else nudge(e); }
  if (kept.size) keepRaf = requestAnimationFrame(keepAll);
}
/** The damage numeral, its top centre at (x, y) in its layer: one number per hit, owned by the board. It shows the
 *  damage that landed from its first readable frame, slams from 1.6 to 1, holds `hold` ms, then rises out. A multi-hit
 *  keeps that one number; with `ticks` a row of one tick per hit fills under it, one every 90 ms from the contact (five
 *  hits in 450 ms, slow enough to count), else it pulses once per further hit, `every` ms apart. Its count of hits joins
 *  its tags at the last one. Its tags (hitTags) sit right under it, so why the hit mattered moves and fades with the
 *  number itself. */
export function numeral(motion, layer, o) {
  // a card or figure carries one number at a time: a new hit's replaces the last one's
  const rd = motion.reduced(), prev = o.uid ? [...layer.querySelectorAll(':scope > .num')].filter((x) => x.dataset.uid === o.uid) : [];
  if (!rd) for (const x of prev) x.remove();
  // a damaging number owns the contact: chips an earlier shot left leave as it lands (test 19)
  if (o.kind !== 'heal' && typeof document !== 'undefined') for (const r of document.querySelectorAll('.ptags')) r.remove();
  const n = el('b', 'num', layer, String(o.value));
  n.dataset.kind = o.kind; n.dataset.side = o.side ?? ''; n.dataset.uid = o.uid ?? '';
  // a critical or a knockout's number holds its landing size 300 ms, in the striker's side tone inside the crit ring
  // (fixes-3 R5: the crit "4" shrank from 66 to 41 px in 133 ms, in the card's blue)
  const big = o.kind === 'crit' || (o.tags ?? []).some((t) => t.kind === 'out');
  if (big && o.kind !== 'heal' && o.kind !== 'miss') { n.dataset.big = ''; n.dataset.by = o.side === 'player' ? 'rival' : 'player'; }
  // whose read it is, and when it was slammed (the next shot clears it once read: clearReads)
  n.dataset.shot = String(SHOTS.cur); n.dataset.born = String(performance.now());
  if (o.color) n.style.setProperty('--nc', o.color);
  if (o.size) n.style.fontSize = `${R(o.size)}px`;
  const hits = Math.max(1, o.hits ?? 1), last = hits - 1;
  const tags = o.tags ?? [];
  const row = tags.length || hits > 1 ? el('span', 'num-tags', n) : null;
  for (const t of tags) el('i', 'num-tag', row, t.text).dataset.kind = t.kind;
  const count = hits > 1 ? el('i', 'num-tag', row, txt('chip.hits.n', { n: hits }, hits)) : null;
  if (count) count.dataset.kind = 'hits';
  // the ticks: one per hit, under the number and over its tags, filled one every TICK_MS from the contact
  const ticks = o.ticks && hits > 1 ? el('span', 'num-ticks', n) : null;
  if (ticks) { n.dataset.ticks = String(hits); for (let i = 0; i < hits; i++) el('i', '', ticks); }
  const every = ticks ? TICK_MS : o.every ?? 70, hold = o.hold ?? NUMBER_HOLD, SLAM_MS = 126;
  // the whole transform in each keyframe, so the scale never multiplies the position
  const at = (dy, k) => `translate3d(${R(o.x)}px,${R(o.y + dy)}px,0) translate(-50%,0) scale(${k})`;
  n.style.transform = at(-24, 1);
  if (rd) {
    if (ticks) ticks.dataset.full = 'true';
    // a still number shows the frame after its contact, never before it, and never over a number on the same card or
    // figure that has stood less than READ_STILL ms: it waits its turn, then replaces it (one number, read, at a time)
    n.style.transform = at(-12, 1);
    n.style.visibility = 'hidden';
    const now = performance.now(), read = (x) => (+x.dataset.born || 0) + READ_STILL;
    // a number already read goes now; one not yet read stands until it has been
    for (const x of prev) if (read(x) <= now) x.remove();
    const wait = prev.filter((x) => x.isConnected), turn = Math.max(now, ...wait.map(read));
    n.dataset.born = String(turn + 16);
    const show = () => { if (!n.isConnected) return; for (const x of wait) x.remove(); n.style.visibility = ''; n.dataset.born = String(performance.now()); placed(n); setTimeout(() => n.remove(), 1600); };
    setTimeout(() => afterFrame(performance.now(), show), turn - now);
    if (row) keepIn(row, ['-50%', ticks ? '14px' : '3px']);
    return n;
  }
  // (with ticks the last hit is counted at hits x TICK_MS from the contact; the number rests whole from its slam)
  const BIG = 'big' in n.dataset ? BIG_HOLD : 0;
  const lastAt = BIG + (ticks ? Math.max(SLAM_MS, hits * TICK_MS) : SLAM_MS + last * every), T = lastAt + hold + 270, f = (ms) => Math.min(1, ms / T);
  // (it is whole by 60 ms, so its first contact frame reads it in front of the pieces and a diving attacker, fixes-2
  // R11: from half on its first frame, never a cut from nothing)
  const IN = 60, q = IN / SLAM_MS;
  const frames = BIG
    ? [{ transform: at(0, 1.6), opacity: 0.5, offset: 0 }, { transform: at(0, 1.6), opacity: 1, offset: f(IN) }, { transform: at(0, 1.6), opacity: 1, offset: f(BIG) }, { transform: at(-6, 1.25), opacity: 1, offset: f(BIG + SLAM_MS) }]
    : [{ transform: at(0, 1.6), opacity: 0.5, offset: 0 }, { transform: at(-6 * q, 1.6 - 0.6 * q), opacity: 1, offset: f(IN) }, { transform: at(-6, 1), opacity: 1, offset: f(SLAM_MS) }];
  // (a held number settles at 1.25, not 1: it stays the largest read on the board)
  const restK = BIG ? 1.25 : 1;
  if (!ticks) for (let i = 1; i <= last; i++) {
    const t = BIG + SLAM_MS + i * every;
    frames.push({ transform: at(-4, restK * 1.22), opacity: 1, offset: f(t - every * 0.5) }, { transform: at(-6, restK), opacity: 1, offset: f(t) });
  }
  // each tick fills at its hit: an opacity step on a 2 px mark (no luminance beat over its block)
  if (ticks) [...ticks.children].forEach((t, i) => { const on = f(BIG + (i + 1) * TICK_MS); motion.anim(t, [{ opacity: 0.28 }, { opacity: 0.28, offset: Math.max(0, on - 0.0005) }, { opacity: 1, offset: on }, { opacity: 1 }], { duration: T, fill: 'forwards' }); });
  frames.push({ transform: at(-18, restK), opacity: 1, offset: f(lastAt + hold) }, { transform: at(-24, restK), opacity: 0, offset: 1 });
  const a = motion.anim(n, frames, { duration: T, easing: 'linear', fill: 'forwards' });
  placed(n);
  // (its tags kept inside the window from the frame it lands, measured where its slam stands, not before it is placed)
  if (row) keepIn(row, ['-50%', ticks ? '14px' : '3px']);
  if (count && last) motion.anim(count, [{ opacity: 0 }, { opacity: 0, offset: f(lastAt) }, { opacity: 1, offset: Math.min(1, f(lastAt) + 0.001) }, { opacity: 1 }], { duration: T, fill: 'forwards' });
  a.finished.catch(() => {}).then(() => n.remove());
  return n;
}

/** A number now stands where it is read: the actor tag steps off it in this frame (shared/beats.js `num:placed`). */
const placed = (n) => { try { n.dispatchEvent(new Event('num:placed', { bubbles: true })); } catch { /* none */ } };
/** How long a critical or a knockout's number holds its landing size before it settles, ms (fixes-3 R5). */
export const BIG_HOLD = 300;
/** A multi-hit's ticks fill one every TICK_MS from the contact (ROUND6.md section 5.2). */
export const TICK_MS = 90;

// ======================================================== what changed: the post chips (ROUND6.md section 5.2)
/** When the first chip shows after a damaging hit's contact (no other value before it, test 19), its stagger, how long
 *  each holds (by hand, under Auto), and how many show at once. */
export const POST = { lead: 450, leadAuto: 300, stagger: 120, hold: 600, holdAuto: 400, max: 3, in: 120, out: 160 };
const STAGE_MULT = (n) => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n));
const sideOfUid = (uid) => (String(uid).startsWith('rival') ? 'rival' : 'player');
/** A gain for a card is good for you when it is yours, bad when it is the rival's (shared/hud.js povTone). */
const pov = (good, side) => ((good ? side === 'player' : side === 'rival') ? 'up' : 'down');
const MINUS = '−';
/** Every chip a shot's post events earn, in event order, pure (the legibility probe reads the same list):
 *  { uid, side, kind, text, tone, icon, self, id, form? }. A heal, drain, recoil, stat stage, barrier or crit boost on a
 *  card; a condition applied to one; a tower built or upgraded. `self` is a change on the card that acted (over its
 *  head), else on the card struck (under its number). */
export function postChips(post = []) {
  const out = [];
  const hit = post.find((e) => e.kind === 'hit');
  const actor = post.find((e) => e.actor)?.actor ?? hit?.actor ?? null;
  const struck = hit?.target ?? null;
  for (const e of post) {
    const uid = e.fighter ?? e.target ?? e.actor;
    const side = uid ? sideOfUid(uid) : e.side;
    const self = uid !== struck || (!hit && uid === actor);
    if (e.kind === 'effect') {
      const t = e.effect;
      if (t === 'heal' || t === 'drain') out.push({ id: e.id, uid, side, kind: t, text: txt('chip.hpUp', { n: e.amount }), tone: pov(true, side), icon: t, self });
      else if (t === 'recoil') out.push({ id: e.id, uid, side, kind: t, text: txt('chip.hpDown', { n: e.amount }), tone: pov(false, side), icon: 'recoil', self });
      else if (t === 'barrier') out.push({ id: e.id, uid, side, kind: t, text: txt('chip.barrierPct', { n: Math.round(e.amount * 100) }), tone: pov(true, side), icon: 'barrier', self, turn: e.turn, pct: Math.round(e.amount * 100) });
      else if (t === 'critUp') out.push({ id: e.id, uid, side, kind: t, text: txt('chip.critPct', { n: Math.round(e.amount * 100) }), tone: pov(true, side), icon: 'crit', self });
      else if (t === 'atkUp' || t === 'defUp' || t === 'spdUp') {
        const k = t.slice(0, 3), n = e.stage ?? e.amount, d = e.amount ?? 1;
        out.push({ id: e.id, uid, side, kind: t, text: txt('chip.stage', { stat: STAT_NAME[k], n: `${d >= 0 ? '+' : MINUS}${Math.abs(d)}`, m: `×${Math.round(STAGE_MULT(n) * 100) / 100}` }), tone: pov(d >= 0, side), icon: d >= 0 ? 'up' : 'down', self });
      }
    } else if (e.kind === 'status' && e.change === 'applied') {
      out.push({ id: e.id, uid, side, kind: 'status', status: e.status, text: txt(`chip.cond.${e.status}`) || e.status, tone: pov(false, side), icon: e.status, self });
    } else if (e.kind === 'transform') {
      out.push({ id: e.id, uid: e.fighter, side: e.side, kind: 'transform', text: e.name ?? '', tone: 'side', icon: '', self: true, form: { form: e.to?.form, level: e.to?.level, accent: e.accent, name: e.name } });
      // an upgrade names what it brings to key 1 ("Tesla Coil, 5 hits"; "Missile Battery, 110 Power, Priority +1")
      const m = e.change === 'upgrade' ? FORMS[e.card]?.forms?.[e.to?.form]?.moves?.[String(e.to?.level).toLowerCase()]?.[0] : null;
      if (m) out.push({ id: `${e.id}:move`, uid: e.fighter, side: e.side, kind: 'gain', text: listOf([m.name, m.hits ? txt('chip.hits.n', { n: m.hits.max }, m.hits.max) : m.power > 0 ? txt('tower.power', { n: m.power }) : '', m.priority > 0 ? txt('tip.priority', { n: `+${m.priority}` }) : ''].filter(Boolean)), tone: pov(true, e.side), icon: 'up', self: true });
      // and the barrier every upgrade raises, at every level (fixes-2 R5), named here once: where the tower fires in the
      // same act the barrier rides its attack's events, whose chip then gives way to this one (postTags)
      const bar = e.change === 'upgrade' ? FORMS[e.card]?.upgradeBarrier : 0;
      if (bar > 0 && !post.some((x) => x.kind === 'effect' && x.effect === 'barrier' && x.fighter === e.fighter)) out.push({ id: `${e.id}:barrier`, uid: e.fighter, side: e.side, kind: 'barrier', text: txt('chip.barrierPct', { n: Math.round(bar * 100) }), tone: pov(true, e.side), icon: 'barrier', self: true, turn: e.turn, pct: Math.round(bar * 100) });
    }
  }
  return out;
}
/** The post chips of a shot on the board. `anchorOf(uid, { self })` gives where a card's chips stand: { layer, x, y }
 *  in that layer's px (the chips hang from that point, centred: under the number for the card struck, over the head of
 *  the card that acted). `at` is the contact's time (performance time; now if left out): after a damaging hit the
 *  first chip shows at + 450, otherwise at once; 120 ms apart; each holds 600 ms (400 under `auto`). At most three
 *  show; a fourth and later fold into "+1 more", whose title lists them. `motion` (the board's registry) lets a press
 *  finish them and a dialog hold them; under reduced motion they stand still from their time to the still's end.
 *  `icon(name)` prints an icon; `chip(c)` may print a chip's inside (the tower's still and pips). Returns the chips. */
/** Each fighter's barrier an upgrade's chip has named ({ turn, pct, shot }): its attack in the same turn, within the next
 *  few shots, does not name the same barrier again. Keyed by the shot count as well as the turn, so a rematch or a
 *  mode switch on the same page (the same uid, the same turn number, shots later) is never taken for it, and a barrier
 *  of another amount (a Dinky Guard's 30%) is always named (fixes-2 R5 after the critic). */
const NAMED = new Map();
const NAMED_SHOTS = 3;
/** The transform's call-out as drawn (its text's opacity, its own times its ancestors'), 0 when off screen. */
const titleAlpha = () => {
  if (typeof document === 'undefined' || document.querySelector('#app')?.dataset.scene !== 'transform') return 0;
  const t = document.querySelector('#stage .sd-callout-text');
  if (!t) return 0;
  let a = 1;
  for (let x = t; x && x !== document.documentElement && a > 0; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; a *= +cs.opacity; }
  return a;
};
/** The transform's call-out on screen (its text drawn at half or more): an upgrade's chips wait until it leaves. */
const titleOn = () => titleAlpha() >= 0.5;
export function postTags(post, o = {}) {
  let list = postChips(post);
  // one read per fact in a build or an upgrade (fixes-2 R5): while its title shows (a full or a short transform) the
  // title names the tower, so its chip is not made; what the upgrade brings (its move, its barrier) waits until the
  // title leaves. A board-only transform (Auto's 420) has no title and shows all three at once.
  // (a still holds its title to its end: under reduced motion the title still names the tower, and what it brings stands
  // with it, as the still has no after)
  const still = Boolean(o.reduced ?? o.motion?.reduced?.());
  const titled = post.some((e) => e.kind === 'transform') && (still ? typeof document !== 'undefined' && document.querySelector('#app')?.dataset.scene === 'transform' : titleOn());
  if (titled) list = list.filter((c) => c.kind !== 'transform');
  for (const c of list) if (c.kind === 'barrier' && String(c.id).endsWith(':barrier')) NAMED.set(c.uid, { turn: c.turn, pct: c.pct, shot: SHOTS.cur });
  const named = (c) => { const n = NAMED.get(c.uid); return Boolean(n) && c.turn !== undefined && n.turn === c.turn && n.pct === c.pct && SHOTS.cur - n.shot <= NAMED_SHOTS; };
  list = list.filter((c) => !(c.kind === 'barrier' && !String(c.id).endsWith(':barrier') && named(c)));
  // (they come in as the title starts to leave, crossing its fade: by hand a short upgrade's title fades from impact +
  // 200, so its move and barrier stand 600 ms or more before the next pre-roll takes them, fixes-2 R5 after the critic:
  // laid once it was under half, Barrier 15% stood about 270 ms)
  if (titled && !still && list.length && o.anchorOf && typeof requestAnimationFrame === 'function') {
    const n0 = SHOTS.cur, t0 = performance.now();
    let peak = 0;
    const wait = () => {
      if (SHOTS.cur !== n0) return;
      const a = titleAlpha();
      peak = Math.max(peak, a);
      const leaving = a < 0.5 || (peak >= 0.98 && a < peak - 0.02);
      if (!leaving && performance.now() - t0 < 3000) { requestAnimationFrame(wait); return; }
      // (together, so the barrier stands as long as the move)
      layTags(list, post, { ...o, at: performance.now(), stagger: 0 });
    };
    requestAnimationFrame(wait);
    return list;
  }
  // (a board-only transform, Auto's 420, has no title and a short after: its chips come in together as the actor tag
  // finishes leaving (beats.js tags it out at the contact over 120 ms), so the tower carries the star and at most 3
  // labels, and the third, its barrier, stands as long as the first, fixes-2 R5 after the critic: Barrier 15% stood one
  // strip frame inside its shot)
  if (!still && !titled && post.some((e) => e.kind === 'transform') && typeof performance !== 'undefined') return layTags(list, post, { ...o, at: (o.at ?? performance.now()) + POST.in, stagger: 0 });
  return layTags(list, post, o);
}
function layTags(list, post, o) {
  const damaging = post.some((e) => e.kind === 'hit' && e.damage > 0);
  // a damaging contact owns the screen until + 450: the chips an earlier shot left (Auto carries them into the next
  // pre-roll) leave at its contact, so no other value stands beside its number
  if (damaging && o.anchorOf && typeof document !== 'undefined') for (const r of document.querySelectorAll('.ptags')) r.remove();
  if (!list.length || !o.anchorOf) return list;
  const motion = o.motion, rd = Boolean(o.reduced ?? motion?.reduced?.());
  // (under Auto a short shot ends at about + 300: its chips land inside it, never in the next shot's pre-roll)
  const lead = damaging ? (rd ? Math.max(POST.lead, READ_STILL) : o.auto ? POST.leadAuto : POST.lead) : 0;
  const now = performance.now(), at = o.at ?? now;
  const delay = Math.max(0, at + lead - now);
  const hold = rd ? Math.max(900, o.stillMs ?? 900) : o.auto ? POST.holdAuto : POST.hold;
  const shown = list.slice(0, POST.max), folded = list.slice(POST.max);
  // one row per anchor (a card's own changes over its head, the struck card's under its number)
  const rows = new Map();
  shown.forEach((c, i) => {
    const k = `${c.uid}|${c.self}`;
    if (!rows.has(k)) rows.set(k, { c, items: [] });
    rows.get(k).items.push({ c, i });
  });
  if (folded.length) rows.get([...rows.keys()].at(-1)).items.push({ c: { kind: 'more', text: txt('chip.more', { n: folded.length }, folded.length), tone: 'even', title: listOf(folded.map((x) => x.text)) }, i: shown.length - 1 });
  for (const { c, items } of rows.values()) {
    // a chip whose event belongs to a shot that has ended is never made (the next shot has the screen)
    const of = SHOTS.ev.get(evKey(c.id)) ?? SHOTS.cur;
    if (of < SHOTS.cur) continue;
    const a = o.anchorOf(c.uid, { self: c.self, chip: c });
    if (!a?.layer) continue;
    const row = el('div', 'ptags', a.layer);
    row.dataset.self = String(c.self); row.dataset.side = c.side ?? ''; row.dataset.shot = String(of);
    row.style.transform = `translate3d(${R(a.x)}px,${R(a.y)}px,0) translate(-50%,${c.self && a.above !== false ? '-100%' : '0'})`;
    let last = 0;
    for (const { c: x, i } of items) {
      const chip = el('span', 'ptag', row);
      chip.dataset.tone = x.tone; chip.dataset.kind = x.kind;
      chip.dataset.uid = x.uid ?? ''; if (x.id !== undefined) chip.dataset.event = String(x.id);
      if (x.title) chip.title = x.title;
      // a tower's chip is its still, its name and its stars (no icon); every other is its icon and its words
      const own = x.kind === 'transform' && x.form ? `${stillHtml(formKey(x.form.form, x.form.level ?? 1), { h: 20, hi: true, accent: x.form.accent, cls: 'tw-still tw-plate' })}<b>${x.text}</b>${pipsHtml(x.form.level ?? 1, { accent: x.form.accent })}` : `${x.icon ? (x.kind === 'status' ? `<span style="color:${STATUS_INFO[x.status]?.color ?? 'currentColor'}">${(o.icon ?? ico)(x.icon)}</span>` : (o.icon ?? ico)(x.icon)) : ''}<b>${x.text}</b>`;
      chip.innerHTML = (o.chip?.(x) ?? '') || own;
      const t0 = delay + i * (o.stagger ?? POST.stagger);
      last = Math.max(last, t0);
      if (rd) { chip.dataset.still = ''; chip.style.visibility = 'hidden'; setTimeout(() => { chip.style.visibility = ''; }, t0); continue; }
      const T = POST.in + hold + POST.out;
      motion?.anim(chip, [{ opacity: 0, transform: 'translate3d(0,4px,0)' }, { opacity: 1, transform: 'none', offset: POST.in / T }, { opacity: 1, transform: 'none', offset: (POST.in + hold) / T }, { opacity: 0, transform: 'translate3d(0,-3px,0)' }], { duration: T, delay: t0, fill: 'both', easing: 'linear' });
    }
    keepIn(row);
    const end = last + (rd ? hold : POST.in + hold + POST.out) + 20;
    setTimeout(() => row.remove(), end);
  }
  return list;
}

/** The camera onto a contact: board point `c` at (fx, fy) of the frame, pushed `k`, but never so far or so off-centre
 *  that any of `box` ([x0, y0, x1, y1], board px: what reads the contact) leaves the open frame between bars at `ap`.
 *  `fill` (a board rect) is room the camera keeps covering the frame with wherever it can (the mat's own edges). */
export function frameOn({ box, c, k, W, H, fx = 0.5, fy = 0.5, margin = 16, ap = 0.86, fill = null, kMin = 1 }) {
  const open = H * (1 - 1.01 * (1 - ap)), top = (H - open) / 2, bottom = top + open;
  const [x0, y0, x1, y1] = box;
  const fit = Math.min((W - 2 * margin) / Math.max(1, x1 - x0), (open - 2 * margin) / Math.max(1, y1 - y0));
  k = Math.max(kMin, Math.min(k, fit));
  const keep = (want, lo, hi, a0, a1) => { const min = lo - k * a0, max = hi - k * a1; return min > max ? (min + max) / 2 : Math.min(max, Math.max(min, want)); };
  let x = W * fx - k * c.x, y = H * fy - k * c.y;
  if (fill) {
    const cover = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));
    x = cover(x, W - k * (fill.x + fill.w), -k * fill.x);
    y = cover(y, bottom - k * (fill.y + fill.h), top - k * fill.y);
  }
  return { x: keep(x, margin, W - margin, x0, x1), y: keep(y, top + margin, bottom - margin, y0, y1), k };
}

/** A card's answer on the board, by card and move: the most specific definition wins, as the cutscene registry does. */
export function registry() {
  const REG = [];
  return {
    define(d) { REG.push(d); return d; },
    find(card, move) {
      let best = null;
      for (const d of REG) {
        if (d.card !== card || (d.move && d.move !== move)) continue;
        if (!best || (d.move && !best.move)) best = d;
      }
      return best;
    },
  };
}
export const rnd = (seed, i) => { const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return x - Math.floor(x); };
export function path(svg, d, attrs = {}) {
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d);
  p.setAttribute('pathLength', '1');
  for (const [k, v] of Object.entries(attrs)) p.setAttribute(k, String(v));
  svg.append(p);
  return p;
}
