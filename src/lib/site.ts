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
// The answer to "who is Kevin Liu": the About section of llms.txt, llms-full.txt and /about.md. Each line is a public
// fact with its source beside it, so any of them can be struck. Sources: this site's /about; his previous site
// (portfoliomon.kevinliu.studio llms.txt, experience.md, awards.md, certifications.md); github.com/Kevin-Liu-01; the
// public Kevin-Wiki pages ommc, hackathon-projects and hackprinceton. Checked 2026-11-07.
export const FACTS: readonly string[] = [
  'Kevin Liu is an infra-product engineer at General Translation in San Francisco, since July 2026.', // /about; previous site experience.md
  'He studies computer science at Princeton University (B.S.E., class of 2028).', // previous site experience.md; GitHub bio "cs @princeton"
  'He has been coding and designing since he was 12.', // /about
  'Before General Translation he was a founding engineer at Dedalus Labs (January to July 2026), where he built agent infrastructure, and at Sevenfold AI (June to November 2025).', // previous site llms.txt
  'He interned at Amazon (2025), Bloomberg (2023 and 2024) and AT&T Labs Research (2023).', // previous site llms.txt
  'He co-founded the Online Monmouth Math Competition (OMMC), a 501(c)(3) nonprofit math contest, and leads its technology.', // previous site experience.md; wiki ommc
  'He was lead developer of HackPrinceton\'s websites and built Podium, its judging tool.', // previous site experience.md; wiki hackprinceton
  'He won 13 hackathons in a row; his team\'s RecyclAIble took first place in hardware at PennApps XXIII (2022).', // wiki hackathon-projects; previous site awards.md
  'He is the author of a paper on speech transcription for Huntington\'s disease (IYRC 2023), which won a Sigma Xi award, and a co-author of a paper on heat flow in lithium-ion polymer batteries (IEEE MIT URTC 2024).', // previous site awards.md, certifications.md; doi.org/10.1109/URTC65039.2024.10937635
];
// Other names he goes by, as his previous site lists them (llms.txt), so an answer engine can tell him from other Kevin Lius
export const ALSO_KNOWN_AS = ['Kevin B. Liu', 'Kevin Bowen Liu'];
export const DESCRIPTION = 'Kevin Liu\'s projects as 26 collectible cards: type, games, shaders, agents and interfaces, each with its real product, its features as moves, and a battle you can play.';
export const SOCIAL = [
  { name: 'GitHub', url: 'https://github.com/Kevin-Liu-01' },
  { name: 'X', url: 'https://x.com/kevskgs' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/kevin-liu-princeton' },
  { name: 'Devpost', url: 'https://devpost.com/Kevin-Liu-01' },
] as const;
export const EMAIL = 'hello@kevinliu.studio';
export const PREVIOUS = 'https://portfoliomon.kevinliu.studio';

export const abs = (p: string) => new URL(p, SITE).href.replace(/\/$/, p === '/' ? '/' : '');

export const person = {
  '@type': 'Person',
  '@id': `${SITE}/#kevin`,
  name: NAME,
  alternateName: ALSO_KNOWN_AS,
  url: SITE + '/',
  description: BIO,
  jobTitle: 'Infra-product engineer',
  email: `mailto:${EMAIL}`,
  homeLocation: { '@type': 'Place', name: 'San Francisco, California' },
  affiliation: { '@type': 'CollegeOrUniversity', name: 'Princeton University', url: 'https://www.princeton.edu' },
  knowsAbout: ['Interface design', 'Type design', 'Browser games', 'Shaders', 'AI agents', 'Developer infrastructure'],
  sameAs: [...SOCIAL.map((s) => s.url), PREVIOUS],
};
