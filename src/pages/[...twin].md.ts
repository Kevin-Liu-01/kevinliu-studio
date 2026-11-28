// Every page's Markdown twin, in every language, from one registry: TWINS (src/lib/twins.ts) maps a page's path to its
// twin, and twinPath names the file (/index.md, /es/index.md, /cards/elo.md), so a page added to TWINS has its .md here.
import { TWINS, twinPath } from '../lib/twins';

export const getStaticPaths = () => Object.keys(TWINS).map((path) => ({ params: { twin: twinPath(path).slice(1, -'.md'.length) }, props: { path } }));
export const GET = ({ props }: { props: { path: string } }) => new Response(TWINS[props.path](), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
