# kevinliu.studio: agent index

Kevin Liu's site. 26 of his projects as collectible cards, a Mat and Arena battle, and their sound. Astro 7, static.
Read `memory.md` before acting and append to it after every meaningful change.

## Where things are

| Path | What | Edit? |
| --- | --- | --- |
| `src/pages/` | home (the wall), `/cards/<id>`, `/battle`, `/battle/arena`, `/about`, `/404`, the `.md` twins, `llms*.txt`, `robots.txt` | yes |
| `src/lib/cards.ts` | loads the round card code at build in CommonJS sandboxes; `card()`, `fighters`, `whatOf()`, `factLines()`, the battle roster | yes |
| `src/lib/twins.ts` | the Markdown twin of every page; `.md` endpoints, `llms*.txt` and the Machine view print from it | yes |
| `src/lib/site.ts` | name, bio, links, the previous site | yes |
| `src/lib/battle.ts`, `src/components/BattlePage.astro` | the battle page split into head and body, with its paths pointed here | yes |
| `src/layouts/Base.astro`, `src/components/` | the frame, SEO head, header, footer, Machine view, analytics | yes |
| `vercel.json` | one `routes` list: redirects, headers, Markdown negotiation, files, clean URLs, 404 | yes |
| `src/styles/site.css` | the site's layer over the card room's `ui.css` | yes |
| `scripts/sync.mjs` | pulls round material by allow-list, patches, scans; writes only when every check passes | yes, carefully |
| `scripts/verify-build.mjs` | the release guard after every build | yes |
| `public/ex`, `public/battle`, `public/sound`, `public/og`, `vendor/` | synced round material | **never by hand**: `pnpm sync` |
| `docs/` | architecture, sync, content, sound, battle, deploy, performance | yes |

## Rules

- The design rounds (`~/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`) are the source of the cards, battle and
  sound. Change them there, then `pnpm sync`. A fix to round code that this site needs goes in `TRANSFORMS` in
  `scripts/sync.mjs` as an anchored patch, never as an edit to a synced file. Never write in the rounds folder.
- Pages that print cards set `<base href="/ex/">`. Every link the site writes is absolute.
- Nothing from the franchise the cards are inspired by: no names, marks, fonts, energy icons or trainer sprites. No
  real people's names or photos. General Translation only on the Atlas card. Never request or link the OMMC portal's
  participant routes. The guard and the sync scan fail on these.
- Never ship the ElevenLabs key, takes or receipts. Sound plays only for the visitor's own actions and defaults off
  under reduced motion.
- Nothing pops: a page paints whole, keeps the header still, and names its assets by content address
  (`docs/performance.md`). Record a change that touches first paint with `scripts/paint-capture.mjs` before and after.
- Every page keeps one h1, a canonical, a share image and loop, JSON-LD and a Markdown twin. `pnpm build` fails
  otherwise.
- Ask Kevin before creating the GitHub repo, pushing, deploying, touching Vercel domains or DNS, adding a paid service
  or entering a credential. The swap runbook is `docs/deploy.md`.
- Commit as `66856750+Kevin-Liu-01@users.noreply.github.com`, by explicit path, at each milestone.
- No `.md` file under `src/pages/`: Astro publishes it as a page. The routes skill is `src/SKILL.md`. `agent-docs
  scaffold` re-creates `src/pages/SKILL.md` because the kit does not know this; delete it, and `pnpm build` fails until
  you do.

## Commands

- `pnpm sync` and `pnpm sync --check`
- `pnpm dev`, `pnpm build` (runs the guard), `pnpm preview`
- `node scripts/smoke.mjs <base-url>` against a deployment
- `node scripts/icons.mjs` after the kl mark changes

## Agent-docs (auto-maintained)

> Machine-derived facts maintained by `agent-docs`; do not hand-edit inside the markers.

<!-- agent-docs:auto:stack start -->
- **Name:** kevinliu-studio
- **Package manager:** pnpm
- **Languages:** typescript
- **Framework:** n/a
<!-- agent-docs:auto:stack end -->

<!-- agent-docs:auto:commands start -->
- Package scripts detected: 6. Use `package.json` as the exhaustive source.
- `pnpm run dev` - astro dev
- `pnpm run build` - astro build && node scripts/verify-build.mjs
- `pnpm run check` - astro check && node scripts/verify-build.mjs
- Keep this block compact. Put full command catalogs in a generated command index, not in AGENTS.md.
<!-- agent-docs:auto:commands end -->

<!-- agent-docs:auto:dirmap start -->
| Directory | Skill | Purpose |
|---|---|---|
| `scripts/` | [`scripts/SKILL.md`](scripts/SKILL.md) | Procedure for scripts/ in kevinliu-studio: the round sync, the release guard, the smoke check and the icon builder. Read before editing a script. |
| `src/lib/` | [`src/lib/SKILL.md`](src/lib/SKILL.md) | Build-time data for kevinliu-studio. cards.ts loads the rounds' card code in CommonJS sandboxes, twins.ts writes every Markdown twin and llms file, site.ts holds Kevin's facts, battle.ts splits the battle page. Read before editing here. |
| `src/pages/` | [`src/SKILL.md`](src/SKILL.md) | Routes of kevinliu-studio. Home prints the 26-card wall, cards/[id] one card page each, battle and battle/arena wrap the round battle page, plus about, 404, the .md twins, llms files and robots. Read before editing here. |
<!-- agent-docs:auto:dirmap end -->

<!-- agent-docs:auto:env start -->
- (none detected)
<!-- agent-docs:auto:env end -->

<!-- agent-docs:auto:repo-graph start -->
- Use Graphify for repo topology, path/explain/affected questions, PR risk, and unfamiliar codebase orientation.
- Use `rg` for exact strings; use Kevin-Wiki `qmd` for people, tools, decisions, and compiled wiki knowledge.
- Use `agent-browser` for browser/UI work; use Playwright only for committed regression tests.
- Runtime memories (Hermes/Hindsight/Honcho) are not project truth until written back to AGENTS.md, SKILL.md, or the wiki.
- Status: `cd ~/repos/Kevin-Wiki && npm run graphify:sidecar -- status --run outputs/graphify/kevinliu-studio`
- Build from this repo: `PROJECT_ROOT="$(pwd)" && cd ~/repos/Kevin-Wiki && npm run graphify:sidecar -- build "$PROJECT_ROOT" --run outputs/graphify/kevinliu-studio --no-viz`
- Query after build: `cd ~/repos/Kevin-Wiki && npm run graphify:sidecar -- query "what should I inspect first?" --run outputs/graphify/kevinliu-studio`
- Never run Graphify installers/hooks or commit generated `graphify-out/` artifacts.
<!-- agent-docs:auto:repo-graph end -->
