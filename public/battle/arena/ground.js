// The painted floor of an Arena map (MODES.md section 4): the map's own camera, calibrated in r4/stage/ground and cut
// into media/ground/<map>.json by .work/stage/build.mjs, so the duel stands on the painting in its own perspective.
// Floor metres: X across (right), Y up, Z away from the camera, origin on the floor under the camera. Plain matrix
// work, no DOM (the probes import it too). The fit and the projections follow r4/stage/ground/ground.js.
export const MAP = [1619, 971];
/** What stands on the floor, in metres (stage/ground/tool/calibrate.py): a figure's box for the duel's search (each
 *  figure covers `area` square metres, at most `wide` across and `tall` high, and never less than `presence`), a leader,
 *  a pad. Round 6, the projects are the heroes and the leaders their smaller trainers: a leader stands 1.5 m (round 5:
 *  1.7), and whatever the caps give, a figure's shorter plain view stands `heroH` (2.1 m, never past `tall`), unless
 *  that would take a view past `heroWide` across (the tank, Local Search, Prototemplate and Mailroom stand heroWide
 *  across and read larger by their mass); a form card's forms may stand `formTall` times `tall` (a Level 4 tower
 *  outgrows the card's own art). A phone's frame is 390 px across, so its heroes stand at most 2.4 m wide; it steps
 *  `tall` down 0.1 m, to 1.8 at the least, where its frame needs it (`capSteps`, ROUND6.md section 4.2); the chosen caps
 *  ride the set (`set.caps`). */
export const FIG = { w: 1.6, h: 1.5, area: 3.2, wide: 2.4, tall: 2.1, presence: 1.0, heroH: 2.1, heroWide: 3.4, formTall: 1.7, formExp: 0.5, formLead: 1.24 }, LEADER = { h: 1.5, w: 0.7, foot: 0.3 }, PAD = 0.9;
/** A phone. Fix pass 2 H1 tried a wider hero floor for the rival alone (`farWide`, so a wide rival is floored by its
 *  height): at 3.0 to 4.0 m the rival side's three cards no longer stood clear of yours (G1: opening-pair overlaps 9 to
 *  39 of 108 phone rows), so the phone keeps `heroWide` 2.4 on both sides and `figureMpp` takes `farWide` only where a
 *  caps set names it. */
export const FIG_PHONE = { ...FIG, heroWide: 2.4, formLead: 1.3 };
/** Fix pass 3 H1 (ruling 13): each card's opaque aura matter (arena/aura.js `data-solid`: a disc or ring, balloons, a
 *  perched piece) past its opaque box, as shares of that box [left, right, up, down], measured on the page at 1440
 *  (.work/r6/probes/arena-solid.mjs, its widest reach over 8 samples in 4 s, rounded up; arena-solid.json): CoTFly's
 *  perched membrane and wings, Prototemplate's floor rings under its disc, Relay's hooks, Kevin Wiki's thread round its
 *  pad (its front view: its rear boot did not go live under load). The phone's hide test (`phoneFix`) unions it with
 *  the figure. Cards whose matter stays inside their box (Agent Machines' trace) are left out; Princeton TD's level
 *  parts stand inside its drawn tower (`drawnBox`). */
export const SOLID = { cotfly: [0.18, 0, 0.14, 0], prototemplate: [0, 0, 0, 0.26], relay: [0.06, 0.01, 0.12, 0], 'kevin-wiki': [0.1, 0.03, 0, 0.02] };
/** A phone's rival, opaque, at least this many px high (fix pass 3 H1: a wide rival too, past the width that caps it). */
export const RIVAL_FLOOR = 75;
/** The rival's opaque area your side may cover on a phone, at most (fix pass 3 H1: at least 85% of it visible). */
export const HIDE_MAX = 0.15;
/** The lowest `tall` a phone may step down to (ROUND6.md section 4.2). */
export const TALL_FLOOR = 1.8;
/** Round 5's figures (area 2.4, wide 2.0, tall 1.6, no hero floor): a wide screen's last resort (`fitting`). */
export const ROUND5 = { ...FIG, area: 2.4, wide: 2.0, tall: 1.6, heroH: 0, presence: 0 };
/** Your first card's opaque height over its leader's on screen, at least (the duel's composition, G1). */
export const HERO = 1.15;
/** A form card's every form stands at least this many leaders high (round 6 fix H1: a Level 1 tower is a hero too; 1.2
 *  on screen, with room for a leader that stands a step nearer the camera than its figure). The caps' `formLead` sets it
 *  per class: a wide screen 1.24 (its leader stands beside the tower, G1's lowest on screen 1.25, and Lab 1 stays in
 *  section 4.2's 300-340 px at 1440), a phone 1.3 (its leader may stand a step nearer). */
export const FORM_LEAD = 1.3;
/** The pads at least two pad radii apart (hard), and a soft cost below this many metres, so the auras orbit clear. */
export const ROOM = 2.2;
/** How far a leader may step out to its figure's outer side to stand clear of every figure, in metres (`settle`). */
export const LEAD_OUT = 1.6;

const base = new URL('../media/ground/', import.meta.url);
const cache = new Map(), now = new Map();
/** The map's floor (one fetch a visit); `groundNow` hands it back once it has loaded. */
export function loadGround(map) {
  if (!cache.has(map)) cache.set(map, fetch(new URL(`${map}.json`, base)).then((r) => r.json()).then((g) => { now.set(map, g); return g; }));
  return cache.get(map);
}
export const groundNow = (map) => now.get(map) ?? null;

/** The map cover-fitted with its row `hz` at `at` of the frame's height (40% on a wide screen, round 6 fix H4; a phone picks its own,
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

// ---------------------------------------------------------------- the frame the duel stands in (board px)
const R0 = Math.round, clamp0 = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp0 = (a, b, t) => a + (b - a) * t;
/** The phone class: a frame under this many px wide (the Mat and the Arena alike). */
export const PHONE_W = 720;
/** The frame for this window: the rails, the console, and the band where the painting must always show (the whole
 *  frame on a wide screen; on a phone, from under the team rail to under the console's top, so a phone may show more
 *  of the painting, `stage`). Shared by arena/board.js and the probes, so both solve the same duel. */
export function frameOf(W, H) {
  const phone = W < PHONE_W;
  let g;
  if (phone) {
    const rail = 52, team = 46;
    const conH = 268; // the Mat's phone console: four whole moves scroll inside it and the duel keeps the rest
    const con = { x: 8, y: H - 8 - conH, w: W - 16, h: conH };
    const th = R0(clamp0(W / 390, 0.82, 1.25) * 32);
    g = { phone, W, H, rail, team, con, tw: th * 2, th };
  } else {
    const t = clamp0((W - 1024) / (1440 - 1024));
    const rail = R0(lerp0(48, 56, t));
    const conH = R0(lerp0(128, 146, t)), bottom = R0(lerp0(12, 16, t));
    // round 5: from 1280 up the battle log stands at the right edge, from under the rail to the floor
    const logW = W >= 1280 ? R0(lerp0(256, 288, clamp0((W - 1280) / 320))) : 0;
    const conW = Math.min(1296, W - 48 - (logW ? logW + 12 : 0));
    const con = { x: logW ? 24 : R0((W - conW) / 2), y: H - bottom - conH, w: conW, h: conH };
    const th = R0(lerp0(40, 56, t));
    g = { phone, W, H, rail, team: 0, con, tw: th * 2, th };
    if (logW) g.log = { x: W - 24 - logW, y: rail + 12, w: logW, h: H - bottom - rail - 12 };
  }
  // the duel's floor: on a phone your plate strip (36 px, 6 over the console) stands above the console, so the figures
  // and their pads end above it
  g.floor = phone ? g.con.y - 42 : g.con.y;
  g.band = phone ? { top: g.rail + g.team, bottom: g.floor + 24 } : { top: 0, bottom: H };
  return g;
}
/** Your plate on a wide screen: at the console's left end, 40 px over it; 102 px tall at 272 wide, and 112 at 244,
 *  where a long name takes two lines (measured, shared/hud.css). */
export const deskPlate = (g) => ({ x: g.con.x, bottom: g.con.y - 40, w: g.W >= 1280 ? 272 : 244, h: g.W >= 1280 ? 102 : 112 });
// (the duel keeps your opening figure and your leader at rest off exactly that box)
const keepOf = (g) => { if (g.phone) return []; const p = deskPlate(g); return [{ x0: p.x, y0: p.bottom - p.h, x1: p.x + p.w, y1: p.bottom }]; };
/** The rival's plate on a wide screen (shared/hud.js): over its own half of the floor, under the rail, clear of the
 *  log rail; about 130 px tall with its Seen row. */
export const rivalPlate = (g) => { const w = g.W >= 1280 ? 272 : 244; return { x: (g.log ? g.log.x - 12 : g.W - 24) - w - Math.round(g.W * 0.08), y: g.rail + 12, w, h: 130 }; };
/** A hand waiting in a wide screen's top corner (arena/board.js handSize): its card and fan, px. */
export const deskHand = (g) => { const h = Math.max(64, R0(g.th * 1.58)), w = R0((h * 63) / 88), f = Math.max(12, h * 0.2), step = R0(Math.max(w * 0.62, 2.7 * f + 6)); return { bw: w + step + R0(h * 0.1), bh: h + R0(h * 0.3) }; };
/** Where the rival's plate may stand on a wide screen: under the rail, its centre over the rival's half of the duel's
 *  width, clear of the rival hand's corner, at its own row or up to 80 px lower; its usual spot first. The page takes
 *  the clearest (board.js placeRivalPlate); the duel needs one of them clear of the rival's figures and leader. */
export function rivalSpots(g) {
  if (g.phone) return [];
  const p0 = rivalPlate(g), RW = g.log ? g.log.x - 8 : g.W, hb = deskHand(g), cx = (g.log ? g.log.x : g.W) - 24 - hb.bw - 24;
  const right = (g.log ? g.log.x - 12 : g.W - 24) - p0.w, left = Math.round(RW / 2 - p0.w / 2), out = [{ x: p0.x, y: p0.y, w: p0.w, h: p0.h }];
  for (let x = right; x >= left; x -= 12) for (const y of [p0.y, p0.y + 40, p0.y + 80]) if (x + p0.w <= cx || y >= g.rail + hb.bh + 40) out.push({ x, y, w: p0.w, h: p0.h });
  return out;
}
/** A phone's rival hand in its top corner, under the team rail (arena/board.js handSize and placeHand; a short phone,
 *  under 700 px tall, holds it in the team rail instead). */
export const phoneHand = (g) => { const h = 63, w = R0((h * 63) / 88), f = Math.max(12, h * 0.2), step = R0(Math.max(w * 0.62, 2.7 * f + 6)), bw = w + step + R0(h * 0.1), bh = h + R0(h * 0.3); return { x: g.W - 8 - bw, y: g.rail + g.team + 48, w: bw, h: bh }; };
// (round 6: the rival's figures and leader keep clear of one of its plate's spots, as yours keep off yours; on a phone
// of the rival hand's corner, at a soft cost, so the hand need not cover the bigger heroes, crowd.mjs)
// (fix pass 2 H1: a phone 412 px wide or less seats the rival's hand in the team rail, `rivalInRail`, so its corner is free)
export const rivalInRail = (g) => g.phone && (g.H < 700 || g.W <= 412);
const keepFarOf = (g) => (g.phone ? (rivalInRail(g) ? [] : [phoneHand(g)]) : rivalSpots(g)).map((p) => ({ x0: p.x - 6, y0: p.y, x1: p.x + p.w + 6, y1: p.y + p.h + 6 }));
/** A phone's rival plate: a strip under the team rail, about 40 px (shared/hud.js), which the rival's figures never
 *  stand under (round 6 fix H2). */
export const phoneStrip = (g) => ({ x0: 8, y0: g.rail + g.team + 4, x1: g.W - 8, y1: g.rail + g.team + 44 });
/** What the duel's search takes from a frame. */
/** The open board a phone's duel is composed in (fix pass 2 H1): under the team rail, above the console. */
export const openOf = (g) => ({ top: g.rail + g.team, bottom: g.con.y });
export const stageFrame = (g, env) => ({ W: g.W, H: g.H, right: g.log ? g.log.x - 8 : g.W, phone: g.phone, top: g.rail + g.team, bottom: g.floor, open: openOf(g), band: g.band, keep: keepOf(g), keepFar: keepFarOf(g), strip: g.phone ? phoneStrip(g) : null, env });

// ---------------------------------------------------------------- the duel on the floor
// As a classic battle camera frames it: your figure near the camera at lower left, seen from behind, your leader
// beside it on the outer side; the rival's figure clearly farther back at upper right, seen from the front, its leader
// beside it on the outer side or a step behind it. The search is over the floor's rows at a few column shares of the
// frame for each side on its own, then over the pairs, and the calibration's own stands compete. Hard rules (a pair
// that breaks one only wins where nothing else passes): every pad (a 0.9 m circle) and leader foot on the walkable
// floor; every figure, leader and pad inside the frame above the console; the far side at most `max` of the near
// side's scale, so near and far read; the pads at least two pad radii apart and each leader's foot outside its own
// pad; the two sides' figures clear of each other, whichever of the battle's cards stands (`envelope`); each leader
// clear of the other side's figure and of the other leader, and over its own figure at most a fifth of it (test 35, on
// a wide screen hard at 0.2); the rival's figures and leader clear of one of its plate's spots on a wide screen; on a
// phone the near figure at least 120 px tall. Of the pairs that pass, the one closest to the class's composition (round
// 6: your hero at `hero` of the frame's height and HERO times its leader, the far side at `ratio` of its scale).
/** Every view a figure may stand in: its two plain views and, for a card with forms (manifest `forms`, ROUND6.md
 *  section 3.2), every form's two; all drawn at one scale, so one metres-per-px serves them all. */
export function viewsOf(m, view = null) {
  const out = view ? [m[view]] : [m.front, m.rear];
  for (const f of Object.values(m.forms ?? {})) for (const k of view ? [view] : ['front', 'rear']) if (f?.[k]?.box) out.push(f[k]);
  return out.filter(Boolean);
}
/** A form's view, or the plain one (a card without forms, or forms off). */
export const formView = (m, view, key = null) => (key && m.forms?.[key]?.[view]) || m[view];
/** A form card's growth, compressed (round 6 fix H1): every view of a card with forms draws at (H4 / H)^(1 - exp) of
 *  the card's one scale, H its opaque height and H4 the card's tallest Level 4 one, so it stands H4 x (H / H4)^exp high
 *  (exp 0.5, the caps' `formExp`: a Level 1 Mortar 0.65 of the tallest Level 4 instead of 0.42, and an upgrade still
 *  reads as growth; a shallow floor's caps compress it further, `fitting`). A card without
 *  forms draws every view at 1. Board, aura, reticle and scene all read the drawn box (`fig.box`), never the raw one. */
const H4s = new WeakMap(), STEPS = new WeakMap();
const opaqueH = (v) => v.box[3] - v.box[1];
/** Each level of one tower stands at least this much taller than the level below it, drawn (fix pass 2 H3: under the
 *  square-root compression a Level 2 drew 2-5% over its Level 1, and an upgrade did not read as growth). */
export const LEVEL_STEP = 1.08;
/** What each form paints over its opaque box (its coil's arcs, a station's mast, an arch's banner), as a share of the
 *  box's height, [rear, front] (under 0 where it draws short of its box): measured on the page by pixels, reduced motion and no aura, the figure shown against
 *  hidden (.work/r6/probes/arena-steps.mjs, 1440, 2026-11-11). Fix pass 2 H3, after its critic: the level steps are held
 *  on the drawn height, box and paint, at LEVEL_STEP 1.08 (1.10 took the Level 1 Mortar under 1.2 of its leader on 29 G1 rows) (at 1.08 on the box alone the
 *  Lab's 3 to 4A drew 0.99 and the Station's 1 to 2 1.01, since a Lab 1 paints 18% over its box and a 4A 5%). */
export const FORM_PAINT = {'lab-1':[0.191,0.144],'lab-2':[0.168,0.109],'lab-3':[0.153,0.122],'lab-4a':[0.056,0.046],'lab-4b':[0.096,0.095],'cannon-1':[0.006,0.007],'cannon-2':[0.003,0.006],'cannon-3':[0.005,0.003],'cannon-4a':[-0.035,0.003],'cannon-4b':[0.004,0.008],'station-1':[0.101,0.096],'station-2':[0.03,0.025],'station-3':[0.002,0.006],'station-4a':[0.006,0.005],'station-4b':[0.004,0.005],'mortar-1':[0.048,0.097],'mortar-2':[0.019,0.044],'mortar-3':[0.017,0.04],'mortar-4a':[0.02,0.014],'mortar-4b':[0.042,0.034],'library-1':[0.027,0.013],'library-2':[0.029,0.015],'library-3':[0.031,0.023],'library-4a':[0.033,0.023],'library-4b':[0.031,0.023],'arch-1':[0.173,0.147],'arch-2':[0.17,0.166],'arch-3':[0.188,0.15],'arch-4a':[0.124,0.06],'arch-4b':[0.156,0.119],'club-1':[0.005,0.007],'club-2':[0.007,0.01],'club-3':[0.011,0.012],'club-4a':[-0.027,0.011],'club-4b':[-0.01,0.006]};
export const paintOf = (k, vw) => FORM_PAINT[k]?.[vw === 'front' ? 1 : 0] ?? 0;
const LEVELS = ['1', '2', '3'];
export function formScale(m, v, exp = 0.5) {
  if (!m?.forms || !v?.box) return 1;
  let H4 = H4s.get(m);
  if (H4 == null) {
    H4 = 0;
    for (const [k, f] of Object.entries(m.forms)) if (/-4[ab]?$/.test(k)) for (const x of [f?.front, f?.rear]) if (x?.box) H4 = Math.max(H4, opaqueH(x));
    H4s.set(m, H4);
  }
  if (!H4) return 1;
  // (fix pass 2 H3: the compressed heights, then from each tower's Level 4 down every level held at least LEVEL_STEP
  // under the one above it, 1 -> 2 -> 3 -> 4A and 4B; the Level 4 envelope caps the top, so the lower levels give way)
  let per = STEPS.get(m);
  if (!per) STEPS.set(m, (per = new Map()));
  let sc = per.get(exp);
  if (!sc) {
    sc = new Map();
    const d = (x) => opaqueH(x) * Math.max(1, (H4 / opaqueH(x)) ** (1 - exp));
    const towers = {};
    for (const [k, f] of Object.entries(m.forms)) {
      const [t, l] = k.split('-');
      // (the paint counts at the caps' own growth; the last resort's near-flat growth (exp 0.1, the atelier's shallow floor
      // on a wide screen) steps the boxes alone: with the paint its Level 4 envelope crowded the rival, 0.09 against 0.05)
      for (const vw of ['front', 'rear']) if (f?.[vw]?.box) ((towers[`${t}|${vw}`] ??= {})[l] = { x: f[vw], paint: exp > 0.1 ? 1 + paintOf(k, vw) : 1 });
    }
    for (const L of Object.values(towers)) {
      // (h: the drawn height on the page, box and paint)
      const h = {};
      for (const [l, { x, paint }] of Object.entries(L)) h[l] = d(x) * paint;
      let top = Math.min(...['4a', '4b', '4'].filter((l) => h[l]).map((l) => h[l]));
      for (const l of [...LEVELS].reverse()) if (h[l]) { if (Number.isFinite(top)) h[l] = Math.min(h[l], top / LEVEL_STEP); top = h[l]; }
      for (const [l, { x, paint }] of Object.entries(L)) sc.set(x, h[l] / paint / opaqueH(x));
    }
    per.set(exp, sc);
  }
  return sc.get(v) ?? Math.max(1, (H4 / opaqueH(v)) ** (1 - exp));
}
/** A view's drawn opaque height in picture px (its own, times its form scale). */
export const drawnH = (m, v, exp = 0.5) => opaqueH(v) * formScale(m, v, exp);
/** A figure's metres per picture px: its opaque box covers FIG.area square metres (a tall one at most FIG.tall high,
 *  a wide one at most FIG.wide across), the largest of its views deciding (every form's too, so a build or an upgrade
 *  never rescales the card and a Level 4 tower reads as growth), so a card is one size on either side; and whatever
 *  its shape, its box covers at least FIG.presence square metres. */
export function figureMpp(m, caps = FIG, far = false) {
  // (the rival's side on a phone: its hero floor may stand `farWide` across, fix pass 2 H1)
  if (far && caps.farWide) caps = { ...caps, heroWide: caps.farWide };
  // (each view within the caps on its own: a wide form and a tall form never make one box neither of them is; a form
  // card's views at their drawn size, `formScale`)
  let mpp = Infinity, big = 0, bw = 0;
  for (const v of viewsOf(m)) {
    const f = formScale(m, v, caps.formExp), w = (v.box[2] - v.box[0]) * f, h = (v.box[3] - v.box[1]) * f;
    mpp = Math.min(mpp, Math.sqrt(caps.area / (w * h)), caps.wide / w, caps.tall / h);
    big = Math.max(big, w * h); bw = Math.max(bw, w);
  }
  // the hero floor: its shorter plain view `hero` times a leader high, no plain view past `tall` high, none past
  // `heroWide` across. A form card (round 6 fix H1): every form it may stand at least FORM_LEAD leaders high (the
  // battle opens on Level 1, never on the card's plain Level 4 art), the tallest at most `formTall` times `tall`
  const plain = [m.front, m.rear].filter(Boolean), forms = viewsOf(m).filter((v) => !plain.includes(v));
  const hs = (vs) => Math.max(0, ...vs.map((v) => drawnH(m, v, caps.formExp)));
  let hero = 0;
  if ((caps.heroH || caps.formFloor) && forms.length) {
    const low = Math.min(...forms.map((v) => drawnH(m, v, caps.formExp)));
    hero = Math.min(((caps.formLead ?? FORM_LEAD) * LEADER.h) / low, ((caps.formTall ?? 1) * caps.tall) / hs([...forms, ...plain]), (caps.heroWide ?? caps.wide) / bw);
  } else if (caps.heroH) {
    const low = Math.min(...plain.map((v) => v.box[3] - v.box[1]));
    hero = Math.min(caps.heroH / low, caps.tall / hs(plain), (caps.heroWide ?? caps.wide) / bw);
  }
  let out = Math.max(mpp, hero, Math.sqrt((caps.presence ?? 0) / big));
  // (fix pass 3 H1: a phone's rival height floor, `phoneFix`: a wide rival, whose width caps it, stands at least
  // `farMinH` metres high, its plain view's opaque box (a form card is never wide); and your side's shrink toward the
  // rival's 0.7, `nearK`, where your figure would hide the rival)
  if (far && caps.farMinH && !m.forms && plain.length) out = Math.max(out, caps.farMinH / Math.min(...plain.map((v) => v.box[3] - v.box[1])));
  if (!far && caps.nearK) out *= caps.nearK;
  return out;
}
/** What a side's figures take round their foot, in metres: each of the team's pictures in that side's view (every
 *  form of a form card too, at its drawn size: left, right, up, and down below the foot, negative for a floating
 *  subject), their union, and the smallest opaque height of the plain views. `keys` (by team slot) names the form each
 *  card stands now, so the opening pair is measured as it stands (a form card's Level 1, not its plain Level 4 art). */
export function envelope(figures, ids, view, caps = FIG, keys = [], far = view === 'front') {
  const boxes = [], oboxes = [];
  let minH = 9, h0 = 0, o0 = null, floorH = 9;
  for (const [i, id] of ids.entries()) {
    const m = figures[id];
    if (!m) continue;
    const mpp = figureMpp(m, caps, far), v0 = formView(m, view, keys[i]), s0 = mpp * formScale(m, v0, caps.formExp), h = (v0.box[3] - v0.box[1]) * s0;
    // (the rival's height floor, fix pass 2 H1: every card but those their width caps, Mailroom 3.2 to 1 and the other
    // wide heroes, whose height no frame a phone wide can floor)
    if (!(far && (v0.box[2] - v0.box[0]) * s0 > 0.97 * (caps.farWide ?? caps.heroWide ?? caps.wide))) floorH = Math.min(floorH, h);
    for (const v of viewsOf(m, view)) {
      const s = mpp * formScale(m, v, caps.formExp);
      // (a form card's still is filmed with room round the tower for its shots; what stands is the tower, its level
      // badge over it (an eighth of its height) and a sliver either side: round 6 fix H1, so a Level 4 still's empty
      // margin never pushes the duel apart)
      if (m.forms) { const w = v.box[2] - v.box[0], h = v.box[3] - v.box[1]; boxes.push({ l: (v.foot[0] - v.box[0] + 0.04 * w) * s, r: (v.box[2] - v.foot[0] + 0.04 * w) * s, t: (v.foot[1] - v.box[1] + 0.12 * h) * s, b: (v.box[3] - v.foot[1]) * s }); }
      else boxes.push({ l: v.foot[0] * s, r: (v.w - v.foot[0]) * s, t: v.foot[1] * s, b: (v.h - v.foot[1]) * s });
      // (and its opaque box: what a plate may never cover, round 6 fix H2)
      oboxes.push({ l: (v.foot[0] - v.box[0]) * s, r: (v.box[2] - v.foot[0]) * s, t: (v.foot[1] - v.box[1]) * s, b: (v.box[3] - v.foot[1]) * s });
    }
    minH = Math.min(minH, h);
    // (the first card's opaque box too: what test 35 measures its leader against)
    o0 ??= { l: (v0.foot[0] - v0.box[0]) * s0, r: (v0.box[2] - v0.foot[0]) * s0, t: (v0.foot[1] - v0.box[1]) * s0, b: (v0.box[3] - v0.foot[1]) * s0 };
    h0 ||= h;
  }
  if (!boxes.length) return null;
  const u = (k) => Math.max(...boxes.map((b) => b[k]));
  // h0: the opaque height of the side's first card as it stands (the duel's opening pair)
  // (each card as it stands now, for the phone's hide and floor fix-up, `phoneFix`: its opaque box round its foot in
  // metres, with its card's opaque matter, `SOLID`)
  const cards = ids.map((id, i) => {
    const m = figures[id];
    if (!m) return null;
    const v = formView(m, view, keys[i]), s = figureMpp(m, caps, far) * formScale(m, v, caps.formExp), w = v.box[2] - v.box[0], h = v.box[3] - v.box[1];
    const o = { l: (v.foot[0] - v.box[0]) * s, r: (v.box[2] - v.foot[0]) * s, t: (v.foot[1] - v.box[1]) * s, b: (v.box[3] - v.foot[1]) * s };
    const q = SOLID[id];
    const so = q ? { l: o.l + q[0] * w * s, r: o.r + q[1] * w * s, t: o.t + q[2] * h * s, b: o.b + q[3] * h * s } : o;
    return { id, o, so, w: w * s, h: h * s, wide: !m.forms && w * s > 0.97 * (caps.farWide ?? caps.heroWide ?? caps.wide) };
  }).filter(Boolean);
  return { boxes, oboxes, cards, l: u('l'), r: u('r'), t: u('t'), b: u('b'), minH, floorH: floorH < 9 ? floorH : minH, h0, o0, forms: ids.some((id) => figures[id]?.forms) };
}
/** What a leader takes round its foot in every pose of its side (a leader stands LEADER.h, 100 atlas px), in metres:
 *  left, right and up, from the roster's opaque boxes and foot anchors. */
export function leaderReach(t, poses) {
  const m = LEADER.h / 100, e = { l: 0, r: 0, t: 0, h: 0 };
  for (const p of poses) { const c = t.cells[p], a = t.anchors[p]; e.l = Math.max(e.l, (a[0] - c[0]) * m); e.r = Math.max(e.r, (c[0] + c[2] - a[0]) * m); e.t = Math.max(e.t, (a[1] - c[1]) * m); e.h = Math.max(e.h, c[3] * m); }
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
  // round 6, the projects lead the frame: your first card stands `hero` of the frame's height (desktop 0.36, 324 px
  // at 900: section 4.2's 300-340 at rest, the camera resting at 1; phone 0.185, 156 px at 844), its leader at most
  // `lead` (0.26, 234 px at 900; on a wide screen at least `leadMin`, test 15's 200 px at 900) and the hero at least
  // HERO (1.15) times its leader on screen; the far side at `ratio` of the near side's scale (0.68; a phone 0.72, so
  // its rival reaches 105 px, and never under 0.5, so a struck rival fills test 13's 5% at its push); the rival's first card at most `tall` of yours (round 6 fix H1:
  // 0.85, a phone 0.7; the rival never out-draws your hero), hard everywhere
  desktop: { hero: 0.36, lead: 0.26, leadMin: 0.222, ratio: 0.68, max: 0.78, own: 0.2, hide: 0.05, hideAny: 0.05, behind: 0, tall: 0.85, pads: [0.63, 0.67], xs: [[0.33, 0.36, 0.39, 0.42, 0.45, 0.48, 0.51], [0.64, 0.67, 0.7, 0.73, 0.76, 0.79]], alt: [cols(0.16, 0.5), cols(0.5, 0.9)], near: [[1.4, -0.3], [1.1, -0.3], [0.9, 0], [1.4, 0.5]], far: [[1.4, 0.3], [1.1, 0.3], [0.9, 0]], minH: 0 },
  phone: { hero: 0.185, lead: 0.17, ratio: 0.72, min: 0.45, max: 0.78, own: 0.17, hide: 0, hideAny: 0.15, behind: 0.25, tall: 0.82, tallSoft: 0.7, foot: [0.7, 0.75], footW: 40, floor: [90, 105], floorW: 40, ats: [0.24, 0.3, 0.36], sizes: [1, 0.88, 0.78, 0.7, 0.63, 0.57, 0.52, 0.47], xs: [cols(0.3, 0.66), cols(0.5, 0.94)], near: [[1.2, 0.6], [1.3, 0.6], [1.1, 0.6], [1.4, 0.6], [1.2, 0.9], [1.0, 0.9], [1.2, 0.3], [1.3, 0.3], [1.4, -0.3], [1.2, -0.3], [1.1, 0], [0.9, 0.3]], far: [[1.0, 0.3], [0.9, 0], [0.5, 1.0], [0, 1.3], [-0.6, 1.0], [-0.9, 0.9], [-1.1, 0.6], [0.7, 1.2]], minH: 120.5 },
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
  // the frame's usable right edge: from 1280 the battle log holds the window's right edge (round 6: the duel stands
  // left of it, its columns shares of what is left, so no leader or figure stands under the log)
  const RW = fr.right ?? fr.W;
  const walk = g.walkable, hy = P[1][2] / P[2][2];
  const onFloor = (X, Z, r, n = 12) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; if (!inside(walk, X + r * Math.cos(a), Z + r * Math.sin(a))) return false; } return true; };
  const figBox = (f, k, e) => ({ x0: f.x - e.l * k, x1: f.x + e.r * k, y0: f.y - e.t * k, y1: f.y + Math.max(0, e.b) * k });
  // a leader's body at rest (what it covers) and its reach in every pose of its side (what must stay in frame)
  const L0 = { l: LEADER.w / 2, r: LEADER.w / 2, t: LEADER.h }, lead = { near: fr.env?.lead?.near ?? { rest: L0, reach: L0 }, far: fr.env?.lead?.far ?? { rest: L0, reach: L0 } };
  const leadBox = (X, Z, near) => {
    const f = project(P, X, Z), k = ppm(P, X, Z), e = lead[near ? 'near' : 'far'], b = (q) => ({ x0: f.x - q.l * k, x1: f.x + q.r * k, y0: f.y - q.t * k, y1: f.y });
    return { ...b(e.rest), k, reach: b(e.reach), poses: (e.poses ?? [e.rest]).map(b) };
  };
  // (your figure, the one that stands first, at least minH px on a phone: test 34)
  const minK = fr.phone ? T.minH / Math.max(0.5, env.near.h0 || env.near.minH) : 0;
  /** One stand at floor (X, Z): its figure's boxes and what fails of it alone (the pad is tested once it matters). */
  const stand = (X, Z, near) => {
    const f = project(P, X, Z), k = ppm(P, X, Z), e = near ? env.near : env.far, fb = figBox(f, k, e);
    const why = [];
    // (round 6: under the top rail is out of frame too, hard: a hero's head behind the HUD is not a hero)
    if (fb.x0 < 4 || fb.x1 > RW - 4 || fb.y1 > fr.bottom - 4 || fb.y0 < fr.top + 2) why.push('figure out of frame');
    if (near && k < minK) why.push('near figure too small');
    return { X, Z, k, near, y: f.y, fb, fbs: e.boxes.map((b) => figBox(f, k, b)), fos: (e.oboxes ?? []).map((b) => figBox(f, k, b)), fo: e.o0 ? figBox(f, k, e.o0) : null, why, pad: null };
  };
  const padWhy = (s) => {
    if (s.pad) return s.pad;
    const c = circle(P, s.X, s.Z, PAD, 12);
    return (s.pad = c.some(([px, py]) => py > fr.bottom - 4 || px < 0 || px > RW) ? 'pad out of frame' : !onFloor(s.X, s.Z, PAD) ? 'pad off the floor' : 'ok');
  };
  /** One side: a stand with its leader at L: what fails, what is soft, its scale. */
  const side = (st, L) => {
    const lb = leadBox(L.X, L.Z, st.near), why = st.why.length ? [...st.why] : [];
    let soft = 0;
    if (lb.reach.x0 < 2 || lb.reach.x1 > fr.W - 2 || lb.y1 > fr.bottom - 4 || lb.reach.y0 < fr.top + 2) why.push('leader out of frame');
    // (under the log rail a leader is in the frame but behind the HUD: a soft cost, so a shallow floor may still stand)
    else if (lb.reach.x1 > RW - 2) soft += 3 + (lb.reach.x1 - RW) / 20;
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
      const o = st.fo ?? st.fbs[0];
      for (const p of lb.poses) first = Math.max(first, lap(p, o) / area(o));
      // (past 0.2, test 35's line, dearly: a pair that keeps under it wins where one exists)
      if (first > T.own) why.push('leader over your figure'); else soft += 2 * first + (first > 0.2 ? 40 * (first - 0.2) : 0);
    }
    if (!why.length) {
      const p = padWhy(st);
      if (p !== 'ok') why.push(p);
      else if (!onFloor(L.X, L.Z, LEADER.foot, 8)) why.push('leader off the floor');
    }
    return { X: st.X, Z: st.Z, L, st, hard: why.length, soft, k: st.k, fb: st.fb, fbs: st.fbs, fos: st.fos, lb, lk: lb.k, why };
  };
  // a coarse pass (`fr.coarse`) takes every other column and the first four leader spots; a fine one may keep to a
  // window round a coarse pass's best (`fr.win`, board px per side)
  const sides = function* (xs, offs, near) {
    const out = [], w = fr.win?.[near ? 'near' : 'far'];
    // (a hero wider than the class's spots: its leader also stands just clear of it, beside it and a step behind)
    const e = near ? env.near : env.far, reach = near ? e.l : e.r;
    if (reach + 0.15 > 1.3) offs = [...offs, [+(reach + 0.15).toFixed(2), 0], [+(reach + 0.15).toFixed(2), 0.6], [+(reach + 0.4).toFixed(2), 0.3]];
    if (fr.coarse) { xs = xs.filter((_, i) => i % 2 === 0); offs = offs.length > 4 ? [...offs.slice(0, 2), ...offs.slice(-2)] : offs; }
    for (const xa of xs) {
      if (sliced()) yield;
      for (let y = Math.ceil(hy + 6); y < fr.bottom; y += step) {
        if (w && (RW * xa < w.x0 || RW * xa > w.x1 || y < w.y0 || y > w.y1)) continue;
        const { X, Z } = unproject(P, RW * xa, y);
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
  const keepFar = fr.keepFar ?? [];
  // (the clearest of the plate's spots: the page stands the plate there. Round 6 fix H2: a spot that touches any of the
  // rival's figures' opaque boxes, their reticle round them (8% out) or 10 px over their heads is dearer than every
  // clear one, and the pair is hard-failed (`plateHard`) where no spot is clear; a phone's rival strip under the team
  // rail is never over them either)
  const ret = (b) => { const w = b.x1 - b.x0, h = b.y1 - b.y0; return { x0: b.x0 - 0.08 * w, x1: b.x1 + 0.08 * w, y0: b.y0 - 0.08 * h - 10, y1: b.y1 }; };
  const keptFar = (r) => {
    const rets = r.fos.map(ret);
    let best = keepFar.length ? Infinity : 0, clear = !keepFar.length || fr.phone;
    for (const k of keepFar) {
      const hard = !fr.phone && rets.some((b) => lapB(b, k) > 0);
      let f = hard ? 1 : 0;
      if (!hard) clear = true;
      for (const b of r.fbs) f = Math.max(f, (hard ? 1 : 0) + lapB(b, k) / area(b));
      f += lapB(r.lb, k) / area(r.lb);
      if (f < best) best = f;
      if (!best) break;
    }
    r.plateHard = !clear || Boolean(fr.strip && rets.some((b) => lapB(b, fr.strip) > 0));
    return best;
  };
  // (round 6, the engineer's H4 note: your opening card's opaque box under your own plate costs 60 times its share of
  // the box over the rest, so a lowered duel stands its tank's tracks above the plate wherever a few px allow)
  const kept = (n) => { let h = 0; for (const k of keep) h += lapB(n.fbs[0], k) / area(n.fbs[0]) + (n.st.fo ? (60 * lapB(n.st.fo, k)) / area(n.st.fo) : 0) + Math.max(0, lapB(n.lb, k) / area(n.lb) - 0.06); return h; };
  // your hero at `hero` of the height; its leader (its opaque body at rest) at most `lead` (at least `leadMin`), and the
  // hero at least HERO times it on screen
  const h0 = env.near.h0 || 1.9;
  const own = (n) => {
    const fig = h0 * n.k, man = (lead.near.rest.h || LEADER.h) * n.lk, big = Math.log(fig / (T.hero * fr.H));
    // (short of the hero's size costs the most: the projects lead the frame)
    let c = big < 0 ? -5 * big : 3 * big;
    if (man > T.lead * fr.H) c += Math.log(man / (T.lead * fr.H));
    if (T.leadMin && man < T.leadMin * fr.H) c += 2 * Math.log((T.leadMin * fr.H) / man);
    if (fig < HERO * man) c += 3 * Math.log((HERO * man) / fig);
    return c + 0.6 * n.soft + 15 * kept(n);
  };
  // (no allocation per pair: the failures are counted as bits and named only for a pair that wins)
  const WHY = ['far not far enough', 'pads too close', 'figures overlap', 'rival too tall', 'a leader over the other side', 'rival leader behind your figure', 'rival under its plate', 'far too far', 'rival over 0.7 of yours', 'near foot off its line', 'rival under its floor'];
  const lapB = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const consider = (n, r, pen, cols) => {
    if (r.Z <= n.Z + 0.25) return;
    const ratio = r.k / n.k;
    // (the rival's figures and leader under its plate: hard, so the plate never has to leave the rival's half)
    let bits = (ratio > T.max ? 1 : 0) | (((r.kf ??= keptFar(r)) > 0.04 && !fr.phone) || r.plateHard ? 64 : 0) | (ratio < (T.min ?? 0) ? 128 : 0);
    let cost = 2 * Math.abs(Math.log(ratio / T.ratio)) + n.own + 0.6 * r.soft + (fr.phone ? 30 : 20) * r.kf + pen + 50 * (n.hard + r.hard + (bits & 1) + ((bits >> 6) & 1) + (bits >> 7));
    if (cost >= bound) return;
    const apart = Math.hypot(r.X - n.X, r.Z - n.Z);
    if (apart < 2 * PAD) { bits |= 2; cost += 50; if (cost >= bound) return; }
    // (room for the auras' orbits: a soft cost below ROOM metres)
    else if (apart < ROOM) { cost += 2 * (ROOM - apart); if (cost >= bound) return; }
    // the opening pair reads near and far by height too: the rival's first card stands at most `tall` of yours
    const tallR = env.near.h0 && env.far.h0 ? (r.k * env.far.h0) / (n.k * env.near.h0) : 0;
    // (round 6 fix H1: 0.85 on a wide screen, hard. A phone: 0.7 is the rule, and a pair over it is a named problem
    // at a steep cost (150 a unit), so the phone steps `tall` down 0.1 m to 1.8 (`capSteps`) until a duel holds it, the
    // rival's tall card shrinking while a wide hero, held by `heroWide`, keeps its size; 0.82 stays the hard line, since
    // past 1.8 some floors cannot stand a 2.4 m wide hero and a tall rival 0.7 apart without worse (the 0.7 bit hard sent
    // them to 0.96 with the far side's pad off the floor: recorded in .work/r6/probes/arena-duel-G1.log))
    if (tallR > T.tall) { bits |= 8; cost += 50; if (cost >= bound) return; }
    if (T.tallSoft && tallR > T.tallSoft + 1e-9) { bits |= 256; cost += 150 * (tallR - T.tallSoft); if (cost >= bound) return; }
    // (round 6 fix H4: the duel low in its frame. A wide screen's pads, about their midpoint, at 62 to 68% of its height
    // (the cost aims inside it, 63 to 67%, dearly: 40 a unit of the height (a phone's foot line 12, so its heroes keep
    // their size), so a pair 5% out of it costs what 1.5 times
    // the hero's size would),
    // so no empty floor under the heroes; a phone's near foot at 60% of the open band)
    // (fix pass 2 H1: a phone's near foot line at 70 to 75% of the open board, under the team rail and above the console,
    // so the duel fills the stage instead of standing in its top half: 60 a unit of the open height, and a named problem
    // past 1.5% out of it)
    { const mid = (n.st.y + r.st.y) / 2, O = fr.open ?? { top: fr.top, bottom: fr.bottom }, oh = O.bottom - O.top;
      const dev = T.pads ? Math.max(0, T.pads[0] * fr.H - mid, mid - T.pads[1] * fr.H) / fr.H : T.foot ? Math.max(0, O.top + T.foot[0] * oh - n.st.y, n.st.y - (O.top + T.foot[1] * oh)) / oh : 0;
      if (T.foot && dev > 0.015) bits |= 512;
      if (dev) { cost += (fr.phone ? T.footW : 40) * dev; if (cost >= bound) return; } }
    // (fix pass 2 H1: every rival at least `floor` px tall, 90 under 380 px wide, else 105; its width-capped card, the
    // 3.2 to 1 Mailroom, aside, envelope `floorH`)
    if (T.floor && env.far.floorH) {
      const want = fr.W < 380 ? T.floor[0] : T.floor[1], got = r.k * env.far.floorH;
      if (got < want) { cost += T.floorW * Math.log(want / got); if (got < 0.98 * want) bits |= 1024; if (cost >= bound) return; }
    }
    // the near figure may hide a sliver of the far one (a twentieth of it at most, the opening pair at most `hide`)
    let hide = 0;
    for (const a of n.fbs) for (const b of r.fbs) { const h = lapB(a, b) / area(b); if (h > hide) hide = h; }
    // (the opening pair by its drawn, opaque boxes where the envelope has them: a picture's empty margin hides nothing,
    // and a phone's `hide` 0 held the margins apart, pushing the rival up to the strip)
    const hide0 = n.st.fo && r.st.fo ? lapB(n.st.fo, r.st.fo) / area(r.st.fo) : lapB(n.fbs[0], r.fbs[0]) / area(r.fbs[0]);
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
  const xs = fr.alt && T.alt ? T.alt : T.xs;
  const N = yield* sides(xs[0], T.near, true), F = yield* sides(xs[1], T.far, false);
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
  if (best) settle(best);
  return best;
  /** Fix pass 2 H2 step 4, after its critic: no leader's body over any figure. The search keeps a leader's share of its
   *  own figure small (a soft cost, and hard past 0.3 or `own`), which as a hard 0 failed 47 of 72 wide rows and as a
   *  dearer cost moved the pads off their band; so once the duel is chosen, a leader whose body at rest still touches any
   *  card's opaque box on either side (every card and form the side may stand, `envelope` oboxes) steps out to its
   *  figure's outer side, and back or forward a little, the least distance (at most LEAD_OUT metres) that keeps it clear,
   *  in frame, on the walkable floor, off the other leader and off the phone's rival strip. Where no such spot exists it
   *  keeps clear of the two cards that stand first, else it stays. The pads, the figures and the composition never move. */
  function settle(b) {
    const sn = stand(b.near.X, b.near.Z, true), sf = stand(b.far.X, b.far.Z, false);
    const firsts = [sn.fo ?? sn.fbs[0], sf.fo ?? sf.fbs[0]], all = [...(sn.fos.length ? sn.fos : sn.fbs), ...(sf.fos.length ? sf.fos : sf.fbs)];
    const over = (lb, set) => set.reduce((a, o) => a + lapB(lb, o), 0);
    const ok = (L, near, other) => {
      const lb = leadBox(L.X, L.Z, near);
      if (lb.reach.x0 < 2 || lb.reach.x1 > RW - 2 || lb.y1 > fr.bottom - 4 || lb.reach.y0 < fr.top + 2) return null;
      if (other && lapB(lb, other) > 0) return null;
      if (fr.strip && !near && lapB(lb, fr.strip) > 0) return null;
      if (near) for (const k of keep) if (lapB(lb, k) > 0.06 * area(lb)) return null;
      if (!onFloor(L.X, L.Z, LEADER.foot, 8)) return null;
      return lb;
    };
    const moved = [];
    for (const near of [true, false]) {
      const key = near ? 'yl' : 'rl', L = b[key], out = near ? -1 : 1, otherL = near ? b.rl : b.yl;
      const other = leadBox(otherL.X, otherL.Z, !near);
      const lb0 = leadBox(L.X, L.Z, near);
      const was = over(lb0, all);
      if (!was) continue;
      let pick = null;
      for (const set of [all, firsts]) {
        for (let dx = 0.1; dx <= LEAD_OUT + 1e-9 && !pick; dx += 0.1) for (const dz of [0, 0.3, -0.3, 0.6]) {
          const C = { X: L.X + out * dx, Z: L.Z + dz }, lb = ok(C, near, other);
          if (lb && !over(lb, set)) { pick = C; break; }
        }
        if (pick) break;
      }
      if (pick) { moved.push({ side: near ? 'near' : 'far', from: [+L.X.toFixed(2), +L.Z.toFixed(2)], to: [+pick.X.toFixed(2), +pick.Z.toFixed(2)], was: Math.round(was) }); b[key] = pick; }
    }
    if (moved.length) b.leadMoved = moved;
  }
}

/** The set for this frame: the map's fit and the duel on its floor. A wide screen keeps the painting's row at 28% of
 *  the frame, cover-fitted. A phone's narrow frame shows too little floor across for a duel with depth, so it may show
 *  more of the painting: a smaller painting that still covers the frame's band (`fr.band`, from under the top rail to
 *  under the console's top), its row at 22 to 38% of the frame, the share and size whose duel fails least and comes
 *  closest to the composition, and of those the largest painting. */
export function stage(g, fr, envFor = null) {
  const it = envFor ? fitting(g, fr, envFor) : staging(g, fr);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}
/** The same search a step at a time, yielding to `pause()` between steps, so a page can solve it before its first frame
 *  without a long task (the Arena's prepare). */
export async function stageAsync(g, fr, pause, envFor = null) {
  const it = envFor ? fitting(g, fr, envFor) : staging(g, fr);
  sliceAt = clock();
  let r = it.next();
  while (!r.done) { await pause(); sliceAt = clock(); r = it.next(); }
  sliceAt = Infinity;
  return r.value;
}
/** The caps a frame may stand its heroes at, best first. A phone steps `tall` down 0.1 m at a time to TALL_FLOOR (1.8)
 *  where its narrow frame cannot stand the duel at full size (ROUND6.md section 4.2: "step tall down 0.1 m (floor 1.8)
 *  until 0 fails"); a wide screen never steps down (its fallback is a wider search, `fitting`). */
export function capSteps(caps, phone = true) {
  const out = [caps];
  if (!phone) return out;
  for (let c = caps; c.tall > TALL_FLOOR + 1e-9;) out.push(c = { ...c, tall: Math.max(TALL_FLOOR, +(c.tall - 0.1).toFixed(2)) });
  return out;
}
/** The duel at the largest caps that pass; on a wide screen, where its one column a side fails (a shallow floor, the
 *  atelier), the same caps over many columns and four rows for the painting's horizon (`alt`). None passing, the one
 *  that fails least. `envFor(caps)` remakes the sides' envelopes at those caps; the set carries the envelope, the caps
 *  and the attempt it stands at (`set.caps`, `set.alt`). */
function* fitting(g, fr, envFor) {
  const base = fr.env?.caps ?? (fr.phone ? FIG_PHONE : FIG);
  const tries = capSteps(base, fr.phone).map((caps) => ({ caps, alt: false }));
  // (a wide screen whose floor cannot stand the heroes, the atelier's shallow room: the wider search, then tall 1.8,
  // then 1.8 without the hero floor, then round 5's figures; each a recorded step, G1 fails any row below tall 1.8)
  // (round 6 fix H1: a battle with a form card first compresses its growth, (H / H4)^0.25, before the caps step down;
  // past the hero floor it keeps its own, every form FORM_LEAD (1.3) leaders high over a near-flat growth, 1.2 on screen, so the tower never stands
  // under its trainer: each step only where a side holds forms, ground.js envelope `forms`)
  const formy = Boolean(fr.env?.near?.forms || fr.env?.far?.forms), F = { formFloor: true, formLead: FORM_LEAD, formExp: 0.1 };
  // (a form battle's last steps keep the form floor: never the plain hero-less caps, where a Level 1 tower stood 0.83 of
  // its trainer)
  if (!fr.phone) tries.push(...[base, ...(formy ? [{ ...base, formExp: 0.25 }] : []), { ...base, tall: TALL_FLOOR }, ...(formy ? [{ ...base, tall: TALL_FLOOR, heroH: 0, ...F }, { ...ROUND5, ...F }] : [{ ...base, tall: TALL_FLOOR, heroH: 0 }, ROUND5])].map((caps) => ({ caps, alt: true })));
  let best = null, best0 = null;
  for (const t of tries) {
    const env = t.caps === base && fr.env ? fr.env : envFor(t.caps);
    // (a phone's later steps search only the painting shares and sizes the first step did best in: a step changes the
    // heroes' height a twentieth, not where the painting stands, and the solve stays a boot's)
    const set = yield* staging(g, { ...fr, env, alt: t.alt, grid: fr.phone ? best0 : null });
    if (set?.grid && !best0) best0 = set.grid;
    if (!set) continue;
    set.env = env; set.caps = t.caps; set.alt = t.alt;
    const bad = set.d.problems?.length ?? 0;
    if (!bad) return fr.phone ? yield* phoneFixSteps(g, fr, set, envFor) : set;
    if (!best || bad < best.bad || (bad === best.bad && set.d.cost < best.set.d.cost)) best = { set, bad };
    yield;
  }
  return fr.phone && best?.set ? yield* phoneFixSteps(g, fr, best.set, envFor) : best?.set ?? null;
}
/** Fix pass 3 H1, after the duel is chosen on a phone, rewritten after its critic: one search over the caps the rival
 *  may stand at (every wide rival, whose width caps it, floored to RIVAL_FLOOR px at its stand, `farMinH`, else as tall
 *  a step lower as the frame allows, else as it was) and your side's shrink (`nearK`, 3% a step to 0.61), each with
 *  your stand stepped out (up to LEAD_OUT, nearer or farther) and the rival's (1.6 m either way across, and back). The rival's
 *  opening card at least 1 - HIDE_MAX seen behind your opening card and its opaque matter (`SOLID`) is hard: no stand
 *  that hides more is kept while one that hides less exists. Of the stands that hold it, the cheapest: each rule broken
 *  costs 100 and its depth (the opening pair apart, the rival at most `tallSoft` of yours, your figure at its 120 px and
 *  over its leader, your foot on its line, every wide rival at RIVAL_FLOOR), then the least step and shrink, then every
 *  other pairing within `hideAny`, then both leaders beside their figures. Where no stand keeps the rival seen, the one
 *  that hides it least (if less than it was), named in `problems` ('rival hidden') and said on the console; a floor
 *  that cannot hold is named too ('rival under 75 px'). Solved a slice at a time inside `stageAsync`, so a phone's boot
 *  takes no long task. */
export function phoneFix(g, fr, set, envFor) { const it = phoneFixSteps(g, fr, set, envFor); let r = it.next(); while (!r.done) r = it.next(); return r.value; }
function* phoneFixSteps(g, fr, set, envFor) {
  if (!set?.d || !set.P || !envFor) return set;
  const T = CLASS.phone, P = set.P, d = set.d, RW = fr.right ?? fr.W, walk = g.walkable;
  const onFloor = (X, Z, r, n = 12) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; if (!inside(walk, X + r * Math.cos(a), Z + r * Math.sin(a))) return false; } return true; };
  const at = (X, Z, o) => { const f = project(P, X, Z), k = ppm(P, X, Z); return { x0: f.x - o.l * k, x1: f.x + o.r * k, y0: f.y - o.t * k, y1: f.y + o.b * k }; };
  const lapB = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const ar = (a) => Math.max(1e-6, (a.x1 - a.x0) * (a.y1 - a.y0));
  let caps = set.caps ?? fr.env?.caps ?? FIG_PHONE, env = set.env ?? fr.env, near = { ...d.near }, far = { ...d.far };
  const notes = [];
  const padOk = (S) => !circle(P, S.X, S.Z, PAD, 12).some(([px, py]) => py > fr.bottom - 4 || px < 0 || px > RW) && onFloor(S.X, S.Z, PAD);
  const inFrame = (b) => b.x0 >= 4 && b.x1 <= RW - 4 && b.y1 <= fr.bottom - 4 && b.y0 >= fr.top + 2;
  // ---- the leaders beside their figures (the class's spots round a stand, as the search tries them)
  const LE = env?.lead ?? fr.env?.lead;
  const lb = (L, k0) => { const f = project(P, L.X, L.Z), k = ppm(P, L.X, L.Z), q = LE?.[k0]?.reach ?? { l: LEADER.w / 2, r: LEADER.w / 2, t: LEADER.h }, r0 = LE?.[k0]?.rest ?? q; return { reach: { x0: f.x - q.l * k, x1: f.x + q.r * k, y0: f.y - q.t * k, y1: f.y }, rest: { x0: f.x - r0.l * k, x1: f.x + r0.r * k, y0: f.y - r0.t * k, y1: f.y } }; };
  const pickLead = (L0, S0, S, isNear, N, F, e, other) => {
    const k0 = isNear ? 'near' : 'far', mine = isNear ? e.near : e.far, theirs = isNear ? e.far : e.near, O = isNear ? F : N;
    const own = mine.cards?.[0] ? at(S.X, S.Z, mine.cards[0].o) : null, foes = (theirs.cards ?? []).map((c) => at(O.X, O.Z, c.o));
    const ob = other ? lb(other, isNear ? 'far' : 'near').rest : null;
    const why = globalThis.__fixWhy;
    // (what a spot breaks, weighed: 0 where it holds; the least is kept where none holds)
    const penL = (L) => {
      const b = lb(L, k0), no = (w, v) => { if (why) why[w] = (why[w] ?? 0) + 1; return v; };
      let p = 0;
      const outF = Math.max(0, 2 - b.reach.x0) + Math.max(0, b.reach.x1 - (RW - 2)) + Math.max(0, b.reach.y1 - (fr.bottom - 4)) + Math.max(0, fr.top + 2 - b.reach.y0);
      if (outF) p += no(`${k0} frame`, 1000 + outF);
      const dist = Math.hypot(L.X - S.X, L.Z - S.Z);
      if (dist < 0.9) p += no(`${k0} near`, 50 * (0.9 - dist) + 5);
      // (yours over at most a fifth of your first card in any pose, test 35; the rival's, as the search holds it: beside
      // its figure over at most 0.3 of it at rest, or a step behind it with half of itself or more in sight; a leader
      // behind a card it may not stand behind costs the most, since it is not seen)
      if (own) {
        const v = isNear ? lapB(b.reach, own) / ar(own) - 0.2 : L.Z > S.Z + 0.5 ? lapB(b.rest, own) / ar(b.rest) - 0.5 : lapB(b.rest, own) / ar(own) - 0.3;
        if (v > 0) p += no(`${k0} own`, 20 + 100 * v + (L.Z > S.Z ? 200 * v : 0));
      }
      const foe = foes.reduce((n, f) => n + lapB(b.rest, f) / ar(b.rest), 0);
      if (foe > 0) p += no(`${k0} foe`, 30 + 100 * foe);
      if (ob && lapB(b.rest, ob) > 0) p += no(`${k0} other`, 30);
      if (fr.strip && !isNear && lapB(b.rest, fr.strip) > 0) p += no(`${k0} strip`, 30);
      if (!onFloor(L.X, L.Z, LEADER.foot, 8)) p += no(`${k0} floor`, 2000);
      return p;
    };
    const cands = [{ X: L0.X + (S.X - S0.X), Z: L0.Z + (S.Z - S0.Z) }], sgn = isNear ? -1 : 1;
    for (const [o, b] of T[k0]) cands.push({ X: S.X + sgn * o, Z: S.Z + b });
    for (const [o, b] of [[0.3, 1.2], [0.6, 1.2], [0.9, 1.0], [0, 1.5], [0.6, 1.6]]) for (const t of [sgn, -sgn]) cands.push({ X: S.X + t * o, Z: S.Z + b });
    // (your leader a step before a wide figure, nearer the camera, where no spot beside or behind it holds)
    if (isNear) for (const [o, b] of [[0.6, -0.5], [0.9, -0.5], [0.3, -0.6], [1.2, -0.4], [0, -0.7], [0.6, -0.8]]) for (const t of [sgn, -sgn]) if (S.Z + b > 0.3) cands.push({ X: S.X + t * o, Z: S.Z + b });
    cands.push(L0);
    let best = null;
    for (const L of cands) { const p = penL(L); if (!best || p < best.p) best = { L, p }; if (!p) break; }
    return best && best.p < 2000 ? { L: best.L, ok: best.p === 0 } : null;
  };
  const leads = (N, F, e) => { const rl = pickLead(d.rl, d.far, F, false, N, F, e, null); if (!rl) return null; const yl = pickLead(d.yl, d.near, N, true, N, F, e, rl.L); return yl ? { rl: rl.L, yl: yl.L, ok: rl.ok && yl.ok } : null; };
  // ---- the hide test: your opening card with its matter (`so`) over the rival's opening card's opaque box; every
  // other pairing of the two teams is reported (`hideAll`), the duel's own search having held their envelopes apart
  const hideOf = (N, F, e, all = false) => {
    let worst = 0;
    for (const a of all ? e.near.cards ?? [] : (e.near.cards ?? []).slice(0, 1)) { const A = at(N.X, N.Z, a.so); for (const b of all ? e.far.cards ?? [] : (e.far.cards ?? []).slice(0, 1)) { const B = at(F.X, F.Z, b.o); worst = Math.max(worst, lapB(A, B) / ar(B)); } }
    return worst;
  };
  // (your figure keeps its size where it had it: test 34's 120 px and the hero over its leader, 1.15, a wide card 1.0)
  const c0 = env.near.cards?.[0], wideNear = c0 ? (c0.o.l + c0.o.r) / Math.max(1e-6, c0.o.t + c0.o.b) > 1.5 : false, leadH = LE?.near?.rest?.t ?? LEADER.h;
  const px0 = (env.near.h0 || 0) * ppm(P, near.X, near.Z), hero0 = (env.near.h0 || 0) / leadH;
  const kf = (F) => ppm(P, F.X, F.Z);
  const short = (e, F) => (e?.far?.cards ?? []).filter((c) => c.wide && c.h * kf(F) < RIVAL_FLOOR + 1);
  const first = (N, F, e) => { const a = e.near.cards?.[0], b = e.far.cards?.[0]; if (!a || !b) return 0; const B = at(F.X, F.Z, b.o); return lapB(at(N.X, N.Z, a.o), B) / ar(B); };
  const tallR = (N, F, e) => (e.near.h0 && e.far.h0 ? (kf(F) * e.far.h0) / (ppm(P, N.X, N.Z) * e.near.h0) : 0);
  const O = fr.open ?? { top: fr.top, bottom: fr.bottom }, oh = O.bottom - O.top;
  const footDev = (N) => { const y = project(P, N.X, N.Z).y; return T.foot ? Math.max(0, O.top + T.foot[0] * oh - y, y - (O.top + T.foot[1] * oh)) / oh : 0; };
  // (the rival's cards, their reticle 8% round and 10 px over their heads, never under the rival's plate strip)
  const ret = (b) => { const w = b.x1 - b.x0, h = b.y1 - b.y0; return { x0: b.x0 - 0.08 * w, x1: b.x1 + 0.08 * w, y0: b.y0 - 0.08 * h - 10, y1: b.y1 }; };
  const stripOk = (F, e) => !fr.strip || !(e.far.oboxes ?? []).some((o) => lapB(ret(at(F.X, F.Z, o)), fr.strip) > 0);
  const hide0 = hideOf(near, far, env), first0 = first(near, far, env), dev0 = footDev(near), short0 = short(env, far).length > 0;
  const tallSoft = T.tallSoft ?? 0.7, tallMax = Math.max(tallR(near, far, env), T.tall ?? 0.82);
  // ---- (1) and (2) as one search (fix pass 3 H1, after its critic): the caps the rival may stand at (floored where a
  // wide rival stands under RIVAL_FLOOR px, and as it was) and your side's shrink (`nearK`, 3% a step to 0.61), each
  // with your stand stepped out (up to LEAD_OUT, and nearer or farther) and the rival's (1.6 m either way across, where
  // a floored rival's wider union stands in the frame only nearer the middle, and back). The
  // rival at least 1 - HIDE_MAX seen is hard: a stand that hides more is never kept while one that hides less exists.
  // Of the stands that hold it, the cheapest: the opening pair apart, the rival at most `tallSoft` of yours, your
  // figure at its size and its foot on its line, the rival floored, the least step and shrink; then the leaders.
  // (the floor a ladder: RIVAL_FLOOR, then a step lower at a time, so where the floored rival's wider union cannot stand
  // beside yours with the rival seen, it stands as tall as one that can)
  const floors = short0 ? [...[RIVAL_FLOOR + 2, 70, 63, 56, 49].map((px) => ({ ...caps, farMinH: +(px / kf(far)).toFixed(3) })), caps] : [caps];
  const lowRival = (e, F) => Math.min(Infinity, ...(e?.far?.cards ?? []).filter((c) => c.wide).map((c) => c.h * kf(F)));
  const ks = [0]; for (let k = 0.97; k >= 0.61 - 1e-9; k -= 0.03) ks.push(+k.toFixed(2));
  const dir = far.X > near.X ? -1 : 1;
  const nSteps = [], fSteps = [];
  for (let a = 0; a <= LEAD_OUT + 1e-9; a += 0.1) for (const dz of [0, -0.2, 0.2, -0.4, 0.4, -0.6]) nSteps.push({ X: near.X + dir * +a.toFixed(1), Z: near.Z + dz, s: a + Math.abs(dz) });
  for (let b = -1.6; b <= 1.6 + 1e-9; b += 0.1) for (const dz of [0, 0.3, -0.3, 0.6, 0.9]) fSteps.push({ X: far.X - dir * +b.toFixed(1), Z: far.Z + dz, s: Math.abs(b) + Math.abs(dz) });
  const padC = new Map(), padOkC = (S) => { const k = `${S.X.toFixed(2)},${S.Z.toFixed(2)}`; if (!padC.has(k)) padC.set(k, padOk(S)); return padC.get(k); };
  let top = [], low = null, n = 0;
  const keep = (c) => { top.push(c); if (top.length > 400) { top.sort((p, q) => p.cost - q.cost); top = top.slice(0, 40); } };
  for (const c of floors) {
    const floored = Boolean(c.farMinH);
    const eF = floored ? envFor({ ...c }) : env;
    const Fs = fSteps.filter((F) => inFrame(at(F.X, F.Z, eF.far)) && stripOk(F, eF) && padOkC(F));
    for (const kk of ks) {
      const c2 = kk ? { ...c, nearK: kk } : c, e = kk ? envFor(c2) : eF;
      const Ns = nSteps.filter((N) => inFrame(at(N.X, N.Z, e.near)) && padOkC(N));
      if (sliced()) yield;
      for (const N of Ns) {
        const hPx = (e.near.h0 || 0) * ppm(P, N.X, N.Z), hero = (e.near.h0 || 0) / leadH;
        const lowPx = Math.max(0, Math.min(T.minH, px0) - 0.5 - hPx), lowHero = Math.max(0, Math.min(wideNear ? 1.0 : HERO, hero0) - 1e-6 - hero), fd = Math.max(0, footDev(N) - Math.max(dev0, 0.015));
        const own = (lowPx ? 100 + 10 * lowPx : 0) + (lowHero ? 100 + 400 * lowHero : 0) + (fd ? 100 + 1000 * fd : 0) + 40 * (kk ? 1 - kk : 0);
        for (const F of Fs) {
          if (++n % 256 === 0 && sliced()) yield;
          if (!(F.Z > N.Z + 0.25) || Math.hypot(F.X - N.X, F.Z - N.Z) < 2 * PAD) continue;
          const tr = tallR(N, F, e);
          if (tr > tallMax + 1e-9) continue;
          const h = hideOf(N, F, e), lr = Math.max(0, RIVAL_FLOOR - 0.5 - lowRival(e, F)), sh = lr > 0;
          const f = first(N, F, e);
          // (each rule a stand breaks costs 100 and its depth after, so the fewest break; a wide rival under RIVAL_FLOOR costs
          // 300, H1's own check: at 100 the search kept Mailroom at 63-70 px at 390 for a foot line or a leader's spot; and a
          // stand stepped back that drops a wide rival under the floor costs it too, where the rival stood over it before)
          const cost = own + (f > 1e-6 ? 100 + 300 * f : 0) + (tr > tallSoft + 1e-9 ? 100 + 1000 * (tr - tallSoft) : 0) + (sh ? 300 + 10 * lr : 0) + 4 * (N.s + F.s);
          const cand = { N: { X: N.X, Z: N.Z }, F: { X: F.X, Z: F.Z }, e, c: c2, h, f, cost, floored, kk };
          if (h <= HIDE_MAX + 1e-9) keep(cand);
          else if (!low || h < low.h - 1e-9 || (Math.abs(h - low.h) <= 1e-9 && cost < low.cost)) low = cand;
        }
      }
    }
  }
  // (the leaders beside their figures, the cheapest stands first; a stand whose leaders find no clean spot costs 80)
  top.sort((p, q) => p.cost - q.cost);
  let got = null;
  for (const t of top.slice(0, 40)) {
    if (got && t.cost >= got.cost) break;
    if (++n % 4 === 0 && sliced()) yield;
    // (every other pairing of the two teams within the class's `hideAny` where it can be, as the duel's search held it)
    const hA = hideOf(t.N, t.F, t.e, true), cA = hA > (T.hideAny ?? HIDE_MAX) + 1e-9 ? 100 + 100 * hA : 0;
    if (got && t.cost + cA >= got.cost) continue;
    const l = leads(t.N, t.F, t.e);
    if (!l) continue;
    const cost = t.cost + cA + (l.ok ? 0 : 100);
    if (!got || cost < got.cost) got = { ...t, l, cost };
  }
  let hide = hide0, L = null;
  // (no stand keeps the rival seen: the one that hides it least, where that is less than it was, and the solve says so)
  if (!got && low && low.h < hide0 - 1e-9) { const l = leads(low.N, low.F, low.e); got = { ...low, l }; }
  if (got) {
    caps = got.c; env = got.e;
    if (got.floored) notes.push(`rival floored (${Math.round(lowRival(got.e, got.F))} px)${got.F.X !== far.X || got.F.Z !== far.Z ? ' and stepped' : ''}`);
    else if (got.F.X !== far.X || got.F.Z !== far.Z) notes.push('rival stepped out');
    if (got.N.X !== near.X || got.N.Z !== near.Z) notes.push('your stand stepped out');
    if (got.kk) notes.push(`your side at ${got.kk}`);
    near = got.N; far = got.F; hide = got.h; L = got.l;
  } else L = leads(near, far, env);
  if (hide > HIDE_MAX + 1e-9) globalThis.console?.warn?.(`[arena] phone duel: the rival's first card stays ${Math.round(100 * hide)}% hidden (no stand on this floor keeps it ${Math.round(100 * (1 - HIDE_MAX))}% seen)`);
  // (no spot for a leader: it keeps its place beside its figure where that stays in the frame, else where it stood)
  const keepL = (L0, S0, S, k0) => { const m = { X: L0.X + (S.X - S0.X), Z: L0.Z + (S.Z - S0.Z) }, b = lb(m, k0).reach; return b.x0 >= 2 && b.x1 <= RW - 2 && b.y0 >= fr.top + 2 && b.y1 <= fr.bottom - 4 ? m : L0; };
  const out = { ...set, caps, env, d: { ...d, near, far, yl: L?.yl ?? keepL(d.yl, d.near, near, 'near'), rl: L?.rl ?? keepL(d.rl, d.far, far, 'far'), hide: +hide.toFixed(3), hideWas: +hide0.toFixed(3), hideAll: +hideOf(near, far, env, true).toFixed(3), fix: notes.length ? notes : undefined } };
  // (the duel's own problems that the fix-up re-measures at the stands it keeps: the opening pair apart and every pair
  // within HIDE_MAX, the rival's share, your foot on its line; the rest stand as the search named them)
  const moved = near.X !== d.near.X || near.Z !== d.near.Z || far.X !== d.far.X || far.Z !== d.far.Z || caps !== (set.caps ?? caps);
  const again = { 'figures overlap': first(near, far, env) > 1e-6 || hideOf(near, far, env, true) > (T.hideAny ?? HIDE_MAX) + 1e-9, 'rival over 0.7 of yours': tallR(near, far, env) > tallSoft + 1e-9, 'rival too tall': tallR(near, far, env) > (T.tall ?? 0.82) + 1e-9, 'near foot off its line': footDev(near) > 0.015 };
  const probs = (d.problems ?? []).filter((p) => !(moved && p in again));
  if (moved) for (const [p, bad] of Object.entries(again)) if (bad) probs.push(p);
  if (hide > HIDE_MAX + 1e-9) probs.push('rival hidden');
  if ((env?.far?.cards ?? []).some((c) => c.wide && c.h * kf(far) < RIVAL_FLOOR - 0.5)) probs.push('rival under 75 px');
  out.d.problems = probs;
  return out;
}
function* staging(g, fr) {
  let best = null;
  // (round 6 fix H4: a wide screen's painting row at 31 to 46% of the frame, every 3%, so each map's camera finds the
  // row where the heroes stand at their size with their pads at 62 to 68% of the height; round 5 held it at 28%, and
  // the stage was empty under them. The coarse pass runs once a share)
  const ats = fr.phone ? CLASS.phone.ats : fr.alt ? [0.4, 0.34, 0.28] : [0.46, 0.43, 0.4, 0.37, 0.34, 0.31];
  const sizes = fr.phone ? CLASS.phone.sizes : [1];
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
  const grid = fr.grid ? fr.grid.map((t) => [t.at, t.m]) : ats.flatMap((at) => sizes.map((m) => [at, m]));
  for (const [at, m] of grid) { yield* run(at, m, 8, { coarse: true, bound: Infinity }); yield; }
  if (!tried.length) for (const [at, m] of grid) { yield* run(at, m, 8, { coarse: true, wide: true, bound: Infinity }); yield; }
  const top = tried.sort((a, b) => a.cost - b.cost).slice(0, 4);
  const win = (p) => ({ x0: p.x - 0.07 * fr.W, x1: p.x + 0.07 * fr.W, y0: p.y - 28, y1: p.y + 28 });
  best = null;
  for (const t of top) { yield* run(t.at, t.m, 4, { win: { near: win(t.n), far: win(t.f) } }); yield; }
  if (!best) yield* run(top[0].at, top[0].m, 4, { wide: true });
  if (best) best.grid = top.map(({ at, m }) => ({ at, m }));
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
