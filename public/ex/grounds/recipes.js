// Every card's energy: one program (grounds/energy.glsl) in the card's own hue, its disciplines' vocabulary and its
// product's own matter (grounds/matter/<id>.webp, drawn by tools/matter.html). tools/grounds.mjs builds
// grounds/programs.gen.js from this file, study/hues.json, fighters.js (the disciplines) and art/pop/<id>.json (the
// subject's box and its emitters), so ground.js and the battle read one derived file.
//
// Per card:
//   matter   what its matter tile draws (EX.md 12's material for the product)
//   card     paper, text and chip: the card's own hue tokens (study/hues.json panel, ink and energy), the colours a
//            page prints round the energy (markup.js look) until the face reads face.gen.js itself
//   shader   the product's own plate shader from round 2, which round 3 ran as the ground; kept as the record the
//            twins and tools/test.mjs name (null for the eight newcomers, which never had a plate)
//   engine   that plate's one-line description
//   window   Turboslide only: round 3's printed window, kept as data because tools/media.py cuts its window files
//            from this crop; the energy prints no picture
//   disc     the newcomers' disciplines until fighters.js carries them (ground.js reads FIGHTERS first)
//   speed, cover   how fast the matter streams out (log r per second) and how much of a stream it covers (optional)
(function (root) {
  'use strict';
  const ALL = {
    "turboslide": {
      matter: "flying slide panes in the deck's two-tone 8x8 screen, one in five held in the editor's selection box and handles",
      card: { paper: "#99cbf1", text: "#091822", chip: "#368bc6" },
      shader: "turboslide/ground.frag",
      engine: "Turboslide two-tone screen: the paper:dithering sphere through the 8x8 Bayer table at 2 css px cells",
      window: {cells: 'turboslide/hero-cells.png', tone: 'tools/art/src/turboslide/tone.webp', crop: [172, 0, 600, 450], foot: [0.64, 0.84]},
    },
    "glyphfield": {
      matter: "its own word set the way its field sets it, weight climbing row by row, over its dot field",
      card: { paper: "#98d4b5", text: "#081a12", chip: "#61f7b6" },
      shader: "glyphfield/ground.frag",
      engine: "Glyphfield original material, dither gradient (MIT)",
    },
    "jarhead": {
      matter: "the creature's ASCII skin, each cell a character picked by tone from its renderer's ramp",
      card: { paper: "#8dd0e7", text: "#041920", chip: "#66d2f4" },
      shader: "jarhead/plate.json",
      engine: "Jarhead's tone field on its own 8x8 Bayer island; the pool under the blob follows the pointer in whole cells",
    },
    "katagami": {
      matter: "the a on its weight axis, 100 to 900, with its cut outline and the on-curve points of its construction",
      card: { paper: "#eeb0c1", text: "#211015", chip: "#ef558c" },
      shader: "katagami/ground.frag",
      engine: "the specimen's construction sheet: the 128-unit grid, the font's vertical metrics and score points breathing with the weight axis",
    },
    "claude-of-tanks": {
      matter: "the hull's three-tone camo cut into armour plates with their seams, and tracer dashes",
      card: { paper: "#e7bb91", text: "#1f1307", chip: "#f3a859" },
      shader: "claude-of-tanks/ground.frag",
      engine: "the desert map's wind-rippled sand through Kevin's 4x4 ordered Bayer, crossed by one APFSDS tracer every 2.4 s; the pointer turns the wind",
    },
    "mailroom": {
      matter: "envelopes in flight and the sorter's stamp, with the labels its belt prints",
      card: { paper: "#e2b3d9", text: "#1e111c", chip: "#dd60cc" },
      shader: "mailroom/plate.json",
      engine: "the landing's .dither dot field, drifting along the belt one cell per 4 s",
    },
    "local-search": {
      matter: "query strips as its CLI receives them, the benchmark's queries that name no company",
      card: { paper: "#88d3d7", text: "#031a1b", chip: "#48b7bd" },
      shader: "local-search/plate.json",
      engine: "a Katagami Sans glyph field of the benchmark's own queries, ticking with the 3.6 s signal",
    },
    "agent-pets": {
      matter: "the pets' pixels on their own grid: the cat's head, a paw and a heart in a run",
      card: { paper: "#b9cd98", text: "#131809", chip: "#a7ce4c" },
      shader: "agent-pets/ground.frag",
      engine: "Cute Cat's Sunbeam garden from world-scenes.mjs on a hard pixel grid, the sky through the 8x8 Bayer; the pointer moves the planes",
    },
    "loop": {
      matter: "its own diff: added and removed rows of the plan it refreshes",
      card: { paper: "#eeb69b", text: "#21120a", chip: "#e3763a" },
      shader: "loop/plate.json",
      engine: "Loop's GrainShader: the landing's warm glow under the skill cards, its grain held still, one grain per css px",
    },
    "agent-machines": {
      matter: "the ring's gear teeth on racks, and a running worker's status light",
      card: { paper: "#a5d2a8", text: "#0d1a0e", chip: "#53db69" },
      shader: "agent-machines/plate.json",
      engine: "the core gear's own construction: hairline rings every two modules, travelling outward one step per tooth (0.8 s)",
    },
    "prototemplate": {
      matter: "the Studio Field's flow lines round the Horizon Field's rings",
      card: { paper: "#b8c0f5", text: "#131524", chip: "#676ce8" },
      shader: "prototemplate/ground.frag",
      engine: "Prototemplate Studio Field, the bayer-8x8 preset (verbatim from prototemplate-studio-field.ts)",
    },
    "bday-land": {
      matter: "confetti and the party's die-cut stickers with their paper rims",
      card: { paper: "#ecb1c9", text: "#211017", chip: "#f05aa5" },
      shader: "bday-land/ground.frag",
      engine: "the island's own falling sticker confetti, die-cut rims and hard Marker Ink shadows on butter paper",
    },
    "powerlifting": {
      matter: "bumper plates, chalk and the tiger's chamfered blades",
      card: { paper: "#ebb895", text: "#201208", chip: "#ec8d41" },
      shader: "powerlifting/ground.frag",
      engine: "the club's Stripes mark, nine blades fitted to the card and drifting down it",
    },
    "elo": {
      matter: "paired squares: the chosen plate solid, the passed one hollow, and the rating's ticks",
      card: { paper: "#c0bdf3", text: "#151423", chip: "#8a7dec" },
      shader: "elo/ground-halo.frag",
      engine: "Elo's halftone halo (halftone.ts TONES.halo) on the 8x8 Bayer screen, spread to the card's edges; the pointer moves its centre",
    },
    "cotfly": {
      matter: "the population raster: one row a neuron, one tick a spike",
      card: { paper: "#f0b1b8", text: "#221013", chip: "#e13e67" },
      shader: "cotfly/ground.frag",
      engine: "the Neural Link pane: leaky integrate-and-fire somata with the connectome.ts constants, and the population raster",
    },
    "relay": {
      matter: "handoff tiles: the trial matrix's passed, partial and failed runs",
      card: { paper: "#cdb9ed", text: "#191321", chip: "#b68dee" },
      shader: "relay/plate.json",
      engine: "the trial matrix: 306 graded trials, 17 models by 18 tasks, replayed one cell at a time in trial order",
    },
    "princeton-td": {
      matter: "the map's road tiles, the towers' footprints and chain lightning between them",
      card: { paper: "#e0be8d", text: "#1e1406", chip: "#efb14c" },
      shader: "princeton-td/ground.frag",
      engine: "the campus map floor in the Iso Kit 2:1 projection, a wave lighting the road at the frosh spawn interval (850 ms)",
    },
    "kevin-wiki": {
      matter: "the graph's nodes and edges, no labels",
      card: { paper: "#8ed5c4", text: "#051a16", chip: "#53cfb6" },
      shader: "kevin-wiki/ground.frag",
      engine: "the wiki's own public link graph through the hero's 4x4 ordered Bayer, swaying as the reader orbits",
    },
    "sandbox-arena": {
      matter: "racing chevrons in two lanes, A against B, and the log lines between them",
      card: { paper: "#f1b2a9", text: "#22110e", chip: "#e44336" },
      shader: null,
      engine: "energy only: no round 2 plate",
      disc: ["Infra","Data"],
    },
    "ariadne": {
      matter: "the labyrinth's rings with their gaps, and the thread running through them",
      card: { paper: "#d4b7e8", text: "#1a1220", chip: "#cc92f0" },
      shader: null,
      engine: "energy only: no round 2 plate",
      disc: ["Agent","Game"],
    },
    "sigil-ui": {
      matter: "the four-quadrant sigil and its token swatches at each preset's radius",
      card: { paper: "#a1c8f4", text: "#0b1723", chip: "#368add" },
      shader: null,
      engine: "energy only: no round 2 plate",
      disc: ["Interface","Agent"],
    },
    "dedalus-terminal": {
      matter: "the CRT's scanlines, its phosphor boot lines and the block cursor",
      card: { paper: "#d1c58d", text: "#1a1606", chip: "#e6cd52" },
      shader: null,
      engine: "energy only: no round 2 plate",
      disc: ["Interface","Game"],
    },
    "sevenfold": {
      matter: "its four dots, one an asterisk, and page sheets fanned with their lines",
      card: { paper: "#f0b4a1", text: "#22110c", chip: "#ef6c44" },
      shader: null,
      engine: "energy only: no round 2 plate",
      disc: ["Interface","Data"],
    },
    "podium": {
      matter: "the judging board's routing lines from anonymous tokens to tables, and trophy glints",
      card: { paper: "#c5c991", text: "#161707", chip: "#dbe159" },
      shader: null,
      engine: "energy only: no round 2 plate",
      disc: ["Data","Interface"],
    },
    "ommc": {
      matter: "cube faces carrying problems, and the arithmetic of a round set in Katagami Sans",
      card: { paper: "#f1b1b0", text: "#221010", chip: "#da3b4c" },
      shader: null,
      engine: "energy only: no round 2 plate",
      disc: ["Game","Data"],
    },
    "atlas": {
      matter: "riffling issue covers with their masthead bars, and the globe's meridians",
      card: { paper: "#afc3f6", text: "#101524", chip: "#6e8fec" },
      shader: null,
      engine: "energy only: no round 2 plate",
      disc: ["Type","Shader"],
    },
  };
  // RECIPES holds the cards fighters.js deals (every page and tool keys its recipes by them); ALL holds the 26, so
  // tools/grounds.mjs prints every card's energy before the roster merge lands its eight newcomers in fighters.js
  let F = root.FIGHTERS;
  if (!F && typeof module === 'object' && typeof require === 'function') { try { F = require('../fighters.js').FIGHTERS; } catch (e) { F = null; } }
  const RECIPES = F && F.length ? Object.fromEntries(F.filter((f) => ALL[f.id]).map((f) => [f.id, ALL[f.id]])) : ALL;
  const api = { RECIPES, ALL };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GROUND_RECIPES = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
