// The illustration direction's art for each card, shared by the build (Node), the poster bake and the
// page. One rule per card from ANATOMY section 4: an object standing in its world, or a window crop
// printed into it as the whole scene.
//   object  w: width as a share of the card's (or h: height as a share of its height), x, y: centre of the cut;
//           body: the solid subject's box inside a cut that carries its own contact shade, in shares of the cut
//   window  x: the centre of a portrait slice of window@2x; the slice is a panel PANEL tall, printed to the
//           top bleed, that dissolves into the world through the 4x4 Bayer toward the band. stand: where a world fills a
//           room (the battle entry), the work stands as its cutout instead, this share of the card wide
// The feathers are short, so the work stands on its own ground and the band rises clean from the foot, and
// their cells are the hero's 3 css px at every size (masks()). Rarity is a finish (SPEC 3.2): a card's cost
// in inks is its number of passes.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ART = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const RATIO = 88 / 63;
  // The window panel: a window is the scene itself, so it prints to the top bleed (1cqw past the top edge, as
  // at the sides, more than its parallax ever lifts it) and feathers only toward the band, over the face's
  // 0.62 to 0.70. A top feather read as a print defect: a dither grid over a sky, a sun cut in half. The
  // band never reaches it: the band's knock-back starts at 0.68 at its highest.
  const BLEED = 0.01 / RATIO, FOOT = 0.7;
  const PANEL = { top: -BLEED, height: FOOT + BLEED, featherTop: 0, featherBottom: 0.08 / (FOOT + BLEED) };
  const CELL = 3; // the dissolve's Bayer cell, css px: the hero's screen (ground.js DCELL)
  const FRAME = {
    turboslide: { kind: 'window', x: 0.52 },
    glyphfield: { kind: 'object', w: 0.804, x: 0.525, y: 0.436, body: [0.034, 0.021, 0.905, 0.889] }, // its own bracket G and arrow stood up: no glyph in the art
    jarhead: { kind: 'object', w: 0.8, y: 0.43 },
    katagami: { kind: 'object', w: 0.84, y: 0.42 },
    'claude-of-tanks': { kind: 'window', x: 0.47, stand: 0.92 }, // the whole tank, its nose and the muzzle's smoke
    mailroom: { kind: 'object', w: 1.12, x: 0.484, y: 0.41 }, // the whole sorter, edge to edge
    'local-search': { kind: 'object', w: 0.78, y: 0.42 }, // the local box alone, its /LS tape set large
    'agent-pets': { kind: 'window', x: 0.55, pixel: true, cells: [337, 253], stand: 0.6 }, // the cat under its sun; cells: its picture's columns and rows (card.css draws each at whole device px)
    loop: { kind: 'object', w: 0.831, x: 0.541, y: 0.423, body: [0.029, 0.022, 0.872, 0.934] }, // the gear-loop mark stood up, its loose chip at the rim
    'agent-machines': { kind: 'object', w: 1.0, y: 0.4 }, // every gear whole, nothing written on them
    prototemplate: { kind: 'object', w: 0.92, y: 0.41 },
    'bday-land': { kind: 'window', x: 0.45, stand: 0.62 },
    powerlifting: { kind: 'object', w: 0.84, y: 0.41 },
    elo: { kind: 'object', w: 0.916, x: 0.538, y: 0.454, body: [0.033, 0.006, 0.884, 0.825] }, // Elo's pick mark stood up: the chosen plate solid and a step forward, the passed one hollow
    cotfly: { kind: 'window', x: 0.47, stand: 0.92 },
    relay: { kind: 'object', w: 0.737, x: 0.529, y: 0.441, body: [0.039, 0.028, 0.881, 0.898] }, // the handoff mark stood up: two ribbons off their tile
    'princeton-td': { kind: 'object', h: 0.66, y: 0.39 },
    'kevin-wiki': { kind: 'object', w: 1.0, y: 0.41 },
  };
  // A subject rides 3cqw above its ground while the card is tilted or lifted (rituals.js), so every one
  // starts at least HEADROOM of the face below the top edge and never passes it.
  const HEADROOM = 0.045;

  const passOf = (cost) => [cost >= 2 ? 1 : 0, cost >= 3 ? 1 : 0, cost >= 4 ? 1 : 0, cost >= 4 ? 1 : 0];
  // A card's place inside its tier, 0 the tier's lowest total and 1 its highest.
  function places(fighters) {
    const out = {};
    for (const f of fighters) {
      const tier = fighters.filter((g) => g.cost === f.cost).map((g) => g.total);
      const lo = Math.min(...tier), hi = Math.max(...tier);
      out[f.id] = hi > lo ? Math.round(((f.total - lo) / (hi - lo)) * 1000) / 1000 : 1;
    }
    return out;
  }
  // Where the subject stands, in face units from the top left: [x, y] its centre (the foil's rays and the
  // resting highlight) and [hw, hh] its half size, the box the finish keeps clear (ground.js), from the cut's
  // own aspect (media.gen.js). A cut that carries its own contact shade names its solid body inside it (body:
  // [x0, y0, x1, y1] in shares of the cut), so the box is the subject and not its shade. A window is the scene
  // itself and keeps nothing clear.
  function subjectOf(id, media = ((typeof globalThis !== 'undefined' && globalThis.MEDIA) || {}).media || {}) {
    const fr = FRAME[id] || {};
    if (fr.kind === 'window') return [0.5, 0.035 + 0.665 * 0.45, 0, 0];
    const m = (media[id] || {}).object, ar = m && m.w ? m.h / m.w : 0;
    const w = !ar ? 0 : fr.w != null ? fr.w : (fr.h * RATIO) / ar, h = (w * ar) / RATIO;
    const x = fr.x != null ? fr.x : 0.5, y = fr.y != null ? fr.y : 0.42;
    const [b0, b1, b2, b3] = fr.body || [0, 0, 1, 1];
    return [x + ((b0 + b2 - 1) / 2) * w, y + ((b1 + b3 - 1) / 2) * h, ((b2 - b0) * w) / 2, ((b3 - b1) * h) / 2];
  }
  // The window panel's box in card widths (1 cqw of bleed each side) and its feathers as 4x4 Bayer masks,
  // printed once into the page as --mask-win. A mask is an svg with no viewBox, so its user
  // unit is the css px of the box it masks: each of the sixteen ranks of the Bayer is a pattern of CELL px
  // cells, shown over the rows where the feather's value passes its threshold. The cells keep their css size
  // on a well, a gallery card, the lens and the pack, and the feathers keep their share of the panel.
  const PANEL_W = 1.02, PANEL_H = PANEL.height * RATIO;
  const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  // where smoothstep(0, 1, x) reaches v
  const unsmooth = (v) => 0.5 - Math.sin(Math.asin(1 - 2 * v) / 3);
  const pc = (v) => Math.round(v * 100000) / 1000 + '%';
  function bayerMask(fTop, fBot) {
    let defs = '', body = `<rect y='${pc(fTop)}' width='100%' height='${pc(1 - fTop - fBot)}'/>`;
    for (let r = 0; r < 16; r++) {
      const i = B4.indexOf(r), x = (i % 4) * CELL, y = Math.floor(i / 4) * CELL;
      defs += `<pattern id='b${r}' width='${4 * CELL}' height='${4 * CELL}' patternUnits='userSpaceOnUse'><rect x='${x}' y='${y}' width='${CELL}' height='${CELL}'/></pattern>`;
      const u = unsmooth((r + 0.5) / 16);
      if (fTop > 0) body += `<rect y='${pc(fTop * u)}' width='100%' height='${pc(fTop * (1 - u))}' fill='url(#b${r})'/>`;
      body += `<rect y='${pc(1 - fBot)}' width='100%' height='${pc(fBot * (1 - u))}' fill='url(#b${r})'/>`;
    }
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' shape-rendering='crispEdges'><defs>${defs}</defs>${body}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`;
  }
  function masks() { return { win: bayerMask(PANEL.featherTop, PANEL.featherBottom) }; }
  return { RATIO, PANEL, PANEL_W, PANEL_H, CELL, HEADROOM, FRAME, passOf, places, subjectOf, masks };
});
