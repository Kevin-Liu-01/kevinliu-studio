// A card's schema.org type and category: named where a card's discipline tags would mistype it, guessed from the tags
// otherwise. The card page's JSON-LD and the Machine view's records both read it.
import type { Fighter } from './cards';

const TYPE: Record<string, string> = { katagami: 'CreativeWork', atlas: 'CreativeWork', ommc: 'WebSite', powerlifting: 'WebSite' };
const CATEGORY: Record<string, string> = {
  turboslide: 'BusinessApplication', jarhead: 'UtilitiesApplication', mailroom: 'CommunicationApplication', elo: 'BusinessApplication',
  podium: 'BusinessApplication', sevenfold: 'ReferenceApplication', 'kevin-wiki': 'ReferenceApplication', ariadne: 'EntertainmentApplication',
  cotfly: 'EntertainmentApplication', 'bday-land': 'EntertainmentApplication',
};

/** The JSON-LD @type, and applicationCategory when that type is SoftwareApplication. */
export function workType(f: Fighter): { type: string; category?: string } {
  const type = TYPE[f.id] ?? 'SoftwareApplication';
  if (type !== 'SoftwareApplication') return { type };
  const category = CATEGORY[f.id] ?? (f.disciplines.includes('Game') ? 'GameApplication' : f.disciplines.includes('Agent') || f.disciplines.includes('Infra') ? 'DeveloperApplication' : 'DesignApplication');
  return { type, category };
}
