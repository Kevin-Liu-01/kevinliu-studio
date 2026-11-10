# Result 023: the battle's pops, their causes, one fix, and a recommendation (lane C, 2026-11-10)

Plan: [023](../023-battle-first-paint-and-pops.md). One fix shipped on `improve/p2-battle` (see the lane report for
its hash); three things are left to the play lane. Evidence is kept in `~/k7-rescue/improve-audit/lane-c/023/`.

## Method

- A build of lane C (base `4025230` plus plans 018, 019 and 022), served from a snapshot of `dist/`.
- Paint captures with `scripts/paint-capture.mjs` through agent-browser at 1440 x 900: a cold Arena load, a cold Mat
  load, and a switch from Mat to Arena with the M key, before and after the fix. Read as contact sheets of the frames
  that change the picture (`sheet.py`).
- A second reading from the page itself (`probe.mjs`, Playwright Chromium): every animation frame, whether the page is
  still hidden, each pad's and flag's `data-on` and computed opacity, and the rail's and console's opacity.
- Candidate fixes were tried in a browser first by patching `board.js` on its way to the page, so nothing was built
  or committed for a fix that failed.
- This Mac was under load from other sessions. Only the order and count of paints carry; times do not.

## What the captures showed

| Question | Before | After |
| --- | --- | --- |
| Arena load: pads on the floor before any card | yes: first Arena frame `before-arena-load/f00003.jpg` has both pads, `f00006.jpg` none, `f00014.jpg` the player's again | no: first Arena frame `after-arena-load/f00002.jpg` has none; each pad arrives once, with its card |
| Arena load: flags before any card | no (opacity 0 in the first visible frame of every run) | no |
| Mat to Arena: pads in the first Arena frame | yes (`before-mat-to-arena/f00038.jpg`) | yes (`after-mat-to-arena/f00037.jpg`) |
| Mat load: blank or rail-less battle frames | 0 (the first battle frame, `f00001.jpg`, already has the board) | not re-read frame by frame; the fix touches only the Arena |
| Font gate last to lift | no: font 190 ms, first contentful paint 2328 ms (Arena); 102 and 1160 ms (Mat) | no: 93 and 3624 ms (Arena); 120 and 1188 ms (Mat) |
| Interface between the two entrance shots | rail and console return to opacity 1 for about 0.7 s, then drop again | the same (not this plan's to change) |

## The fix that shipped, and the one that did not

- **Shipped:** on a deal (`ctx.dealing`) the Arena creates its pads with `data-on="false"`, which is what
  `drawSides()` writes a moment later. One anchored pair on `public/battle/arena/board.js` in `scripts/sync.mjs`.
- **Tried and not shipped:** creating the pads hidden always (the plan as first written). It removes the pop on a
  deal but makes a switch from Mat to Arena fade the pads in over 0.2 s (opacity 0, 0.02, 0.07, 0.71, 0.94, 1).
- **Not needed:** the flags' half of the plan. They were never seen on a visible page before their card.
- **Not reached:** a reload in the middle of a hand. By the code it mounts with `dealing` false, the mode switch's path.

## Recommendation

In the order of what a visitor would notice most, and none of it started here:

1. **Hide the interface for the batch, not for each shot** (r4/play: `shared/battle.js`, `mat.css`, `arena.css`,
   `hud.css`). This is the pop a visitor sees most often: every turn with two shots flickers the rail, console, plates,
   log and turn tab between them. It is a small change in one place (set `data-scene` when the batch starts, clear it
   when the batch ends, keep the per-shot kind in another attribute for the rules that need it) and can land as an
   anchored pair on the site or, better, in the round. It needs a design look at each `[data-scene]` rule, which is
   why this spike did not try it.
2. **Split `kit.js` per card when the kit is rebuilt for 26 cards** (plan 026). It is the larger half of the megabyte
   in front of the first paint and holds 18 cards' scenes for a hand of six. Rebuilding it only to split it is not
   worth a separate pass: do it in the same rebuild. Until then, registering only the six cards' scenes at
   `battle.js:53` is a smaller step the round could take alone.
3. **Let the static rail paint before the boot finishes** (scope `data-boot` to `#board` and `.console`). Worth
   trying only after 1 and 2: on its own it trades a blank page for a rail over an empty board, and whether that
   reads better is a judgement for the round's judges, not a measurement.
4. **Leave the font gate.** It was not the last thing to lift in any run, the face is 28.8 KB and preloaded, and the
   boot gate hides the page for longer anyway. Remove it only if a Vercel preview on a slow line shows the face
   arriving after the boot.

Real load times need a Vercel preview, which needs Kevin's yes. Nothing here was measured on a deployed copy or on a
phone.
