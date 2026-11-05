// The ground's shell: the one ground file a gallery page loads up front (about 2 KB). It holds the Ground API's
// no-GPU half, what a page without a GPU uses (the room's placement, roomAt and ROOM, and far), and stands in for the
// rest: nothing is available, pours and prints answer null, and the page's settings (paused, allLive, the driver, the
// table) are kept. Unless the page runs ?nogpu it then fetches the energy (grounds/recipes.js, grounds/programs.gen.js,
// ground.js) beside the other deferred scripts, and ground.js upgrades this same object in place, so a script that
// took `Ground` before it arrived holds the live API. Under ?nogpu none of the three is requested.
// ground.js keeps working on its own (the battle loads it without the shell); tools/test-grounds.mjs checks that this
// file's roomAt, far and constants equal ground.js's.
(function (root) {
  'use strict';
  if (root.Ground) return; // ground.js is already here
  const doc = root.document;
  const me = doc && doc.currentScript && doc.currentScript.src;
  const GRID = [504, 704];
  const ROOM = { W: 560, x: -0.85, y: -0.2, w: 3.5, h: 1.4 };
  const even = (v) => 2 * Math.round(v / 2);
  const roomBox = () => {
    const W = ROOM.W, H = W * (GRID[1] / GRID[0]);
    const bw = Math.round(ROOM.w * W), bh = Math.round(ROOM.h * H);
    return { W, H, bw, bh, fx: even(-ROOM.x * W), fy: even((ROOM.h + ROOM.y - 1) * H) };
  };
  function roomAt(rect, k = 1, vh = typeof innerHeight === 'number' ? Math.round(innerHeight) : 0) {
    const B = roomBox(), s = rect.w / B.W;
    const left = even(rect.x * k) / k, bottom = vh - even((vh - rect.y - rect.h) * k) / k;
    return { x: left - B.fx * s, y: bottom - (B.bh - B.fy) * s, w: B.bw * s, h: B.bh * s };
  }
  function far(rect) {
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    return Math.max(...[[0, 0], [innerWidth, 0], [0, innerHeight], [innerWidth, innerHeight]].map(([x, y]) => Math.hypot(Math.max(Math.abs(x - cx) - rect.w / 2, 0), Math.max(Math.abs(y - cy) - rect.h / 2, 0))));
  }
  const nogpu = () => !!doc && 'nogpu' in doc.documentElement.dataset;
  // the energy's three files, in order, from the folder above this one (or the page's base)
  const base = me ? new URL('../', me).href : (doc && doc.baseURI) || '';
  let loading = null;
  const load = () => loading || (loading = Promise.all(['grounds/recipes.js', 'grounds/programs.gen.js', 'ground.js'].map((f) => new Promise((ok, no) => {
    const s = doc.createElement('script');
    s.src = new URL(f, base).href;
    s.async = false;
    s.onload = () => ok();
    s.onerror = () => no(new Error('could not load ' + f));
    doc.head.append(s);
  }))));
  const st = { paused: false, allLive: false, driver: null, table: null };
  const none = () => null;
  root.Ground = {
    __shell: st,
    GRID, FXBOX: { x: -36, y: 50, w: 576, h: 312 }, DENSITY: 2, IDLE: 1 / 15, DCELL: 3, MAXCELL: 3, BAND_TOP: 0.8, RAMP: 0.12, ROOM,
    WINDOW: [0.034, 0.146, 0.966, 0.646], RING: ['Infra', 'Agent', 'Data', 'Game', 'Shader', 'Type', 'Interface'],
    // the energy, once its files are here; false where it cannot run (?nogpu, a failed fetch, no WebGL2)
    init() {
      if (nogpu() || !doc) return Promise.resolve(false);
      return load().then(() => (root.Ground.__shell ? false : root.Ground.init()), () => false);
    },
    settled: () => Promise.resolve(false),
    surface: none, remove() {}, frame: () => false, bake: none, bakeRoom: none, roomAt, world: () => false, relayout() {},
    pour: none, unpour() {}, far, prewarm: () => false, printCPU: () => Promise.resolve(false), status: () => ({}),
    get available() { return false; },
    get clock() { return 0; }, set clock(v) {},
    get paused() { return st.paused; }, set paused(v) { st.paused = !!v; },
    get allLive() { return st.allLive; }, set allLive(v) { st.allLive = v === 'all' ? 'all' : !!v; },
    set table(hex) { st.table = hex; },
    get driver() { return st.driver; }, set driver(fn) { st.driver = typeof fn === 'function' ? fn : null; },
    get worldState() { return { id: null, pours: 0, k: 1, covered: false }; },
    get canvas() { return null; },
    surfaces: new Map(), pours: new Map(),
  };
  // fetch at once, beside the other deferred scripts, so the energy is ready by the time the gallery boots it
  if (doc && !nogpu()) load().catch(() => {});

  // ---------- the live first frame without a GPU ----------
  // A live card's ground and front effects are canvases. ground.js prints the t = 0 frame at the poster's own size and,
  // on a card drawn under 0.8 of that, samples it to the card's device px through box mips and trilinear filtering (its
  // view). Without the energy the same canvases print the posters (those t = 0 frames) by the same sampling, so a wall
  // without a GPU is the live wall at t = 0 and is composited the same way. An <img> poster rastered in the canvas's
  // place reached other pixels: sharper on a card at a fractional row, and sharper still once a larger copy of it (the
  // pack waiting on the stage) had been decoded. It runs after the page's load, so after the gallery has taken its
  // prints and the first paint has rastered the subjects (printing during that raster moved some subjects onto another
  // decode). Each card is sampled in a task of its own, the cards on screen first, and all are shown in one; again after
  // a resize.
  const VIEW = 0.8, FX_DENSITY = 1.5, FXW = 576;
  function pixelsOf(img) {
    const c = doc.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    return x.getImageData(0, 0, c.width, c.height).data;
  }
  // one box mip: each texel the mean of four, premultiplied as a texture's mips are
  function half(L) {
    const { w, h, d } = L, w2 = w >> 1, h2 = h >> 1, o = new Float32Array(w2 * h2 * 4), r = w * 4;
    for (let y = 0, q = 0; y < h2; y++) {
      for (let x = 0, p = 2 * y * r; x < w2; x++, p += 8) {
        for (let c = 0; c < 4; c++, q++) o[q] = (d[p + c] + d[p + 4 + c] + d[p + r + c] + d[p + r + 4 + c]) * 0.25;
      }
    }
    return { w: w2, h: h2, d: o };
  }
  // bilinear taps along one axis, texel centres at (i + 0.5) / n, clamped at the edge
  function taps(n, size) {
    const a = new Int32Array(n), b = new Int32Array(n), f = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = ((i + 0.5) / n) * size - 0.5, fl = Math.floor(u);
      a[i] = Math.min(size - 1, Math.max(0, fl)); b[i] = Math.min(size - 1, Math.max(0, fl + 1)); f[i] = u - fl;
    }
    return { a, b, f };
  }
  function addLevel(L, vw, vh, acc, wgt) {
    const X = taps(vw, L.w), Y = taps(vh, L.h), d = L.d, r = L.w * 4;
    for (let y = 0, q = 0; y < vh; y++) {
      const r0 = Y.a[y] * r, r1 = Y.b[y] * r, fy = Y.f[y] * wgt, gy = wgt - fy;
      for (let x = 0; x < vw; x++, q += 4) {
        const c0 = X.a[x] * 4, c1 = X.b[x] * 4, fx = X.f[x], gx = 1 - fx;
        const p00 = r0 + c0, p01 = r0 + c1, p10 = r1 + c0, p11 = r1 + c1;
        const w00 = gx * gy, w01 = fx * gy, w10 = gx * fy, w11 = fx * fy;
        acc[q] += d[p00] * w00 + d[p01] * w01 + d[p10] * w10 + d[p11] * w11;
        acc[q + 1] += d[p00 + 1] * w00 + d[p01 + 1] * w01 + d[p10 + 1] * w10 + d[p11 + 1] * w11;
        acc[q + 2] += d[p00 + 2] * w00 + d[p01 + 2] * w01 + d[p10 + 2] * w10 + d[p11 + 2] * w11;
        acc[q + 3] += d[p00 + 3] * w00 + d[p01 + 3] * w01 + d[p10 + 3] * w10 + d[p11 + 3] * w11;
      }
    }
  }
  // a phone's cards print 'fit' (gallery.js): above 1x of the poster the live layer is drawn at the card's device px,
  // a size no poster holds, so those cards keep their <img> posters (ground.js size)
  const fitAbove = (box) => !!(root.matchMedia && root.matchMedia('(max-width: 639px)').matches) && Math.round((box.clientWidth * Math.min(root.devicePixelRatio || 1, 2)) / GRID[0]) > 1;
  // the poster into its canvas as ground.js sizes and samples that layer (sizeLayer, drawLayer's view). G is the print's
  // width (504, or 576 for the front effects); a poster file narrower than the layer needs (need()) is refused, and
  // printOf() below fetches the whole one in its place.
  const deviceW = (box, cap) => Math.round(box.clientWidth * Math.min(root.devicePixelRatio || 1, 2, cap || 9));
  const need = (box, cap, G) => { const vw = deviceW(box, cap); return vw < G * VIEW ? vw : G; };
  function still(img, box, alpha, cap, G) {
    const W = img.naturalWidth, H = img.naturalHeight;
    const k = Math.min(root.devicePixelRatio || 1, 2, cap || 9);
    const vw = Math.round(box.clientWidth * k), vh = Math.round(box.clientHeight * k);
    if (!W || !H || !vw || !vh || W < need(box, cap, G)) return false;
    const src = pixelsOf(img);
    let out;
    if (vw < G * VIEW) {
      let L = { w: W, h: H, d: src };
      if (alpha) {
        const p = new Float32Array(src.length);
        for (let i = 0; i < src.length; i += 4) { const a = src[i + 3] / 255; p[i] = src[i] * a; p[i + 1] = src[i + 1] * a; p[i + 2] = src[i + 2] * a; p[i + 3] = src[i + 3]; }
        L.d = p;
      }
      const lod = Math.log2(Math.max(W / vw, H / vh)), l0 = Math.max(0, Math.floor(lod)), f = Math.max(0, lod - l0);
      for (let i = 0; i < l0; i++) L = half(L);
      const acc = new Float32Array(vw * vh * 4);
      addLevel(L, vw, vh, acc, 1 - f);
      if (f > 0) addLevel(half(L), vw, vh, acc, f);
      out = new ImageData(vw, vh);
      const o = out.data;
      for (let i = 0; i < acc.length; i += 4) {
        const a = alpha ? acc[i + 3] : 255, m = a > 0 ? 255 / a : 0;
        o[i] = acc[i] * m; o[i + 1] = acc[i + 1] * m; o[i + 2] = acc[i + 2] * m; o[i + 3] = a;
      }
    } else out = new ImageData(src, W, H); // the live layer at the poster's own size, scaled by the compositor
    return out;
  }
  function show(cv, out, alpha) {
    if (cv.width !== out.width || cv.height !== out.height) { cv.width = out.width; cv.height = out.height; }
    cv.getContext('2d', alpha ? undefined : { alpha: false }).putImageData(out, 0, 0);
    cv.style.opacity = 1; // as ground.js's painted() shows a drawn layer (card.css holds them at 0)
  }
  // The print a card samples. Its ground: always the whole poster (its src). The ladder's half is the print's own first
  // mip, but sampled at one file px to a device px its AVIF error is not averaged away as the whole's is by the mips
  // (?nogpu against the live first frame at 1440: 0.17% of the page's pixels over 24 from the half, 0.08% from the
  // whole, card by card 0.36% and 0.02% at worst, energy ex.5), so under ?nogpu the wall's wholes are fetched as soon
  // as it is parsed and are decoded by the time the page has loaded. Its front effects: the file the browser chose (the
  // same either way), or the whole where the chosen one is smaller than the layer. Each is read through a plain image of
  // the same file, from the cache: an <img srcset> reports its natural size as its width over its density (a whole fx
  // poster on a 276 px box at 2x reads 276, not 576).
  const plain = new Map();
  const imageOf = (u) => {
    let p = plain.get(u);
    if (!p) {
      const w = new Image();
      w.decoding = 'async';
      w.src = u;
      p = (w.decode ? w.decode() : new Promise((ok, no) => { w.onload = ok; w.onerror = no; })).then(() => w, () => null);
      plain.set(u, p);
    }
    return p;
  };
  const wholeOf = (i) => (!i || !i.hasAttribute('srcset') ? Promise.resolve(i) : imageOf(i.src).then((w) => w || i));
  const prefetch = () => { for (const i of doc.querySelectorAll('.wall .card .en > img.poster[srcset]')) imageOf(i.src); };
  const printOf = (i, box, cap, G) => {
    if (!i || !i.hasAttribute('srcset')) return Promise.resolve(i);
    return imageOf(i.currentSrc || i.src).then((w) => (w && w.naturalWidth >= need(box, cap, G) ? w : imageOf(i.src))).then((w) => w || i);
  };
  let gen = 0;
  function stills() {
    const g = ++gen, vh = root.innerHeight || 0;
    const jobs = [...doc.querySelectorAll('.wall .card')].map((card) => {
      const cv = card.querySelector('.en > canvas.ground'), fx = card.querySelector('.fx');
      return { card, cv, po: cv && cv.parentElement.querySelector('img.poster'), fx, fc: fx && fx.querySelector(':scope > canvas'), fp: fx && fx.querySelector(':scope > img') };
    }).filter((j) => j.cv && j.po);
    const away = (j) => { const r = j.card.getBoundingClientRect(); return r.bottom < 0 ? -r.bottom : r.top > vh ? r.top - vh : 0; };
    jobs.sort((a, b) => away(a) - away(b));
    const ready = (i) => !i || (i.complete && i.naturalWidth > 0) ? Promise.resolve() : (i.decode ? i.decode() : new Promise((ok) => i.addEventListener('load', ok, { once: true })));
    // every card's prints at once; each is sampled in its own task, the cards on screen first
    for (const j of jobs) j.prints = Promise.all([ready(j.po), ready(j.fp)]).then(() => Promise.all([wholeOf(j.po), j.fx && printOf(j.fp, j.fx, FX_DENSITY, FXW)]));
    // each card's prints are made in a task of their own and all shown in one, so the wall's layers change once: a
    // subject rastered again under each new canvas came out on another decode
    const done = [];
    const next = () => {
      if (g !== gen) return;
      const j = jobs.shift();
      if (!j) {
        for (const d of done) { show(d.j.cv, d.ground, false); if (d.fx) { show(d.j.fc, d.fx, true); d.j.fp.style.visibility = 'hidden'; } }
        return;
      }
      j.prints.then(([po, fp]) => {
        if (g !== gen) return;
        try {
          const ground = !fitAbove(j.cv.parentElement) && still(po, j.cv.parentElement, false, 0, GRID[0]);
          if (ground) done.push({ j, ground, fx: j.fc && fp ? still(fp, j.fx, true, FX_DENSITY, FXW) || null : null });
        } catch (e) { gen++; return; } // a browser that cannot read its own pixels keeps the posters
        setTimeout(next, 0);
      }, () => setTimeout(next, 0));
    };
    next();
  }
  if (doc && typeof doc.addEventListener === 'function') {
    let on = false, t = 0;
    const start = () => {
      if (on || !nogpu()) return;
      on = true;
      prefetch();
      stills();
      root.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(stills, 200); });
    };
    // ?nogpu from the address, or the gallery's own fallback when the energy cannot start (gallery.js bootGround)
    const loaded = () => doc.readyState === 'complete';
    // ?nogpu from the address: the wall's whole posters start loading once it is parsed
    const early = () => { if (nogpu()) prefetch(); };
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', early, { once: true }); else early();
    if (loaded()) setTimeout(start, 0); else root.addEventListener('load', () => setTimeout(start, 0), { once: true });
    if (typeof MutationObserver === 'function') new MutationObserver(() => { if (loaded()) start(); }).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-nogpu'] });
  }
})(globalThis);
