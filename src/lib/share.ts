// The share images (1200 x 630) for pages the rounds draw none for: /about, /cards, /battle, /battle/arena and the 404.
// Each is built at build time from the cards' own share images (public/og/<id>.jpg, the card cropped out of its
// ground) and the site's face, laid out by satori and rastered by sharp. The face is Katagami Sans at two static
// weights, instanced from public/fonts/katagami-sans-site.woff2 (so it holds exactly the characters the site prints):
//   python3 -c "from fontTools.ttLib import TTFont; from fontTools.varLib import instancer as i
//   for w in (500, 800): f = i.instantiateVariableFont(TTFont('public/fonts/katagami-sans-site.woff2'), {'wght': w}); f.flavor = None; f.save(f'src/share/katagami-sans-{w}.ttf')"
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { fighters, KL_PATH } from './cards';
import { NAME } from './site';

const ROOT = process.cwd();
const W = 1200;
const H = 630;
const fonts = [500, 800].map((weight) => ({ name: 'Katagami Sans', weight: weight as 500 | 800, style: 'normal' as const, data: fs.readFileSync(path.join(ROOT, `src/share/katagami-sans-${weight}.ttf`)) }));

// the card's face inside its own share image (the rounds center it at the same place in every one)
const CARD = { left: 402, top: 42, width: 396, height: 553 };
const cardCache = new Map<string, string>();
async function cardArt(id: string) {
  if (!cardCache.has(id)) {
    const buf = await sharp(path.join(ROOT, `public/og/${id}.jpg`)).extract(CARD).resize(316).jpeg({ quality: 88 }).toBuffer();
    cardCache.set(id, `data:image/jpeg;base64,${buf.toString('base64')}`);
  }
  return cardCache.get(id)!;
}
async function ground(file: string, opts: { blur?: number; darken?: number } = {}) {
  let s = sharp(path.join(ROOT, file)).resize(W, H, { fit: 'cover' });
  if (opts.blur) s = s.blur(opts.blur);
  if (opts.darken) s = s.modulate({ brightness: 1 - opts.darken });
  return `data:image/jpeg;base64,${(await s.jpeg({ quality: 82 }).toBuffer()).toString('base64')}`;
}

type El = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: (El | string)[]): El => ({ type, props: { style: { display: 'flex', ...style }, children } });
const img = (src: string, style: Record<string, unknown>): El => ({ type: 'img', props: { src, style } });
const kl = (size: number, color: string) => img(`data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="8 5 80 80"><path fill="${color}" d="${KL_PATH}"/></svg>`).toString('base64')}`, { width: size, height: size });

const CLAY = '#e9e4dc';
const INK = '#2a2520';
const NIGHT = '#1d1a17';
const card = async (id: string, w: number, extra: Record<string, unknown> = {}) => img(await cardArt(id), { width: w, height: Math.round((w * CARD.height) / CARD.width), borderRadius: Math.round(w * 0.045), boxShadow: '0 18px 40px rgba(20,16,12,0.28)', ...extra });
const word = (text: string, size: number, color: string, weight = 800) => h('div', { fontSize: size, fontWeight: weight, color, lineHeight: 1, letterSpacing: -size * 0.02 }, text);
const signed = (color: string) => h('div', { alignItems: 'center', gap: 14 }, kl(44, color), word(NAME, 34, color));

const TEAM = ['claude-of-tanks', 'katagami', 'bday-land'];
const RIVAL = ['jarhead', 'mailroom', 'cotfly'];
const fan = async (ids: string[], w: number, tilt: number) => h('div', { alignItems: 'center' }, ...(await Promise.all(ids.map((id, i) => card(id, w, { marginLeft: i ? -w * 0.42 : 0, transform: `rotate(${(i - 1) * tilt}deg) translateY(${i === 1 ? -10 : 8}px)` })))));

export const SHARES: Record<string, { alt: string; draw: () => Promise<El> }> = {
  about: {
    alt: `${NAME}, with the Claude of Tanks, Katagami and Turboslide cards`,
    draw: async () => h('div', { width: W, height: H, background: CLAY, alignItems: 'center', justifyContent: 'space-between', padding: '0 96px 0 88px' },
      h('div', { flexDirection: 'column', gap: 26 }, kl(96, INK), word(NAME, 112, INK), word(`${fighters.length} projects as cards`, 34, '#6b6259', 500)),
      await fan(['katagami', 'claude-of-tanks', 'turboslide'], 212, 7)),
  },
  cards: {
    alt: `All ${fighters.length} of ${NAME}'s project cards`,
    draw: async () => {
      const per = Math.ceil(fighters.length / 2);
      const row = async (ids: string[]) => h('div', { gap: 8 }, ...(await Promise.all(ids.map((id) => card(id, 84, { boxShadow: '0 6px 14px rgba(20,16,12,0.22)' })))));
      const ids = fighters.map((f) => f.id);
      return h('div', { width: W, height: H, background: CLAY, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 34 },
        h('div', { flexDirection: 'column', gap: 10, alignItems: 'center' }, await row(ids.slice(0, per)), await row(ids.slice(per))),
        h('div', { alignItems: 'center', gap: 22 }, signed(INK), word(`${fighters.length} cards`, 34, '#6b6259', 500)));
    },
  },
  battle: {
    alt: 'Three project cards against three more on the card mat',
    draw: async () => h('div', { width: W, height: H, background: CLAY, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 },
      h('div', { alignItems: 'center', gap: 40 }, await fan(TEAM, 196, 5), word('vs', 64, INK), await fan(RIVAL, 196, 5)),
      signed(INK)),
  },
  arena: {
    alt: 'Three project cards against three more on the Arena floor',
    draw: async () => h('div', { width: W, height: H, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, backgroundImage: `url(${await ground('public/battle/assets/maps/archive.webp', { blur: 3, darken: 0.35 })})`, backgroundSize: `${W}px ${H}px` },
      h('div', { alignItems: 'center', gap: 40 }, await fan(TEAM, 196, 5), word('vs', 64, CLAY), await fan(RIVAL, 196, 5)),
      signed(CLAY)),
  },
  '404': {
    alt: 'Not found',
    draw: async () => h('div', { width: W, height: H, background: NIGHT, alignItems: 'center', justifyContent: 'center', gap: 70 },
      kl(180, CLAY),
      h('div', { flexDirection: 'column', gap: 22 }, word('Not found', 104, CLAY), word('Every card is at kevinliu.studio', 34, '#b8afa4', 500))),
  },
};

export async function renderShare(name: string) {
  const s = SHARES[name];
  const svg = await satori((await s.draw()) as any, { width: W, height: H, fonts });
  return sharp(Buffer.from(svg)).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}
