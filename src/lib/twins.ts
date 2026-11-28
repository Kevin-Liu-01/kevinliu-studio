// The Markdown twin of every page, in every language. The .md endpoints, llms.txt, llms-full.txt and each page's Machine
// view print from these functions, so what an agent reads is what a person sees, in the same order. Each twin opens
// with the one sentence that answers what its page is about. English twins live at the root; another language's at
// its own prefix (/es/cards/turboslide.md), with its words from src/i18n.
import { fighters, byId, cardIds, rules, battleRoster, repoOf, relatedOf, teamFor, factLines, type Fighter } from './cards';
import { SITE, NAME, ALSO_KNOWN_AS, HOME_TITLE, HOME_LEAD, HOME_DESCRIPTION, SOCIAL, EMAIL, PREVIOUS, ABOUT_FIRST } from './site';
import { L, CODES, DEFAULT, lp } from '../i18n';
import { homeParts } from '../i18n/source.mjs';

const ring = rules.ring as string[];
export const cardPath = (f: Fighter, code = DEFAULT) => lp(code, `/cards/${f.id}`);
const link = (f: Fighter, code = DEFAULT) => `[${f.title}](${SITE}${cardPath(f, code)})`;
export const host = (u?: string) => (u ? u.replace(/^https?:\/\//, '').replace(/\/$/, '') : '');
const roster = battleRoster ? Object.keys(battleRoster.cost) : [];
// a page's address in a language, absolute
const at = (code: string, p: string) => `${SITE}${lp(code, p)}`;

const years = fighters.map((f) => f.year);
const leadVars = { name: NAME, n: fighters.length, from: Math.min(...years), to: Math.max(...years) };
export const cardsLead = (code = DEFAULT) => L(code).t('cards.lead', leadVars);

// /about's questions in a language (English: site.ts QA, each answer the facts filed under it)
export const qaOf = (code = DEFAULT): [string, string][] => L(code).c.qa.map((x) => [x.q, x.a]);

// a card's words in a language. English is L('en').c, which src/i18n/source.mjs builds from the cards and site.ts, so
// every language reads one tree and English has no branch of its own
const wordsOf = (f: Fighter, code: string) => L(code).c.cards[f.id as keyof ReturnType<typeof L>['c']['cards']];
// a card's fact, its number and unit in the language (1 commit, 2 commits; 1.234 in German)
export const factIn = (f: Fighter, key: string, code = DEFAULT) => { const l = L(code), x = f.facts[key]; return `${l.num(x.value)} ${l.unit(x.value, x.unit ?? '')}`; };
export const whatIn = (f: Fighter, code = DEFAULT) => wordsOf(f, code).what;
export const answerIn = (f: Fighter, code = DEFAULT) => wordsOf(f, code).answer;
export const ruleIn = (f: Fighter, code = DEFAULT) => (f.trait ? (wordsOf(f, code) as { rule?: string }).rule ?? f.trait.rule : '');
export const moveLineIn = (f: Fighter, i: number, code = DEFAULT) => L(code).move(f.id, i, f.moves[i].name);
const discs = (f: Fighter, code: string) => f.disciplines.map((d) => L(code).disc(d));
export const bioIn = (code = DEFAULT) => L(code).c.bio;
// The home's title, its lead (who Kevin is and where he works) and its description, Kevin's lines of 2026-11-13 in
// src/lib/site.ts, translated as templates ({name}, {projects}: source.mjs homeParts). The lead is also the first line
// of /index.md and llms.txt. A CJK lead ends on its own full stop, so the projects' sentence follows it with no space
const HOME = homeParts({ NAME, HOME_TITLE, HOME_LEAD, HOME_DESCRIPTION });
export const homeTitleIn = (code = DEFAULT) => L(code).fill(L(code).c.home.title, { name: NAME });
export const homeLeadIn = (code = DEFAULT) => L(code).fill(L(code).c.home.lead, { name: NAME });
export const homeDescriptionIn = (code = DEFAULT) => {
  const lead = homeLeadIn(code);
  return `${lead}${/[。！？]$/.test(lead) ? '' : ' '}${L(code).fill(L(code).c.home.openSource, { projects: HOME.projects })}`;
};
const openingIn = homeLeadIn;
export const descriptionIn = (code = DEFAULT) => L(code).c.description;

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
// (Spanish, French and Portuguese write a language's name in lower case inside a sentence: "la edición en español")
const nameInSentence = (code: string) => (['es', 'fr', 'pt'].includes(code) ? L(code).name.toLowerCase() : L(code).name);
const edition = (code: string, p: string) => (code === DEFAULT ? '' : `${L(code).t('twin.translated', { language: nameInSentence(code), url: `<${SITE}${p}>` })}\n\n`);

export function homeMd(code = DEFAULT) {
  const l = L(code), t = l.t;
  const rows = fighters.map((f, i) => `| ${String(i + 1).padStart(2, '0')} | ${link(f, code)} | ${f.year} | ${discs(f, code).join(', ')} | ${f.cost} | ${f.stats.hp} | ${f.trait?.name ?? ''} | ${f.url ? `[${host(f.url)}](${f.url})` : ''} |`);
  return `# ${NAME}

${edition(code, '/index.md')}${openingIn(code)}

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

// A card's twin as the blocks its page shows, by name: the card page's Machine view (machine.ts cardBlocks) reads these,
// and cardMd joins them, so the page never has to find a block in the Markdown by its heading or its shape
export function cardParts(f: Fighter, code = DEFAULT) {
  const l = L(code), t = l.t;
  const i = fighters.indexOf(f);
  const repo = repoOf(f);
  const team = teamFor(f.id);
  return {
    title: f.title,
    edition: edition(code, `/cards/${f.id}.md`),
    answer: answerIn(f, code),
    line: t('twin.cardLine', { i: i + 1, n: fighters.length, name: NAME, year: f.year, disciplines: l.and(discs(f, code)) }),
    // the page's link row (Live, Source, Battle); the inks and stats are on the stand's record
    links: [f.url && `- ${t('twin.live')}: ${f.url}`, repo && `- ${t('twin.source')}: ${repo}`, team && `- ${t('twin.battle')}: ${at(code, '/battle')}#team=${team.join(',')}`].filter((x): x is string => !!x),
    record: [`- ${t('twin.inks')}: ${f.cost}`, `- ${t('twin.stats', { hp: f.stats.hp, atk: f.stats.atk, def: f.stats.def, spd: f.stats.spd })}`],
    facts: factLines(f).map((x) => `- **${factIn(f, x.key, code)}**. ${t('twin.receipt')}: \`${x.receipt}\``),
    trait: f.trait ? `**${f.trait.name}**. ${ruleIn(f, code)} ${t('twin.receipt')}: \`${f.trait.receipt}\`` : null,
    moves: f.moves.map((m, j) => `- ${moveLineIn(f, j, code)} ${t('twin.receipt')}: \`${m.receipt}\``),
    related: relatedOf(f).map((g) => `- ${link(g, code)} (${discs(g, code).join(', ')})`),
    pinned: f.pinned ? t('twin.pinned', { sha: f.pinned.sha, date: f.pinned.date }) : null,
    every: `${t('twin.everyCard')}: ${at(code, '/cards')}`,
  };
}
export function cardMd(f: Fighter, code = DEFAULT) {
  const t = L(code).t, p = cardParts(f, code);
  return `# ${p.title}

${p.edition}${p.answer}

${p.line}

${[...p.links, ...p.record].join('\n')}

## ${t('card.numbers')}

${p.facts.join('\n')}

${p.trait ? `## ${t('card.trait')}\n\n${p.trait}\n\n` : ''}## ${t('card.moves')}

${p.moves.join('\n')}

## ${t('card.related')}

${p.related.join('\n')}

${p.pinned ? `${p.pinned}\n\n` : ''}${p.every}
`;
}

export function battleMd(code = DEFAULT) {
  const l = L(code), t = l.t;
  const ringRule = l.c.ringRule;
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

export const aboutParas = (code = DEFAULT) => L(code).c.about;

// /about's projects: ABOUT_FIRST, then every other card in roster order. The page and its twin both read this list
export const aboutProjects: Fighter[] = [
  ...cardIds(ABOUT_FIRST, 'site.ts ABOUT_FIRST').map((id) => byId[id]),
  ...fighters.filter((f) => !(ABOUT_FIRST as readonly string[]).includes(f.id)),
];

// /about's twin as the blocks its page shows, by name (About.astro reads these; aboutMd joins them)
export function aboutParts(code = DEFAULT) {
  const t = L(code).t;
  return {
    heading: t('about.heading', { name: NAME }),
    edition: edition(code, '/about.md'),
    paras: aboutParas(code),
    cards: t('twin.aboutCards', { n: fighters.length }),
    projects: aboutProjects.map((f) => `- ${link(f, code)}: ${whatIn(f, code)}`),
    questions: qaOf(code).map(([q, a]) => `**${q}** ${a}`),
    social: Object.fromEntries(SOCIAL.map((s) => [s.name, `- ${s.name}: ${s.url}`])) as Record<(typeof SOCIAL)[number]['name'], string>,
    email: `- ${t('twin.linkEmail')}: ${EMAIL}`,
    previous: `- ${t('twin.previousSite')}: ${PREVIOUS}`,
  };
}
export function aboutMd(code = DEFAULT) {
  const t = L(code).t, p = aboutParts(code);
  return `# ${p.heading}

${p.edition}${p.paras.join('\n\n')}

${p.cards}

## ${t('about.projects')}

${p.projects.join('\n')}

## ${t('about.questions')}

${p.questions.join('\n\n')}

## ${t('frame.elsewhere')}

${[...Object.values(p.social), p.email, p.previous].join('\n')}
`;
}

// who he is and how to reach him: the top of llms.txt and llms-full.txt. The facts are free text above the first ##;
// every ## section is a list of links, as the llms.txt convention asks (the guard checks it)
const intro = (code: string) => {
  const l = L(code), t = l.t;
  const facts = l.c.facts;
  return `# ${NAME}

> ${openingIn(code)} ${descriptionIn(code)}

${edition(code, '/llms.txt')}${t('twin.everyPageTwin', { home: twinPath(lp(code, '/')), accept: '`Accept: text/markdown`' })}

${facts.map((f) => `- ${f}`).join('\n')}
- ${t('twin.aka', { names: l.and(ALSO_KNOWN_AS) })}

## ${t('twin.contact')}

- [${t('twin.linkEmail')}](mailto:${EMAIL})
${SOCIAL.map((s) => `- [${s.name}](${s.url})`).join('\n')}
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
/** the twin a page has, or null: a page has one exactly when TWINS names it (the 404 page has none) */
export const twinOf = (path: string) => (TWINS[path] ? twinPath(path) : null);
