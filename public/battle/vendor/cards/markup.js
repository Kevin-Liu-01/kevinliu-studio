// One card, one source: the markup of the card, its back, the inspection sheet, the dock, the deck and
// the pack. build.mjs prints it into the static pages (the first paint) and gallery.js fills the lens with
// the same functions. Works as a classic script (globalThis.MARKUP) and as a CommonJS module.
//   card(f, opts, env)   env = { recipes, bands, media, art, size? } (the build passes bands.json; the page
//                        never prints a card, it clones the printed one)
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
  const BACK = `<div class="back" aria-hidden="true"><i class="tint"></i>${icon('kl', 'kl')}</div>`;

  const PREVIOUS = 'https://portfoliomon.kevinliu.studio';
  const NOLINK = new Set(["agent-pets","bday-land","powerlifting","elo","kevin-wiki","sandbox-arena","dedalus-terminal"]); // private or unpushed: receipts print as text
  const STAT = [['hp', 'HP'], ['atk', 'Reach'], ['def', 'Proof'], ['spd', 'Pace']];
  const FACT = { hp: 'build', atk: 'reach', def: 'proof', spd: 'pace' };

  // ---------- the card ----------
  // A frame's file and size from media.gen.js; env.size(path) reads a file's own size where an entry lacks one.
  function mediaOf(id, role, env) {
    const m = (env.media || {})[id] || {};
    const v = m[role];
    const base = `media/${id}/${role}`;
    const src = (v && v.src) || `${base}.webp`;
    const hi = (v && v.hi) || `${base}@2x.webp`;
    let w = v && v.w, h = v && v.h;
    if (!w || !h) { try { [w, h] = env.size(hi); } catch (e) { [w, h] = [1920, 1080]; } }
    return { src, hi, w, h };
  }
  function look(f, env) {
    const r = env.recipes[f.id].card;
    const band = (env.bands || {})[f.id] || {};
    const lum = (h) => { const [R, G, B] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * R + 0.7152 * G + 0.0722 * B; };
    const rgb = [1, 3, 5].map((i) => parseInt(r.paper.slice(i, i + 2), 16)).join(' ');
    return { paper: r.paper, ink: r.text, tint: rgb, ta: band.alpha != null ? band.alpha : 0.72, dark: lum(r.paper) < 0.2 };
  }
  // The work, placed by art.js: an object standing in its world, or a window slice printed into it. Each
  // prints its rest file (cut for a 360 px card at 2x); the lens swaps in its large one (gallery.js hiOf).
  function art(f, hiNow, env) {
    const ART = env.art;
    const fr = ART.FRAME[f.id];
    if (fr.kind === 'window') {
      const m = mediaOf(f.id, 'window', env);
      const src = hiNow ? m.hi : m.src;
      const A = ART.PANEL_W / ART.PANEL_H, iw = m.w / m.h / A; // the image's width in panel widths
      const left = Math.max(1 - iw, Math.min(0, 0.5 - fr.x * iw));
      // a picture made of cells carries its grid and its x, so card.css draws each cell at whole device px
      const grid = fr.pixel && fr.cells ? `;--cols:${fr.cells[0]};--rows:${fr.cells[1]};--x:${fr.x}` : '';
      return `<span class="art win"><img src="${src}" alt="" width="${m.w}" height="${m.h}" decoding="async" draggable="false" style="--w:${pct(iw)};--l:${pct(left)}${grid}"${fr.pixel ? ' data-pixel' : ''}></span>`;
    }
    const m = mediaOf(f.id, 'object', env);
    const ar = m.h / m.w;
    const w = fr.w != null ? fr.w : (fr.h * ART.RATIO) / ar;
    const x = fr.x != null ? fr.x : 0.5;
    const top = fr.y - (w * ar) / ART.RATIO / 2;
    return `<img class="art obj" src="${hiNow ? m.hi : m.src}" alt="" width="${m.w}" height="${m.h}" decoding="async" draggable="false" style="--w:${pct(w)};--l:${pct(x - w / 2)};--t:${pct(top)}">`;
  }
  const squares = (n) => `<span class="cost" aria-hidden="true">${'<i></i>'.repeat(n)}</span>`;
  function card(f, { id = 'card-' + f.id, focusable = true, hi = false, extra = '', cls = '', style = '' } = {}, env) {
    const L = look(f, env);
    const stats = STAT.map(([k]) => `<span class="stat">${icon(k)}<b>${f.stats[k]}</b></span>`).join('');
    const desc = STAT.map(([k, name]) => `${name} ${f.stats[k]}`).join(', ');
    const a11y = focusable
      ? ` role="button" tabindex="0" aria-label="${esc(f.title)}, ${f.cost} ink${f.cost > 1 ? 's' : ''}" aria-describedby="d-${f.id}" aria-keyshortcuts="Enter A Space F"`
      : ' aria-hidden="true"';
    // data-print: the recipe prints this card's window into its ground (grounds/recipes.js window), so card.css
    // hides the image copy and samples the print at whole texels; the hidden .win stays for artBox and the clones
    const print = env.recipes[f.id].window ? ' data-print' : '';
    return `<div class="card${cls ? ' ' + cls : ''}${L.dark ? ' dark' : ''}" id="${id}" data-id="${f.id}" data-cost="${f.cost}"${print}${a11y} style="--paper:${L.paper};--ink:${L.ink};--tint:${L.tint};--ta:${L.ta}${style}">
<div class="body"><div class="face">
<img class="poster" src="posters/${f.id}.webp" alt="" width="504" height="704" draggable="false">
<canvas class="ground" width="504" height="704" aria-hidden="true"></canvas>
${art(f, hi, env)}
<span class="glarebox"><i class="glare"></i></span>
<div class="band"><div class="stats">${stats}</div><div class="row"><span class="name">${t(f.title)}</span>${squares(f.cost)}</div></div>
</div>${BACK}<i class="sleeve"></i></div>${focusable ? `<span class="sr" id="d-${f.id}">${desc}</span>` : ''}${extra}</div>`;
  }

  // ---------- the inspection sheet (ANATOMY 2.3): disciplines, facts, trait, moves, commit, credit ----------
  const STATNAME = { atk: 'Reach', def: 'Proof', spd: 'Pace' };
  function effectText(fx) {
    if (!fx) return '';
    const k = String(fx.type || '');
    if (k === 'heal') return `restores ${fx.amount} HP`;
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
    if (mv.executeThreshold) parts.push(`finishes a target under ${Math.round(mv.executeThreshold * 100)}% HP`);
    if (mv.adapts) parts.push('takes the discipline that hits hardest');
    if (mv.priority > 0) parts.push('goes first');
    if (mv.priority < 0) parts.push('goes last');
    const act = parts.length ? parts.join(' and ') : 'holds its ground';
    return `<b>${t(mv.name)}</b> ${t(act)}. ${t(mv.feature)}.`.replace(/\.\.$/, '.');
  }
  // media: media.gen.js's entries (env.media in the build, MEDIA.media in the page); a frame's credit prints last
  function sheet(f, media) {
    const disc = f.disciplines.map((d) => `<span>${icon(d.toLowerCase())}${t(d)}</span>`).join('');
    const facts = STAT.map(([k]) => {
      const fact = f.facts[FACT[k]];
      return `<li data-stat="${k}">${icon(k)}<div><p><b>${t(num(fact.value))}</b> ${t(unitOf(fact.value, fact.unit))}</p><code>${t(fact.receipt)}</code></div></li>`;
    }).join('');
    const moves = f.moves.map((mv) => `<li><p>${moveText(mv)}</p><code>${t(mv.receipt)}</code></li>`).join('');
    const sha = `${f.id}@${f.pinned.sha}, ${f.pinned.date}`;
    const pin = f.repo && !NOLINK.has(f.id) ? `<a href="${esc(f.repo.replace(/ .*$/, ''))}/commit/${esc(f.pinned.sha)}" target="_blank" rel="noopener">${t(sha)}</a>` : `<span>${t(sha)}</span>`;
    return `<p class="disc">${disc}</p>
<ul class="facts">${facts}</ul>
${f.trait ? `<div class="trait"><p><b>${t(f.trait.name)}</b> ${t(f.trait.rule)}</p><code>${t(f.trait.receipt)}</code></div>` : ''}
<ol class="moves">${moves}</ol>
<p class="pin">${pin}</p>${[f.credit, ((media || {})[f.id] || {}).credit].filter(Boolean).map((c) => `<p class="credit">${t(c)}</p>`).join('')}`;
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
  function fan(fighters, RATIO) {
    const W = 1, H = RATIO, ax = 0.5, ay = H * 1.06, L = 2 * H + W, n = fighters.length;
    const at = (s) => (s <= H ? [0, H - s] : s <= H + W ? [s - H, 0] : [W, s - H - W]);
    const corners = [H, H + W];
    const P = ([x, y]) => `${Math.round((x / W) * 10000) / 100}% ${Math.round((y / H) * 10000) / 100}%`;
    let out = '';
    for (let i = 0; i < n; i++) {
      const s0 = (L * i) / n, s1 = (L * (i + 1)) / n;
      const pts = [[ax, ay], at(s0), ...corners.filter((c) => c > s0 && c < s1).map(at), at(s1)];
      out += `<i style="background-image:url(posters/${fighters[i].id}.webp);clip-path:polygon(${pts.map(P).join(',')})"></i>`;
    }
    return `<span class="fan">${out}</span>`;
  }
  function pack(fighters, RATIO) {
    let strip = '';
    for (let i = 0; i < 12; i++) strip += `<i style="--i:${i}"></i>`;
    return `<button type="button" class="pack" id="pack" aria-label="Open Pack" aria-keyshortcuts="Enter Space">
<span class="pk"><span class="half l">${fan(fighters, RATIO)}</span><span class="half r">${fan(fighters, RATIO)}</span><span class="strip" aria-hidden="true">${strip}</span>
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
    // the page behind is inert while this is open (gallery.js), so the dialog needs no aria-modal and the
    // one status line outside it is still heard
    // the sheet: a head that never scrolls (the disciplines on Close's axis), the body that does, the tray
    return `<div class="inspect" id="inspect" role="dialog" aria-label="Card" tabindex="-1" hidden>
<i class="room" aria-hidden="true"></i>
<div class="ins-card"></div>
<aside class="sheet">
<div class="sheet-head"><p class="disc"></p><button type="button" class="press icon close" aria-label="Close" aria-keyshortcuts="Escape">${icon('close')}</button></div>
<div class="sheet-body"></div>
<div class="acts">${addButton()}<a class="press visit" target="_blank" rel="noopener" href="#">${icon('visit')}<span>Visit</span></a></div>
</aside>
</div>`;
  }

  return { esc, typeset, t, num, unitOf, icon, KL, BACK, PREVIOUS, STAT, ADD_LABEL, mediaOf, look, art, card, sheet, moveText, header, fan, pack, deck, dock, inspect, playButton, addButton, weights };
});
