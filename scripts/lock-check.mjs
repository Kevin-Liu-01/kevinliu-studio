#!/usr/bin/env node
// The synced folders hold exactly what sync.lock.json records: every listed file is there with the recorded bytes, and
// nothing else is. It needs no rounds folder, so it runs before every build (package.json "build") and in CI.
//   node scripts/lock-check.mjs [repo-root]
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// every folder the sync owns (scripts/sync.mjs STAGES, each rule's `to`)
export const SYNCED = ['public/ex', 'public/og', 'public/sound', 'public/battle', 'vendor/ex', 'vendor/battle'];
// a lock key is a plain relative path inside one of those folders
export const safeKey = (k) => typeof k === 'string' && !k.includes('\\') && !path.isAbsolute(k)
  && !k.split('/').some((s) => s === '..' || s === '.' || s === '') && SYNCED.some((d) => k.startsWith(d + '/'));

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const REPO = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const sha = (buf) => createHash('sha256').update(buf).digest('hex');
  const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);
  const problems = [];
  const lock = JSON.parse(fs.readFileSync(path.join(REPO, 'sync.lock.json'), 'utf8'));
  const listed = new Set();
  for (const [stage, s] of Object.entries(lock.stages ?? {})) {
    for (const [dest, rec] of Object.entries(s.list ?? {})) {
      if (!safeKey(dest)) { problems.push(`${dest}: the lock lists a path outside the synced folders (${stage})`); continue; }
      listed.add(dest);
      const abs = path.join(REPO, dest);
      if (!fs.existsSync(abs)) { problems.push(`${dest}: listed in the lock, missing on disk`); continue; }
      const buf = fs.readFileSync(abs);
      if (buf.length !== rec.bytes || sha(buf) !== rec.sha256) problems.push(`${dest}: differs from the lock (edited by hand, or a sync that stopped halfway)`);
    }
  }
  for (const dir of SYNCED) for (const f of walk(path.join(REPO, dir))) {
    if (path.basename(f) === '.DS_Store') continue; // Finder's own file: git-ignored, never deployed
    const rel = path.relative(REPO, f).split(path.sep).join('/');
    if (!listed.has(rel)) problems.push(`${rel}: in a synced folder but not in the lock (a stray file, or a .tmp a stopped sync left)`);
  }
  if (problems.length) {
    console.error(`lock-check: ${problems.length} problem(s). The synced folders change only through pnpm sync (docs/sync.md):`);
    for (const p of problems.slice(0, 60)) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`lock-check: ${listed.size} synced files match sync.lock.json, nothing extra`);
}
