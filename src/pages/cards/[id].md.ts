import { fighters, byId } from '../../lib/cards';
import { cardMd } from '../../lib/twins';
export const getStaticPaths = () => fighters.map((f) => ({ params: { id: f.id } }));
export const GET = ({ params }: { params: { id: string } }) => new Response(cardMd(byId[params.id]), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
