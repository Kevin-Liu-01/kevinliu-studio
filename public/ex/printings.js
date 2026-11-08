// Art printings (EX.md 24; Kevin 11-05, naming two pictures best for five cards): a card may carry alternate art beside
// its primary. media.gen.js lists a card's printings (tools/media.py, from art/pop/alt/<id>/<label>.json), the primary
// first: [{ label, name, primary: true }, { label, name, pop }]. Each alternate is a subject cut by r4/ex's own tools at
// the box it prints (placed: no family fit moves it), with its own cut ladder and cast. PRINTINGS.apply(el, id, label)
// prints that subject in a card element in place of the one it holds, by rewriting the card's own subject nodes (.pop
// and its img, the glow, the cast), never replacing them, since rituals.js holds them for the tilt and the lift; it marks
// the card data-art. The energy, border, front effect and type stay the card's own, so style (data-card-style) and art
// are independent. The primary comes back from the card as the page first printed it (PRINTINGS.keep, run on every card
// of the page before the gallery copies any). The battle prints the primary only.
(function (root) {
  'use strict';
  const media = () => ((root.MEDIA || {}).media) || {};
  const kept = {};
  const r4 = (v) => Math.round(v * 10000) / 100;
  const IMG = ['src', 'srcset', 'sizes', 'width', 'height'];
  // a card's printings, or null for a card with one picture
  function of(id) {
    const p = (media()[id] || {}).printings;
    return Array.isArray(p) && p.length > 1 ? p : null;
  }
  const attrs = (n, names) => (n ? Object.fromEntries(names.map((a) => [a, n.getAttribute(a)])) : null);
  // the card's own subject as the page printed it, kept once per card
  function keep(el) {
    const id = el && el.dataset && el.dataset.id;
    if (!id || kept[id] || !of(id)) return;
    const pop = el.querySelector('.pop'), img = pop && pop.querySelector('img');
    const glw = el.querySelector('.face > img.glw'), cast = el.querySelector('.en > .cast');
    kept[id] = {
      pop: { style: pop && pop.getAttribute('style'), pixel: !!(pop && pop.hasAttribute('data-pixel')), img: attrs(img, IMG) },
      glw: glw ? attrs(glw, ['style', ...IMG]) : null,
      cast: cast && cast.tagName === 'IMG' ? attrs(cast, ['style', ...IMG]) : null,
      // a storyboard's earlier panels (design/card.js storyboard(), .sb > .sbp > img) print the same subject cut
      sb: [...el.querySelectorAll('.sb > .sbp > img')].map((i) => attrs(i, ['src', 'style'])),
    };
  }
  // an alternate's subject as markup.js prints a subject: its rest cut, with its ladder, rest and lens cuts as srcset
  function made(p, w) {
    const [u0, v0, u1] = p.box;
    const set = [...(p.cuts || []).map(([k, u, cw]) => `${u} ${cw || Math.round(p.lw * k)}w`), `${p.src} ${p.lw}w`, `${p.hi} ${p.w}w`].join(', ');
    const img = { src: p.src, srcset: p.pixel ? null : set, sizes: !p.pixel && w ? Math.ceil(w * (u1 - u0)) + 'px' : null, width: String(p.lw), height: String(Math.round((p.h * p.lw) / p.w)) };
    const g = p.glow, gb = g && (g.box || p.box);
    const glw = g && g.src ? { style: `left:${r4(gb[0])}cqw;top:${r4(gb[1])}cqw;width:${r4(gb[2] - gb[0])}cqw`, src: g.src, srcset: null, sizes: null, width: String(g.lw || p.lw), height: String(Math.round(((g.h || p.h) * (g.lw || p.lw)) / (g.w || p.w))) } : null;
    const c = p.cast;
    const cast = c ? { style: `left:${r4(c.box[0])}cqw;top:${r4(c.box[1])}cqw;width:${r4(c.box[2] - c.box[0])}cqw`, src: c.src, srcset: null, sizes: null, width: String(c.w), height: String(c.h) } : null;
    return { pop: { style: `left:${r4(u0)}cqw;top:${r4(v0)}cqw;width:${r4(u1 - u0)}cqw`, pixel: !!p.pixel, img }, glw, cast };
  }
  const set = (n, a) => { for (const [k, v] of Object.entries(a)) if (v == null) n.removeAttribute(k); else n.setAttribute(k, v); };
  // a glow or a cast: rewritten in place when the card holds one, made when it holds none, hidden when the art has none
  function layer(el, sel, a, cls, after) {
    let n = el.querySelector(sel);
    if (!a) { if (n) n.style.display = 'none'; return; }
    if (!n) {
      if (!after) return;
      n = document.createElement('img');
      n.className = cls; n.alt = ''; n.draggable = false;
      after.after(n);
    }
    set(n, a);
  }
  // print printing `label` in card element el (a wall card, a copy, a sheet's card); returns the label it prints
  function apply(el, id, label) {
    const P = of(id);
    if (!P || !el) return null;
    const want = P.find((p) => p.label === label) || P[0];
    if ((el.dataset.art || P[0].label) === want.label) return want.label;
    const parts = want.primary ? kept[id] : made(want.pop, el.getBoundingClientRect().width || 0);
    const pop = el.querySelector('.pop'), img = pop && pop.querySelector('img');
    if (!parts || !pop || !img) return null;
    pop.setAttribute('style', parts.pop.style);
    pop.toggleAttribute('data-pixel', parts.pop.pixel);
    set(img, parts.pop.img);
    layer(el, '.face > img.glw', parts.glw, 'glw', pop);
    layer(el, '.en > .cast', parts.cast, 'cast', el.querySelector('.en > canvas.ground'));
    // the storyboard's panels follow the subject: the same rest cut, moved by the subject's move from the kept print and
    // drawn at its width (k7 install, 11-06: Atlas's alternate, the first printing on a Storyboard card)
    const K = kept[id], num = (st, k) => parseFloat((new RegExp('(?:^|;)\\s*' + k + ':\\s*(-?[\\d.]+)cqw').exec(st || '') || [])[1]);
    el.querySelectorAll('.sb > .sbp > img').forEach((i, n) => {
      const o = K && K.sb && K.sb[n];
      if (!o) return;
      if (want.primary) { set(i, o); return; }
      const ps = parts.pop.style, ks = K.pop.style;
      const du = num(ps, 'left') - num(ks, 'left'), dv = num(ps, 'top') - num(ks, 'top');
      set(i, { src: parts.pop.img.src, style: `left:${r4((num(o.style, 'left') + du) / 100)}cqw;top:${r4((num(o.style, 'top') + dv) / 100)}cqw;width:${r4(num(ps, 'width') / 100)}cqw` });
    });
    el.dataset.art = want.label;
    return want.label;
  }
  root.PRINTINGS = { of, keep, apply };
  if (typeof document !== 'undefined') {
    const init = () => { for (const el of document.querySelectorAll('.card[data-id]')) keep(el); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
