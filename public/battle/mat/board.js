// The Mat: the stage layout of the card mode. Six cards lie in wells cut into one clay tray; the cards are the HUD (an
// HP tab on each card's top edge, damage tokens on its art, chips under the tab); each side's KO stack, Kit tray and
// leader sit at its end; the turn tab (shared/hud.js) carries the turn. The page calls it only through the seam
// (MODES.md section 2): prepare, mount, set, land, flush, cue, anchor, skip, hold, unmount, layout.
// Every motion writes transform and opacity only, so the page never shifts (CLS 0).
import { Leader, loadLeaders, tallOf, finalePoses } from '../shared/leaders.js';
import { Layout, el, wait, clamp, lerp, R, SIDES, EASE, perHit, chipsHtml, setChips, countTo, numeral, hitTags, NUMBER_HOLD, frameOn, inkOn } from '../shared/fx.js';
import { specials } from './specials.js';
import { t as txt } from '../shared/strings.js';

const K = window.bcKit;
const E = window.showdown.engine;
const { SLAM, OUT, IN_OUT } = EASE;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** The 4x4 Bayer at each level (1 to 15) as a 12 px mask tile: the cells whose threshold is under the level. */
const MASK = Array.from({ length: 16 }, (_, L) => {
  let r = '';
  for (let i = 0; i < 16; i++) if (BAYER[i] < L) r += `<rect x='${(i % 4) * 3}' y='${Math.floor(i / 4) * 3}' width='3' height='3'/>`;
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' shape-rendering='crispEdges'>${r}</svg>`)}")`;
});

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
    sl.flash = el('i', 'slot-flash', sl.shake);
    sl.shield = el('i', 'slot-shield', sl.shake);
    sl.stamp = el('b', 'slot-stamp', sl.shake);
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
  /** A benched or fallen card is laid out at the width it is drawn at: mat.css sets its `--card` to `--lay-w` (over
   *  the kit's fit, whose small tier never goes under 164 px), so the card's own container rules choose its small
   *  layout as the home page's do at that size; the box is scaled up to the slot by `--lay-up`, and the slot's
   *  transform scales it back down. */
  layFor(sl, z) {
    const lay = Math.max(1, Math.round(this.g.sW * this.rectOf(sl, z).h / this.g.sH));
    sl.el.style.setProperty('--lay-w', `${lay}px`);
    sl.el.style.setProperty('--lay-up', (this.g.sW / lay).toFixed(4));
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
          numeral(this.motion, sl.el, { x: g.sW / 2, y: g.sH * 0.22, value: hit.damage, hits, tags: hitTags(hit, out), kind: hit.crit ? 'crit' : 'hit', color: hit.crit ? K.accent(this.ctx.cardOf(hit.actor ?? '')) : null, every, size: g.sW * (hit.crit ? 0.42 : 0.36), side: sl.side, uid: sl.uid });
          // its tokens land as it rises out
          t0 = 126 + (hits - 1) * every + NUMBER_HOLD;
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
    return Promise.all(jobs);
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
    const on = (s.kind === 'attack' && s.variant === 'full') || (s.kind === 'switch' && !lead) || (s.kind === 'ko' && !shot.finish) || ['item', 'trait', 'status', 'guard'].includes(s.kind);
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
            if (rd) { if (them) await this.untilRead(them.uid); if (me) this.stampText(me, s.move?.name ?? s.title, 'move', 520); return undefined; }
            if (them) await this.untilRead(them.uid, 190);
            this.lift(me, true, 90);
            if (me) this.stampText(me, s.move?.name ?? s.title, 'move', 520);
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
        default: return s?.variant === 'off' ? undefined : wait(Math.min(budget, 120));
      }
    }
    if (at === 'start') {
      if (shot.box) this.dimOn(shot.box, true);
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
  supportChip(sl, scene) { if (sl && scene?.label) this.stampText(sl, scene.label, 'support', 900); }
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
    sl.zone = 'ko'; sl.n = z.n; sl.el.dataset.zone = 'ko'; sl.el.dataset.down = 'true';
    this.layFor(sl, z);
    delete sl.num.dataset.hpShown;
    if (sl.live) this.reprint(sl, false);
    if (rd) { this.tween(sl.el, tf, 0); this.face(sl, true, false); this.drawSides(this.view); return; }
    const from = sl.el.style.transform;
    sl.el.style.zIndex = '4';
    // the arc: up off the mat, over, down onto the stack (420 ms, 340 under Auto), turning face down on the way
    const a = this.anim(sl.el, [{ transform: from }, { transform: this.midTransform(from, tf), offset: 0.45 }, { transform: tf }], { duration: ms, easing: 'cubic-bezier(.4,0,.2,1)' });
    sl.el.style.transform = tf;
    setTimeout(() => this.face(sl, true, true, Math.round(ms * 0.57)), Math.round(ms * 0.21));
    await a.finished.catch(() => {});
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
    for (const s of SIDES) this.leaders[s]?.destroy();
    this.host.textContent = '';
  }
}
