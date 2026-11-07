// The Markdown twin of every page. The .md endpoints, llms.txt, llms-full.txt and each page's Machine view print
// from these functions, so what an agent reads is what a person sees, in the same order. Each twin opens with the one
// sentence that answers what its page is about.
import { fighters, rules, battleRoster, whatOf, answerOf, repoOf, relatedOf, teamFor, moveLine, factLines, type Fighter } from './cards';
import { SITE, NAME, BIO, ABOUT, FACTS, ALSO_KNOWN_AS, DESCRIPTION, SOCIAL, EMAIL, PREVIOUS, type Run } from './site';

const ring = rules.ring as string[];
export const cardPath = (f: Fighter) => `/cards/${f.id}`;
const link = (f: Fighter) => `[${f.title}](${SITE}${cardPath(f)})`;
export const host = (u?: string) => (u ? u.replace(/^https?:\/\//, '').replace(/\/$/, '') : '');
const roster = battleRoster ? Object.keys(battleRoster.cost) : [];
const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs.join(''));

const years = fighters.map((f) => f.year);
export const CARDS_LEAD = `${NAME} made these ${fighters.length} projects between ${Math.min(...years)} and ${Math.max(...years)}.`;

// Questions /about asks and answers below Kevin's own words: only those the words above do not already answer, from
// site.ts FACTS (prose, no FAQ markup)
export const QA: [string, string][] = [
  ['What did he do before General Translation?', `${FACTS[3].replace(/^Before General Translation he/, 'He')} ${FACTS[4]}`],
  ['What else has he done?', FACTS.slice(5).join(' ')],
];

const table = () => fighters.map((f, i) => `| ${String(i + 1).padStart(2, '0')} | ${link(f)} | ${f.year} | ${whatOf(f)} | ${f.url ? `[${host(f.url)}](${f.url})` : ''} | ${repoOf(f) ? `[source](${repoOf(f)})` : ''} |`);
const links = () => `- Cards: ${SITE}/cards
- About: ${SITE}/about
- Battle: ${SITE}/battle
- Every card in one file: ${SITE}/llms-full.txt
${SOCIAL.map((s) => `- ${s.name}: ${s.url}`).join('\n')}
- Email: ${EMAIL}
- Previous site: ${PREVIOUS}`;

export function homeMd() {
  const rows = fighters.map((f, i) => `| ${String(i + 1).padStart(2, '0')} | ${link(f)} | ${f.year} | ${f.disciplines.join(', ')} | ${f.cost} | ${f.stats.hp} | ${f.trait?.name ?? ''} | ${f.url ? `[${host(f.url)}](${f.url})` : ''} |`);
  return `# ${NAME}

${BIO}

${DESCRIPTION}

Each card is a real project. Its four numbers come from the project's own repository (commits, reach, checks and pace), its moves are the product's real features, and its live link opens the product.

| No. | Card | Year | Disciplines | Inks | Health | Trait | Live |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

## Play

Pick three cards whose inks add up to ${rules.team.budget} or less and play them against three more at ${SITE}/battle. ${battleRoster ? `The battle holds ${roster.length} of the ${fighters.length} cards today.` : ''}

## Links

${links()}
`;
}

export function cardsMd() {
  return `# Cards

${CARDS_LEAD}

| No. | Card | Year | What | Live | Source |
| --- | --- | --- | --- | --- | --- |
${table().join('\n')}

## Links

${links()}
`;
}

export function cardMd(f: Fighter) {
  const i = fighters.indexOf(f);
  const repo = repoOf(f);
  const team = teamFor(f.id);
  const facts = factLines(f).map((x) => `- **${x.value} ${x.unit}**. Receipt: \`${x.receipt}\``);
  const moves = f.moves.map((m) => `- ${moveLine(m)} Receipt: \`${m.receipt}\``);
  return `# ${f.title}

${answerOf(f)}

Card ${i + 1} of ${fighters.length} in ${NAME}'s collection. ${f.year}. ${f.disciplines.join(' and ')}.

${f.url ? `- Live: ${f.url}\n` : ''}${repo ? `- Source: ${repo}\n` : ''}${team ? `- Battle: ${SITE}/battle#team=${team.join(',')}\n` : ''}- Inks: ${f.cost}
- Health ${f.stats.hp}, attack ${f.stats.atk}, defence ${f.stats.def}, speed ${f.stats.spd}

## The numbers

${facts.join('\n')}

${f.trait ? `## Trait\n\n**${f.trait.name}**. ${f.trait.rule} Receipt: \`${f.trait.receipt}\`\n\n` : ''}## Moves

${moves.join('\n')}

## Related

${relatedOf(f).map((g) => `- ${link(g)} (${g.disciplines.join(', ')})`).join('\n')}

${(f as any).pinned ? `Facts pinned at commit ${(f as any).pinned.sha} on ${(f as any).pinned.date}.\n\n` : ''}Every card: ${SITE}/cards
`;
}

export function battleMd() {
  return `# Battle

${NAME}'s card battle is a free browser game in which three of his project cards play three more. The engine is deterministic: the same teams and seed always play the same battle.

- Teams: ${rules.team.size} cards whose inks add up to ${rules.team.budget} or less.
- Disciplines form a ring: ${ring.join(', ')}. ${rules.ringRule}
- Two modes share one engine. Mat plays the battle on a card mat with a cutscene for every move. Arena plays it on a painted floor, with eight original trainer figures.
${battleRoster ? `- The battle holds ${roster.length} cards today: ${roster.map((id) => { const f = fighters.find((g) => g.id === id); return f ? link(f) : id; }).join(', ')}.` : ''}

Play: ${SITE}/battle (Mat) or ${SITE}/battle/arena (Arena). The address takes \`#team=a,b,c&rival=x,y,z&seed=N\`.

Every card: ${SITE}/cards
`;
}

const runMd = (r: Run) => (typeof r === 'string' ? r : `[${r[0]}](${r[1]})`);

export function aboutMd() {
  return `# About ${NAME}

${ABOUT.map((runs) => runs.map(runMd).join('')).join('\n\n')}

This site shows ${fighters.length} of the projects as collectible cards. Every number on a card has a receipt from the project's repository.

## Projects

${fighters.map((f) => `- ${link(f)}: ${whatOf(f)}`).join('\n')}

## Questions

${QA.map(([q, a]) => `**${q}** ${a}`).join('\n\n')}

## Elsewhere

${SOCIAL.map((s) => `- ${s.name}: ${s.url}`).join('\n')}
- Email: ${EMAIL}
- The previous site, PortfolioMon Showdown: ${PREVIOUS}
`;
}

// who he is and how to reach him: the top of llms.txt and llms-full.txt
const intro = () => `# ${NAME}

> ${BIO} ${DESCRIPTION}

Every page has a Markdown twin: add .md to its path, or send \`Accept: text/markdown\`.

## About

${FACTS.map((f) => `- ${f}`).join('\n')}
- He is also known as ${and(ALSO_KNOWN_AS)}.

## Contact

- Email: ${EMAIL}
${SOCIAL.map((s) => `- ${s.name}: ${s.url}`).join('\n')}
`;

export function llmsTxt() {
  return `${intro()}
## Pages

- [Cards](${SITE}/cards.md): all ${fighters.length} cards in one table, with live sites and sources
- [About](${SITE}/about.md): ${NAME}'s bio, projects and contact links
- [Battle](${SITE}/battle.md): the rules of the card battle
- [Every card in full](${SITE}/llms-full.txt)

## Projects

${fighters.map((f) => `- [${f.title}](${SITE}${cardPath(f)}.md): ${answerOf(f)}${f.url ? ` Live: ${f.url}` : ''}${repoOf(f) ? ` Source: ${repoOf(f)}` : ''}`).join('\n')}

## Optional

- [Previous site](${PREVIOUS}): PortfolioMon Showdown, the portfolio before this one
`;
}

export function llmsFullTxt() {
  return [intro(), aboutMd(), battleMd(), ...fighters.map(cardMd)].join('\n---\n\n');
}

export const TWINS: Record<string, () => string> = {
  '/': homeMd,
  '/cards': cardsMd,
  '/about': aboutMd,
  '/battle': battleMd,
  '/battle/arena': battleMd, // the same rules; the Arena only changes the floor
  ...Object.fromEntries(fighters.map((f) => [cardPath(f), () => cardMd(f)])),
};
