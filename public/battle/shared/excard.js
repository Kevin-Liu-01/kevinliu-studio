// One card renderer for the whole site (Kevin, 2026-11-06: "mat should use the same cards for display as arena
// though, same as in home page"). The home page prints every card with r4/ex/markup.js card(); this classic script,
// loaded after r4/ex's own card scripts (fighters, media, face, art, the design families, markup) and before the
// battle's kit, makes that same function the one the kit's K.cardParts calls, so the Mat, the Arena and every scene's
// dealt card print the home page's card. Nothing is redrawn and no picture is copied: the card reads r4/ex's own data
// (FIGHTERS, MEDIA, FACE, ART, the family plan) and its pictures from r4/ex, so new art there flows in.
// The battle passes its engine's fighter; the card prints the home page's record of the same id.
(function () {
  'use strict';
  const EX = new URL('/ex/', document.currentScript.src).href;
  const PLAIN = matchMedia('(pointer: coarse)').matches || navigator.deviceMemory <= 4; // kevinliu.studio: frames on desktop only
  const M = globalThis.MARKUP;
  // fighters.js declares `const FIGHTERS` in the global scope (a classic script), so it is read by name here
  // eslint-disable-next-line no-undef
  const list = typeof FIGHTERS !== 'undefined' ? FIGHTERS : [];
  const byId = Object.fromEntries(list.map((f) => [f.id, f]));
  const env = {
    face: globalThis.FACE, media: globalThis.MEDIA && (globalThis.MEDIA.media || globalThis.MEDIA), art: globalThis.ART,
    recipes: globalThis.GROUND_RECIPES, order: list.map((f) => f.id), set: list.length, dzRoot: EX, // the families' own pictures
  };
  // every picture the card names, resolved against r4/ex (src and srcset alike), so the kit's gallery path never applies
  const abs = (u) => (/^(https?:|data:|blob:|#|\/)/.test(u) ? u : new URL(u, EX).href);
  // (and every url() a family's frame, border or cut names in an inline style)
  const resolve = (html) => html.replace(/url\((["']?)(?!data:|https?:|#|\/)([^"')]+)\1\)/g, (m, q, u) => `url(${q}${abs(u)}${q})`).replace(/\s(src|srcset)="([^"]*)"/g, (m, k, v) => ` ${k}="${k === 'src' ? abs(v) : v.split(',').map((p) => { const [u, ...rest] = p.trim().split(/\s+/); return [abs(u), ...rest].join(' '); }).join(', ')}"`);
  globalThis.MARKUP = Object.assign({}, M, {
    // the home page's card, printed with the battle's own HP, stats and cost (the battle plays those numbers; the card's
    // words, art and family are the home page's) until the engine's roster is rebuilt from roster/battle-roster.json
    card: (f, opts, e) => resolve((PLAIN ? M.baseCard : M.card)(byId[f.id] ? Object.assign({}, byId[f.id], f.stats ? { stats: f.stats } : {}, f.cost ? { cost: f.cost } : {}, f.total ? { total: f.total } : {}) : f, opts || {}, Object.assign({}, env, e && e.size ? { size: e.size } : {}))),
  });
  /** The home page's record of a card (the battle's move text reads the card's own words). */
  globalThis.EX_CARD = { base: EX, fighter: (id) => byId[id] || null };
  // the card's icons: r4/ex's icon set with the card's own symbols, as the home page inlines them (build.mjs SPRITE)
  globalThis.EX_CARD.ready = Promise.all(['icons/icons.svg', 'icons/card-symbols.svg'].map((p) => fetch(new URL(p, EX)).then((r) => r.text())))
    .then(([set, sym]) => {
      const kl = (set.match(/<symbol id="i-kl" viewBox="0 0 24 24"><path fill="currentColor" d="([^"]+)"/) || [])[1] || '';
      const symbols = sym.replace(/<!--[\s\S]*?-->\s*/, '').trim().replace('{{KL}}', kl);
      const sprite = set.replace(/<\/svg>\s*$/, symbols + '</svg>').replace('<svg', '<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"');
      const add = () => document.body.insertAdjacentHTML('afterbegin', sprite);
      if (document.body) add(); else addEventListener('DOMContentLoaded', add, { once: true });
    }).catch(() => {});
})();
