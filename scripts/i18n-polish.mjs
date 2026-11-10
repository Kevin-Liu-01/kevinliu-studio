#!/usr/bin/env node
// What General Translation's output needs before the site prints it, run by `pnpm i18n:translate` after `gt translate`
// (then `gt save-local` keeps the result in the project, so the next translation starts from it):
//   - es, fr, de and pt write a decimal comma: 148.7 ms -> 148,7 ms, ×1.5 -> ×1,5 (never inside a URL, path, version
//     or {placeholder})
// Prints what it changed; changes nothing else.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const COMMA = ['es', 'fr', 'de', 'pt-BR'];
const DEC = /(?<![\w.:/@{-])(\d+)\.(\d+)(?=x\b|[^\w.]|\.(?:\s|$)|$)/g;
const walk = (o, f) => (Array.isArray(o) ? o.map((x) => walk(x, f)) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v, f)])) : typeof o === 'string' ? f(o) : o);
let total = 0;
for (const loc of COMMA) {
  const dir = path.join(ROOT, 'src/i18n', loc);
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const file = path.join(dir, name), raw = fs.readFileSync(file, 'utf8');
    let n = 0;
    const out = walk(JSON.parse(raw), (s) => s.replace(DEC, (_, a, b) => { n++; return `${a},${b}`; }));
    if (!n) continue;
    fs.writeFileSync(file, JSON.stringify(out, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
    console.log(`i18n-polish: ${loc}/${name}: ${n} decimal comma${n > 1 ? 's' : ''}`);
    total += n;
  }
}
if (!total) console.log('i18n-polish: nothing to change');
