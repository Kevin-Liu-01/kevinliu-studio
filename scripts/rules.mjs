// The content rules, one copy for the sync's scan (scripts/sync.mjs) and the release guard (scripts/verify-build.mjs).
import { MEDIA, hasLocation } from './location.mjs';

export const TEXT = /\.(js|mjs|css|html|json|md|txt|svg|xml|webmanifest)$/i;

const ENTITY = { eacute: 'é', Eacute: 'É', egrave: 'è', Egrave: 'È', nbsp: ' ', shy: '­', amp: '&', hyphen: '-', dash: '-', ndash: '-', mdash: '-', ensp: ' ', emsp: ' ', thinsp: ' ', zwnj: '', zwj: '' };
// One spelling for every way a name can be written: escapes and entities decoded, accents off, invisible characters
// out, and every run of spaces, hyphens and underscores one space.
export function normalize(text) {
  return text
    .replace(/\\u\{([0-9a-f]{1,6})\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi, (m, a, b, c) => { const n = parseInt(a ?? b ?? c, 16); return n <= 0x10ffff ? String.fromCodePoint(n) : m; })
    .replace(/&#x([0-9a-f]{1,6});|&#(\d{1,7});|&([a-z]+);/gi, (m, h, d, name) => { if (name) return ENTITY[name] ?? m; const n = h ? parseInt(h, 16) : Number(d); return n <= 0x10ffff ? String.fromCodePoint(n) : m; })
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/[­​-‍⁠﻿]/g, '')
    .replace(/[\s_\-‐-―]+/g, ' ');
}

// read on normalize(text) and on normalize(path)
export const NAMES = [[/poke(mon|ball|dex)|\bpoke (mon|ball|dex)|nintendo|game ?freak/i, 'franchise name']];
// read on the text as written (normalizing would break these shapes)
export const RAW = [
  [/\/api\/(submissions|emails)\b/i, 'OMMC participant route'],
  [/xi-api-key/i, 'ElevenLabs header'],
  [/\bsk_[a-f0-9]{40,}\b/i, 'API key shape'],
];
export const GT = /general ?translation/i;
// General Translation appears only in the Atlas card's own records, the pages that print every card's line, and
// Kevin's own bio and facts (docs/content.md). Paths are site paths: a repo path under public/ loses that prefix.
const GT_ALLOWED = new Set([
  '/ex/fighters.js', '/ex/media.gen.js', '/ex/face.gen.js',
  '/vendor/ex/face.gen.js', '/vendor/ex/roster/battle-roster.json', '/vendor/ex/copy/overrides.json',
  '/index.html', '/cards.html', '/cards.md', '/404.html', '/about.html', '/cards/atlas.html',
  '/index.md', '/about.md', '/cards/atlas.md', '/llms.txt', '/llms-full.txt',
]);
export const sitePath = (p) => '/' + p.replace(/^\/+/, '').replace(/^public\//, '');
export const gtAllowed = (p) => GT_ALLOWED.has(sitePath(p)) || /\/atlas[./]/.test(sitePath(p));

// every reason a shipped file may not ship: [] when it may
export function scanBuffer(p, buf) {
  const hits = [];
  const name = normalize(p);
  for (const [re, why] of NAMES) if (re.test(name)) hits.push(`${why} in the path`);
  if (GT.test(name) && !gtAllowed(p)) hits.push('General Translation in the path');
  if (TEXT.test(p)) {
    const raw = buf.toString('utf8'), t = normalize(raw);
    for (const [re, why] of RAW) if (re.test(raw)) hits.push(why);
    for (const [re, why] of NAMES) if (re.test(t)) hits.push(why);
    if (GT.test(t) && !gtAllowed(p)) hits.push('General Translation outside the Atlas card');
  } else {
    const t = buf.toString('latin1');
    if (/xi-api-key/i.test(t) || /sk_[a-f0-9]{40,}/i.test(t)) hits.push('key shape in binary');
    const where = MEDIA.test(p) && hasLocation(buf);
    if (where) hits.push(where);
  }
  return hits;
}
