#!/usr/bin/env node
// The site's icons from the kl signature (public/favicon.svg, the mark the Personal Website ships): the touch icon,
// the manifest icons and a two-size favicon.ico (PNG entries). Run after the mark changes: node scripts/icons.mjs
import fs from 'node:fs';
import sharp from 'sharp';

const svg = fs.readFileSync('public/favicon.svg', 'utf8').replace(/<style>.*?<\/style>/s, '');
const mark = (size, pad, ink, ground) => {
  const inner = Math.round(size * (1 - 2 * pad));
  const s = svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `).replace('currentColor', ink);
  return sharp({ create: { width: size, height: size, channels: 4, background: ground } })
    .composite([{ input: Buffer.from(s), gravity: 'center' }]).png().toBuffer();
};
const INK = '#151513', GROUND = '#e9e4dc';
fs.writeFileSync('public/apple-touch-icon.png', await mark(180, 0.14, INK, GROUND));
fs.writeFileSync('public/icon-192.png', await mark(192, 0.14, INK, GROUND));
fs.writeFileSync('public/icon-512.png', await mark(512, 0.14, INK, GROUND));
fs.writeFileSync('public/icon-maskable-512.png', await mark(512, 0.24, INK, GROUND));
// favicon.ico: 16 and 32 px PNG entries on a clear ground
const pngs = [await mark(16, 0.02, INK, { r: 0, g: 0, b: 0, alpha: 0 }), await mark(32, 0.02, INK, { r: 0, g: 0, b: 0, alpha: 0 })];
const head = Buffer.alloc(6 + 16 * pngs.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
let off = head.length;
pngs.forEach((p, i) => {
  const size = i ? 32 : 16, at = 6 + 16 * i;
  head.writeUInt8(size, at); head.writeUInt8(size, at + 1); head.writeUInt16LE(1, at + 4); head.writeUInt16LE(32, at + 6);
  head.writeUInt32LE(p.length, at + 8); head.writeUInt32LE(off, at + 12); off += p.length;
});
fs.writeFileSync('public/favicon.ico', Buffer.concat([head, ...pngs]));
fs.writeFileSync('public/site.webmanifest', JSON.stringify({
  name: 'Kevin Liu', short_name: 'Kevin Liu', start_url: '/', display: 'standalone', background_color: GROUND, theme_color: GROUND,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2) + '\n');
console.log('icons written');
