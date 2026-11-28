// JSON-LD for every page, as one @graph: the site, Kevin, the page itself, its breadcrumbs and what it is about. Nodes
// refer to each other by @id, so Kevin and the site are one entity on every page. Only true claims: no ratings,
// reviews, offers or FAQ markup.
import { fighters, repoOf, type Fighter } from './cards';
import { SITE, NAME, DESCRIPTION, person } from './site';
import { cardPath, whatIn, answerIn } from './twins';
import { L, DEFAULT, lp } from '../i18n';

const ID = { site: `${SITE}/#site`, kevin: person['@id'], cards: `${SITE}/cards#list` };
const abs = (p: string) => (p === '/' ? `${SITE}/` : `${SITE}${p}`);

export const website = { '@type': 'WebSite', '@id': ID.site, url: `${SITE}/`, name: NAME, description: DESCRIPTION, inLanguage: 'en', author: { '@id': ID.kevin }, publisher: { '@id': ID.kevin } };

// the page: its kind, name, image and trail. crumbs are [name, path] after the home crumb.
export function page(o: { path: string; type?: string; name: string; description: string; image: string; crumbs?: [string, string][]; about?: object; mainEntity?: object; code?: string }) {
  const url = abs(o.path);
  const code = o.code ?? DEFAULT;
  const trail = [[NAME, lp(code, '/')], ...(o.crumbs ?? [])] as [string, string][];
  const crumbs = trail.length > 1 ? { '@type': 'BreadcrumbList', '@id': `${url}#crumbs`, itemListElement: trail.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(p) })) } : null;
  return [
    {
      '@type': o.type ?? 'WebPage', '@id': `${url}#page`, url, name: o.name, description: o.description, inLanguage: L(code).lang,
      isPartOf: { '@id': ID.site }, author: { '@id': ID.kevin },
      primaryImageOfPage: { '@type': 'ImageObject', url: o.image, width: 1200, height: 630 },
      ...(crumbs ? { breadcrumb: { '@id': crumbs['@id'] } } : {}),
      ...(o.about ? { about: o.about } : {}),
      ...(o.mainEntity ? { mainEntity: o.mainEntity } : {}),
    },
    ...(crumbs ? [crumbs] : []),
  ];
}

// every card in the wall's order, in a language (the English list keeps its address, /cards#list)
export const cardListIn = (code = DEFAULT) => ({ '@type': 'ItemList', '@id': code === DEFAULT ? ID.cards : `${abs(lp(code, '/cards'))}#list`, name: L(code).t('cards.listName', { name: NAME }), numberOfItems: fighters.length, itemListOrder: 'https://schema.org/ItemListOrderAscending', itemListElement: fighters.map((f, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(cardPath(f, code)), name: f.title, description: whatIn(f, code) })) });
export const cardList = cardListIn();

// schema.org type and category: named where a card's discipline tags would mistype it, guessed from the tags otherwise
const TYPE: Record<string, string> = { katagami: 'CreativeWork', atlas: 'CreativeWork', ommc: 'WebSite', powerlifting: 'WebSite', 'claude-of-tanks': 'VideoGame', 'princeton-td': 'VideoGame' };
const CATEGORY: Record<string, string> = {
  turboslide: 'BusinessApplication', jarhead: 'UtilitiesApplication', mailroom: 'CommunicationApplication', elo: 'BusinessApplication',
  podium: 'BusinessApplication', sevenfold: 'ReferenceApplication', 'kevin-wiki': 'ReferenceApplication', ariadne: 'EntertainmentApplication',
  cotfly: 'EntertainmentApplication', 'bday-land': 'EntertainmentApplication',
};
// a card's @type, and its applicationCategory where that type is software; the Machine view's records print the same
export function workType(f: Fighter): { type: string; category?: string } {
  const type = TYPE[f.id] ?? 'SoftwareApplication';
  if (type !== 'SoftwareApplication' && type !== 'VideoGame') return { type };
  return { type, category: CATEGORY[f.id] ?? (f.disciplines.includes('Game') ? 'GameApplication' : f.disciplines.includes('Agent') || f.disciplines.includes('Infra') ? 'DeveloperApplication' : 'DesignApplication') };
}
const OS: Record<string, string> = { jarhead: 'macOS', 'local-search': 'macOS, Linux, Windows' };

// the project a card stands for, and its source code when the repository is public and named for it
export function work(f: Fighter, code = DEFAULT) {
  const id = `${abs(cardPath(f, code))}#work`;
  const type = TYPE[f.id] ?? 'SoftwareApplication';
  const repo = repoOf(f);
  // sameAs and codeRepository claim identity, so only the card a repository is named for links it; a card built inside
  // another's repository (Atlas in Prototemplate's) does not
  const ownsRepo = !!repo && (fighters.filter((g) => repoOf(g) === repo).length === 1 || repo.toLowerCase().endsWith('/' + f.id));
  const node: Record<string, unknown> = {
    '@type': type, '@id': id, name: f.title, description: answerIn(f, code), url: f.url ?? abs(cardPath(f, code)),
    image: `${SITE}/og/${f.id}.jpg`, dateCreated: String(f.year), author: { '@id': ID.kevin }, creator: { '@id': ID.kevin },
    keywords: f.disciplines.map((d) => L(code).disc(d)).join(', '), subjectOf: { '@id': `${abs(cardPath(f, code))}#page` },
  };
  const { category } = workType(f);
  if (category) Object.assign(node, { applicationCategory: category, operatingSystem: OS[f.id] ?? 'Web browser' });
  if (type === 'VideoGame') Object.assign(node, { gamePlatform: 'Web browser', playMode: f.id === 'claude-of-tanks' ? 'MultiPlayer' : 'SinglePlayer' });
  const out: object[] = [node];
  if (ownsRepo) {
    node.sameAs = [repo];
    if (code !== DEFAULT) return out; // the source is one entity; the English card page names it
    out.push({ '@type': 'SoftwareSourceCode', '@id': `${repo}#code`, name: `${f.title} source`, codeRepository: repo, author: { '@id': ID.kevin }, ...(node.applicationCategory ? { targetProduct: { '@id': id } } : { about: { '@id': id } }) });
  }
  return out;
}

export const graph = (...nodes: (object | object[])[]) => [website, person, ...nodes.flat()];
