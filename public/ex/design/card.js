// The card families (EX.md 23, r4/studio/DESIGN.md ported 11-03): one card, printed in its family, with its own border,
// finish, picture placement and front effect. markup.js card() prints through make(M, PLAN) whenever design/plan.gen.js
// is loaded (a page: classic scripts, globalThis.DESIGN_CARD and DESIGN_PLAN; node and the battle's esbuild bundle:
// require beside markup.js), so card(f, opts, env) keeps its signature and every class the battle and the E-tests read
// (EX.md 17). What it changes, card by card, from design/plan.gen.js (tools/design.mjs writes it from design/assign.json,
// design/families.js and each card's borders/<id>/border.json and fx/<id>/fx.json):
//   - .card carries the class dz, data-fam (W Window, K Rail, S Schematic, T Tower, P Panorama, Y Storyboard, B Poster,
//     D Device), data-fx (its effect kind), data-finish (ink, embossed, etched, foil) and, on a storyboard, data-panels;
//     card.css's families section builds the family's bar plate and text construction from them;
//   - .rim holds the card's own border (borders/<id>/border.svg, struck by its cost in design/lit/<id>.svg), masked to the
//     family's frame (design/frames/<id>.svg) and to the border's own alpha, so the cost finish (.fin) and the tilt streak
//     (.spec) are struck in the border's material and nowhere else; an over layer (over.svg) stands over the aperture's
//     edge in .rimo; a trim (trim.svg) cuts the card's own outline, the energy, the cast and the sleeve with it;
//   - the glass pane's cracks and shards and the cost 4 glitter fields go (Kevin 11-02: no fake fireworks; glass and
//     glitter are no product's material here), and .fx holds the card's own front effect (fx/<id>/fx.svg), or nothing;
//   - .pane marks the family's aperture (its box), .sill stays in the markup and is hidden;
//   - the subject (.pop, .cast, .glw) stands where its family's fit puts it (design/families.js fit); a card with a hero
//     prints that picture in place of its media pop; a poster lays its set under the whole card; a storyboard cuts its
//     earlier panels from the subject's own picture;
//   - a poster's trait rule and descriptions are each wrapped in span.ln, so its plates are bands behind its type lines.
// Every picture path the module owns (art/, borders/, fx/, design/) is printed under R: env.dzRoot when the caller gives
// one, else the battle's <meta name="gallery"> (the folder r4/ex is copied into), else '' (r4/ex's own pages, whose base
// is the folder). Every replacement must hit exactly once, or card() throws: a markup change upstream fails loudly.
// Nothing else moves: type, icons, rows, sizes, tiers and keep-outs are markup.js's, on every family.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DESIGN_CARD = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const r4 = (v) => Math.round(v * 10000) / 100;
  // FNV-1a, 32 bits, as 8 hex: the rim bake's key (tools/bake-rims.mjs reads it back from data-rk)
  const hash = (s) => { let x = 0x811c9dc5; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193); } return (x >>> 0).toString(16).padStart(8, '0'); };

  // one exact replacement: a string or a regex must match exactly once
  function once(h, a, b, what, id) {
    const n = typeof a === 'string' ? h.split(a).length - 1 : (h.match(new RegExp(a.source, a.flags.includes('g') ? a.flags : a.flags + 'g')) || []).length;
    if (n !== 1) throw new Error(`design card ${id}: ${what} matched ${n} times, expected 1`);
    return h.replace(a, typeof b === 'string' ? () => b : b);
  }
  // the subject's three boxes (.pop, .cast, .glw) moved by the family's fit
  const reBox = (cls) => new RegExp(`(<(?:span|img|i) class="${cls}[^"]*"[^>]*?style=")left:(-?[\\d.]+)cqw;top:(-?[\\d.]+)cqw;width:(-?[\\d.]+)cqw`);
  function move(h, fit, id) {
    const U = (u) => fit.cu + fit.s * (u - 0.5), V = (v) => fit.foot + fit.s * (v - 0.646);
    for (const cls of ['pop art obj', 'cast', 'glw']) {
      const re = reBox(cls);
      if (!re.test(h)) { if (cls === 'pop art obj' && !/<span class="pop art obj" data-pending>/.test(h)) throw new Error(`design card ${id}: no subject box`); continue; }
      h = h.replace(re, (all, head, l, t, w) => {
        const u0 = +l / 100, v0 = +t / 100, u1 = u0 + +w / 100;
        return `${head}left:${r4(U(u0))}cqw;top:${r4(V(v0))}cqw;width:${r4(U(u1) - U(u0))}cqw`;
      });
    }
    return h;
  }
  // a hero: a picture of the product's own object replaces the subject's cut, standing at its solid box (at: left, top
  // and width in card widths); its shadow is a drop shadow on its own alpha (card.css). The 2x cut prints by width when
  // the caller knows its drawn size (opts.sizes), or outright for a hi print (the lens and every print over 300 px);
  // gallery.js toHi leaves a hero's picture alone (.pop[data-hero])
  function hero(h, H, id, hi, sizesOf, sz) {
    const [b0, b1, b2] = H.bb, [x, y, sw] = H.at, k = sw / (b2 - b0);
    const u0 = x - b0 * k, v0 = y - b1 * k, w = H.w * k;
    const set = !hi && sz && H.hi && sizesOf ? ` srcset="${H.src} ${H.w}w, ${H.hi} ${H.w * 2}w" sizes="${sizesOf(sz, w)}"` : '';
    const src = hi && H.hi ? H.hi : H.src;
    h = once(h, /<span class="pop art obj"[^>]*>(?:<img[^>]*>)?<\/span>/, `<span class="pop art obj" data-hero style="left:${r4(u0)}cqw;top:${r4(v0)}cqw;width:${r4(w)}cqw"><img src="${src}"${set} alt="" width="${H.w}" height="${H.h}" draggable="false"></span>`, 'hero', id);
    return h.replace(/<(?:img|i) class="cast"[^>]*>(?:<\/i>)?/, '').replace(/<img class="glw"[^>]*>/, '');
  }
  // a storyboard's earlier panels: the subject's cut at its own place, clipped to each panel, so the panels read as one
  // scene cut into frames and the subject leaves the last
  function storyboard(c, p) {
    if (!p || !p.box) return '';
    const ps = c.ap.map((r) => r.map((x) => (typeof x === 'number' ? x / 1000 : x)));
    const [u0, v0, u1] = p.box;
    const set = c.panels === 2 ? ps : ps.slice(0, -1);
    return set.map(([a, b, cc, d], i) => `<span class="sbp" style="left:${r4(a)}cqw;top:${r4(b)}cqw;width:${r4(cc - a)}cqw;height:${r4(d - b)}cqw"><img src="${p.src}" alt="" draggable="false" style="left:${r4(u0 - a - (c.panels === 2 ? (i ? -0.08 : 0.08) : 0))}cqw;top:${r4(v0 - b)}cqw;width:${r4(u1 - u0)}cqw"></span>`).join('');
  }
  const url = (u) => `url(${u})`;
  const maskOf = (list) => { const m = list.map(url).join(','); return `-webkit-mask-image:${m};mask-image:${m}`; };
  // the battle copies r4/ex into its cards folder and names it in <meta name="gallery">; its card.ts rewrites relative
  // src attributes there but not url() in a style, so the module prints its own paths absolute in that page
  function rootOf(env) {
    if (env && env.dzRoot != null) return env.dzRoot;
    if (typeof document === 'undefined' || !document.querySelector) return '';
    const m = document.querySelector('meta[name="gallery"]');
    return m && m.content ? new URL(m.content, document.baseURI).href : '';
  }

  // A frame printing (Kevin, 11-06: "make a thing to select card frames primary and alternate as well in addition to
  // the card art"): one card's rim and over layer in one of its frames, and the trim it cuts, with every path under R.
  // f is a plan frame: { kind, dir, layers: { border, over, trim, bv, ov, tv }, lit: { border, over } }. kind 'border'
  // prints a border lane's drawing as drawn (its over pieces and trim with it), 'clean' today's drawing without its over
  // pieces or trim, 'engraved' today's drawing struck tone on tone into the card's deep tone, 'solid' the card's own
  // colour and 'metal' the even polished rim of rounds ex.1 to ex.5; every kind prints in the family's frame
  // (design/frames/<id>.svg), so no frame puts a band down the card's sides
  function rimOf(c, id, R, f) {
    const D = R + 'design/', q = (v) => (v ? '?v=' + v : '');
    const own = (u) => (!u ? u : /^(art|borders|fx|design)\//.test(u) ? R + u : u);
    const frame = `${D}frames/${id}.svg${q(c.v)}`, L = f.layers || {};
    const at = (fl) => (fl.includes('/') ? own(fl) : `${R}${f.dir}${fl}`);
    const bd = L.border ? `${at(L.border)}${q(L.bv)}` : null;
    const lit = (k, fl) => (f.lit && f.lit[k] ? `${own(f.lit[k])}${q(k === 'over' ? L.ov : L.bv)}` : fl);
    const k = f.kind || 'border';
    // a solid or engraved printing's naming band (borders/<id>/band.svg), in its own colours over the frame's ground
    const band = (k === 'solid' || k === 'engraved') && L.band ? `<img class="bnd" src="${R}${f.dir}${L.band}${q(L.nv)}" alt="" draggable="false">` : '';
    if (k === 'solid' || k === 'metal') return { html: `<i class="rim" data-k="${k}" style="${maskOf([frame])}"><i class="fr"></i>${band}<i class="fin"></i><i class="spec"></i></i>`, trim: null };
    if (k === 'engraved') return { html: `<i class="rim" data-k="engraved" style="${maskOf([frame])}"><i class="fr"></i><img class="bd" src="${lit('border', bd)}" alt="" draggable="false">${band}<i class="fin"></i><i class="spec"></i></i>`, trim: null };
    const full = k === 'border';
    const trim = full && L.trim ? `${at(L.trim)}${q(L.tv)}` : null;
    const over = full && L.over ? `<i class="rimo" style="${maskOf([`${D}frames/${id}-over.svg${q(c.v)}`, `${at(L.over)}${q(L.ov)}`, ...(trim ? [trim] : [])])}"><img class="bdo" src="${lit('over', `${at(L.over)}${q(L.ov)}`)}" alt="" draggable="false"><i class="fin"></i></i>` : '';
    return { html: `<i class="rim" data-k="${k}" style="${maskOf([frame, bd, ...(trim ? [trim] : [])])}"><img class="bd" src="${lit('border', bd)}" alt="" draggable="false"><i class="fin"></i><i class="spec"></i></i>${over}`, trim };
  }

  // make(M, PLAN): M is markup.js's own api (card, mediaOf, popOf, sizesOf), PLAN design/plan.gen.js
  function make(M, PLAN) {
    const P = (PLAN && PLAN.cards) || {};
    function card(f, opts = {}, env = {}) {
      const c = ((env && env.plan) || P)[f.id];
      // a card the plan does not hold prints as markup.js does
      if (!c) return M.baseCard(f, opts, env);
      const R = rootOf(env);
      const D = R + 'design/';
      // a picture this module owns (art/, borders/, fx/, design/) is stored relative to r4/ex and printed under R; the
      // markup's own media/ and posters/ paths stay relative to the page's base
      const own = (u) => (!u ? u : /^(art|borders|fx|design)\//.test(u) ? R + u : u);
      // the picture: the plan's own cut (a keep-out cut) over the media file's
      let e2 = env;
      if (c.picture) {
        const m = M.mediaOf(f, env), pop = { ...(m.pop || {}), src: own(c.picture.src), hi: own(c.picture.hi) };
        delete pop.cuts;
        if (pop.cast && c.picture.cast) pop.cast = { ...pop.cast, src: own(c.picture.cast) };
        e2 = { ...env, media: { ...((env && env.media) || {}), [f.id]: { ...m, pop } } };
      }
      let h = M.baseCard(f, opts, e2);
      const id = f.id;
      h = once(h, /^<div class="card/, '<div class="card dz', 'card class', id);
      h = once(h, ` data-id="${id}"`, ` data-id="${id}"${c.frame ? ` data-bd="${c.frame}"` : ''} data-fam="${c.fam}" data-fx="${c.fx.kind}" data-finish="${c.finish}"${c.emboss ? '' : ' data-flat'}${c.panels ? ` data-panels="${c.panels}"` : ''}${c.standin ? ' data-standin' : ''}${c.plate ? ' data-plate' : ''}${c.style ? ` data-card-style="${c.style}" data-style-default="${c.style}"` : ''}`, 'card data', id);
      // the border: the card's primary frame (rimOf), masked to the family's frame, its own alpha and its trim
      const q = (v) => (v ? '?v=' + v : '');
      const F0 = c.frames && c.frame ? c.frames[c.frame] : { kind: 'border', dir: `borders/${id}/`, layers: c.layers, lit: c.lit };
      let { html: rimHtml, trim } = rimOf(c, id, R, F0);
      // the rim bake (tools/bake-rims.mjs; engineer ex7, first load): the primary's rim and over layer struck at rest,
      // its finish passes and lip with them, cut to the strips they print and packed into one atlas for the set
      // (design/bake/rims.webp). A print at rest takes the atlas when the caller hands it the bake (env.bake: build.mjs
      // for the gallery's pages) and the bake was struck from this exact rim (data-rk, the rim's markup and the card's
      // own tones); a hi print and every other frame keep their SVGs (gallery.js swaps a card drawn wider than the bake
      // back to them). The tilt streak stays live in each strip, masked by the atlas itself.
      const rk = hash(rimHtml + '|' + ((h.match(/^<div class="card[^>]*?\sstyle="([^"]*)"/) || [])[1] || ''));
      const B = env && env.bake, b = B && B.cards && B.cards[id];
      const baked = !!(b && b.key === rk && !opts.hi);
      if (baked) {
        // 6 decimals (craft ex9): a strip's box and its picture land on the same device pixel at a rung's own width
        const cq = (px) => Math.round((px / B.w) * 1e8) / 1e6;
        rimHtml = `<i class="rim" data-k="${F0.kind || 'border'}" data-bake="${B.w}" data-rk="${rk}" style="--bkl:url(${R}${B.src})${(B.rungs || []).map((g) => `;--bk${g.w}:url(${R}${g.src})`).join('')}">${b.slices.map(([s0, s1, ay]) => `<i class="bk" style="top:${cq(s0)}cqw;height:${cq(s1 - s0)}cqw;--ay:${-cq(ay)}cqw;--y0:${cq(s0)}cqw"><i class="bks"><i class="spec"></i></i></i>`).join('')}</i>`;
        if (trim && b.trim) trim = b.trim;
      } else rimHtml = rimHtml.replace('<i class="rim" ', `<i class="rim" data-rk="${rk}" `);
      const [x0, y0, x1, y1] = c.pic;
      h = once(h, '<i class="rim"><i class="spec"></i></i><i class="pane"></i>',
        `${rimHtml}<i class="pane" style="left:${r4(x0 / 1000)}cqw;top:${r4(y0 / 1000)}cqw;width:${r4((x1 - x0) / 1000)}cqw;height:${r4((y1 - y0) / 1000)}cqw"></i>`, 'rim', id);
      if (trim) {
        h = once(h, '<span class="en">', `<span class="en" style="${maskOf([trim])}">`, 'energy trim', id);
        // the card's cast and its sleeve follow the trim, not the rounded box: the cast is a drop shadow of the trimmed
        // silhouette under the face (.tsh), the sleeve a ring cut from the trim scaled out
        h = once(h, ` data-id="${id}"`, ` data-id="${id}" data-trim`, 'card trim', id);
        h = once(h, '<div class="body"><div class="face">', `<div class="body"><i class="tsh" aria-hidden="true"><i style="${maskOf([trim])}"></i></i><div class="face">`, 'trim cast', id);
        h = once(h, '<i class="sleeve"></i>', `<i class="sleeve" style="--trim:url(${trim})"></i>`, 'trim sleeve', id);
      }
      // a shaped aperture (Jarhead's notch) carries its own keyline: the cost 4 prism runs on the aperture's path
      if (c.key) h = once(h, '<i class="pane" style="', `<i class="pane" data-key style="--key:url(${baked && b.keyline ? b.keyline : `${D}frames/${id}-key.svg${q(c.v)}`});`, 'pane key', id);
      // the seal is markup.js's own: the kl signature in the collector chip, in every family
      // no glass and no glitter: the cracks, the shards and the cost 4 glitter fields go (EX.md 23.7)
      h = h.replace(/<svg class="crk"[\s\S]*?<\/svg>/, '').replace(/<svg class="shards"[\s\S]*?<\/svg>/, '').replace(/<i class="gl [a-z]+" aria-hidden="true"><i class="tw"><\/i><\/i>/g, '');
      // a poster baked for this module (the plan names one only where its own posters stand beside it)
      if (c.poster) h = once(h, `src="posters/${id}.webp"`, `src="${D}posters/${id}.webp${q(c.poster)}"`, 'poster', id);
      // the front effect: the card's own (fx/<id>/fx.svg), or none
      // (a logo card's effect is masked off its logo as the card prints it: design/fxcut/<id>.svg, tools/fx-logo-cut.py)
      // At rest a print takes it from the bake's effect atlas when the bake holds this exact file (tools/bake-rims.mjs),
      // keeping the file's own path on the layer (data-fx) for gallery.js to print it again when the card draws wider
      const fxRel = c.fx.layer ? `${c.fx.src || `fx/${id}/${c.fx.layer}`}${q(c.fx.v)}` : null;
      const fb = fxRel && B && B.fx && B.fx.cards[id];
      // an alternate printing prints its own cut of the effect (tools/fx-logo-cut.py; printings.js swaps it with the art):
      // data-fxp lists them, label|path, space separated
      const fxp = c.fx.alts ? ` data-fxp="${Object.entries(c.fx.alts).map(([l, r]) => `${l}|${own(r)}${q(c.fx.v)}`).join(' ')}"` : '';
      let fx = c.fx.layer ? `<span class="fx dzfx" aria-hidden="true"${fxp}><img src="${own(fxRel)}" alt="" draggable="false"></span>` : '<span class="fx dzfx" aria-hidden="true"></span>';
      if (fb && fb.src === fxRel && !opts.hi) {
        const cq = (px) => r4(px / B.w), F = B.fx;
        fx = `<span class="fx dzfx" aria-hidden="true"${fxp} data-fx="${own(fxRel)}">${fb.box ? `<i class="fxb" style="left:${r4((fb.box[0] - F.x0) / B.w)}cqw;top:${cq(fb.box[1])}cqw;width:${cq(fb.box[2] - fb.box[0])}cqw;height:${cq(fb.box[3] - fb.box[1])}cqw;background-image:url(${R}${F.src});background-size:${cq(F.size[0])}cqw auto;background-position:${-cq(fb.at[0])}cqw ${-cq(fb.at[1])}cqw"></i>` : ''}</span>`;
      }
      h = once(h, /<span class="fx" aria-hidden="true">[\s\S]*?<\/span>(?=<span class="glarebox">)/, fx, 'front effect', id);
      // the subject in its family
      if (c.hero) h = hero(h, { ...c.hero, src: own(c.hero.src), hi: own(c.hero.hi) }, id, !!opts.hi, M.sizesOf, opts.sizes);
      else if (c.fit && !(c.fit.s === 1 && c.fit.cu === 0.5 && c.fit.foot === 0.646)) h = move(h, c.fit, id);
      // the provenance strip does not print on the face in any family (originality, studio-2: at 480 px and up it hung
      // under the name bar at the window's top left, the reference's stage-line slot); the hash stays in the collector chip.
      // A def with no pin prints no strip at all (the battle's engine defs)
      h = h.replace(/<span class="prov(?: none)?"(?: style="left:[^"]*")?>/, '<span class="prov none">');
      // the set under the picture: a poster's full picture, a storyboard's earlier panels
      let set = '';
      if (c.set) set = `<span class="set" style="background-image:url(${own(c.set.src)});background-position:${c.set.pos};background-size:${c.set.size}${c.set.op ? `;opacity:${c.set.op}` : ''}${c.set.fade ? `;--fs:${c.set.fade[0]}%;--fo:${c.set.fade[1]}` : ''}"></span>`;
      else if (c.fam === 'Y') set = `<span class="sb">${storyboard(c, M.popOf(f, e2))}</span>`;
      if (set) h = once(h, /(<canvas class="ground"[^>]*><\/canvas>)/, (all) => all + set, 'set', id);
      // a poster's type lines each carry their own band (card.css .ln), so the picture shows between and beside them; a
      // description's kept last words (markup.js kept(), span.kw) stay inside its band
      if (c.fam === 'B') {
        const n = (h.match(/<span class="(?:tr|md)"(?: data-bal)?>/g) || []).length;
        if (n !== 3) throw new Error(`design card ${id}: poster lines matched ${n} times, expected 3`);
        h = h.replace(/(<span class="(?:tr|md)"(?: data-bal)?>)((?:[^<]|<span class="kw">[^<]*<\/span>)*)(<\/span>)/g, '$1<span class="ln">$2</span>$3');
        if ((h.match(/<span class="ln">/g) || []).length !== 3) throw new Error(`design card ${id}: poster bands wrapped ${(h.match(/<span class="ln">/g) || []).length} lines, expected 3`);
      }
      return h;
    }
    return { card, plan: P, rimOf: (c, id, R, f) => rimOf(c, id, R, f) };
  }
  return { make, once, rimOf };
});
