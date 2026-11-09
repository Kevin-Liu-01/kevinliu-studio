#!/usr/bin/env node
// Writes src/i18n/en/content.json, the English source General Translation translates (gt.config.json): Kevin's bio and
// facts from src/lib/site.ts and every card's own words from the synced cards (src/lib/cards.ts). The site's interface
// words are src/i18n/en/ui.json, written by hand. Run after `pnpm sync`, then `pnpm i18n:translate`:
//   node scripts/i18n-extract.mjs          write the file
//   node scripts/i18n-extract.mjs --check  fail if the file is not what the cards and site.ts say now
// Product names, move names, trait names, receipts and code never enter the file: a move line names its move as
// {move}, so no translation can rename what the battle engine knows by name.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
process.chdir(ROOT);
const cards = await import('../src/lib/cards.ts');
const site = await import('../src/lib/site.ts');
const { source } = await import('../src/i18n/source.mjs');

const content = source({ ...cards, ...site });
const out = JSON.stringify(content, null, 2) + '\n';
const file = path.join(ROOT, 'src/i18n/en/content.json');
if (process.argv.includes('--check')) {
  const now = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (now !== out) { console.error('i18n: src/i18n/en/content.json is stale; run node scripts/i18n-extract.mjs, then pnpm i18n:translate'); process.exit(1); }
  console.log('i18n: content.json matches the cards and site.ts');
} else {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out);
  console.log(`i18n: wrote ${path.relative(ROOT, file)} (${Object.keys(content.cards).length} cards, ${Buffer.byteLength(out)} bytes)`);
}
