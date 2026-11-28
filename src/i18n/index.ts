// The site's words in each language, read at build. English is the source: src/i18n/en/ui.json (the interface, written
// by hand) and src/i18n/en/content.json (Kevin's bio and the cards' own words, written by scripts/i18n-extract.mjs).
// General Translation writes the other languages beside them (gt.config.json, `pnpm i18n:translate`); nothing is
// translated at run time and no key reaches the build or the browser.
// A translated string is used only while it still translates the English the site prints now and keeps every
// {placeholder} and link target of its source; otherwise that one string prints in English and the build says so.
import { DEFAULT, LOCALES, localeOf, lp, split } from './locales.mjs';
import { source, battleSource } from './source.mjs';
import * as cardLib from '../lib/cards';
import * as site from '../lib/site';
import enUi from './en/ui.json';
import enContent from './en/content.json';
import enUiRaw from './en/ui.json?raw';
import enContentRaw from './en/content.json?raw';
import enBattle from './en/battle.json';
import enBattleRaw from './en/battle.json?raw';
import gtLock from '../../gt-lock.json';
import crypto from 'node:crypto';

export { DEFAULT, LOCALES, localeOf, lp, split };
export const CODES: string[] = LOCALES.map((l) => l.code);

type Tree = { [k: string]: unknown };
const FILES = import.meta.glob('./*/*.json', { eager: true, import: 'default' }) as Record<string, Tree>;
const fileOf = (gt: string, name: string) => FILES[`./${gt}/${name}.json`];
const fresh = source({ ...cardLib, ...site }) as Tree;
// the battle's table as the synced battle prints it now (public/battle/shared/strings.js)
const freshBattle = (await battleSource(process.cwd(), cardLib.fighters)) as Record<string, string>;

// gt-lock.json records the hash of each English file General Translation translated (versionId). An English file that
// no longer matches it (edited by hand, or re-extracted without translating) would ship the old translations of strings
// that changed, so the build stops instead: run `pnpm i18n:translate`, or restore the file.
for (const [name, raw] of [['ui', enUiRaw], ['content', enContentRaw], ['battle', enBattleRaw]] as const) {
  const entry = gtLock.entries.find((e) => Object.values(e.translations).some((x) => x.fileName.endsWith(`/${name}.json`)));
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  if (entry?.versionId !== hash) throw new Error(`i18n: src/i18n/en/${name}.json changed after its translations were made (gt-lock.json); run pnpm i18n:translate, or restore the file`);
}

const marks = (s: string) => [...s.matchAll(/\{\w+\}|\]\([^)]*\)/g)].map((m) => m[0]).sort().join('|');
const warned = new Set<string>();
function warn(code: string, why: string) {
  const k = `${code}: ${why}`;
  if (warned.has(k)) return;
  warned.add(k);
  console.warn(`[i18n] ${k}`);
}
// the tree the page prints: `now` (the English the site prints today) with each string replaced by its translation
// where `was` (the English that was translated) still equals `now` and the marks agree
function merge(now: unknown, was: unknown, tr: unknown, code: string, at: string): unknown {
  if (typeof now === 'string') {
    if (typeof tr !== 'string' || !tr.trim()) { if (code !== DEFAULT) warn(code, `${at} is not translated`); return now; }
    if (was !== now) { warn(code, `${at} changed since it was translated`); return now; }
    if (marks(tr) !== marks(now)) { warn(code, `${at} lost or changed a placeholder or link`); return now; }
    return tr;
  }
  if (Array.isArray(now)) return now.map((x, i) => merge(x, (was as unknown[] | undefined)?.[i], (tr as unknown[] | undefined)?.[i], code, `${at}[${i}]`));
  if (now && typeof now === 'object') return Object.fromEntries(Object.entries(now).map(([k, v]) => [k, merge(v, (was as Tree | undefined)?.[k], (tr as Tree | undefined)?.[k], code, `${at}.${k}`)]));
  return now;
}

export type Content = typeof enContent;
type Ui = typeof enUi;
const fill = (s: string, vars: Record<string, string | number> = {}) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

export function make(code: string) {
  const loc = localeOf(code);
  const en = code === DEFAULT;
  const ui = (en ? enUi : merge(enUi, enUi, fileOf(loc.gt, 'ui'), code, 'ui')) as Ui;
  const c = (en ? fresh : merge(fresh, enContent, fileOf(loc.gt, 'content'), code, 'content')) as Content;
  // the battle's words: only what this language changes, so the battle falls back to its own English for the rest
  const battle = en ? {} : Object.fromEntries(Object.entries(merge(freshBattle, enBattle, fileOf(loc.gt, 'battle'), code, 'battle') as Record<string, string>).filter(([k, v]) => v !== freshBattle[k]));
  // and the features of the moves the battle shares with the cards by name (it prints the card's own feature for those),
  // from the translated card text, ending as the battle's English lines do; the battle's own card text (its trait rules,
  // its other moves, its forms') is in battle.json (source.mjs battleSource)
  if (!en) {
    const stop = (t: string) => (/[.!?…。！？]$/.test(t) ? t : `${t}${/^(ja|zh)$/.test(code) ? '。' : '.'}`);
    for (const f of cardLib.fighters) {
      const tc = c.cards[f.id as keyof Content['cards']] as { features?: string[]; rule?: string } | undefined;
      f.moves.forEach((mv, i) => { const tr = tc?.features?.[i]; if (tr && tr !== mv.feature) battle[`card.${f.id}.move.${mv.name}.feature`] = stop(tr); });
    }
  }
  const get = (key: string) => key.split('.').reduce((o: any, k) => o?.[k], ui) as string | undefined;
  const t = (key: string, vars?: Record<string, string | number>) => {
    const s = get(key);
    if (typeof s !== 'string') throw new Error(`i18n: no string ${key}`);
    return fill(s, vars);
  };
  const conj = en ? null : new Intl.ListFormat(loc.lang, { type: 'conjunction' });
  const nf = en ? null : new Intl.NumberFormat(loc.lang, { maximumFractionDigits: 3 });
  return {
    battle,
    code,
    en,
    lang: loc.lang,
    og: loc.og,
    name: loc.name,
    ui,
    c,
    t,
    fill,
    /** a path in this language */
    p: (path: string) => lp(code, path),
    /** a, b and c: the twins' English joins without a serial comma, as they always have */
    and: (xs: string[]) => (conj ? conj.format(xs) : xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs.join('')),
    num: (v: number | string) => (nf && typeof v === 'number' ? nf.format(v) : String(cardLib.M.num(v))),
    disc: (d: string) => (ui.disciplines as Record<string, string>)[d] ?? d,
    /** a fact's unit agreeing with its number (1 commit, 2 commits) */
    unit: (value: number | string, unit: string) => {
      const english = String(cardLib.M.unitOf(value, unit));
      return en ? english : (ui.units as Record<string, string>)[english] ?? english;
    },
    /** a card's move line with its name, untranslated, where {move} stands */
    move: (id: string, i: number, name: string) => c.cards[id as keyof Content['cards']].moves[i].replace('{move}', () => name),
  };
}
export type L = ReturnType<typeof make>;
const cache = new Map<string, L>();
export const L = (code: string = DEFAULT): L => {
  let l = cache.get(code);
  if (!l) cache.set(code, (l = make(code)));
  return l;
};
/** the language of a page from its path */
export const of = (path: string) => L(split(path).code);
