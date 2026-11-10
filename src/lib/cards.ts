// The card system at build time. The rounds' own modules print every card (markup.js), so the static HTML is the
// settled first paint and the gallery script only wakes it. This mirrors r4/ex build.mjs's env; the files come from
// `pnpm sync` (public/ex is served, vendor/ex is build-only).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { CLOSED as CLOSED_IDS } from './closed-repos.mjs';

const ROOT = process.cwd();
const EX = path.join(ROOT, 'public/ex');
const VX = path.join(ROOT, 'vendor/ex');
// The rounds write classic scripts that also export through CommonJS. This repo is ESM ("type": "module"), so each
// file runs in its own CommonJS sandbox with a require that resolves beside it.
const loaded = new Map<string, any>();
function require(file: string): any {
  if (loaded.has(file)) return loaded.get(file);
  const module: any = { exports: {} };
  const g: any = {};
  const ctx: any = { module, exports: module.exports, globalThis: g, console, require: (p: string) => require(path.resolve(path.dirname(file), p)) };
  g.globalThis = g;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  const out = Object.keys(module.exports).length ? module.exports : g;
  loaded.set(file, out);
  return out;
}

export type Fact = { value: number | string; unit?: string; receipt: string };
export type Move = { name: string; power?: number; text?: string; receipt: string; [k: string]: unknown };
export type Fighter = {
  id: string;
  title: string;
  year: number;
  disciplines: string[];
  stats: { hp: number; atk: number; def: number; spd: number };
  total: number;
  cost: number;
  trait?: { name: string; rule: string; receipt: string };
  moves: Move[];
  facts: Record<string, Fact>;
  url?: string;
  repo?: string;
  what?: string;
  credit?: string;
};

const sandbox = (file: string, key: string) => {
  const ctx: any = { globalThis: {}, module: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx);
  return ctx.globalThis[key] ?? ctx.module.exports?.[key] ?? ctx.module.exports;
};

const { RULES, FIGHTERS } = require(path.join(EX, 'fighters.js')) as { RULES: any; FIGHTERS: Fighter[] };
const { RECIPES } = require(path.join(EX, 'grounds/recipes.js'));
const ART = require(path.join(EX, 'art.js'));
export const M = require(path.join(EX, 'markup.js'));
const FACE = sandbox(path.join(VX, 'face.gen.js'), 'FACE');
const MEDIA = (sandbox(path.join(EX, 'media.gen.js'), 'MEDIA') || {}).media || {};
const BANDS = JSON.parse(fs.readFileSync(path.join(VX, 'bands.json'), 'utf8')).cards ?? {};
const WALL = await import(/* @vite-ignore */ path.join(VX, 'tools/wall-rule.mjs'));

// VP8X / VP8 / VP8L header: width and height of a webp the card prints
const webpSize = (rel: string) => {
  const b = fs.readFileSync(path.join(EX, rel));
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
};

// The poster ladder (r4/ex tools/posters.cjs): each poster's half beside it, recorded in posters.json (synced to
// vendor/ex, build-only). markup.js prints a poster's srcset by width when its card is printed with sizes and
// env.posters names a half for it.
const POSTERS = JSON.parse(fs.readFileSync(path.join(VX, 'posters/posters.json'), 'utf8'));
export const env = { recipes: RECIPES, bands: BANDS, media: MEDIA, art: ART, size: webpSize, face: FACE, order: FIGHTERS.map((f) => f.id), set: FIGHTERS.length, posters: POSTERS };
// A card page draws its card up to 440 px wide and has no gallery.js to keep `sizes` at the drawn width, so a
// caller may ask for the whole posters only (opts.ladder === false).
const NO_LADDER = { ...env, posters: { half: {} } };
export const fighters = FIGHTERS;
export const rules = RULES;
export const byId = Object.fromEntries(FIGHTERS.map((f) => [f.id, f]));
export const GALLERY_SIZES = WALL.sizes();
export const wallCss: string = WALL.css();
export const masks = ART.masks();

const framedCard = (f: Fighter, opts: Record<string, unknown> = {}, e: typeof env = env) => M.card(f, { sizes: GALLERY_SIZES, ...opts }, e) as string;
// A card's element children as [start, end) slices of its HTML, the open tag that holds them and where they end.
// markup.js writes well-formed HTML: every element closed or void, no "<" in text or attributes.
const VOID = new Set(['img', 'br', 'input', 'source', 'wbr', 'hr', 'meta', 'link', 'area', 'col', 'embed', 'track']);
function kidsOf(html: string) {
  const tag = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
  const first = tag.exec(html)!;
  const kids: [number, number][] = [];
  let depth = 1, at = -1;
  for (let m; (m = tag.exec(html)); ) {
    if (m[1]) { if (--depth === 0) return { kids, body: first.index + first[0].length, end: m.index }; if (depth === 1) kids.push([at, m.index + m[0].length]); }
    else if (m[3] || VOID.has(m[2].toLowerCase())) { if (depth === 1) kids.push([m.index, m.index + m[0].length]); }
    else { if (depth === 1) at = m.index; depth++; }
  }
  throw new Error('card markup is not balanced');
}
const keyOf = (h: string) => /^<([\w-]+)(?:[^>]*?\sclass="([^"]*)")?/.exec(h)?.slice(1).join('.') ?? '';
// The framed print with every subtree it shares with the plain print replaced by <b data-same="i.j.k">, the path of
// element children that reaches the same subtree in the plain card. Never inside an <svg> (a <b> there leaves SVG).
function delta(plain: string, framed: string, at: number[] = []): string {
  const P = kidsOf(plain), F = kidsOf(framed);
  const pk = P.kids.map(([a, b]) => plain.slice(a, b));
  const used = new Set<number>();
  let out = framed.slice(0, F.body), from = F.body;
  F.kids.forEach(([a, b]) => {
    const s = framed.slice(a, b);
    out += framed.slice(from, a);
    from = b;
    let j = pk.findIndex((x, i) => !used.has(i) && x === s);
    if (j >= 0 && s.length > 40) { used.add(j); out += `<b data-same="${[...at, j].join('.')}"></b>`; return; }
    j = /^<svg\b|\/>$/.test(s) || VOID.has(keyOf(s).split('.')[0]) ? -1 : pk.findIndex((x, i) => !used.has(i) && keyOf(x) === keyOf(s));
    if (j >= 0) { used.add(j); out += delta(pk[j], s, [...at, j]); return; }
    out += s;
  });
  return out + framed.slice(from);
}
// the framed print again from the plain print and its delta, as FRAMED rebuilds it in the page
function undelta(plain: string, d: string) {
  return d.replace(/<b data-same="([\d.]+)"><\/b>/g, (_, p: string) => p.split('.').reduce((h, i) => { const [a, b] = kidsOf(h).kids[+i]; return h.slice(a, b); }, plain));
}
// Frames print on desktop only (Kevin, 11-07). On the wall a phone held about 250 MB more for the frames' SVG layers,
// so a card prints plain (markup.js's own card) with its framed print waiting in an inert template; FRAMED, run right
// after the cards, swaps the framed print in on a fine pointer and drops the template everywhere else.
// The two prints share most of a card (its words, art and icons), so the template holds only what differs and points
// at the rest (data-same); FRAMED moves those nodes from the plain print into the framed one. Each delta is rebuilt
// here and must give back the framed print exactly. The plain print's front-effect poster (-fx.webp) carries its
// address in data-plainfx, so a desktop never fetches it (Chromium lays out a streamed wall before FRAMED runs, so
// loading="lazy" was not enough); FRAMED gives it its src where the plain print stays, lazy where the card's poster is.
// A delta whose paths do not all resolve in the page keeps the plain print.
export const card = (f: Fighter, opts: Record<string, unknown> = {}) => {
  const { ladder = true, ...o } = opts;
  const e = ladder ? env : NO_LADDER;
  // the plain print's front-effects poster waits in data attributes (its src, and its srcset when the ladder prints
  // one: an <img> with a srcset and no src still fetches), so a desktop never fetches it; FRAMED gives both back
  const plain = (M.baseCard(f, { sizes: GALLERY_SIZES, ...o }, e) as string).replace(/(<span class="fx"[^>]*><img )src="(posters\/[\w-]+-fx\.webp)"(?: srcset="([^"]*)")?/, (_m: string, a: string, src: string, set?: string) => `${a}data-plainfx="${src}"${set ? ` data-plainfxset="${set}"` : ''}`);
  const framed = framedCard(f, o, e);
  const d = delta(plain, framed);
  if (undelta(plain, d) !== framed) throw new Error(`card ${f.id}: the framed print's delta does not rebuild it`);
  return `${plain}<template class="framed">${d}</template>`;
};
export const FRAMED = `(function(){var d=!(matchMedia("(pointer: coarse)").matches||navigator.deviceMemory<=4);document.querySelectorAll("template.framed").forEach(function(t){var c=t.previousElementSibling;var ms=t.content.querySelectorAll("b[data-same]"),ns=d?[].map.call(ms,function(m){return m.dataset.same.split(".").reduce(function(n,i){return n&&n.children[i]},c)}):[];if(d&&ns.every(Boolean)){ms.forEach(function(m,k){m.replaceWith(ns[k])});c.replaceWith(t.content)}else c.querySelectorAll("img[data-plainfx]").forEach(function(i){var p=c.querySelector("img.poster");if(p&&p.loading==="lazy")i.loading="lazy";if(i.dataset.plainfxset){i.srcset=i.dataset.plainfxset;i.removeAttribute("data-plainfxset")}i.src=i.dataset.plainfx;i.removeAttribute("data-plainfx")});t.remove()})})()`;
export const sheet = (f: Fighter) => M.sheet(f, MEDIA) as string;

// The text a card says about itself, for page copy, meta descriptions and twins: the face's own "what" line.
export const whatOf = (f: Fighter): string => String(f.what ?? '').trim();
export const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
export const moveLine = (mv: Move) => plain(M.moveText(mv));
const FACT: Record<string, string> = { hp: 'build', atk: 'reach', def: 'proof', spd: 'pace' };
export const factLines = (f: Fighter) => M.factOrder(f).map(([k]: [string]) => {
  const fact = f.facts[FACT[k]];
  return fact ? { key: FACT[k], value: String(M.num(fact.value)), unit: String(M.unitOf(fact.value, fact.unit) ?? ''), receipt: fact.receipt } : null;
}).filter(Boolean) as { key: string; value: string; unit: string; receipt: string }[];

// The card's own colours, for the page around it (face.gen.js: energy, deep, panel, glint, ink)
export const hueOf = (f: Fighter): Record<string, string> => (FACE?.[f.id]?.hue ?? {}) as Record<string, string>;

// The cards the battle holds, with its costs and budget, as gallery.js reads them from <meta name="battle-roster">: the
// engine's roster (vendor/battle/vendor/engine.js, bundled from r3/battle with the kit, build-only)
export const battleRoster = await (async () => {
  const file = path.join(ROOT, 'vendor/battle/vendor/engine.js');
  if (!fs.existsSync(file)) return null;
  const b = await import(/* @vite-ignore */ file) as { RULES: any; FIGHTERS: Fighter[] };
  return { budget: b.RULES.team.budget as number, cost: Object.fromEntries(b.FIGHTERS.map((f) => [f.id, f.cost])) as Record<string, number> };
})();

// The round page's own head (vendor/ex/index.html, the sync keeps it): the sheets and scripts a wall loads, in order. A
// sheet marked data-card-style-sheet is a card style's (Breakout), which styles/breakout/switch.js finds and never adds twice.
const HEAD = fs.readFileSync(path.join(VX, 'index.html'), 'utf8');
export const roundSheets = [...HEAD.matchAll(/<link rel="stylesheet" href="([^"]+)"( data-card-style-sheet)?>/g)].map((m) => ({ href: m[1], style: !!m[2] }));
// The frame printings (design/frames.gen.js, frames.js) run only from the lens's frame row, which the sync hides
// (gallery.js `frs.hidden = true`: design-lane working names, release 11-07), so no page loads their 70 KB.
const UNUSED = new Set(['design/frames.gen.js', 'frames.js']);
export const roundScripts = [...HEAD.matchAll(/<script defer src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((f) => !UNUSED.has(f));

// The page head's piece the card needs: the neumorphic tokens (the face is public/fonts/katagami-sans-site.woff2, Base.astro)
export const neuTokens = fs.readFileSync(path.join(VX, 'vendor/neu-tokens.css'), 'utf8').replace(/^\/\*.*\*\/\n/, '');

// The icon sprite build.mjs inlines at the foot of each page (icons.svg plus the card's own symbols)
export const sprite = (() => {
  const s0 = fs.readFileSync(path.join(VX, 'icons/icons.svg'), 'utf8')
    .replace(/<\?xml[^>]*>\s*/, '')
    .replace('<svg xmlns="http://www.w3.org/2000/svg">', '<svg xmlns="http://www.w3.org/2000/svg" class="sprite" aria-hidden="true" focusable="false">')
    .trim();
  const kl = s0.match(/<symbol id="i-kl" viewBox="0 0 24 24"><path fill="currentColor" d="([^"]+)"/)?.[1] ?? '';
  const cs = fs.readFileSync(path.join(VX, 'icons/card-symbols.svg'), 'utf8').replace(/<!--[\s\S]*?-->\s*/, '').trim().replace('{{KL}}', kl);
  return s0.replace(/<\/svg>\s*$/, cs + '</svg>');
})();

export const KL_PATH: string = M.KL;

// A team of three that fits the battle's budget, in roster order, led by the given card
export function teamFor(lead: string): string[] | null {
  if (!battleRoster || !(lead in battleRoster.cost)) return null;
  const ids = Object.keys(battleRoster.cost).filter((id) => id !== lead);
  const left = battleRoster.budget - battleRoster.cost[lead];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    if (battleRoster.cost[ids[i]] + battleRoster.cost[ids[j]] <= left) return [lead, ids[i], ids[j]];
  }
  return null;
}

// the repositories a visitor cannot open, shared with the card faces' sync patch
const CLOSED = new Set(CLOSED_IDS);
export const repoOf = (f: Fighter): string | undefined => (f.repo && !CLOSED.has(f.id) && !/\(private\)/.test(f.repo) ? f.repo.replace(/ .*$/, '') : undefined);

// The one sentence that answers "what is <card>": the card's own line with its name as the subject. Only a leading
// article is lowercased; a line that opens on a name ("General Translation's magazine") keeps its capitals.
export function answerOf(f: Fighter): string {
  const what = whatOf(f);
  if (/^(A|An|The) /.test(what)) return `${f.title} is ${what[0].toLowerCase()}${what.slice(1)}`;
  if (/^[A-Z][\w.]*(?: [A-Z][\w.]*)*'s /.test(what)) return `${f.title} is ${what}`;
  return `${f.title}: ${what}`;
}

// Three cards that share the most disciplines with this one (its first discipline counts double), nearest in the
// wall's order on a tie, so every card page links to its neighbours in kind rather than only in number.
export function relatedOf(f: Fighter, n = 3): Fighter[] {
  const i = FIGHTERS.indexOf(f);
  const score = (g: Fighter) => g.disciplines.reduce((s, d) => s + (d === f.disciplines[0] ? 2 : f.disciplines.includes(d) ? 1 : 0), 0);
  return FIGHTERS.filter((g) => g !== f)
    .map((g) => ({ g, s: score(g), d: Math.abs(FIGHTERS.indexOf(g) - i) }))
    .sort((a, b) => b.s - a.s || a.d - b.d)
    .slice(0, n)
    .map((x) => x.g);
}
