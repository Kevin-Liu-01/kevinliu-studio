// Whether an SVG mark is drawn in dark ink alone (black or near-black, with white knockouts at most): such a mark
// vanishes on the dark theme, so /about lets it take the text's colour there. A coloured mark keeps its own colours.
const NEUTRAL = new Set(['none', 'transparent', 'white', '#fff', '#ffffff']);
/** @param {string} v */
const rgb = (v) => {
  const m = /^#([0-9a-f]{3,8})$/.exec(v);
  if (!m) return null;
  const h = m[1].length <= 4 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};
/** @param {string} v */
export const isDarkInk = (v) => {
  const c = rgb(v.toLowerCase());
  return !!c && 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] < 0.2 && Math.max(...c) - Math.min(...c) < 0.12;
};
/** @param {string} svg @returns {boolean} */
export function inkOnly(svg) {
  let dark = 0;
  for (const m of svg.matchAll(/\b(?:fill|stroke|stop-color)\s*[=:]\s*["']?([^"';}>]+)/g)) {
    const p = m[1].trim().toLowerCase();
    if (NEUTRAL.has(p) || p.startsWith('url(')) continue;
    if (p === 'currentcolor' || p === 'black' || isDarkInk(p)) dark++;
    else return false;
  }
  return dark > 0;
}
