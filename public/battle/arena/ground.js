// The painted floor of an Arena map (MODES.md section 4): the map's own camera, calibrated in r4/stage/ground and cut
// into media/ground/<map>.json by .work/stage/build.mjs, so the duel stands on the painting in its own perspective.
// Floor metres: X across (right), Y up, Z away from the camera, origin on the floor under the camera. Plain matrix
// work, no DOM (the probes import it too). The fit and the projections follow r4/stage/ground/ground.js.
export const MAP = [1619, 971];
/** What stands on the floor, in metres (stage/ground/tool/calibrate.py): a figure's box for the duel's search (each
 *  figure covers `area` square metres, at most `wide` across and `tall` high), a leader, a pad. */
export const FIG = { w: 1.6, h: 1.5, area: 2.4, wide: 2, tall: 1.6 }, LEADER = { h: 1.7, w: 0.8, foot: 0.3 }, PAD = 0.9;

const base = new URL('../media/ground/', import.meta.url);
const cache = new Map(), now = new Map();
/** The map's floor (one fetch a visit); `groundNow` hands it back once it has loaded. */
export function loadGround(map) {
  if (!cache.has(map)) cache.set(map, fetch(new URL(`${map}.json`, base)).then((r) => r.json()).then((g) => { now.set(map, g); return g; }));
  return cache.get(map);
}
export const groundNow = (map) => now.get(map) ?? null;

/** The map cover-fitted with its row `hz` at `at` of the frame's height (28% on a wide screen; a phone picks its own,
 *  see `stage`) and 10% to spare on every side, or at scale `s` when given (a phone that shows more of the painting);
 *  whole-px size, a translate to 0.1 px. Native px to board px, and the <img>'s own numbers. */
export function fit(hz, W, H, at = 0.28, s = 0) {
  const bw = W * 1.2, bh = H * 1.2, bx = -W * 0.1, by = -H * 0.1;
  const hy = at * H - by;
  s ||= Math.max(bw / MAP[0], bh / MAP[1], (bh - hy) / (MAP[1] * (1 - hz)), hy / (MAP[1] * hz));
  const mw = Math.round(MAP[0] * s), mh = Math.round(MAP[1] * s);
  const mx = Number((bx + (bw - MAP[0] * s) / 2).toFixed(1)), my = Number((by + hy - MAP[1] * hz * s).toFixed(1));
  return { A: [[mw / MAP[0], 0, mx], [0, mh / MAP[1], my], [0, 0, 1]], w: mw, h: mh, x: mx, y: my, s };
}
const mul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
/** The 3x4 projection from floor metres to board px for this frame (the camera at rest). */
export const viewOf = (g, A) => mul(A, g.camera.P);

function apply(P, X, Y, Z) {
  const w = P[2][0] * X + P[2][1] * Y + P[2][2] * Z + P[2][3];
  return { x: (P[0][0] * X + P[0][1] * Y + P[0][2] * Z + P[0][3]) / w, y: (P[1][0] * X + P[1][1] * Y + P[1][2] * Z + P[1][3]) / w };
}
export const project = (P, X, Z) => apply(P, X, 0, Z);
export const upright = (P, X, Z, m) => apply(P, X, m, Z);
/** Screen px of one metre standing at (X, Z): the scale of anything upright there. */
export const ppm = (P, X, Z) => { const a = project(P, X, Z), b = upright(P, X, Z, 1); return Math.hypot(b.x - a.x, b.y - a.y); };
/** The floor's homography (X, Z, 1) to board px. */
export const floorH = (P) => P.map((r) => [r[0], r[2], r[3]]);
export function unproject(P, x, y) {
  const [[a, b, c], [d, e, f], [g, h, i]] = floorH(P);
  const X = (e * i - f * h) * x - (b * i - c * h) * y + (b * f - c * e);
  const Z = -(d * i - f * g) * x + (a * i - c * g) * y - (a * f - c * d);
  const w = (d * h - e * g) * x - (a * h - b * g) * y + (a * e - b * d);
  return { X: X / w, Z: Z / w };
}
/** A floor circle as a polygon of board px. */
export function circle(P, X, Z, r, n = 24) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const p = project(P, X + r * Math.cos(a), Z + r * Math.sin(a)); out.push([p.x, p.y]); }
  return out;
}
export function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi) c = !c;
  }
  return c;
}
/** CSS for a 3x3 homography from an element's own px (transform-origin 0 0) to its parent's px. */
export function matrix3d(M) {
  const k = 1 / M[2][2], f = (v) => +(v * k).toPrecision(9);
  return `matrix3d(${f(M[0][0])},${f(M[1][0])},0,${f(M[2][0])},${f(M[0][1])},${f(M[1][1])},0,${f(M[2][1])},0,0,1,0,${f(M[0][2])},${f(M[1][2])},0,1)`;
}
export const mul3 = mul;

// ---------------------------------------------------------------- the duel on the floor
// As a classic battle camera frames it: your figure near the camera at lower left, seen from behind, your leader
// beside it on the outer side; the rival's figure clearly farther back at upper right, seen from the front, its leader
// beside it on the outer side or a step behind it. The search is over the floor's rows at a few column shares of the
// frame for each side on its own, then over the pairs, and the calibration's own stands compete. Hard rules (a pair
// that breaks one only wins where nothing else passes): every pad (a 0.9 m circle) and leader foot on the walkable
// floor; every figure, leader and pad inside the frame above the console; the far side at most `max` of the near
// side's scale, so near and far read; the pads at least two pad radii apart and each leader's foot outside its own
// pad; the two sides' figures clear of each other, whichever of the battle's cards stands (`envelope`); each leader
// clear of the other side's figure and of the other leader, and over its own figure at most a fifth of it; on a phone
// the near figure at least 120 px tall. Of the pairs that pass, the one closest to the class's composition: the far
// side at `ratio` of the near side's scale, your leader `lead` of the frame's height and never much taller.
/** A figure's metres per picture px: its opaque box covers FIG.area square metres (a tall one at most FIG.tall high,
 *  a wide one at most FIG.wide across), the larger of its two views deciding, so a card is one size on either side. */
export function figureMpp(m) {
  const bw = Math.max(m.front.box[2] - m.front.box[0], m.rear.box[2] - m.rear.box[0]), bh = Math.max(m.front.box[3] - m.front.box[1], m.rear.box[3] - m.rear.box[1]);
  return Math.min(Math.sqrt(FIG.area / (bw * bh)), FIG.wide / bw, FIG.tall / bh);
}
/** What a side's figures take round their foot, in metres: each of the team's pictures in that side's view (left,
 *  right, up, and down below the foot, negative for a floating subject), their union, and the smallest opaque height. */
export function envelope(figures, ids, view) {
  const boxes = [];
  let minH = 9, h0 = 0;
  for (const id of ids) {
    const m = figures[id];
    if (!m) continue;
    const v = m[view], mpp = figureMpp(m), h = (v.box[3] - v.box[1]) * mpp;
    boxes.push({ l: v.foot[0] * mpp, r: (v.w - v.foot[0]) * mpp, t: v.foot[1] * mpp, b: (v.h - v.foot[1]) * mpp });
    minH = Math.min(minH, h);
    h0 ||= h;
  }
  if (!boxes.length) return null;
  const u = (k) => Math.max(...boxes.map((b) => b[k]));
  // h0: the opaque height of the side's first card, the one that stands first (the duel's opening pair)
  return { boxes, l: u('l'), r: u('r'), t: u('t'), b: u('b'), minH, h0 };
}
/** What a leader takes round its foot in every pose of its side (a leader stands 1.7 m, 100 atlas px), in metres:
 *  left, right and up, from the roster's opaque boxes and foot anchors. */
export function leaderReach(t, poses) {
  const m = LEADER.h / 100, e = { l: 0, r: 0, t: 0 };
  for (const p of poses) { const c = t.cells[p], a = t.anchors[p]; e.l = Math.max(e.l, (a[0] - c[0]) * m); e.r = Math.max(e.r, (c[0] + c[2] - a[0]) * m); e.t = Math.max(e.t, (a[1] - c[1]) * m); }
  return e;
}
/** A leader for the duel's search: its body at rest, its reach over every pose of its side (what must stay in
 *  frame), and each pose on its own (`held`, what it covers of its own figure as it commands). */
export function leaderEnv(t, rest, poses, held = poses) {
  return { rest: leaderReach(t, [rest]), reach: leaderReach(t, poses), poses: held.map((p) => leaderReach(t, [p])) };
}
/** Without the battle's cards: the largest box a figure may take. */
const ENV = { l: FIG.wide / 2, r: FIG.wide / 2, t: FIG.tall, b: 0.2, minH: 1.2 };
ENV.boxes = [ENV];
/** Column shares of the frame every 2% from `a` to `b`. */
const cols = (a, b) => Array.from({ length: Math.round((b - a) / 0.02) + 1 }, (_, i) => +(a + i * 0.02).toFixed(2));
export const CLASS = {
  // leaders: [metres out (across, away from the duel), metres back (farther from the camera)], best first
  // own: the most of its own figure a leader may cover in any pose; hide: the most of the far figure the near one may
  // cover; tall: the rival's first card's height over yours, at most
  desktop: { lead: 1 / 3, ratio: 0.62, max: 0.78, own: 0.3, hide: 0.05, hideAny: 0.05, behind: 0, tall: Infinity, xs: [[0.33], [0.67]], near: [[1.4, -0.3], [1.1, -0.3], [0.9, 0]], far: [[1.4, 0.3], [1.1, 0.3], [0.9, 0]], minH: 0 },
  phone: { lead: 0.2, ratio: 0.62, max: 0.78, own: 0.17, hide: 0, hideAny: 0.15, behind: 0.3, tall: 0.82, xs: [cols(0.3, 0.66), cols(0.5, 0.94)], near: [[1.2, 0.6], [1.3, 0.6], [1.1, 0.6], [1.4, 0.6], [1.2, 0.9], [1.0, 0.9], [1.2, 0.3], [1.3, 0.3], [1.4, -0.3], [1.2, -0.3], [1.1, 0], [0.9, 0.3]], far: [[1.0, 0.3], [0.9, 0], [0.5, 1.0], [0, 1.3], [-0.6, 1.0], [-0.9, 0.9], [-1.1, 0.6], [0.7, 1.2]], minH: 120.5 },
};
const lap = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
const area = (a) => (a.x1 - a.x0) * (a.y1 - a.y0);
/** The time a solve may run before it yields (ms), when solved a step a task (`stageAsync`); `slice` restarts it. */
const SLICE = 4;
let sliceAt = Infinity;
const clock = () => (globalThis.performance ? performance.now() : Date.now());
const sliced = () => clock() - sliceAt > SLICE;
export function duel(g, P, fr, step = 4) {
  const it = duelSteps(g, P, fr, step);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}
/** The duel's search, yielding whenever it has run a slice (inside `stageAsync`; never in a plain `duel` or `stage`). */
function* duelSteps(g, P, fr, step = 4) {
  const T = CLASS[fr.phone ? 'phone' : 'desktop'];
  const env = { near: fr.env?.near ?? ENV, far: fr.env?.far ?? ENV };
  const walk = g.walkable, hy = P[1][2] / P[2][2];
  const onFloor = (X, Z, r, n = 12) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; if (!inside(walk, X + r * Math.cos(a), Z + r * Math.sin(a))) return false; } return true; };
  const figBox = (f, k, e) => ({ x0: f.x - e.l * k, x1: f.x + e.r * k, y0: f.y - e.t * k, y1: f.y + Math.max(0, e.b) * k });
  // a leader's body at rest (what it covers) and its reach in every pose of its side (what must stay in frame)
  const L0 = { l: LEADER.w / 2, r: LEADER.w / 2, t: LEADER.h }, lead = { near: fr.env?.lead?.near ?? { rest: L0, reach: L0 }, far: fr.env?.lead?.far ?? { rest: L0, reach: L0 } };
  const leadBox = (X, Z, near) => {
    const f = project(P, X, Z), k = ppm(P, X, Z), e = lead[near ? 'near' : 'far'], b = (q) => ({ x0: f.x - q.l * k, x1: f.x + q.r * k, y0: f.y - q.t * k, y1: f.y });
    return { ...b(e.rest), k, reach: b(e.reach), poses: (e.poses ?? [e.rest]).map(b) };
  };
  const minK = fr.phone ? T.minH / Math.max(1.1, env.near.minH) : 0;
  /** One stand at floor (X, Z): its figure's boxes and what fails of it alone (the pad is tested once it matters). */
  const stand = (X, Z, near) => {
    const f = project(P, X, Z), k = ppm(P, X, Z), e = near ? env.near : env.far, fb = figBox(f, k, e);
    const why = [];
    if (fb.x0 < 4 || fb.x1 > fr.W - 4 || fb.y1 > fr.bottom - 4) why.push('figure out of frame');
    if (near && k < minK) why.push('near figure too small');
    return { X, Z, k, near, fb, fbs: e.boxes.map((b) => figBox(f, k, b)), why, pad: null };
  };
  const padWhy = (s) => {
    if (s.pad) return s.pad;
    const c = circle(P, s.X, s.Z, PAD, 12);
    return (s.pad = c.some(([px, py]) => py > fr.bottom - 4 || px < 0 || px > fr.W) ? 'pad out of frame' : !onFloor(s.X, s.Z, PAD) ? 'pad off the floor' : 'ok');
  };
  /** One side: a stand with its leader at L: what fails, what is soft, its scale. */
  const side = (st, L) => {
    const lb = leadBox(L.X, L.Z, st.near), why = st.why.length ? [...st.why] : [];
    let soft = 0;
    if (lb.reach.x0 < 2 || lb.reach.x1 > fr.W - 2 || lb.y1 > fr.bottom - 4) why.push('leader out of frame');
    if (st.fb.y0 < fr.top + 4) soft++;
    if (lb.y0 < fr.top + 4) soft++;
    // a leader beside its figure covers little of it (at rest at most 0.3 of any of the side's cards); one a step
    // behind it shows at least half of itself; and your leader, in every pose of its side, covers at most `own` of
    // your first card, the one that stands first, wherever it stands
    if (L.Z > st.Z + 0.5) {
      if (st.fbs.some((b) => lap(lb, b) > 0.5 * area(lb))) why.push('leader hidden by its figure');
    } else {
      let own = 0;
      for (const b of st.fbs) own = Math.max(own, lap(lb, b) / area(b));
      if (own > 0.3) why.push('leader over its figure'); else soft += 4 * own;
    }
    if (st.near) {
      let first = 0;
      for (const p of lb.poses) first = Math.max(first, lap(p, st.fbs[0]) / area(st.fbs[0]));
      if (first > T.own) why.push('leader over your figure'); else soft += 2 * first;
    }
    if (!why.length) {
      const p = padWhy(st);
      if (p !== 'ok') why.push(p);
      else if (!onFloor(L.X, L.Z, LEADER.foot, 8)) why.push('leader off the floor');
    }
    return { X: st.X, Z: st.Z, L, st, hard: why.length, soft, k: st.k, fb: st.fb, fbs: st.fbs, lb, lk: lb.k, why };
  };
  // a coarse pass (`fr.coarse`) takes every other column and the first four leader spots; a fine one may keep to a
  // window round a coarse pass's best (`fr.win`, board px per side)
  const sides = function* (xs, offs, near) {
    const out = [], w = fr.win?.[near ? 'near' : 'far'];
    if (fr.coarse) { xs = xs.filter((_, i) => i % 2 === 0); offs = offs.slice(0, 4); }
    for (const xa of xs) {
      if (sliced()) yield;
      for (let y = Math.ceil(hy + 6); y < fr.bottom; y += step) {
        if (w && (fr.W * xa < w.x0 || fr.W * xa > w.x1 || y < w.y0 || y > w.y1)) continue;
        const { X, Z } = unproject(P, fr.W * xa, y);
        if (!(Z > 0)) continue;
        const st = stand(X, Z, near);
        // a stand that fails alone keeps one leader, for the few that fail least
        for (const [o, b] of st.why.length ? offs.slice(0, 1) : offs) out.push(side(st, { X: near ? X - o : X + o, Z: Z + b }));
      }
    }
    return out;
  };
  // the cost of a pair: its composition, then its hard failures; `bound` is what a pair must beat (the best so far,
  // from an earlier painting size too), so the dearer tests run only for a pair that could win
  let best = null, bound = fr.bound ?? Infinity;
  // your side keeps off the frame's kept rectangles (`fr.keep`: your plate on a wide screen): the card that stands
  // first wholly, your leader at rest beyond a 6% graze (its box is its pose's whole cell, margins and all, so a
  // stricter rule shrank the 1440 duel by a tenth for no visible overlap)
  const keep = fr.keep ?? [];
  const kept = (n) => { let h = 0; for (const k of keep) h += lapB(n.fbs[0], k) / area(n.fbs[0]) + Math.max(0, lapB(n.lb, k) / area(n.lb) - 0.06); return h; };
  const own = (n) => { const big = Math.log((n.lk * LEADER.h) / (T.lead * fr.H)); return (big > 0 ? 2 : 1) * Math.abs(big) + 0.6 * n.soft + 30 * kept(n); };
  // (no allocation per pair: the failures are counted as bits and named only for a pair that wins)
  const WHY = ['far not far enough', 'pads too close', 'figures overlap', 'rival too tall', 'a leader over the other side', 'rival leader behind your figure'];
  const lapB = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const consider = (n, r, pen, cols) => {
    if (r.Z <= n.Z + 0.25) return;
    const ratio = r.k / n.k;
    let bits = ratio > T.max ? 1 : 0;
    let cost = 2 * Math.abs(Math.log(ratio / T.ratio)) + n.own + 0.6 * r.soft + pen + 50 * (n.hard + r.hard + bits);
    if (cost >= bound) return;
    if (Math.hypot(r.X - n.X, r.Z - n.Z) < 2 * PAD) { bits |= 2; cost += 50; if (cost >= bound) return; }
    // the opening pair reads near and far by height too: the rival's first card stands at most `tall` of yours
    if (env.near.h0 && env.far.h0 && (r.k * env.far.h0) / (n.k * env.near.h0) > T.tall) { bits |= 8; cost += 50; if (cost >= bound) return; }
    // the near figure may hide a sliver of the far one (a twentieth of it at most, the opening pair at most `hide`)
    let hide = 0;
    for (const a of n.fbs) for (const b of r.fbs) { const h = lapB(a, b) / area(b); if (h > hide) hide = h; }
    const hide0 = lapB(n.fbs[0], r.fbs[0]) / area(r.fbs[0]);
    if (hide > T.hideAny || hide0 > T.hide) { bits |= 4; cost += 50; }
    cost += 20 * hide;
    if (cost >= bound) return;
    // your leader never over the rival's figures, nor the two leaders over each other; the rival's leader, standing
    // farther back, may lose a corner behind your figure (at most `behind` of itself, on a phone)
    let back = 0, over = lapB(n.lb, r.lb) > 0;
    for (const b of n.fbs) { const h = lapB(r.lb, b) / area(r.lb); if (h > back) back = h; }
    for (const b of r.fbs) if (!over && lapB(n.lb, b) > 0) over = true;
    if (over) { bits |= 16; cost += 50; }
    if (back > T.behind) { bits |= 32; cost += 50; }
    cost += 10 * back;
    if (cost >= bound) return;
    bound = cost;
    best = { cost, near: { X: n.X, Z: n.Z }, far: { X: r.X, Z: r.Z }, yl: n.L, rl: r.L, ratio, cols, soft: n.soft + r.soft, hide: +hide.toFixed(3), hide0: +hide0.toFixed(3), problems: [...n.why, ...r.why, ...WHY.filter((_, i) => bits & (1 << i))] };
  };
  const N = yield* sides(T.xs[0], T.near, true), F = yield* sides(T.xs[1], T.far, false);
  if (globalThis.__duelDebug) globalThis.__duelDebug(N, F);
  for (const n of N) n.own = own(n);
  // the pairs: sides that pass alone, or where none does, the few that fail least
  // (the floor is never given up: a side whose pad or leader would leave the walkable floor never pairs)
  const floored = (x) => padWhy(x.st) === 'ok' && onFloor(x.L.X, x.L.Z, LEADER.foot, 8);
  const pick = (L) => { const ok = L.filter((x) => !x.hard); return ok.length ? ok : L.filter((x) => x.hard === 1 && floored(x)).sort((a, b) => a.soft - b.soft).slice(0, 60); };
  const nn = pick(N).sort((a, b) => a.own - b.own), ff = pick(F).sort((a, b) => a.k - b.k);
  const ks = ff.map((r) => r.k);
  const from = (k) => { let lo = 0, hi = ks.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ks[m] < k) lo = m + 1; else hi = m; } return lo; };
  for (const n of nn) {
    if (sliced()) yield;
    // a pair beats the bound only with its far side's scale near the composition's, so the far sides go from the
    // composition's scale outward and each way stops where the scale alone costs the bound
    if (n.own >= bound) break;
    // (and, unless nothing within it passes (`fr.wide`), within the depth the composition allows: 0.3 to `max`)
    const kLo = n.k * (fr.wide ? 0 : 0.3), kHi = n.k * (fr.wide ? Infinity : T.max), mid = from(n.k * T.ratio);
    const dear = (r) => 2 * Math.abs(Math.log(r.k / n.k / T.ratio)) + n.own >= bound;
    for (let i = mid, j = mid - 1; i < ff.length || j >= 0;) {
      if (i < ff.length && (ff[i].k > kHi || dear(ff[i]))) i = ff.length;
      if (j >= 0 && (ff[j].k < kLo || dear(ff[j]))) j = -1;
      if (i < ff.length) consider(n, ff[i++], 0, 'search');
      if (j >= 0) consider(n, ff[j--], 0, 'search');
    }
  }
  const d = g.duel?.[fr.phone ? 'phone' : 'desktop'], xz = (p) => ({ X: p[0], Z: p[1] });
  if (d) { const n = side(stand(d.near[0], d.near[1], true), xz(d.your_leader)); n.own = own(n); consider(n, side(stand(d.far[0], d.far[1], false), xz(d.rival_leader)), 0.5, 'calibration'); }
  return best;
}

/** The set for this frame: the map's fit and the duel on its floor. A wide screen keeps the painting's row at 28% of
 *  the frame, cover-fitted. A phone's narrow frame shows too little floor across for a duel with depth, so it may show
 *  more of the painting: a smaller painting that still covers the frame's band (`fr.band`, from under the top rail to
 *  under the console's top), its row at 22 to 38% of the frame, the share and size whose duel fails least and comes
 *  closest to the composition, and of those the largest painting. */
export function stage(g, fr) {
  const it = staging(g, fr);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}
/** The same search a step at a time, yielding to `pause()` between steps, so a page can solve it before its first frame
 *  without a long task (the Arena's prepare). */
export async function stageAsync(g, fr, pause) {
  const it = staging(g, fr);
  sliceAt = clock();
  let r = it.next();
  while (!r.done) { await pause(); sliceAt = clock(); r = it.next(); }
  sliceAt = Infinity;
  return r.value;
}
function* staging(g, fr) {
  let best = null;
  const ats = fr.phone ? [0.24, 0.3, 0.36] : [0.28];
  const sizes = fr.phone ? [1, 0.88, 0.78, 0.7, 0.63, 0.57, 0.52, 0.47] : [1];
  const tried = [];
  // a smaller painting costs a little, so of two duels as good the larger painting wins
  const run = function* (at, m, step, o = {}) {
    const cover = fit(g.hz, fr.W, fr.H, at), map = m === 1 ? cover : fit(g.hz, fr.W, fr.H, at, cover.s * m);
    if (m !== 1 && !covers(map, fr)) return;
    const bound = o.bound ?? (best ? best.d.cost : Infinity);
    const pen = 0.4 * Math.log(1 / m), P = viewOf(g, map.A), d = yield* duelSteps(g, P, { ...fr, ...o, bound: bound - pen - 1e-9 }, step);
    if (!d) return;
    d.cost += pen;
    tried.push({ at, m, cost: d.cost, n: project(P, d.near.X, d.near.Z), f: project(P, d.far.X, d.far.Z) });
    if (!best || d.cost < best.d.cost - 1e-9) best = { at, map, P, d, scale: m };
  };
  if (ats.length * sizes.length === 1) { yield* run(ats[0], sizes[0], 4); if (!best) yield* run(ats[0], sizes[0], 4, { wide: true }); return best; }
  // coarse rows and columns over every share and size, each a step of its own; then, for the four the coarse pass did
  // best in, the fine rows and columns round its best pair (a coarse pair that fails may pass a row away)
  for (const at of ats) for (const m of sizes) { yield* run(at, m, 8, { coarse: true, bound: Infinity }); yield; }
  if (!tried.length) for (const at of ats) for (const m of sizes) { yield* run(at, m, 8, { coarse: true, wide: true, bound: Infinity }); yield; }
  const top = tried.sort((a, b) => a.cost - b.cost).slice(0, 4);
  const win = (p) => ({ x0: p.x - 0.07 * fr.W, x1: p.x + 0.07 * fr.W, y0: p.y - 28, y1: p.y + 28 });
  best = null;
  for (const t of top) { yield* run(t.at, t.m, 4, { win: { near: win(t.n), far: win(t.f) } }); yield; }
  if (!best) yield* run(top[0].at, top[0].m, 4, { wide: true });
  return best;
}
/** Does the painting cover the frame's band with room for a shake (and the frame's width)? */
export function covers(map, fr) {
  const e = Math.round(fr.W * 0.012) + 2, b = fr.band ?? { top: 0, bottom: fr.H };
  return map.x <= -e && map.x + map.w >= fr.W + e && map.y <= b.top - e && map.y + map.h >= b.bottom + e;
}

// ---------------------------------------------------------------- the painting's light, for the figures and leaders
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const norm = (c) => { const m = Math.max(...c, 1e-6); return c.map((v) => v / m); };
/** How a figure or a leader standing at `where` (near or far) takes the map's light: a colour matrix (the key and the
 *  ambient's tint, the floor's exposure, the far side's haze), the key's direction on screen (toward the light), how
 *  much of it falls from behind, and its colour for the rim. */
export function grade(g, where, phone) {
  const L = g.light, cls = phone ? 'phone' : 'desktop';
  const key = hex(L.key.colour), amb = hex(L.ambient.colour);
  const tint = norm(key.map((v, i) => v * 0.6 + amb[i] * 0.4));
  const floor = hex(L.at[cls][where]);
  const [dx, dz] = L.key.floor_dir, e = (L.key.elevation * Math.PI) / 180;
  const back = Math.max(0, -dz) * Math.cos(e);
  const E = Math.min(1.02, Math.max(0.88, 0.8 + 0.45 * lum(floor))) * (1 - 0.05 * back);
  const gain = tint.map((t) => E * (1 - 0.3 * (1 - t)));
  const h = where === 'far' ? Math.min(0.2, Math.max(0.07, 0.42 * (L.haze.at[cls].far ?? 0))) : 0;
  const hz = hex(L.haze.colour);
  const matrix = [0, 1, 2].map((i) => [0, 1, 2, 3].map((j) => (j === i ? gain[i] * (1 - h) : 0)).concat(h * hz[i])).flat().concat([0, 0, 0, 1, 0]);
  // toward the light on screen: across from the key's floor direction, up from its elevation
  const sx = -dx * Math.cos(e), sy = -Math.sin(e), sl = Math.hypot(sx, sy) || 1;
  return { matrix: matrix.map((v) => +v.toFixed(4)), toward: [sx / sl, sy / sl], back, key: L.key.colour, strength: L.key.strength };
}
/** Where a point standing m metres up at (X, Z) casts its shadow on the floor, along the key (elevation held at 40
 *  degrees or more so a low lamp still throws a short, readable shadow). */
export function castAt(g, X, Z, m) {
  const [dx, dz] = g.light.key.floor_dir, e = Math.max(40, g.light.key.elevation) * (Math.PI / 180), c = m / Math.tan(e);
  return { X: X + dx * c, Z: Z + dz * c };
}
