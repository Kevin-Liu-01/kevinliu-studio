// Who the site is about and where it lives. Every page, twin and JSON-LD block reads these.
export const SITE = 'https://www.kevinliu.studio';
export const NAME = 'Kevin Liu';
export const HANDLE = '@kevskgs';
// The bio already public on the previous site's llms.txt; Kevin confirms the final line (docs/content.md).
export const BIO = 'Kevin Liu is a design engineer who builds interactive systems, agent infrastructure, research tools and browser-native worlds.';
export const DESCRIPTION = 'Kevin Liu\'s projects as 26 collectible cards: type, games, shaders, agents and interfaces, each with its real product, its features as moves, and a battle you can play.';
export const SOCIAL = [
  { name: 'GitHub', url: 'https://github.com/Kevin-Liu-01' },
  { name: 'X', url: 'https://x.com/kevskgs' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/kevin-liu-princeton' },
] as const;
export const EMAIL = 'hello@kevinliu.biz';
export const PREVIOUS = 'https://portfoliomon.kevinliu.studio';

export const abs = (p: string) => new URL(p, SITE).href.replace(/\/$/, p === '/' ? '/' : '');

export const person = {
  '@type': 'Person',
  '@id': `${SITE}/#kevin`,
  name: NAME,
  url: SITE + '/',
  description: BIO,
  jobTitle: 'Design engineer',
  sameAs: [...SOCIAL.map((s) => s.url), PREVIOUS],
};
