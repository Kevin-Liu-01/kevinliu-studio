// The marks /about prints beside its paragraph and elsewhere links, by the link's host (Kevin, 2026-11-18: SVG only,
// from thesvg.org where it has one). The files in src/assets/about/ name their source and licence; each is inlined
// into the page, so it paints with the text and ships no file of its own.
import fs from 'node:fs';
import path from 'node:path';

const svg = (name: string) => fs.readFileSync(path.join(process.cwd(), 'src/assets/about', `${name}.svg`), 'utf8')
  .replace(/<!--[\s\S]*?-->\s*/g, '')
  .replace(/\s(?:role|aria-label)="[^"]*"/g, '')
  .replace(/<svg\b/, '<svg aria-hidden="true" focusable="false"')
  .trim();
const BRANDS: Record<string, string> = {
  'generaltranslation.com': svg('gt'),
  'www.princeton.edu': svg('princeton'),
  'github.com': svg('github'),
  'www.linkedin.com': svg('linkedin'),
};
export const brandOf = (href: string): string | null => {
  try { return BRANDS[new URL(href).host] ?? null; } catch { return null; }
};
