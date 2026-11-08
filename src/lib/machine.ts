// The Machine view's forms: what an agent reads at each spot of a page, built from the same data as the twins
// (twins.ts) so a region's machine form and the .md endpoint never disagree. Each form nests in the real element it
// describes; machine.css swaps them in place, so they share its box at every width.
import { fighters, rules, repoOf, type Fighter } from './cards';
import { cardPath, cardMd } from './twins';
import { workType } from './schema';
import { PREVIOUS } from './site';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const host = (u?: string) => (u ? u.replace(/^https?:\/\//, '').replace(/\/$/, '') : '');
// a value breaks only after a path's slashes and hyphens, before its dots (so .md stays whole), or between a type's
// words (Communication|Application)
const breaks = (s: string) => esc(s).replace(/([/-])(?=.)/g, '$1<wbr>').replace(/(.)\./g, '$1<wbr>.').replace(/([a-z])([A-Z])/g, '$1<wbr>$2');

export type Field = { k: string; v: string; href?: string; live?: string };

/** A terminal frame drawn in box-drawing characters at the size of the box it sits in (machine.css .bx). */
export const BX = '<i class="mx bx" aria-hidden="true"><i></i><i></i></i>';

/** A card's number and id, the label its frame carries */
export const cardLabel = (f: Fighter) => `${String(fighters.indexOf(f) + 1).padStart(2, '0')} ${f.id}`;

/** A card's record: its place, addresses, schema type and its row of the home twin's table (its number and id are on
 *  the frame); `full` adds the rest of the twin's numbers and the source, for the card's own page. */
export function cardRecord(f: Fighter, { full = false } = {}): Field[] {
  const p = cardPath(f);
  const t = workType(f);
  const repo = repoOf(f); // a public repository only, as the twin prints it
  return [
    { k: 'page', v: p, href: p },
    { k: 'markdown', v: `${p}.md`, href: `${p}.md` },
    { k: '@type', v: t.type },
    ...(t.category ? [{ k: 'category', v: t.category }] : []),
    { k: 'year', v: String(f.year) },
    { k: 'disciplines', v: f.disciplines.join(', ') },
    { k: 'inks', v: String(f.cost) },
    { k: 'health', v: String(f.stats.hp) },
    ...(full ? [{ k: 'attack', v: String(f.stats.atk) }, { k: 'defence', v: String(f.stats.def) }, { k: 'speed', v: String(f.stats.spd) }] : []),
    ...(f.trait ? [{ k: 'trait', v: f.trait.name }] : []),
    ...(f.url ? [{ k: 'live', v: host(f.url), href: f.url }] : []),
    ...(full && repo ? [{ k: 'source', v: host(repo), href: repo }] : []),
  ];
}

/** The deck: where it goes. The pack: what it fills, under which budget, from which seed (gallery.js fills the seed). */
export const deckRecord = (): Field[] => [{ k: 'href', v: host(PREVIOUS) }, { k: 'target', v: '_blank' }];
export const packRecord = (): Field[] => [
  { k: 'team', v: `${rules.team.size} cards` },
  { k: 'budget', v: `${rules.team.budget} inks` },
  { k: 'seed', v: '', live: 'seed' },
  { k: 'keys', v: 'Enter, Space' },
];

/** A record as markup: a frame with its label, the art as text in the card's colour (`cols` characters wide, set to
 *  the record's width: machine.css --w, at Katagami Mono's 0.625 em advance), a large title over key: value lines.
 *  Links only where the host is not itself a control. */
export function recordHtml(title: string, fields: Field[], { links = true, label = '', art = '', cols = 40, color = '' } = {}) {
  const line = (x: Field) => {
    const v = links && x.href ? `<a href="${esc(x.href)}"${/^https?:/.test(x.href) ? ' rel="noopener"' : ''}>${breaks(x.v)}</a>` : breaks(x.v);
    return `<span class="f"><span class="k">${esc(x.k)}:</span> <span class="v"${x.live ? ` data-live="${x.live}"` : ''}>${v}</span></span>`;
  };
  const head = `${BX}${label ? `<span class="lb">${esc(label)}</span>` : ''}${art ? `<span class="art" aria-hidden="true" style="--w:${cols * 0.625}${color ? `;--c:${esc(color)}` : ''}">${esc(art)}</span>` : ''}`;
  return `<span class="mx rec">${head}<span class="t">${esc(title)}</span>${fields.map(line).join('')}</span>`;
}

/** Markdown source as markup: its marks (#, -, **, `) quieter than its words, its bare addresses as links (a comma or
 * full stop after an address ends the sentence, not the address). */
export function mdHtml(s: string) {
  return esc(s)
    .replace(/https?:\/\/[^\s)<`]*[^\s)<`.,;:!?]/g, (u) => `<a href="${u}" rel="noopener">${u}</a>`)
    .replace(/^(#{1,3} |- |\| )/gm, '<span class="mk">$1</span>')
    .replace(/\*\*|`/g, '<span class="mk">$&</span>');
}

/** A card's Markdown twin cut into the blocks its page shows, in its page's order. */
export function cardBlocks(f: Fighter) {
  // found by what each block is, not where it stands, so a twin that adds a block (an answer, a related list) still maps
  const b = cardMd(f).trimEnd().split('\n\n');
  const at = (h: string) => b.indexOf(h);
  const nums = at('## The numbers'), trait = at('## Trait'), moves = at('## Moves');
  const line = b.findIndex((x) => x.startsWith('Card '));
  return {
    line: b[line],
    // the twin's link lines (Live, Source, Battle) are the page's link row; its inks and stats are on the stand's record
    links: (b.slice(line + 1).find((x) => x.startsWith('- ')) ?? '').split('\n').filter((x) => /^- (Live|Source|Battle):/.test(x)).join('\n'),
    facts: b[nums + 1].split('\n'),
    trait: trait >= 0 ? b[trait + 1] : null,
    moves: b[moves + 1].split('\n'),
    related: at('## Related') >= 0 ? b[at('## Related') + 1].split('\n') : [],
    pinned: b.slice(moves + 2).find((x) => x.startsWith('Facts pinned')) ?? null,
  };
}
