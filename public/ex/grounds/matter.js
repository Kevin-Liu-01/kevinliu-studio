// Each product's matter: one tile of its own material, drawn from its own words, marks, data and shapes (EX.md 12),
// never from another product and never from a picture, so a tile ships as code and crosses no rights gate. White on
// transparent: alpha is the material's coverage and the grey its tone; the energy (grounds/energy.glsl) tints both in
// the card's own hue, so no tile carries a colour of its own. A tile is designed on a 512 unit square and drawn at
// the size asked (ground.js draws 256 px), and it repeats seamlessly. ROWS is how many streams it holds, so the burst
// wraps that many rows round the subject without stretching one. GLYPHS is the Type vocabulary's shared atlas: sixteen
// Katagami Sans glyphs, 4 x 4.
// tools/grounds.mjs carries this file inside grounds/programs.gen.js, so every page that loads the energy draws its
// tiles itself; tools/matter.html shows them all. Adapted from round 4's ex-breakout matter study (original code
// from this project), each drawing re-made for the new vocabulary.
(function (root) {
  'use strict';
  const T = 512;
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const font = (w, px) => `${w} ${px}px "Katagami Sans"`;
  const grey = (v, a = 1) => `rgba(${Math.round(v * 255)},${Math.round(v * 255)},${Math.round(v * 255)},${a})`;
  // a run of text repeated along a row, wrapped at the tile's edge (so the tile repeats seamlessly)
  function runText(x, s, y, x0, gap = 0) {
    const w = x.measureText(s).width + gap;
    let cx = x0 - Math.ceil((x0 + w) / w) * w;
    while (cx < T) { x.fillText(s, cx, y); cx += w; }
  }
  // draw f at (X, Y) and its wrapped copies, so a mark crossing the edge continues on the other side
  function wrap(X, Y, f) { for (const ox of [0, -T, T]) for (const oy of [0, -T, T]) f(X + ox, Y + oy); }
  const B8 = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
  function rr(x, X, Y, w, h, r) { x.beginPath(); x.roundRect(X, Y, w, h, r); }

  const MATTER = {
    // the deck laid out: 16:10 slides, one to a cell (a gate never cuts one), each with its title bar, a picture block in
    // the deck's 8x8 dither and three bullet lines, one in four held by the editor's selection box and its six handles
    turboslide(x) {
      const rnd = rng(7), rows = 8, ch = T / rows, cw = 2 * ch, sw = 100, sh = 50;
      for (let r = 0; r < rows; r++) for (let k = 0; k < T / cw; k++) {
        const X = k * cw + (cw - sw) / 2, Y = r * ch + (ch - sh) / 2, kind = (r * 3 + k) % 4;
        rr(x, X, Y, sw, sh, 3); x.fillStyle = grey(0.95); x.fill(); x.strokeStyle = grey(0.16); x.lineWidth = 2.5; x.stroke();
        x.fillStyle = grey(0.12); x.fillRect(X + 8, Y + 6, kind === 2 ? 68 : 50, 6);
        const bx = kind === 1 ? X + 54 : X + 8, by = Y + 17, bw = 38, bh = 26;
        x.fillStyle = grey(0.1);
        for (let py = 0; py < bh; py += 2) for (let px = 0; px < bw; px += 2) {
          const tone = kind === 3 ? 0.15 + 0.8 * (px / bw) : 0.2 + 0.75 * Math.sin((px / bw) * 2.6 + (py / bh) * 1.4) ** 2;
          if (tone * 64 > B8[((py >> 1) % 8) * 8 + ((px >> 1) % 8)] + 0.5) x.fillRect(bx + px, by + py, 2, 2);
        }
        const lx = kind === 1 ? X + 8 : X + 52;
        x.fillStyle = grey(0.35);
        for (let l = 0; l < 3; l++) { x.fillRect(lx, by + 3 + l * 9, 4, 4); x.fillRect(lx + 7, by + 4 + l * 9, 31 - (l % 2) * 9, 2.5); }
        if (rnd() < 0.25) {
          x.strokeStyle = grey(1); x.lineWidth = 2; x.strokeRect(X - 3, Y - 3, sw + 6, sh + 6);
          x.fillStyle = grey(1); for (const [hx, hy] of [[0, 0], [sw / 2, 0], [sw, 0], [0, sh], [sw / 2, sh], [sw, sh]]) x.fillRect(X + hx - 4, Y + hy - 4, 8, 8);
        }
      }
      return 8;
    },
    // its own word as its field sets it: tracked capitals, weight climbing row by row, and the dot field between; under the
    // type, the field alone: its glyph-dot matrix, dots sized along a slow wave
    glyphfield(x, calm) {
      const ws = [300, 500, 700, 900, 600, 800, 400, 900];
      for (let r = 0; r < 8; r++) {
        if (calm) {
          for (let k = 0; k < 32; k++) for (let j = 0; j < 3; j++) {
            const s = 3.5 + 5 * Math.abs(Math.sin(k * 0.39 + r * 0.9 + j * 1.1));
            x.fillStyle = grey((k + j) % 3 ? 1 : 0.3); x.beginPath(); x.arc(k * 16 + 8, r * 64 + 12 + j * 20, s, 0, 7); x.fill();
          }
          continue;
        }
        x.font = font(ws[r], 44); x.fillStyle = grey(r % 2 ? 1 : 0.7); x.letterSpacing = '6px';
        runText(x, 'GLYPHFIELD', r * 64 + 47, -r * 71, 18);
        x.fillStyle = grey(0.5);
        for (let k = 0; k < 64; k++) { const s = 1 + ((k * 7 + r * 3) % 4); x.fillRect(k * 8 + 2, r * 64 + 56, s, s); }
      }
      return 8;
    },
    // the creature's ASCII skin, each cell a character picked by tone from its renderer's ramp; under the type the same
    // cells as its dither's squares, sized by the same tone
    jarhead(x, calm) {
      const ramp = ' .:-=+*#%@', rnd = rng(3), rows = 16, ch = T / rows, cw = 21.33;
      x.font = font(800, 26); x.textAlign = 'center';
      for (let r = 0; r < rows; r++) for (let c = 0; c < 24; c++) {
        const v = 0.5 + 0.5 * Math.sin(c * 0.55 + r * 1.3) * Math.cos(c * 0.21 - r * 0.7) + (rnd() - 0.5) * 0.5;
        const t = Math.max(0, Math.min(1, v));
        x.fillStyle = grey(0.45 + 0.55 * t);
        if (calm) { const s = 6 + 13 * t; x.fillStyle = grey(t > 0.5 ? 1 : 0.3); x.fillRect(c * cw + (cw - s) / 2, r * ch + (ch - s) / 2, s, s); }
        else x.fillText(ramp[Math.max(0, Math.min(9, Math.round(v * 9)))], c * cw + cw / 2, r * ch + ch * 0.8);
      }
      return 16;
    },
    // the a on its weight axis, 100 to 900, its cut outline and the on-curve points of its construction; under the type
    // its construction alone: the counter's bowl, weighted by the axis, with its on-curve points and handles
    katagami(x, calm) {
      const rnd = rng(11);
      for (let r = 0; r < 8; r++) {
        let cx = -((r * 37) % 64);
        for (let k = 0; cx < T; k++) {
          const w = 100 + (((k + r) * 100) % 900);
          x.font = font(w, 58);
          const cut = (k + r) % 4 === 0, adv = x.measureText('a').width + 8;
          if (calm) {
            const ox = cx + adv / 2 - 4, oy = r * 64 + 36;
            x.strokeStyle = grey(0.55 + 0.45 * (w / 900)); x.lineWidth = 2 + 5 * (w / 900);
            x.beginPath(); x.ellipse(ox, oy, 11, 14, 0, 0, 7); x.stroke();
            x.fillStyle = grey(1); for (const [px, py] of [[0, -14], [11, 0], [0, 14], [-11, 0]]) x.fillRect(ox + px - 3, oy + py - 3, 6, 6);
            if (cut) { x.strokeStyle = grey(1); x.lineWidth = 1.5; x.beginPath(); x.moveTo(ox - 9, oy - 14); x.lineTo(ox + 9, oy - 14); x.stroke(); }
          } else if (cut) { x.strokeStyle = grey(1); x.lineWidth = 2.5; x.strokeText('a', cx, r * 64 + 52); x.fillStyle = grey(1); for (let i = 0; i < 4; i++) x.fillRect(cx + rnd() * 26, r * 64 + 14 + rnd() * 36, 6, 6); }
          else { x.fillStyle = grey(0.55 + 0.45 * (w / 900)); x.fillText('a', cx, r * 64 + 52); }
          cx += adv;
        }
      }
      return 8;
    },
    // the tanks themselves, side on: track run and road wheels, hull, turret and gun, one to a cell, the rows facing
    // alternately, so a column advances each way
    'claude-of-tanks'(x) {
      const rows = 8, ch = T / rows, cw = 2 * ch;
      for (let r = 0; r < rows; r++) for (let k = 0; k < T / cw; k++) {
        const X = k * cw, Y = r * ch;
        x.save();
        if (r % 2) { x.translate(2 * X + cw, 0); x.scale(-1, 1); }
        x.fillStyle = grey(0.85); x.beginPath(); x.moveTo(X + 8, Y + 44); x.lineTo(X + 20, Y + 30); x.lineTo(X + 98, Y + 30); x.lineTo(X + 110, Y + 44); x.closePath(); x.fill();
        rr(x, X + 10, Y + 42, 98, 18, 9); x.fillStyle = grey(0.28); x.fill();
        for (let i = 0; i < 5; i++) { x.fillStyle = grey(0.72); x.beginPath(); x.arc(X + 24 + i * 17.5, Y + 51, 6.5, 0, 7); x.fill(); x.fillStyle = grey(0.3); x.beginPath(); x.arc(X + 24 + i * 17.5, Y + 51, 2.2, 0, 7); x.fill(); }
        rr(x, X + 36, Y + 15, 44, 16, 6); x.fillStyle = grey(0.95); x.fill();
        x.fillStyle = grey(0.95); x.fillRect(X + 76, Y + 19, 44, 5); x.fillRect(X + 116, Y + 17, 8, 9);
        x.fillStyle = grey(0.4); x.fillRect(X + 44, Y + 19, 10, 4);
        x.restore();
      }
      return 8;
    },
    // envelopes in flight and the sorter's stamp, its labels as the belt prints them; under the type the envelopes alone
    mailroom(x, calm) {
      const words = ['WORK', 'RECEIPTS', 'PROMOS', 'SOCIAL', 'TRASH', 'NEWS', 'RECEIPTS', 'WORK'];
      for (let r = 0; r < 8; r++) {
        if (!calm) { x.font = font(800, 26); x.fillStyle = grey(0.6); x.letterSpacing = '3px'; runText(x, words[r], r * 64 + 58, -r * 53, 120); }
        for (let k = 0; k < 4; k++) {
          const X = k * 128 + 35, Y = r * 64 + 6;
          wrap(X, Y, (X, Y) => {
            x.fillStyle = grey(0.95); x.fillRect(X, Y, 58, 36);
            x.strokeStyle = grey(0.3); x.lineWidth = 2.5; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + 29, Y + 20); x.lineTo(X + 58, Y); x.stroke();
            if ((k + r) % 3 === 0) { x.strokeStyle = grey(0.4); x.lineWidth = 2; x.strokeRect(X + 42, Y + 4, 12, 12); }
          });
        }
      }
      return 8;
    },
    // the query fields: one to a gate's length (two rows' width, 102.4 units, where the energy may cut a stream), each a
    // rounded field with its magnifier and one whole query word, so no strip's end ever cuts a letter (craft ex.6: the long
    // queries ran across the gates and printed 'curriculu', 'coffe' and 'computer science c'); under the type, the same
    // fields with each word a bar
    'local-search'(x, calm) {
      const words = ['rust', 'async', 'sqlite', 'local', 'first', 'tokio', 'cache', 'index', 'query', 'docs', 'notes', 'bm25', 'fts5', 'coffee', 'static', 'site'];
      for (let r = 0; r < 10; r++) {
        const y = r * 51.2;
        for (let k = 0; k < 5; k++) {
          const X = k * 102.4, w = words[(r * 7 + k * 3) % words.length];
          rr(x, X + 5, y + 9, 92.4, 33, 16.5); x.fillStyle = grey(0.18); x.fill();
          x.strokeStyle = grey(0.6); x.lineWidth = 3; x.lineCap = 'round';
          x.beginPath(); x.arc(X + 21, y + 24, 6, 0, 7); x.stroke();
          x.beginPath(); x.moveTo(X + 25.5, y + 28.5); x.lineTo(X + 30, y + 33); x.stroke();
          let fs = 21; x.font = font(600, fs);
          while (x.measureText(w).width > 56 && fs > 12) { fs -= 1; x.font = font(600, fs); }
          const tw = x.measureText(w).width, tx = X + 36;
          x.fillStyle = grey(1);
          if (calm) { rr(x, tx, y + 19, tw, 12, 6); x.fill(); }
          else x.fillText(w, tx, y + 32);
        }
      }
      return 10;
    },
    // the pets' pixels on their own grid: the cat's head with its ears, a paw and a heart, in a run
    'agent-pets'(x) {
      const rnd = rng(17), px = 6;
      const sprites = [
        ['X........X', 'XX......XX', 'XXXXXXXXXX', 'XXOXXXXOXX', 'XXXXXXXXXX', 'XXXXOOXXXX', '.XXXXXXXX.'],
        ['...XX.XX..', '..XXX.XXX.', '..........', '.XX.XXX...', 'XXXXXXXXX.', '.XXXXXXX..', '..XXXXX...'],
        ['.XX...XX..', 'XXXX.XXXX.', 'XXXXXXXXX.', '.XXXXXXX..', '..XXXXX...', '...XXX....', '....X.....'],
      ];
      for (let r = 0; r < 7; r++) for (let k = 0; k < 6; k++) {
        const s = sprites[(r + k) % 3], X = k * 86 + (r % 2) * 43 + rnd() * 8, Y = r * 73.14 + 14;
        wrap(X, Y, (X, Y) => s.forEach((row, j) => [...row].forEach((c, i) => { if (c !== '.') { x.fillStyle = grey(c === 'O' ? 0.15 : 0.9); x.fillRect(X + i * px, Y + j * px, px, px); } })));
      }
      return 7;
    },
    // its own diff, a hunk line to a gate's length (128 units): added lines light and removed lines dark, each with its
    // gutter sign drawn large as a shape, + or -, and its code runs, so the form under the type keeps the signs too
    // (variety ex.6: full-width bars on the rings read as racing bars)
    loop(x) {
      const rnd = rng(4);
      for (let r = 0; r < 8; r++) for (let k = 0; k < 4; k++) {
        const X = k * 128, Y = r * 64, add = rnd() < 0.5;
        rr(x, X + 4, Y + 10, 120, 44, 6); x.fillStyle = grey(add ? 0.88 : 0.3); x.fill();
        x.fillStyle = grey(add ? 0.22 : 1);
        x.fillRect(X + 12, Y + 29, 22, 6);
        if (add) x.fillRect(X + 20, Y + 21, 6, 22);
        let cx = X + 44; const n = 2 + (rnd() < 0.5 ? 1 : 0);
        for (let i = 0; i < n && cx < X + 108; i++) { const w = Math.min(X + 116 - cx, 14 + rnd() * 34); x.fillStyle = grey(add ? 0.45 : 0.8); x.fillRect(cx, Y + 28, w, 8); cx += w + 7; }
      }
      return 8;
    },
    // its compute nodes, pinned: each a chip with its pins down every side and Agent Machines' pixel ring on its die, one
    // pixel lit as the worker running, one to a gate's length (variety ex.6: the bare ring marks read as Kevin Wiki's nodes)
    'agent-machines'(x) {
      const rnd = rng(6);
      for (let r = 0; r < 8; r++) for (let k = 0; k < 4; k++) {
        const cx = k * 128 + 64 + (rnd() - 0.5) * 20, cy = r * 64 + 32, S = 20, lit = Math.floor(rnd() * 12);
        x.fillStyle = grey(0.72);
        for (let i = 0; i < 4; i++) { const o = -15 + i * 10; x.fillRect(cx + o - 2.5, cy - S - 7, 5, 7); x.fillRect(cx + o - 2.5, cy + S, 5, 7); x.fillRect(cx - S - 7, cy + o - 2.5, 7, 5); x.fillRect(cx + S, cy + o - 2.5, 7, 5); }
        rr(x, cx - S, cy - S, 2 * S, 2 * S, 4); x.fillStyle = grey(0.2); x.fill(); x.lineWidth = 2.5; x.strokeStyle = grey(0.88); x.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2, px = Math.round((cx + Math.cos(a) * 10.5) / 3) * 3, py = Math.round((cy + Math.sin(a) * 10.5) / 3) * 3;
          x.fillStyle = grey(i === lit ? 1 : 0.5); x.fillRect(px - 2.5, py - 2.5, 5, 5);
        }
        x.fillStyle = grey(1); x.beginPath(); x.arc(cx - S + 6, cy - S + 6, 2.5, 0, 7); x.fill();
      }
      return 8;
    },
    // the Horizon Field's rings as it draws them, in square dots: two bands of dots to a ring, swelling and thinning along
    // it, and one ring in four a lit horizon line
    prototemplate(x) {
      for (let r = 0; r < 8; r++) {
        const Y = r * 64;
        if (r % 4 === 1) { x.fillStyle = grey(1); x.fillRect(0, Y + 30, T, 4); }
        for (const [j, dy] of [[0, 16], [1, 46]]) for (let k = 0; k < 32; k++) {
          const s = 3 + 10 * (0.5 + 0.5 * Math.sin((k / 32) * Math.PI * 4 + r * 1.3 + j * 1.7)) ** 2;
          x.fillStyle = grey(j ? 0.6 : 0.9); x.fillRect(k * 16 + 8 - s / 2, Y + dy - s / 2, s, s);
        }
      }
      return 8;
    },
    // confetti and the party's die-cut stickers with their paper rims
    'bday-land'(x) {
      const rnd = rng(12);
      for (let r = 0; r < 6; r++) for (let k = 0; k < 7; k++) {
        if (rnd() < 0.25) continue;
        const cx = k * 73 + (r % 2) * 36 + rnd() * 10, cy = r * 85.3 + 42, s = 16 + rnd() * 12, kind = (k + r * 3) % 3, rot = rnd() * 1.2 - 0.6;
        wrap(cx, cy, (X, Y) => {
          x.save(); x.translate(X, Y); x.rotate(rot);
          const shape = () => { x.beginPath(); if (kind === 0) x.ellipse(0, 0, s * 0.8, s, 0, 0, 7); else if (kind === 1) x.roundRect(-s, -s * 0.7, 2 * s, 1.4 * s, s * 0.35); else { x.moveTo(0, s * 0.9); x.bezierCurveTo(-s * 1.5, -s * 0.2, -s * 0.6, -s * 1.2, 0, -s * 0.45); x.bezierCurveTo(s * 0.6, -s * 1.2, s * 1.5, -s * 0.2, 0, s * 0.9); } };
          shape(); x.lineWidth = 8; x.strokeStyle = grey(1); x.stroke();
          shape(); x.fillStyle = grey(0.35 + 0.15 * kind); x.fill();
          x.restore();
        });
      }
      for (let k = 0; k < 90; k++) { const X = rnd() * T, Y = rnd() * T, a = rnd() * 3; wrap(X, Y, (X, Y) => { x.save(); x.translate(X, Y); x.rotate(a); x.fillStyle = grey(0.6 + rnd() * 0.4); x.fillRect(-5, -2, 10, 4); x.restore(); }); }
      return 6;
    },
    // the bar loaded: a barbell side on, the bar's knurl, its sleeves, three plates each side, biggest inside, and its
    // collars; between them pairs of hex dumbbells. One to a cell, so a gate never cuts one
    powerlifting(x) {
      const rows = 6, ch = T / rows, cw = 2 * ch;
      for (let r = 0; r < rows; r++) for (let k = 0; k < 3; k++) {
        const X = k * cw, Y = r * ch, cy = Y + ch / 2;
        if ((r + k) % 3 === 2) {
          for (const dx of [28, 98]) {
            x.fillStyle = grey(0.7); x.fillRect(X + dx, cy - 3, 46, 6);
            for (const hx of [X + dx - 4, X + dx + 46 - 14]) { x.fillStyle = grey(0.9); x.beginPath(); x.moveTo(hx + 9, cy - 20); x.lineTo(hx + 18, cy - 10); x.lineTo(hx + 18, cy + 10); x.lineTo(hx + 9, cy + 20); x.lineTo(hx, cy + 10); x.lineTo(hx, cy - 10); x.closePath(); x.fill(); }
          }
          continue;
        }
        x.fillStyle = grey(0.62); x.fillRect(X + 6, cy - 4, cw - 12, 8);
        x.fillStyle = grey(0.3); for (let t = X + 58; t < X + cw - 58; t += 5) x.fillRect(t, cy - 4, 2, 8);
        x.fillStyle = grey(0.8); x.fillRect(X + 6, cy - 5, 40, 10); x.fillRect(X + cw - 46, cy - 5, 40, 10);
        const plates = [[34, 12, 76, 0.95], [22, 11, 60, 0.55], [12, 9, 44, 0.78]];
        for (const [px, pw, ph, v] of plates) for (const sx of [X + px, X + cw - px - pw]) { rr(x, sx, cy - ph / 2, pw, ph, 3); x.fillStyle = grey(v); x.fill(); }
        x.fillStyle = grey(1); x.fillRect(X + 47, cy - 9, 5, 18); x.fillRect(X + cw - 52, cy - 9, 5, 18);
      }
      return 6;
    },
    // paired squares: the chosen plate solid and a step forward, the passed one hollow, and the rating's ticks
    elo(x) {
      for (let r = 0; r < 8; r++) for (let k = 0; k < 4; k++) {
        const X = k * 128 + (r % 2) * 64 + 14, Y = r * 64 + 12, pick = (k + r) % 2;
        wrap(X, Y, (X, Y) => {
          x.fillStyle = grey(1); x.beginPath(); x.roundRect(X + (pick ? 0 : 52), Y + (pick ? 0 : 2), 40, 40, 11); x.fill();
          x.strokeStyle = grey(0.6); x.lineWidth = 5; x.beginPath(); x.roundRect(X + (pick ? 52 : 0) + 3, Y + 5, 34, 34, 9); x.stroke();
        });
        x.fillStyle = grey(0.4); for (let t = 0; t < 8; t++) x.fillRect(X + t * 13, Y + 50, 2, 6);
      }
      return 8;
    },
    // the fly itself, from above: its two wings swept back, the striped abdomen, thorax, head and its two big eyes, six
    // legs; one to a cell, heading along the row
    cotfly(x) {
      const rows = 8, ch = T / rows, cw = 2 * ch;
      for (let r = 0; r < rows; r++) for (let k = 0; k < T / cw; k++) {
        const cx = k * cw + 66, cy = r * ch + 32;
        x.strokeStyle = grey(0.3); x.lineWidth = 2.2;
        for (const s of [-1, 1]) for (const [a, l] of [[-0.9, 17], [0, 18], [0.9, 17]]) { x.beginPath(); x.moveTo(cx + 2, cy + s * 4); x.lineTo(cx + 2 + Math.sin(a) * l, cy + s * (4 + Math.cos(a) * l * 0.8)); x.stroke(); }
        for (const s of [-1, 1]) { x.save(); x.translate(cx - 16, cy + s * 13); x.rotate(-s * 0.38); x.beginPath(); x.ellipse(0, 0, 25, 8, 0, 0, 7); x.fillStyle = grey(0.95, 0.6); x.fill(); x.strokeStyle = grey(1); x.lineWidth = 2; x.stroke(); x.restore(); }
        x.fillStyle = grey(0.58); x.beginPath(); x.ellipse(cx - 18, cy, 17, 10, 0, 0, 7); x.fill();
        x.fillStyle = grey(0.22); for (const sx of [-27, -20, -13]) x.fillRect(cx + sx, cy - 8, 3.5, 16);
        x.fillStyle = grey(0.34); x.beginPath(); x.ellipse(cx + 2, cy, 10, 9, 0, 0, 7); x.fill();
        x.fillStyle = grey(0.42); x.beginPath(); x.arc(cx + 16, cy, 7, 0, 7); x.fill();
        x.fillStyle = grey(1); for (const s of [-1, 1]) { x.beginPath(); x.arc(cx + 18, cy + s * 6, 5.5, 0, 7); x.fill(); }
      }
      return 8;
    },
    // the team chat it fakes: a message to a cell, its avatar, the sender's name, two lines and a reaction, and the
    // grader's mark, passed or failed, on one in three
    relay(x) {
      const rnd = rng(19), rows = 8, ch = T / rows, cw = 2 * ch;
      for (let r = 0; r < rows; r++) for (let k = 0; k < T / cw; k++) {
        const X = k * cw, Y = r * ch;
        rr(x, X + 4, Y + 8, 28, 28, 7); x.fillStyle = grey([1, 0.3, 0.7][(r + k) % 3]); x.fill();
        x.fillStyle = grey(1); x.fillRect(X + 38, Y + 9, 30 + rnd() * 22, 8);
        x.fillStyle = grey(0.3); x.fillRect(X + 38, Y + 23, 72 + rnd() * 10, 6); x.fillRect(X + 38, Y + 33, 40 + rnd() * 30, 6);
        rr(x, X + 38, Y + 44, 28, 14, 7); x.strokeStyle = grey(0.9); x.lineWidth = 3; x.stroke(); x.fillStyle = grey(0.9); x.beginPath(); x.arc(X + 47, Y + 51, 3.5, 0, 7); x.fill();
        if ((r * 4 + k) % 3 === 0) {
          const ok = (r + k) % 2 === 0;
          x.fillStyle = grey(ok ? 1 : 0.3); x.beginPath(); x.arc(X + 112, Y + 18, 8, 0, 7); x.fill();
          x.strokeStyle = grey(ok ? 0.2 : 1); x.lineWidth = 2.5; x.beginPath();
          if (ok) { x.moveTo(X + 108, Y + 18); x.lineTo(X + 111, Y + 21); x.lineTo(X + 117, Y + 14); } else { x.moveTo(X + 108.5, Y + 14.5); x.lineTo(X + 115.5, Y + 21.5); x.moveTo(X + 115.5, Y + 14.5); x.lineTo(X + 108.5, Y + 21.5); }
          x.stroke();
        }
      }
      return 8;
    },
    // the map's road tiles, the towers' footprints and a chain of lightning between them
    'princeton-td'(x) {
      const rnd = rng(13), cs = T / 8;
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        x.fillStyle = grey(((r + c) % 2 ? 0.3 : 0.4) + rnd() * 0.08); x.fillRect(c * cs, r * cs, cs, cs);
        if (rnd() < 0.3) { x.fillStyle = grey(0.85); x.fillRect(c * cs + 14, r * cs + 14, cs - 28, cs - 28); x.fillStyle = grey(0.2); x.fillRect(c * cs + 26, r * cs + 26, cs - 52, cs - 52); }
      }
      x.strokeStyle = grey(1); x.lineWidth = 3;
      for (let k = 0; k < 6; k++) { let X = rnd() * T, Y = rnd() * T; x.beginPath(); x.moveTo(X, Y); for (let s = 0; s < 8; s++) { X += 14 + rnd() * 14; Y += (rnd() - 0.5) * 40; x.lineTo(X, Y); } x.stroke(); }
      return 8;
    },
    // its graph view: link nodes on threads, one cluster to a gate's length (128 units): a hub node lit in its dark ring,
    // two or three linked notes round it in their own tones, the threads between (variety ex.6: the bare pages read as
    // Sevenfold's papers)
    'kevin-wiki'(x) {
      const rnd = rng(18);
      for (let r = 0; r < 8; r++) for (let k = 0; k < 4; k++) {
        const X = k * 128, Y = r * 64;
        const hub = [X + 42 + rnd() * 14, Y + 32 + (rnd() - 0.5) * 8];
        const leaves = [[X + 100 + rnd() * 12, Y + 15 + rnd() * 8], [X + 98 + rnd() * 12, Y + 43 + rnd() * 6], [X + 15 + rnd() * 6, Y + 44 + rnd() * 5]].slice(0, 2 + ((r + k) % 2));
        x.strokeStyle = grey(0.8); x.lineWidth = 3.5; x.lineCap = 'round';
        for (const l of leaves) { x.beginPath(); x.moveTo(hub[0], hub[1]); x.lineTo(l[0], l[1]); x.stroke(); }
        if ((r + k) % 3 === 0) { x.beginPath(); x.moveTo(leaves[0][0], leaves[0][1]); x.lineTo(leaves[1][0], leaves[1][1]); x.stroke(); }
        x.beginPath(); x.arc(hub[0], hub[1], 15, 0, 7); x.fillStyle = grey(0.18); x.fill();
        x.beginPath(); x.arc(hub[0], hub[1], 9.5, 0, 7); x.fillStyle = grey(1); x.fill();
        leaves.forEach((l, i) => { x.beginPath(); x.arc(l[0], l[1], 8, 0, 7); x.fillStyle = grey([0.92, 0.55, 0.75][i]); x.fill(); x.lineWidth = 3; x.strokeStyle = grey(0.18); x.stroke(); });
      }
      return 8;
    },
    // the race: open-wheel cars from above, one to a cell, nose along the row, their blank provider plates on the sidepods,
    // lane dashes between the rows, and one row in four the chequered line
    'sandbox-arena'(x) {
      const rows = 8, ch = T / rows, cw = 2 * ch;
      for (let r = 0; r < rows; r++) {
        const Y = r * ch;
        if (r % 4 === 3) { for (let j = 0; j < 4; j++) for (let i = 0; i < 32; i++) if ((i + j) % 2 === 0) { x.fillStyle = grey(1); x.fillRect(i * 16, Y + j * 16, 16, 16); } continue; }
        x.fillStyle = grey(0.55); for (let i = 0; i < 16; i++) x.fillRect(i * 32 + 4, Y + 1, 18, 2.5);
        for (let k = 0; k < T / cw; k++) {
          const X = k * cw;
          x.fillStyle = grey(0.12);
          for (const [wx, wy, ww, wh] of [[18, 7, 20, 13], [18, 44, 20, 13], [80, 9, 17, 11], [80, 44, 17, 11]]) { rr(x, X + wx, Y + wy, ww, wh, 3); x.fill(); }
          x.fillStyle = grey(0.9); x.fillRect(X + 8, Y + 14, 9, 36); x.fillRect(X + 104, Y + 12, 8, 40);
          x.fillStyle = grey(0.85); x.beginPath(); x.moveTo(X + 18, Y + 26); x.lineTo(X + 62, Y + 22); x.lineTo(X + 108, Y + 29); x.lineTo(X + 113, Y + 32); x.lineTo(X + 108, Y + 35); x.lineTo(X + 62, Y + 42); x.lineTo(X + 18, Y + 38); x.closePath(); x.fill();
          rr(x, X + 34, Y + 18, 32, 28, 7); x.fillStyle = grey(0.68); x.fill();
          rr(x, X + 41, Y + 25, 15, 14, 3); x.fillStyle = grey(1); x.fill();
          x.fillStyle = grey(0.2); x.beginPath(); x.ellipse(X + 70, Y + 32, 9, 5, 0, 0, 7); x.fill();
          x.fillStyle = grey(1); x.beginPath(); x.arc(X + 70, Y + 32, 3.5, 0, 7); x.fill();
        }
      }
      return 8;
    },
    // the labyrinth's rings with their gaps, and the thread running through them
    ariadne(x) {
      for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
        const X = k * 128 + 64 + (r % 2) * 64, Y = r * 128 + 64;
        wrap(X, Y, (X, Y) => {
          for (let i = 1; i <= 4; i++) { const g = (i * 1.7 + k + r) % 6.28; x.strokeStyle = grey(0.5); x.lineWidth = 7; x.beginPath(); x.arc(X, Y, i * 13, g + 0.5, g + 0.5 + 5.4); x.stroke(); }
          x.strokeStyle = grey(1); x.lineWidth = 4.5; x.beginPath(); x.moveTo(X, Y); x.bezierCurveTo(X + 20, Y - 30, X + 50, Y + 20, X + 64, Y - 60); x.stroke();
        });
      }
      return 4;
    },
    // Sigil UI's own components as silhouettes, outline and fill (Kevin 11-03, "add a bunch more components and component
    // types everywhere"; k4's DOSSIER spec): buttons, an input with its caret, switches on and off, a checkbox, a radio, a
    // slider's track and thumb, tabs with the active underline, a card, a dialog with its two buttons, a dropdown with one
    // row lit, a tooltip, a chart's bars, a badge and the SigilCursor. Each drawn to fill its row (ex.5: at the old size
    // they printed 6 px tall on the wall and read as any app's), rows of parts, each row exactly one tile wide
    'sigil-ui'(x) {
      const rnd = rng(41);
      const parts = [
        [64, 28, (X, Y) => { rr(x, X, Y - 14, 58, 28, 8); x.fillStyle = grey(0.85); x.fill(); x.fillStyle = grey(0.3); x.fillRect(X + 13, Y - 3, 32, 6); }],
        [100, 28, (X, Y) => { rr(x, X, Y - 14, 92, 28, 6); x.fillStyle = grey(0.22, 0.9); x.fill(); x.strokeStyle = grey(0.9); x.lineWidth = 2; x.stroke(); x.fillStyle = grey(0.6); x.fillRect(X + 10, Y - 3, 34, 6); x.fillStyle = grey(1); x.fillRect(X + 50, Y - 9, 2.5, 18); }],
        [52, 22, (X, Y) => { rr(x, X, Y - 11, 44, 22, 11); x.fillStyle = grey(0.7); x.fill(); x.fillStyle = grey(1); x.beginPath(); x.arc(X + 33, Y, 8, 0, 7); x.fill(); }],
        [52, 22, (X, Y) => { rr(x, X, Y - 11, 44, 22, 11); x.strokeStyle = grey(0.75); x.lineWidth = 2; x.stroke(); x.fillStyle = grey(0.75); x.beginPath(); x.arc(X + 11, Y, 7, 0, 7); x.fill(); }],
        [32, 22, (X, Y) => { rr(x, X, Y - 11, 22, 22, 5); x.fillStyle = grey(0.92); x.fill(); x.strokeStyle = grey(0.18); x.lineWidth = 3.5; x.beginPath(); x.moveTo(X + 5, Y); x.lineTo(X + 10, Y + 5); x.lineTo(X + 17, Y - 6); x.stroke(); }],
        [32, 22, (X, Y) => { x.strokeStyle = grey(0.9); x.lineWidth = 2.5; x.beginPath(); x.arc(X + 11, Y, 10, 0, 7); x.stroke(); x.fillStyle = grey(0.9); x.beginPath(); x.arc(X + 11, Y, 5, 0, 7); x.fill(); }],
        [112, 20, (X, Y) => { rr(x, X, Y - 3, 100, 6, 3); x.fillStyle = grey(0.4); x.fill(); rr(x, X, Y - 3, 62, 6, 3); x.fillStyle = grey(0.85); x.fill(); x.fillStyle = grey(1); x.beginPath(); x.arc(X + 62, Y, 9, 0, 7); x.fill(); x.strokeStyle = grey(0.3); x.lineWidth = 2; x.stroke(); }],
        [128, 20, (X, Y) => { for (let t = 0; t < 3; t++) { x.fillStyle = grey(t === 1 ? 0.9 : 0.5); x.fillRect(X + t * 40 + 6, Y - 6, 26, 6); } x.fillStyle = grey(0.35); x.fillRect(X, Y + 8, 120, 2); x.fillStyle = grey(1); x.fillRect(X + 40, Y + 6, 40, 4); }],
        [96, 52, (X, Y) => { rr(x, X, Y - 26, 86, 52, 8); x.fillStyle = grey(0.16, 0.95); x.fill(); x.strokeStyle = grey(0.75); x.lineWidth = 2; x.stroke(); x.fillStyle = grey(0.88); x.fillRect(X + 10, Y - 16, 40, 6); x.fillStyle = grey(0.5); for (let l = 0; l < 3; l++) x.fillRect(X + 10, Y - 3 + l * 9, 64 - l * 14, 4); }],
        [120, 54, (X, Y) => { rr(x, X, Y - 27, 110, 54, 10); x.fillStyle = grey(0.9); x.fill(); x.fillStyle = grey(0.3); x.fillRect(X + 12, Y - 17, 52, 6); x.fillStyle = grey(0.55); x.fillRect(X + 12, Y - 6, 80, 4); rr(x, X + 42, Y + 7, 30, 14, 4); x.fillStyle = grey(0.6); x.fill(); rr(x, X + 76, Y + 7, 24, 14, 4); x.fillStyle = grey(0.15); x.fill(); }],
        [80, 54, (X, Y) => { rr(x, X, Y - 27, 68, 54, 6); x.fillStyle = grey(0.28, 0.95); x.fill(); x.strokeStyle = grey(0.8); x.lineWidth = 1.5; x.stroke(); for (let l = 0; l < 4; l++) { if (l === 1) { x.fillStyle = grey(0.88); x.fillRect(X + 3, Y - 24 + l * 12, 62, 11); } x.fillStyle = grey(l === 1 ? 0.2 : 0.72); x.fillRect(X + 9, Y - 20 + l * 12, 26 + (l % 2) * 14, 4); } }],
        [72, 32, (X, Y) => { rr(x, X, Y - 18, 62, 24, 6); x.fillStyle = grey(0.95); x.fill(); x.beginPath(); x.moveTo(X + 24, Y + 6); x.lineTo(X + 31, Y + 14); x.lineTo(X + 38, Y + 6); x.fill(); x.fillStyle = grey(0.35); x.fillRect(X + 10, Y - 9, 42, 5); }],
        [72, 50, (X, Y) => { [18, 30, 22, 40, 34, 46].forEach((h, i) => { x.fillStyle = grey(i === 5 ? 1 : 0.5 + 0.07 * i); x.fillRect(X + i * 10, Y + 24 - h, 7, h); }); x.fillStyle = grey(0.4); x.fillRect(X - 2, Y + 24, 62, 2); }],
        [56, 20, (X, Y) => { rr(x, X, Y - 10, 46, 20, 10); x.fillStyle = grey(0.65); x.fill(); x.fillStyle = grey(1); x.beginPath(); x.arc(X + 11, Y, 3.5, 0, 7); x.fill(); x.fillRect(X + 19, Y - 2.5, 18, 5); }],
        [30, 30, (X, Y) => { x.fillStyle = grey(1); x.beginPath(); x.moveTo(X, Y - 14); x.lineTo(X, Y + 12); x.lineTo(X + 7, Y + 6); x.lineTo(X + 12, Y + 16); x.lineTo(X + 16, Y + 14); x.lineTo(X + 11, Y + 4); x.lineTo(X + 20, Y + 3); x.closePath(); x.fill(); x.strokeStyle = grey(0.2); x.lineWidth = 1.5; x.stroke(); }],
      ];
      for (let r = 0; r < 8; r++) {
        const Y = r * 64 + 32;
        const row = [];
        let w = 0;
        for (let guard = 0; guard < 40; guard++) {
          const p = parts[Math.floor(rnd() * parts.length)], k = Math.min(1.9, 54 / p[1]);
          if (w + p[0] * k > T) break;
          row.push([p[0] * k, k, p[2]]); w += p[0] * k;
        }
        const gap = (T - w) / row.length;
        let X = -Math.floor(rnd() * 96);
        for (const [pw, k, f] of row) { wrap(X + gap / 2, Y, (X0, Y0) => { x.save(); x.translate(X0, Y0); x.scale(k, k); f(0, 0); x.restore(); }); X += pw + gap; }
      }
      return 8;
    },
    // 050525's own date on the CRT in its 5 x 7 dot-matrix digits, phosphor dots over the scanlines, the prompt's masked
    // password and the block cursor on the rows between; under the type the phosphor and cursors with no digit
    'dedalus-terminal'(x, calm) {
      const G = { 0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], 5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'], 2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'], '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'], '>': ['#....', '.#...', '..#..', '...#.', '..#..', '.#...', '#....'] };
      const rnd = rng(31), p = 6, d = 4.6;
      for (let y = 0; y < T; y += 4) { x.fillStyle = grey(0.16); x.fillRect(0, y, T, 2); }
      const dot = (X, Y, v) => { x.fillStyle = grey(v); x.fillRect(X - d / 2, Y - d / 2, d, d); };
      for (let r = 0; r < 8; r++) {
        const Y = r * 64 + 11, word = r % 2 ? '>******' : '050525', adv = 6 * p, span = word.length * adv + 40;
        let X0 = r % 2 ? 20 : ((r * 64) % 2) + 22;
        for (let rep = 0; X0 + rep * span < T; rep++) {
          const X = X0 + rep * span;
          [...word].forEach((ch, i) => {
            const B = G[ch];
            for (let j = 0; j < 7; j++) for (let c = 0; c < 5; c++) {
              const on = B[j][c] === '#';
              if (calm) { const n = Math.sin((i * 5 + c) * 0.7 + r * 1.9) + Math.sin(j * 0.9 + i * 2.3 + r); if (n > 0.35 || rnd() < 0.06) dot(X + i * adv + c * p, Y + j * p, n > 1 ? 1 : 0.55); }
              else if (on) dot(X + i * adv + c * p, Y + j * p, 1);
              else if (rnd() < 0.08) dot(X + i * adv + c * p, Y + j * p, 0.3);
            }
          });
          if (r % 2) { x.fillStyle = grey(calm ? 0.85 : 1); x.fillRect(X + word.length * adv + 4, Y - 3, 5 * p - 2, 7 * p); }
        }
      }
      return 8;
    },
    // the papers it reads: a page with its title, abstract, two columns and one line highlighted, and its four-dot mark,
    // one dot cut with the asterisk; a page and a mark to a cell
    sevenfold(x) {
      const rows = 6, ch = T / rows, cw = 2 * ch;
      for (let r = 0; r < rows; r++) for (let k = 0; k < 3; k++) {
        const X = k * cw, Y = r * ch, hi = (r + k) % 3;
        wrap(X, Y, (X, Y) => {
          rr(x, X + 10, Y + 6, 60, 74, 2); x.fillStyle = grey(0.95); x.fill();
          x.fillStyle = grey(0.18); x.fillRect(X + 16, Y + 12, 44, 5);
          x.fillStyle = grey(0.62); x.fillRect(X + 16, Y + 21, 48, 9);
          x.fillStyle = grey(0.38); for (let l = 0; l < 6; l++) for (const cx of [X + 16, X + 42]) x.fillRect(cx, Y + 36 + l * 6.5, 20 - ((l + (cx > X + 20 ? 1 : 0)) % 3) * 4, 2.5);
          x.fillStyle = grey(1); x.fillRect(X + (hi ? 40 : 14), Y + 34 + hi * 13, 26, 6);
          const mx = X + 104, my = Y + 30, tones = [0.9, 0.6, 0.78, 0.45];
          [[0, 0], [26, 0], [0, 26], [26, 26]].forEach(([dx, dy], i) => { x.fillStyle = grey(tones[i]); x.beginPath(); x.arc(mx + dx, my + dy, 11, 0, 7); x.fill(); });
          x.globalCompositeOperation = 'destination-out'; x.lineWidth = 3; x.lineCap = 'round';
          for (let a = 0; a < 3; a++) { const c = Math.cos(a * Math.PI / 3) * 7, s = Math.sin(a * Math.PI / 3) * 7; x.beginPath(); x.moveTo(mx + 26 - c, my - s); x.lineTo(mx + 26 + c, my + s); x.stroke(); }
          x.globalCompositeOperation = 'source-over'; x.lineCap = 'butt';
        });
      }
      return 6;
    },
    // the podium itself: the three steps, second, first and third, each with its place as pips cut from its face, and the
    // trophy on the top step, one to a cell
    podium(x) {
      const rows = 6, ch = T / rows, cw = 2 * ch;
      for (let r = 0; r < rows; r++) for (let k = 0; k < 3; k++) {
        const X = k * cw + 10, Y = r * ch, base = Y + 80;
        for (const [dx, h, n] of [[0, 28, 2], [48, 42, 1], [96, 20, 3]]) {
          x.fillStyle = grey(0.62); x.fillRect(X + dx, base - h, 46, h); x.fillStyle = grey(0.95); x.fillRect(X + dx, base - h, 46, 5);
          x.globalCompositeOperation = 'destination-out';
          for (let i = 0; i < n; i++) { x.beginPath(); x.arc(X + dx + 23 + (i - (n - 1) / 2) * 10, base - h + 10, 3.5, 0, 7); x.fill(); }
          x.globalCompositeOperation = 'source-over';
        }
        const tx = X + 71, ty = Y + 4;
        x.fillStyle = grey(1);
        x.beginPath(); x.moveTo(tx - 14, ty); x.lineTo(tx + 14, ty); x.bezierCurveTo(tx + 14, ty + 16, tx + 8, ty + 22, tx, ty + 22); x.bezierCurveTo(tx - 8, ty + 22, tx - 14, ty + 16, tx - 14, ty); x.fill();
        x.strokeStyle = grey(1); x.lineWidth = 3; for (const s of [-1, 1]) { x.beginPath(); x.arc(tx + s * 14, ty + 7, 6, s > 0 ? -1.4 : 1.7, s > 0 ? 1.4 : 4.6); x.stroke(); }
        x.fillRect(tx - 2.5, ty + 21, 5, 6); x.fillRect(tx - 9, ty + 27, 18, 5);
      }
      return 6;
    },
    // cube faces carrying problems: isometric faces and the arithmetic of a round, set in Katagami Sans; under the type the
    // cubes alone
    ommc(x, calm) {
      const glyphs = ['x^2', '(a+b)', 'n!', '7/9', '2^n', 'x=3', '<', '%'];
      for (let r = 0; r < 6; r++) for (let k = 0; k < 6; k++) {
        const X = k * 85.33 + 12, Y = r * 85.3 + 10;
        wrap(X, Y, (X, Y) => {
          const s = 30;
          for (const [pts, v] of [[[[0, s * 0.5], [s, 0], [2 * s, s * 0.5], [s, s]], 0.95], [[[0, s * 0.5], [s, s], [s, 2 * s], [0, 1.5 * s]], 0.55], [[[s, s], [2 * s, s * 0.5], [2 * s, 1.5 * s], [s, 2 * s]], 0.3]]) { x.fillStyle = grey(v); x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(X + a, Y + b) : x.moveTo(X + a, Y + b))); x.fill(); }
        });
        if (!calm) { x.font = font(800, 18); x.fillStyle = grey(1); x.fillText(glyphs[(r * 6 + k) % glyphs.length], X + 62, Y + 72); }
      }
      return 6;
    },
    // the magazine: its issues' covers, each with its masthead, the dial's wire globe of meridians and parallels and the
    // issue's tab; two to a cell
    atlas(x) {
      const rows = 4, ch = T / rows, cw = 2 * ch;
      for (let r = 0; r < rows; r++) for (let k = 0; k < 4; k++) {
        const X = k * 128, Y = r * ch, dark = (r + k) % 2;
        wrap(X, Y, (X, Y) => {
          rr(x, X + 22, Y + 8, 84, 112, 3); x.fillStyle = grey(dark ? 0.35 : 0.92); x.fill();
          x.fillStyle = grey(dark ? 0.95 : 0.2); x.fillRect(X + 22, Y + 8, 84, 20);
          x.fillStyle = grey(dark ? 0.3 : 1); x.fillRect(X + 30, Y + 14, 46, 7);
          const gx = X + 64, gy = Y + 70, R = 28;
          x.strokeStyle = grey(dark ? 1 : 0.22); x.lineWidth = 3; x.beginPath(); x.arc(gx, gy, R, 0, 7); x.stroke();
          x.lineWidth = 2; for (const m of [1, 2]) { x.beginPath(); x.ellipse(gx, gy, (R * m) / 3, R, 0, 0, 7); x.stroke(); }
          for (const py of [-R / 2, 0, R / 2]) { const hw = Math.sqrt(R * R - py * py); x.beginPath(); x.moveTo(gx - hw, gy + py); x.lineTo(gx + hw, gy + py); x.stroke(); }
          x.fillStyle = grey(dark ? 0.8 : 0.4); x.fillRect(X + 28, Y + 106, 18, 8);
        });
      }
      return 4;
    },
  };

  // the tiles that set letters, each with its calm form for under the type (craft, ex.5)
  const CALM = ['glyphfield', 'jarhead', 'katagami', 'mailroom', 'local-search', 'dedalus-terminal', 'ommc'];

  // The Type vocabulary's glyph shards: sixteen Katagami Sans glyphs at the extremes of its weight, 128 units a cell.
  const GLYPHS = 'aKg&RQe?xSk@G%fy';
  function glyphs(x) {
    x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillStyle = '#fff';
    [...GLYPHS].forEach((g, i) => { x.font = font(i % 2 ? 900 : 300, 104); x.fillText(g, (i % 4) * 128 + 64, Math.floor(i / 4) * 128 + 100); });
    return 4;
  }
  // draw(id, canvas, calm): the tile at the canvas's size, or with calm its calm form (the tiles in CALM: the same rows with
  // no letters, which the energy reads under the type); returns its rows (0 when the card has no tile)
  function draw(id, c, calm = false) {
    const fn = id === '_glyphs' ? glyphs : MATTER[id];
    if (!fn) return 0;
    const x = c.getContext('2d');
    x.save();
    x.clearRect(0, 0, c.width, c.height);
    x.scale(c.width / T, c.height / T);
    x.textBaseline = 'alphabetic';
    const rows = fn(x, !!calm && CALM.includes(id));
    x.restore();
    return rows;
  }
  // the weights the tiles set, so a page can load them before it draws
  const WEIGHTS = [300, 400, 600, 700, 800, 900];
  function fonts() {
    if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
    return Promise.all(WEIGHTS.map((w) => document.fonts.load(`${w} 26px "Katagami Sans"`).catch(() => null))).then(() => null);
  }
  root.GROUND_MATTER = { T, ids: Object.keys(MATTER), calm: CALM, draw, fonts };
})(typeof globalThis !== 'undefined' ? globalThis : this);
