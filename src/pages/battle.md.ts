import { battleMd } from '../lib/twins';
export const GET = () => new Response(battleMd(), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
