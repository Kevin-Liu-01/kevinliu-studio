import { fighters, byId } from '../../../lib/cards';
import { cardMd } from '../../../lib/twins';
import { OTHER } from '../../../i18n/locales.mjs';
export const getStaticPaths = () => OTHER.flatMap((lang) => fighters.map((f) => ({ params: { lang, id: f.id } })));
export const GET = ({ params }: { params: { lang: string; id: string } }) => new Response(cardMd(byId[params.id], params.lang), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
