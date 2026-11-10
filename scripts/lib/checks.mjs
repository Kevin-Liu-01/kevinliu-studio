// Checks the release guard (verify-build.mjs, on dist) and the deployed checks (check-seo.mjs, smoke.mjs, over HTTP)
// both make, kept in one place so they cannot drift.

// the least number of pages the sitemap lists in each language: home, /cards, /about, the two battle pages and the 26 cards
export const PAGES_MIN = 31;

// width and height from a JPEG's start-of-frame marker, or null when the bytes are not a JPEG
export function jpegSize(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return null;
}

// a page's <meta property|name="k" content="...">
export const metaOf = (html) => (k) => html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]*)"`))?.[1];

// what is wrong with a page's share tags: [] when nothing is
export function shareTagProblems(html) {
  const meta = metaOf(html), out = [];
  if (meta('twitter:card') !== 'summary_large_image') out.push('twitter:card is not summary_large_image');
  if (meta('twitter:image') !== meta('og:image')) out.push('twitter:image differs from og:image');
  for (const k of ['og:image:alt', 'twitter:image:alt', 'og:title', 'og:description']) if (!meta(k)?.trim()) out.push(`no ${k}`);
  return out;
}
