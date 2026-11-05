// Card grounds: one shared WebGL2 context runs every card's own plate shader (grounds/programs.gen.js) on a
// portrait print, GRID = [504, 704]. The API is round 2's (r2/cards-final/ground.js): init, settled, surface,
// remove, frame, world, driver, bake and relayout, with pour and unpour for the rituals and prewarm for the
// battle entry.
//
// One screen. Every cell a print shows is a CSS length:
//   dissolve   a world leaves its trim through the hero's 4x4 Bayer at DCELL, 3 css px
//   grounds    a recipe sizes its own screen through e.cell(css): whole drawing px, never coarser than
//              MAXCELL css px, at every size from a well to the full-screen world
//   prints     a surface at S = 1 is a poster: 504 x 704 drawing px for a 252 css px card at 2x (DENSITY
//              drawing px per css px), the picture tools/posters.cjs bakes, so its first live frame equals its
//              poster wherever the card sits. A surface 'fit' to a card larger than that prints at the card's
//              own device size: its cells keep their css size and its composition scales with the card.
//
// The finish is gx_foil(), after groundMain() and before the band mix. A card's cost in inks is its number of
// passes (SPEC 3.2): foil, emboss, metal and glints, lit by the room's one SUN. The foil is one struck band
// across the face, 30% of it wide, in the chip's own hue turned 20 degrees either way (50 at the top of a
// tier), that lifts the print's own tones rather than replacing them; the metal is the same band on the paper
// in the paper's hue, and the glints are the chip's. At rest the band holds a quarter of its peak at a place
// seeded from the card's id; the hand carries it across the face and the lamp pulls it toward the pointer.
// Outside the band the inked cells are a dark mirror, deeper with every pass. The finish fades out above the band (BAND_TOP), and the subject is DOM above this canvas,
// so neither the name nor the work is ever foiled.
//
// Pours: a card's world leaves its trim through the Bayer and drains back. Several run at once (the pack's
// three cards, the battle's two leads), each with its own program, front and optional half plane (the seam).
// A pour's card sits on whole device px, so its room is a picture registered to the card: bakeRoom() bakes that
// picture once (grounds/<id>.webp), and roomAt(rect) says where it lies around a lens, the room without a GPU.
//
// A print (a recipe's window: a product's own picture printed through its 8x8 screen) is never an image of cells
// resampled at a scale that misses the device pixel. Its tone is printed through the ground's own 8x8 table at one
// device pixel, at the size the card shows: its surface is always the card's device size, a room prints it at the
// world's density, and printCPU() makes the same pixels without a GPU (the page then and before a program links).
// The finish on a print thins its tone under the band and opens glints to the paper, so it stays two inks at every
// tilt. A poster prints it at one css px of its own 252 css px (2 px), the picture shown only without scripts.
(function (root) {
  'use strict';

  const GRID = [504, 704];        // a card's print in drawing px at S = 1 (252 css px at 2x)
  const DENSITY = 2;              // drawing px per css px of a poster
  const IDLE = 1 / 15;            // a visible ground at rest redraws 15 times a second
  const DCELL = 3;                // the dissolve's Bayer cell, css px (the hero's screen)
  const MAXCELL = 3;              // no cell of a print is coarser than this, css px
  const BAND_TOP = 0.8;           // the knock-back is whole here, above the first line of every tier's type
  const RAMP = 0.12;              // and starts this far above it: the band rises from the foot without a rule
  const REST = [0.5, 0.4, 0];     // the lamp at rest: the room's sun only
  const SCREEN = { 'claude-of-tanks': 1.5 }; // the foil's screen, css px: the ground's own where it has one
  const SALT = 1655;              // the band's levels: no two neighbours share one at 5, 4, 2 or 1 columns

  const HEADER = `#version 300 es
precision highp float;
precision highp int;
out vec4 outColor;
vec4 FC;
vec2 vUv;
uniform vec2 gx_origin, gx_size, gx_rev2, gx_tilt, gx_seed;
uniform vec4 gx_subject;
uniform float gx_time, gx_dcell, gx_screen, gx_k, gx_bandTop, gx_quiet;
uniform vec4 gx_frame, gx_rev, gx_pass, gx_half;
uniform vec3 gx_light, gx_paper, gx_chip, gx_table;
float gx_b4(vec2 p) {
  vec2 c = mod(floor(p), 4.);
  int i = int(c.y) * 4 + int(c.x);
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[i]) + .5) / 16.;
}
`;
  // The finishing passes. Ink is the print's distance from its paper, so no mask is drawn.
  const MAIN = `
const vec3 SUN = normalize(vec3(-0.224, 0.447, 0.866));
float gx_h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 gx_lab(vec3 c) {
  c = mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c));
  vec3 m = pow(max(vec3(dot(c, vec3(.4122214708, .5363325363, .0514459929)), dot(c, vec3(.2119034982, .6806995451, .1073969566)), dot(c, vec3(.0883024619, .2817188376, .6299787005))), 0.), vec3(1. / 3.));
  return vec3(dot(m, vec3(.2104542553, .793617785, -.0040720468)), dot(m, vec3(1.9779984951, -2.428592205, .4505937099)), dot(m, vec3(.0259040371, .7827717662, -.808675766)));
}
vec3 gx_lch(float L, float C, float h) {
  vec3 m = vec3(L + .3963377774 * C * cos(h) + .2158037573 * C * sin(h), L - .1055613458 * C * cos(h) - .0638541728 * C * sin(h), L - .0894841775 * C * cos(h) - 1.291485548 * C * sin(h));
  m = m * m * m;
  vec3 c = clamp(vec3(4.0767416621 * m.x - 3.3077115913 * m.y + .2309699292 * m.z, -1.2684380046 * m.x + 2.6097574011 * m.y - .3413193965 * m.z, -.0041960863 * m.x - .7034186147 * m.y + 1.707614701 * m.z), 0., 1.);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c));
}
#ifdef GX_WIN
// A print: the product's picture as tone (one texel per cell of its own print, the ink it carries, R8), the cells
// that fill the face, their box on the face (face units, top down), the foot's feather, the ink, and the screen's
// cell in device px (1 on a screen, 2 on a poster). Each cell takes the tone's mean over the cell's footprint (a box
// at least one texel wide: an area mean where a cell covers several texels, bilinear where it covers less), the
// finish thins it, and the ground's own 8x8 table prints it, counted from the frame's corner. printCPU() is this
// code at rest, line for line.
uniform sampler2D gx_win;
uniform vec4 gx_winCrop, gx_winBox;
uniform vec2 gx_winFoot;
uniform vec3 gx_ink;
uniform float gx_winOn, gx_winCell;
const int GX_B8[64] = int[64](0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28,
  52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21);
float gx_tone(vec2 P, float r) {
  float w = clamp(r, 1., 10.);
  vec2 a = P - .5 * w, b = P + .5 * w;
  ivec2 i0 = ivec2(floor(a)), n = ivec2(floor(b)) - i0, size = textureSize(gx_win, 0);
  float s = 0.;
  for (int j = 0; j <= 10; j++) {
    if (j > n.y) break;
    int y = i0.y + j;
    float wy = min(float(y + 1), b.y) - max(float(y), a.y);
    for (int i = 0; i <= 10; i++) {
      if (i > n.x) break;
      int x = i0.x + i;
      if (x < 0 || y < 0 || x >= size.x || y >= size.y) continue;
      s += wy * (min(float(x + 1), b.x) - max(float(x), a.x)) * texelFetch(gx_win, ivec2(x, y), 0).r;
    }
  }
  return s / (w * w);
}
// the finish on a print: the band thins the tone (the metal: under the light the print burns out to its paper),
// and under the hand glints open single cells of the band, so the face stays two inks at every tilt
float gx_lift(vec2 q, vec2 c, float keep) {
  if (gx_pass.x <= 0. || keep <= 0.) return 0.;
  float act = clamp(length(gx_tilt) * 1.5 + gx_light.z, 0., 1.), amp = mix(.25, 1., act);
  vec2 n = vec2(cos(gx_seed.x), sin(gx_seed.x)), p = vec2((q.x - .5) * .716, q.y - .5);
  float a0 = gx_seed.y - .45 * dot(gx_tilt * vec2(1., -1.), n);
  a0 = mix(a0, dot(vec2((gx_light.x - .5) * .716, gx_light.y - .5), n), .35 * gx_light.z);
  float s = (dot(p, n) - a0) / .18, band = exp(-s * s);
  float edge = mix(smoothstep(.02, .08, q.y), 1., act);
  float lift = (.3 * gx_pass.x + .15 * gx_pass.y + .3 * gx_pass.z) * band * edge * amp * keep;
  float glint = act * gx_pass.w * band * keep * step(.97 - .015 * gx_k, gx_h21(c + 3.));
  return max(lift, glint);
}
vec3 gx_print(vec3 col) {
  float cs = gx_winCell;
  vec2 c = floor(FC.xy / cs), pc = (c + .5) * cs;
  vec2 q = vec2(pc.x / gx_frame.z, 1. - pc.y / gx_frame.w);
  vec2 P = gx_winCrop.xy + (q - gx_winBox.xy) / (gx_winBox.zw - gx_winBox.xy) * gx_winCrop.zw;
  float t = gx_tone(P, cs * gx_winCrop.z / ((gx_winBox.z - gx_winBox.x) * gx_frame.z));
  // the foot dissolves into the paper above the band; carried past the trim (a room) the print runs on across the
  // product's picture and fades to paper within 0.3 card widths of either side, and above the card's top edge it is
  // paper, so no art stands past the top edge
  t *= (1. - smoothstep(gx_winFoot.x, gx_winFoot.y, q.y)) * (1. - smoothstep(.02, .3, max(abs(q.x - .5) - .5, 0.))) * step(0., q.y);
  t *= 1. - gx_lift(q, c, 1. - smoothstep(gx_bandTop - ${RAMP.toFixed(3)}, gx_bandTop, q.y));
  ivec2 i = ivec2(mod(c, 8.));
  return t > 10. / 255. && t * 64. > float(GX_B8[i.y * 8 + i.x]) + .5 ? gx_ink : col;
}
#endif
vec3 gx_foil(vec3 col, vec2 q, float keep) {
  if (gx_pass.x <= 0. || keep <= 0.) return col;
  float ink = smoothstep(.08, .28, distance(col, gx_paper));
  // the hand: 0 at rest, 1 once the card is tilted or lit; at rest the band holds a quarter of its peak
  float act = clamp(length(gx_tilt) * 1.5 + gx_light.z, 0., 1.);
  float amp = mix(.25, 1., act);
  // the print's own screen: emboss domes each cell, glints pick single cells
  vec2 g = gl_FragCoord.xy / gx_screen;
  vec2 cell = floor(g), f = fract(g) - .5;
  vec3 N = normalize(vec3(f * 1.6 * gx_pass.y, 1.));
  // the band: across its seeded axis (face heights, centred), carried by the hand, pulled by the lamp
  vec2 n = vec2(cos(gx_seed.x), sin(gx_seed.x));
  vec2 p = vec2((q.x - .5) * .716, q.y - .5);
  float a0 = gx_seed.y - .45 * dot(gx_tilt * vec2(1., -1.), n);
  a0 = mix(a0, dot(vec2((gx_light.x - .5) * .716, gx_light.y - .5), n), .35 * gx_light.z);
  float s = (dot(p, n) - a0 + .05 * dot(N.xy, n)) / .18;
  // 30% of the face wide at half its peak, and struck: under the hand every cell of the screen catches the
  // light a little differently, so the band reads as metal, never as a soft glow (at rest it lies smooth)
  float band = exp(-s * s);
  float hot = band * mix(1., .62 + .38 * gx_h21(cell + 11.), act);
  float edge = mix(smoothstep(.02, .08, q.y), 1., act);
  vec3 chip = gx_lab(gx_chip), pl = gx_lab(gx_paper), lab = gx_lab(col);
  float h0 = atan(chip.z, chip.y), C0 = clamp(length(chip.yz), .05, .15);
  // pass 2, foil: inside the band the inked cells take the chip's hue, turned at most 20 degrees either way
  // across it (50 at the top of a tier), and rise by a share of the light left above them, so every tone of the
  // print survives under the film and a subject standing on it keeps its edge; outside the band they mirror
  // the room a little darker, deeper with each pass
  // an ink near black is opaque: the film shows in it as hue alone and its tone stays, so a two-tone print keeps
  // its black under the hand (a share of the lift from OKLab L 0.12, all of it from 0.45)
  float Lf = lab.x + (1. - lab.x) * .34 * smoothstep(.12, .45, lab.x) * hot;
  vec3 film = gx_lch(clamp(Lf, .05, .96), mix(length(lab.yz), C0, .8), h0 + radians(mix(20., 50., gx_k)) * clamp(s / 1.6, -1., 1.));
  float depth = .1 + .06 * gx_pass.y + .06 * gx_pass.z;
  vec3 foil = mix(col * (1. - depth * act), film, hot * edge * amp);
  vec3 c = mix(col, foil, gx_pass.x * ink);
  // pass 3, emboss: raking light from the sun on the raised cells, low enough that the screen never reads as a mesh
  c *= mix(1., .84 + .26 * clamp(dot(N, SUN), 0., 1.), gx_pass.y * ink * amp);
  // pass 4, metal: the paper in its own hue, held a shade dark, with one bright band on it as wide as the
  // foil's, rayed from the subject
  float rays = .9 + .1 * sin(28. * atan(q.y - gx_subject.y, (q.x - gx_subject.x) * .716));
  vec3 metal = gx_lch(mix(pl.x * .88, min(.97, pl.x + .3), clamp(hot * rays * 1.25, 0., 1.)), length(pl.yz) * 1.25, atan(pl.z, pl.y));
  c = mix(c, metal, gx_pass.z * (1. - ink) * amp);
  // glints: single cells in the chip's hue, inside the band
  float gl = step(.975 - .015 * gx_k, gx_h21(cell + 3.)) * band * (.5 + .5 * sin(gx_h21(cell) * 40. + s * 3.));
  c += gx_pass.w * gl * edge * amp * gx_chip * .9;
  // the subject stands on the print: its box keeps no foil, emboss or metal, so the finish rings it and every
  // edge of it keeps the ground it was cut against (a window, the scene itself, keeps nothing clear)
  vec2 sd = (q - gx_subject.xy) / max(gx_subject.zw, vec2(1e-3));
  float clear = gx_subject.z > 0. ? smoothstep(.72, 1.04, length(sd)) : 1.;
  return mix(col, c, keep * clear);
}
void main() {
  // a pour: the world arrives through the hero's 4x4 Bayer, a front of cells spreading from the trim
  if (gx_rev2.y > 0.) {
    vec2 o = max(abs(gl_FragCoord.xy - gx_rev.xy) - gx_rev.zw, 0.);
    if (gx_b4(gl_FragCoord.xy / gx_dcell) >= clamp((gx_rev2.x - length(o)) / gx_rev2.y, 0., 1.)) discard;
  }
  float sd = 0.;
  if (gx_half.w >= 0.) { sd = dot(gx_half.xy, gl_FragCoord.xy) - gx_half.z; if (sd < 0.) discard; }
  vec2 local = gl_FragCoord.xy - gx_origin;
  vec2 q = vec2(local.x / gx_size.x, 1. - local.y / gx_size.y);
  FC = vec4(gl_FragCoord.xy - gx_frame.xy, gl_FragCoord.zw);
  vUv = FC.xy / gx_frame.zw;
  outColor = vec4(0., 0., 0., 1.);
  groundMain();
  float keep = 1. - smoothstep(gx_bandTop - ${RAMP.toFixed(3)}, gx_bandTop, q.y);
  vec3 col;
#ifdef GX_WIN
  // a print carries its own finish and has dissolved into its paper above the band
  if (gx_winOn > 0.) col = gx_print(outColor.rgb);
  else {
#endif
  col = gx_foil(outColor.rgb, q, keep);
  // the band mix: under the type the print is knocked back toward its own paper, on the ramp the finish
  // fades on, so the band rises from the foot without a rule
  col = mix(col, gx_paper, gx_quiet * (1. - keep));
#ifdef GX_WIN
  }
#endif
  vec2 d = (q - gx_light.xy) * vec2(1.5, 1.);
  col += keep * gx_light.z * .05 * exp(-dot(d, d) * 6.);
  if (gx_half.w >= 0. && sd < gx_half.w) col = gx_table;
  outColor = vec4(clamp(col, 0., 1.), 1.);
}`;
  const VERT = `#version 300 es
in vec2 aPos; void main() { gl_Position = vec4(aPos, 0., 1.); }`;

  const rgbOf = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
  const valueOf = (v, e) => (typeof v === 'function' ? v(e) : typeof v === 'string' && v[0] === '#' ? rgbOf(v) : v);
  const recipes = () => (root.GROUND_RECIPES || {}).RECIPES || {};
  const dppx = () => Math.min(root.devicePixelRatio || 1, 2);
  const reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';
  const cellOf = (px) => (css) => Math.max(1, Math.round(Math.min(css, MAXCELL) * px));
  const even = (v) => 2 * Math.round(v / 2);

  // The seeds: the plate's own (its place in the recipes), and the band's angle and resting place from the
  // card's id. Three levels a fifth of the face apart, so a wall never reads as a row of header strips.
  function seedOf(card) { const i = Object.keys(recipes()).indexOf(card); return ((Math.max(0, i) * 0.618) % 1) * 6.0; }
  const fnv = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  function bandOf(card) {
    const a = fnv(card + '#' + SALT), b = fnv(card + '#angle');
    const y = 0.24 + 0.19 * (a % 3) + 0.02 * (((a >>> 8) % 101) / 100 - 0.5); // the band's centre on the face's midline
    const ang = ((63.43 + 36 * ((b % 1001) / 1000 - 0.5)) * Math.PI) / 180;    // its normal: the sun's axis, turned
    return { y, ang, seed: [ang, (y - 0.5) * Math.sin(ang)] };
  }

  // A recipe's print on its card: its crop (window.crop, in the picture's cells, the one cut tools/media.py also
  // takes for the window files) stands from the panel's top bleed down to the foot's end, as tall as that and as wide
  // as its aspect makes it, its FRAME x on the face's centre (art.js); the foot (window.foot, face units) dissolves it
  // into the paper above the type; and the ink it prints in.
  const FOOT = [0.62, 0.8];
  function winOf(card) {
    const r = recipes()[card], A = root.ART;
    if (!r || !r.window || !A) return null;
    const foot = r.window.foot || FOOT, bottom = foot[1];
    const [, , cw, ch] = r.window.crop, fx = (A.FRAME[card] || {}).x != null ? A.FRAME[card].x : 0.5;
    const x0 = (1 - A.PANEL_W) / 2, iw = (cw / ch) * (bottom - A.PANEL.top) * A.RATIO;
    const left = Math.min(x0, Math.max(x0 + A.PANEL_W - iw, 0.5 - fx * iw));
    return { crop: r.window.crop, box: [left, A.PANEL.top, left + iw, bottom], foot, ink: rgbOf(r.card.text) };
  }

  // ---------- a print's tone ----------
  // One tone per print, as bytes the GPU and the CPU both read: the product's tone picture where the recipe inlines
  // one (gx_tone), else the tone read back from its own cell print (gx_win: an 8x8 dither of that tone, one texel per
  // cell), a gaussian 1.2 cells wide, the reading that misses the product's own tone by least.
  const tones = new Map();
  function toneOf(card) {
    if (tones.has(card)) return tones.get(card);
    const T = ((root.GROUND_PROGRAMS || {})[card] || {}).textures || {}, src = T.gx_tone || T.gx_win;
    if (!src || typeof Image === 'undefined') return Promise.resolve(null);
    const job = new Promise((res) => {
      const img = new Image();
      img.onerror = () => res(null);
      img.onload = () => {
        try {
          const W = img.width, H = img.height, c = document.createElement('canvas');
          c.width = W; c.height = H;
          const x = c.getContext('2d', { willReadFrequently: true });
          x.drawImage(img, 0, 0);
          const px = x.getImageData(0, 0, W, H).data, n = W * H, d = new Uint8Array(n);
          if (T.gx_tone) for (let i = 0; i < n; i++) d[i] = px[i * 4];
          else {
            const k = [-3, -2, -1, 0, 1, 2, 3].map((v) => Math.exp(-(v * v) / (2 * 1.2 * 1.2))), ks = k.reduce((a, b) => a + b, 0);
            const ink = new Float32Array(n), row = new Float32Array(n);
            for (let i = 0; i < n; i++) ink[i] = px[i * 4] < 128 ? 1 : 0;
            for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { let s = 0; for (let j = 0; j < 7; j++) s += k[j] * ink[y * W + Math.min(W - 1, Math.max(0, xx + j - 3))]; row[y * W + xx] = s / ks; }
            for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { let s = 0; for (let j = 0; j < 7; j++) s += k[j] * row[Math.min(H - 1, Math.max(0, y + j - 3)) * W + xx]; d[y * W + xx] = Math.round((s / ks) * 255); }
          }
          res({ w: W, h: H, d });
        } catch (e) { res(null); }
      };
      img.src = src;
    });
    tones.set(card, job);
    return job;
  }

  // The print at rest on the CPU: gx_print() line for line (the tone's box mean, the foot, the resting band, the
  // 8x8 table counted from the canvas's bottom left corner as gl_FragCoord counts it), into a canvas at its device
  // size. Without a GPU every print is this; with one, a page's prints are this until their program links, and the
  // first live frame draws the same pixels over it.
  const B8 = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function printRest(card, w, h, T, pass) {
    const r = recipes()[card], win = winOf(card);
    const out = new ImageData(w, h), D = out.data, paper = rgbOf(r.card.paper).map((v) => Math.round(v * 255)), ink = win.ink.map((v) => Math.round(v * 255));
    const [cx, cy, cw, ch] = win.crop, [x0, y0, x1, y1] = win.box, band = bandOf(card).seed, FT = win.foot;
    const wr = Math.min(10, Math.max(1, cw / ((x1 - x0) * w)));
    const n = [Math.cos(band[0]), Math.sin(band[0])], G = 0.3 * pass[0] + 0.15 * pass[1] + 0.3 * pass[2];
    for (let gy = 0; gy < h; gy++) {
      const qy = 1 - (gy + 0.5) / h, row = (h - 1 - gy) * w * 4, Py = cy + ((qy - y0) / (y1 - y0)) * ch;
      const foot = 1 - smooth(FT[0], FT[1], qy), keep = 1 - smooth(BAND_TOP - RAMP, BAND_TOP, qy), edge = smooth(0.02, 0.08, qy);
      const ay = Py - 0.5 * wr, by = Py + 0.5 * wr, iy0 = Math.floor(ay), ny = Math.floor(by) - iy0;
      for (let gx = 0; gx < w; gx++) {
        const qx = (gx + 0.5) / w, Px = cx + ((qx - x0) / (x1 - x0)) * cw;
        const ax = Px - 0.5 * wr, bx = Px + 0.5 * wr, ix0 = Math.floor(ax), nx = Math.floor(bx) - ix0;
        let s = 0;
        for (let j = 0; j <= ny; j++) {
          const y = iy0 + j;
          if (y < 0 || y >= T.h) continue;
          const wy = Math.min(y + 1, by) - Math.max(y, ay);
          for (let i = 0; i <= nx; i++) {
            const x = ix0 + i;
            if (x < 0 || x >= T.w) continue;
            s += wy * (Math.min(x + 1, bx) - Math.max(x, ax)) * (T.d[y * T.w + x] / 255);
          }
        }
        let t = s / (wr * wr);
        t *= foot * (1 - smooth(0.02, 0.3, Math.max(Math.abs(qx - 0.5) - 0.5, 0))) * (qy >= 0 ? 1 : 0);
        if (G > 0 && keep > 0) { const sb = (n[0] * (qx - 0.5) * 0.716 + n[1] * (qy - 0.5) - band[1]) / 0.18; t *= 1 - G * Math.exp(-sb * sb) * edge * 0.25 * keep; }
        const lit = t > 10 / 255 && t * 64 > B8[(gy % 8) * 8 + (gx % 8)] + 0.5, c = lit ? ink : paper, k = row + gx * 4;
        D[k] = c[0]; D[k + 1] = c[1]; D[k + 2] = c[2]; D[k + 3] = 255;
      }
    }
    return out;
  }
  // printCPU(canvas, card): prints the card's resting print into its canvas at the canvas's device size and shows
  // it; resolves true once drawn (false when the card has no print, the canvas is not laid out or a live surface owns
  // it). Ground prints a page's .card[data-print] canvases itself (watch()); a page may call it for any other.
  function printCPU(el, card) {
    if (!winOf(card)) return Promise.resolve(false);
    return toneOf(card).then((T) => {
      const s = byCanvas.get(el);
      if (!T || (s && s.painted) || !el.isConnected) return false;
      const [w, h] = deviceSize(el);
      if (!w || !h) return false;
      const f = (root.FIGHTERS || []).find((x) => x.id === card), cost = Number((el.closest && el.closest('[data-cost]') || { dataset: {} }).dataset.cost) || (f && f.cost) || 1;
      const pass = root.ART ? root.ART.passOf(cost) : [0, 0, 0, 0];
      if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
      el.getContext('2d', { alpha: false }).putImageData(printRest(card, w, h, T, pass), 0, 0);
      el.style.opacity = 1;
      return true;
    });
  }
  // Every print on the page is printed at once, on the CPU: those there now and, without a GPU, every copy a ritual
  // adds (the lens, the pack, the wells); with a GPU a copy's live surface prints it.
  function watch() {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    const ids = () => Object.keys(recipes()).filter((id) => winOf(id));
    const sweep = (node) => {
      for (const cv of node.querySelectorAll ? node.querySelectorAll('.card[data-print] canvas.ground') : []) {
        const card = cv.closest('.card').dataset.id;
        if (ids().includes(card) && !byCanvas.has(cv)) printCPU(cv, card);
      }
    };
    const start = () => {
      if (!ids().length) return;
      sweep(document);
      new MutationObserver((list) => {
        if (gl && !lost) return;
        for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) sweep(n.parentNode || n);
      }).observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  }

  let gl = null, canvas = null, lost = false, ext = null, buf = null;
  const programs = new Map();
  const textures = new Map();
  const surfaces = new Map();
  const byCanvas = new Map();
  const pours = new Map();
  let clock = 0, paused = false;
  let table = [0.902, 0.886, 0.862];

  function compile(id) {
    const P = (root.GROUND_PROGRAMS || {})[id];
    if (!P) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const win = !!(P.textures && P.textures.gx_win);
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, (win ? HEADER.replace('\n', '\n#define GX_WIN\n') : HEADER) + P.body + MAIN);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    return { id, prog, vs, fs, uni: null, ready: false, failed: false, warm: false, units: P.textures || {}, win };
  }
  function poll(p) {
    if (p.ready || p.failed) return p.ready;
    if (ext && !gl.getProgramParameter(p.prog, ext.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(p.prog, gl.LINK_STATUS)) {
      p.failed = true;
      console.warn('Ground ' + p.id + ' unavailable:', gl.getShaderInfoLog(p.fs) || gl.getProgramInfoLog(p.prog));
      return false;
    }
    p.uni = new Map();
    const n = gl.getProgramParameter(p.prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p.prog, i);
      p.uni.set(info.name.replace(/\[0\]$/, ''), { loc: gl.getUniformLocation(p.prog, info.name), type: info.type });
    }
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
      case gl.INT: case gl.BOOL: case gl.SAMPLER_2D: gl.uniform1i(u.loc, v); break;
    }
  }
  function makeTexture(w, h, internal, format, data, filter) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    if (data instanceof HTMLCanvasElement || data instanceof HTMLImageElement) gl.texImage2D(gl.TEXTURE_2D, 0, internal, format, gl.UNSIGNED_BYTE, data);
    else gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }
  async function loadTextures(all) {
    const jobs = [];
    for (const [id, r] of Object.entries(all)) {
      const P = (root.GROUND_PROGRAMS || {})[id];
      for (const [name, what] of Object.entries((P && P.textures) || {})) {
        const key = id + ':' + name;
        if (what === 'relay-matrix') {
          const rows = r.matrix.split('/');
          const data = new Uint8Array(rows.length * rows[0].length);
          rows.forEach((row, y) => [...row].forEach((ch, x) => (data[y * row.length + x] = ch === 'p' ? 255 : ch === 'i' ? 128 : 0)));
          textures.set(key, { tex: makeTexture(rows[0].length, rows.length, gl.R8, gl.RED, data, gl.NEAREST) });
        } else if (what === 'glyph-atlas' || what === 'glyph-stream') {
          if (textures.has(id + ':glyphs')) continue;
          textures.set(id + ':glyphs', {});
          jobs.push(glyphs(id, r));
        } else if (name === 'gx_win' || name === 'gx_tone') {
          // a print's tone: one R8 texture of the bytes printCPU() reads too
          if (name === 'gx_win') jobs.push(toneOf(id).then((T) => { if (T && !lost) textures.set(id + ':gx_win', { tex: makeTexture(T.w, T.h, gl.R8, gl.RED, T.d, gl.NEAREST) }); }));
        } else if (/^data:image/.test(what)) {
          jobs.push(new Promise((res) => {
            const img = new Image();
            img.onload = () => { if (!lost) textures.set(key, { tex: makeTexture(0, 0, gl.RGBA, gl.RGBA, img, gl.LINEAR) }); res(); };
            img.onerror = res;
            img.src = what;
          }));
        }
      }
    }
    await Promise.all(jobs);
  }
  // Local Search: the stream of real benchmark queries, set in Katagami Sans (the one face).
  async function glyphs(id, r) {
    const text = r.stream.map((q) => `lsearch "${q}" --json `).join('');
    const flags = [];
    let inQuote = false;
    for (const ch of text) { if (ch === '"') { inQuote = !inQuote; flags.push(0); } else flags.push(inQuote ? 1 : 0); }
    const chars = [...new Set(text)];
    try { await document.fonts.load('500 26px "Katagami Sans"'); } catch (e) {}
    const cw = 32, ch = 96;
    const atlas = document.createElement('canvas');
    atlas.width = cw * chars.length; atlas.height = ch;
    const x = atlas.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, atlas.width, atlas.height);
    x.fillStyle = '#fff'; x.font = '500 26px "Katagami Sans"'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    chars.forEach((c, i) => x.fillText(c, i * cw + cw / 2, ch * 0.62));
    const data = new Uint8Array(text.length * 2);
    [...text].forEach((c, i) => { data[i * 2] = chars.indexOf(c); data[i * 2 + 1] = flags[i] ? 255 : 0; });
    textures.set(id + ':uAtlas', { tex: makeTexture(0, 0, gl.RGBA, gl.RGBA, atlas, gl.LINEAR) });
    textures.set(id + ':uStream', { tex: makeTexture(text.length, 1, gl.RG8, gl.RG, data, gl.NEAREST), extra: { uN: text.length, uGlyphs: chars.length } });
  }

  function init() {
    const all = recipes();
    if (!Object.keys(all).length || !root.GROUND_PROGRAMS) return Promise.resolve(false);
    if (gl) return Promise.resolve(!lost);
    canvas = document.createElement('canvas');
    canvas.width = GRID[0] * 2;
    canvas.height = GRID[1] * 2;
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
    for (const id of Object.keys(all)) { const p = compile(id); if (p) programs.set(id, p); }
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      lost = true;
      for (const s of surfaces.values()) s.el.style.opacity = 0;
      if (Wd.el) Wd.el.style.opacity = 0;
    });
    listen();
    return loadTextures(all).then(() => !lost);
  }
  function settled() {
    return new Promise((res) => {
      const check = () => { if ([...programs.values()].every((p) => poll(p) || p.failed)) res(true); else setTimeout(check, 30); };
      check();
    });
  }

  // The mip view: one poster-sized texture with mipmaps and a framebuffer, and a program that samples it.
  const M = { prog: null };
  function mip() {
    if (M.prog) return M.prog !== -1;
    try {
      const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return x; };
      const fs = sh(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float;
uniform sampler2D u_src; uniform vec2 u_dst; uniform float u_near; out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy / u_dst;
  o = u_near > .5 ? texelFetch(u_src, ivec2(uv * vec2(textureSize(u_src, 0))), 0) : texture(u_src, uv);
}`);
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, fs);
      gl.bindAttribLocation(prog, 0, 'aPos');
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      M.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, M.tex);
      gl.texStorage2D(gl.TEXTURE_2D, 1 + Math.floor(Math.log2(Math.max(...GRID))), gl.RGBA8, GRID[0], GRID[1]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      M.fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, M.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, M.tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      M.prog = prog; M.src = gl.getUniformLocation(prog, 'u_src'); M.dst = gl.getUniformLocation(prog, 'u_dst'); M.near = gl.getUniformLocation(prog, 'u_near');
      return true;
    } catch (e) { M.prog = -1; console.warn('Ground mip view unavailable:', e.message); return false; }
  }

  // ---------- surfaces: one card's print ----------
  // S = 1 (or any whole S) prints the poster's picture, GRID x S, at DENSITY x S drawing px per css px.
  // 'fit' prints the poster's picture while the card is near its size on this screen, and above that the
  // card's own device size: cells keep their css size, the composition scales with the card (S = w / 504).
  // A print's canvas is drawn at whole pixels at rest (card.css: pixelated, which absorbs its layer's sub-pixel
  // offset), and smoothly while its card is turned in 3D: Chrome rasters a turned card at a scale of its own, and a
  // nearest resample of a device-pixel screen there keeps every other cell of the 8x8 table, so whole regions print
  // solid ink or bare paper. Read from the body's inline transform (rituals.js writes it), never a computed style.
  function smoothWhileTurned(s) {
    if (s.body === undefined) s.body = (s.el.closest && s.el.closest('.body')) || null;
    const turned = !!(s.body && s.body.style.transform);
    if (s.turned !== turned) { s.turned = turned; s.el.style.imageRendering = turned ? 'auto' : ''; }
  }
  // A box's size in device px as the browser paints it: its edges snapped to whole css px, then scaled. A print
  // whose canvas is exactly that is drawn one to one, so no pixel of it is resampled at rest. Measured untransformed
  // (a card mid-ritual is laid out at its own size inside a transformed parent: its offset box is that size).
  function deviceSize(el) {
    const k = dppx(), r = el.getBoundingClientRect(), sx = el.offsetWidth ? r.width / el.offsetWidth : 1;
    if (!r.width || !r.height) return [0, 0];
    if (Math.abs(sx - 1) > 0.01) return [Math.round(el.clientWidth * k), Math.round(el.clientHeight * k)];
    return [(Math.round(r.right) - Math.round(r.left)) * k, (Math.round(r.bottom) - Math.round(r.top)) * k];
  }
  function size(s) {
    let w = GRID[0], h = GRID[1];
    if (s.win) {
      // a print is printed at the device pixel: its canvas is the card's own device size at every size, so no
      // image of its cells is ever resampled (its composition scales with the card, as 'fit' does)
      const k = dppx(), [dw, dh] = deviceSize(s.el);
      if (dw && dh) { w = dw; h = dh; s.S = w / GRID[0]; s.px = k; } else { s.S = 1; s.px = DENSITY; }
      s.pw = w; s.ph = h; s.view = null; s.near = false;
      if (s.el.width !== w || s.el.height !== h) { s.el.width = w; s.el.height = h; }
      s.dirty = true;
      return;
    }
    if (!s.fit) { s.px = DENSITY * s.S; w *= s.S; h *= s.S; }
    else {
      const cw = s.el.clientWidth, ch = s.el.clientHeight, k = dppx();
      if (!cw || !ch || Math.round((cw * k) / GRID[0]) <= 1) { s.S = 1; s.px = DENSITY; }
      else { w = Math.round(cw * k); h = Math.round(ch * k); s.S = w / GRID[0]; s.px = k; }
    }
    // a poster shown smaller than itself on this screen: the canvas is the card's device size and the print
    // reaches it through mipmaps, as the browser shows the poster's <img> (see view())
    const vw = Math.round(s.el.clientWidth * dppx()), vh = Math.round(s.el.clientHeight * dppx());
    s.pw = w; s.ph = h;
    s.view = s.S === 1 && vw > 0 && vw < w * 0.8 ? [vw, vh] : null;
    // the view samples the print as the browser samples the card's poster <img>: through mipmaps, or at whole
    // texels on a card marked data-print (a print of whole cells, whose poster and canvas card.css draws
    // pixelated from T1 up), so the first live frame is the first paint either way; read from the attribute,
    // never from a computed style, so sizing a surface forces no style recalc
    s.near = s.el.clientWidth >= 120 && !!(s.el.closest && s.el.closest('[data-print]'));
    if (s.view) [w, h] = s.view;
    if (s.el.width !== w || s.el.height !== h) { s.el.width = w; s.el.height = h; }
    s.dirty = true;
  }
  // opts: pass [foil, emboss, metal, glint], k (place in tier 0..1), subject [x, y] (0..1 from top left)
  function surface(id, el, card, S = 1, opts = {}) {
    const r = recipes()[card];
    if (!r) return null;
    if (surfaces.has(id)) remove(id);
    const s = {
      id, card, el, recipe: r, S: typeof S === 'number' ? S : 1, px: DENSITY, fit: S === 'fit',
      ctx: el.getContext('2d', { alpha: false }),
      paper: rgbOf(r.card.paper), chip: rgbOf(r.card.chip || r.card.text),
      seed: seedOf(card), band: bandOf(card).seed, screen: SCREEN[card] || 2,
      pass: opts.pass || [0, 0, 0, 0], k: opts.k || 0, subject: opts.subject || [0.5, 0.42], quiet: r.card.quiet || 0,
      light: REST.slice(), tilt: [0, 0],
      seen: true, active: false, painted: false, dirty: true, due: (surfaces.size % 4) / 4 * IDLE, win: winOf(card),
    };
    size(s);
    surfaces.set(id, s);
    byCanvas.set(el, s);
    if (io) io.observe(el);
    want();
    return s;
  }
  function remove(id) {
    const s = surfaces.get(id);
    if (!s) return;
    surfaces.delete(id);
    if (byCanvas.get(s.el) === s) { byCanvas.delete(s.el); if (io) io.unobserve(s.el); }
  }
  function ensure(w, h) {
    if (canvas.width >= w && canvas.height >= h) return;
    canvas.width = Math.max(canvas.width, w);
    canvas.height = Math.max(canvas.height, h);
  }

  // One program into one placement of the shared canvas.
  //   o.x, o.y, o.w, o.h   the card in GL px (q space: the finish, the band line, the lamp)
  //   o.frame              the shader's own frame (FC, vUv); the card unless a world is wider
  //   o.S, o.px            the composition's scale, and drawing px per css px (the screen's)
  function run(p, s, o, time) {
    gl.scissor(o.sx, o.sy, o.sw, o.sh);
    gl.useProgram(p.prog);
    const U = (name) => p.uni.get(name);
    const cell = cellOf(o.px);
    set(U('gx_origin'), [o.x, o.y]);
    set(U('gx_size'), [o.w, o.h]);
    set(U('gx_pass'), o.pass || s.pass);
    set(U('gx_tilt'), o.tilt || s.tilt);
    set(U('gx_light'), o.light || s.light);
    set(U('gx_subject'), s.subject.length === 4 ? s.subject : [s.subject[0], s.subject[1], 0, 0]);
    set(U('gx_seed'), s.band);
    set(U('gx_paper'), s.paper);
    set(U('gx_chip'), s.chip);
    set(U('gx_screen'), cell(s.screen));
    set(U('gx_k'), s.k);
    set(U('gx_bandTop'), o.bandTop == null ? BAND_TOP : o.bandTop);
    set(U('gx_quiet'), s.quiet || 0);
    set(U('gx_table'), table);
    set(U('gx_time'), time);
    set(U('gx_rev'), o.rev || [0, 0, 0, 0]);
    set(U('gx_rev2'), o.rev2 || [0, 0]);
    set(U('gx_dcell'), o.dcell || 1);
    set(U('gx_half'), o.half || [0, 0, 0, -1]);
    if (p.win) {
      // a window prints on its card and in its room (a 'card' pour: the card's world carried past its trim);
      // a world composed on the viewport ('view', the battle) is the ground's alone
      const w = s.win || winOf(s.card);
      set(U('gx_winOn'), w && (!o.pour || o.room) ? 1 : 0);
      // one device px a cell on a screen; on a poster one css px of its own 2x (DENSITY)
      set(U('gx_winCell'), o.poster ? DENSITY : 1);
      if (w) { set(U('gx_winCrop'), w.crop); set(U('gx_winBox'), w.box); set(U('gx_winFoot'), w.foot); set(U('gx_ink'), w.ink); }
    }
    const fr = o.frame || [o.x, o.y, o.w, o.h], f = o.f || 0;
    set(U('gx_frame'), fr);
    const L = o.light || s.light;
    const e = { w: fr[2], h: fr[3], S: o.S, px: o.px, cell, f, t: time + (s.recipe.t0 || 0), u: L[0], v: L[1], z: L[2], seed: s.seed };
    // a world composed on the room takes the recipe's world: values; a card's world carried past its trim
    // takes its room: values (a ground whose print is one object keeps that object on the card)
    const wv = s.recipe.world || {}, rv = (o.room && s.recipe.room) || {};
    for (const [name, v] of Object.entries(s.recipe.uniforms)) {
      let x = valueOf(name in rv ? rv[name] : v, e);
      if (f > 0 && name in wv) { const y = valueOf(wv[name], e); x = Array.isArray(x) ? x.map((a, i) => a + (y[i] - a) * f) : x + (y - x) * f; }
      set(U(name), x);
    }
    let unit = 0;
    for (const name of Object.keys(p.units)) {
      const t = textures.get(s.card + ':' + name);
      if (!t || !t.tex) continue;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      set(U(name), unit++);
      if (t.extra) for (const [k2, v2] of Object.entries(t.extra)) set(U(k2), v2);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    p.warm = true;
  }

  function draw(s, time, rest, to = s.ctx) {
    const p = programs.get(s.card);
    if (!p || !poll(p)) return false;
    const w = s.pw || s.el.width, h = s.ph || s.el.height;
    const view = to === s.ctx && s.view && mip();
    ensure(w, h);
    if (view) { gl.bindFramebuffer(gl.FRAMEBUFFER, M.fb); gl.viewport(0, 0, GRID[0], GRID[1]); }
    else gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    gl.scissor(0, 0, w, h);
    gl.clearColor(s.paper[0], s.paper[1], s.paper[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    run(p, s, { x: 0, y: 0, w, h, sx: 0, sy: 0, sw: w, sh: h, S: s.S, px: s.px, poster: !!s.poster, ...(rest ? { light: REST, tilt: [0, 0] } : null) }, time);
    if (view) {
      // the print's mipmaps, sampled trilinearly at the card's device size: the browser's own path for the
      // poster <img> under it, so the first live frame is the first paint on a 1x screen too
      gl.bindTexture(gl.TEXTURE_2D, M.tex);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const [vw, vh] = s.view;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.scissor(0, 0, vw, vh);
      gl.useProgram(M.prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, M.tex);
      gl.uniform1i(M.src, 0);
      gl.uniform2f(M.dst, vw, vh);
      gl.uniform1f(M.near, s.near ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      s.ctx.drawImage(canvas, 0, canvas.height - vh, vw, vh, 0, 0, vw, vh);
    } else to.drawImage(canvas, 0, canvas.height - h, w, h, 0, 0, w, h);
    if (to !== s.ctx) return true;
    if (s.win) smoothWhileTurned(s);
    if (!s.painted) { s.painted = true; s.el.style.opacity = 1; }
    s.dirty = false;
    s.draws = (s.draws || 0) + 1;
    return true;
  }

  // ---------- pours: a card's world leaving its trim ----------
  // A pour is { card, rect: {x, y, w, h} css px in the viewport, r: front distance css px, front: its width,
  // mode: 'card' (the card's own composition carried past its trim) or 'view' (composed on the viewport),
  // half: [nx, ny, d, rule] in css px or null, z, pass, k, subject }. Its cells are css px, as on the card.
  const Wd = { el: null, ctx: null, k: 1, cw: 0, ch: 0, dirty: false };
  function sizeWorld() {
    const el = Wd.el;
    const cw = Math.round(innerWidth), ch = Math.round(innerHeight);
    // a world prints at the screen's own density up to 6 MP (1440 x 900 at 2x), so its cells stay crisp
    Wd.k = dppx() >= 2 && cw * ch * 4 <= 6e6 ? 2 : 1;
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
  function pour(key, o) {
    if (!gl || lost || !recipes()[o.card] || !worldCanvas()) return null;
    const r = recipes()[o.card];
    const p = pours.get(key) || {};
    Object.assign(p, {
      card: o.card, recipe: r, seed: seedOf(o.card), band: bandOf(o.card).seed, paper: rgbOf(r.card.paper), chip: rgbOf(r.card.chip || r.card.text),
      screen: SCREEN[o.card] || 2, pass: o.pass || [0, 0, 0, 0], k: o.k || 0, subject: o.subject || [0.5, 0.42],
      light: REST, tilt: [0, 0], rect: o.rect, r: o.r || 0, front: o.front || 160, mode: o.mode || 'card', half: o.half || null, z: o.z || 0,
    });
    pours.set(key, p);
    Wd.dirty = true;
    want();
    return p;
  }
  function unpour(key) {
    if (key == null) pours.clear(); else pours.delete(key);
    Wd.dirty = true;
    want();
  }
  // The farthest a front must travel from rect to cover the whole viewport.
  function far(rect) {
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    return Math.max(...[[0, 0], [innerWidth, 0], [0, innerHeight], [innerWidth, innerHeight]].map(([x, y]) => Math.hypot(Math.max(Math.abs(x - cx) - rect.w / 2, 0), Math.max(Math.abs(y - cy) - rect.h / 2, 0))));
  }
  // One pour's placement in GL px: its card, its scissor and its screen.
  function placeOf(s) {
    const k = Wd.k, W = Wd.cw * k, H = Wd.ch * k;
    const R = s.rect, reach = s.r + 2;
    const x0 = Math.max(0, Math.floor((R.x - reach) * k)), x1 = Math.min(W, Math.ceil((R.x + R.w + reach) * k));
    const y0 = Math.max(0, Math.floor((Wd.ch - R.y - R.h - reach) * k)), y1 = Math.min(H, Math.ceil((Wd.ch - R.y + reach) * k));
    // the card's corner on an even device px, so its room is one picture registered to the card (bakeRoom), down
    // to the 2 x 2 quads a shader's derivatives are taken over
    const card = { x: even(R.x * k), y: even((Wd.ch - R.y - R.h) * k), w: R.w * k, h: R.h * k };
    const view = s.mode === 'view';
    let half = null;
    if (s.half) {
      // the line nx * x + ny * y = d in css px (y down) becomes GL px (y up)
      const [nx, ny, d, rule] = s.half;
      half = [nx, -ny, (d - ny * Wd.ch) * k, rule * k];
    }
    return {
      ...card, sx: x0, sy: y0, sw: x1 - x0, sh: y1 - y0, S: view ? k / DENSITY : card.w / GRID[0], px: k, pass: [0, 0, 0, 0],
      frame: view ? [0, 0, W, H] : [card.x, card.y, card.w, card.h], f: view ? 1 : 0, room: !view, bandTop: 9,
      rev: [card.x + card.w / 2, card.y + card.h / 2, card.w / 2, card.h / 2],
      rev2: [s.r * k, Math.max(1, Math.min(s.front, s.r)) * k], dcell: DCELL * k, half, pour: true,
    };
  }
  function drawPours(time) {
    if (!Wd.el) return;
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
      const p = programs.get(s.card);
      if (!p || !poll(p) || s.r <= 0) continue;
      const o = placeOf(s);
      if (o.sw <= 0 || o.sh <= 0) continue;
      run(p, s, o, time);
    }
    Wd.ctx.globalCompositeOperation = 'copy';
    Wd.ctx.drawImage(canvas, 0, canvas.height - H, W, H, 0, 0, Wd.el.width, Wd.el.height);
    Wd.ctx.globalCompositeOperation = 'source-over';
    Wd.dirty = false;
  }
  // The inspected card's world: Ground.world(id, { rect, instant }) and Ground.world(null).
  function world(id, opts = {}) {
    if (id == null) { unpour('inspect'); return true; }
    const rect = opts.rect || { x: innerWidth / 2 - 150, y: innerHeight / 2 - 210, w: 300, h: 419 };
    return !!pour('inspect', { card: id, ...opts, rect, r: opts.instant ? far(rect) + 200 : opts.r || 0 });
  }
  // The battle's split world, ready before it is needed: the shared canvas and the world canvas at the
  // viewport's size, each lead's program drawn once over the whole viewport down the seam's path, and one
  // full copy into the world canvas (then cleared), so the entry's first frames allocate, compile, upload
  // and copy nothing new. The rituals call it at idle after boot and when the rival is dealt.
  const warmed = new Set();
  function prewarm(ids = []) {
    if (!gl || lost || !worldCanvas()) return false;
    if (Wd.el.width !== Math.round(innerWidth) * Wd.k) sizeWorld();
    const k = Wd.k, W = Wd.cw * k, H = Wd.ch * k;
    ensure(W, H);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    let n = 0, drew = false;
    for (const id of ids) {
      const p = programs.get(id);
      if (!p || !poll(p)) continue;
      n++;
      if (warmed.has(id)) continue;
      const rect = { x: Wd.cw / 2 - 150, y: Wd.ch / 2 - 210, w: 300, h: 419 }, r = recipes()[id];
      const s = { card: id, recipe: r, seed: seedOf(id), band: bandOf(id).seed, paper: rgbOf(r.card.paper), chip: rgbOf(r.card.chip || r.card.text), screen: SCREEN[id] || 2, pass: [0, 0, 0, 0], k: 0, subject: [0.5, 0.42], light: REST, tilt: [0, 0], rect, r: far(rect) + 240, front: 220, mode: 'view', half: [1, 0, Wd.cw / 2, 1.5], z: 0 };
      run(p, s, { ...placeOf(s), sx: 0, sy: 0, sw: W, sh: H }, clock);
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
    return n === ids.length;
  }

  // ---------- the clock ----------
  // Active (hovered, inspected) surfaces draw every frame, dirty ones once; visible ones at rest at 15 fps;
  // offscreen ones draw nothing, and hidden tabs, Pause Motion and reduced motion stop the clock. While a world covers the
  // viewport the gallery under it is not drawn. The clock holds at 0 until every program has linked, so each
  // card's first live frame is exactly its t = 0 poster.
  let linked = false;
  function step(dt) {
    if (!gl || lost) return false;
    dt = Math.min(Math.max(dt || 0, 0), 0.1);
    const live = !reduced.matches && !hidden() && !paused;
    if (!linked) linked = [...programs.values()].every((p) => poll(p) || p.failed);
    let more = false;
    const covered = [...pours.values()].some((p) => p.mode !== 'view' && p.r >= far(p.rect) + p.front);
    if (Wd.el && (pours.size || Wd.dirty)) {
      if (pours.size && (live || Wd.dirty)) drawPours(clock);
      else if (!pours.size) { Wd.ctx.clearRect(0, 0, Wd.el.width, Wd.el.height); Wd.dirty = false; }
      if (pours.size && live) more = true;
    }
    for (const s of surfaces.values()) {
      // a surface the hand (or a script) holds draws wherever it is; a resting one only on screen
      if (!s.active && (!s.seen || covered)) continue;
      const pending = !s.painted || s.dirty;
      if (pending || s.active) { if (draw(s, clock)) { if (s.active && live) more = true; } else more = true; continue; }
      if (!live) continue;
      more = true;
      s.due += dt;
      if (s.due < IDLE) continue;
      s.due = Math.min(s.due - IDLE, IDLE);
      draw(s, clock);
    }
    if (live && linked) clock += dt;
    return more;
  }

  // Ground.frame(dt) runs from the page's one rAF loop and returns true while the grounds want another
  // frame. Ground.driver = kick lets them restart that loop when a card scrolls into view, the tab returns or
  // a world opens. Until a page registers a driver, the grounds keep themselves alive with their own frame
  // callback, and only while nobody else is calling frame().
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
  // A layout change: fitted surfaces take their new device size, the world its viewport.
  function relayout() {
    for (const s of surfaces.values()) { if (s.fit || s.win) size(s); s.dirty = true; }
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
        }
        if (wake) want();
      }, { rootMargin: '64px' });
      for (const s of surfaces.values()) io.observe(s.el);
    }
    document.addEventListener('visibilitychange', want);
    if (reduced.addEventListener) reduced.addEventListener('change', () => { for (const s of surfaces.values()) s.dirty = true; want(); });
    let t = 0;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(relayout, 60); });
  }

  // The poster for one card: this exact program at t = 0 with the resting finish and no lamp.
  // A print's poster is printed at GRID, one css px of its own 252 css px a cell.
  function bake(id, t = 0, type = 'image/png', q) {
    const s = surfaces.get(id);
    if (!gl || !s) return null;
    const live = s.win ? { S: s.S, px: s.px, pw: s.pw, ph: s.ph } : null;
    if (live) Object.assign(s, { S: 1, px: DENSITY, pw: GRID[0], ph: GRID[1], poster: true });
    const c = document.createElement('canvas');
    c.width = s.pw; c.height = s.ph;
    draw(s, t, true, c.getContext('2d', { alpha: false }));
    if (live) Object.assign(s, live, { poster: false });
    s.dirty = true;
    return c.toDataURL(type, q);
  }

  // The room: the card's world carried past its trim (a 'card' pour at rest: no finish, no band, no window), baked
  // once for the lens's widest card, ROOM.W css px at 1x, over ROOM.x to ROOM.x + ROOM.w card widths and ROOM.y to
  // ROOM.y + ROOM.h card heights. The card's corner sits on an even px, as a live pour's does (placeOf), so where
  // a lens is ROOM.W wide on a 1x screen the baked room is the live room's t = 0 frame pixel for pixel.
  const ROOM = { W: 560, x: -0.85, y: -0.2, w: 3.5, h: 1.4 };
  const roomBox = () => {
    const W = ROOM.W, H = W * (GRID[1] / GRID[0]);
    const bw = Math.round(ROOM.w * W), bh = Math.round(ROOM.h * H);
    // the card's corner in the bake, GL px from its bottom left
    return { W, H, bw, bh, fx: even(-ROOM.x * W), fy: even((ROOM.h + ROOM.y - 1) * H) };
  };
  function bakeRoom(id, t = 0, type = 'image/png', q) {
    const r = recipes()[id], p = programs.get(id);
    if (!gl || lost || !r || !p || !poll(p)) return null;
    const B = roomBox();
    ensure(B.bw, B.bh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    const s = { card: id, recipe: r, seed: seedOf(id), band: bandOf(id).seed, paper: rgbOf(r.card.paper), chip: rgbOf(r.card.chip || r.card.text), screen: SCREEN[id] || 2, pass: [0, 0, 0, 0], k: 0, subject: [0.5, 0.42], light: REST, tilt: [0, 0], win: null };
    const card = { x: B.fx, y: B.fy, w: B.W, h: B.H };
    run(p, s, { ...card, sx: 0, sy: 0, sw: B.bw, sh: B.bh, S: B.W / GRID[0], px: 1, pass: [0, 0, 0, 0], frame: [card.x, card.y, card.w, card.h], f: 0, room: true, bandTop: 9, pour: true }, t);
    const c = document.createElement('canvas');
    c.width = B.bw; c.height = B.bh;
    c.getContext('2d', { alpha: false }).drawImage(canvas, 0, canvas.height - B.bh, B.bw, B.bh, 0, 0, B.bw, B.bh);
    for (const sf of surfaces.values()) sf.dirty = true;
    return c.toDataURL(type, q);
  }
  // Where the baked room lies, in css px, around a lens card at rect (css px in the viewport): scaled with the
  // card, its corner snapped as the live pour snaps it. Needs no GPU: it is the room's place without one.
  function roomAt(rect, k = 1, vh = typeof innerHeight === 'number' ? Math.round(innerHeight) : 0) {
    const B = roomBox(), s = rect.w / B.W;
    const left = even(rect.x * k) / k, bottom = vh - even((vh - rect.y - rect.h) * k) / k;
    return { x: left - B.fx * s, y: bottom - (B.bh - B.fy) * s, w: B.bw * s, h: B.bh * s };
  }

  root.Ground = {
    GRID, DENSITY, IDLE, DCELL, MAXCELL, BAND_TOP, RAMP, ROOM,
    init, settled, surface, remove, frame, bake, bakeRoom, roomAt, world, relayout, pour, unpour, far, prewarm, bandOf, printCPU,
    get available() { return !!gl && !lost; },
    get clock() { return clock; }, set clock(v) { clock = v; },
    get paused() { return paused; }, set paused(v) { paused = !!v; for (const s of surfaces.values()) s.dirty = true; want(); },
    set table(hex) { table = rgbOf(hex); },
    get driver() { return driver; }, set driver(fn) { driver = typeof fn === 'function' ? fn : null; if (driver) want(); },
    get worldState() { const p = pours.get('inspect'); return { id: p ? p.card : null, pours: pours.size, k: Wd.k, covered: !!p && p.r >= far(p.rect) + p.front }; },
    status() { return Object.fromEntries([...programs].map(([id, p]) => [id, p.ready ? 'ready' : p.failed ? 'failed' : 'linking'])); },
    surfaces, pours,
  };
  watch();
})(globalThis);
