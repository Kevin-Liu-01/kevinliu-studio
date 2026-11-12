// The Tower key and panel (ROUND6.md section 7, "Tower UI"): build any of a form card's towers and upgrade the one
// standing, by pointer or keys (T opens, 1-7 build, U upgrades, A and B pick the Level 4 branch, Escape closes).
// It also holds the small pieces every surface that shows a form shares (the plate, the bench row, the post chip, the
// actor tag, the Mat's form chip): a form's still, its star pips and its branch mark.
//
// It reads only the rules (`R`, shared/rules.js): `R.formOf(f)` for what stands, `R.validateAction` for what is
// allowed and why not, `R.towerPreview` for the numbers a tile or an upgrade would bring. It changes nothing itself: a
// choice goes to the page's `act(command)`, which plays it as any other command.
import { FORMS } from './forms.js';
import { t as txt, list as listOf, reason, role } from './strings.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Princeton TD's seven towers in ring order (Infra, Agent, Data, Game, Shader, Type, Interface), as the game names
 *  and colours them (towers.ts TOWER_DATA, TOWER_ACCENTS). The registry (shared/forms.js) is the source; this table
 *  only fills a field an entry leaves out, so a surface never prints an empty name. */
const TOWERS = {
  cannon: { code: 1, name: 'Nassau Cannon', role: 'Heavy Artillery', accent: '#f87171', discipline: 'Infra' },
  station: { code: 2, name: 'Dinky Station', role: 'Troop Spawner', accent: '#a78bfa', discipline: 'Agent' },
  library: { code: 3, name: 'Firestone Library', role: 'Crowd Control', accent: '#67e8f9', discipline: 'Data' },
  mortar: { code: 4, name: 'Palmer Mortar', role: 'Siege AoE', accent: '#fb923c', discipline: 'Game' },
  lab: { code: 5, name: 'E-Quad Lab', role: 'Lightning Damage', accent: '#facc15', discipline: 'Shader' },
  arch: { code: 6, name: 'Blair Arch', role: 'Multi-Target', accent: '#60a5fa', discipline: 'Type' },
  club: { code: 7, name: 'Eating Club', role: 'Economy', accent: '#f59e0b', discipline: 'Interface' },
};

/** A card's forms in ring order (by code): [{ form, code, name, role, accent, discipline, moves }]. Empty for a card
 *  without forms. */
export function formsOf(card, registry = FORMS) {
  const entry = registry?.[card];
  if (!entry?.forms) return [];
  return Object.entries(entry.forms)
    .map(([form, f]) => withRole({ form, ...(card === 'princeton-td' ? TOWERS[form] : {}), ...f }))
    .sort((a, b) => (a.code ?? 99) - (b.code ?? 99));
}
/** One form's facts (name, role, accent, discipline, code), from the registry, else the table. */
export function formInfo(card, form, registry = FORMS) {
  const f = registry?.[card]?.forms?.[form];
  return withRole({ form, ...(card === 'princeton-td' ? TOWERS[form] : {}), ...(f ?? {}) });
}
/** A tower's role ("Heavy Artillery") in the page's strings; its name stays the game's. */
const withRole = (x) => (x.role ? { ...x, role: role(x.form, x.role) } : x);
/** "4a" -> { n: 4, branch: 'a' }; 3 -> { n: 3, branch: null }. */
export function levelParts(level) {
  const m = /^(\d)([ab])?$/i.exec(String(level ?? 1));
  return m ? { n: Number(m[1]), branch: m[2] ? m[2].toLowerCase() : null } : { n: 1, branch: null };
}
/** "Level 2", "Level 4A": the level as every surface prints it (never "Lv"). */
export const levelWord = (level) => { const { n, branch } = levelParts(level); return txt('level', { n: `${n}${branch ? branch.toUpperCase() : ''}` }); };
/** The still key of a form at a level: `lab-1`, `cannon-4a` (the frozen `formOf().key`). */
export const formKey = (form, level) => `${form}-${String(level).toLowerCase()}`;

// ---------- the stills (media/figures/princeton-td/forms/<key>.webp, 2x at <key>@2x.webp; manifest `forms[key]`)
const FIGURES = new URL('../media/figures/', import.meta.url).href;
let manifest = null, asked = false;
/** The figure manifest's form views once it is loaded (the Arena loads it; this asks for it once, from cache). */
function forms(card) {
  if (!asked && typeof fetch === 'function') {
    asked = true;
    fetch(new URL('manifest.json', FIGURES)).then((r) => (r.ok ? r.json() : null)).then((m) => { manifest = m; }).catch(() => {});
  }
  return (manifest?.figures ?? manifest)?.[card]?.forms ?? null;
}
/** A form still's URL: the manifest's view when it names one, else the folder's convention. `hi` takes the 2x file. */
export function stillUrl(key, { card = 'princeton-td', hi = false, rear = false } = {}) {
  const v = forms(card)?.[key]?.[rear ? 'rear' : 'front'];
  const rel = v ? (hi ? v.src : v.lo ?? v.src) : `${card}/forms/${key}${hi ? '@2x' : ''}.webp`;
  return new URL(rel, FIGURES).href;
}
/** A form still's manifest view ({ src, w, h, box: [x0, y0, x1, y1], foot }), or null before the manifest is in. */
export const stillView = (key, { card = 'princeton-td', rear = false } = {}) => forms(card)?.[key]?.[rear ? 'rear' : 'front'] ?? null;
/** A tower drawn to fill a box `h` px high (a tooltip's preview): its opaque box (the manifest's `box`) `fill` of that
 *  height and centred, cut from the 2x still; the plain still where the manifest has no box yet. */
export function stillFillHtml(key, { h = 214, fill = 0.88, card = 'princeton-td', accent = '', cls = 'tw-fill' } = {}) {
  const v = stillView(key, { card });
  if (!v?.box || !v.w || !v.h) return stillHtml(key, { h, card, accent, hi: true });
  const bw = v.box[2] - v.box[0], bh = v.box[3] - v.box[1], k = (h * fill) / Math.max(1, bh);
  const cx = ((v.box[0] + v.box[2]) / 2) * k, cy = ((v.box[1] + v.box[3]) / 2) * k;
  return `<span class="${cls}" style="--h:${h}px${accent ? `;--ta:${accent}` : ''}" data-fill="${Math.round(bh * k)}"><img alt="" decoding="async" src="${stillUrl(key, { card, hi: true })}" style="width:${(v.w * k).toFixed(1)}px;height:${(v.h * k).toFixed(1)}px;left:calc(50% - ${cx.toFixed(1)}px);top:calc(50% - ${cy.toFixed(1)}px)" onerror="this.remove()"></span>`;
}
/** A Tower tile's tower (fixes-3 R6): its opaque box `fill` of the tile's still height, centred on the tower's accent
 *  wash, in units of the CSS `--h` so a width's own `--h` scales the drawing too (a phone's tile draws it at its full
 *  height, not as a 30 px thumbnail in a portrait box). The plain still where the manifest has no box yet. */
export function stillTileHtml(key, { h = 56, fill = 0.9, card = 'princeton-td', accent = '' } = {}) {
  const v = stillView(key, { card });
  if (!v?.box || !v.w || !v.h) return stillHtml(key, { h, card, accent, hi: true });
  const bw = v.box[2] - v.box[0], bh = Math.max(1, v.box[3] - v.box[1]), k = fill / bh;
  const f = (x) => (x * k).toFixed(4);
  const cx = (v.box[0] + v.box[2]) / 2, cy = (v.box[1] + v.box[3]) / 2;
  const wide = Math.max(0.74, Math.min(1.4, bw * k + 0.1)).toFixed(3);
  return `<span class="tw-still tw-tfill" style="--h:${h}px;--tw:${wide}${accent ? `;--ta:${accent}` : ''}" data-key="${esc(key)}"><img alt="" decoding="async" src="${stillUrl(key, { card, hi: true })}" style="width:calc(var(--h) * ${f(v.w)});height:calc(var(--h) * ${f(v.h)});left:calc(50% - var(--h) * ${f(cx)});top:calc(50% - var(--h) * ${f(cy)})" onerror="this.remove()"></span>`;
}
/** A still as an <img> of a fixed height (its box is set before it loads, so nothing moves when it does). A still that
 *  fails to load leaves the tower's accent tile in its place. */
export function stillHtml(key, { h = 20, card = 'princeton-td', accent = '', cls = 'tw-still', hi = h > 30 } = {}) {
  return `<span class="${cls}" style="--h:${h}px${accent ? `;--ta:${accent}` : ''}"><img alt="" decoding="async" loading="lazy" src="${stillUrl(key, { card, hi })}" onerror="this.remove()"></span>`;
}
/** The level as gold star pips (★★☆ for Level 2 of 3), then the branch mark at Level 4: A a diamond, B a circle, in
 *  the tower's accent (never the game's red and teal discs). Its words are its aria label: "Level 2". */
export function pipsHtml(level, { accent = '', max = 3 } = {}) {
  const { n, branch } = levelParts(level);
  const filled = Math.min(n, max);
  const star = (on) => `<svg class="tw-star" data-on="${on}" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8l1.6 3.4 3.7.4-2.8 2.5.8 3.7L6 9 2.7 10.8l.8-3.7L.7 4.6l3.7-.4z"/></svg>`;
  let html = '';
  for (let i = 0; i < max; i++) html += star(i < filled);
  if (branch) html += `<svg class="tw-branch" data-branch="${branch}" viewBox="0 0 12 12" aria-hidden="true" style="--ta:${accent || 'currentColor'}">${branch === 'a' ? '<path d="M6 .6 11.4 6 6 11.4.6 6z"/>' : '<circle cx="6" cy="6" r="5.4"/>'}<text x="6" y="8.6" text-anchor="middle">${branch.toUpperCase()}</text></svg>`;
  return `<span class="tw-pips" role="img" aria-label="${levelWord(level)}">${html}</span>`;
}
/** A form as one inline line: still, name, pips (the plate's form row, the bench row, the post chip). */
export function formLine(fo, { h = 20, card = 'princeton-td', cls = 'tw-line' } = {}) {
  if (!fo) return '';
  const key = fo.key ?? formKey(fo.form, fo.level);
  return `<span class="${cls}" style="--ta:${fo.accent ?? formInfo(card, fo.form).accent ?? 'currentColor'}">${stillHtml(key, { h, card, accent: fo.accent })}<b>${esc(fo.name ?? formInfo(card, fo.form).name)}</b>${pipsHtml(fo.level, { accent: fo.accent })}</span>`;
}

// ---------- the Tower key and its panel

/** The rule a build or an upgrade plays by, in words, read from the rules (`R.forms`): a card whose towers fire
 *  (Princeton TD) runs the new tower's key-1 attack as the command, at that attack's own priority, so it acts in speed
 *  order unless that attack has priority; any other form card's command is the priority-6 stub (ROUND6.md 2.2).
 *  `pv` a `R.towerPreview` (its moves name the attack); without one the line is the panel's general rule. */
export function ruleOf(R, card, pv = null, change = 'build') {
  const entry = (R?.forms ?? FORMS)?.[card];
  if (!entry?.fires) return change === 'upgrade' ? txt('tower.rule.first') : pv ? txt('tower.rule.first') : txt('tower.rule');
  const k1 = pv?.moves?.[entry.slots?.[0] ?? 0];
  if (!k1) return txt('tower.rule.fires');
  // one phrase for every tower: the priority it fires at, never "first" or "speed order" (fix1 C6)
  const n = k1.priority ?? 0;
  return txt('tower.rule.firesAt', { move: k1.name, n: n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0' });
}
const REASONS = { sleep: 'Asleep', stun: 'Stunned' };
const times = (m) => `×${String(Math.round(m * 100) / 100)}`;
const toneOf = (m) => (m >= 1.01 ? 'up' : m <= 0.99 ? 'down' : 'even');

/** `R` the rules (shared/rules.js), `hud` the HUD (its icons, its tooltips, the match), `openPanel(kind, html)` the
 *  console's panel (opens it, or refreshes it in place when it is already open), `act(command)` the page's command
 *  entry. `closePanel()` closes the panel when the page passes it; else `openPanel(null)` is asked to. */
export function createTowerUi({ R, hud, openPanel, closePanel, act } = {}) {
  let key = null, acts = null, badge = null, me = null, foe = null, phase = '', open = false, lastHtml = '', nudgeKey = '', nudgeT = 0;
  const match = () => hud?.match ?? null;
  const state = () => match()?.state ?? null;
  const close = () => { open = false; if (closePanel) closePanel(true); else openPanel?.(null); };
  /** Either team holds a card with forms this battle (standing or knocked out; held once seen, until the teams change). */
  let heldKey = '', heldOn = false;
  const formsHeld = () => {
    const st = state();
    if (!st?.sides) return false;
    const team = ['player', 'rival'].flatMap((s) => st.sides[s]?.team ?? []);
    const k = team.map((f) => f?.uid ?? f?.id).join('|');
    if (k !== heldKey) { heldKey = k; heldOn = false; }
    if (!heldOn) heldOn = team.some((f) => { try { return Boolean(f && R?.formOf?.(f)); } catch { return false; } });
    return heldOn;
  };
  const ico = (name) => (hud?.ico ? hud.ico(name) : '');
  const disc = (d) => { try { return window.bcKit?.icon(String(d).toLowerCase()) ?? ''; } catch { return ''; } };

  /** Why a command is refused (null when it is allowed): the rules' own reason, in the panel's words. */
  function refused(cmd) {
    const st = state();
    if (!st || !R) return reason('Not now');
    if (phase !== 'command') return reason('Not now');
    try {
      const v = R.validateAction?.(st, 'player', cmd);
      if (v && v.ok === false) return words(v.reason);
      if (Array.isArray(v) && v.length) return words(v[0]);
    } catch { return reason('Not now'); }
    return null;
  }
  /** The rules' reason (English, its key), in the page's strings, without its full stop. */
  const words = (r) => reason(String(r ?? 'Not now').replace(/\.$/, ''));
  const preview = (o) => { try { return R.towerPreview?.(state(), 'player', o) ?? null; } catch { return null; } };

  /** A move line as the console prints it: name, power and hits, accuracy, its effect. */
  function moveLine(m) {
    if (!m) return '';
    const bits = [];
    if (m.power > 0) bits.push(m.hits ? `${m.power} × ${m.hits.max === m.hits.min ? m.hits.min : txt('range', { lo: m.hits.min, hi: m.hits.max })}` : txt('tower.power', { n: m.power }));
    if (m.accuracy !== undefined && m.accuracy < 1) bits.push(`${Math.round(m.accuracy * 100)}%`);
    if (m.priority) bits.push(txt('tip.priority', { n: `${m.priority > 0 ? '+' : ''}${m.priority}` }));
    if (m.effect) bits.push(txt('tip.effect', { status: txt(`status.${m.effect.type}`) || m.effect.type, n: Math.round(m.effect.chance * 100) }));
    if (m.selfEffect) bits.push(selfWord(m.selfEffect));
    if (m.executeThreshold) bits.push(txt('tower.finisher', { n: Math.round(m.executeThreshold * 100) }));
    if (m.piercing) bits.push(txt('tower.pierces', { n: Math.round(m.piercing * 100) }));
    return `<span class="tw-move"><b>${esc(m.name)}</b><i>${esc(listOf(bits))}</i></span>`;
  }
  const selfWord = (fx) => {
    const c = fx.chance < 1 ? txt('self.chance', { n: Math.round(fx.chance * 100) }) : '';
    const stat = { atkUp: 'stat.atk', defUp: 'stat.def', spdUp: 'stat.spd' }[fx.type];
    if (stat) return txt('self.stat', { stat: txt(stat), n: fx.amount, chance: c });
    if (fx.type === 'barrier') return txt('self.barrier', { n: Math.round(fx.amount * 100), chance: c });
    if (fx.type === 'critUp') return txt('self.crit', { n: Math.round(fx.amount * 100), chance: c });
    if (fx.type === 'heal') return txt('self.heals', { n: fx.amount, chance: c });
    if (fx.type === 'drain') return txt('self.drainsShort', { n: Math.round(fx.amount * 100), chance: c });
    return fx.type;
  };
  /** The tower's own attack against the foe: its multiplier and the share of the foe's HP it takes (key 1's own
   *  number, never the best of all four moves, which Boss Wave would win for every tower alike). */
  const k1Pct = (pv) => { const slot = (R?.forms ?? FORMS)?.[me?.id]?.slots?.[0] ?? 0; const n = pv?.numbers?.find?.((x) => x.index === slot) ?? pv?.numbers?.[slot]; return Number.isFinite(n?.pct) ? n.pct : null; };
  const multChip = (pv) => { if (!pv || !pv.mult) return ''; const pct = k1Pct(pv); return `<span class="hx" data-tone="${toneOf(pv.mult)}">${ico(toneOf(pv.mult) === 'up' ? 'strong' : toneOf(pv.mult) === 'down' ? 'weak' : 'even')}<b>${times(pv.mult)}</b>${pct !== null ? `<i>${Math.round(pct)}%</i>` : ''}</span>`; };

  /** The panel's markup for the card standing now. */
  function panelHtml() {
    const fo = R.formOf(me);
    if (!fo) return '';
    const card = me.id, list = formsOf(card, R.forms ?? FORMS);
    const left = fo.upgradesLeft ?? 0, total = (R.forms ?? FORMS)[card]?.upgrades ?? 3;
    const { n } = levelParts(fo.level);
    const accent = fo.accent ?? formInfo(card, fo.form).accent;
    // the upgrade row: the standing tower now, and what an upgrade makes of it
    let up = `<div class="tw-up" style="--ta:${accent}">${stillTileHtml(fo.key, { h: 56, card, accent })}<span class="tw-up-name"><b>${esc(fo.name)}</b><i>${esc(fo.role ? role(fo.form, fo.role) : '')}</i>${pipsHtml(fo.level, { accent })}</span>`;
    if (n >= 4) up += `<p class="tw-why">${esc(reason('Highest level'))}</p>`;
    else if (left <= 0) up += `<p class="tw-why">${esc(reason('No upgrades left'))}</p>`;
    else if (n === 3) {
      up += '<span class="tw-branches">';
      for (const b of ['a', 'b']) {
        const cmd = { kind: 'upgrade', branch: b }, why = refused(cmd), pv = preview({ branch: b });
        const nk = formKey(fo.form, `4${b}`), mv = pv?.moves?.[0];
        up += `<button type="button" class="key tw-do" data-tw="upgrade" data-branch="${b}" aria-disabled="${Boolean(why)}" aria-keyshortcuts="${b.toUpperCase()}" data-tip="upgrade:${b}">${stillTileHtml(nk, { h: 48, card, accent })}<span class="tw-do-t"><b>4${b.toUpperCase()} ${esc(mv?.name ?? '')}</b>${moveLine(mv)}${multChip(pv)}${why ? `<em>${esc(why)}</em>` : ''}</span><kbd>${b.toUpperCase()}</kbd></button>`;
      }
      up += '</span>';
    } else {
      const next = n + 1, cmd = { kind: 'upgrade' }, why = refused(cmd), pv = preview({ branch: null });
      const was = R.engine?.fighterDef?.(me.id, me)?.moves?.[0], mv = pv?.moves?.[0];
      const gain = mv && was ? gainWord(was, mv) : '';
      up += `<span class="tw-pair">${stillTileHtml(fo.key, { h: 40, card, accent })}<i aria-hidden="true">›</i>${stillTileHtml(formKey(fo.form, next), { h: 48, card, accent })}</span>`;
      up += `<button type="button" class="key tw-do" data-tw="upgrade" aria-disabled="${Boolean(why)}" aria-keyshortcuts="U" data-tip="upgrade:">${'<span class="tw-do-t">'}<b>${esc(txt('tower.upgradeTo', { level: levelWord(next) }))}</b><span class="tw-gains">${gain ? `<span class="hx" data-tone="up">${ico('up')}<b>${esc(gain)}</b></span>` : ''}<span class="hx" data-tone="up">${ico('barrier')}<b>${esc(txt('chip.barrierPct', { n: 15 }))}</b></span>${multChip(pv)}</span>${why ? `<em>${esc(why)}</em>` : ''}</span><kbd>U</kbd></button>`;
    }
    up += '</div>';
    // the build grid: every tower in ring order, at its stored level
    const levels = me.levels ?? {};
    const tiles = list.map((t, i) => {
      const standing = t.form === fo.form, lv = levels[t.form];
      const cmd = { kind: 'build', form: t.form }, why = standing ? reason('Standing') : refused(cmd);
      const pv = standing ? null : preview({ form: t.form });
      // (the standing tower's tile shows it as it stands, its level and branch, as the head row does: fixes-3 R6)
      const k = standing ? fo.key : formKey(t.form, lv ?? 1);
      const lvTxt = standing ? reason('Standing') : lv ? levelWord(lv) : txt('tower.new');
      return `<button type="button" class="key tw-tile" data-tw="build" data-form="${t.form}" data-standing="${standing}" aria-disabled="${Boolean(why)}" aria-keyshortcuts="${i + 1}" data-tip="tower:${t.form}" style="--ta:${t.accent}" aria-label="${esc(txt('tower.tile.aria', { name: t.name, level: lvTxt, mult: pv?.mult ? txt('tower.tile.mult', { m: Math.round(pv.mult * 100) / 100 }) : '', hit: k1Pct(pv) !== null ? txt('tower.tile.hit', { move: pv.moves?.[(R?.forms ?? FORMS)?.[card]?.slots?.[0] ?? 0]?.name ?? txt('tower.itsAttack'), n: k1Pct(pv) }) : '', why: why && !standing ? txt('tower.tile.why', { why }) : '' }))}">${stillTileHtml(k, { h: 56, card, accent: t.accent })}<span class="tw-tile-t"><b>${esc(t.name)}</b><span class="tw-tile-l">${disc(t.discipline)}<i>${esc(lvTxt)}</i></span>${standing ? '' : multChip(pv)}${why && !standing ? `<em>${esc(why)}</em>` : ''}</span><kbd>${i + 1}</kbd></button>`;
    }).join('');
    return `<div class="panel-head"><b>${esc(txt('tower.panel'))}</b><span class="panel-uses">${esc(txt('tower.left', { n: left, all: total }, left))}</span><button type="button" class="key" data-tw="close">${esc(txt('panel.close'))}</button></div>${up}<div class="tw-grid" role="group" aria-label="${esc(txt('tower.buildGroup'))}" style="--n:${list.length}">${tiles}</div><p class="tw-rule">${esc(ruleOf(R, card))}</p>`;
  }
  /** What an upgrade adds to key 1, in words: "5 hits", "94 Power". */
  function gainWord(a, b) {
    if (b.hits && (!a.hits || b.hits.max !== a.hits.max)) return txt('tower.gain.hits', { move: b.name, n: b.hits.max }, b.hits.max);
    if (b.power !== a.power) return txt('tower.gain.power', { move: b.name, n: b.power });
    return b.name !== a.name ? b.name : '';
  }

  /** Open (or refresh) the panel. */
  function show() {
    if (!me || !R?.formOf(me) || phase !== 'command') return false;
    open = true;
    const html = panelHtml();
    lastHtml = html;
    openPanel?.('tower', html);
    return true;
  }
  /** A choice from the panel (a click or a key). */
  function choose(cmd) {
    if (refused(cmd)) return false;
    open = false;
    if (closePanel) closePanel(false);
    act?.(cmd);
    return true;
  }
  /** A refused choice says why on its own row: its reason (the row's <em>) pulses once in the refusal tone, 320 ms, a
   *  ring and a 1.06 lift, no light (fixes-2 R9). Under reduced motion the reason already stands; nothing moves. */
  function flashWhy(target) {
    const b = typeof target === 'string' ? document.querySelector(`#panel[data-kind="tower"] ${target}`) : target;
    const em = b?.querySelector?.('em');
    if (!em) return;
    em.dataset.flash = '';
    setTimeout(() => { delete em.dataset.flash; }, 320);
    if (document.documentElement.dataset.reduced === 'true' || matchMedia?.('(prefers-reduced-motion: reduce)').matches || !em.animate) return;
    em.animate([{ transform: 'scale(1)', boxShadow: '0 0 0 0 var(--down, #c33)' }, { transform: 'scale(1.06)', boxShadow: '0 0 0 3px var(--down, #c33)', offset: 0.35 }, { transform: 'scale(1)', boxShadow: '0 0 0 0 var(--down, #c33)' }], { duration: 320, easing: 'cubic-bezier(.2,.9,.1,1)' });
  }
  function onClick(e) {
    const p = e.currentTarget;
    if (p.dataset.kind !== 'tower') return;
    const b = e.target.closest?.('[data-tw]');
    if (!b) return;
    e.preventDefault();
    if (b.dataset.tw === 'close') { close(); key?.focus({ preventScroll: true }); return; }
    if (b.getAttribute('aria-disabled') === 'true') { flashWhy(b); return; }
    if (b.dataset.tw === 'build') choose({ kind: 'build', form: b.dataset.form });
    else if (b.dataset.tw === 'upgrade') choose(b.dataset.branch ? { kind: 'upgrade', branch: b.dataset.branch } : { kind: 'upgrade' });
  }

  return {
    /** Put the Tower key first in the action group `actsEl`. */
    mount(actsEl) {
      acts = actsEl;
      if (!acts || key?.isConnected) return;
      key = document.createElement('button');
      key.type = 'button';
      key.className = 'key act tower';
      key.id = 'tower';
      key.hidden = true;
      key.setAttribute('aria-keyshortcuts', 'T');
      key.setAttribute('aria-expanded', 'false');
      key.innerHTML = `<span class="tw-key-still"></span><span class="tw-key-name"></span><span class="tw-key-pips"></span><span class="tw-key-word">${esc(txt('tower.key'))}</span><kbd>T</kbd><span class="tw-nudge" hidden></span>`;
      badge = key.querySelector('.tw-nudge');
      key.addEventListener('click', () => {
        if (key.getAttribute('aria-disabled') === 'true') return;
        if (open && document.querySelector('#panel[data-kind="tower"]:not([hidden])')) { close(); return; }
        show();
      });
      acts.prepend(key);
      const panel = acts.closest('.console')?.querySelector('#panel') ?? document.getElementById('panel');
      panel?.addEventListener('click', onClick);
    },
    /** Redraw for your active fighter `me` against `foe` in `phase` ('command' while the battle waits on you). */
    render(meNow, foeNow, ph) {
      me = meNow; foe = foeNow; phase = ph;
      if (!key) return;
      const fo = me && R?.formOf?.(me);
      const on = Boolean(fo);
      // the action group keeps its Tower column for the whole battle once either team holds a forms card (fixes-3 R4):
      // a fighter without forms (a send-in after Princeton TD falls) leaves the key's slot standing but unseen, so the
      // keys beside it never move (the Mat measured CLS 0.0021 when the column left)
      const held = on || formsHeld();
      if (key.hidden === held) key.hidden = !held;
      if (held) { if (!('tower' in acts.dataset)) acts.dataset.tower = ''; } else if ('tower' in acts.dataset) delete acts.dataset.tower;
      const off = held && !on;
      if (('off' in key.dataset) !== off) {
        if (off) { key.dataset.off = ''; key.setAttribute('aria-hidden', 'true'); key.tabIndex = -1; } else { delete key.dataset.off; key.removeAttribute('aria-hidden'); key.removeAttribute('tabindex'); }
      }
      if (!on) { if (open) close(); return; }
      const accent = fo.accent ?? formInfo(me.id, fo.form).accent;
      key.style.setProperty('--ta', accent);
      const k = `${fo.key}|${fo.name}`;
      if (key.dataset.k !== k) {
        key.dataset.k = k;
        key.querySelector('.tw-key-still').innerHTML = stillHtml(fo.key, { h: 40, card: me.id, accent });
        key.querySelector('.tw-key-name').textContent = fo.name;
        key.querySelector('.tw-key-pips').innerHTML = pipsHtml(fo.level, { accent });
      }
      // disabled says why (asleep, stunned, not your command), in its tooltip and its label
      const why = phase !== 'command' ? reason('Not now') : REASONS[me.status] ? reason(REASONS[me.status]) : null;
      key.setAttribute('aria-disabled', String(Boolean(why)));
      key.dataset.why = why ?? '';
      key.setAttribute('aria-label', txt('tower.key.aria', { name: fo.name, level: levelWord(fo.level), n: fo.upgradesLeft ?? 0, all: (R.forms ?? FORMS)[me.id]?.upgrades ?? 3, why: why && why !== reason('Not now') ? txt('tower.key.why', { why }) : '' }, fo.upgradesLeft ?? 0));
      key.dataset.tip = `tower:${fo.form}`;
      key.setAttribute('aria-expanded', String(open));
      // one nudge: every damaging move is ×1 or worse here and some tower would be ×1.5 (a 200 ms fade, no loop)
      let nudge = '';
      if (phase === 'command' && foe && hud?.ringOf) {
        const def = R.engine.fighterDef(me.id, me);
        const rings = def.moves.filter((m) => m.power > 0).map((m) => hud.ringOf(me.id, foe.id, m, me));
        if (rings.length && rings.every((m) => m <= 1.005)) {
          const best = Math.max(0, ...formsOf(me.id, R.forms ?? FORMS).filter((t) => t.form !== fo.form).map((t) => preview({ form: t.form })?.mult ?? 0));
          if (best >= 1.5) nudge = times(best);
        }
      }
      // (fix1 C6: a 200 ms flash at command time, never wallpaper; the tiles keep every multiplier)
      const nk = nudge ? `${me.uid}|${fo.key}|${foe?.uid}|${nudge}` : '';
      if (nk && nk !== nudgeKey) {
        nudgeKey = nk;
        badge.textContent = nudge;
        badge.hidden = false;
        clearTimeout(nudgeT);
        badge.getAnimations?.().forEach((a) => a.cancel());
        const off = () => { badge.hidden = true; };
        // (the wall clock ends it, so a held or slowed animation clock never leaves it lit)
        if (!document.documentElement.dataset.reduced && badge.animate) badge.animate([{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 200, easing: 'ease-out', fill: 'forwards' });
        nudgeT = setTimeout(off, 200);
      } else if (!nudge) { nudgeKey = ''; if (!badge.hidden) { clearTimeout(nudgeT); badge.hidden = true; } }
      // an open panel follows the moment (a refused build says why as soon as it is)
      if (open) {
        if (phase !== 'command') { close(); return; }
        const html = panelHtml();
        if (html !== lastHtml) { lastHtml = html; openPanel?.('tower', html); }
      }
    },
    /** A key while the Tower panel is open: true when the panel took it. `t` opens it while the battle waits. */
    keydown(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return false;
      const k = e.key.toLowerCase();
      const panelOpen = open && document.querySelector('#panel[data-kind="tower"]:not([hidden])');
      if (!panelOpen) {
        if (k === 't' && key && !key.hidden && !('off' in key.dataset)) {
          e.preventDefault();
          if (key.getAttribute('aria-disabled') !== 'true') show();
          return true;
        }
        // (a fighter without forms refuses `t` with the rules' own reason, read out in the page's live line, never a
        // silent key: fixes-3 R4 after the critic)
        if (k === 't' && key && 'off' in key.dataset) {
          e.preventDefault();
          const why = refused({ kind: 'build', form: '' }) ?? reason('No towers in this battle');
          const live = document.getElementById('live');
          if (live) live.textContent = why;
          return true;
        }
        if (open) open = false;
        return false;
      }
      if (k === 'escape' || k === 't') { e.preventDefault(); close(); key?.focus({ preventScroll: true }); return true; }
      const fo = R.formOf(me);
      if (/^[1-9]$/.test(e.key)) {
        const t = formsOf(me.id, R.forms ?? FORMS)[Number(e.key) - 1];
        e.preventDefault();
        if (t && t.form !== fo?.form && !choose({ kind: 'build', form: t.form })) flashWhy(`[data-tw="build"][data-form="${t.form}"]`);
        return true;
      }
      const n = levelParts(fo?.level).n;
      // (a refused key flashes the reason on its own row, fixes-2 R9)
      if (k === 'u') { e.preventDefault(); if (n < 3 && !choose({ kind: 'upgrade' })) flashWhy('[data-tw="upgrade"]:not([data-branch])'); return true; }
      if (k === 'a' || k === 'b') { e.preventDefault(); if (n === 3 && !choose({ kind: 'upgrade', branch: k })) flashWhy(`[data-tw="upgrade"][data-branch="${k}"]`); return true; }
      return false;
    },
    /** The panel is open (the page asks before routing a key). */
    get open() { return open && Boolean(document.querySelector('#panel[data-kind="tower"]:not([hidden])')); },
    /** The panel's markup now (the page may print it itself). */
    html: () => panelHtml(),
    close,
  };
}
