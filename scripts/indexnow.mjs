// IndexNow: tells Bing (whose index ChatGPT search, Copilot and DuckDuckGo read) and Yandex which pages changed, so they
// recrawl within hours. The key is public by design; the site serves it at /<key>.txt (public/), and IndexNow checks it.
//
//   node scripts/indexnow.mjs --since 2026-11-18        list the sitemap's pages whose lastmod is on or after that day
//   node scripts/indexnow.mjs --all                     list every page in the sitemap
//   ... --send                                          send the list (after a production deploy, with Kevin's go)
//   ... --base https://www.kevinliu.studio              the deployment whose sitemap and key file are read (default)
//
// It reads the live sitemap, so run it after the deploy it announces. Without --send it only prints.
import { SITE } from '../src/lib/site.ts';
const KEY = 'cb6a3653b4728bdc971aba0603513583';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const base = (arg('--base') ?? SITE).replace(/\/$/, '');
const since = arg('--since'), all = process.argv.includes('--all'), send = process.argv.includes('--send');
if (!all && !since) { console.error('indexnow: give --since <date> or --all'); process.exit(2); }
if (since && Number.isNaN(Date.parse(since))) { console.error(`indexnow: --since ${since} is not a date`); process.exit(2); }

const text = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.text(); };
// IndexNow fetches the key file to prove the sender owns the host: a send stops without it, a list only warns
const key = await text(`${base}/${KEY}.txt`).then((x) => x.trim(), () => null);
if (key !== KEY) {
  console.error(`indexnow: ${base}/${KEY}.txt does not hold the key (deploy public/${KEY}.txt first)`);
  if (send) process.exit(1);
}
const maps = [...(await text(`${base}/sitemap-index.xml`)).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const pages = (await Promise.all(maps.map(text))).flatMap((x) => [...x.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map((m) => ({ url: m[1], lastmod: m[2] })));
const urls = pages.filter((p) => all || (p.lastmod && Date.parse(p.lastmod) >= Date.parse(since))).map((p) => p.url);
const host = new URL(base).host;
if (urls.some((u) => new URL(u).host !== host)) { console.error(`indexnow: the sitemap names another host than ${host}`); process.exit(1); }
console.log(`indexnow: ${urls.length} of ${pages.length} pages${all ? '' : ` changed since ${since}`}`);
for (const u of urls.slice(0, 12)) console.log(`  ${u}`);
if (urls.length > 12) console.log(`  ... and ${urls.length - 12} more`);
if (!send) { console.log('indexnow: not sent (add --send)'); process.exit(0); }
if (!urls.length) process.exit(0);
const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ host, key: KEY, keyLocation: `${base}/${KEY}.txt`, urlList: urls.slice(0, 10000) }) });
console.log(`indexnow: ${ENDPOINT} answered ${r.status} ${r.statusText}`);
process.exit(r.status === 200 || r.status === 202 ? 0 : 1);
