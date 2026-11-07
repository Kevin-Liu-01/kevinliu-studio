// JSON-LD for every page, as one @graph: the site, Kevin, the page itself, its breadcrumbs and what it is about. Nodes
// refer to each other by @id, so Kevin and the site are one entity on every page. Only true claims: no ratings,
// reviews, offers or FAQ markup.
import { fighters, whatOf, answerOf, repoOf, type Fighter } from './cards';
import { SITE, NAME, DESCRIPTION, person } from './site';
import { cardPath } from './twins';

const ID = { site: `${SITE}/#site`, kevin: person['@id'], cards: `${SITE}/cards#list` };
const abs = (p: string) => (p === '/' ? `${SITE}/` : `${SITE}${p}`);

export const website = { '@type': 'WebSite', '@id': ID.site, url: `${SITE}/`, name: NAME, description: DESCRIPTION, inLanguage: 'en', author: { '@id': ID.kevin }, publisher: { '@id': ID.kevin } };

// the page: its kind, name, image and trail. crumbs are [name, path] after the home crumb.
export function page(o: { path: string; type?: string; name: string; description: string; image: string; crumbs?: [string, string][]; about?: object; mainEntity?: object }) {
  const url = abs(o.path);
  const trail = [[NAME, '/'], ...(o.crumbs ?? [])] as [string, string][];
  const crumbs = trail.length > 1 ? { '@type': 'BreadcrumbList', '@id': `${url}#crumbs`, itemListElement: trail.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(p) })) } : null;
  return [
    {
      '@type': o.type ?? 'WebPage', '@id': `${url}#page`, url, name: o.name, description: o.description, inLanguage: 'en',
      isPartOf: { '@id': ID.site }, author: { '@id': ID.kevin },
      primaryImageOfPage: { '@type': 'ImageObject', url: o.image, width: 1200, height: 630 },
      ...(crumbs ? { breadcrumb: { '@id': crumbs['@id'] } } : {}),
      ...(o.about ? { about: o.about } : {}),
      ...(o.mainEntity ? { mainEntity: o.mainEntity } : {}),
    },
    ...(crumbs ? [crumbs] : []),
  ];
}

// every card in the wall's order
export const cardList = { '@type': 'ItemList', '@id': ID.cards, name: `${NAME}'s projects`, numberOfItems: fighters.length, itemListOrder: 'https://schema.org/ItemListOrderAscending', itemListElement: fighters.map((f, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(cardPath(f)), name: f.title, description: whatOf(f) })) };

// schema.org type and category: named where a card's discipline tags would mistype it, guessed from the tags otherwise
const TYPE: Record<string, string> = { katagami: 'CreativeWork', atlas: 'CreativeWork', ommc: 'WebSite', powerlifting: 'WebSite', 'claude-of-tanks': 'VideoGame', 'princeton-td': 'VideoGame' };
const CATEGORY: Record<string, string> = {
  turboslide: 'BusinessApplication', jarhead: 'UtilitiesApplication', mailroom: 'CommunicationApplication', elo: 'BusinessApplication',
  podium: 'BusinessApplication', sevenfold: 'ReferenceApplication', 'kevin-wiki': 'ReferenceApplication', ariadne: 'EntertainmentApplication',
  cotfly: 'EntertainmentApplication', 'bday-land': 'EntertainmentApplication',
};
const OS: Record<string, string> = { jarhead: 'macOS', 'local-search': 'macOS, Linux, Windows' };

// the project a card stands for, and its source code when the repository is public and named for it
export function work(f: Fighter) {
  const id = `${abs(cardPath(f))}#work`;
  const type = TYPE[f.id] ?? 'SoftwareApplication';
  const repo = repoOf(f);
  // sameAs and codeRepository claim identity, so only the card a repository is named for links it; a card built inside
  // another's repository (Atlas in Prototemplate's) does not
  const ownsRepo = !!repo && (fighters.filter((g) => repoOf(g) === repo).length === 1 || repo.toLowerCase().endsWith('/' + f.id));
  const node: Record<string, unknown> = {
    '@type': type, '@id': id, name: f.title, description: answerOf(f), url: f.url ?? abs(cardPath(f)),
    image: `${SITE}/og/${f.id}.jpg`, dateCreated: String(f.year), author: { '@id': ID.kevin }, creator: { '@id': ID.kevin },
    keywords: f.disciplines.join(', '), subjectOf: { '@id': `${abs(cardPath(f))}#page` },
  };
  if (type === 'SoftwareApplication' || type === 'VideoGame') {
    const category = CATEGORY[f.id] ?? (f.disciplines.includes('Game') ? 'GameApplication' : f.disciplines.includes('Agent') || f.disciplines.includes('Infra') ? 'DeveloperApplication' : 'DesignApplication');
    Object.assign(node, { applicationCategory: category, operatingSystem: OS[f.id] ?? 'Web browser' });
  }
  if (type === 'VideoGame') Object.assign(node, { gamePlatform: 'Web browser', playMode: f.id === 'claude-of-tanks' ? 'MultiPlayer' : 'SinglePlayer' });
  const out: object[] = [node];
  if (ownsRepo) {
    node.sameAs = [repo];
    out.push({ '@type': 'SoftwareSourceCode', '@id': `${repo}#code`, name: `${f.title} source`, codeRepository: repo, author: { '@id': ID.kevin }, ...(node.applicationCategory ? { targetProduct: { '@id': id } } : { about: { '@id': id } }) });
  }
  return out;
}

export const graph = (...nodes: (object | object[])[]) => [website, person, ...nodes.flat()];
