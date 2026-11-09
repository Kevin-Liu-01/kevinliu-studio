// The Markdown twin of every page, in every language. The .md endpoints, llms.txt, llms-full.txt and each page's Machine
// view print from these functions, so what an agent reads is what a person sees, in the same order. Each twin opens
// with the one sentence that answers what its page is about. English twins live at the root; another language's at
// its own prefix (/es/cards/turboslide.md), with its words from src/i18n.
import { fighters, rules, battleRoster, whatOf, answerOf, repoOf, relatedOf, teamFor, moveLine, factLines, type Fighter } from './cards';
import { SITE, NAME, BIO, ABOUT, FACTS, ALSO_KNOWN_AS, DESCRIPTION, SOCIAL, EMAIL, PREVIOUS, type Run } from './site';
import { L, CODES, DEFAULT, lp } from '../i18n';

const ring = rules.ring as string[];
export const cardPath = (f: Fighter, code = DEFAULT) => lp(code, `/cards/${f.id}`);
const link = (f: Fighter, code = DEFAULT) => `[${f.title}](${SITE}${cardPath(f, code)})`;
export const host = (u?: string) => (u ? u.replace(/^https?:\/\//, '').replace(/\/$/, '') : '');
const roster = battleRoster ? Object.keys(battleRoster.cost) : [];
const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs.join(''));
// a page's address in a language, absolute
const at = (code: string, p: string) => `${SITE}${lp(code, p)}`;

const years = fighters.map((f) => f.year);
const leadVars = { name: NAME, n: fighters.length, from: Math.min(...years), to: Math.max(...years) };
export const CARDS_LEAD = `${NAME} made these ${fighters.length} projects between ${Math.min(...years)} and ${Math.max(...years)}.`;
export const cardsLead = (code = DEFAULT) => (code === DEFAULT ? CARDS_LEAD : L(code).t('cards.lead', leadVars));

// Questions /about asks and answers below Kevin's own words: only those the words above do not already answer, from
// site.ts FACTS (prose, no FAQ markup)
export const QA: [string, string][] = [
  ['What did he do before General Translation?', `${FACTS[3].replace(/^Before General Translation he/, 'He')} ${FACTS[4]}`],
  ['What else has he done?', FACTS.slice(5).join(' ')],
];
export const qaOf = (code = DEFAULT): [string, string][] => (code === DEFAULT ? QA : L(code).c.qa.map((x) => [x.q, x.a]));

// a card's words in a language
export const whatIn = (f: Fighter, code = DEFAULT) => (code === DEFAULT ? whatOf(f) : L(code).c.cards[f.id as keyof ReturnType<typeof L>['c']['cards']].what);
export const answerIn = (f: Fighter, code = DEFAULT) => (code === DEFAULT ? answerOf(f) : L(code).c.cards[f.id as keyof ReturnType<typeof L>['c']['cards']].answer);
export const ruleIn = (f: Fighter, code = DEFAULT) => (code === DEFAULT || !f.trait ? f.trait?.rule ?? '' : L(code).c.cards[f.id as keyof ReturnType<typeof L>['c']['cards']].rule ?? f.trait.rule);
export const moveLineIn = (f: Fighter, i: number, code = DEFAULT) => (code === DEFAULT ? moveLine(f.moves[i]) : L(code).move(f.id, i, f.moves[i].name));
const discs = (f: Fighter, code: string) => f.disciplines.map((d) => L(code).disc(d));
export const bioIn = (code = DEFAULT) => (code === DEFAULT ? BIO : L(code).c.bio);
export const descriptionIn = (code = DEFAULT) => (code === DEFAULT ? DESCRIPTION : L(code).c.description);

const table = (code: string) => fighters.map((f, i) => `| ${String(i + 1).padStart(2, '0')} | ${link(f, code)} | ${f.year} | ${whatIn(f, code)} | ${f.url ? `[${host(f.url)}](${f.url})` : ''} | ${repoOf(f) ? `[${L(code).t('twin.sourceLink')}](${repoOf(f)})` : ''} |`);
const links = (code: string) => {
  const t = L(code).t;
  return `- ${t('twin.linkCards')}: ${at(code, '/cards')}
- ${t('twin.linkAbout')}: ${at(code, '/about')}
- ${t('twin.linkBattle')}: ${at(code, '/battle')}
- ${t('twin.linkEveryCard')}: ${at(code, '/llms-full.txt')}
${SOCIAL.map((s) => `- ${s.name}: ${s.url}`).join('\n')}
- ${t('twin.linkEmail')}: ${EMAIL}
- ${t('twin.linkPrevious')}: ${PREVIOUS}`;
};
// the line a translated twin opens under its heading: which language this is and where the original lives
const edition = (code: string, p: string) => (code === DEFAULT ? '' : `${L(code).t('twin.translated', { language: L(code).name, url: `${SITE}${p}` })}\n\n`);

export function homeMd(code = DEFAULT) {
  const l = L(code), t = l.t;
  const rows = fighters.map((f, i) => `| ${String(i + 1).padStart(2, '0')} | ${link(f, code)} | ${f.year} | ${discs(f, code).join(', ')} | ${f.cost} | ${f.stats.hp} | ${f.trait?.name ?? ''} | ${f.url ? `[${host(f.url)}](${f.url})` : ''} |`);
  return `# ${NAME}

${edition(code, '/index.md')}${bioIn(code)}

${descriptionIn(code)}

${t('twin.homeLead')}

| ${t('twin.colNo')} | ${t('twin.colCard')} | ${t('twin.colYear')} | ${t('twin.colDisciplines')} | ${t('twin.colInks')} | ${t('twin.colHealth')} | ${t('twin.colTrait')} | ${t('twin.colLive')} |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

## ${t('twin.play')}

${t('twin.playLine', { budget: rules.team.budget, url: at(code, '/battle') })} ${battleRoster ? t('twin.holds', { n: roster.length, total: fighters.length }) : ''}

## ${t('twin.links')}

${links(code)}
`;
}

export function cardsMd(code = DEFAULT) {
  const t = L(code).t;
  return `# ${t('cards.title')}

${edition(code, '/cards.md')}${cardsLead(code)}

| ${t('twin.colNo')} | ${t('twin.colCard')} | ${t('twin.colYear')} | ${t('twin.colWhat')} | ${t('twin.colLive')} | ${t('twin.colSource')} |
| --- | --- | --- | --- | --- | --- |
${table(code).join('\n')}

## ${t('twin.links')}

${links(code)}
`;
}

export function cardMd(f: Fighter, code = DEFAULT) {
  const l = L(code), t = l.t;
  const i = fighters.indexOf(f);
  const repo = repoOf(f);
  const team = teamFor(f.id);
  const facts = factLines(f).map((x) => `- **${code === DEFAULT ? x.value : l.num(f.facts[x.key].value)} ${code === DEFAULT ? x.unit : l.unit(f.facts[x.key].value, f.facts[x.key].unit ?? '')}**. ${t('twin.receipt')}: \`${x.receipt}\``);
  const moves = f.moves.map((m, j) => `- ${moveLineIn(f, j, code)} ${t('twin.receipt')}: \`${m.receipt}\``);
  const line = code === DEFAULT
    ? `Card ${i + 1} of ${fighters.length} in ${NAME}'s collection. ${f.year}. ${f.disciplines.join(' and ')}.`
    : t('twin.cardLine', { i: i + 1, n: fighters.length, name: NAME, year: f.year, disciplines: l.and(discs(f, code)) });
  const pinned = (f as any).pinned;
  return `# ${f.title}

${edition(code, `/cards/${f.id}.md`)}${answerIn(f, code)}

${line}

${f.url ? `- ${t('twin.live')}: ${f.url}\n` : ''}${repo ? `- ${t('twin.source')}: ${repo}\n` : ''}${team ? `- ${t('twin.battle')}: ${at(code, '/battle')}#team=${team.join(',')}\n` : ''}- ${t('twin.inks')}: ${f.cost}
- ${t('twin.stats', { hp: f.stats.hp, atk: f.stats.atk, def: f.stats.def, spd: f.stats.spd })}

## ${t('card.numbers')}

${facts.join('\n')}

${f.trait ? `## ${t('card.trait')}\n\n**${f.trait.name}**. ${ruleIn(f, code)} ${t('twin.receipt')}: \`${f.trait.receipt}\`\n\n` : ''}## ${t('card.moves')}

${moves.join('\n')}

## ${t('card.related')}

${relatedOf(f).map((g) => `- ${link(g, code)} (${discs(g, code).join(', ')})`).join('\n')}

${pinned ? `${t('twin.pinned', { sha: pinned.sha, date: pinned.date })}\n\n` : ''}${t('twin.everyCard')}: ${at(code, '/cards')}
`;
}

export function battleMd(code = DEFAULT) {
  const l = L(code), t = l.t;
  const ringRule = code === DEFAULT ? rules.ringRule : l.c.ringRule;
  return `# ${t('battle.title')}

${edition(code, '/battle.md')}${t('twin.battleLead', { name: NAME })}

- ${t('twin.teams', { size: rules.team.size, budget: rules.team.budget })}
- ${t('twin.ring', { ring: ring.map((d) => l.disc(d)).join(', ') })} ${ringRule}
- ${t('twin.modes')}
${battleRoster ? `- ${t('twin.roster', { n: roster.length, list: roster.map((id) => { const f = fighters.find((g) => g.id === id); return f ? link(f, code) : id; }).join(', ') })}` : ''}

${t('twin.playAt', { mat: at(code, '/battle'), arena: at(code, '/battle/arena'), hash: '`#team=a,b,c&rival=x,y,z&seed=N`' })}

${t('twin.everyCard')}: ${at(code, '/cards')}
`;
}

const runMd = (r: Run) => (typeof r === 'string' ? r : `[${r[0]}](${r[1]})`);
export const aboutParas = (code = DEFAULT) => (code === DEFAULT ? ABOUT.map((runs) => runs.map(runMd).join('')) : L(code).c.about);

export function aboutMd(code = DEFAULT) {
  const t = L(code).t;
  return `# ${t('about.heading', { name: NAME })}

${edition(code, '/about.md')}${aboutParas(code).join('\n\n')}

${t('twin.aboutCards', { n: fighters.length })}

## ${t('about.projects')}

${fighters.map((f) => `- ${link(f, code)}: ${whatIn(f, code)}`).join('\n')}

## ${t('about.questions')}

${qaOf(code).map(([q, a]) => `**${q}** ${a}`).join('\n\n')}

## ${t('frame.elsewhere')}

${SOCIAL.map((s) => `- ${s.name}: ${s.url}`).join('\n')}
- ${t('twin.linkEmail')}: ${EMAIL}
- ${t('twin.previousSite')}: ${PREVIOUS}
`;
}

// who he is and how to reach him: the top of llms.txt and llms-full.txt
const intro = (code: string) => {
  const l = L(code), t = l.t;
  const facts = code === DEFAULT ? FACTS : l.c.facts;
  return `# ${NAME}

> ${bioIn(code)} ${descriptionIn(code)}

${edition(code, '/llms.txt')}${t('twin.everyPageTwin', { accept: '`Accept: text/markdown`' })}

## ${t('frame.about')}

${facts.map((f) => `- ${f}`).join('\n')}
- ${t('twin.aka', { names: code === DEFAULT ? and(ALSO_KNOWN_AS) : l.and(ALSO_KNOWN_AS) })}

## ${t('twin.contact')}

- ${t('twin.linkEmail')}: ${EMAIL}
${SOCIAL.map((s) => `- ${s.name}: ${s.url}`).join('\n')}
`;
};

export function llmsTxt(code = DEFAULT) {
  const t = L(code).t;
  return `${intro(code)}
## ${t('twin.pages')}

- [${t('cards.title')}](${at(code, '/cards')}.md): ${t('twin.pageCards', { n: fighters.length })}
- [${t('frame.about')}](${at(code, '/about')}.md): ${t('twin.pageAbout', { name: NAME })}
- [${t('battle.title')}](${at(code, '/battle')}.md): ${t('twin.pageBattle')}
- [${t('twin.everyCardInFull')}](${at(code, '/llms-full.txt')})

## ${t('twin.projects')}

${fighters.map((f) => `- [${f.title}](${SITE}${cardPath(f, code)}.md): ${answerIn(f, code)}${f.url ? ` ${t('twin.live')}: ${f.url}` : ''}${repoOf(f) ? ` ${t('twin.source')}: ${repoOf(f)}` : ''}`).join('\n')}

## ${t('twin.optional')}

- [${t('twin.linkPrevious')}](${PREVIOUS}): ${t('twin.previousLine')}
`;
}

export function llmsFullTxt(code = DEFAULT) {
  return [intro(code), aboutMd(code), battleMd(code), ...fighters.map((f) => cardMd(f, code))].join('\n---\n\n');
}

// path (without its language) to twin, per language
const twinsOf = (code: string): Record<string, () => string> => ({
  '/': () => homeMd(code),
  '/cards': () => cardsMd(code),
  '/about': () => aboutMd(code),
  '/battle': () => battleMd(code),
  '/battle/arena': () => battleMd(code), // the same rules; the Arena only changes the floor
  ...Object.fromEntries(fighters.map((f) => [`/cards/${f.id}`, () => cardMd(f, code)])),
});
/** every page with a twin, by its full path: '/cards' and '/es/cards' */
export const TWINS: Record<string, () => string> = Object.assign({}, ...CODES.map((code) => Object.fromEntries(Object.entries(twinsOf(code)).map(([p, fn]) => [lp(code, p), fn]))));
/** a page's twin address: /index.md for home, /es/index.md for a language's home, the path plus .md otherwise */
export const twinPath = (path: string) => (path === '/' ? '/index.md' : CODES.includes(path.slice(1)) ? `${path}/index.md` : `${path}.md`);
