# Stage 7B-0 — Boss Locomotion Redesign (idle / walk / glide / silhouette surge)

Hand-off spec for the coding agent. Everything here is **visual-only**: movement
speed, hitboxes, damage, attack timings, AI, dash logic, the AFK intimidation
system, hero behavior and the throne room are all untouched. The deliverable is
five 46x48 clips (23 frames total, validated: palette-legal keys, uniform frame
size, lowest body pixel on row 47 in every frame → zero feet/scale pop).

Files:
- `walk_v1.png` — production sheet (band A rows = REAL drop-in matrices)
- `walk_gen.js` — generator / editable source (`node walk_gen.js` re-emits everything)
- `walk_literal.txt` — drop-in clip matrices for `BOSS_REDESIGN_SPRITES`
- `walk_spec.md` — this document

## 1. Concept

The boss's ground locomotion becomes a three-mood system:
- **Idle** — composed predatory rest, the greatsword held low and outward (ref3
  carry language). Bigger blade (+~30% vs the old raised idle sword).
- **Forward walk** — heavy oppressive advance, sword in a low drag-carry, the
  tip scraping sparks off the floor on the weight frames (ref2 language).
- **Backward walk** — supernatural glide: feet frozen, body drifting in a slow
  circle, afterimage traces trailing on the hero side (ref4 language).
- **Silhouette surge** — every ~7–8 s of continuous walking, a ~1 s black-red
  eclipse flare (ref1) rides ON TOP of the walk poses without interrupting the
  stride. Two variants with different lightning placement (see §5).

All frames are derived from the approved boss matrix through the house pipeline
(eraseBlade + re-drawn arm/sword, moveUpper/leg-band re-poses, emberUp) and the
approved void-fracture bolt anatomy (afk2), baked with EXISTING
`BOSS_REDESIGN_PALETTE` keys — **no palette change needed**.

## 2. Clips

| clip           | frames | replaces          | hold (60 fps ticks)     | loop     |
|----------------|--------|-------------------|-------------------------|----------|
| `idle`         | 3      | current `idle`    | 12 (unchanged)          | loop     |
| `walkForward`  | 6      | current `run`     | 5 recommended (4 works) | loop     |
| `walkBackward` | 4      | current `retreat` | 12 recommended (was 5)  | loop     |
| `surgeForward` | 6      | NEW overlay clip  | 10 → 60 ticks ≈ 1.0 s   | one-shot |
| `surgeBackward`| 4      | NEW overlay clip  | 15 → 60 ticks ≈ 1.0 s   | one-shot |

Holds live in `Player._animState()` (Player.js ~line 1183): `run` hold 4 →
recommend 5 (heavier cadence), `retreat` hold 5 → **12** (the glide needs the
slow drift; 5 would look twitchy). Both are one-number render-only edits.
`SpriteAnimator` cycles by `frames.length`, so the 4→6 frame count change is safe.

### idle (3f) — "the low reaper carry"
Blade angled down-and-outward, tip HOVERING clear of the floor (never planted —
planted is the AFK state's exclusive read). f0 exhale → f1 ember inhale
(palette-only) → f2 breath peak (chest up 1px, ember hot). Loop 0-1-2.
Geometry between f0/f1 is identical, f2 moves only the whole upper body — the
figure cannot desync from itself.

### walkForward (6f) — heavy advance
+1 whole-upper-body forward lean on every frame. Stride: f0 reach (front leg
swings ahead) → f1 **PLANT** (leg grounded, torso sinks 1px, blade tip bites the
floor, baked scrape sparks) → f2 pass (back leg lifts through, torso rises) →
f3 push (back leg trails behind) → f4 **PLANT-B** (sink + sparks) → f5 pass-B.
Two sink frames per cycle = the weight read. The sword rides low ahead
(angle 64–68°), tip skimming the ground: the drag is baked in the matrices —
no runtime VFX required for the sparks.

### walkBackward (4f) — the glide
Feet FROZEN in one long trailing stance across all 4 frames (back leg extended
behind, toe down). The upper body drifts in a slow circle over a deep trailing
lean: (-2,0) → (-2,-1) → (-3,-1) → (-3,0). The mask tail streams up-back on
drift-up frames. The sword switches to a HIGHER guarded carry (angle 52, hand a
row higher) so back-off reads defensive, clearly different from both idle and
the forward drag. Tattered 1px trail hints flicker on the FACING contour inside
the frames (he slides backward ⇒ afterimages sit between him and the hero).

**Runtime afterimages (render-only, recommended):** 2 stepped ghosts of the
current retreat frame, offset toward facing (`+6px`, `+12px` at world scale),
alphas ~0.45 / 0.25, tint `#1c1d28` / `#12121a`, refreshed every ~6 ticks —
same pattern as `drawDashAura`'s stepped afterimages, but slower and subtler.
Band B of the sheet ("GLIDE AFTERIMAGES") shows detach → trail → decay.
Draw them BEHIND the sprite. During `surgeBackward`, tint ghosts near-void
(`#0c0a14` dither) as in tableau 2.

## 3. Silhouette surge — scheduler

- Trigger: while the boss has been in `walkForward` OR `walkBackward`
  continuously, fire every **420–480 ticks** (7–8 s); randomize inside that
  window per fire. The timer only accumulates while a locomotion clip is
  active; it pauses (does not reset) during brief idle gaps, and RESETS on
  attack/dash/air/AFK.
- Duration: exactly one pass of the surge clip (~60 ticks). The surge is an
  ALTERNATE SKIN of the walk — its frames ride the same stride poses, so the
  walk never visibly stops. Movement/velocity/FSM are never touched.
- Variant: pick by the active clip at trigger time (`run`→`surgeForward`,
  `retreat`→`surgeBackward`).
- Implementation: index the surge clip off a render-only timer (the `afkExit`
  `{name, hold, index}` idiom in `_animState`) rather than free-running the
  animator — deterministic, no drift, ends exactly on the ash frame.
- Interrupts: if the boss attacks/dashes/jumps or flips walk direction
  mid-surge, END the surge by jumping to its last (ash) frame for 1 tick, then
  hand back to the normal clip — mirrors `_endAfk`'s arcs-to-ash idiom. Never
  play a surge during `afkPhase` (AFK outranks; its eclipse language must stay
  unique to denial/AFK contexts).
- Suppress the normal idle `drawAura`/`drawVoidEdge` embellishments during a
  surge frame if they visually fight the eclipse (optional, check in-game).

## 4. Surge anatomy (what's baked in)

Eclipse body: every body key → near-void `0` (sparse `1` texture), former
molten/ember keys keep a deep-ember memory (`a`/`g`) so the huge blade
silhouette stays readable, and the outer contour gets a BROKEN dim rim (`h`
with sparse `c` winks). This is deliberately different from the approved denial
tint (solid clean `E2` rim) so the hit-denial read stays unique.

Bolts use the approved afk2 void-fracture anatomy, baked as keys: `0` crack
sheath / `c` filament / `d` hot kinks / `b` branches with `a` tips / ash =
sinking `g`+`1` slivers. Max 2 live flash arcs per frame (restraint law).

Both surges ramp: entry frame = body darkened ONE step + ignite → full eclipse
flash frames → fracture → exit frame = body darkened one step + sinking ash.
Entry/exit frames prevent any pop into/out of the eclipse.

## 5. Lightning placement — forward vs backward (REQUIRED DIFFERENCE)

- `surgeForward` (weapon side, low/right): chest-core ignite → **arm crawl**
  (chest→fist) → **beside-blade crawl** down the dragged sword → **ground
  skitter** at the drag point → fracture → ash sinking off the sword line.
  The power flows INTO the weapon and the floor — an advancing threat.
- `surgeBackward` (crown side, high/left): **crown ignite/arc over the head**
  → one short crackle arc per **shoulder** → **spine crawl** down the back
  contour + an arc **tearing off the trailing edge** into empty space →
  ash sinking off shoulders/spine. The power flares AROUND the head and back —
  a wraith slipping away. Band B "FWD MAP"/"BWD MAP" cells chart the anchors.

## 6. Integration map (locked wiring pattern)

1. Paste the five clips from `walk_literal.txt` into `BOSS_REDESIGN_SPRITES`
   in `src/core/SpriteManager.js` — `idle` REPLACES the existing 2-frame idle,
   `walkForward` REPLACES `run` (keep the key name `run`!), `walkBackward`
   REPLACES `retreat` (keep the key name `retreat`). `surgeForward`/
   `surgeBackward` are new keys.
2. Nothing else needs wiring for the base clips: the merged animator +
   row-count detection (`frame.length >= 40` → BOSS_IDLE_PIXEL 3 +
   BOSS_REDESIGN_PALETTE) auto-serves them. On-screen size stays 138×144.
3. Surge scheduler + retreat afterimages: render-only additions in
   `Player.js` (`_animState` + `draw`), per §3/§2. No constructor/physics
   fields beyond lazy-init render timers (follow the `_prevGroundedVFX` idiom).
4. Hold tweaks per §2 table.

## 7. Cautions

- **Air/dash/attack clips still carry the OLD raised idle sword.** Jump, fall,
  doubleJump, dash and the attack wind-ups will visibly raise the blade from
  the new low carry. Attacks: fine — the raise reads as a telegraph. Jumps:
  acceptable short-term; schedule **7B-1** to re-pose jump/fall/doubleJump/dash
  with `heldSword()` (parametric in `walk_gen.js`) for full carry consistency.
- Do NOT rename `run`/`retreat` in `Player._animState` — replace frame data
  under the existing keys.
- Combat reach/hitboxes are untouched: the longer blade exists only in
  locomotion matrices; every attack clip keeps its approved reach.
- The AFK system is untouched and outranks the surge; the planted sword and
  intimidation aura remain the AFK state's exclusive language.
- The baked scrape sparks make walkForward self-contained — do not add a
  runtime ember emitter on top (double-spark).
- `SpriteAnimator` has no pingpong; the 3-frame idle loops 0-1-2. If a
  smoother breath is wanted later, bake `[f0,f1,f2,f1]` as 4 frames — do not
  add animator features for this.
- The surge clips are full alternate frames (not tint passes), so no new
  rendering code path is needed; the trade-off is that surge stride poses are
  fixed to one cycle alignment. At 1 s duration this is imperceptible.

## 8. Verification (already done on the data)

`walk_gen.js` output validated: 23 frames, all 46 wide × 48 tall, only
`BOSS_REDESIGN_PALETTE` keys (`0-5 a-d g h .`), lowest body pixel row 47 in
every frame. After wiring, re-run the standard offscreen anchor script
(bottom/top/width/centre per clip) and the live boot check (0 console errors).
