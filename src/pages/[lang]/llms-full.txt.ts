import { llmsFullTxt } from '../../lib/twins';
import { OTHER } from '../../i18n/locales.mjs';
export const getStaticPaths = () => OTHER.map((lang) => ({ params: { lang } }));
export const GET = ({ params }: { params: { lang: string } }) => new Response(llmsFullTxt(params.lang), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
