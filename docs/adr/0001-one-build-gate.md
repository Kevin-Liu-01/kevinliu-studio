# 0001: `pnpm build` is the one gate

2026-11-28. Accepted.

## Context

Vercel runs `pnpm build`. CI ran nine steps, five of which `pnpm build` did not: the tests, the negotiation check, the
translation-source check, the phone-memory marker check and the Release script check. So a production deploy could
ship with a failing test or a `vercel.json` whose languages no longer matched `src/i18n/locales.mjs`; CI only reported
it afterwards. Two of CI's steps (the lock check, the phone marker) repeated what the build already did. `scripts/`
(2,200 lines, the sync and the release guard) had no lint at all.

## Decision

`package.json` `build` runs every offline check, in order: `oxlint` (correctness rules, `.oxlintrc.json`), `pnpm test`,
the lock check, the translation-source check, Astro, the minifier, the release guard and the Release script check. CI
runs `pnpm check` (the type check, which needs `astro check`'s generated types) and `pnpm build`, nothing else.

`scripts/check-negotiation.mjs` became `scripts/negotiation.test.mjs` under `node:test`, and gained the route contract:
every language alternation in `vercel.json` equals `OTHER`, and every page alternation equals the pages `src/pages`
holds. `scripts/run-agent-docs.ts` (unreferenced, needed `tsx`, which is not a dependency) was deleted.

## Consequences

- A new check goes in the build or in `pnpm test`, never only in CI.
- The build is about 2 s longer (lint 0.2 s, tests 0.9 s, translation source 0.1 s).
- Adding a language or a page without updating `vercel.json` fails the build.
