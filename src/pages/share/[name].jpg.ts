// The generated share images (src/lib/share.ts), written once at build as /share/<name>.jpg
import { SHARES, renderShare } from '../../lib/share';
export const getStaticPaths = () => Object.keys(SHARES).map((name) => ({ params: { name } }));
export const GET = async ({ params }: { params: { name: string } }) => new Response(new Uint8Array(await renderShare(params.name)), { headers: { 'Content-Type': 'image/jpeg' } });
