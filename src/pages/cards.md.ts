import { cardsMd } from '../lib/twins';
export const GET = () => new Response(cardsMd(), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
