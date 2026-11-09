// A translated wall's lens sheets and labels (src/lib/i18n-room.ts), cached by content address (index view, vercel.json)
import { fighters } from '../../lib/cards';
import { galleryShim } from '../../lib/i18n-room';
import { OTHER } from '../../i18n/locales.mjs';
export const getStaticPaths = () => OTHER.map((lang) => ({ params: { lang } }));
export const GET = ({ params }: { params: { lang: string } }) => new Response(galleryShim(params.lang, fighters), { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
