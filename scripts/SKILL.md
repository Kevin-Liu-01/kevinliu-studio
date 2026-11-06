---
name: kevinliu-studio-scripts
description: Procedure for scripts/ in kevinliu-studio: the round sync, the release guard, the smoke check, the paint capture and the icon builder. Read before editing a script.
---

# scripts/

- `sync.mjs`: add a file to the site by widening an allow-list rule, never by copying. A patch to round code must name
  text that occurs once; keep the anchors short and distinctive. After a change, `pnpm sync`, then `git diff --stat`
  on the synced folders to see that only what you meant moved.
- `verify-build.mjs`: a new site-wide rule goes here so it fails the build, not in a checklist.
- `smoke.mjs`: runs against a deployment; add a route here when a page is added.
- `icons.mjs`: rewrites the touch, manifest and ico icons from `public/favicon.svg`.
- `paint-capture.mjs`: screencasts an agent-browser page to timestamped frames for the `ui-recording-timeline`
  skill; the procedure is in `docs/performance.md`.
- `smoke.mjs` takes `VERCEL_OIDC_TOKEN="$(vercel project token kevinliu-studio --scope kl01s-projects)"` for a
  protected preview.
