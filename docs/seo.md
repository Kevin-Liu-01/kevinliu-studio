# Search, answers and share cards

Kevin, 2026-11-07: "massively improve my seo and geo and aeo and include more about myself in the llms.txt. also use
og:images in all my links. and make more links!"

## What every page carries

| Part | Where | What |
| --- | --- | --- |
| Title, description, canonical, robots | `src/components/Seo.astro` | A description is one sentence of 50 to 170 characters; the 404 is `noindex` without a canonical. No hreflang: the site is English only. |
| Share card | `Seo.astro`, `src/lib/share.ts` | `og:image` 1200 x 630 JPEG with `og:image:alt`, `twitter:card` `summary_large_image`. Home and the cards use the rounds' `public/og/<id>.jpg` and loop; `/about`, `/cards`, `/battle`, `/battle/arena` and the 404 use `/share/<name>.jpg`, built at build time from the cards' own share images and Katagami Sans (satori lays out, sharp rasters). |
| JSON-LD | `src/lib/schema.ts` | One `@graph` per page: `WebSite`, `Person` (Kevin, `@id` `/#kevin`, the same node everywhere; `worksFor` only on `/about`), the page (`CollectionPage`, `ItemPage`, `ProfilePage`, `WebPage`), its `BreadcrumbList`, and what it is about: the `ItemList` of cards, a card's project (`SoftwareApplication`, `VideoGame`, `WebSite` or `CreativeWork`) with a `SoftwareSourceCode` node when its repository is public, or the battle's `VideoGame`. No ratings, reviews, offers or FAQ markup: the guard fails on them. |
| Answer first | `answerOf()` in `src/lib/cards.ts`, `src/lib/twins.ts` | A card page and its twin open with "<Card> is <its line>". `/about` and its twin open with the bio; `/about` ends with a few questions that have real answers. |
| Markdown twin | `src/lib/twins.ts`, `vercel.json` | Every twin answers `text/markdown` with `Link: <page>; rel="canonical"`, so search engines fold it into its page. Markdown carries no meta tags, so a twin cannot have a share image of its own. |
| Sitemap | `astro.config.mjs` | Every indexable page with `lastmod`: the date of the last commit that changed what the page prints. |

## Links

- Card pages: live site, public source, the battle with that card leading (`teamFor()`), three related cards
  (`relatedOf()`, shared disciplines), previous and next.
- `/cards`: every card with its year, line, live site and public source.
- Footer: profiles, email, `/cards`, the page's twin, `llms.txt`, the sitemap.
- Repositories GitHub answers 404 for without a sign-in are listed in `CLOSED` (`src/lib/cards.ts`) and never linked.

## Facts about Kevin

`FACTS` and `ALSO_KNOWN_AS` in `src/lib/site.ts`, each line with its public source in a comment. They feed the About
section of `llms.txt` and `llms-full.txt` and the questions on `/about`. Only public sources: this site, his previous
site, his GitHub profile and Kevin-Wiki pages `kb` does not mark private. Strike a line by deleting it.

## Checking it

1. `pnpm build` (the guard checks share image size and alt, the graph, the twin and the sitemap's `lastmod`).
2. `node scripts/check-seo.mjs <url> --external` against a deployment or a local serve of `dist`.
3. Lighthouse SEO on `/`, `/about` and a card page: 100 on 2026-11-07.
