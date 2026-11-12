// The Mat: the stage layout of the card mode. Six cards lie in wells cut into one clay tray; the cards are the HUD (an
// HP tab on each card's top edge, damage tokens on its art, chips under the tab); each side's KO stack, Kit tray and
// leader sit at its end; the turn tab (shared/hud.js) carries the turn. The page calls it only through the seam
// (MODES.md section 2): prepare, mount, set, land, flush, cue, anchor, skip, hold, unmount, layout.
// Every motion writes transform and opacity only, so the page never shifts (CLS 0).
import { Leader, loadLeaders, tallOf, finalePoses } from '../shared/leaders.js';
import { Layout, el, wait, clamp, lerp, R, SIDES, EASE, perHit, chipsHtml, setChips, countTo, numeral, hitTags, NUMBER_HOLD, frameOn, inkOn, postTags, TICK_MS } from '../shared/fx.js';
import { ico } from '../shared/icons.js';
import { formInfo, formKey, stillHtml, pipsHtml, levelWord, levelParts } from '../shared/tower.js';
import { specials } from './specials.js';
import { t as txt } from '../shared/strings.js';
import { FORMS } from '../shared/forms.js';

const K = window.bcKit;
const STATUS_COLOR = { burn: '#e8603c', poison: '#a64ac9', sleep: '#7c8aa6', stun: '#d9b21f' };
const E = window.showdown.engine;
const { SLAM, OUT, IN_OUT } = EASE;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** The 4x4 Bayer at each level (1 to 15) as a 12 px mask tile: the cells whose threshold is under the level. */
const MASK = Array.from({ length: 16 }, (_, L) => {
  let r = '';
  for (let i = 0; i < 16; i++) if (BAYER[i] < L) r += `<rect x='${(i % 4) * 3}' y='${Math.floor(i / 4) * 3}' width='3' height='3'/>`;
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' shape-rendering='crispEdges'>${r}</svg>`)}")`;
});

// round 6 fix pass 2 (M1): a form card's art window shows the standing tower, the same front still the Arena crops
// (media/figures/manifest.json, `formView(m, 'front', key)`); the card's own art stands for its starting form
// (fix pass 2 after the critic: the one-line view reader, not the 57 KB Arena ground module, and the manifest fetched
// only once a tower other than the starting one stands or a transform's pre-roll begins, never at a boot)
const formView = (m, view, key = null) => (key && m.forms?.[key]?.[view]) || m[view];
const FIGURES = new URL('../media/figures/', import.meta.url).href;
let figsP = null, figs = null, figsDone = false, figsTries = 0;
// (fixes-3 M1: a failed or half-written manifest is fetched again, up to three more times; one lost fetch once left a
// phone's card on its own art after every transform. Each window waiting on it is drawn when it comes.)
const figsWait = new Set();
const loadFigs = () => (figsP ??= fetch(new URL('manifest.json', FIGURES)).then((r) => (r.ok ? r.json() : null)).then((m) => (figs = m?.figures ?? m ?? null)).catch(() => null).finally(() => {
  figsDone = true;
  if (figs) { for (const f of [...figsWait]) f(); figsWait.clear(); }
  else if (++figsTries < 4) setTimeout(() => { figsP = null; figsDone = false; loadFigs(); }, 700 * figsTries);
}));
/** 17 steps of the 4x4 Bayer from whole to gone (`out`) or from gone to whole. */
const bayerFrames = (out) => Array.from({ length: 17 }, (_, i) => { const n = out ? 16 - i : i, m = n >= 16 ? 'none' : K.MASKS?.[n] ?? 'none'; return { offset: i / 16, maskImage: m, WebkitMaskImage: m }; });

// ============================================================ geometry: the zones (MODES.md section 3), in viewport px
const box = (cx, top, w, h) => ({ x: cx - w / 2, y: top, w, h });
/** Kevin, 2026-11-05: "your avatar guy should be on left and the enemy guy should be on right". Every zone of both
 *  rows and the plates turn about the vertical centre line, so your leader stands at the left end of
 *  the near row and the rival's at the right end of the far row, on a phone too. Everything placed from the zones (the
 *  cards, wells, KO piles, plates, cut-ins, the deal, the finale) follows. */
export function geometry(W, H, turn = false) { return mirror(rawGeometry(W, H, turn)); }
function mirror(g) {
  const c = g.phone ? g.W / 2 : g.cx;
  const f = (b) => (b ? { ...b, x: 2 * c - (b.x + b.w) } : b);
  for (const z of Object.values(g.zones)) for (const k of Object.keys(z)) z[k] = Array.isArray(z[k]) ? z[k].map(f) : f(z[k]);
  g.mirrored = true;
  return g;
}
function rawGeometry(W, H, turn = false) {
  if (W < 720) return phoneGeometry(W, H, turn);
  const t = clamp((W - 1024) / (1440 - 1024));
  const rail = R(lerp(48, 56, t)), consoleH = R(lerp(128, 146, t)) /* round 5: name, description, numbers */, bottom = R(lerp(12, 16, t));
  // round 5: from 1280 up, the battle log stands as a rail at the right, as tall as the mat and the console together
  const logW = W >= 1280 ? R(lerp(256, 288, clamp((W - 1280) / 320))) : 0;
  const matW = Math.min(1296, W - 48 - (logW ? logW + 12 : 0)), matX = R((W - matW - (logW ? logW + 12 : 0)) / 2), matY = rail + 8;
  // from 720 to 1179 the turn tab sits over the console's right end: the mat leaves it a 30 px band
  const tabRoom = W < 1180 ? 30 : 0;
  const matH = Math.max(360 - tabRoom, H - matY - consoleH - 12 - bottom - tabRoom);
  const cx = matX + matW / 2, cy = matY + matH / 2;
  // each side's row, outer end to centre: the KO pile, two bench wells, the active card, its plate, its leader
  // round 5: the active cards take more of the mat (0.43 of its height at 1440), the KO pile and leaders less
  let aH = Math.min((matH - 52) / 2, matH * lerp(256 / 584, 330 / 680, t));
  const plateW = (h) => Math.max(212, Math.min(248, h * 0.86));
  const parts = (h) => {
    const aW = (h * 63) / 88, bH = h * 0.52, bW = (bH * 63) / 88, kH = bH * 0.66, kW = (kH * 63) / 88;
    const gapA = h * lerp(22 / 224, 28 / 264, t), gapB = h * lerp(14 / 224, 18 / 264, t), tH = h * lerp(140 / 224, 162 / 264, t), tW = tH * 0.75;
    return { aW, bH, bW, kH, kW, gapA, gapB, tH, tW, pW: plateW(h) };
  };
  const left = (q) => q.aW / 2 + q.gapA + 2 * q.bW + q.gapB + q.gapB + q.kW;
  // a leader stands under its plate (the mat's lower half less the plate: matH / 2 - 186); only where that is really
  // short (under 90 px) does the row keep room beside the plate for it, less on a narrow mat so its cards keep their size
  const besideRoom = matH / 2 - 186 < (W < 900 ? 90 : 120);
  const reserve = besideRoom ? (W < 900 ? 60 : 84) : 0;
  const right = (q) => q.aW / 2 + q.gapA + Math.max(q.pW, q.tW) + reserve;
  while (Math.max(left(parts(aH)), right(parts(aH))) * 2 > matW * 0.96 && aH > 120) aH -= 2;
  aH = R(aH);
  const q = parts(aH), { aW, bH, bW, kH, kW, gapA, gapB, tH, tW } = q;
  const pBase = cy + 18 + aH;
  const b0 = cx - aW / 2 - gapA - bW / 2;
  const P = {
    active: box(cx, cy + 18, aW, aH),
    bench: [box(b0, pBase - bH, bW, bH), box(b0 - bW - gapB, pBase - bH, bW, bH)],
    ko: box(b0 - bW - gapB - bW / 2 - gapB - kW / 2, pBase - kH, kW, kH),
    plate: { x: cx + aW / 2 + gapA, y: cy + 18, w: q.pW, h: aH },
    leader: null,
  };
  // your leader stands under your plate (about 118 px tall), its name (about 26 px under its feet) still on the mat:
  // sized to the room between, never below 0.55 of its height
  // your leader stands under your plate (up to about 145 px tall with a chip row), its feet as low as the mat allows with its name (about
  // 26 px under its feet) still on it. When that leaves under 0.8 of its height and there is room beside the plate on
  // the table's outer side (its half-width plus half its name plate), it stands there; else under, shrunk to fit
  // (never below 0.55). The row is built for the right-hand side and mirrored, so the outer side here is the right.
  // Both placements are measured and the larger leader wins, so a taller window never shrinks one:
  // under: feet as low as the mat allows (its name, about 26 px, still on it), head clear of the plate (about 120 px
  // plain; a chip row adds 24, so 132 is budgeted), never below 0.55; beside: on the table's outer side (the row is
  // built for the right-hand side and mirrored, so the outer side here is the right), as tall as the plate's column
  // and as wide as the outer room allows, its name clear of the plate.
  let beside = false, besideBox = null;
  {
    const foot = matY + matH - 30, plateH = 144; // the plate with its one chip row
    // the height each placement offers: under the plate, or beside it (as tall as the plate's column, as wide as the
    // outer room); the leader takes the larger
    const under = foot - (P.plate.y + plateH + 6);
    const x0 = P.plate.x + q.pW, outer = matX + matW - 8 - x0;
    const side = Math.max(0, Math.min(foot - P.plate.y, ((outer - 12) * tH) / tW));
    // the spot that draws the larger leader wins (both draw a full one above about 120 px, and then it stays under)
    beside = side > 0 && Math.min(side, 120) > Math.min(under, 120) + 4;
    besideBox = side > 0 ? (() => { const kS = Math.min(1, side / tH), xB = x0 + Math.max(gapB + (tW * kS) / 2, 64); return box(Math.min(xB, matX + matW - 8 - Math.max((tW * kS) / 2, 58)), foot - tH * kS, tW * kS, tH * kS); })() : null;
    // no floor: a leader is drawn smaller rather than in its plate
    const k = Math.min(1, Math.max(0.2, (beside ? side : under) / tH));
    if (beside) {
      // its name plate (about 120 px wide) clear of the plate beside it
      const xB = x0 + Math.max(gapB + (tW * k) / 2, 64);
      P.leader = box(Math.min(xB, matX + matW - 8 - Math.max((tW * k) / 2, 58)), foot - tH * k, tW * k, tH * k);
    } else P.leader = box(cx + aW / 2 + gapA + q.pW / 2, foot - tH * k, tW * k, tH * k);
  }
  const rot = (b) => ({ x: 2 * cx - (b.x + b.w), y: 2 * cy - (b.y + b.h), w: b.w, h: b.h });
  const Rv = { active: rot(P.active), bench: P.bench.map(rot), ko: rot(P.ko), leader: rot(P.leader), plate: rot(P.plate) };
  // the plates stand level with the top of their own card
  Rv.plate.foot = true;
  // the rival's leader stands above its plate: its feet and name (about 34 px) clear of the plate at its tallest
  // (about 158 px with the seen row), shrunk to the room there is
  // beside its plate the rival stands as large as yours (the mirrored box), its name clear of the plate's top
  if (beside) Rv.leader = { ...Rv.leader };
  else {
    // as large as yours where the room above its plate allows (no depth step: it rounded the far leader down a size)
    const lw = Rv.leader.w, lh = Rv.leader.h, room = Rv.active.y + Rv.active.h - 150 - 34 - (matY + 2);
    const k = Math.min(1, Math.max(0.55, room / lh));
    Rv.leader = { x: Rv.leader.x + Rv.leader.w / 2 - (lw * k) / 2, y: matY + 2 + Math.max(0, room - lh * k), w: lw * k, h: lh * k };
    // when the room above its plate leaves it smaller than yours, it stands beside its plate instead (if that is larger)
    // (never larger than yours)
    if (besideBox && Rv.leader.h < P.leader.h - 4 && besideBox.h > Rv.leader.h + 4) {
      const c = Math.min(besideBox.h, P.leader.h) / besideBox.h, bb = { x: besideBox.x + (besideBox.w * (1 - c)) / 2, y: besideBox.y + besideBox.h * (1 - c), w: besideBox.w * c, h: besideBox.h * c };
      Rv.leader = rot(bb);
    }
  }
  // the Kit is the plate's own row now (shared/hud.js): no tray on the mat
  P.kit = null; Rv.kit = null;
  return {
    phone: false, W, H, rail, tilt: 8,
    mat: { x: matX, y: matY, w: matW, h: matH }, cx, cy, aW, aH, sW: aW, sH: aH,
    zones: { player: P, rival: Rv },
    console: { x: matX, y: matY + matH + 12 + tabRoom, w: matW, h: consoleH },
    log: logW ? { x: matX + matW + 12, y: matY, w: logW, h: matH + 12 + consoleH } : null,
  };
}

function phoneGeometry(W, H, turn) {
  // MODES.md's 390 x 844 table, scaled to the width; the console keeps the foot at 268 px and the mat takes the rest
  const s = W / 390;
  // round 5: four full-width moves, each with its whole description; they scroll inside the 268 px console (a taller
  // console still scrolled on every phone and only took height from the cards)
  const consoleH = 268, consoleY = H - 8 - consoleH;
  const T = phoneTurn(W, H, s, consoleY, consoleH);
  if (turn) return T;
  // round 5: a one-line plate for each card in play, the rival's under the rail and yours over the console
  const strip = PHONE_STRIP;
  const matTop = R(56 * s) + strip + 14, matH = Math.min(R(504 * s), consoleY - 8 - matTop - strip);
  const k = matH / (504 * s); // a short phone squeezes the mat's rows together
  const X = (x) => x * s, Y = (y) => matTop + (y - 56) * s * k, S = (v) => v * s * Math.min(1, k);
  const b = (x, y, w, h) => ({ x: X(x) + (w * s - S(w)) / 2, y: Y(y), w: S(w), h: S(h) });
  // the side columns hold two 60 x 84 cards in the active's 196 px, 28 apart, so the lower card's HP tab (about 21 px
  // over its card) clears the card above it on a squeezed phone too
  const P = { active: b(125, 320, 140, 196), bench: [b(27, 320, 60, 84), b(27, 432, 60, 84)], ko: b(303, 320, 60, 84), leader: b(296, 424, 72, 96), kit: null };
  const Rv = { active: b(125, 100, 140, 196), bench: [b(303, 212, 60, 84), b(303, 100, 60, 84)], ko: b(27, 212, 60, 84), leader: b(22, 84, 72, 96), kit: null };
  const aH = P.active.h, aW = (aH * 63) / 88;
  return {
    phone: true, W, H, rail: R(52 * s), tilt: 0,
    // every card's box is the turn's active size, scaled down to its well: a turn's change of size is a transform
    mat: { x: X(8), y: matTop, w: X(374), h: matH }, cx: W / 2, cy: Y(308), aW, aH, sW: T.sW, sH: T.sH,
    zones: { player: P, rival: Rv },
    console: { x: X(8), y: consoleY, w: X(374), h: consoleH },
    plates: { rival: { x: X(8), y: 62, w: X(374), strip: true }, player: { x: X(8), bottom: consoleY - 6, w: X(374), strip: true } },
  };
}
/** The height a phone gives each one-line plate (shared/hud.css .plate[data-strip]). */
const PHONE_STRIP = 40;

/** A phone while a turn plays: the console keeps only its row of acts (Auto among them), and the mat takes the room
 *  above it. The actives grow to 240 px at 390 wide, the benches to 70 x 98, the two rows part round the centre line. */
function phoneTurn(W, H, s, consoleY, consoleH) {
  const matTop = R(56 * s) + PHONE_STRIP + 14, acts = consoleY + consoleH - 6 - 48 - 4;
  const matB = acts - 8 - PHONE_STRIP, matH = matB - matTop;
  const aH = R(Math.min(240 * s, (matH - 44 * 2 - 120) / 2)), aW = (aH * 63) / 88;
  const bH = R(98 * s * Math.min(1, aH / (240 * s))), bW = (bH * 63) / 88;
  const cx = W / 2, top = matTop + R(44 * s), bottom = matB - R(44 * s);
  const cy = (top + aH + bottom - aH) / 2;
  const gap = R(14 * s), lx = R(22 * s), rx = W - R(22 * s) - bW;
  const b = (x, y, w, h) => ({ x, y, w, h });
  const Rv = {
    active: b(cx - aW / 2, top, aW, aH),
    bench: [b(rx, top + bH + gap, bW, bH), b(rx, top, bW, bH)],
    ko: b(lx, top + bH + gap, bW, bH),
    leader: b(R(22 * s), R(84 * s), R(72 * s), R(96 * s)), kit: null,
  };
  const P = {
    active: b(cx - aW / 2, bottom - aH, aW, aH),
    bench: [b(lx, bottom - 2 * bH - gap, bW, bH), b(lx, bottom - bH, bW, bH)],
    ko: b(rx, bottom - 2 * bH - gap, bW, bH),
    leader: b(W - R(22 * s) - R(72 * s), 2 * cy - R(84 * s) - R(96 * s), R(72 * s), R(96 * s)), kit: null,
  };
  return {
    phone: true, turn: true, W, H, rail: R(52 * s), tilt: 0,
    mat: { x: R(8 * s), y: matTop, w: W - 2 * R(8 * s), h: matH }, cx, cy, aW, aH, sW: aW, sH: aH,
    zones: { player: P, rival: Rv },
    console: { x: R(8 * s), y: consoleY, w: W - 2 * R(8 * s), h: consoleH },
    plates: { rival: { x: R(8 * s), y: 62, w: W - 2 * R(8 * s), strip: true }, player: { x: R(8 * s), bottom: acts - 6, w: W - 2 * R(8 * s), strip: true } },
  };
}


// ============================================================ the layout
export class MatBoard extends Layout {
  constructor() {
    super();
    this.mode = 'mat';
    this.slots = new Map();
    this.leaders = {};
    this.cam = { x: 0, y: 0, k: 1 };
    this.view = null;
    this.reactions = [];
    this.koOrder = { player: [], rival: [] };
    this.turnShown = 0;
    this.away = null;
    this.falling = new Set();
    // round 6's shared beats, opted in per layout (ROUND6.md section 6): the post chips on the cards and a multi-hit's
    // ticks. They ship off on the Mat until a whole M2 run passes with them on (section 6, "shipped on only if M2
    // passes with it, else off"); `?matfx=1` turns both on for that run.
    const on = typeof location !== 'undefined' && /[?&]matfx=1\b/.test(location.search);
    this.fx = { chips: on, ticks: on };
  }
  /** The two leaders' atlases; before a deal, the six cards printed ahead of the mount, one a frame, so the boot's
   *  mount only places what is already printed (a mode switch prints at its mount, within its one frame). */
  async prepare(ctx) {
    const leaders = loadLeaders(ctx.leaders);
    this.printed = new Map();
    if (ctx.dealing) {
      // each card is printed into an unseen box at its slot's size, so the gallery fits it there, one card a frame
      const g = geometry(innerWidth, innerHeight, Boolean(ctx.turn?.()));
      const hold = el('div', 'mat-print', document.body);
      for (const s of SIDES) for (const f of ctx.view.sides[s].team) {
        await new Promise((r) => requestAnimationFrame(() => r()));
        const box = el('div', '', hold);
        box.style.cssText = `position:absolute;width:${g.sW}px;height:${g.sH}px`;
        if (!this.printed.has(f.uid)) this.printed.set(f.uid, K.cardParts(f.id, { size: 'mini', back: true, fx: true, live: false, parent: box }));
      }
      await new Promise((r) => requestAnimationFrame(() => r()));
      this.printHold = hold;
    }
    return leaders;
  }

  // ---------- mount: the material, the wells, the leaders, the six cards
  mount(host, ctx) {
    this.ctx = ctx; this.host = host; this.alive = true;
    this.groundOn = Boolean(ctx.ground?.());
    queueMicrotask(() => { this.printHold?.remove(); this.printHold = null; });
    this.dealing = Boolean(ctx.dealing);
    const d = document.documentElement;
    try { if (matchMedia('(prefers-color-scheme: dark)').matches) d.dataset.theme = 'dark'; else delete d.dataset.theme; } catch { delete d.dataset.theme; }
    host.textContent = '';
    host.setAttribute('aria-label', txt('mat.aria'));
    // the camera is one 2D transform on everything the mat holds
    this.camEl = el('div', 'mat-cam', host);
    const m = this.matEl = el('div', 'mat', this.camEl);
    this.screen = el('div', 'mat-screen', m);
    this.tint = { player: el('div', 'mat-tint', m), rival: el('div', 'mat-tint', m) };
    for (const s of SIDES) this.tint[s].dataset.side = s;
    this.decals = el('div', 'mat-decals', m);
    el('i', 'mat-light', m);
    this.line = el('i', 'mat-line', m);
    this.markEl = el('i', 'mat-mark', m);
    this.markEl.innerHTML = K.icon('kl');
    this.stitch = el('i', 'mat-stitch', m);
    this.wells = {};
    this.koCount = {};
    for (const s of SIDES) {
      const w = { active: el('i', 'well well-active', m), bench: [], ko: el('i', 'well well-ko', m) };
      w.active.dataset.side = s; w.ko.dataset.side = s;
      for (let i = 0; i < 2; i++) {
        const b = s === 'player' ? el('button', 'well well-bench', m) : el('i', 'well well-bench', m);
        b.dataset.side = s; b.dataset.i = String(i);
        if (s === 'player') { b.type = 'button'; b.addEventListener('click', () => this.ctx.onBench?.(Number(b.dataset.uidSlot))); }
        w.bench.push(b);
      }
      this.wells[s] = w;
      this.koCount[s] = el('b', 'ko-count', m);
      this.koCount[s].dataset.side = s;
    }
    this.cardLayer = el('div', 'mat-cards', m);
    this.fxLayer = el('div', 'mat-fx', m);
    // the bars' dim past a band's host (a scene staged on the mat)
    this.dim = { top: el('i', 'mat-dim', host), bottom: el('i', 'mat-dim', host) };
    this.dim.top.dataset.edge = 'top'; this.dim.bottom.dataset.edge = 'bottom';
    for (const [i, s] of SIDES.entries()) {
      const L = this.leaders[s] = new Leader(m, ctx.leaders[i], s, { reduced: () => this.reduced(), frozen: ctx.frozen, said: ctx.said, onQuote: ctx.onQuote });
      const plate = el('p', 'leader-plate', L.el);
      el('b', '', plate, L.t.name); el('span', '', plate, L.t.title);
      L.breathe();
    }
    for (const s of SIDES) ctx.view.sides[s].team.forEach((f, i) => this.makeSlot(s, i, f));
    this.view = ctx.view;
    this.layout();
    this.dealtArt();
    this.onCall = () => { const k = this.tagKeep; if (this.alive && k && k.sl.tagShot === k.shot) k.keep(true); };
    document.addEventListener('mcall:placed', this.onCall);
    document.fonts?.ready?.then(() => { if (this.alive) for (const sl of this.slots.values()) this.fitChip(sl); });
  }

  makeSlot(side, i, f) {
    const sl = { uid: f.uid, id: f.id, side, i, live: false, zone: '', faceDown: false, hp: f.hp, maxHp: f.maxHp, tokens: [] };
    const root = el('div', 'slot', this.cardLayer);
    root.dataset.side = side; root.dataset.card = f.id;
    sl.el = root;
    sl.lift = el('div', 'slot-lift', root);
    sl.shake = el('div', 'slot-shake', sl.lift);
    sl.flip = el('div', 'slot-flip', sl.shake);
    const pre = this.printed?.get(f.uid);
    if (pre) { this.printed.delete(f.uid); sl.flip.append(pre.root); }
    sl.parts = pre ?? K.cardParts(f.id, { size: 'mini', back: true, fx: true, live: false, parent: sl.flip });
    sl.parts.card.classList.add(side === 'player' ? 'mine' : 'theirs');
    sl.ring = el('i', 'slot-ring', sl.shake);
    sl.tab = el('div', 'tab', sl.shake);
    const acc = K.accent(f.id);
    sl.tab.style.setProperty('--tab', acc);
    sl.tab.style.setProperty('--tab-ink', inkOn(acc));
    sl.num = el('b', 'tab-hp', sl.tab, String(f.hp));
    el('span', 'tab-max', sl.tab, `/${f.maxHp}`);
    sl.chips = el('div', 'chips', sl.shake);
    sl.tokensEl = el('div', 'tokens', sl.shake);
    // (fix pass 2 after the critic: a form card's damage disc stands under its chip row, which grows with its buffs and
    // conditions; the row's height reaches the disc as --chy, a translation, so a chip that comes or goes shifts no layout)
    if (typeof ResizeObserver !== 'undefined') {
      sl.chipsRO = new ResizeObserver(() => { const h = sl.chips.childElementCount ? sl.chips.offsetHeight + 4 : 0, v = `${h}px`; if (sl.tokensEl.style.getPropertyValue('--chy') !== v) sl.tokensEl.style.setProperty('--chy', v); if (sl.art && sl.el.dataset.fm === 'side') this.seatArt(sl); });
      sl.chipsRO.observe(sl.chips);
    }
    sl.flash = el('i', 'slot-flash', sl.shake);
    sl.shield = el('i', 'slot-shield', sl.shake);
    sl.stamp = el('b', 'slot-stamp', sl.shake);
    // round 6: a form card's tower chip under its HP tab, the actor tag on its top edge, the reticle on its rect
    sl.form = el('span', 'form-chip', sl.shake);
    sl.form.hidden = true;
    sl.tag = el('b', 'slot-tag', sl.shake);
    this.drawForm(sl, f, false);
    this.slots.set(f.uid, sl);
    return sl;
  }

  /** Lay every zone out for the window, and for the turn: on a phone the mat takes the console's room while a turn
   *  plays. A change of turn alone moves everything to its new place (240 ms); a resize lands at once. */
  layout() {
    if (!this.wells) return;
    const turn = Boolean(this.ctx.turn?.());
    const was = this.g;
    const g = geometry(innerWidth, innerHeight, turn);
    const moving = was && was.W === g.W && was.H === g.H && Boolean(was.turn) !== Boolean(g.turn) && !this.reduced();
    const flip = moving ? this.capture() : null;
    this.g = g;
    const m = this.matEl, M = g.mat;
    m.style.width = `${M.w}px`; m.style.height = `${M.h}px`;
    m.style.transform = g.tilt ? `translate3d(${M.x}px,${M.y}px,0) perspective(2400px) rotateX(${g.tilt}deg)` : `translate3d(${M.x}px,${M.y}px,0)`;
    m.dataset.phone = g.phone ? 'true' : 'false';
    const st = document.documentElement.style;
    for (const [k, v] of Object.entries({ '--aw': g.sW, '--ah': g.sH, '--mat-y': M.y, '--console-x': g.console.x, '--console-y': g.console.y, '--console-w': g.console.w, '--console-h': g.console.h })) st.setProperty(k, `${v}px`);
    const local = (b) => ({ x: b.x - M.x, y: b.y - M.y, w: b.w, h: b.h });
    const put = (e, b) => { if (!e) return; const l = local(b); e.style.width = `${l.w}px`; e.style.height = `${l.h}px`; e.style.transform = `translate3d(${l.x}px,${l.y}px,0)`; };
    this.local = local;
    for (const s of SIDES) {
      const z = g.zones[s];
      put(this.wells[s].active, z.active);
      z.bench.forEach((b, i) => put(this.wells[s].bench[i], b));
      put(this.wells[s].ko, z.ko);
      const kc = local(z.ko);
      // the count stands over its pile on a wide mat (the rim has no room beside it), beside it on a phone
      if (!g.phone) this.koCount[s].style.transform = `translate3d(${kc.x + kc.w / 2}px,${s === 'rival' ? kc.y + kc.h + 4 : kc.y - 38}px,0) translateX(-50%)`;
      else { const right = s === 'player'; this.koCount[s].style.transform = `translate3d(${right ? kc.x + kc.w + 8 : kc.x - 8}px,${kc.y + kc.h - 34}px,0)${right ? '' : ' translateX(-100%)'}`; }
      // the leader stands in its zone on the shared foot anchor, at the scale its box allows (leaderScale)
      const L = this.leaders[s], lb = local(z.leader), foot = { x: lb.w / 2, y: (lb.h * 116) / 128 };
      L.box(lb);
      L.place(foot, this.leaderScale(s, foot.y));
      // the lead's world, as a halftone bloom on the floor round its well
      const a = local(z.active), tw = a.w * 3.1, th = a.h * 1.7;
      this.tint[s].style.width = `${tw}px`; this.tint[s].style.height = `${th}px`;
      this.tint[s].style.transform = `translate3d(${a.x + a.w / 2 - tw / 2}px,${a.y + a.h / 2 - th / 2}px,0)`;
    }
    this.line.style.transform = `translate3d(0,${g.cy - M.y}px,0)`;
    // the kl signature, debossed at the free end of the centre line
    const mk = g.phone ? 0 : Math.round(g.aH * 0.3);
    this.markEl.hidden = !mk;
    if (mk) { const zr = g.zones.rival.bench[1], x = (M.x + zr.x) / 2; this.markEl.style.width = this.markEl.style.height = `${mk}px`; this.markEl.style.transform = `translate3d(${(x - M.x - mk / 2).toFixed(1)}px,${(g.cy - M.y - mk / 2).toFixed(1)}px,0)`; }
    this.cardLayer.style.setProperty('--aw', `${g.sW}px`);
    for (const sl of this.slots.values()) { sl.el.style.width = `${g.sW}px`; sl.el.style.height = `${g.sH}px`; }
    for (const sl of this.slots.values()) this.fitChip(sl);
    if (!moving || g.mat.h !== was.mat.h) this.paintScreen();
    if (this.view && this.matEl.dataset.finale === undefined) this.place(this.view, false);
    else if (this.finaled) this.finaleRow(false);
    if (flip) this.playFlip(flip, was);
  }
  /** A leader's scale (atlas px to css px). */
  leaderScale(s, footY) {
    // one art pixel per css pixel (crisp at any device ratio: whole device pixels at 1 and 2), never larger; smaller
    // only where the box has less room; the rival never larger than yours
    const own = (side, y) => Math.max(0.35, Math.min(1, y / tallOf(this.leaders[side].id)));
    if (s === 'player' || this.g?.phone) return own(s, footY);
    const pz = this.g.zones.player.leader;
    return Math.min(own('rival', footY), own('player', (pz.h * 116) / 128));
  }
  /** Where every placed part stands now (its transform and size), for a move to the next layout. */
  capture() {
    const parts = [this.line, this.markEl, ...SIDES.flatMap((s) => [this.wells[s].active, ...this.wells[s].bench, this.wells[s].ko, this.koCount[s], this.leaders[s].el, this.tint[s]]), ...[...this.slots.values()].map((sl) => sl.el)];
    return parts.map((e) => ({ e, t: e.style.transform, w: parseFloat(e.style.width) || 0, h: parseFloat(e.style.height) || 0 }));
  }
  /** Move every part from where it stood to where the new layout put it: one transform each, and the mat's own edge. */
  playFlip(list, was) {
    const ms = 240, ease = IN_OUT;
    for (const { e, t, w, h } of list) {
      const to = e.style.transform;
      if (!t || t === to) continue;
      const nw = parseFloat(e.style.width) || 0, nh = parseFloat(e.style.height) || 0;
      // a box that changed size starts at its old size (a well grows into its new cut)
      const from = nw && nh && w && h && (Math.abs(nw - w) > 0.5 || Math.abs(nh - h) > 0.5) && !e.classList.contains('slot') ? `${t} scale(${(w / nw).toFixed(4)},${(h / nh).toFixed(4)})` : t;
      for (const a of e.getAnimations()) if (a.effect?.getKeyframes?.().some((k) => 'transform' in k)) a.cancel();
      this.anim(e, [{ transform: from }, { transform: to }], { duration: ms, easing: ease });
    }
    // the tray's own foot, from the old edge to the new one: the tray stands at the taller height while its foot is
    // clipped from one edge to the other, then takes the new height
    const h0 = was.mat.h, h1 = this.g.mat.h;
    if (h0 !== h1) {
      const m = this.matEl, st = this.stitch, top = Math.max(h0, h1), inset = (h) => `inset(-2px -2px ${top - h}px -2px round 20px)`;
      m.style.height = `${top}px`;
      const a = this.anim(m, [{ clipPath: inset(h0) }, { clipPath: inset(h1) }], { duration: ms, easing: ease });
      this.anim(st, [{ bottom: `${6 + top - h0}px` }, { bottom: `${6 + top - h1}px` }], { duration: ms, easing: ease, fill: 'forwards' });
      a.finished.catch(() => {}).then(() => { if (this.g?.mat.h === h1) m.style.height = `${h1}px`; for (const x of st.getAnimations()) x.cancel(); });
    }
  }

  /** Each half's quiet screen: an ordered-Bayer gradient at 3 css px, 6% of the side's ink, densest at the mat's edge.
   *  A row's level is set by its distance from the centre line, so each run of rows at one level is one band of the
   *  4x4 Bayer at that level: a few masked boxes in the side's ink, no canvas to create, upload or repaint. */
  paintScreen() {
    const g = this.g, M = g.mat, cell = 3, mid = g.cy - M.y;
    const bands = [];
    for (const s of SIDES) {
      const y0 = s === 'rival' ? 0 : mid, y1 = s === 'rival' ? mid : M.h;
      let run = null;
      for (let y = Math.floor(y0 / cell) * cell; y < y1; y += cell) {
        // distance from the centre line, 0 at the line, 1 at the mat's edge
        const d = s === 'rival' ? 1 - y / mid : (y - mid) / (M.h - mid);
        const L = Math.ceil(clamp((d - 0.08) / 0.92) ** 1.4 * 15 - 1e-9);
        if (run && run.L === L) { run.h += cell; continue; }
        if (run && run.L > 0) bands.push(run);
        run = { s, L, y: Math.max(0, y), h: cell };
      }
      if (run && run.L > 0) bands.push(run);
    }
    const box = this.screen;
    box.style.width = `${M.w}px`; box.style.height = `${M.h}px`;
    while (box.children.length > bands.length) box.lastElementChild.remove();
    bands.forEach((b, i) => {
      const e = box.children[i] ?? el('i', '', box);
      e.dataset.side = b.s;
      e.style.cssText = `transform:translate3d(0,${b.y}px,0);height:${b.h}px;--bayer:${MASK[b.L]};-webkit-mask-position:0 ${-b.y}px;mask-position:0 ${-b.y}px`;
    });
  }

  // ---------- state
  zonesOf(view) {
    const out = new Map();
    for (const s of SIDES) {
      const side = view.sides[s];
      let b = 0;
      const ko = this.koOrder[s];
      side.team.forEach((f, i) => { if (f.hp <= 0 && i !== side.active && !ko.includes(f.uid)) ko.push(f.uid); });
      side.team.forEach((f, i) => {
        if (i === side.active && f.hp > 0) out.set(f.uid, { zone: 'active' });
        else if (f.hp <= 0) out.set(f.uid, { zone: 'ko', n: Math.max(0, ko.indexOf(f.uid)) });
        else out.set(f.uid, { zone: 'bench', n: b++ });
      });
      // an active card at 0 HP before its knockout is staged stays in its well
      const a = side.team[side.active];
      if (a && a.hp <= 0 && !ko.includes(a.uid)) out.set(a.uid, { zone: 'active' });
    }
    return out;
  }
  rectOf(sl, z) {
    const zs = this.g.zones[sl.side];
    if (z.zone === 'active') return zs.active;
    if (z.zone === 'bench') return zs.bench[z.n] ?? zs.bench[0];
    const k = zs.ko, o = Math.min(z.n ?? 0, 4) * 3;
    return { x: k.x + o, y: k.y - o, w: k.w, h: k.h };
  }
  /** The card's well in the rest layout (a phone's turn layout only scales the wells: the same card, transformed). */
  restRectOf(sl, z) {
    const g = this.g;
    if (!g.phone || !g.turn) return this.rectOf(sl, z);
    const key = `${g.W}x${g.H}`;
    if (this.restG?.key !== key) this.restG = { key, g: geometry(g.W, g.H, false) };
    const zs = this.restG.g.zones[sl.side];
    return z.zone === 'active' ? zs.active : z.zone === 'bench' ? zs.bench[z.n] ?? zs.bench[0] : zs.ko;
  }
  /** A benched or fallen card is laid out at the width it is drawn at: mat.css sets its `--card` to `--lay-w` (over
   *  the kit's fit, whose small tier never goes under 164 px), so the card's own container rules choose its small
   *  layout as the home page's do at that size; the box is scaled up to the slot by `--lay-up`, and the slot's
   *  transform scales it back down. */
  layFor(sl, z) {
    // (fix pass 2, M3: a phone lays a card out at its rest well's size in either layout, so a turn's change of size
    // (the deal's turn layout handing over to the rest layout at ready) is the slot's transform alone, never a new
    // laid width under the card's rows: CLS 0 at ready)
    const lay = Math.max(1, Math.round(this.g.sW * this.restRectOf(sl, z).h / this.g.sH));
    if (sl.el.style.getPropertyValue('--lay-w') === `${lay}px` && sl.el.style.getPropertyValue('--lay-up') === (this.g.sW / lay).toFixed(4)) return;
    sl.el.style.setProperty('--lay-w', `${lay}px`);
    sl.el.style.setProperty('--lay-up', (this.g.sW / lay).toFixed(4));
    this.seatArt(sl);
  }
  transformFor(sl, z) {
    const b = this.local(this.rectOf(sl, z)), g = this.g;
    return `translate3d(${(b.x + b.w / 2 - g.sW / 2).toFixed(1)}px,${(b.y + b.h - g.sH).toFixed(1)}px,${z.zone === 'ko' ? (z.n ?? 0) * 0.5 : 0}px) scale(${(b.h / g.sH).toFixed(4)})`;
  }
  /** Put every card in its zone; `motion` animates the moves. */
  place(view, motion = true, ms = 360) {
    const zs = this.zonesOf(view);
    const jobs = [];
    for (const sl of this.slots.values()) {
      const z = zs.get(sl.uid);
      if (!z) continue;
      const tf = this.transformFor(sl, z);
      const moved = sl.zone !== z.zone || sl.n !== z.n;
      sl.el.dataset.zone = z.zone;
      sl.zone = z.zone; sl.n = z.n;
      this.layFor(sl, z);
      if (motion && moved && !this.reduced()) jobs.push(this.tween(sl.el, tf, ms, IN_OUT));
      else this.tween(sl.el, tf, 0);
      // the bench wells are buttons for that card
      if (sl.side === 'player' && z.zone === 'bench') { const w = this.wells.player.bench[z.n]; w.dataset.uidSlot = String(sl.i); w.setAttribute('aria-label', txt('mat.switchTo', { card: this.ctx.title(sl.id) })); }
      sl.el.dataset.down = z.zone === 'ko' ? 'true' : 'false';
      if (z.zone === 'active') sl.num.dataset.hpShown = sl.side; else delete sl.num.dataset.hpShown;
    }
    for (const s of SIDES) {
      const used = new Set([...zs.entries()].filter(([u, z]) => this.slots.get(u)?.side === s && z.zone === 'bench').map(([, z]) => z.n));
      this.wells[s].bench.forEach((w, i) => { w.dataset.empty = used.has(i) ? 'false' : 'true'; if (s === 'player') { w.disabled = !used.has(i); if (!used.has(i)) w.removeAttribute('aria-label'); } });
    }
    return Promise.all(jobs);
  }
  /** Draw a snapshot with no motion: the first frame (cards face down until the deal), a mode switch, a reload. */
  set(view) {
    this.view = view;
    for (const s of SIDES) view.sides[s].team.forEach((f) => {
      const sl = this.slots.get(f.uid);
      if (!sl) return;
      sl.hp = f.hp; sl.maxHp = f.maxHp;
      this.count(sl, f.hp, 0);
      const lost = f.maxHp - f.hp;
      sl.tokens = lost > 0 ? [lost] : [];
      sl.tokensEl.dataset.key = '';
      this.drawTokens(sl, false);
      setChips(sl.chips, chipsHtml(f, K.icon));
      // (a snapshot draws what stands: no transform is pending and no old art is mid-dissolve)
      sl.formNext = null;
      for (const a of sl.artOuting ?? []) a.cancel();
      sl.artOuting = null;
      this.builtIn(sl, true);
      this.drawForm(sl, f, false);
      this.face(sl, this.dealing || f.hp <= 0, false);
      sl.fallen = f.hp <= 0;
      this.ink(sl, f.hp <= 0 ? 0.75 : 0, false);
    });
    this.falling.clear();
    // a snapshot's knockouts have all been staged: every card at 0 HP is on its KO stack
    for (const s of SIDES) view.sides[s].team.forEach((f) => { if (f.hp <= 0 && !this.koOrder[s].includes(f.uid)) this.koOrder[s].push(f.uid); });
    this.place(view, false);
    this.drawSides(view);
    this.drawWorlds(view, false);
    this.printLeads(view);
    if (!this.dealing) this.history(this.ctx.events());
  }
  /** One token per hit from the events so far, healed off the top as flush() does; kept only when it sums true. */
  history(events) {
    const prev = new Map(), tok = new Map();
    for (const e of events) {
      const st = e.state;
      if (!st) continue;
      for (const s of SIDES) for (const f of st.sides[s].team) {
        const was = prev.get(f.uid) ?? f.maxHp;
        prev.set(f.uid, f.hp);
        if (f.hp === was) continue;
        const list = tok.get(f.uid) ?? [];
        tok.set(f.uid, list);
        if (f.hp < was) list.push(...perHit(was - f.hp, e.kind === 'hit' && e.target === f.uid ? e.hits ?? 1 : 1));
        else {
          let need = f.maxHp - f.hp;
          const keep = [];
          for (const n of list) { if (need <= 0) break; keep.push(Math.min(n, need)); need -= Math.min(n, need); }
          list.length = 0; list.push(...keep);
        }
      }
    }
    for (const sl of this.slots.values()) {
      const list = (tok.get(sl.uid) ?? []).filter((n) => n > 0);
      if (list.reduce((a, b) => a + b, 0) === Math.max(0, sl.maxHp - sl.hp)) { sl.tokens = list; sl.tokensEl.dataset.key = ''; this.drawTokens(sl, 0); }
    }
  }
  drawSides(view) {
    for (const s of SIDES) {
      const side = view.sides[s];
      const n = side.team.filter((f) => f.hp <= 0).length;
      this.koCount[s].textContent = n ? String(n) : '';
      this.wells[s].ko.dataset.none = n ? 'false' : 'true';
      this.koCount[s].setAttribute('aria-label', txt('mat.out', { n }, n));
    }
  }
  drawWorlds(view, motion = true) {
    for (const s of SIDES) {
      const side = view.sides[s];
      const f = side.team[side.active];
      const t = this.tint[s];
      if (!f || t.dataset.card === f.id) continue;
      t.dataset.card = f.id;
      t.style.backgroundImage = `url("${K.groundOf(f.id)}")`;
      if (motion && !this.reduced()) t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: OUT });
    }
  }
  /** The two leads print live from the gallery's one WebGL context; every other card prints from its poster. Until the
   *  page has started that context (ground()), the leads show their posters, the live print's first frame. */
  printLeads(view) {
    if (!this.groundOn) return;
    for (const s of SIDES) view.sides[s].team.forEach((f, i) => {
      const sl = this.slots.get(f.uid);
      if (sl && f.hp > 0 && i === view.sides[s].active && !this.ctx.frozen?.() && !sl.live && !sl.faceDown) this.reprint(sl, true);
    });
  }
  reprint(sl, live) {
    const old = sl.parts;
    const p = K.cardParts(sl.id, { size: 'mini', back: true, fx: true, live, parent: sl.flip });
    p.card.classList.add(sl.side === 'player' ? 'mine' : 'theirs');
    p.back.style.opacity = old.back?.style.opacity ?? '0';
    p.face.style.visibility = old.face.style.visibility;
    if (old.ink) p.ink.style.opacity = old.ink.style.opacity;
    sl.parts = p; sl.live = live;
    old.root.remove();
    this.seatArt(sl, false);
  }

  // ---------- the HUD on the cards
  count(sl, to, ms) {
    sl.tab.dataset.low = to <= sl.maxHp * 0.25 ? 'true' : 'false';
    countTo(sl.num, to, this.reduced() ? 0 : ms, this.g?.phone ? 60 : 0);
  }
  /** The tokens: one per hit, round ink with white numerals, folded into one past three. Sum = HP lost. */
  drawTokens(sl, slamLast = 0) {
    const list = sl.tokens.filter((n) => n > 0);
    // round 5: the plate carries the HP, so a card keeps one disc of the damage it has taken (summed from the second hit)
    const shown = list.length > 1 ? [list.reduce((a, b) => a + b, 0)] : list;
    const key = shown.join(',') + (list.length > 1 ? 'f' : '');
    if (sl.tokensEl.dataset.key === key) return;
    sl.tokensEl.dataset.key = key;
    sl.tokensEl.textContent = '';
    const made = shown.map((n, i) => {
      const t = el('b', 'token', sl.tokensEl, String(n));
      t.dataset.i = String(i);
      if (list.length > 1) t.dataset.fold = 'true';
      return t;
    });
    // a phone lays its tokens with a fade, not a slam: the contact's shake already carries the blow
    if (slamLast && !this.reduced()) made.slice(-slamLast).forEach((t) => this.anim(t, this.g?.phone ? [{ opacity: 0 }, { opacity: 1 }] : [{ scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1 }], { duration: this.g?.phone ? 140 : 220, easing: SLAM }));
  }
  face(sl, down, motion = true, ms = 320) {
    if (sl.faceDown === down && motion) return Promise.resolve();
    sl.faceDown = down;
    sl.el.dataset.face = down ? 'down' : 'up';
    const back = sl.parts.back;
    const show = () => { if (back) back.style.opacity = down ? '1' : '0'; sl.parts.face.style.visibility = down ? 'hidden' : ''; };
    if (!motion || this.reduced()) { show(); return Promise.resolve(); }
    // a flat turn: the card narrows to its edge, shows its other side, and opens again
    const half = ms / 2;
    return this.anim(sl.flip, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0.02)' }], { duration: half, easing: 'cubic-bezier(.5,0,1,1)' }).finished.catch(() => {}).then(() => {
      show();
      return this.anim(sl.flip, [{ transform: 'scaleX(0.02)' }, { transform: 'scaleX(1)' }], { duration: half, easing: 'cubic-bezier(0,0,.5,1)' }).finished.catch(() => {});
    });
  }
  ink(sl, v, motion = true) {
    const i = sl.parts.ink;
    if (!i) return;
    if (motion && !this.reduced()) this.anim(i, [{ opacity: Number(i.style.opacity || 0) }, { opacity: v }], { duration: 200, easing: OUT });
    i.style.opacity = String(v);
  }

  // ---------- events: one event's state lands (cheap, synchronous); the motion waits for flush()
  land(e, view) {
    this.view = view ?? this.view;
    const v = this.view;
    if (!v) return;
    for (const s of SIDES) v.sides[s].team.forEach((f) => {
      const sl = this.slots.get(f.uid);
      if (!sl) return;
      const before = sl.hp;
      sl.hp = f.hp; sl.maxHp = f.maxHp;
      setChips(sl.chips, chipsHtml(f, K.icon));
      // a tower built or upgraded: the chip swaps at the transform's impact cue (a Bayer swap), never before
      if (e.kind === 'transform' && e.fighter === f.uid) sl.formNext = f; else if (!sl.formNext) this.drawForm(sl, f, false);
      if (f.hp !== before) this.reactions.push({ uid: f.uid, from: before, to: f.hp, e });
      if (f.hp <= 0 && before > 0) this.falling.add(f.uid);
    });
    if (e.kind === 'ko') { const k = this.koOrder[e.side]; if (!k.includes(e.fighter)) k.push(e.fighter); }
    this.drawSides(v);
  }
  /** The reactions the landed events left: the damage numeral over the card (on a board ending), then one token per
   *  hit, the shake, the HP count. A multi-hit's numeral is one running total; its tokens land `every` apart. */
  flush(shot, o = {}) {
    const list = this.reactions.splice(0);
    const jobs = [];
    const rd = this.reduced();
    for (const r of list) {
      const sl = this.slots.get(r.uid);
      if (!sl) continue;
      const lost = r.from - r.to;
      const ms = rd ? 0 : 420;
      if (lost > 0) {
        const hit = r.e.kind === 'hit' && r.e.target === r.uid ? r.e : null;
        const hits = hit?.hits > 1 ? hit.hits : 1;
        const every = shot?.scene?.variant === 'full' ? 90 : 60;
        let t0 = 0;
        if (o.number && hit) {
          // one number per hit, owned by the card: it rides the card (to its KO stack too) and stays over its well
          // while the card is away in a scene, the damage that landed from its first frame, its tags right under it
          const g = this.g, out = r.to <= 0 && !shot?.told?.(sl.uid);
          this.numbered(sl.uid);
          numeral(this.motion, sl.el, { x: g.sW / 2, y: g.sH * 0.22, value: hit.damage, hits, tags: hitTags(hit, out), kind: hit.crit ? 'crit' : 'hit', color: hit.crit ? K.accent(this.ctx.cardOf(hit.actor ?? '')) : null, every, ticks: this.fx.ticks, size: g.sW * (hit.crit ? 0.42 : 0.36), side: sl.side, uid: sl.uid });
          // its tokens land as it rises out
          t0 = (this.fx.ticks && hits > 1 ? Math.max(126, hits * TICK_MS) : 126 + (hits - 1) * every) + NUMBER_HOLD;
        }
        // the contact itself: the card shakes and flashes at the impact; the tokens land one per hit after it
        if (!rd) this.shakeCard(sl, 6, 260);
        perHit(lost, hits).forEach((n, i) => {
          const later = () => { sl.tokens.push(n); this.drawTokens(sl, 1); if (!rd && (i > 0 || t0)) this.shakeCard(sl, 4, 220); };
          const at = t0 + i * every;
          if (!at || rd) later(); else setTimeout(later, at);
        });
        if (hit && !rd) this.silhouetteFlash(sl, hit.crit ? K.accent(this.ctx.cardOf(hit.actor ?? '')) : '#fff');
        this.count(sl, r.to, ms);
      } else if (lost < 0) {
        // a card back from the KO stack (Rollback): it turns face up and goes to its bench well with its HP
        if (r.from <= 0 && r.to > 0) this.revive(sl);
        // healed: take tokens off the top until they sum to what is lost now
        let need = sl.maxHp - r.to;
        const keep = [];
        for (const n of sl.tokens) { if (need <= 0) break; keep.push(Math.min(n, need)); need -= Math.min(n, need); }
        sl.tokens = keep;
        this.drawTokens(sl, 0);
        if (!rd) this.ring(sl, 'heal');
        this.count(sl, r.to, ms);
      }
      // keep the sum true to the snapshot
      const sum = sl.tokens.reduce((a, b) => a + b, 0), want = Math.max(0, sl.maxHp - r.to);
      if (sum !== want && lost <= 0) { sl.tokens = want ? [want] : []; this.drawTokens(sl, 0); }
      jobs.push(wait(Math.min(ms, o.budget ?? ms)));
    }
    this.chips(shot);
    return Promise.all(jobs);
  }
  /** What else the shot changed, as chips on the cards (fx.js postTags), once per shot: under the struck card's number
   *  from + 450 after a damaging contact, on the acting card's top at once for a support move or a tower. */
  chips(shot) {
    if (!this.fx.chips || !shot?.post?.length || this.chipped === shot) return;
    this.chipped = shot;
    const g = this.g, imp = this.impactAt?.shot === shot ? this.impactAt.t : performance.now();
    postTags(shot.post, {
      motion: this.motion, auto: Boolean(this.ctx.auto?.()), at: imp, icon: (n) => ico(n),
      chip: (c) => (c.kind === 'transform' ? `${stillHtml(formKey(c.form.form, c.form.level ?? 1), { h: 20, hi: true, accent: c.form.accent, cls: 'tw-still tw-plate' })}<b>${c.text}</b>${pipsHtml(c.form.level ?? 1, { accent: c.form.accent })}` : c.kind === 'status' ? `<span style="--s:${STATUS_COLOR[c.status] ?? 'currentColor'}">${ico(c.icon)}</span><b>${c.text}</b>` : ''),
      anchorOf: (uid, { self }) => {
        const sl = this.slots.get(uid);
        if (!sl || !g) return null;
        // the struck card: under its number and the number's tags; the acting card: on its art, clear of its tab, its
        // tower chip and the actor tag
        return self ? { layer: sl.el, x: g.sW / 2, y: g.sH * 0.3, above: false } : { layer: sl.el, x: g.sW / 2, y: g.sH * 0.22 + g.sW * 0.36 + 34 };
      },
    });
  }

  // ---------- small board effects
  shakeCard(sl, amp, ms) {
    const k = sl.side === 'rival' ? 1 : -1, f = [];
    // a phone: a shorter, smaller shake with no turn in it (a translate the compositor moves alone)
    const ph = this.g?.phone, n = ph ? 4 : 8, a = ph ? amp * 0.6 : amp;
    for (let i = 0; i <= n; i++) { const d = (1 - i / n) ** 2; f.push({ transform: ph ? `translate3d(${((i % 2 ? -1 : 1) * a * d * k).toFixed(2)}px,0,0)` : `translate3d(${((i % 2 ? -1 : 1) * a * d * k).toFixed(2)}px,${(-a * 0.3 * d).toFixed(2)}px,0) rotate(${((i % 2 ? -1 : 1) * 1.2 * d).toFixed(2)}deg)` }); }
    this.anim(sl.shake, f, { duration: ph ? Math.round(ms * 0.75) : ms, easing: 'linear' });
  }
  silhouetteFlash(sl, color = '#fff') {
    sl.flash.style.background = color;
    this.anim(sl.flash, [{ opacity: 0.85 }, { opacity: 0.85, offset: 0.25 }, { opacity: 0 }], { duration: 160, easing: 'ease-out' });
  }
  stampText(sl, text, kind, ms = 600) {
    const s = sl.stamp;
    s.textContent = text; s.dataset.kind = kind;
    const tilt = kind === 'crit' ? -8 : -4;
    if (this.reduced()) { s.style.opacity = '1'; setTimeout(() => { s.style.opacity = '0'; }, 1400); return wait(0); }
    return this.anim(s, [{ opacity: 0, transform: `rotate(${tilt}deg) scale(${kind === 'crit' ? 2 : 1.5})` }, { opacity: 1, transform: `rotate(${tilt}deg) scale(1)`, offset: 0.18 }, { opacity: 1, transform: `rotate(${tilt}deg) scale(1)`, offset: 0.82 }, { opacity: 0, transform: `rotate(${tilt}deg) scale(.96)` }], { duration: ms, easing: SLAM }).finished.catch(() => {});
  }
  ring(sl, kind) {
    const r = sl.ring;
    r.dataset.kind = kind;
    if (this.reduced()) return;
    this.anim(r, [{ opacity: 0.9, transform: 'scale(.92)' }, { opacity: 0, transform: 'scale(1.22)' }], { duration: 520, easing: OUT });
  }

  // ---------- where scenes open from and land on (viewport px)
  activeSlot(side) {
    const v = this.view; if (!v) return null;
    const f = v.sides[side].team[v.sides[side].active];
    return f ? this.slots.get(f.uid) : null;
  }
  /** Where each side's plate stands (round 5, shared/hud.js): beside its active card on a wide mat. The mat is tilted
   *  8 degrees, so the box is read off the well's painted rectangle, not the flat geometry. */
  plateBox(side) {
    if (this.g?.phone) return this.g.plates?.[side] ?? null;
    const z = this.g?.zones[side];
    if (!z?.plate) return null;
    // the wells live under the camera, which pushes in for board scenes: measure only at rest, else the last resting box
    const cam = this.camEl ? getComputedStyle(this.camEl).transform : 'none';
    const key = `${this.g.W}x${this.g.H}`, pl = z.plate;
    this.restPlates ??= {};
    if (cam !== 'none' && !/^matrix\(1, 0, 0, 1, 0, 0\)$/.test(cam)) return this.restPlates[key]?.[side] ?? (pl.foot ? { x: pl.x, bottom: pl.y + pl.h, w: pl.w } : { x: pl.x, y: pl.y, w: pl.w });
    const w = this.wells?.[side]?.active?.getBoundingClientRect();
    if (!w || !w.width) return pl;
    const right = pl.x > z.active.x;
    const gap = right ? pl.x - (z.active.x + z.active.w) : z.active.x - (pl.x + pl.w);
    const x = right ? w.right + gap : w.left - gap - pl.w;
    // yours from the top of its card (your leader stands under it), the rival's from the foot (its leader above)
    const box = pl.foot ? { x, bottom: w.bottom, w: pl.w } : { x, y: w.top, w: pl.w };
    (this.restPlates[key] ??= {})[side] = box;
    return box;
  }
  /** The battle log's rail on a wide screen. */
  logBox() { return this.g?.log ?? null; }
  anchor(role, side) {
    const sl = this.activeSlot(side);
    if (!sl) return null;
    // an attacker's place is read as its turn begins, before the lift writes anything, so the scene's first frame
    // never has to lay the page out again just to find the card
    const a = this.src;
    if (role === 'source' && a && a.n === this.cueN && a.sl === sl) return a.rect;
    return sl.parts.root.getBoundingClientRect();
  }

  // ---------- a scene staged on the mat: the band between the two rows
  /** Where a scene plays (the seam's stageBox): first uses, send-ins, knockouts and the minor beats play in a band across
   *  the mat between its two rows, so the rim, the benches, the KO stacks and both leaders stay on the table, dimmed by
   *  the bars. The lead entrances and the match's last knockout keep the whole window; a short attack is the board's. */
  stageBox(shot) {
    const s = shot?.scene, g = this.g;
    if (!s || !g || this.reduced()) return null;
    const lead = s.kind === 'switch' && shot.post[0]?.reason === 'lead';
    const on = (s.kind === 'attack' && s.variant === 'full') || (s.kind === 'switch' && !lead) || (s.kind === 'ko' && !shot.finish) || ['item', 'trait', 'status', 'guard', 'transform'].includes(s.kind);
    if (!on) return null;
    // the band runs between the rows' outer cards (benches and KO stacks), reaching a little into them
    const Z = g.zones, outer = (z) => [...z.bench, z.ko];
    const up = Math.max(...outer(Z.rival).map((b) => b.y + b.h)), down = Math.min(...outer(Z.player).map((b) => b.y));
    const bH = Z.player.bench[0].h;
    const into = g.phone ? 0.18 * bH : 0.18 * bH;
    const band = Math.round(down - up + 2 * into), mid = (up + down) / 2;
    const margin = Math.round(band * 0.32), height = band + 2 * margin;
    const top = Math.round(mid - height / 2);
    return { top, height, open: band / height, band: { top: Math.round(mid - band / 2), height: band } };
  }
  /** Where a leader's cut-in stands (the page's cut-in, MODES.md section 6): beside the band the scene is staged in, on
   *  its side of the table, the rival's above the band at the left and yours below its host at the right, so it never
   *  lies over the band, where the call-out and the dealt card are. */
  cutinAt(side, w, h, box) {
    if (!box?.band) return null;
    // each leader steps in on its own end of the table: the rival's top right, yours bottom left
    if (side === 'rival') return { x: innerWidth - 16 - w, y: Math.max(8, box.band.top - 10 - h) };
    return { x: 16, y: Math.min(innerHeight - 8 - h, box.top + box.height + 10) };
  }
  /** The board's half of the bars: the window above and below the band's host, dimmed as the bars dim the mat. */
  dimOn(box, on) {
    const d = this.dim;
    if (!d) return;
    if (on && box) {
      d.top.style.height = `${Math.max(0, box.top)}px`;
      d.bottom.style.transform = `translate3d(0,${box.top + box.height}px,0)`;
      d.bottom.style.height = `${Math.max(0, innerHeight - box.top - box.height)}px`;
    }
    for (const e of [d.top, d.bottom]) {
      const to = on ? 1 : 0;
      if (Number(e.style.opacity || 0) === to) continue;
      e.style.opacity = String(to);
      if (!this.reduced()) this.anim(e, [{ opacity: 1 - to }, { opacity: to }], { duration: on ? 140 : 180, easing: OUT });
    }
  }

  // ---------- the camera: one 2D transform on the mat and everything on it
  restRect(e) {
    const r = e.getBoundingClientRect(), c = this.cam;
    return { x: (r.left - c.x) / c.k, y: (r.top - c.y) / c.k, w: r.width / c.k, h: r.height / c.k };
  }
  camera(to, ms, easing = IN_OUT) {
    this.cam = to;
    const tf = to.k === 1 && !to.x && !to.y ? 'none' : `translate3d(${to.x.toFixed(1)}px,${to.y.toFixed(1)}px,0) scale(${to.k.toFixed(4)})`;
    return this.tween(this.camEl, tf, this.reduced() ? 0 : ms, easing);
  }
  /** Push on a card at the contact: everything that reads it (the card, its tab, the numeral over it) stays inside the
   *  open frame between the bars at 0.86, and the mat keeps filling the frame wherever it can. */
  pushOn(sl, k, ms) {
    if (!sl || this.reduced()) return Promise.resolve();
    const r = this.restRect(sl.parts.root);
    const box = [r.x, r.y - r.h * 0.12, r.x + r.w, r.y + r.h];
    return this.camera(frameOn({ box, c: { x: r.x + r.w / 2, y: r.y + r.h / 2 }, k, W: innerWidth, H: innerHeight, margin: 8, fill: this.g.mat, kMin: 0 }), ms, 'cubic-bezier(.3,.7,.1,1)');
  }
  rest(ms) { return this.camera({ x: 0, y: 0, k: 1 }, ms); }

  // ---------- the board's motion around a scene (the seam's cue)
  lift(sl, on, ms) {
    if (!sl) return Promise.resolve();
    sl.parts.card.classList.toggle('lift', on);
    sl.el.dataset.lift = on ? 'true' : 'false';
    return this.tween(sl.lift, on ? `translate3d(0,-6px,40px) rotateX(${-this.g.tilt}deg) scale(1.06)` : 'none', ms, on ? SLAM : OUT);
  }
  /** The lead's world leaves its trim through the 4x4 Bayer, filling the frame before the scene takes it. */
  pour(side, ms) {
    const t = this.tint[side];
    if (this.reduced() || !ms) return Promise.resolve();
    const a = this.anim(t, [{ transform: t.style.transform, opacity: 1 }, { transform: `${t.style.transform} scale(2.6)`, opacity: 1 }], { duration: ms, easing: 'cubic-bezier(.5,0,.9,.6)' });
    t.dataset.pour = 'true';
    return a.finished.catch(() => {}).then(() => { delete t.dataset.pour; });
  }
  slotOf(side, id) { for (const sl of this.slots.values()) if (sl.side === side && sl.id === id) return sl; return null; }
  back() { if (this.away) { delete this.away.el.dataset.away; this.away = null; } }
  async cue(verb, shot, at) {
    if (verb === 'deal') return this.deal();
    if (at === 'pre') this.cueN = (this.cueN ?? 0) + 1;
    const s = shot?.scene, side = s?.side ?? 'player', foe = side === 'player' ? 'rival' : 'player';
    if (at === 'pre' && verb === 'command' && s?.variant !== 'off') { const sl = this.activeSlot(side); this.src = sl ? { n: this.cueN, sl, rect: sl.parts.root.getBoundingClientRect() } : null; }
    const full = s?.variant === 'full', rd = this.reduced(), auto = Boolean(this.ctx.auto?.());
    // under Auto a short attack's pre-roll is 90 ms, as in the Arena (the lift holds on into the scene's build either way)
    const budget = rd ? 0 : at === 'pre' ? (full ? 240 : auto ? 90 : 120) : at === 'post' ? (full ? 260 : 140) : 0;
    const L = this.leaders[side], Lo = this.leaders[foe];
    const me = this.activeSlot(side), them = this.activeSlot(foe);
    if (at === 'pre') {
      switch (verb) {
        case 'command': {
          L.act('command'); L.say('command');
          if (shot.cut) {
            // a repeat on the board alone: the card lifts with its move's name stamped on it, the camera finds the
            // defender, and the contact lands (190 ms), never before the defender's last number has been read; under
            // reduced motion only the name is stamped
            // (the actor tag, when the page sends one, is the cut's stamp: side, discipline and move on the card's top)
            const stamp = () => { if (!me) return; if (this.tagNext?.shot === shot) this.tagOn(me, this.tagNext, 500); else this.stampText(me, s.move?.name ?? s.title, 'move', 520); };
            if (rd) { if (them) await this.untilRead(them.uid); stamp(); return undefined; }
            if (them) await this.untilRead(them.uid, 190);
            this.lift(me, true, 90);
            stamp();
            await wait(90);
            // set down as the camera finds the defender, so the contact lands clear of its name and HP tab
            this.lift(me, false, 100);
            this.pushOn(them, 1.3, 100);
            return wait(100);
          }
          this.lift(me, true, Math.min(160, budget));
          if (full) this.pour(side, budget);
          return wait(budget);
        }
        case 'entrance': {
          const sl = this.slots.get(shot.post[0]?.to);
          L.act('entrance'); L.say('enter');
          if (sl) { this.drawWorlds(this.view); await this.face(sl, false, !rd, 320); this.printLeads(this.view); this.lift(sl, true, Math.min(160, budget)); }
          return wait(Math.max(0, budget - 320));
        }
        case 'switch': {
          const e = shot.post[0];
          L.act('switch');
          // the outgoing card slides to its bench well and the chosen card into the active well, crossing
          const v = e?.state ?? this.view;
          const inc = this.slots.get(e?.to);
          if (inc) inc.el.style.zIndex = '3';
          await this.place(v, true, rd ? 0 : full ? 360 : auto ? 200 : 240);
          if (inc) inc.el.style.zIndex = '';
          this.drawWorlds(v);
          this.printLeads(v);
          return undefined;
        }
        case 'item': { const e = shot.post[0]; await this.untilRead(e?.target, rd ? 0 : auto ? 200 : 300); await this.itemFly(side, this.slots.get(e?.target), e?.name ?? '', rd ? 0 : auto ? 200 : 300); return undefined; }
        case 'ko': return undefined;
        case 'transform': {
          L.act('command');
          if (s?.variant !== 'off') this.lift(me, true, Math.min(160, budget));
          // (fix pass 2, M1: the title stands clear of every card, tag and plate; the old tower dissolves through the
          // 4x4 Bayer over the pre-roll, so the card's window is an empty lot until the new one lands at the impact)
          this.titleSpot(shot);
          const e = shot.post.find((x) => x.kind === 'transform'), sl = this.slots.get(e?.fighter) ?? me;
          loadFigs();
          if (sl && !rd && !auto && s?.variant !== 'off') this.artOut(sl, full ? 420 : 260);
          return s?.variant === 'off' ? wait(rd ? 0 : 110) : wait(budget);
        }
        default: return s?.variant === 'off' ? undefined : wait(Math.min(budget, 120));
      }
    }
    if (at === 'start') {
      if (shot.box) this.dimOn(shot.box, true);
      if (verb === 'transform') {
        this.titleSpot(shot);
        if (full && !rd && !auto) { const e = shot.post.find((x) => x.kind === 'transform'); this.buildIn(this.slots.get(e?.fighter) ?? me, shot, e?.to); }
      }
      // the dealt card has left its well: one of each card on screen
      const sl = this.slotOf(side, s.card);
      if (sl && (full || s.variant === 'short') && (s.kind === 'attack' || s.kind === 'switch')) { this.back(); sl.el.dataset.away = 'true'; this.away = sl; }
      return undefined;
    }
    if (at === 'board') {
      // the result is staged from the board: the winner's cards rise and the leaders pose while the title holds
      if (verb === 'victory' || verb === 'defeat' || verb === 'draw') { this.finaling = this.finale(s?.side ?? 'player', verb); return undefined; }
      // the board ending: the attacker's card is back in its well, set down, as the world clears, and the camera pushes
      // on the defender (impact - 130 ms): nothing stands over the defender's name or its HP tab at the contact
      this.back();
      if (verb === 'support') return this.pushOn(me, 1.18, 200);
      this.lift(me, false, 120);
      this.special(shot, me, them, verb);
      return this.pushOn(them, 1.3, 220);
    }
    if (at === 'impact') {
      this.impactAt = { shot, t: performance.now() };
      // the actor tag leaves after the contact (+ 400, Auto + 300), the reticle at + 300
      // (under reduced motion a build or upgrade keeps its tag's own 1200 ms hold: its still's impact comes at once and
      // carries no call-out, and who builds must read; an attack's still names its own actor)
      if (!shot.cut && me && !(rd && verb === 'transform')) wait(rd ? 0 : auto ? 300 : 400).then(() => { if (me.tagShot === shot) this.tagOff(me, auto ? 120 : 160); });
      // (a cut's reticle keeps its own hold from the contact, 450 ms or 900 reduced, beats.js cutHold: this timer took it
      // a task after the contact under reduced motion, so a sample a frame late found no reticle, S3 Mat reduced)
      if (shot.board && !shot.cut && them) wait(rd ? 0 : 300).then(() => { if (them.rtcShot === shot) this.reticleOff(them, 120); });
      if (shot.cut && verb !== 'support') this.special(shot, me, them, verb);
      switch (verb) {
        case 'hit': case 'crit': {
          if (shot.board) this.flush(shot, { number: true });
          this.fallNow();
          Lo.act('taken');
          if (them && them.hp > 0 && them.hp <= them.maxHp / 2) Lo.say('hit');
          if (verb === 'crit') { L.act('special'); L.say('special'); }
          return undefined;
        }
        case 'miss': if (shot.board && them && !rd) this.sidestep(them); return undefined;
        case 'support': if (shot.board) { this.ring(me, 'support'); this.flush(shot); this.supportChip(me, s); } return undefined;
        case 'status': { this.flush(shot); this.fallNow(); const sl = this.slots.get(shot.post[0]?.fighter); if (sl && !rd) this.anim(sl.chips, [{ rotate: '-6deg' }, { rotate: '5deg' }, { rotate: '0deg' }], { duration: 240 }); return undefined; }
        case 'guard': { const sl = this.slots.get(shot.post[0]?.fighter); if (sl) this.press(sl); this.flush(shot); return undefined; }
        case 'trait': { const sl = this.slots.get(shot.post[0]?.fighter) ?? me; this.flush(shot); if (sl && s.variant === 'off') this.stampText(sl, s.title, 'trait', 600); return undefined; }
        case 'item': { this.flush(shot); const sl = this.slots.get(shot.post[0]?.target); if (sl) this.ring(sl, 'heal'); return undefined; }
        case 'transform': {
          // the tower chip swaps through the 4x4 Bayer (240 ms, Auto 200) and the card lifts 1.03 for 120 ms; the art
          // window takes the new tower (0.92 -> 1.04 -> 1 with the accent rim; Auto and the board's own the rim only)
          const e = shot.post.find((x) => x.kind === 'transform'), sl = this.slots.get(e?.fighter) ?? me;
          if (sl) { this.swapForm(sl, rd ? 0 : auto ? 200 : 240, { rimOnly: auto || s?.variant === 'off' }); if (!rd) this.anim(sl.lift, [{ scale: 1 }, { scale: 1.03 }, { scale: 1 }], { duration: 240, easing: OUT }); }
          this.flush(shot);
          return undefined;
        }
        default: this.flush(shot); this.fallNow(); return undefined;
      }
    }
    // post
    this.back();
    if (shot?.box) this.dimOn(null, false);
    switch (verb) {
      case 'hit': case 'crit': case 'miss': case 'support': {
        // a full scene kept its own ending; the board's reaction follows it here
        if (!shot.board) {
          if (verb === 'miss' && them && !rd) this.sidestep(them);
          if (verb === 'support') { this.ring(me, 'support'); this.supportChip(me, s); }
          this.flush(shot);
          if (verb !== 'support') this.special(shot, me, them, verb);
        }
        const settle = () => Promise.all([this.rest(budget), this.lift(me, false, budget)]);
        // a cut holds its push on the defender while its number lands, then settles unless the next shot has begun
        if (shot.cut) { this.later(300, settle); return wait(rd ? 0 : 80); }
        const back = settle();
        // under Auto the camera's return overlaps the next shot's pre-roll, as in the Arena
        if (auto) return undefined;
        await wait(budget);
        return back;
      }
      case 'entrance': { const sl = this.slots.get(shot.post[0]?.to); this.flush(shot); return this.lift(sl, false, budget); }
      case 'switch': this.flush(shot); return this.lift(this.activeSlot(side), false, budget);
      case 'ko': return this.knockOut(shot.post[0], rd ? 0 : auto ? 340 : 420);
      case 'transform': {
        // (a cue cut short before its impact still lands the new tower, and never leaves the window empty)
        const e = shot.post.find((x) => x.kind === 'transform'), sl = this.slots.get(e?.fighter) ?? me;
        if (sl?.formNext || sl?.artOuting || sl?.artNext) this.swapForm(sl, 0);
        this.flush(shot); const back = this.lift(me, false, budget);
        // (reduced: a later build is the board's still alone and holds 360, as the Arena's, so its tag reads before the
        // tower's attack takes the card; it ended in the frame it began, S3 Mat reduced #25)
        if (rd && s?.variant === 'off') return wait(360);
        return auto ? undefined : back;
      }
      case 'victory': case 'defeat': case 'draw': { const f = this.finaling ?? this.finale(s?.side ?? 'player', verb); this.finaling = null; return f; }
      default: this.flush(shot); if (this.reviving) return this.reviving; return s?.variant === 'off' ? undefined : wait(Math.min(budget, 120));
    }
  }
  /** A miss: the defender slides 18 px aside and back, and a Miss plate sits where the token would. */
  sidestep(sl) {
    const k = sl.side === 'rival' ? -1 : 1;
    this.anim(sl.shake, [{ transform: 'none' }, { transform: `translate3d(${18 * k}px,-3px,0) rotate(${3 * k}deg)`, offset: 0.4 }, { transform: 'none' }], { duration: 240, easing: OUT });
    this.stampText(sl, txt('scene.miss'), 'miss', 700);
  }

  /** The battle's opening: the six cards dealt face down from each side's deck edge, then the benches turned face up.
   *  Every card that may print live later has its program drawn once now, during the deal. */
  /** The gallery's ground has started (the page starts it once the board waits for a command and the page is idle):
   *  the leads print live, and every card's program warms, one per idle slice, so a later send-in prints live without
   *  a hitch. */
  ground(G) {
    if (!G || this.groundOn) return;
    this.groundOn = true;
    this.printLeads(this.view);
    if (!G.prewarm) return;
    const ids = [...new Set([...this.slots.values()].map((sl) => sl.id))];
    const idle = (f) => (window.requestIdleCallback ? requestIdleCallback(f) : setTimeout(f, 200));
    let tries = 0;
    const go = () => {
      if (!this.alive || !ids.length) return;
      let ok = false;
      try { ok = G.prewarm([ids[0]]); } catch { ok = true; }
      if (ok) { ids.shift(); tries = 0; idle(go); } else if (++tries < 20) setTimeout(go, 150);
    };
    idle(go);
  }
  async deal() {
    const g = this.g, rd = this.reduced();
    const benches = [...this.slots.values()].filter((sl) => sl.zone === 'bench');
    if (!rd) {
      const order = [];
      for (const z of ['bench', 'active']) for (const side of ['rival', 'player']) for (const sl of this.slots.values()) if (sl.side === side && sl.zone === z) order.push(sl);
      await Promise.all(order.map((sl, i) => {
        const to = sl.el.style.transform, M0 = g.mat;
        const fx = sl.side === 'player' ? -g.aW * 0.6 : M0.w - g.aW * 0.4, fy = sl.side === 'player' ? M0.h + g.aH * 0.2 : -g.aH * 1.2;
        sl.el.style.opacity = '0';
        return wait(i * 90).then(() => {
          sl.el.style.opacity = '';
          return this.anim(sl.el, [{ transform: `translate3d(${fx}px,${fy}px,0) scale(.55) rotate(${sl.side === 'player' ? -14 : 14}deg)` }, { transform: to }], { duration: 380, easing: SLAM }).finished.catch(() => {});
        });
      }));
    }
    this.dealing = false;
    await Promise.all(benches.map((sl, i) => (rd ? this.face(sl, false, false) : wait(i * 60).then(() => this.face(sl, false, true, 320)))));
  }

  /** The card's own answer on the table (specials.js): the most specific definition for its card and move. */
  special(shot, me, them, verb) {
    const s = shot?.scene;
    if (!s?.move || !me || !them || this.reduced()) return;
    const d = specials.find(s.card, s.move.id);
    if (!d) return;
    const rectOf = (sl) => this.local(this.rectOf(sl, { zone: 'active' }));
    try {
      d.play({
        layer: this.fxLayer, M: this.g.mat, from: rectOf(me), to: rectOf(them), side: s.side, hits: s.hits ?? 1, crit: verb === 'crit', miss: verb === 'miss',
        seed: (this.view?.turn ?? 1) * 7 + (s.move.index ?? 0), subject: K.subjectOf(s.card)?.src, ...this.fxKit(),
      });
    } catch (err) { console.warn('special', s.card, err); }
  }
  /** A mark the battle leaves on the mat (a scorch); the last eight stay. */
  decal(kind, at) {
    const d = el('i', `mat-decal mat-decal-${kind}`, this.decals);
    const r = at.r;
    d.style.width = `${r * 2}px`; d.style.height = `${r * 1.1}px`;
    d.style.transform = `translate3d(${(at.x - r).toFixed(1)}px,${(at.y - r * 0.55).toFixed(1)}px,0) rotate(${((at.x * 7) % 30 - 15).toFixed(1)}deg)`;
    if (!this.reduced()) this.anim(d, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
    while (this.decals.children.length > 8) this.decals.firstElementChild.remove();
  }
  press(sl) {
    sl.el.dataset.guard = 'true';
    setTimeout(() => { sl.el.dataset.guard = 'false'; }, 1400);
    if (this.reduced()) return;
    this.anim(sl.lift, [{ transform: 'none' }, { transform: 'translate3d(0,3px,-12px) scale(.97)', offset: 0.5 }, { transform: 'none' }], { duration: 480, easing: OUT });
    this.anim(sl.shield, [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1.04)', offset: 0.4 }, { opacity: 0, transform: 'scale(1.1)' }], { duration: 640, easing: OUT });
  }
  supportChip(sl, scene) { if (sl && scene?.label && !this.fx.chips) this.stampText(sl, scene.label, 'support', 900); }

  // ---------- round 6: the form chip, the actor tag and the reticle on the cards
  /** A form card's tower in its art well under the card's printed head: its still (28 px, 22 on a phone), its name,
   *  its stars and branch. */
  drawForm(sl, f, motion = true) {
    if (!sl?.form) return;
    const has = f && f.form !== undefined && f.form !== null;
    sl.el.toggleAttribute('data-form', Boolean(has));
    if (!has) { sl.form.hidden = true; sl.form.dataset.k = ''; this.drawArt(sl, null); return; }
    const info = formInfo(sl.id, f.form), k = `${f.form}:${f.level}`;
    if (sl.form.dataset.k !== k) {
      sl.form.dataset.k = k;
      sl.form.hidden = false;
      sl.form.style.setProperty('--ta', info.accent ?? 'currentColor');
      sl.form.setAttribute('role', 'img');
      sl.form.setAttribute('aria-label', txt('form.aria', { name: info.name, level: levelWord(f.level) }));
      // (a phone's chip that drops its stars keeps its level as one figure, "2" or "4A", fixes-2 M1 after the critic)
      const { n, branch } = levelParts(f.level);
      sl.form.innerHTML = `${stillHtml(formKey(f.form, f.level), { h: this.g?.phone ? 22 : 28, card: sl.id, accent: info.accent })}<b>${info.name}</b>${pipsHtml(f.level, { accent: info.accent })}<span class="tw-lv" aria-hidden="true">${n}${branch ? branch.toUpperCase() : ''}</span>`;
    }
    // (the window after the chip: its tower is seated against the chip it stands beside)
    this.drawArt(sl, f);
  }
  /** The chip never cuts its name; where it is seated is seatArt's (fixes-3 M1). */
  fitChip(sl) {
    const c = sl?.form;
    if (!c || c.hidden) return;
    this.seatArt(sl);
  }
  /** The card's art window: the standing form's front still on its own lit stage, or the card's own art for its
   *  starting form (decision 10: `lab-1` is the card's art). It stays through knockouts, switches and reprints. */
  drawArt(sl, f) {
    sl.artWant = f ?? null;
    const st = FORMS[sl.id]?.start, own = st ? formKey(st.form, st.level ?? 1) : null;
    const key = f ? formKey(f.form, f.level ?? 1) : null;
    // (the manifest comes the first time a tower other than the starting one stands; until then the window holds, and
    // a lost fetch is tried again: fixes-3 M1, never the card's own art for a tower that is not the starting one)
    if (key && key !== own && !figs && (!figsDone || figsTries < 4)) {
      sl.figsWait ??= () => { if (this.alive) this.drawArt(sl, sl.artWant); };
      figsWait.add(sl.figsWait);
      loadFigs();
      if (sl.art) this.seatArt(sl);
      return;
    }
    const m = figs?.[sl.id], v = key && key !== own && m?.forms?.[key] ? formView(m, 'front', key) : null;
    const want = v?.box ? key : '';
    if ((sl.art?.dataset.k ?? '') === want) { this.seatArt(sl); return; }
    const old = sl.art;
    sl.art = null;
    old?.remove();
    if (!want) { delete sl.el.dataset.art; this.seatArt(sl); return; }
    sl.art = this.artEl(sl, f, want, v);
    sl.el.dataset.art = 'form';
    this.seatArt(sl);
  }
  /** One tower's window: its front still on its own lit stage in its accent, a pool that rises through the window at
   *  each level (fixes-2 M1 after the critic). The still is laid in its opaque box by percentages, and the box is sized
   *  in the window's own units by seatArt (`--fh` its height, `--ff` its foot, `--fx` its left), so the tower is the
   *  window's subject at every width (fixes-3 M1). `.fa-scaf` is the build's scaffold (M2). */
  artEl(sl, f, key, v) {
    const info = formInfo(sl.id, f.form), [x0, y0, x1, y1] = v.box, ow = x1 - x0, oh = y1 - y0, p = (x) => `${x.toFixed(3)}%`;
    const a = el('span', 'form-art');
    a.dataset.k = key;
    a.dataset.n = String(levelParts(f.level).n);
    a.dataset.form = f.form;
    a.style.setProperty('--ta', info.accent ?? '#fff');
    a.style.setProperty('--ar', (ow / oh).toFixed(4));
    a.style.setProperty('--ft', String(this.artH(f.level)));
    a.innerHTML = `<i class="fa-set"></i><i class="fa-scaf"></i><span class="fa-fig"><span class="fa-in"><i class="fa-glow"></i><img alt="" decoding="async" src="${new URL(v.lo ?? v.src, FIGURES).href}" style="left:${p((-x0 / ow) * 100)};top:${p((-y0 / oh) * 100)};width:${p((v.w / ow) * 100)};height:${p((v.h / oh) * 100)}"></span></span><i class="fa-rim"></i>`;
    return a;
  }
  /** A tower's height in its window (percent of the window's height) at a level: at least three quarters of the
   *  window, a step taller each level where the window has the room (fixes-3 M1, owner-3: "the tower is the window's
   *  subject and not a corner icon"). */
  artH(level) {
    return [75, 79, 83, 87][clamp(levelParts(level).n, 1, 4) - 1];
  }
  /** fixes-3 M1. A form card's window is its tower's: the tower stands centred in the window at three quarters of its
   *  height or more, foot on the window's lower edge; the damage disc keeps the window's left third; the chip is the
   *  tower's nameplate under the window. Where the card prints nothing under its window (a phone's card, a bench
   *  card), the plate stands wholly under it and the buffs under the plate; where the card's moves are printed there,
   *  the plate straddles the window's lower edge, right of the disc, and the buffs stack over the disc. Every place
   *  is a translation from the element's own CSS spot (CLS 0), measured in the card's laid pixels. */
  seatArt(sl, measure = true) {
    const face = sl.parts?.face;
    if (!face) return;
    const en = face.querySelector('.en');
    if (sl.art && sl.art.parentElement !== face) { if (en) en.after(sl.art); else face.prepend(sl.art); }
    if (sl.artNext && sl.artNext.previousElementSibling !== (sl.art ?? en)) { if (sl.art) sl.art.after(sl.artNext); else if (en) en.after(sl.artNext); else face.prepend(sl.artNext); }
    // (a reprint only moves the window into the new face: its box is the card's laid width's, measured when that changed)
    if (!measure) return;
    const c = sl.form, S = sl.shake, SW = S.offsetWidth, SH = S.offsetHeight, pn = face.querySelector('.pane');
    if (!c || c.hidden || !SW || !SH || !pn) return;
    const fw = face.offsetWidth, fh = face.offsetHeight;
    if (!fw || !fh) return;
    // (the face fills the slot, scaled to it: each part's place is read from the layout, never through the mat's tilt,
    // a shake's turn or a flip, so a seat at any moment of a shot gives the same numbers and shifts nothing)
    const kx = SW / fw, ky = SH / fh;
    const off = (e) => { let x = 0, y = 0; for (let n = e; n; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return [x, y]; };
    const [fx0, fy0] = off(face);
    const loc = (e) => { const [x, y] = off(e); return { l: (x - fx0) * kx, t: (y - fy0) * ky, r: (x - fx0 + e.offsetWidth) * kx, b: (y - fy0 + e.offsetHeight) * ky }; };
    const P = loc(pn);
    P.w = P.r - P.l; P.h = P.b - P.t;
    if (P.w < 4 || P.h < 4) return;
    const hd = face.querySelector('.top'), top = Math.max(P.t, hd?.offsetHeight ? loc(hd).b + 2 : P.t + P.h * 0.15);
    // the first thing the card prints under its window (a move, a trait, the weakness row), or its foot
    let text = SH - 3;
    for (const e of face.querySelectorAll('.band > *, .foot, .no')) { if (!e.offsetHeight) continue; const q = loc(e); if (q.t >= P.b - 2 && q.t < text) text = q.t; }
    // the disc's column: its folded size (the larger), at the window's left
    const dW = SW * 0.27, dL = P.l + 3, dR = dL + dW;
    // the plate: wholly under the window where nothing is printed there, else straddling its lower edge
    const ch = c.offsetHeight || 26, below = text - P.b >= ch + 5;
    const room = below ? SW * 0.94 : P.r - dR - 8;
    // (past its room it shows its level as one figure, then, under the window, takes a second line, and only on a card
    // too small for that shows the level alone, as a benched card does: never a cut name)
    // (wrapped, the plate flows as text, its level figure after the name's last word; a word wider than its line steps
    // the type down once before the name drops: the name itself is measured, as max-width clamps the plate to its room,
    // critic after fixes-3 M1: 'Firestone' was cut at 375)
    // (a seat whose plate, room and place are unchanged keeps its fit: trying the fits again re-lays the plate out in
    // the frame its --fcy moves, which Chrome counts as a layout shift; Mat 360 frozen read 0.042 on it in mid-shot seats)
    const fitKey = `${c.textContent}|${Math.floor(room)}|${below}`;
    if (c.dataset.fitKey !== fitKey) {
      delete c.dataset.fit;
      this.setVars(c, { '--cmax': `${Math.floor(room)}px` });
      const over = () => c.offsetWidth > room + 0.5 || c.scrollWidth > c.clientWidth + 0.5;
      if (c.offsetWidth > room) {
        c.dataset.fit = 'stars';
        if (below && over()) c.dataset.fit = 'stars wrap';
        if (below && over()) c.dataset.fit = 'stars wrap small';
        if (over()) c.dataset.fit = 'stars name';
      }
      c.dataset.fitKey = fitKey;
    }
    const ch2 = c.offsetHeight || ch, cw = c.offsetWidth, cy = below ? P.b + 3 : Math.max(P.t + P.h * 0.5, text - 2 - ch);
    const foot = below ? P.t + P.h * 0.97 : Math.min(P.t + P.h * 0.97, cy - 5);
    // the tower(s): centred, right of the disc's column, at the level's height where the window has the room
    let cx = P.l + P.w / 2;
    const bR = !below && sl.chips.childElementCount ? dL + sl.chips.offsetWidth : 0;
    for (const a of [sl.art, sl.artNext]) {
      if (!a) continue;
      const ar = Number(a.style.getPropertyValue('--ar')) || 0.6, tgt = Number(a.style.getPropertyValue('--ft')) || 75;
      const th = Math.max(0, Math.min((tgt / 100) * P.h, foot - top)), tw = th * ar;
      const left = Math.max(dR + 3, Math.min(P.r - P.w * 0.02 - tw, P.l + P.w / 2 - tw / 2));
      // (a buff wider than the disc's column steps the tower right while it stands, as a translation: --fdx)
      const dx = Math.max(0, Math.min(P.r - P.w * 0.02 - tw - left, bR + 3 - left));
      if (a === sl.art) cx = left + dx + tw / 2;
      const v = { top: `${((P.t / SH) * 100).toFixed(3)}%`, height: `${((P.h / SH) * 100).toFixed(3)}%` };
      for (const [k, x] of Object.entries(v)) if (a.style[k] !== x) a.style[k] = x;
      this.setVars(a, { '--fh': ((th / P.h) * 100).toFixed(2), '--ff': (((foot - P.t) / P.h) * 100).toFixed(2), '--fx': ((left / SW) * 100).toFixed(2), '--fdx': ((dx / SW) * 100).toFixed(2) });
    }
    const lo = below ? SW * 0.03 : dR + 4, hi = (below ? SW * 0.97 : P.r - 3) - cw;
    const x = Math.max(lo, Math.min(hi, cx - cw / 2));
    this.setVars(c, { '--fcx': `${(x - c.offsetLeft).toFixed(1)}px`, '--fcy': `${(cy - c.offsetTop).toFixed(1)}px` });
    // the buffs: under the plate, or stacked in the disc's column under the card's head (the disc under them)
    const fm = below ? 'below' : 'side';
    if (sl.el.dataset.fm !== fm) sl.el.dataset.fm = fm;
    const k = sl.chips;
    this.setVars(k, below ? { '--scx': `${(SW * 0.07 - k.offsetLeft).toFixed(1)}px`, '--scy': `${(cy + ch2 + 3 - k.offsetTop).toFixed(1)}px` } : { '--scx': `${(dL - k.offsetLeft).toFixed(1)}px`, '--scy': `${(top + 1 - k.offsetTop).toFixed(1)}px` });
    // the disc: the window's left third, low over the stage pool, or under the buffs
    const t = sl.tokensEl;
    this.setVars(t, { '--dkx': `${(dL - t.offsetLeft).toFixed(1)}px`, '--dky': `${((below ? foot - dW : top + 2) - t.offsetTop).toFixed(1)}px`, '--dch': below ? '0' : '1' });
  }
  setVars(e, o) { for (const [k, v] of Object.entries(o)) if (e.style.getPropertyValue(k) !== v) e.style.setProperty(k, v); }
  /** A full scene deals the card's own print (shared/runtime.js and the Broadcast's deal): a form card's print takes
   *  the standing tower's window too, so the scene pictures the card as its slot does (test 38). */
  dealtArt() {
    const stage = document.querySelector('#stage');
    if (!stage || typeof MutationObserver === 'undefined') return;
    const dress = (card) => {
      const face = card.querySelector('.face'), id = card.dataset.card;
      if (!face || !id || card.closest('.slot')) return;
      const sl = [...this.slots.values()].find((x) => x.id === id && x.art) ?? null, was = face.querySelector(':scope > .form-art');
      if ((was?.dataset.k ?? '') === (sl?.art.dataset.k ?? '')) return;
      was?.remove();
      if (!sl) { delete card.dataset.art; return; }
      const a = sl.art.cloneNode(true);
      a.querySelector('.fa-scaf')?.remove();
      a.style.removeProperty('--fdx');
      const en = face.querySelector('.en');
      if (en) en.after(a); else face.prepend(a);
      const pn = face.querySelector('.pane'), H = face.offsetHeight;
      if (pn && H) { a.style.top = `${((pn.offsetTop / H) * 100).toFixed(2)}%`; a.style.height = `${((pn.offsetHeight / H) * 100).toFixed(2)}%`; }
      card.dataset.art = 'form';
    };
    this.dealtMO = new MutationObserver((recs) => {
      for (const r of recs) for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches('.bc-card[data-card]')) dress(n);
        for (const c of n.querySelectorAll('.bc-card[data-card]')) dress(c);
      }
    });
    this.dealtMO.observe(stage, { childList: true, subtree: true });
  }
  /** The old tower leaves the window through the 4x4 Bayer (the transform's pre-roll). */
  artOut(sl, ms) {
    const face = sl.parts?.face;
    if (!face || !ms) return;
    const els = sl.art ? [sl.art.querySelector('.fa-fig')] : [face.querySelector('.cast'), face.querySelector('.pop.art')];
    for (const a of sl.artOuting ?? []) a.cancel();
    sl.artOuting = els.filter(Boolean).map((e) => this.anim(e, bayerFrames(true), { duration: ms, easing: 'linear', fill: 'forwards' }));
  }
  /** The transform's impact: the chip shows the new tower through the 4x4 Bayer, its star drops onto it from 0.4 card
   *  heights, and the card's window takes the new tower at 0.92 -> 1.04 -> 1 with the accent rim. */
  swapForm(sl, ms, o = {}) {
    const f = sl.formNext;
    sl.formNext = null;
    for (const a of sl.artOuting ?? []) a.cancel();
    sl.artOuting = null;
    // (a full build raised its tower in the window already: that window becomes the card's, its scaffold stands down)
    // (a window built for another tower than the one that stands, which no rule makes, is dropped)
    const built = this.builtIn(sl, Boolean(f && sl.artNext && sl.artNext.dataset.k !== formKey(f.form, f.level ?? 1)));
    if (!f) return;
    const was = sl.art;
    this.drawForm(sl, f);
    if (!ms || !K.MASKS?.length || this.reduced()) return;
    this.anim(sl.form, bayerFrames(false), { duration: ms, easing: 'linear' });
    // (on a phone whose chip dropped its stars, the level's figure takes the drop)
    const pips = sl.form.querySelector(/stars/.test(sl.form.dataset.fit ?? '') ? '.tw-lv' : '.tw-pips');
    if (pips) this.anim(pips, [{ translate: `0 ${(-0.4 * (this.g?.sH ?? 300)).toFixed(1)}px`, opacity: 0 }, { translate: `0 ${(-0.4 * (this.g?.sH ?? 300)).toFixed(1)}px`, opacity: 0, offset: 0.4 }, { translate: '0 0', opacity: 1, offset: 0.8 }, { translate: '0 0', opacity: 1 }], { duration: ms + 320, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    const a = sl.art;
    if (a) {
      this.anim(a.querySelector('.fa-rim'), [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], { duration: 480, easing: OUT });
      if (!o.rimOnly) {
        const fig = a.querySelector('.fa-fig');
        this.anim(fig, [{ scale: '0.92' }, { scale: '1.04', offset: 0.55 }, { scale: '1' }], { duration: 300, easing: OUT });
        if (!built) this.anim(fig.querySelector('img'), bayerFrames(false), { duration: 200, easing: 'linear' });
      }
    } else if (was && !o.rimOnly) {
      // back to the card's own art (a build of its starting tower): it returns through the Bayer
      for (const e of [sl.parts.face.querySelector('.cast'), sl.parts.face.querySelector('.pop.art')]) if (e) this.anim(e, bayerFrames(false), { duration: 240, easing: 'linear' });
    }
  }
  /** fixes-3 M2: a full build or upgrade shows its construction in the card's window, as the Arena's beats do: the new
   *  tower's stage light rises through the window over the old one (300-760 ms of the scene), its scaffold rises
   *  from the base in 2 px strokes of its accent (300-680), the new still rises from the stage pool through the 4x4 Bayer (560-960) as the scaffold steps back,
   *  and the impact's 0.92 -> 1.04 -> 1 lands it (swapForm). Timed to the scene's impact where that comes sooner. A
   *  short or Auto transform keeps the swap, and reduced motion the still. Transform, opacity and the Bayer only. */
  buildIn(sl, shot, to) {
    // (the event lands at the impact: the tower to build is the shot's own `to`)
    const f = to?.form ? { form: to.form, level: to.level ?? 1 } : null;
    if (!sl || !f || sl.artNext || !sl.parts?.face || !figs) return;
    const st = FORMS[sl.id]?.start, own = st ? formKey(st.form, st.level ?? 1) : null, key = formKey(f.form, f.level ?? 1);
    const m = figs[sl.id], v = key !== own && m?.forms?.[key] ? formView(m, 'front', key) : null;
    if (!v?.box || sl.art?.dataset.k === key) return;
    const a = this.artEl(sl, f, key, v);
    a.dataset.build = '';
    sl.artNext = a;
    this.seatArt(sl);
    const imp = shot?.compiled?.impact ?? 960, k = clamp(imp / 960, 0.45, 1), T = (ms) => Math.round(ms * k);
    const fig = a.querySelector('.fa-fig'), img = fig.querySelector('img'), scaf = a.querySelector('.fa-scaf');
    // (the new stage's light rises through the window over the old one, its own shade under it, so each pixel of the
    // window changes once as the edge passes and never darkens and brightens again: no flash)
    sl.building = [
      this.anim(a.querySelector('.fa-set'), [{ translate: '0 100%' }, { translate: '0 0' }], { duration: T(460), delay: T(290), easing: 'cubic-bezier(.1,.5,.4,1)', fill: 'both' }),
      this.anim(scaf, [{ opacity: 0.5, transform: 'scaleY(0)' }, { opacity: 1, transform: 'scaleY(1)' }], { duration: T(400), delay: T(280), easing: 'cubic-bezier(.15,.55,.35,1)', fill: 'both' }),
      this.anim(scaf, [{ opacity: 1 }, { opacity: 0.35 }], { duration: T(280), delay: T(760), easing: 'linear', fill: 'forwards' }),
      this.anim(fig, [{ translate: '0 34%' }, { translate: '0 0' }], { duration: T(400), delay: T(560), easing: 'cubic-bezier(.2,.5,.6,1)', fill: 'both' }),
      this.anim(img, bayerFrames(false), { duration: T(400), delay: T(560), easing: 'linear', fill: 'both' }),
      // (the plate's old name leaves through the Bayer as the new tower shows, so the plate is bare, never wrong, until
      // the impact prints the new one)
      ...[...sl.form.querySelectorAll(':scope > :is(b, .tw-pips, .tw-lv)')].map((e) => this.anim(e, bayerFrames(true), { duration: T(240), delay: T(560), easing: 'linear', fill: 'forwards' })),
    ];
  }
  /** The built window becomes the card's (its impact, a cut short cue, a snapshot); true when there was one. */
  builtIn(sl, drop = false) {
    const n = sl?.artNext;
    if (!n) return false;
    sl.artNext = null;
    for (const b of sl.building ?? []) b.cancel();
    sl.building = null;
    delete n.dataset.build;
    const scaf = n.querySelector('.fa-scaf');
    if (drop) { n.remove(); return false; }
    sl.art?.remove();
    sl.art = n;
    sl.el.dataset.art = 'form';
    if (scaf && !this.reduced()) this.anim(scaf, [{ opacity: 0.35 }, { opacity: 0 }], { duration: 220, easing: 'linear' });
    return true;
  }
  /** The transform's title (the page's call-out in the band) stands where it covers no card, HP tab, plate, leader or
   *  tag: the clear spot nearest the building card inside the scene's box, at the title's own size where it fits, else
   *  a step smaller. Its place is handed to mat.css as --mt-x, --mt-w, --mt-b (its line's foot) and --mt-fs. */
  titleSpot(shot) {
    const st = document.documentElement.style, box = shot?.box, s = shot?.scene;
    const clear = () => { for (const k of ['--mt-x', '--mt-w', '--mt-b', '--mt-fs']) st.removeProperty(k); };
    if (!box || !s || this.reduced()) { clear(); return; }
    const C = { x: 0, y: box.top, w: innerWidth, h: box.height }, qh = C.h / 100, qw = C.w / 100;
    const text = String(s.title ?? '');
    const clen = Math.max(1, text.length || 10);
    const fs0 = Math.min(7 * qh, 8 * qw, 76, (88 * qw) / (clen * 0.56)), tl = Math.min(2.6 * qh, 3.4 * qw, 22);
    const ctx = (this.measure ??= document.createElement('canvas').getContext('2d'));
    const vis = (e) => { let a = 1; for (let x = e; x && x !== document.body && a > 0.05; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.visibility === 'hidden' || cs.display === 'none') return 0; a *= +cs.opacity; } return a; };
    const hard = [];
    const add = (r, pad = 4) => { if (r && r.width && r.height) hard.push([r.left - pad, r.top - pad, r.right + pad, r.bottom + pad]); };
    for (const sl of this.slots.values()) { if (sl.el.dataset.away === 'true') continue; add(sl.parts.root.getBoundingClientRect(), 12); if (vis(sl.tab) > 0.05) add(sl.tab.getBoundingClientRect()); if (sl.tag.style.opacity === '1') add(sl.tag.getBoundingClientRect()); }
    for (const o of document.querySelectorAll('.hud .plate, .hud .blog, .hud .ttab, .leader, .leader-quote, .cutin, .ko-count, .num, .ptag')) if (vis(o) > 0.05) add(o.getBoundingClientRect());
    const me = this.slots.get(shot.post?.find((x) => x.kind === 'transform')?.fighter) ?? this.activeSlot(s.side ?? 'player');
    const mr = me?.parts.root.getBoundingClientRect();
    const tx = mr ? mr.left + mr.width / 2 : innerWidth / 2, ty = mr ? mr.top + mr.height / 2 : C.y + C.h / 2;
    const y0 = Math.max(C.y, 0) + 4, y1 = Math.min(C.y + C.h, innerHeight) - 4;
    let best = null;
    for (const z of [1, 0.85, 0.72, 0.6]) {
      const fs = fs0 * z;
      ctx.font = `800 ${fs.toFixed(1)}px "Katagami Sans", system-ui, sans-serif`;
      const bw = Math.ceil(Math.max(ctx.measureText(text).width + fs * 0.12, 24 * tl * 0.52)) + 16, bh = Math.ceil(fs * 1.12 + tl * 1.25 + 4) + 8;
      for (let y = y0; y + bh <= y1; y += 6) for (let x = 8; x + bw <= innerWidth - 8; x += 8) {
        let k = 0;
        for (const r of hard) k += Math.max(0, Math.min(x + bw, r[2]) - Math.max(x, r[0])) * Math.max(0, Math.min(y + bh, r[3]) - Math.max(y, r[1]));
        const cost = k * 1000 + Math.hypot(x + bw / 2 - tx, y + bh / 2 - ty);
        if (!best || cost < best.cost) best = { cost, k, x, y, bw, bh, fs };
      }
      if (best && best.k === 0) break;
    }
    if (!best) { clear(); return; }
    st.setProperty('--mt-x', `${Math.round(best.x - C.x)}px`);
    st.setProperty('--mt-w', `${best.bw}px`);
    st.setProperty('--mt-fs', `${best.fs.toFixed(1)}px`);
    st.setProperty('--mt-b', `${Math.round(C.y + C.h - (best.y + best.bh - 4))}px`);
    this.titleAt = best;
  }
  /** The page's actor tag (shared/beats.js), drawn on the acting card's top edge: side, discipline, move. A cut keeps it
   *  for its stamp; a full scene in the band has its cut-in and call-out, so it takes none. */
  tag(side, t) {
    const sl = this.activeSlot(side), shot = t?.shot;
    // one tag and one reticle on the mat: a new shot's tag takes them from the last
    for (const x of this.slots.values()) { if (x !== sl) this.tagOff(x, 0); this.reticleOff(x, 0); }
    if (!sl || !shot) return;
    this.tagNext = { ...t, shot };
    if (shot.cut) return;
    // a full scene's tag stands through its pre-roll only when the page asks (`until: 'start'`, a full transform that
    // has no cut-in), and leaves at the scene's start (tagOut); other full scenes have their cut-in and call-out
    if (shot.scene?.variant === 'full' && !this.reduced() && t.until !== 'start') return;
    this.tagOn(sl, this.tagNext, this.reduced() ? 1200 : 0);
  }
  tagOut(side, shot, ms = 0) {
    for (const x of this.slots.values()) if (x.tagShot === shot) this.tagOff(x, ms);
  }
  tagOn(sl, t, ms = 0) {
    const e = sl.tag;
    sl.tagShot = t.shot;
    e.innerHTML = t.html;
    e.dataset.side = t.shot?.scene?.side ?? sl.side;
    e.getAnimations().forEach((a) => a.cancel());
    e.style.opacity = '1';
    if (!this.reduced()) this.anim(e, [{ opacity: 0, transform: 'translate3d(0,6px,0)' }, { opacity: 1, transform: 'none' }], { duration: 120, easing: SLAM });
    if (ms) wait(ms).then(() => { if (sl.tagShot === t.shot) this.tagOff(sl, 50); });
    // the tag stays in the window and off the reads (fixes-1 R1 on the Mat): it stands on the card's top edge, or, when
    // the camera's push lifts that edge out of the window or a reticle corner, call-out, number, the console or the log
    // stands there, on its bottom edge, or just inside its top or its bottom; one box read a frame while it stands
    let first = true;
    // (`now`: the page's call-out was placed or moved this frame, hud.js's `mcall:placed`: the tag steps off it in the
    // same frame, as the Arena's does, rather than at the next frame's look; fixes-2 after the critic)
    const keep = (now = false) => {
      // (fix pass 2, M2: a tag that is leaving fades where it stands; the next tagOn places it again at once)
      if (sl.tagShot !== t.shot || e.style.opacity !== '1') return;
      const c = sl.shake.getBoundingClientRect(), q = e.getBoundingClientRect(), w = q.width, h = q.height, x = c.left + c.width / 2 - w / 2;
      const reads = [];
      // (fix pass 2, M2: and off the plates and the leaders' lines, as the Arena's placeTag)
      for (const o of document.querySelectorAll('.slot-rtc i, .rtc-box[data-on="true"] .rtc i, .mcall .mcx, .num, .num-tags, .ptag, #console, .hud .plate, .leader-quote, .cutin')) {
        if (sl.shake.contains(o) && !o.closest('.slot-rtc')) continue;
        const r = o.getBoundingClientRect();
        if (!r.width) continue;
        // (the console is a read at any opacity, as S3 counts it while it fades; everything else past 0.05)
        const min = o.id === 'console' ? 0 : 0.05;
        let a = 1;
        for (let n = o; n && n !== document.body && a > min; n = n.parentElement) a *= +getComputedStyle(n).opacity;
        if (a > min) reads.push(r);
      }
      let lb = null; try { lb = innerWidth >= 1280 ? this.logBox?.() : null; } catch { lb = null; }
      if (lb?.w) reads.push({ left: lb.x, top: lb.y, right: lb.x + lb.w, bottom: lb.y + lb.h });
      const cost = (x, y) => {
        let k = (y < 4 || y + h > innerHeight - 4 || x < 4 || x + w > innerWidth - 4) ? 1e6 : 0;
        for (const r of reads) k += Math.max(0, Math.min(x + w, r.right) - Math.max(x, r.left)) * Math.max(0, Math.min(y + h, r.bottom) - Math.max(y, r.top));
        return k;
      };
      // (centred on the card first; beside it, level with its top or its bottom row, only when every centred spot is
      // taken, as a phone's call-out can take them all)
      const L = c.left - w - 4, R = c.right + 4;
      const spots = [['top', x, c.top - h + 3], ['bottom', x, c.bottom - 3], ['in', x, c.top + 3], ['low', x, c.bottom - h - 3],
        ['in', L, c.top + 3], ['in', R, c.top + 3], ['low', L, c.bottom - h - 3], ['low', R, c.bottom - h - 3]];
      let best = spots[0], bk = cost(best[1], best[2]);
      for (const sp of spots.slice(1)) { const k = cost(sp[1], sp[2]); if (k < bk) { best = sp; bk = k; } }
      const at = best[0] === 'top' ? '' : best[0], tx = `${Math.round((best[1] - x) * (sl.shake.offsetWidth / (c.width || 1)))}px`;
      const sh = `${sl.shake.offsetHeight}px`;
      if (e.style.getPropertyValue('--sh') !== sh) e.style.setProperty('--sh', sh);
      if ((e.dataset.at ?? '') !== at) { if (at) e.dataset.at = at; else delete e.dataset.at; }
      if (e.style.getPropertyValue('--tx') !== tx) e.style.setProperty('--tx', tx);
      // (as on the Arena: once read, a tag with nowhere clear to stand steps aside until there is)
      const hide = !first && bk > 0 ? 'true' : 'false';
      if (e.dataset.blocked !== hide) e.dataset.blocked = hide;
      first = false;
      if (!now) requestAnimationFrame(() => keep());
    };
    this.tagKeep = { sl, shot: t.shot, keep };
    keep();
  }
  tagOff(sl, ms) {
    const e = sl?.tag;
    if (sl) sl.tagShot = null;
    if (!e || e.style.opacity !== '1') return;
    e.style.opacity = '0';
    if (ms && !this.reduced()) this.anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'ease-in' });
  }
  /** The reticle on the struck card (short and cut only; a full scene's is on its dealt card): four brackets in the
   *  attacker's side colour, inside the card's own box so the camera's push carries it. */
  reticle(side, o = {}) {
    const sl = this.activeSlot(side);
    if (!sl) return;
    if (!sl.rtc) {
      sl.rtc = el('div', 'rtc slot-rtc', sl.shake);
      for (const c of ['tl', 'tr', 'bl', 'br']) el('i', '', sl.rtc).dataset.c = c;
    }
    const r = sl.rtc;
    sl.rtcShot = o.shot ?? null;
    r.dataset.skin = o.skin ?? '';
    r.style.setProperty('--sc', o.side === 'player' ? 'var(--you)' : 'var(--rival)');
    r.style.setProperty('--leg', `${Math.max(10, Math.round(0.14 * Math.min(this.g?.sW ?? 100, this.g?.sH ?? 140)))}px`);
    r.getAnimations().forEach((a) => a.cancel());
    if (o.variant === 'miss') { if (r.style.opacity === '1' && !this.reduced()) { r.style.opacity = '0'; this.anim(r, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.4)' }], { duration: 200, easing: OUT }); } else r.style.opacity = '0'; return; }
    r.style.opacity = '1';
    if (o.variant === 'cut') { const shot = o.shot; wait(this.reduced() ? 900 : 450).then(() => { if (sl.rtcShot === shot) this.reticleOff(sl, 50); }); return; }
    if (o.variant === 'short' && !this.reduced()) this.anim(r, [{ opacity: 0, transform: 'scale(1.25)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 140, easing: SLAM });
  }
  reticleOff(sl, ms) {
    const r = sl?.rtc;
    if (sl) sl.rtcShot = null;
    if (!r || r.style.opacity !== '1') return;
    r.style.opacity = '0';
    if (ms && !this.reduced()) this.anim(r, [{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'ease-in' });
  }
  async itemFly(side, target, name, ms) {
    if (!target) return;
    // the item comes from its leader (the Kit is the plate's row now, shared/hud.js)
    const from = this.restRect(this.leaders[side].el);
    const to = this.restRect(target.parts.root);
    const chip = el('b', 'item-chip', this.camEl, name);
    chip.style.transform = `translate3d(${from.x + from.w / 2}px,${from.y + from.h / 2}px,0) translate(-50%,-50%)`;
    if (ms) await this.anim(chip, [
      { transform: `translate3d(${from.x + from.w / 2}px,${from.y + from.h / 2}px,0) translate(-50%,-50%) scale(.8)` },
      { transform: `translate3d(${(from.x + to.x + to.w / 2) / 2 + from.w / 4}px,${Math.min(from.y, to.y) - 30}px,0) translate(-50%,-50%) scale(1.1)`, offset: 0.5 },
      { transform: `translate3d(${to.x + to.w / 2}px,${to.y + to.h * 0.4}px,0) translate(-50%,-50%) scale(1)` },
    ], { duration: ms, easing: 'cubic-bezier(.3,.6,.4,1)' }).finished.catch(() => {});
    chip.remove();
  }
  /** The lethal contact: the beaten card drains to one ink at once (it reads as down on the contact's first frame),
   *  from where the knockout carries it to its stack. Nothing turns it back up but a Rollback. */
  fallNow() { for (const uid of this.falling) { const sl = this.slots.get(uid); if (sl && sl.hp <= 0) this.fall(sl); } this.falling.clear(); }
  fall(sl) {
    if (!sl || sl.fallen) return;
    sl.fallen = true;
    const i = sl.parts.ink;
    if (i) { i.style.opacity = '0.75'; if (!this.reduced()) this.anim(i, [{ opacity: 0.5 }, { opacity: 0.75 }], { duration: 240, easing: OUT }); }
    sl.tab.dataset.low = 'true';
  }
  /** The knockout: the drained card lifts, turns face down and arcs onto its side's KO stack. */
  async knockOut(e, ms = 420) {
    const sl = this.slots.get(e?.fighter);
    if (!sl) return;
    const rd = this.reduced() || !ms;
    this.lift(sl, false, 0);
    this.fall(sl);
    const k = this.koOrder[sl.side];
    if (!k.includes(sl.uid)) k.push(sl.uid);
    const z = { zone: 'ko', n: k.indexOf(sl.uid) };
    const tf = this.transformFor(sl, z);
    sl.zone = 'ko'; sl.n = z.n; sl.el.dataset.down = 'true';
    delete sl.num.dataset.hpShown;
    if (sl.live) this.reprint(sl, false);
    if (rd) { sl.el.dataset.zone = 'ko'; this.layFor(sl, z); this.tween(sl.el, tf, 0); this.face(sl, true, false); this.drawSides(this.view); return; }
    const from = sl.el.style.transform;
    sl.el.style.zIndex = '4';
    // the arc: up off the mat, over, down onto the stack (420 ms, 340 under Auto), turning face down on the way
    const a = this.anim(sl.el, [{ transform: from }, { transform: this.midTransform(from, tf), offset: 0.45 }, { transform: tf }], { duration: ms, easing: 'cubic-bezier(.4,0,.2,1)' });
    sl.el.style.transform = tf;
    // (fix pass 2, M2: the card takes its stack's zone and laid width once it lies face down, so its face's rows never
    // move under the arc: the knockout shifts no layout)
    const down = new Promise((r) => setTimeout(() => this.face(sl, true, true, Math.round(ms * 0.57)).then(r), Math.round(ms * 0.21)));
    await a.finished.catch(() => {});
    await down;
    if (sl.zone === 'ko' && sl.n === z.n) { sl.el.dataset.zone = 'ko'; this.layFor(sl, z); }
    sl.el.style.zIndex = '';
    if (!rd) this.anim(this.koCount[sl.side], [{ scale: '1.4' }, { scale: '1' }], { duration: 260, easing: SLAM });
    this.drawSides(this.view);
  }
  /** Rollback: the card lifts back off its KO stack face up, its ink drained away, and slides to its bench well. */
  revive(sl) {
    const rd = this.reduced();
    const k = this.koOrder[sl.side], i = k.indexOf(sl.uid);
    if (i >= 0) k.splice(i, 1);
    sl.fallen = false;
    this.ink(sl, 0, !rd);
    sl.el.style.zIndex = '4';
    this.face(sl, false, !rd, 320);
    // the item's settle waits for it, so the next scene never opens over a card still lifting off its stack
    this.reviving = this.place(this.view, !rd, 420).then(() => { sl.el.style.zIndex = ''; this.reviving = null; });
    this.drawSides(this.view);
  }
  midTransform(a, b) {
    const n = (s) => (String(s).replace('translate3d', '').match(/-?[\d.]+/g) ?? []).map(Number);
    const A = n(a), B = n(b);
    if (A.length < 4 || B.length < 4) return b;
    return `translate3d(${((A[0] + B[0]) / 2).toFixed(1)}px,${(Math.min(A[1], B[1]) - this.g.aH * 0.35).toFixed(1)}px,60px) scale(${(((A[3] + B[3]) / 2) * 1.08).toFixed(4)})`;
  }
  /** The winner's three cards rise in a row (survivors face up, the out ones turned back up, dimmed); the leaders pose. */
  async finale(winner, verb) {
    const v = this.view, rd = this.reduced();
    const loser = winner === 'player' ? 'rival' : 'player';
    finalePoses(this.leaders, winner, verb, rd ? 0 : 900);
    if (verb === 'draw') return;
    this.finaled = { winner, loser };
    const team = v.sides[winner].team;
    team.forEach((f, i) => {
      const sl = this.slots.get(f.uid);
      if (!sl) return;
      sl.el.dataset.zone = 'finale'; sl.el.style.zIndex = '5';
      sl.el.dataset.out = f.hp <= 0 ? 'true' : 'false';
      if (f.hp <= 0) setTimeout(() => this.face(sl, false, !rd, 320), rd ? 0 : 200 + i * 90);
      this.lift(sl, false, 0);
    });
    for (const f of v.sides[loser].team) { const sl = this.slots.get(f.uid); if (sl) sl.el.dataset.dim = 'true'; }
    this.matEl.dataset.finale = winner;
    await this.finaleRow(!rd);
  }
  /** The winners' row: on the centre line, clear of the losing side's KO stack, on a clear band (every well it would
   *  cross is filled in), laid again if the layout changes under it (a phone's turn ending at the result). */
  finaleRow(motion) {
    const g = this.g, { winner, loser } = this.finaled, team = this.view.sides[winner].team;
    const gap = g.phone ? 8 : 28, room = g.mat.w - 2 * (g.phone ? 12 : 48) - 2 * gap;
    let h = g.phone ? g.aH * 0.92 : g.aH * 1.05, w = (h * 63) / 88;
    if (3 * w > room) { w = room / 3; h = (w * 88) / 63; }
    const total = 3 * w + 2 * gap, x0 = g.cx - total / 2;
    const ko = g.zones[loser].ko;
    let y0 = g.phone ? g.cy - h * 0.62 : g.cy - h / 2 - 10;
    if (!g.phone) y0 = loser === 'rival' ? Math.max(y0, ko.y + ko.h + 16) : Math.min(y0, ko.y - 16 - h);
    const jobs = [];
    team.forEach((f, i) => {
      const sl = this.slots.get(f.uid);
      if (!sl) return;
      const b = this.local({ x: x0 + i * (w + gap), y: y0, w, h });
      const tf = `translate3d(${(b.x + b.w / 2 - g.sW / 2).toFixed(1)}px,${(b.y + b.h - g.sH).toFixed(1)}px,30px) scale(${(b.h / g.sH).toFixed(4)})`;
      jobs.push(this.tween(sl.el, tf, motion ? 620 + i * 90 : 0, SLAM));
    });
    // the band the row lies on: every well under it fills in with the tray, and its KO ring with it
    const band = { x0: x0 - gap, x1: x0 + total + gap, y0: y0 - 14, y1: y0 + h + 10 };
    const under = (b) => b.x < band.x1 && b.x + b.w > band.x0 && b.y < band.y1 && b.y + b.h > band.y0;
    for (const s of SIDES) {
      const z = g.zones[s], w8 = this.wells[s];
      [[w8.active, z.active], ...w8.bench.map((e, i) => [e, z.bench[i]]), [w8.ko, z.ko]].forEach(([e, b]) => { e.dataset.under = under(b) ? 'true' : 'false'; });
      // a KO count the row would cover stands just off the band, on its side of the table
      const kc = this.koCount[s], k = z.ko, right = s === 'player';
      if (!g.phone) { const l = this.local({ x: k.x + k.w / 2, y: s === 'rival' ? k.y + k.h + 4 : Math.max(g.mat.y + 6, k.y - 38), w: 0, h: 0 }); kc.style.transform = `translate3d(${l.x}px,${l.y}px,0) translateX(-50%)`; continue; }
      const at = { x: right ? k.x + k.w + 8 : k.x - 8, y: k.y + k.h - 34 };
      if (at.y + 34 > band.y0 && at.y < band.y1 && (right ? at.x < band.x1 : at.x > band.x0)) at.y = s === 'rival' ? band.y0 - 40 : band.y1 + 6;
      const l = this.local({ x: at.x, y: at.y, w: 0, h: 0 });
      kc.style.transform = `translate3d(${l.x}px,${l.y}px,0)${right ? '' : ' translateX(-100%)'}`;
    }
    return Promise.all(jobs);
  }

  unmount() {
    this.motion.skip();
    this.alive = false;
    this.dealtMO?.disconnect(); this.dealtMO = null;
    document.removeEventListener('mcall:placed', this.onCall);
    for (const sl of this.slots.values()) sl.chipsRO?.disconnect();
    for (const s of SIDES) this.leaders[s]?.destroy();
    this.host.textContent = '';
  }
}
