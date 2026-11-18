// The marks /about prints beside its paragraph and elsewhere links, by the link's host (Kevin, 2026-11-18: SVG only,
// from thesvg.org where it has one). The files in src/assets/about/ name their source and licence; each is inlined
// into the page, so it paints with the text and ships no file of its own.
import fs from 'node:fs';
import path from 'node:path';
import { inkOnly, isDarkInk } from './ink.mjs';

const svg = (name: string) => fs.readFileSync(path.join(process.cwd(), 'src/assets/about', `${name}.svg`), 'utf8')
  .replace(/<!--[\s\S]*?-->\s*/g, '')
  .replace(/\s(?:role|aria-label)="[^"]*"/g, '')
  .replace(/<svg\b/, '<svg aria-hidden="true" focusable="false"')
  .trim();
// a mark drawn in dark ink alone takes the text's colour (its dark fills become currentColor), so it reads on both themes
const themed = (s: string) => (inkOnly(s) ? s.replace(/\b(fill|stroke)="(#[0-9a-fA-F]{3,8})"/g, (m, a, v) => (isDarkInk(v) ? `${a}="currentColor"` : m)) : s);
const BRANDS: Record<string, string> = {
  'generaltranslation.com': themed(svg('gt')),
  'www.princeton.edu': themed(svg('princeton')),
  'github.com': themed(svg('github')),
  'www.linkedin.com': themed(svg('linkedin')),
};
// A project logo /about draws inline so its black figure can take the text's colour on the dark theme (site.ts
// ABOUT_INK_FIGURE): only pure black changes; every other colour, and the file itself, stay as the card prints them
export const inlineLogo = (file: string) => fs.readFileSync(path.join(process.cwd(), 'public', file), 'utf8')
  .replace(/<\?xml[^>]*>\s*|<!--[\s\S]*?-->\s*/g, '')
  .replace(/\s(?:role|aria-label)="[^"]*"/g, '')
  .replace(/<svg\b/, '<svg aria-hidden="true" focusable="false"')
  .replace(/\b(fill|stroke)(=")?(:)?\s*(?:#000000|#000|black)\b/gi, (_m, a, eq, colon) => `${a}${eq ?? ''}${colon ?? ''}currentColor`)
  .trim();

// A mark drawn twice, for the light and the dark theme, each inlined; site.css shows the one the theme asks for
export const markPair = ([light, dark]: readonly [string, string]) =>
  svg(light).replace('<svg ', '<svg class="on-light" ') + svg(dark).replace('<svg ', '<svg class="on-dark" ');

export const brandOf = (href: string): string | null => {
  try { return BRANDS[new URL(href).host] ?? null; } catch { return null; }
};
