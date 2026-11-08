---
name: kevinliu-studio-scripts
description: Procedure for scripts/ in kevinliu-studio: the round sync, the release guard, the smoke check, the paint capture and the icon builder. Read before editing a script.
---

# scripts/

- `sync.mjs`: add a file to the site by widening an allow-list rule, never by copying. A patch to round code must name
  text that occurs once; keep the anchors short and distinctive. After a change, `pnpm sync`, then `git diff --stat`
  on the synced folders to see that only what you meant moved.
- `phone-memory.mjs`: the patches that keep a phone's tab under its memory limit. Add one as an anchored pair in `PHONE`;
  restore the patched files from git and run `node scripts/phone-memory.mjs` to re-apply all of them without the rounds.
- `verify-build.mjs`: a new site-wide rule goes here so it fails the build, not in a checklist.
- `smoke.mjs`: runs against a deployment; add a route here when a page is added.
- `check-seo.mjs`: runs against a deployment or a local serve of dist; every sitemap page and the 404 for share tags, a
  200 1200 x 630 JPEG share image with alt, JSON-LD and its twin, and every link (`--external` for outside links,
  unsigned, so a private repository fails). Sites that refuse scripts (LinkedIn, X, princeton.edu, Devpost) print as
  notes.
- `machine-check.mjs`: compares two served builds: the human view pixel for pixel, every region's box in Human and
  Machine at 1440, 730, 390 and 320, the keyboard switch, the stored mode, machine forms that overflow, and screenshots
  of both modes. Layout shifts while switching need `ENGINE=chromium` (it runs without WebGL); WebKit reports none and
  the report says "not measured". Run both after a change to a page's markup or `src/styles/machine.css`.
- `icons.mjs`: rewrites the touch, manifest and ico icons from `public/favicon.svg`.
- `paint-capture.mjs`: screencasts an agent-browser page to timestamped frames for the `ui-recording-timeline`
  skill; the procedure is in `docs/performance.md`.
- `smoke.mjs` takes `VERCEL_OIDC_TOKEN="$(vercel project token kevinliu-studio --scope kl01s-projects)"` for a
  protected preview.
