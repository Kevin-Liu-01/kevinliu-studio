import { SITE } from '../lib/site';
// Search and answer engines are all welcome, and so is every file a page renders with.
const body = `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap-index.xml
`;
export const GET = () => new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
