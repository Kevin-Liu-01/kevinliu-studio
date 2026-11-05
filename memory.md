# memory.md

Append-only log of agent sessions in this repo. Newest last. Never rewrite earlier entries.

## 2026-11-05: the repo is created (merge run, Claude Code)

- **Type**: build
- **Asked**: Kevin, 2026-11-05: "a new dedicated repo that ill swap into kevinliu.studio ... with all better
  seo/geo/aeo, conntext, docs, and analytics integrations. a nnew codebase with new look and everything, in one repo".
- **Goals as stated back**: 26 ex-quality cards with real logos and real-feature moves; one battle engine with Mat
  and Arena; ElevenLabs sound only for the visitor's own actions; Claude of Tanks with the A-wedge hero tank.
- **Changed**: everything (new repo). Astro 7 static site; `scripts/sync.mjs` pulls r4/ex, r4/sound, r4/play with r3
  media; `src/lib/cards.ts` prints cards with the rounds' own markup.js at build; twins, llms files, JSON-LD,
  sitemap, robots; Vercel Analytics and Speed Insights behind DNT/GPC; `scripts/verify-build.mjs` release guard;
  docs/.
- **Decisions** (reversible): Astro over Next.js (no client framework needed); gallery music loop off; the battle's
  card swap and the eight new cards' registration wait for battle-r4b; essays not ported; bio line from the previous
  site's llms.txt.
- **Open**: PostHog (ask Kevin); battle card swap and 26-card battle; battle sound (battle-r4b); k4 art and variety
  runs still writing r4/ex (rerun `pnpm sync`); GitHub repo, Vercel project and the swap need Kevin's yes.

## 2026-11-05: review fixes, Kevin's answers (merge run, Claude Code)

- **Type**: fix + content
- **Asked**: Kevin, 2026-11-05: "1. just vercel 2. [his bio] 3. lets fix the email yeah to use kevinliu.studio.
  4. approved" (4 approves the first deploy and the swap).
- **Review**: five-lens adversarial review (wf_90550a5f-71b), each finding checked by a skeptic. Fixed every confirmed
  finding except the 320px Arena rail and the home wall's lack of `<a>` links to card pages (both low; open below).
- **Changed**: `src/pages/SKILL.md` moved to `src/SKILL.md` (Astro published it and the build failed); `vercel.json`
  rewritten as one `routes` list so `Accept: text/markdown` runs before the filesystem, plus redirects for the old
  site's `/en`, resume and `projects.md`; `scripts/sync.mjs` now plans, scans and only then writes, removes only files
  the last lock listed, fails on missing named files, drops two captures (Elo sign-in, Turboslide credit), paints out
  the General Translation line in two Elo captures, fixes the Prototemplate clip path, the probe's `<base>`, the
  reduced-motion pack reveal, battle tab titles and the phone h1; `scripts/location.mjs` checks WebP/PNG EXIF, XMP
  and video location atoms in both the sync and the guard; `/battle/arena.md`; 404 noindex; Person node on card and
  battle pages; per-card schema types; `sameAs` only for a card's own repo; skip link, focus after a mode switch,
  footer Machine button on phones, dock scroll padding; the card font inlined only on room pages.
- **Content**: `/about` is Kevin's bio word for word (`ABOUT` in `src/lib/site.ts`); `BIO` is a third-person line
  without the employer; email `hello@kevinliu.studio` (the domain has no MX record yet); analytics stay Vercel only.
- **Open**: Arena rail at 320px; wall cards as real links; agent-docs kit should learn Astro's routed `src/pages`;
  mail for kevinliu.studio.
