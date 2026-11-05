// Per-card board specials for the Arena: what a card's attack does on the battlefield itself, at its contact. The
// cutscene registry decides how the scene looks; this decides how the arena answers it. The most specific definition
// wins (card and move, then card), as the cutscene registry does. Three cards prove the path:
//   Claude of Tanks: a tracer volley down the duel axis that scorches the dais where it lands.
//   Jarhead: the blob hops across the board in two arcs, squashes onto its target and bounces home, its shadow on
//            the floor the whole way.
//   Katagami: the construction of a cubic curve drawn across the board, points and handles first, then the stroke.
// Everything draws in board px (it moves with the camera), with transform, opacity and SVG stroke offsets only.
import { registry, el, path, rnd, NS } from '../shared/fx.js';

export const specials = registry();
const defineSpecial = specials.define;
const group = (svg) => { const g = document.createElementNS(NS, 'g'); svg.append(g); return g; };
const f1 = (n) => n.toFixed(1);
const done = (jobs) => Promise.all(jobs.map((a) => a.finished?.catch(() => {}) ?? a));

// ---------------------------------------------------------------- Claude of Tanks: tracers down the duel axis
function volley(c, perHit = 4, column = false) {
  const { svg, from, to, hits, miss, seed, anim, g } = c;
  const G = group(svg);
  const n = Math.min(16, perHit + Math.max(1, hits) * (column ? 3 : 1));
  // the muzzle: the tank's front, toward its foe, at 42% of its height
  const dir = to.foot.x > from.foot.x ? 1 : -1;
  const mx = from.foot.x + dir * from.w * 0.32, my = from.y + from.h * 0.42;
  const jobs = [];
  const flashAt = (x, y, r, delay) => {
    const s = document.createElementNS(NS, 'circle');
    s.setAttribute('cx', f1(x)); s.setAttribute('cy', f1(y)); s.setAttribute('r', f1(r));
    s.setAttribute('class', 'tk-spark');
    s.style.transformOrigin = `${f1(x)}px ${f1(y)}px`;
    G.append(s);
    jobs.push(anim(s, [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.3)', opacity: 0 }], { duration: 220, delay, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }));
  };
  for (let i = 0; i < n; i++) {
    let tx, ty;
    if (miss) {
      // past the target, across the axis: the floor takes the rounds
      const side = rnd(seed, i + 9) < 0.5 ? -1 : 1;
      tx = to.foot.x + side * g.tw * (0.7 + rnd(seed, i + 3) * 0.6); ty = to.foot.y + side * g.th * (0.7 + rnd(seed, i + 3) * 0.6);
    } else if (column) {
      // a column walked onto the target: the first rounds fall short on the floor, the last ones land
      const k = i / Math.max(1, n - 1);
      tx = from.foot.x + (to.foot.x - from.foot.x) * (0.55 + 0.45 * k) + (rnd(seed, i) - 0.5) * g.tw * 0.4;
      ty = (from.foot.y + (to.foot.y - from.foot.y) * (0.55 + 0.45 * k)) - (k > 0.7 ? to.h * 0.4 * rnd(seed, i + 5) : 0);
    } else {
      tx = to.foot.x + (rnd(seed, i + 5) - 0.5) * to.w * 0.6; ty = to.y + to.h * (0.3 + rnd(seed, i + 7) * 0.5);
    }
    const x0 = mx + (rnd(seed, i) - 0.5) * 8, y0 = my + (rnd(seed, i + 1) - 0.5) * 6;
    const d = `M${f1(x0)} ${f1(y0)} L${f1(tx)} ${f1(ty)}`;
    const glow = path(G, d, { class: 'tk-glow', 'stroke-dasharray': '0.22 2' });
    const core = path(G, d, { class: 'tk-core', 'stroke-dasharray': '0.22 2' });
    const delay = i * 34;
    for (const p of [glow, core]) { p.style.strokeDashoffset = '0.22'; jobs.push(anim(p, [{ strokeDashoffset: 0.22 }, { strokeDashoffset: -1 }], { duration: 240, delay, easing: 'cubic-bezier(.4,0,.9,.7)', fill: 'both' })); }
    if (i % 2 === 0) flashAt(x0, y0, g.th * 0.22, delay);
    flashAt(tx, ty, g.th * (miss || column ? 0.3 : 0.24), delay + 200);
    if ((miss || column) && i % 3 === 0) setTimeout(() => c.decal('scorch', { x: tx, y: ty + (column ? 0 : 0), r: g.tw * 0.32 }), delay + 200);
  }
  if (!miss && !column) setTimeout(() => c.decal('scorch', { x: to.foot.x + (rnd(seed, 2) - 0.5) * g.tw * 0.5, y: to.foot.y + g.th * 0.2, r: g.tw * 0.42 }), 260);
  if (!miss) setTimeout(() => c.shake(0.006, 220), 230);
  return done(jobs).then(() => G.remove());
}
defineSpecial({ card: 'claude-of-tanks', play: (c) => volley(c, 4) });
defineSpecial({ card: 'claude-of-tanks', move: 'column-fire', play: (c) => volley(c, 6, true) });

// ---------------------------------------------------------------- Jarhead: the blob hops across and bounces home
defineSpecial({
  card: 'jarhead',
  // the hop is the figure itself: it leaves its pad as the blob sets off and stands again as the blob lands home
  // (arena/board.js special), so one Jarhead is ever in frame
  carries: { back: 0.92, ms: 1000 },
  play(c) {
    const { layer, from, to, miss, anim, subject, g } = c;
    if (!subject) return null;
    const w = Math.max(40, from.w * 0.5), h = w;
    // one hop at a time: a repeat that comes before the last hop has landed takes its place
    for (const x of layer.querySelectorAll(':scope > .jh-blob, :scope > .jh-shade')) x.remove();
    const blob = el('img', 'jh-blob', layer);
    blob.alt = ''; blob.decoding = 'async'; blob.src = subject;
    const shade = el('i', 'jh-shade', layer);
    blob.style.width = `${w}px`; blob.style.height = `${h}px`;
    shade.style.width = `${w * 0.8}px`; shade.style.height = `${w * 0.3}px`;
    const at = (x, y, sx = 1, sy = 1) => `translate3d(${f1(x - w / 2)}px,${f1(y - h)}px,0) scale(${sx},${sy})`;
    const sh = (x, y, s = 1, o = 1) => ({ transform: `translate3d(${f1(x - w * 0.4)}px,${f1(y - w * 0.15)}px,0) scale(${s})`, opacity: o });
    // the floor line between the two feet, and the landing: on the target's head, or beside it on a miss
    const home = { x: from.foot.x, y: from.foot.y - from.h * 0.15 };
    const landFloor = miss ? { x: to.foot.x + (to.side === 'rival' ? 1 : -1) * g.tw * 0.9, y: to.foot.y + g.th * 0.9 } : { x: to.foot.x, y: to.foot.y };
    const land = miss ? landFloor : { x: to.foot.x, y: to.y + to.h * 0.25 };
    const mid = { x: (home.x + landFloor.x) / 2, y: (from.foot.y + landFloor.y) / 2 };
    const apex1 = { x: (home.x + mid.x) / 2, y: Math.min(home.y, mid.y) - g.th * 3.2 };
    const apex2 = { x: (mid.x + land.x) / 2, y: Math.min(mid.y, land.y) - g.th * 2.6 };
    const back = { x: (land.x + home.x) / 2, y: Math.min(land.y, home.y) - g.th * 4.2 };
    const ms = 1000;
    const a = anim(blob, [
      { transform: at(home.x, home.y, 1, 1), opacity: 1 },
      { transform: at(home.x, home.y, 1.2, 0.7), opacity: 1, offset: 0.06 },
      { transform: at(apex1.x, apex1.y, 0.9, 1.12), offset: 0.16 },
      { transform: at(mid.x, mid.y, 1.3, 0.66), offset: 0.26 },
      { transform: at(apex2.x, apex2.y, 0.92, 1.1), offset: 0.36 },
      { transform: at(land.x, land.y, 1.42, 0.58), offset: 0.46 },
      { transform: at(land.x, land.y, 0.9, 1.14), offset: 0.53 },
      { transform: at(back.x, back.y, 1, 1), offset: 0.74 },
      { transform: at(home.x, home.y, 1.16, 0.82), opacity: 1, offset: 0.92 },
      { transform: at(home.x, home.y, 1.16, 0.82), opacity: 0, offset: 0.921 },
      { transform: at(home.x, home.y, 1.16, 0.82), opacity: 0 },
    ], { duration: ms, easing: 'linear', fill: 'both' });
    const fy = (x) => from.foot.y + (landFloor.y - from.foot.y) * ((x - from.foot.x) / ((landFloor.x - from.foot.x) || 1));
    const b = anim(shade, [
      sh(home.x, from.foot.y, 0.8, 0),
      { ...sh(home.x, from.foot.y, 1, 0.9), offset: 0.06 },
      { ...sh(apex1.x, fy(apex1.x), 0.55, 0.5), offset: 0.16 },
      { ...sh(mid.x, fy(mid.x), 1.1, 0.9), offset: 0.26 },
      { ...sh(apex2.x, fy(apex2.x), 0.6, 0.5), offset: 0.36 },
      { ...sh(landFloor.x, landFloor.y, 1, 0.9), offset: 0.46 },
      { ...sh(landFloor.x, landFloor.y, 1, 0.9), offset: 0.53 },
      { ...sh((landFloor.x + home.x) / 2, (landFloor.y + from.foot.y) / 2, 0.45, 0.4), offset: 0.74 },
      { ...sh(home.x, from.foot.y, 1, 0.9), offset: 0.92 },
      sh(home.x, from.foot.y, 0.6, 0),
    ], { duration: ms, easing: 'linear', fill: 'both' });
    if (!miss) setTimeout(() => c.shake(0.007, 200), ms * 0.46);
    return done([a, b]).then(() => { blob.remove(); shade.remove(); });
  },
});

// ---------------------------------------------------------------- Katagami: a curve constructed across the board
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
  const d = `M${f1(p0.x)} ${f1(p0.y)} C${f1(p1.x)} ${f1(p1.y)} ${f1(p2.x)} ${f1(p2.y)} ${f1(p3.x)} ${f1(p3.y)}`;
  const jobs = [];
  for (const [a, b] of [[p0, p1], [p3, p2]]) {
    const h = path(G, `M${f1(a.x)} ${f1(a.y)} L${f1(b.x)} ${f1(b.y)}`, { class: 'kg-handle', 'stroke-dasharray': '1 1' });
    h.style.strokeDashoffset = '1';
    jobs.push(anim(h, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 180, delay: 80, easing: 'ease-out', fill: 'both' }));
  }
  const under = path(G, d, { class: 'kg-under', 'stroke-dasharray': '1 1' });
  const curve = path(G, d, { class: 'kg-curve', 'stroke-dasharray': '1 1' });
  const w0 = weight ? 1.5 : 4, w1 = weight ? (g.phone ? 9 : 14) : 4;
  for (const p of [under, curve]) {
    p.style.strokeDashoffset = '1';
    jobs.push(anim(p, [{ strokeDashoffset: 1, strokeWidth: p === under ? w0 + 6 : w0 }, { strokeDashoffset: 0, strokeWidth: p === under ? w1 + 6 : w1 }], { duration: 340, delay: 160, easing: 'cubic-bezier(.3,.6,.2,1)', fill: 'both' }));
  }
  [p0, p1, p2, p3].forEach((p, i) => {
    const r = document.createElementNS(NS, 'rect');
    const s = (i === 0 || i === 3 ? 10 : 8) * (g.phone ? 0.75 : 1);
    r.setAttribute('x', f1(p.x - s / 2)); r.setAttribute('y', f1(p.y - s / 2)); r.setAttribute('width', f1(s)); r.setAttribute('height', f1(s));
    r.setAttribute('class', i === 0 || i === 3 ? 'kg-anchor' : 'kg-ctl');
    r.style.transformBox = 'fill-box'; r.style.transformOrigin = '50% 50%';
    G.append(r);
    jobs.push(anim(r, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.7)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 200, delay: 30 + i * 60, easing: 'ease-out', fill: 'both' }));
  });
  if (!miss) setTimeout(() => c.shake(0.005, 200), 480);
  const all = done(jobs);
  return all.then(() => done([anim(G, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, delay: 420, fill: 'both' })])).then(() => G.remove());
}
defineSpecial({ card: 'katagami', play: (c) => construct(c, false) });
defineSpecial({ card: 'katagami', move: 'weight-axis', play: (c) => construct(c, true) });
