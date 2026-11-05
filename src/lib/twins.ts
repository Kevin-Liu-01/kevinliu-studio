// The Markdown twin of every page. The .md endpoints, llms.txt, llms-full.txt and each page's Machine view print
// from these functions, so what an agent reads is what a person sees, in the same order.
import { fighters, rules, battleRoster, whatOf, moveLine, factLines, type Fighter } from './cards';
import { SITE, NAME, BIO, ABOUT, DESCRIPTION, SOCIAL, EMAIL, PREVIOUS, type Run } from './site';

const ring = rules.ring as string[];
export const cardPath = (f: Fighter) => `/cards/${f.id}`;
const link = (f: Fighter) => `[${f.title}](${SITE}${cardPath(f)})`;
const host = (u?: string) => (u ? u.replace(/^https?:\/\//, '').replace(/\/$/, '') : '');

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

Pick three cards whose inks add up to ${rules.team.budget} or less and play them against three more at ${SITE}/battle. ${battleRoster ? `The battle holds ${Object.keys(battleRoster.cost).length} of the ${fighters.length} cards today.` : ''}

## Links

- About: ${SITE}/about
- Battle: ${SITE}/battle
- Every card in one file: ${SITE}/llms-full.txt
${SOCIAL.map((s) => `- ${s.name}: ${s.url}`).join('\n')}
- Previous site: ${PREVIOUS}
`;
}

export function cardMd(f: Fighter) {
  const i = fighters.indexOf(f);
  const facts = factLines(f).map((x) => `- **${x.value} ${x.unit}**. Receipt: \`${x.receipt}\``);
  const moves = f.moves.map((m) => `- ${moveLine(m)} Receipt: \`${m.receipt}\``);
  return `# ${f.title}

${whatOf(f)}

Card ${i + 1} of ${fighters.length} in ${NAME}'s collection. ${f.year}. ${f.disciplines.join(' and ')}.

${f.url ? `- Live: ${f.url}\n` : ''}${f.repo ? `- Source: ${f.repo.replace(/ .*$/, '')}\n` : ''}- Inks: ${f.cost}
- Health ${f.stats.hp}, attack ${f.stats.atk}, defence ${f.stats.def}, speed ${f.stats.spd}

## The numbers

${facts.join('\n')}

${f.trait ? `## Trait\n\n**${f.trait.name}**. ${f.trait.rule} Receipt: \`${f.trait.receipt}\`\n\n` : ''}## Moves

${moves.join('\n')}

${(f as any).pinned ? `Facts pinned at commit ${(f as any).pinned.sha} on ${(f as any).pinned.date}.\n\n` : ''}Back to every card: ${SITE}/
`;
}

export function battleMd() {
  return `# Battle

Three of ${NAME}'s project cards play three more. The engine is deterministic: the same teams and seed always play the same battle.

- Teams: ${rules.team.size} cards whose inks add up to ${rules.team.budget} or less.
- Disciplines form a ring: ${ring.join(', ')}. ${rules.ringRule}
- Two modes share one engine. Mat plays the battle on a card mat with a cutscene for every move. Arena plays it on a painted floor, with eight original trainer figures.
${battleRoster ? `- The battle holds ${Object.keys(battleRoster.cost).length} cards today: ${Object.keys(battleRoster.cost).map((id) => fighters.find((f) => f.id === id)?.title ?? id).join(', ')}.` : ''}

Play: ${SITE}/battle (Mat) or ${SITE}/battle/arena (Arena). The address takes \`#team=a,b,c&rival=x,y,z&seed=N\`.
`;
}

const runMd = (r: Run) => (typeof r === 'string' ? r : `[${r[0]}](${r[1]})`);

export function aboutMd() {
  return `# About ${NAME}

${ABOUT.map((runs) => runs.map(runMd).join('')).join('\n\n')}

This site shows ${fighters.length} of the projects as collectible cards. Every number on a card has a receipt from the project's repository.

## Projects

${fighters.map((f) => `- ${link(f)}: ${whatOf(f)}`).join('\n')}

## Elsewhere

${SOCIAL.map((s) => `- ${s.name}: ${s.url}`).join('\n')}
- Email: ${EMAIL}
- The previous site, PortfolioMon Showdown: ${PREVIOUS}
`;
}

export function llmsTxt() {
  return `# ${NAME}

> ${BIO} ${DESCRIPTION}

Every page has a Markdown twin: add .md to its path, or send \`Accept: text/markdown\`.

## Pages

- [Cards](${SITE}/index.md): all ${fighters.length} cards in one table
- [About](${SITE}/about.md): ${NAME}'s bio, projects and contact links
- [Battle](${SITE}/battle.md): the rules of the card battle
- [Every card in full](${SITE}/llms-full.txt)

## Cards

${fighters.map((f) => `- [${f.title}](${SITE}${cardPath(f)}.md): ${whatOf(f)}`).join('\n')}

## Optional

- [Previous site](${PREVIOUS}): PortfolioMon Showdown, the portfolio before this one
`;
}

export function llmsFullTxt() {
  return [homeMd(), aboutMd(), battleMd(), ...fighters.map(cardMd)].join('\n---\n\n');
}

export const TWINS: Record<string, () => string> = {
  '/': homeMd,
  '/about': aboutMd,
  '/battle': battleMd,
  '/battle/arena': battleMd, // the same rules; the Arena only changes the floor
  ...Object.fromEntries(fighters.map((f) => [cardPath(f), () => cardMd(f)])),
};
