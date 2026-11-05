// The wall's columns and side gutters, derived once (Kevin, 11-03: "i cant see the full cards' text"). EX.md 7 hides a
// card's move and trait text under 225 px and its what line under 240, so the wall never prints a card under FLOOR: it
// takes the most columns at which the card stays FLOOR wide beside the gutters a pop-out needs, up to the 7 x 4 wall's 7,
// and one column under that. The 7 is the reference wall's own: EX.md 8 spreads the hues for its stacks and the families
// keep apart on it, so the gallery never prints an 8th column whose stacks were never checked.
//   gutter(W, n)   ui.css --g, the side gutter, for n columns in a W px window: g + 6 px holds PHONE beside the card
//   cardAt(n, c)   the card's width with n columns in a gallery c css px wide (ui.css .wall --card, without the cap)
//   threshold(n)   the narrowest gallery at which n columns hold FLOOR
//   css()          ui.css's generated block: .wall --cols (and a one-column wall's --g) by container query on the gallery
//                  (exact, scrollbar or not), :root --cols and --g by media query (the header, and the wall from two
//                  columns, on the same rails within a scrollbar's width)
//   sizes()        build.mjs's sizes list for the subjects' cut ladder, the same widths by media query
// node build.mjs writes css() into ui.css between its markers and the sizes into every page; node build.mjs --check fails
// when either is stale. tools/wall-floor.mjs holds the result to the floor and to every card's measured pop-out reach.
export const FLOOR = 240; // EX.md 7: the what line shows from 240 px, the moves' and trait's text from 225
export const MAX = 7; // the 7 x 4 wall
export const POCKET = 12; // a pocket's 6 px padding, both sides
export const GAP = 16; // ui.css --gap: the rows' gap and the columns' least
export const REACH = 0.132; // two pop-outs facing across a column, 0.066W each past their trims (EX.md 13)
export const CG = 4; // ui.css --cg = 0.132W - 4 px, so two trims stand 0.132W + 8 px apart with the pockets
export const PHONE = 0.085; // the widest reach past a trim at a screen edge (Claude of Tanks' smoke): g + 6 >= 0.085W
export const WIDE = 640; // from here the room's gutters are 24 px (ui.css)
const per = (n) => n + REACH * (n - 1); // card widths per row, gaps included
// the side gutter: under WIDE it grows with the screen until g + 6 = PHONE x the card that n columns print with it
//   one column: card = W - 2g - 12; n columns: card = (W - 2g - n POCKET + (n - 1) CG) / per(n)
const coef = (n) => { const k = PHONE / per(n); return [k / (1 + 2 * k), (k * (n * POCKET - (n - 1) * CG) + 6) / (1 + 2 * k)]; };
export const gutter = (W, n) => (W >= WIDE ? 24 : Math.max(16, coef(n)[0] * W - coef(n)[1]));
const vwRule = (n, unit) => { const [a, b] = coef(n); return `max(16px, calc(${(a * 100).toFixed(2)}${unit} - ${b.toFixed(2)}px))`; };
// the two widths ui.css .wall --card takes the narrower of: n cards at the least gap, and n cards whose subjects never
// meet across the column gap (0.132W - 4 between pockets)
export function cardAt(n, c) {
  const g = gutter(c, n);
  return Math.min((c - 2 * g - (n - 1) * GAP) / n - POCKET, (c - 2 * g - n * POCKET + (n - 1) * CG) / per(n));
}
// the narrowest whole px gallery at which n columns hold FLOOR (cardAt rises with c for a fixed n)
export function threshold(n) {
  if (n <= 1) return 0;
  let lo = 0, hi = 8000;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (cardAt(n, m) >= FLOOR) hi = m; else lo = m; }
  return Math.ceil(hi);
}
export const THRESHOLDS = Array.from({ length: MAX - 1 }, (_, i) => [i + 2, threshold(i + 2)]);
export const colsAt = (c) => THRESHOLDS.reduce((k, [n, t]) => (c >= t ? n : k), 1);

const MARK0 = '/* wall-rule:auto (node build.mjs writes this block from tools/wall-rule.mjs; edit the rule there) */';
const MARK1 = '/* wall-rule:end */';
export const MARKS = [MARK0, MARK1];
export function css() {
  const t = THRESHOLDS, T2 = t[0][1];
  return [
    MARK0,
    `/* Columns: the most at which a card stays ${FLOOR} px wide (EX.md 7: under 240 a card hides its what line, under 225 its`,
    `   move and trait text), up to the 7 x 4 wall's ${MAX}: ${t.map(([n, w]) => `${n} from ${w}`).join(', ')}. The wall reads its own`,
    '   gallery\'s width (a container query, so a scrollbar never squeezes a card under the floor); one column holds a whole card',
    '   on a short window but never under the floor. Under 640 the side gutter grows with the screen until g + 6 px holds',
    `   ${PHONE} of the card past its trim (Claude of Tanks' smoke) for the columns it prints. The root's --cols and --g (media`,
    '   queries) only set the header on the same rails. */',
    `.wall { --cols: 1; --g: ${vwRule(1, 'cqw')}; --hcap: calc((100vh - var(--hdr) - var(--dock) - 36px) / 1.397); }`,
    ...t.map(([n, w]) => `@container (min-width: ${w}px) { .wall { --cols: ${n};${n === 2 ? ' --g: inherit; --hcap: inherit;' : ''} } }`),
    `@media (max-width: ${T2 - 0.02}px) { :root { --g: ${vwRule(1, 'vw')}; } }`,
    `@media (min-width: ${T2}px) and (max-width: ${WIDE - 0.02}px) { :root { --g: ${vwRule(2, 'vw')}; } }`,
    ...t.map(([n, w]) => `@media (min-width: ${w}px) { :root { --cols: ${n}; } }`),
    MARK1,
  ].join('\n');
}
// the subjects' sizes: the drawn width at each viewport range, as ui.css computes it (100vw errs a few px wide where a
// scrollbar stands, never narrow; gallery.js resets each subject's sizes to its drawn width after)
export function sizes() {
  const cuts = [...new Set([WIDE, ...THRESHOLDS.map(([, w]) => w)])].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i <= cuts.length; i++) {
    const lo = i ? cuts[i - 1] : 0, hi = cuts[i];
    const n = colsAt(lo), g = lo >= WIDE ? '24px' : vwRule(n, 'vw');
    const hdr = lo < WIDE ? 56 : 64, dock = lo < WIDE ? 82 : 96;
    const f1 = n === 1 ? `100vw - 2 * ${g} - ${POCKET}px` : `(100vw - 2 * ${g} - ${(n - 1) * GAP}px) / ${n} - ${POCKET}px`;
    const f2 = `(100vw - 2 * ${g} - ${n * POCKET - (n - 1) * CG}px) / ${+per(n).toFixed(3)}`;
    // the cap: one column a whole card on screen, from 640 two rows, never under ui.css --tw (250)
    const cap = n === 1 ? `max(250px, (100vh - ${hdr + dock + 36}px) / 1.397)` : lo >= WIDE ? `max(250px, ((100vh - ${hdr + dock + 24 + GAP}px) / 2 - 12px) / 1.397)` : null;
    const w = n === 1 ? `min(${f1}${cap ? `, ${cap}` : ''})` : `min(${f1}, ${f2}${cap ? `, ${cap}` : ''})`;
    out.push([hi == null ? null : `(max-width: ${(hi - 0.02).toFixed(2)}px)`, w]);
  }
  return out;
}
// node tools/wall-rule.mjs prints the rule
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(THRESHOLDS.map(([n, w]) => `${n} columns from ${w} px (card ${cardAt(n, w).toFixed(2)})`).join('\n'));
  console.log(css());
  console.log(JSON.stringify(sizes(), null, 1));
}
