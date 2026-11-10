#!/usr/bin/env node
// Writes src/i18n/en/content.json and src/i18n/en/battle.json, English sources General Translation translates
// (gt.config.json): Kevin's bio and facts from src/lib/site.ts, every card's own words from the synced cards
// (src/lib/cards.ts), and the battle's interface words from its synced string table (public/battle/shared/strings.js). The site's interface
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
const { source, battleSource } = await import('../src/i18n/source.mjs');

// content.json from the cards and site.ts; battle.json from the battle's synced string table and trainer roster
const files = [
  ['src/i18n/en/content.json', source({ ...cards, ...site }), 'the cards and site.ts'],
  ['src/i18n/en/battle.json', await battleSource(ROOT), 'the battle\'s synced string table'],
];
let stale = false;
for (const [rel, data, from] of files) {
  const out = JSON.stringify(data, null, 2) + '\n';
  const file = path.join(ROOT, rel);
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (now !== out) { console.error(`i18n: ${rel} is stale; run node scripts/i18n-extract.mjs, then pnpm i18n:translate`); stale = true; }
    else console.log(`i18n: ${path.basename(rel)} matches ${from}`);
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, out);
    console.log(`i18n: wrote ${rel} (${Object.keys(data).length} keys, ${Buffer.byteLength(out)} bytes)`);
  }
}
if (stale) process.exit(1);
