# Plan 030 result: Claude of Tanks' October footage in the battle's moves

- Date: 2026-11-10. Site commit read: `9098317` (worktree `~/repos/kevinliu-studio-dir`, branch `improve/direction`; the plan was written at `4025230`, and the drift check on the plan's paths printed nothing). Rounds HEAD read: `20496336`.

## Verdicts

- **Sabot Round: GO now.** The scene holds no number in the clip's own pixels and reads cue, view and media from the manifest (`claude-of-tanks.sabot-round.ts:23`, `:33`); its only clip-time numbers are offsets after the cue's start, so the new cue carries them.
- **Killcam: GO with the kit.** The scene holds a point in the clip's own pixels (`claude-of-tanks.killcam.ts:22` `const ENTRY = [322, 280];`, used at `:76`), the new clip needs `[684, 424]`, and scene files only change when `kit.js` is rebuilt.
- **One Spec: GO now.** Its two coordinate pairs are times in milliseconds on the scene's own clock, not pixels (`claude-of-tanks.fx.ts:307`, `:326-327`), and its footage beat has no clip-time numbers (`broadcast/src/scenes.ts:205`).
- **14 v 14 (`column-fire`): GO now.** Same as Sabot Round: only an offset after the cue's start (`claude-of-tanks.column-fire.ts:24`) and no clip pixels.

"GO now" here means: no scene edit is needed, so the clip ships with the manifest entry and the files. The arithmetic below is computed from the code; the reviewer then played all four moves in a browser under today's kit (section "Reviewer's browser run"): the three GO-now clips play, and Killcam plays with its ring in the old place. The spike changed nothing that ships.

Terms. "The kit" is `kit.js`, the bundle of the battle's engine, runtime and every scene file. "The page's manifest" is `r4/play/vendor/broadcast/media.js` (shipped at `public/battle/vendor/broadcast/media.js`). A "cue" is a clip's `in`, `out` and `impact` times in milliseconds: `impact` is the frame of contact. "The scene's impact" is the moment its own timeline fires the hit.

## What I ran

Everything ran in a scratch export (`~/k7-rescue/improve-audit/spike-030`); nothing was written under the live rounds folder or any site worktree. No server, no browser, no build, no commit.

- Step 1 export: `git archive HEAD r3/battle r3/cards r1/study-roster18 r2/plates r4/stage/cot2/footage`, plus the page's manifest at the pin (`git show 42ff51c7:r4/play/vendor/broadcast/media.js`). Byte counts matched the handoff's table for all eleven footage files and the JSON (for example `cot-sabot-round-oct.mp4` 2113150). The page's manifest is 107,810 bytes (the plan expected about 103,000). The rounds status count for `r4/stage/cot2`, `r3/battle/data` and `r3/battle/media-moves` was 1 before and after (` M r3/battle/media-moves/tools/spec.py`, unrelated work; I did not touch it).
- Before running the two tools I read them. `tools/build-data.mjs` writes only `engine/src/roster.gen.ts` and `data/media.gen.{json,js}` (lines 488-492) and, without `--no-copy`, copies media into its own `media/` (lines 155-157); `broadcast/tools/media.py --data-only` writes only `broadcast/data/media.js` under its own folder. All of these are inside the export. The one absolute path, `/Users/kevinliu/Documents/ChatGPT/Personal Website` (`build-data.mjs:18`), is only read.

### Step 2, first attempt (committed-only export), verbatim

```
Error: Missing media for turboslide: /Users/kevinliu/k7-rescue/improve-audit/spike-030/r1/study-roster18/turboslide/media/ts-perfect-export.webp
    at publish (file:///Users/kevinliu/k7-rescue/improve-audit/spike-030/r3/battle/tools/build-data.mjs:148:34)
exit=1
data/media.js: unchanged
exit=0
```

The file exists in the live rounds but is git-ignored.

### Step 2, after the revision (ignored media cloned in), verbatim

```
fighters 18, moves 72, balance overrides 56, text overrides 21, move-media entries 72, media files 32 (10.4 MB, not copied), plates 18: turboslide+object+shader glyphfield+object+shader jarhead+object katagami+object+shader claude-of-tanks+object+shader mailroom+object local-search+object agent-pets+object+shader loop+object agent-machines+object prototemplate+object+shader bday-land+object+shader powerlifting+object+shader elo+object+shader cotfly+object+shader relay+object princeton-td+object+shader kevin-wiki+object+shader
exit=0
data/media.js: unchanged
exit=0
```

### Step 3 (footage copied in, move-media JSON replaced), verbatim

```
fighters 18, moves 72, balance overrides 56, text overrides 21, move-media entries 72, media files 32 (10.4 MB, not copied), plates 18: turboslide+object+shader glyphfield+object+shader jarhead+object katagami+object+shader claude-of-tanks+object+shader mailroom+object local-search+object agent-pets+object+shader loop+object agent-machines+object prototemplate+object+shader bday-land+object+shader powerlifting+object+shader elo+object+shader cotfly+object+shader relay+object princeton-td+object+shader kevin-wiki+object+shader
data/media.js: claude-of-tanks
```

Only one card changed, as the plan expects.

## The change to the page's manifest

Step 4 output, verbatim:

```
r3 entries changed by the footage: claude-of-tanks
fields of its entry that changed: moves
page entry equals the r3 entry before the footage: false
  page differs from r3-before in field: gates
other cards untouched in the splice: true
media-moves/claude-of-tanks/cot-sabot-round-oct.mp4 {"in":1000,"out":4000,"impact":1267,"unit":"ms"} 1600x900
media-moves/claude-of-tanks/cot-killcam-xray-oct.mp4 {"in":0,"out":3500,"impact":800,"unit":"ms"} 1600x900
media-moves/claude-of-tanks/cot-one-spec-oct.mp4 {"in":1300,"out":4000,"impact":2433,"unit":"ms"} 1600x900
media-moves/claude-of-tanks/cot-column-fire-oct.mp4 {"in":1300,"out":4400,"impact":2800,"unit":"ms"} 1600x900
```

Anchor check on the spliced file (the three patches in `scripts/sync.mjs:233-235`; each must match once):

```
1 "card":{"src":"media/elo/card-elo-hub.png","kind":
1 "card":{"src":"media/turboslide/ts-hero-agents-rep
1 "src":"media/prototemplate/pt-every-sentence.mp4"
```

Only the entry's `moves` field changes (`id`, `title`, `card`, `plate`, `credit`, `gates` are equal before and after). The spliced file is 106,322 bytes against 107,810 (the painted-out boxes are gone). The full before and after entries are `cot-entry.diff.json` in `~/k7-rescue/improve-audit/lane-d/cot-030/` (17,413 bytes, with the `plate` object, which is unchanged); the `moves` arrays follow.

Moves before (the page's shipped entry; four moves in the order Sabot Round, Killcam, One Spec, Column Fire):

```json
[
 {
  "kind": "clip",
  "cue": {
   "in": 3550,
   "out": 5000,
   "impact": 3700,
   "unit": "ms"
  },
  "crop": null,
  "media": {
   "src": "media-moves/claude-of-tanks/cot-sabot-round-clean.mp4",
   "kind": "video",
   "w": 518,
   "h": 332,
   "dur": 5500
  },
  "still": {
   "src": "media-moves/claude-of-tanks/sabot-round.webp",
   "kind": "image",
   "w": 518,
   "h": 332
  },
  "view": {
   "u": 0.5,
   "v": 0.63,
   "zoom": 1.4
  },
  "burned": [
   {
    "x": 0.9598,
    "y": 0.2331,
    "w": 0.0402,
    "h": 0.378,
    "from": 0,
    "to": 100000
   },
   {
    "x": 0,
    "y": 0.4038,
    "w": 0.0703,
    "h": 0.1707,
    "from": 0,
    "to": 100000
   },
   {
    "x": 0,
    "y": 0.7208,
    "w": 0.0703,
    "h": 0.1219,
    "from": 0,
    "to": 100000
   },
   {
    "x": 0.3205,
    "y": 0.1356,
    "w": 0.1251,
    "h": 0.0732,
    "from": 0,
    "to": 100000
   },
   {
    "x": 0.2927,
    "y": 0.0075,
    "w": 0.4448,
    "h": 0.061,
    "from": 0,
    "to": 100000
   },
   {
    "x": 0.529,
    "y": 0.2209,
    "w": 0.2085,
    "h": 0.061,
    "from": 0,
    "to": 100000
   }
  ],
  "source": "move-media"
 },
 {
  "kind": "clip",
  "cue": {
   "in": 800,
   "out": 3400,
   "impact": 1900,
   "unit": "ms"
  },
  "crop": {
   "x": 0,
   "y": 0.059,
   "w": 0.7686,
   "h": 0.6354,
   "unit": "fraction"
  },
  "media": {
   "src": "media-moves/claude-of-tanks/cot-killcam-clean.mp4",
   "kind": "video",
   "w": 1024,
   "h": 576,
   "dur": 5400
  },
  "still": {
   "src": "media-moves/claude-of-tanks/killcam.webp",
   "kind": "image",
   "w": 1024,
   "h": 576
  },
  "marks": "manifest cues hp and ledger: the -621 HP readout and the shot ledger",
  "view": {
   "u": 0.5,
   "v": 0.5,
   "zoom": 1.25
  },
  "burned": [
   {
    "x": 0.24,
    "y": 0.53,
    "w": 0.105,
    "h": 0.075,
    "from": 0,
    "to": 760
   },
   {
    "x": 0.283,
    "y": 0.6,
    "w": 0.022,
    "h": 0.095,
    "from": 0,
    "to": 760
   },
   {
    "x": 0.283,
    "y": 0.6,
    "w": 0.022,
    "h": 0.095,
    "from": 2100,
    "to": 5400
   },
   {
    "x": 0.24,
    "y": 0.545,
    "w": 0.105,
    "h": 0.065,
    "from": 2100,
    "to": 3300
   },
   {
    "x": 0.24,
    "y": 0.535,
    "w": 0.105,
    "h": 0.065,
    "from": 3300,
    "to": 4500
   },
   {
    "x": 0.24,
    "y": 0.525,
    "w": 0.105,
    "h": 0.065,
    "from": 4500,
    "to": 5400
   },
   {
    "x": 0.235,
    "y": 0.685,
    "w": 0.115,
    "h": 0.085,
    "from": 0,
    "to": 760
   },
   {
    "x": 0.235,
    "y": 0.685,
    "w": 0.115,
    "h": 0.085,
    "from": 2000,
    "to": 5400
   },
   {
    "x": 0,
    "y": 0.72,
    "w": 0.185,
    "h": 0.19,
    "from": 0,
    "to": 100000
   },
   {
    "x": 0.82,
    "y": 0.77,
    "w": 0.18,
    "h": 0.145,
    "from": 0,
    "to": 100000
   },
   {
    "x": 0.4,
    "y": 0,
    "w": 0.2,
    "h": 0.06,
    "from": 0,
    "to": 100000
   },
   {
    "x": 0.88,
    "y": 0.955,
    "w": 0.12,
    "h": 0.045,
    "from": 0,
    "to": 100000
   }
  ],
  "thumb": "broadcast/media/claude-of-tanks/thumb-m1.webp",
  "source": "move-media"
 },
 {
  "kind": "clip",
  "cue": {
   "in": 1500,
   "out": 5000,
   "impact": 3600,
   "unit": "ms"
  },
  "crop": null,
  "media": {
   "src": "media-moves/claude-of-tanks/cot-one-spec-clean.mp4",
   "kind": "video",
   "w": 960,
   "h": 540,
   "dur": 5500
  },
  "still": {
   "src": "media-moves/claude-of-tanks/one-spec.webp",
   "kind": "image",
   "w": 960,
   "h": 540
  },
  "view": {
   "u": 0.68,
   "v": 0.42,
   "zoom": 1.8
  },
  "burned": [
   {
    "x": 0,
    "y": 0,
    "w": 0.24,
    "h": 0.96,
    "from": 0,
    "to": 100000
   },
   {
    "x": 0.235,
    "y": 0.885,
    "w": 0.765,
    "h": 0.115,
    "from": 0,
    "to": 100000
   },
   {
    "x": 0.36,
    "y": 0,
    "w": 0.28,
    "h": 0.075,
    "from": 0,
    "to": 1500
   },
   {
    "x": 0.775,
    "y": 0.04,
    "w": 0.225,
    "h": 0.58,
    "from": 0,
    "to": 1500
   }
  ],
  "source": "move-media"
 },
 {
  "kind": "clip",
  "cue": {
   "in": 1500,
   "out": 4000,
   "impact": 2700,
   "unit": "ms"
  },
  "crop": null,
  "media": {
   "src": "media-moves/claude-of-tanks/cot-column-fire-clean.mp4",
   "kind": "video",
   "w": 526,
   "h": 244,
   "dur": 6000
  },
  "still": {
   "src": "media-moves/claude-of-tanks/column-fire.webp",
   "kind": "image",
   "w": 526,
   "h": 244
  },
  "view": {
   "u": 0.45,
   "v": 0.5652,
   "zoom": 1.15
  },
  "burned": [
   {
    "x": 0.7125,
    "y": 0.1656,
    "w": 0.2327,
    "h": 0.1414,
    "from": 2500,
    "to": 3400
   }
  ],
  "source": "move-media"
 }
]
```

Moves after:

```json
[
 {
  "kind": "clip",
  "cue": {
   "in": 1000,
   "out": 4000,
   "impact": 1267,
   "unit": "ms"
  },
  "crop": null,
  "media": {
   "src": "media-moves/claude-of-tanks/cot-sabot-round-oct.mp4",
   "kind": "video",
   "w": 1600,
   "h": 900,
   "dur": 4033
  },
  "still": {
   "src": "media-moves/claude-of-tanks/sabot-round-oct.webp",
   "kind": "image",
   "w": 1600,
   "h": 900
  },
  "view": {
   "u": 0.42,
   "v": 0.48,
   "zoom": 1.2
  },
  "burned": [],
  "source": "move-media"
 },
 {
  "kind": "clip",
  "cue": {
   "in": 0,
   "out": 3500,
   "impact": 800,
   "unit": "ms"
  },
  "crop": null,
  "media": {
   "src": "media-moves/claude-of-tanks/cot-killcam-xray-oct.mp4",
   "kind": "video",
   "w": 1600,
   "h": 900,
   "dur": 4600
  },
  "still": {
   "src": "media-moves/claude-of-tanks/killcam-xray-oct.webp",
   "kind": "image",
   "w": 1600,
   "h": 900
  },
  "marks": "manifest cues hp and ledger: the -621 HP readout and the shot ledger",
  "view": {
   "u": 0.5,
   "v": 0.5,
   "zoom": 1.25
  },
  "burned": [],
  "thumb": "media-moves/claude-of-tanks/killcam-victim-oct.webp",
  "source": "move-media"
 },
 {
  "kind": "clip",
  "cue": {
   "in": 1300,
   "out": 4000,
   "impact": 2433,
   "unit": "ms"
  },
  "crop": null,
  "media": {
   "src": "media-moves/claude-of-tanks/cot-one-spec-oct.mp4",
   "kind": "video",
   "w": 1600,
   "h": 900,
   "dur": 5867
  },
  "still": {
   "src": "media-moves/claude-of-tanks/one-spec-oct.webp",
   "kind": "image",
   "w": 1600,
   "h": 900
  },
  "view": {
   "u": 0.5,
   "v": 0.45,
   "zoom": 1.1
  },
  "burned": [],
  "source": "move-media"
 },
 {
  "kind": "clip",
  "cue": {
   "in": 1300,
   "out": 4400,
   "impact": 2800,
   "unit": "ms"
  },
  "crop": null,
  "media": {
   "src": "media-moves/claude-of-tanks/cot-column-fire-oct.mp4",
   "kind": "video",
   "w": 1600,
   "h": 900,
   "dur": 4467
  },
  "still": {
   "src": "media-moves/claude-of-tanks/column-fire-oct.webp",
   "kind": "image",
   "w": 1600,
   "h": 900
  },
  "view": {
   "u": 0.5,
   "v": 0.52,
   "zoom": 1.05
  },
  "burned": [],
  "source": "move-media"
 }
]
```

In plain terms: all four clips go from 518 x 332, 1024 x 576, 960 x 540 and 526 x 244 to 1600 x 900, `burned` (rectangles painted out of the old clips) goes from 6, 12, 4 and 1 boxes to none, and the killcam's `thumb` moves from `broadcast/media/claude-of-tanks/thumb-m1.webp` to `media-moves/claude-of-tanks/killcam-victim-oct.webp`, one of the nine new files.

## Scene check, per move

Files read whole in the export: `claude-of-tanks.{sabot-round,killcam,one-spec,column-fire,trait}.ts` under `r3/battle/broadcast/scenes/`. The runtime reads each feature beat's `seek` as milliseconds after the cue's `in` (`runtime/src/timeline.ts:582`, `:587`); when a feature beat gives both `rate` and `seek`, the runtime does not retime the clip to land its contact on the scene's impact (`timeline.ts:591`); otherwise it solves a playback rate, limited to 0.25x to 2x (`timeline.ts:570`, `:593-595`). The telestrator ring takes its point in the picture's own pixels (`broadcast/src/fx.ts:899-900`, `:910-911`).

| Move | Clip pixels or clip time in the scene? | Reads cue, view, media from the manifest? | Verdict |
| --- | --- | --- | --- |
| Sabot Round | No pixels. Clip-time numbers only as offsets after the cue's start: full `seek: 0, rate: 0.45` (`claude-of-tanks.sabot-round.ts:23`), short `seek: 100, rate: 0.8` (`:33`). Its comment about the old cue's times (`:22`) is stale text, not code. | Yes: the beats hold no media path or view (`:23`, `:33`). | data only |
| Killcam | Yes: `const ENTRY = [322, 280];` (`claude-of-tanks.killcam.ts:22`) feeds `kit.telestrate(1520, 560, { at: ENTRY, r: [46, 24] }, ...)` (`:76`), which draws in clip pixels (`broadcast/src/fx.ts:899-900`). The new clip's point is `[684, 424]` (handoff). Its feature beats have a view of their own (`:72`, `:109`), which stays. | Yes for cue, media and thumb (`:72`, `:109` carry no media or cue). | needs the kit |
| One Spec | No. `hazard(270, 1830, { at: [720, T.impact], ... })` (`claude-of-tanks.one-spec.ts:26`) and `{ at: [250, 380] }` (`:36`) are lock times in ms on the scene's clock: the effect reads `at[i]` as `lock` and compares it with the scene time `t` (`claude-of-tanks.fx.ts:307`, `:326-327`). Its footage beat comes from the shared grammar with no rate or seek (`broadcast/src/scenes.ts:205`). | Yes. | data only |
| 14 v 14 (`column-fire`) | No pixels. One offset after the cue's start: full `seek: 450, rate: 1.5` (`claude-of-tanks.column-fire.ts:24`); the short has no footage beat (`:32-37`). | Yes (`:24`). | data only |
| Seeded (trait, not a move) | Plays no footage (`claude-of-tanks.trait.ts:12`). | Not applicable. | no change |

Where each clip's contact lands on the scene's clock, from `clipTimeAt` (`runtime/src/timeline.ts:579-611`) and the cues in the table above; "old" is the shipped cue. These are my arithmetic, not a render:

| Move | Old clip contact on the scene clock | New clip contact | The scene's own impact |
| --- | --- | --- | --- |
| Sabot Round, full | about 893 ms (`560 + (3700-3550)/0.45`) | about 1153 ms (`560 + (1267-1000)/0.45`) | 1300 ms (`sabot-round.ts:12`) |
| Sabot Round, short | about 113 ms | about 259 ms | 380 ms (`broadcast/src/scenes.ts:31`) |
| Column Fire, full | 1090 ms (`590 + (2700-1500-450)/1.5`) | 1290 ms (`590 + (2800-1300-450)/1.5`) | 1380 ms (`column-fire.ts:11`) |
| One Spec, full | rate solved 3.28x, so limited to 2x: contact did not land on the impact | rate 1.77x (`(2433-1300)/(1260-620)`), so contact lands on the impact | 1260 ms (`one-spec.ts:13`) |
| Killcam, full | rate 1.20x (`(1900-800)/(1440-520)`) | rate 0.87x, contact on the impact | 1440 ms (`broadcast/src/scenes.ts:31`) |

Two readings. First, the new cues sit inside the scenes' 0.25x to 2x window for the two moves that land the contact (One Spec, Killcam), and for the two that use a fixed rate (Sabot Round, Column Fire) the new contact comes 90 to 147 ms before the scene's impact on the full scenes (121 ms on the Sabot Round short), against 407 and 290 ms for the old clips on the full scenes. Second, Killcam under today's kit would draw its ring at `[322, 280]` on a 1600 x 900 clip, far from the shell's entry at `[684, 424]`, which is why it waits for the kit.

Sound does not move: the plan quotes the handoff (section 2d) as saying the scenes' beats are unchanged and sound reads no clip time (I did not re-read that section), and the cue names `sig.claude-of-tanks.{sabot-round,killcam,one-spec,column-fire}` already exist in `public/sound/manifest.battle.json` (checked with `grep -o`).

## Reviewer's browser run (lane D's reviewer, 2026-11-10)

The executor rendered nothing. The reviewer copied the lane's site build, added the nine new files under `battle/r3/media-moves/claude-of-tanks/`, replaced only the `moves` field of the Claude of Tanks entry in the build's own (synced) `battle/vendor/broadcast/media.js` with the "Moves after" above, served the copy locally and played the four moves by key (1 to 4) with Playwright Chromium at 1440 x 900, sound off, on the Mat, with `#team=claude-of-tanks,agent-pets,bday-land&rival=katagami,mailroom,elo&seed=5`. The kit is today's shipped kit, untouched. Frames: `~/k7-rescue/improve-audit/lane-d/run-030/` (`sheet-m1.jpg` to `sheet-m4.jpg`).

| Move | Clip the page played | What the frames show |
| --- | --- | --- |
| Sabot Round | `cot-sabot-round-oct.mp4` (200, then a 206 range) | The new clip fills the scene's band behind the move's name; the hit and its number follow as before. |
| Killcam | `cot-killcam-xray-oct.mp4` | The new x-ray clip plays and the scene completes. Its ring is drawn where the old clip's point was, not on the shell's entry, as the scene check predicts: this is the one that needs the kit. |
| One Spec | `cot-one-spec-oct.mp4` | The new clip plays through the flash and the "Proof +2" beat. |
| 14 v 14 (`column-fire`) | `cot-column-fire-oct.mp4` | The new clip plays behind the name (the kit still prints the battle's old name, "Column Fire"; plan 026's move-name rule covers that). |

No page error and no failed request in the run; the page asked for each new clip and three of the new stills (`sabot-round-oct.webp`, `killcam-xray-oct.webp`, `one-spec-oct.webp`, `column-fire-oct.webp` all answered 200). Not covered: the flash gate, the Arena, a phone, sound against picture, and the move tooltips' previews (they still show the old clips until re-recorded).

## Checks at the build

Run by the build that ships the clips, in this order. I ran none of them.

1. `node tools/build-data.mjs && python3 -I broadcast/tools/media.py --data-only` (in `r3/battle`): proves the manifest changes for Claude of Tanks only (expect `data/media.js: claude-of-tanks`, as measured above).
2. `node broadcast/tools/build.mjs && node broadcast/tools/validate.mjs`: rebuilds the kit and checks every scene compiles; expect 0 problems.
3. `PORT=<port> node tools/flashscan.mjs claude-of-tanks` (with `--outcomes crit,ko,rival`): the flash gate, at most a set number of bright block changes a second per scene. The plan quotes the handoff as saying the clips passed a pre-check on the encoded files and that the scene gate still has to run at the merge.
4. `PORT=<port> node tools/scene.mjs claude-of-tanks.<sabot-round|killcam|one-spec|column-fire>`: each scene plays against the new clip.
5. In `r4/play`: `node tools/timings.mjs`: each scene's compiled length and impact, from the runtime's own compile; expect the scene impacts unchanged (the beats are unchanged).
6. In `r4/play`: `node tools/sound-sync.mjs mat 1` and `node tools/sound-sync.mjs arena 1`: the hit cue against the contact frame, in ms.
7. In `r4/play`: remove the eight Claude of Tanks files in `public/battle/previews/` (`claude-of-tanks.{sabot-round,killcam,one-spec,column-fire}.{webm,webp}`), then `node tools/previews.mjs claude-of-tanks` (it skips a move whose `.webm` exists), and run `node broadcast/tools/thumbs.mjs && node tools/fit.mjs` in `r3/battle`.

## What the site needs

The nine new files are tracked under `r3/battle/media-moves/claude-of-tanks/` (9,373,541 bytes, about 9.4 MB). The battle stage of `scripts/sync.mjs` ships that folder to `public/battle/r3/media-moves/claude-of-tanks/` only from the pinned commit (`PIN.battle = '42ff51c7'`, `scripts/sync.mjs:31`). So shipping means: the clips and the spliced manifest committed in the rounds by the battle's lane; `PIN.battle` moved to that commit; a sync from an export; `pnpm build`; and the re-recorded previews in the same pin. The old `*-clean.mp4` files weigh 7.0M with their stills today (`du -sh public/battle/r3/media-moves/claude-of-tanks`); they stay until the new ones are proven, then leave. The same release rewrites `docs/battle.md:28`, whose line (as read) says the five new videos "go into r3/battle's media-moves with the same merge", and the rounds' `r3/battle/MEDIA.md` section `### claude-of-tanks` (line 124 in the export).

Do not drop the rounds' regenerated `r3/battle/broadcast/data/media.js` over the page's manifest: all 18 cards' entries differ between the two (plan 030, current state fact 1), so only the Claude of Tanks `moves` field may move, as in the spliced file.

## Two steps or one

Two steps: ship Sabot Round, One Spec and Column Fire now (manifest plus files, previews re-recorded for those three), then Killcam with the kit. That is two rounds of the checks above; Killcam keeps its old clip, at its old size, until the kit.

One step: wait for the kit. Plan 026 says every route to 26 cards rebuilds `kit.js` ("Every route rebuilds `kit.js`", `plans/results/026-battle-26-cards.md:136`), that a clean rebuild changes 116 of the 186 listed source files (`:145`), and that "the kit rebuild is a re-check of the 18 fielded cards" whose first gate is the page flash scan (`:226`). Plan 026 recommends that rebuild as the first step (`:278`). So the four clips would ride a rebuild whose date depends on Kevin's answers there, with one round of checks and the old, painted-out clips in place until then. A split does not stop the kit's own checks later; it only means the Claude of Tanks scenes get their checks twice.

## Questions for Kevin

1. Ship three clips now and Killcam with the kit, or all four with the kit?
2. Drop the old `*-clean.mp4` files (and their four stills) once the new ones are live, freeing about 7 MB?
3. Is the optional trait clip (`cot-seeded-oct.mp4`, 2,088,018 bytes, with `seeded-oct.webp`) wanted anywhere? The trait scene plays no footage (`claude-of-tanks.trait.ts:12`), so it would only serve a reel.

## Findings along the way

- **The data build cannot run from a committed-only export.** The rounds `.gitignore` leaves media out of git (line 9 is `*.webp`), so `git archive` of `r1/study-roster18` and `r2/plates` misses it: `git status --short --ignored -- r1/study-roster18 r2/plates` listed 357 ignored entries (9 under `r1/study-roster18`, 348 under `r2/plates`) and `git status --short` for the same paths printed 0, so no modified or untracked work is mixed in. `tools/build-data.mjs` failed on the first missing file (the Step 2 block above). The build that ships the footage must run in a full checkout.
- **Untracked inputs I brought in (and only these).** With the revision's go-ahead, I replaced the export's `r1/study-roster18` and `r2/plates` with `cp -Rc` copy-on-write clones of the live folders: the 357 git-ignored entries (list saved at `~/k7-rescue/improve-audit/lane-d/030-ignored-inputs.txt`) plus the folders' tracked files. Nothing else was copied from the live `r3/battle`, `r3/cards` or `r4/stage/cot2` beyond the committed export. The experiment therefore used committed code and data with git-ignored media from the live folders.
- **The page's Claude of Tanks entry differs from the rounds' in one field, `gates`.** The page's manifest at the pin carries non-empty `gates` arrays for 12 of the 18 cards (I read counts only, not the text), while the rounds' regenerated manifest has none, because the current `media.py` strips `gates` as private (`broadcast/tools/media.py`, `PRIVATE = {'gates', ...}`). Claude of Tanks' own `gates` is empty. The site already handles this: `scripts/sync.mjs:228-230` rewrites every `"gates":[...]` to `"gates":[]` on sync, and the shipped copy (`public/battle/vendor/broadcast/media.js`, 103,057 bytes, which is the "about 103 KB" the plan means) has no non-empty `gates`. So the splice is safe to ship through the sync, but `page-media.spliced.js` in the hand-over still holds the pre-sync gate text: the reviewer should not publish or paste it anywhere, and should run it through the sync's rewrite (or use the shipped copy plus the four moves) for the browser copy. The splice leaves the page's `gates` untouched.
- **The old One Spec cue could not land its contact.** The old cue needed 3.28x, above the runtime's 2x limit, so the old clip's contact did not line up with the scene's impact; the new cue needs 1.77x.
- The rounds' status for `r4/stage/cot2`, `r3/battle/data` and `r3/battle/media-moves` is unchanged by this spike (count 1 before and after, the unrelated `spec.py`).
