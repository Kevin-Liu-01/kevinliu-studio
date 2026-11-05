// Who the site is about and where it lives. Every page, twin and JSON-LD block reads these.
export const SITE = 'https://www.kevinliu.studio';
export const NAME = 'Kevin Liu';
export const HANDLE = '@kevskgs';
// One line for metadata, JSON-LD and every twin. It names no employer, so it can sit on every page.
export const BIO = 'Kevin Liu is an infra-product engineer in San Francisco and a student at Princeton University who designs interfaces that feel alive.';
// Kevin's own words for /about (2026-11-05). A string is text; a pair is a link. The employer appears here and on the
// pages that print this, /about and its twin, and nowhere else.
export type Run = string | readonly [text: string, href: string];
export const ABOUT: readonly (readonly Run[])[] = [
  ['I am an infra-product engineer at ', ['General Translation', 'https://generaltranslation.com'], ' based in San Francisco.'],
  ['I am 19, and I\'ve been coding and designing since I was 12. I am currently attending ', ['Princeton University', 'https://www.princeton.edu'], '.'],
  ['I design interfaces that feel alive, from first principles, with a spirit of their own. I follow friction toward what is missing, and treat environments as part of the product. I build strange observations into useful worlds through type, skills, and protocols.'],
];
export const DESCRIPTION = 'Kevin Liu\'s projects as 26 collectible cards: type, games, shaders, agents and interfaces, each with its real product, its features as moves, and a battle you can play.';
export const SOCIAL = [
  { name: 'GitHub', url: 'https://github.com/Kevin-Liu-01' },
  { name: 'X', url: 'https://x.com/kevskgs' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/kevin-liu-princeton' },
] as const;
export const EMAIL = 'hello@kevinliu.studio';
export const PREVIOUS = 'https://portfoliomon.kevinliu.studio';

export const abs = (p: string) => new URL(p, SITE).href.replace(/\/$/, p === '/' ? '/' : '');

export const person = {
  '@type': 'Person',
  '@id': `${SITE}/#kevin`,
  name: NAME,
  url: SITE + '/',
  description: BIO,
  jobTitle: 'Infra-product engineer',
  email: `mailto:${EMAIL}`,
  homeLocation: { '@type': 'Place', name: 'San Francisco, California' },
  affiliation: { '@type': 'CollegeOrUniversity', name: 'Princeton University', url: 'https://www.princeton.edu' },
  sameAs: [...SOCIAL.map((s) => s.url), PREVIOUS],
};
