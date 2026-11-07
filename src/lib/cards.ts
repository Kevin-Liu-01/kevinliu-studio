// The card system at build time. The rounds' own modules print every card (markup.js), so the static HTML is the
// settled first paint and the gallery script only wakes it. This mirrors r4/ex build.mjs's env; the files come from
// `pnpm sync` (public/ex is served, vendor/ex is build-only).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

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

export const env = { recipes: RECIPES, bands: BANDS, media: MEDIA, art: ART, size: webpSize, face: FACE, order: FIGHTERS.map((f) => f.id), set: FIGHTERS.length };
export const fighters = FIGHTERS;
export const rules = RULES;
export const byId = Object.fromEntries(FIGHTERS.map((f) => [f.id, f]));
export const GALLERY_SIZES = WALL.sizes();
export const wallCss: string = WALL.css();
export const masks = ART.masks();

const framedCard = (f: Fighter, opts: Record<string, unknown> = {}) => M.card(f, { sizes: GALLERY_SIZES, ...opts }, env) as string;
// Frames print on desktop only (Kevin, 11-07). On the wall a phone held about 250 MB more for the frames' SVG layers,
// so a card prints plain (markup.js's own card) with its framed print waiting in an inert template; FRAMED, run right
// after the cards, swaps the framed print in on a fine pointer and drops the template everywhere else
export const card = (f: Fighter, opts: Record<string, unknown> = {}) =>
  `${M.baseCard(f, { sizes: GALLERY_SIZES, ...opts }, env)}<template class="framed">${framedCard(f, opts)}</template>`;
export const FRAMED = `(function(){var d=!(matchMedia("(pointer: coarse)").matches||navigator.deviceMemory<=4);document.querySelectorAll("template.framed").forEach(function(t){if(d)t.previousElementSibling.replaceWith(t.content);t.remove()})})()`;
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

// The cards the battle holds, with its costs and budget, as gallery.js reads them from <meta name="battle-roster">
export const battleRoster = (() => {
  const file = path.join(ROOT, 'public/battle/vendor/cards/fighters.js');
  if (!fs.existsSync(file)) return null;
  const b = require(file) as { RULES: any; FIGHTERS: Fighter[] };
  return { budget: b.RULES.team.budget as number, cost: Object.fromEntries(b.FIGHTERS.map((f) => [f.id, f.cost])) as Record<string, number> };
})();

// The round page's own head (vendor/ex/index.html, the sync keeps it): the sheets and scripts a wall loads, in order. A
// sheet marked data-card-style-sheet is a card style's (Breakout), which styles/breakout/switch.js finds and never adds twice.
const HEAD = fs.readFileSync(path.join(VX, 'index.html'), 'utf8');
export const roundSheets = [...HEAD.matchAll(/<link rel="stylesheet" href="([^"]+)"( data-card-style-sheet)?>/g)].map((m) => ({ href: m[1], style: !!m[2] }));
export const roundScripts = [...HEAD.matchAll(/<script defer src="([^"]+)"><\/script>/g)].map((m) => m[1]);

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

// Repositories a visitor cannot open (GitHub answers 404 without a sign-in, checked 2026-11-07). The rounds still list
// them, so the card pages, twins and JSON-LD link only the rest; scripts/check-seo.mjs fails when one of the rest stops
// answering 200. Change this when a repository goes public, and in the rounds' roster.
const CLOSED = new Set(['agent-pets', 'bday-land', 'powerlifting', 'elo', 'kevin-wiki', 'sandbox-arena', 'dedalus-terminal']);
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
