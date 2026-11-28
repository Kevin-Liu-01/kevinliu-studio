// A public file's address with its content in it (`/ex/ui.css?v=<hash>`), so vercel.json can let browsers keep it for
// a year: a deploy that changes the file changes its address. Only for files a page names itself; the files the
// rounds' scripts load on their own (ground.js, sound.js, the battle's) keep plain addresses and revalidate.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// the content address every ?v= on the site uses: the first 10 hex of the bytes' sha-256
export const contentHash = (bytes: string | Buffer) => crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 10);

const seen = new Map<string, string>();
export function versioned(file: string) {
  let u = seen.get(file);
  if (!u) {
    const hash = contentHash(fs.readFileSync(path.join(process.cwd(), 'public', file)));
    seen.set(file, (u = `${file}?v=${hash}`));
  }
  return u;
}
