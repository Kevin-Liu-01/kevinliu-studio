// The battle's information layer, one for both modes (round 5). It reads only the engine's snapshots and events and
// draws over the board: a plate for each card in play (HP with its drain ghost, condition, stat stages, barrier, crit
// boost, trait, team and Kit), the live battle log, the multiplier call-out at each contact, tooltips on every move,
// discipline, condition, item, trait and stage, and the rows the console's moves, bench and Kit panels print.
// The page (battle.js) calls it; a stage layout may say where the plates and the log stand (plateBox, logBox).
// Every colour that means "better for this card" is green and "worse" is red, with the number beside it.
import { ico, ensureIcons, STATUS_INFO } from './icons.js';
import { words } from './plan.js';

const SIDES = ['player', 'rival'];
const STAT = { atk: 'Reach', def: 'Proof', spd: 'Pace' };
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

export function createHud({ app, engine, K, title, reduced, narrow, realTimeout = setTimeout }) {
  ensureIcons();
  const RING = engine.RING ?? ['Infra', 'Agent', 'Data', 'Game', 'Shader', 'Type', 'Interface'];
  const disc = (d) => K.icon(String(d).toLowerCase());
  const def = (id) => engine.fighterDef(id);
  const hud = { match: null, view: null, layout: null };
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
      const move = def(att.id).moves[i];
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
  const ringWord = (m) => ({ up: 'Strong', down: 'Resisted', even: 'Even' })[tone(m)];

  // ======================================================== the plates: one per card in play
  const plates = {};
  /** The rival's moves that have played on screen (`uid:index`), never the engine's resolved turn. */
  const seenMoves = new Set();
  /** Trait lines already written (a repeating trait is written once). */
  const traitsSaid = new Set();
  for (const side of SIDES) {
    const p = el('section', 'plate', root);
    p.dataset.side = side;
    p.setAttribute('aria-label', side === 'player' ? 'Your card in play' : 'Rival card in play');
    p.innerHTML = `
      <header class="pl-head"><span class="pl-side">${side === 'player' ? 'You' : 'Rival'}</span><b class="pl-name"></b><span class="pl-disc"></span></header>
      <div class="pl-hp" data-band="ok"><i class="pl-ghost"></i><i class="pl-fill"></i><span class="pl-hpnum"><b></b><small></small></span></div>
      <div class="pl-chips"></div>
      <footer class="pl-foot"><span class="pl-trait"></span><span class="pl-kit"></span></footer>
      <div class="pl-seen" hidden></div>`;
    plates[side] = { el: p, name: p.querySelector('.pl-name'), disc: p.querySelector('.pl-disc'), hp: p.querySelector('.pl-hp'), ghost: p.querySelector('.pl-ghost'), fill: p.querySelector('.pl-fill'), hpb: p.querySelector('.pl-hpnum b'), hps: p.querySelector('.pl-hpnum small'), chips: p.querySelector('.pl-chips'), trait: p.querySelector('.pl-trait'), kit: p.querySelector('.pl-kit'), seen: p.querySelector('.pl-seen'), uid: '', hpShown: -1 };
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
      P.disc.innerHTML = d.disciplines.map((x) => `<span class="pd" style="--d:${K.DISCIPLINE_COLOR[x]}" data-tip="disc:${x}" tabindex="0" role="img" aria-label="${x}">${disc(x)}</span>`).join('');
      P.trait.innerHTML = `<span class="pt" data-tip="trait:${f.id}" tabindex="0">${ico('trait')}<i>Trait</i><b>${esc(d.trait.name)}</b></span>`;
      P.hpShown = -1;
    }
    // HP: the fill moves at once, the ghost drains after it (350 ms, the client convention), the number counts
    const r = f.maxHp ? f.hp / f.maxHp : 0;
    const was = P.hpShown < 0 ? r : P.hpShown;
    P.hp.dataset.band = hpBand(f.hp, f.maxHp);
    P.fill.style.transform = `scaleX(${r})`;
    P.ghost.style.transition = drain && !reduced() && r < was ? 'transform .45s cubic-bezier(.4,0,.2,1) .18s' : 'none';
    P.ghost.style.transform = `scaleX(${r})`;
    P.hpShown = r;
    P.hpb.textContent = String(f.hp);
    P.hps.textContent = ` / ${f.maxHp}`;
    P.hp.setAttribute('role', 'img');
    P.hp.setAttribute('aria-label', `${f.hp} of ${f.maxHp} HP`);
    // chips: condition, stat stages, barrier, crit boost
    const parts = [];
    if (f.status) { const s = STATUS_INFO[f.status]; parts.push(chip(ico(f.status), s.short, 'status', `status:${f.status}`).replace('class="pc"', `class="pc" style="--s:${s.color}"`)); }
    // a stat shows only once a stage has moved it, by name, with its multiplier (green up, red down)
    for (const k of ['atk', 'def', 'spd']) {
      const n = f.stages[k];
      if (n) parts.push(chip(K.icon(STAT_ICON[k]), `${STAT[k]} ${n > 0 ? '+' : '−'}${Math.abs(n)}`, povTone(stageMult(n), side), `stage:${k}:${n}`, `<i>${times(stageMult(n))}</i>`));
    }
    if (f.barrier > 0) parts.push(chip(ico('barrier'), `${Math.round(f.barrier * 100)}%`, povTone(2, side), `barrier:${f.barrier}`));
    if (f.critBoost > 0) parts.push(chip(ico('crit'), `+${Math.round(f.critBoost * 100)}%`, povTone(2, side), `crit:${f.critBoost}`));
    const html = parts.join('');
    P.chips.hidden = !parts.length;
    if (P.chips.dataset.k !== html) { P.chips.dataset.k = html; P.chips.innerHTML = html; }
    // the Kit: uses left this battle (the Kit panel and its tooltips list the items)
    const used = hud.match?.state.stats[side].items ?? 0, left = Math.max(0, 2 - used);
    const kit = side === 'player'
      ? `<button type="button" class="pk-left" data-tip="kit:${side}" aria-label="Kit: ${left} of 2 uses left" data-none="${left === 0}">${ico('bag')}<i>Kit</i><b>${left}/2</b></button>`
      : `<span class="pk-left" data-tip="kit:${side}" tabindex="0" role="img" aria-label="Rival's Kit: ${left} of 2 uses left" data-none="${left === 0}">${ico('bag')}<i>Kit</i><b>${left}/2</b></span>`;
    if (P.kit.dataset.k !== kit) { P.kit.dataset.k = kit; P.kit.innerHTML = kit; }
    P.el.dataset.quiet = parts.length ? 'false' : 'true';
    // the rival's moves you have seen, each with what it does to your card in play (red when it hits you hard)
    if (side === 'rival') {
      const mine = v.sides.player.team[v.sides.player.active];
      const seen = d.moves.map((mv, i) => ({ mv, i })).filter((x) => seenMoves.has(`${f.uid}:${x.i}`));
      const html2 = seen.length ? `<i class="ps-label">Seen</i>${seen.map(({ mv, i }) => { const rg = mine && mv.power > 0 ? ringOf(f.id, mine.id, mv) : 1; return `<span class="ps" data-tip="rmove:${i}" tabindex="0" data-tone="${mv.power > 0 ? povTone(rg, 'rival') : 'even'}">${disc(mv.discipline)}<b>${esc(mv.name)}</b>${mv.power > 0 ? `<em>${times(rg)}</em>` : ''}</span>`; }).join('')}` : '';
      P.seen.dataset.many = String(seen.length > 1);
      const row = html2 || '<i class="ps-label">Seen</i><span class="ps-none">no moves yet</span>';
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
  }

  // ======================================================== the turn tab: the turn, whose decision, who acts first
  const turnTab = el('div', 'ttab', root);
  /** The turn whose beat has played (the first turn's opens quietly). */
  let beatTurn = -1;
  turnTab.setAttribute('aria-live', 'polite');
  /** The tab on the console's top edge: Turn N, then Your move / Playing / Send in a card / the result, then who acts
   *  first on Pace (a move's priority can still jump the order; the tooltip says so). */
  function drawTurn(state, busy) {
    if (!state) return;
    const me = activeOf('player'), foe = activeOf('rival');
    const phase = state.phase === 'over' ? (state.winner === 'player' ? 'Victory' : state.winner === 'rival' ? 'Defeat' : 'Draw')
      : state.phase === 'replace' && state.pending?.includes('player') ? 'Send in a card' : busy ? 'Playing the turn' : 'Your move';
    let first = '';
    if (me && foe && state.phase === 'command') {
      const a = engine.effectiveSpeed(me), b = engine.effectiveSpeed(foe);
      const who = a > b ? 'You act first' : a < b ? 'Rival acts first' : 'Speed tie';
      const short = a > b ? 'You first' : a < b ? 'Rival first' : 'Tie';
      const pair = a >= b ? `you ${Math.round(a)}, rival ${Math.round(b)}` : `rival ${Math.round(b)}, you ${Math.round(a)}`;
      first = `<span class="tt-first" data-tone="${a > b ? 'up' : a < b ? 'down' : 'even'}" data-tip="order" tabindex="0">${ico('priority')}<b class="tt-long">${who}</b><b class="tt-short">${short}</b><i>Pace: ${pair}</i></span>`;
    }
    const shown = busy && state.phase !== 'over' ? Math.max(1, state.turn - 1) : state.turn;
    const html = `${ico('turn')}<b class="tt-turn"><span class="tt-word">Turn </span><span class="tt-t">T</span>${shown}</b><span class="tt-phase" data-busy="${busy}">${phase}</span>${first}`;
    if (turnTab.dataset.k !== html) { turnTab.dataset.k = html; turnTab.innerHTML = html; }
    const ph = state.phase === 'over' ? 'over' : busy ? 'busy' : 'you';
    if (ph === 'you' && beatTurn !== state.turn && !reduced() && beatTurn !== -1) turnTab.animate([{ transform: 'scale(1.12)', boxShadow: '0 0 0 6px oklch(55% 0.15 255 / .35)' }, { transform: 'none', boxShadow: '0 0 0 0 oklch(55% 0.15 255 / 0)' }], { duration: 320, delay: 360, fill: 'backwards', easing: 'cubic-bezier(.2,.9,.1,1)' });
    if (ph === 'you') beatTurn = state.turn;
    turnTab.dataset.phase = ph;
  }

  // ======================================================== the battle log: turn headers, icons, multipliers, receipts
  const logEl = el('aside', 'blog', root);
  logEl.setAttribute('aria-label', 'Battle log');
  logEl.innerHTML = `<header class="blog-head">${ico('log')}<b>Battle log</b></header><ol class="blog-list" aria-live="off"></ol>`;
  const logList = logEl.querySelector('.blog-list');
  const entries = [];
  const who = (uid) => title(hud.match?.cardOf(uid) ?? uid);
  /** "Your Glyphfield", "Rival's Prototemplate": every log line says whose card it is. */
  const owned = (uid) => `${sideOfUid(uid) === 'player' ? 'Your' : 'Rival’s'} ${who(uid)}`;
  /** A trait's line in words a player reads at once. */
  const traitLine = (e) => {
    const d = words(e.detail ?? '');
    const said = { 'Per-Rule Cap': `takes at most ${d.replace(/[^\d]/g, '')} from one hit`, Deterministic: 'never misses', Seeded: 'has no damage spread', Preloaded: 'moves first (priority +1)', Cached: 'moves first (priority +1)', Relaunch: 'holds on at 1 HP', 'Hidden Grader': 'ignores barrier and raised Proof', Upset: `hits up a class (${d})`, Variable: `sets its weight (${d})` }[e.trait];
    // a trait with nothing to say is an immunity the engine announces (the condition did not land)
    return `<b class="lg-tr">${esc(e.trait)}</b> · ${esc(owned(e.fighter))} ${esc(said ?? (d || 'shrugs the condition off'))}`;
  };
  /** The receipt with its bare constant named. */
  const receiptWords = (line) => words(line).replace(/(\d+\/\d+) × ([\d.]+)(?= [×=])/, '$1 × $2 scale');
  const sideOfUid = (uid) => (String(uid).startsWith('rival') ? 'rival' : 'player');
  const tag = (side) => `<i class="lg-side" data-side="${side}">${side === 'player' ? 'You' : 'Rival'}</i>`;
  const pct = (n, max) => (max ? `${Math.round((100 * n) / max)}%` : '');
  /** One event as a log entry ({ turn, side, icon, html, receipt }), or null for an event the log leaves out. */
  function entryOf(e, v) {
    const maxOf = (uid) => { const s = v?.sides[sideOfUid(uid)]; return s?.team.find((t) => t.uid === uid)?.maxHp ?? 0; };
    switch (e.kind) {
      case 'move': return { turn: e.turn, side: e.side, icon: disc(e.move.discipline === 'Neutral' ? 'infra' : e.move.discipline), cls: 'lg-move', html: `${tag(e.side)}<b>${esc(title(e.card))}</b> uses <b class="lg-mv" style="--d:${K.DISCIPLINE_COLOR[e.move.discipline] ?? '#999'}">${esc(e.move.name)}</b>` };
      case 'hit': {
        const r = e.receipt, extra = [];
        // each chip coloured for you: the rival's bonuses red, what cut the rival's hit green
        if (tone(e.effectiveness) !== 'even') extra.push(multChip(e.effectiveness, ringWord(e.effectiveness), e.side));
        if (r?.finisher > 1) extra.push(multChip(r.finisher, 'Finisher', e.side));
        if (r?.home > 1) extra.push(multChip(r.home, 'Home', e.side, 'home'));
        if (e.crit) extra.push(`<span class="hx" data-tone="crit">${ico('crit')}<b>×1.5</b><i>Critical</i></span>`);
        if (e.hits > 1) extra.push(`<span class="hx" data-tone="even">${ico('hits')}<b>${e.hits}</b><i>hits</i></span>`);
        const cut = e.side === 'rival' ? 'up' : 'down';
        if (r?.barrier) extra.push(`<span class="hx" data-tone="${cut}">${ico('barrier')}<b>−${r.barrier}</b><i>Barrier</i></span>`);
        if (r?.guard) extra.push(`<span class="hx" data-tone="${cut}">${ico('guard')}<b>−${r.guard}</b><i>Guard</i></span>`);
        // the row is tinted by the card that was hit
        return { turn: e.turn, side: sideOfUid(e.target), icon: ico('power'), cls: 'lg-hit', html: `<b>${esc(owned(e.target))}</b> takes <b class="lg-dmg">${e.damage}</b> <small>(${pct(e.damage, maxOf(e.target))})</small>${e.ko ? ' and is out' : ''}${extra.length ? `<span class="lg-x">${extra.join('')}</span>` : ''}`, receipt: receiptWords(r?.line ?? '') };
      }
      case 'miss': return { turn: e.turn, side: e.side, icon: ico('accuracy'), cls: 'lg-miss', html: `${esc(e.move.name)} misses <b>${esc(owned(e.target))}</b> <small>(${Math.round(e.accuracy * 100)}% to hit)</small>` };
      case 'status': {
        if (e.change === 'continue') return null;
        const s = STATUS_INFO[e.status];
        const word = { applied: `is hit with <b style="color:${s.color}">${s.label}</b>`, tick: `loses <b class="lg-dmg">${e.damage}</b> to ${s.label.toLowerCase()}`, skip: e.status === 'sleep' ? 'is asleep and skips its move' : 'is stunned and loses its move', cleared: `is clear of ${s.label.toLowerCase()}` }[e.change] ?? e.change;
        return { turn: e.turn, side: e.side, icon: `<span class="lg-st" style="--s:${s.color}">${ico(e.status)}</span>`, cls: 'lg-status', html: `<b>${esc(owned(e.fighter))}</b> ${word}` };
      }
      case 'effect': {
        const t = e.effect;
        if (t === 'heal' || t === 'drain') return { turn: e.turn, side: e.side, icon: ico(t), cls: 'lg-heal', html: `<b>${esc(owned(e.fighter))}</b> ${t === 'drain' ? 'drains' : 'recovers'} <b class="lg-heal-n">+${e.amount}</b> HP` };
        if (t === 'recoil') return { turn: e.turn, side: e.side, icon: ico('recoil'), cls: 'lg-hit', html: `<b>${esc(owned(e.fighter))}</b> takes <b class="lg-dmg">${e.amount}</b> recoil` };
        if (t === 'barrier') return { turn: e.turn, side: e.side, icon: ico('barrier'), cls: 'lg-up', html: `<b>${esc(owned(e.fighter))}</b> raises a barrier <span class="hx" data-tone="${povTone(2, e.side)}"><b>${Math.round(e.amount * 100)}%</b><i>blocked</i></span>` };
        if (t === 'critUp') return { turn: e.turn, side: e.side, icon: ico('crit'), cls: 'lg-up', html: `<b>${esc(owned(e.fighter))}</b> lines up a critical <span class="hx" data-tone="${povTone(2, e.side)}"><b>+${Math.round(e.amount * 100)}%</b><i>crit</i></span>` };
        const k = t.slice(0, 3), n = e.stage ?? e.amount;
        // the stage it reached, so a capped raise never claims more than it did
        return { turn: e.turn, side: e.side, icon: K.icon(k), cls: 'lg-up', html: `<b>${esc(owned(e.fighter))}</b>: ${STAT[k]} rises to <span class="hx" data-tone="${povTone(2, e.side)}">${ico('up')}<b>${n > 0 ? '+' : ''}${n}</b><i>${times(stageMult(n))}</i></span>` };
      }
      case 'switch': return { turn: e.turn, side: e.side, icon: ico('switch'), cls: 'lg-switch', html: `${tag(e.side)}<b>${esc(title(e.card))}</b> ${e.reason === 'lead' ? 'leads' : e.reason === 'replace' ? 'is sent in' : 'switches in'}` };
      case 'trait': {
        // a trait that says the same thing again (Seeded on every hit) is written once
        const k = `${e.fighter}|${e.trait}|${e.detail ?? ''}`;
        if (traitsSaid.has(k)) return null;
        traitsSaid.add(k);
        return { turn: e.turn, side: e.side, icon: ico('trait'), cls: 'lg-trait', html: traitLine(e) };
      }
      case 'guard': return { turn: e.turn, side: e.side, icon: ico('guard'), cls: 'lg-up', html: `<b>${esc(owned(e.fighter))}</b> guards <span class="hx" data-tone="${povTone(2, e.side)}"><b>×0.5</b><i>damage this turn</i></span>` };
      case 'item': return { turn: e.turn, side: e.side, icon: ico(e.item), cls: 'lg-item', html: `${tag(e.side)}<b>${esc(e.name)}</b> on <b>${esc(owned(e.target))}</b> <small>${esc(words(e.detail))}</small>` };
      case 'ko': return { turn: e.turn, side: e.side, icon: ico('ko'), cls: 'lg-ko', html: `<b>${esc(e.side === 'player' ? 'Your' : 'Rival’s')} ${esc(title(e.card))}</b> is out` };
      case 'result': return { turn: e.turn, side: 'none', icon: ico('turn'), cls: 'lg-result', html: `<b>${e.winner === 'draw' ? 'Draw' : e.winner === 'player' ? 'Victory' : 'Defeat'}</b> in ${e.turns} turns` };
      default: return null;
    }
  }
  let lastTurn = -1, scrollQ = false;
  function addEntry(x) {
    entries.push(x);
    if (x.turn !== lastTurn) {
      lastTurn = x.turn;
      const h = el('li', 'lg-turn', logList, `${ico('turn')}<b>Turn ${x.turn}</b>`);
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
      if (x.turn !== t) { t = x.turn; el('li', 'lg-turn', list, `${ico('turn')}<b>Turn ${t}</b>`); }
      const li = el('li', `lg ${x.cls ?? ''}`, list, `<span class="lg-i">${x.icon}</span><span class="lg-t">${x.html}</span>`);
      li.dataset.side = x.side;
      if (x.receipt) { const r = el('code', 'lg-r', li); r.textContent = x.receipt; }
    }
  }

  // ======================================================== the multiplier call-out at the contact
  // over the scene's stage (z 25), so it reads at the contact of a full scene too; the HUD layer itself sits under it
  const callout = el('div', 'mcall', app);
  callout.setAttribute('aria-hidden', 'true');
  let callT = 0;
  /** At a hit's contact: the ring multiplier large (green Strong, red Resisted), the critical under it, near the struck
   *  card (rect, viewport px) or the frame's centre. Holds 900 ms, then fades. */
  function callMultiplier(hit, rect) {
    if (!hit) return;
    const rows = [];
    if (tone(hit.effectiveness) !== 'even') rows.push(`<span class="mcx" data-tone="${povTone(hit.effectiveness, hit.side)}">${ico(tone(hit.effectiveness) === 'up' ? 'strong' : 'weak')}<b>${times(hit.effectiveness)}</b><i>${hit.effectiveness > 1 ? 'Strong' : 'Resisted'}</i></span>`);
    if (hit.crit) rows.push(`<span class="mcx" data-tone="crit">${ico('crit')}<b>×1.5</b><i>Critical</i></span>`);
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
      if (num && num.right + 20 + cw <= W - 12) { x = num.right + 20 + cw / 2; y = num.top + num.height / 2; } // beside the scene's number
      else if (num) { const b = Math.max(num.bottom, rec?.bottom ?? 0); x = num.left + cw / 2; y = b + 10 + ch / 2; } // under it and its receipt
      else { x = rect ? rect.left + rect.width / 2 : W / 2; y = rect ? rect.top + rect.height * 0.18 : H * 0.3; } // beside the struck card
      x = Math.min(W - cw / 2 - 12, Math.max(cw / 2 + 12, x)); y = Math.min(H - ch / 2 - 12, Math.max(ch / 2 + 60, y));
      callout.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
    };
    requestAnimationFrame(at);
    setTimeout(at, 140); // the receipt writes its total once the count lands
    callout.dataset.on = 'true';
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
  /** The tooltip's content for a key ("move:2", "disc:Infra", "status:burn", "item:api-key", "trait:<id>", ...). */
  function tipHtml(key) {
    const [kind, a, b] = key.split(':');
    const me = activeOf('player'), foe = activeOf('rival');
    if (kind === 'move' || kind === 'rmove') {
      const side = kind === 'move' ? 'player' : 'rival';
      const att = activeOf(side), tgt = activeOf(side === 'player' ? 'rival' : 'player');
      if (!att) return '';
      const d = def(att.id), i = Number(a), m = d.moves[i];
      if (!m) return '';
      const nums = engine.moveNumbers(att, m, m.axis ? 600 : undefined);
      const ring = tgt ? ringOf(att.id, tgt.id, m) : 1, home = homeOf(att.id, m);
      const rng = tgt && nums.power > 0 ? rangeOf(att, tgt, i, m.axis ? 600 : undefined) : null;
      const fx = [];
      if (m.priority) fx.push(`<span class="tc">${ico('priority')}Priority ${m.priority > 0 ? '+' : ''}${m.priority}</span>`);
      if (m.hits) fx.push(`<span class="tc">${ico('hits')}${m.hits.min === m.hits.max ? m.hits.min : `${m.hits.min} to ${m.hits.max}`} hits</span>`);
      if (m.effect) { const s = STATUS_INFO[m.effect.type]; fx.push(`<span class="tc" style="--s:${s.color}">${ico(m.effect.type)}${s.label} ${Math.round(m.effect.chance * 100)}%</span>`); }
      if (m.selfEffect) fx.push(`<span class="tc" data-tone="${m.selfEffect.type === 'recoil' ? 'down' : 'up'}">${ico(selfIcon(m.selfEffect.type))}${selfWord(m.selfEffect)}</span>`);
      if (m.critChance) fx.push(`<span class="tc">${ico('crit')}Critical ${Math.round(m.critChance * 100)}%</span>`);
      if (m.piercing) fx.push(`<span class="tc">${ico('pierce')}Pierces ${Math.round(m.piercing * 100)}% of barrier</span>`);
      if (m.executeThreshold) fx.push(`<span class="tc">${ico('execute')}×1.3 under ${Math.round(m.executeThreshold * 100)}% HP</span>`);
      if (m.adapts) fx.push(`<span class="tc">${ico('adapts')}Takes its card's better discipline</span>`);
      if (m.axis) fx.push(`<span class="tc">${ico('axis')}Weight axis ${m.axis.min} to ${m.axis.max}</span>`);
      const desc = moveDesc(m, nums.accuracy), about = cardMoveText(att.id, m);
      const pp = att.pp[i];
      return `<div class="tp-move">
        <video class="tp-vid" muted loop playsinline preload="none" data-src="${PREVIEWS}${att.id}.${m.id}.webm" poster="${PREVIEWS}${att.id}.${m.id}.webp"></video>
        <div class="tp-body">
          <header><span class="tp-d" style="--d:${K.DISCIPLINE_COLOR[m.discipline]}">${disc(m.discipline)}<i>${m.discipline}</i></span><b>${esc(m.name)}</b><span class="tp-cat">${nums.power > 0 ? `${ico('power')}Attack` : `${ico('support')}Support`}</span></header>
          <div class="tp-nums">${nums.power > 0 ? `<span>${ico('power')}<b>${nums.power}</b><i>power</i></span>` : ''}<span>${ico('accuracy')}${nums.accuracy > m.accuracy + 1e-9 ? `<s>${Math.round(m.accuracy * 100)}%</s>` : ''}<b>${Math.round(nums.accuracy * 100)}%</b><i>to hit${nums.accuracy > m.accuracy + 1e-9 ? `, ${esc(d.trait.name)}` : ''}</i></span><span data-low="${pp <= Math.ceil(m.pp / 4)}">${ico('pp')}<b>${pp}/${m.pp}</b><i>PP</i></span></div>
          ${nums.power > 0 && tgt ? `<div class="tp-vs">${multChip(ring, `${ringWord(ring)} vs ${title(tgt.id)}`, side)}${home > 1 ? multChip(home, 'Home discipline', side, 'home') : ''}</div>` : ''}
          ${rng ? `<p class="tp-dmg">${ico('power')}<b>${rng.lo === rng.hi ? rng.lo : `${rng.lo}–${rng.hi}`}</b> damage, <b>${rng.pctLo === rng.pctHi ? rng.pctLo : `${rng.pctLo}–${rng.pctHi}`}%</b> of ${esc(title(tgt.id))}'s HP${rng.ko ? ` <em data-ko="${rng.ko}">${ico('ko')}${rng.ko === 'sure' ? 'Knocks out' : rng.accuracy < 1 && rng.lo >= tgt.hp ? 'Knocks out if it hits' : 'May knock out'}</em>` : rng.relaunch && rng.hi >= tgt.hp ? ` <em data-ko="maybe">${ico('trait')}Relaunch leaves it at 1 HP</em>` : ''}</p>` : ''}
          ${fx.length ? `<div class="tp-fx">${fx.join('')}</div>` : ''}
          ${about ? `<p class="tp-about">${esc(about)}</p>` : ''}
          ${desc ? `<p class="tp-desc">${esc(desc)}</p>` : ''}
        </div></div>`;
    }
    if (kind === 'disc') {
      const i = RING.indexOf(a);
      const strong = RING[(i + 1) % RING.length], weak = RING[(i - 1 + RING.length) % RING.length];
      return `<div class="tp-small"><header><span class="tp-d" style="--d:${K.DISCIPLINE_COLOR[a]}">${disc(a)}</span><b>${a}</b></header>
        <p class="tp-row">Its attacks: ${multChip(1.5, `on ${strong}`)} ${multChip(0.67, `on ${weak}`)}</p>
        <p class="tp-row">Hits on it: ${multChip(1.5, `from ${weak}`)} ${multChip(0.67, `from ${strong}`)}</p>
        <p class="tp-note">A card's own discipline adds ×1.2 to its moves of that discipline.</p></div>`;
    }
    if (kind === 'status') { const s = STATUS_INFO[a]; return `<div class="tp-small"><header><span class="tp-st" style="--s:${s.color}">${ico(a)}</span><b>${s.label}</b></header><p class="tp-desc">${s.text}</p></div>`; }
    if (kind === 'stage') { const n = Number(b); return `<div class="tp-small"><header>${K.icon(a)}<b>${STAT[a]} ${n > 0 ? '+' : '−'}${Math.abs(n)}</b>${multChip(stageMult(n))}</header><p class="tp-desc">${{ atk: 'Its damage', def: 'Damage it takes is divided by this', spd: 'Its turn order' }[a]}: ${times(stageMult(n))}. Stages run from −3 (×0.4) to +3 (×2.5).</p></div>`; }
    if (kind === 'stat') return `<div class="tp-small"><header>${K.icon(a)}<b>${STAT[a]} ${b}</b></header><p class="tp-desc">${{ atk: 'Reach: how hard its moves hit.', def: 'Proof: how much damage it shrugs off.', spd: 'Pace: who moves first.' }[a]} No stage change; stages run from −3 (×0.4) to +3 (×2.5).</p></div>`;
    if (kind === 'barrier') return `<div class="tp-small"><header>${ico('barrier')}<b>Barrier ${Math.round(Number(a) * 100)}%</b></header><p class="tp-desc">The next hit on this card loses ${Math.round(Number(a) * 100)}% of its damage, then the barrier is gone.</p></div>`;
    if (kind === 'crit') return `<div class="tp-small"><header>${ico('crit')}<b>Critical +${Math.round(Number(a) * 100)}%</b></header><p class="tp-desc">Its next move is ${Math.round(Number(a) * 100)} points likelier to be critical (×1.5), up to 80%. Most moves start at 8%.</p></div>`;
    if (kind === 'trait') { const d = def(a); return `<div class="tp-small"><header>${ico('trait')}<b>${esc(d.trait.name)}</b><span class="tp-cat">Trait</span></header><p class="tp-desc">${esc(words(d.trait.rule))}</p></div>`; }
    if (kind === 'item') {
      const it = engine.itemById(a);
      return `<div class="tp-small"><header>${ico(a)}<b>${esc(it.name)}</b><span class="tp-cat">${esc(words(it.short))}</span></header><p class="tp-desc">${esc(ITEM_TEXT[a] ?? '')}</p><p class="tp-note">${ico('priority')}Acts before any move, and uses the turn. Two items a battle.</p></div>`;
    }
    if (kind === 'kit') { const used = hud.match?.state.stats[a].items ?? 0; return `<div class="tp-small"><header>${ico('bag')}<b>Kit</b></header><p class="tp-desc">${Math.max(0, 2 - used)} of 2 item uses left this battle. Each of the nine items can be used once.</p></div>`; }
    if (kind === 'bench') {
      const s = hud.match?.state.sides[a], t = s?.team[Number(b)];
      if (!t) return '';
      const d = def(t.id), other = activeOf(a === 'player' ? 'rival' : 'player');
      const best = other ? Math.max(...d.moves.map((mv) => ringOf(t.id, other.id, mv))) : 1;
      return `<div class="tp-small"><header><b>${esc(title(t.id))}</b><span class="tp-cat">${t.hp <= 0 ? 'Out' : `${t.hp}/${t.maxHp} HP`}</span></header><p class="tp-row">${d.disciplines.map((x) => `<span class="tp-d" style="--d:${K.DISCIPLINE_COLOR[x]}">${disc(x)}<i>${x}</i></span>`).join('')}${t.status ? `<span class="tc" style="--s:${STATUS_INFO[t.status].color}">${ico(t.status)}${STATUS_INFO[t.status].label}</span>` : ''}</p>${other && t.hp > 0 ? `<p class="tp-row">Best move into ${esc(title(other.id))}: ${multChip(best)}</p>` : ''}</div>`;
    }
    if (kind === 'order') { const me = activeOf('player'), foe = activeOf('rival'); if (!me || !foe) return ''; return `<div class="tp-small"><header>${ico('priority')}<b>Turn order</b></header><p class="tp-row">${K.icon('spd')}Pace now: ${esc(title(me.id))} <b>${Math.round(engine.effectiveSpeed(me))}</b>, ${esc(title(foe.id))} <b>${Math.round(engine.effectiveSpeed(foe))}</b></p><p class="tp-desc">The faster card's move goes first. Switching and items go before any move, Guard next, then a move with priority.</p></div>`; }
    if (kind === 'speed') return `<div class="tp-small"><header>${ico('speed')}<b>Battle speed</b></header><p class="tp-desc">How fast scenes play. Space, Enter or a tap skips to the hit, a second press to the end.</p></div>`;
    return '';
  }
  const shortSelf = (fx) => ({ atkUp: `Reach +${fx.amount}`, defUp: `Proof +${fx.amount}`, spdUp: `Pace +${fx.amount}`, critUp: 'Crit up', barrier: `Barrier ${Math.round(fx.amount * 100)}%`, heal: `Heal ${fx.amount}`, drain: 'Drain', recoil: 'Recoil' })[fx.type] ?? fx.type;
  const selfIcon = (t) => ({ atkUp: 'up', defUp: 'up', spdUp: 'up', critUp: 'crit', barrier: 'barrier', heal: 'heal', drain: 'drain', recoil: 'recoil' })[t] ?? 'support';
  const selfWord = (fx) => {
    const c = fx.chance < 1 ? ` ${Math.round(fx.chance * 100)}%` : '';
    if (fx.type === 'atkUp' || fx.type === 'defUp' || fx.type === 'spdUp') return `${STAT[fx.type.slice(0, 3)]} +${fx.amount}${c}`;
    if (fx.type === 'critUp') return `Critical +${Math.round(fx.amount * 100)}%${c}`;
    if (fx.type === 'barrier') return `Barrier ${Math.round(fx.amount * 100)}%${c}`;
    if (fx.type === 'heal') return `Heals ${fx.amount} HP${c}`;
    if (fx.type === 'drain') return `Drains ${Math.round(fx.amount * 100)}% of damage${c}`;
    if (fx.type === 'recoil') return `Recoil ${Math.round(fx.amount * 100)}% of damage`;
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
    if (target.closest('#moves') && lb && !narrow() && hud.layout?.mode === 'mat') { tip.dataset.compact = 'false'; const t2 = tip.getBoundingClientRect(); x = Math.max(8, lb.x + lb.w - t2.width); y = Math.max(8, r.top - t2.height - 10); }
    // without the log rail (the Mat under 1280, the Arena), the first of a few spots that covers nothing the choice needs
    else if (target.closest('#moves') && !narrow()) ({ x, y } = moveSpot(target, r));
    // a plate's own parts: beside the plate (its HP and chips stay readable), else as above
    const pl = target.closest('.plate:not([data-strip="true"])');
    if (pl) {
      const pr = pl.getBoundingClientRect();
      const left = pr.left - t.width - 12, right = pr.right + 12;
      if (left >= 8 || right + t.width <= W - 8) { x = left >= 8 ? left : right; y = Math.max(8, Math.min(H - t.height - 8, pr.top)); }
    }
    // whatever spot won, the whole tooltip stays inside the window
    x = Math.max(8, Math.min(W - t.width - 8, x)); y = Math.max(8, Math.min(H - t.height - 8, y));
    tip.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
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
    for (const e of document.querySelectorAll(mode === 'mat' ? '#board .slot[data-zone="active"]' : '#board .fig')) { const q = box(e); if (q.width && !e.hidden) avoid.push([q, 3]); }
    for (const [e, k] of [[plates.player.el, 2], [plates.rival.el, 2], [aimEl.dataset.on === 'true' ? aimEl : null, 3]]) { const q = box(e); if (q?.width) avoid.push([q, k]); }
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
        : [...(lb ? [{ x: lb.x + lb.w - w, y: lb.y + lb.h - h, floor: lb.y + lb.h }] : []), { x: pr.right + 12, y: Math.min(r.top - h - 10, pr.bottom - h) }, { x: pr.left, y: pr.top - h - 8 }, { x: con.right - w, y: over }];
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
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const t = tipTarget(e);
    if (t === tipFor) return;
    clearTimeout(tipT);
    if (!t) { tipT = realTimeout(hideTip, 80); return; }
    tipT = realTimeout(() => showTip(t), tipFor ? 0 : 260);
  });
  // a focus opens a tooltip only after the keyboard was used (the page focuses the first move after each turn)
  let keyedAt = -1e9;
  hud.keyedRecently = () => rnow() - keyedAt < 150;
  document.addEventListener('keydown', (e) => { if (e.key === 'Tab' || e.key.startsWith('Arrow')) keyedAt = rnow(); }, true);
  document.addEventListener('focusin', (e) => { const t = tipTarget(e); if (t && rnow() - keyedAt < 150) showTip(t); else if (tipFor && !t) hideTip(); });
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
    const m = me && def(me.id).moves[i];
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
      aimEl.innerHTML = `<i></i><i></i><i></i><i></i>${nums.power > 0 ? `<span class="aim-chip" data-tone="${tone(ring)}">${tone(ring) !== 'even' ? ico(ring > 1 ? 'strong' : 'weak') : ''}<b>${times(ring)}</b>${rng ? `<em>${rng.pctLo === rng.pctHi ? rng.pctLo : `${rng.pctLo}–${rng.pctHi}`}%${rng.ko ? ` · ${rng.ko === 'sure' ? 'KO' : 'KO?'}` : ''}</em>` : ''}</span>` : `<span class="aim-chip" data-tone="even"><b>Support</b></span>`}`;
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
    if (m.priority) flags.push(`${ico('priority')}Prio ${m.priority > 0 ? '+' : ''}${m.priority}`);
    if (m.effect) flags.push(`<span style="color:${STATUS_INFO[m.effect.type].color}">${ico(m.effect.type)}</span>${STATUS_INFO[m.effect.type].label} ${Math.round(m.effect.chance * 100)}%`);
    if (m.selfEffect) flags.push(`${ico(selfIcon(m.selfEffect.type))}${shortSelf(m.selfEffect)}`);
    if (m.hits) flags.push(`${ico('hits')}${m.hits.min === m.hits.max ? m.hits.min : `${m.hits.min}–${m.hits.max}`} hits`);
    if (m.executeThreshold) flags.push(`${ico('execute')}Finisher`);
    if (m.critChance) flags.push(`${ico('crit')}Crit ${Math.round(m.critChance * 100)}%`);
    if (m.piercing) flags.push(`${ico('pierce')}Pierce`);
    return `<span class="move-head">${disc(m.discipline)}<span class="move-name">${esc(m.name)}</span><span class="move-ring"></span></span>
      <span class="move-stats"><span class="ms-pow">${ico('power')}<b></b></span><span class="ms-acc">${ico('accuracy')}<b></b></span><span class="ms-flags">${flags.slice(0, 2).map((f) => `<span class="mf">${f}</span>`).join('')}</span></span>
      <span class="move-pp"><span class="pp-bar"><i></i></span><b></b></span>
      <span class="move-dmg"></span>
      <span class="move-about">${esc(cardMoveText(id, m))}</span>
      <img class="move-thumb" alt="" loading="lazy" decoding="async" data-poster="${m.id}">
      <kbd class="move-key">${i + 1}</kbd>`;
  }
  /** Fill a move button with the numbers of this moment: the card in play, the card across. */
  function moveFill(b, me, foe, m, i) {
    const nums = engine.moveNumbers(me, m, m.axis ? 600 : undefined);
    const ring = foe ? ringOf(me.id, foe.id, m) : 1;
    const set = (sel, text) => { const n = b.querySelector(sel); if (n && n.textContent !== text) n.textContent = text; };
    set('.ms-pow b', nums.power > 0 ? String(nums.power) : '—');
    b.querySelector('.ms-pow').dataset.none = String(nums.power <= 0);
    set('.ms-acc b', `${Math.round(nums.accuracy * 100)}%`);
    const pp = me.pp[i];
    set('.move-pp b', `${pp}/${m.pp}`);
    b.querySelector('.pp-bar i').style.transform = `scaleX(${m.pp ? pp / m.pp : 0})`;
    b.querySelector('.move-pp').dataset.low = String(pp <= Math.ceil(m.pp / 4));
    b.querySelector('.move-pp').dataset.mid = String(pp > Math.ceil(m.pp / 4) && pp <= Math.ceil(m.pp / 2));
    const re = b.querySelector('.move-ring');
    const rt = nums.power > 0 && tone(ring) !== 'even' ? `${ico(ring > 1 ? 'strong' : 'weak')}<b>${times(ring)}</b>` : nums.power > 0 ? `<b>×1</b>` : `${ico('support')}<b>Support</b>`;
    if (re.dataset.k !== rt) { re.dataset.k = rt; re.innerHTML = rt; }
    b.dataset.ring = nums.power > 0 ? tone(ring) : 'support';
    const rng = foe && nums.power > 0 ? rangeOf(me, foe, i, m.axis ? 600 : undefined) : null;
    const dm = b.querySelector('.move-dmg');
    const dh = rng ? `<b>${rng.pctLo === rng.pctHi ? rng.pctLo : `${rng.pctLo}–${rng.pctHi}`}%</b>${rng.ko ? `<em>${rng.ko === 'sure' ? 'KO' : 'KO?'}</em>` : ''}` : '';
    if (dm.dataset.k !== dh) { dm.dataset.k = dh; dm.innerHTML = dh; }
    dm.dataset.ko = rng?.ko ?? '';
    b.dataset.tip = `move:${i}`;
    const th = b.querySelector('.move-thumb');
    if (th && th.dataset.for !== me.id) { th.dataset.for = me.id; th.src = `${PREVIEWS}${me.id}.${m.id}.webp`; }
    return { nums, ring, rng };
  }
  /** A bench row for the Switch or Send In panel: name, disciplines, HP bar, condition and its best multiplier. */
  function benchInner(f, side) {
    const d = def(f.id), other = activeOf(side === 'player' ? 'rival' : 'player');
    const best = other ? Math.max(...d.moves.map((mv) => ringOf(f.id, other.id, mv))) : 1;
    // how hard the card across hits this one: its strongest ring into it (lower is better for you)
    const takes = other ? Math.max(1e-9, ...def(other.id).moves.filter((mv) => mv.power > 0).map((mv) => ringOf(other.id, f.id, mv))) : 1;
    const r = f.maxHp ? f.hp / f.maxHp : 0;
    const art = K.subjectOf?.(f.id)?.src || posterOf(f.id);
    return `<span class="bn-art" style="--c:${K.accent(f.id)}"><img alt="" loading="lazy" decoding="async" src="${art}"></span><span class="bn-head"><b>${esc(title(f.id))}</b>${d.disciplines.map((x) => `<span class="bn-d" style="--d:${K.DISCIPLINE_COLOR[x]}">${disc(x)}</span>`).join('')}${f.status ? `<span class="bn-st" style="--s:${STATUS_INFO[f.status].color}">${ico(f.status)}${STATUS_INFO[f.status].short}</span>` : ''}</span>
      <span class="bn-hp" data-band="${hpBand(f.hp, f.maxHp)}"><i style="transform:scaleX(${r})"></i></span>
      <span class="bn-foot"><span>${f.hp}/${f.maxHp} HP</span>${other ? `<span class="bn-mx"><span class="hx" data-tone="${tone(best)}">${ico(tone(best) === 'up' ? 'strong' : tone(best) === 'down' ? 'weak' : 'even')}<b>${times(best)}</b><i>deals</i></span><span class="hx" data-tone="${tone(1 / takes)}">${ico(tone(takes) === 'up' ? 'strong' : tone(takes) === 'down' ? 'weak' : 'even')}<b>${times(takes)}</b><i>takes</i></span></span>` : ''}</span>`;
  }
  /** A Kit row: the item's icon, name, effect, and why it is unavailable. */
  function itemInner(it, ok, why) {
    return `<span class="it-ic" data-kind="${ITEM_KIND[it.id] ?? 'heal'}">${ico(it.id, 'it-i')}</span><span class="it-t"><b>${esc(it.name)}</b><span>${esc(words(it.short))}${BOOSTS.has(it.id) ? boostMult(it.id) : ''}</span>${!ok && why ? `<em>${esc(why)}</em>` : ''}</span>`;
  }
  /** What a boost would multiply the stat by from where the card in play stands (×2 from even, ×1.67 from +1). */
  const boostMult = (id) => { const me = activeOf('player'), k = { overclock: 'atk', firewall: 'def', 'turbo-mode': 'spd' }[id]; const n = me?.stages?.[k] ?? 0; const m = stageMult(Math.min(3, n + 2)) / stageMult(n); return m > 1.001 ? ` → ×${Math.round(m * 100) / 100}` : ''; };
  /** An item nothing needs now (or already used), folded into the Kit's last row: its icon, its tooltip. */
  function itemChip(it) {
    return `<span class="it-chip" data-kind="${ITEM_KIND[it.id] ?? 'heal'}" data-used="${it.left <= 0}" data-tip="item:${it.id}" tabindex="0" role="img" aria-label="${esc(it.name)}${it.left <= 0 ? ', used' : ', not needed now'}">${ico(it.id)}</span>`;
  }

  /** A card's poster, from the gallery folder the page names (meta gallery), so the site's own paths hold. */
  const GALLERY = new URL(document.querySelector('meta[name="gallery"]')?.content ?? '../../../r3/cards/', document.baseURI).href;
  const posterOf = (id) => new URL(`posters/${id}.webp`, GALLERY).href;

  // ======================================================== the page's calls
  hud.bind = (match) => {
    hud.match = match; hud.flushLog?.(); logQ = []; entries.length = 0; logList.textContent = ''; lastTurn = -1; seenMoves.clear(); traitsSaid.clear(); hud.aim?.(null); beatTurn = -1;
    for (const s of SIDES) { plates[s].uid = ''; plates[s].hpShown = -1; }
    // the log opens with both lineups: each card, its disciplines, its HP
    const line = (side) => match.state.sides[side].team.map((f) => `<span class="lg-card">${def(f.id).disciplines.map(disc).join('')}<b>${esc(title(f.id))}</b><small>${f.maxHp}</small></span>`).join('');
    const head = el('li', 'lg-lineup', logList, `<span class="lg-side" data-side="player">You</span>${line('player')}<span class="lg-side" data-side="rival">Rival</span>${line('rival')}`);
    head.setAttribute('aria-label', 'Lineups');
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
    if (e.kind === 'move' && e.side === 'rival') seenMoves.add(`${e.actor}:${e.move.index}`);
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
  hud.history = (events) => { for (const e of events) { if (e.kind === 'move' && e.side === 'rival') seenMoves.add(`${e.actor}:${e.move.index}`); const x = entryOf(e, e.state); if (x) addEntry(x); } };
  hud.writeLog = writeLog;
  hud.receiptWords = receiptWords;
  hud.turn = (st, busy) => { if (beatTurn === -1 && st && !busy) beatTurn = st.turn; drawTurn(st, busy); };
  hud.callMultiplier = callMultiplier;
  hud.moveInner = moveInner;
  hud.moveFill = moveFill;
  hud.benchInner = benchInner;
  hud.itemInner = itemInner;
  hud.itemChip = itemChip;
  hud.hideTip = hideTip;
  hud.ringOf = ringOf;
  hud.root = root;
  return hud;
}

/** Each item's kind, for its icon's colour: restores, a cure, the three boosts, a revive. */
const BOOSTS = new Set(['overclock', 'firewall', 'turbo-mode']);
const ITEM_KIND = { 'code-snippet': 'heal', 'api-key': 'heal', 'server-patch': 'heal', 'system-restore': 'heal', debugger: 'cure', overclock: 'boost', firewall: 'boost', 'turbo-mode': 'boost', rollback: 'revive' };
/** What each item does, in full (the engine's short strings are the chip; this is the tooltip). */
const ITEM_TEXT = {
  'code-snippet': 'Restores 20 HP to one of your cards.',
  'api-key': 'Restores 50 HP to one of your cards.',
  'server-patch': 'Restores 150 HP to one of your cards.',
  'system-restore': 'Restores one of your cards to full HP.',
  debugger: 'Clears burn, poison, sleep or stun from one of your cards.',
  overclock: 'Raises one card’s Reach two stages (from even, ×2 damage), up to +3.',
  firewall: 'Raises one card’s Proof two stages (from even, ×2 toughness), up to +3.',
  'turbo-mode': 'Raises one card’s Pace two stages (from even, ×2 speed), up to +3.',
  rollback: 'Brings one knocked-out card back with half its HP.',
};
