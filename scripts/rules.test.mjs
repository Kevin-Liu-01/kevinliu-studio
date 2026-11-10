import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, scanBuffer, gtAllowed, sitePath } from './rules.mjs';
import { hasLocation } from './location.mjs';

const hits = (path, text) => scanBuffer(path, Buffer.from(text));
const P = 'Pok', M = 'mon', N = 'Nin' + 'tendo', GF = ['Game', 'Freak'], G = 'General', T = 'Translation';

test('franchise names are caught however they are written', () => {
  for (const s of [`${P}e${M}`, `${P}é${M}`, `${P}é${M}`, `${P}&eacute;${M}`, `${P}&#233;${M}`, `${P}&#xe9;${M}`, `${P}\\u00e9${M}`, `${P}édex`, `${P}e ball`, `${P}e-${M}`, `${P}e_${M}`, N, `Nin­tendo`, GF.join(' '), GF.join('-'), GF.join('')]) {
    assert.deepEqual(hits('public/ex/x.js', `a ${s} b`), ['franchise name'], s);
  }
});
test('ordinary words are not franchise names', () => {
  for (const s of ['bespoke monogram', 'spoke monthly', 'a bespoke-mono face', 'poker', 'poke the ball', 'the endgame', 'karaoke model']) {
    assert.deepEqual(hits('public/ex/x.js', s), [], s);
  }
});
test('General Translation is caught in every spelling, and allowed only where it belongs', () => {
  for (const s of [`${G} ${T}`, `${G}  ${T}`, `${G}\n${T}`, `${G}-${T}`, `${G}_${T}`, `${G}&nbsp;${T}`, `${G} ${T}`, `${G}${T}`.toLowerCase(), `${G.toUpperCase()} ${T.toUpperCase()}`]) {
    assert.deepEqual(hits('public/ex/gallery.js', s), ['General Translation outside the Atlas card'], s);
    assert.deepEqual(hits('public/ex/fighters.js', s), [], s);
  }
  assert.deepEqual(hits('public/ex/x.js', 'a general purpose translation layer'), []);
});
test('the allow-list reads repo paths and site paths alike', () => {
  assert.equal(sitePath('public/ex/fighters.js'), '/ex/fighters.js');
  assert.equal(sitePath('/ex/fighters.js'), '/ex/fighters.js');
  assert.equal(sitePath('vendor/ex/face.gen.js'), '/vendor/ex/face.gen.js');
  for (const p of ['public/ex/fighters.js', '/ex/fighters.js', 'vendor/ex/copy/overrides.json', '/about.html', '/cards/atlas.md', 'public/ex/media/atlas/pop.webp', 'public/og/atlas.jpg']) assert.equal(gtAllowed(p), true, p);
  for (const p of ['public/ex/gallery.js', '/battle.html', '/cards/elo.html', 'public/battle/shared/battle.js']) assert.equal(gtAllowed(p), false, p);
  // every language prints the same pages; its battle and other cards' pages stay closed
  for (const p of ['/es.html', '/ja/about.html', '/zh/llms-full.txt', '/fr/gallery.js', '/de/cards/atlas.md']) assert.equal(gtAllowed(p), true, p);
  for (const p of ['/es/battle.html', '/ko/cards/elo.html', '/pt/battle/arena.md']) assert.equal(gtAllowed(p), false, p);
});
test('a banned name in a file name is caught', () => {
  assert.deepEqual(hits(`public/ex/media/${P}e-${M}/pop.txt`, 'fine'), ['franchise name in the path']);
  assert.deepEqual(hits(`public/ex/${G}-${T}.txt`.toLowerCase(), 'fine'), ['General Translation in the path']);
});
test('routes and key shapes are read as written', () => {
  assert.deepEqual(hits('public/ex/x.js', 'fetch("/api/submissions")'), ['OMMC participant route']);
  assert.deepEqual(hits('public/ex/x.js', 'fetch("/API/Emails?x")'), ['OMMC participant route']);
  assert.deepEqual(hits('public/ex/x.js', 'headers: { "Xi-Api-Key": k }'), ['ElevenLabs header']);
  assert.deepEqual(hits('public/ex/x.js', 'k = "sk_' + 'a1'.repeat(24) + '"'), ['API key shape']);
  assert.deepEqual(hits('public/ex/x.js', 'fetch("/api/submit")  // task_0123'), []);
  assert.deepEqual(hits('public/sound/out/a.webm', 'xx sk_' + 'A1'.repeat(24) + ' xx'), ['key shape in binary']);
});
test('normalize keeps ordinary text readable', () => {
  assert.equal(normalize('a  b\n-c__d'), 'a b c d');
  assert.equal(normalize('café &amp; &lt;'), 'cafe & &lt;');
});

// EXIF: a TIFF header, then one IFD with one 12-byte entry and the next-IFD offset
const tiff = (le, tag) => {
  const b = Buffer.alloc(26);
  b.write(le ? 'II*\0' : 'MM\0*', 0, 'latin1');
  if (le) { b.writeUInt32LE(8, 4); b.writeUInt16LE(1, 8); b.writeUInt16LE(tag, 10); } else { b.writeUInt32BE(8, 4); b.writeUInt16BE(1, 8); b.writeUInt16BE(tag, 10); }
  return b;
};
test('location metadata is found in EXIF, XMP and the video atoms, and nowhere else', () => {
  assert.equal(hasLocation(Buffer.concat([Buffer.from('junk'), tiff(true, 0x8825)])), 'GPS in EXIF');
  assert.equal(hasLocation(tiff(false, 0x8825)), 'GPS in EXIF');
  assert.equal(hasLocation(tiff(true, 0x010f)), null);
  assert.equal(hasLocation(tiff(false, 0x010f)), null);
  assert.equal(hasLocation(Buffer.from('<x:xmpmeta exif:GPSLatitude="1,2N"/>')), 'GPS in XMP');
  assert.equal(hasLocation(Buffer.from('moov\xa9xyz+37.77-122.41/', 'latin1')), 'location atom');
  assert.equal(hasLocation(Buffer.from('com.apple.quicktime.location.ISO6709')), 'location atom');
  assert.equal(hasLocation(Buffer.from('RIFF....WEBPVP8 plain picture bytes')), null);
  assert.deepEqual(scanBuffer('public/ex/media/elo/pop.webp', Buffer.concat([Buffer.from('RIFF'), tiff(true, 0x8825)])), ['GPS in EXIF']);
});

test('a franchise name split inside the word is caught', () => {
  const A = 'Nin', B = 'tendo';
  for (const s of [`${A}-${B}`, `${A}_${B}`, `${A} ${B}`, `${A}&nbsp;${B}`, `${A}\n${B}`]) assert.deepEqual(hits('public/ex/x.js', `a ${s} b`), ['franchise name'], s);
  for (const s of ['tannin tendons', 'melanin tends', 'a mannequin tendon']) assert.deepEqual(hits('public/ex/x.js', s), [], s);
  assert.deepEqual(hits(`public/ex/${A}_${B}/a.txt`.toLowerCase(), 'fine'), ['franchise name in the path']);
});
