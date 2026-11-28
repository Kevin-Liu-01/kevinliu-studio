// The state a visitor's choices leave behind, shared by this site's inline scripts and the rounds' scripts: the
// localStorage keys, and the one rule for whether sound is wanted. The rounds' copies (gallery.js setMode and
// setPaused, sound.js KEY and preference()) must say the same, so scripts/architecture.test.mjs reads them.
export const KEY = { mode: 'ill-mode', pause: 'ill-pause', sound: 'kevin-liu-studio:sound' };

// sound is wanted when the visitor turned it on, or never chose and does not ask for reduced motion (sound.js
// preference()); as an expression a page's inline script runs
export const SOUND_WANTED = `(function(){try{var k=localStorage.getItem(${JSON.stringify(KEY.sound)});return k==="on"||k===null&&!matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}})()`;
