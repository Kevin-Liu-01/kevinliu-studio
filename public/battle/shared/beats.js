// The four reads of every shot (ROUND6.md section 5): who acts (turn strip, actor tag), what move (tag, matte arrow),
// what it hit (reticle) and what changed (fx.js numeral and post chips), each owned by one element, in both modes.
// Every beat here is an outline, a hue, a small pill or a stroke that fades in at most 0.35 of its area's luminance:
// none adds a luminance flash, and none extends a shot (they live inside the pre-roll, the scene and the settle).
//
// The page wires it (lane I): createBeats(app, () => layout, { mhud, cardOf, title, formOf, reduced, auto }), then
//   onEvent(e)            for every event that lands (the `turn` event fills the strip),
//   onShot(shot, phase)   in the page's onShot (plan, prepared, start, board, impact, end): tag, reticle, arrow;
// the frozen calls (strip, tag, reticle, arrow, clear) stay available for a page that wires them one by one.
// install() takes fullTail (beside holdNumber), contactReticle (the `contact` effect) and transformDefs.
import { formInfo, formKey, stillHtml, levelWord } from './tower.js';
import { t as txt, list as listOf } from './strings.js';
import { FORMS } from './forms.js';
import { clearReads, clearCall, drawnBox, bodyBox, noteShot, numeral, NUMBER_HOLD, READ_STILL, CLEAR_MS } from './fx.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const other = (s) => (s === 'player' ? 'rival' : 'player');
const sideWord = (s) => txt(s === 'player' ? 'side.you' : 'side.rival');
const SIDE_COLOUR = (s) => (s === 'player' ? 'var(--you, oklch(55% 0.15 255))' : 'var(--rival, oklch(56% 0.2 30))');
/** The verb a priority action reads as in the strip, in place of its card. */
const VERB = { switch: 'verb.switch', item: 'verb.kit', build: 'verb.build', upgrade: 'verb.upgrade', guard: 'verb.guard' };
/** How long the tag and the reticle stand around the contact (ROUND6.md section 5.1), ms. */
export const TAG = { in: 120, slide: 12, short: 400, shortOut: 160, auto: 300, autoOut: 120, cut: 450, cutOut: 50 };
export const RETICLE = { snap: 140, from: 1.25, hold: 300, out: 120, cut: 450, cutOut: 50, miss: 200, spread: 1.4 };
/** A cut's tag and reticle stand from its plan until its contact, however long the board holds that contact (a
 *  defender's last number still being read, an attacker still flying home), then their 450 ms (fixes-2 R2); past
 *  this a cut that never reached its contact lets them go. */
const CUT_WAIT = 4000;
/** Frames on the page's clock (shared/pace.js patches it, so a frozen clock steps the reticle too). */
const raf = (f) => requestAnimationFrame(f);

/** The four corners of a reticle, in its box (an <i> per corner; legs from the CSS, 14% of the short side). */
function corners(parent, skin = '') {
  const r = document.createElement('div');
  r.className = 'rtc';
  if (skin) r.dataset.skin = skin;
  r.setAttribute('aria-hidden', 'true');
  for (const c of ['tl', 'tr', 'bl', 'br']) { const i = document.createElement('i'); i.dataset.c = c; r.append(i); }
  parent.append(r);
  return r;
}
/** Jarhead's attacks wear its own capture corners (fx/jarhead/fx.svg), still in the attacker's side colour. */
const skinOf = (card) => (card === 'jarhead' ? 'capture' : '');

/** `host` the element the beats draw in (#app), `layout` the mounted board or a function returning it (a mode switch
 *  changes it), `o` { mhud, cardOf(uid), title(id), formOf(fighter), reduced(), auto() }. */
export function createBeats(host, layout, o = {}) {
  const L = () => (typeof layout === 'function' ? layout() : layout);
  const rd = () => Boolean(o.reduced?.() ?? document.documentElement.dataset.reduced === 'true');
  const auto = () => Boolean(o.auto?.());
  const title = (id) => { try { return o.title?.(id) ?? window.showdown.engine.fighterDef(id).title; } catch { return id; } };
  const layer = document.createElement('div');
  layer.className = 'beats';
  layer.setAttribute('aria-hidden', 'true');
  host.append(layer);
  const tagEl = document.createElement('div');
  tagEl.className = 'atag';
  tagEl.dataset.on = 'false';
  layer.append(tagEl);
  const rtcBox = document.createElement('div');
  rtcBox.className = 'rtc-box';
  rtcBox.dataset.on = 'false';
  layer.append(rtcBox);
  let rtc = corners(rtcBox);
  const timers = new Set();
  const later = (ms, f) => { const t = setTimeout(() => { timers.delete(t); f(); }, Math.max(0, ms)); timers.add(t); return t; };
  let tagShot = null, rtcShot = null, cutShot = null, follow = 0, order = [], stripEl = null;
  /** The shots whose scene has started: a full scene's tag never comes in after it (fixes-3 R1: a tag that waited for a
   *  number on the actor came in at 600 ms and stood under the title to 1800). */
  const started = new WeakSet();
  /** What the probes read (?debug): the tag's text and box, the reticle's target, per shot. */
  const seen = (window.__beats = window.__beats ?? { tags: [], reticles: [], strip: [] });
  const DEBUG = /[?&]debug\b/.test(location.search);

  // ---------- the turn strip: who acts, in order, before anyone acts
  function stripSlot() {
    if (stripEl?.isConnected) return stripEl;
    stripEl = host.querySelector('.ttab .tt-order');
    return stripEl;
  }
  function drawStrip() {
    const s = stripSlot();
    if (!s) return;
    const html = order.map((x, i) => {
      const verb = VERB[x.action] ? txt(VERB[x.action]) : undefined;
      const id = o.cardOf?.(x.uid) ?? '';
      const icon = !verb && id ? discIcon(id) : '';
      return `${i ? '<i class="to-sep" aria-hidden="true">›</i>' : ''}<span class="to-chip" data-side="${x.side}" data-state="${x.state}"><i class="to-side">${esc(sideWord(x.side))}</i>${icon}<b>${esc(verb ?? title(id))}</b></span>`;
    }).join('');
    if (s.dataset.k !== html) { s.dataset.k = html; s.innerHTML = html; }
    s.closest('.ttab')?.toggleAttribute('data-order', order.length > 0);
  }
  const discIcon = (id) => { try { const d = window.showdown.engine.fighterDef(id).disciplines[0]; return `<span class="to-d">${window.bcKit.icon(d.toLowerCase())}</span>`; } catch { return ''; } };
  /** The strip from a `turn` event's order; `null` clears it (a new command phase). */
  function strip(turnEvent) {
    order = (turnEvent?.order ?? []).map((x) => ({ side: x.side, uid: x.uid, action: x.action ?? 'move', state: 'next' }));
    drawStrip();
    if (DEBUG) seen.strip.push(order.map((x) => `${x.side}:${x.action}`).join(' '));
  }
  /** The shot now playing lights its side's chip (a 2 px underline in its side colour); earlier ones dim. */
  function stripAt(shot) {
    const s = shot?.scene;
    if (!s || !order.length) return;
    const acting = s.kind === 'attack' || s.kind === 'transform' || s.kind === 'guard' || s.kind === 'item' || (s.kind === 'switch' && shot.post?.[0]?.reason === 'choice');
    if (!acting) return;
    const i = order.findIndex((x) => x.side === s.side && x.state !== 'done');
    if (i < 0) return;
    order.forEach((x, j) => { if (j < i || (x.state === 'now' && j !== i)) x.state = 'done'; });
    order[i].state = 'now';
    drawStrip();
  }

  // ---------- the actor tag: side, discipline, move name (a tower's still first), over the acting figure or card
  function tagHtml(shot) {
    const s = shot.scene, side = s.side;
    let still = '', name = s.move?.name ?? s.title ?? '', icon = '';
    if (s.kind === 'transform') {
      const e = (shot.post ?? []).find((x) => x.kind === 'transform');
      const to = e?.to ?? { form: s.move?.id, level: 1 };
      const info = formInfo(s.card, to.form, o.forms ?? FORMS);
      still = stillHtml(formKey(to.form, to.level ?? 1), { h: 24, hi: true, card: s.card, accent: e?.accent ?? info.accent, cls: 'tw-still tw-plate atag-still' });
      // (the rules' label is English, 'New' or 'Level 3': it is read here, never shown)
      name = txt((e?.change ?? s.change) === 'upgrade' ? 'verb.upgrade' : (e?.change ?? s.change) === 'build' || !s.label || s.label === 'New' ? 'verb.build' : /^(\d|Level)/.test(String(s.label)) && e?.from?.form === e?.to?.form ? 'verb.upgrade' : 'verb.build');
    } else {
      const f = actorOf(shot);
      const fo = f && o.formOf?.(f);
      if (fo) still = stillHtml(fo.key, { h: 24, hi: true, card: s.card, accent: fo.accent, cls: 'tw-still tw-plate atag-still' });
      const d = s.move?.discipline;
      if (d && d !== 'Neutral') { try { icon = `<span class="atag-d" style="--d:${window.bcKit.DISCIPLINE_COLOR[d]}">${window.bcKit.icon(d.toLowerCase())}</span>`; } catch { icon = ''; } }
    }
    return `<i class="atag-side">${esc(sideWord(side))}</i>${still}${icon}<b>${esc(name)}</b>`;
  }
  /** The acting fighter from the shot's own events (its state at the start of the shot). */
  function actorOf(shot) {
    const s = shot.scene, e = [...(shot.pre ?? []), ...(shot.post ?? [])].find((x) => x.state);
    const v = e?.state;
    return v ? v.sides[s.side].team[v.sides[s.side].active] : null;
  }
  /** A figure's drawn box on screen (viewport px; fx.js drawnBox), null where the layout has no such figure. */
  const drawnOf = (side) => drawnBox(L(), side);
  /** The acting figure or card on screen (viewport px): the layout's tag box when it has one, else its drawn box. */
  const boxOf = (side) => {
    const l = L();
    try {
      if (l?.tagBox) return l.tagBox(side);
      // (the body as drawn: while a special carries the figure, its flying picture, fixes-3 R5)
      const d = bodyBox(l, side);
      if (d) return d;
      // the Arena: the active figure's box (board px) through the camera, so a canvas figure (a tower) is found too
      const f = l?.active?.(side), c = l?.cam;
      if (f?.box && c && Number.isFinite(c.k)) return new DOMRect(c.x + c.k * f.box.x, c.y + c.k * f.box.y, c.k * f.box.w, c.k * f.box.h);
      return l?.anchor?.('target', side) ?? null;
    } catch { return null; }
  };
  /** The reads a tag must never cover (viewport px): every numeral and its tags, every chip row (made, even before its
   *  chips show) and the multiplier call-out (while it shows or fades). */
  const readRects = () => {
    const out = [];
    for (const e of host.querySelectorAll('.num, .num-tags, .ptags')) {
      const q = e.getBoundingClientRect();
      if (q.width && q.height && getComputedStyle(e).visibility !== 'hidden') out.push(q);
    }
    // (the call-out while it shows or fades: clearReads takes 120 ms to clear it)
    const mc = host.querySelector('.mcall');
    if (mc && (mc.dataset.on === 'true' || Number(getComputedStyle(mc).opacity) > 0.02)) for (const e of mc.querySelectorAll('.mcx')) { const q = e.getBoundingClientRect(); if (q.width) out.push(q); }
    return out;
  };
  /** The open board: #board less the log rail (from 1280 px) and the console, under the top rail. */
  function openRect() {
    const W = innerWidth, H = innerHeight, l = L();
    const b = (() => { try { const e = l?.board ?? host.querySelector('#board'); const q = e?.getBoundingClientRect?.(); return q?.width ? q : null; } catch { return null; } })();
    let x0 = Math.max(12, (b?.left ?? 0) + 12), x1 = Math.min(W - 12, (b?.right ?? W) - 12), y0 = Math.max(8, (b?.top ?? 0) + 8), y1 = Math.min(H - 8, (b?.bottom ?? H) - 8);
    const lb = (() => { try { return l?.logBox?.() ?? null; } catch { return null; } })();
    if (lb?.w && W >= 1280) x1 = Math.min(x1, lb.x - 8);
    const con = host.querySelector('#console')?.getBoundingClientRect();
    if (con?.height && con.top > H * 0.4) y1 = Math.min(y1, con.top - 8);
    const railB = Math.max(0, ...[...host.querySelectorAll('.rail, #team')].map((e) => { const q = e.getBoundingClientRect(); return q.height && q.top < H * 0.3 ? q.bottom + 8 : 0; }));
    y0 = Math.max(y0, railB);
    return { x0, x1, y0, y1, lb: lb?.w && W >= 1280 ? new DOMRect(lb.x, lb.y, lb.w, lb.h) : null, con: con?.height ? con : null };
  }
  /** The reticle's four corners (viewport px), each its leg square with the keyline and a capture skin's dot: the live
   *  ones while it stands, else where the shot's reticle will stand round `side` (`skin`, the attacker's). */
  function rtcLegs(side, skin = '') {
    const grow = (q, k) => new DOMRect(q.left - k, q.top - k, q.width + 2 * k, q.height + 2 * k);
    if (rtcBox.dataset.on === 'true') return [...rtc.querySelectorAll('i')].map((i) => i.getBoundingClientRect()).filter((q) => q.width).map((q) => grow(q, skin ? 5 : 2));
    const r0 = rtcRect(side, skin);
    if (!r0?.width) return [];
    const r = skin ? grow(r0, 6) : r0, leg = Math.max(10, Math.round(0.14 * Math.min(r0.width, r0.height))) + (skin ? 5 : 2) * 2;
    return [[r.left, r.top], [r.right - leg, r.top], [r.left, r.bottom - leg], [r.right - leg, r.bottom - leg]].map(([x, y]) => grow(new DOMRect(x, y, leg, leg), 0));
  }
  /** Where the tag stands: centred over the figure's top (10 px above), inside the open board, and never over a read
   *  (a numeral, a chip, the call-out, an attack's reticle corners: weight 4), the reticle's box, or the defender's
   *  drawn box when no reticle comes (3), the log rail, the console, a plate, a leader's line or a cut-in (3): the first of its spots that
   *  covers none, else the least covered; a spot 6 px over the figure's topmost read is one of them. A follow (`keep`,
   *  the spot it took) rides the figure and moves only when a read or a reticle corner lands under it. `aim`: the
   *  shot's reticle ({ skin }), null when it takes none. */
  let tagGeo = null;
  /** An element's opacity as drawn (its own times its ancestors'), 0 when hidden. */
  const seenAt = (e) => { let a = 1; for (let x = e; x && x !== document.documentElement && a > 0.01; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; a *= +cs.opacity; } return a; };
  /** The figure is in flight (a special carries it off its pad, or its attack's flight runs): its tag stays centred on
   *  the body, over or under it, never parked beside an empty pad (fixes-3 R5). */
  const flying = (side) => { try { const f = L()?.active?.(side); return [...(f?.carry ?? []), f?.flight].some((a) => a && a.playState === 'running') && [...(f?.carry ?? [])].some((a) => a.playState === 'running'); } catch { return false; } };
  /** The stage's call-out text while it shows (a transform's title names the tower). */
  const titles = () => [...document.querySelectorAll('#stage .sd-callout-text')].filter((p) => seenAt(p) > 0.05);
  /** This transform's own title is up (its scene has started and the call-out shows): from then the title is the one
   *  read, and the tag leaves (fixes-3 R1 after the critic: a short upgrade's tag stood beside its title from 300 to
   *  1350 ms). A still keeps both: under reduced motion the tag is static from the still's first frame to its end. */
  const titleUp = (shot) => shot?.scene?.kind === 'transform' && !rd() && started.has(shot) && titles().length > 0;
  /** A transform whose scene shows its title (a full or short one, moving; a board-only one has none): its tag reads
   *  through the pre-roll and leaves at the scene's start, the frame the title may first show. */
  const titled = (shot) => shot?.scene?.kind === 'transform' && (shot.variant ?? shot.scene.variant) !== 'off' && !shot.cut && !rd();
  function placeTag(side, keep = -1, aim = null, hard = false) {
    const r = boxOf(side), fly = r && flying(side);
    if (fly) keep = -1;
    if (keep < 0 || !tagGeo) tagGeo = { w: tagEl.offsetWidth || 160, h: tagEl.offsetHeight || 32, open: openRect() };
    const { w, h, open } = tagGeo;
    const reads = readRects(), legs = aim ? rtcLegs(other(side), aim.skin) : [];
    const lap = (c, q) => Math.max(0, Math.min(c.x + w, q.right) - Math.max(c.x, q.left)) * Math.max(0, Math.min(c.y + h, q.bottom) - Math.max(c.y, q.top));
    const fit = (s0, i) => ({ x: Math.max(open.x0, Math.min(open.x1 - w, s0.x)), y: Math.max(open.y0, Math.min(open.y1 - h, s0.y)), i });
    const W = innerWidth, H = innerHeight;
    const cx = r ? r.left + r.width / 2 : W / 2, top = r ? r.top : H * 0.4;
    // the figure's own reads: the spot over the topmost of them
    let readTop = Infinity;
    if (r) for (const q of reads) if (q.right > r.left - 24 && q.left < r.right + 24 && q.bottom > r.top - 140 && q.top < r.bottom) readTop = Math.min(readTop, q.top);
    const spots = r ? [{ x: cx - w / 2, y: top - 10 - h }, { x: cx - w / 2, y: top + 8 }, { x: r.right + 8, y: top + 8 }, { x: r.left - 8 - w, y: top + 8 }, { x: cx - w / 2, y: r.bottom + 8 }, { x: cx - w / 2, y: (Number.isFinite(readTop) ? readTop : top) - 6 - h }, { x: r.right + 8, y: top - 10 - h }, { x: r.left - 8 - w, y: top - 10 - h }, { x: r.right + 8, y: r.top + r.height / 2 }, { x: r.left - 8 - w, y: r.top + r.height / 2 }] : [{ x: cx - w / 2, y: top }];
    // (a body in flight: only the spots centred on it, over, under, then inside its top)
    if (fly) { const c0 = spots.slice(0, 2), c4 = spots[4]; spots.length = 0; spots.push(c0[0], c4, c0[1]); }
    // (last, where a pushed camera leaves no room round the figure: the open board's four corners; the side word still
    // says whose move it is)
    // (and before those, the room just under a top plate or over a bottom one, at either end: on a phone the plates
    // span the board and a corner lands on one, fixes-2 R12)
    const plates = [...host.querySelectorAll('.hud .plate')].map((p) => (getComputedStyle(p).opacity !== '0' ? p.getBoundingClientRect() : null)).filter((q) => q?.width);
    if (!fly) {
      for (const q of plates) { const y = q.top < H / 2 ? q.bottom + 6 : q.top - 6 - h; spots.push({ x: q.left, y }, { x: q.right - w, y }); }
      spots.push({ x: open.x0, y: open.y0 }, { x: open.x1 - w, y: open.y0 }, { x: open.x0, y: open.y1 - h }, { x: open.x1 - w, y: open.y1 - h });
    }
    // (a leader's line and a cut-in are read too, fixes-2 R7, and a plate, R12: weight 3, as the log rail; a line
    // counted only while it shows)
    // (a line is kept 6 px clear: it slides in and rides its leader, and a frame's lag left a 78 px² sliver, #7 1440)
    const lines = [...document.querySelectorAll('.leader-quote, .cutin')].filter((p) => seenAt(p) > 0.05).map((p) => p.getBoundingClientRect()).filter((q) => q.width && q.height).map((q) => new DOMRect(q.left - 6, q.top - 6, q.width + 12, q.height + 12));
    // (and at weight 4, as a read: a transform's title while it shows and the level star's landing box, fixes-3 R1; an
    // attack's call-out is not one: a reduced still shows it from its first frame, and weighing it put the tag on the
    // last shot's number, 390 reduced #31, fixes-3 R1 after the critic)
    const marks = [...(tagShot?.scene?.kind === 'transform' ? titles() : []), ...starBoxes()].map((p) => p?.getBoundingClientRect?.() ?? p).filter((q) => q?.width && q.height);
    if (keep >= 0) {
      // a follow: the spot it took, unless a read, a plate or a line has come under it since (the camera moves the
      // figure under the HUD)
      const c = fit(spots[Math.min(keep, spots.length - 1)], keep);
      if (![...reads, ...legs, ...marks, ...plates, ...lines].some((q) => lap(c, q) > 0)) return setTag(c);
    }
    const avoid = [...reads, ...legs, ...marks].map((q) => [q, hard ? 4000 : 4]);
    const foe = aim ? rtcRect(other(side), aim.skin) : boxOf(other(side));
    if (foe?.width) avoid.push([foe, 3]);
    if (open.lb) avoid.push([open.lb, 3]);
    if (open.con) avoid.push([open.con, 3]);
    for (const q of plates) avoid.push([q, 3]);
    // (a leader's line or a cut-in weighs over the defender's box: a tag never stands on a line it could clear by
    // standing on the figure, fixes-3 R1 after the critic: #7 stood 78 px² on Tavi's line at its first frame)
    for (const q of lines) avoid.push([q, 12]);
    let best = null;
    for (const [i, s0] of spots.entries()) {
      const c = fit(s0, i);
      const cost = avoid.reduce((n, [q, k]) => n + k * lap(c, q), 0);
      if (!best || cost < best.cost) best = { ...c, cost, reads: [...reads, ...legs, ...marks, ...plates, ...lines].reduce((n, q) => n + lap(c, q), 0) };
      if (!cost) break;
    }
    // (a follow with nowhere clear to stand steps aside until there is: its move was read before the contact, and a
    // tag never stands on a number, a reticle corner, a plate or a leader's line)
    if ((keep >= 0 || fly) && best.reads > 0) best.hide = true;
    return setTag(best);
  }
  /** Each Princeton TD level star where it stands and where it lands (viewport px): a drop runs on `translate`, so its
   *  rest box is its box carried back to the stylesheet's own translate (-50% -110% of its size), fixes-3 R1. */
  function starBoxes() {
    const out = [];
    for (const b of host.querySelectorAll('#board .ptd-badge')) {
      if (seenAt(b) <= 0.05) continue;
      const q = b.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight;
      if (!q.width || !w || !h) continue;
      out.push(q);
      const k = q.width / w, cur = String(getComputedStyle(b).translate || 'none');
      const part = (v, size) => (!v ? 0 : v.endsWith('%') ? (parseFloat(v) / 100) * size : parseFloat(v) || 0);
      const [tx, ty] = cur === 'none' ? [] : cur.split(/\s+/);
      const dx = (-0.5 * w - part(tx, w)) * k, dy = (-1.1 * h - part(ty, h)) * k;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) out.push(new DOMRect(q.left + dx, q.top + dy, q.width, q.height));
    }
    return out;
  }
  function setTag(c) {
    const tr = `${Math.round(c.x)}px ${Math.round(c.y)}px`;
    if (tagEl.style.translate !== tr) tagEl.style.translate = tr;
    const blocked = c.hide ? 'true' : 'false';
    if (tagEl.dataset.blocked !== blocked) tagEl.dataset.blocked = blocked;
    return c;
  }
  /** The tag rides its figure while it stands (a lunge, a recoil, the camera finding the defender): one box read a
   *  frame, on the spot it took at its start. */
  let tagFollow = 0, tagLive = null;
  function followTag(shot, side, spot, aim) {
    cancelAnimationFrame(tagFollow);
    const live = tagLive = { shot, side, spot, aim };
    const until = performance.now() + (rd() ? 6000 : shot.cut ? CUT_WAIT + TAG.cut : 2600);
    const step = () => {
      // (past its time it still rides a body in flight, every frame: a crit knockout's dive can start after it, fixes-3
      // R5 after the critic: the tag held 300 ms at [855,263] while the flier dove to [783,390])
      if (tagShot !== shot || tagEl.dataset.on !== 'true' || (performance.now() > until && !flying(side))) return;
      // (a transform's tag leaves the frame its title shows, at once: never the tag and the title together)
      if (titleUp(shot)) { tagOut(shot, 0); return; }
      live.spot = placeTag(side, live.spot, aim).i;
      tagFollow = raf(step);
    };
    tagFollow = raf(step);
  }
  // the call-out placed (or moved) under a standing tag: the tag steps off it in the same frame, not the next one's
  // follow (a reduced still shows its first frame; a follow that has ended no longer looks), fixes-2 R1 after the critic
  // (and a hit's number landing under it: the tag steps off in the number's own frame, fixes-3 after the critic: 390
  // #4's "102" landed 44 px² under the tag for the one frame before the follow looked)
  document.addEventListener('num:placed', () => {
    const t = tagLive;
    if (!t || tagShot !== t.shot || tagEl.dataset.on !== 'true') return;
    t.spot = placeTag(t.side, t.spot, t.aim).i;
  });
  host.addEventListener('mcall:placed', () => {
    const t = tagLive;
    if (!t || tagShot !== t.shot || tagEl.dataset.on !== 'true') return;
    t.spot = placeTag(t.side, t.spot, t.aim).i;
  });
  function tagIn(shot, wait = false) {
    const s = shot.scene;
    if (fullPre(shot) && started.has(shot)) return;
    // (a transform's tag never comes in once its title shows: one read at a time)
    if (titleUp(shot) || (titled(shot) && started.has(shot))) { if (tagShot === shot) tagShot = null; return; }
    tagShot = shot;
    const l = L();
    // a layout that stamps its own tag (the Mat, on the card's top edge) takes it: one tag on screen, never two. A full
    // scene's stands through the pre-roll, as on the Arena, and leaves at the scene's start (`until: 'start'`, then
    // the layout's tagOut), so a full transform, which has no matte arrow or cut-in, still says who acts
    if (l?.tag) {
      tagEl.dataset.on = 'false';
      const ms = shot.cut ? TAG.cut : rd() ? 1200 : null;
      l.tag(s.side, { html: tagHtml(shot), text: tagText(shot), ms, shot, until: fullPre(shot) ? 'start' : null });
      if (DEBUG) seen.tags.push({ shot: shotKey(shot), side: s.side, text: tagText(shot), by: 'layout' });
      return;
    }
    tagEl.innerHTML = tagHtml(shot);
    tagEl.dataset.side = s.side;
    tagEl.style.setProperty('--sc', SIDE_COLOUR(s.side));
    tagEl.getAnimations().forEach((a) => a.cancel());
    const aim = s.kind === 'attack' && !s.outcome?.has?.('support') ? { skin: skinOf(s.card) } : null;
    let at = placeTag(s.side, -1, aim);
    // (a transform's tag is read before its title comes, ~300 ms in: it takes a spot clear of every read, over the
    // rival or a plate if it must, rather than wait out a number past the title)
    if (at.reads > 0 && s.kind === 'transform') { const h = placeTag(s.side, -1, aim, true); if (!h.reads) at = h; }
    // a numeral still being read on the actor (an earlier shot's, under 600 ms old) that the tag cannot clear: the tag
    // waits until it has been read (clearReads takes it then), so the tag never stands on a number
    if (at.reads > 0 && !wait) {
      const read = rd() ? READ_STILL : NUMBER_HOLD, now = performance.now();
      const left = Math.max(0, ...[...host.querySelectorAll('.num')].filter((n) => n.dataset.side === s.side && !('leaving' in n.dataset)).map((n) => (+n.dataset.born || 0) + read - now));
      if (left > 0) { tagEl.dataset.on = 'false'; tagEl.style.opacity = '0'; later(left + 20, () => { if (tagShot === shot) tagIn(shot, true); }); return; }
    }
    tagEl.dataset.on = 'true';
    tagEl.style.opacity = '1';
    if (DEBUG) seen.tags.push({ shot: shotKey(shot), side: s.side, text: tagText(shot), box: [Math.round(at.x), Math.round(at.y), tagEl.offsetWidth, tagEl.offsetHeight] });
    // (a cut or a board-only beat lands within a frame or two: its tag stands at once)
    // (the last shot's chips leaving over the actor, as Auto carries an upgrade's into its tower's attack, go first: the
    // tag comes in as they finish, so the figure never wears the old chips and the new tag at once, fixes-2 R5 after
    // the critic: Auto #11 pre 67 stood 3 chips and the tag)
    const r0 = boxOf(s.side), grow = 80;
    let leaving = !rd() && r0?.width && [...host.querySelectorAll('.ptags[data-leaving], .num[data-leaving]')].some((e) => { const q = e.getBoundingClientRect(); return q.width && q.right > r0.left - grow && q.left < r0.right + grow && q.bottom > r0.top - grow && q.top < r0.bottom + grow; });
    // (a titled transform's tag has only its pre-roll, 133 ms in a short one, before its title: it comes in at once,
    // the last chips leaving beside it, or it never reads at all, fixes-3 R1 after the critic: 1440 #6 read none)
    if (leaving && titled(shot)) leaving = false;
    if (!rd() && s.variant !== 'off' && !shot.cut) tagEl.animate([{ opacity: 0, transform: `translate3d(${s.side === 'player' ? -TAG.slide : TAG.slide}px,0,0)` }, { opacity: 1, transform: 'none' }], { duration: TAG.in, delay: leaving ? CLEAR_MS : 0, fill: 'backwards', easing: 'cubic-bezier(.2,.9,.1,1)' });
    // (standing still under reduced motion, it still steps off a read that lands under it: a jump, never a slide)
    followTag(shot, s.side, at.i, aim);
    // (a cut's tag stands to its contact and 450 ms past it, timed at the contact: `tag(shot, 'impact')`)
    if (shot.cut) later(CUT_WAIT, () => tagOut(shot, TAG.cutOut));
  }
  /** A titled transform's tag reads until its title shows, and leaves in the title's own frame: the stage writes the
   *  call-out's reveal in its frame callback, after the tag's follow has looked, so the follow alone saw it a frame late
   *  (S3 counted 1 frame of tag and title, 1440 #6). A watch on the stage's attributes, from the scene's start until
   *  the tag is gone (2 s at most), takes the tag off in the microtask after that write, before the frame paints. */
  let titleWatch = null;
  function watchTitle(shot) {
    titleWatch?.disconnect();
    titleWatch = null;
    const st = document.getElementById('stage'), lay = L()?.tag ? L() : null;
    // (a layout's own tag, the Mat's, stands while its shot is the tag's; the Arena's while it is on)
    const up = () => tagShot === shot && (lay || tagEl.dataset.on === 'true');
    // (the layout's tag may still be in its 120 ms entrance under Auto's 100 ms pre-roll: the entrance ends with it, or
    // it would hold the tag up a frame over the title, Mat 1440 Auto #1)
    const off = () => {
      if (!lay) { tagOut(shot, 0); return; }
      tagShot = null;
      lay.tagOut?.(shot.scene.side, shot, 0);
      for (const e of host.querySelectorAll('#board .slot-tag')) if (e.style.opacity === '0') e.getAnimations().forEach((a) => a.cancel());
    };
    if (!st || typeof MutationObserver !== 'function' || !up()) return;
    if (titleUp(shot)) { off(); return; }
    const mo = (titleWatch = new MutationObserver(() => {
      if (!up()) { mo.disconnect(); return; }
      if (titleUp(shot)) { mo.disconnect(); off(); }
    }));
    mo.observe(st, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    later(2000, () => mo.disconnect());
  }
  /** A full scene's tag lives only in its pre-roll (moving, uncut). */
  const fullPre = (shot) => (shot.variant ?? shot.scene?.variant) === 'full' && !shot.cut && !rd();
  const tagText = (shot) => { const d = document.createElement('div'); d.innerHTML = tagHtml(shot); return d.textContent.trim(); };
  function tagOut(shot, ms) {
    if (shot && tagShot !== shot) return;
    tagShot = null;
    if (tagEl.dataset.on !== 'true') return;
    // (its entrance may still be running, or waiting out its delay: it ends here, or it would hold the tag up over a
    // title for its last 120 ms, fixes-3 R1 after the critic: S3 counted 6 frames of tag and title at 1440 #6)
    const from = Number(getComputedStyle(tagEl).opacity) || 0;
    tagEl.getAnimations().forEach((a) => a.cancel());
    tagEl.dataset.on = 'false';
    tagEl.style.opacity = '0';
    if (ms && !rd() && from > 0.01) tagEl.animate([{ opacity: from }, { opacity: 0 }], { duration: ms, easing: 'ease-in' });
  }
  /** The frozen call: the actor tag for a shot. `phase` (the page's shot phase) moves it on: in at plan, gone under a
   *  full scene's start, out after the contact (short + 400, Auto + 300), out at 450 for a cut. */
  function tag(shot, phase = 'plan') {
    const s = shot?.scene;
    if (!s || !(s.kind === 'attack' || s.kind === 'transform')) return;
    if (phase === 'plan') {
      // nothing the last shot read stays inside this one (fx.js clearReads: the call-out, its numerals once read, its
      // chips, an earlier "Miss" at once)
      try { clearReads(shot, { reduced: rd() }); } catch { /* none */ }
      return tagIn(shot);
    }
    // (the Mat's own tag: a full scene's leaves at the start, a short titled one in its title's frame, as the Arena's)
    if (L()?.tag) { if (phase === 'start' && fullPre(shot)) L().tagOut?.(s.side, shot, 80); else if (phase === 'start' && titled(shot)) watchTitle(shot); return; }
    if (phase === 'start') started.add(shot);
    if (phase === 'start' && (shot.variant ?? s.variant) === 'full') return tagOut(shot, 80);
    if (titleUp(shot)) return tagOut(shot, 0);
    if (phase === 'start' && titled(shot)) watchTitle(shot);
    // (a transform's title names the tower: its tag leaves the frame the title shows (followTag), and at impact + 140 at
    // the latest where no title comes, so after the title only the star and what the tower brings stand, fixes-3 R1)
    if (phase === 'impact' && s.kind === 'transform' && (shot.variant ?? s.variant) === 'short' && !shot.cut && !rd()) { later(140, () => tagOut(shot, TAG.autoOut)); return; }
    // a cut's 450 ms is timed from its contact, so a contact the board holds (a number still read on the defender, the
    // attacker flying home) still lands with its tag (fixes-2 R2)
    if (phase === 'impact' && shot.cut) later(TAG.cut, () => tagOut(shot, TAG.cutOut));
    // (reduced: the tag is static in the still, from its first frame to its end)
    // (a board-only transform, Auto's 420, has no title: its chips name the tower and what it brings from the contact, so
    // the tag, read through the pre-roll, gives them the tower as they land: the star and at most 3 labels over it,
    // fixes-2 R5 after the critic: Auto #9 stood 4 and the star)
    if (phase === 'impact' && s.kind === 'transform' && (shot.variant ?? s.variant) === 'off' && !shot.cut && !rd()) return tagOut(shot, auto() ? TAG.autoOut : TAG.shortOut);
    if (phase === 'impact' && !shot.cut && !rd()) {
      const a = auto(), hold = a ? TAG.auto : TAG.short, out = a ? TAG.autoOut : TAG.shortOut;
      later(hold, () => tagOut(shot, out));
    }
    if (phase === 'end' && rd()) tagOut(shot, 0);
  }

  // ---------- the reticle: four corner brackets on the defender, in the attacker's side colour, no fill
  function placeRtc(rect) {
    if (!rect?.width) return false;
    const w = Math.round(rect.width), h = Math.round(rect.height);
    rtcBox.style.translate = `${Math.round(rect.left)}px ${Math.round(rect.top)}px`;
    if (rtcBox.dataset.w !== String(w) || rtcBox.dataset.h !== String(h)) {
      rtcBox.dataset.w = String(w); rtcBox.dataset.h = String(h);
      rtcBox.style.width = `${w}px`; rtcBox.style.height = `${h}px`;
      // (the far corners stand by transform from the box's size, so a resize never shifts layout: CLS 0)
      rtcBox.style.setProperty('--bw', `${w}px`); rtcBox.style.setProperty('--bh', `${h}px`);
      rtcBox.style.setProperty('--leg', `${Math.max(10, Math.round(0.14 * Math.min(w, h)))}px`);
    }
    return true;
  }
  /** The reticle's rect round the defender (viewport px): its drawn, opaque box (for a form card its form's, at the
   *  figure's own scale) outset by 8%, less the capture skin's own 6 px stand-off, so the corners frame the thing that
   *  was hit and not its picture's empty box; the layout's target anchor where there is no such figure. */
  const RTC_OUT = 0.08;
  function rtcRect(side, skin = '') {
    const d = drawnOf(side);
    if (!d) { try { return L()?.anchor?.('target', side) ?? null; } catch { return null; } }
    const ox = Math.max(0, RTC_OUT * d.width - (skin ? 6 : 0)), oy = Math.max(0, RTC_OUT * d.height - (skin ? 6 : 0));
    return new DOMRect(d.left - ox, d.top - oy, d.width + 2 * ox, d.height + 2 * oy);
  }
  /** The reticle follows its target while it stands (a camera push or a recoil moves the figure under it). */
  function followRtc(side, until) {
    cancelAnimationFrame(follow);
    const skin = rtc.dataset.skin ?? '';
    const step = () => {
      if (rtcBox.dataset.on !== 'true' || performance.now() > until) return;
      const r = rtcRect(side, skin);
      if (r) placeRtc(r);
      follow = raf(step);
    };
    follow = raf(step);
  }
  /** The frozen call: the four corners on `rect` (viewport px; the defender's when left out) in `variant`: short (snap
   *  1.25 to 1 in 140 ms at the board cue, held to + 300 after the contact), cut (at once, held 450), miss (spread to
   *  1.4 and fade 200 at the contact), reduced (still, at rest). Support shots take none. */
  function reticle(shot, rect, variant = 'short') {
    const s = shot?.scene;
    if (!s || s.kind !== 'attack' || s.outcome?.has?.('support')) return;
    const foe = other(s.side);
    // (a layout's own reticle: a cut's stands from its plan ('hold', no timer of its own) and takes its 450 ms at the
    // contact, when onShot asks again with 'cut')
    if (L()?.reticle) { const lv = variant === 'cut' && !shot.__cutAt ? 'hold' : variant; L().reticle(foe, { variant: lv, side: s.side, skin: skinOf(s.card), shot }); if (variant === 'cut') cutShot = shot; if (DEBUG) seen.reticles.push({ shot: shotKey(shot), on: foe, variant: lv, by: 'layout' }); return; }
    if (variant === 'miss') {
      if (rtcBox.dataset.on !== 'true' || rd()) { rtcOff(0); return; }
      // the corners spread to 1.4 and fade over 200 ms; the box stays on until they have
      rtcShot = shot;
      // (it spreads most of the way while still drawn, then fades: the shot read as wide, fixes-2 R6)
      const a = rtc.animate([{ transform: 'scale(1)', opacity: 1, easing: 'cubic-bezier(.2,.8,.2,1)' }, { transform: `scale(${1 + 0.75 * (RETICLE.spread - 1)})`, opacity: 0.85, offset: 0.6, easing: 'ease-in' }, { transform: `scale(${RETICLE.spread})`, opacity: 0 }], { duration: RETICLE.miss, easing: 'linear', fill: 'forwards' });
      a.finished.catch(() => {}).then(() => { if (rtcShot === shot) { rtcShot = null; rtcBox.dataset.on = 'false'; delete host.dataset.rtcSkin; } a.cancel(); });
      return;
    }
    rect ??= rtcRect(foe, skinOf(s.card));
    if (!placeRtc(rect)) return;
    if (rtc.dataset.skin !== skinOf(s.card)) { rtc.remove(); rtc = corners(rtcBox, skinOf(s.card)); }
    rtc.getAnimations().forEach((a) => a.cancel());
    rtcBox.style.setProperty('--sc', SIDE_COLOUR(s.side));
    rtcBox.dataset.on = 'true';
    if (skinOf(s.card)) host.dataset.rtcSkin = skinOf(s.card); else delete host.dataset.rtcSkin;
    rtcShot = shot;
    if (DEBUG) seen.reticles.push({ shot: shotKey(shot), on: foe, variant, box: [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)] });
    if (variant === 'cut') {
      // from the plan to the contact (onShot's impact times its 450 ms then), never past CUT_WAIT
      cutShot = shot;
      followRtc(foe, performance.now() + CUT_WAIT + RETICLE.cut);
      later(CUT_WAIT, () => { if (rtcShot === shot && !shot.__cutAt) rtcOff(RETICLE.cutOut); });
      return;
    }
    if (variant === 'reduced' || rd()) return;
    rtc.animate([{ transform: `scale(${RETICLE.from})`, opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: RETICLE.snap, easing: 'cubic-bezier(.2,.9,.1,1)' });
    followRtc(foe, performance.now() + 130 + RETICLE.hold + 40);
  }
  function rtcOff(ms) {
    rtcShot = null;
    cancelAnimationFrame(follow);
    if ('rtcSkin' in host.dataset) delete host.dataset.rtcSkin;
    if (rtcBox.dataset.on !== 'true') return;
    rtcBox.dataset.on = 'false';
    if (ms && !rd()) rtc.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'ease-in' });
  }

  // ---------- the matte arrow: attacker to defender between the two names of a full scene
  function arrow(mhud, shot) {
    const m = mhud ?? o.mhud;
    if (!m?.box) return;
    let a = m.box.querySelector('.bc-mhud-arrow');
    if (!a) { a = document.createElement('b'); a.className = 'bc-mhud-arrow'; a.setAttribute('aria-hidden', 'true'); m.box.append(a); }
    const s = shot?.scene;
    if (!s || s.kind !== 'attack') { delete m.box.dataset.arrow; a.textContent = ''; for (const x of Object.values(m.tags ?? {})) delete x.t.dataset.role; return; }
    const support = s.outcome?.has?.('support');
    a.textContent = support ? '↺' : s.side === 'player' ? '›››' : '‹‹‹';
    a.style.color = SIDE_COLOUR(s.side);
    m.box.dataset.arrow = s.side;
    for (const [side, x] of Object.entries(m.tags ?? {})) x.t.dataset.role = side === s.side ? 'attacker' : support ? 'idle' : 'defender';
  }

  /** A cut's contact: its reticle (and, in tag(), its tag) holds 450 ms from here, whatever the board waited for. */
  function cutHold(shot) {
    shot.__cutAt = performance.now();
    const s = shot.scene, foe = other(s.side);
    if (L()?.reticle) { L().reticle(foe, { variant: 'cut', side: s.side, skin: skinOf(s.card), shot }); return; }
    if (rtcShot !== shot) return;
    followRtc(foe, performance.now() + RETICLE.cut);
    later(RETICLE.cut, () => { if (rtcShot === shot) rtcOff(RETICLE.cutOut); });
  }
  /** A board miss reads as its own beat (fixes-2 R6): "Miss" at the numeral's size and weight, in the attacker's side
   *  tone, where the number would have landed (over the defender's head), from the board's own numeral. The Arena's
   *  small grey plate on the body gives way to it (battle.css). The Mat keeps its own plate on the card. */
  function missMark(shot) {
    const l = L(), s = shot.scene, foe = other(s.side);
    if (!l || l.mode !== 'arena' || !l.fx || !l.motion) return;
    const f = l.active?.(foe);
    if (!f?.box || f.el?.hidden) return;
    const n = numeral(l.motion, l.fx, { x: f.box.x + f.box.w / 2, y: f.box.y - (l.g?.phone ? 8 : 14), value: txt('scene.miss'), kind: 'miss', color: s.side === 'player' ? 'var(--miss-you)' : 'var(--miss-rival)', side: foe, uid: `${f.uid}:miss` });
    n.dataset.by = s.side;
  }

  function clear() {
    for (const t of timers) clearTimeout(t);
    timers.clear();
    tagGeo = null;
    if ('rdWait' in host.dataset) delete host.dataset.rdWait;
    tagOut(null, 0);
    tagShot = null;
    rtcOff(0);
    cutShot = null;
    arrow(o.mhud, null);
  }
  const shotKey = (shot) => `${shot.scene?.kind}:${shot.scene?.side}:${shot.scene?.card}:${shot.scene?.move?.id ?? ''}:${shot.post?.[0]?.id ?? ''}`;

  if (DEBUG) { seen.drawn = drawnOf; seen.body = (side) => bodyBox(L(), side); }
  return {
    strip, tag, reticle, arrow, clear,
    /** Every event that lands: a `turn` event fills the strip; the next command phase empties it. */
    onEvent(e) { if (e?.kind === 'turn') strip(e); },
    /** The strip's end (the battle waits on you again). */
    idle() { order = []; drawStrip(); },
    /** The page's shot phases (plan, prepared, start, board, impact, end), in one call. */
    onShot(shot, phase) {
      const s = shot?.scene;
      if (!s) return;
      const v = shot.variant ?? s.variant;
      if (phase === 'start') started.add(shot);
      // (under reduced motion the reticle marks hits only, ROUND6.md 5.1: a reduced miss takes none)
      const quietMiss = rd() && s.outcome?.has?.('miss');
      // (one reticle on screen: a cut's, which keeps its 450 ms past a short shot, leaves when the next shot begins)
      if (phase === 'plan' && rtcShot && rtcShot !== shot && (s.kind === 'attack' || s.kind === 'transform')) rtcOff(0);
      // (a Kit item or a switch is the next action too: the last shot's reads leave at its pre-roll, as at an attack's;
      // any other shot, a knockout, a trait, a status, stays with the blow before it and takes its number, so the
      // blow's chips still due are made and none of it counts as an earlier shot's)
      if (phase === 'plan') { try { if (s.kind === 'item' || s.kind === 'switch') clearReads(shot, { reduced: rd() }); else if (s.kind === 'attack' || s.kind === 'transform') noteShot(shot); else noteShot(shot, { join: true }); } catch { /* none */ } stripAt(shot); tag(shot, 'plan'); if (shot.cut && s.kind === 'attack' && !quietMiss) reticle(shot, null, 'cut'); return; }
      // the reduced read rule (REQUESTS :10): a still number already read leaves at the next still's first frame, so
      // one number reads at a time
      // (a board number younger than its read, 640 ms, keeps it: test 17's 600 ms hold outranks the clear, and such a
      // number has its own end before the next contact)
      if (phase === 'start' && rd()) {
        for (const n of host.querySelectorAll('#board .num')) if ((+n.dataset.born || 0) + 640 <= performance.now()) n.remove();
        host.dataset.rdWait = '';
      }
      if ((phase === 'impact' || phase === 'end') && 'rdWait' in host.dataset) delete host.dataset.rdWait;
      // a knockout's card is its own read (fixes-2 R3): the blow's call-out is gone from the card's first frame (a KO
      // scene has no pre-roll to fade it in, and the card's entrance is the cut)
      if (phase === 'start' && s.kind === 'ko' && v !== 'off') { try { clearCall({ reduced: true }); } catch { /* none */ } return; }
      if (phase === 'start') { tag(shot, 'start'); if (v === 'full' && s.kind === 'attack' && !shot.box) arrow(o.mhud, shot); return; }
      if (phase === 'board') { if (!quietMiss) reticle(shot, null, rd() ? 'reduced' : 'short'); return; }
      if (phase === 'impact') {
        tag(shot, 'impact');
        if (s.outcome?.has?.('miss') && (shot.board || shot.cut)) { reticle(shot, null, 'miss'); missMark(shot); }
        else if (shot.cut && cutShot === shot) cutHold(shot);
        else if (shot.board && rtcShot === shot && !rd()) later(RETICLE.hold, () => { if (rtcShot === shot) rtcOff(RETICLE.out); });
        return;
      }
      if (phase === 'end') { tag(shot, 'end'); arrow(o.mhud, null); if (rtcShot === shot && !shot.cut) rtcOff(RETICLE.out); }
    },
    layer,
  };
}

// ======================================================== the scene side (registered by install)
/** The readouts an effect draws straight on the scene (runtime.js READOUTS): their own opacity, so only their end
 *  clears them. */
const READOUTS = new Set(['timecode', 'caption', 'ledger', 'axis', 'wave']);
/** A full scene's clean tail (beside `holdNumber`): at impact + 320 the call-out fades over 160 ms and the readouts
 *  (a timecode, a caption, a ledger) end with it, so no "Sabot Round" ghost or ledger lies over the board after the
 *  contact. The number, the contact card and the closing keep their own times. */
export const TAIL = 320, TAIL_FADE = 160;
export const fullTail = (beats) => {
  if (!Array.isArray(beats)) return beats;
  const imp = beats.find((b) => b.do === 'impact');
  if (!imp) return beats;
  const T = imp.at + TAIL, end = T + TAIL_FADE;
  const out = beats.map((b) => (b.do === 'fx' && READOUTS.has(b.name) && b.dur !== undefined && b.at < end && b.at + b.dur > end ? { ...b, dur: Math.max(0, end - b.at) } : b))
    .filter((b) => !(b.do === 'fx' && READOUTS.has(b.name) && b.at >= end));
  // (a scene whose call-out is already faded before the tail keeps its own)
  const faded = beats.some((b) => b.do === 'fade' && b.at <= T && (!b.layers || b.layers.includes('callout')));
  if (!faded) out.push({ at: T, dur: TAIL_FADE, do: 'fade', layers: ['callout'] });
  return out;
};

/** The `contact` effect wrapper (as runtime.js `anchored`): the reticle on a full scene's dealt contact card, from the
 *  ending's cut to impact + 300 (snap 1.25 to 1 in 140 ms); a miss spreads its corners to 1.4 and fades over 200 ms at
 *  the contact; a support move takes none; the reduced still shows it at rest on a hit. */
export const contactReticle = (def) => ({
  mount(c) {
    const s = def.mount ? def.mount(c) : undefined;
    try {
      const sc = c.scene, o = sc?.outcome;
      if (s?.box && sc?.kind === 'attack' && !o?.has?.('support') && !(sc.variant === 'reduced' && o?.has?.('miss'))) {
        s.rtc = corners(s.box, skinOf(sc.card));
        s.rtc.classList.add('rtc-scene');
        s.rtc.style.setProperty('--sc', SIDE_COLOUR(sc.side));
        s.rtc.style.opacity = '0';
      }
    } catch { /* the contact card plays without it */ }
    return s;
  },
  frame(s, t, p, c) {
    def.frame(s, t, p, c);
    const r = s?.rtc;
    if (!r) return;
    const cut = Number(c.params?.cut ?? 380), I = Number(c.params?.impact ?? 580);
    const miss = c.scene.outcome?.has?.('miss'), still = c.scene.variant === 'reduced';
    let op = 0, k = 1;
    if (still) op = t >= cut ? 1 : 0;
    else if (t >= cut && t < cut + RETICLE.snap) { const q = (t - cut) / RETICLE.snap, e = 1 - (1 - q) ** 3; op = e; k = RETICLE.from + (1 - RETICLE.from) * e; }
    else if (t >= cut + RETICLE.snap && t < I) op = 1;
    else if (t >= I && miss) { const q = Math.min(1, (t - I) / RETICLE.miss); op = 1 - q; k = 1 + (RETICLE.spread - 1) * (1 - (1 - q) ** 2); }
    else if (t >= I && t < I + RETICLE.hold) op = 1;
    else if (t >= I + RETICLE.hold) op = Math.max(0, 1 - (t - I - RETICLE.hold) / RETICLE.out);
    const o = op.toFixed(3), tf = k === 1 ? 'none' : `scale(${k.toFixed(4)})`;
    if (r.style.opacity !== o) r.style.opacity = o;
    if (r.style.transform !== tf) r.style.transform = tf;
  },
  unmount(s, c) { s?.rtc?.remove(); return def.unmount?.(s, c); },
});

// ---------- the transform scene (ROUND6.md section 5.4): bars, call-out and credit only; the board shows the change
/** The transform event a scene carries (rules.js scenesOf puts it first in `post`). */
const eventOf = (scene) => (scene?.post ?? []).find?.((x) => x.kind === 'transform') ?? null;
/** The key-1 attack a form has at a level, from the registry: the move an upgrade brings. */
const keyMove = (card, form, level) => { const f = FORMS[card]; const pair = f?.forms?.[form]?.moves?.[String(level).toLowerCase()]; return pair?.[0] ?? null; };
/** The line under a transform's call-out (ROUND6.md 5.4). A build names the role and the level ("Lightning Damage,
 *  New"). An upgrade to Level 2 or 3 under its next move's name says only the level ("Level 3"); one to 4A or 4B
 *  names the tower too ("Palmer Mortar, Level 4A"). When the call-out is the tower's own name, an upgrade's line
 *  names the move it brings instead ("Tesla Coil, Level 3"), so no word is printed twice. */
export function towerLine(scene) {
  if (scene?.line) return scene.line;
  const e = eventOf(scene);
  const form = e?.to?.form ?? scene?.move?.id ?? scene?.form;
  const info = formInfo(scene?.card, form, FORMS);
  const label = scene?.label ?? e?.label ?? '';
  // the rules' label is English ('New', 'Level 3'): read as such, shown in the page's strings
  const change = e?.change ?? (/^(\d|Level)/.test(label) && e?.from?.form === e?.to?.form ? 'upgrade' : 'build');
  const lv = label === 'New' ? txt('tower.new') : /^\d/.test(label) ? levelWord(label) : /^Level\s*/i.test(label) ? levelWord(label.replace(/^Level\s*/i, '')) : label;
  if (change === 'upgrade') {
    const to = e?.to?.level ?? label.replace(/^Level\s*/i, '');
    const level = levelWord(to), branch = /[ab]$/i.test(String(to));
    if (!scene?.title || scene.title === info.name) return listOf([keyMove(scene?.card, form, to)?.name, level].filter(Boolean));
    return branch ? listOf([info.name, level].filter(Boolean)) : level;
  }
  if (!scene?.title || scene.title === info.name) return listOf([info.role, lv].filter(Boolean));
  return listOf([info.name, lv].filter(Boolean));
}
const LINE = {
  mount({ host, scene, params }) {
    const co = host.layer?.('callout') ?? host.root?.querySelector('.sd-callout');
    if (!co) return null;
    const e = document.createElement('span');
    e.className = 'sd-tline';
    e.textContent = towerLine(scene);
    e.style.opacity = '0';
    co.append(e);
    return { e, at: Number(params?.in ?? 0), dur: Number(params?.reveal ?? 200) };
  },
  frame(s, t) {
    if (!s) return;
    const o = Math.max(0, Math.min(1, (t - s.at) / s.dur)).toFixed(3);
    if (s.e.style.opacity !== o) s.e.style.opacity = o;
  },
  unmount(s) { s?.e.remove(); },
};
try { globalThis.showdown?.runtime?.registerFx?.('tower-line', { mount: (c) => { try { return LINE.mount(c); } catch { return null; } }, frame: (s, t) => { try { LINE.frame(s, t); } catch { /* none */ } }, unmount: (s) => { try { LINE.unmount(s); } catch { /* none */ } } }); } catch { /* Node */ }

/** The transform scenes: bars to 0.86, the call-out (the tower or its key move) over its line, the card's credit, and
 *  the middle open so the board's own construction plays in it. No flash, no picture of the card.
 *    `transform`            a first build, full 1800 (impact 960, 840 before the end); every later build and a Level 2
 *                           or 3 upgrade, short 860 (impact 380); the board's Auto 420 is the off variant
 *    `transform:upgrade-4`  an upgrade to 4A or 4B, full 1800 with impact 1000: bars 0-200, call-out 150-450, the
 *                           tower's attack window at 760 (the `fire` cue), bars back 1500-1800
 *    `transform:upgrade`    a Level 2 or 3 upgrade: the same beats, its reduced still held 800
 *  `findCutscene` keeps `transform` for every transform scene (it is registered first, and they tie); the plan picks
 *  the upgrade ones with `transformDefOf(scene)`. */
export const TRANSFORM_SHORT = [
  { at: 0, dur: 110, do: 'bars', to: 0.86, ease: 'matte' },
  { at: 30, dur: 160, do: 'callout', from: { reveal: 0 }, to: { reveal: 1 }, ease: 'snap', style: 'transform' },
  { at: 30, dur: 830, do: 'fx', name: 'tower-line', params: { in: 60, reveal: 140 } },
  { at: 30, dur: 830, do: 'credit' },
  { at: 380, do: 'impact' },
  { at: 700, dur: 160, do: 'bars', to: 1, ease: 'matte' },
  { at: 700, dur: 160, do: 'fade', layers: ['callout', 'fx'] },
];
// An upgrade's short scene (a Level 2 or 3 upgrade by hand, a 4A or 4B take-over under Auto): its call-out leaves at
// impact + 140, not with the bars at 700, and what the upgrade brings (its move, its barrier) comes in as the title starts
// to leave (fx.js postTags), so it stands about 600 ms before the next pre-roll (fixes-2 R5 after the critic). The title
// still reads from 30 to 520; the bars and the end are unchanged.
export const TRANSFORM_SHORT_UPGRADE = TRANSFORM_SHORT.map((b) => (b.do === 'fade' ? { ...b, at: 520, dur: 120 } : b));
export const transformDefs = [{
  id: 'transform', kind: 'transform',
  full: [
    { at: 0, dur: 210, do: 'bars', to: 0.86, ease: 'matte' },
    { at: 120, dur: 300, do: 'callout', from: { reveal: 0 }, to: { reveal: 1 }, ease: 'snap', style: 'transform' },
    { at: 120, dur: 1680, do: 'fx', name: 'tower-line', params: { in: 180, reveal: 240 } },
    { at: 120, dur: 1680, do: 'credit' },
    { at: 960, do: 'impact' },
    { at: 1500, dur: 300, do: 'bars', to: 1, ease: 'matte' },
    { at: 1500, dur: 300, do: 'fade', layers: ['callout', 'fx'] },
  ],
  short: TRANSFORM_SHORT,
  hold: 900,
}, {
  id: 'transform:upgrade-4', kind: 'transform',
  full: [
    { at: 0, dur: 200, do: 'bars', to: 0.86, ease: 'matte' },
    { at: 150, dur: 300, do: 'callout', from: { reveal: 0 }, to: { reveal: 1 }, ease: 'snap', style: 'transform' },
    { at: 150, dur: 1650, do: 'fx', name: 'tower-line', params: { in: 180, reveal: 240 } },
    { at: 150, dur: 1650, do: 'credit' },
    { at: 760, do: 'cue', name: 'fire' },
    { at: 1000, do: 'impact' },
    { at: 1500, dur: 300, do: 'bars', to: 1, ease: 'matte' },
    // (its call-out leaves at impact + 300, ahead of the bars, so the move and barrier the take-over brings stand 600 ms
    // or more before the next pre-roll, fixes-2 R5 after the critic; it still reads from 150 to 1300)
    { at: 1300, dur: 200, do: 'fade', layers: ['callout', 'fx'] },
  ],
  short: TRANSFORM_SHORT_UPGRADE,
  hold: 900,
}];
// (a Level 2 or 3 upgrade plays the short scene by hand and its reduced still holds 800: the same beats, its own hold)
transformDefs.push({ ...transformDefs[0], id: 'transform:upgrade', short: TRANSFORM_SHORT_UPGRADE, hold: 800 });
/** The def a transform scene plays (the page's plan passes it to `compile`): `transform:upgrade-4` for an upgrade to
 *  4A or 4B, `transform:upgrade` for one to Level 2 or 3 (its reduced still holds 800), else `transform`. */
export function transformDefOf(scene) {
  const e = eventOf(scene);
  if ((e?.change ?? '') !== 'upgrade') return transformDefs[0];
  return /[ab]$/i.test(String(e?.to?.level ?? '')) ? transformDefs[1] : transformDefs[2];
}
