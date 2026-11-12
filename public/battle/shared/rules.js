// The battle's rules, one facade over the vendored engine (ROUND6.md section 2): forms and upgrades as pure rules, kept
// outside the bundle as shared/runtime.js keeps the seam. battle.js, hud.js and tower.js read only `R.engine`.
// An ES module with no DOM and no globals of its own: it runs in Node over vendor/engine.js and in the page over
// `showdown.engine` (vendor/broadcast/kit.js).
//
// How a form works without patching the bundle: the engine reads every card by id from one private map of shared,
// mutable def objects, so a synchronous scope (`withForms`) writes a form card's composed four moves onto its def
// (slots 0 and 2 from the form at its level, 1 and 3 the card's own) and restores the original array in `finally`.
// Build and upgrade run as a stub move in slot 2 inside that scope, then the batch is rewritten. A card whose towers
// fire (`fires`, Princeton TD) runs the new tower's key-1 attack as the stub, at that attack's priority: the batch gets
// one `transform` event just before that shot's `move` event (the shot keeps every engine event, renamed to the key-1
// move, and every later id moves up one), so a transform never costs the fighter its shot. Otherwise the section 2.2
// stub (power 0, priority 6) runs and its `move` event becomes the `transform`. Either way the stub's PP comes back and
// the log keeps the real command. A battle with no form card, or with forms off, is the vendored engine itself
// (decision 7): `start` returns its `Match`, `simulate` and `replay` are its own functions.
import { FORMS } from './forms.js';

/** FNV-1a (32 bit) of a string, as 8 hex digits. */
export function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
/** A move's labels: its name, feature, receipt and note never change an outcome, so they are left out of the hash. Every
 *  other key is hashed (fixes-3 I7: an allow-list missed the engine's `axis` and `adapts`), so a key the engine reads
 *  can never change outcomes without moving `FORMS_VERSION`. R1-VERSION greps vendor/engine.js and fails when a denied
 *  key is read anywhere but the event's label (`moveRef`). */
export const LABEL_MOVE_KEYS = ['name', 'feature', 'receipt', 'note'];
/** The order the hash lists a move's keys in: the keys of record first (fixes-2 I3's order, so every hash and shared link
 *  made before stays the same), then any other key alphabetically. */
const RULE_MOVE_KEYS = ['id', 'discipline', 'power', 'accuracy', 'pp', 'priority', 'hits', 'critChance', 'piercing', 'executeThreshold', 'selfEffect', 'effect'];
const ruleMove = (m) => {
  const keys = Object.keys(m ?? {}).filter((k) => !LABEL_MOVE_KEYS.includes(k) && m[k] !== undefined);
  const known = RULE_MOVE_KEYS.filter((k) => keys.includes(k)), more = keys.filter((k) => !RULE_MOVE_KEYS.includes(k)).sort();
  return Object.fromEntries([...known, ...more].map((k) => [k, m[k]]));
};
/** The registry as a replay reads it: per card its start, slots, upgrade count, rest, ladder, Barrier and whether its
 *  towers fire, and per form its code, discipline and moves by their numbers. Accents, art, names, roles and the CPU's
 *  knobs are left out: a record logs both sides' commands, so replay never asks the CPU (fixes-2 I3). */
export const ruleFields = (forms) => Object.fromEntries(Object.entries(forms).map(([id, c]) => [id, {
  start: c.start, slots: c.slots, upgrades: c.upgrades, rest: c.rest, ladder: c.ladder, fires: c.fires ?? false, upgradeBarrier: c.upgradeBarrier, barrier: c.barrier,
  forms: Object.fromEntries(Object.entries(c.forms ?? {}).map(([k, f]) => [k, { code: f.code, discipline: f.discipline,
    moves: Object.fromEntries(Object.entries(f.moves ?? {}).map(([lv, pair]) => [lv, pair.map(ruleMove)])) }])),
}]));
/** A record's rules version: the hash of the registry's rule-bearing fields (`ruleFields`), so a change to a form's
 *  moves, a level's numbers or a card's ladder retires every record played under the old one (it takes the loud retry,
 *  never a silent replay of different rules), while a palette, label or CPU retune keeps every shared link. fixes-1 I7,
 *  narrowed by fixes-2 I3. */
export const formsVersionOf = (forms) => `showdown-v1+forms-${fnv1a(JSON.stringify(ruleFields(forms)))}`;
export const FORMS_VERSION = formsVersionOf(FORMS);

const SIDES = ['player', 'rival'];
const LEVELS = [1, 2, 3, '4a', '4b'];
const MOVE_KEYS = new Set(['id', 'name', 'feature', 'discipline', 'power', 'accuracy', 'pp', 'receipt', 'note', 'priority', 'hits', 'critChance', 'piercing', 'executeThreshold', 'selfEffect', 'effect', 'axis', 'adapts']);
const ENTRY_KEYS = new Set(['v', 'start', 'slots', 'upgrades', 'rest', 'ladder', 'upgradeBarrier', 'fires', 'art', 'cpu', 'forms']);
const FORM_KEYS = new Set(['code', 'name', 'role', 'accent', 'discipline', 'art', 'moves']);
const SELF = new Set(['atkUp', 'defUp', 'spdUp', 'critUp', 'barrier', 'heal', 'drain', 'recoil']);
const FOE = new Set(['burn', 'poison', 'sleep', 'stun']);
const RING = ['Infra', 'Agent', 'Data', 'Game', 'Shader', 'Type', 'Interface'];
/** Codes ride in shared links (`b{code}`): once published they never change. */
const FROZEN_CODES = { 'princeton-td': { cannon: 1, station: 2, library: 3, mortar: 4, lab: 5, arch: 6, club: 7 } };
const FORMS_FLAG = /(?:^|[#?&])forms=1(?:&|$)/;
const FORMS_OFF = /(?:^|[#?&])forms=0(?:&|$)/;

const clone = (s) => JSON.parse(JSON.stringify(s));
const other = (side) => (side === 'player' ? 'rival' : 'player');
const activeOf = (state, side) => state.sides[side].team[state.sides[side].active];
const list = (v) => (v === undefined || v === null ? undefined : Array.isArray(v) ? v.map(String) : String(v).split(',').map((s) => s.trim()).filter(Boolean));
const newSeed = () => {
  const c = globalThis.crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0] >>> 0;
  return (Date.now() ^ 1540483477) >>> 0;
};
/** 'Level 2', 'Level 4A'. */
export const levelName = (level) => `Level ${String(level).toUpperCase()}`;
const starsOf = (level) => (typeof level === 'number' ? level : 4);
const branchOf = (level) => (typeof level === 'string' ? level.slice(1) : null);

// ============================================================ the registry check
/** Every problem with a registry, as sentences; empty when it is sound. `words`/`pattern`/`wordRe` are the cards'
 *  banned words (r3/cards/tools/check.mjs), passed by the tests; the page checks the structure only. */
export function checkForms(engine, forms = FORMS, { words = [], pattern = null, wordRe = (w) => new RegExp(`\\b${w}s?\\b`, 'i') } = {}) {
  const errors = [];
  const err = (s) => errors.push(`Forms: ${s}`);
  const fighters = engine.FIGHTERS ?? [];
  const known = new Map(fighters.map((f) => [f.id, f]));
  const ownerOf = new Map();
  for (const f of fighters) for (const m of f.moves) ownerOf.set(m.id, f.id);
  const formKeys = new Map();
  const text = (where, s, { name = false } = {}) => {
    if (typeof s !== 'string' || !s) return err(`${where} is empty.`);
    if (/[–—]/.test(s)) err(`${where} "${s}" has a dash.`);
    for (const w of words) if (wordRe(w).test(s)) err(`${where} "${s}" says ${w}.`);
    if (pattern?.test(s)) err(`${where} "${s}" matches the banned pattern.`);
    if (name) {
      if (s.length > 22) err(`${where} "${s}" is over 22 characters.`);
      if (!s.split(/\s+/).every((w) => /^[A-Z0-9]/.test(w))) err(`${where} "${s}" is not Title Case.`);
    }
  };
  for (const [id, card] of Object.entries(forms)) {
    const def = known.get(id);
    if (!def) { err(`${id} is not a card the engine knows.`); continue; }
    for (const k of Object.keys(card)) if (!ENTRY_KEYS.has(k)) err(`${id} has an unknown key ${k}.`);
    const slots = card.slots ?? [];
    if (slots.length !== 2 || new Set(slots).size !== 2 || !slots.every((s) => Number.isInteger(s) && s >= 0 && s <= 3)) err(`${id} slots must be two of 0..3.`);
    if (!Number.isInteger(card.upgrades) || card.upgrades < 0) err(`${id} upgrades must be a count.`);
    if (!Number.isInteger(card.rest) || card.rest < 1) err(`${id} rest must be 1 or more.`);
    if (!(card.upgradeBarrier >= 0 && card.upgradeBarrier <= 0.5)) err(`${id} upgradeBarrier must be 0..0.5.`);
    if (card.fires !== undefined && typeof card.fires !== 'boolean') err(`${id} fires must be true or false.`);
    if (JSON.stringify(card.ladder) !== JSON.stringify([1, 2, 3, ['4a', '4b']])) err(`${id} ladder must be [1, 2, 3, ['4a', '4b']].`);
    const cpu = card.cpu ?? {};
    for (const k of ['theta', 'horizon', 'hpFloor', 'upgradeHpFloor']) if (!Number.isFinite(cpu[k])) err(`${id} cpu.${k} is missing.`);
    for (const k of Object.keys(cpu)) if (!['theta', 'horizon', 'hpFloor', 'upgradeHpFloor', 'effects', 'upgradeTheta', 'growTheta', 'branchB'].includes(k)) err(`${id} cpu.${k} is not a CPU knob.`);
    // (an upgrade's bars may be below 0: growing a tower is then taken over a small loss)
    for (const k of ['upgradeTheta', 'growTheta', 'branchB']) if (cpu[k] !== undefined && !Number.isFinite(cpu[k])) err(`${id} cpu.${k} must be a number.`);
    if (!(cpu.theta >= 0)) err(`${id} cpu.theta must be 0 or more: a tower turn has to gain something.`);
    const entries = Object.entries(card.forms ?? {});
    if (!entries.length) err(`${id} has no forms.`);
    if (!card.forms?.[card.start?.form] || !LEVELS.includes(card.start?.level)) err(`${id} start must name a form and a level.`);
    const codes = new Set();
    const ids = new Map();
    const kept = new Set(def.moves.map((m) => m.id));
    for (const [key, form] of entries) {
      const where = `${id} ${key}`;
      if (formKeys.has(key)) err(`${where}: form ${key} is also on ${formKeys.get(key)}.`);
      formKeys.set(key, id);
      for (const k of Object.keys(form)) if (!FORM_KEYS.has(k)) err(`${where} has an unknown key ${k}.`);
      if (!Number.isInteger(form.code) || form.code < 1 || form.code > 9) err(`${where} code must be 1..9.`);
      if (codes.has(form.code)) err(`${where} code ${form.code} is taken.`);
      codes.add(form.code);
      const frozen = FROZEN_CODES[id]?.[key];
      if (frozen !== undefined && frozen !== form.code) err(`${where} code ${form.code} changed from its published ${frozen}.`);
      if (!RING.includes(form.discipline)) err(`${where} discipline ${form.discipline} is not on the ring.`);
      if (!/^#[0-9a-f]{6}$/i.test(form.accent ?? '')) err(`${where} accent must be a hex colour.`);
      text(`${where} name`, form.name, { name: true });
      text(`${where} role`, form.role);
      for (const level of LEVELS) {
        const pair = form.moves?.[level];
        if (!Array.isArray(pair) || pair.length !== 2) { err(`${where} Level ${level} needs two moves.`); continue; }
        for (const m of pair) {
          const mw = `${where} ${level} ${m?.id}`;
          for (const k of Object.keys(m ?? {})) if (!MOVE_KEYS.has(k)) err(`${mw} has a key the engine does not read: ${k}.`);
          if (typeof m?.id !== 'string' || !/^[a-z0-9-]+$/.test(m.id)) { err(`${mw} needs a kebab id.`); continue; }
          const seen = ids.get(m.id);
          if (seen && JSON.stringify(seen) !== JSON.stringify(m)) err(`${mw} reuses an id for a different move.`);
          ids.set(m.id, m);
          const owner = ownerOf.get(m.id);
          if (owner && owner !== id) err(`${mw} is ${owner}'s move id.`);
          if (owner === id && !kept.has(m.id)) err(`${mw} collides with the card's own move.`);
          text(`${mw} name`, m.name, { name: true });
          text(`${mw} feature`, m.feature);
          if (!RING.includes(m.discipline)) err(`${mw} discipline is not on the ring.`);
          if (!Number.isInteger(m.power) || m.power < 0 || m.power > 150) err(`${mw} power must be 0..150.`);
          if (!(m.accuracy >= 0.5 && m.accuracy <= 1)) err(`${mw} accuracy must be 0.5..1.`);
          if (!Number.isInteger(m.pp) || m.pp < 1) err(`${mw} pp must be a positive count.`);
          if (m.priority !== undefined && !(Number.isInteger(m.priority) && Math.abs(m.priority) <= 2)) err(`${mw} priority must be -2..2.`);
          if (m.hits && !(Number.isInteger(m.hits.min) && Number.isInteger(m.hits.max) && m.hits.min >= 1 && m.hits.min <= m.hits.max && m.hits.max <= 8)) err(`${mw} hits must be 1..8.`);
          if (m.piercing !== undefined && !(m.piercing >= 0 && m.piercing <= 1)) err(`${mw} piercing must be 0..1.`);
          if (m.executeThreshold !== undefined && !(m.executeThreshold > 0 && m.executeThreshold < 1)) err(`${mw} executeThreshold must be 0..1.`);
          if (m.effect && !(FOE.has(m.effect.type) && m.effect.chance > 0 && m.effect.chance <= 1)) err(`${mw} effect is not one the engine applies.`);
          const fx = m.selfEffect;
          if (fx) {
            if (!SELF.has(fx.type) || !(fx.chance > 0 && fx.chance <= 1)) err(`${mw} selfEffect is not one the engine applies.`);
            if (fx.type === 'heal' && !(Number.isInteger(fx.amount) && fx.amount > 0 && fx.amount <= def.stats.hp / 2)) err(`${mw} heals more than half the card's HP.`);
            if (fx.type === 'barrier' && !(fx.amount > 0 && fx.amount <= 0.5)) err(`${mw} barrier must be 0..0.5.`);
            if (['atkUp', 'defUp', 'spdUp'].includes(fx.type) && !(Number.isInteger(fx.amount) && fx.amount >= 1 && fx.amount <= 2)) err(`${mw} stat change must be 1 or 2.`);
          }
          if (m.power === 0 && !fx) err(`${mw} does nothing.`);
        }
      }
    }
  }
  return errors;
}

// ============================================================ the rules
// One scope at a time across every rules instance: the def objects are the engine's own and shared.
const ORIGINAL = new WeakMap();
let depth = 0;

export function createRules(engine, { runtime, forms = FORMS, debug = false } = {}) {
  const E = engine;
  const api = (name) => E[name] ?? globalThis.showdown?.[name];
  const errors = checkForms(E, forms);
  if (errors.length) throw new Error(errors.join(' '));
  const VERSION = E.VERSION ?? 'showdown-v1';
  const hasForms = (id) => Object.hasOwn(forms, id);
  const cardOf = (id) => (hasForms(id) ? forms[id] : null);
  const baseMoves = (id) => {
    const def = E.fighterDef(id);
    if (!ORIGINAL.has(def)) ORIGINAL.set(def, def.moves);
    return ORIGINAL.get(def);
  };
  for (const id of Object.keys(forms)) baseMoves(id);
  const formsOn = (state) => SIDES.some((s) => state.sides[s].team.some((f) => f.levels));
  const isForm = (f) => Boolean(f && f.form && hasForms(f.id));
  const barrierOf = (card) => ({ selfEffect: { type: 'barrier', chance: 1, amount: card.upgradeBarrier } });
  /** The move the engine runs for a build or upgrade, in slot 2. A card that `fires` (Princeton TD) puts its new tower
   *  to work at once: the stub is the target's key-1 attack at that attack's own priority. An upgrade's shot is a sure
   *  one (accuracy 1) and carries the upgrade's barrier in place of the attack's own self effect, so the barrier always
   *  lands. Otherwise it is the section 2.2 stub: power 0, priority 6, the turn spent on the transform alone. */
  const stubOf = (card, change, form, level) => {
    if (card.fires) {
      const { selfEffect, ...k1 } = card.forms[form].moves[level][0];
      const own = change === 'upgrade' ? { ...barrierOf(card), accuracy: 1 } : selfEffect ? { selfEffect } : {};
      return { ...k1, ...own, id: change, name: change === 'build' ? 'Build' : 'Upgrade', pp: 1, priority: k1.priority ?? 0 };
    }
    return {
      id: change, name: change === 'build' ? 'Build' : 'Upgrade', discipline: card.forms[form].discipline,
      power: 0, accuracy: 1, pp: 1, priority: 6,
      ...(change === 'upgrade' ? barrierOf(card) : {}),
    };
  };

  /** The card's four moves in a form at a level: slots from the form, the rest the card's own. */
  function movesFor(id, form, level, stub) {
    const card = forms[id], m = [...baseMoves(id)];
    const pair = card.forms[form].moves[level];
    m[card.slots[0]] = pair[0];
    m[card.slots[1]] = stub ?? pair[1];
    return m;
  }
  const maxPP = (id, form, level) => { const c = forms[id]; const p = c.forms[form].moves[level]; return [p[0].pp, p[1].pp]; };

  /** Run fn with these defs' moves swapped in; nested calls are no-ops (the outer scope stands). */
  function scope(entries, fn) {
    if (depth > 0 || !entries.length) return fn();
    const before = debug ? JSON.stringify(E.FIGHTERS) : null;
    const saved = [];
    depth++;
    try {
      for (const { id, moves } of entries) { const def = E.fighterDef(id); saved.push([def, def.moves]); def.moves = moves; }
      return fn();
    } finally {
      for (let i = saved.length - 1; i >= 0; i--) saved[i][0].moves = saved[i][1];
      depth--;
      if (debug && JSON.stringify(E.FIGHTERS) !== before) throw new Error('Forms: a scope left the roster changed.');
    }
  }
  /** The scope entries for fighters (a state, or a list of fighters or snapshot fighters), with overrides by uid. */
  function entriesOf(fighters, over = {}) {
    const all = fighters?.sides ? SIDES.flatMap((s) => fighters.sides[s].team) : (fighters ?? []);
    const out = [], seen = new Set();
    for (const f of all) {
      if (!isForm(f) || seen.has(f.id)) continue;
      seen.add(f.id);
      const o = over[f.uid];
      out.push({ id: f.id, moves: o ? movesFor(f.id, o.form, o.level, o.stub) : movesFor(f.id, f.form, f.level) });
    }
    return out;
  }
  const withForms = (fighters, fn) => (depth > 0 ? fn() : scope(entriesOf(fighters), fn));

  // ------------------------------------------------------------ reading a fighter's form
  function formOf(f) {
    if (!isForm(f) || !forms[f.id].forms[f.form]) return null;
    const card = forms[f.id], t = card.forms[f.form];
    return {
      card: f.id, form: f.form, level: f.level, key: `${f.form}-${f.level}`, name: t.name, role: t.role, accent: t.accent,
      discipline: t.discipline, stars: starsOf(f.level), branch: branchOf(f.level),
      upgradesLeft: f.upgrades ?? card.upgrades,
    };
  }
  /** The level an upgrade reaches: 1 -> 2 -> 3 -> 4A or 4B. */
  const nextLevel = (level, branch) => (level === 1 ? 2 : level === 2 ? 3 : level === 3 ? (branch ? `4${branch}` : null) : null);

  /** Why a build or upgrade cannot be given now, or '' when it can. */
  function formReason(state, side, a) {
    if (state.phase === 'over') return 'The battle is over.';
    if (state.phase !== 'command') return 'Choose a replacement first.';
    const f = activeOf(state, side);
    if (!formsOn(state) || !isForm(f)) return 'No towers in this battle.';
    const card = forms[f.id];
    if (f.status === 'sleep') return 'Asleep';
    if (f.status === 'stun') return 'Stunned';
    if (f.formTurn > 0 && state.turn - f.formTurn <= card.rest) return 'Built last turn';
    if (a.kind === 'build') {
      if (typeof a.form !== 'string' || !Object.hasOwn(card.forms, a.form)) return 'Unknown tower';
      if (a.form === f.form) return 'Standing';
      // a tower that fires when built needs a shot left in it
      if (card.fires && f.formPP?.[a.form]?.[0] === 0) return 'No PP left';
      return '';
    }
    if (f.upgrades <= 0) return 'No upgrades left';
    if (typeof f.level === 'string') return 'Highest level';
    if (a.branch !== undefined && a.branch !== 'a' && a.branch !== 'b') return 'Unknown branch';
    if (f.level === 3 && !a.branch) return 'Choose 4A or 4B';
    if (f.level !== 3 && a.branch) return 'Branches open at Level 3';
    return '';
  }
  const isFormCommand = (a) => a && (a.kind === 'build' || a.kind === 'upgrade');

  // ------------------------------------------------------------ snapshots and events
  /** Write form, level and upgrades (and the form slots' PP) onto one snapshot. `at(uid)` gives the values. */
  function decorate(snap, at) {
    if (!snap) return snap;
    for (const s of SIDES) for (const t of snap.sides[s].team) {
      const v = at(t.uid, t.id);
      if (!v) continue;
      t.form = v.form; t.level = v.level; t.upgrades = v.upgrades;
      if (v.pp) { const c = forms[t.id]; t.pp[c.slots[0]] = v.pp[0]; t.pp[c.slots[1]] = v.pp[1]; }
    }
    return snap;
  }
  const valuesOf = (state) => {
    const m = new Map();
    for (const s of SIDES) for (const f of state.sides[s].team) if (isForm(f)) m.set(f.uid, { form: f.form, level: f.level, upgrades: f.upgrades });
    return m;
  };
  const decorateAll = (events, values) => { for (const e of events) if (e.state) decorate(e.state, (uid) => values.get(uid)); return events; };
  /** The engine leaves the PP of the slots a form owns in `f.pp`; keep its tower's copy in step. */
  const syncPP = (state) => {
    for (const s of SIDES) for (const f of state.sides[s].team) if (isForm(f)) { const c = forms[f.id]; f.formPP[f.form] = [f.pp[c.slots[0]], f.pp[c.slots[1]]]; }
  };
  const snapshot = (state) => {
    const snap = E.snapshot(state);
    return formsOn(state) ? decorate(snap, (uid) => valuesOf(state).get(uid)) : snap;
  };

  // ------------------------------------------------------------ the engine calls, in scope
  function createBattle(team, rival, options = {}) {
    const ids = [...team, ...rival];
    const entries = [];
    for (const id of new Set(ids)) if (hasForms(id)) entries.push({ id, moves: movesFor(id, forms[id].start.form, forms[id].start.level) });
    const r = scope(entries, () => E.createBattle(team, rival, options));
    for (const s of SIDES) for (const f of r.state.sides[s].team) {
      if (!hasForms(f.id)) continue;
      const card = forms[f.id], { form, level } = card.start;
      Object.assign(f, { form, level, levels: { [form]: level }, formPP: { [form]: [f.pp[card.slots[0]], f.pp[card.slots[1]]] }, upgrades: card.upgrades, formTurn: 0 });
    }
    decorateAll(r.events, valuesOf(r.state));
    return r;
  }

  function submitTurn(source, player, rival, options = {}) {
    const cmds = { player, rival };
    const plans = {};
    const errs = [];
    for (const side of SIDES) {
      const a = cmds[side];
      const label = side === 'player' ? 'Player' : 'Rival';
      if (!isFormCommand(a)) { errs.push(...withForms(source, () => E.validateAction(source, side, a)).map((e) => `${label}: ${e}`)); continue; }
      const why = formReason(source, side, a);
      if (why) { errs.push(`${label}: ${why}`); continue; }
      const f = activeOf(source, side), card = forms[f.id];
      const to = a.kind === 'build' ? { form: a.form, level: f.levels[a.form] ?? 1 } : { form: f.form, level: nextLevel(f.level, a.branch) };
      plans[side] = { a, uid: f.uid, id: f.id, card, from: { form: f.form, level: f.level }, to, isNew: a.kind === 'build' && f.levels[a.form] === undefined };
    }
    if (errs.length) return { state: source, events: [], errors: errs };
    const planned = Object.values(plans);
    let src = source;
    const over = {};
    if (planned.length) {
      src = clone(source);
      for (const p of planned) {
        const f = src.sides[p.uid.split(':')[0]].team.find((x) => x.uid === p.uid);
        f.pp[p.card.slots[1]] = 1;
        over[p.uid] = { form: p.to.form, level: p.to.level, stub: stubOf(p.card, p.a.kind, p.to.form, p.to.level) };
      }
    }
    const tr = (side) => (plans[side] ? { kind: 'move', index: plans[side].card.slots[1] } : cmds[side]);
    const r = scope(entriesOf(src, over), () => E.submitTurn(src, tr('player'), tr('rival'), options));
    if (r.errors.length) return { state: source, events: [], errors: r.errors };
    const { state, events } = r;
    // before any transform, every form fighter shows the values it came in with
    const values = valuesOf(source);
    // (the transforming fighter's form slots read its true PP, not the stub's)
    for (const p of planned) { const f = source.sides[p.uid.split(':')[0]].team.find((x) => x.uid === p.uid); values.get(p.uid).pp = [f.pp[p.card.slots[0]], f.pp[p.card.slots[1]]]; }
    const changes = [];
    const inserts = []; // fires: [transform, its shot's move event]
    for (const side of SIDES) {
      const p = plans[side];
      if (!p) continue;
      const f = state.sides[side].team.find((x) => x.uid === p.uid);
      const s0 = source.sides[side].team.find((x) => x.uid === p.uid);
      const [k0, k2] = p.card.slots;
      const fires = p.card.fires === true;
      const at = events.findIndex((e) => e.kind === 'move' && e.actor === p.uid && e.move.index === k2 && e.move.id === p.a.kind);
      // the stub's PP and use come back to slot 2
      f.used[k2] = s0.used[k2];
      if (!s0.landed.includes(k2)) f.landed = f.landed.filter((i) => i !== k2);
      // never acted: knocked out first, or (a tower that fires acts at its attack's priority) asleep or stunned
      if (at < 0) { f.pp[k2] = s0.pp[k2]; continue; }
      f.formPP[p.from.form] = [s0.pp[k0], s0.pp[k2]];
      const fresh = p.a.kind === 'upgrade' ? maxPP(p.id, p.to.form, p.to.level) : (f.formPP[p.to.form] ?? maxPP(p.id, p.to.form, p.to.level));
      const move = events[at], t = p.card.forms[p.to.form];
      const mine = (e) => e.turn === move.turn && e.act === move.act && (e.actor === p.uid || ((e.side === side || e.fighter === p.uid) && e.kind !== 'effect'));
      let shot = null;
      if (fires) {
        // the new tower's key-1 attack fired: it spends key-1 PP and use, and every event names it
        const k1 = p.card.forms[p.to.form].moves[p.to.level][0];
        const ref = (r) => ({ ...r, index: k0, id: k1.id, name: k1.name });
        const landed = events.some((e, i) => i > at && e.kind === 'hit' && e.actor === p.uid && e.turn === move.turn && e.act === move.act);
        f.used[k0] = s0.used[k0] + 1;
        if (landed && !f.landed.includes(k0)) f.landed.push(k0);
        shot = [fresh[0] - 1, fresh[1]];
        events[at] = { ...move, move: ref(move.move), pp: [fresh[0], fresh[0] - 1], first: s0.used[k0] === 0 };
        for (let i = at + 1; i < events.length; i++) {
          const e = events[i];
          if (e.actor === p.uid && e.turn === move.turn && e.act === move.act && e.move && ['hit', 'miss', 'crit'].includes(e.kind)) events[i] = { ...e, move: ref(e.move) };
        }
      } else {
        // drop what the stub itself said (a trait it named, a miss, a hit); keep its barrier effect
        for (let i = events.length - 1; i > at; i--) if (mine(events[i]) && ['trait', 'miss', 'hit', 'crit'].includes(events[i].kind)) events.splice(i, 1);
      }
      f.pp[k0] = shot ? shot[0] : fresh[0]; f.pp[k2] = fresh[1];
      f.form = p.to.form; f.level = p.to.level; f.levels[p.to.form] = p.to.level; f.formTurn = source.turn;
      if (p.a.kind === 'upgrade') f.upgrades--;
      f.formPP[f.form] = [f.pp[k0], f.pp[k2]];
      const transform = {
        kind: 'transform', side, fighter: p.uid, card: p.id, change: p.a.kind, from: p.from, to: { ...p.to },
        name: t.name, role: t.role, accent: t.accent,
        label: p.isNew ? 'New' : levelName(p.to.level),
        moves: movesFor(p.id, p.to.form, p.to.level).map((m) => m.id), upgradesLeft: f.upgrades,
        id: move.id, turn: move.turn, act: move.act,
        ...(move.state ? { state: fires ? clone(move.state) : move.state } : {}),
      };
      const value = { form: f.form, level: f.level, upgrades: f.upgrades, pp: [...fresh] };
      if (fires) inserts.push({ transform, move: events[at], value, after: { ...value, pp: shot }, uid: p.uid });
      else { events[at] = transform; changes.push({ e: transform, uid: p.uid, value }); }
      const turn = events.find((e) => e.kind === 'turn');
      for (const o of turn?.order ?? []) if (o.side === side) o.action = p.a.kind;
    }
    if (inserts.length) {
      // each transform stands just before its shot and takes the shot's id; every later event moves up one
      const out = [];
      for (const e of events) {
        const x = inserts.find((y) => y.move === e);
        if (x) { out.push(x.transform); changes.push({ e: x.transform, uid: x.uid, value: x.value }, { e, uid: x.uid, value: x.after }); }
        out.push(e);
      }
      // (the batch's ids run without a gap from the engine, and these objects are this batch's own)
      const first = out.findIndex((e) => inserts.some((y) => y.transform === e));
      for (let i = first + 1; i < out.length; i++) out[i].id = out[i - 1].id + 1;
      events.splice(0, events.length, ...out);
      state.nextEventId += inserts.length;
    }
    // the log keeps the commands as given
    const last = state.log.at(-1);
    if (last?.kind === 'turn') { last.player = player; last.rival = rival; }
    syncPP(state);
    if (formsOn(state)) {
      for (const e of events) {
        for (const c of changes) if (e.id >= c.e.id) values.set(c.uid, c.value);
        if (e.state) decorate(e.state, (uid) => values.get(uid));
      }
    }
    return { state, events, errors: [] };
  }
  function submitReplacement(source, side, to, options = {}) {
    const r = withForms(source, () => E.submitReplacement(source, side, to, options));
    if (!r.errors.length && formsOn(r.state)) decorateAll(r.events, valuesOf(r.state));
    return r;
  }
  function leave(source, side, options = {}) {
    const r = withForms(source, () => E.leave(source, side, options));
    if (!r.errors.length && formsOn(r.state)) decorateAll(r.events, valuesOf(r.state));
    return r;
  }

  // ------------------------------------------------------------ commands
  /** Every build and upgrade the side may give now. */
  function formActions(state, side) {
    if (state.phase !== 'command' || !formsOn(state)) return [];
    const f = activeOf(state, side);
    if (!isForm(f) || f.hp <= 0) return [];
    const out = [];
    for (const form of Object.keys(forms[f.id].forms)) { const a = { kind: 'build', form }; if (!formReason(state, side, a)) out.push(a); }
    for (const a of f.level === 3 ? [{ kind: 'upgrade', branch: 'a' }, { kind: 'upgrade', branch: 'b' }] : [{ kind: 'upgrade' }]) if (!formReason(state, side, a)) out.push(a);
    return out;
  }
  function legalActions(state, side) {
    const base = withForms(state, () => E.legalActions(state, side));
    return base.length ? [...base, ...formActions(state, side)] : base;
  }
  /** The engine's shape: a list of reasons, empty when the command stands. */
  function reasons(state, side, a) {
    if (!isFormCommand(a)) return withForms(state, () => E.validateAction(state, side, a));
    const why = formReason(state, side, a);
    return why ? [why] : [];
  }
  function validateAction(state, side, a) {
    const r = reasons(state, side, a);
    return r.length ? { ok: false, reason: r.join(' ') } : { ok: true, reason: '' };
  }

  /** What one move is worth to the CPU this turn (section 2.5): expected damage x accuracy, capped at the foe's HP
   *  (`o.capped`), plus `o.effects` times the engine's own value for what else the move does (r3 cpu.ts `scoreMove`: a
   *  status on a foe without one 30 x chance, a heal or drain by the HP it restores, barrier 28, crit 20, Reach +1 30,
   *  Proof +1 22, Pace +1 18 while slower; each self effect weighed by its chance). With `o.danger` (the foe's best
   *  expected blow and its priority), a move that would land after a blow that knocks the fighter out is worth 0. */
  function worth(f, foe, m, o = {}) {
    const d = o.danger;
    if (d && d.incoming >= f.hp) {
      const mine = m.priority ?? 0;
      if (mine < d.priority || (mine === d.priority && E.effectiveSpeed(f) <= E.effectiveSpeed(foe))) return 0;
    }
    const x = E.expectedDamage(f, foe, m);
    let v = (o.capped === false ? x.damage : Math.min(x.damage, foe.hp)) * x.accuracy;
    const effects = o.effects ?? 0;
    if (!effects) return v;
    let bonus = 0;
    if (m.effect && x.damage < foe.hp && !foe.status && !E.traitOf(E.fighterDef(foe.id)).immune?.(m.effect.type)) bonus += m.effect.chance * 30 * x.accuracy;
    const fx = m.selfEffect, ratio = f.hp / f.maxHp, missing = f.maxHp - f.hp;
    if (fx) {
      const by = fx.chance * (x.power > 0 ? x.accuracy : 1);
      if (fx.type === 'heal') bonus += Math.min(fx.amount, missing) * 0.9 * by;
      else if (fx.type === 'drain') bonus += Math.min(x.damage * fx.amount, missing) * 0.6 * by;
      else if (fx.type === 'barrier') bonus += (f.barrier ? 0 : ratio > 0.4 ? 28 : 8) * by;
      else if (fx.type === 'critUp') bonus += (f.critBoost ? 0 : 20) * by;
      else if (fx.type === 'atkUp') bonus += (f.stages.atk < 2 && ratio > 0.5 ? 30 * fx.amount : 0) * by;
      else if (fx.type === 'defUp') bonus += (f.stages.def < 2 && ratio > 0.5 ? 22 * fx.amount : 0) * by;
      else if (fx.type === 'spdUp') bonus += (f.stages.spd < 2 && E.effectiveSpeed(f) <= E.effectiveSpeed(foe) ? 18 * fx.amount : 0) * by;
    }
    return v + effects * bonus;
  }
  /** The best a fighter standing in a form at a level does into the foe, over the moves with PP (`pp`: the form slots). */
  function bestWorth(f, foe, form, level, pp, o) {
    const card = forms[f.id];
    let best = 0;
    movesFor(f.id, form, level).forEach((m, i) => {
      const left = i === card.slots[0] ? pp[0] : i === card.slots[1] ? pp[1] : f.pp[i];
      if (left > 0) best = Math.max(best, worth(f, foe, m, o));
    });
    return best;
  }
  /** The CPU (section 2.5): the engine's choice, unless a build or upgrade earns more over the horizon.
   *  A card whose towers fire when built (`fires`) scores the shot it fires now plus the gain on the turns it still
   *  stands: `(shot - now) + (after - now) * min(horizon, turns left)`, turns left from the foe's best expected blow.
   *  Otherwise the turn is spent on the transform alone: `(after - now) * min(horizon, ceil(foeHp / after)) - now`.
   *  Either way the best option is taken only when its score beats `theta x j` (j a seeded 0.94..1.06, state.rng
   *  untouched; an upgrade beats `upgradeTheta x j` instead, and one past Level 2 `growTheta x j`, fixes-1 I8), its HP
   *  floor holds, and of several the one that clears its bar by most is taken. A card without firing towers never
   *  transforms while a move in hand can knock the foe out; one whose towers fire may, but only into a tower whose own
   *  shot (the stub) knocks the foe out too, when a move in hand would at 0.9 accuracy or better and lands before the
   *  foe could knock this fighter out (fixes-2 I2). Exact
   *  ties go to the first option listed (builds in code order, then Level 4A before 4B). */
  function chooseAction(state, side) {
    const base = withForms(state, () => E.chooseAction(state, side));
    const options = formActions(state, side);
    // a heal, a cure, a switch or a guard the engine chose stands: a tower only ever replaces an attack
    if (!options.length || base.kind !== 'move') return base;
    const f = activeOf(state, side), foe = activeOf(state, other(side)), card = forms[f.id], cpu = card.cpu;
    const frac = f.hp / f.maxHp;
    const nowPP = [f.pp[card.slots[0]], f.pp[card.slots[1]]];
    let left = 0, ahead = 0, o = { effects: 0 };
    if (!card.fires) {
      const top = Math.max(0, ...movesFor(f.id, f.form, f.level).map((m, i) => ((i === card.slots[0] ? nowPP[0] : i === card.slots[1] ? nowPP[1] : f.pp[i]) > 0 ? E.expectedDamage(f, foe, m).damage : 0)));
      if (top >= foe.hp) return base;
    } else {
      // the foe's best expected blow (and its priority): how many turns this fighter still stands, and which moves
      // land before it
      let incoming = 1, priority = 0;
      E.fighterDef(foe.id).moves.forEach((m, i) => {
        if (foe.pp[i] <= 0) return;
        const x = E.expectedDamage(foe, f, m), v = x.damage * x.accuracy;
        if (v > incoming) { incoming = v; priority = E.priorityOf(foe, { kind: 'move', index: i }); }
      });
      left = Math.min(cpu.horizon, Math.max(0, Math.ceil(f.hp / incoming) - 1));
      o = { effects: cpu.effects ?? 0, danger: { incoming, priority } };
      // what the fighter stands to do on later turns, this foe or the next: not capped at what this foe has left
      ahead = bestWorth(f, foe, f.form, f.level, nowPP, { effects: o.effects, capped: false });
    }
    const now = bestWorth(f, foe, f.form, f.level, nowPP, o);
    // a knockout in hand (fixes-2 I2): a move with PP whose expected damage takes the foe's HP at 0.9 accuracy or better
    // and that lands before the foe's best blow could knock this fighter out (`worth` with the danger). A tower that
    // fires is never built or grown in its place unless its own shot knocks the foe out too
    const koInHand = card.fires && movesFor(f.id, f.form, f.level).some((m, i) => {
      const pp = i === card.slots[0] ? nowPP[0] : i === card.slots[1] ? nowPP[1] : f.pp[i];
      if (!(pp > 0)) return false;
      const x = E.expectedDamage(f, foe, m);
      return x.damage >= foe.hp && x.accuracy >= 0.9 && worth(f, foe, m, { danger: o.danger }) > 0;
    });
    const j = 0.94 + 0.12 * E.stream(E.hash(state.seed, state.turn, side, 'form'))();
    let best = null, bestScore = -Infinity;
    for (const a of options) {
      if (frac < (a.kind === 'upgrade' ? cpu.upgradeHpFloor : cpu.hpFloor)) continue;
      const [form, level] = a.kind === 'build' ? [a.form, f.levels[a.form] ?? 1] : [f.form, nextLevel(f.level, a.branch)];
      const pp = a.kind === 'build' ? (f.formPP[form] ?? maxPP(f.id, form, level)) : maxPP(f.id, form, level);
      let score;
      if (card.fires) {
        // the shot is the stub itself: the new key-1 attack, carrying an upgrade's barrier
        const stub = stubOf(card, a.kind, form, level);
        if (koInHand && E.expectedDamage(f, foe, stub).damage < foe.hp) continue;
        const shot = worth(f, foe, stub, o);
        const after = bestWorth(f, foe, form, level, [pp[0] - 1, pp[1]], { effects: o.effects, capped: false });
        score = (shot - now) + (after - ahead) * left;
      } else {
        const after = bestWorth(f, foe, form, level, pp, o);
        score = (after - now) * Math.min(cpu.horizon, Math.ceil(foe.hp / Math.max(1, after))) - now;
      }
      // an upgrade clears its own bar (`upgradeTheta`, below 0 a premium on growing a tower), and one past Level 2 (to
      // 3, 4A or 4B) clears `growTheta`: Auto grows a tower it has begun rather than trading it for the next counter,
      // so Level 4 shows up (fixes-1 I8: with theta alone 1.9% of Princeton TD matches reached it)
      const bar = a.kind !== 'upgrade' ? cpu.theta
        : typeof f.level === 'number' && f.level >= 2 && cpu.growTheta !== undefined ? cpu.growTheta
          : cpu.upgradeTheta ?? cpu.theta;
      // (`branchB` points to Level 4B over 4A, which the order of ties and the key-1 attacks otherwise favour 3:1)
      if (a.kind === 'upgrade' && a.branch === 'b' && cpu.branchB) score += cpu.branchB;
      if (score - bar * j > bestScore) { bestScore = score - bar * j; best = a; }
    }
    return best && bestScore > 0 ? best : base;
  }
  const chooseReplacement = (state, side) => withForms(state, () => E.chooseReplacement(state, side));

  // ------------------------------------------------------------ the codec and records
  function encodeAction(a, side, state) {
    if (a?.kind === 'upgrade') return `u${a.branch ?? ''}`;
    if (a?.kind === 'build') {
      if (Number.isInteger(a.code)) return `b${a.code}`;
      const ids = state ? state.teams[side] : Object.keys(forms);
      const id = ids.find((x) => hasForms(x) && Object.hasOwn(forms[x].forms, a.form));
      if (!id) throw new Error(`Unwritable command build ${a.form}.`);
      return `b${forms[id].forms[a.form].code}`;
    }
    const t = E.encodeAction(a);
    if (t === undefined) throw new Error(`Unwritable command ${a?.kind}.`);
    return t;
  }
  function decodeAction(t) {
    let m;
    if ((m = /^b([1-9])$/.exec(t))) return { kind: 'build', code: Number(m[1]) };
    if ((m = /^u([ab])?$/.exec(t))) return m[1] ? { kind: 'upgrade', branch: m[1] } : { kind: 'upgrade' };
    try { return E.decodeAction(t); } catch { throw new Error(`Unreadable command "${t}".`); }
  }
  const encodeLog = (log, state) => log.map((s) => (s.kind === 'turn' ? `${encodeAction(s.player, 'player', state)}/${encodeAction(s.rival, 'rival', state)}` : s.kind === 'replace' ? `r${s.side[0]}${s.to + 1}` : `x${s.side[0]}`)).join('~');
  function decodeLog(text) {
    return String(text || '').split('~').filter(Boolean).map((t) => {
      const side = (c) => { if (c === 'p') return 'player'; if (c === 'r') return 'rival'; throw new Error(`Unreadable side in "${t}".`); };
      if (/^r[pr]\d$/.test(t)) return { kind: 'replace', side: side(t[1]), to: Number(t[2]) - 1 };
      if (/^x[pr]$/.test(t)) return { kind: 'leave', side: side(t[1]) };
      const [p, r, extra] = t.split('/');
      if (!p || !r || extra !== undefined) throw new Error(`Unreadable turn "${t}".`);
      return { kind: 'turn', player: decodeAction(p), rival: decodeAction(r) };
    });
  }
  /** A decoded build names a code; the active card's registry turns it into its form. */
  function resolve(state, side, a) {
    if (a?.kind !== 'build' || a.form !== undefined) return a;
    const f = activeOf(state, side);
    const form = isForm(f) ? Object.keys(forms[f.id].forms).find((k) => forms[f.id].forms[k].code === a.code) : undefined;
    if (!form) throw new Error(`No tower ${a.code} for ${side}.`);
    return { kind: 'build', form };
  }
  const recordOf = (state) => (formsOn(state)
    ? { v: FORMS_VERSION, team: [...state.teams.player], rival: [...state.teams.rival], seed: state.seed, log: encodeLog(state.log, state) }
    : E.recordOf(state));

  const needsForms = (team = [], rival = []) => {
    const mine = (list(team) ?? []).some(hasForms), theirs = (list(rival) ?? []).some(hasForms);
    return mine !== theirs;
  };
  function replay(record, options = {}) {
    if (record?.v !== FORMS_VERSION) return E.replay(record, options);
    try {
      for (const ids of [record.team, record.rival]) { const e = E.validateTeam(ids); if (e.length) return { state: null, events: [], error: e.join(' ') }; }
      if (!needsForms(record.team, record.rival)) return { state: null, events: [], error: 'Towers need a tower card on exactly one side.' };
      let { state, events } = createBattle(record.team, record.rival, { ...options, seed: record.seed });
      const all = [...events];
      for (const step of decodeLog(record.log)) {
        const r = step.kind === 'turn' ? submitTurn(state, resolve(state, 'player', step.player), resolve(state, 'rival', step.rival), options)
          : step.kind === 'replace' ? submitReplacement(state, step.side, step.to, options) : leave(state, step.side, options);
        if (r.errors.length) return { state: null, events: [], error: `Illegal step: ${r.errors.join(' ')}` };
        state = r.state;
        all.push(...r.events);
      }
      return { state, events: all, error: null };
    } catch (e) {
      return { state: null, events: [], error: e instanceof Error ? e.message : String(e) };
    }
  }
  /** Both sides on the CPU (or `policy(state, side)` for one), to the end. Forms off with the CPU is the engine's own. */
  function simulate(team, rival, seed, options = {}) {
    const on = options.forms !== false && needsForms(team, rival);
    if (!on && !options.policy && !options.forcePath) return E.simulate(team, rival, seed, options);
    const opts = { snapshots: options.snapshots ?? false };
    const pick = options.policy ?? chooseAction;
    let { state, events } = on ? createBattle(team, rival, { ...opts, seed }) : E.createBattle(team, rival, { ...opts, seed });
    options.onEvents?.(events, state);
    for (let guard = 0; state.phase !== 'over' && guard < 1e3; guard++) {
      let r;
      if (state.phase === 'replace') { const side = state.pending[0]; r = submitReplacement(state, side, chooseReplacement(state, side), opts); }
      else r = submitTurn(state, pick(state, 'player'), pick(state, 'rival'), opts);
      if (r.errors.length) throw new Error(r.errors.join(' '));
      state = r.state;
      options.onEvents?.(r.events, state);
    }
    return { state, record: recordOf(state) };
  }

  // ------------------------------------------------------------ the Tower panel
  /** What a build (`{ form }`) or an upgrade (`{ branch }`, `{ upgrade: true }` or `{}`) would stand: its four moves, the key-1 attack's
   *  ring multiplier into the foe, the best expected damage as a share of the foe's max HP, and each move's numbers. */
  function towerPreview(state, side, o = {}) {
    const f = activeOf(state, side), foe = activeOf(state, other(side));
    if (!isForm(f) || !foe) return null;
    const card = forms[f.id];
    let form, level;
    if (o.form !== undefined) { form = o.form; level = f.levels?.[form] ?? 1; }
    else { form = f.form; level = typeof f.level === 'string' ? f.level : nextLevel(f.level, o.branch ?? (f.level === 3 ? 'a' : undefined)); }
    if (!card.forms[form] || !level) return null;
    const moves = movesFor(f.id, form, level);
    const foeDef = E.fighterDef(foe.id);
    const numbers = moves.map((m, i) => {
      const x = E.expectedDamage(f, foe, m);
      const ring = m.power > 0 ? E.matchup(m.discipline, foeDef.disciplines) : 1;
      return { index: i, id: m.id, name: m.name, discipline: m.discipline, power: x.power, accuracy: x.accuracy, hits: m.hits?.max ?? 1, ring, damage: Math.round(x.damage), pct: Math.round((100 * x.damage) / foe.maxHp) };
    });
    const k1 = moves[card.slots[0]];
    return {
      form, level, key: `${form}-${level}`, name: card.forms[form].name, moves,
      mult: E.matchup(k1.discipline, foeDef.disciplines),
      bestPct: Math.max(0, ...numbers.map((n) => n.pct)),
      numbers,
    };
  }

  // ------------------------------------------------------------ the Director's shots
  /** Transform shots (section 2.5): each transform event, alone in its act, becomes one `transform` scene carrying
   *  that act's effect events (an upgrade's barrier); a batch without one is the runtime's array untouched. */
  function scenesOf(events, o = {}) {
    if (!events.some((e) => e.kind === 'transform')) return runtime.scenesFrom(events, o);
    // a transform is its own shot: alone in its act, it never joins the shot its tower fires in the same act
    const shots = runtime.scenesFrom(events.map((e) => (e.kind === 'transform' ? { ...e, act: 0 } : e)), o);
    const byId = new Map(events.map((e) => [e.id, e]));
    const folded = new Set();
    const out = [];
    for (const shot of shots) {
      const e0 = !shot.scene && shot.pre?.length === 1 ? shot.pre[0] : null;
      if (e0 && e0.kind === 'effect' && folded.has(e0.id)) continue;
      if (!e0 || e0.kind !== 'transform') { out.push(shot); continue; }
      const e = byId.get(e0.id) ?? e0;
      // the stub's own effect (an upgrade's barrier) rides the transform; when the tower fired, it is the shot's
      const fired = events.some((x) => x.kind === 'move' && x.turn === e.turn && x.act === e.act && x.actor === e.fighter);
      const effects = fired ? [] : events.filter((x) => x.kind === 'effect' && x.turn === e.turn && x.act === e.act && x.fighter === e.fighter);
      for (const x of effects) folded.add(x.id);
      const card = forms[e.card], t = card?.forms[e.to.form];
      // every transform is headlined by its tower ("E-Quad Lab"); a 4A or 4B upgrade's line names its role and level
      // (shared/plan.js), never the branch's key-1 move, which its own shot names next (fixes-3 I6: "Focused Beam" read
      // three times in a 4A turn when the headline was the move)
      const scene = {
        kind: 'transform', side: e.side, card: e.card, title: e.name, label: e.label,
        move: { id: e.to.form, name: e.name, discipline: t?.discipline ?? 'Game' },
        outcome: new Set([e.side]), hits: 1, first: true, variant: variantOf(e, o), pre: [], post: [e, ...effects],
      };
      out.push({ scene, pre: [], post: [e, ...effects] });
    }
    return out;
  }
  /** Section 5.4: the first build a side makes and a branch upgrade play full by hand (short under Auto); a later
   *  build and Level 2 or 3 play short by hand and on the board alone under Auto. */
  function variantOf(e, o) {
    if (o.mode === 'off') return 'off';
    if (o.reduced) return 'reduced';
    const key = `transform:${e.side}:build`;
    const firstBuild = e.change === 'build' && !o.seen?.has(key);
    if (e.change === 'build') o.seen?.add(key);
    const big = firstBuild || (e.change === 'upgrade' && typeof e.to.level === 'string');
    if (o.mode === 'full') return 'full';
    if (o.mode === 'short') return 'short';
    if (o.auto) return big ? 'short' : 'off';
    return big ? 'full' : 'short';
  }

  /** One def per form card with every form move it does not already hold, once each, for a scene default per new id. */
  function moveDefs() {
    return Object.keys(forms).filter((id) => E.FIGHTERS.some((f) => f.id === id)).map((id) => {
      const own = new Set(baseMoves(id).map((m) => m.id)), moves = [], seen = new Set();
      for (const form of Object.values(forms[id].forms)) for (const level of LEVELS) for (const m of form.moves[level]) {
        if (own.has(m.id) || seen.has(m.id)) continue;
        seen.add(m.id);
        moves.push(m);
      }
      return { ...E.fighterDef(id), moves };
    });
  }

  // ------------------------------------------------------------ the facade
  const composedDef = (id, f) => (isForm(f) && forms[id].forms[f.form] ? { ...E.fighterDef(id), moves: movesFor(id, f.form, f.level) } : E.fighterDef(id));
  const facade = {
    ...E,
    fighterDef: (id, f) => composedDef(id, f),
    moveOf: (f, index) => withForms([f], () => E.moveOf(f, index)),
    moveNumbers: (f, m, w) => withForms([f], () => E.moveNumbers(f, m, w)),
    computeDamage: (a, d, m, p, roll) => withForms([a, d], () => E.computeDamage(a, d, m, p, roll)),
    expectedDamage: (a, d, m, w) => withForms([a, d], () => E.expectedDamage(a, d, m, w)),
    effectiveSpeed: (f) => withForms([f], () => E.effectiveSpeed(f)),
    priorityOf: (f, action) => (isFormCommand(action) ? 6 : withForms([f], () => E.priorityOf(f, action))),
    snapshot,
    legalActions,
    validateAction: reasons,
    chooseAction,
    chooseReplacement,
    rivalFor: (team, seed) => E.rivalFor(team, seed),
    recordOf,
    replay,
    simulate,
  };

  const R = {
    engine: facade,
    /** The registry this rules instance reads (shared/tower.js lists a card's towers from it). */
    forms,
    hasForms,
    formOf,
    withForms,
    needsForms,
    /** A battle with no form card, forms off, or a legacy log is the vendored Match itself (decisions 7, 8, 13). */
    start({ team, rival, seed, log, forms: want } = {}) {
      const t = list(team) ?? [];
      const te = E.validateTeam(t);
      if (te.length) throw new Error(`Team: ${te.join(' ')}`);
      const s = seed === undefined || seed === null || seed === '' ? newSeed() : Number(seed) >>> 0;
      const r = list(rival) ?? E.rivalFor(t, s);
      const need = needsForms(t, r);
      const on = need && (log ? want === true : want !== false);
      const Match = api('Match');
      if (!on) return new Match({ team: t, rival: r, seed: s, log });
      return new FormMatch(R, { team: t, rival: r, seed: s, log });
    },
    /** `forms`: true with `forms=1`; false with `forms=0` or a log without the flag (a legacy link); null for a fresh
     *  battle, where `start` turns forms on when a tower card is on exactly one side. */
    parseHash: (h) => {
      const p = api('parseHash')(h), raw = String(h ?? '');
      return { ...p, forms: FORMS_FLAG.test(raw) ? true : FORMS_OFF.test(raw) || p.log ? false : null };
    },
    toHash: (o) => api('toHash')(o) + (o?.forms ? '&forms=1' : ''),
    replay,
    simulate,
    recordOf,
    legalActions,
    validateAction,
    chooseAction,
    towerPreview,
    scenesOf,
    moveDefs,
    // not in the frozen surface: the tests' handles on the codec and the engine calls in scope
    codec: { encodeAction, decodeAction, encodeLog, decodeLog },
    internal: { createBattle, submitTurn, submitReplacement, leave, chooseReplacement, formReason, formActions, nextLevel, movesFor, formsOn, variantOf },
  };

  // ------------------------------------------------------------ the Match with forms (engine.js 2774-2942, ported)
  class FormMatch {
    forms = true;
    events = [];
    listeners = new Map();
    constructor(rules, { team, rival, seed, log }) {
      if (log) {
        const r = replay({ v: FORMS_VERSION, team, rival, seed, log });
        if (r.error || !r.state) throw new Error(`Replay: ${r.error}`);
        this.state = r.state;
        this.events.push(...r.events);
      } else {
        const { state, events } = createBattle(team, rival, { seed });
        this.state = state;
        this.events.push(...events);
      }
    }
    get phase() { return this.state.phase; }
    get winner() { return this.state.winner; }
    get turn() { return this.state.turn; }
    get seed() { return this.state.seed; }
    get team() { return this.state.teams.player; }
    get rival() { return this.state.teams.rival; }
    get opening() { return this.events.filter((e) => e.turn === 1 && e.act === 0 && e.kind === 'switch'); }
    active(side = 'player') { return activeOf(this.state, side); }
    cardOf = (uid) => { const [side, slot] = uid.split(':'); return this.state.teams[side]?.[Number(slot)] ?? uid; };
    fighter(id) { const s = SIDES.flatMap((x) => this.state.sides[x].team).find((f) => f.id === id); return composedDef(id, s); }
    legal() { return legalActions(this.state, 'player'); }
    validate(action) { return reasons(this.state, 'player', action); }
    get mustReplace() { return this.state.phase === 'replace' && this.state.pending.includes('player'); }
    reserves(side = 'player') { return E.reservesFor(this.state, side); }
    kit(side = 'player') {
      const s = this.state.sides[side];
      return E.ITEMS.map((it) => ({ id: it.id, name: it.name, short: it.short, left: s.kit[it.id], targets: s.kit[it.id] > 0 ? s.team.flatMap((f, i) => (E.canUseItem(it.id, f) ? [i] : [])) : [] }));
    }
    act(action) {
      const r = submitTurn(this.state, action, chooseAction(this.state, 'rival'));
      if (r.errors.length) throw new Error(r.errors.join(' '));
      return this.commit(r.events, r.state);
    }
    replace(to) {
      const r = submitReplacement(this.state, 'player', to);
      if (r.errors.length) throw new Error(r.errors.join(' '));
      return this.commit(r.events, r.state);
    }
    leave() {
      const r = leave(this.state, 'player');
      if (r.errors.length) throw new Error(r.errors.join(' '));
      return this.commit(r.events, r.state);
    }
    autoAction() {
      if (this.state.phase === 'over') return null;
      if (this.mustReplace) return { kind: 'replace', to: chooseReplacement(this.state, 'player') };
      if (this.state.phase !== 'command') return null;
      return chooseAction(this.state, 'player');
    }
    step() { const a = this.autoAction(); if (!a) return []; return a.kind === 'replace' ? this.replace(a.to) : this.act(a); }
    commit(events, state) {
      this.state = state;
      if (state.phase === 'replace' && state.pending.includes('rival')) {
        const r = submitReplacement(state, 'rival', chooseReplacement(state, 'rival'));
        if (!r.errors.length) { this.state = r.state; events = [...events, ...r.events]; }
      }
      this.events.push(...events);
      this.dispatch(events);
      return events;
    }
    on(kind, fn) {
      if (!this.listeners.has(kind)) this.listeners.set(kind, new Set());
      this.listeners.get(kind).add(fn);
      return () => this.listeners.get(kind)?.delete(fn);
    }
    dispatch(events) {
      for (const fn of this.listeners.get('batch') ?? []) fn(events, this);
      for (const e of events) {
        for (const fn of this.listeners.get(e.kind) ?? []) fn(e, this);
        for (const fn of this.listeners.get('*') ?? []) fn(e, this);
      }
      if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') window.dispatchEvent(new CustomEvent('showdown', { detail: { events, match: this } }));
    }
    record() { return recordOf(this.state); }
    hash() { const r = this.record(); return R.toHash({ team: r.team, rival: r.rival, seed: r.seed, log: r.log || undefined, forms: true }); }
  }
  R.FormMatch = FormMatch;
  return R;
}
