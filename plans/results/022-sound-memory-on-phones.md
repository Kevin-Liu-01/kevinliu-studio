# Result 022: decoded audio on a phone profile across three hands (lane C, 2026-11-10)

Plan: [022](../022-sound-memory-on-phones.md). Decision: **go**. Fix: one commit on `improve/p2-battle` (see the lane
report for its hash): the player gains `unload(group)` and a new hand unloads the card kits it does not hold.

## Method

- A build of lane C at `7245c52` (base `4025230` plus plans 018 and 019), served from a snapshot of `dist/`.
- Playwright Chromium 151 (headless) with the `iPhone 14` descriptor; `(pointer: coarse)` asserted true;
  `--autoplay-policy=document-user-activation-required`, so no audio runs before the tap, as in a real browser.
- `/battle?auto=1` with the default hand, speed 2. One tap on the board loads the kit. After each result New Rival is
  pressed. The player's own figure is read at six moments: `Sound.stats().pcm` (decoded PCM bytes, length x channels
  x 4), split into one-shots and music. "Loaded" is read once the decoded total has stood still for 6 s.
- Script: `~/k7-rescue/improve-audit/lane-c/measure-022.mjs`; raw results `before-022-phone.json` and
  `after-022-phone.json` beside it.

**An emulated phone on a loaded Mac is not a real phone.** The decoded sizes are exact: the player asks for a 48 kHz
context everywhere, so a file decodes to the same number of bytes on any device. What an iPhone's WebContent process
does with those bytes (its total, its jetsam line) was not measured, and no real device was used.

## Before (`7245c52`)

| Moment | One-shots MB | Music MB | Total MB | Rival cards |
| --- | --- | --- | --- | --- |
| hand 1, kit loaded | 26.2 | 0 | 26.2 | jarhead, mailroom, cotfly |
| hand 1, result | 26.2 | 0 | 26.2 | |
| hand 2, kit loaded | 32.5 | 28.5 | 60.9 | glyphfield, loop, relay |
| hand 2, result | 32.5 | 2.3 | 34.8 | |
| hand 3, kit loaded | 39.3 | 28.5 | 67.7 | agent-machines, princeton-td, elo |
| hand 3, result | 39.3 | 1.8 | 41.1 | |

`d` = one-shots at hand 3 loaded minus hand 1 loaded = **13.1 MB**. The plan's line for a go is 3.0. Each New Rival
hand added its three new rival cards' kits (6.3 and 6.8 MB a hand, about 2.2 MB a card) and kept every earlier one.

## After (the fix)

| Moment | One-shots MB | Music MB | Total MB |
| --- | --- | --- | --- |
| hand 1, kit loaded | 26.2 | 0 | 26.2 |
| hand 1, result | 26.2 | 0 | 26.2 |
| hand 2, kit loaded | 27.1 | 28.5 | 55.6 |
| hand 2, result | 27.1 | 2.0 | 29.1 |
| hand 3, kit loaded | 27.6 | 28.5 | 56.1 |
| hand 3, result | 27.6 | 1.8 | 29.4 |

`d` = **1.4 MB** (the three hands' rival kits differ a little in size). The same three hands were dealt in both runs.
At the third hand the page holds 11.7 MB less decoded audio, and the gap grows by about 6.5 MB with every further New
Rival hand. A group unloaded and loaded again through the player's own face gives its bytes back and takes them again
(`card:katagami`: 27.6, 26.1, 27.6).

## What this does not settle

- **Music.** A theme is 28.5 MB decoded while a hand plays, on this profile and on every iPhone: the player's
  streaming path tests `navigator.deviceMemory <= 2`, which Safari does not have. (Hand 1 reads 0 at both moments: its "loaded" reading was taken after that
  hand had already ended, because the kit took longer to settle than the hand took to play. Why the first hand holds
  no theme or result stinger then was not looked into; from hand 2 on the theme is there while the hand plays.) The
  choice is Kevin's, in the plan's words: "Themes are decoded whole on every iPhone, because the player's low-memory
  path tests `navigator.deviceMemory`, which Safari does not have. Streaming them on a touch screen
  (`matchMedia('(pointer: coarse)')` added to the test at `r4/sound/sound.js:878`) would save the measured music MB on
  phones and lose loop points, lap changes and the Final Turns layer there. Kevin decides."
- **The base kit.** 26.2 MB of one-shots is the first hand's floor (the battle kit, the board's kit and six cards).
  This plan does not touch it.
- **A real phone.** Whether 11.7 MB (and 6.5 MB more a hand) is what stands between an iPhone and a reload was not
  measured. `docs/performance.md` records the Arena at about 400 MB against a 500 MB budget, so the saving is a few
  percent of the budget per hand, not a cure.
