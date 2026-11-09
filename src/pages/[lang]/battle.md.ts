import { battleMd } from '../../lib/twins';
import { OTHER } from '../../i18n/locales.mjs';
export const getStaticPaths = () => OTHER.map((lang) => ({ params: { lang } }));
export const GET = ({ params }: { params: { lang: string } }) => new Response(battleMd(params.lang), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
