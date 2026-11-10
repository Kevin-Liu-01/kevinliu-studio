# Battle

One engine, two modes, one page: r4/play's `mat/index.html`, served at `/battle` (Mat) and `/battle/arena` (Arena).
The engine is deterministic: teams, a seed and the commands always replay the same battle.

- Address: `#team=a,b,c&rival=x,y,z&seed=N&mode=mat|arena` (also `&log=`, `&resume=1`, `&leaders=`, `&map=`).
- A link that cannot start says why in the page's alert and plays the same teams without the log, or the default hand; mode= and map= accept only their own names; a boot that fails un-hides the page with the reason (sync transforms, and one inline script in BattlePage.astro).
- Mat plays on a card mat with Broadcast's cutscenes, call-outs and black bars. Arena plays on a painted floor with the
  eight original trainer figures from the round, each map calibrated so figures stand on the floor.
- The home page's Play button opens it with the dock's teams. Leave returns to `/` with `#you=` so the dock keeps them.

## Round 5 (shipped with the release after 11-08)

Round 5 (r4/play at 42ff51c7, r4/play `SPEC.md`) prints the wall's own card (`shared/excard.js` hands `markup.js`'s
card to the kit; plain on phones, framed on desktop, as on the wall), adds one clock with a 1x, 1.5x and 2x speed
setting (`shared/pace.js`, X), the HUD (`shared/hud.js`: plates, the log rail, multiplier call-outs, tooltips with each
move's preview loop from `/battle/previews/`), and sound: `shared/battle.js` imports `/sound/sound.js` and plays r4/sound's
battle slice, following the stage's clock (`SPEC.md` section 10). The rail's speaker key (N) is the site's sound
setting (`kevin-liu-studio:sound`). The roster is still the engine's 18 cards (`vendor/battle/vendor/engine.js`).

## Open work (written 2026-11-05, corrected 2026-11-10)

- The battle holds 18 of the 26 cards. The eight added on 11-01 have staged scenes in
  `r3/battle/broadcast/scenes/next/`; registering them (adopting `roster/battle-roster.json`, moving the scenes up,
  rebuilding the engine and kit) waits on a kit rebuild from r3/battle. The run that was writing r3/battle
  (battle-r4b) was retired on 2026-11-08 with its work left in place there, so that work has to be accepted or set
  aside first (rounds `r4/play/REQUESTS.md`, "battle-r4b, left in place").
- Since round 5 the board prints the wall's own card (above). The Broadcast kit's cutscenes still carry the round-3
  card sprite and art masks (`public/battle/vendor/cards/`); the same kit rebuild replaces them.
- Claude of Tanks' five new move videos (`r4/stage/cot2/footage`) go into r3/battle's media-moves with the same merge.
- The gallery's dock only offers teams the battle holds (`<meta name="battle-roster">`), so Play never opens a battle
  with a card it cannot field.
