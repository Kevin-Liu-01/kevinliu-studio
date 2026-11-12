// The forms registry (ROUND6.md section 2.3): data only, keyed by card id. A card with an entry can change form (build)
// and level (upgrade) as engine rules through shared/rules.js; a card without one is untouched. Every entry passes
// `checkForms` (shared/rules.js): engine move keys only, slots 0..3, codes unique and frozen, names Title Case.
//
// Princeton TD stands the game's own seven towers (Kevin-Liu-01/Princeton-Tower-Defense@e76bdf8,
// src/app/constants/towers.ts and towerStats.ts). Slot 0 (key 1) is the tower's attack, slot 2 (key 3) its utility;
// slots 1 and 3 stay the card's own Wave Schedule and Boss Wave. Codes run in ring order (Infra, Agent, Data, Game,
// Shader, Type, Interface) so the Tower panel's keys 1-7 teach the ring. Codes are written into shared battle links
// (`b{code}`): never renumber one.
//
// Princeton TD's towers fire when they go up (`fires: true`, the game's own rule: a placed tower shoots). A build or an
// upgrade is still the fighter's command for the turn, but the stub the engine runs is the new tower's key-1 attack at
// that attack's priority, so the transform never costs a shot; an upgrade's shot carries the upgrade's Barrier 15%.
// Without it a transform that spends the whole turn loses: on the same pairings a never-building Princeton TD won
// 54.8% and an every-upgrade one 24.6% (the round 6 critic), and no level step inside the one-shot band paid for the
// lost turn (.work/r6/balance/: probe.mjs, rules-act.mjs, the sweeps).
//
// Tuned by tools/balance-forms.mjs (gate R7, every band at 24 opponents; evidence in .work/r6/balance/):
//   - Each tower has a niche on the ring where it beats the card's own Wave Schedule (Data, x1.2 at home) and Boss
//     Wave (Game, x1.2 at home): Cannon and Station the Agent cards, Club the Infra cards, Arch the Interface cards,
//     Library the Game cards, Mortar the Shader cards, and the Lab any foe that would knock Princeton TD out first:
//     its zaps keep priority +1, the tempo the card's own Missile Battery had. Each tower also carries what the
//     engine's CPU values beside damage (a stun, a drain, a Reach or Proof raise), so towers that share a niche split
//     it by the moment: Station while Princeton TD is healthy, Cannon once it is hurt.
//   - Level 1 sits near the card's own moves, so a counter tower reads about 10 points of foe HP above them, and the
//     towers knock out no more full-HP foes than Wave Schedule and Boss Wave already do (the one-shot band).
//   - Levels 2, 3 and 4 add about 12%, 25% and 40% to the Level 1 total (the home towers, Library and Mortar, about
//     6%, 12% and 18%, since their Level 1 already sits at the card's own power), with a growing effect: a stun or
//     Reach chance, a deeper drain, one more chain for the Lab. 4A and 4B split the last rung: damage or an effect.

const SRC = 'Princeton-Tower-Defense@e76bdf8:src/app/constants/';
const at = (line, file = 'towers.ts') => `${SRC}${file}:${line}`;
const hits = (n) => ({ min: n, max: n });

/** One tower attack; `x` carries the engine's optional keys (hits, effect, selfEffect, piercing, ...). */
const attack = (id, name, feature, discipline, power, accuracy, pp, receipt, x = {}) =>
  ({ id, name, feature, discipline, power, accuracy, pp, ...x, receipt });
/** A tower's utility (key 3): no damage, one self effect. */
const utility = (id, name, feature, discipline, selfEffect, pp, receipt) =>
  ({ id, name, feature, discipline, power: 0, accuracy: 1, pp, selfEffect: { chance: 1, ...selfEffect }, receipt });

/** Five rungs of one tower: [key 1, key 3] at Level 1, 2, 3, 4A and 4B; the utility stays the same move. */
const ladder = (l1, l2, l3, a, b, util) => ({ 1: [l1, util], 2: [l2, util], 3: [l3, util], '4a': [a, util], '4b': [b, util] });

const cannon = (() => {
  const d = 'Infra', x = { piercing: 0.5 };
  return ladder(
    attack('cannon-shot', 'Cannon Shot', 'One heavy shell that sees through half a Proof raise', d, 84, 0.95, 8, at(58), x),
    attack('improved-cannon', 'Improved Cannon', 'A larger caliber shell', d, 94, 0.95, 8, at(59), x),
    attack('heavy-cannon', 'Heavy Cannon', 'A stabilized barrel that does not miss', d, 105, 1, 8, at(60), x),
    attack('gatling-gun', 'Gatling Gun', 'Five rapid rounds a turn', d, 24, 0.9, 5, at(69), { hits: hits(5) }),
    attack('flamethrower', 'Flamethrower', 'A fire stream that burns half the time', d, 112, 1, 5, at(75), { effect: { type: 'burn', chance: 0.5 } }),
    utility('traverse', 'Traverse', 'The turret swings onto the next lane', d, { type: 'spdUp', amount: 1 }, 6, at(56)),
  );
})();

const station = (() => {
  const d = 'Agent', dig = (chance) => ({ selfEffect: { type: 'defUp', chance, amount: 1 } });
  return ladder(
    attack('foot-soldiers', 'Foot Soldiers', 'Two soldiers hold the road and may dig in', d, 38, 1, 8, at(204), { hits: hits(2), ...dig(0.3) }),
    attack('armored-troops', 'Armored Troops', 'Soldiers in armor, quicker to dig in', d, 43, 1, 8, at(205), { hits: hits(2), ...dig(0.35) }),
    attack('elite-guard', 'Elite Guard', 'Royal warriors with halberds', d, 48, 1, 8, at(206), { hits: hits(2), ...dig(0.4) }),
    attack('centaur-stables', 'Centaur Stables', 'Three half-horse warriors charge', d, 35, 1, 5, at(213), { hits: hits(3) }),
    attack('royal-cavalry', 'Royal Cavalry', 'Mounted knights that always dig in', d, 51, 1, 5, at(218), { hits: hits(2), ...dig(1) }),
    utility('dinky-guard', 'Dinky Guard', 'Troops hold the line at the station', d, { type: 'barrier', amount: 0.3 }, 6, at(201)),
  );
})();

const library = (() => {
  const d = 'Data', slow = (chance) => ({ hits: hits(2), effect: { type: 'stun', chance } });
  return ladder(
    attack('slowing-field', 'Slowing Field', 'A slowing field that can stun', d, 68, 1, 8, at(447, 'towerStats.ts'), slow(0.2)),
    attack('enhanced-slowing', 'Enhanced Slowing', 'A wider slowing field', d, 72, 1, 8, at(451, 'towerStats.ts'), slow(0.25)),
    attack('arcane-library', 'Arcane Library', 'A slowing field with magic damage', d, 76, 1, 8, at(456, 'towerStats.ts'), slow(0.3)),
    attack('eq-smasher', 'EQ Smasher', 'Seismic waves that damage and stun', d, 80, 1, 5, at(152), slow(0.35)),
    attack('blizzard', 'Blizzard', 'Three frozen gusts that can put a foe to sleep', d, 52, 1, 5, at(158), { hits: hits(3), effect: { type: 'sleep', chance: 0.3 } }),
    utility('quiet-hours', 'Quiet Hours', 'Ancient knowledge steadies the stacks', d, { type: 'defUp', amount: 1 }, 6, at(141)),
  );
})();

const mortar = (() => {
  const d = 'Game';
  return ladder(
    attack('field-mortar', 'Field Mortar', 'A quadpod barrel with iron sights', d, 130, 0.9, 8, at(172)),
    attack('siege-mortar', 'Siege Mortar', 'A shell feeder: two shells a turn', d, 69, 0.9, 8, at(173), { hits: hits(2) }),
    attack('grand-mortar', 'Grand Mortar', 'A digital rangefinder and an elevation screw', d, 72, 0.9, 8, at(174), { hits: hits(2) }),
    // the card's own Missile Battery, now where the game has it: the mortar's 4A branch
    attack('missile-battery', 'Missile Battery', 'A guided launcher rack that fires first', d, 146, 0.9, 5, at(183), { priority: 1 }),
    attack('ember-foundry', 'Ember Foundry', 'A triple-barrel revolver cannon that can burn', d, 50, 1, 5, at(189), { hits: hits(3), effect: { type: 'burn', chance: 0.3 } }),
    // the card's own Offscreen Layers, kept whole
    { id: 'offscreen-layers', name: 'Offscreen Layers', feature: 'The static map renders once to an offscreen canvas', discipline: 'Data', power: 0, accuracy: 1, pp: 10, selfEffect: { type: 'barrier', chance: 1, amount: 0.4 }, receipt: 'Princeton-Tower-Defense@e76bdf8:README.md:28' },
  );
})();

const lab = (() => {
  const d = 'Shader', fast = { priority: 1 };
  return ladder(
    attack('tesla-zapper', 'Tesla Zapper', 'Three quick bolts that strike first', d, 24, 1, 8, at(114), { ...fast, hits: hits(3) }),
    attack('enhanced-zapper', 'Enhanced Zapper', 'Four quick bolts that strike first', d, 20, 1, 8, at(115), { ...fast, hits: hits(4) }),
    attack('tesla-coil', 'Tesla Coil', 'Five quick bolts that strike first', d, 17, 1, 8, at(116), { ...fast, hits: hits(5) }),
    attack('focused-beam', 'Focused Beam', 'A held beam that finishes a foe under 35%', d, 97, 1, 5, at(125), { executeThreshold: 0.35 }),
    attack('chain-lightning', 'Chain Lightning', 'Seven quick bolts that strike first', d, 13, 1, 5, at(131), { ...fast, hits: hits(7) }),
    utility('capacitor', 'Capacitor', 'The coil charges its next strike', d, { type: 'critUp', amount: 0.25 }, 6, at(112)),
  );
})();

const arch = (() => {
  const d = 'Type', rise = (chance) => ({ selfEffect: { type: 'atkUp', chance, amount: 1 } });
  return ladder(
    attack('crescendo', 'Crescendo', 'Two notes that build toward a Reach raise', d, 45, 1, 8, at(29), { hits: hits(2), ...rise(0.4) }),
    attack('resonance', 'Resonance', 'Louder notes, likelier to raise Reach', d, 51, 1, 8, at(30), { hits: hits(2), ...rise(0.45) }),
    attack('forte', 'Forte', 'Full voice: a Reach raise half the time', d, 57, 1, 8, at(31), { hits: hits(2), ...rise(0.5) }),
    attack('shockwave-siren', 'Shockwave Siren', 'A crescendo that can stun', d, 63, 1, 5, at(40), { hits: hits(2), effect: { type: 'stun', chance: 0.35 } }),
    attack('symphony-hall', 'Symphony Hall', 'Three voices and a Reach raise most turns', d, 40, 1, 5, at(46), { hits: hits(3), ...rise(0.6) }),
    utility('tuning', 'Tuning', 'The bells find their pitch', d, { type: 'atkUp', amount: 1 }, 6, at(27)),
  );
})();

const club = (() => {
  const d = 'Interface', drain = (amount) => ({ selfEffect: { type: 'drain', chance: 1, amount } });
  return ladder(
    attack('club-dues', 'Club Dues', 'Dues that pay back 30% of the damage', d, 32, 1, 8, at(87), { hits: hits(3), ...drain(0.3) }),
    attack('popular-dues', 'Popular Dues', 'Dues that pay back 40% of the damage', d, 36, 1, 8, at(88), { hits: hits(3), ...drain(0.4) }),
    attack('grand-dues', 'Grand Dues', 'Dues that pay back half the damage', d, 40, 1, 8, at(89), { hits: hits(3), ...drain(0.5) }),
    attack('investment-bank', 'Investment Bank', 'Returns that pay back 60% of the damage', d, 45, 1, 5, at(98), { hits: hits(3), ...drain(0.6) }),
    attack('recruitment-center', 'Recruitment Center', 'New members raise Reach half the time', d, 43, 1, 5, at(103), { hits: hits(3), selfEffect: { type: 'atkUp', chance: 0.5, amount: 1 } }),
    utility('paw-points', 'Paw Points', 'Generates Paw Points over time', d, { type: 'heal', amount: 70 }, 4, at(85)),
  );
})();

export const FORMS = {
  'princeton-td': {
    v: 1,
    start: { form: 'lab', level: 1 },
    slots: [0, 2],
    upgrades: 3,
    rest: 1,
    ladder: [1, 2, 3, ['4a', '4b']],
    upgradeBarrier: 0.15,
    fires: true,
    art: { kind: 'ptd-sprite' },
    // section 2.5 with towers that fire: floors at 0, since a transform no longer costs a shot. A build clears 0 (theta);
    // an upgrade's bar is -41.3 at any HP and past Level 2 -1000, and a tie between 4A and 4B goes to 4B. Since fixes-2 I2
    // the CPU never trades a knockout in hand for a tower whose own shot falls short, which costs a tower turn where it
    // bites; the bars were swept for it (.work/r6/balance/fix2): Level 4 shows in 10.1% of Princeton TD matches at 24
    // opponents, builds in 55.4%, every section 2.6 band passing (fixes-1 I8 had theta 6, hpFloor 0.1, upgradeTheta -25)
    cpu: { theta: 0, horizon: 3, hpFloor: 0, upgradeHpFloor: 0, effects: 1, upgradeTheta: -41.3, growTheta: -1000, branchB: 1 },
    forms: {
      cannon: { code: 1, name: 'Nassau Cannon', role: 'Heavy Artillery', accent: '#f87171', discipline: 'Infra', art: { type: 'cannon' }, moves: cannon },
      station: { code: 2, name: 'Dinky Station', role: 'Troop Spawner', accent: '#a78bfa', discipline: 'Agent', art: { type: 'station' }, moves: station },
      library: { code: 3, name: 'Firestone Library', role: 'Crowd Control', accent: '#67e8f9', discipline: 'Data', art: { type: 'library' }, moves: library },
      mortar: { code: 4, name: 'Palmer Mortar', role: 'Siege AoE', accent: '#fb923c', discipline: 'Game', art: { type: 'mortar' }, moves: mortar },
      lab: { code: 5, name: 'E-Quad Lab', role: 'Lightning Damage', accent: '#facc15', discipline: 'Shader', art: { type: 'lab' }, moves: lab },
      arch: { code: 6, name: 'Blair Arch', role: 'Multi-Target', accent: '#60a5fa', discipline: 'Type', art: { type: 'arch' }, moves: arch },
      club: { code: 7, name: 'Eating Club', role: 'Economy', accent: '#f59e0b', discipline: 'Interface', art: { type: 'club' }, moves: club },
    },
  },
};
