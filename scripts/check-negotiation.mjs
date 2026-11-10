#!/usr/bin/env node
// Checks vercel.json's Markdown negotiation without a deployment: the Accept header rule on the four routes that
// rewrite a page to its twin (English and the seven languages, homes and pages), the route that sends Vary: Accept, and that no route labels a missing .md as Markdown.
import fs from 'node:fs';
const { routes } = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const fails = [];
const md = routes.filter((r) => typeof r.dest === 'string' && r.dest.endsWith('.md') && r.has?.some((h) => h.type === 'header' && h.key === 'accept'));
if (md.length !== 4) fails.push(`expected 4 routes that rewrite to a twin on Accept, found ${md.length}`);
// [Accept header, whether the twin is served]
const CASES = [
  ['text/markdown', true],
  ['text/markdown, text/html;q=0.9', true],
  ['text/markdown;q=0.9, text/html;q=0.8', true],
  ['text/markdown;charset=utf-8, text/html;q=0.5', true],
  ['text/plain, text/markdown;q=0.8, text/html;q=0.7', true],
  ['application/json, text/markdown', true],
  ['text/markdown;q=0.5', true],
  ['text/markdown;q=0.01', true],
  ['text/html, text/markdown;q=0.1', false],
  ['text/html,text/markdown', false],
  ['text/markdown;q=0, text/html', false],
  ['text/markdown;q=0.0', false],
  ['text/markdown; q=0', false],
  ['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', false],
  ['*/*', false],
  ['', false],
];
let cases = 0;
for (const r of md) {
  const value = r.has.find((h) => h.key === 'accept').value;
  const re = new RegExp(`^(?:${value})$`); // Vercel matches the value against the whole header
  for (const [accept, want] of CASES) {
    if (re.test(accept) !== want) fails.push(`${r.src}: Accept "${accept}" ${want ? 'must' : 'must not'} get Markdown`);
  }
  cases = CASES.length;
}
const vary = routes.filter((r) => r.headers && Object.keys(r.headers).some((k) => k.toLowerCase() === 'vary'));
if (vary.length !== 1) fails.push(`expected 1 route that sends Vary, found ${vary.length}`);
for (const r of vary) {
  const re = new RegExp(r.src);
  for (const p of ['/', '/about', '/cards', '/cards/atlas', '/battle', '/battle/arena', '/es', '/ja/about', '/zh/cards/atlas', '/pt/battle/arena']) if (!re.test(p)) fails.push(`Vary route does not match ${p}`);
  for (const p of ['/fonts/katagami-sans-site.woff2', '/ex/ui.css', '/cards.md', '/og/home.jpg', '/llms.txt', '/es/gallery.js', '/es/cards.md', '/es/', '/fr/llms.txt']) if (re.test(p)) fails.push(`Vary route matches ${p}`);
}
for (const r of routes) {
  if (r.headers?.['Content-Type']?.startsWith('text/markdown')) fails.push(`${r.src} sets Content-Type text/markdown before the file is found, so a missing .md is labelled Markdown`);
}
const csp = routes.find((r) => r.src === '^/.*$' && r.continue)?.headers?.['Content-Security-Policy'] ?? '';
for (const d of ["frame-ancestors 'self'", "base-uri 'self'", "object-src 'none'"]) if (!csp.includes(d)) fails.push(`Content-Security-Policy lacks ${d}`);
if (/script-src|default-src/.test(csp)) fails.push('Content-Security-Policy must not set script-src or default-src (the pages run inline scripts)');
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log(`negotiation: ${md.length} routes, ${cases} cases pass`);
