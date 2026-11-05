# Battle

One engine, two modes, one page: r4/play's `mat/index.html`, served at `/battle` (Mat) and `/battle/arena` (Arena).
The engine is deterministic: teams, a seed and the commands always replay the same battle.

- Address: `#team=a,b,c&rival=x,y,z&seed=N&mode=mat|arena` (also `&log=`, `&resume=1`, `&leaders=`, `&map=`).
- Mat plays on a card mat with Broadcast's cutscenes, call-outs and black bars. Arena plays on a painted floor with the
  eight original trainer figures from the round, each map calibrated so figures stand on the floor.
- The home page's Play button opens it with the dock's teams. Leave returns to `/` with `#you=` so the dock keeps them.

## State on 2026-11-05

- The battle holds 18 of the 26 cards. The eight added on 11-01 have staged scenes in
  `r3/battle/broadcast/scenes/next/`; registering them (adopting `roster/battle-roster.json`, moving the scenes up,
  rebuilding the engine and kit) is merge work that waits for battle-r4b to finish writing r3/battle.
- The battle prints the round-3 card face. Swapping in the ex card needs the kit's card environment rebuilt from r4/ex
  (face data, pop-out cuts, frames and borders), with the same wait.
- Claude of Tanks' five new move videos (`r4/stage/cot2/footage`) go into r3/battle's media-moves with the same merge.
- The gallery's dock only offers teams the battle holds (`<meta name="battle-roster">`), so Play never opens a battle
  with a card it cannot field.
