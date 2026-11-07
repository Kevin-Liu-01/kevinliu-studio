// The gallery, the ui lane's: state, keys, the dock, team logic and the inspection's content. Every card
// is face up at first paint (the HTML is prerendered); this file adds state and wiring, and rituals.js
// moves things, through Motion's one loop, on transform, opacity and shader uniforms.
//   hover     the card rises 4 px out of its pocket and tilts toward the hand; its finish answers
//   lift      a click, Enter or Space: the lens opens (rituals.js lifts the card while its world prints out)
//   flip      F, or a click, Enter or Space on the inspected card
//   team      A, the dock's wells, or a drag onto the dock; a refused card springs back
//   pack      the pack tile or an empty well (rituals.js tears it)
//   rival     your third card deals the rival from the deck
//   play      the battle entry (rituals.js), then the battle opens
// Esc, a click outside or a second press ends any sequence; reduced motion crossfades to its end.
(function () {
  'use strict';
  const { RULES, FIGHTERS, Engine, Ground, Motion: M, ART, MARKUP } = globalThis;
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const F = Object.fromEntries(FIGHTERS.map((f) => [f.id, f]));
  const SIZE = RULES.team.size, BUDGET = RULES.team.budget;
  const KS = ART.places(FIGHTERS);
  const params = new URLSearchParams(location.search);
  const BATTLE = new URL($('meta[name="battle"]').content, document.baseURI).href;
  const SND = () => globalThis.Sound || null;
  const snd = (id, o) => SND()?.play(id, o) ?? null;
  const pan = (el) => SND()?.panOf(el) ?? 0;
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('a, button'); if (b && !b.closest('.card, #pause, #sound, [data-mode-set], #play, #pack, .addbtn, .close')) snd('ui.tap'); });
  // The cards that battle holds, with its own costs and budget (tools/agents.mjs reads its roster at build). A pack
  // and the rival's deal draw only those, and a team holding a card it does not hold yet keeps Play held, so Play
  // never opens a battle with other teams than the dock's. Without the tag every card plays.
  const HOLDS = (() => {
    const m = $('meta[name="battle-roster"]');
    if (!m) return null;
    const o = { budget: Infinity, cost: {} };
    for (const t of m.content.trim().split(/\s+/)) { const [k, v] = t.split(':'); if (k === 'budget') o.budget = Number(v); else o.cost[k] = Number(v); }
    return o;
  })();
  const inBattle = (id) => !HOLDS || id in HOLDS.cost;
  const battleTakes = (ids) => !HOLDS || (ids.every(inBattle) && ids.reduce((a, id) => a + HOLDS.cost[id], 0) <= HOLDS.budget);
  const unheld = () => [...S.you, ...S.rival].filter((id) => !inBattle(id)); // the cards in either team it does not hold
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const phoneQ = matchMedia('(max-width: 639px)');
  const RM = () => M.RM;
  // the last hand used: a lens opened from the keyboard puts focus on the card, one opened by pointer
  // keeps it on the dialog itself, so a click never draws a ring
  let viaKeys = false, downOn = null;
  addEventListener('keydown', () => { viaKeys = true; }, true);
  addEventListener('pointerdown', (e) => { viaKeys = false; downOn = e.target; }, true);
  // A click acts only where its press began. A tap's click is hit-tested after its pointerup, so it lands on
  // whatever that pointerup just put under the finger: the pack's packet on the stage, the lens over the card,
  // the lens's own Add To Team. A pointer's click that lands outside the element its press began on is
  // swallowed here, once, for every handler; a mouse's click always lands on an ancestor of its press, and a
  // click from the keyboard or from script carries no press.
  addEventListener('click', (e) => {
    if (!e.isTrusted || e.detail === 0 || !downOn || !downOn.isConnected || e.target.contains(downOn)) return;
    e.stopImmediatePropagation(); e.preventDefault();
  }, true);
  // one status line for the page and one inside the inspect dialog (aria-modal): a message goes where focus is
  const status = $('#status'), insStatus = $('#ins-status');
  const say = (text) => { const s = insStatus && root.classList.contains('inspecting') ? insStatus : status; status.textContent = ''; if (insStatus) insStatus.textContent = ''; setTimeout(() => (s.textContent = text), 30); };
  const and = (xs) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1));
  const { clamp } = M;
  const optsOf = (id) => ({ pass: ART.passOf(F[id].cost), k: KS[id], subject: ART.subjectOf(id) });
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  // the inspection art: media.gen.js names the large file of whichever work leads (art.js FRAME); a card
  // prints its rest file, and the lens, the pack and the entry swap in this one above 280 css px
  const MEDIA = ((globalThis.MEDIA || {}).media) || {};
  // the subject's large cut (media.gen.js pop.hi, from art/pop/<id>.json); a card without one keeps its round-3 art
  const hiOf = (id) => { const m = MEDIA[id] || {}, v = m.pop || m[ART.FRAME[id] && ART.FRAME[id].kind === 'window' ? 'window' : 'object']; return (v && v.hi) || null; };

  // ---------- state ----------
  const S = { you: [], rival: [], seed: Number(params.get('seed')) || ((Date.now() % 99991) + 1), packs: 0 };
  const cost = (id) => F[id].cost;
  const spent = (ids = S.you) => ids.reduce((a, id) => a + cost(id), 0);
  const fits = (id) => S.you.length < SIZE && spent() + cost(id) + (SIZE - S.you.length - 1) <= BUDGET;
  const titleOf = (id) => F[id].title;
  // G is what rituals.js reads: the state, the cards, the wells and the team functions. G.ritual is the
  // live sequence ({ finish() }), or null.
  const G = { S, F, SIZE, BUDGET, $, $$, RM, say, and, optsOf, rectOf, titleOf, cost, spent, fits, hiOf, ritual: null };
  // ---------- mode, theme, pause ----------
  function setMode(mode) {
    root.dataset.mode = mode;
    try { localStorage.setItem('ill-mode', mode); } catch (e) {}
    $$('[data-mode-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modeSet === mode)));
    $$('.seg').forEach((s) => s.style.setProperty('--i', mode === 'machine' ? 1 : 0));
  }
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-mode-set]'); if (b) { snd('ui.mode'); setMode(b.dataset.modeSet); } });
  setMode(root.dataset.mode || 'human');
  const pauseBtn = $('#pause');
  function setPaused(on) {
    const p = on || RM();
    pauseBtn.setAttribute('aria-pressed', String(p));
    Ground.paused = p;
    try { localStorage.setItem('ill-pause', on ? '1' : '0'); } catch (e) {}
  }
  pauseBtn.addEventListener('click', () => { snd('ui.toggle'); setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true'); });
  setPaused('paused' in root.dataset);

  // ---------- the rituals ----------
  const R = globalThis.Rituals(G);
  const { printOf, wake, aim, rest } = R;
  const I = R.I;

  // ---------- cards ----------
  const cards = {};
  G.cards = cards;
  const tiles = $$('.wall > .pocket > :first-child');
  // Every copy of a card (a well, the pack, the lens, a share frame) is cut from the card as it was printed,
  // kept before any script touched it, so no copy carries a ritual's passing state: the lift's hidden card,
  // a tilt, a sleeve, a lens's art.
  const prints = {};
  function copyOf(id) {
    const el = prints[id].cloneNode(true);
    for (const a of ['id', 'role', 'tabindex', 'aria-label', 'aria-describedby', 'aria-keyshortcuts']) el.removeAttribute(a);
    el.setAttribute('aria-hidden', 'true');
    $$('.sr', el).forEach((n) => n.remove());
    return el;
  }
  // The art a copy prints: the rest cut serves a 360 css px card at 2x (720 device px); a copy drawn wider
  // than that on this screen takes the large cut, so no copy decodes more pixels than it shows.
  // A pop-out's rest cut is lw px across its box: it serves the card until the box draws wider than that.
  const DPR = Math.min(devicePixelRatio || 1, 2);
  const restPx = (id) => { const p = (MEDIA[id] || {}).pop; return p ? p.lw / (p.box[2] - p.box[0]) : 720; };
  const cutFor = (id, w) => (w * DPR > restPx(id) ? hiOf(id) : null);
  // a copy drawn at w css px takes the large cut where it needs one, its subject's glow with it (media.gen.js pop.glow);
  // late: once both have decoded, so the copy never shows a blank subject
  // The subject's cut ladder, once media.gen.js carries it (pop.cuts: lw/4 and lw/2 beside the rest and hi cuts, energy
  // ex.4): a copy takes the smallest that covers its drawn device px, so every copy of a subject draws from a file one to
  // two times its size, one decode on every path. A copy cut from the wall carries the wall's srcset, which wins over src,
  // so the copy's srcset goes when its src is set. Without a ladder (pixel art, or before the art lands) it is cutFor.
  const cutOf = (id, w) => {
    const p = (MEDIA[id] || {}).pop;
    if (!p || p.pixel || !Array.isArray(p.cuts) || !p.cuts.length) return cutFor(id, w);
    const d = w * DPR, k = restPx(id);
    for (const [f, src] of p.cuts) if (d <= k * f) return src;
    return d <= k ? p.src : p.hi;
  };
  // A picture the card families own (EX.md 23, design/card.js: a hero, .pop[data-hero], or any subject that is not one of
  // media.gen.js's own files for its card) is never swapped for the media's cut: a copy takes the smallest file of the
  // picture's own srcset that covers its drawn device px (the card's w times the subject box's share of it), else keeps
  // what it prints. ownSet(img) lists [url, px wide] from the srcset, or null for the media's own picture.
  const mediaFiles = (id) => { const p = (MEDIA[id] || {}).pop || {}; return new Set([p.src, p.hi, ...((p.cuts || []).map((c) => c[1]))].filter(Boolean)); };
  function ownSet(img, id) {
    const pop = img && img.closest('.pop');
    if (!img || (!(pop && pop.hasAttribute('data-hero')) && mediaFiles(id).has(img.getAttribute('src')))) return null;
    return (img.getAttribute('srcset') || '').split(',').map((s) => s.trim().split(/\s+/)).filter((x) => x[0] && /w$/.test(x[1] || '')).map(([u, w]) => [u, parseFloat(w)]).sort((a, b) => a[1] - b[1]);
  }
  // the file a subject img takes when its card draws w css px wide, or null to keep it
  function srcFor(img, id, w) {
    const own = ownSet(img, id);
    if (!own) return cutOf(id, w);
    if (!own.length) return null;
    const box = img.closest('.pop'), share = box ? (parseFloat(box.style.width) || 100) / 100 : 1, d = w * share * DPR;
    return (own.find(([, pw]) => pw >= d) || own[own.length - 1])[0];
  }
  function toHi(el, id, w, late) {
    const img = $('img.art, .art > img', el), src = srcFor(img, id, w);
    if (!src) return;
    const own = !!ownSet(img, id), g = !own && cutFor(id, w) && (((MEDIA[id] || {}).pop || {}).glow || {}).hi, glw = g && $('.face > img.glw', el);
    // a storyboard's earlier panels (design/card.js, .sb > .sbp) are cut from the same picture: they take the same file
    const was = img && img.getAttribute('src'), panels = was ? $$('.sb > .sbp > img', el).filter((i) => i.getAttribute('src') === was) : [];
    if (img && was === src && !img.hasAttribute('srcset') && !glw) return;
    const set = () => { if (img) { img.removeAttribute('srcset'); img.src = src; } for (const i of panels) i.src = src; if (glw) glw.src = g; };
    if (!late) { set(); if (img) img.decode().catch(() => {}); return; }
    const load = (u) => { const i = new Image(); i.src = u; return i.decode(); };
    Promise.all([load(src), ...(glw ? [load(g)] : [])]).then(() => { if (el.isConnected) set(); }).catch(() => {});
  }
  Object.assign(G, { copyOf, cutFor, srcFor, toHi });
  $$('.wall .card').forEach((el, i) => {
    const id = el.dataset.id;
    prints[id] = el.cloneNode(true);
    const c = printOf(el, id);
    Object.assign(c, { id, i, f: F[id], pocket: el.parentElement, canvas: $('canvas.ground', el) });
    cards[id] = c;
  });
  // The subjects take their cut by their own drawn width (the cut ladder, markup.js pop() with sizes): the page prints
  // the gallery's own width formula as sizes (build.mjs GALLERY_SIZES), so the first fetch is the cut each screen draws,
  // and a card drawn at any other width (a resize, or a sheet or probe that moves or clones cards onto <body>, as
  // tools/wall.mjs and tools/shots-ex.mjs do) gets its own, so no cut is ever drawn larger than its file. A copy a
  // ritual cuts from the wall drops its srcset (toHi); one that keeps it (a dock well) is drawn smaller than its file.
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver((es) => {
      for (const e of es) {
        const img = e.target.firstElementChild, w = Math.ceil(e.contentRect.width);
        if (img && img.hasAttribute('srcset') && w > 0 && img.getAttribute('sizes') !== w + 'px') img.setAttribute('sizes', w + 'px');
      }
    });
    // the posters and the front effects' posters take their rung the same way (the poster ladder, markup.js): each box's
    // first child is its picture
    const watch = (n) => { for (const img of n.querySelectorAll('.pop > img[srcset], .en > img.poster[srcset], .fx > img[srcset]')) ro.observe(img.parentElement); };
    watch(document);
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) watch(n); }).observe(document.body, { childList: true });
  }

  function labelOf(id) {
    const mine = S.you.includes(id), theirs = S.rival.includes(id);
    return `${titleOf(id)}, ${cost(id)} ink${cost(id) > 1 ? 's' : ''}${mine ? ', in your team' : theirs ? ', in their team' : ''}`;
  }

  // Each pocket's box on the page and each print's size are read at idle, after boot and after a resize, so a
  // hover's first frame reads no layout: the input that starts a hover already pays for its hit test and its
  // :hover restyle, and a read there forced the page's style and layout on top (5 ms of 60 with the CPU
  // slowed 6x). Until the read lands, the hover reads the box itself.
  // The same read takes each card's own box and the closed lens's (it stays laid out, unseen), so a lift, a step and a
  // close read no layout in their frames: where the card stands and where the lens holds it are known.
  let measuredAt = -1, lensAt = null;
  const measure = () => {
    const y = scrollY;
    for (const c of Object.values(cards)) {
      const r = rectOf(c.pocket), e = rectOf(c.el);
      c.home = { x: r.x, y: r.y + y, w: r.w, h: r.h };
      c.at = { x: e.x, y: e.y + y, w: e.w, h: e.h };
      R.measure(c);
    }
    lensAt = ins.hidden ? rectOf(insCard) : null;
    snapDock();
    measuredAt = innerWidth; sy = y;
  };
  // The dock centres itself by translate: -50%, and its width is its Play cell's text, a fraction of a px (526.48 at
  // 1440), so every well card stood at x.26 and printed resampled (E6b: Turboslide's 50 px well card matched 98.9% of
  // its own pixels). Read at idle with the other boxes, the centring is written in whole px, so a well's card stands on
  // the device grid at scale 1, as the pack's climax holds its copies. A phone's dock (no translate) is left alone.
  const dockBar = $('.dock');
  function snapDock() {
    if (!dockBar) return;
    dockBar.style.translate = '';
    if (getComputedStyle(dockBar).translate === 'none') return;
    // its box untranslated: its left edge is the viewport's centre, wherever the scrollbar gutter puts it
    dockBar.style.translate = '0px 0';
    const dpr = devicePixelRatio || 1, r = dockBar.getBoundingClientRect();
    dockBar.style.translate = `${(Math.round((r.left - r.width / 2) * dpr) / dpr - r.left).toFixed(4)}px 0`;
  }
  const measureLater = () => (globalThis.requestIdleCallback || setTimeout)(measure, { timeout: 1000 });
  // the page's scroll as its scroll events leave it, so no frame reads it (window.scrollY lays the page out first)
  let sy = 0;
  addEventListener('scroll', () => { sy = scrollY; }, { passive: true });
  const cardRect = (id) => { const c = cards[id]; return measuredAt === innerWidth && c.at ? { x: c.at.x, y: c.at.y - sy, w: c.at.w, h: c.at.h } : rectOf(c.el); };
  const lensRect = () => (measuredAt === innerWidth && lensAt ? { ...lensAt } : rectOf(insCard));
  if (document.readyState === 'complete') measureLater(); else addEventListener('load', measureLater, { once: true });
  addEventListener('resize', () => { measuredAt = -1; measureLater(); });
  // hover and tilt, the active card only; a fine pointer and motion allowed
  for (const c of Object.values(cards)) {
    const el = c.el;
    // the pocket's box is held while the hand stays (shifted by any scroll since), so no pointermove forces
    // a layout
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || !fine.matches || RM() || G.ritual) return; snd('ui.hover', { pan: pan(el), key: el.dataset.id }); SND()?.load('sig:' + el.dataset.id);
      c.sy = sy;
      c.box = measuredAt === innerWidth && c.home ? { x: c.home.x, y: c.home.y - c.sy, w: c.home.w, h: c.home.h } : rectOf(c.pocket);
      el.classList.add('lift'); c.pocket.classList.add('up');
      c.to.rise = 4; wake(c);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !fine.matches || RM() || c.drag) return;
      if (!c.box) { c.box = rectOf(c.pocket); c.sy = sy; }
      const r = c.box, top = r.y - (sy - c.sy);
      aim(c, clamp((e.clientX - r.x - 6) / (r.w - 12)), clamp((e.clientY - top - 6) / (r.h - 12)));
      { const w = c.box.w, t = e.timeStamp; if (c.tx !== undefined) { const v = ((e.clientX - c.tx) / Math.max(1, t - c.tt)) * 1000 / w; if (c.tdir && Math.sign(v) && Math.sign(v) !== c.tdir && Math.abs(v) > 0.6) snd('card.tilt', { key: el.dataset.id, pan: pan(el) }); if (Math.abs(v) > 0.05) c.tdir = Math.sign(v); } c.tx = e.clientX; c.tt = t; }
      wake(c);
    });
    el.addEventListener('pointerleave', () => {
      c.box = null;
      if (c.drag) return;
      el.classList.remove('lift'); c.pocket.classList.remove('up');
      rest(c);
    });
    el.addEventListener('focus', () => {
      if (!el.matches(':focus-visible') || RM()) return; snd('ui.step', { pan: pan(el) }); SND()?.load('sig:' + el.dataset.id);
      el.classList.add('lift');
      c.sweep = 0; wake(c);
    });
    el.addEventListener('blur', () => { if (!el.matches(':hover')) el.classList.remove('lift'); });
    el.addEventListener('keydown', (e) => onCardKey(e, c));
    bindPress(c);
  }

  // The first input pays a wait once. In this browser the first frame that rasters anything while input is in
  // flight holds 40 to 60 ms with every thread idle, once a page (.work/lane-motion/r2/first-input.mjs: a hover
  // that changes nothing, a frame that only moves layers, a raster with no input in flight and the second
  // card's hover all pay nothing). So the page pays it on its first pointer, key or wheel event, wherever that
  // lands: one card on screen prints its poster at 0.999 for three frames, under half a level, and the hover,
  // lift or pack that follows never meets the wait.
  {
    const kinds = ['pointermove', 'pointerdown', 'keydown', 'wheel'];
    const prime = (e) => {
      if (!e.isTrusted) return;
      for (const k of kinds) removeEventListener(k, prime, true);
      const vh = innerHeight;
      // where each card stands is the idle read's (cardRect), so this first input reads no layout
      const c = Object.values(cards).find((x) => { const r = cardRect(x.id); return r.y + r.h > 0 && r.y < vh; });
      const img = c && $('.poster', c.el);
      if (!img) return;
      img.style.opacity = '0.999';
      let n = 0;
      M.add(() => { if (++n < 3) return true; img.style.opacity = ''; return false; });
    };
    for (const k of kinds) addEventListener(k, prime, { capture: true, passive: true });
  }

  // press, click and drag. A drag starts after 3 px (mouse) or a 300 ms hold (touch), yields to scroll
  const dockEl = $('.dock');
  function bindPress(c) {
    let st = null;
    c.el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || G.ritual) return;
      snd('ui.press', { pan: pan(c.el) }); st = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), type: e.pointerType, moved: false, hold: 0 };
      if (e.pointerType !== 'mouse') st.hold = setTimeout(() => { if (st && !st.moved) startDrag(e); }, 300);
    });
    function startDrag(e) {
      st.drag = true;
      try { c.el.setPointerCapture(st.id); } catch (err) {}
      c.drag = { x: 0, y: 0 };
      c.el.classList.add('lift'); c.pocket.classList.add('up', 'dragging');
      wake(c);
    }
    c.el.addEventListener('pointermove', (e) => {
      if (!st || e.pointerId !== st.id) return;
      const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.drag && Math.hypot(dx, dy) > 3) {
        st.moved = true;
        if (st.type === 'mouse') startDrag(e);
        else { clearTimeout(st.hold); st = null; return; }
      }
      if (st && st.drag) {
        c.drag.x = dx; c.drag.y = dy;
        dockEl.classList.toggle('drop', overDock(e.clientX, e.clientY));
        wake(c);
      }
    });
    c.el.addEventListener('touchmove', (e) => { if (st && st.drag) e.preventDefault(); }, { passive: false });
    const end = (e, cancel) => {
      if (!st || e.pointerId !== st.id) return;
      clearTimeout(st.hold);
      const was = st; st = null;
      if (was.drag) {
        dockEl.classList.remove('drop');
        const into = !cancel && overDock(e.clientX, e.clientY);
        const from = into ? rectOf(c.body) : null;
        c.drag = null;
        c.pocket.classList.remove('dragging');
        if (into) { if (!add(c.id, { from })) refuse(c.id); }
        c.el.classList.remove('lift'); c.pocket.classList.remove('up');
        rest(c);
        return;
      }
      if (!cancel && !was.moved) openInspect(c.id);
    };
    c.el.addEventListener('pointerup', (e) => end(e, false));
    c.el.addEventListener('pointercancel', (e) => end(e, true));
    c.el.addEventListener('click', (e) => { if (e.detail === 0) openInspect(c.id); });
  }
  function overDock(x, y) { const r = dockEl.getBoundingClientRect(); return x >= r.left - 16 && x <= r.right + 16 && y >= r.top - 24 && y <= r.bottom + 8; }

  // keys: arrows walk; Enter and Space press the card as a click does (the lens opens); A adds or removes; F turns over
  // the wall's own column count (ui.css's wall-rule block sets it by the gallery's width, tools/wall-rule.mjs)
  const wallEl = $('.wall');
  function cols() { return (wallEl && Number(getComputedStyle(wallEl).getPropertyValue('--cols'))) || 1; }
  function walk(from, key) {
    const i = tiles.indexOf(from);
    if (i < 0) return;
    const n = cols();
    const j = key === 'ArrowRight' ? i + 1 : key === 'ArrowLeft' ? i - 1 : key === 'ArrowDown' ? i + n : i - n;
    const to = tiles[clamp(j, 0, tiles.length - 1)];
    if (to && to !== from) { to.focus({ preventScroll: true }); to.scrollIntoView({ block: 'nearest', behavior: RM() ? 'auto' : 'smooth' }); }
  }
  function onCardKey(e, c) {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const k = e.key;
    if (/^Arrow/.test(k)) { e.preventDefault(); walk(c.el, k); }
    else if (k === 'a' || k === 'A') { e.preventDefault(); toggle(c.id, { from: rectOf(c.body) }); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); openInspect(c.id); }
    else if (k === 'f' || k === 'F') { e.preventDefault(); snd('card.flip'); c.to.flip = c.to.flip ? 0 : 180; if (RM()) c.flip.x = c.to.flip; wake(c); }
  }
  for (const t of tiles) if (!t.classList.contains('card')) t.addEventListener('keydown', (e) => { if (/^Arrow/.test(e.key)) { e.preventDefault(); walk(t, e.key); } });

  // ---------- your team ----------
  function toggle(id, o) { if (S.you.includes(id)) removeCard(id); else if (!add(id, o)) refuse(id); }
  function add(id, { from = null, silent = false } = {}) {
    if (S.you.includes(id) || !fits(id)) return false;
    if (S.rival.includes(id)) S.rival = [];
    const slot = S.you.length;
    S.you.push(id);
    teamChanged();
    if (!silent) snd(S.you.length === SIZE ? 'team.complete' : 'team.add', from && !RM() ? {} : { offsetMs: 0 });
    if (from && !RM()) R.fly(id, from, wellOf('you', slot));
    if (!silent) say(`${titleOf(id)} joined your team, ${spent()} of ${BUDGET} inks`);
    if (S.you.length === SIZE) formRival();
    return true;
  }
  function removeCard(id) {
    S.you = S.you.filter((x) => x !== id); snd('team.remove');
    teamChanged();
    say(`${titleOf(id)} left your team, ${spent()} of ${BUDGET} inks`);
  }
  function refuse(id) {
    const why = S.you.length >= SIZE ? 'Team Full' : 'Over Budget'; snd('team.refuse');
    say(`${titleOf(id)}: ${why}`);
    const c = cards[id];
    if (c && !RM()) { c.push.v = 520; wake(c); }
    const p = I.print;
    if (p && I.id === id && !RM()) { p.push.v = 520; wake(p); }
  }
  const wells = { you: $$('.dock .you .well'), rival: $$('.dock .rival .well') };
  const wellOf = (who, i) => wells[who][i];
  Object.assign(G, { wells, mini, add });
  function mini(id) {
    const el = copyOf(id);
    $$('canvas, .glare', el).forEach((n) => n.remove());
    return el;
  }
  // The next pack's well cards wait in the empty wells they will fill, unseen (ui.css .premini), cut and laid out at
  // idle (rituals.js ready()), so a pack's card that lands only shows its well's card: cut and laid out as it landed, each
  // landing was a frame of 111 to 213 ms with the CPU slowed 4x (style, layout and paint of a new card in the dock)
  // A pack that completes the team also deals the rival as its last card lands: the rival it will deal is known (formRival's
  // own rule), so its well cards wait too, and the last landing shares its frame with no new card.
  function premini(ids) {
    for (const n of $$('.dock .premini')) n.remove();
    if (!ids) return;
    const wait = (hold, id, theirs) => {
      if (!('id' in hold.dataset)) hold.dataset.id = ($('.card:not(.premini)', hold) || { dataset: {} }).dataset.id || '';
      const m = mini(id);
      m.classList.add('premini');
      if (theirs) m.classList.add('theirs');
      hold.append(m);
      m.offsetWidth; // its style and layout, now, in idle time
    };
    ids.forEach((id, j) => {
      const w = wells.you[S.you.length + j], hold = w && $('.hold', w);
      if (hold && !hold.dataset.id) wait(hold, id, false);
    });
    const you = [...S.you, ...ids];
    if (you.length !== SIZE) return;
    const rival = S.rival.length === SIZE && !S.rival.some((id) => you.includes(id)) ? S.rival : Engine.rivalHand(RULES, FIGHTERS.filter((f) => inBattle(f.id)), you, S.seed);
    rival.forEach((id, j) => {
      const hold = wells.rival[j] && $('.hold', wells.rival[j]);
      if (hold && (('id' in hold.dataset ? hold.dataset.id : ($('.card:not(.premini)', hold) || { dataset: {} }).dataset.id) || '') !== id) wait(hold, id, true);
    });
  }
  G.premini = premini;
  let prerendered = null;
  const was = {};
  function teamChanged() {
    const full = S.you.length >= SIZE;
    // each card's state is one key; a card is written only when its key changes, so adding a card restyles
    // the few cards it touches, not all eighteen
    for (const [id, c] of Object.entries(cards)) {
      const mine = S.you.includes(id), theirs = S.rival.includes(id), nofit = !mine && !fits(id);
      const key = (mine ? 'm' : '') + (theirs ? 't' : '') + (nofit ? 'n' : '');
      if (was[id] === key) continue;
      was[id] = key;
      c.el.classList.toggle('mine', mine);
      c.el.classList.toggle('theirs', theirs);
      c.el.classList.toggle('nofit', nofit);
      c.el.setAttribute('aria-label', labelOf(id));
    }
    wells.you.forEach((w, i) => {
      const id = S.you[i];
      const hold = $('.hold', w);
      if (hold.dataset.id !== (id || '')) {
        hold.dataset.id = id || '';
        // a pack's card lands on the well card that waited for it (premini); any other add cuts its own
        const pre = id && [...hold.children].find((n) => n.classList.contains('premini') && n.dataset.id === id);
        if (pre) { for (const n of [...hold.children]) if (n !== pre) n.remove(); pre.classList.remove('premini'); }
        else hold.replaceChildren(...(id ? [mini(id)] : []));
      }
      w.classList.toggle('full', !!id);
      w.setAttribute('aria-label', id ? `Remove ${titleOf(id)}` : `Fill Team, Slot ${i + 1}`);
      w.tabIndex = id ? 0 : -1;
      w.disabled = !id && full;
    });
    wells.rival.forEach((w, i) => {
      const id = S.rival[i];
      const hold = $('.hold', w);
      if (!('id' in hold.dataset)) hold.dataset.id = ($('.card:not(.premini)', hold) || { dataset: {} }).dataset.id || '';
      if (hold.dataset.id !== (id || '')) {
        hold.dataset.id = id || '';
        const pre = id && [...hold.children].find((n) => n.classList.contains('premini') && n.dataset.id === id);
        if (pre) { for (const n of [...hold.children]) if (n !== pre) n.remove(); pre.classList.remove('premini'); }
        else {
          const m = id ? mini(id) : null;
          if (m) m.classList.add('theirs'); // rimmed in their ink
          hold.replaceChildren(...(m ? [m] : []));
        }
      }
      w.classList.toggle('full', !!id);
    });
    const g = $('.gauge');
    $$('i', g).forEach((sq, i) => sq.classList.toggle('on', i < spent()));
    g.setAttribute('aria-label', `${spent()} of ${BUDGET} inks`);
    const pack = $('#pack');
    if (full) pack.setAttribute('aria-disabled', 'true'); else pack.removeAttribute('aria-disabled');
    pack.setAttribute('aria-label', full ? 'Open Pack, Team Full' : 'Open Pack');
    const both = full && S.rival.length === SIZE, out = both ? unheld() : [];
    const playEl = $('#play');
    // held: both teams exist but the battle does not hold one of their cards yet, and the cell says so (ui.css)
    playEl.dataset.state = !both ? 'wait' : out.length ? 'held' : 'go';
    if (both && !out.length) playEl.removeAttribute('aria-disabled'); else playEl.setAttribute('aria-disabled', 'true');
    playEl.setAttribute('aria-label', !both ? 'Play, Pick Three' : out.length ? `Play, ${and(out.map(titleOf))} Not In The Battle Yet` : 'Play');
    if (I.id) {
      updateAdd();
      const l = $('#lifted');
      if (l) { l.classList.toggle('mine', S.you.includes(I.id)); l.classList.toggle('theirs', S.rival.includes(I.id)); }
    }
    // the six dock cards carry view-transition names; the battle prerenders once both teams exist
    const url = battleUrl();
    [...wells.you, ...wells.rival].forEach((w) => { const card = $('.hold > .card:not(.premini)', w); if (card) card.style.viewTransitionName = url ? 'card-' + card.dataset.id : ''; });
    if (url !== prerendered) {
      prerendered = url;
      const old = $('#prerender');
      if (old) old.remove();
      if (url && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
        // at idle, so the add that completes the teams never shares its frame with the rule
        (globalThis.requestIdleCallback || setTimeout)(() => {
          if (prerendered !== url || $('#prerender')) return;
          const s = document.createElement('script');
          s.type = 'speculationrules'; s.id = 'prerender';
          s.textContent = JSON.stringify({ prerender: [{ source: 'list', urls: [url], eagerness: 'immediate' }] });
          document.head.append(s);
        }, { timeout: 300 });
      }
    }
    R.ready(); // the next pack's copies and packet wait ready, cut at idle
  }
  wells.you.forEach((w, i) => w.addEventListener('click', () => {
    if (G.ritual) return;
    const id = S.you[i];
    if (id) removeCard(id); else openPack({ keyboard: true });
  }));

  // ---------- the rival: dealt from the deck once your team is whole ----------
  function formRival() {
    if (S.rival.length === SIZE && !S.rival.some((id) => S.you.includes(id))) { teamChanged(); return; }
    S.rival = Engine.rivalHand(RULES, FIGHTERS.filter((f) => inBattle(f.id)), S.you, S.seed);
    teamChanged();
    say(`Rival: ${and(S.rival.map(titleOf))}`);
    if (RM()) return;
    R.deal();
  }

  // ---------- the battle: the entry runs, then the battle opens with both teams ----------
  function battleUrl() {
    if (S.you.length < SIZE || S.rival.length < SIZE || !battleTakes(S.you) || !battleTakes(S.rival)) return null;
    return `${BATTLE}#team=${S.you.join(',')}&rival=${S.rival.join(',')}&seed=${S.seed}`;
  }
  let leaving = false, playNext = false;
  function go() {
    const url = battleUrl();
    if (!url || leaving) return;
    if (globalThis.__holdNavigation) return; // the judges' frame-time probe stays on the page
    leaving = true;
    history.replaceState(history.state, '', location.pathname.replace(/\/cards\/[^/]+$/, '/') + location.search + `#you=${S.you.join(',')}&rival=${S.rival.join(',')}&seed=${S.seed}`);
    location.assign(url);
  }
  addEventListener('pageshow', () => { leaving = false; });
  function play() {
    // a press while the rival's deal lands plays once it has landed, so keys alone reach the battle without waiting;
    // Esc forgets it, and a press during any other sequence (a pack's reveal ends on the key itself) does nothing
    if (G.ritual) {
      if (G.ritual.kind === 'deal' && !playNext) { playNext = true; M.add(() => { if (G.ritual && playNext) return true; if (playNext) { playNext = false; play(); } return false; }); }
      return;
    }
    if (!battleUrl()) { // waiting: the button reads Pick Three, or it is held for a card the battle does not hold yet
      const out = unheld();
      if (S.you.length === SIZE && S.rival.length === SIZE && out.length) say(`${and(out.map(titleOf))} ${out.length > 1 ? 'are' : 'is'} not in the battle yet`);
      return;
    }
    if (RM() || !Ground.available) { snd('ui.tap'); go(); return; }
    R.entry(go);
  }
  $('#play').addEventListener('click', play);

  // ---------- the pack's draw: a seeded uniform pick from your team's legal completions ----------
  function completions() {
    const pool = FIGHTERS.map((f) => f.id).filter((id) => !S.you.includes(id) && inBattle(id));
    const need = SIZE - S.you.length, room = BUDGET - spent();
    // a team the battle holds whole is finished only in ways the battle accepts under its own costs
    const strict = S.you.every(inBattle);
    const out = [];
    const rec = (start, pick, c) => {
      if (pick.length === need) { if (c <= room && (!strict || battleTakes([...S.you, ...pick]))) out.push(pick.slice()); return; }
      for (let i = start; i < pool.length; i++) { const k = c + cost(pool[i]); if (k <= room) { pick.push(pool[i]); rec(i + 1, pick, k); pick.pop(); } }
    };
    rec(0, [], 0);
    return out;
  }
  function draw() {
    const all = completions();
    if (!all.length) return null;
    const r = Engine.rng((S.seed + 7919 * ++S.packs) >>> 0);
    const pick = all[Math.floor(r() * all.length)];
    // cheapest first, costliest last; ties keep Kevin's order
    return pick.sort((x, y) => cost(x) - cost(y) || FIGHTERS.findIndex((f) => f.id === x) - FIGHTERS.findIndex((f) => f.id === y));
  }
  G.draw = draw;
  const openPack = R.openPack;

  // ---------- inspection: the lens holds the lifted card and its sheet ----------
  const ins = $('#inspect'), insCard = $('.ins-card', ins), sheetHead = $('.sheet-head', ins), sheetBody = $('.sheet-body', ins);
  const addBtn = $('.addbtn', ins), visit = $('.visit', ins), closeBtn = $('.close', ins), room = $('.room', ins);
  function updateAdd() {
    const id = I.id;
    if (!id) return;
    const mine = S.you.includes(id);
    const state = mine ? 'remove' : fits(id) ? 'add' : S.you.length >= SIZE ? 'full' : 'over';
    addBtn.dataset.state = state;
    if (state === 'full' || state === 'over') addBtn.setAttribute('aria-disabled', 'true'); else addBtn.removeAttribute('aria-disabled');
    addBtn.setAttribute('aria-label', state === 'remove' ? `Remove ${titleOf(id)}` : MARKUP.ADD_LABEL[state]);
  }
  addBtn.addEventListener('click', () => { if (addBtn.getAttribute('aria-disabled') === 'true') { refuse(I.id); return; } toggle(I.id, {}); updateAdd(); });
  // Each card's sheet, typeset and parsed once into a template: at idle after boot, one card per idle
  // period, or on demand. A lift then only clones it.
  const sheets = {};
  const sheetOf = (id) => {
    if (!sheets[id]) { const t = document.createElement('template'); t.innerHTML = MARKUP.sheet(F[id], MEDIA); sheets[id] = t; }
    return sheets[id];
  };
  {
    const idle = globalThis.requestIdleCallback || ((f) => setTimeout(f, 200));
    const queue = FIGHTERS.map((f) => f.id);
    const next = (d) => { while (queue.length && (!d || d.timeRemaining() > 8)) { sheetOf(queue.shift()); if (!d) break; } if (queue.length) idle(next); };
    addEventListener('load', () => idle(next), { once: true });
  }
  // A card's sheet, written into the lens: its head takes the disciplines beside Close, its body the rest.
  // The lift writes it on the frame after the one that shows the card, so no frame lays out both; the sheet
  // shows 120 ms later. It starts at its top, and pointing at a stat on the lifted face lights its row.
  // A scroll position is written only once it has moved (its scroll event says so): writing one lays the page out
  // first, in whatever frame writes it.
  let sheetMoved = false, lensMoved = false;
  sheetBody.addEventListener('scroll', () => { sheetMoved = sheetBody.scrollTop !== 0; }, { passive: true });
  ins.addEventListener('scroll', () => { lensMoved = ins.scrollTop !== 0; }, { passive: true });
  const top0 = (el, moved) => { if (moved) el.scrollTop = 0; return false; };
  function writeSheet(id) {
    sheetMoved = top0(sheetBody, sheetMoved); // before the write, while the lens's layout is clean
    if (sheetBody.dataset.id !== id) {
      const frag = sheetOf(id).content.cloneNode(true);
      $('.disc', sheetHead).replaceWith($('.disc', frag));
      sheetBody.replaceChildren(frag);
      sheetBody.dataset.id = id;
    }
  }
  const litRow = (e, on) => {
    const s = e.target.closest('.stat'), face = s && s.parentElement;
    const row = s && sheetBody.querySelectorAll('.facts li')[[...face.children].indexOf(s)];
    if (row) row.classList.toggle('lit', on);
  };
  // the lens card's box, read once per lens and again only after the lens scrolls or the window resizes, so
  // no pointermove forces a layout
  let lensBox = null;
  const boxOfLens = () => lensBox || (lensBox = rectOf(insCard));
  ins.addEventListener('scroll', () => { lensBox = null; }, { passive: true });
  addEventListener('resize', () => { lensBox = null; });
  // Without a GPU the room is the card's world as the live pour prints it around a lens card at rest, baked
  // once (grounds/<id>.webp, ground.js bakeRoom) and placed where the pour would print it (Ground.roomAt),
  // so the two rooms come from one source; ui.css shows it only then. A lens not yet measured, or a ground
  // without roomAt, takes the card's poster as large as the room.
  function placeRoom(id) {
    const at = Ground.roomAt && I.at ? Ground.roomAt(I.at) : null;
    room.style.setProperty('--room', `url(${at ? 'grounds' : 'posters'}/${id}.webp)`);
    room.style.setProperty('--room-at', at ? `${at.x}px ${at.y}px / ${at.w}px ${at.h}px` : '50% 40% / cover');
    room.classList.toggle('baked', !!at);
    // device px per baked px: nearest sampling keeps every cell only where it is a whole number (ui.css .whole)
    const k = at ? (I.at.w / Ground.ROOM.W) * (devicePixelRatio || 1) : 0;
    room.classList.toggle('whole', k >= 1 && Math.abs(k - Math.round(k)) < 0.01);
  }
  // The info back of a lens copy is styled and laid out only when the card turns over (flipLens): it faces away until
  // then, and printed with the face it made the lift's two longest frames longer (the copy's layout 37 to 49 ms with the
  // CPU slowed 4x, then the lens's restyle as it shows, 31 ms; 19 and 29 without it; .work/room-ex5/t/liftstyle.mjs).
  // Skipped (content-visibility: hidden), its parts take no style, layout, focus or reading until it is let go; let go in
  // a frame of its own after the lift settled, it cost 60 ms of that frame, so the turn that shows it pays for it.
  let lockedBack = null;
  function lockBack(b) { lockedBack = b; b.style.contentVisibility = 'hidden'; }
  function backLive() { const b = lockedBack; lockedBack = null; if (b) b.style.contentVisibility = ''; }
  // A lens copy's print starts on the frame after the copy is written into the lens (live: false, G.lensLive), so its
  // surface reads the copy's box from a layout the browser already did, never forcing one in the frame that wrote it
  let lensLive = null;
  // Art printings (EX.md 24, k6 install 11-05): a card with alternate art (media.gen.js printings, printings.js) shows a
  // plain control in the lens, one button per printing. A press prints that art on the lens card, on its wall card and
  // on every later copy of it (prints[id]) for this visit. Style (data-card-style) and art are independent; the battle
  // prints the primary only.
  const PR = globalThis.PRINTINGS || null;
  const arts = document.createElement('div');
  arts.className = 'arts';
  arts.setAttribute('role', 'group');
  arts.setAttribute('aria-label', 'Art');
  arts.hidden = true;
  $('.acts', ins).append(arts);
  const artNow = {};
  function setArts(id) {
    const P = PR && PR.of(id);
    arts.hidden = !P;
    if (!P) { arts.replaceChildren(); return; }
    const now = artNow[id] || P[0].label;
    arts.replaceChildren(...P.map((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'press';
      b.dataset.art = p.label;
      b.setAttribute('aria-pressed', String(p.label === now));
      const s = document.createElement('span');
      s.textContent = p.name;
      b.append(s);
      return b;
    }));
  }
  function art(id, label) {
    const P = PR && PR.of(id);
    if (!P) return null;
    const want = (P.find((p) => p.label === label) || P[0]).label;
    artNow[id] = want;
    PR.apply(prints[id], id, want);
    if (cards[id]) PR.apply(cards[id].el, id, want);
    const lens = I.id === id ? $('#lifted', insCard) : null;
    if (lens) { PR.apply(lens, id, want); toHi(lens, id, lensRect().w, true); }
    if (I.id === id) setArts(id);
    return want;
  }
  arts.addEventListener('click', (e) => { const b = e.target.closest('button[data-art]'); if (b && I.id) art(I.id, b.dataset.art); });
  // Frame printings (EX.md 25, Kevin 11-06): a card with alternate frames (design/frames.gen.js, frames.js) shows a second
  // plain control beside the art's, one button per frame. A press prints that frame on the lens card, its wall card and
  // every later copy for this visit, independent of the art printing and of the style; the battle prints the primary.
  const FRS = globalThis.FRAMES || null;
  const frs = document.createElement('div');
  frs.className = 'arts frs';
  frs.setAttribute('role', 'group');
  frs.setAttribute('aria-label', 'Frame');
  frs.hidden = true;
  $('.acts', ins).append(frs);
  const frameNow = {};
  function setFrames(id) {
    const F = FRS && FRS.of(id);
    frs.hidden = true;
    if (frs.hidden) { frs.replaceChildren(); return; }
    const now = frameNow[id] || F[0].label;
    frs.replaceChildren(...F.map((f) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'press';
      b.dataset.frame = f.label;
      b.setAttribute('aria-pressed', String(f.label === now));
      const s = document.createElement('span');
      s.textContent = f.name;
      b.append(s);
      return b;
    }));
  }
  function frame(id, label) {
    const F = FRS && FRS.of(id);
    if (!F) return null;
    const want = (F.find((f) => f.label === label) || F[0]).label;
    frameNow[id] = want;
    FRS.apply(prints[id], id, want);
    if (cards[id]) FRS.apply(cards[id].el, id, want);
    const lens = I.id === id ? $('#lifted', insCard) : null;
    if (lens) FRS.apply(lens, id, want);
    if (I.id === id) setFrames(id);
    return want;
  }
  frs.addEventListener('click', (e) => { const b = e.target.closest('button[data-frame]'); if (b && I.id) frame(I.id, b.dataset.frame); });
  function fill(id, { hi = true, live = true } = {}) {
    const el = copyOf(id);
    el.id = 'lifted';
    ins.dataset.side = 'front'; // card.css hides the sheet's what line, trait and moves while the info back shows them
    el.removeAttribute('aria-hidden');
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.classList.add('lift');
    el.classList.toggle('mine', S.you.includes(id));
    el.classList.toggle('theirs', S.rival.includes(id));
    el.setAttribute('aria-label', labelOf(id));
    el.setAttribute('aria-keyshortcuts', 'Enter A Space F');
    // its flip side is the info back: the product, its trait, all four moves and the receipts (markup.js infoBack)
    const back = $('.back', el);
    if (back && MARKUP.infoBack) { const tb = document.createElement('template'); tb.innerHTML = MARKUP.infoBack(F[id], MEDIA); const nb = tb.content.firstElementChild; back.replaceWith(nb); lockBack(nb); }
    if (hi) toHi(el, id, lensRect().w, true);
    insCard.replaceChildren(el);
    placeRoom(id);
    const p = printOf(el, 'lens');
    const at = lensRect();
    R.size(p, at.w, at.h); // its size is the lens's, known: its first frame reads no layout
    p.keepActive = true;
    const cv = $('canvas.ground', el);
    cv.style.opacity = 0;
    const print = () => { if (Ground.available && el.isConnected) { const s = Ground.surface('lens', cv, id, 'fit', optsOf(id)); if (s) s.active = true; } };
    lensLive = null;
    if (live) print(); else lensLive = print;
    // a click on the lens turns it over (the tap that lifted it never reaches it: one press, one click)
    el.addEventListener('click', flipLens);
    // a mouse tilts the lens toward the hand
    lensBox = null;
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || RM()) return;
      const r = boxOfLens();
      aim(p, clamp((e.clientX - r.x) / r.w), clamp((e.clientY - r.y) / r.h)); p.to.rise = 0; wake(p);
    });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') rest(p); });
    // a finger tilts it by dragging, at most 8 degrees, and springs back on release. A gesture that starts
    // upright belongs to the page's scroll: the card's pan-y lets the browser take it, and the tilt
    // never starts.
    let tp = null;
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && !RM()) tp = { id: e.pointerId, x: e.clientX, y: e.clientY, on: false }; });
    el.addEventListener('pointermove', (e) => {
      if (!tp || e.pointerId !== tp.id) return;
      const dx = e.clientX - tp.x, dy = e.clientY - tp.y;
      if (!tp.on) {
        if (Math.hypot(dx, dy) <= 3) return;
        if (Math.abs(dy) > Math.abs(dx)) { tp = null; return; }
        tp.on = true;
      }
      const r = boxOfLens();
      aim(p, clamp(0.5 + dx / r.w), clamp(0.5 + dy / r.h)); p.to.rise = 0; wake(p);
    });
    const release = (e) => { if (tp && e.pointerId === tp.id) { const was = tp.on; tp = null; if (was) rest(p); } };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    visit.href = F[id].url;
    ins.setAttribute('aria-label', titleOf(id));
    p.flipped = 0;
    I.print = p;
    I.id = id;
    updateAdd();
    setArts(id);
    setFrames(id);
    $$('.stat', el).forEach((s) => {
      s.addEventListener('pointerenter', (e) => litRow(e, true));
      s.addEventListener('pointerleave', (e) => litRow(e, false));
    });
    return el;
  }
  function flipLens() {
    const p = I.print;
    if (!p) return; snd('card.flip');
    backLive();
    p.to.flip = p.to.flip ? 0 : 180;
    ins.dataset.side = p.to.flip ? 'back' : 'front';
    if (RM()) p.flip.x = p.to.flip;
    wake(p);
  }
  // While the lens is open the page behind it is inert: Tab, the pointer and assistive technology stay in the
  // dialog, and the one status line outside it still speaks. Switching inert restyles and repaints everything under
  // the switch, and Chrome then lays out every layer on the page again: spread over a lift's frames a piece at a
  // time, that made each of them 30 to 50 ms of main thread with the CPU slowed 6x. So it switches once, whole, in a
  // frame with nothing moving: the lift calls it as the card settles, and the close as the card has landed. Until
  // then the dialog already holds the focus and Tab, covers the page from the pointer, and is aria-modal.
  const behind = $('#behind');
  // inert is inherited: switched on #behind at once it restyled every element under it in one frame (3,615 with a full
  // dock, 229 to 264 ms with the CPU slowed 4x, engineer ex.3). So it switches a piece at a time, in idle time between
  // frames, each piece's restyle paid there (its computed style read at once) within the idle period's budget: the
  // header, each pocket of the wall, each well and the dock's middle, then #behind, whose own switch restyles only the
  // boxes between it and the pieces (a piece already inert keeps its style, so the change stops there). The lift starts
  // it as the card settles; the close wakes #behind and the card's own pocket first, as it starts, and the rest as the
  // card flies home. Until it is whole the dialog already holds the focus and Tab, covers the page from the pointer and
  // is aria-modal.
  // A card is switched in its parts (round ex.5): each part of its face and its back first, then its pocket or well,
  // whose own switch then restyles only the few boxes between them. Switched whole, one card's restyle was 45 to 60 ms
  // with the CPU slowed 6x, more than an idle period, so each piece ran as a long task between the lift's and the
  // close's frames (inertIdle: 271 ms of a lift and 696 ms of a close at 6x, .work/room-ex5/t/lifttr.mjs); a part is a
  // few ms. Waking goes the other way: the pocket first (its parts still inert keep their style), then its parts.
  const holders = () => [...$$('.wall > li', behind), ...$$('.dock .well', behind)];
  const partsOf = (n) => $$('.face > *, .body > .back, .body > .sleeve', n);
  const pieces = (on) => {
    const out = [$('.top', behind)];
    for (const h of holders()) out.push(...(on ? [...partsOf(h), h] : [h, ...partsOf(h)]));
    out.push($('.dock .mid', behind));
    return out.filter(Boolean);
  };
  const idle = globalThis.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 60 }) : (f) => setTimeout(f, 16);
  let inertTo = false, inertTodo = [], inertQueued = false;
  function inertIdle(d) {
    inertQueued = false;
    const t0 = performance.now(), budget = d && !d.didTimeout ? Math.max(4, Math.min(12, d.timeRemaining())) : 6;
    while (inertTodo.length) {
      const n = inertTodo.shift();
      if (n.inert === inertTo) continue;
      n.inert = inertTo;
      getComputedStyle(n).visibility; // its restyle, now, in idle time
      if (performance.now() - t0 >= budget) break;
    }
    if (inertTodo.length && !inertQueued) { inertQueued = true; idle(inertIdle); }
  }
  // now: wake #behind and the card's own pocket in this frame (the close, as the card lands in it), the rest at idle
  function setInert(on, id, now) {
    if (on === inertTo && (inertTodo.length || behind.inert === on)) {
      if (!(now && !on && id && cards[id] && (behind.inert || cards[id].pocket.inert))) return;
    }
    inertTo = on;
    const first = !on && id && cards[id] ? [behind, cards[id].pocket] : [];
    // the card that lands wakes first, its parts next, so it answers the hand before the rest of the page
    const own = first.length ? partsOf(cards[id].pocket) : [];
    inertTodo = [...first, ...own, ...pieces(on).filter((n) => !first.includes(n) && !own.includes(n)), ...(on ? [behind] : [])].filter((n) => n.inert !== on);
    if (now) for (const n of first) if (n.inert) { n.inert = false; inertTodo = inertTodo.filter((x) => x !== n); }
    if (inertTodo.length && !inertQueued) { inertQueued = true; idle(inertIdle); }
  }
  // focus, in a task after this frame, whose style is clean by then: a focus inside a motion frame forced the style of
  // everything the frame had written (89 to 110 ms with the CPU slowed 4x, as the lift poured its world)
  const focusSoon = (fn) => setTimeout(fn, 0);

  // the lift calls these to print the lens and its sheet and to keep the address and the focus; it makes the
  // page behind inert once the card has settled in the lens and lets it go once the close has landed
  Object.assign(G, {
    fill,
    lensLive() { const f = lensLive; lensLive = null; if (f) f(); },
    sheet: writeSheet,
    cardRect,
    lensRect,
    lensTop() { lensMoved = top0(ins, lensMoved); },
    inert: setInert,
    opened(id, push) {
      if (push) { history.pushState({ card: id }, '', `/cards/${id}`); I.pushed = true; }
      const keys = viaKeys;
      focusSoon(() => { if (I.id === id) (keys ? $('#lifted') : ins).focus({ preventScroll: true }); });
    },
    stepped(id) {
      history.replaceState({ card: id }, '', `/cards/${id}`);
      const keys = viaKeys;
      focusSoon(() => { if (I.id === id && !ins.contains(document.activeElement)) (keys ? $('#lifted') : ins).focus({ preventScroll: true }); });
    },
    leaving(fromPop) {
      if (!fromPop) {
        if (I.pushed && history.state && history.state.card) history.back();
        else history.replaceState(null, '', '/' + location.search + location.hash);
      }
      I.pushed = false;
    },
    // the close has landed: the page behind woke as it flew home; the card takes the focus in a task after this frame,
    // whose style is clean by then, so the focus forces no style
    // (#behind and the card's own pocket wake here at the latest, so the focus always lands)
    closed(id) {
      setInert(false, id);
      for (const n of [behind, cards[id].pocket]) if (n.inert) { n.inert = false; inertTodo = inertTodo.filter((x) => x !== n); }
      focusSoon(() => { if (!I.id) cards[id].el.focus({ preventScroll: true }); });
    },
  });
  const openInspect = R.lift.open, closeInspect = R.lift.close, stepTo = R.lift.step, tickInspect = R.lift.tick;
  closeBtn.addEventListener('click', () => closeInspect(false));
  ins.addEventListener('click', (e) => { if (e.target === ins || e.target === insCard || e.target === room) closeInspect(false); });
  addEventListener('popstate', (e) => {
    const id = e.state && e.state.card;
    if (id && cards[id]) openInspect(id, { push: false });
    else if (I.id) closeInspect(true);
  });
  // Keys in the lens, from any focus inside it: arrows step card to card, A adds or removes, F (or Enter and Space
  // on the card, which press it as a click does) turns it over, the up and down keys scroll the sheet, and Tab
  // cycles the dialog's own stops.
  ins.addEventListener('keydown', (e) => {
    if (e.altKey || e.metaKey || e.ctrlKey || !I.id) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowLeft') {
      e.preventDefault();
      const order = FIGHTERS.map((f) => f.id);
      const i = order.indexOf(I.id);
      stepTo(order[(i + (k === 'ArrowRight' ? 1 : order.length - 1)) % order.length]);
    } else if (k === 'a' || k === 'A') { e.preventDefault(); addBtn.click(); }
    else if (k === 'f' || k === 'F' || ((k === ' ' || k === 'Enter') && e.target.id === 'lifted')) { e.preventDefault(); flipLens(); }
    else if (/^(ArrowUp|ArrowDown|PageUp|PageDown)$/.test(k) && sheetBody.scrollHeight > sheetBody.clientHeight + 1 && getComputedStyle(sheetBody).overflowY === 'auto') {
      e.preventDefault();
      const page = sheetBody.clientHeight * 0.85;
      sheetBody.scrollBy({ top: { ArrowUp: -48, ArrowDown: 48, PageUp: -page, PageDown: page }[k], behavior: 'instant' });
    } else if (k === 'Tab') {
      const f = $$('#lifted, .sheet a[href], .sheet button:not([disabled])', ins).filter((n) => n.offsetParent || n.id === 'lifted');
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
    }
  });

  // ---------- global keys: Esc ends any sequence or closes; P plays ----------
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      playNext = false;
      if (G.ritual) { e.preventDefault(); G.ritual.finish(); return; }
      if (I.id) { e.preventDefault(); closeInspect(false); }
    } else if ((e.key === 'p' || e.key === 'P') && !e.target.closest('input, textarea') && !I.id && !e.metaKey && !e.ctrlKey) { play(); }
  });

  // ---------- boot ----------
  function restore() {
    const h = new URLSearchParams(location.hash.slice(1));
    const ids = (k) => (h.get(k) || '').split(',').filter((id) => cards[id]);
    const mine = ids('you'), theirs = ids('rival').filter((id) => !mine.includes(id));
    if (Number(h.get('seed')) > 0) S.seed = Math.floor(Number(h.get('seed')));
    if (!mine.length || mine.length > SIZE || spent(mine) > BUDGET) return;
    S.you = mine;
    if (theirs.length === SIZE && spent(theirs) <= BUDGET && mine.length === SIZE) S.rival = theirs;
    teamChanged();
  }
  restore();
  teamChanged();

  // Without a GPU the canvases stay empty and each poster <img> shows, as at first paint without scripts;
  // a live print reaches the same pixels through its own mipmaps (ground.js view), so none of the three
  // paints pops into another.
  function bootGround() {
    if ('nogpu' in root.dataset) return Promise.resolve(false);
    return Ground.init().then((ok) => {
      if (!ok) { root.dataset.nogpu = ''; return false; }
      Ground.table = getComputedStyle(root).getPropertyValue('--clay').trim() ? '#e6e2dc' : '#e6e2dc';
      for (const c of Object.values(cards)) Ground.surface(c.id, c.canvas, c.id, phoneQ.matches ? 'fit' : 1, optsOf(c.id));
      const tick = (dt) => Ground.frame(dt);
      Ground.driver = () => M.add(tick);
      Ground.paused = pauseBtn.getAttribute('aria-pressed') === 'true';
      if (I.id) {
        const cv = $('#lifted canvas.ground');
        if (cv) { const s = Ground.surface('lens', cv, I.id, 'fit', optsOf(I.id)); if (s) s.active = true; }
        I.pw = 1; M.add(tickInspect);
      }
      return true;
    });
  }
  // a card's own page opens with that card inspected over its world; so does ?og=<id>, for its share loop
  const og = params.get('og');
  // a share frame holds the card and its world, never the controls or the sheet around it
  if (og && og.split(',').every((id) => cards[id])) root.dataset.og = '';
  const lens = root.dataset.lens || (og && cards[og] ? og : '');
  if (lens && cards[lens]) openInspect(lens, { instant: true, push: false });
  const booting = bootGround();
  // window.ogFrame(t), t in [0, 1): one frame of a seamless loop for tools/og.cjs. The worlds hold still
  // (the clock pauses); the hand's light circles the inspected card once, tilting it with the light, so
  // the frame at t = 1 is the frame at t = 0. Resolves once the frame is painted.
  // ?og=a,b,c: the home page's loop, a team of three standing side by side on the clay, the hand's light
  // circling each a third of a turn behind the one before, so the foil travels down the row.
  const trio = og ? og.split(',').filter((id) => cards[id]) : [];
  const ogPrints = [];
  if (trio.length === 3) {
    const row = document.createElement('div');
    row.className = 'og3';
    row.setAttribute('aria-hidden', 'true');
    trio.forEach((id, j) => {
      const el = copyOf(id);
      el.classList.add('lift');
      row.append(el);
      // the cut the copy's drawn size needs (the triptych's cards are about 400 css px): a 2400 px picture under a
      // filter rasters a little differently frame to frame, which broke the loop's seam
      toHi(el, id, el.offsetWidth || 400);
      const pr = printOf(el, 'og-' + j);
      pr.keepActive = true;
      ogPrints.push(pr);
    });
    $('.human').append(row);
  } else if (og && cards[og]) ogPrints.push(null); // the lens: I.print once it is open
  if (ogPrints.length) {
    globalThis.ogFrame = async (t) => {
      await booting;
      if (!ogPrints[0] && !I.print) return false;
      Ground.paused = true;
      const ps = ogPrints[0] ? ogPrints : [I.print];
      ps.forEach((p, j) => {
        if (ps.length > 1 && Ground.available && !Ground.surfaces.get(p.surfId)) {
          const s = Ground.surface(p.surfId, $('canvas.ground', p.el), trio[j], 'fit', optsOf(trio[j]));
          if (s) s.active = true;
        }
        const a = 2 * Math.PI * ((((t - j / ps.length) % 1) + 1) % 1);
        aim(p, 0.5 + 0.32 * Math.sin(a), 0.42 - 0.22 * Math.cos(a));
        for (const k of ['rx', 'ry', 'lu', 'lv', 'lz']) { p[k].x = p.to[k]; p[k].v = 0; }
        wake(p);
      });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      for (const p of ps) { const s = Ground.surfaces && Ground.surfaces.get(p.surfId); if (s) s.dirty = true; }
      Ground.frame(0);
      await new Promise((r) => requestAnimationFrame(r));
      return true;
    };
  }
  addEventListener('resize', () => { if (I.id) { I.at = rectOf(insCard); placeRoom(I.id); M.add(tickInspect); } });

  // read-only state for agents (the twins describe it), and the handles the judges' scripts drive
  globalThis.__table = Object.freeze({
    get order() { return FIGHTERS.map((f) => f.id); },
    get you() { return S.you.slice(); },
    get rival() { return S.rival.slice(); },
    get seed() { return S.seed; },
    get inspected() { return I.id || null; },
    get ritual() { return !!G.ritual; },
    get budget() { return { size: SIZE, inks: BUDGET, spent: spent() }; },
    get battleUrl() { return battleUrl(); },
  });
  // a card's default style (data-style-default, from design/assign.json style; k7 install) prints until the viewer picks
  // a style on the page's switch (styles/breakout/switch.js fires cardstyle): from then every defaulted card, and every
  // later copy of one, takes the pick
  let stylePick = null;
  const takeStyle = (root) => { if (stylePick) for (const c of root.querySelectorAll('.card[data-style-default]')) c.dataset.cardStyle = stylePick; };
  addEventListener('cardstyle', (e) => { stylePick = e.detail === 'breakout' ? 'breakout' : 'ex'; takeStyle(document); });
  new MutationObserver((rs) => { if (stylePick) for (const r of rs) for (const n of r.addedNodes) if (n.nodeType === 1) { if (n.matches('.card[data-style-default]')) n.dataset.cardStyle = stylePick; takeStyle(n); } }).observe(document.body, { childList: true, subtree: true });
  globalThis.Gallery = {
    get state() { return { you: S.you.slice(), rival: S.rival.slice(), seed: S.seed, inspected: I.id, ritual: !!G.ritual, battle: battleUrl() }; },
    openPack, openInspect, closeInspect, play, toggle, completions, finish() { if (G.ritual) G.ritual.finish(); },
    // a card's art printings (EX.md 24): the list, and the one to print (the lens, its wall card and later copies)
    printings(id) { return (PR && PR.of(id)) || null; },
    art,
    // a card's frame printings (EX.md 25): the list, and the one to print, independent of the art
    frames(id) { return (FRS && FRS.of(id)) || null; },
    frame,
    // ms until the running pack's climax (every card turned and printed, before the first leaves), or null
    climaxIn() { const r = G.ritual; return r && r.climax != null ? Math.max(0, r.climax - r.t) : null; },
  };
})();
