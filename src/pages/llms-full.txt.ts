import { llmsFullTxt } from '../lib/twins';
export const GET = () => new Response(llmsFullTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
