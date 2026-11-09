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
const STAT_NAME = { atk: 'Reach', def: 'Proof', spd: 'Pace' };

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
  if (f.status) out.push(`<i data-down>${f.status === 'stun' ? 'Stunned' : f.status[0].toUpperCase() + f.status.slice(1)}</i>`);
  for (const k of ['atk', 'def', 'spd']) if (f.stages?.[k]) out.push(`<i${f.stages[k] < 0 ? ' data-down' : ''}>${icon ? icon(k) : ''}${STAT_NAME[k]} ${f.stages[k] > 0 ? '+' : '−'}${Math.abs(f.stages[k])}</i>`);
  if (f.barrier) out.push('<i>Barrier</i>');
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
/** What a hit meant, as the tags its number carries: Critical, the ring (x1.5 or x0.67), Out when the hit ends the card
 *  and no knockout scene follows to say so. */
export function hitTags(hit, out = false) {
  const t = [];
  if (hit?.crit) t.push({ text: 'Critical', kind: 'crit' });
  // the ring's real multiplier (a dual discipline makes ×2.25 or ×0.45), green when it helps the hit, red when it does not
  const m = Math.round((hit?.effectiveness ?? 1) * 100) / 100;
  if (m > 1) t.push({ text: `↑ ×${m}`, kind: 'ring' });
  else if (m > 0 && m < 1) t.push({ text: `↓ ×${m}`, kind: 'weak' });
  if (out) t.push({ text: 'Out', kind: 'out' });
  return t;
}
/** The damage numeral, its top centre at (x, y) in its layer: one number per hit, owned by the board. It shows the
 *  damage that landed from its first readable frame, slams from 1.6 to 1, holds `hold` ms, then rises out. A multi-hit
 *  keeps that one number and pulses once per further hit, `every` ms apart, its count of hits joining its tags at the
 *  last one. Its tags (hitTags) sit right under it, so why the hit mattered moves and fades with the number itself. */
export function numeral(motion, layer, o) {
  // a card or figure carries one number at a time: a new hit's replaces the last one's
  const rd = motion.reduced(), prev = o.uid ? [...layer.querySelectorAll(':scope > .num')].filter((x) => x.dataset.uid === o.uid) : [];
  if (!rd) for (const x of prev) x.remove();
  const n = el('b', 'num', layer, String(o.value));
  n.dataset.kind = o.kind; n.dataset.side = o.side ?? ''; n.dataset.uid = o.uid ?? '';
  if (o.color) n.style.setProperty('--nc', o.color);
  if (o.size) n.style.fontSize = `${R(o.size)}px`;
  const hits = Math.max(1, o.hits ?? 1), last = hits - 1;
  const tags = o.tags ?? [];
  const row = tags.length || hits > 1 ? el('span', 'num-tags', n) : null;
  for (const t of tags) el('i', 'num-tag', row, t.text).dataset.kind = t.kind;
  const count = hits > 1 ? el('i', 'num-tag', row, `${hits} hits`) : null;
  if (count) count.dataset.kind = 'hits';
  const every = o.every ?? 70, hold = o.hold ?? NUMBER_HOLD, SLAM_MS = 126;
  // the whole transform in each keyframe, so the scale never multiplies the position
  const at = (dy, k) => `translate3d(${R(o.x)}px,${R(o.y + dy)}px,0) translate(-50%,0) scale(${k})`;
  n.style.transform = at(-24, 1);
  if (rd) {
    // a still number shows the frame after its contact, never before it, and never over a number on the same card or
    // figure that has stood less than READ_STILL ms: it waits its turn, then replaces it (one number, read, at a time)
    n.style.transform = at(-12, 1);
    n.style.visibility = 'hidden';
    const now = performance.now(), read = (x) => (+x.dataset.born || 0) + READ_STILL;
    // a number already read goes now; one not yet read stands until it has been
    for (const x of prev) if (read(x) <= now) x.remove();
    const wait = prev.filter((x) => x.isConnected), turn = Math.max(now, ...wait.map(read));
    n.dataset.born = String(turn + 16);
    const show = () => { if (!n.isConnected) return; for (const x of wait) x.remove(); n.style.visibility = ''; n.dataset.born = String(performance.now()); setTimeout(() => n.remove(), 1600); };
    setTimeout(() => afterFrame(performance.now(), show), turn - now);
    return n;
  }
  const lastAt = SLAM_MS + last * every, T = lastAt + hold + 270, f = (ms) => Math.min(1, ms / T);
  const frames = [{ transform: at(0, 1.6), opacity: 0, offset: 0 }, { transform: at(-6, 1), opacity: 1, offset: f(SLAM_MS) }];
  for (let i = 1; i <= last; i++) {
    const t = SLAM_MS + i * every;
    frames.push({ transform: at(-4, 1.22), opacity: 1, offset: f(t - every * 0.5) }, { transform: at(-6, 1), opacity: 1, offset: f(t) });
  }
  frames.push({ transform: at(-18, 1), opacity: 1, offset: f(lastAt + hold) }, { transform: at(-24, 1), opacity: 0, offset: 1 });
  const a = motion.anim(n, frames, { duration: T, easing: 'linear', fill: 'forwards' });
  if (count && last) motion.anim(count, [{ opacity: 0 }, { opacity: 0, offset: f(lastAt) }, { opacity: 1, offset: Math.min(1, f(lastAt) + 0.001) }, { opacity: 1 }], { duration: T, fill: 'forwards' });
  a.finished.catch(() => {}).then(() => n.remove());
  return n;
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
