import { SITE } from '../lib/site';
// Search and answer engines are all welcome, and so is every file a page renders with. The answer engines' crawlers
// are named too, so a crawler that only reads its own group still finds an Allow.
const AGENTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot'];
const body = `User-agent: *
Allow: /

${AGENTS.map((a) => `User-agent: ${a}`).join('\n')}
Allow: /

Sitemap: ${SITE}/sitemap-index.xml
`;
export const GET = () => new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
