// Every interface string the battle writes at run time, keyed, with {placeholder} templates: the turn tab, plates,
// console, panels, tooltips, damage previews, the log, the live region, the result, the Tower panel, the boards' stamps
// and labels, and the kit's own scene words (Miss, KO, Guard, a condition, the result). Card titles, move names and
// features, trait names and rules, item names, tower names and trainer names are not here: the engine knows moves by
// name, and those come from the cards.
//
// A page translates the battle by setting `globalThis.BATTLE_STRINGS` (the same keys, any subset) before the battle's
// modules load; a key it leaves out falls back to EN, so English output is byte for byte what it was. Plurals read the
// count's category for `document.documentElement.lang` (Intl.PluralRules): the page's `<key>.<category>`, then its
// `<key>.other`, then English's. Lists go through Intl.ListFormat (unit, short: "a, b, c" in English).
// Trainer titles and quotes stay in media/trainers/roster.json; a page translates them with
// `leader.<id>.title` and `leader.<id>.quote.<key>` (tools/strings-export.mjs writes them into the full English table).
// No DOM at import: Node reads EN too (tools/strings-export.mjs).

export const EN = {
  // the tab's title (battle.js keeps its TITLES line, which the site rewrites; a page's override wins over both)
  'title.mat': 'Card Mat',
  'title.arena': 'Arena',

  // words used everywhere
  'side.you': 'You',
  'side.rival': 'Rival',
  'stat.atk': 'Reach',
  'stat.def': 'Proof',
  'stat.spd': 'Pace',
  'stat.stage': '{stat} {n}',
  'level': 'Level {n}',
  'range': '{lo} to {hi}',
  'range.short': '{lo}-{hi}',
  'power.none': '0',
  'pct': '{n}%',
  'hp.aria': '{hp} of {max} HP',
  'hp.short': '{hp}/{max} HP',
  'form.aria': '{name}, {level}',
  'ring.up': 'Strong',
  'ring.down': 'Resisted',
  'ring.even': 'Even',
  'discipline.Infra': 'Infra',
  'discipline.Agent': 'Agent',
  'discipline.Data': 'Data',
  'discipline.Game': 'Game',
  'discipline.Shader': 'Shader',
  'discipline.Type': 'Type',
  'discipline.Interface': 'Interface',
  'discipline.Neutral': 'Neutral',

  // the four conditions: their name, the plate's short, mid-sentence, the rule
  'status.burn': 'Burn',
  'status.burn.short': 'BRN',
  'status.burn.lower': 'burn',
  'status.burn.text': 'Loses 6% of its HP at the end of each turn and its Reach drops to ×0.82, for three turns.',
  'status.poison': 'Poison',
  'status.poison.short': 'PSN',
  'status.poison.lower': 'poison',
  'status.poison.text': 'Loses 8.5% of its HP at the end of each turn, for three turns.',
  'status.sleep': 'Sleep',
  'status.sleep.short': 'SLP',
  'status.sleep.lower': 'sleep',
  'status.sleep.text': 'Skips its next move, then wakes on the one after.',
  'status.stun': 'Stun',
  'status.stun.short': 'STN',
  'status.stun.lower': 'stun',
  'status.stun.text': 'For its next three moves, each has a 1 in 4 chance of not happening.',

  // the Kit's items, in full (their names and the engine's short chips stay the engine's)
  'item.code-snippet': 'Restores 20 HP to one of your cards.',
  'item.api-key': 'Restores 50 HP to one of your cards.',
  'item.server-patch': 'Restores 150 HP to one of your cards.',
  'item.system-restore': 'Restores one of your cards to full HP.',
  'item.debugger': 'Clears burn, poison, sleep or stun from one of your cards.',
  'item.overclock': 'Raises one card’s Reach two stages (from even, ×2 damage), up to +3.',
  'item.firewall': 'Raises one card’s Proof two stages (from even, ×2 toughness), up to +3.',
  'item.turbo-mode': 'Raises one card’s Pace two stages (from even, ×2 speed), up to +3.',
  'item.rollback': 'Brings one knocked-out card back with half its HP.',
  'item.used': '{name}, used',
  'item.notNeeded': '{name}, not needed now',

  // the engine's short words, as the Kit, the log and the scenes print them
  'engine.hpUp': '+{n} HP',
  'engine.hpDown': '−{n} HP',
  'engine.hp': '{n} HP',
  'engine.fullHp': 'Full HP',
  'engine.cure': 'Cure',
  'engine.cured': 'Cured',
  'engine.revive': 'Revive {n}%',
  'engine.critUp': 'Crit Up',
  'engine.stat': '{stat} +{n}',
  'engine.hits': '{n} Hits',

  // the kit's scene words
  'scene.miss': 'Miss',
  'scene.ko': 'KO',
  'scene.guard': 'Guard',

  // the turn tab
  'turn.word': 'Turn ',
  'turn.t': 'T',
  'turn.short': 'T{n}',
  'turn.yourMove': 'Your move',
  'turn.playing': 'Playing the turn',
  'turn.sendIn': 'Send in a card',
  'turn.first.you': 'You act first',
  'turn.first.rival': 'Rival acts first',
  'turn.first.tie': 'Speed tie',
  'turn.first.you.short': 'You first',
  'turn.first.rival.short': 'Rival first',
  'turn.first.tie.short': 'Tie',
  'turn.first.you.pace': 'You first on Pace',
  'turn.first.rival.pace': 'Rival first on Pace',
  'turn.first.tie.pace': 'Tie on Pace',
  'turn.pace': 'Pace: {pair}',
  'turn.priority': 'Priority {n}',
  'turn.pace.youFirst': 'you {you}, rival {rival}',
  'turn.pace.rivalFirst': 'rival {rival}, you {you}',

  // the plates
  'plate.aria.you': 'Your card in play',
  'plate.aria.rival': 'Rival card in play',
  'plate.trait': 'Trait',
  'plate.seen': 'Seen',
  'plate.seen.none': 'no moves yet',
  'kit.word': 'Kit',
  'kit.aria.you': 'Kit: {n} of {all} items left',
  'kit.aria.rival': 'Rival\'s Kit: {n} of {all} items left',

  // the console: move keys (their label), panels, the Kit
  'move.aria': '{name}, {discipline}, {stats}{ring}{share}. {about}',
  'move.aria.power': '{n} power',
  'move.aria.accuracy': '{n}%',
  'move.aria.pp': '{n} of {max} PP',
  'move.aria.ring': ', times {m} against {foe}',
  'move.aria.share': ', {n} percent of its HP',
  'flag.prio': 'Prio {n}',
  'chip.prio': '» {n}',
  'flag.crit': 'Crit {n}%',
  'flag.pierce': 'Pierce',
  'short.stat': '{stat} +{n}',
  'short.critUp': 'Crit up',
  'short.barrier': 'Barrier {n}%',
  'short.heal': 'Heal {n}',
  'short.drain': 'Drain',
  'short.recoil': 'Recoil',
  'aim.ko': 'KO',
  'aim.ko.maybe': 'KO?',
  'bench.deals': 'deals',
  'bench.takes': 'takes',
  'panel.kit': 'Kit',
  'panel.kitOn': '{item} on',
  'panel.sendIn': 'Send In',
  'panel.switch': 'Switch',
  'panel.close': 'Close',
  'panel.kitUses.one': '{n} of 2 uses left this battle. Items act before moves.',
  'panel.kitUses.other': '{n} of 2 uses left this battle. Items act before moves.',
  'kit.none': 'Nothing in the Kit helps a card right now.',
  'kit.rest': '{n} not needed now',
  'speed.key': '{n}×',
  'speed.aria': 'Speed {n} times',
  'say.quote': '{name}: {text}',
  'say.move': '{name}: {about} {rule}',
  'leader.nameTitle': '{name}, {title}',

  // tooltips
  'tip.attack': 'Attack',
  'tip.support': 'Support',
  'tip.power': 'power',
  'tip.toHit': 'to hit',
  'tip.toHit.trait': 'to hit, {trait}',
  'tip.pp': 'PP',
  'tip.vs': '{ring} vs {card}',
  'tip.home': 'Home discipline',
  'tip.damage': '{dmg} damage, {pct} of {card}\'s HP',
  'tip.ko.sure': 'Knocks out',
  'tip.ko.ifHits': 'Knocks out if it hits',
  'tip.ko.maybe': 'May knock out',
  'tip.relaunch': 'Relaunch leaves it at 1 HP',
  'tip.priority': 'Priority {n}',
  'tip.hits.one': '{n} hits',
  'tip.hits.other': '{n} hits',
  'tip.effect': '{status} {n}%',
  'tip.critical': 'Critical {n}%',
  'tip.pierces': 'Pierces {n}% of barrier',
  'tip.execute': '×1.3 under {n}% HP',
  'tip.adapts': 'Takes its card\'s better discipline',
  'tip.axis': 'Weight axis {min} to {max}',
  'self.chance': ' {n}%',
  'self.stat': '{stat} +{n}{chance}',
  'self.critical': 'Critical +{n}%{chance}',
  'self.crit': 'Crit +{n}%{chance}',
  'self.barrier': 'Barrier {n}%{chance}',
  'self.heals': 'Heals {n} HP{chance}',
  'self.drains': 'Drains {n}% of damage{chance}',
  'self.drainsShort': 'Drains {n}%{chance}',
  'self.recoil': 'Recoil {n}% of damage',
  'tip.disc.attacks': 'Its attacks: {up} {down}',
  'tip.disc.hits': 'Hits on it: {up} {down}',
  'tip.disc.on': 'on {d}',
  'tip.disc.from': 'from {d}',
  'tip.disc.note': 'A card\'s own discipline adds ×1.2 to its moves of that discipline.',
  'tip.stage': '{what}: {m}. Stages run from −3 (×0.4) to +3 (×2.5).',
  'tip.stage.atk': 'Its damage',
  'tip.stage.def': 'Damage it takes is divided by this',
  'tip.stage.spd': 'Its turn order',
  'tip.stat': '{what} No stage change; stages run from −3 (×0.4) to +3 (×2.5).',
  'tip.stat.atk': 'Reach: how hard its moves hit.',
  'tip.stat.def': 'Proof: how much damage it shrugs off.',
  'tip.stat.spd': 'Pace: who moves first.',
  'tip.barrier.head': 'Barrier {n}%',
  'tip.barrier': 'The next hit on this card loses {n}% of its damage, then the barrier is gone.',
  'tip.crit.head': 'Critical +{n}%',
  'tip.crit': 'Its next move is {n} points likelier to be critical (×1.5), up to 80%. Most moves start at 8%.',
  'tip.item.note': 'Acts before any move, and uses the turn. Each item can be used once.',
  'tip.kit.one': '{n} of {all} items left this battle. Each item can be used once, and using one takes the turn.',
  'tip.kit.other': '{n} of {all} items left this battle. Each item can be used once, and using one takes the turn.',
  'tip.bench.best': 'Best move into {card}: {chip}',
  'tip.order.head': 'Turn order',
  'tip.order.pace': 'Pace now: {you} {youN}, {rival} {rivalN}',
  'tip.order': 'The faster card\'s move goes first. Switching and items go before any move, Guard next, then a move with priority.',
  'tip.speed.head': 'Battle speed',
  'tip.speed': 'How fast scenes play. Space, Enter or a tap skips to the hit, a second press to the end.',

  // chips on the plates, the log, the board's numbers and the post chips
  'chip.finisher': 'Finisher',
  'chip.home': 'Home',
  'chip.critical': 'Critical',
  'chip.crit': 'crit',
  'chip.hits.one': 'hits',
  'chip.hits.other': 'hits',
  'chip.hits.n.one': '{n} hits',
  'chip.hits.n.other': '{n} hits',
  'chip.barrier': 'Barrier',
  'chip.barrierPct': 'Barrier {n}%',
  'chip.critPct': 'Crit +{n}%',
  'chip.guard': 'Guard',
  'chip.blocked': 'blocked',
  'chip.guardTurn': 'damage this turn',
  'chip.out': 'Out',
  'chip.hpUp': '+{n} HP',
  'chip.hpDown': '−{n} HP',
  'chip.stage': '{stat} {n} {m}',
  'chip.more.one': '+{n} more',
  'chip.more.other': '+{n} more',
  'chip.status.burn': 'Burn',
  'chip.status.poison': 'Poison',
  'chip.status.sleep': 'Sleep',
  'chip.status.stun': 'Stunned',
  'chip.cond.burn': 'Burn',
  'chip.cond.poison': 'Poison',
  'chip.cond.sleep': 'Asleep',
  'chip.cond.stun': 'Stunned',
  'stamp.burn': 'burn',
  'stamp.poison': 'poison',
  'stamp.sleep': 'sleep',
  'stamp.stun': 'Stunned',

  // the battle log
  'log.title': 'Battle log',
  'log.lineups': 'Lineups',
  'log.turn': 'Turn {n}',
  'log.yours': 'Your {card}',
  'log.rivals': 'Rival’s {card}',
  'log.move': '{side}{card} uses {move}',
  'log.hit': '{target} takes {damage} {share}',
  'log.hit.out': '{target} takes {damage} {share} and is out',
  'log.miss': '{move} misses {target} {chance}',
  'log.miss.chance': '({n}% to hit)',
  'log.status.applied': '{who} is hit with {status}',
  'log.status.tick': '{who} loses {damage} to {name}',
  'log.status.asleep': '{who} is asleep and skips its move',
  'log.status.stunned': '{who} is stunned and loses its move',
  'log.status.cleared': '{who} is clear of {name}',
  'log.heal': '{who} recovers {n} HP',
  'log.drain': '{who} drains {n} HP',
  'log.recoil': '{who} takes {n} recoil',
  'log.barrier': '{who} raises a barrier {chip}',
  'log.critUp': '{who} lines up a critical {chip}',
  'log.stat': '{who}: {stat} rises to {chip}',
  'log.switch.lead': '{side}{card} leads',
  'log.switch.sentIn': '{side}{card} is sent in',
  'log.switch.in': '{side}{card} switches in',
  'log.guard': '{who} guards {chip}',
  'log.item': '{side}{item} on {target} {detail}',
  'log.ko': '{who} is out',
  'log.result.one': '{result} in {n} turns',
  'log.result.other': '{result} in {n} turns',
  'log.trait': '{trait} · {who} {does}',
  'log.trait.perRuleCap': 'takes at most {n} from one hit',
  'log.trait.deterministic': 'never misses',
  'log.trait.seeded': 'has no damage spread',
  'log.trait.preloaded': 'moves first (priority +1)',
  'log.trait.cached': 'moves first (priority +1)',
  'log.trait.relaunch': 'holds on at 1 HP',
  'log.trait.hiddenGrader': 'ignores barrier and raised Proof',
  'log.trait.upset': 'hits up a class ({d})',
  'log.trait.variable': 'sets its weight ({d})',
  'log.trait.immune': 'shrugs the condition off',
  'log.build': '{who} builds {tower}',
  'log.upgrade': '{who} upgrades {tower} to {level}',
  'log.upgrade.branch': '{who} upgrades {tower} to {move}, {level}',
  'receipt.scale': 'scale',
  'receipt.home': 'home',
  'receipt.ring': 'ring',
  'receipt.finisher': 'finisher',
  'receipt.upset': 'upset',
  'receipt.compounding': 'compounding',
  'receipt.spread': 'spread',
  'receipt.critical': 'critical',
  'receipt.hits': 'hits',
  'receipt.barrier': 'barrier',
  'receipt.guard': 'guard',
  'receipt.relaunch': 'relaunch',
  'receipt.capped': 'capped at half HP',

  // the live region (screen readers)
  'live.hit': '{move}, {damage} to {target}.',
  'live.miss': '{move} missed.',
  'live.switch.you': '{card} in for you.',
  'live.switch.rival': '{card} in for the rival.',
  'live.out': '{card} is out.',

  // a battle that cannot start (the address or a boot file), kept on screen
  'boot.failed': 'The battle could not start ({reason}). Reload the page, or Leave.',
  'boot.retryHand': 'Playing this hand from its start.',
  'boot.retryDefault': 'Playing the default hand.',

  // the result
  'result.victory': 'Victory',
  'result.defeat': 'Defeat',
  'result.draw': 'Draw',
  'result.summary.one': '{turns} turns   {rivalOut} of 3 rival cards out   {yoursOut} of 3 yours out',
  'result.summary.other': '{turns} turns   {rivalOut} of 3 rival cards out   {yoursOut} of 3 yours out',
  'result.rematch': 'Rematch',
  'result.newRival': 'New Rival',
  'result.watchReplay': 'Watch Replay',
  'result.leave': 'Leave',

  // the order strip's verbs (a priority action in place of its card) and the actor tag's
  'verb.switch': 'Switch',
  'verb.kit': 'Kit',
  'verb.build': 'Build',
  'verb.upgrade': 'Upgrade',
  'verb.guard': 'Guard',

  // the boards
  'mat.aria': 'Card mat',
  'mat.switchTo': 'Switch to {card}',
  'mat.out.one': '{n} out',
  'mat.out.other': '{n} out',
  'arena.aria': 'Arena',
  'arena.card': '{card}, {hp} of {max} HP',
  'arena.card.out': '{card}, {hp} of {max} HP, out',
  'arena.card.active': '{card}, {hp} of {max} HP, in play',

  // towers (a form card's Tower key, panel, tooltips and chips); the tower names stay the game's
  'tower.key': 'Tower',
  'tower.key.aria.one': 'Tower: {name}, {level}. {n} of {all} upgrades left. Opens Build and Upgrade.{why}',
  'tower.key.aria.other': 'Tower: {name}, {level}. {n} of {all} upgrades left. Opens Build and Upgrade.{why}',
  'tower.key.why': ' {why}.',
  'tower.panel': 'Towers',
  'tower.left.one': '{n} of {all} upgrades left',
  'tower.left.other': '{n} of {all} upgrades left',
  'tower.buildGroup': 'Build a tower',
  'tower.new': 'New',
  'tower.newAt': 'New, {level}',
  'tower.standingAt': 'Standing, {level}',
  'tower.builtAt': 'Built before, {level}',
  'tower.upgradeTo': 'Upgrade to {level}',
  'tower.power': '{n} Power',
  'tower.finisher': 'Finisher under {n}%',
  'tower.pierces': 'Pierces {n}%',
  'tower.now': 'Now',
  'tower.next': 'Next',
  'tower.barrierUp': 'Barrier {n}% as it goes up',
  'tower.upgradesLeft.one': '{n} upgrades left.',
  'tower.upgradesLeft.other': '{n} upgrades left.',
  'tower.bestHit': 'Best hit on {card}: {pct} of its HP',
  'tower.k1Hit': '{move}: {pct} of {card}\'s HP',
  'tower.bestAll': 'Best of all four: {pct}',
  'tower.gain.hits.one': '{move} {n} hits',
  'tower.gain.hits.other': '{move} {n} hits',
  'tower.gain.power': '{move} {n} Power',
  'tower.tile.aria': '{name}, {level}{mult}{hit}{why}',
  'tower.tile.mult': ', times {m}',
  'tower.tile.hit': ', {move} {n}% of the foe\'s HP',
  'tower.tile.why': '. {why}',
  'tower.itsAttack': 'its attack',
  'tower.rule': 'Building or upgrading goes first and takes your turn.',
  'tower.rule.first': 'Goes first and takes your turn.',
  'tower.rule.fires': 'A tower fires as it goes up. Building or upgrading takes your turn.',
  'tower.rule.firesFirst': 'Goes up and fires {move} first. Takes your turn.',
  'tower.rule.firesInOrder': 'Goes up and fires {move} in speed order. Takes your turn.',
  'tower.rule.firesAt': 'Goes up and fires {move} at Priority {n}. Takes your turn.',
  'tower.role.cannon': 'Heavy Artillery',
  'tower.role.station': 'Troop Spawner',
  'tower.role.library': 'Crowd Control',
  'tower.role.mortar': 'Siege AoE',
  'tower.role.lab': 'Lightning Damage',
  'tower.role.arch': 'Multi-Target',
  'tower.role.club': 'Economy',

  // why a tower command is refused (the rules give these in English; reason() maps them here)
  'reason.notNow': 'Not now',
  'reason.asleep': 'Asleep',
  'reason.stunned': 'Stunned',
  'reason.builtLastTurn': 'Built last turn',
  'reason.unknownTower': 'Unknown tower',
  'reason.standing': 'Standing',
  'reason.noPp': 'No PP left',
  'reason.noUpgrades': 'No upgrades left',
  'reason.highest': 'Highest level',
  'reason.unknownBranch': 'Unknown branch',
  'reason.chooseBranch': 'Choose 4A or 4B',
  'reason.branchesAt3': 'Branches open at Level 3',
  'reason.over': 'The battle is over',
  'reason.replaceFirst': 'Choose a replacement first',
  'reason.noTowers': 'No towers in this battle',
};

/** The rules' English refusals (without a full stop) and their keys. */
const REASONS = {
  'Not now': 'reason.notNow', Asleep: 'reason.asleep', Stunned: 'reason.stunned', 'Built last turn': 'reason.builtLastTurn',
  'Unknown tower': 'reason.unknownTower', Standing: 'reason.standing', 'No PP left': 'reason.noPp', 'No upgrades left': 'reason.noUpgrades',
  'Highest level': 'reason.highest', 'Unknown branch': 'reason.unknownBranch', 'Choose 4A or 4B': 'reason.chooseBranch',
  'Branches open at Level 3': 'reason.branchesAt3', 'The battle is over': 'reason.over', 'Choose a replacement first': 'reason.replaceFirst',
  'No towers in this battle': 'reason.noTowers',
};

// ============================================================ lookup
const page = () => globalThis.BATTLE_STRINGS;
const has = (o, k) => o !== null && typeof o === 'object' && Object.hasOwn(o, k) && typeof o[k] === 'string';
/** The page's string for a key, when it gives one. */
export const override = (key) => { const o = page(); return has(o, key) ? o[key] : undefined; };
/** The page's language (the battle page's `<html lang>`), for plurals and lists. */
export const lang = () => globalThis.document?.documentElement?.lang || 'en';
const cache = new Map();
const intl = (kind, l, o) => {
  const k = `${kind}|${l}`;
  if (!cache.has(k)) { try { cache.set(k, new Intl[kind](l, o)); } catch { cache.set(k, kind === 'PluralRules' ? new Intl.PluralRules('en') : null); } }
  return cache.get(k);
};
/** A template for a key: the page's, else English; with a count, its plural form (page first, English after). */
function template(key, count) {
  const o = page();
  if (count === undefined || count === null) return has(o, key) ? o[key] : has(EN, key) ? EN[key] : undefined;
  const n = Number(count);
  const c = intl('PluralRules', lang()).select(n), e = intl('PluralRules', 'en').select(n);
  for (const k of [`${key}.${c}`, `${key}.other`, key]) if (has(o, k)) return o[k];
  for (const k of [`${key}.${e}`, `${key}.other`, key]) if (has(EN, k)) return EN[k];
  return undefined;
}
const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** A string by key, its {placeholders} filled from `vars` (a count fills {n} unless `vars` gives one). `html` escapes
 *  the template's own text and inserts the values as they are (markup the caller built). A key nobody has is ''. */
export function t(key, vars, count, html = false) {
  const s = template(key, count);
  if (s === undefined) return '';
  const v = count !== undefined && count !== null && !(vars && 'n' in vars) ? { ...vars, n: count } : vars;
  const parts = s.split(/(\{\w+\})/);
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i % 2) { const k = p.slice(1, -1); out += v && k in v && v[k] !== undefined && v[k] !== null ? String(v[k]) : html ? escHtml(p) : p; }
    else out += html ? escHtml(p) : p;
  }
  return out;
}
/** A named thing the engine keys by its English word (a discipline): the page's word, else English, else the word. */
export function word(group, raw) { const k = `${group}.${raw}`; const s = template(k); return s === undefined ? raw : s; }
/** A list as the page's language joins it ("a, b, c" in English). */
export function list(items) {
  const a = items.map(String);
  const f = typeof Intl.ListFormat === 'function' ? intl('ListFormat', lang(), { type: 'unit', style: 'short' }) : null;
  return f ? f.format(a) : a.join(', ');
}
/** A refusal the rules wrote in English, in the page's words (an unknown one stays as it is). */
export const reason = (english) => (Object.hasOwn(REASONS, english) ? t(REASONS[english]) : english);
/** A tower's role ("Heavy Artillery") in the page's words, else the registry's own (EN lists them for a translator). */
export const role = (form, english) => override(`tower.role.${form}`) ?? english;
/** The rules' transform label ('New', 'Level 4A') in the page's words. */
export const ruleLabel = (label) => {
  const s = String(label ?? '');
  if (s === 'New') return t('tower.new');
  const m = /^Level\s*(\S+)$/i.exec(s);
  return m ? t('level', { n: m[1].toUpperCase() }) : s;
};
/** The engine's short words (an item's chip, an item's or a trait's detail, a support label) in the page's words.
 *  Anything it does not know (a multiplier, a weight) stays as the engine wrote it. Read after plan.js words(), so a
 *  stat already reads Reach, Proof or Pace (or the page's own words for them). */
export function engineWords(text) {
  const s = String(text ?? '');
  let m;
  if ((m = /^\+(\d+) HP$/.exec(s))) return t('engine.hpUp', { n: m[1] });
  if ((m = /^−(\d+) HP$/.exec(s))) return t('engine.hpDown', { n: m[1] });
  if ((m = /^(\d+) HP$/.exec(s))) return t('engine.hp', { n: m[1] });
  if ((m = /^Revive (\d+)%$/.exec(s))) return t('engine.revive', { n: m[1] });
  if ((m = /^(\d+) Hits$/.exec(s))) return t('engine.hits', { n: m[1] });
  if ((m = /^Priority \+(\d+)$/.exec(s))) return t('tip.priority', { n: `+${m[1]}` });
  const fixed = { 'Full HP': 'engine.fullHp', Cure: 'engine.cure', Cured: 'engine.cured', 'Crit Up': 'engine.critUp', Barrier: 'chip.barrier' }[s];
  if (fixed) return t(fixed);
  const stats = { Reach: 'atk', Proof: 'def', Pace: 'spd', [t('stat.atk')]: 'atk', [t('stat.def')]: 'def', [t('stat.spd')]: 'spd' };
  if ((m = /^(.+) \+(\d+)$/.exec(s)) && Object.hasOwn(stats, m[1])) return t('engine.stat', { stat: t(`stat.${stats[m[1]]}`), n: m[2] });
  return s;
}
/** The kit's scene words on a shot's scene, in place (battle.js calls it at 'plan', after the plan and the verbs have
 *  read them): Miss and KO, a support's label, Guard, a condition's name and tick, the result's title. A transform's
 *  label stays the rules' English (beats.js reads it; runtime.js shows it through ruleLabel). */
export function sceneWords(s) {
  if (!s || s.kind === 'transform') return s;
  const label = typeof s.label === 'string' ? s.label : null;
  if (label && !/^\d+$/.test(label)) s.label = label === 'Miss' ? t('scene.miss') : label === 'KO' ? t('scene.ko') : engineWords(label);
  if (s.kind === 'guard' && s.title === 'Guard') s.title = t('scene.guard');
  else if (s.kind === 'status' && typeof s.title === 'string' && has(EN, `status.${s.title.toLowerCase()}`) && EN[`status.${s.title.toLowerCase()}`] === s.title) s.title = t(`status.${s.title.toLowerCase()}`);
  else if (s.kind === 'result') s.title = { Victory: t('result.victory'), Defeat: t('result.defeat'), Draw: t('result.draw') }[s.title] ?? s.title;
  return s;
}
/** A trainer's title and quotes in the page's words (`leader.<id>.title`, `leader.<id>.quote.<key>`). */
export function leaderWords(tr) {
  const o = page();
  if (!o || !tr?.id) return tr;
  const quotes = {};
  for (const [k, v] of Object.entries(tr.quotes ?? {})) quotes[k] = override(`leader.${tr.id}.quote.${k}`) ?? v;
  return { ...tr, title: override(`leader.${tr.id}.title`) ?? tr.title, quotes };
}
