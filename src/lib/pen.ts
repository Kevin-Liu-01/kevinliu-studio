// The pen line of the kl signature, in the order Kevin writes it. The mark (public/favicon.svg, KL_PATH) is one filled
// outline whose points run from the foot of the k up its ascender, down into the k's loop and leg, up the l's loop and
// out to the end of its tail, then back along the other edge. Walking that first edge and casting a ray across the
// stroke at each step gives the stroke's middle and width there. Revealing the filled mark along this line, through a
// mask of round strokes, draws the real letterforms stroke by stroke. Used by src/components/Signature.astro.

type Pt = [number, number];
export type Pen = { x: number; y: number; w: number }[];
export type Run = { d: string; w: number; len: number };

// nonzero winding of point p in polygon P
function inside(P: Pt[], [x, y]: Pt) {
  let w = 0;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [ax, ay] = P[j], [bx, by] = P[i];
    const c = (bx - ax) * (y - ay) - (x - ax) * (by - ay);
    if (ay <= y) { if (by > y && c > 0) w++; } else if (by <= y && c < 0) w--;
  }
  return w !== 0;
}

// distance along the ray o + t d to the nearest edge of P past a small start gap
function cast(P: Pt[], o: Pt, d: Pt) {
  let best = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const ex = P[i][0] - P[j][0], ey = P[i][1] - P[j][1];
    const den = d[0] * ey - d[1] * ex;
    if (Math.abs(den) < 1e-9) continue;
    const qx = P[j][0] - o[0], qy = P[j][1] - o[1];
    const t = (qx * ey - qy * ex) / den, u = (qx * d[1] - qy * d[0]) / den;
    if (t > 0.3 && u >= 0 && u <= 1 && t < best) best = t;
  }
  return best;
}

// the pen line of an outline path written only with M, L and Z, resampled every 1.5 units
export function penLine(path: string): Pen {
  const n = path.match(/-?\d*\.?\d+/g)!.map(Number), P: Pt[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) P.push([n[i], n[i + 1]]);
  let k = 0; // the end of the l's tail is the outline's rightmost point, where its two edges meet
  P.forEach((p, i) => { if (p[0] > P[k][0]) k = i; });
  const raw: { o: Pt; n: Pt; h: number }[] = [];
  for (let i = 1; i <= k; i++) {
    const [ax, ay] = P[i - 1], [bx, by] = P[i], L = Math.hypot(bx - ax, by - ay);
    if (!L) continue;
    const tx = (bx - ax) / L, ty = (by - ay) / L;
    for (let s = 0; s < L; s += 1.5) {
      const o: Pt = [ax + tx * s, ay + ty * s];
      let nv: Pt = [-ty, tx];
      if (!inside(P, [o[0] + nv[0] * 0.6, o[1] + nv[1] * 0.6])) nv = [ty, -tx];
      raw.push({ o, n: nv, h: Math.min(cast(P, o, nv), 6) });
    }
  }
  // a ray that crosses another stroke (the k's junction) reads a false width: take the median of seven neighbours
  return raw.map(({ o, n: nv }, i) => {
    const h = raw.slice(Math.max(0, i - 3), i + 4).map((r) => r.h).sort((a, b) => a - b);
    const w = h[h.length >> 1];
    return { x: o[0] + (nv[0] * w) / 2, y: o[1] + (nv[1] * w) / 2, w };
  });
}

// the pen line from fraction a to b as mask strokes: one path per run of equal width, with its length. A run shorter
// than MIN units takes in the next step at the wider of the two widths: WebKit leaves a round-cap dot on a very short
// dashed run, and fewer runs mean fewer mask paths.
const MIN = 4;
export function penRuns(line: Pen, a = 0, b = 1): Run[] {
  const i0 = Math.round(a * (line.length - 1)), i1 = Math.round(b * (line.length - 1)), runs: Run[] = [];
  let run: Run | null = null;
  for (let i = i0 + 1; i <= i1; i++) {
    const p = line[i - 1], q = line[i], w = Math.round((Math.max(p.w, q.w) + 0.8) * 2) / 2;
    if (run && run.w !== w && run.len < MIN) run.w = Math.max(run.w, w);
    else if (!run || run.w !== w) runs.push((run = { d: `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`, w, len: 0 }));
    run.d += `L${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    run.len += Math.hypot(q.x - p.x, q.y - p.y);
  }
  return runs;
}
