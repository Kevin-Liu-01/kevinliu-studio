// The card room in another language. The cards themselves print as the rounds drew them, in English: their type is
// fitted to Katagami Sans's Latin advances at build (markup.js ADV), and a card is a printed object, like a trading
// card from abroad. Everything around them speaks the page's language: the lens's sheet, the dock, the pack and the
// labels and status lines gallery.js and rituals.js write as the visitor plays. Those scripts are the rounds' and
// write English, so a translated home page loads one small file (galleryShim) that gives them the sheet in its
// language and rewrites their English labels as they are written, by the same rules the build applies to the HTML.
import { M, sheet, factLines, type Fighter } from './cards';
import { L } from '../i18n';
import { ruleIn, whatIn } from './twins';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// one exact piece of a round's markup swapped for its translation: it must be there, so a changed round fails the build
function swap(html: string, from: string, to: string, where: string, all = false) {
  const n = html.split(from).length - 1;
  if (!n || (!all && n > 1)) throw new Error(`i18n room: ${where}: expected ${all ? 'some' : 'one'} ${from.slice(0, 80)}, found ${n}`);
  return html.split(from).join(to);
}

/** A move's line as the card page and the sheet print it: its name, untranslated, in bold */
export function moveHtml(f: Fighter, i: number, code: string) {
  const mv = f.moves[i];
  if (L(code).en) return M.moveText(mv) as string;
  const [before, after] = L(code).move(f.id, i, '\u0000').split('\u0000');
  return `${esc(before)}<b>${M.t(mv.name)}</b>${esc(after)}`;
}

/** The lens's sheet for a card (markup.js sheet), its words in the language */
export function sheetIn(f: Fighter, code: string) {
  let h = sheet(f);
  if (L(code).en) return h;
  const l = L(code), where = `sheet ${f.id}`;
  for (const d of f.disciplines) h = swap(h, `</svg>${M.t(d)}</span>`, `</svg>${esc(l.disc(d))}</span>`, where, true);
  if (f.what) h = swap(h, `<p class="swhat">${M.t(f.what)}</p>`, `<p class="swhat">${esc(whatIn(f, code))}</p>`, where);
  for (const x of factLines(f)) {
    const fact = f.facts[x.key];
    h = swap(h, `<p><b>${M.t(M.num(fact.value))}</b> ${M.t(M.unitOf(fact.value, fact.unit))}</p>`, `<p><b>${esc(l.num(fact.value))}</b> ${esc(l.unit(fact.value, fact.unit ?? ''))}</p>`, where, true);
  }
  if (f.trait) h = swap(h, `<b>${M.t(f.trait.name)}</b> ${M.t(f.trait.rule)}</p>`, `<b>${M.t(f.trait.name)}</b> ${esc(ruleIn(f, code))}</p>`, where);
  f.moves.forEach((mv, i) => { h = swap(h, `<p>${M.moveText(mv)}</p>`, `<p>${moveHtml(f, i, code)}</p>`, where); });
  return h;
}

// English label or status line → its translation. `$1` is a group as written; `$L1` a list of card names ("a, b and
// c"), joined again in the language. Order matters: the first rule that matches wins.
type Rule = [string, string];
export function labelRules(code: string): Rule[] {
  const t = L(code).t;
  const card = (n: string) => t(n === '1' ? 'home.cardInk' : 'home.cardInks', { title: '$1', n });
  return [
    ['^(.+), 1 ink, in your team$', t('home.inYourTeam', { label: card('1') })],
    ['^(.+), 1 ink, in their team$', t('home.inTheirTeam', { label: card('1') })],
    ['^(.+), 1 ink$', card('1')],
    ['^(.+), (\\d+) inks, in your team$', t('home.inYourTeam', { label: card('$2') })],
    ['^(.+), (\\d+) inks, in their team$', t('home.inTheirTeam', { label: card('$2') })],
    ['^(.+), (\\d+) inks$', card('$2')],
    ['^Remove (.+)$', t('home.removeCard', { title: '$1' })],
    ['^Fill Team, Slot (\\d+)$', t('home.fillSlot', { n: '$1' })],
    ['^(\\d+) of (\\d+) inks$', t('home.gauge', { n: '$1', budget: '$2' })],
    ['^Open Pack, Team Full$', t('home.openPackFull')],
    ['^Open Pack: Team Full$', t('home.refused', { title: t('home.openPack'), why: t('home.teamFull') })],
    ['^Open Pack$', t('home.openPack')],
    ['^Play, Pick Three$', t('home.playPickThree')],
    ['^Play, (.+) Not In The Battle Yet$', t('home.playHeld', { list: '$L1' })],
    ['^Play$', t('home.play')],
    ['^Add To Team, Team Full$', t('home.addFull')],
    ['^Add To Team, Over Budget$', t('home.addOver')],
    ['^Add To Team$', t('home.addToTeam')],
    ['^(.+) joined your team, (\\d+) of (\\d+) inks$', t('home.joined', { title: '$1', n: '$2', budget: '$3' })],
    ['^(.+) left your team, (\\d+) of (\\d+) inks$', t('home.left', { title: '$1', n: '$2', budget: '$3' })],
    ['^Rival: (.+)$', t('home.rivalDealt', { list: '$L1' })],
    ['^Pack: (.+), (\\d+) of (\\d+) inks$', t('home.packDealt', { list: '$L1', n: '$2', budget: '$3' })],
    ['^Pack: (.+)$', t('home.packOnly', { list: '$L1' })],
    ['^(.+): Team Full$', t('home.refused', { title: '$1', why: t('home.teamFull') })],
    ['^(.+): Over Budget$', t('home.refused', { title: '$1', why: t('home.overBudget') })],
    ['^(.+) are not in the battle yet$', t('home.notYetMany', { list: '$L1' })],
    ['^(.+) is not in the battle yet$', t('home.notYetOne', { list: '$L1' })],
    ['^Health (\\d+), Reach (\\d+), Proof (\\d+), Pace (\\d+)$', t('home.statsSr', { hp: '$1', atk: '$2', def: '$3', spd: '$4' })],
    ['^Previous site$', t('home.previousSite')],
    ['^Teams$', t('home.teams')],
    ['^Rival$', t('home.rival')],
    ['^Card$', t('home.card')],
    ['^Close$', t('home.close')],
    ['^Art$', t('home.art')],
    ['^Frame$', t('home.frame')],
    // sound.js names its key at run time
    ['^Sound$', t('frame.sound')],
  ];
}
const listOf = (s: string, code: string) => L(code).and(s.split(/, | and /));
export function relabel(s: string, rules: Rule[], code: string) {
  for (const [re, out] of rules) {
    const m = new RegExp(re).exec(s);
    if (m) return out.replace(/\$L(\d)/g, (_, i) => listOf(m[+i], code)).replace(/\$(\d)/g, (_, i) => m[+i]);
  }
  return null;
}

/** A piece of the room's HTML (the wall, the deck, the pack, the dock, the lens) with its labels in the language */
export function roomIn(html: string, code: string) {
  if (L(code).en) return html;
  const t = L(code).t, rules = labelRules(code);
  html = html.replace(/ aria-label="([^"]*)"/g, (m, s) => { const r = relabel(s, rules, code); return r === null ? m : ` aria-label="${esc(r)}"`; });
  html = html.replace(/(<span class="sr" id="d-[\w-]+">)([^<]*)(<\/span>)/g, (m, a, s, b) => { const r = relabel(s, rules, code); return r === null ? m : `${a}${esc(r)}${b}`; });
  const words: [string, string][] = [
    ['Open Pack</span>', `${esc(t('home.openPack'))}</span>`],
    ['<span class="lab off">Team Full</span>', `<span class="lab off">${esc(t('home.teamFull'))}</span>`],
    ['Add To Team</span>', `${esc(t('home.addToTeam'))}</span>`],
    ['Remove</span>', `${esc(t('home.remove'))}</span>`],
    ['<span class="lab l-full">Team Full</span>', `<span class="lab l-full">${esc(t('home.teamFull'))}</span>`],
    ['<span class="lab l-over">Over Budget</span>', `<span class="lab l-over">${esc(t('home.overBudget'))}</span>`],
    ['<span class="t">Play</span>', `<span class="t">${esc(t('home.play'))}</span>`],
    ['<span class="t">Pick Three</span>', `<span class="t">${esc(t('home.pickThree'))}</span>`],
    ['<span>Visit</span>', `<span>${esc(t('home.visit'))}</span>`],
  ];
  for (const [from, to] of words) html = html.split(from).join(to);
  return html;
}

/** The file a translated home page runs between markup.js and gallery.js (/<code>/gallery.js) */
export function galleryShim(code: string, fighters: Fighter[]) {
  const l = L(code);
  const sheets = Object.fromEntries(fighters.map((f) => [f.id, sheetIn(f, code)]));
  const add = { add: l.t('home.addToTeam'), remove: l.t('home.remove'), full: l.t('home.addFull'), over: l.t('home.addOver') };
  return `/* kevinliu.studio, ${l.name}: the lens's sheets and the room's labels in this language (src/lib/i18n-room.ts) */
(function(){var M=globalThis.MARKUP;if(!M)return;var S=${JSON.stringify(sheets)},R=${JSON.stringify(labelRules(code))}.map(function(r){return[new RegExp(r[0]),r[1]]}),F=self.Intl&&Intl.ListFormat?new Intl.ListFormat(${JSON.stringify(l.lang)},{type:"conjunction"}):null;
var o=M.sheet;M.sheet=function(f,m){return S[f.id]||o(f,m)};
/* the lens's art buttons take their names from printings.js (media.gen.js: Art, Alt art, Alt art 2) */
var A=${JSON.stringify({ Art: l.t('home.art'), 'Alt art': l.t('home.altArt') })},AN=${JSON.stringify(l.t('home.altArtN', { n: '\u0000' }))},PR=globalThis.PRINTINGS;if(PR&&PR.of){var po=PR.of;PR.of=function(id){var P=po.apply(PR,arguments);return P&&P.map(function(p){var m=/^Alt art (\\d+)$/.exec(p.name);return Object.assign({},p,{name:A[p.name]||(m?AN.split("\\u0000").join(m[1]):p.name)})})}}
/* gallery.js writes the lens's address as /cards/<id> and the wall's as /: in this language they are ${l.p('/cards/<id>')} and ${l.p('/')} */
var P=${JSON.stringify(l.p('/'))};["pushState","replaceState"].forEach(function(k){var f=history[k];history[k]=function(s,t,u){if(typeof u==="string"){if(/^\\/cards\\//.test(u))u=P+u;else if(/^\\/(?=[?#]|$)/.test(u))u=P+u.slice(1);else if(u.indexOf(P+"/")===0&&/^(?:[?#]|$)/.test(u.slice(P.length+1)))u=P+u.slice(P.length+1)}return f.call(history,s,t,u)}});Object.assign(M.ADD_LABEL,${JSON.stringify(add)});
function list(s){var p=s.split(/, | and /);return F?F.format(p):p.join(", ")}
function tr(s){for(var i=0;i<R.length;i++){var m=R[i][0].exec(s);if(m)return R[i][1].replace(/\\$L(\\d)/g,function(_,k){return list(m[+k])}).replace(/\\$(\\d)/g,function(_,k){return m[+k]})}return null}
/* a rule can match its own output (es and pt keep "Rival"), so each node remembers what this script wrote and skips it: no rewrite loop */
var WA=new WeakMap(),WT=new WeakMap();
function fix(n){if(n.nodeType!==1)return;var a=n.getAttribute("aria-label");if(a&&WA.get(n)!==a){var r=tr(a);if(r!==null&&r!==a){WA.set(n,r);n.setAttribute("aria-label",r)}}}
/* gallery.js says the lines of one moment as one, joined by ". " (a pack's "Rival: ..." and "Pack: ..."): each line is translated on its own; no rule and no card title holds ". " */
function said(e){var s=e.textContent;if(!s||WT.get(e)===s)return;var ps=s.split(". "),hit=false,r=ps.map(function(p){var t=tr(p);if(t!==null&&t!==p){hit=true;return t}return p}).join(". ");if(hit&&r!==s){WT.set(e,r);e.textContent=r}}
function go(){new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==="attributes")fix(m.target);else{var e=m.target.nodeType===1?m.target:m.target.parentElement;if(e&&(e.id==="status"||e.id==="ins-status"))said(e);else m.addedNodes.forEach(function(n){if(n.nodeType===1){fix(n);n.querySelectorAll&&n.querySelectorAll("[aria-label]").forEach(fix)}})}})}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["aria-label"]})}
if(document.body)go();else document.addEventListener("DOMContentLoaded",go)})();
`;
}
export { contentHash as shimHash } from './assets';
