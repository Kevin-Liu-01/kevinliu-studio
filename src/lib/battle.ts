// The battle page: r4/play's one page for Mat and Arena (vendor/battle/mat/index.html, synced), split into its head
// and body so the site can add its own metadata. It is served at /battle and /battle/arena with <base> set to the
// folder it was written for, so every relative path in it resolves as authored. The globals that the page computed
// from its own address in the rounds point at this site's copies instead: the card code at /ex/, scene media at
// /battle/r3/, card pictures at /battle/gallery/.
import fs from 'node:fs';
import path from 'node:path';
import { versioned } from './assets';

const SRC = fs.readFileSync(path.join(process.cwd(), 'vendor/battle/mat/index.html'), 'utf8');

function swap(text: string, pairs: [string | RegExp, string][]) {
  for (const [find, to] of pairs) {
    const n = typeof find === 'string' ? text.split(find).length - 1 : (text.match(new RegExp(find, find.flags.includes('g') ? find.flags : find.flags + 'g')) ?? []).length;
    if (n !== 1) throw new Error(`battle page: expected one ${String(find).slice(0, 80)}, found ${n}`);
    text = text.replace(find, to);
  }
  return text;
}

// the page's own sheets and scripts by their content address, so a second visit reuses them without asking (vercel.json)
const own = (attr: 'href' | 'src', file: string): [string, string] => [`${attr}="../${file}"`, `${attr}="${versioned(`/battle/${file}`)}"`];

// the card code is the wall's (round 5 prints the home page's card, r4/play shared/excard.js), served at /ex/
const ex = (attr: 'href' | 'src', file: string): [string, string] => [`${attr}="../../../r4/ex/${file}"`, `${attr}="${versioned(`/ex/${file}`)}"`];

const head = swap(SRC.slice(SRC.indexOf('<head>') + 6, SRC.indexOf('</head>')), [
  [/<title>[^<]*<\/title>\n?/, ''],
  [/<meta name="description"[^>]*>\n?/, ''],
  [/<meta name="viewport"[^>]*>\n?/, ''],
  [/<meta charset="utf-8">\n?/, ''],
  ['<meta name="gallery" content="../../../r3/cards/">', '<meta name="gallery" content="/battle/gallery/">'],
  ["new URL('../../../r3/battle/', location.href).href", "new URL('/battle/r3/', location.href).href"],
  ["new URL('../../../r4/ex/', location.href).href", "new URL('/ex/', location.href).href"],
  ['/\\/arena\\//.test(location.pathname)', '/\\/arena(\\/|$)/.test(location.pathname)'],
  ex('href', 'card.css'),
  own('src', 'shared/pace.js'),
  ...(['shared/room.css', 'vendor/broadcast/stage.css', 'shared/battle.css', 'shared/hud.css'] as const).map((f) => own('href', f)),
]);
const body = swap(SRC.slice(SRC.indexOf('<body>') + 6, SRC.indexOf('</body>')), [
  ['<a class="key" id="leave" href="../../../r3/cards/index.html">Leave</a>', '<a class="key" id="leave" href="/">Leave</a>'],
  ['<p class="mark">Kevin Liu</p>', '<h1 class="mark">Kevin Liu</h1>'],
  ...['fighters.js', 'media.gen.js', 'face.gen.js', 'design/card.js', 'design/plan.gen.js', 'markup.js'].map((f) => ex('src', f)),
  ...['shared/excard.js', 'vendor/cards/art.js', 'vendor/cards/card-env.gen.js', 'vendor/cards/card-sprite.gen.js', 'vendor/broadcast/media.js', 'vendor/broadcast/kit.js', 'shared/battle.js'].map((f) => own('src', f)),
]);
const htmlAttrs = SRC.match(/<html([^>]*)>/)?.[1] ?? '';

export const battlePage = { head, body, htmlAttrs };
