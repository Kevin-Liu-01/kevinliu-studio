// Every card's ground is its plate's own shader, run live in the table's one WebGL2 context.
// A recipe names the shader (r2/plates/<id>/...), the values its plate gives, the few edits that
// fit it to a card (each must match exactly once, or tools/grounds.mjs fails), and the card's
// colours around it: paper under the print, the name, the cost chips, and how far the band under
// the name is knocked back toward the paper so the name stays legible.
//
// Uniform values are constants (a hex string is an sRGB vec3) or functions of the surface:
//   e.w, e.h   the shader's frame in drawing px: 504 x 704 at S = 1 (a 252 css px card at 2x)
//   e.S        the composition's scale: 1 on a poster, w / 504 on a larger print, so a composition unit
//              (a sticker, a tile, a lattice of dots sized to the card) multiplies by S
//   e.px       drawing px per css px; e.cell(css) is a screen of css px in whole drawing px, never coarser
//              than ground.js's MAXCELL (3 css px), so every Bayer cell keeps its css size at every scale
//   e.t        seconds since the table was dealt (plus t0); 0 is the baked poster
//   e.u, e.v   the pointer on the card, 0..1 from the top left; e.z its strength 0..1
//   e.seed     a per-card seed
//   e.f        0 on a card, 1 in its world (the viewport); the lens runs between the two
// A recipe's world holds the few values that change when its ground fills the viewport (a
// composition sized in cells rather than in frames); each is eased in with e.f.
(function (root) {
  'use strict';
  const rgb = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
  const lin = (h) => rgb(h).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const oklab = (h) => {
    const [r, g, b] = lin(h);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  };
  const mix = (a, b, k) => { const x = rgb(a), y = rgb(b); return x.map((v, i) => v + (y[i] - v) * k); };
  const res = (e) => [e.w, e.h];
  const time = (e) => e.t;
  const dpr = (e) => 2 * e.S; // a composition's own css px, scaled with the card
  const pointer01 = (e) => [e.u, 1 - e.v];
  const pointerPx = (e) => (e.z > 0 ? [e.u * e.w, (1 - e.v) * e.h] : [-1e4, -1e4]);
  const seed = (e) => e.seed;
  // The worlds lane's shared header: resolution, time, pointer, seed.
  const world = { resolution: res, time, pointer: pointer01, seed };

  const RECIPES = {
    turboslide: {
      shader: 'turboslide/ground.frag',
      engine: 'Turboslide two-tone screen: the paper:dithering sphere through the 8x8 Bayer table at 2 css px cells',
      // u_k is the sphere's size per cell, so it follows the cell to keep the sphere the card's size
      // On the card the print is the lantern alone: the window (below) through this screen on its paper, the sphere
      // set off the face, so no dark half disc stands under the lantern or behind the name; carried past the trim
      // (the lens, the pack) the room is the same paper. The sphere is the world's: it fills a room (world:).
      uniforms: { u_resolution: res, u_time: time, u_dpr: (e) => e.cell(2), u_ink: '#070707', u_paper: '#f3f2ee', u_cell: 1, u_k: (e) => (0.0045 * e.cell(2)) / (4 * e.S), u_offset: [64, 64], u_period: 4 },
      world: { u_k: (e) => 0.82 / Math.floor(e.h / e.cell(2)), u_offset: (e) => [-0.295 * (e.w / e.h), 0.082] },
      // the window is the product's own print of the lighthouse (r2/plates/turboslide/hero-cells.png: one pixel per
      // screen cell, exactly its canvas screen's 8x8 dither of the slide's tone, inlined byte for byte); ground.js
      // reads the tone back from those cells and prints it through the same 8x8 table at one device pixel
      // crop: the lantern, its gallery, the horizon either side and the tower's top, all 450 rows of the picture; the
      // card prints it from its top bleed at one device pixel (ground.js) and dissolves it into the paper over foot,
      // so no band of bare paper over 15% of the face stands above the name; tools/media.py cuts the window files
      // the battle entry stands from the same cells. tone: the product's own tone picture those cells are the exact 8x8
      // dither of (Turboslide@3e22c8f54 apps/studio/src/components/site/pictures/lighthouse-tone.webp, recorded in
      // tools/art/src/sources.json), so the print reads the true tone, not one read back from the cells
      window: { cells: 'turboslide/hero-cells.png', tone: 'tools/art/src/turboslide/tone.webp', crop: [172, 0, 600, 450], foot: [0.64, 0.84] },
      card: { paper: '#f3f2ee', text: '#070707', chip: '#2f5ce0', quiet: 0.3 },
    },
    glyphfield: {
      shader: 'glyphfield/ground.frag',
      engine: 'Glyphfield original material, dither gradient (MIT)',
      // its cells are sized against a 900 px reference height; this keeps them 0.83 css px at every size.
      // Its three flat inks need no sub-level dither (it only made the poster's bytes noise).
      // The G's seat: under the G the field holds its dark and its violet, never its teal, so the plume flowing past
      // never takes the G below 3:1 (uSeat 0.7, an ellipse over the G's box from art.js); a world composed on the room
      // has no G and flows everywhere.
      patch: [['const float REFERENCE_HEIGHT = 900.0;', 'uniform float REFERENCE_HEIGHT; uniform float uSeat;'], ['display += (hash12(gl_FragCoord.xy + 0.37) + hash12(gl_FragCoord.xy * 1.31 + 19.19) - 1.0) / 255.0;', ''],
        ['float level = clamp(smoothstep(0.18, 0.95, flow), 0.0, 0.999) * 2.0;', 'float level = clamp(smoothstep(0.18, 0.95, flow), 0.0, 0.999) * 2.0 * (1.0 - uSeat * (1.0 - smoothstep(0.8, 1.05, length((gl_FragCoord.xy / u_resolution - vec2(0.5, 0.6)) / vec2(0.42, 0.32)))));']],
      uniforms: {
        REFERENCE_HEIGHT: (e) => (900 * e.h) / (176 * e.px),
        u_resolution: res, u_pointer: pointerPx, u_time: time,
        u_color_a: lin('#080A18'), u_color_b: lin('#7056FF'), u_color_c: lin('#91FFE1'),
        u_lab_a: oklab('#080A18'), u_lab_b: oklab('#7056FF'), u_lab_c: oklab('#91FFE1'),
        u_strength: 0.3, u_detail: 3.2, u_frequency: 5.5, u_grain: 32, u_amplitude: 3.2, u_density: 0.8, u_brightness: 0.64, u_rotation: 70, u_scale: 1, uSeat: 0.7,
      },
      world: { uSeat: 0 },
      card: { paper: '#080a18', text: '#efeaff', chip: '#91ffe1', quiet: 0.4 },
    },
    jarhead: {
      shader: 'jarhead/plate.json',
      engine: "Jarhead's tone field on its own 8x8 Bayer island; the pool under the blob follows the pointer in whole cells",
      uniforms: {
        uRes: res, uCell: (e) => e.cell(2), uPeak: 0.78, uFloor: 0.2, uBands: 6, uGround: '#131721', uTone: '#5b82ff',
        uL0: (e) => [0.5 + 0.04 * (e.u - 0.5) * 2 * e.z + 0.012 * Math.sin(e.t * 0.5), 0.708 + 0.04 * (e.v - 0.5) * 2 * e.z, 0.5, 0.6],
        uL1: [0.5, 0.05, 0.5, 0.32], uS: [1, 0.7],
      },
      card: { paper: '#131721', text: '#e9eeff', chip: '#60d8f8', quiet: 0.2 },
    },
    katagami: {
      shader: 'katagami/ground.frag',
      engine: "the specimen's construction sheet: the 128-unit grid, the font's vertical metrics and score points breathing with the weight axis",
      // no drifting point stands in the type rail (the face's bottom 20%) on the card, so no score square reads as a
      // cost square beside the name (uRail); a world composed on the room keeps every point. One cool light stands
      // behind the 'a' (uPeak), on the card and in its room
      patch: [['void main(){', 'uniform float uRail, uPeak;\nvoid main(){'], ['outColor = vec4(col, 1.);', 'vec2 pk = (f / resolution - vec2(.5, .58)) * vec2(1., resolution.y / resolution.x); col += uPeak * vec3(.05, .07, .1) * exp(-dot(pk, pk) / .14);\n  outColor = vec4(col, 1.);'], ['float sq = step(max(d.x,d.y), 6.*u);', 'float rail = 1. - uRail * step(node.y, resolution.y * u * .2); float sq = step(max(d.x,d.y), 6.*u) * rail;'], ['col = mix(col, inkCut, max(line*.85, ring));', 'col = mix(col, inkCut, max(line*.85, ring) * rail);']],
      uniforms: { ...world, inkSheet: '#172634', inkRule: '#41454c', inkScore: '#6c94ff', inkCut: '#ff5246', unitPx: (e) => 0.2 * e.S, uRail: 1, uPeak: 1 },
      world: { uRail: 0, uPeak: 0 },
      room: { uRail: 0 },
      card: { paper: '#172634', text: '#ebece9', chip: '#ff5246', quiet: 0.3 },
    },
    'claude-of-tanks': {
      shader: 'claude-of-tanks/ground.frag',
      engine: "the desert map's wind-rippled sand through Kevin's 4x4 ordered Bayer, crossed by one APFSDS tracer every 2.4 s; the pointer turns the wind",
      uniforms: { ...world, inkSand: '#f0b786', inkShadow: '#957349', inkSky: '#568bc0', inkTracer: '#ffd27a', cell: (e) => e.cell(1.5), ripple: 22, horizon: 0.62 },
      card: { paper: '#f0b786', text: '#2a1c10', chip: '#568bc0', quiet: 0.5 },
    },
    mailroom: {
      shader: 'mailroom/plate.json',
      engine: "the landing's .dither dot field, drifting along the belt one cell per 4 s",
      patch: [['float m=clamp(1.-(length(e)-.3)/(.72-.3),0.,1.);', 'float m=clamp(1.-(length(e*.4)-.3)/(.72-.3),0.,1.);']],
      uniforms: { uRes: res, uGrid: (e) => Math.round(8 * e.px), uR0: (e) => 0.7 * e.px, uR1: (e) => e.px, uAlpha: 0.6, uT: time, uPage: '#393b3e', uInk: '#f4f4f4', uC: [0.62, 0.5] },
      card: { paper: '#393b3e', text: '#f4f4f4', chip: '#f4f4f4', quiet: 0 },
    },
    'local-search': {
      shader: 'local-search/plate.json',
      // the queries the benchmark ran that name no company, in 14 x 47 css px cells, so every glyph stands 9 css px
      // tall: text a reader can read, or none; it thins out under the type rail (uRail), on the card only
      engine: 'a Katagami Sans glyph field of the benchmark\'s own queries, ticking with the 3.6 s signal',
      patch: [
        ['float fade=pow(clamp(1.15-length((q-.5)/.62),0.,1.),1.2);', 'float fade=pow(clamp(1.15-length((q-.5)/1.4),0.,1.),1.2)*(1.-uRail*smoothstep(.76,.86,q.y));'],
        ['uniform vec3 uPage,uInk,uAcc;', 'uniform vec3 uPage,uInk,uAcc; uniform float uRail;'],
        ["float al=g*fade*(s.g>.5?.11:.045);", "float al=g*fade*(s.g>.5?1.:.62);"],
      ],
      textures: { uAtlas: 'glyph-atlas', uStream: 'glyph-stream' },
      stream: ['rust async cancellation', 'best static site generator', 'local first software', 'princeton computer science curriculum', 'coffee shops san francisco', 'weather los angeles tomorrow', 'latest sqlite release'],
      uniforms: { uRes: res, uCell: (e) => [14 * e.px, 47 * e.px], uShift: (e) => Math.floor(e.t / (3.6 / 17)), uPage: '#badde1', uInk: '#151515', uAcc: '#168b90', uRail: 1 },
      world: { uRail: 0 },
      room: { uRail: 0 },
      card: { paper: '#badde1', text: '#151515', chip: '#168b90', quiet: 0.35 },
    },
    'agent-pets': {
      shader: 'agent-pets/ground.frag',
      // the fence is the card's (fourteen posts across), whatever the size of its pixels
      patch: [['*resolution.x/(pixel*9.));', '*14.);']],
      engine: "Cute Cat's Sunbeam garden from world-scenes.mjs on a hard pixel grid, the sky through the 8x8 Bayer; the pointer moves the planes",
      uniforms: { ...world, inkSky: '#9fc4bc', inkHorizon: '#eae2bd', inkFar: '#93af80', inkMid: '#668663', inkTrim: '#d5d29b', inkGround: '#8da66b', inkLight: '#fff2b8', pixel: (e) => e.cell(2) },
      card: { paper: '#8da66b', text: '#1f2a17', chip: '#fff2b8', quiet: 0.35 },
    },
    loop: {
      shader: 'loop/plate.json',
      engine: "Loop's GrainShader: the landing's warm glow under the skill cards, its grain held still, one grain per css px",
      patch: [['floor(uTime*4.)*1000.', 'floor(uTime*0.)*1000.'], ['uniform float uTime,uGlow;', 'uniform float uTime,uGlow,uGrainPx; uniform vec3 uBase;'], ['vec3 base=vec3(.031,.031,.039);', 'vec3 base=uBase;'], ['hash(uv*uRes+', 'hash(floor(uv*uRes/uGrainPx)+']],
      // the landing's warm glow, low and centred behind the gear (its one light peak): the subject is Loop's own orange
      // mark, so a glow of its hue at 0.8 left it at 1.25:1 against its world; at 0.22 it stands in light and holds 3:1
      uniforms: { uTime: time, uGlow: 0.22, uRes: res, uBase: '#241913', uGrainPx: (e) => e.cell(1), uC: (e) => [0.5 + 0.04 * Math.sin(e.t * 0.35), 0.62] },
      card: { paper: '#241913', text: '#efe9e2', chip: '#e8650a', quiet: 0 },
    },
    'agent-machines': {
      shader: 'agent-machines/plate.json',
      engine: "the core gear's own construction: hairline rings every two modules, travelling outward one step per tooth (0.8 s)",
      patch: [['uniform vec2 uRes,uCore;', 'uniform vec2 uRes,uCore; uniform vec3 uPaper,uLine; uniform float uFade;'], ['clamp(1.-f/.6,0.,1.)', 'clamp(1.-f/1.1,0.,1.)'], ['/520.', '/uFade'], ['vec3 c=mix(vec3(.984),vec3(0.),line*fade*.10);', 'vec3 c=mix(uPaper,uLine,line*fade*.5);']],
      uniforms: { uRes: res, uCore: (e) => [e.w / (4 * e.S), (e.h * 0.47) / (2 * e.S)], uUnit: 0.36, uDpr: dpr, uT: time, uPaper: '#d7d6e4', uLine: '#1d1c22', uFade: 900 },
      world: { uFade: 2600 },
      card: { paper: '#d7d6e4', text: '#1d1c22', chip: '#22c55e', quiet: 0 },
    },
    prototemplate: {
      shader: 'prototemplate/ground.frag',
      engine: 'Prototemplate Studio Field, the bayer-8x8 preset (verbatim from prototemplate-studio-field.ts)',
      patch: [['float cellSize = mix(1.0, 4.0, uGrain / 100.0);', 'float cellSize = mix(1.0, 4.0, uGrain / 100.0) * uPx;'], ['uniform float uGrain;', 'uniform float uGrain; uniform float uPx;']],
      t0: 8,
      uniforms: { uResolution: res, uTime: time, uPx: (e) => e.px / 2, uColorA: [0.016, 0.024, 0.04], uColorB: [0.184, 0.361, 0.878], uColorC: [0.616, 0.725, 1], uStrength: 0.62, uDetail: 3.6, uFrequency: 5.8, uGrain: 45, uAmplitude: 3.2, uDensity: 0.8, uBrightness: 1, uRotation: 18 },
      card: { paper: '#04060a', text: '#f4f6ff', chip: '#9db9ff', quiet: 0.45 },
    },
    'bday-land': {
      shader: 'bday-land/ground.frag',
      // its world thins the confetti, so a room-sized field stays a field of stickers rather than noise
      // on the card a sticker shrinks away as it falls into the type rail (the face's bottom 13%), so none stands behind
      // the name or the squares (uRail); a world composed on the room keeps them all
      patch: [['vec2 q = (lp-off)*sz;', 'vec2 q = (lp-off)*sz*(44./size);'], ['uniform float fall;', 'uniform float fall; uniform float thin; uniform float uRail;'], ['if(h < .45) continue;', 'if(h < thin) continue;'],
        ['vec2 hw = vec2(mix(5.,9.,h), mix(9.,15.,fract(h*7.)));', 'vec2 hw = vec2(mix(5.,9.,h), mix(9.,15.,fract(h*7.))); if (uRail > 0.) { float cy = (id.y + .5 + off.y) * sz - time*fall*sz*(layer==0?1.:.7); hw *= clamp((cy - resolution.y * .13) / (resolution.y * .08), 0., 1.); if (hw.x < .75) continue; }']],
      engine: "the island's own falling sticker confetti, die-cut rims and hard Marker Ink shadows on butter paper",
      uniforms: { ...world, inkPaper: '#F7E7C4', inkInk: '#2B1D14', c0: '#FF5DA2', c1: '#FF8A3D', c2: '#FFE14D', c3: '#5CC8FF', c4: '#B8E986', c5: '#7B5CFF', size: (e) => 44 * e.S, fall: 0.35, thin: 0.45, uRail: 1 },
      world: { thin: 0.8, uRail: 0 },
      room: { uRail: 0 },
      card: { paper: '#f7e7c4', text: '#2b1d14', chip: '#ff5da2', quiet: 0.62 },
    },
    powerlifting: {
      shader: 'powerlifting/ground.frag',
      engine: "the club's Stripes mark, nine blades fitted to the card and drifting down it",
      uniforms: { u_resolution: res, u_time: time, u_dpr: dpr, u_field: '#1e1d1f', u_blade: '#F58025', u_mix: 0.5, u_speed: 8 },
      card: { paper: '#1e1d1f', text: '#f4f1ea', chip: '#f58025', quiet: 0 },
    },
    elo: {
      shader: 'elo/ground-halo.frag',
      engine: "Elo's halftone halo (halftone.ts TONES.halo) on the 8x8 Bayer screen, spread to the card's edges; the pointer moves its centre",
      // the halo peaks behind the plate, as the app's winner's spotlight does, and falls to paper at the edges
      uniforms: { u_resolution: res, u_time: time, u_dpr: (e) => e.cell(2) / 3, u_ink: '#5B82FF', u_paper: '#453c55', u_radius: 0.82, u_breath: 0.02, u_period: 6, u_center: (e) => [0.5 + 0.3 * (e.u - 0.5) * e.z, 0.44] },
      card: { paper: '#453c55', text: '#f2f2f0', chip: '#5b82ff', quiet: 0.25 },
    },
    cotfly: {
      shader: 'cotfly/ground.frag',
      engine: 'the Neural Link pane: leaky integrate-and-fire somata with the connectome.ts constants, and the population raster',
      uniforms: { ...world, inkStage: '#1e3129', inkSage: '#c2cbad', inkSpike: '#e4c887', inkHot: '#d23525', drive: 0.8, slow: 40 },
      card: { paper: '#1e3129', text: '#e2e8d4', chip: '#d23525', quiet: 0.35 },
    },
    relay: {
      shader: 'relay/plate.json',
      engine: 'the trial matrix: 306 graded trials, 17 models by 18 tasks, replayed one cell at a time in trial order',
      // its light falls from behind the handoff mark (the subject's centre), so the mark stands in the matrix's one peak
      patch: [['uniform vec2 uRes;', 'uniform vec2 uRes; uniform float uT;'], ['vec3 c=v>.75?uPass:(v>.25?uInc:uBlk);', 'vec3 c=v>.75?uPass:(v>.25?uInc:uBlk); float ix=floor(g.y)*18.+floor(g.x); float lit=smoothstep(10.,0.,mod(mod(uT*18.,306.)-ix+306.,306.)); c=mix(c,min(c*1.45+.06,vec3(1.)),lit*(v>.75?1.:.55));'], ['float d=length((q-vec2(.3,.28))/vec2(1.,.8));', 'float d=length((q-vec2(.5,.41))/vec2(1.,.8));']],
      textures: { uM: 'relay-matrix' },
      matrix: 'pppppppppppipppiii/pppppppppppbpppibb/pppppppppppipbpiii/pppppppppppbpbpibb/pppppppippbpbpbiib/ppppppbpbippipiiii/ppppipippiippiibii/pppppppiiiipiiiiii/pppppppbbibpbbbbbb/ppppppppbbbbbbbbbb/pppppppibibbbibbbi/pppppppbiibbbibbbb/pppppppbbibbbbbbbb/pppppppbbbbbbbbbbb/pppppbpbbbibiibbbb/ppipppibiiiibiiiib/pppippibbbbbbbbbbb',
      uniforms: { uRes: res, uT: time, uPlum: '#35263f', uPass: mix('#35263f', '#c7a6e8', 0.62), uInc: mix('#35263f', '#bb8439', 0.5), uBlk: '#42234d' },
      card: { paper: '#35263f', text: '#fff7eb', chip: '#c7a6e8', quiet: 0.55 },
    },
    'princeton-td': {
      shader: 'princeton-td/ground.frag',
      engine: 'the campus map floor in the Iso Kit 2:1 projection, a wave lighting the road at the frosh spawn interval (850 ms)',
      uniforms: { ...world, inkGround: '#2b3446', inkTile: '#3b4760', inkPath: '#c9d3e6', inkGlow: '#6fd3ff', tile: (e) => 36 * e.S, interval: 0.85 },
      card: { paper: '#2b3446', text: '#e9eef6', chip: '#e6b548', quiet: 0.5 },
    },
    'kevin-wiki': {
      shader: 'kevin-wiki/ground.frag',
      engine: "the wiki's own public link graph through the hero's 4x4 ordered Bayer, swaying as the reader orbits",
      patch: [['vec2 uv = cellC / u_resolution - 0.5;', 'vec2 uv = (cellC / u_resolution - 0.5) * 0.5;']],
      textures: { u_graph: 'kevin-wiki/ground-source.webp' },
      uniforms: { u_resolution: res, u_time: time, u_dpr: (e) => e.cell(2), u_graph_size: [1440, 900], u_cell: 1, u_ground: '#402a16', u_gain: 0.75, u_turn: 0.035, u_period: 24 },
      card: { paper: '#402a16', text: '#f3efe8', chip: '#f97316', quiet: 0.45 },
    },
  };

  const api = { RECIPES, rgb };
  root.GROUND_RECIPES = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
