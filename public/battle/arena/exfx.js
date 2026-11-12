// The ex cards' own effects, read for the Arena (ROUND6.md section 4.1): each card's fx.svg cut into its pieces, its
// floor matter tile tinted in its hue, and its hue tokens. Read-only from r4/ex (fx/<id>/fx.svg, grounds/matter.js,
// FACE from face.gen.js, which the page already loads); nothing here opens a WebGL context or keeps a canvas: a tile
// is drawn once on an OffscreenCanvas, kept as a blob URL, and the canvas released.
//
// A piece is one drawing the product made (a slide, a postmark, a query strip), lifted out of the card's clip window
// with its ancestors' paint and transforms, measured once, and served as a small SVG of its own box: inline for a flat
// drawing, an <img> of a blob for one that carries filters or hundreds of cells (Glyphfield, Claude of Tanks, Agent
// Pets), so the browser rasterises it once.

const NS = 'http://www.w3.org/2000/svg';
const EX = globalThis.EX_CARD?.base ?? new URL('../../../r4/ex/', import.meta.url).href;
export const exUrl = (p) => new URL(p, EX).href;

/** A card's hue tokens (r4/ex face.gen.js), with a neutral set for a card the page does not know. */
export function hueOf(id) {
  return globalThis.FACE?.[id]?.hue ?? { energy: '#9aa0ad', deep: '#30333b', glint: '#f2f2f4', ink: '#141312', panel: '#c9ccd3' };
}

/** How each card's matter streams on its card (r4/ex grounds/flows.json, read 2026-11-10): flow and its parameter. */
export const FLOW = {
  turboslide: ['diagonal', 0.42], glyphfield: ['grid', 0], jarhead: ['fall', 0], katagami: ['rise', 0],
  'claude-of-tanks': ['grid', 0], mailroom: ['diagonal', -0.35], 'local-search': ['lanes', 0], 'agent-pets': ['fall', 0],
  loop: ['lanes', 0], 'agent-machines': ['rise', 0], prototemplate: ['rings', 0.7], 'bday-land': ['fall', 0],
  powerlifting: ['rise', 0], elo: ['diagonal', 0.32], cotfly: ['burst', 0], relay: ['rise', 0], 'kevin-wiki': ['fall', 0],
  'princeton-td': ['diagonal', -0.5],
};

/** Idle work, one job a task, never in the frame the page prepares (ROUND6 section 4.1, test 26). */
const jobs = [];
let draining = false;
const idle = (f) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(f, { timeout: 1200 }) : setTimeout(f, 32));
export function later(job) {
  return new Promise((res, rej) => {
    jobs.push(() => { try { res(job()); } catch (e) { rej(e); } });
    if (!draining) { draining = true; idle(drain); }
  });
}
/** Whether every idle job has run (setup done): the probe counts idle callbacks only after it. */
export const settled = () => !draining && jobs.length === 0;
function drain() {
  const job = jobs.shift();
  if (job) job();
  if (jobs.length) idle(drain); else draining = false;
}

// ---------------------------------------------------------------- the floor matter
let matterP = null;
/** r4/ex's matter painter, loaded once as its own classic script unless the kit's programs.gen.js already set it (the
 *  two set the same object, so either order is harmless). */
export function loadMatter() {
  if (globalThis.GROUND_MATTER) return Promise.resolve(globalThis.GROUND_MATTER);
  return (matterP ??= new Promise((res) => {
    const s = document.createElement('script');
    s.src = exUrl('grounds/matter.js');
    s.async = true;
    s.onload = () => res(globalThis.GROUND_MATTER ?? null);
    s.onerror = () => res(null);
    document.head.append(s);
  }).then((M) => (M ? Promise.resolve(M.fonts?.()).catch(() => null).then(() => M) : null)));
}
const tiles = new Map();
/** The card's matter tile tinted in `hex` at `alpha` (source-in), as a blob URL; null when the card has none or the
 *  painter is not served. Drawn on an OffscreenCanvas in an idle task; the canvas is released at once. */
export function matterTile(id, hex, alpha = 0.22, size = 256) {
  const key = `${id}|${hex}|${alpha}|${size}`;
  if (!tiles.has(key)) {
    tiles.set(key, loadMatter().then((M) => (M && M.ids.includes(id) ? later(() => paint(M, id, hex, alpha, size)) : null)).catch(() => null));
  }
  return tiles.get(key);
}
function paint(M, id, hex, alpha, size) {
  const off = typeof OffscreenCanvas === 'function';
  const c = off ? new OffscreenCanvas(size, size) : Object.assign(document.createElement('canvas'), { width: size, height: size });
  M.draw(id, c, false);
  const x = c.getContext('2d');
  x.globalCompositeOperation = 'source-in';
  x.globalAlpha = alpha;
  x.fillStyle = hex;
  x.fillRect(0, 0, size, size);
  const blob = off ? c.convertToBlob({ type: 'image/png' }) : new Promise((r) => c.toBlob(r, 'image/png'));
  return Promise.resolve(blob).then((b) => { c.width = c.height = 0; return b ? URL.createObjectURL(b) : null; });
}

// ---------------------------------------------------------------- the pieces
/** How each card's fx.svg falls into pieces. Drawings merge when their outlines come within `gap` card units (1000 =
 *  the card's width) unless `merge` is false; `groups` names them by their order in the window instead (each list one
 *  piece); `flatten` splits groups of cells (a pixel heart drawn as an outline group and a fill group) into their cells
 *  first; `raster` serves the pieces as images; `strip` drops parts the Arena does not show (a sign, the digits); `ink`
 *  swaps a dark ink drawn for a light card to the hue's glint over a keyline in its ink; `by: 'stroke'` groups flat
 *  struck segments by their colour family (Princeton TD's three tower shots). */
const SPLIT = {
  turboslide: { merge: false },                              // face, half, edge, the dotted deal line
  glyphfield: { gap: 14, raster: true },                     // letter clusters
  jarhead: { gap: 0 },                                       // four corners
  katagami: { merge: false },                                // two cut counters
  'claude-of-tanks': { gap: 40, raster: true },              // the tracer, the second round, the dirt spray (by its groups)
  mailroom: { gap: 0, ink: '#1e111c' },                      // the postmark, five cancel bars
  'local-search': { gap: 3 },                                // three query strips on their cables
  'agent-pets': { gap: 6, raster: true, flatten: true },     // four hearts, five paw prints
  loop: { merge: false, strip: 'path' },                     // four diff rows, bars only
  'agent-machines': { groups: [[0, 1, 2], [6], [3, 4, 5], [7, 8, 9, 10]] }, // the trace and its via, the worker chip, its speed lines, the agent's cloud
  prototemplate: { merge: false },                           // five horizon arcs, each over its keyline
  'bday-land': { gap: 0 },                                   // the taped card, the pink tape, the lemon tape (by its groups)
  powerlifting: { merge: false },                            // chalk block, four grains, the handprint
  elo: { gap: 2, strip: 'g' },                               // the two chips, digits stripped
  cotfly: { gap: 2 },                                        // the membrane trace under its threshold, the wing beat
  relay: { merge: false },                                   // the dotted handoff, ivory hook, lilac hook, the tile
  'kevin-wiki': { groups: [[0, 1], [2, 3, 4], [5], [6], [7]] }, // thread, the link round its node, three graph nodes
  'princeton-td': { by: 'stroke' },                          // arrow, bolt and cannonball trails
};
const pieceCache = new Map(), pieceNow = new Map();
/** The card's pieces once they are cut (a special at its cue reads them without waiting), else null. */
export const piecesNow = (id) => pieceNow.get(id) ?? null;
/** The card's pieces in the window's order, each `{ i, box:{x,y,w,h} (card units), w, h, raster, url?, node?, fam? }`.
 *  Fetched and cut in an idle task, once a visit. */
export function piecesOf(id) {
  if (!pieceCache.has(id)) {
    pieceCache.set(id, fetch(exUrl(`fx/${id}/fx.svg`)).then((r) => (r.ok ? r.text() : null))
      .then((text) => (text ? later(() => cut(id, text)) : [])).catch(() => []).then((list) => { pieceNow.set(id, list); return list; }));
  }
  return pieceCache.get(id);
}
const PAINT = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform', 'filter', 'font-family', 'font-weight', 'font-size'];
const FAMILY = { '#3f8f4f': 'arrow', '#7bd88f': 'arrow', '#14301c': 'arrow', '#e8f5e9': 'arrow', '#5b3fa8': 'bolt', '#b48cff': 'bolt', '#efe6ff': 'bolt', '#6b4a2b': 'ball', '#ffb347': 'ball' };
function cut(id, text) {
  const o = SPLIT[id] ?? { gap: 6 };
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.nodeName !== 'svg') return [];
  // the window: the clip group, then down every group that only wraps one other
  let top = root.querySelector('g[clip-path]') ?? root;
  const kidsOf = (g) => [...g.children].filter((c) => !/^(defs|clipPath|title|desc|style)$/.test(c.nodeName));
  while (kidsOf(top).length === 1 && kidsOf(top)[0].nodeName === 'g') top = kidsOf(top)[0];
  let kids = kidsOf(top);
  // (a stripped part goes whether it is a drawing of its own or inside one)
  if (o.strip) { kids = kids.filter((k) => !k.matches(o.strip) || o.keepTop); for (const k of kids) for (const x of [...k.querySelectorAll(`:scope > ${o.strip}`)]) x.remove(); }
  // a group of cells becomes its cells, each keeping the group's paint
  const paintOf = (from, to) => { for (const k of PAINT) if (from.hasAttribute(k) && !to.hasAttribute(k)) to.setAttribute(k, from.getAttribute(k)); return to; };
  if (o.flatten) kids = kids.flatMap((k) => (k.nodeName === 'g' && !k.hasAttribute('transform') ? [...k.children].map((c) => { const g = paintOf(k, doc.createElementNS(NS, 'g')); g.append(c.cloneNode(true)); return g; }) : [k]));
  // each item drawn in its ancestors' paint (clip-path dropped), so it draws alone as it drew in the card
  const chain = [];
  for (let n = top; n && n !== root; n = n.parentNode) if (n.nodeName === 'g') chain.unshift(n);
  const wrap = (members) => {
    let outer = null, inner = null;
    for (const a of chain) {
      const g = doc.createElementNS(NS, 'g');
      for (const k of PAINT) if (a.hasAttribute(k)) g.setAttribute(k, a.getAttribute(k));
      if (!o.raster) g.removeAttribute('filter');
      if (inner) inner.append(g); else outer = g;
      inner = g;
    }
    const host = doc.createElementNS(NS, 'g');
    for (const m of members) host.append(m.cloneNode(true));
    if (inner) { inner.append(host); return outer; }
    return host;
  };
  let items;
  if (o.by === 'stroke') {
    const fam = new Map();
    for (const k of kids) {
      const f = FAMILY[(k.getAttribute('stroke') ?? k.getAttribute('fill') ?? '').toLowerCase()];
      if (!f) continue;
      if (!fam.has(f)) fam.set(f, []);
      fam.get(f).push(k);
    }
    items = [...fam.entries()].map(([f, list]) => ({ members: list, fam: f }));
  } else if (o.groups) items = o.groups.map((ix) => ({ members: ix.map((i) => kids[i]).filter(Boolean) })).filter((g) => g.members.length);
  else items = kids.map((k) => ({ members: [k] }));
  return measure(id, doc, root, items, o, wrap);
}
/** Measure each item in a live (unseen) SVG, merge the ones within `gap`, and serve each piece. */
function measure(id, doc, root, items, o, wrap) {
  const live = document.createElementNS(NS, 'svg');
  live.setAttribute('viewBox', root.getAttribute('viewBox') ?? '0 0 1000 1397');
  live.setAttribute('aria-hidden', 'true');
  live.style.cssText = 'position:absolute;left:-9999px;top:0;width:10px;height:10px;overflow:hidden;visibility:hidden;pointer-events:none';
  document.body.append(live);
  const boxes = [];
  try {
    for (const it of items) {
      const w = document.importNode(wrap(it.members), true);
      live.append(w);
      const b = w.getBBox();
      // the bbox is geometry only: the box takes room for the widest stroke (and a filter's spread)
      let sw = 0;
      for (const n of [w, ...w.querySelectorAll('*')]) sw = Math.max(sw, parseFloat(n.getAttribute('stroke-width') ?? '0') || 0);
      if (b.width > 0 || b.height > 0) boxes.push({ ...it, top: it.members.length === 1 && it.members[0].nodeName === 'g', x: b.x, y: b.y, x1: b.x + b.width, y1: b.y + b.height, pad: sw / 2 + 3 + (o.raster ? 12 : 0) });
      w.remove();
    }
  } finally { live.remove(); }
  const n = boxes.length;
  let up = boxes.map((_, i) => i);
  const find = (i) => (up[i] === i ? i : (up[i] = find(up[i])));
  if (o.merge !== false && !o.groups && !o.by) {
    const g2 = (o.gap ?? 0) / 2;
    const near = (a, b) => a.x - g2 <= b.x1 + g2 && b.x - g2 <= a.x1 + g2 && a.y - g2 <= b.y1 + g2 && b.y - g2 <= a.y1 + g2;
    const join = (keep) => { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (keep(i, j) && near(boxes[i], boxes[j])) up[find(i)] = find(j); };
    join(() => true);
    // (a merge that leaves fewer than three pieces falls back to the window's own groups: each top-level group stands
    // alone, loose drawings still merge among themselves; bday.land's card and two tapes, the tank's tracer, second
    // round and dirt, so a card that drew three things wears three)
    if (new Set(boxes.map((_, i) => find(i))).size < 3 && boxes.filter((b) => b.top).length) {
      up = boxes.map((_, i) => i);
      join((i, j) => !boxes[i].top && !boxes[j].top);
    }
  }
  const merged = new Map();
  boxes.forEach((b, i) => {
    const r = find(i), m = merged.get(r);
    if (!m) merged.set(r, { members: [...b.members], fam: b.fam ?? null, x: b.x - b.pad, y: b.y - b.pad, x1: b.x1 + b.pad, y1: b.y1 + b.pad, order: i });
    else { m.members.push(...b.members); m.x = Math.min(m.x, b.x - b.pad); m.y = Math.min(m.y, b.y - b.pad); m.x1 = Math.max(m.x1, b.x1 + b.pad); m.y1 = Math.max(m.y1, b.y1 + b.pad); }
  });
  const defs = o.raster ? [...root.querySelectorAll('defs > :not(clipPath)')].map((d) => new XMLSerializer().serializeToString(d)).join('') : '';
  const hue = hueOf(id);
  return [...merged.values()].sort((a, b) => a.order - b.order).map((m, i) => {
    const box = { x: m.x, y: m.y, w: m.x1 - m.x, h: m.y1 - m.y };
    let body = wrap(m.members);
    if (o.ink) body = inked(doc, body, o.ink, hue);
    const vb = `${box.x.toFixed(1)} ${box.y.toFixed(1)} ${box.w.toFixed(1)} ${box.h.toFixed(1)}`;
    const markup = `<svg xmlns="${NS}" viewBox="${vb}" preserveAspectRatio="none">${defs ? `<defs>${defs}</defs>` : ''}${new XMLSerializer().serializeToString(body)}</svg>`;
    const p = { id, i, box, w: box.w, h: box.h, raster: Boolean(o.raster), fam: m.fam };
    if (o.raster) {
      p.url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
      p.markup = markup;
      return p;
    }
    p.node = document.importNode(new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement, true);
    p.node.setAttribute('aria-hidden', 'true');
    return p;
  });
}
/** A dark ink drawn for a light card, on the dark Arena: the drawing in the hue's glint over a keyline in its ink. */
function inked(doc, body, ink, hue) {
  const key = body.cloneNode(true), lit = body.cloneNode(true);
  const swap = (n, colour, extra) => {
    for (const e of [n, ...n.querySelectorAll('*')]) {
      for (const a of ['stroke', 'fill']) if ((e.getAttribute(a) ?? '').toLowerCase() === ink) e.setAttribute(a, colour);
      if (extra && e.hasAttribute('stroke-width')) e.setAttribute('stroke-width', String((parseFloat(e.getAttribute('stroke-width')) || 0) + extra));
    }
  };
  swap(key, hue.ink, 3);
  swap(lit, hue.glint, 0);
  const g = doc.createElementNS(NS, 'g');
  g.append(key, lit);
  return g;
}
// ---------------------------------------------------------------- the glint (fix 2 A3)
const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text']);
/** The scale a `transform` attribute applies (the square root of its determinant, its parts multiplied). */
function scaleOf(t) {
  let k = 1;
  for (const [, fn, args] of String(t ?? '').matchAll(/(matrix|scale)\s*\(([^)]*)\)/g)) {
    const v = args.split(/[\s,]+/).filter(Boolean).map(Number);
    if (fn === 'matrix' && v.length >= 4) k *= Math.sqrt(Math.abs(v[0] * v[3] - v[1] * v[2])) || 1;
    else if (fn === 'scale') k *= Math.sqrt(Math.abs(v[0] * (v[1] ?? v[0]))) || 1;
  }
  return k;
}
/** A 1 px keyline in `colour` round every drawn shape of an SVG (`upp`: its user units a screen px): a copy of the
 *  drawing laid under it, each shape filled and stroked in the colour 2 px wider than its own stroke, so 1 px shows
 *  outside the drawing's edge. Static paint, no filter. */
export function glintInto(svg, upp, colour) {
  const doc = svg.ownerDocument, kids = [...svg.children].filter((c) => !/^(defs|style|title|desc|clipPath)$/.test(c.nodeName));
  if (!kids.length || !(upp > 0)) return svg;
  const under = doc.createElementNS(NS, 'g');
  under.setAttribute('data-glint', '');
  for (const k of kids) under.append(k.cloneNode(true));
  const eff = (e, a) => { for (let x = e; x && x !== under; x = x.parentNode) { const v = x.getAttribute?.(a); if (v != null) return v; } return null; };
  const scale = (e) => { let k = 1; for (let x = e; x && x !== under; x = x.parentNode) k *= scaleOf(x.getAttribute?.('transform')); return k; };
  const jobs = [];
  for (const e of under.querySelectorAll('*')) {
    if (!SHAPES.has(e.nodeName)) continue;
    const fill = eff(e, 'fill'), stroke = eff(e, 'stroke');
    const filled = fill !== 'none' && !(fill == null && e.nodeName === 'line'), stroked = stroke && stroke !== 'none';
    if (!filled && !stroked) continue;
    const sw = stroked ? parseFloat(eff(e, 'stroke-width') ?? '1') || 1 : 0;
    jobs.push([e, filled, sw + (2 * upp) / scale(e)]);
  }
  for (const x of [under, ...under.querySelectorAll('*')]) { x.removeAttribute('filter'); x.removeAttribute('mask'); }
  for (const [e, filled, w] of jobs) {
    e.setAttribute('fill', filled ? colour : 'none');
    e.setAttribute('stroke', colour);
    e.setAttribute('stroke-width', String(+w.toFixed(3)));
    e.setAttribute('stroke-linejoin', 'round');
  }
  svg.insertBefore(under, kids[0]);
  return svg;
}
/** The piece with its glint, drawn `pxW` screen px wide (cached per piece, its units a px rounded): an inline node, or
 *  for a raster piece a blob of its glinted drawing. */
export function glinted(p, pxW, colour) {
  if (!p || !(pxW > 0) || !colour || (!p.node && !p.markup)) return p;
  const vb = p.node ? p.node.getAttribute('viewBox') : /viewBox="([^"]+)"/.exec(p.markup)?.[1];
  const vw = Number(String(vb ?? '').trim().split(/[\s,]+/)[2]) || p.w;
  const upp = vw / pxW, r = upp < 1 ? Math.round(upp * 50) / 50 : Math.round(upp * 10) / 10;
  const key = `${colour}|${Math.max(0.01, r)}`;
  const cache = (p.glints ??= new Map());
  if (cache.has(key)) return cache.get(key);
  let q = p;
  try {
    if (p.raster) {
      const d = new DOMParser().parseFromString(p.markup, 'image/svg+xml');
      glintInto(d.documentElement, +key.split('|')[1], colour);
      q = { ...p, url: URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(d)], { type: 'image/svg+xml' })), glints: null };
    } else {
      q = { ...p, node: glintInto(p.node.cloneNode(true), +key.split('|')[1], colour), glints: null };
    }
  } catch { q = p; }
  cache.set(key, q);
  return q;
}
/** A fresh element of a piece, filling its box: an inline SVG clone, or an <img> of the rasterised drawing. */
export function pieceNode(p) {
  if (p.raster) {
    const im = document.createElement('img');
    im.alt = ''; im.decoding = 'async'; im.draggable = false; im.src = p.url;
    return im;
  }
  return p.node.cloneNode(true);
}

// ---------------------------------------------------------------- the figures' own anchors
let manP = null;
/** The figure manifest the board reads (fetched once, the browser's cache serves the same file). */
export const loadManifest = () => (manP ??= fetch(new URL('../media/figures/manifest.json', import.meta.url)).then((r) => r.json()).catch(() => null));
let manNow = null;
loadManifest().then((m) => { manNow = m; });
/** A figure view's own effect anchors (`fx: { anchor, core }` in view px), when the manifest carries them. */
export const fxAnchors = (id, view) => manNow?.figures?.[id]?.[view]?.fx ?? null;
export const viewOf = (id, view) => manNow?.figures?.[id]?.[view] ?? null;

// ---------------------------------------------------------------- one stylesheet for auras and specials
const sheets = new Set();
/** The aura and special styles as constructed sheets (one each, once), so arena.css keeps a single owner. */
export function adoptStyles(css) {
  if (sheets.has(css)) return;
  sheets.add(css);
  try {
    const s = new CSSStyleSheet();
    s.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, s];
  } catch {
    const st = document.createElement('style');
    st.textContent = css;
    document.head.append(st);
  }
}
