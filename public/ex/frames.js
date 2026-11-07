// The frame printings (EX.md 25; Kevin, 11-06: "make a thing to select card frames primary and alternate as well in
// addition to the card art"). Loaded after markup.js and design/frames.gen.js. FRAMES.apply(el, id, label) prints another
// of a card's frames on a card element the page has already printed: it replaces the card's own rim and over layer
// (.rim, .rimo) and moves its trim (the energy's mask, the cast and the sleeve), never the card itself, so the tilt, the
// lift, the lens and the art printing (printings.js) keep their handles. The card carries data-bd. Frame and art are
// independent, and both combine with Breakout's data-card-style.
(function (root) {
  'use strict';
  const SETS = () => root.FRAMESETS || {};
  const of = (id) => (SETS()[id] ? SETS()[id].frames : null);
  const primary = (id) => (SETS()[id] ? SETS()[id].primary : null);
  const mask = (u) => (u ? `-webkit-mask-image:url(${u});mask-image:url(${u})` : '');
  function apply(el, id, label) {
    const fs = of(id), f = fs && (fs.find((x) => x.label === label) || fs[0]);
    if (!el || !f) return false;
    const pane = el.querySelector('.pane');
    if (!pane) return false;
    for (const n of el.querySelectorAll(':scope .rim, :scope .rimo')) if (n.closest('.card') === el) n.remove();
    pane.insertAdjacentHTML('beforebegin', f.html);
    // the trim: the energy, the cast under the face and the sleeve follow the frame's die line, or the rounded box
    const en = el.querySelector('.en');
    if (en) { en.style.removeProperty('-webkit-mask-image'); en.style.removeProperty('mask-image'); if (f.trim) en.style.cssText += ';' + mask(f.trim); }
    let tsh = el.querySelector('.body > .tsh');
    if (f.trim) {
      if (!tsh) { tsh = document.createElement('i'); tsh.className = 'tsh'; tsh.setAttribute('aria-hidden', 'true'); tsh.append(document.createElement('i')); el.querySelector('.body').prepend(tsh); }
      tsh.firstElementChild.style.cssText = mask(f.trim);
    } else if (tsh) tsh.remove();
    const sleeve = el.querySelector('.sleeve');
    if (sleeve) { if (f.trim) sleeve.style.setProperty('--trim', `url(${f.trim})`); else sleeve.style.removeProperty('--trim'); }
    el.toggleAttribute('data-trim', !!f.trim);
    el.dataset.bd = f.label;
    return true;
  }
  root.FRAMES = { of, primary, apply };
})(typeof globalThis !== 'undefined' ? globalThis : this);
