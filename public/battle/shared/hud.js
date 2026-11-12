// The battle's information layer, one for both modes (round 5). It reads only the engine's snapshots and events and
// draws over the board: a plate for each card in play (HP with its drain ghost, condition, stat stages, barrier, crit
// boost, trait, team and Kit), the live battle log, the multiplier call-out at each contact, tooltips on every move,
// discipline, condition, item, trait and stage, and the rows the console's moves, bench and Kit panels print.
// The page (battle.js) calls it; a stage layout may say where the plates and the log stand (plateBox, logBox).
// Every colour that means "better for this card" is green and "worse" is red, with the number beside it.
import { ico, ensureIcons, STATUS_INFO } from './icons.js';
import { words } from './plan.js';
import { formLine, formInfo, levelWord, levelParts, stillHtml, stillFillHtml, stillUrl, formKey, pipsHtml, ruleOf } from './tower.js';
import { drawnBox } from './fx.js';
import { t as txt, word, engineWords } from './strings.js';

const SIDES = ['player', 'rival'];
const STAT = { get atk() { return txt('stat.atk'); }, get def() { return txt('stat.def'); }, get spd() { return txt('stat.spd'); } };
const STAT_ICON = { atk: 'atk', def: 'def', spd: 'spd' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; parent?.append(e); return e; };
/** ×1.5, ×0.67, ×2.25: the multiplier as the card prints it. */
export const times = (m) => `×${String(Math.round(m * 100) / 100)}`;
/** A multiplier's meaning: up (green), down (red) or even. */
/** Within a hundredth of 1 a multiplier is even (Infra into Agent and Interface is 1.5 × 0.67 = 1.005), so a chip
 *  never reads "Strong ×1". */
export const tone = (m) => (m >= 1.01 ? 'up' : m <= 0.99 ? 'down' : 'even');
export const stageMult = (n) => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n));
/** HP colour band: green above half, amber above a fifth, red at a fifth or less. */
/** What a multiplier means for you: a rival's gain is your loss. */
export const povTone = (m, side) => { const t = tone(m); return side === 'rival' ? ({ up: 'down', down: 'up' })[t] ?? t : t; };
export const hpBand = (hp, max) => { const r = max ? hp / max : 0; return r > 0.5 ? 'ok' : r > 0.2 ? 'mid' : 'low'; };
/** A plate's HP bar at `hp` of `max`: its band, its fill, its ghost (draining when `drain`), and its number printed
 *  twice, the ink copy clipped to the fill and the empty-track copy clipped to the rest (`--hpr`), so every glyph reads
 *  on what is under it at any HP (fix1 C1; tools/card-check.mjs measures it). */
export function paintHp(bar, hp, max, drain = false) {
  const r = max ? Math.max(0, Math.min(1, hp / max)) : 0;
  bar.dataset.band = hpBand(hp, max);
  bar.style.setProperty('--hpr', String(Math.round(r * 10000) / 10000));
  bar.querySelector('.pl-fill').style.transform = `scaleX(${r})`;
  const g = bar.querySelector('.pl-ghost');
  g.style.transition = drain ? 'transform .45s cubic-bezier(.4,0,.2,1) .18s' : 'none';
  g.style.transform = `scaleX(${r})`;
  for (const n of bar.querySelectorAll('.pl-hpnum')) {
    const b = n.querySelector('b'), sm = n.querySelector('small');
    if (b.textContent !== String(hp)) b.textContent = String(hp);
    if (sm.textContent !== ` / ${max}`) sm.textContent = ` / ${max}`;
  }
}

export function createHud({ app, engine, K, title, reduced, narrow, realTimeout = setTimeout, R = null }) {
  ensureIcons();
  const RING = engine.RING ?? ['Infra', 'Agent', 'Data', 'Game', 'Shader', 'Type', 'Interface'];
  const disc = (d) => K.icon(String(d).toLowerCase());
  const def = (id) => engine.fighterDef(id);
  /** A fighter's def as it stands now: a form card's four moves are its form's (the rules' facade composes them). */
  const defOf = (f) => (f ? engine.fighterDef(f.id, f) : null);
  const hud = { match: null, view: null, layout: null, R };
  /** The form a fighter stands in (null for a card without forms, or while the page has no rules). */
  const formOf = (f) => { try { return f ? (hud.R ?? R)?.formOf?.(f) ?? null : null; } catch { return null; } };
  /** The Kit as the engine keeps it: one use of each item, so the count is what is left of the nine. */
  const kitLeft = (side) => { const k = hud.match?.state.sides[side]?.kit; return k ? Object.values(k).reduce((a, b) => a + Math.max(0, b), 0) : 0; };
  const kitAll = (side) => { const k = hud.match?.state.sides[side]?.kit; return k ? Object.keys(k).length : 9; };
  const root = el('div', 'hud', app);
  root.setAttribute('aria-hidden', 'false');

  // ======================================================== matchups and numbers
  /** The ring multiplier a move would carry into a card (an adapting move takes the better of its card's disciplines). */
  function ringOf(attId, defId, move) {
    if (!move || move.power <= 0) return 1;
    const foe = def(defId).disciplines;
    if (move.adapts) return Math.max(...def(attId).disciplines.map((d) => engine.matchup(d, foe)));
    return engine.matchup(move.discipline, foe);
  }
  /** The home bonus: a move of one of its own card's disciplines hits ×1.2. */
  const homeOf = (attId, move) => (move && move.power > 0 && def(attId).disciplines.includes(move.discipline) ? 1.2 : 1);
  /** The expected damage range of a move into the card across (no crit; spread 0.92 to 1.08), from the engine. */
  function rangeOf(att, foe, i, wght) {
    // the engine's own arithmetic at both ends: its lowest spread and fewest hits, its highest spread and most hits,
    // each passed through the attacker's trait (Seeded has no spread; Three Repeats and others fix the hits) and the
    // defender's (Per-Rule Cap caps each hit inside computeDamage). No crit, no guard.
    try {
      const move = defOf(att).moves[i];
      const nums = engine.moveNumbers(att, move, wght);
      if (nums.power <= 0) return null;
      const at = engine.traitOf?.(def(att.id)) ?? {};
      const sp = (x) => (at.spread ? at.spread(x) : x);
      const hitsOf = (n) => (move.hits ? (at.hits ? at.hits({ f: att }, move, n) : n) : 1);
      const dealt = (spread, hits) => engine.computeDamage(att, foe, move, nums.power, { crit: false, spread, hits, guarded: false }).dealt;
      const lo = dealt(sp(0.92), hitsOf(move.hits?.min ?? 1)), hi = Math.max(lo, dealt(sp(1.08), hitsOf(move.hits?.max ?? 1)));
      // Relaunch: the first blow that would take its last HP leaves it at 1, so no single hit knocks it out
      const relaunch = def(foe.id).trait.name === 'Relaunch' && !foe.relaunched;
      const can = !relaunch && hi >= foe.hp, sure = can && lo >= foe.hp && nums.accuracy >= 1;
      return { lo, hi, pctLo: Math.round((100 * lo) / foe.maxHp), pctHi: Math.round((100 * hi) / foe.maxHp), ko: sure ? 'sure' : can ? 'maybe' : '', relaunch, accuracy: nums.accuracy };
    } catch { return null; }
  }
  const activeOf = (side) => { const s = hud.match?.state.sides[side]; return s ? s.team[s.active] : null; };
  /** A multiplier as a chip. Its arrow is the number's direction; its colour is what it means for you: a rival's
   *  multiplier that helps the rival is red (side 'rival'), the home bonus is gold either way. */
  const multChip = (m, label = '', side = 'player', kind = '') => `<span class="hx" data-tone="${kind || povTone(m, side)}">${ico(tone(m) === 'up' ? 'strong' : tone(m) === 'down' ? 'weak' : 'even')}<b>${times(m)}</b>${label ? `<i>${esc(label)}</i>` : ''}</span>`;
  const ringWord = (m) => txt(`ring.${tone(m)}`);
  /** A discipline's name as the page prints it (the engine knows it by its English name). */
  const dname = (x) => word('discipline', x);
  /** "2" or "2 to 5" (the tooltips' words), "2–5" (the compact chips'). */
  const span = (lo, hi) => (lo === hi ? String(lo) : txt('range', { lo, hi }));
  const dash = (lo, hi) => (lo === hi ? String(lo) : txt('range.short', { lo, hi }));

  // ======================================================== the plates: one per card in play
  const plates = {};
  /** The rival's moves that have played on screen (`uid:index`), never the engine's resolved turn. */
  const seenMoves = new Set();
  /** Trait lines already written (a repeating trait is written once). */
  const traitsSaid = new Set();
  for (const side of SIDES) {
    const p = el('section', 'plate', root);
    p.dataset.side = side;
    p.setAttribute('aria-label', txt(side === 'player' ? 'plate.aria.you' : 'plate.aria.rival'));
    p.innerHTML = `
      <header class="pl-head"><span class="pl-side">${esc(txt(side === 'player' ? 'side.you' : 'side.rival'))}</span><b class="pl-name"></b><span class="pl-disc"></span></header>
      <div class="pl-form" hidden></div>
      <div class="pl-hp" data-band="ok"><i class="pl-ghost"></i><i class="pl-fill"></i><span class="pl-hpnum"><b></b><small></small></span><span class="pl-hpnum pl-hpnum-e" aria-hidden="true"><b></b><small></small></span></div>
      <div class="pl-chips"></div>
      <footer class="pl-foot"><span class="pl-trait"></span><span class="pl-kit"></span></footer>
      <div class="pl-seen" hidden></div>`;
    plates[side] = { el: p, name: p.querySelector('.pl-name'), disc: p.querySelector('.pl-disc'), hp: p.querySelector('.pl-hp'), ghost: p.querySelector('.pl-ghost'), fill: p.querySelector('.pl-fill'), chips: p.querySelector('.pl-chips'), trait: p.querySelector('.pl-trait'), kit: p.querySelector('.pl-kit'), seen: p.querySelector('.pl-seen'), form: p.querySelector('.pl-form'), uid: '', hpShown: -1 };
  }
  /** One chip: an icon, a word or number, a tone and the tooltip it opens. */
  const chip = (icon, text, toneName, tip, extra = '') => `<span class="pc" data-tone="${toneName}" data-tip="${esc(tip)}" tabindex="0">${icon}<b>${text}</b>${extra}</span>`;
  function drawPlate(side, v, drain = true) {
    const P = plates[side];
    const S = v.sides[side], f = S.team[S.active];
    if (!f) return;
    const d = def(f.id);
    P.el.style.setProperty('--c', K.accent(f.id));
    if (P.uid !== f.uid) {
      P.uid = f.uid;
      P.name.textContent = title(f.id);
      P.disc.innerHTML = d.disciplines.map((x) => `<span class="pd" style="--d:${K.DISCIPLINE_COLOR[x]}" data-tip="disc:${x}" tabindex="0" role="img" aria-label="${esc(dname(x))}">${disc(x)}</span>`).join('');
      P.trait.innerHTML = `<span class="pt" data-tip="trait:${f.id}" tabindex="0">${ico('trait')}<i>${esc(txt('plate.trait'))}</i><b>${esc(d.trait.name)}</b></span>`;
      P.hpShown = -1;
    }
    // a form card's tower: a row under its name (its still, its name, its stars), re-keyed on uid, form and level
    const fo = formOf(f);
    // (a side whose team holds a forms card keeps the row's room, empty, for a card without one: a send-in after
    // Princeton TD falls never moves the plate's HP and footer up, fixes-3 R4; held once seen, until the team changes)
    const tk = S.team.map((x) => x?.uid ?? x?.id).join('|');
    if (P.formTeam !== tk) { P.formTeam = tk; P.formHeld = false; }
    if (!P.formHeld) P.formHeld = S.team.some((x) => { try { return Boolean(x && formOf(x)); } catch { return false; } });
    const fk = fo ? `${f.uid}:${fo.form}:${fo.level}` : P.formHeld ? 'held' : '';
    if (P.form.dataset.k !== fk) {
      P.form.dataset.k = fk;
      P.form.hidden = !fo && !P.formHeld;
      if (!fo) { delete P.form.dataset.tip; P.form.removeAttribute('tabindex'); P.form.removeAttribute('aria-label'); }
      P.form.innerHTML = fo ? formLine(fo, { h: 20, card: f.id }) : '';
      if (fo) { P.form.dataset.tip = `tower:${fo.form}:${side}`; P.form.tabIndex = 0; P.form.setAttribute('aria-label', txt('form.aria', { name: fo.name, level: levelWord(fo.level) })); }
    }
    // HP: the fill moves at once, the ghost drains after it (350 ms, the client convention), the number counts
    const r = f.maxHp ? f.hp / f.maxHp : 0;
    const was = P.hpShown < 0 ? r : P.hpShown;
    paintHp(P.hp, f.hp, f.maxHp, drain && !reduced() && r < was);
    P.hpShown = r;
    P.hp.setAttribute('role', 'img');
    P.hp.setAttribute('aria-label', txt('hp.aria', { hp: f.hp, max: f.maxHp }));
    // chips: condition, stat stages, barrier, crit boost
    const parts = [];
    if (f.status) { const s = STATUS_INFO[f.status]; parts.push(chip(ico(f.status), s.short, 'status', `status:${f.status}`).replace('class="pc"', `class="pc" style="--s:${s.color}"`)); }
    // a stat shows only once a stage has moved it, by name, with its multiplier (green up, red down)
    for (const k of ['atk', 'def', 'spd']) {
      const n = f.stages[k];
      if (n) parts.push(chip(K.icon(STAT_ICON[k]), esc(txt('stat.stage', { stat: STAT[k], n: `${n > 0 ? '+' : '−'}${Math.abs(n)}` })), povTone(stageMult(n), side), `stage:${k}:${n}`, `<i>${times(stageMult(n))}</i>`));
    }
    if (f.barrier > 0) parts.push(chip(ico('barrier'), `${Math.round(f.barrier * 100)}%`, povTone(2, side), `barrier:${f.barrier}`));
    if (f.critBoost > 0) parts.push(chip(ico('crit'), `+${Math.round(f.critBoost * 100)}%`, povTone(2, side), `crit:${f.critBoost}`));
    const html = parts.join('');
    P.chips.hidden = !parts.length;
    if (P.chips.dataset.k !== html) { P.chips.dataset.k = html; P.chips.innerHTML = html; }
    // the Kit: uses left this battle (the Kit panel and its tooltips list the items)
    const left = kitLeft(side), all = kitAll(side);
    const kit = side === 'player'
      ? `<button type="button" class="pk-left" data-tip="kit:${side}" aria-label="${esc(txt('kit.aria.you', { n: left, all }, left))}" data-none="${left === 0}">${ico('bag')}<i>${esc(txt('kit.word'))}</i><b>${left}/${all}</b></button>`
      : `<span class="pk-left" data-tip="kit:${side}" tabindex="0" role="img" aria-label="${esc(txt('kit.aria.rival', { n: left, all }, left))}" data-none="${left === 0}">${ico('bag')}<i>${esc(txt('kit.word'))}</i><b>${left}/${all}</b></span>`;
    if (P.kit.dataset.k !== kit) { P.kit.dataset.k = kit; P.kit.innerHTML = kit; }
    P.el.dataset.quiet = parts.length ? 'false' : 'true';
    // the rival's moves you have seen, each with what it does to your card in play (red when it hits you hard)
    if (side === 'rival') {
      const mine = v.sides.player.team[v.sides.player.active];
      // keyed by move id, so a form change never relabels a move seen before it
      const seen = defOf(f).moves.map((mv, i) => ({ mv, i })).filter((x) => seenMoves.has(`${f.uid}:${x.mv.id}`));
      const html2 = seen.length ? `<i class="ps-label">${esc(txt('plate.seen'))}</i>${seen.map(({ mv, i }) => { const rg = mine && mv.power > 0 ? ringOf(f.id, mine.id, mv) : 1; return `<span class="ps" data-tip="rmove:${i}" tabindex="0" data-tone="${mv.power > 0 ? povTone(rg, 'rival') : 'even'}">${disc(mv.discipline)}<b>${esc(mv.name)}</b>${mv.power > 0 ? `<em>${times(rg)}</em>` : ''}</span>`; }).join('')}` : '';
      P.seen.dataset.many = String(seen.length > 1);
      const row = html2 || `<i class="ps-label">${esc(txt('plate.seen'))}</i><span class="ps-none">${esc(txt('plate.seen.none'))}</span>`;
      if (P.seen.dataset.k !== row) { P.seen.dataset.k = row; P.seen.innerHTML = row; P.seen.hidden = false; }
    }
  }
  /** An item reaching a card in play: its icon pops over that card's plate, and the plate's edge flashes its kind. */
  function beat(e) {
    const side = sideOfUid(e.target), P = plates[side];
    if (!P || P.uid !== e.target || reduced()) return;
    const b = el('span', 'pl-beat', P.el, `${ico(e.item)}<b>${esc(e.name)}</b>`);
    b.dataset.kind = ITEM_KIND[e.item] ?? 'heal';
    b.animate([{ opacity: 0, transform: 'translate(-50%, 6px) scale(.8)' }, { opacity: 1, transform: 'translate(-50%, -8px) scale(1)', offset: 0.25 }, { opacity: 1, transform: 'translate(-50%, -12px) scale(1)', offset: 0.75 }, { opacity: 0, transform: 'translate(-50%, -20px) scale(1)' }], { duration: 1100, easing: 'cubic-bezier(.2,.9,.1,1)' }).finished.then(() => b.remove(), () => b.remove());
  }
  /** Where the plates and the log stand: the layout's boxes, else the screen's corners (the handheld convention: the
   *  rival's top left, yours bottom right over the console). */
  function place() {
    const L = hud.layout;
    // an aim drawn before a resize or a camera move is re-measured
    if (aimFor !== null && aimFor !== undefined) { const i = aimFor; aimFor = null; requestAnimationFrame(() => { if (document.querySelector(`#moves [data-i="${i}"]:is(:hover, :focus-visible)`)) hud.aim?.(i); else hud.aim?.(null); }); }
    for (const side of SIDES) {
      const b = L?.plateBox?.(side);
      const P = plates[side].el;
      P.dataset.at = b ? 'board' : 'corner';
      if (b) { P.style.width = `${Math.round(b.w)}px`; P.dataset.strip = b.strip ? 'true' : 'false'; const y = b.bottom != null ? b.bottom - P.offsetHeight : b.y; P.style.translate = `${Math.round(b.x)}px ${Math.round(y)}px`; }
      else { P.style.translate = ''; P.style.width = ''; }
      P.dataset.compact = b && b.w < 220 ? 'true' : 'false';
      P.dataset.strip = b?.strip ? 'true' : 'false';
    }
    const lb = L?.logBox?.();
    if (lb && !narrow()) { logEl.hidden = false; Object.assign(logEl.style, { translate: `${Math.round(lb.x)}px ${Math.round(lb.y)}px`, width: `${Math.round(lb.w)}px`, height: `${Math.round(lb.h)}px` }); }
    else logEl.hidden = true;
    app.dataset.hudlog = logEl.hidden ? 'off' : 'on';
    // (a phone's open sheet stops a tab's row under the top furniture: the rail, and a plate standing in the screen's
    // top half, so the rival's HP stays in view while you choose; hud.css reads its foot)
    {
      const cy = parseFloat(getComputedStyle(app).getPropertyValue('--console-y')) || innerHeight;
      const feet = [document.querySelector('#app .rail'), ...SIDES.map((sd) => plates[sd].el)].map((e) => e?.getBoundingClientRect()).filter((q) => q?.height && q.bottom < cy / 2).map((q) => q.bottom);
      if (feet.length) app.style.setProperty('--hud-rail-b', `${Math.round(Math.max(...feet))}px`);
    }
    hud.watchPanel?.(); liftTab();
  }

  // ======================================================== the turn tab: the turn, whose decision, who acts first
  const turnTab = el('div', 'ttab', root);
  const ttMain = el('span', 'tt-main', turnTab), ttOrder = el('span', 'tt-order', turnTab), ttFirst = el('span', 'tt-firstbox', turnTab);
  const ttFirstChip = el('span', 'tt-first', ttFirst);
  ttFirstChip.dataset.tip = 'order'; ttFirstChip.tabIndex = 0; ttFirstChip.hidden = true;
  /** The turn whose beat has played (the first turn's opens quietly). */
  let beatTurn = -1;
  turnTab.setAttribute('aria-live', 'polite');
  /** The tab on the console's top edge: Turn N, then Your move / Playing / Send in a card / the result, then who acts
   *  first on Pace (a move's priority can still jump the order; the tooltip says so). */
  /** The choice under the pointer or the focus (a move key, a Tower tile, an upgrade button) and the priority it acts
   *  at, so the tab says who acts first with it (fix1 C3): a move's own priority (engine.priorityOf), a tower's key-1
   *  attack's (a tower fires at its attack's priority, ruling 1). null when nothing is being chosen. */
  function consideredPriority() {
    const st = hud.match?.state, me = activeOf('player');
    if (!st || st.phase !== 'command' || !me) return null;
    const sel = '#moves .cmove, #panel[data-kind="tower"] [data-tw="build"], #panel[data-kind="tower"] [data-tw="upgrade"]';
    // (focus on the tab's own order chip keeps the choice last weighed; a focus counts only once the keyboard drives
    // it, so the cursor the page puts on move 1 at each command says nothing to a pointer player)
    // (a pointer over a key or a tile since then releases that hold, fixes-2 R11: the key under it is weighed)
    if (turnTab.contains(document.activeElement) && !tabReleased) return orderPri;
    const t = document.querySelector(`:is(${sel}):hover`) ?? (lastInput === 'key' ? document.activeElement?.closest?.(sel) : null);
    if (!t || t.getAttribute('aria-disabled') === 'true') return null;
    try {
      if (t.matches('#moves .cmove')) { const i = Number(String(t.dataset.tip ?? '').split(':')[1]); return Number.isFinite(i) ? engine.priorityOf(me, { kind: 'move', index: i }) : null; }
      const rules = hud.R ?? R, slot = rules?.forms?.[me.id]?.slots?.[0] ?? 0;
      const pv = rules?.towerPreview?.(st, 'player', t.dataset.tw === 'build' ? { form: t.dataset.form } : { branch: t.dataset.branch || null });
      const k1 = pv?.moves?.[slot];
      return k1 ? (k1.priority ?? 0) : null;
    } catch { return null; }
  }
  let turnArgs = null, orderPri = null, lastInput = 'pointer', tabReleased = false;
  document.addEventListener('keydown', () => { lastInput = 'key'; tabReleased = false; queueMicrotask(reorder); }, true);
  document.addEventListener('pointerdown', () => { lastInput = 'pointer'; }, true);
  document.addEventListener('focusin', (e) => { if (turnTab.contains(e.target)) tabReleased = false; }, true);
  document.addEventListener('pointerover', (e) => { if (e.target?.closest?.('#moves .cmove, #panel[data-kind="tower"] [data-tw="build"], #panel[data-kind="tower"] [data-tw="upgrade"]')) tabReleased = true; }, true);
  const reorder = () => { const pr = consideredPriority(); if (pr === orderPri) return; orderPri = pr; if (turnArgs) drawTurn(...turnArgs); };
  for (const ev of ['pointerover', 'pointerout', 'focusin', 'focusout']) document.addEventListener(ev, () => queueMicrotask(reorder), true);
  function drawTurn(state, busy) {
    if (!state) return;
    turnArgs = [state, busy];
    if (busy) orderPri = null;
    const me = activeOf('player'), foe = activeOf('rival');
    const phase = esc(txt(state.phase === 'over' ? (state.winner === 'player' ? 'result.victory' : state.winner === 'rival' ? 'result.defeat' : 'result.draw')
      : state.phase === 'replace' && state.pending?.includes('player') ? 'turn.sendIn' : busy ? 'turn.playing' : 'turn.yourMove'));
    let first = null;
    if (me && foe && state.phase === 'command') {
      const a = engine.effectiveSpeed(me), b = engine.effectiveSpeed(foe);
      // the choice being weighed acts at its priority; the rival's move is unknown, so it is weighed at 0
      const pr = orderPri ?? 0;
      const w = pr > 0 ? 'you' : pr < 0 ? 'rival' : a > b ? 'you' : a < b ? 'rival' : 'tie';
      // (no choice weighed, as on a touch screen before its tap, while one of your keys has priority: the short form
      // says the order is Pace's, so it never contradicts that key's chip, fixes-2 R4)
      const keyPri = !pr && (defOf(me)?.moves ?? []).some((_, i) => { try { return engine.priorityOf(me, { kind: 'move', index: i }) !== 0; } catch { return false; } });
      const who = esc(txt(`turn.first.${w}`)), short = esc(txt(keyPri ? `turn.first.${w}.pace` : `turn.first.${w}.short`));
      const pair = txt(a >= b ? 'turn.pace.youFirst' : 'turn.pace.rivalFirst', { you: Math.round(a), rival: Math.round(b) });
      const why = pr ? txt('turn.priority', { n: `${pr > 0 ? '+' : '−'}${Math.abs(pr)}` }) : txt('turn.pace', { pair });
      first = { tone: w === 'you' ? 'up' : w === 'rival' ? 'down' : 'even', prio: String(pr), html: `${ico('priority')}<b class="tt-long">${who}</b><b class="tt-short">${short}</b><b class="tt-mini">${esc(txt(`turn.first.${w}.short`))}</b><i>${esc(why)}</i>` };
    }
    const shown = busy && state.phase !== 'over' ? Math.max(1, state.turn - 1) : state.turn;
    const html = `${ico('turn')}<b class="tt-turn"><span class="tt-word">${esc(txt('turn.word'))}</span><span class="tt-t">${esc(txt('turn.t'))}</span>${shown}</b><span class="tt-phase" data-busy="${busy}">${phase}</span>`;
    if (ttMain.dataset.k !== html) { ttMain.dataset.k = html; ttMain.innerHTML = html; }
    // (the order chip is one element, updated in place, so a focus on it survives a redraw)
    ttFirstChip.hidden = !first;
    if (first) {
      if (ttFirstChip.dataset.tone !== first.tone) ttFirstChip.dataset.tone = first.tone;
      if (ttFirstChip.dataset.prio !== first.prio) ttFirstChip.dataset.prio = first.prio;
      if (ttFirstChip.dataset.k !== first.html) { ttFirstChip.dataset.k = first.html; ttFirstChip.innerHTML = first.html; }
    }
    // the order strip (shared/beats.js) stands in for "Playing the turn" while a turn plays; the next command clears it
    if ((!busy || state.phase === 'over') && ttOrder.childElementCount) { ttOrder.textContent = ''; ttOrder.dataset.k = ''; turnTab.removeAttribute('data-order'); }
    const ph = state.phase === 'over' ? 'over' : busy ? 'busy' : 'you';
    if (ph === 'you' && beatTurn !== state.turn && !reduced() && beatTurn !== -1) turnTab.animate([{ transform: 'scale(1.12)', boxShadow: '0 0 0 6px oklch(55% 0.15 255 / .35)' }, { transform: 'none', boxShadow: '0 0 0 0 oklch(55% 0.15 255 / 0)' }], { duration: 320, delay: 360, fill: 'backwards', easing: 'cubic-bezier(.2,.9,.1,1)' });
    if (ph === 'you') beatTurn = state.turn;
    turnTab.dataset.phase = ph;
    liftTab();
  }
  /** An open panel rises over the console's top edge, where the tab stands, and its console rises over the HUD (a
   *  phone's tab stands inside the console's first line): the tab then stands on the top edge of whichever of the two
   *  covers it, panel or console, clear of both (a transform, so it shifts no layout), and comes back down when the
   *  panel closes (fix1 C3). */
  function liftTab() {
    const pn = document.getElementById('panel');
    if (turnTab.style.getPropertyValue('--tt-lift')) turnTab.style.removeProperty('--tt-lift');
    if (turnTab.style.getPropertyValue('--tt-slide')) turnTab.style.removeProperty('--tt-slide');
    if ('compact' in turnTab.dataset) delete turnTab.dataset.compact;
    turnTab.dataset.lifted = 'false';
    if (!pn || pn.hidden || !pn.getClientRects().length) return;
    const t = turnTab.getBoundingClientRect();
    if (!t.width) return;
    const con = pn.closest('.console'), covers = [pn, con].filter(Boolean).map((e) => e.getBoundingClientRect()).filter((q) => q.width);
    let top = t.top;
    for (let n = 0; n < 4; n++) {
      const q = covers.find((c) => t.right > c.left && t.left < c.right && top + t.height > c.top && top < c.bottom);
      if (!q) break;
      top = q.top - t.height - 4;
    }
    // (never under the top rail)
    const rail = document.querySelector('#app .rail')?.getBoundingClientRect();
    top = Math.max(rail?.height ? rail.bottom + 4 : 8, top);
    turnTab.dataset.lifted = String(top < t.top);
    if (top < t.top) turnTab.style.setProperty('--tt-lift', `${Math.round(t.top - top)}px`);
    // lifted, it never stands on a plate (fixes-2 R10): it keeps its x where that clears both plates; else it slides
    // along the panel's top edge to the nearest x that clears them (the panel paints over the HUD, so it never sinks
    // onto the panel), in its short form ("T7, Rival first") where that stands nearer, and where it can off the cards or
    // figures in play; a tooltip then stands clear of it (panelSpot weighs the tab as a key)
    if (top < t.top) {
      const box = (e) => (e && !e.hidden && e.getClientRects().length ? e.getBoundingClientRect() : null);
      const plateQ = [plates.player.el, plates.rival.el].map(box).filter((q) => q?.width);
      const soft = [...document.querySelectorAll('#board .slot[data-zone="active"], #board .fig')].map(box).filter((q) => q?.width);
      const lap = (x, w, q) => Math.max(0, Math.min(x + w, q.right) - Math.max(x, q.left)) * Math.max(0, Math.min(top + t.height, q.bottom) - Math.max(top, q.top));
      const hard = (x, w) => plateQ.reduce((n, q) => n + lap(x, w, q), 0);
      if (hard(t.left, t.width) > 0) {
        const pq = covers[0], L0 = Math.max(8, pq?.left ?? 8), R0 = Math.min(innerWidth - 8, pq?.right ?? innerWidth);
        turnTab.dataset.compact = 'true';
        const tc = turnTab.getBoundingClientRect(), cw = tc.width || t.width, cl = tc.width ? tc.left : t.left;
        let best = null;
        // (each form slides from where it stands: the short one may be anchored by its right edge)
        for (const [w, x0, pen, compact] of [[t.width, t.left, 0, false], [cw, cl, 60, true]]) for (let x = Math.round(L0); x <= R0 - w; x += 8) {
          // (a long slide costs most: it takes the board's upper left, where a tile's tooltip stands)
          const c = 1e3 * hard(x, w) + soft.reduce((n, q) => n + lap(x, w, q), 0) + Math.abs(x0 - x) * 2 + pen;
          if (!best || c < best.c) best = { x, x0, c, compact };
        }
        if (!best?.compact) delete turnTab.dataset.compact;
        if (best && best.x !== best.x0) turnTab.style.setProperty('--tt-slide', `${Math.round(best.x0 - best.x)}px`);
      }
    }
  }
  hud.liftTab = liftTab;
  {
    let watched = null;
    const mo = typeof MutationObserver === 'function' ? new MutationObserver(() => liftTab()) : null;
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => liftTab()) : null;
    hud.watchPanel = () => { const pn = document.getElementById('panel'); if (!pn || pn === watched) return; watched = pn; mo?.observe(pn, { attributes: true, attributeFilter: ['hidden', 'data-kind'], childList: true }); ro?.observe(pn); };
  }

  // ======================================================== the battle log: turn headers, icons, multipliers, receipts
  const logEl = el('aside', 'blog', root);
  logEl.setAttribute('aria-label', txt('log.title'));
  logEl.innerHTML = `<header class="blog-head">${ico('log')}<b>${esc(txt('log.title'))}</b></header><ol class="blog-list" aria-live="off"></ol>`;
  const logList = logEl.querySelector('.blog-list');
  const entries = [];
  const who = (uid) => title(hud.match?.cardOf(uid) ?? uid);
  /** "Your Glyphfield", "Rival's Prototemplate": every log line says whose card it is. */
  const owned = (uid) => txt(sideOfUid(uid) === 'player' ? 'log.yours' : 'log.rivals', { card: who(uid) });
  /** A trait's line in words a player reads at once. */
  const traitLine = (e) => {
    const d = words(e.detail ?? '');
    const k = TRAIT_SAYS[e.trait], said = k ? txt(k, { n: d.replace(/[^\d]/g, ''), d }) : undefined;
    // a trait with nothing to say is an immunity the engine announces (the condition did not land)
    return txt('log.trait', { trait: `<b class="lg-tr">${esc(e.trait)}</b>`, who: esc(owned(e.fighter)), does: esc(said ?? (d ? engineWords(d) : txt('log.trait.immune'))) }, undefined, true);
  };
  /** The receipt with its bare constant named. */
  const receiptWords = (line) => words(line)
    // the engine's factor names (the kit's receiptLine), then the bare constant named
    .replace(/ capped at half HP/, () => ` ${txt('receipt.capped')}`)
    .replace(/\b(home|ring|finisher|upset|compounding|spread|critical|hits|barrier|guard|relaunch)\b/g, (w) => txt(`receipt.${w}`))
    .replace(/(\d+\/\d+) × ([\d.]+)(?= [×=])/, (m0, a, b) => `${a} × ${b} ${txt('receipt.scale')}`);
  const sideOfUid = (uid) => (String(uid).startsWith('rival') ? 'rival' : 'player');
  const tag = (side) => `<i class="lg-side" data-side="${side}">${esc(txt(side === 'player' ? 'side.you' : 'side.rival'))}</i>`;
  const pct = (n, max) => (max ? `${Math.round((100 * n) / max)}%` : '');
  /** One event as a log entry ({ turn, side, icon, html, receipt }), or null for an event the log leaves out. */
  function entryOf(e, v) {
    const maxOf = (uid) => { const s = v?.sides[sideOfUid(uid)]; return s?.team.find((t) => t.uid === uid)?.maxHp ?? 0; };
    switch (e.kind) {
      case 'move': return { turn: e.turn, side: e.side, icon: disc(e.move.discipline === 'Neutral' ? 'infra' : e.move.discipline), cls: 'lg-move', html: txt('log.move', { side: tag(e.side), card: `<b>${esc(title(e.card))}</b>`, move: `<b class="lg-mv" style="--d:${K.DISCIPLINE_COLOR[e.move.discipline] ?? '#999'}">${esc(e.move.name)}</b>` }, undefined, true) };
      case 'hit': {
        const r = e.receipt, extra = [];
        // each chip coloured for you: the rival's bonuses red, what cut the rival's hit green
        if (tone(e.effectiveness) !== 'even') extra.push(multChip(e.effectiveness, ringWord(e.effectiveness), e.side));
        if (r?.finisher > 1) extra.push(multChip(r.finisher, txt('chip.finisher'), e.side));
        if (r?.home > 1) extra.push(multChip(r.home, txt('chip.home'), e.side, 'home'));
        if (e.crit) extra.push(`<span class="hx" data-tone="crit">${ico('crit')}<b>×1.5</b><i>${esc(txt('chip.critical'))}</i></span>`);
        if (e.hits > 1) extra.push(`<span class="hx" data-tone="even">${ico('hits')}<b>${e.hits}</b><i>${esc(txt('chip.hits', { n: e.hits }, e.hits))}</i></span>`);
        const cut = e.side === 'rival' ? 'up' : 'down';
        if (r?.barrier) extra.push(`<span class="hx" data-tone="${cut}">${ico('barrier')}<b>−${r.barrier}</b><i>${esc(txt('chip.barrier'))}</i></span>`);
        if (r?.guard) extra.push(`<span class="hx" data-tone="${cut}">${ico('guard')}<b>−${r.guard}</b><i>${esc(txt('chip.guard'))}</i></span>`);
        // the row is tinted by the card that was hit
        return { turn: e.turn, side: sideOfUid(e.target), icon: ico('power'), cls: 'lg-hit', html: `${txt(e.ko ? 'log.hit.out' : 'log.hit', { target: `<b>${esc(owned(e.target))}</b>`, damage: `<b class="lg-dmg">${e.damage}</b>`, share: `<small>(${pct(e.damage, maxOf(e.target))})</small>` }, undefined, true)}${extra.length ? `<span class="lg-x">${extra.join('')}</span>` : ''}`, receipt: receiptWords(r?.line ?? '') };
      }
      case 'miss': return { turn: e.turn, side: e.side, icon: ico('accuracy'), cls: 'lg-miss', html: txt('log.miss', { move: esc(e.move.name), target: `<b>${esc(owned(e.target))}</b>`, chance: `<small>${esc(txt('log.miss.chance', { n: Math.round(e.accuracy * 100) }))}</small>` }, undefined, true) };
      case 'status': {
        if (e.change === 'continue') return null;
        const s = STATUS_INFO[e.status];
        const key = { applied: 'log.status.applied', tick: 'log.status.tick', skip: e.status === 'sleep' ? 'log.status.asleep' : 'log.status.stunned', cleared: 'log.status.cleared' }[e.change];
        const who = `<b>${esc(owned(e.fighter))}</b>`;
        return { turn: e.turn, side: e.side, icon: `<span class="lg-st" style="--s:${s.color}">${ico(e.status)}</span>`, cls: 'lg-status', html: key ? txt(key, { who, status: `<b style="color:${s.color}">${esc(s.label)}</b>`, damage: `<b class="lg-dmg">${e.damage}</b>`, name: esc(s.lower) }, undefined, true) : `${who} ${e.change}` };
      }
      case 'effect': {
        const t = e.effect;
        const who = `<b>${esc(owned(e.fighter))}</b>`;
        if (t === 'heal' || t === 'drain') return { turn: e.turn, side: e.side, icon: ico(t), cls: 'lg-heal', html: txt(t === 'drain' ? 'log.drain' : 'log.heal', { who, n: `<b class="lg-heal-n">+${e.amount}</b>` }, undefined, true) };
        if (t === 'recoil') return { turn: e.turn, side: e.side, icon: ico('recoil'), cls: 'lg-hit', html: txt('log.recoil', { who, n: `<b class="lg-dmg">${e.amount}</b>` }, undefined, true) };
        if (t === 'barrier') return { turn: e.turn, side: e.side, icon: ico('barrier'), cls: 'lg-up', html: txt('log.barrier', { who, chip: `<span class="hx" data-tone="${povTone(2, e.side)}"><b>${Math.round(e.amount * 100)}%</b><i>${esc(txt('chip.blocked'))}</i></span>` }, undefined, true) };
        if (t === 'critUp') return { turn: e.turn, side: e.side, icon: ico('crit'), cls: 'lg-up', html: txt('log.critUp', { who, chip: `<span class="hx" data-tone="${povTone(2, e.side)}"><b>+${Math.round(e.amount * 100)}%</b><i>${esc(txt('chip.crit'))}</i></span>` }, undefined, true) };
        const k = t.slice(0, 3), n = e.stage ?? e.amount;
        // the stage it reached, so a capped raise never claims more than it did
        return { turn: e.turn, side: e.side, icon: K.icon(k), cls: 'lg-up', html: txt('log.stat', { who, stat: esc(STAT[k]), chip: `<span class="hx" data-tone="${povTone(2, e.side)}">${ico('up')}<b>${n > 0 ? '+' : ''}${n}</b><i>${times(stageMult(n))}</i></span>` }, undefined, true) };
      }
      case 'switch': return { turn: e.turn, side: e.side, icon: ico('switch'), cls: 'lg-switch', html: txt(e.reason === 'lead' ? 'log.switch.lead' : e.reason === 'replace' ? 'log.switch.sentIn' : 'log.switch.in', { side: tag(e.side), card: `<b>${esc(title(e.card))}</b>` }, undefined, true) };
      case 'trait': {
        // a trait that says the same thing again (Seeded on every hit) is written once
        const k = `${e.fighter}|${e.trait}|${e.detail ?? ''}`;
        if (traitsSaid.has(k)) return null;
        traitsSaid.add(k);
        return { turn: e.turn, side: e.side, icon: ico('trait'), cls: 'lg-trait', html: traitLine(e) };
      }
      case 'guard': return { turn: e.turn, side: e.side, icon: ico('guard'), cls: 'lg-up', html: txt('log.guard', { who: `<b>${esc(owned(e.fighter))}</b>`, chip: `<span class="hx" data-tone="${povTone(2, e.side)}"><b>×0.5</b><i>${esc(txt('chip.guardTurn'))}</i></span>` }, undefined, true) };
      case 'item': return { turn: e.turn, side: e.side, icon: ico(e.item), cls: 'lg-item', html: txt('log.item', { side: tag(e.side), item: `<b>${esc(e.name)}</b>`, target: `<b>${esc(owned(e.target))}</b>`, detail: `<small>${esc(engineWords(words(e.detail)))}</small>` }, undefined, true) };
      case 'transform': return { turn: e.turn, side: e.side, icon: `<span class="lg-tw" style="--ta:${e.accent ?? formInfo(e.card, e.to?.form).accent}">${towerGlyph}</span>`, cls: 'lg-up', html: transformLine(e) };
      case 'ko': return { turn: e.turn, side: e.side, icon: ico('ko'), cls: 'lg-ko', html: txt('log.ko', { who: `<b>${esc(txt(e.side === 'player' ? 'log.yours' : 'log.rivals', { card: title(e.card) }))}</b>` }, undefined, true) };
      case 'result': return { turn: e.turn, side: 'none', icon: ico('turn'), cls: 'lg-result', html: txt('log.result', { result: `<b>${esc(txt(e.winner === 'draw' ? 'result.draw' : e.winner === 'player' ? 'result.victory' : 'result.defeat'))}</b>`, n: e.turns }, e.turns, true) };
      default: return null;
    }
  }
  let lastTurn = -1, scrollQ = false;
  function addEntry(x) {
    entries.push(x);
    if (x.turn !== lastTurn) {
      lastTurn = x.turn;
      const h = el('li', 'lg-turn', logList, `${ico('turn')}<b>${esc(txt('log.turn', { n: x.turn }))}</b>`);
      h.dataset.turn = String(x.turn);
    }
    const li = el('li', `lg ${x.cls ?? ''}`, logList, `<span class="lg-i">${x.icon}</span><span class="lg-t">${x.html}</span>`);
    li.dataset.side = x.side;
    if (x.receipt) { const r = el('code', 'lg-r', li); r.textContent = x.receipt; }
    if (!logEl.hidden && !reduced()) li.animate([{ opacity: 0, transform: 'translate3d(0,6px,0)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2,.9,.1,1)' });
    if (!scrollQ) { scrollQ = true; requestAnimationFrame(() => { scrollQ = false; logList.scrollTop = logList.scrollHeight; }); }
  }
  /** Write the whole log into a list (the Log dialog on a narrow screen uses the same entries). */
  function writeLog(list) {
    hud.flushLog?.();
    list.textContent = '';
    let t = -1;
    for (const x of entries) {
      if (x.turn !== t) { t = x.turn; el('li', 'lg-turn', list, `${ico('turn')}<b>${esc(txt('log.turn', { n: t }))}</b>`); }
      const li = el('li', `lg ${x.cls ?? ''}`, list, `<span class="lg-i">${x.icon}</span><span class="lg-t">${x.html}</span>`);
      li.dataset.side = x.side;
      if (x.receipt) { const r = el('code', 'lg-r', li); r.textContent = x.receipt; }
    }
  }

  // ======================================================== the multiplier call-out at the contact
  // over the scene's stage (z 25), so it reads at the contact of a full scene too; the HUD layer itself sits under it
  const callout = el('div', 'mcall', app);
  callout.setAttribute('aria-hidden', 'true');
  let callT = 0, callGen = 0, callKeep = -1;
  /** At a hit's contact: the ring multiplier large (green Strong, red Resisted), the critical under it, near the struck
   *  card (rect, viewport px) or the frame's centre. Holds 900 ms, then fades. */
  function callMultiplier(hit, rect) {
    if (!hit) return;
    const rows = [];
    if (tone(hit.effectiveness) !== 'even') rows.push(`<span class="mcx" data-tone="${povTone(hit.effectiveness, hit.side)}">${ico(tone(hit.effectiveness) === 'up' ? 'strong' : 'weak')}<b>${times(hit.effectiveness)}</b><i>${esc(txt(hit.effectiveness > 1 ? 'ring.up' : 'ring.down'))}</i></span>`);
    if (hit.crit) rows.push(`<span class="mcx" data-tone="crit">${ico('crit')}<b>×1.5</b><i>${esc(txt('chip.critical'))}</i></span>`);
    if (!rows.length) return;
    callout.innerHTML = rows.join('');
    // where it reads: under the scene's own number and receipt when a full scene holds the screen (the next frame, once
    // they are laid out), else beside the struck card on the board
    const W = innerWidth, H = innerHeight;
    const at = () => {
      // the number on screen: the board's own (it owns the contact in a band or a board ending) or the scene's
      const shown = (e) => { const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none'; }; // its place, even on its first, transparent frame
      const vis = (q) => [...document.querySelectorAll(q)].filter(shown).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.bottom > 0 && r.top < H).at(-1);
      const num = vis('#board .num') ?? (app.dataset.scene ? vis('#stage .sd-damage .sd-number') : null), rec = num ? vis('#stage .sd-receipt') : null;
      const cw = callout.offsetWidth || 220, ch = callout.offsetHeight || 60;
      let x, y;
      // a phone (fix1 C2): the call-out takes its own row over the number and every chip beside it (its ring and hit
      // tags, its ticks, the post chips), else under them; never on top of one. And never across the struck figure
      // (fixes-2 R1): over the number's stack first (the slam's growth and its 18 px rise allowed for), under it only
      // when the row's top clears the figure's foot, else over the figure's own top; the least covered of those last
      const phoneRow = W < 720 && num ? (() => {
        const parts = [...document.querySelectorAll('#board .num, #board .num-tags, #board .num-ticks, #board .ptags, #stage .sd-damage .sd-number, #stage .sd-receipt')].filter(shown).map((e) => e.getBoundingClientRect()).filter((q) => q.width && q.bottom > 0 && q.top < H && Math.abs(q.left + q.width / 2 - (num.left + num.width / 2)) < W * 0.45);
        const U = parts.reduce((u, q) => ({ left: Math.min(u.left, q.left), top: Math.min(u.top, q.top), right: Math.max(u.right, q.right), bottom: Math.max(u.bottom, q.bottom) }), { left: num.left, top: num.top, right: num.right, bottom: num.bottom });
        const pad = num.height * 0.3, RISE = 18, cx = (U.left + U.right) / 2;
        const floor = (document.querySelector('#console')?.getBoundingClientRect().top ?? H) - 8;
        const railB = document.querySelector('#app .rail')?.getBoundingClientRect();
        const ceil = Math.max(60, railB?.height ? railB.bottom + 4 : 0);
        // the struck figure as drawn (the layout's anchor where there is no drawn box: a card, a full scene's target)
        const foeSide = hit.side === 'player' ? 'rival' : 'player';
        const fig = drawnBox(hud.layout, foeSide) ?? rect ?? null;
        // (and the actor tag as it stands, the Arena's or the Mat's: a row that rides the settling camera never lands on
        // it, fixes-2 R1 after the critic: 390 #37 1514 px2; weighted over the figure, as a read)
        const seen = (e) => { let a = 1; for (let x = e; x && x !== document.documentElement && a > 0.05; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; a *= +cs.opacity; } return a; };
        const tags = [...document.querySelectorAll('.atag, .slot-tag')].filter((e) => e.dataset.blocked !== 'true' && seen(e) > 0.05).map((e) => e.getBoundingClientRect()).filter((q) => q.width && q.height);
        const ov = (y, q) => { const l = Math.max(cx - cw / 2, q.left), r = Math.min(cx + cw / 2, q.right), t = Math.max(y - ch / 2, q.top), b = Math.min(y + ch / 2, q.bottom); return Math.max(0, r - l) * Math.max(0, b - t); };
        const lap = (y) => (fig?.width ? ov(y, fig) : 0) + tags.reduce((n, q) => n + 3 * ov(y, q), 0);
        const fits = (y) => y - ch / 2 >= ceil && y + ch / 2 <= floor;
        const overNum = U.top - pad - RISE - 8 - ch / 2, underNum = U.bottom + pad + 8 + ch / 2;
        // (by kind, so a follow keeps the kind it took while it stays clear: over the number, under it, over the figure,
        // under the figure)
        const spots = [overNum, !fig?.width || underNum - ch / 2 >= fig.bottom ? underNum : null, fig?.width ? Math.min(fig.top, U.top - pad - RISE) - 8 - ch / 2 : null, fig?.width ? Math.max(fig.bottom, U.bottom + pad) + 8 + ch / 2 : null];
        const good = (k) => spots[k] !== null && fits(spots[k]) && !lap(spots[k]);
        const k = good(callKeep) ? callKeep : spots.findIndex((_, i) => good(i));
        if (k >= 0) { callKeep = k; return { x: cx, y: spots[k] }; }
        // (nowhere clear: inside the window, the spot that covers least of the figure, over the number before under it)
        const all = [overNum, underNum, ...spots.slice(2).filter((y) => y !== null)].map((y) => Math.min(floor - ch / 2, Math.max(ceil + ch / 2, y)));
        return { x: cx, y: all.reduce((m, y) => (lap(y) < lap(m) ? y : m), all[0]) };
      })() : null;
      if (phoneRow) ({ x, y } = phoneRow);
      else if (num && num.right + 20 + cw <= W - 12) { x = num.right + 20 + cw / 2; y = num.top + num.height / 2; } // beside the scene's number
      else if (num) { const b = Math.max(num.bottom, rec?.bottom ?? 0); x = num.left + cw / 2; y = b + 10 + ch / 2; } // under it and its receipt
      else { x = rect ? rect.left + rect.width / 2 : W / 2; y = rect ? rect.top + rect.height * 0.18 : H * 0.3; } // beside the struck card
      x = Math.min(W - cw / 2 - 12, Math.max(cw / 2 + 12, x)); y = Math.min(H - ch / 2 - 12, Math.max(ch / 2 + 60, y));
      const tr = `${Math.round(x)}px ${Math.round(y)}px`;
      if (callout.style.translate === tr) return;
      callout.style.translate = tr;
      // (the actor tag steps off it in the same frame: shared/beats.js listens, so a still never shows the tag one frame
      // where the call-out has just landed, fixes-2 R1 after the critic: 1440 reduced #31 1134 px2)
      if (callout.dataset.on === 'true') callout.dispatchEvent(new Event('mcall:placed', { bubbles: true }));
    };
    // (placed now as well: shown at once under reduced motion, it never stands a frame where the last one stood)
    at();
    requestAnimationFrame(at);
    setTimeout(at, 140); // the receipt writes its total once the count lands
    if (innerWidth < 720) setTimeout(at, 470); // a phone: the post chips (impact + 450) join the row it stands clear of
    // a phone's row rides the number while it shows (fixes-2 R1): the camera settling back to rest moves the number and
    // the figure under a row placed in the window's px, so it is placed again each frame, keeping the kind of spot it took
    const gen = ++callGen;
    callKeep = -1;
    if (innerWidth < 720) { const ride = () => { if (gen !== callGen || callout.dataset.on !== 'true') return; at(); requestAnimationFrame(ride); }; requestAnimationFrame(ride); }
    callout.dataset.on = 'true';
    callout.dispatchEvent(new Event('mcall:placed', { bubbles: true }));
    clearTimeout(callT);
    if (!reduced()) callout.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(1.35)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: 0.35 }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.1,1)' });
    callT = setTimeout(() => { callout.dataset.on = 'false'; }, 1100); // battle time: the speed setting shortens it
  }

  // ======================================================== tooltips: one floating card, any [data-tip]
  const tip = el('div', 'tip', document.body);
  tip.setAttribute('role', 'tooltip');
  tip.id = 'battle-tip';
  let tipFor = null, tipT = 0, tipVideo = null;
  const PREVIEWS = new URL('../previews/', import.meta.url).href;
  /** A move has a preview clip when it is one of its card's printed moves (previews/<card>.<move>.webm); a form's own
   *  moves have none, so their tooltip and key show the tower's still instead of an empty poster. */
  const hasPreview = (card, id) => { try { return engine.fighterDef(card).moves.some((x) => x.id === id); } catch { return false; } };
  /** The tooltip's content for a key ("move:2", "disc:Infra", "status:burn", "item:api-key", "trait:<id>", ...). */
  function tipHtml(key) {
    const [kind, a, b] = key.split(':');
    const me = activeOf('player'), foe = activeOf('rival');
    if (kind === 'move' || kind === 'rmove') {
      const side = kind === 'move' ? 'player' : 'rival';
      const att = activeOf(side), tgt = activeOf(side === 'player' ? 'rival' : 'player');
      if (!att) return '';
      const d = defOf(att), i = Number(a), m = d.moves[i];
      if (!m) return '';
      const nums = engine.moveNumbers(att, m, m.axis ? 600 : undefined);
      const ring = tgt ? ringOf(att.id, tgt.id, m) : 1, home = homeOf(att.id, m);
      const rng = tgt && nums.power > 0 ? rangeOf(att, tgt, i, m.axis ? 600 : undefined) : null;
      const fx = [];
      if (m.priority) fx.push(`<span class="tc">${ico('priority')}${esc(txt('tip.priority', { n: `${m.priority > 0 ? '+' : ''}${m.priority}` }))}</span>`);
      if (m.hits) fx.push(`<span class="tc">${ico('hits')}${esc(txt('tip.hits', { n: span(m.hits.min, m.hits.max) }, m.hits.max))}</span>`);
      if (m.effect) { const s = STATUS_INFO[m.effect.type]; fx.push(`<span class="tc" style="--s:${s.color}">${ico(m.effect.type)}${esc(txt('tip.effect', { status: s.label, n: Math.round(m.effect.chance * 100) }))}</span>`); }
      if (m.selfEffect) fx.push(`<span class="tc" data-tone="${m.selfEffect.type === 'recoil' ? 'down' : 'up'}">${ico(selfIcon(m.selfEffect.type))}${esc(selfWord(m.selfEffect))}</span>`);
      if (m.critChance) fx.push(`<span class="tc">${ico('crit')}${esc(txt('tip.critical', { n: Math.round(m.critChance * 100) }))}</span>`);
      if (m.piercing) fx.push(`<span class="tc">${ico('pierce')}${esc(txt('tip.pierces', { n: Math.round(m.piercing * 100) }))}</span>`);
      if (m.executeThreshold) fx.push(`<span class="tc">${ico('execute')}${esc(txt('tip.execute', { n: Math.round(m.executeThreshold * 100) }))}</span>`);
      if (m.adapts) fx.push(`<span class="tc">${ico('adapts')}${esc(txt('tip.adapts'))}</span>`);
      if (m.axis) fx.push(`<span class="tc">${ico('axis')}${esc(txt('tip.axis', { min: m.axis.min, max: m.axis.max }))}</span>`);
      const desc = moveDesc(m, nums.accuracy), about = cardMoveText(att.id, m);
      const pp = att.pp[i];
      return `<div class="tp-move">
        ${hasPreview(att.id, m.id) ? `<video class="tp-vid" muted loop playsinline preload="none" data-src="${PREVIEWS}${att.id}.${m.id}.webm" poster="${PREVIEWS}${att.id}.${m.id}.webp"></video>` : formOf(att) ? `<span class="tp-vid tp-still">${stillFillHtml(formOf(att).key, { h: 214, card: att.id, accent: formOf(att).accent })}</span>` : ''}
        <div class="tp-body">
          <header><span class="tp-d" style="--d:${K.DISCIPLINE_COLOR[m.discipline]}">${disc(m.discipline)}<i>${esc(dname(m.discipline))}</i></span><b>${esc(m.name)}</b><span class="tp-cat">${nums.power > 0 ? `${ico('power')}${esc(txt('tip.attack'))}` : `${ico('support')}${esc(txt('tip.support'))}`}</span></header>
          <div class="tp-nums">${nums.power > 0 ? `<span>${ico('power')}<b>${nums.power}</b><i>${esc(txt('tip.power'))}</i></span>` : ''}<span>${ico('accuracy')}${nums.accuracy > m.accuracy + 1e-9 ? `<s>${Math.round(m.accuracy * 100)}%</s>` : ''}<b>${Math.round(nums.accuracy * 100)}%</b><i>${esc(nums.accuracy > m.accuracy + 1e-9 ? txt('tip.toHit.trait', { trait: d.trait.name }) : txt('tip.toHit'))}</i></span><span data-low="${pp <= Math.ceil(m.pp / 4)}">${ico('pp')}<b>${pp}/${m.pp}</b><i>${esc(txt('tip.pp'))}</i></span></div>
          ${nums.power > 0 && tgt ? `<div class="tp-vs">${multChip(ring, txt('tip.vs', { ring: ringWord(ring), card: title(tgt.id) }), side)}${home > 1 ? multChip(home, txt('tip.home'), side, 'home') : ''}</div>` : ''}
          ${rng ? `<p class="tp-dmg">${ico('power')}${txt('tip.damage', { dmg: `<b>${dash(rng.lo, rng.hi)}</b>`, pct: `<b>${esc(txt('pct', { n: dash(rng.pctLo, rng.pctHi) }))}</b>`, card: esc(title(tgt.id)) }, undefined, true)}${rng.ko ? ` <em data-ko="${rng.ko}">${ico('ko')}${esc(txt(rng.ko === 'sure' ? 'tip.ko.sure' : rng.accuracy < 1 && rng.lo >= tgt.hp ? 'tip.ko.ifHits' : 'tip.ko.maybe'))}</em>` : rng.relaunch && rng.hi >= tgt.hp ? ` <em data-ko="maybe">${ico('trait')}${esc(txt('tip.relaunch'))}</em>` : ''}</p>` : ''}
          ${fx.length ? `<div class="tp-fx">${fx.join('')}</div>` : ''}
          ${about ? `<p class="tp-about">${esc(about)}</p>` : ''}
          ${desc ? `<p class="tp-desc">${esc(desc)}</p>` : ''}
        </div></div>`;
    }
    if (kind === 'disc') {
      const i = RING.indexOf(a);
      const strong = RING[(i + 1) % RING.length], weak = RING[(i - 1 + RING.length) % RING.length];
      return `<div class="tp-small"><header><span class="tp-d" style="--d:${K.DISCIPLINE_COLOR[a]}">${disc(a)}</span><b>${esc(dname(a))}</b></header>
        <p class="tp-row">${txt('tip.disc.attacks', { up: multChip(1.5, txt('tip.disc.on', { d: dname(strong) })), down: multChip(0.67, txt('tip.disc.on', { d: dname(weak) })) }, undefined, true)}</p>
        <p class="tp-row">${txt('tip.disc.hits', { up: multChip(1.5, txt('tip.disc.from', { d: dname(weak) })), down: multChip(0.67, txt('tip.disc.from', { d: dname(strong) })) }, undefined, true)}</p>
        <p class="tp-note">${esc(txt('tip.disc.note'))}</p></div>`;
    }
    if (kind === 'status') { const s = STATUS_INFO[a]; return `<div class="tp-small"><header><span class="tp-st" style="--s:${s.color}">${ico(a)}</span><b>${esc(s.label)}</b></header><p class="tp-desc">${esc(s.text)}</p></div>`; }
    if (kind === 'stage') { const n = Number(b); return `<div class="tp-small"><header>${K.icon(a)}<b>${esc(txt('stat.stage', { stat: STAT[a], n: `${n > 0 ? '+' : '−'}${Math.abs(n)}` }))}</b>${multChip(stageMult(n))}</header><p class="tp-desc">${esc(txt('tip.stage', { what: txt(`tip.stage.${a}`), m: times(stageMult(n)) }))}</p></div>`; }
    if (kind === 'stat') return `<div class="tp-small"><header>${K.icon(a)}<b>${esc(txt('stat.stage', { stat: STAT[a], n: b }))}</b></header><p class="tp-desc">${esc(txt('tip.stat', { what: txt(`tip.stat.${a}`) }))}</p></div>`;
    if (kind === 'barrier') return `<div class="tp-small"><header>${ico('barrier')}<b>${esc(txt('tip.barrier.head', { n: Math.round(Number(a) * 100) }))}</b></header><p class="tp-desc">${esc(txt('tip.barrier', { n: Math.round(Number(a) * 100) }))}</p></div>`;
    if (kind === 'crit') return `<div class="tp-small"><header>${ico('crit')}<b>${esc(txt('tip.crit.head', { n: Math.round(Number(a) * 100) }))}</b></header><p class="tp-desc">${esc(txt('tip.crit', { n: Math.round(Number(a) * 100) }))}</p></div>`;
    if (kind === 'trait') { const d = def(a); return `<div class="tp-small"><header>${ico('trait')}<b>${esc(d.trait.name)}</b><span class="tp-cat">${esc(txt('plate.trait'))}</span></header><p class="tp-desc">${esc(words(d.trait.rule))}</p></div>`; }
    if (kind === 'item') {
      const it = engine.itemById(a);
      return `<div class="tp-small"><header>${ico(a)}<b>${esc(it.name)}</b><span class="tp-cat">${esc(engineWords(words(it.short)))}</span></header><p class="tp-desc">${esc(txt(`item.${a}`))}</p><p class="tp-note">${ico('priority')}${esc(txt('tip.item.note'))}</p></div>`;
    }
    if (kind === 'kit') return `<div class="tp-small"><header>${ico('bag')}<b>${esc(txt('kit.word'))}</b></header><p class="tp-desc">${esc(txt('tip.kit', { n: kitLeft(a), all: kitAll(a) }, kitLeft(a)))}</p></div>`;
    if (kind === 'tower' || kind === 'upgrade') return towerTip(kind, a, b);
    if (kind === 'bench') {
      const s = hud.match?.state.sides[a], t = s?.team[Number(b)];
      if (!t) return '';
      const d = defOf(t), other = activeOf(a === 'player' ? 'rival' : 'player');
      const best = other ? Math.max(...d.moves.map((mv) => ringOf(t.id, other.id, mv))) : 1;
      return `<div class="tp-small"><header><b>${esc(title(t.id))}</b><span class="tp-cat">${esc(t.hp <= 0 ? txt('chip.out') : txt('hp.short', { hp: t.hp, max: t.maxHp }))}</span></header><p class="tp-row">${d.disciplines.map((x) => `<span class="tp-d" style="--d:${K.DISCIPLINE_COLOR[x]}">${disc(x)}<i>${esc(dname(x))}</i></span>`).join('')}${t.status ? `<span class="tc" style="--s:${STATUS_INFO[t.status].color}">${ico(t.status)}${esc(STATUS_INFO[t.status].label)}</span>` : ''}</p>${other && t.hp > 0 ? `<p class="tp-row">${txt('tip.bench.best', { card: esc(title(other.id)), chip: multChip(best) }, undefined, true)}</p>` : ''}</div>`;
    }
    if (kind === 'order') { const me = activeOf('player'), foe = activeOf('rival'); if (!me || !foe) return ''; return `<div class="tp-small"><header>${ico('priority')}<b>${esc(txt('tip.order.head'))}</b></header><p class="tp-row">${K.icon('spd')}${txt('tip.order.pace', { you: esc(title(me.id)), youN: `<b>${Math.round(engine.effectiveSpeed(me))}</b>`, rival: esc(title(foe.id)), rivalN: `<b>${Math.round(engine.effectiveSpeed(foe))}</b>` }, undefined, true)}</p><p class="tp-desc">${esc(txt('tip.order'))}</p></div>`; }
    if (kind === 'speed') return `<div class="tp-small"><header>${ico('speed')}<b>${esc(txt('tip.speed.head'))}</b></header><p class="tp-desc">${esc(txt('tip.speed'))}</p></div>`;
    return '';
  }
  const shortSelf = (fx) => {
    if (fx.type === 'atkUp' || fx.type === 'defUp' || fx.type === 'spdUp') return txt('short.stat', { stat: STAT[fx.type.slice(0, 3)], n: fx.amount });
    const k = { critUp: 'short.critUp', barrier: 'short.barrier', heal: 'short.heal', drain: 'short.drain', recoil: 'short.recoil' }[fx.type];
    return k ? txt(k, { n: fx.type === 'barrier' ? Math.round(fx.amount * 100) : fx.amount }) : fx.type;
  };
  const selfIcon = (t) => ({ atkUp: 'up', defUp: 'up', spdUp: 'up', critUp: 'crit', barrier: 'barrier', heal: 'heal', drain: 'drain', recoil: 'recoil' })[t] ?? 'support';
  const selfWord = (fx) => {
    const c = fx.chance < 1 ? txt('self.chance', { n: Math.round(fx.chance * 100) }) : '';
    if (fx.type === 'atkUp' || fx.type === 'defUp' || fx.type === 'spdUp') return txt('self.stat', { stat: STAT[fx.type.slice(0, 3)], n: fx.amount, chance: c });
    if (fx.type === 'critUp') return txt('self.critical', { n: Math.round(fx.amount * 100), chance: c });
    if (fx.type === 'barrier') return txt('self.barrier', { n: Math.round(fx.amount * 100), chance: c });
    if (fx.type === 'heal') return txt('self.heals', { n: fx.amount, chance: c });
    if (fx.type === 'drain') return txt('self.drains', { n: Math.round(fx.amount * 100), chance: c });
    if (fx.type === 'recoil') return txt('self.recoil', { n: Math.round(fx.amount * 100) });
    return fx.type;
  };
  const moveDesc = (mv, acc = mv.accuracy) => {
    try {
      // the rules only: the card's own words print beside them (cardMoveText), so the feature line is left out here
      const d = document.createElement('div'); d.innerHTML = window.MARKUP.moveText({ ...mv, feature: '' }); d.querySelector('b')?.remove();
      let t = d.textContent.trim().replace(/\.\s*\.$/, '.');
      // a trait that makes it sure (Deterministic) leaves one accuracy on screen: the clause naming the base goes
      if (acc > mv.accuracy + 1e-9) t = t.replace(/(hits for [^,.]+),\s*\d+% of the time/i, '$1');
      return t.charAt(0).toUpperCase() + t.slice(1);
    } catch { return mv.feature ?? ''; }
  };
  hud.moveDesc = moveDesc;
  function showTip(target) {
    const key = target.dataset.tip;
    const html = key && tipHtml(key);
    if (!html) return hideTip();
    tipFor = target;
    if (tip.dataset.k !== key) { tip.dataset.k = key; tip.innerHTML = html; }
    tip.dataset.on = 'true';
    target.setAttribute('aria-describedby', tip.id);
    placeTip(target);
    // the move's preview loops while the tooltip shows (recorded from the battle's own scene)
    const v = tip.dataset.compact === 'true' ? null : tip.querySelector('video.tp-vid');
    if (v) {
      v.onerror = () => { v.closest('.tp-move')?.setAttribute('data-novid', ''); };
      if (!v.src && !reduced()) { v.src = v.dataset.src; v.play().catch(() => {}); tipVideo = v; } else if (reduced()) v.load();
      else { v.play().catch(() => {}); tipVideo = v; }
    }
  }
  // a tooltip that changes size after it is placed (its preview's poster lays out) is placed again
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (tipFor && tip.dataset.on === 'true') placeTip(tipFor); }).observe(tip);
  function placeTip(target) {
    // place: above the target, else below, inside the window
    const r = target.getBoundingClientRect(), t = tip.getBoundingClientRect();
    const W = innerWidth, H = innerHeight;
    let x = r.left + r.width / 2 - t.width / 2;
    x = Math.max(8, Math.min(W - t.width - 8, x));
    let y = r.top - t.height - 10;
    if (y < 8) y = Math.min(H - t.height - 8, r.bottom + 10);
    // a move's tooltip on a wide screen stands over the log rail's foot, clear of your plate and leader
    const lb = hud.layout?.logBox?.();
    const tb = tabBox();
    if (target.closest('#panel')) ({ x, y } = panelSpot(target, r));
    else if (target.closest('#moves, .acts .tower') && lb && !narrow()) { tip.dataset.compact = 'false'; const t2 = tip.getBoundingClientRect(); x = Math.max(8, lb.x + lb.w - t2.width); const over = tb && tb.right > x && tb.left < x + t2.width ? Math.min(r.top, tb.top) : r.top; y = Math.max(8, over - t2.height - 8); }
    // without the log rail (the Mat under 1280, the Arena), the first of a few spots that covers nothing the choice needs
    else if (target.closest('#moves, .acts .tower') && !narrow()) ({ x, y } = moveSpot(target, r));
    // a plate's own parts: beside the plate (its HP and chips stay readable), else as above
    const pl = target.closest('.plate:not([data-strip="true"])');
    if (pl) {
      const pr = pl.getBoundingClientRect();
      const left = pr.left - t.width - 12, right = pr.right + 12;
      if (left >= 8 || right + t.width <= W - 8) { x = left >= 8 ? left : right; y = Math.max(8, Math.min(H - t.height - 8, pr.top)); }
    }
    // whatever spot won, the whole tooltip stays inside the window
    x = Math.max(8, Math.min(W - t.width - 8, x)); y = Math.max(8, Math.min(H - t.height - 8, y));
    // and never over the turn tab (fix1 C3): above it, else below it, else beside it
    const tw = tip.getBoundingClientRect().width || t.width, th = tip.getBoundingClientRect().height || t.height;
    if (tb && !target.closest('#panel') && x < tb.right && x + tw > tb.left && y < tb.bottom && y + th > tb.top) {
      if (tb.top - th - 8 >= 8) y = tb.top - th - 8;
      else if (tb.bottom + 8 + th <= H - 8) y = tb.bottom + 8;
      else x = tb.left - tw - 8 >= 8 ? tb.left - tw - 8 : Math.min(W - tw - 8, tb.right + 8);
    }
    tip.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
  }
  /** The turn tab's box while it shows (null when hidden or empty). */
  function tabBox() {
    if (!turnTab.isConnected) return null;
    const cs = getComputedStyle(turnTab);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return null;
    const q = turnTab.getBoundingClientRect();
    return q.width && q.height ? q : null;
  }
  /** A tooltip for a panel's key (a Tower tile, an upgrade, a bench row, a Kit item): over the board above the panel's
   *  head, at the key's x, clear of the turn tab; where the room over the panel is too short, beside the key, then the
   *  spot that covers the fewest keys (fix1 C6). */
  function panelSpot(target, r) {
    const W = innerWidth, H = innerHeight, t = tip.getBoundingClientRect(), w = t.width, h = t.height;
    const pn = target.closest('#panel').getBoundingClientRect(), tb = tabBox();
    const top = Math.max(8, ...[document.querySelector('#app .rail')].map((e) => (e?.getBoundingClientRect().height ? e.getBoundingClientRect().bottom + 8 : 0)));
    const keys = [...target.closest('#panel').querySelectorAll('.key, button')].filter((e) => e !== target).map((e) => e.getBoundingClientRect()).filter((q) => q.width);
    const cons = [...document.querySelectorAll('.console .acts .key, #moves .cmove')].filter((e) => !target.closest('#panel').contains(e)).map((e) => e.getBoundingClientRect()).filter((q) => q.width);
    const lap = (c, q) => Math.max(0, Math.min(c.x + c.w, q.right) - Math.max(c.x, q.left)) * Math.max(0, Math.min(c.y + c.h, q.bottom) - Math.max(c.y, q.top));
    const cx = r.left + r.width / 2 - w / 2;
    const over = tb ? Math.min(pn.top, tb.top) : pn.top;
    const above = pn.top - h - 8;
    // (what the board shows while you choose, as moveSpot weighs it: the plates and the log rail at 2, the cards or
    // figures in play and the leaders at 3; fix1 C6 after the critic)
    const box = (e) => e?.getBoundingClientRect();
    const seen = (e) => e && !e.hidden && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
    const board = [];
    // (a plate is the HP the tip measures against: it weighs as a key, never a place to stand, fixes-3 R3: at 1440 every
    // tile's tip stood on the rival plate)
    for (const [e, k] of [[plates.player.el, 40], [plates.rival.el, 40], [logEl, 2]]) if (seen(e)) { const q = box(e); if (q.width) board.push([q, k]); }
    // (your own figure is the tower you are changing, 12; the rival's and the leaders 3; the bench's cards and the team
    // rosters, the HP the plates count, weigh as a plate, 40: at 1440 a tile tip stood on your bench stack and on your
    // own figure, fixes-3 R3 after the critic)
    const mat = hud.layout?.mode === 'mat';
    for (const e of document.querySelectorAll(`${mat ? '#board .slot[data-zone="active"], ' : ''}#board .leader, .leader`)) if (seen(e)) { const q = box(e); if (q.width) board.push([q, e.dataset.side === 'player' ? 12 : 3]); }
    // (the Arena's figures by their drawn box, the picture's opaque matter, not the figure's whole frame, so the tip may
    // stand in the open board over them; a figure with no drawn box, its frame)
    if (!mat) for (const side of ['player', 'rival']) {
      let q = null;
      try { q = drawnBox(hud.layout, side); } catch { q = null; }
      if (!q?.width) { const e = document.querySelector(`#board .fig[data-side="${side}"]:not([hidden])`); q = e && seen(e) ? box(e) : null; }
      if (q?.width) board.push([q, side === 'player' ? 12 : 3]);
    }
    for (const e of document.querySelectorAll(mat ? '#board .slot[data-zone="bench"]' : '#board .hand .hcard, #board .team')) if (seen(e)) { const q = box(e); if (q.width) board.push([q, 40]); }
    // above the panel: at the key's x, beside the tab, then across the width in steps; then beside or under the key
    const xs = [cx, ...(tb ? [tb.left - w - 8, tb.right + 8] : []), ...Array.from({ length: 9 }, (_, i) => 8 + ((W - w - 16) * i) / 8)];
    const spots = [...xs.map((x) => ({ x, y: above })), ...xs.map((x) => ({ x, y: over - h - 8 })), { x: r.right + 10, y: r.top }, { x: r.left - w - 10, y: r.top }, { x: cx, y: r.bottom + 10 }, ...xs.map((x) => ({ x, y: top }))];
    let best = null;
    for (const s0 of spots) {
      const c = { x: Math.max(8, Math.min(W - w - 8, s0.x)), y: Math.max(top, Math.min(H - h - 8, s0.y)), w, h };
      // the key itself and the panel's other keys first, then the tab, then the board's reads, then the panel's body;
      // a tie goes to the spot nearest the key
      // (fixes-2 R11: the key under the pointer is never covered while any spot clears it, the panel's other keys,
      // a disabled tile among them, and the console's keys weigh 12, so a tip stands over the board before a tile)
      // (fixes-3 R3: the panel's keys, the disabled and the standing tile among them, weigh as a plate, 40)
      const cost = 1e6 * lap(c, r) + 40 * keys.reduce((n, q) => n + lap(c, q), 0) + 12 * cons.reduce((n, q) => n + lap(c, q), 0) + 1e4 * (tb ? lap(c, tb) : 0) + board.reduce((n, [q, k]) => n + k * lap(c, q), 0) + lap(c, pn);
      const dist = Math.abs(c.x + w / 2 - (r.left + r.width / 2)) + Math.abs(c.y + h - r.top);
      if (!best || cost < best.cost || (cost === best.cost && dist < best.dist)) best = { ...c, cost, dist };
    }
    return best;
  }
  /** A move tooltip's spot. The Mat (under 1280): over the console's right end (the benches' side), else its left end.
   *  The Arena: over the log rail's foot (from 1280), else beside your plate, else above it (under the team rail), else
   *  over the console's right end.
   *  Each is scored by what it covers (the cards or figures in play, both plates, the aim); where none clears at full
   *  size, this window's move tooltips drop their preview, once per window size, so the spot never jumps between moves. */
  const compactAt = new Set();
  function moveSpot(target, r) {
    const W = innerWidth, H = innerHeight, mode = hud.layout?.mode, key = `${mode}:${W}x${H}`;
    const box = (e) => e?.getBoundingClientRect();
    const con = box(target.closest('.console')), pr = box(plates.player.el);
    const avoid = [];
    // (the Arena's figures as drawn where the layout gives them: a tower's element box stands far over its picture, so a
    // tip over the board's empty upper left was scored as covering it and went across the rival instead, PTD 1024)
    const drawn = mode === 'mat' ? null : { player: drawnBox(hud.layout, 'player'), rival: drawnBox(hud.layout, 'rival') };
    if (drawn?.player?.width && drawn?.rival?.width) { avoid.push([drawn.player, 3], [drawn.rival, 3]); }
    else for (const e of document.querySelectorAll(mode === 'mat' ? '#board .slot[data-zone="active"]' : '#board .fig')) { const q = box(e); if (q.width && !e.hidden) avoid.push([q, 3]); }
    for (const [e, k] of [[plates.player.el, 2], [plates.rival.el, 2], [aimEl.dataset.on === 'true' ? aimEl : null, 3]]) { const q = box(e); if (q?.width) avoid.push([q, k]); }
    { const q = tabBox(); if (q) avoid.push([q, 2]); }
    // (your own figure as drawn, at 1, fixes-2 R10: a tip over the board's free upper left is preferred to one across it)
    { const q = drawn?.player; if (q?.width) avoid.push([q, 1]); }
    // (and the hand stacks and their HP, at a quarter: between two spots that clear the figures, the one off the cards,
    // fixes-2 R10 after the critic; never before a figure)
    const hands = mode === 'mat' ? [] : [...document.querySelectorAll('#board .hand .hcard')].map(box).filter((q) => q?.width && q.height);
    for (const q of hands) avoid.push([q, 0.25]);
    // (and a spot of its own beside your hand stack, under the team rail: the board's upper left less the cards)
    const handR = Math.max(0, ...hands.filter((q) => q.left < W / 2 && q.top < H / 2).map((q) => q.right));
    // (the console's keys are a soft cost: they choose between spots, but covering them never drops the preview)
    const soft = [...document.querySelectorAll('.console .acts .key')].map(box).filter((q) => q.width);
    const top = Math.max(8, ...[document.querySelector('.rail'), document.getElementById('team')].map((e) => (box(e)?.height ? box(e).bottom + 8 : 0)));
    const right = W - 8;
    const lap = (c, q) => Math.max(0, Math.min(c.x + c.w, q.right) - Math.max(c.x, q.left)) * Math.max(0, Math.min(c.y + c.h, q.bottom) - Math.max(c.y, q.top));
    const pick = () => {
      const t = tip.getBoundingClientRect(), w = t.width, h = t.height, over = con.top - h - 8;
      // (the Arena from 1280: first over the log rail's foot, which nothing reads while a move is chosen)
      const lb = hud.layout?.logBox?.();
      const spots = mode === 'mat' ? [{ x: con.right - w, y: over }, { x: con.left, y: over }]
        : [...(lb ? [{ x: lb.x + lb.w - w, y: lb.y + lb.h - h, floor: lb.y + lb.h }] : []), { x: pr.right + 12, y: Math.min(r.top - h - 10, pr.bottom - h) }, { x: pr.left, y: pr.top - h - 8 }, { x: con.right - w, y: over }, { x: pr.left, y: top }, ...(handR ? [{ x: handR + 8, y: top }] : []), { x: pr.right + 12, y: top }];
      let best = null;
      for (const s0 of spots) {
        const c = { x: Math.max(8, Math.min(right - w, s0.x)), y: s0.y, w, h };
        if (c.y < top || c.y + h > (s0.floor ?? con.top - 8)) continue;
        const cost = avoid.reduce((n, [q, k]) => n + k * lap(c, q), 0), total = cost + soft.reduce((n, q) => n + lap(c, q), 0);
        // what the choice needs first, then the keys
        if (!best || cost < best.cost || (cost === best.cost && total < best.total)) best = { ...c, cost, total };
      }
      return best;
    };
    tip.dataset.compact = String(compactAt.has(key));
    let best = pick();
    if ((!best || best.cost > 0) && !compactAt.has(key)) { compactAt.add(key); tip.dataset.compact = 'true'; best = pick() ?? best; }
    const t = tip.getBoundingClientRect();
    return best ?? { x: con.right - t.width, y: Math.max(top, con.top - t.height - 8) };
  }
  function hideTip() {
    clearTimeout(tipT);
    if (tipFor) tipFor.removeAttribute('aria-describedby');
    tipFor = null;
    tip.dataset.on = 'false';
    tipVideo?.pause(); tipVideo = null;
  }
  const tipTarget = (e) => e.target?.closest?.('[data-tip]');
  const rnow = () => (window.battlePace?.realNow ?? performance.now.bind(performance))();
  // a command closes the tooltip and none opens while the turn plays; after it, the key the pointer rested on opens
  // its tooltip only on a new hover or focus (fix1 C5)
  // (and a pointer that has not moved since the turn began opens nothing: a redraw, a hidden order chip shown again,
  // brings a new element under a resting pointer, and the browser's own pointerover for it is not a hover, fixes-3 R3)
  let tipBusy = false, staleTip = null, stalePt = null, lastPt = null;
  hud.tipBusy = (busy) => {
    if (busy && !tipBusy) { staleTip = tipFor ?? [...document.querySelectorAll('[data-tip]:hover')].at(-1) ?? null; stalePt = lastPt; hideTip(); }
    tipBusy = Boolean(busy);
  };
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    lastPt = [e.clientX, e.clientY];
    if (stalePt && Math.hypot(e.clientX - stalePt[0], e.clientY - stalePt[1]) > 2) stalePt = null;
  }, true);
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const t = tipTarget(e);
    if (tipBusy) return;
    if (stalePt && Math.hypot(e.clientX - stalePt[0], e.clientY - stalePt[1]) <= 2) return;
    if (staleTip) { if (t === staleTip) return; staleTip = null; }
    if (t === tipFor) return;
    clearTimeout(tipT);
    if (!t) { tipT = realTimeout(hideTip, 80); return; }
    tipT = realTimeout(() => showTip(t), tipFor ? 0 : 260);
  });
  // a focus opens a tooltip only after the keyboard was used (the page focuses the first move after each turn)
  let keyedAt = -1e9;
  hud.keyedRecently = () => rnow() - keyedAt < 150;
  document.addEventListener('keydown', (e) => { if (e.key === 'Tab' || e.key.startsWith('Arrow')) keyedAt = rnow(); }, true);
  document.addEventListener('focusin', (e) => { const t = tipTarget(e); if (t && !tipBusy && rnow() - keyedAt < 150) { staleTip = null; showTip(t); } else if (tipFor && !t) hideTip(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tipFor) hideTip(); }, true);
  document.addEventListener('pointerdown', () => hideTip(), true);
  // a phone has no hover: a long press (450 ms) opens the tooltip, and the click that ends it does nothing
  let press = null, swallow = null;
  document.addEventListener('pointerdown', (e) => {
    swallow = null;
    if (e.pointerType !== 'touch') return;
    const t = tipTarget(e);
    if (!t) return;
    press = { t, x: e.clientX, y: e.clientY, timer: realTimeout(() => { showTip(t); swallow = { t, until: rnow() + 700 }; press = null; }, 450) };
  }, true);
  const unpress = () => { if (press) { clearTimeout(press.timer); press = null; } };
  document.addEventListener('pointermove', (e) => { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) unpress(); }, true);
  document.addEventListener('pointerup', unpress, true);
  document.addEventListener('pointercancel', unpress, true);
  document.addEventListener('click', (e) => {
    const t = swallow; swallow = null;
    if (t && t.t.contains(e.target) && rnow() < t.until) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('contextmenu', (e) => { if (tipTarget(e) && e.pointerType !== 'mouse') e.preventDefault(); }, true);
  addEventListener('scroll', (e) => { if (!e.target?.closest?.('.blog-list')) hideTip(); }, true);

  // ======================================================== the aim: the chosen move against the card across
  const aimEl = el('div', 'aim', root);
  aimEl.setAttribute('aria-hidden', 'true');
  let aimFor = null;
  hud.aim = (i) => {
    const P = plates.rival;
    if (i === null || i === undefined || !hud.match || hud.match.state.phase !== 'command') {
      aimFor = null; aimEl.dataset.on = 'false'; P.hp.querySelector('.pl-aim')?.remove(); return;
    }
    if (aimFor === i) return;
    aimFor = i;
    hud.lastAim = i;
    const me = activeOf('player'), foe = activeOf('rival');
    const m = me && defOf(me).moves[i];
    if (!m || !foe) return;
    const nums = engine.moveNumbers(me, m, m.axis ? 600 : undefined);
    // a support move acts on its own card: nothing to aim at across the table
    if (nums.power <= 0) { aimEl.dataset.on = 'false'; P.hp.querySelector('.pl-aim')?.remove(); return; }
    const ring = nums.power > 0 ? ringOf(me.id, foe.id, m) : 1;
    const rng = nums.power > 0 ? rangeOf(me, foe, i, m.axis ? 600 : undefined) : null;
    let r = null;
    try { r = hud.layout?.anchor?.('target', 'rival'); } catch { r = null; }
    if (r && r.width) {
      const g = 16, W = innerWidth, H = innerHeight;
      const x0 = Math.max(g, r.left), y0 = Math.max(g, r.top), x1 = Math.min(W - g, r.right), y1 = Math.min(H - g, r.bottom);
      aimEl.style.translate = `${Math.round(x0)}px ${Math.round(y0)}px`;
      aimEl.style.width = `${Math.round(Math.max(24, x1 - x0))}px`; aimEl.style.height = `${Math.round(Math.max(24, y1 - y0))}px`;
      aimEl.innerHTML = `<i></i><i></i><i></i><i></i>${nums.power > 0 ? `<span class="aim-chip" data-tone="${tone(ring)}">${tone(ring) !== 'even' ? ico(ring > 1 ? 'strong' : 'weak') : ''}<b>${times(ring)}</b>${rng ? `<em>${esc(txt('pct', { n: dash(rng.pctLo, rng.pctHi) }))}${rng.ko ? ` · ${esc(txt(rng.ko === 'sure' ? 'aim.ko' : 'aim.ko.maybe'))}` : ''}</em>` : ''}</span>` : `<span class="aim-chip" data-tone="even"><b>${esc(txt('tip.support'))}</b></span>`}`;
      aimEl.dataset.on = 'true';
      aimEl.dataset.mode = hud.layout?.mode ?? '';
      aimEl.dataset.ko = rng?.ko ?? '';
    }
    // the rival plate's HP bar marks what the move would take: the sure part solid, the possible part hatched
    P.hp.querySelector('.pl-aim')?.remove();
    if (rng && foe.maxHp) {
      const hi = Math.min(foe.hp, rng.hi), lo = Math.min(foe.hp, rng.lo);
      const a = el('i', 'pl-aim', P.hp);
      a.style.left = `${(100 * (foe.hp - hi)) / foe.maxHp}%`; a.style.width = `${(100 * hi) / foe.maxHp}%`;
      a.style.setProperty('--sure', `${hi ? (100 * lo) / hi : 0}%`);
      a.dataset.ko = rng.ko;
    }
  };

  // ======================================================== the console's rows (battle.js prints them)
  /** One move button's inside: discipline, name, the multiplier into the card across (green or red, with the number),
   *  power, accuracy, PP pips and the move's effect icons. */
  /** A move's description: the words the home page's card prints for it (its feature), else the battle's own. */
  function cardMoveText(id, m) {
    const ex = globalThis.EX_CARD?.fighter(id), mv = ex?.moves.find((x) => x.name === m.name);
    // (the battle's own lines are fragments: each ends with a period, as the card's sentences do)
    const t = words((mv ?? m).feature ?? '').trim();
    return t && !/[.!?…]$/.test(t) ? `${t}.` : t;
  }
  hud.cardMoveText = cardMoveText;
  function moveInner(m, i, id) {
    // the move's properties as short labelled chips (two at most on the button; the tooltip lists them all)
    const flags = [];
    if (m.priority) flags.push(`${ico('priority')}${esc(txt('flag.prio', { n: `${m.priority > 0 ? '+' : ''}${m.priority}` }))}`);
    if (m.effect) flags.push(`<span style="color:${STATUS_INFO[m.effect.type].color}">${ico(m.effect.type)}</span>${esc(txt('tip.effect', { status: STATUS_INFO[m.effect.type].label, n: Math.round(m.effect.chance * 100) }))}`);
    if (m.selfEffect) flags.push(`${ico(selfIcon(m.selfEffect.type))}${esc(shortSelf(m.selfEffect))}`);
    if (m.hits) flags.push(`${ico('hits')}${esc(txt('tip.hits', { n: dash(m.hits.min, m.hits.max) }, m.hits.max))}`);
    if (m.executeThreshold) flags.push(`${ico('execute')}${esc(txt('chip.finisher'))}`);
    if (m.critChance) flags.push(`${ico('crit')}${esc(txt('flag.crit', { n: Math.round(m.critChance * 100) }))}`);
    if (m.piercing) flags.push(`${ico('pierce')}${esc(txt('flag.pierce'))}`);
    return `<span class="move-head">${disc(m.discipline)}<span class="move-name">${esc(m.name)}</span><span class="move-ring"></span></span>
      <span class="move-stats"><span class="ms-pow">${ico('power')}<b></b></span><span class="ms-acc">${ico('accuracy')}<b></b></span><span class="ms-prio" hidden></span><span class="move-ring move-ring-s" aria-hidden="true"></span><span class="ms-flags">${flags.slice(0, 2).map((f) => `<span class="mf">${f}</span>`).join('')}</span></span>
      <span class="move-pp"><span class="pp-bar"><i></i></span><b></b></span>
      <span class="move-dmg"></span>
      <span class="move-about">${esc(cardMoveText(id, m))}</span>
      <img class="move-thumb" alt="" loading="lazy" decoding="async" data-poster="${m.id}">
      <kbd class="move-key">${i + 1}</kbd>`;
  }
  /** From 1366 the chip keeps its room on the name's row whatever it reads (an even ring's room unseen), so a new rival
   *  never rewraps a name (fixes-3 R4). A name that fits its row alone but not beside that room takes its chip on the
   *  numbers' row instead (data-ringrow="stats", as from 720 to 1365): "Tesla Zapper" and "Boss Wave" stay on one line
   *  beside no empty room. Decided by the name and the key's width only, never by the ring, so a ring that changes
   *  moves nothing (fixes-3 R4 after the critic). */
  const wideQ = typeof matchMedia === 'function' ? matchMedia('(min-width: 1366px)') : null;
  let fitCtx = null;
  function ringRow(b) {
    const head = b.querySelector('.move-head'), name = head?.querySelector('.move-name'), ring = head?.querySelector('.move-ring');
    if (!wideQ?.matches || !name || !ring || b.dataset.ring === 'support') { if (b.dataset.ringrow) delete b.dataset.ringrow; delete b.dataset.fitk; return; }
    const hw = head.clientWidth, k = `${name.textContent}|${hw}`;
    if (!hw || b.dataset.fitk === k) return;
    b.dataset.fitk = k;
    try {
      const hs = getComputedStyle(head), ns = getComputedStyle(name), gap = parseFloat(hs.columnGap) || 0;
      fitCtx ??= document.createElement('canvas').getContext('2d');
      fitCtx.font = `${ns.fontStyle} ${ns.fontWeight} ${ns.fontSize} ${ns.fontFamily}`;
      const nameW = fitCtx.measureText(name.textContent).width + (parseFloat(ns.letterSpacing) || 0) * name.textContent.length;
      const room = hw - (parseFloat(hs.paddingLeft) || 0) - (parseFloat(hs.paddingRight) || 0);
      const rest = [...head.children].filter((e) => e !== name && e !== ring && e.getClientRects().length).reduce((n, e) => n + e.getBoundingClientRect().width + gap, 0);
      const ringW = 5.4 * (parseFloat(getComputedStyle(ring).fontSize) || 12.5) + gap;
      const alone = nameW + rest <= room + 0.5, beside = nameW + rest + ringW <= room + 0.5;
      const row = alone && !beside ? 'stats' : '';
      if ((b.dataset.ringrow ?? '') !== row) { if (row) b.dataset.ringrow = row; else delete b.dataset.ringrow; }
    } catch { /* the name's row */ }
  }
  /** Fill a move button with the numbers of this moment: the card in play, the card across. */
  function moveFill(b, me, foe, m, i) {
    const nums = engine.moveNumbers(me, m, m.axis ? 600 : undefined);
    const ring = foe ? ringOf(me.id, foe.id, m) : 1;
    const set = (sel, text) => { const n = b.querySelector(sel); if (n && n.textContent !== text) n.textContent = text; };
    // (no em or en dash on screen, decision 20: a support move's power is its 0)
    set('.ms-pow b', nums.power > 0 ? String(nums.power) : txt('power.none'));
    b.querySelector('.ms-pow').dataset.none = String(nums.power <= 0);
    set('.ms-acc b', `${Math.round(nums.accuracy * 100)}%`);
    // priority on the key itself, at every width (fixes-2 R4): a touch screen weighs nothing before the tap, so the key
    // says it jumps the order and the tab reads the order on Pace
    { const pr = (() => { try { return engine.priorityOf(me, { kind: 'move', index: i }) ?? 0; } catch { return m.priority ?? 0; } })(), e = b.querySelector('.ms-prio');
      if (e) { const t = pr ? txt('chip.prio', { n: `${pr > 0 ? '+' : '−'}${Math.abs(pr)}` }) : ''; if (e.textContent !== t) e.textContent = t; e.hidden = !pr; e.dataset.tone = pr > 0 ? 'up' : 'down'; } }
    const pp = me.pp[i];
    set('.move-pp b', `${pp}/${m.pp}`);
    b.querySelector('.pp-bar i').style.transform = `scaleX(${m.pp ? pp / m.pp : 0})`;
    b.querySelector('.move-pp').dataset.low = String(pp <= Math.ceil(m.pp / 4));
    b.querySelector('.move-pp').dataset.mid = String(pp > Math.ceil(m.pp / 4) && pp <= Math.ceil(m.pp / 2));
    // (the chip is printed twice: on the name's row, and on the numbers' row, where it stands from 720 to 1365 so a
    // long name keeps its whole row; CSS shows one)
    const rt = nums.power > 0 && tone(ring) !== 'even' ? `${ico(ring > 1 ? 'strong' : 'weak')}<b>${times(ring)}</b>` : nums.power > 0 ? `<b>×1</b>` : `${ico('support')}<b>${esc(txt('tip.support'))}</b>`;
    for (const re of b.querySelectorAll('.move-ring')) if (re.dataset.k !== rt) { re.dataset.k = rt; re.innerHTML = rt; }
    b.dataset.ring = nums.power > 0 ? tone(ring) : 'support';
    ringRow(b);
    const rng = foe && nums.power > 0 ? rangeOf(me, foe, i, m.axis ? 600 : undefined) : null;
    const dm = b.querySelector('.move-dmg');
    const dh = rng ? `<b>${esc(txt('pct', { n: dash(rng.pctLo, rng.pctHi) }))}</b>${rng.ko ? `<em>${esc(txt(rng.ko === 'sure' ? 'aim.ko' : 'aim.ko.maybe'))}</em>` : ''}` : '';
    if (dm.dataset.k !== dh) { dm.dataset.k = dh; dm.innerHTML = dh; }
    dm.dataset.ko = rng?.ko ?? '';
    // a range ("36-42%") takes the numbers' second row (hud.css, fix1 C4)
    b.dataset.range = String(Boolean(rng && (rng.pctLo !== rng.pctHi || rng.ko)));
    b.dataset.tip = `move:${i}`;
    const th = b.querySelector('.move-thumb');
    // (keyed on the card, its form and level and the move, so a build or an upgrade re-keys the thumbnail)
    const thk = `${me.uid}:${me.form ?? ''}:${me.level ?? ''}:${m.id}`;
    if (th && th.dataset.for !== thk) {
      th.dataset.for = thk;
      const fo = hasPreview(me.id, m.id) ? null : formOf(me);
      th.src = fo ? stillUrl(fo.key, { card: me.id }) : `${PREVIEWS}${me.id}.${m.id}.webp`;
    }
    return { nums, ring, rng };
  }
  /** A bench row for the Switch or Send In panel: name, disciplines, HP bar, condition and its best multiplier. */
  function benchInner(f, side) {
    const d = defOf(f), other = activeOf(side === 'player' ? 'rival' : 'player');
    const best = other ? Math.max(...d.moves.map((mv) => ringOf(f.id, other.id, mv))) : 1;
    const fo = formOf(f);
    // how hard the card across hits this one: its strongest ring into it (lower is better for you)
    const takes = other ? Math.max(1e-9, ...def(other.id).moves.filter((mv) => mv.power > 0).map((mv) => ringOf(other.id, f.id, mv))) : 1;
    const r = f.maxHp ? f.hp / f.maxHp : 0;
    const art = K.subjectOf?.(f.id)?.src || posterOf(f.id);
    return `<span class="bn-art" style="--c:${K.accent(f.id)}"><img alt="" loading="lazy" decoding="async" src="${art}"></span><span class="bn-head"><b>${esc(title(f.id))}</b>${d.disciplines.map((x) => `<span class="bn-d" style="--d:${K.DISCIPLINE_COLOR[x]}">${disc(x)}</span>`).join('')}${f.status ? `<span class="bn-st" style="--s:${STATUS_INFO[f.status].color}">${ico(f.status)}${esc(STATUS_INFO[f.status].short)}</span>` : ''}</span>${fo ? `<span class="bn-form">${formLine(fo, { h: 18, card: f.id })}<i>${esc(txt('form.aria', { name: fo.name, level: levelWord(fo.level) }))}</i></span>` : ''}
      <span class="bn-hp" data-band="${hpBand(f.hp, f.maxHp)}"><i style="transform:scaleX(${r})"></i></span>
      <span class="bn-foot"><span>${esc(txt('hp.short', { hp: f.hp, max: f.maxHp }))}</span>${other ? `<span class="bn-mx"><span class="hx" data-tone="${tone(best)}">${ico(tone(best) === 'up' ? 'strong' : tone(best) === 'down' ? 'weak' : 'even')}<b>${times(best)}</b><i>${esc(txt('bench.deals'))}</i></span><span class="hx" data-tone="${tone(1 / takes)}">${ico(tone(takes) === 'up' ? 'strong' : tone(takes) === 'down' ? 'weak' : 'even')}<b>${times(takes)}</b><i>${esc(txt('bench.takes'))}</i></span></span>` : ''}</span>`;
  }
  /** A Kit row: the item's icon, name, effect, and why it is unavailable. */
  function itemInner(it, ok, why) {
    return `<span class="it-ic" data-kind="${ITEM_KIND[it.id] ?? 'heal'}">${ico(it.id, 'it-i')}</span><span class="it-t"><b>${esc(it.name)}</b><span>${esc(engineWords(words(it.short)))}${BOOSTS.has(it.id) ? boostMult(it.id) : ''}</span>${!ok && why ? `<em>${esc(why)}</em>` : ''}</span>`;
  }
  /** What a boost would multiply the stat by from where the card in play stands (×2 from even, ×1.67 from +1). */
  const boostMult = (id) => { const me = activeOf('player'), k = { overclock: 'atk', firewall: 'def', 'turbo-mode': 'spd' }[id]; const n = me?.stages?.[k] ?? 0; const m = stageMult(Math.min(3, n + 2)) / stageMult(n); return m > 1.001 ? ` → ×${Math.round(m * 100) / 100}` : ''; };
  /** An item nothing needs now (or already used), folded into the Kit's last row: its icon, its tooltip. */
  function itemChip(it) {
    return `<span class="it-chip" data-kind="${ITEM_KIND[it.id] ?? 'heal'}" data-used="${it.left <= 0}" data-tip="item:${it.id}" tabindex="0" role="img" aria-label="${esc(txt(it.left <= 0 ? 'item.used' : 'item.notNeeded', { name: it.name }))}">${ico(it.id)}</span>`;
  }

  /** A card's poster, from the gallery folder the page names (meta gallery), so the site's own paths hold. */
  const GALLERY = new URL(document.querySelector('meta[name="gallery"]')?.content ?? '../../../r3/cards/', document.baseURI).href;
  const posterOf = (id) => new URL(`posters/${id}.webp`, GALLERY).href;

  // ======================================================== towers: the log line and the tooltips
  const towerGlyph = '<svg class="bi" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M6 21V9l-2-2V3h3v2h2.5V3h5v2H17V3h3v4l-2 2v12zM10 21v-4a2 2 0 0 1 4 0v4"/></svg>';
  /** "Your Princeton TD builds Palmer Mortar", "Rival's Princeton TD upgrades E-Quad Lab to Level 3", "... upgrades
   *  Palmer Mortar to Missile Battery, Level 4A". */
  function transformLine(e) {
    const who = esc(owned(e.fighter));
    const to = e.to ?? {}, name = esc(e.name ?? formInfo(e.card, to.form).name);
    if (e.change === 'build') return `${txt('log.build', { who: `<b>${who}</b>`, tower: `<b class="lg-mv" style="--d:${e.accent ?? 'currentColor'}">${name}</b>` }, undefined, true)}${to.level && levelParts(to.level).n > 1 ? ` <small>(${esc(levelWord(to.level))})</small>` : ''}`;
    const tower = esc(formInfo(e.card, to.form).name ?? e.name);
    if (levelParts(to.level).branch) {
      const mv = formMoveName(e.card, to.form, to.level);
      return txt('log.upgrade.branch', { who: `<b>${who}</b>`, tower, move: `<b class="lg-mv" style="--d:${e.accent ?? 'currentColor'}">${esc(mv)}</b>`, level: esc(levelWord(to.level)) }, undefined, true);
    }
    return txt('log.upgrade', { who: `<b>${who}</b>`, tower, level: `<b>${esc(levelWord(to.level))}</b>` }, undefined, true);
  }
  /** A form's key move at a level, from the registry. */
  const formMoveName = (card, form, level) => { const f = (hud.R ?? R)?.forms?.[card]?.forms?.[form] ?? formInfo(card, form); const m = f?.moves?.[String(level).toLowerCase()]?.[0]; return m?.name ?? f?.name ?? form; };
  /** `tower:<form>[:side]`: a tower's name, role, its moves at its stored level, and the rule; `upgrade:<branch>`: the
   *  upgrade's before and after. */
  /** A tower tip's headline (fix1 C6): its key-1 attack's own share of the foe's HP, the number its tile prints, then
   *  the best of its four moves on a second line. */
  function k1Row(pv, foe) {
    if (!pv || !foe) return '';
    const slot = (hud.R ?? R)?.forms?.[activeOf('player')?.id]?.slots?.[0] ?? 0;
    const n = pv.numbers?.find?.((x) => x.index === slot) ?? pv.numbers?.[slot];
    if (!n || !Number.isFinite(n.pct)) return '';
    const best = Math.round(pv.bestPct ?? n.pct);
    return `<p class="tp-row tw-tip-k1"><span>${txt('tower.k1Hit', { move: `<b>${esc(n.name)}</b>`, pct: `<b>${esc(txt('pct', { n: Math.round(n.pct) }))}</b>`, card: esc(title(foe.id)) }, undefined, true)}</span></p>${best !== Math.round(n.pct) ? `<p class="tp-row tw-tip-best">${esc(txt('tower.bestAll', { pct: txt('pct', { n: best }) }))}</p>` : ''}`;
  }
  function towerTip(kind, a, b) {
    const side = b === 'rival' ? 'rival' : 'player';
    const f = activeOf(side), fo = formOf(f);
    if (!f || !fo) return '';
    const rules = hud.R ?? R, st = hud.match?.state;
    const foe = activeOf(side === 'player' ? 'rival' : 'player');
    const line = (m) => (m ? `<p class="tp-row tw-tip-move">${disc(m.discipline)}<b>${esc(m.name)}</b>${m.power > 0 ? `<span>${esc(txt('tower.power', { n: `${m.power}${m.hits ? ` × ${m.hits.max}` : ''}` }))}</span>` : `<span>${esc(txt('tip.support'))}</span>`}${m.accuracy < 1 ? `<span>${Math.round(m.accuracy * 100)}%</span>` : ''}${foe && m.power > 0 ? multChip(ringOf(f.id, foe.id, m), '', side) : ''}</p>` : '');
    if (kind === 'tower') {
      const t = formInfo(f.id, a, rules?.forms);
      const standing = a === fo.form;
      let pv = null;
      try { pv = standing || side !== 'player' ? null : rules?.towerPreview?.(st, side, { form: a }); } catch { pv = null; }
      const moves = standing ? defOf(f).moves : pv?.moves ?? [];
      const lv = standing ? fo.level : f.levels?.[a];
      return `<div class="tp-small tw-tip" style="--ta:${t.accent}"><header>${stillHtml(formKey(a, lv ?? 1), { h: 28, card: f.id, accent: t.accent })}<b>${esc(t.name)}</b><span class="tp-cat">${esc(t.role ?? '')}</span></header><p class="tp-row">${disc(t.discipline ?? 'Infra')}${esc(standing ? txt('tower.standingAt', { level: levelWord(lv) }) : lv ? txt('tower.builtAt', { level: levelWord(lv) }) : txt('tower.newAt', { level: levelWord(1) }))} ${pipsHtml(lv ?? 1, { accent: t.accent })}</p>${k1Row(pv, foe)}${moves.map(line).join('')}<p class="tp-note">${ico('priority')}${esc(ruleOf(rules, f.id, pv ?? { moves: defOf(f).moves }, 'build'))}</p></div>`;
    }
    const br = a || null;
    let pv = null;
    try { pv = rules?.towerPreview?.(st, side, { branch: br }); } catch { pv = null; }
    const nowM = defOf(f).moves[0], next = pv?.moves?.[0];
    const nextLv = br ? `4${br}` : levelParts(fo.level).n + 1;
    return `<div class="tp-small tw-tip" style="--ta:${fo.accent}"><header>${stillHtml(formKey(fo.form, nextLv), { h: 28, card: f.id, accent: fo.accent })}<b>${esc(fo.name)}</b><span class="tp-cat">${esc(levelWord(nextLv))}</span></header>${k1Row(pv, foe)}${nowM ? `<p class="tp-row tw-tip-move"><span>${esc(txt('tower.now'))}</span><b>${esc(nowM.name)}</b><span>${nowM.power}${nowM.hits ? ` × ${nowM.hits.max}` : ''}</span></p>` : ''}${next ? `<p class="tp-row tw-tip-move"><span>${esc(txt('tower.next'))}</span><b>${esc(next.name)}</b><span>${next.power}${next.hits ? ` × ${next.hits.max}` : ''}</span></p>` : ''}<p class="tp-row">${ico('barrier')}${esc(txt('tower.barrierUp', { n: 15 }))}</p><p class="tp-note">${ico('priority')}${esc(ruleOf(rules, f.id, pv, 'upgrade'))} ${esc(txt('tower.upgradesLeft', { n: fo.upgradesLeft ?? 0 }, fo.upgradesLeft ?? 0))}</p></div>`;
  }

  // ======================================================== the page's calls
  hud.bind = (match) => {
    hud.match = match; hud.flushLog?.(); logQ = []; entries.length = 0; logList.textContent = ''; lastTurn = -1; seenMoves.clear(); traitsSaid.clear(); hud.aim?.(null); beatTurn = -1;
    for (const s of SIDES) { plates[s].uid = ''; plates[s].hpShown = -1; }
    // the log opens with both lineups: each card, its disciplines, its HP
    const line = (side) => match.state.sides[side].team.map((f) => `<span class="lg-card">${def(f.id).disciplines.map(disc).join('')}<b>${esc(title(f.id))}</b><small>${f.maxHp}</small></span>`).join('');
    const head = el('li', 'lg-lineup', logList, `<span class="lg-side" data-side="player">${esc(txt('side.you'))}</span>${line('player')}<span class="lg-side" data-side="rival">${esc(txt('side.rival'))}</span>${line('rival')}`);
    head.setAttribute('aria-label', txt('log.lineups'));
  };
  hud.setLayout = (l) => { hud.layout = l; root.dataset.mode = l?.mode ?? ''; place(); };
  hud.place = place;
  hud.draw = (v, drain = true) => { if (!v) return; hud.view = v; for (const s of SIDES) drawPlate(s, v, drain); };
  // a plate anchored by its foot (the Arena's yours, a phone's) re-places only when its height changes
  if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(() => place()); for (const s of SIDES) ro.observe(plates[s].el); }
  hud.isStrip = () => plates.player.el.dataset.strip === 'true';
  // the log's place in each move's timeline (shared/pace.js TIMELINE): a hit's line follows its number by `log`, and two
  // lines never land closer than `logGap`, in battle time (the speed setting shortens both); reduced motion writes at once
  const T = window.battlePace?.TIMELINE ?? { log: 120, logGap: 140 };
  let logQ = [], logAt = 0, logTimer = 0;
  const pump = () => {
    logTimer = 0;
    const now = performance.now();
    while (logQ.length && logQ[0].due <= now + 1) { addEntry(logQ.shift().x); logAt = performance.now(); }
    if (logQ.length) logTimer = setTimeout(pump, Math.max(0, logQ[0].due - now));
  };
  hud.event = (e, v) => {
    if (e.kind === 'move' && e.side === 'rival') seenMoves.add(`${e.actor}:${e.move.id}`);
    if (e.kind === 'item') beat(e);
    const x = entryOf(e, v ?? hud.view);
    if (!x) return;
    if (reduced()) { addEntry(x); return; }
    const now = performance.now(), last = logQ.length ? logQ.at(-1).due : logAt;
    const due = Math.max(now + (e.kind === 'hit' || e.kind === 'miss' ? T.log : 0), last + T.logGap);
    logQ.push({ x, due });
    if (!logTimer) logTimer = setTimeout(pump, Math.max(0, due - now));
  };
  hud.flushLog = () => { clearTimeout(logTimer); logTimer = 0; for (const q of logQ) addEntry(q.x); logQ = []; };
  hud.history = (events) => { for (const e of events) { if (e.kind === 'move' && e.side === 'rival') seenMoves.add(`${e.actor}:${e.move.id}`); const x = entryOf(e, e.state); if (x) addEntry(x); } };
  hud.writeLog = writeLog;
  hud.receiptWords = receiptWords;
  hud.turn = (st, busy) => { if (beatTurn === -1 && st && !busy) beatTurn = st.turn; hud.tipBusy(busy && st?.phase !== 'over'); drawTurn(st, busy); };
  hud.callMultiplier = callMultiplier;
  hud.moveInner = moveInner;
  hud.moveFill = moveFill;
  hud.benchInner = benchInner;
  hud.itemInner = itemInner;
  hud.itemChip = itemChip;
  hud.hideTip = hideTip;
  hud.ringOf = ringOf;
  hud.ico = ico;
  hud.formOf = formOf;
  hud.setRules = (r) => { hud.R = r; };
  hud.root = root;
  return hud;
}

/** The traits whose log line says what they did (the engine knows each by its English name). */
const TRAIT_SAYS = { 'Per-Rule Cap': 'log.trait.perRuleCap', Deterministic: 'log.trait.deterministic', Seeded: 'log.trait.seeded', Preloaded: 'log.trait.preloaded', Cached: 'log.trait.cached', Relaunch: 'log.trait.relaunch', 'Hidden Grader': 'log.trait.hiddenGrader', Upset: 'log.trait.upset', Variable: 'log.trait.variable' };
/** Each item's kind, for its icon's colour: restores, a cure, the three boosts, a revive. */
const BOOSTS = new Set(['overclock', 'firewall', 'turbo-mode']);
const ITEM_KIND = { 'code-snippet': 'heal', 'api-key': 'heal', 'server-patch': 'heal', 'system-restore': 'heal', debugger: 'cure', overclock: 'boost', firewall: 'boost', 'turbo-mode': 'boost', rollback: 'revive' };
