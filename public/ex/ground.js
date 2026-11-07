// Card energy: one shared WebGL2 context runs one program (grounds/energy.glsl, carried in grounds/programs.gen.js) for
// every card: the burst of its disciplines in its own hue, fed by its product's matter (a tile grounds/matter.js
// draws in the page, also carried in grounds/programs.gen.js).
// The API is round 3's (init, settled, surface, remove, frame, world, driver, bake, relayout, pour, unpour, far,
// prewarm, bandOf, status, DCELL, MAXCELL), so the gallery, the rituals and the battle drive it unchanged.
//
// Layers it prints (EX.md 13):
//   canvas.ground  the back energy, the whole card: the window variant inside the art window, the text variant
//                  behind the panels; the only layer clipped to the card
//   canvas.fx      the front effects (a canvas inside the card's .fx, or canvas.fx): sparks, shards and the
//                  discipline's marks above the subject, over the frame and up to 0.0714W past the trim at the sides,
//                  never over a keep-out; premultiplied alpha. Ground finds it beside a card's ground on its own.
//
// One screen. A surface at S = 1 is a poster: 504 x 704 drawing px for the card (its fx 576 x 312), the picture
// tools/posters.cjs bakes, so its first live frame equals its poster wherever the card sits: shown smaller, it is
// drawn at S = 1 and sampled through mipmaps to the canvas's device size, as the browser samples the poster <img>.
// 'fit' prints at the card's own device size.
//
// The frame: every due print is drawn into its own cell of the one shared canvas (an atlas), then every cell is
// copied out, so a frame pays one snapshot of the GL canvas however many cards it draws (study/RENDER.md: 120 fps
// against 81 to 94 drawing and copying in turn). Per card, its static values (hue, disciplines, window, subject,
// emitters, matter rows) sit in one uniform block, uploaded once.
//
// The page's shell (grounds/shell.js) stands in for this file until it arrives, and is all a ?nogpu page loads.
//
// Rates: an active surface (the hand, the lens, a script) draws every frame; a visible one at rest at IDLE (15 fps);
// an offscreen one, a hidden tab, Pause Motion and reduced motion draw nothing; Ground.allLive = true keeps every
// visible surface live (EX.md E11), 'all' every surface. A frame prints at most BUDGET layers (the clock, below). The clock holds at 0 until the program links, so a
// card's first live frame is its t = 0 poster.
(function (root) {
  'use strict';

  const GRID = [504, 704];        // a card's print in drawing px at S = 1 (252 css px at 2x)
  const FXBOX = { x: -36, y: 50, w: 576, h: 312 }; // the fx canvas on the 504 grid: 0.0714W past each side, 0.099W to 0.718W down
  const DENSITY = 2;              // drawing px per css px of a poster
  const IDLE = 1 / 15;            // a visible print at rest redraws 15 times a second
  const DCELL = 3;                // the dissolve's Bayer cell, css px (the hero's screen)
  const MAXCELL = 3;              // no cell of a print is coarser than this, css px
  const BAND_TOP = 0.8, RAMP = 0.12; // kept for the API: the new face's panels carry legibility, so nothing is knocked back
  const REST = [0.5, 0.4, 0];     // the lamp at rest: the room's sun only
  const SALT = 1655;              // the gloss's resting jitter
  const AR = 88 / 63;
  const RING = ['Infra', 'Agent', 'Data', 'Game', 'Shader', 'Type', 'Interface'];
  const WINDOW = [0.034, 0.146, 0.966, 0.646]; // EX.md 5, card widths (0.500W tall since round ex.2)
  // kevinliu.studio phone memory: the shared canvas and the density on a touch screen or a small-memory device (scripts/phone-memory.mjs)
  const SMALL = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || (typeof navigator !== 'undefined' && navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);
  const ATLAS_MAX = SMALL ? 2048 : 4096;

  const HEADER = `#version 300 es
precision highp float;
precision highp int;
out vec4 outColor;
uniform vec2 gx_origin, gx_size, gx_rev2, gx_tilt, gx_seed;
uniform float gx_time, gx_dcell, gx_k, gx_mode;
uniform vec4 gx_rev, gx_pass, gx_half;
uniform vec3 gx_light, gx_table;
layout(std140) uniform Card {
  vec4 c_deep, c_energy, c_glint, c_panel, c_mhi, c_mlo;
  vec4 e_win, e_subj, e_disc, e_mat, e_reach;
  vec4 e_em[6];
  vec4 e_em2[6];
  vec4 e_band;
};
uniform sampler2D e_matter, e_glyphs, e_calm;
#define e_deep c_deep.rgb
#define e_energy c_energy.rgb
#define e_glint c_glint.rgb
#define e_panel c_panel.rgb
#define e_mhi c_mhi.rgb
#define e_mlo c_mlo.rgb
#define e_hasMatter e_mat.w
vec2 e_P;
float e_px;
float gx_b4(vec2 p) {
  vec2 c = mod(floor(p), 4.);
  int i = int(c.y) * 4 + int(c.x);
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[i]) + .5) / 16.;
}
`;
  // The wrapper: a pour arrives through the hero's 4x4 Bayer (a front of cells spreading from the trim); a half plane
  // cuts a world at the battle's seam; then the card's space, and the energy.
  const MAIN = `
void main() {
  if (gx_rev2.y > 0.) {
    vec2 o = max(abs(gl_FragCoord.xy - gx_rev.xy) - gx_rev.zw, 0.);
    if (gx_b4(gl_FragCoord.xy / gx_dcell) >= clamp((gx_rev2.x - length(o)) / gx_rev2.y, 0., 1.)) discard;
  }
  float sd = 0.;
  if (gx_half.w >= 0.) { sd = dot(gx_half.xy, gl_FragCoord.xy) - gx_half.z; if (sd < 0.) discard; }
  vec2 local = gl_FragCoord.xy - gx_origin;
  e_P = vec2(local.x / gx_size.x, (1. - local.y / gx_size.y) * ${AR.toFixed(7)});
  e_px = 1. / gx_size.x;
  outColor = vec4(0., 0., 0., 1.);
  groundMain();
  if (gx_half.w >= 0. && sd < gx_half.w) outColor = vec4(gx_table, 1.);
}`;
  const VERT = `#version 300 es
in vec2 aPos; void main() { gl_Position = vec4(aPos, 0., 1.); }`;

  const rgbOf = (h) => { h = String(h).replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
  const recipes = () => (root.GROUND_RECIPES || {}).RECIPES || {};
  const energy = () => root.GROUND_ENERGY || { cards: {} };
  const dppx = () => Math.min(root.devicePixelRatio || 1, SMALL ? 1.5 : 2);
  const reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';
  const even = (v) => 2 * Math.round(v / 2);
  const ALL_LIVE_URL = (() => { try { return /[?&]alllive=(1|all)\b/.exec(location.search); } catch (e) { return null; } })();

  // ---------- each card's energy: its hue, disciplines, subject, emitters and matter ----------
  const fnv = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  // The gloss's resting level: the card's place in Kevin's order (grounds/programs.gen.js keeps it), mod 3, so no two
  // neighbours share a level in a row or in a column of 7, 5, 4, 2 or 1 (the wall is 7 wide); a hash where the card is
  // not in the order. Its angle: the sun's axis, turned by the card's id.
  function bandOf(card) {
    const order = Object.keys(energy().cards || {}), i = order.indexOf(card);
    const a = fnv(card + '#' + SALT), b = fnv(card + '#angle');
    const y = 0.24 + 0.19 * (i >= 0 ? i % 3 : a % 3) + 0.02 * (((a >>> 8) % 101) / 100 - 0.5);
    const ang = ((63.43 + 36 * ((b % 1001) / 1000 - 0.5)) * Math.PI) / 180;
    return { y, ang, seed: [ang, (y - 0.5) * Math.sin(ang)] };
  }
  function seedOf(card) { return (fnv(card + '#seed') % 9973) / 97.3; }
  // the card's own hue tokens: the copy tools/grounds.mjs carried from study/hues.json (the posters are baked from
  // it), else face.gen.js's, which the face reads from the same file
  function hueOf(card) {
    const f = root.FACE && root.FACE[card] && root.FACE[card].hue;
    const g = (energy().cards[card] || {}).hue;
    const h = g || f;
    if (!h) return null;
    return { deep: h.deep, energy: h.energy, glint: h.glint, panel: h.panel, mhi: h.metalHi || (h.metal || {}).hi || h.glint, mlo: h.metalLo || (h.metal || {}).lo || h.deep };
  }
  function discOf(card) {
    const f = (root.FIGHTERS || []).find((x) => x.id === card) || (root.showdown && root.showdown.engine && (root.showdown.engine.FIGHTERS || []).find((x) => x.id === card));
    const d = (f && f.disciplines) || (energy().cards[card] || {}).disc || ['Agent', 'Interface'];
    const i = (n) => Math.max(0, RING.indexOf(n));
    return [i(d[0]), i(d[1] || d[0])];
  }
  // the subject's centre and half size in card widths: its art/pop box (EX.md 13) where the art lane wrote one,
  // else art.js's subject (face units), else the window's centre
  function subjectOf(card, opt) {
    const pop = (energy().cards[card] || {}).pop;
    if (pop && pop.box) {
      const [u0, v0, u1, v1] = pop.box, c = pop.centre || [(u0 + u1) / 2, (v0 + v1) / 2];
      return [c[0], c[1], (u1 - u0) / 2, (v1 - v0) / 2];
    }
    if (opt && opt.length >= 2 && (opt[2] || opt[3])) return [opt[0], opt[1] * AR, opt[2] || 0, (opt[3] || 0) * AR];
    return [0.5, (WINDOW[1] + WINDOW[3]) / 2, 0.3, 0.2];
  }
  // up to six emitters: the art lane's (art/pop/<id>.json fx, carried as emitters: { kind, at: [u, v], dir, spread }
  // in card widths and degrees), else one at the subject's centre throwing every way. A kind picks the effect:
  // 0 sparks, 1 a flash (muzzle flash, blast, fireball), 2 smoke and dust, 3 the discipline's marks and shards,
  // 4 lightning.
  const KIND = (k) => /flash|blast|fire|explo|boom/.test(k) ? 1 : /smoke|sand|dust|steam/.test(k) ? 2 : /light|arc|bolt|zap/.test(k) ? 4 : /spark|signal|speed|ray|tracer|trail/.test(k) ? 0 : 3;
  function emittersOf(card, subj) {
    const pop = (energy().cards[card] || {}).pop || {};
    const list = (pop.emitters && pop.emitters.length ? pop.emitters : [{ kind: 'spark', at: [subj[0], subj[1]], dir: 0, spread: 360 }, { kind: 'marks', at: [subj[0], subj[1]], dir: 0, spread: 360 }]).slice(0, 6);
    const em = new Float32Array(24), em2 = new Float32Array(24);
    list.forEach((e, k) => {
      em.set([e.at[0], e.at[1], ((e.dir || 0) * Math.PI) / 180, ((e.spread == null ? 360 : e.spread) * Math.PI) / 180], k * 4);
      em2.set([KIND(String(e.kind || '')), e.rate == null ? 1 : e.rate, e.reach || (e.spread >= 300 ? 0.5 : 0.32), e.size || 1], k * 4);
    });
    return { em, em2 };
  }
  // how far the front effects may run past the window's edges (pop.fx, card widths past each window edge), held to
  // EX.md 13's limits: 0.10W at the sides (0.066W past the trim), 0.06W into the top bar, 0.10W past the foot, and
  // never past the fx canvas's own foot (FXBOX, 0.718W down) or its top (0.099W down: the top bar's reach ends 0.042W
  // in, 0.005W above the window), so no spark ends on its straight edge. A hard piece (a shard or a mark) is weighed
  // whole against these lines (energy.glsl e_fxReach, e_fxOn), never cut by them.
  const FX_FOOT = (FXBOX.y + FXBOX.h) / GRID[0], FX_TOP = FXBOX.y / GRID[0];
  function reachOf(card) {
    const E = energy().cards[card] || {}, fx = (E.pop || {}).fx || {}, W = E.win || WINDOW;   // the card's own window: its family's
    const side = (v) => Math.min(0.066, Math.max(0, (v == null ? 0.1 : v) - W[0]));
    return [side(fx.left), side(fx.right), Math.min(0.06, W[1] - 0.005 - FX_TOP - 0.0005, Math.max(0, fx.top || 0)), Math.min(0.1, FX_FOOT - 0.004 - W[3], Math.max(0, fx.foot == null ? 0.08 : fx.foot))];
  }
  // Behind the text the energy's darkest tone is the one whose OKLab lightness is 0.62, found on the card's own ramp
  // from deep to energy: dark enough that its lines still cut through a thin panel (EX.md E5), light enough that type
  // set over it keeps 4.5:1 against its darkest tenth (E10), on a light energy (Podium, 050525) and a deep one alike.
  const okL = (hex) => {
    const [r, g, b] = rgbOf(hex).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), q = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q;
  };
  function textFloor(h) { const Ld = okL(h.deep), Le = okL(h.energy); return Math.min(1, Math.max(0, (0.62 - Ld) / Math.max(Le - Ld, 1e-3))) * 0.45; }
  // the block for one card, in std140 order (24 vec4)
  function blockOf(card, subjOpt) {
    const h = hueOf(card) || { deep: '#333333', energy: '#888888', glint: '#eeeeee', panel: '#cccccc', mhi: '#dddddd', mlo: '#555555' };
    const subj = subjectOf(card, subjOpt), [p, s] = discOf(card), E = energy().cards[card] || {};
    const { em, em2 } = emittersOf(card, subj);
    const b = new Float32Array(96);
    ['deep', 'energy', 'glint', 'panel', 'mhi', 'mlo'].forEach((k, i) => b.set([...rgbOf(h[k]), 1], i * 4));
    // the card families (EX.md 23.12, the variety port): the card's own ground effect rides in the colours' spare
    // components (grounds/programs.gen.js cards[id].vary, from design/assign.json): deep.w the matter's flow (0 burst,
    // 1 lanes, 2 fall, 3 rise, 4 rings, 5 grid, 6 diagonal), energy.w the generic burst (core flare, rays, glass facets,
    // sparks, glitter: 0 on every card; a card without vary keeps 1, round ex.5's ground), glint.w the flow's parameter,
    // panel.w the matter's extra cover, mhi.w the matter tile's own two-tone split; and the family's own window
    const X = E.vary || {};
    b[3] = X.flow || 0; b[7] = X.fw == null ? 1 : X.fw; b[11] = X.fp || 0; b[15] = X.fg || 0; b[19] = X.mm == null ? 0.5 : X.mm;
    b.set(E.win || WINDOW, 24);
    b.set(subj, 28);
    b.set([p, s, seedOf(card), textFloor(h)], 32);
    b.set([E.rows || 8, E.speed == null ? 0.07 : E.speed, E.cover == null ? 0.55 : E.cover, 0], 36); // .w: has matter, set once it loads
    b.set(reachOf(card), 40);
    b.set(em, 44);
    b.set(em2, 68);
    // the family's text band (x0, top, x1, foot; grounds/programs.gen.js cards[id].band): under it the matter reads its
    // calm form, the tile with no letters (energy.glsl e_tile)
    b.set(E.band || [WINDOW[0], 0.658, WINDOW[2], 1.214], 92);
    return b;
  }

  let gl = null, canvas = null, lost = false, ext = null, buf = null;
  let prog = null;
  const programs = new Map();      // card -> the one program (status per card, as round 3's API reports)
  const matter = new Map();        // card -> { tex, ready }
  let glyphTex = null;
  const surfaces = new Map();
  const byCanvas = new Map();
  const pours = new Map();
  let clock = 0, paused = false, allLive = ALL_LIVE_URL ? (ALL_LIVE_URL[1] === 'all' ? 'all' : true) : false;
  let table = [0.902, 0.886, 0.862];
  let probing = false;             // a bake of the tile's orientation (bake { probe: true })

  function compile() {
    const P = root.GROUND_PROGRAMS || {};
    const first = Object.values(P)[0];
    const body = (energy().body) || (first && first.body);
    if (!body) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, HEADER + body + MAIN);
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    return { id: 'energy', prog: p, vs, fs, uni: null, ready: false, failed: false, warm: false };
  }
  function poll(p) {
    if (!p) return false;
    if (p.ready || p.failed) return p.ready;
    if (ext && !gl.getProgramParameter(p.prog, ext.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(p.prog, gl.LINK_STATUS)) {
      p.failed = true;
      console.warn('Ground energy unavailable:', gl.getShaderInfoLog(p.fs) || gl.getProgramInfoLog(p.prog));
      return false;
    }
    p.uni = new Map();
    const n = gl.getProgramParameter(p.prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p.prog, i);
      const loc = gl.getUniformLocation(p.prog, info.name);
      if (loc) p.uni.set(info.name.replace(/\[0\]$/, ''), { loc, type: info.type });
    }
    const bi = gl.getUniformBlockIndex(p.prog, 'Card');
    gl.uniformBlockBinding(p.prog, bi, 0);
    gl.useProgram(p.prog);
    const m = p.uni.get('e_matter'), g = p.uni.get('e_glyphs'), q = p.uni.get('e_calm');
    if (m) gl.uniform1i(m.loc, 0);
    if (g) gl.uniform1i(g.loc, 1);
    if (q) gl.uniform1i(q.loc, 2);
    p.ready = true;
    return true;
  }
  function set(u, v) {
    if (!u || v == null) return;
    switch (u.type) {
      case gl.FLOAT: gl.uniform1f(u.loc, Array.isArray(v) ? v[0] : v); break;
      case gl.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
      case gl.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
      case gl.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
    }
  }
  function makeTexture(img, filter, wrap) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return tex;
  }
  // every card's matter tile and the shared glyph atlas, drawn in the page by grounds/matter.js (carried in
  // grounds/programs.gen.js) at 256 px, a few per task so the boot never holds the main thread for long: one RGBA
  // texture each, mipmapped and wrapped. About 40 ms for all 27 on this Mac.
  let texturesReady = false;
  function loadTextures() {
    const Mt = root.GROUND_MATTER;
    if (!Mt || typeof document === 'undefined') { texturesReady = true; return Promise.resolve(); }
    const ids = ['_glyphs', ...Object.keys(energy().cards || {}).filter((id) => Mt.ids.includes(id))];
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const tick = () => new Promise((res) => setTimeout(res, 0));
    return Mt.fonts().then(async () => {
      for (let i = 0; i < ids.length; i++) {
        if (lost) return;
        const id = ids[i];
        Mt.draw(id, c);
        const tex = makeTexture(c, gl.LINEAR_MIPMAP_LINEAR, id === '_glyphs' ? gl.CLAMP_TO_EDGE : gl.REPEAT);
        // a tile that carries letters has its calm form beside it, the same rows with no letters, read under the type
        let calm = null;
        if (id !== '_glyphs' && Mt.calm && Mt.calm.includes(id)) { Mt.draw(id, c, true); calm = makeTexture(c, gl.LINEAR_MIPMAP_LINEAR, gl.REPEAT); }
        if (id === '_glyphs') glyphTex = tex; else matter.set(id, { tex, calm });
        for (const s of surfaces.values()) if (s.card === id) { s.block = null; s.dirty = true; }
        if (i % 4 === 3) await tick();
      }
      texturesReady = true;
      want();
    });
  }

  let ready = null;
  function init() {
    if (!root.GROUND_PROGRAMS && !root.GROUND_ENERGY) return Promise.resolve(false);
    if (ready) return ready;
    if (gl) return Promise.resolve(!lost);
    canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    try {
      gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    } catch (e) { gl = null; }
    if (!gl) return Promise.resolve(false);
    ext = gl.getExtension('KHR_parallel_shader_compile');
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    prog = compile();
    const ids = new Set([...Object.keys(recipes()), ...Object.keys(energy().cards || {}), ...Object.keys(root.GROUND_PROGRAMS || {})]);
    for (const id of ids) programs.set(id, prog);
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      lost = true;
      for (const s of surfaces.values()) { unshow(s); if (s.fx) unshow(s.fx); }
      if (Wd.el) Wd.el.style.opacity = 0;
    });
    listen();
    ready = loadTextures().then(() => !lost);
    return ready;
  }
  function settled() {
    return new Promise((res) => {
      const check = () => { if ((!prog || poll(prog) || prog.failed) && texturesReady) res(true); else setTimeout(check, 30); };
      check();
    });
  }

  // The mip view: a poster-sized texture with mipmaps and its framebuffer (one for the ground, one for the fx), and a
  // program that samples it down to the canvas's device size, as the browser samples the poster <img>.
  const M = { prog: null };
  function fbo(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1 + Math.floor(Math.log2(Math.max(w, h))), gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fb, w, h };
  }
  function mip() {
    if (M.prog) return M.prog !== -1;
    try {
      const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return x; };
      const fs = sh(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float;
uniform sampler2D u_src; uniform vec4 u_dst; out vec4 o;
void main() { o = texture(u_src, (gl_FragCoord.xy - u_dst.xy) / u_dst.zw); }`);
      const p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, fs);
      gl.bindAttribLocation(p, 0, 'aPos');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      M.ground = fbo(GRID[0], GRID[1]);
      M.fx = fbo(FXBOX.w, FXBOX.h);
      M.prog = p; M.src = gl.getUniformLocation(p, 'u_src'); M.dst = gl.getUniformLocation(p, 'u_dst');
      return true;
    } catch (e) { M.prog = -1; console.warn('Ground mip view unavailable:', e.message); return false; }
  }

  // ---------- surfaces: one card's ground and, where its card has one, its front effects ----------
  // A print's canvas is drawn at whole pixels; a box's size in device px as the browser paints it.
  function deviceSize(el) {
    const k = dppx(), r = el.getBoundingClientRect(), sx = el.offsetWidth ? r.width / el.offsetWidth : 1;
    if (!r.width || !r.height) return [0, 0];
    if (Math.abs(sx - 1) > 0.01) return [Math.round(el.clientWidth * k), Math.round(el.clientHeight * k)];
    return [(Math.round(r.right) - Math.round(r.left)) * k, (Math.round(r.bottom) - Math.round(r.top)) * k];
  }
  // one layer's sizes: its print at S (pw, ph), and the view it is sampled to when shown smaller than itself
  // The front effects print at most 1.5 device px per css px: they are sparks and shards, and on a 2x screen a third of a
  // frame's copied pixels (26 cards all live at 2x: 80 fps at full density, 120 at 1.5)
  const FX_DENSITY = 1.5;
  function sizeLayer(L, base, S, fit, cap) {
    const box = L.box || L.el, k = Math.min(dppx(), cap || 9), cw = box.clientWidth, ch = box.clientHeight;
    let w = Math.round(base[0] * S), h = Math.round(base[1] * S);
    L.pw = w; L.ph = h;
    const vw = Math.round(cw * k), vh = Math.round(ch * k);
    L.view = !fit && S === 1 && vw > 0 && vw < w * 0.8 ? [vw, vh] : null;
    if (L.view) [w, h] = L.view;
    L.bw = w; L.bh = h;
    if (L.el.style.display !== 'none') back(L);
  }
  // kevinliu.studio phone memory: a held print's canvas is 0 x 0; back() sizes it again before it is drawn
  function back(L) { if (L && L.bw && (L.el.width !== L.bw || L.el.height !== L.bh)) { L.el.width = L.bw; L.el.height = L.bh; } }
  function size(s) {
    if (!s.fit) { s.px = DENSITY * s.S; }
    else {
      // 'fit': the poster's picture while the card is near its size on this screen, above that its own device size
      const cw = (s.box || s.el).clientWidth, k = dppx();
      if (!cw || Math.round((cw * k) / GRID[0]) <= 1) { s.S = 1; s.px = DENSITY; }
      else { s.S = Math.round(cw * k) / GRID[0]; s.px = k; }
    }
    sizeLayer(s, GRID, s.S, s.fit && s.S !== 1);
    if (s.fx) sizeLayer(s.fx, [FXBOX.w, FXBOX.h], s.S, s.fit && s.S !== 1, FX_DENSITY);
    s.dirty = true;
  }
  function fxOf(el) {
    const card = el.closest && el.closest('.card');
    if (!card) return null;
    const own = [...card.querySelectorAll('canvas.fx, .fx canvas')].find((c) => (c.closest('.card') === card));
    if (!own) return null;
    const wrap = own.parentElement && own.parentElement.classList.contains('fx') ? own.parentElement : null;
    return { el: own, box: wrap || own, ctx: own.getContext('2d'), painted: false, poster: wrap && wrap.querySelector('img'), pw: 0, ph: 0, view: null };
  }
  // opts: pass [foil, emboss, metal, glint], k (place in tier 0..1), subject [x, y, hw, hh] (face units from the top left)
  // A card's canvases are composited layers, so a print that is not on screen holds them display none and its posters
  // show (the poster is its t = 0 frame); the first frame drawn shows them again. Only a canvas inside a card's .en
  // (and the .fx beside it) is held so: the box beside it is what is measured and watched. A canvas on its own (the
  // battle's) is always shown.
  // A layer whose print is gone shows its poster again, never a black canvas: a card's canvas is opaque (alpha false), so
  // a lost context, or a copy from a context lost mid-frame, would print black, the one state its panel tint cannot carry
  // (the originality judge's ex.4 check: about 15 black grounds, Mailroom's trait at 4.14:1). Its next drawn frame shows
  // it again (painted), and a canvas whose own 2D context is lost and restored is drawn again.
  function unshow(L) {
    if (!L) return;
    L.el.style.opacity = 0;
    L.painted = false;
    if (L.poster) L.poster.style.visibility = '';
  }
  function hold(L) {
    if (!L || L.box === L.el || L.el.style.display === 'none') return;
    L.el.style.display = 'none';
    L.el.width = L.el.height = 0;
    L.painted = false;
    if (L.poster) L.poster.style.visibility = '';
  }
  function surface(id, el, card, S = 1, opts = {}) {
    if (!recipes()[card] && !(energy().cards || {})[card]) return null;
    if (surfaces.has(id)) remove(id);
    const box = el.parentElement && el.parentElement.classList.contains('en') ? el.parentElement : el;
    const s = {
      id, card, el, box, S: typeof S === 'number' ? S : 1, px: DENSITY, fit: S === 'fit',
      ctx: el.getContext('2d', { alpha: false }), fx: fxOf(el),
      paper: rgbOf((hueOf(card) || { deep: '#333333' }).deep), chip: rgbOf((hueOf(card) || { energy: '#888888' }).energy),
      band: bandOf(card).seed, pass: opts.pass || [0, 0, 0, 0], k: opts.k || 0, subject: opts.subject || null,
      light: REST.slice(), tilt: [0, 0], block: null, ubo: null,
      seen: true, active: false, painted: false, dirty: true, due: (surfaces.size % 4) / 4 * IDLE,
    };
    size(s);
    surfaces.set(id, s);
    byCanvas.set(box, s);
    // the card canvases are 2D: Chrome can drop and restore their backing (a GPU process lost under load), blank and opaque
    el.oncontextlost = () => { unshow(s); s.dirty = true; };
    el.oncontextrestored = () => { s.dirty = true; want(); };
    if (s.fx) { s.fx.el.oncontextlost = () => { unshow(s.fx); s.dirty = true; }; s.fx.el.oncontextrestored = () => { s.dirty = true; want(); }; }
    if (box !== el) { hold(s); if (s.fx && s.fx.box !== s.fx.el) hold(s.fx); }
    if (io) io.observe(box);
    want();
    return s;
  }
  function remove(id) {
    const s = surfaces.get(id);
    if (!s) return;
    surfaces.delete(id);
    if (s.ubo && gl) gl.deleteBuffer(s.ubo);
    const box = s.box || s.el;
    if (byCanvas.get(box) === s) { byCanvas.delete(box); if (io) io.unobserve(box); }
  }
  // a card's uniform block, built and uploaded once (again when its matter arrives)
  function uboOf(s) {
    if (s.ubo && s.block) return s.ubo;
    const b = blockOf(s.card, s.subject);
    b[39] = matter.has(s.card) ? 1 : 0;
    s.block = b;
    if (!s.ubo) s.ubo = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, s.ubo);
    gl.bufferData(gl.UNIFORM_BUFFER, b, gl.STATIC_DRAW);
    return s.ubo;
  }
  function ensure(w, h) {
    if (canvas.width >= w && canvas.height >= h) return;
    canvas.width = Math.min(ATLAS_MAX, Math.max(canvas.width, w));
    canvas.height = Math.min(ATLAS_MAX, Math.max(canvas.height, h));
  }

  // One draw of the program into the shared canvas.
  //   o.x, o.y, o.w, o.h   the card in GL px (its space: e_P)
  //   o.sx, o.sy, o.sw, o.sh   the scissor
  //   o.mode               0 ground, 1 fx, 2 room, 3 world (a 'view' pour)
  function run(s, o, time) {
    const p = prog;
    gl.useProgram(p.prog);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, uboOf(s));
    gl.scissor(o.sx, o.sy, o.sw, o.sh);
    const U = (name) => p.uni.get(name);
    set(U('gx_origin'), [o.x, o.y]);
    set(U('gx_size'), [o.w, o.h]);
    set(U('gx_pass'), o.pass || s.pass);
    set(U('gx_tilt'), o.tilt || s.tilt);
    set(U('gx_light'), o.light || s.light);
    set(U('gx_seed'), s.band);
    set(U('gx_k'), s.k || 0);
    set(U('gx_time'), time);
    set(U('gx_mode'), probing && !o.mode ? 4 : o.mode || 0);
    set(U('gx_rev'), o.rev || [0, 0, 0, 0]);
    set(U('gx_rev2'), o.rev2 || [0, 0]);
    set(U('gx_dcell'), o.dcell || 1);
    set(U('gx_half'), o.half || [0, 0, 0, -1]);
    set(U('gx_table'), table);
    const m = matter.get(s.card);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, m ? m.tex : glyphTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, glyphTex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, m ? m.calm || m.tex : glyphTex);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    p.warm = true;
  }

  // ---------- the frame: every due print into its own atlas cell, then every cell copied out ----------
  // One layer (a surface's ground or fx) into the atlas at (ax, ay) in GL px, at its print size or, for a view,
  // through the mip framebuffer at its view size.
  // A layer shown smaller than its print draws two ways: exact (its first paint, a held clock, paused or reduced
  // motion: the print at S = 1 sampled through mipmaps, so it is the poster), or, once it animates, straight at its
  // device size (the program's own antialiasing, a seventh of the pixels of a wall card at 1x).
  function drawLayer(s, layer, kind, time, rest, ax, ay, exact) {
    const fx = kind === 'fx';
    let w = layer.pw, h = layer.ph;
    const view = layer.view && exact && mip();
    let k = s.S;
    if (layer.view && !view) { [w, h] = layer.view; k = w / (fx ? FXBOX.w : GRID[0]); }
    const cardW = GRID[0] * k, cardH = GRID[1] * k;
    // the card's corner in this layer's own pixels (the fx canvas starts 36 px left of the card and 50 px down)
    const ox = fx ? -FXBOX.x * k : 0, oy = fx ? (FXBOX.h + FXBOX.y) * k - cardH : 0;
    const restO = { mode: fx ? 1 : 0, ...(rest ? { light: REST, tilt: [0, 0] } : null) };
    if (view) {
      const F = fx ? M.fx : M.ground;
      gl.bindFramebuffer(gl.FRAMEBUFFER, F.fb);
      gl.viewport(0, 0, F.w, F.h);
      gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(0, 0, 0, fx ? 0 : 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.SCISSOR_TEST);
      run(s, { x: ox, y: oy, w: cardW, h: cardH, sx: 0, sy: 0, sw: w, sh: h, ...restO }, time);
      gl.bindTexture(gl.TEXTURE_2D, F.tex);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const [vw, vh] = layer.view;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.scissor(ax, ay, vw, vh);
      gl.useProgram(M.prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, F.tex);
      gl.uniform1i(M.src, 0);
      gl.uniform4f(M.dst, ax, ay, vw, vh);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return [vw, vh];
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.scissor(ax, ay, w, h);
    gl.clearColor(0, 0, 0, fx ? 0 : 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    run(s, { x: ax + ox, y: ay + oy, w: cardW, h: cardH, sx: ax, sy: ay, sw: w, sh: h, ...restO }, time);
    return [w, h];
  }
  // A frame's due layers, packed on shelves; when the canvas cannot hold the rest, the cells so far are copied out first.
  function drawAll(jobs, time) {
    if (!jobs.length || !prog || !poll(prog)) return 0;
    gl.enable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    const dims = jobs.map((j) => (j.layer.view ? j.layer.view : [j.layer.pw, j.layer.ph]));
    let need = 0, widest = 0;
    for (const [w, h] of dims) { need += (w + 2) * (h + 2); widest = Math.max(widest, w + 2); }
    const W = Math.min(ATLAS_MAX, Math.max(widest, Math.ceil(Math.sqrt(need * 1.25) / 64) * 64, canvas.width));
    ensure(W, Math.min(ATLAS_MAX, Math.ceil((need * 1.3) / W) + Math.max(...dims.map((d) => d[1])) + 4));
    let x = 0, y = 0, row = 0, cells = [], n = 0;
    const flush = () => {
      // a context lost mid-frame drew nothing: its blank atlas copied onto an opaque card canvas would print black, so
      // nothing is copied and no layer is marked painted (each keeps its poster)
      if (lost || gl.isContextLost()) { cells = []; x = 0; y = 0; row = 0; return; }
      for (const c of cells) {
        const ctx = c.layer.ctx;
        if (c.kind === 'fx') ctx.globalCompositeOperation = 'copy';
        ctx.drawImage(canvas, c.x, canvas.height - c.y - c.h, c.w, c.h, 0, 0, c.w, c.h);
        if (c.kind === 'fx') ctx.globalCompositeOperation = 'source-over';
        c.done();
      }
      n += cells.length;
      cells = [];
      x = 0; y = 0; row = 0;
    };
    jobs.forEach((j, i) => {
      const [w, h] = dims[i];
      if (x + w > canvas.width) { x = 0; y += row + 2; row = 0; }
      if (y + h > canvas.height) flush();
      const [dw, dh] = drawLayer(j.s, j.layer, j.kind, time, j.rest, x, y, j.exact);
      cells.push({ layer: j.layer, kind: j.kind, x, y, w: dw, h: dh, done: j.done });
      x += w + 2; row = Math.max(row, h);
    });
    flush();
    return n;
  }
  function painted(s, L, kind) {
    if (!L.painted) {
      L.painted = true;
      L.el.style.display = '';
      L.el.style.opacity = 1;
      if (kind === 'fx' && L.poster) L.poster.style.visibility = 'hidden';
    }
  }
  function jobsOf(s, rest, moving) {
    back(s); if (s.fx) back(s.fx);
    const out = [{ s, layer: s, kind: 'ground', rest, exact: rest || !moving || !s.painted, done: () => { painted(s, s, 'ground'); s.dirty = false; s.draws = (s.draws || 0) + 1; } }];
    if (s.fx && s.fx.el.isConnected) out.push({ s, layer: s.fx, kind: 'fx', rest, exact: rest || !moving || !s.fx.painted, done: () => painted(s, s.fx, 'fx') });
    return out;
  }
  // draw one surface now (a script asking for its frame: the bake, a test)
  function draw(s, time, rest) {
    if (!prog || !poll(prog) || !texturesReady) return false;
    drawAll(jobsOf(s, rest), time);
    return true;
  }

  // ---------- pours: a card's world leaving its trim ----------
  // A pour is { card, rect: {x, y, w, h} css px in the viewport, r: front distance css px, front: its width,
  // mode: 'card' (the card's own burst carried past its trim) or 'view' (a world composed on the viewport),
  // half: [nx, ny, d, rule] in css px or null, z, pass, k, subject, space }.
  // A 'view' pour is a world with no card in it (the entry's split, the battle's arena): the program's world mode,
  // its field drawn in the space of a card at least VIEW_MIN of the viewport's short side wide (VIEW_FLOOR css px at
  // the least), scaled about the subject's centre, so a 50 px dock card or the battle's 40 px anchor never sets the
  // field's grain (at that size its pixel grid and dither are a px or two and read as noise). `space` (css px) puts
  // that card where a caller wants the burst to converge; the front still leaves `rect`.
  const Wd = { el: null, ctx: null, k: 1, cw: 0, ch: 0, dirty: false };
  function sizeWorld() {
    const el = Wd.el;
    const cw = Math.round(innerWidth), ch = Math.round(innerHeight);
    // the world's backing store: the finest of 2, 1.5 and 1 drawing px per css px that this screen has and that keeps a
    // full-screen pass at 6 Mpx or under (1440 x 900 at 2x, 1920 x 1080 at 1.5x), never under half the device's px
    Wd.k = [2, 1.5, 1].find((k) => k <= Math.max(1, dppx()) && cw * ch * k * k <= 6e6 && Math.max(cw, ch) * k <= ATLAS_MAX) || 1;
    Wd.cw = cw; Wd.ch = ch;
    if (el.width !== cw * Wd.k || el.height !== ch * Wd.k) { el.width = cw * Wd.k; el.height = ch * Wd.k; }
    Wd.dirty = true;
  }
  function worldCanvas() {
    const el = typeof document !== 'undefined' && document.getElementById('world');
    if (!el) return null;
    if (Wd.el !== el) { Wd.el = el; Wd.ctx = el.getContext('2d'); sizeWorld(); }
    return el;
  }
  function pourState(card, o) {
    return { card, band: bandOf(card).seed, pass: o.pass || [0, 0, 0, 0], k: o.k || 0, subject: o.subject || null, light: REST, tilt: [0, 0], block: null, ubo: null };
  }
  function pour(key, o) {
    if (!gl || lost || !(recipes()[o.card] || (energy().cards || {})[o.card]) || !worldCanvas()) return null;
    const prev = pours.get(key);
    const p = prev && prev.card === o.card ? prev : pourState(o.card, o);
    if (prev && prev !== p && prev.ubo) gl.deleteBuffer(prev.ubo);
    Object.assign(p, { pass: o.pass || [0, 0, 0, 0], k: o.k || 0, rect: o.rect, r: o.r || 0, front: o.front || 160, mode: o.mode || 'card', half: o.half || null, z: o.z || 0, space: o.space || null });
    pours.set(key, p);
    Wd.dirty = true;
    want();
    return p;
  }
  function unpour(key) {
    const drop = (k) => { const p = pours.get(k); if (p && p.ubo && gl) gl.deleteBuffer(p.ubo); pours.delete(k); };
    if (key == null) [...pours.keys()].forEach(drop); else drop(key);
    Wd.dirty = true;
    want();
  }
  function far(rect) {
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    return Math.max(...[[0, 0], [innerWidth, 0], [0, innerHeight], [innerWidth, innerHeight]].map(([x, y]) => Math.hypot(Math.max(Math.abs(x - cx) - rect.w / 2, 0), Math.max(Math.abs(y - cy) - rect.h / 2, 0))));
  }
  const VIEW_MIN = 0.42, VIEW_FLOOR = 168;
  function spaceOf(s) {
    const R = s.rect;
    if (s.space) return s.space;
    if (s.mode !== 'view') return R;
    const w = Math.max(VIEW_FLOOR, VIEW_MIN * Math.min(Wd.cw || innerWidth, Wd.ch || innerHeight));
    if (!(R.w > 0) || R.w >= w) return R;
    const [u, v] = subjectOf(s.card, s.subject), f = w / R.w;
    const cx = R.x + u * R.w, cy = R.y + v * R.w;
    return { x: cx - (cx - R.x) * f, y: cy - (cy - R.y) * f, w: R.w * f, h: R.h * f };
  }
  function placeOf(s) {
    const k = Wd.k, W = Wd.cw * k, H = Wd.ch * k;
    const R = s.rect, reach = s.r + 2, Sp = spaceOf(s);
    const x0 = Math.max(0, Math.floor((R.x - reach) * k)), x1 = Math.min(W, Math.ceil((R.x + R.w + reach) * k));
    const y0 = Math.max(0, Math.floor((Wd.ch - R.y - R.h - reach) * k)), y1 = Math.min(H, Math.ceil((Wd.ch - R.y + reach) * k));
    const box = { x: even(R.x * k), y: even((Wd.ch - R.y - R.h) * k), w: R.w * k, h: R.h * k };
    const card = Sp === R ? box : { x: even(Sp.x * k), y: even((Wd.ch - Sp.y - Sp.h) * k), w: Sp.w * k, h: Sp.h * k };
    let half = null;
    if (s.half) { const [nx, ny, d, rule] = s.half; half = [nx, -ny, (d - ny * Wd.ch) * k, rule * k]; }
    return {
      ...card, sx: x0, sy: y0, sw: x1 - x0, sh: y1 - y0, pass: [0, 0, 0, 0], mode: s.mode === 'view' ? 3 : 2,
      rev: [box.x + box.w / 2, box.y + box.h / 2, box.w / 2, box.h / 2],
      rev2: [s.r * k, Math.max(1, Math.min(s.front, s.r)) * k], dcell: DCELL * k, half,
    };
  }
  function drawPours(time) {
    if (!Wd.el || !prog || !poll(prog)) return;
    if (Wd.el.width !== Math.round(innerWidth) * Wd.k) sizeWorld();
    const W = Wd.cw * Wd.k, H = Wd.ch * Wd.k;
    ensure(W, H);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    gl.scissor(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (const s of [...pours.values()].sort((a, b) => a.z - b.z)) {
      if (s.r <= 0) continue;
      const o = placeOf(s);
      if (o.sw <= 0 || o.sh <= 0) continue;
      run(s, o, time);
    }
    Wd.ctx.globalCompositeOperation = 'copy';
    Wd.ctx.drawImage(canvas, 0, canvas.height - H, W, H, 0, 0, Wd.el.width, Wd.el.height);
    Wd.ctx.globalCompositeOperation = 'source-over';
    Wd.dirty = false;
  }
  function world(id, opts = {}) {
    if (id == null) { unpour('inspect'); return true; }
    const rect = opts.rect || { x: innerWidth / 2 - 150, y: innerHeight / 2 - 210, w: 300, h: 419 };
    return !!pour('inspect', { card: id, ...opts, rect, r: opts.instant ? far(rect) + 200 : opts.r || 0 });
  }
  // The battle's split world, ready before it is needed: the shared canvas and the world canvas at the viewport's
  // size, each lead drawn once over the whole viewport down the seam's path, and one copy into the world canvas.
  const warmed = new Set();
  function prewarm(ids = []) {
    if (!gl || lost || !worldCanvas() || !prog || !poll(prog)) return false;
    if (Wd.el.width !== Math.round(innerWidth) * Wd.k) sizeWorld();
    const k = Wd.k, W = Wd.cw * k, H = Wd.ch * k;
    ensure(W, H);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    let drew = false;
    for (const id of ids) {
      if (warmed.has(id)) continue;
      const rect = { x: Wd.cw / 2 - 150, y: Wd.ch / 2 - 210, w: 300, h: 419 };
      const s = { ...pourState(id, {}), rect, r: far(rect) + 240, front: 220, mode: 'view', half: [1, 0, Wd.cw / 2, 1.5], z: 0 };
      run(s, { ...placeOf(s), sx: 0, sy: 0, sw: W, sh: H }, clock);
      gl.deleteBuffer(s.ubo);
      warmed.add(id);
      drew = true;
    }
    if (Wd.ctx && (drew || !warmed.size)) {
      Wd.ctx.globalCompositeOperation = 'copy';
      Wd.ctx.drawImage(canvas, 0, canvas.height - H, W, H, 0, 0, Wd.el.width, Wd.el.height);
      Wd.ctx.globalCompositeOperation = 'source-over';
      if (!pours.size) Wd.ctx.clearRect(0, 0, Wd.el.width, Wd.el.height);
      warmed.add('');
    }
    Wd.dirty = true;
    return true;
  }

  // ---------- the clock ----------
  // A frame prints at most BUDGET layers (a card's ground and its front effects are two). Each layer printed is a canvas
  // the browser must take a new picture of, a fixed cost in the GPU process larger than its drawing (about 0.2 ms each:
  // 52 a frame, all 26 live, held that thread 11 to 14 ms a frame and rAF p95 at 18 ms, E11; drawn but not copied, 0.4
  // ms). The hand's card and every card's first print always print; the rest go longest unprinted first, so with all 26
  // live each prints about every other frame and the idle rate (15 a second) is never held back.
  const BUDGET = 24;
  let linked = false, frames = 0;
  function step(dt) {
    if (!gl || lost) return false;
    dt = Math.min(Math.max(dt || 0, 0), 0.1);
    const live = !reduced.matches && !hidden() && !paused;
    if (!linked) linked = (!prog || poll(prog) || prog.failed) && texturesReady;
    let more = false;
    const covered = [...pours.values()].some((p) => p.mode !== 'view' && p.r >= far(p.rect) + p.front);
    if (Wd.el && (pours.size || Wd.dirty)) {
      if (pours.size && (live || Wd.dirty)) drawPours(clock);
      else if (!pours.size) { Wd.ctx.clearRect(0, 0, Wd.el.width, Wd.el.height); Wd.dirty = false; }
      if (pours.size && live) more = true;
    }
    const jobs = [], due = [], moving = live && linked && clock > 0;
    frames++;
    for (const s of surfaces.values()) {
      const held = s.active || (live && allLive === 'all') || (live && allLive && s.seen);
      if (!held && (!s.seen || covered)) { if (!s.seen && s.box !== s.el) { hold(s); hold(s.fx); } continue; }
      const pending = !s.painted || s.dirty;
      // a pending print draws now; while the clock runs it then idles on, so a print marked dirty (Resume Motion, reduced
      // motion switched off) keeps the driver going instead of stopping it after one frame
      s.idle = false;
      if (pending || held) { due.push(s); if (live) more = true; continue; }
      if (!live) continue;
      more = true;
      s.due += dt;
      if (s.due < IDLE) continue;
      s.idle = true;
      due.push(s);
    }
    // the frame's budget (BUDGET): the hand's print and every first print always, then the longest unprinted
    const must = (s) => s.active || !s.painted;
    due.sort((a, b) => must(b) - must(a) || (a.at || 0) - (b.at || 0));
    let spent = 0;
    for (const s of due) {
      const k = s.fx && s.fx.el.isConnected ? 2 : 1;
      if (!must(s) && spent + k > BUDGET) { more = true; continue; }
      spent += k;
      if (s.idle) s.due = Math.min(s.due - IDLE, IDLE);
      s.at = frames;
      jobs.push(...jobsOf(s, false, moving));
    }
    if (jobs.length) { if (!prog || !poll(prog) || !texturesReady) more = true; else drawAll(jobs, clock); }
    if (live && linked) clock += dt;
    return more;
  }

  // Ground.frame(dt) runs from the page's one rAF loop and returns true while the grounds want another frame.
  let driver = null, lastCall = 0, pumping = false, pumpT = 0;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  function frame(dt) { lastCall = now(); return step(dt); }
  function want() {
    if (!gl || lost || hidden()) return;
    if (driver) { driver(); return; }
    if (pumping || now() - lastCall < 50) return;
    pumping = true; pumpT = 0;
    requestAnimationFrame(pump);
  }
  function pump(t) {
    if (driver || now() - lastCall < 50) { pumping = false; return; }
    const dt = pumpT ? (t - pumpT) / 1000 : 1 / 60;
    pumpT = t;
    if (step(dt)) requestAnimationFrame(pump); else pumping = false;
  }
  function relayout() {
    for (const s of surfaces.values()) { if (!s.fx || !s.fx.el.isConnected) s.fx = fxOf(s.el) || s.fx; size(s); }
    if (Wd.el) sizeWorld();
    want();
  }
  let io = null;
  function listen() {
    if ('IntersectionObserver' in root) {
      io = new IntersectionObserver((entries) => {
        let wake = false;
        for (const en of entries) {
          const s = byCanvas.get(en.target);
          if (!s) continue;
          if (en.isIntersecting && !s.seen) wake = true;
          s.seen = en.isIntersecting;
          if (!s.seen && !s.active && s.box !== s.el) { hold(s); hold(s.fx); }
        }
        if (wake) want();
      }, { rootMargin: '64px' });
      for (const s of surfaces.values()) io.observe(s.box || s.el);
    }
    document.addEventListener('visibilitychange', want);
    if (reduced.addEventListener) reduced.addEventListener('change', () => { for (const s of surfaces.values()) s.dirty = true; want(); });
    let t = 0;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(relayout, 60); });
  }

  // ---------- posters ----------
  // The poster for one card: this exact program at t (0) with the resting finish and no lamp, at S = 1: the ground
  // at 504 x 704, or with { fx: true } the front effects at 576 x 312 (premultiplied, saved with alpha).
  function bakeLayer(s, fx, t) {
    const keep = { S: s.S, px: s.px };
    const target = document.createElement('canvas');
    Object.assign(s, { S: 1, px: DENSITY });
    const layer = fx ? { el: target, ctx: target.getContext('2d'), pw: FXBOX.w, ph: FXBOX.h, view: null } : { el: target, ctx: target.getContext('2d', { alpha: false }), pw: GRID[0], ph: GRID[1], view: null };
    target.width = layer.pw; target.height = layer.ph;
    drawAll([{ s, layer, kind: fx ? 'fx' : 'ground', rest: true, exact: true, done: () => {} }], t);
    Object.assign(s, keep);
    s.dirty = true;
    return target;
  }
  // o.probe: the card's ground as the tile's orientation (energy.glsl gx_mode 4: red where the tile reads as drawn, green
  // where mirrored, blue where none is read), for tools/test-grounds.mjs
  function bake(id, t = 0, type = 'image/png', q, o = {}) {
    const s = surfaces.get(id);
    if (!gl || !s || !prog || !poll(prog)) return null;
    probing = !!o.probe && !o.fx;
    try { return bakeLayer(s, !!o.fx, t).toDataURL(type, q); } finally { probing = false; }
  }

  // The room: the card's burst carried past its trim at rest, baked once for the lens's widest card, ROOM.W css px at
  // 1x, over ROOM.x to ROOM.x + ROOM.w card widths and ROOM.y to ROOM.y + ROOM.h card heights; roomAt(rect) places it.
  const ROOM = { W: 560, x: -0.85, y: -0.2, w: 3.5, h: 1.4 };
  const roomBox = () => {
    const W = ROOM.W, H = W * (GRID[1] / GRID[0]);
    const bw = Math.round(ROOM.w * W), bh = Math.round(ROOM.h * H);
    return { W, H, bw, bh, fx: even(-ROOM.x * W), fy: even((ROOM.h + ROOM.y - 1) * H) };
  };
  function bakeRoom(id, t = 0, type = 'image/png', q) {
    if (!gl || lost || !(recipes()[id] || (energy().cards || {})[id]) || !prog || !poll(prog)) return null;
    const B = roomBox();
    ensure(B.bw, B.bh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    const s = pourState(id, {});
    run(s, { x: B.fx, y: B.fy, w: B.W, h: B.H, sx: 0, sy: 0, sw: B.bw, sh: B.bh, pass: [0, 0, 0, 0], mode: 2 }, t);
    gl.deleteBuffer(s.ubo);
    const c = document.createElement('canvas');
    c.width = B.bw; c.height = B.bh;
    c.getContext('2d', { alpha: false }).drawImage(canvas, 0, canvas.height - B.bh, B.bw, B.bh, 0, 0, B.bw, B.bh);
    for (const sf of surfaces.values()) sf.dirty = true;
    return c.toDataURL(type, q);
  }
  function roomAt(rect, k = 1, vh = typeof innerHeight === 'number' ? Math.round(innerHeight) : 0) {
    const B = roomBox(), s = rect.w / B.W;
    const left = even(rect.x * k) / k, bottom = vh - even((vh - rect.y - rect.h) * k) / k;
    return { x: left - B.fx * s, y: bottom - (B.bh - B.fy) * s, w: B.bw * s, h: B.bh * s };
  }
  // Round 3 printed a product's picture into its ground on the CPU; the energy prints no picture, so there is no
  // print to make (kept so a caller of the old API gets a plain answer).
  function printCPU() { return Promise.resolve(false); }

  const api = {
    GRID, FXBOX, DENSITY, IDLE, DCELL, MAXCELL, BAND_TOP, RAMP, ROOM, WINDOW, RING,
    init, settled, surface, remove, frame, bake, bakeRoom, roomAt, world, relayout, pour, unpour, far, prewarm, bandOf, printCPU,
    blockOf, hueOf, discOf,
    get available() { return !!gl && !lost; },
    get clock() { return clock; }, set clock(v) { clock = v; },
    get paused() { return paused; }, set paused(v) { paused = !!v; for (const s of surfaces.values()) s.dirty = true; want(); },
    get allLive() { return allLive; }, set allLive(v) { allLive = v === 'all' ? 'all' : !!v; want(); },
    set table(hex) { table = rgbOf(hex); },
    get driver() { return driver; }, set driver(fn) { driver = typeof fn === 'function' ? fn : null; if (driver) want(); },
    get worldState() { const p = pours.get('inspect'); return { id: p ? p.card : null, pours: pours.size, k: Wd.k, covered: !!p && p.r >= far(p.rect) + p.front }; },
    status() { return Object.fromEntries([...programs.keys()].map((id) => [id, !prog ? 'failed' : prog.ready ? 'ready' : prog.failed ? 'failed' : 'linking'])); },
    get canvas() { return canvas; },
    surfaces, pours,
  };
  // A gallery page loads grounds/shell.js up front and this file after it (never under ?nogpu): this file then
  // upgrades the shell's object in place, taking the settings the page gave it, so a script that took `Ground`
  // before this arrived holds the live API. Loaded on its own (the battle, the bench), it is simply Ground.
  const shell = root.Ground && root.Ground.__shell;
  if (shell) {
    const G = root.Ground;
    for (const k of Object.keys(G)) delete G[k];
    Object.defineProperties(G, Object.getOwnPropertyDescriptors(api));
    paused = !!shell.paused;
    if (!ALL_LIVE_URL && shell.allLive) allLive = shell.allLive;
    if (shell.table) table = rgbOf(shell.table);
    if (shell.driver) driver = shell.driver;
  } else root.Ground = api;
})(globalThis);
