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
