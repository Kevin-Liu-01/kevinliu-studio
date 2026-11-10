// A translated battle's words (src/i18n/<locale>/battle.json, from the rounds' r4/play shared/strings.js): the page
// loads this before the battle's modules, which read globalThis.BATTLE_STRINGS key by key and fall back to English.
// Cached by content address (BattlePage.astro, vercel.json).
import { battleStrings } from '../../lib/i18n-battle';
import { OTHER } from '../../i18n/locales.mjs';
export const getStaticPaths = () => OTHER.map((lang) => ({ params: { lang } }));
export const GET = ({ params }: { params: { lang: string } }) => new Response(battleStrings(params.lang), { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
