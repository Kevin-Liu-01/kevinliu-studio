// The lean-device test, as the JavaScript a page runs: a touch screen, or a device that reports 4 GB of memory or less.
// The wall prints its framed cards plain there, and no page prerenders another page there (Safari keeps several pages
// of a tab in one process, and a prerendered wall or battle holds hundreds of MB; docs/performance.md, Memory). The
// rounds' own copies (ground.js, the battle's runtime, the sync's PHONE patches) move to one shared definition with
// docs/adr/0002-rounds-as-a-pinned-package.md.
export const LEAN = 'matchMedia("(pointer: coarse)").matches||navigator.deviceMemory<=4';

// On a device that is not lean, pressing a link to one of the next pages (the header's links, a card page's pager:
// data-prefetch-later) prerenders it from the pointer's press, so the click lands on a page already drawing. Chromium
// only; the prefetch at idle (Header.astro) still serves every other browser. Not on hover: a page prerendered on hover
// reads the visitor's saved choices (Human or Machine, Pause, sound) once, so a choice made after the hover and before
// the click would land on a page drawn with the old one, and the wall's gallery.js saves the mode it booted with
// (review of 2026-11-28). From the press to the click no choice can change.
export const PRERENDER_NEXT = `if(!(${LEAN})&&HTMLScriptElement.supports&&HTMLScriptElement.supports("speculationrules")){var s=document.createElement("script");s.type="speculationrules";s.textContent=JSON.stringify({prerender:[{source:"document",where:{selector_matches:"a[data-prefetch-later]:not([aria-current])"},eagerness:"conservative"}]});document.head.append(s)}`;
