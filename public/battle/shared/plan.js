// The shot plan, one for both modes, and the one store of what has been seen. scenesFrom picks each shot's variant
// (full on a move's first use this visit, short on a repeat or under Auto, minor beats once); the plan then says which
// shots the board carries alone, which play full anyway, and which reduced-motion stills are worth holding.
import { t as txt, list as listOf, role } from './strings.js';
import { FORMS } from './forms.js';
const STATWORD = { get ATK() { return txt('stat.atk'); }, get DEF() { return txt('stat.def'); }, get SPD() { return txt('stat.spd'); } };
/** The battle's shorts say ATK, DEF and SPD; the cards say Reach, Proof and Pace. */
export const words = (s) => String(s ?? '').replace(/\b(ATK|DEF|SPD)\b/g, (m) => STATWORD[m]);
export { STATWORD };

const ON_BOARD = new Set(['ko', 'item', 'trait', 'status', 'guard']);
const SPECIAL = new Set(['claude-of-tanks', 'jarhead', 'katagami']);

/** What the battle has shown: this visit's first uses (`session`, per tab), and this battle's minor beats, specials and
 *  stills, kept per battle so a reload resumes without playing a first-time scene twice. A mode switch changes none. */
export function createStore() {
  const get = (k) => { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
  const put = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* memory only */ } };
  const store = { session: new Set(get('battle-seen') ?? []), seen: new Set(), special: new Set(), minor: new Set(), uses: new Map(), key: '' };
  store.begin = (key, resume) => {
    store.key = `battle-beats:${key}`;
    const b = resume ? get(store.key) : null;
    store.seen = new Set(b?.seen ?? []); store.special = new Set(b?.special ?? []); store.minor = new Set(b?.minor ?? []);
    store.uses = new Map(Object.entries(b?.uses ?? {}));
  };
  store.keep = () => {
    put('battle-seen', [...store.session]);
    if (store.key) put(store.key, { seen: [...store.seen], special: [...store.special], minor: [...store.minor], uses: Object.fromEntries(store.uses) });
  };
  return store;
}

/** A side is out when every card on it is. */
const ends = (shot) => shot.post.some((e) => e.state && Object.values(e.state.sides).some((side) => side.team.every((f) => f.hp <= 0)));

/** Under Auto the minor beats, knockouts and send-ins play on the board alone (420 ms or less). A trait is always
 *  stamped on its card, never a scene of its own, so it never holds back the attack it comes with. The three cards
 *  with board specials play their first attack of the battle full even under Auto, staged from the board. Repeats
 *  vary: a move's second use in a battle plays its short scene framed again, and from its third use it is a cut on the
 *  board alone (its name stamped on the card or the flag, 500 ms or less). The blow that decides the match is never
 *  cut: it takes the finish (a hit-stop on the lethal contact), its knockout plays full even under Auto, and the
 *  result is staged from the board.
 *  Reduced motion keeps the same plan with stills in place of scenes, so it keeps the same pace: a minor beat's still
 *  shows once by hand and never under Auto, knockouts and send-ins under Auto are the board's, repeats from the third
 *  use are cuts, and the still of a repeat or of an attack under Auto (`shot.brief`) holds no longer than its short
 *  scene would run. */
/** A transform (ROUND6.md 5.4). A side's first build of the battle and an upgrade to 4A or 4B play full by hand and
 *  short under Auto, their reduced still held 900; every later build and an upgrade to Level 2 or 3 play short by hand
 *  and on the board alone under Auto (420). In reduced motion a later build is the board's still alone (360) and a
 *  Level 2 or 3 upgrade keeps its 800 still. A transform is never cut: it changes the state. The first build is kept
 *  per battle with the minor beats, so a reload does not stage it full twice. */
function transform(store, shot, auto) {
  const s = shot.scene, e = shot.post.find((x) => x.kind === 'transform');
  // a 4A or 4B upgrade: the headline is the tower (rules.js), the line its role and level ("Lightning Damage, Level
  // 4A"); the branch's move is named by its own shot, so a 4A turn says it at most twice (fixes-3 I6)
  const lv = String(e?.to?.level ?? '');
  if (e?.change === 'upgrade' && /[ab]$/i.test(lv)) {
    const info = FORMS[s.card]?.forms?.[e.to.form];
    s.line = listOf([info ? role(e.to.form, info.role) : '', txt('level', { n: lv.toUpperCase() })].filter(Boolean));
  }
  const key = `transform:${s.side}:build`;
  const first = e?.change === 'build' && !store.minor.has(key);
  if (e?.change === 'build') store.minor.add(key);
  const big = first || (e?.change === 'upgrade' && /[ab]$/i.test(String(e.to?.level ?? '')));
  if (s.variant === 'off') return;
  if (s.variant === 'reduced') { if (!big && e?.change === 'build') s.variant = 'off'; return; }
  s.variant = auto ? (big ? 'short' : 'off') : big ? 'full' : 'short';
}

/** An item the board carries alone (Auto) lands and ends on the same instant, so its number would first be seen in the
 *  next shot's pre-roll: it keeps a short post window of its own (fixes-2 R3, I8). A missed attack the board carries
 *  alone (a cut, or Auto's board) keeps the same window, so "Miss" reads about five frames in its own shot and never
 *  rides into the next one (fixes-3 I3). */
const ITEM_POST = 300;

export function createPlan(store, o = {}) {
  const plan = planShot(store, o);
  return (shot, auto) => {
    plan(shot, auto);
    const s = shot.scene;
    if (s?.variant === 'off' && (s.kind === 'item' || (s.kind === 'attack' && s.outcome?.has?.('miss')))) shot.postMs = ITEM_POST;
  };
}

function planShot(store, o) {
  return (shot, auto) => {
    const s = shot.scene;
    if (!s) return;
    s.label = words(s.label); s.title = words(s.title);
    // the number is the damage that landed: a knockout is told by the board and the KO scene, never in its place
    if (s.kind === 'attack' && s.damage !== undefined && s.label === 'KO') s.label = String(s.damage);
    if ((s.kind === 'attack' || s.kind === 'status' || s.kind === 'ko' || s.kind === 'result') && (s.kind === 'result' || ends(shot))) shot.finish = true;
    const onBoard = ON_BOARD.has(s.kind) || (s.kind === 'switch' && shot.post[0]?.reason !== 'lead');
    const use = s.kind === 'attack' && s.move ? `${s.side}:${s.card}:${s.move.id}` : '';
    const n = use ? (store.uses.get(use) ?? 0) + 1 : 0;
    if (use) store.uses.set(use, n);
    const special = o.specials !== false && s.kind === 'attack' && SPECIAL.has(s.card) && !store.special.has(`${s.side}:${s.card}`);
    if (special) store.special.add(`${s.side}:${s.card}`);
    if (s.kind === 'trait') { s.variant = 'off'; return; }
    // a form's still that will not load: the board carries the shot alone (fixes-1 I1)
    if (s.kind === 'attack' && s.variant !== 'off' && o.formFailed?.(shot)) { s.variant = 'off'; shot.cut = true; return; }
    if (s.kind === 'transform') { transform(store, shot, auto); return; }
    if (s.variant === 'reduced') {
      const key = `${s.kind}:${s.side}:${s.card}:${s.title}`;
      const minor = onBoard && s.kind !== 'ko' && s.kind !== 'switch';
      if (minor && (auto || store.minor.has(key))) s.variant = 'off';
      else if (!minor && onBoard && auto && !shot.finish) s.variant = 'off';
      store.minor.add(key);
      if (use && !special && !shot.finish && o.repeats !== false && n >= 3) { s.variant = 'off'; shot.cut = true; }
      else if (use && !special && (auto || n >= 2)) shot.brief = true;
      return;
    }
    if (auto && onBoard) s.variant = 'off';
    if (special) { s.variant = 'full'; return; }
    if (shot.finish && s.kind === 'ko') s.variant = 'full';
    if (use && !shot.finish && o.repeats !== false) {
      if (n === 2 && s.variant === 'short') shot.framing = 'alt';
      else if (n >= 3) { s.variant = 'off'; shot.cut = true; }
    }
  };
}
