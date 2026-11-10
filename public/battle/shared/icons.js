// The battle's own icon set: statuses, self effects, move properties, the nine Kit items and the controls. Drawn new on
// a 24 px grid (2 px strokes, round caps and joins, currentColor), so each icon takes its colour from where it sits.
// The cards' sprite (vendor/cards/card-sprite.gen.js, and r4/ex's icons through shared/excard.js) keeps the seven
// disciplines and the four stats; this set never redraws those.
// One inline sprite, added once; ico(name) prints a <svg><use> the way the cards' K.icon does.
import { t as txt } from './strings.js';

const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="currentColor"';
/** Every symbol's inner markup, keyed by name. */
export const ICONS = {
  // ---- the four conditions
  burn: `<path ${S} d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.2 2.2-4.7 3.3-7.6.4 1.9 1.5 3 2.6 3.4C11 7.4 12.6 4.6 15 3c-.3 3.2 3.5 5.6 3.5 11 0 4-2.7 7-6.5 7z"/><path ${S} d="M12 21c-1.6 0-2.8-1.2-2.8-2.8 0-1.8 1.6-2.6 2.2-4.2 1 1.3 3.4 2.2 3.4 4.2 0 1.6-1.2 2.8-2.8 2.8z"/>`,
  poison: `<path ${S} d="M12 3.5c3.2 4.2 5.5 7.4 5.5 10.5a5.5 5.5 0 0 1-11 0c0-3.1 2.3-6.3 5.5-10.5z"/><circle ${F} cx="10" cy="14.5" r="1.4"/><circle ${F} cx="13.6" cy="17" r="1"/>`,
  sleep: `<path ${S} d="M14.5 4.2A7.8 7.8 0 1 0 19.8 15 6.3 6.3 0 0 1 14.5 4.2z"/><path ${S} d="M16 4h4l-4 4.5h4"/>`,
  stun: `<path ${S} d="M13.5 2.5 5 13.5h6l-1.5 8 9-11h-6z"/>`,
  // ---- what a move does to its own card
  barrier: `<path ${S} d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/><path ${S} d="M8.5 11.5h7"/>`,
  heal: `<rect ${S} x="3.5" y="3.5" width="17" height="17" rx="5"/><path ${S} d="M12 8v8M8 12h8"/>`,
  drain: `<path ${S} d="M12 20.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z"/><path ${S} d="M12 11.5v5M9.8 14.3 12 16.5l2.2-2.2"/>`,
  recoil: `<path ${S} d="M20 7H9.5a5.5 5.5 0 0 0 0 11H13"/><path ${S} d="M16.5 3.5 20 7l-3.5 3.5"/><path ${S} d="M4 4l2 2"/>`,
  crit: `<path ${F} d="M12 1.8l2 7.2 7.2 2-7.2 2-2 7.2-2-7.2L2.8 11 10 9z"/>`,
  // ---- a move's numbers and properties
  power: `<path ${S} d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle ${F} cx="12" cy="12" r="3"/>`,
  accuracy: `<circle ${S} cx="12" cy="12" r="7.5"/><circle ${S} cx="12" cy="12" r="3"/><path ${S} d="M12 1.8v4M12 18.2v4M1.8 12h4M18.2 12h4"/>`,
  pp: `<rect ${S} x="3" y="7" width="16" height="10" rx="2.5"/><path ${S} d="M22 10.5v3"/><path ${F} d="M6 10h2.5v4H6zM10 10h2.5v4H10z"/>`,
  priority: `<path ${S} d="M4 6l6 6-6 6M12 6l6 6-6 6"/>`,
  hits: `<path ${S} d="M3.5 17l5-10M9.5 17l5-10M15.5 17l5-10"/>`,
  pierce: `<path ${S} d="M3 12h16M15 8l4 4-4 4"/><path ${S} d="M10 4.5v15"/>`,
  execute: `<path ${S} d="M6 21V4"/><path ${S} d="M6 4.5h11l-2.5 4 2.5 4H6"/>`,
  adapts: `<path ${S} d="M12 3l8 9-8 9-8-9z"/><path ${S} d="M12 3v18"/>`,
  axis: `<path ${S} d="M4 8h16M4 16h16"/><circle ${F} cx="9" cy="8" r="2.6"/><circle ${F} cx="15.5" cy="16" r="2.6"/>`,
  support: `<path ${S} d="M12 4v4M12 16v4M4 12h4M16 12h4"/><path ${F} d="M12 9.2l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9z"/>`,
  // ---- multipliers
  up: `<path ${F} d="M12 4.5l8 11H4z"/>`,
  down: `<path ${F} d="M12 19.5l-8-11h16z"/>`,
  strong: `<path ${S} d="M5 13l7-7 7 7M5 19l7-7 7 7"/>`,
  weak: `<path ${S} d="M5 5l7 7 7-7M5 11l7 7 7-7"/>`,
  even: `<path ${S} d="M5 9h14M5 15h14"/>`,
  // ---- the turn's other actions and the page's controls
  guard: `<path ${S} d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/><path ${S} d="M8.8 12.2l2.2 2.2 4.4-4.6"/>`,
  switch: `<path ${S} d="M4 8h13M13.5 4.5 17 8l-3.5 3.5M20 16H7M10.5 12.5 7 16l3.5 3.5"/>`,
  bag: `<path ${S} d="M4 9.5h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path ${S} d="M8.5 9.5V7a3.5 3.5 0 0 1 7 0v2.5M4 13.5h16M10 13.5v2h4v-2"/>`,
  log: `<path ${S} d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20"/><circle ${F} cx="4.5" cy="6.5" r="1.4"/><circle ${F} cx="4.5" cy="12" r="1.4"/><circle ${F} cx="4.5" cy="17.5" r="1.4"/>`,
  speed: `<path ${S} d="M4.2 17.5a8.5 8.5 0 1 1 15.6 0"/><path ${S} d="M12 13l4-4.5"/><circle ${F} cx="12" cy="13" r="1.8"/>`,
  turn: `<path ${S} d="M7 3.5h10M7 20.5h10M8 3.5c0 4 8 4.6 8 8.5s-8 4.5-8 8.5M16 3.5c0 2-1.4 3.2-3 4.3M8 20.5c0-1.5 2-2.6 4-3.4 2 .8 4 1.9 4 3.4"/>`,
  trait: `<path ${S} d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z"/><circle ${F} cx="12" cy="12" r="2.6"/>`,
  ko: `<circle ${S} cx="12" cy="12" r="8.5"/><path ${S} d="M8.8 8.8l6.4 6.4M15.2 8.8l-6.4 6.4"/>`,
  skip: `<path ${F} d="M5 5.5l9 6.5-9 6.5z"/><path ${S} d="M18 5.5v13"/>`,
  info: `<circle ${S} cx="12" cy="12" r="8.5"/><path ${S} d="M12 11v5.5"/><circle ${F} cx="12" cy="7.8" r="1.3"/>`,
  auto: `<path ${S} d="M20 12a8 8 0 1 1-2.3-5.6"/><path ${S} d="M20.5 4v4.5H16"/><path ${F} d="M10 9l5 3-5 3z"/>`,
  // sound: a speaker (box and cone) with its two waves (on) or a cross (off), the speaker left of centre
  'sound-on': `<path ${S} d="M3 9.5h3.5L11 5.5v13l-4.5-4H3z"/><path ${S} d="M14.5 9a4.2 4.2 0 0 1 0 6M17.2 6.5a8 8 0 0 1 0 11"/>`,
  'sound-off': `<path ${S} d="M3 9.5h3.5L11 5.5v13l-4.5-4H3z"/><path ${S} d="M15 9.5l5 5M20 9.5l-5 5"/>`,
  field: `<path ${S} d="M2.5 17 8 7h8l5.5 10z"/><path ${S} d="M12 7v10M5.3 12h13.4"/>`,
  // ---- the Kit's nine items
  'code-snippet': `<path ${S} d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15"/>`,
  'api-key': `<circle ${S} cx="7.5" cy="12" r="4"/><path ${S} d="M11.5 12h9M17.5 12v3.5M20.5 12v2.5"/>`,
  'server-patch': `<rect ${S} x="3.5" y="8" width="17" height="8" rx="4" transform="rotate(-35 12 12)"/><path ${F} d="M10.6 10.6h1.2v1.2h-1.2zM12.2 12.2h1.2v1.2h-1.2zM12.2 10.6h1.2v1.2h-1.2zM10.6 12.2h1.2v1.2h-1.2z"/>`,
  'system-restore': `<path ${S} d="M4 12a8 8 0 1 0 2.4-5.7"/><path ${S} d="M3.5 3.5V8H8"/><path ${S} d="M12 8v4.5l3 2"/>`,
  debugger: `<rect ${S} x="7.5" y="7.5" width="9" height="12" rx="4.5"/><path ${S} d="M12 11v8.5M9.5 7.5 8 4.5M14.5 7.5l1.5-3M7.5 12H3.5M7.5 16.5l-3.5 2M16.5 12h4M16.5 16.5l3.5 2"/>`,
  overclock: `<rect ${S} x="5" y="5" width="14" height="14" rx="2"/><path ${S} d="M9 2.5V5M15 2.5V5M9 19v2.5M15 19v2.5M2.5 9H5M2.5 15H5M19 9h2.5M19 15h2.5"/><path ${S} d="M12 15.5v-7M9 11.5l3-3 3 3"/>`,
  firewall: `<rect ${S} x="3" y="5" width="18" height="14" rx="1.5"/><path ${S} d="M3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19"/>`,
  'turbo-mode': `<path ${S} d="M14.5 3.5c3.5 0 6 2.5 6 6L13 17l-6-6z"/><circle ${S} cx="15" cy="9" r="1.6"/><path ${S} d="M7 11l-3.5 1 2 2M13 17l-1 3.5-2-2M6.5 17.5l-3 3"/>`,
  rollback: `<path ${S} d="M11 5.5 4 12l7 6.5zM20 5.5 13 12l7 6.5z"/>`,
};

/** The colours each condition and item category carries (one source for the HUD, the log and the tooltips). */
/** Its words (`label` "Burn", `short` "BRN", `lower` "burn" mid-sentence, `text` the rule) come from shared/strings.js. */
const condition = (k, color) => ({ color, get label() { return txt(`status.${k}`); }, get short() { return txt(`status.${k}.short`); }, get lower() { return txt(`status.${k}.lower`); }, get text() { return txt(`status.${k}.text`); } });
export const STATUS_INFO = { burn: condition('burn', '#e8603c'), poison: condition('poison', '#a64ac9'), sleep: condition('sleep', '#7c8aa6'), stun: condition('stun', '#d9b21f') };

let added = false;
/** Add the sprite to the page once. */
export function ensureIcons() {
  if (added || typeof document === 'undefined') return;
  added = true;
  const body = Object.entries(ICONS).map(([k, v]) => `<symbol id="bi-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('');
  document.body.insertAdjacentHTML('afterbegin', `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">${body}</svg>`);
}
/** One icon as markup. */
export const ico = (name, cls = '') => `<svg class="bi${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#bi-${name}"/></svg>`;
