# Architecture entropy: map, progress and task pool

Kevin, 2026-11-28: reduce the codebase's architectural entropy round by round (one source of truth per fact, one
implementation per concept, deep modules, low coupling, local change, deletion over accumulation, enforced by checks).
This file is the progress log, the task pool and the list waiting on Kevin. Decisions are in `docs/adr/`. Raw
measurements and the mapping run are in `~/k7-rescue/arch-2026-11-28/`.

## The map (2026-11-28, production main ba959ef)

Two repositories. The rounds (`portfolio-design-rounds`, private) write the cards (`r4/ex`), the battle (`r4/play`) and
the sound (`r4/sound`). This site copies them in with `scripts/sync.mjs` (allow-lists, a per-stage pin, about 113
anchored text patches) and prints them at build.

| Layer | Owns | Depends on |
| --- | --- | --- |
| Round material (`public/ex`, `public/battle`, `public/sound`, `public/og`, `vendor/`) | the card, battle and sound code, as synced | nothing here; changed only by `pnpm sync` |
| Build-time data (`src/lib/cards.ts`) | loads `fighters.js`, `markup.js` and the env through `node:vm`; the roster, `card()`, the battle roster | round material |
| Facts (`src/lib/site.ts`, `src/i18n/`) | Kevin's bio, links, per-card site overrides; the locales; the translated strings | cards.ts |
| Text model (`src/lib/twins.ts`) | every Markdown twin, `llms*.txt`, the TWINS route registry | cards, site, i18n |
| Derived surfaces (`schema.ts`, `machine.ts`, `share.ts`, `i18n-room.ts`, `i18n-battle.ts`) | JSON-LD, the Machine view, share images, the translated wall and battle | twins, cards, i18n |
| Frame and views (`src/layouts/Base.astro`, `src/components/`, `src/views/`) | the page head, header, footer; each page kind | everything above |
| Routes (`src/pages/`, `src/pages/[lang]/`) | thin shells: a view plus a language code | views, twins |
| Gate (`package.json` build, `scripts/`) | lint, tests, lock, translation source, Astro, minify, release guard | dist, the repo |

No import cycles among `src/lib` and `src/i18n` (checked import by import).

### Who writes the shared runtime state

| State | Writers | Note |
| --- | --- | --- |
| `html[data-mode]`, `localStorage ill-mode` | `Base.astro` boot and click handler; `gallery.js` `setMode` on the wall | two writers for one switch on `/` |
| `html[data-paused]`, `ill-pause` | `Base.astro` boot only; `gallery.js` `setPaused` writes `ill-pause` but not the flag | the favicon loop ignores Pause on the wall (bug, round side) |
| `kevin-liu-studio:sound`, `ill-mode`, `ill-pause` | keys in `src/lib/state.mjs` (with the one sound-wanted rule); `sound.js` and `gallery.js` use the same keys, checked by `architecture.test.mjs` | `html[data-sound]` is now written only by `sound.js`, and read nowhere |
| `html[data-hold]` | `Home.astro` | the wall's first-paint hold |
| `self.__table` | `gallery.js` | read by `Home.astro` (Machine dock) and `Release.astro` (bfcache address) |
| wall address `#you=&rival=&seed=` | `gallery.js`; `Release.astro` re-serializes it | two writers of one format |

### Technical solutions in use

Astro 7 static output; inline scripts for pre-paint work; round HTML built as strings and patched with exact-once
string and regex swaps; translation by reverse-matching the rounds' English (wall) and by a string table (battle);
content addresses (`?v=sha256[0:10]`); `html[data-*]` flags as the cross-script state bus; Vercel's legacy `routes`
list; `node:test`; `oxlint`; esbuild for minifying round code; satori and sharp for share images.

## Rounds

| Round | What | Status |
| --- | --- | --- |
| 0 | Measure every route and interaction on the throttled phone and desktop (docs/performance.md, 2026-11-28); prerender the next page on hover on desktops; analytics waits for a prerender to open | done: a88f95f |
| 1 | One build gate: lint, tests and every offline check inside `pnpm build`; the vercel.json route contract; dead scripts out (ADR 0001) | done: 0142f25 |
| 2 | English reads the same word tree as every language (F1); one content hash, host, abs, CODES, SITE, language split; locale typography in LOCALES; `scripts/architecture.test.mjs` enforces each single source and no import cycles | done: edfc3c2, b468ec3, c7a1409 |
| 3 | One twin endpoint over TWINS (F9); one twin lookup and one mode-key sync (P2, P3); a visitor's saved-choice keys and sound rule in `state.mjs` (P1); every hand-kept card id list guarded (F7); the rounds' card record checked as it loads, one vm loader (F3) | done: 7c838ed, d8d8e5d, be5b02f, 42c9d66, and the next commit |

## Task pool

Value and effort are 1 to 5. "After sync" means the fix edits files the battle-026 session owns until its sync lands.

| Id | Task | Value | Effort | When |
| --- | --- | --- | --- | --- |
| F6 | Pages stop re-parsing the twins' Markdown by heading text and blank lines: `twins.ts` exposes named blocks | 4 | 4 | now |
| F8 | The card count comes from `fighters.length` in the description template | 2 | 2 | with the next translation run |
| F12 | Delete the missing-file fallbacks that silently drop the battle roster | 3 | 1 | after sync (battle-026 may move those files) |
| L1 | A page's sitemap lastmod follows its source files' commits, so a pure refactor re-dates pages (232 after F1) and IndexNow would resend them; date a page by a hash of what it prints instead | 3 | 2 | now |
| V1 | Read the hover prerender's gain in a real browser on a preview (automation blocks prerendering) | 3 | 1 | next preview |
| P3b | Drop Seo's `twin` prop once BattlePage stops passing it (twinOf gives the same value) | 1 | 1 | after sync |
| P4 | Views' string patches go through one exact-count helper (`swap`) | 3 | 2 | now |
| P5 | Card descriptions are cut in one place (Seo) | 2 | 1 | now (diff translated card descriptions) |
| M12 | Rounds as a checked package, synced by pin with no JS transforms (design below) | 5 | 5 | after sync |
| B1-B3 | Upstream the 15 sound.js, ~40 wall and ~30 battle patches | 5 | 4 | after sync |
| A1-A3 | Mount paths and site adaptations become config the round code reads | 4 | 3 | after sync |
| D1 | One lean-device predicate shared by the wall, the battle and the site | 3 | 2 | after sync |
| D4 | The site imports the rounds' card env builder instead of copying it | 3 | 2 | after sync |
| T10 | `docs/sync.md` stops restating the patch list and pins | 2 | 1 | after sync |

## Waiting on Kevin

| Item | Why it needs Kevin |
| --- | --- |
| A card's ink cost differs between the wall and the battle for 7 cards (Glyphfield 4/3, Katagami 2/1, Loop 3/2, bday.land 2/1, CoTFly 2/1, Princeton TD 2/1, Kevin Wiki 3/2) | which number is the card's cost is a product call; the twins print the wall's and ask the reader to fit the battle's budget |
| The twin calls the stats attack/defence/speed, the card Reach/Proof/Pace | changing the twin's words needs a translation run |
| The frost tile at 1x on phones (`icons/frost@2x.webp` 89 KB to 23 KB on the first screen) | a visual call: the frosted slips' grain is softer at 1x on a 1.75x to 3x screen |
| Load the wall's sound kit (`boot.gallery.js`, `sound.js`, 15 KB at High priority) after the first screen | a timing call: a press before it loads would be silent (docs/sound.md) |
| The site's Vercel firewall challenges a client after about 2,000 requests in a few minutes | a measurement run tripped it and the challenge then showed in Kevin's own browser on the same network; whether real visitors can hit it is a Vercel setting |
