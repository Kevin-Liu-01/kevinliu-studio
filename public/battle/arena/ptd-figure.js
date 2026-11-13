// Princeton TD on the Arena floor (ROUND6.md section 3.1): the game's own tower sprite, drawn live in a module Worker
// (arena/ptd-worker.js) on an OffscreenCanvas, with the 45 stills (media/figures/princeton-td/forms/) for reduced
// motion, the Mat, flashes, shadows and every moment before the first live frame. The page imports this module lazily,
// and only when a team holds princeton-td.
//
// Modes, chosen once for the page: 'worker' (the canvas is handed to the worker after a 35-form smoke there), 'main'
// (no OffscreenCanvas in workers, or the smoke failed: the sprite is imported on an idle callback after the first
// command and drawn in the page's own animation frame, behind a cost governor), 'still' (not live: reduced motion,
// deviceMemory <= 4, Save-Data, ?ptd=still, or the governor tripped). A figure always shows its still until its first
// live frame, as the canvas's own background, so the box never changes (CLS 0).
//
// The clock: a figure's time is F = base + V, V the battle's clock (window.battlePace: virtual time, its rate, frozen
// or not), held while the figure is frozen; step(ms) moves only this figure's F on. Aim and fire are in F, so a paused
// battle, a sped-up Auto and a judge's frozen clock all draw the same frames.

const FORMS = new URL('../media/figures/princeton-td/forms/', import.meta.url);
const SPRITE = new URL('./ptd-sprite.js', import.meta.url).href;
const SVG = 'http://www.w3.org/2000/svg';
const MAX_W = 600, MAX_H = 900;
const q = new URLSearchParams(location.search);
const DEBUG = q.has('debug');
const coarse = () => matchMedia('(pointer: coarse)').matches;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const pace = () => window.battlePace;
const vNow = () => pace()?.now?.() ?? performance.now();
const vRate = () => { const p = pace(); return p ? (p.manual ? 0 : p.rate) : 1; };
const realTimeout = (f, ms) => (pace()?.realTimeout ?? setTimeout)(f, ms);
/** Real time, never the battle's: shared/pace.js replaces performance.now with the scene clock (scaled by the speed,
 *  stopped when frozen), so every cost this module measures reads the original. */
const realNow = () => (pace()?.realNow ?? performance.now.bind(performance))();
const idle = (f, timeout) => (window.requestIdleCallback ? window.requestIdleCallback(f, { timeout }) : realTimeout(f, Math.min(300, timeout)));
/** The battle's clock as the worker needs it with every message that carries a time: a frozen battle's clock moves
 *  only by battlePace.step, so the worker could otherwise hold an old one. */
const clockOf = () => ({ virt: vNow(), rate: vRate() });

/** The game's level badge colours (rendering/towers/index.ts 393-404): its gold star and the numeral's brown. */
const STAR = { fill: '#c9a227', edge: '#8b6914', ink: '#241800', halo: '#fbeaa8' };
const ACCENT = { cannon: '#f87171', station: '#a78bfa', library: '#67e8f9', mortar: '#fb923c', lab: '#facc15', arch: '#60a5fa', club: '#f59e0b' };
const AIMING = new Set(['cannon', 'mortar']);

/** Whether this page may run the live sprite at all (ROUND6 3.1): never under reduced motion, on a device with 4 GB
 *  or less, with Save-Data, or with ?ptd=still. */
export function liveAllowed() {
  if (q.get('ptd') === 'still' || reduced()) return false;
  if ((navigator.deviceMemory ?? 8) <= 4 || coarse()) return false; // kevinliu.studio phone memory: a touch screen shows the stills (scripts/phone-memory.mjs)
  if (navigator.connection?.saveData) return false;
  return true;
}

const S = {
  forms: null, mode: null, worker: null, smoke: null, sprite: null, figures: new Set(), nextId: 1, draws: [],
  log: [], frames: 0, io: null, clockTimer: 0, clockSeen: null, mainMs: 0, paceSeq: 0, paceDone: new Map(), settled: Promise.resolve(0),
  stills: new Map(), stillSeq: 0, stillUsed: false,
};
const note = (m) => { S.log.push(m); if (DEBUG) console.info(`ptd: ${m}`); };
if (DEBUG) window.__ptd = S;

/** forms.json (written by tools/ptd/render-stills.mjs): every form's views, anchors, footprint and aim. */
/** Debug: the worker's own frame counts per figure (the page sees none of its frames otherwise). */
export const workerStats = () => (S.worker ? new Promise((ok) => { S.statsDone = ok; S.worker.postMessage({ t: 'stats' }); }) : Promise.resolve([]));
export const loadForms = () => (S.forms ??= fetch(new URL('forms.json', FORMS)).then((r) => r.json()).then((d) => (S.data = d)));
export const parseKey = (key) => {
  const [type, l = '1'] = String(key ?? 'lab-1').split('-');
  return { type, level: /^\d$/.test(l) ? Number(l) : l, num: Number(l[0]), branch: /[ab]$/.test(l) ? l.slice(-1) : '' };
};
const angle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// ---------------------------------------------------------------- the worker, shared by every figure on the page
function startWorker() {
  if (S.smoke) return S.smoke;
  const ok = typeof OffscreenCanvas === 'function' && typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';
  if (q.get('ptd') === 'main') { note('?ptd=main: main-thread fallback'); return (S.smoke = Promise.resolve(false)); }
  if (!ok) { note('no OffscreenCanvas transfer: main-thread fallback'); return (S.smoke = Promise.resolve(false)); }
  S.smoke = new Promise((done) => {
    let w;
    try { w = new Worker(new URL('./ptd-worker.js', import.meta.url), { type: 'module' }); }
    catch (e) { note(`no module worker (${e.message}): main-thread fallback`); done(false); return; }
    const t = realTimeout(() => { note('worker smoke timed out: main-thread fallback'); w.terminate(); done(false); }, 20000);
    w.onerror = (e) => { clearTimeout(t); note(`worker error (${e.message ?? 'load'}): main-thread fallback`); w.terminate(); done(false); };
    w.onmessage = (e) => {
      const m = e.data;
      if (m.t !== 'smoke') return;
      clearTimeout(t);
      if (!m.ok) { note(`worker smoke failed (${m.message}): main-thread fallback`); w.terminate(); done(false); return; }
      note(`worker smoke: ${m.forms} forms in ${m.ms.toFixed(1)} ms`);
      S.worker = w;
      w.onmessage = onWorker;
      w.onerror = (e2) => note(`worker error: ${e2.message}`);
      postClock(true);
      done(true);
    };
    w.postMessage({ t: 'smoke', sprite: SPRITE });
  });
  return S.smoke;
}
/** The page's one Princeton TD worker (fixes-2 I1): the board's live figures and every scene's form still share it, so
 *  the sprite is fetched once, by the worker, and never parsed on the main thread. Resolves to the worker once its
 *  smoke passes, or null where it cannot run (no OffscreenCanvas transfer, ?ptd=main, the smoke failed). */
export function ptdWorker() { return startWorker().then((ok) => (ok ? S.worker : null)); }
/** Let the worker go once nothing needs it: no figure on the board and no still being drawn (critic of fixes-2 I1: a
 *  worker that had drawn a still lived on with its sprite heap, about 10.6 MB, through later battles without Princeton
 *  TD). The page calls it at the deal of a battle with no forms on either side; a figure's dispose calls it when no
 *  still was ever drawn. Inside a battle with Princeton TD the worker stays, so the sprite is fetched once. */
export function ptdRetire(wanted = false) {
  // (fixes-3 I10) the page asks with `wanted` once no forms card can play again in this battle: a figure still standing
  // or a still being drawn defers it, and the last figure's dispose or the last still's answer lets the worker go then
  if (wanted) S.retireWanted = true;
  if (S.figures.size || !S.worker || S.stills.size) return false;
  S.worker.terminate(); S.worker = null; S.smoke = null; S.mode = null; S.stillUsed = false; S.retireWanted = false; clearTimeout(S.clockTimer);
  note('worker retired: no figure and no still left');
  return true;
}
/** A battle with a forms card again (a new deal): a deferred retire is called off. */
export function ptdKeep() { S.retireWanted = false; }
/** A form drawn at scene size in the worker and cropped there to its opaque box (`job`: type, level, the view's w, h,
 *  tile, box and feather, zoom, rotation and the scale k), returned as an encoded picture: { blob, w, h } in device px,
 *  or null when the worker cannot draw it or takes more than 8 s of real time. The main thread only decodes it. */
export function ptdStill(job) {
  return ptdWorker().then((w) => (w ? new Promise((done) => {
    const id = `still-${++S.stillSeq}`;
    const t = realTimeout(() => { S.stills.delete(id); done(null); if (S.retireWanted) ptdRetire(); }, 8000);
    S.stills.set(id, (m) => { clearTimeout(t); S.stills.delete(id); done(m.ok && m.blob ? { blob: m.blob, w: m.rect[2], h: m.rect[3] } : null); if (S.retireWanted) ptdRetire(); });
    S.stillUsed = true;
    w.postMessage({ t: 'still', id, sprite: SPRITE, ...job });
  }) : null), () => null);
}
function onWorker(e) {
  const t0 = realNow();
  try { onWorkerMsg(e.data); } finally { S.mainMs += realNow() - t0; }
}
function onWorkerMsg(m) {
  if (m.t === 'stats') { S.statsDone?.(m.figs); S.statsDone = null; return; }
  if (m.t === 'still') { S.stills.get(m.id)?.(m); return; }
  if (m.t === 'paced') { S.paceDone.get(m.n)?.(m.n); S.paceDone.delete(m.n); return; }
  if (m.t === 'error') { note(`worker: ${m.message}`); }
  for (const f of S.figures) if (f.id === m.id) f.onFrame(m);
}
/** The battle's clock to the worker, whenever its rate changes or, while it is frozen, whenever it has been stepped (a
 *  poll every 250 ms of real time, only while a figure runs live in the worker: no work on the page's frames). */
function postClock(force = false) {
  const t0 = realNow();
  const c = clockOf(), key = `${c.rate}:${c.rate ? '' : c.virt}`;
  if (S.worker && (force || key !== S.clockSeen)) { S.clockSeen = key; S.worker.postMessage({ t: 'clock', ...c }); }
  clearTimeout(S.clockTimer);
  if (S.worker && S.figures.size) S.clockTimer = realTimeout(() => postClock(), 250);
  S.mainMs += realNow() - t0;
}

/** A frozen battle stepped on (battlePace.step, the judges' and recorders' clock): every running figure draws the frame
 *  for the new time. Resolves once each has drawn (a worker frame is acknowledged), so a still taken after `settle()`
 *  is exact; `__battle.ptdFrame` (under ?debug) counts these steps. Installed on battlePace.step once a figure exists. */
function paceStep() {
  const n = ++S.paceSeq;
  const work = [];
  for (const f of S.figures) if (f.mode === 'main' && f.running()) f.drawMain();
  if (S.worker && [...S.figures].some((f) => f.mode === 'worker')) {
    const c = clockOf();
    S.clockSeen = `${c.rate}:${c.rate ? '' : c.virt}`;
    work.push(new Promise((ok) => { S.paceDone.set(n, ok); S.worker.postMessage({ t: 'clock', ...c, draw: n }); }));
  }
  return (S.settled = Promise.all(work).then(() => { if (DEBUG && window.__battle) window.__battle.ptdFrame = n; return n; }));
}
function hookPace() {
  const p = pace();
  if (!p || p.__ptdHooked || typeof p.step !== 'function') return;
  const step = p.step;
  p.step = function (ms) { const r = step.apply(this, arguments); if (S.figures.size) paceStep(); return r; };
  p.__ptdHooked = true;
}
/** Resolves when every figure has drawn the battle clock's last step (await it after battlePace.step for a still). */
export const settle = () => S.settled;

// ---------------------------------------------------------------- the main-thread fallback
let mainRaf = 0, mainDue = 0;
function mainLoop(ts) {
  mainRaf = 0;
  if (S.mode !== 'main' || !S.sprite) return;
  let any = false;
  const now = vNow();
  if (now >= mainDue && vRate() > 0) {
    mainDue = now + 1000 / (coarse() ? 15 : 30) * Math.max(0.25, vRate()) * 0.98;
    for (const f of S.figures) if (f.running() && !f.st.frozen) { governed(() => f.drawMain()); any = true; }
  }
  for (const f of S.figures) if (f.running()) any = true;
  if (any && S.mode === 'main') mainRaf = requestAnimationFrame(mainLoop);
}
function kickMain() { if (S.mode === 'main' && S.sprite && !mainRaf) mainRaf = requestAnimationFrame(mainLoop); }
/** The governor (ROUND6 3.1): the p75 of the last 30 main-thread draws over 6 ms (9 on a coarse pointer) sends the
 *  battle to its stills. */
function governed(fn) {
  const t0 = realNow();
  fn();
  const d = realNow() - t0;
  S.draws.push(d);
  if (S.draws.length > 30) S.draws.shift();
  if (S.draws.length === 30) {
    const p75 = [...S.draws].sort((a, b) => a - b)[22];
    if (p75 > (coarse() ? 9 : 6)) {
      note(`governor: p75 ${p75.toFixed(2)} ms a draw: stills for this battle`);
      S.mode = 'still';
      for (const f of S.figures) f.toStill();
    }
  }
}
let mainAsked = false;
function startMain() {
  if (mainAsked) return;
  mainAsked = true;
  const t0 = realNow();
  // A first draw compiles the game's renderers (about 45 ms for the heaviest forms, one long frame): the code is warmed
  // in pieces on idle callbacks first (a small cheap form for the shared helpers, then each standing form at a tiny
  // size), and the figures wake one per callback, so no single task holds a frame.
  const warm = (m) => {
    const c = document.createElement('canvas');
    c.width = c.height = 24;
    const g = c.getContext('2d');
    const jobs = [{ type: 'club', level: 1 }];
    for (const f of S.figures) if (f.key) { const k = parseKey(f.key); if (!jobs.some((j) => j.type === k.type && j.level === k.level)) jobs.push({ type: k.type, level: k.level }); }
    return jobs.reduce((p, j) => p.then(() => new Promise((ok) => idle(() => { const t1 = realNow(); try { m.drawForm(g, { ...j, x: 12, y: 20, zoom: 0.08, time: 0.5 }); } catch {} if (DEBUG) note(`warm ${j.type}-${j.level} ${(realNow() - t1).toFixed(1)} ms`); ok(); }, 500))), Promise.resolve()).then(() => { c.width = c.height = 0; });
  };
  const go = () => import(SPRITE).then(async (m) => {
    note(`main-thread sprite loaded (${(realNow() - t0).toFixed(0)} ms after asking)`);
    await warm(m);
    S.sprite = m;
    for (const f of [...S.figures]) await new Promise((ok) => idle(() => { f.wake(); ok(); }, 500));
  }, (e) => { note(`sprite import failed (${e.message}): stills`); S.mode = 'still'; });
  idle(go, 2000);
}

// ---------------------------------------------------------------- shared pausing: a hidden tab, an offscreen figure
document.addEventListener('visibilitychange', () => { for (const f of S.figures) f.sync(); });
function observe(f) {
  if (typeof IntersectionObserver !== 'function') return;
  S.io ??= new IntersectionObserver((list) => {
    for (const e of list) for (const g of S.figures) if (g.canvas === e.target) { g.st.offscreen = !e.isIntersecting; g.sync(); }
  });
  S.io.observe(f.canvas);
}

// ---------------------------------------------------------------- the badge and the scaffold
function star(n) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 4 : 8, a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`);
  }
  // the game's gold star and brown edge; the numeral in a near-black ink with a pale halo (about 8:1 on the gold), as
  // large as the star's body allows, so the level reads at Arena size
  return `<svg viewBox="-10 -10 20 20" class="ptd-star" aria-hidden="true"><polygon points="${pts.join(' ')}" fill="${STAR.fill}" stroke="${STAR.edge}" stroke-width="0.8" stroke-linejoin="round"/><text x="0" y="0.9" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="800" font-size="9.4" fill="${STAR.ink}" stroke="${STAR.halo}" stroke-width="0.9" paint-order="stroke" stroke-linejoin="round">${n}</text></svg>`;
}
function branchMark(b, accent) {
  if (!b) return '';
  const shape = b === 'a' ? '<rect x="-4.6" y="-4.6" width="9.2" height="9.2" transform="rotate(45)"/>' : '<circle r="5"/>';
  return `<svg viewBox="-7 -7 14 14" class="ptd-branch" aria-hidden="true"><g fill="${accent}" stroke="#1b1712" stroke-width="1">${shape}</g></svg>`;
}
/** The scaffold in the sprite's isometry (2:1), round the form's footprint, up its envelope: 4 poles and 3 ties, 2 px in
 *  the tower's accent over a dark keyline. Poles in order left, back, right, front; ties bottom to top; each path's length is 1, so
 *  a dash can draw it (`.ptd-pole`, `.ptd-tie`). The back pole and the ties' far edges sit lighter, behind. */
function scaffoldSvg(svg, view, form, data, accent) {
  const z = data.zoom, env = { cannon: [70, 13], station: [95, 7], library: [102, 16], mortar: [62, 9], lab: [102, 18], arch: [130, 7], club: [92, 16] }[form.type];
  const lv = form.num || 4;
  // just outside the plinth (the footprint square's corners, on the plinth's top: the tile point)
  const hw = (data.forms[`${form.type}-${form.level}`]?.base?.w ?? 120) * 0.54;
  const [fx, fy] = view.tile ?? view.foot, top = Math.max(view.box[1], fy - (env[0] + lv * env[1]) * z * 0.92);
  const H = fy - top;
  const C = { l: [fx - hw, fy], b: [fx, fy - hw * 0.5], r: [fx + hw, fy], f: [fx, fy + hw * 0.5] };
  const at = (p, h) => [p[0], p[1] - h];
  const line = (a, b, cls, far) => `<path class="${cls}" pathLength="1" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}"${far ? ' opacity="0.45"' : ''}/>`;
  const poles = ['l', 'b', 'r', 'f'].map((k) => line(C[k], at(C[k], H), 'ptd-pole', k === 'b')).join('');
  const ties = [0.34, 0.64, 0.94].map((k) => {
    const h = H * k, p = (c) => at(C[c], h).map((v) => v.toFixed(1)).join(' ');
    return `<g class="ptd-tie"><path pathLength="1" d="M${p('l')}L${p('f')}L${p('r')}"/><path pathLength="1" opacity="0.45" d="M${p('r')}L${p('b')}L${p('l')}"/></g>`;
  }).join('');
  svg.setAttribute('viewBox', `0 0 ${view.w} ${view.h}`);
  // (round 6 fix H3: 2 px in the tower's accent over a 1 px dark keyline either side, so it reads on lava and on snow)
  svg.innerHTML = `<g fill="none" stroke="oklch(12% .01 75)" stroke-width="4" stroke-linecap="round" opacity="0.85" class="ptd-keyline">${poles}${ties}</g><g fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" opacity="0.95">${poles}${ties}</g>`;
  for (const p of svg.querySelectorAll('path')) p.setAttribute('vector-effect', 'non-scaling-stroke');
}

/** `fig` the Arena figure (its `foot`, `s`, `box` once placed), `side` 'player' | 'rival', `live` whether the sprite
 *  may run (the page's say; this module also refuses on its own grounds), `foe` the opposing figure (for aim). */
export function createPtdFigure(fig, { side, live = false, foe } = {}) {
  const id = S.nextId++;
  const canvas = document.createElement('canvas');
  canvas.className = 'ptd-canvas';
  canvas.width = canvas.height = 1;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' });
  const badge = document.createElement('span');
  badge.className = 'ptd-badge';
  badge.setAttribute('aria-hidden', 'true');
  Object.assign(badge.style, { display: 'inline-flex', alignItems: 'center', gap: '2px', pointerEvents: 'none' });
  const scaffold = document.createElementNS(SVG, 'svg');
  scaffold.setAttribute('class', 'ptd-scaffold');
  scaffold.setAttribute('aria-hidden', 'true');
  scaffold.setAttribute('preserveAspectRatio', 'none');
  Object.assign(scaffold.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', opacity: '0', transition: 'opacity 200ms linear' });

  let data = null, key = null, form = parseKey('lab-4b'), view = side === 'player' ? 'rear' : 'front', disposed = false;
  let mode = 'still';                       // this figure: 'still' | 'worker' | 'main'
  let shown = false;                        // a live frame is on the canvas (the still background is off)
  let scale = 1, setSeq = 0, liveAsked = false;
  const st = { paused: false, frozen: false, offscreen: false, base: 0, held: 0, aim: null, lastAttack: null, rotation: null, step: 0 };
  const steps = new Map();
  const wantLive = () => live && liveAllowed();
  const V = () => vNow();
  const F = () => (st.frozen ? st.held : st.base + V());
  st.base = -V();                           // F starts at 0
  const vOf = (k = key) => data?.forms[k]?.[view] ?? data?.forms[k]?.front;
  const nominal = () => (AIMING.has(form.type) ? data?.aims?.[view === 'rear' ? 'rear' : 'front'] ?? (view === 'rear' ? -Math.PI / 4 : Math.PI * 0.75) : 0);
  const running = () => !disposed && mode !== 'still' && shownAllowed() && !st.paused && !st.offscreen && !document.hidden;
  const shownAllowed = () => S.mode !== 'still';
  /** The rotation the picture shows: the still is filmed at the side's own aim, so until a live frame is drawn the
   *  turret (and every muzzle read off it) stays there, whatever aim() asked. */
  const drawnRot = (t) => (mode !== 'still' && shown ? rotNow(t) : nominal());

  const stillUrl = (v) => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    return new URL(r.height * dpr * 1.15 > v.h / 2 || !r.height ? v.src : v.lo, FORMS).href;
  };
  let still = null;
  const showStill = () => {
    const v = vOf();
    if (!v) return Promise.resolve();
    const url = stillUrl(v);
    // a live canvas draws the new form itself: its background stays off, or the still would ghost behind it
    if (!shown) canvas.style.backgroundImage = `url("${url}")`;
    // decoded stills held at once: this figure's current one (the browser's own cache keeps the background)
    still = new Image();
    still.decoding = 'async';
    still.src = url;
    return still.decode().catch(() => {});
  };
  const sizeNow = () => {
    const v = vOf();
    if (!v) return null;
    const r = canvas.getBoundingClientRect();
    // the main-thread fallback draws at 1 backing px a CSS px: its cost is the page's frame
    const dpr = Math.min(devicePixelRatio || 1, mode === 'worker' || S.mode === 'worker' ? 2 : 1);
    const want = r.height ? (r.height * dpr) / v.h : 1;
    scale = Math.max(0.25, Math.min(want, MAX_W / v.w, MAX_H / v.h, 1.5));
    return { w: v.w, h: v.h, scale, fps: coarse() ? 15 : 30 };
  };
  const formMsg = () => {
    const v = vOf();
    return { type: form.type, level: form.level, tile: v.tile, zoom: data.zoom, w: v.w, h: v.h, feather: v.feather };
  };
  const stepMark = (n) => { if (DEBUG && window.__battle) window.__battle.ptdFrame = n; };

  const self = {
    canvas, badge, scaffold, id, st,
    ready: null,
    get mode() { return mode; },
    get key() { return key; },
    running,
    /** Stand form `key` (e.g. 'lab-1', 'cannon-4a'). With `growFrom` the previous key of the same tower, the growth
     *  settle (ROUND6 5.4: the drawn (H(old)/H(new))^exp, `exp` the board's caps' formExp, to 1.03 to 1 over 180 ms, from
     *  the foot). Resolves when the new form shows. */
    async set(next, { growFrom, exp = 0.5 } = {}) {
      // the figure's own first stand and the board's mount are not commands; a later set (a build or an upgrade) is
      const asked = ++sets;
      await loadForms().then((d) => { data = d; });
      if (disposed || !data.forms[next]) return;
      const my = ++setSeq;
      const prev = key;
      if (growFrom || (asked > 2 && prev && prev !== next)) firstCommand();
      key = next;
      form = parseKey(next);
      canvas.dataset.form = next;
      paintBadge();
      scaffoldSvg(scaffold, vOf(), form, data, ACCENT[form.type]);
      st.rotation = nominal();
      st.aim = null;
      const decoded = showStill();
      if (mode === 'worker') {
        await decoded;
        if (my !== setSeq) return;
        await new Promise((ok) => { const n = ++st.step; steps.set(n, ok); S.worker.postMessage({ t: 'form', id, step: n, form: formMsg(), size: sizeNow(), rotation: st.rotation, ...clockOf() }); });
        if (foe) self.aim(null, 0);
      } else if (mode === 'main') { await decoded; if (my !== setSeq) return; resizeMain(); self.drawMain(); if (foe) self.aim(null, 0); }
      else await decoded;
      if (growFrom && prev && parseKey(growFrom).type === form.type && !reduced()) {
        const a = data.forms[growFrom]?.[view] ?? data.forms[growFrom]?.front, b = vOf();
        // (the drawn heights: growth compressed, H4 x (H / H4)^exp with the board's caps' `formExp` (ground.js formScale),
        // so the old over the new is (H(old) / H(new))^exp)
        const k = ((a.box[3] - a.box[1]) / (b.box[3] - b.box[1])) ** exp;
        canvas.style.transformOrigin = `${((b.foot[0] / b.w) * 100).toFixed(2)}% ${((b.foot[1] / b.h) * 100).toFixed(2)}%`;
        await canvas.animate([{ transform: `scale(${k.toFixed(4)})` }, { transform: 'scale(1.03)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' }).finished.catch(() => {});
      }
      if (!running() && mode === 'main') self.drawMain();
      if (S.figures.has(self) && mode === 'still' && wantLive()) goLive();
    },
    /** Turn the turret to `rad` (the sprite's rotation; null: toward `foe`) over `ms`, within the side's sweep. */
    aim(rad, ms = 150) {
      if (!AIMING.has(form.type) || !data) return;
      if (ms > 0 && !aiming) firstCommand();
      if (rad == null) {
        const a = fig?.foot, b = foe?.foot;
        if (!a || !b) return;
        rad = Math.atan2(2 * (b.y - a.y), b.x - a.x);
      }
      const n = nominal(), d = angle(rad - n), sw = data.sweep ?? Math.PI * 0.4;
      const to = n + Math.max(-sw, Math.min(sw, d));
      const t0 = F(), from = st.aim ? rotNow(t0) : st.rotation ?? n;
      st.aim = { from, to: from + angle(to - from), t0, ms };
      st.rotation = st.aim.to;
      if (mode === 'worker') S.worker.postMessage({ t: 'aim', id, ...st.aim, ...clockOf() });
    },
    /** The tower's own attack window, its motion peaking at `at` (the battle's clock, performance.now; default now). */
    fire(at = vNow()) {
      if (!data) return;
      if (foe && AIMING.has(form.type)) { aiming = true; self.aim(null, 120); aiming = false; }
      const peak = data.forms[key]?.fire?.[1] ?? 0;
      st.lastAttack = st.base + at - peak;
      if (mode === 'worker') S.worker.postMessage({ t: 'fire', id, lastAttack: st.lastAttack, ...clockOf() });
      firstCommand();
    },
    /** The scaffold while a barrier stands (its strokes at the contract's 0.8), or gone, over `ms`. */
    barrier(on, ms = 200) {
      scaffold.style.transitionDuration = `${reduced() ? 0 : ms}ms`;
      scaffold.style.opacity = on ? '1' : '0';
      scaffold.dataset.barrier = on ? 'true' : 'false';
    },
    pause(b) { st.paused = Boolean(b); self.sync(); },
    freeze(b) {
      b = Boolean(b);
      if (b === st.frozen) return;
      if (b) st.held = F(); else st.base = st.held - V();
      st.frozen = b;
      self.sync();
    },
    /** Move this figure's clock on by `ms` and resolve once that frame is drawn (a judge still: freeze first). */
    step(ms = 0) {
      if (st.frozen) st.held += ms; else st.base += ms;
      const n = ++st.step;
      if (mode === 'worker' && shown) return new Promise((ok) => { steps.set(n, ok); S.worker.postMessage({ t: 'step', id, step: n, base: st.base, held: st.held, frozen: st.frozen, ...clockOf() }); });
      if (mode === 'main' && S.sprite) { self.drawMain(); stepMark(n); return Promise.resolve(n); }
      return self.ready.then(() => { stepMark(n); return n; });
    },
    /** Where a shot leaves the tower, in board px (the turret's muzzle at its current aim for cannon and mortar). */
    muzzle() { return board(viewAnchor('anchor')); },
    /** The body's middle, the top of the tower, and where the badge stands, in board px. */
    anchors() {
      const v = vOf();
      return { muzzle: self.muzzle(), core: board(viewAnchor('core')), top: v ? board([v.foot[0], v.box[1]]) : null, badge: v ? board([v.foot[0], v.box[1] - 0.04 * (v.box[3] - v.box[1])]) : null };
    },
    /** The barrel's direction on screen (unit, board px), for the aim gate; null for a tower without one. */
    barrel() {
      if (!AIMING.has(form.type) || !data?.forms[key]?.aim) return null;
      const r = drawnRot(F()), tip = tipAt(r), c = pivot();
      const dx = tip[0] - c[0], dy = tip[1] - c[1], L = Math.hypot(dx, dy) || 1;
      return { x: dx / L, y: dy / L, rotation: r, live: mode !== 'still' && shown };
    },
    /** Show the tower from view `v` ('front' for the rival's aim, 'rear' for yours). */
    view(v) { if (v === view) return; view = v; if (key) self.set(key); },
    /** The side's grade applied in the worker (when the page's filter on a live canvas costs too much). */
    tint(t) { if (mode === 'worker') S.worker.postMessage({ t: 'tint', id, tint: t ?? null }); },
    sync() {
      const run = running();
      if (mode === 'worker') {
        S.worker.postMessage({ t: 'run', id, running: run, frozen: st.frozen, base: st.base, held: st.held, ...clockOf() });
        postClock(true);
      } else if (mode === 'main' && run) kickMain();
    },
    onFrame(m) {
      if (m.t === 'error') { note(`figure ${id}: ${m.message}`); if (m.step) steps.get(m.step)?.(m.step); return; }
      S.frames++;
      if (!shown && mode === 'worker') { shown = true; requestAnimationFrame(() => requestAnimationFrame(() => { if (shown && mode === 'worker') canvas.style.backgroundImage = 'none'; })); }
      if (m.step) { stepMark(m.step); steps.get(m.step)?.(m.step); steps.delete(m.step); }
    },
    drawMain() {
      if (!S.sprite || !data || !key || mode !== 'main') return;
      const v = vOf(), g = canvas.getContext('2d'), t = F();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.setTransform(scale, 0, 0, scale, 0, 0);
      S.sprite.drawForm(g, { type: form.type, level: form.level, x: v.tile[0], y: v.tile[1], zoom: data.zoom, time: t / 1000,
        attackAge: st.lastAttack == null ? Infinity : Math.max(0, t - st.lastAttack), rotation: drawnRot(t) });
      if (v.feather) S.sprite.featherEdges(g, v.w, v.h, v.feather);
      S.frames++;
      if (!shown) { shown = true; canvas.style.backgroundImage = 'none'; }
    },
    wake() {
      if (!(mode === 'still' && S.mode === 'main' && wantLive() && S.sprite)) return;
      mode = 'main'; resizeMain();
      const t0 = realNow(); self.drawMain(); if (DEBUG) note(`figure ${id}: first main-thread draw ${(realNow() - t0).toFixed(1)} ms`);
      self.sync();
    },
    toStill() {
      mode = 'still'; shown = false;
      if (canvas.dataset.transferred !== 'true') { canvas.width = canvas.height = 1; }
      showStill();
    },
    dispose() {
      disposed = true;
      S.figures.delete(self);
      if (mode === 'worker') S.worker?.postMessage({ t: 'drop', id });
      S.io?.unobserve(canvas);
      for (const ok of steps.values()) ok(0);
      steps.clear();
      if (still) still.src = '';
      if (canvas.dataset.transferred !== 'true') canvas.width = canvas.height = 0;
      canvas.remove(); badge.remove(); scaffold.remove();
      // (a worker that has drawn a scene's still stays: the page's crops keep using it, so the sprite is fetched once)
      if (!S.stillUsed || S.retireWanted) ptdRetire();
    },
  };

  const rotNow = (t) => {
    const a = st.aim;
    if (!a) return st.rotation ?? nominal();
    const k = a.ms > 0 ? Math.min(1, Math.max(0, (t - a.t0) / a.ms)) : 1;
    return a.from + (a.to - a.from) * (1 - (1 - k) ** 3);
  };
  /** The turret's calibration (cached per form): the film found a muzzle at eight aims, but where the barrel points at
   *  the viewer or another part moves more, its find is wrong. In the floor's unsquashed plane (y doubled) a true muzzle
   *  lies on its aim's ray from the turret's pivot; the pivot is fitted to the muzzles that do (least squares of their
   *  distance off their rays, starting from the mean), and each kept muzzle gives the barrel's length at its aim. */
  const calib = () => {
    if (cal?.key === key) return cal;
    const raw = data.forms[key].aim.map((p, i) => p && { r: -Math.PI + (i * Math.PI) / 4, q: [p[0], 2 * p[1]] }).filter(Boolean);
    let c = [raw.reduce((s, e) => s + e.q[0], 0) / raw.length, raw.reduce((s, e) => s + e.q[1], 0) / raw.length], keep = raw;
    for (let pass = 0; pass < 3; pass++) {
      keep = raw.filter((e) => Math.abs(angle(Math.atan2(e.q[1] - c[1], e.q[0] - c[0]) - e.r)) < 0.7);
      if (keep.length < 3) { keep = raw; break; }
      // n . c = n . q for each kept muzzle, n the normal to its aim's ray
      let a = 0, b = 0, d = 0, x = 0, y = 0;
      for (const e of keep) { const n = [-Math.sin(e.r), Math.cos(e.r)], t = n[0] * e.q[0] + n[1] * e.q[1]; a += n[0] * n[0]; b += n[0] * n[1]; d += n[1] * n[1]; x += n[0] * t; y += n[1] * t; }
      const det = a * d - b * b;
      if (Math.abs(det) < 1e-6) break;
      c = [(d * x - b * y) / det, (a * y - b * x) / det];
    }
    const len = keep.map((e) => ({ r: e.r, R: Math.max(0, (e.q[0] - c[0]) * Math.cos(e.r) + (e.q[1] - c[1]) * Math.sin(e.r)) })).sort((m, n) => m.r - n.r);
    return (cal = { key, c: [c[0], c[1] / 2], len });
  };
  /** The calibrated muzzle at rotation r: on r's ray from the pivot, at the barrel's length there (interpolated between
   *  the kept aims, round the circle); view px. */
  const tipAt = (r) => {
    const v = vOf(), { c, len } = calib();
    r = angle(r);
    let lo = len[len.length - 1], hi = len[0];
    for (let i = 0; i < len.length; i++) if (len[i].r <= r) { lo = len[i]; hi = len[(i + 1) % len.length]; }
    const span = (hi.r - lo.r + 2 * Math.PI) % (2 * Math.PI) || 2 * Math.PI, k = ((r - lo.r + 2 * Math.PI) % (2 * Math.PI)) / span;
    const R = lo.R + (hi.R - lo.R) * k;
    return [v.tile[0] + (c[0] + R * Math.cos(r)) * data.zoom, v.tile[1] + (c[1] + (R * Math.sin(r)) / 2) * data.zoom];
  };
  const pivot = () => { const v = vOf(), { c } = calib(); return [v.tile[0] + c[0] * data.zoom, v.tile[1] + c[1] * data.zoom]; };
  const viewAnchor = (k) => {
    const v = vOf();
    if (!v) return null;
    if (k === 'anchor' && AIMING.has(form.type) && data.forms[key].aim) return tipAt(drawnRot(F()));
    return v.fx[k];
  };
  const board = (p) => {
    const v = vOf(), foot = fig?.foot;
    if (!p || !v || !foot) return { x: foot?.x ?? 0, y: (foot?.y ?? 0) - (fig?.h ?? 0) * 0.9 };
    const s = fig.s ?? (fig.box ? fig.box.h / (v.box[3] - v.box[1]) : 1);
    return { x: foot.x + (p[0] - v.foot[0]) * s, y: foot.y + (p[1] - v.foot[1]) * s };
  };
  const resizeMain = () => { const z = sizeNow(); if (z) { canvas.width = Math.round(z.w * z.scale); canvas.height = Math.round(z.h * z.scale); } };
  function paintBadge() {
    badge.dataset.level = String(form.num);
    badge.dataset.branch = form.branch;
    badge.dataset.form = key;
    badge.innerHTML = star(form.num) + branchMark(form.branch, ACCENT[form.type]);
  }
  let commanded = false, sets = 0, aiming = false, cal = null;
  /** The battle's first command to this tower (a fire, a turn of its turret, a build or an upgrade): the main-thread
   *  fallback imports the sprite only then, never in the deal or the entrances (test 26). */
  function firstCommand() { if (commanded) return; commanded = true; if (S.mode === 'main' && wantLive()) startMain(); }

  /** Live: the worker after its smoke, else the main-thread fallback once the first command is in. */
  function goLive() {
    if (liveAsked || disposed || mode !== 'still' || !wantLive() || S.mode === 'still') return;
    liveAsked = true;
    idle(async () => {
      if (disposed || mode !== 'still') return;
      const ok = await startWorker();
      if (disposed || mode !== 'still') return;
      if (ok && S.mode !== 'still') {
        S.mode = 'worker';
        const size = sizeNow();
        let off;
        try { off = canvas.transferControlToOffscreen(); } catch (e) { note(`transfer failed (${e.message}): main-thread fallback`); S.mode = 'main'; if (commanded) startMain(); self.wake(); return; }
        canvas.dataset.transferred = 'true';
        mode = 'worker';
        const n = ++st.step;
        await new Promise((done) => {
          steps.set(n, done);
          S.worker.postMessage({ t: 'add', id, canvas: off, step: n, size, form: formMsg(), fps: size.fps, base: st.base, frozen: st.frozen, held: st.held, running: running(), rotation: st.rotation ?? nominal(), ...clockOf() }, [off]);
        });
        if (foe) self.aim(null, 0);
        self.sync();
        if (typeof ResizeObserver === 'function') {
          let last = scale;
          new ResizeObserver(() => { const z = sizeNow(); if (z && Math.abs(z.scale - last) / last > 0.1 && mode === 'worker') { last = z.scale; S.worker.postMessage({ t: 'size', id, size: z }); } }).observe(canvas);
        }
      } else if (S.mode !== 'still') {
        S.mode = 'main';
        if (commanded) startMain();
        self.wake();
      }
    }, 1500);
  }

  S.figures.add(self);
  hookPace();
  observe(self);
  self.ready = self.set('lab-4b');
  return self;
}
