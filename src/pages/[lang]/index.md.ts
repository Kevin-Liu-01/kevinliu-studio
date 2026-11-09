import { homeMd } from '../../lib/twins';
import { OTHER } from '../../i18n/locales.mjs';
export const getStaticPaths = () => OTHER.map((lang) => ({ params: { lang } }));
export const GET = ({ params }: { params: { lang: string } }) => new Response(homeMd(params.lang), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
