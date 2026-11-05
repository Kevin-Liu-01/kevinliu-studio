// Per-card board specials: what a card's attack does to the mat itself, right after its contact. The cutscene registry
// decides how the scene looks; this decides how the table answers it. The most specific definition wins (card and
// move, then card), as in the cutscene registry, so a card adds one file's worth of board and a move can refine it.
// Three cards prove the path: Claude of Tanks (a tracer volley that scorches the mat), Jarhead (the blob bounces off
// the card it hit and hops home) and Katagami (the construction of a curve drawn across the table, points and handles).
// Everything draws in the mat's own plane (it tilts with it), with transform, opacity and SVG stroke offsets only.
import { registry, el, path, rnd, NS } from '../shared/fx.js';

export const specials = registry();
const defineSpecial = specials.define;
function svgIn(layer, M) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('class', 'mat-svg');
  s.setAttribute('width', String(M.w)); s.setAttribute('height', String(M.h));
  s.setAttribute('viewBox', `0 0 ${M.w} ${M.h}`);
  layer.append(s);
  return s;
}
const cx = (r) => r.x + r.w / 2, cy = (r) => r.y + r.h / 2;

// ---------------------------------------------------------------- Claude of Tanks: tracers, and the mat remembers
function volley(c, perHit = 4) {
  const { from, to, hits, miss, M, seed, anim, layer } = c;
  const svg = svgIn(layer, M);
  const n = Math.min(14, perHit + Math.max(1, hits) * (perHit > 4 ? 3 : 1));
  const away = to.y < from.y ? -1 : 1;
  const jobs = [];
  for (let i = 0; i < n; i++) {
    const x0 = cx(from) + (rnd(seed, i) - 0.5) * from.w * 0.5, y0 = from.y + from.h * (away < 0 ? 0.15 : 0.85);
    const tx = miss ? cx(to) + (rnd(seed, i + 9) < 0.5 ? -1 : 1) * to.w * (0.7 + rnd(seed, i + 3) * 0.5) : cx(to) + (rnd(seed, i + 5) - 0.5) * to.w * 0.7;
    const ty = cy(to) + (rnd(seed, i + 7) - 0.5) * to.h * 0.6;
    const d = `M${x0.toFixed(1)} ${y0.toFixed(1)} L${tx.toFixed(1)} ${ty.toFixed(1)}`;
    const glow = path(svg, d, { stroke: '#ffb347', 'stroke-width': 11, 'stroke-linecap': 'round', fill: 'none', opacity: 0.38, 'stroke-dasharray': '0.26 2' });
    const core = path(svg, d, { stroke: '#fff6e0', 'stroke-width': 3.6, 'stroke-linecap': 'round', fill: 'none', 'stroke-dasharray': '0.26 2' });
    for (const p of [glow, core]) { p.style.strokeDashoffset = '0.26'; jobs.push(anim(p, [{ strokeDashoffset: 0.26 }, { strokeDashoffset: -1 }], { duration: 260, delay: i * 30, easing: 'cubic-bezier(.4,0,.9,.7)', fill: 'both' }).finished.catch(() => {})); }
  }
  Promise.all(jobs).then(() => svg.remove());
  if (!miss) c.decal('scorch', { x: cx(to) + (rnd(seed, 2) - 0.5) * to.w * 0.6, y: away < 0 ? to.y + to.h + 14 : to.y - 14, r: to.w * 0.34 });
  return jobs.length ? jobs[jobs.length - 1] : null;
}
defineSpecial({ card: 'claude-of-tanks', play: (c) => volley(c, 4) });
// Column Fire walks a column of rounds onto the target, one rank per landed hit
defineSpecial({ card: 'claude-of-tanks', move: 'column-fire', play: (c) => volley(c, 6) });

// ---------------------------------------------------------------- Jarhead: the blob bounces off and hops home
defineSpecial({
  card: 'jarhead',
  play(c) {
    const { from, to, miss, layer, anim, subject } = c;
    if (!subject) return null;
    const img = el('img', 'mat-blob', layer);
    img.alt = ''; img.decoding = 'async'; img.src = subject;
    const w = from.w * 0.58, h = w;
    img.style.width = `${w}px`; img.style.height = `${h}px`;
    const at = (x, y, sx = 1, sy = 1) => `translate3d(${(x - w / 2).toFixed(1)}px,${(y - h).toFixed(1)}px,0) scale(${sx},${sy})`;
    const land = { x: cx(to) + (miss ? to.w * 0.75 : 0), y: to.y + to.h * 0.42 };
    const home = { x: cx(from), y: from.y + from.h * 0.5 };
    const mid = { x: (land.x + home.x) / 2, y: (land.y + home.y) / 2 };
    const apex = (a, b, k) => ({ x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - k });
    const A = apex(land, mid, from.h * 0.35), B = apex(mid, home, from.h * 0.28);
    return anim(img, [
      { transform: at(land.x, land.y - h * 0.4, 0.4, 0.4), opacity: 0 },
      { transform: at(land.x, land.y, 1.32, 0.66), opacity: 1, offset: 0.12 },
      { transform: at(land.x, land.y, 0.9, 1.12), opacity: 1, offset: 0.2 },
      { transform: at(A.x, A.y, 1, 1), opacity: 1, offset: 0.38 },
      { transform: at(mid.x, mid.y, 1.22, 0.78), opacity: 1, offset: 0.54 },
      { transform: at(B.x, B.y, 0.95, 1.06), opacity: 1, offset: 0.74 },
      { transform: at(home.x, home.y, 1.1, 0.86), opacity: 1, offset: 0.9 },
      { transform: at(home.x, home.y, 0.3, 0.3), opacity: 0 },
    ], { duration: 820, easing: 'linear' }).finished.catch(() => {}).then(() => img.remove());
  },
});

// ---------------------------------------------------------------- Katagami: a curve constructed across the table
function construct(c, weight = false) {
  const { from, to, miss, M, layer, anim, seed } = c;
  const svg = svgIn(layer, M);
  const p0 = { x: cx(from), y: from.y + from.h * (to.y < from.y ? 0.1 : 0.9) };
  const p3 = { x: cx(to) + (miss ? to.w * 0.8 : 0), y: cy(to) };
  const dx = p3.x - p0.x, dy = p3.y - p0.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const bend = len * (0.32 + rnd(seed, 1) * 0.2) * (rnd(seed, 2) < 0.5 ? -1 : 1);
  const p1 = { x: p0.x + dx * 0.3 + nx * bend, y: p0.y + dy * 0.3 + ny * bend };
  const p2 = { x: p0.x + dx * 0.72 - nx * bend * 0.6, y: p0.y + dy * 0.72 - ny * bend * 0.6 };
  const d = `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C${p1.x.toFixed(1)} ${p1.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`;
  const jobs = [];
  for (const [a, b] of [[p0, p1], [p3, p2]]) {
    const h = path(svg, `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`, { stroke: '#6c94ff', 'stroke-width': 1.5, fill: 'none', 'stroke-dasharray': '1 1' });
    h.style.strokeDashoffset = '1';
    jobs.push(anim(h, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 160, delay: 60, easing: 'ease-out', fill: 'both' }));
  }
  const curve = path(svg, d, { stroke: '#ff5246', 'stroke-width': weight ? 9 : 3, 'stroke-linecap': 'round', fill: 'none', 'stroke-dasharray': '1 1' });
  curve.style.strokeDashoffset = '1';
  jobs.push(anim(curve, [{ strokeDashoffset: 1, strokeWidth: weight ? 1 : 3 }, { strokeDashoffset: 0, strokeWidth: weight ? 9 : 3 }], { duration: 300, delay: 120, easing: 'cubic-bezier(.3,.6,.2,1)', fill: 'both' }));
  [p0, p1, p2, p3].forEach((p, i) => {
    const r = document.createElementNS(NS, 'rect');
    const s = i === 0 || i === 3 ? 9 : 7;
    r.setAttribute('x', String(p.x - s / 2)); r.setAttribute('y', String(p.y - s / 2)); r.setAttribute('width', String(s)); r.setAttribute('height', String(s));
    r.setAttribute('fill', i === 0 || i === 3 ? '#ebece9' : '#6c94ff'); r.setAttribute('stroke', '#111'); r.setAttribute('stroke-width', '1');
    r.style.transformBox = 'fill-box'; r.style.transformOrigin = '50% 50%';
    svg.append(r);
    jobs.push(anim(r, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.6)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 200, delay: 40 + i * 70, easing: 'ease-out', fill: 'both' }));
  });
  const all = Promise.all(jobs.map((a) => a.finished.catch(() => {})));
  all.then(() => anim(svg, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 380, fill: 'both' }).finished.catch(() => {})).then(() => svg.remove());
  return all;
}
defineSpecial({ card: 'katagami', play: (c) => construct(c, false) });
// Weight Axis draws the same curve from Thin to the weight it hit with
defineSpecial({ card: 'katagami', move: 'weight-axis', play: (c) => construct(c, true) });
