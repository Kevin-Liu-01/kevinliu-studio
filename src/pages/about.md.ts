import { aboutMd } from '../lib/twins';
export const GET = () => new Response(aboutMd(), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
