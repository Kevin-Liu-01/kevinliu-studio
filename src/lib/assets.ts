// A public file's address with its content in it (`/ex/ui.css?v=<hash>`), so vercel.json can let browsers keep it for
// a year: a deploy that changes the file changes its address. Only for files a page names itself; the files the
// rounds' scripts load on their own (ground.js, sound.js, the battle's) keep plain addresses and revalidate.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const seen = new Map<string, string>();
export function versioned(file: string) {
  let u = seen.get(file);
  if (!u) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(process.cwd(), 'public', file))).digest('hex').slice(0, 10);
    seen.set(file, (u = `${file}?v=${hash}`));
  }
  return u;
}
