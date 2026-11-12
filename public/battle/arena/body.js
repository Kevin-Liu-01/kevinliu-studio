// How an Arena figure moves, as data (ROUND6.md section 4.3): each card has a body class (machine, character, floater,
// mark) and each class a verb table that arena/board.js reads for the idle loop, the anticipation in the pre-roll, the
// attack at the board cue, the hit, the knockout, the switch and the victory. Distances are metres on the floor (the
// board turns them into px at the figure's stand), angles degrees (positive leans toward the foe), times ms; a share
// is damage over the card's max HP. Every verb is transform and opacity only, through the board's motion (skip, hold,
// pace), and none plays under reduced motion.

/** The body class of each fielded figure. */
export const BODY_CLASS = Object.freeze({
  'claude-of-tanks': 'machine', mailroom: 'machine', 'local-search': 'machine', 'agent-machines': 'machine', 'princeton-td': 'machine',
  'agent-pets': 'character', 'bday-land': 'character', cotfly: 'character', powerlifting: 'character',
  jarhead: 'floater', prototemplate: 'floater', 'kevin-wiki': 'floater',
  turboslide: 'mark', glyphfield: 'mark', katagami: 'mark', elo: 'mark', relay: 'mark', loop: 'mark',
});

/** Each card's energy colour (its ex card's `hue.energy`, ROUND6.md section 4.1): the fallback when FACE has none, the
 *  rim it lights on the card it strikes. */
export const ENERGY = Object.freeze({
  turboslide: '#368bc6', glyphfield: '#61f7b6', jarhead: '#66d2f4', katagami: '#ef558c', 'claude-of-tanks': '#f3a859', mailroom: '#dd60cc',
  'local-search': '#48b7bd', 'agent-pets': '#a7ce4c', loop: '#e3763a', 'agent-machines': '#53db69', prototemplate: '#676ce8', 'bday-land': '#f05aa5',
  powerlifting: '#ec8d41', elo: '#8a7dec', cotfly: '#e13e67', relay: '#b68dee', 'kevin-wiki': '#53cfb6', 'princeton-td': '#efb14c',
});

/** What every class shares. */
const SHARED = Object.freeze({
  // the defender's first frame held (the hit-stop), then its class's rock, inside I to I + 340
  hit: Object.freeze({ hold: 60, critHold: 90, ms: 340, tilt: Object.freeze([3, 10, 9]), knock: Object.freeze([0.18, 0.5, 0.4]) }),
  // the defender steps across the duel axis and back (kept)
  miss: Object.freeze({ m: 0.45, ms: 240, peak: 0.4 }),
  // the body squashes as the floor disc rises (kept)
  guard: Object.freeze({ ms: 420, squash: Object.freeze([1.02, 0.95]), peak: 0.4 }),
  // the knockout pose (class `ko`) then grey, held under its number, then the Bayer sink; the state reads at once
  ko: Object.freeze({ drainMs: 200, from: 'grayscale(.6) brightness(.7)', to: 'grayscale(1) brightness(.42)', sinkMs: 560, auto: Object.freeze({ sinkMs: 420 }), sink: 0.12 }),
  // out: the pieces spiral into the pad, then the sink and the card home; in: the card arcs to the pad, the card's
  // floor matter grows from it (no ground picture), the figure rises, the pieces spiral out after the rise
  switchOut: Object.freeze({ spiralMs: 260, sinkMs: 300, cardMs: 300, quick: Object.freeze({ spiralMs: 120, sinkMs: 110, cardMs: 180 }) }),
  switchIn: Object.freeze({ waitMs: 160, cardMs: 380, growMs: 380, riseMs: 320, piecesAt: 80, piecesMs: 400, quick: Object.freeze({ waitMs: 0, cardMs: 190, growMs: 260, riseMs: 110, piecesAt: 40, piecesMs: 220 }) }),
  // the struck card's rim takes the attacker's energy colour: 0.34 -> 0.9 -> its own rim, 260 ms (hue, not light)
  rim: Object.freeze({ from: 0.34, peak: 0.9, ms: 260 }),
  // the leader you command breathes on its rear cell, about its foot: section 4.3's 1%, held by the board to at most
  // 0.9 px at the sprite's top (test 31 reads a leader's drawn anchor off its sprite's box, within 1 px)
  leader: Object.freeze({ scale: 1.01, ms: 3200 }),
});

/** The verbs of each class (section 4.3's table). */
export const VERBS = Object.freeze({
  // a tank, a press, a terminal: it settles on its suspension, braces nose down, fires and recoils from its own fire
  // (never lunges), rocks when struck, and dips its nose to go down
  machine: Object.freeze({
    ...SHARED,
    idle: Object.freeze({ kind: 'settle', dy: 0.012, ms: 2200 }),
    anticipation: Object.freeze({ kind: 'brace', ms: 120, back: 0.06, tilt: 1.5 }),
    attack: Object.freeze({ kind: 'fire', out: 60, back: 220, m: 0.14, tilt: -2.5, overshoot: 1.02 }),
    hitPose: Object.freeze({ kind: 'rock', squash: null, tiltK: 1, knockK: 1 }),
    koPose: Object.freeze({ kind: 'dip', tilt: 10, drop: 0.08, ms: 200 }),
  }),
  // a creature or a person: it breathes, crouches, lunges with a stretch and a lean and lands with an overshoot,
  // squashes when struck and tips away to go down
  character: Object.freeze({
    ...SHARED,
    idle: Object.freeze({ kind: 'breath', scale: Object.freeze([1.0, 1.02]), ms: 2600 }),
    anticipation: Object.freeze({ kind: 'crouch', ms: 140, squash: Object.freeze([1.06, 0.92]), tilt: -4 }),
    attack: Object.freeze({ kind: 'lunge', m: 0.7, ms: 320, stretch: Object.freeze([0.96, 1.06]), tilt: 6, overshoot: -0.05, peak: 0.4 }),
    hitPose: Object.freeze({ kind: 'squash', squash: Object.freeze([1.08, 0.9]), tiltK: 0.6, knockK: 1 }),
    koPose: Object.freeze({ kind: 'tip', tilt: -14, drop: 0.1, ms: 200 }),
  }),
  // a thing in the air: it hovers (its shade breathing under it), rises, dives low and lunges, bobs when struck and
  // falls to the floor to go down
  floater: Object.freeze({
    ...SHARED,
    idle: Object.freeze({ kind: 'hover', m: Object.freeze([0.05, 0.07]), ms: Object.freeze([2200, 3400]), shade: Object.freeze([0.55, 0.45]) }),
    anticipation: Object.freeze({ kind: 'rise', ms: 140, rise: 0.08 }),
    attack: Object.freeze({ kind: 'dive', m: 0.6, ms: 300, low: 0.02, peak: 0.4 }),
    hitPose: Object.freeze({ kind: 'bob', bob: 0.06, tilt: 5, knockK: 0.5 }),
    koPose: Object.freeze({ kind: 'fall', ms: 200 }),
  }),
  // a sign, a letter, a sheet: it sways about its foot, leans back as its pieces gather, rises as it casts (its pieces
  // fly, never its body), tilts when struck, and tilts over to go down
  mark: Object.freeze({
    ...SHARED,
    idle: Object.freeze({ kind: 'sway', deg: 1.2, ms: 4000 }),
    anticipation: Object.freeze({ kind: 'lean', ms: 120, tilt: -3 }),
    attack: Object.freeze({ kind: 'cast', rise: 0.1, ms: 260, tilt: 2 }),
    hitPose: Object.freeze({ kind: 'tilt', tilt: Object.freeze([4, 8]), knockK: 0.35 }),
    koPose: Object.freeze({ kind: 'tilt', tilt: -10, drop: 0.04, ms: 200 }),
  }),
});

export const classOf = (id) => BODY_CLASS[id] ?? 'mark';
export const verbsOf = (id) => VERBS[classOf(id)];

/** A card's idle period and phase in team slot `i`, so the two figures on the floor never breathe in step. */
export const breathOf = (id, i) => {
  const v = verbsOf(id).idle, base = Array.isArray(v.ms) ? v.ms[(id.length + i) % 2] : v.ms;
  const spread = 0.9 + ((id.length * 7 + i * 3) % 7) / 30;
  return { period: Math.round(base * spread), at: -Math.round(((id.length * 13 + i * 5) % 30) / 30 * base * spread) };
};
/** The hit's tilt (degrees) and knock (metres) for a damage share, by the shared caps. */
export function hitSize(id, share) {
  const v = verbsOf(id), [t0, tk, tc] = v.hit.tilt, [k0, kk, kc] = v.hit.knock, s = Math.max(0, Math.min(1, share || 0));
  return { tilt: Math.min(tc, t0 + tk * s), knock: Math.min(kc, k0 + kk * s) };
}
