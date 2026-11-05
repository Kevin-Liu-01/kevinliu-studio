import { homeMd } from '../lib/twins';
export const GET = () => new Response(homeMd(), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
