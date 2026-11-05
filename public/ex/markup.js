// One card, one source: the markup of the card, its back, the inspection sheet, the dock, the deck and
// the pack. build.mjs prints it into the static pages (the first paint) and gallery.js fills the lens with
// the same functions. Works as a classic script (globalThis.MARKUP) and as a CommonJS module.
//   card(f, opts, env)   env = { face, media, order, set, art, recipes } (each optional: without face or media it reads
//                        face.gen.js and media.gen.js beside it; the page never prints a card, it clones the printed one)
//   sheet(f)             disciplines, facts with receipts, trait, moves as prose, pinned commit, credit
//   dock(you, rival, fighters, rules), deck(), pack(fighters), header(), inspect()
//   icon(name, cls)      a <use> of the sprite build.mjs inlines from icons/icons.svg (the only svg source)
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MARKUP = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // fonts/typeset.mjs, verbatim: the subset carries exactly what this can output (tools/check.mjs compares them).
  const UNIT = /(\d)\s(ms|s|px|fps|KB|MB)\b/g;
  function typeset(text) {
    return text
      .normalize('NFC')
      .replace(/\.\.\./g, '…')
      .replace(/(^|[\s(])-(?=\d)/g, '$1−')
      .replace(UNIT, '$1 $2')
      .replace(/(^|[\s(])"/g, '$1“')
      .replace(/"/g, '”')
      .replace(/(^|[\s(])'/g, '$1‘')
      .replace(/'/g, '’');
  }
  const t = (s) => esc(typeset(String(s ?? '')));
  const num = (v) => (typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 3 }) : String(v));
  const pct = (v) => Math.round(v * 10000) / 100 + '%';
  // a unit agrees with its number: 1 commit, 1 GitHub star, 1 commit per active day (the sheet and the twins)
  const unitOf = (v, unit) => (v === 1 ? String(unit).replace(/^(.*?)s(?= per |$)/, '$1') : String(unit));
  const icon = (name, cls = '') => `<svg class="i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" data-icon="${name}"><use href="#i-${name}"/></svg>`;

  // The kl signature from src/components/kevin-liu-mark.tsx, for the favicon. The back draws the same
  // signature from the icon set (icons/src/icons.mjs, `kl`), so the page has one svg source.
  const KL = 'M13.29 73.13L19.08 62.87L25.81 48.72L28.91 41.75L30.73 37.33L32.26 33.21L33.44 29.44L34.20 26.10L34.39 24.61L34.46 23.24L34.37 21.98L34.12 20.82L33.64 19.72L32.80 18.61L31.80 18.00L30.68 17.59L29.46 17.46L28.23 17.66L27.10 18.15L26.12 18.86L25.25 19.73L24.49 20.72L23.18 23.00L22.60 24.28L21.56 27.09L20.24 31.81L19.49 35.21L18.84 38.74L17.84 45.92L17.21 52.81L20.80 54.39L24.14 52.20L32.36 46.38L34.93 44.74L36.48 43.88L37.85 43.28L38.93 43.03L39.30 43.05L39.50 43.17L39.47 43.33L39.21 43.44L38.83 43.37L38.39 43.01L38.31 43.51L37.86 44.29L36.46 45.76L34.39 47.29L32.73 48.27L30.94 49.18L29.05 49.99L26.18 50.99L23.43 51.67L21.00 52.00L20.39 56.13L21.79 57.03L23.22 58.38L24.72 60.18L27.89 64.55L29.65 66.79L30.96 68.18L32.42 69.40L34.10 70.37L35.02 70.71L35.99 70.94L36.99 71.04L38.00 71.00L37.77 71.08L39.41 70.72L40.83 70.03L42.17 69.10L43.51 67.96L44.86 66.60L46.23 65.02L47.63 63.25L50.46 59.19L53.27 54.57L54.65 52.09L57.28 46.93L59.68 41.64L60.76 38.99L62.65 33.82L64.08 28.94L64.59 26.67L64.96 24.53L65.18 22.53L65.21 20.71L65.07 19.05L64.71 17.55L64.09 16.18L64.11 16.26L63.31 15.11L62.23 14.17L60.78 13.61L59.21 13.69L57.81 14.28L56.59 15.20L55.49 16.35L54.46 17.71L52.53 20.96L50.71 24.84L49.02 29.22L47.49 33.96L46.16 38.93L45.07 44.00L44.28 49.01L43.83 53.85L43.76 56.16L43.80 58.38L43.96 60.50L44.26 62.51L44.71 64.30L45.30 65.90L46.03 67.35L46.90 68.64L47.93 69.75L49.08 70.66L50.33 71.35L51.64 71.85L52.98 72.16L54.35 72.31L55.74 72.31L57.14 72.20L60.01 71.67L61.49 71.26L64.53 70.20L69.30 68.08L75.64 63.91L82.13 59.20L81.87 58.80L76.49 61.47L71.24 63.81L63.33 66.97L60.54 67.81L59.24 68.08L56.86 68.33L55.80 68.29L54.00 67.91L53.27 67.58L52.10 66.71L51.18 65.52L50.77 64.76L50.03 62.74L49.73 61.45L49.39 58.14L49.36 56.21L49.42 54.14L49.82 49.71L50.15 47.39L51.02 42.62L51.56 40.23L52.81 35.51L54.23 31.03L55.77 26.95L56.56 25.11L58.14 21.94L59.61 19.61L60.92 17.95L61.00 17.37L61.36 17.31L61.89 17.74L62.37 18.44L62.68 19.46L62.81 20.78L62.78 22.37L62.57 24.18L62.21 26.18L61.06 30.63L60.29 33.03L58.43 38.06L57.35 40.64L54.97 45.82L52.37 50.85L51.01 53.26L48.23 57.73L46.84 59.75L44.11 63.22L42.81 64.62L41.56 65.75L40.41 66.58L39.39 67.05L38.62 67.15L38.23 66.92L38.00 67.00L37.54 66.86L36.74 66.45L35.52 65.49L34.16 64.04L29.43 57.66L27.53 55.44L26.09 54.09L25.30 53.49L23.56 52.49L21.61 51.87L21.00 56.00L24.08 55.87L26.23 55.51L28.43 54.96L31.73 53.86L33.87 52.97L35.92 51.96L38.73 50.27L41.14 48.37L42.47 46.93L43.03 46.13L43.50 45.24L43.83 44.26L43.99 43.19L43.90 42.07L43.55 40.98L42.66 39.88L41.64 39.29L40.59 39.07L39.65 39.11L38.82 39.28L36.52 40.18L33.27 42.05L30.61 43.83L22.39 49.64L19.20 51.61L22.79 53.19L23.39 46.55L24.07 41.37L24.95 36.30L26.02 31.59L27.24 27.52L28.11 25.32L29.37 22.99L30.41 21.47L30.72 21.34L31.47 21.34L31.77 21.70L31.98 22.35L32.06 23.26L32.00 24.38L31.50 27.16L31.07 28.78L29.91 32.39L28.39 36.41L25.60 43.01L16.85 61.81L12.71 72.87Z';
  // The set's back, one for all 26 (it hides which card it is): the burst of the set's hues and the kl signature struck
  // large, the same mark as the seal in every collector chip (Kevin 11-02: "for the kl badge use our proper logo").
  const BACK = `<div class="back" aria-hidden="true"><i class="tint"></i>${icon('kl', 'emb')}</div>`;

  const PREVIOUS = 'https://portfoliomon.kevinliu.studio';
  const NOLINK = new Set(['loop', 'bday-land', 'kevin-wiki']); // private or unpushed: receipts print as text
  const STAT = [['hp', 'Health'], ['atk', 'Reach'], ['def', 'Proof'], ['spd', 'Pace']];
  const FACT = { hp: 'build', atk: 'reach', def: 'proof', spd: 'pace' };

  // ---------- the card (EX.md 5 to 17: frame B, Glass, with the judges' grafts) ----------
  // Layers, back to front (EX.md 13): .en (the energy: poster, then canvas.ground; the only clip) 1, .rim 2, .pane and
  // its cracks 3, the smoked bars and frosted slips 4, .pop (the subject) 5, .fx (the front effects) and the shards 6,
  // type 7. Nothing that holds .pop or .fx clips. Every size is cqw of the card (1cqw = W / 100), on EX.md 5's zone map.
  //   env = { face (face.gen.js FACE, else globalThis.FACE), media (media.gen.js), order (Kevin's order of ids, for the
  //   collector number), set (the roster's size), art, recipes } ; opts = { id, focusable, hi, extra, cls, style, back }
  const WIN = { u0: 0.034, u1: 0.966, v0: 0.146, v1: 0.646 }; // round ex.2: 0.500W tall (the owner's squint), was 0.454W
  // Name fit (EX.md 5), decided from the face's own advances so nothing measures at run time and a new card needs no
  // step (round ex.2, engineer: the hand-typed table is gone). ADV is Katagami Sans at weight 800 for U+0020 to U+007E,
  // in thousandths of an em, measured in Chromium from fonts/katagami-sans-cards.woff2 with kerning off
  // (icons/tools/name-fit.mjs writes this line). A title's width is the sum; this face's kerning tightens most titles
  // (up to 1.9%) and widens none by more than 0.7%, so the fit keeps 0.7% in hand. The slot is 0.42W, from 0.156 to
  // 0.032W short of a three digit health block. Every title sets on one line at its fit (Kevin 11-02: "for long titles
  // that are spilling in two lines, like claude of tanks and agent machines ... i meant make them ONE line"), and
  // card.css centres it on the bar's centre line. The slot was 0.362W while the seal stood before the health block;
  // once Kevin moved the seal to the collector chip, the long names took that room, so one line of Claude of Tanks
  // sets at 0.052W rather than 0.045W. face.gen.js carries nf from this (tools/face-data.mjs).
  const ADV = [209,366,605,659,663,1037,689,363,385,385,596,690,363,473,363,406,701,436,642,663,695,640,635,591,672,635,363,363,690,690,690,590,1047,782,666,707,705,625,598,714,749,288,593,749,574,950,768,722,654,736,665,671,682,724,782,1070,774,764,686,385,406,385,497,489,392,592,627,578,642,582,450,629,642,289,289,600,289,935,642,592,627,642,427,581,391,642,623,870,602,627,585,496,397,496,690];
  const SLOT = 0.42;
  const advOf = (s) => {
    let w = 0;
    for (const ch of String(s)) { const c = ch.codePointAt(0); w += (c >= 32 && c < 127 ? ADV[c - 32] : 700) / 1000; }
    return w;
  };
  const fitOf = (title) => Math.min(0.0715, Math.floor(((0.993 * SLOT) / Math.max(advOf(title), 0.001)) * 10000) / 10000);
  // The face title (owner ex.4, Kevin 11-02: "i meant make them ONE line"): a title whose one-line fit falls under 0.05W
  // (10.7 px on the 215 px wall) prints a short form on the face, so it reads as a name and not as a label. The full title
  // stays in the card's label, the info back, the inspect sheet and the twins, and the what line keeps the rest
  // ("Princeton's powerlifting club website ..."). f.short, when the roster carries one, wins; Kevin may choose another.
  const SHORT = { powerlifting: 'Powerlifting' };
  const faceTitle = (f) => f.short || SHORT[f.id] || f.title;
  // face.gen.js's nf is fitted to the title; a face title takes its own fit
  const nameFit = (f, face) => { const ft = faceTitle(f); return { nf: ft === f.title && face && face.nf ? face.nf : fitOf(ft) }; };
  const r4 = (v) => Math.round(v * 10000) / 100; // card widths to cqw, two decimals
  // A block never ends on a short line (round ex.5, craft): balance narrowed every line of a block to even them out, and
  // pretty alone still left 38 of 104 blocks ending on a line under 0.40 of the column. So the face fills each line
  // (card.css text-wrap: pretty), and a block whose last line could fall under half the column keeps its last words
  // together (.kw, white-space: nowrap) until they make at least 0.42 of it, never more than 0.7: the words that would have ended a line short are carried down with
  // the ones before them, the line above keeps the rest of its fill, and no block gains a line. ADV5 is Katagami Sans at
  // weight 500 for U+0020 to U+007E and then EXTRA5, in thousandths of an em, kerning off (icons/tools/text-fit.mjs
  // writes this line); the face's columns are cqw of the card, so a block wraps the same at every width from 225 px.
  const ADV5 = [265,292,498,639,646,994,654,314,369,369,522,668,305,463,305,371,647,407,617,630,657,604,594,572,631,594,305,305,668,668,668,529,984,711,657,693,703,617,603,706,745,273,576,689,575,914,757,712,642,741,648,655,654,740,711,1005,703,698,642,369,371,369,477,463,338,569,604,556,619,564,400,604,603,253,253,560,253,889,603,573,604,619,388,540,342,603,576,830,559,577,560,442,347,442,668,279,477,474,173,915,668,668];
  const EXTRA5 = [0x2019, 0x201c, 0x201d, 0x202f, 0x2026, 0x2212, 0xd7];
  const adv5 = (s) => {
    let w = 0;
    for (const ch of s) { const c = ch.codePointAt(0); const i = c >= 32 && c < 127 ? c - 32 : EXTRA5.indexOf(c) >= 0 ? 95 + EXTRA5.indexOf(c) : -1; w += (i >= 0 ? ADV5[i] : 600) / 1000; }
    return w;
  };
  // each column in ems of its own type: the trait rule and a move's description run 86.4cqw at 4cqw (the band's
  // 93.2cqw less its 1.4cqw pads and the slip's 1.8 and 2.2), the what line 68.7cqw at 3.75cqw (72.1 less 1.8 and 1.6)
  const COL = { body: 86.4 / 4, what: 68.7 / 3.75 };
  // the block's last line as a greedy fill would set it, in its column's share; the face's kerning tightens a line by up
  // to 2%, so the advances are taken at 0.985
  function lastLine(words, col) {
    let cur = '';
    for (const x of words) { const t = cur ? cur + ' ' + x : x; if (0.985 * adv5(t) <= col || !cur) cur = t; else cur = x; }
    return (0.985 * adv5(cur)) / col;
  }
  function kept(text, col) {
    const s = typeset(String(text ?? ''));
    const words = s.split(' ');
    // a block whose estimate ends between half and 0.85 of the column prints as it is, one run with no span (of 35 such
    // blocks, the shortest real last line is 0.58); one that ends shorter, or so full that a word may yet wrap, keeps
    // its tail together (.work/face-ex5/wrap-pretty.json against the estimate)
    const last = words.length < 3 ? 1 : lastLine(words, col);
    if (words.length < 3 || (last >= 0.5 && last < 0.85)) return esc(s);
    const sp = ADV5[0] / 1000;
    let k = 1, w = adv5(words[words.length - 1]);
    while (k < words.length - 1 && w < 0.42 * col) {
      const nw = w + sp + adv5(words[words.length - 1 - k]);
      if (nw > 0.7 * col) break;
      w = nw; k++;
    }
    if (k < 2) return esc(s);
    return `${esc(words.slice(0, -k).join(' '))} <span class="kw">${esc(words.slice(-k).join(' '))}</span>`;
  }
  // a seeded generator, so a card's shards and cracks are the same on every print
  function rng(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    let s = h >>> 0;
    return () => { s = (s + 0x6d2b79f5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }
  // The pane breaks where the subject crosses it: at both ends of every span along which its own alpha crosses the
  // window's foot and sides (media.gen.js pop.cross, measured from the pixels by tools/media.py). Spans closer than
  // 0.03W merge and slivers under 0.012W drop, so a picture with a ragged edge breaks the pane in a few clean places.
  function breaks(pop) {
    const c = (pop && pop.cross) || {};
    const clean = (list) => (list || []).reduce((out, [a, b]) => { const l = out[out.length - 1]; if (l && a - l[1] < 0.03) l[1] = b; else out.push([a, b]); return out; }, []).filter(([a, b]) => b - a >= 0.012);
    const pts = [];
    for (const [a, b] of clean(c.foot)) {
      if (a > WIN.u0 + 0.01) pts.push({ u: a, v: WIN.v1, nx: 0, ny: 1, side: -1 });
      if (b < WIN.u1 - 0.01) pts.push({ u: b, v: WIN.v1, nx: 0, ny: 1, side: 1 });
    }
    for (const [a, b] of clean(c.left)) { if (a > WIN.v0 + 0.01) pts.push({ u: WIN.u0, v: a, nx: -1, ny: 0, side: -1 }); if (b < WIN.v1 - 0.01) pts.push({ u: WIN.u0, v: b, nx: -1, ny: 0, side: 1 }); }
    for (const [a, b] of clean(c.right)) { if (a > WIN.v0 + 0.01) pts.push({ u: WIN.u1, v: a, nx: 1, ny: 0, side: -1 }); if (b < WIN.v1 - 0.01) pts.push({ u: WIN.u1, v: b, nx: 1, ny: 0, side: 1 }); }
    return pts.slice(0, 8);
  }
  const P = (x, y) => `${Math.round(x * 1000)},${Math.round(y * 1000)}`;
  // a shard never lands on type: the provenance strip, the trait header and every text row below the foot
  const KEEP = [[0.146, 0.139, 0.48, 0.192], [0.04, 0.658, 0.96, 1.4], [0.03, 0.03, 0.97, 0.15]];
  function glass(f, pop) {
    const R = rng('glass:' + f.id);
    const clear = (cx, cy, r) => KEEP.every(([a, b, c, d]) => cx + r < a || cx - r > c || cy + r < b || cy - r > d);
    const q = (v) => Math.round(v * 1000);
    let shards = '', cracks = '', flakes = '';
    for (const b of breaks(pop)) {
      const tx = -b.ny, ty = b.nx; // along the edge
      const n = 3 + Math.floor(R() * 2);
      for (let i = 0; i < n; i++) {
        const along = (R() - 0.5) * 0.05 + b.side * 0.012;
        const out = 0.006 + R() * (b.ny ? 0.01 : 0.05);
        const cx = b.u + tx * along + b.nx * out, cy = b.v + ty * along + b.ny * out;
        const s = 0.012 + R() * 0.022, a0 = R() * 6.283, k = 3 + (R() < 0.5 ? 1 : 0);
        const pts = [];
        for (let j = 0; j < k; j++) { const a = a0 + (j / k) * 6.283 + (R() - 0.5) * 0.9; const r = s * (0.45 + R() * 0.75) * (j % 2 ? 0.55 : 1); pts.push([q(cx + Math.cos(a) * r), q(cy + Math.sin(a) * r * 0.8)]); }
        if (!clear(cx + 0.0035, cy + 0.005, s * 1.2 + 0.0035)) continue;
        // one path for every shard: M to the first corner, l by each step after it (short relative numbers)
        shards += `M${pts[0][0]} ${pts[0][1]}` + pts.slice(1).map((p, j) => `l${p[0] - pts[j][0]} ${p[1] - pts[j][1]}`).join('') + 'z';
      }
      // cracks: from the break point back into the pane, each a few jittered segments, under the subject
      for (let j = 0; j < 3; j++) {
        let x = b.u, y = b.v;
        const ang = Math.atan2(-b.ny, -b.nx) + (R() - 0.5) * 2.2 + b.side * 0.35;
        let px = q(x), py = q(y), line = `M${px} ${py}`;
        const len = 0.05 + R() * 0.1;
        for (let k = 0; k < 3; k++) {
          const a = ang + (R() - 0.5) * 0.7;
          x = Math.max(WIN.u0 + 0.004, Math.min(WIN.u1 - 0.004, x + (Math.cos(a) * len) / 3));
          y = Math.max(WIN.v0 + 0.004, Math.min(WIN.v1 - 0.004, y + (Math.sin(a) * len) / 3));
          const nx = q(x), ny = q(y);
          line += `l${nx - px} ${ny - py}`; px = nx; py = ny;
        }
        cracks += line;
      }
    }
    // cost 4: glitter flakes round the subject (EX.md 15), small diamonds
    if (f.cost >= 4 && pop && pop.box) {
      const [u0, v0, u1, v1] = pop.box;
      for (let i = 0; i < 14; i++) {
        const x = Math.max(0.05, Math.min(0.95, u0 + R() * (u1 - u0))), y = v0 + R() * (Math.min(v1, WIN.v1) - v0), s = q(0.003 + R() * 0.004);
        if (!clear(x, y, s / 1000)) continue;
        flakes += `M${q(x)} ${q(y) - s}l${s} ${s}l${-s} ${s}l${-s} ${-s}z`;
      }
    }
    return {
      crk: cracks ? `<svg class="crk" viewBox="0 0 1000 1397" preserveAspectRatio="none" aria-hidden="true"><path d="${cracks}"/></svg>` : '',
      // the shards' shadow is a copy of their outline offset on the room's 1:2 vector (0.25W by 0.5W in hundredths), drawn
      // in the svg rather than as a CSS filter, so the layer squashes with its neighbours
      shards: shards || flakes ? `<svg class="shards" viewBox="0 0 1000 1397" preserveAspectRatio="none" aria-hidden="true"><path class="sd" transform="translate(2.5 5)" d="${shards}${flakes}"/>${shards ? `<path class="sh" d="${shards}"/>` : ''}${flakes ? `<path class="fl" d="${flakes}"/>` : ''}</svg>` : '',
    };
  }
  // The subject (EX.md 13): art/pop/<id>.json's cut, placed by its box in card widths; .art (the battle and the rituals
  // read it) is the whole pop-out layer, so a tilt moves the subject over its print and a lift raises it.
  function mediaOf(f, env) {
    const given = ((env && env.media) || {})[f.id];
    if (given && given.pop && given.logo) return given;
    const file = (mediaFile() || {})[f.id];
    return file ? { ...file, ...(given || {}), pop: (given && given.pop) || file.pop, logo: (given && given.logo) || file.logo } : given || {};
  }
  function popOf(f, env) { return mediaOf(f, env).pop || null; }
  // card(f, { lazy: true }) (engineer ex.4): every picture of a card below the first rows waits until it nears the
  // viewport and decodes off the main thread. Each keeps its width and height, so nothing moves when it lands (CLS 0),
  // and the card's own energy colour (.en) shows until its poster does. The default prints eager pictures (the battle).
  const LAZY = ' loading="lazy" decoding="async"';
  // sizes for a subject bw card widths wide, from the card's own drawn width: one CSS length, or [[media, length], ...]
  // in source-size order with the last media null (build.mjs GALLERY_SIZES, the gallery's own --card formula)
  const sizesOf = (sz, bw) => (Array.isArray(sz) ? sz : [[null, sz]]).map(([m, l]) => `${m ? m + ' ' : ''}calc(${Math.round(bw * 10000) / 10000} * (${l}))`).join(', ');
  function pop(f, env, hiNow, lz = '', sz = null) {
    const p = popOf(f, env);
    if (!p) return `<span class="pop art obj" data-pending></span>`;
    const [u0, v0, u1, v1] = p.box;
    const h = Math.round((p.h * p.lw) / p.w);
    // the cut ladder (energy ex.4, by width): media.gen.js pop.cuts [[0.25, src, w], [0.5, src, w]], the rest cut
    // area-averaged to a quarter and a half of its width. A caller that knows how wide its card draws (opts.sizes) prints
    // srcset by width with the subject's sizes, so the browser takes the smallest file at least as wide as the subject's
    // device px: a 241 px wall card the quarter cut at 1x and the half at 2x, a 480 px card or a 3x phone the rest cut,
    // and never a cut drawn larger than its file (gallery.js keeps each wall subject's sizes at its own drawn width).
    // Pixel art, a hi print and a caller without sizes or cuts (the battle's env, components.html) print src alone.
    const cuts = sz && !hiNow && !p.pixel && Array.isArray(p.cuts) && p.cuts.length ? [...p.cuts].sort((a, b) => a[0] - b[0]) : null;
    const set = cuts ? ` srcset="${cuts.map(([k, u, w]) => `${esc(u)} ${w || Math.round(p.lw * k)}w`).join(', ')}, ${esc(p.src)} ${p.lw}w" sizes="${esc(sizesOf(sz, u1 - u0))}"` : '';
    return `<span class="pop art obj"${p.pixel ? ' data-pixel' : ''} style="left:${r4(u0)}cqw;top:${r4(v0)}cqw;width:${r4(u1 - u0)}cqw"><img src="${hiNow ? p.hi : p.src}"${set} alt="" width="${p.lw}" height="${h}"${lz} draggable="false"></span>${glow(p, hiNow, lz)}`;
  }
  // The subject's glow (r4/stage/cot HANDOFF 2a, round ex.4): additive light its own picture cannot hold (muzzle fire,
  // fireball cores), media.gen.js pop.glow { src, hi, box? }, on the subject's box unless it carries its own. It is a
  // direct child of .face right after .pop, because .pop is its own stacking context and plus-lighter inside it would
  // have no backdrop. A subject without a glow prints nothing.
  function glow(p, hiNow, lz = '') {
    const g = p.glow;
    if (!g || !g.src) return '';
    const [u0, v0, u1] = g.box || p.box;
    const w = g.w || p.w, h = g.h || p.h, lw = g.lw || p.lw;
    return `<img class="glw" src="${hiNow && g.hi ? g.hi : g.src}" alt="" width="${lw}" height="${Math.round((h * lw) / w)}"${lz} draggable="false" style="left:${r4(u0)}cqw;top:${r4(v0)}cqw;width:${r4(u1 - u0)}cqw">`;
  }
  // The subject's cast shadow lies on the print, not on the room (round ex.1, collector and energy): its own silhouette
  // (the same picture as a mask), offset on the room's 1:2 vector and blurred, inside .en, which clips to the card, so
  // only the subject's solid pixels ever cross the trim and nothing soft spills onto the gutter
  function cast(f, env, lz = '') {
    const p = popOf(f, env);
    if (!p || !p.box) return '';
    // round ex.2 (energy): baked once beside the subject (tools/art/keepout-cut.py), the same shadow prints as a plain
    // picture, so no mask or blur joins any repaint; the live mask stays only for a subject with no baked cast
    if (p.cast) {
      const [c0, c1, c2] = p.cast.box;
      return `<img class="cast" src="${p.cast.src}" alt="" width="${p.cast.w}" height="${p.cast.h}"${lz} draggable="false" style="left:${r4(c0)}cqw;top:${r4(c1)}cqw;width:${r4(c2 - c0)}cqw">`;
    }
    const [u0, v0, u1] = p.box;
    const h = Math.round((p.h * p.lw) / p.w);
    return `<i class="cast" style="left:${r4(u0 + 0.0075)}cqw;top:${r4(v0 + 0.015)}cqw;width:${r4(u1 - u0)}cqw;aspect-ratio:${p.lw} / ${h};-webkit-mask-image:url(${p.src});mask-image:url(${p.src})"></i>`;
  }
  const FXBOX = { left: -7.143, top: 7.102, width: 114.286, height: 44.318 }; // ground.js FXBOX on the card, in %
  // The poster ladder (energy ex.5, the engineer's first load): beside each poster tools/posters.cjs bakes its half,
  // posters/<id>@0.5x.avif (252 x 352) and posters/<id>-fx@0.5x.webp (288 x 156), and records them in posters/posters.json
  // half { bytes, fx }. A card printed with opts.sizes (the gallery's wall) takes its poster and its front effects' poster
  // by width as its subject takes its cut, so a 241 px wall card draws the half at 1x and the whole at 2x; a caller
  // without sizes (the battle, the components sheet) or a card without a half prints src alone. env.posters (posters.json)
  // wins; else node reads the file beside this one, and a page or a bundle (no require) reads nothing.
  const postersFile = () => {
    if (!('POSTERS' in required)) {
      required.POSTERS = null;
      // eslint-disable-next-line no-undef
      try { if (typeof require === 'function') { const name = './posters/' + 'posters.json'; required.POSTERS = require(name); } } catch (e) {}
    }
    return required.POSTERS;
  };
  const halfOf = (f, env, kind) => { const P = (env && env.posters) || postersFile(); const h = P && P.half; return !!(h && h[kind] && h[kind][f.id]); };
  const posterSet = (f, env, sz) => (sz && halfOf(f, env, 'bytes') ? ` srcset="posters/${esc(f.id)}@0.5x.avif 252w, posters/${esc(f.id)}.webp 504w" sizes="${esc(sizesOf(sz, 1))}"` : '');
  const fxSet = (f, env, sz) => (sz && halfOf(f, env, 'fx') ? ` srcset="posters/${esc(f.id)}-fx@0.5x.webp 288w, posters/${esc(f.id)}-fx.webp 576w" sizes="${esc(sizesOf(sz, 576 / 504))}"` : '');
  const fx = (f, lz = '', set = '') => `<span class="fx" aria-hidden="true"><img src="posters/${f.id}-fx.webp"${set} alt="" width="576" height="312"${lz} draggable="false"><canvas width="576" height="312"></canvas></span>`;

  // multipliers print the multiplication sign (U+00D7, in the subset) before tabular figures: 30 ×2, ×1.5
  const TIMES = '×';
  function power(mv) {
    const h = mv.hits;
    const x = !h ? '' : h.min === h.max ? `${TIMES}${h.min}` : `${TIMES}${h.min} to ${h.max}`;
    return `${mv.power}${x ? `<small>${x}</small>` : ''}`;
  }
  const costIcons = (mv, f, ic = icon) => (mv.adapts ? f.disciplines : [mv.discipline]).map((d) => ic(d.toLowerCase())).join('');
  const mult = (m) => TIMES + String(m);
  function matchCell(cls, list, label, ic = icon) {
    // one icon per discipline, grouped by multiplier, so two at x1.5 print one multiplier
    const groups = {};
    for (const [d, m] of list || []) (groups[m] = groups[m] || []).push(d);
    const body = Object.entries(groups).map(([m, ds]) => `${ds.map((d) => ic(d.toLowerCase())).join('')}<b>${mult(m)}</b>`).join('');
    const sr = (list || []).map(([d, m]) => `${d} ${mult(m)}`).join(', ') || 'none';
    return `<span class="${cls}">${ic(cls, 'lab')}${body || '<b class="none"></b>'}<span class="sr">${label}: ${sr}</span></span>`;
  }
  // The face's derived data comes from face.gen.js (env.face or globalThis.FACE). A caller without it (r3/battle's
  // CARD_ENV today) still prints every card: the face moves, weak and resist are derived here by face-data.mjs's own
  // rules and the battle engine's ring (RULES.ring and its matchup), and the hue tokens from the hue's OKLCH formulas
  // (EX.md 8), with the hue from f.hue or, failing that, a stable spread of the id.
  const RING = ['Infra', 'Agent', 'Data', 'Game', 'Shader', 'Type', 'Interface'];
  function matchup(ring, attack, defenders) {
    const a = ring.indexOf(attack);
    if (a < 0) return 1;
    let m = 1;
    for (const d of defenders) {
      const i = ring.indexOf(d);
      if (i === (a + 1) % ring.length) m *= 1.5;
      else if (i === (a - 1 + ring.length) % ring.length) m *= 0.67;
    }
    return Math.round(m * 10000) / 10000;
  }
  const meanHits = (m) => { const h = m.hits; if (h == null) return 1; if (typeof h === 'number') return h; if (Array.isArray(h)) return (h[0] + h[1]) / 2; return ((h.min ?? 1) + (h.max ?? h.min ?? 1)) / 2; };
  const expected = (m) => (m.power || 0) * meanHits(m) * (m.accuracy == null ? 1 : m.accuracy > 1 ? m.accuracy / 100 : m.accuracy);
  function faceIndex(f) {
    const moves = f.moves.map((m, i) => ({ m, i, e: expected(m) }));
    const hitting = moves.filter((x) => x.e > 0).sort((a, b) => b.e - a.e || a.i - b.i).slice(0, 2);
    const rest = moves.filter((x) => !hitting.includes(x)).sort((a, b) => a.i - b.i);
    return [...hitting, ...rest].slice(0, 2).map((x) => x.i).sort((a, b) => a - b);
  }
  function hueTokens(h) {
    const o = (l, c) => `oklch(${l} ${c} ${h})`;
    return { h, energy: o(0.72, 0.15), deep: o(0.42, 0.13), panel: o(0.82, 0.075), glint: o(0.95, 0.045), ink: o(0.2, 0.03), metalHi: o(0.92, 0.035), metalLo: o(0.5, 0.05) };
  }
  function deriveFace(f, env) {
    const rules = (env && env.rules) || (typeof globalThis !== 'undefined' && globalThis.RULES) || {};
    const ring = rules.ring || RING;
    const m = ring.map((a) => [a, matchup(ring, a, f.disciplines || [])]);
    let h = typeof f.hue === 'number' ? f.hue : null;
    if (h == null) { let x = 2166136261; for (const ch of f.id) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); h = ((x >>> 0) % 360); }
    return { idx: faceIndex(f), weak: m.filter(([, x]) => x >= 1.5 - 1e-9), resist: m.filter(([, x]) => x <= 0.67 + 1e-9), hue: hueTokens(h) };
  }
  // A caller without face.gen.js or media.gen.js in its env (r3/battle's CARD_ENV, which carries only each card's object
  // and window) still prints the real hue, name fit, subject and logo: the two generated files sit beside this one and
  // are CommonJS too, so node and the battle's esbuild bundle read them here (round ex.2, engineer). A page loads them as
  // classic scripts first (globalThis.FACE and MEDIA), and there require is undefined, so nothing is fetched twice.
  const G = typeof globalThis !== 'undefined' ? globalThis : {};
  const required = {};
  const beside = (key) => {
    if (!(key in required)) {
      try {
        // eslint-disable-next-line no-undef
        const m = key === 'FACE' ? require('./face.gen.js') : require('./media.gen.js');
        required[key] = (m && m[key]) || G[key] || null; // media.gen.js sets globalThis.MEDIA
      } catch (e) { required[key] = null; }
    }
    return required[key];
  };
  const faceFile = () => G.FACE || beside('FACE');
  const mediaFile = () => { const m = G.MEDIA || beside('MEDIA'); return (m && m.media) || null; };
  const givenFace = (f, env) => ((env && env.face) || faceFile() || {})[f.id];
  const faceOf = (f, env) => {
    const given = givenFace(f, env);
    if (given && given.hue) return given;
    const d = deriveFace(f, env);
    return given ? { ...d, ...given, hue: d.hue } : d;
  };
  const orderOf = (env) => (env && env.order) || ((typeof globalThis !== 'undefined' && globalThis.FIGHTERS) || []).map((x) => x.id);
  // The logo tile (EX.md 9): the product's own mark from media.gen.js (art/pop/<id>.json logo). A mark drawn for a dark
  // ground sits on it (logo.ground); a full tile of its own (logo.fill) prints edge to edge.
  function logo(f, env, lz = '') {
    const l = mediaOf(f, env).logo;
    if (!l) return `<span class="logo" data-logo="none"></span>`;
    const st = l.ground ? ` style="--lg:${esc(l.ground)}"` : '';
    return `<span class="logo${l.ground ? ' on' : ''}${l.fill ? ' fill' : ''}" data-kind="${esc(l.kind)}"${st}><img src="${esc(l.src)}" alt=""${lz} draggable="false"></span>`;
  }
  const squares = (n) => `<span class="cost" aria-hidden="true">${'<i></i>'.repeat(n)}</span>`;
  // the provenance strip hangs where the subject leaves the window's top band free (media.gen.js pop.prov, measured from
  // the subject's alpha); where it never does, the strip does not print (the sha is on the collector line and the back)
  // (engineer ex.5: a caller whose defs carry no pin, the battle's engine defs and roster/battle-roster.json, prints no
  // strip and no sha, rather than throwing on f.pinned.sha)
  const provOf = (f, p, pin) => (pin && pin.sha ? `<span class="prov${p && p.prov === null ? ' none' : ''}"${p && p.prov != null && p.prov !== 0.156 ? ` style="left:${r4(p.prov)}cqw"` : ''}>${f.year != null ? f.year + ' ' : ''}${esc(pin.sha)}</span>` : '');
  // A card's pin and its what line come from its fighter, else from face.gen.js (env.face, or the file beside this one),
  // which carries both for every card: the battle's defs carry neither (engineer ex.5, the swap rehearsal). With
  // neither, the face prints no sha and no what slip.
  const pinOf = (f, face) => (f.pinned && f.pinned.sha ? f.pinned : face && face.pinned && face.pinned.sha ? face.pinned : null);
  const whatOf = (f, face) => f.what || (face && face.what) || '';
  const STATS_SR = [['hp', 'Health'], ['atk', 'Reach'], ['def', 'Proof'], ['spd', 'Pace']];

  // Icons whose silhouette is a ring round a separate mark (i-atk, 'Reach', on the info back and in the sheet only)
  // never print on the face: in a cost chip, a type slot, the trait or the footer they would read as an energy roundel
  // (originality ex.4). faceIcon refuses them, so a later change fails at build time; E14b counts them in the browser.
  const RINGED = new Set(['atk']);
  const faceIcon = (name, cls) => { if (RINGED.has(name)) throw new Error(`markup.js: icon ${name} is a ring round a mark and never prints on a card face`); return icon(name, cls); };
  function baseCard(f, { id = 'card-' + f.id, focusable = true, hi = false, extra = '', cls = '', style = '', back = '', lazy = false, sizes = null } = {}, env = {}) {
    const lz = lazy ? LAZY : '';
    const face = faceOf(f, env);
    const hu = face.hue;
    const order = orderOf(env);
    const no = String(order.indexOf(f.id) + 1 || 0).padStart(2, '0');
    const set = env.set || order.length || 26;
    const fit = nameFit(f, face);
    const p = popOf(f, env);
    const pin = pinOf(f, face), what = whatOf(f, face);
    // the burst's centre in card widths, as ground.js subjectOf() takes it (the subject's centre, else the window's), so
    // the cost 4 etch runs along the energy's own rays
    const [bu, bv] = (p && (p.centre || (p.box && [(p.box[0] + p.box[2]) / 2, (p.box[1] + p.box[3]) / 2]))) || [0.5, (WIN.v0 + WIN.v1) / 2];
    const vars = `--hue:${Math.round(hu.h)};--e:${hu.energy};--d:${hu.deep};--p:${hu.panel};--g:${hu.glint};--k:${hu.ink};--mh:${hu.metalHi};--ml:${hu.metalLo};--nf:${fit.nf};--bu:${r4(bu)}cqw;--bv:${r4(bv)}cqw`;
    const desc = STATS_SR.map(([k, n]) => `${n} ${f.stats[k]}`).join(', ');
    const a11y = focusable
      ? ` role="button" tabindex="0" aria-label="${esc(f.title)}, ${f.cost} ink${f.cost > 1 ? 's' : ''}" aria-describedby="d-${f.id}" aria-keyshortcuts="Enter A Space F"`
      : ' aria-hidden="true"';
    const [p1, p2] = f.disciplines;
    const moves = face.idx.map((i) => {
      const mv = f.moves[i];
      return `<div class="move" data-disc="${mv.discipline}"><span class="mc${mv.adapts ? ' two' : ''}">${costIcons(mv, f, faceIcon)}</span><span class="mn">${t(mv.name)}</span><span class="mp">${power(mv)}</span><span class="md">${kept(mv.feature, COL.body)}</span></div>`;
    }).join('');
    const g = glass(f, p);
    // cost 4's glitter (EX.md 15, round ex.5): each field of flakes is a mask fixed to the card (.gl) over a colour of the
    // card's own hue family (.tw) that rituals.js slides with the tilt, as it slides the rim's streak, so different flakes
    // catch the light as the card turns: the print's soft glitter and the window's sharp flakes in .en, the text panel's
    // over the slips
    const tw = (k) => `<i class="gl ${k}" aria-hidden="true"><i class="tw"></i></i>`;
    const chase = f.cost >= 4;
    // a face move that adapts carries both icons, so every chip on that card takes its width and the names keep one column
    const col2 = face.idx.some((i) => f.moves[i].adapts);
    return `<div class="card${cls ? ' ' + cls : ''}" id="${id}" data-id="${f.id}" data-cost="${f.cost}" data-hue="${Math.round(hu.h)}"${col2 ? ' data-col="2"' : ''}${a11y} style="${vars}${style}">
<div class="body"><div class="face">
<span class="en"><img class="poster" src="posters/${f.id}.webp"${posterSet(f, env, sizes)} alt="" width="504" height="704"${lz} draggable="false"><canvas class="ground" width="504" height="704" aria-hidden="true"></canvas>${cast(f, env, lz)}${chase ? tw('gp') + tw('gq') + tw('gw') : ''}</span>
<i class="rim"><i class="spec"></i></i><i class="pane"></i>${g.crk}<i class="sill"></i>
<div class="top">${logo(f, env, lz)}<span class="nm"><span class="name">${t(faceTitle(f))}</span></span><span class="hp">${faceIcon('hp', 'hpi')}<b class="hpn">${f.stats.hp}</b><span class="types">${faceIcon(p2.toLowerCase(), 't2')}${faceIcon(p1.toLowerCase(), 't1')}</span></span></div>
${provOf(f, p, pin)}
<div class="band"><div class="trait"><span class="ti">${faceIcon('trait')}</span><span class="tn">${t(f.trait.name)}</span><span class="tr">${t(f.trait.rule)}</span></div>${moves}</div>
<div class="foot">${matchCell('weak', face.weak, 'Weak', faceIcon)}${matchCell('resist', face.resist, 'Resist', faceIcon)}${squares(f.cost)}</div>
<div class="no">${icon('kl', 'seal')}<b>${no}/${set}</b>${pin ? `<span class="rc">${esc(String(pin.sha).slice(0, 7))}</span>` : ''}</div>
${what ? `<div class="what"><p>${kept(what, COL.what)}</p></div>` : ''}${chase ? tw('gt') : ''}
${pop(f, env, hi, lz, sizes)}${g.shards}${fx(f, lz, fxSet(f, env, sizes))}<span class="glarebox"><i class="glare"></i></span>
</div>${back === 'info' ? infoBack(f, env.media) : BACK}<i class="sleeve"></i></div>${focusable ? `<span class="sr" id="d-${f.id}">${desc}</span>` : ''}${extra}</div>`;
  }

  // The card's family (EX.md 23): design/card.js prints the card above in its family (its own border, finish, aperture,
  // text construction, picture placement and front effect) whenever design/plan.gen.js is loaded beside this file: a page
  // loads both as classic scripts before this one (globalThis.DESIGN_CARD, DESIGN_PLAN); node and the battle's esbuild
  // bundle require them here. A caller without the plan, or a card the plan does not hold, prints as above.
  let dz;
  function family() {
    if (dz !== undefined) return dz;
    let W = G.DESIGN_CARD || null, PLAN = G.DESIGN_PLAN || null;
    try {
      // eslint-disable-next-line no-undef
      if (!W) W = require('./design/card.js');
      // eslint-disable-next-line no-undef
      if (!PLAN) PLAN = require('./design/plan.gen.js');
    } catch (e) {}
    dz = W && W.make && PLAN && PLAN.cards ? W.make({ baseCard, mediaOf, popOf, sizesOf }, PLAN) : null;
    return dz;
  }
  function card(f, opts, env) { const D = family(); return D ? D.card(f, opts || {}, env || {}) : baseCard(f, opts, env); }

  // The info back (EX.md 6 and 7): the inspection's flip side. The product's logo large, what it is, the trait with its
  // receipt, all four moves with power, accuracy, uses and receipts, the four facts with receipts, the pinned commit
  // and the credit. Set at T3 only (the lens), at EX.md 7's sizes, and never smaller than 9 px.
  function infoBack(f, media) {
    const m = mediaOf(f, { media });
    const l = m.logo;
    // the hue tokens print only from face.gen.js; without it the back inherits the card's own (it sits inside the card)
    const face = givenFace(f, {});
    const hu = face ? face.hue : null;
    const pin = pinOf(f, face), what = whatOf(f, face);
    const st = hu ? ` style="--hue:${Math.round(hu.h)};--e:${hu.energy};--d:${hu.deep};--p:${hu.panel};--g:${hu.glint};--k:${hu.ink};--mh:${hu.metalHi};--ml:${hu.metalLo}"` : '';
    // a receipt's line range (106-107) never breaks across lines
    const rcpt = (s) => t(s).replace(/\d+[-\u2010\u2011]\d+/g, (m) => `<span class="nb">${m}</span>`);
    const mv = f.moves.map((x) => `<li><p class="ih"><span class="mc">${costIcons(x, f)}</span><b>${t(x.name)}</b><span class="im">${Math.round(x.accuracy * 100)}% to land, ${x.uses} uses</span><span class="ip">${power(x)}</span></p><p class="if">${t(x.feature)}</p><code>${rcpt(x.receipt)}</code></li>`).join('');
    // a value and its unit never part ('192.75 commits per active day'), and the label wraps whole after them
    const facts = factOrder(f).map(([k, name]) => {
      const fact = f.facts[FACT[k]];
      return `<li>${icon(k)}<p><span class="vu"><b>${t(num(fact.value))}</b> ${t(unitOf(fact.value, fact.unit))}</span> <span class="lb">${t(name)} ${f.stats[k]}</span></p><code>${rcpt(fact.receipt)}</code></li>`;
    }).join('');
    const credit = [f.credit, m.credit].filter(Boolean).map((c) => `<p class="credit">${t(c)}</p>`).join('');
    const long = [f.trait, ...f.moves].reduce((n, x) => n + String(x.receipt || '').length, 0) > 560;
    // the back is a collectible too (collector ex.4): the card's own energy, its poster, under the slips at reduced alpha,
    // inside the rim of its cost
    return `<div class="back info${long ? ' long' : ''}" aria-hidden="true"${st}><img class="ibg" src="posters/${esc(f.id)}.webp" alt="" width="504" height="704" draggable="false"><i class="rim"><i class="spec"></i></i><div class="ib">
<div class="ihd">${l ? `<span class="ilogo${l.ground ? ' on' : ''}${l.fill ? ' fill' : ''}"${l.ground ? ` style="--lg:${esc(l.ground)}"` : ''}><img src="${esc(l.src)}" alt="" draggable="false"></span>` : ''}<div><h3>${t(f.title)}</h3>${what ? `<p class="iwhat">${t(what)}</p>` : ''}</div></div>
<div class="itrait"><p><span class="ti">${icon('trait')}</span><b>${t(f.trait.name)}</b> ${t(f.trait.rule)}</p><code>${rcpt(f.trait.receipt)}</code></div>
<ol class="imoves">${mv}</ol>
<div class="irc"><ul class="ifacts">${facts}</ul>
${pin ? `<p class="ipin">${t(`${f.id}@${pin.sha}${pin.date ? ', ' + pin.date : ''}`)}</p>` : ''}${credit}</div>
</div></div>`;
  }

  // ---------- the inspection sheet (ANATOMY 2.3): disciplines, facts, trait, moves, commit, credit ----------
  const STATNAME = { atk: 'Reach', def: 'Proof', spd: 'Pace' };
  function effectText(fx) {
    if (!fx) return '';
    const k = String(fx.type || '');
    if (k === 'heal') return `restores ${fx.amount} health`;
    if (k === 'barrier') return `raises a ${Math.round(fx.amount * 100)}% barrier`;
    if (/^crit/.test(k)) return 'sharpens its next hit';
    const s = STATNAME[k.slice(0, 3)];
    return s ? `raises its ${s}` : '';
  }
  function timesText(h) {
    if (!h) return '';
    const word = (n) => ['', 'once', 'twice', 'three times', 'four times', 'five times'][n] || `${n} times`;
    return h.min === h.max ? ` ${word(h.min)}` : `, ${h.min} to ${h.max} times`;
  }
  function moveText(mv) {
    const parts = [];
    const p = mv.power;
    if (mv.axis && typeof p === 'number') parts.push(`hits for ${p} at ${mv.axis.tag} ${mv.axis.default}`);
    else if (typeof p === 'number' && p > 0) parts.push(`hits for ${p}${timesText(mv.hits)}${mv.accuracy < 1 ? `, ${Math.round(mv.accuracy * 100)}% of the time` : ''}`);
    const fx = effectText(mv.selfEffect);
    if (fx) parts.push(fx);
    if (mv.effect && mv.effect.type === 'stun') parts.push(`stuns ${Math.round(mv.effect.chance * 100)}% of the time`);
    if (mv.piercing) parts.push(`cuts through ${Math.round(mv.piercing * 100)}% of a barrier`);
    if (mv.executeThreshold) parts.push(`finishes a target under ${Math.round(mv.executeThreshold * 100)}% health`);
    if (mv.adapts) parts.push('takes the discipline that hits hardest');
    if (mv.priority > 0) parts.push('goes first');
    if (mv.priority < 0) parts.push('goes last');
    const act = parts.length ? parts.join(' and ') : 'holds its ground';
    return `<b>${t(mv.name)}</b> ${t(act)}. ${t(mv.feature)}.`.replace(/\.\.$/, '.');
  }
  // media: media.gen.js's entries (env.media in the build, MEDIA.media in the page); a frame's credit prints last
  // Facts with a value lead and a zero follows them (owner ex.4: Powerlifting's sheet opened on '0 GitHub stars'), in
  // STAT's order otherwise; the info back and the sheet list them alike.
  const factOrder = (f) => STAT.map((s, i) => [s, i]).sort(([a, i], [b, j]) => (f.facts[FACT[a[0]]].value === 0) - (f.facts[FACT[b[0]]].value === 0) || i - j).map(([s]) => s);
  // The sheet opens on what the product is (owner ex.4: "the info boxes explain what it is better"), right under the
  // disciplines that gallery.js lifts into its head, then the facts, the trait and the moves. While the lens shows the
  // info back, which prints the what line, the trait and all four moves, the sheet keeps only the facts and their
  // receipts (card.css, keyed to the lens's side), so no text shows twice.
  function sheet(f, media) {
    const disc = f.disciplines.map((d) => `<span>${icon(d.toLowerCase())}${t(d)}</span>`).join('');
    const facts = factOrder(f).map(([k]) => {
      const fact = f.facts[FACT[k]];
      return `<li data-stat="${k}">${icon(k)}<div><p><b>${t(num(fact.value))}</b> ${t(unitOf(fact.value, fact.unit))}</p><code>${t(fact.receipt)}</code></div></li>`;
    }).join('');
    const moves = f.moves.map((mv) => `<li><p>${moveText(mv)}</p><code>${t(mv.receipt)}</code></li>`).join('');
    const pn = pinOf(f, givenFace(f, {})), what = whatOf(f, givenFace(f, {}));
    const sha = pn ? `${f.id}@${pn.sha}${pn.date ? ', ' + pn.date : ''}` : '';
    const pin = !pn ? '' : f.repo && !NOLINK.has(f.id) ? `<a href="${esc(f.repo.replace(/ .*$/, ''))}/commit/${esc(pn.sha)}" target="_blank" rel="noopener">${t(sha)}</a>` : `<span>${t(sha)}</span>`;
    return `<p class="disc">${disc}</p>
${what ? `<p class="swhat">${t(what)}</p>` : ''}
<ul class="facts">${facts}</ul>
${f.trait ? `<div class="trait"><p><b>${t(f.trait.name)}</b> ${t(f.trait.rule)}</p><code>${t(f.trait.receipt)}</code></div>` : ''}
<ol class="moves">${moves}</ol>
${pin ? `<p class="pin">${pin}</p>` : ''}${[f.credit, ((media || {})[f.id] || {}).credit].filter(Boolean).map((c) => `<p class="credit">${t(c)}</p>`).join('')}`;
  }

  // ---------- the header, the pack, the deck, the dock, the inspection ----------
  // Every text state is two labels stacked in one grid cell, so the cell is as wide as the wider and a
  // state change moves nothing. Only the first is read; the other is for the eye.
  const weights = (s) => `<span class="stack2"><span class="lab l-off">${s}</span><span class="lab l-on" aria-hidden="true">${s}</span></span>`;
  function header() {
    return `<header class="top">
<h1>Kevin Liu</h1>
<div class="seg" role="group" aria-label="View" style="--i:0">${['Human', 'Machine'].map((v, i) => `<button type="button" data-mode-set="${v.toLowerCase()}" aria-pressed="${!i}">${weights(v)}</button>`).join('')}</div>
<button type="button" class="press icon" id="pause" aria-pressed="false" aria-label="Pause Motion"><span class="swapi">${icon('pause', 'off')}${icon('play', 'on')}</span></button>
</header>`;
  }
  // The pack is printed with a fan of all 18 worlds: one wedge each from a point under its foot, each
  // wedge an equal share of the packet's edge, so every world shows the same width at the rim.
  function fan(fighters, RATIO, env) {
    const W = 1, H = RATIO, ax = 0.5, ay = H * 1.06, L = 2 * H + W, n = fighters.length;
    const at = (s) => (s <= H ? [0, H - s] : s <= H + W ? [s - H, 0] : [W, s - H - W]);
    const corners = [H, H + W];
    const P = ([x, y]) => `${Math.round((x / W) * 10000) / 100}% ${Math.round((y / H) * 10000) / 100}%`;
    let out = '';
    for (let i = 0; i < n; i++) {
      const s0 = (L * i) / n, s1 = (L * (i + 1)) / n;
      const pts = [[ax, ay], at(s0), ...corners.filter((c) => c > s0 && c < s1).map(at), at(s1)];
      // the fan draws each poster on the packet's small box: its half at 1x where one is baked (energy ex.5)
      const id = fighters[i].id, bg = halfOf(fighters[i], env, 'bytes') ? `image-set(url(posters/${id}@0.5x.avif) 1x, url(posters/${id}.webp) 2x)` : `url(posters/${id}.webp)`;
      out += `<i style="background-image:${bg};clip-path:polygon(${pts.map(P).join(',')})"></i>`;
    }
    return `<span class="fan">${out}</span>`;
  }
  function pack(fighters, RATIO, env) {
    let strip = '';
    for (let i = 0; i < 12; i++) strip += `<i style="--i:${i}"></i>`;
    return `<button type="button" class="pack" id="pack" aria-label="Open Pack" aria-keyshortcuts="Enter Space">
<span class="pk"><span class="half l">${fan(fighters, RATIO, env)}</span><span class="half r">${fan(fighters, RATIO, env)}</span><span class="strip" aria-hidden="true">${strip}</span>
<span class="pk-foot"><span class="stack2"><span class="lab on">${icon('pack')}Open Pack</span><span class="lab off">Team Full</span></span></span></span>
</button>`;
  }
  function deck() {
    return `<a class="deck" id="deck" href="${PREVIOUS}" target="_blank" rel="noopener" aria-label="Previous site">
<span class="pile" aria-hidden="true"><span class="cardlike p2">${BACK}</span><span class="cardlike p1">${BACK}</span></span>
<span class="cardlike lead" aria-hidden="true"><span class="turn">${BACK}<span class="prev"></span></span></span>
</a>`;
  }
  // Play: the dock's one filled control. Until both teams exist it is flat, still focusable, and its cell
  // reads the reason.
  const playButton = (ready, cls = '') => `<button type="button" class="play${cls}" id="play" data-state="${ready ? 'go' : 'wait'}"${ready ? '' : ' aria-disabled="true"'} aria-label="${ready ? 'Play' : 'Play, Pick Three'}" aria-keyshortcuts="P"><span class="stack2" aria-hidden="true"><span class="lab l-go">${icon('play')}<span class="t">Play</span></span><span class="lab l-wait">${icon('play')}<span class="t">Pick Three</span></span></span></button>`;
  // Add To Team: one control, four labels in one cell; the name is the label that shows.
  const addButton = (state = 'add', cls = '') => `<button type="button" class="addbtn${cls}" data-state="${state}"${/full|over/.test(state) ? ' aria-disabled="true"' : ''} aria-label="${ADD_LABEL[state]}" aria-keyshortcuts="Enter A"><span class="stack2" aria-hidden="true"><span class="lab l-add">${icon('add', 'rot')}Add To Team</span><span class="lab l-remove">${icon('add', 'rot')}Remove</span><span class="lab l-full">Team Full</span><span class="lab l-over">Over Budget</span></span></button>`;
  const ADD_LABEL = { add: 'Add To Team', remove: 'Remove', full: 'Add To Team, Team Full', over: 'Add To Team, Over Budget' };
  function dock(you, rival, fighters, rules, env) {
    const byId = (id) => fighters.find((f) => f.id === id);
    const held = (id, who) => (id ? card(byId(id), { id: `w-${who}-${id}`, focusable: false }, env) : '');
    const wells = (who) => [0, 1, 2].map((i) => {
      const id = (who === 'you' ? you : rival)[i];
      return who === 'you'
        ? `<button type="button" class="well${id ? ' full' : ''}" data-slot="${i}" aria-label="${id ? 'Remove ' + esc(byId(id).title) : 'Fill Team, Slot ' + (i + 1)}"${id ? '' : ' tabindex="-1"'}>${icon('add', 'plus')}<span class="hold">${held(id, who)}</span>${icon('close', 'rm')}</button>`
        : `<span class="well${id ? ' full' : ''}" data-slot="${i}"><span class="hold">${id ? card(byId(id), { id: `w-${who}-${id}`, focusable: false, cls: 'theirs' }, env) : ''}</span></span>`;
    }).join('');
    const n = you.reduce((a, id) => a + byId(id).cost, 0);
    const both = you.length === 3 && rival.length === 3;
    return `<nav class="dock" aria-label="Teams">
<div class="side you">${wells('you')}</div>
<div class="mid"><span class="gauge" role="img" aria-label="${n} of ${rules.team.budget} inks">${Array.from({ length: rules.team.budget }, (_, i) => `<i${i < n ? ' class="on"' : ''}></i>`).join('')}</span>${playButton(both)}</div>
<div class="side rival" aria-label="Rival">${wells('rival')}</div>
</nav>`;
  }
  function inspect() {
    // a modal dialog: the page behind is inert while it is open (gallery.js), and it carries its own status line, so
    // what the page says while it is open (Team Full, Over Budget) is heard inside it
    // the sheet: a head that never scrolls (the disciplines on Close's axis), the body that does, the tray
    return `<div class="inspect" id="inspect" role="dialog" aria-modal="true" aria-label="Card" tabindex="-1" hidden>
<p class="sr" role="status" id="ins-status"></p>
<i class="room" aria-hidden="true"></i>
<div class="ins-card"></div>
<aside class="sheet">
<div class="sheet-head"><p class="disc"></p><button type="button" class="press icon close" aria-label="Close" aria-keyshortcuts="Escape">${icon('close')}</button></div>
<div class="sheet-body"></div>
<div class="acts">${addButton()}<a class="press visit" target="_blank" rel="noopener" href="#">${icon('visit')}<span>Visit</span></a></div>
</aside>
</div>`;
  }

  return { esc, typeset, t, kept, adv5, ADV5, COL, num, unitOf, icon, faceIcon, RINGED, KL, BACK, PREVIOUS, STAT, ADD_LABEL, ADV, SLOT, advOf, fitOf, nameFit, faceTitle, SHORT, factOrder, faceOf, faceIndex, WIN, FXBOX, breaks, glass, mediaOf, popOf, pop, glow, logo, power, card, baseCard, family, sizesOf, infoBack, sheet, moveText, header, fan, pack, deck, dock, inspect, playButton, addButton, weights };
});
