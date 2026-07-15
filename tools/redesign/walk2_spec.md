# Stage 7B-0R — Boss Locomotion R2 (REAR trailing sword carry)

Targeted revision of the approved-direction Stage 7B-0 sheet (`walk_spec.md`,
`walk_v1.png`). **The single correction: the boss no longer carries the sword
in front of his body — it is carried BEHIND the silhouette**, a heavy trailing
back-side greatsword (ref2/ref3 carry logic, not copied literally). Everything
else from walk_v1 is preserved: the low-carry oppressive identity, the 6f heavy
advance, the 4f frozen-feet backward glide, the ~1s black-red silhouette
surges, timings, palette, drop-in format. Still **visual-only**: movement
speed, hitboxes, damage, attack timings, AI, dash logic, AFK system, hero and
throne room untouched.

Files (this revision SUPERSEDES the walk_* set):
- `walk2_v1.png` — production sheet (band A rows = REAL drop-in matrices)
- `walk2_gen.js` — generator / editable source (`node walk2_gen.js` re-emits everything)
- `walk2_literal.txt` — drop-in clip matrices for `BOSS_REDESIGN_SPRITES`
- `walk2_spec.md` — this document

Validated on emit: 23 frames, all 46x48, only `BOSS_REDESIGN_PALETTE` keys,
lowest occupied row 46-47 in every frame (generator throws on violation).

## 1. What changed from walk_v1 (and what did not)

| aspect                    | walk_v1 (rejected part)                     | 7B-0R                                                        |
|---------------------------|---------------------------------------------|--------------------------------------------------------------|
| grip hand                 | LEAD hand, re-drawn reach arm to (31,20)    | the boss's EXISTING rear fist (base art hanging left hand, (11,24)) |
| blade direction           | down-FORWARD, angles 52-68 (in front)       | down-BACK, angles 106-113 (trailing behind the silhouette)    |
| idle read                 | fencer-adjacent low guard in front          | poised executioner: tip RESTING on the floor behind the heel  |
| walk fwd sword            | low drag ahead, sparks in front             | blade DRAGS on the floor behind him, sparks kicked up-back    |
| walk bwd sword            | higher guarded FRONT carry (angle 52)       | rear forearm folds up (armLift), tip lifts to rows 42-43, clear of the floor |
| lead (hero-side) hand     | holds the sword                             | EMPTY — relaxed hang in idle/advance (counter-swings +-1), raised ember-knuckle GUARD across the chest in retreat |
| surge fwd arc anchors     | chest -> front arm -> blade (right) -> ground ahead | chest -> REAR arm -> beside the trailing blade -> ground skitter BEHIND (cols 2-10, row 46) |
| surge bwd arc anchors     | crown/shoulders/spine (high)                | unchanged placement family — still crown + per-shoulder + spine + tear-off, kept clear of the lifted blade below |
| frame counts / holds      | idle 3 / fwd 6 / bwd 4 / sFwd 6 / sBwd 4    | identical                                                     |
| eclipse + bolt anatomy    | afk2 void-fracture, broken `h`/`c` rim      | identical                                                     |
| glide ghost hints + runtime afterimages | on the FACING contour           | identical (unchanged logic — see §4)                          |
| REACH 23 blade (+30%)     | yes                                         | yes (same `heldSword()` drawer, one source of truth)          |

Nothing was re-invented: `frame()`, leg bands, bob patterns, `eclipse()`,
`bakeBolt()`, sheet format and the validation law are walk_v1's, byte-for-byte
where the carry didn't force a change.

## 2. Facing logic + rear-side carry (the core rule, solved)

- Matrices are authored **facing RIGHT** (hero side), like every approved boss
  clip. The runtime already flips the sprite via `aimDir` in `Player.draw`
  ("the sword ALWAYS points at the Hero" flip) — **no new wiring is needed**.
- Because the sword is authored on the LEFT (rear) contour, the mirror flip
  preserves the rule automatically in both facings:
  - hero RIGHT -> boss faces right -> sword trails LEFT (rear), left hand grips
  - hero LEFT  -> frame mirrored -> boss faces left -> sword trails RIGHT
    (rear), and the grip lands in what reads as his right hand — the correct
    hand for that facing, physically coherent by construction.
- The grip is WELDED to the base art's own hanging rear fist: `hand =
  REAR_FIST(11,24) + bob` in every frame (or the folded-arm fist (13,20)+bob in
  the retreat), so the sword can never detach from the arm or teleport across
  the body. There is no per-facing art variant and no facing-dependent code.
- The sheet's FACING LAW band shows both cases with the actual frame + its
  mirror; tableau 2 stages the mirrored case in the night hall.

## 3. Clips (timings unchanged from walk_v1 / walk_spec.md)

| clip           | frames | replaces          | hold (60 fps ticks)     | loop     |
|----------------|--------|-------------------|-------------------------|----------|
| `idle`         | 3      | current `idle`    | 12 (unchanged)          | loop     |
| `walkForward`  | 6      | current `run`     | 5 recommended (4 works) | loop     |
| `walkBackward` | 4      | current `retreat` | 12 recommended (was 5)  | loop     |
| `surgeForward` | 6      | NEW overlay clip  | 10 -> 60 ticks = 1.0 s  | one-shot |
| `surgeBackward`| 4      | NEW overlay clip  | 15 -> 60 ticks = 1.0 s  | one-shot |

### idle (3f) — "the resting executioner"
Grip in the rear fist, blade trailing down-back at 112 deg, hot tip RESTING on
the floor behind the heel (cell ~(2,46)). This is a resting drag, NOT a plant:
the AFK state keeps its exclusive read (vertical, point-down, in FRONT, longer
ceremonial blade). f0 exhale -> f1 ember inhale (palette-only) -> f2 breath
peak (whole upper body +1 up; the tip stirs 1px with the inhale — intended).
Lead hand hangs empty beside the front hip.

### walkForward (6f) — heavy advance, blade dragging behind
Same stride skeleton as v1 (+1 forward lean; reach -> PLANT -> pass, mirrored
half; single-leg moves per frame; torso sinks 1px on plants). The sword TRAILS:
angle wobbles 110-113 with the weight, the tip grinds the floor behind him the
whole cycle (rows 46-47), and the two PLANT frames bake scrape sparks kicked
up-BACK plus ember ticks on the drag line. The empty lead hand counter-swings
+-1. The advance reads as hauling a live blade — deliberate, not fast.

### walkBackward (4f) — the glide, guarded
Feet FROZEN in the long trailing stance all 4 frames; upper body drifts in the
slow circle (-2,0)->(-2,-1)->(-3,-1)->(-3,0); mask tail streams up-back on
drift-up frames; tattered 1px trail hints still flicker on the FACING contour.
R2 carry: the rear forearm FOLDS UP (fist to (13,20)+bob, angle 106) so the
trailing blade LIFTS clear of the floor (tip rows 42-43) — withdrawing, wary,
clearly distinct from the advance's grinding drag — and the lead hand raises an
ember-knuckle GUARD across the chest toward the hero. Sword stays on the
trailing side of the silhouette throughout (it is the side he glides toward;
the afterimages sit on the hero side, where he just was — see §4).

**Runtime afterimages (render-only, recommended, unchanged from v1):** 2
stepped ghosts of the current retreat frame, offset toward FACING (+6px, +12px
world), alphas ~0.45 / 0.25, tint `#1c1d28` / `#12121a`, refreshed every ~6
ticks, drawn BEHIND the sprite; near-void dither tint during `surgeBackward`.

## 4. Silhouette surges — scheduler unchanged, anchors moved

Scheduler, duration, variant pick, interrupt/ash rules, AFK precedence: exactly
as `walk_spec.md` §3 (fire every 420-480 ticks of continuous locomotion, ~60
tick one-shot riding the stride, index-driven, cut-to-ash on interrupt, never
during AFK). Eclipse + bolt anatomy unchanged (§4 there).

Placement (REQUIRED forward/backward difference, re-anchored to the rear carry):
- `surgeForward` — LOW / WEAPON-LINE: chest core (20,15) ignite -> arm crawl
  chest -> REAR fist (12,24) -> beside-blade crawl down the trailing blade
  ((12,29)->(6,43), 2px beside the red line) -> ground skitter at the drag
  point BEHIND him ((2..10,46)) -> fracture -> ash sinking off the sword line.
- `surgeBackward` — HIGH / CROWN-SPINE: crown ignite -> crown arc (10,3)->(20,1)
  -> one short arc per shoulder -> spine crawl down the back contour
  ((8,9)->(6,26)) -> tear-off arc into empty space UP-BACK ((6,15)->(1,20),
  kept clear of the lifted blade below) -> ash off shoulders/spine.

Band B FWD/BWD MAP cells chart the new anchors on the actual poses.

## 5. Integration map (locked wiring pattern — identical to v1's)

1. Paste the five clips from `walk2_literal.txt` into `BOSS_REDESIGN_SPRITES`
   in `src/core/SpriteManager.js` — `idle` REPLACES idle, `walkForward`
   REPLACES `run` (keep the key name `run`!), `walkBackward` REPLACES `retreat`
   (keep the key name `retreat`); `surgeForward`/`surgeBackward` are new keys.
2. No other wiring for the base clips: merged animator + row-count detection
   (`frame.length >= 40`) auto-serves them at 138x144 on screen. The aimDir
   flip already implements the facing law (§2) — nothing to add.
3. Surge scheduler + retreat afterimages: render-only additions in `Player.js`
   per §3/§4 of `walk_spec.md` (the `afkExit` indexed-clip idiom + the
   `_prevGroundedVFX` lazy-init idiom).
4. Hold tweaks per §3 table (`run` 4->5, `retreat` 5->12).

## 6. Cautions

- All walk_v1 cautions stand (jump/fall/doubleJump/dash still carry the OLD
  raised sword -> 7B-1 candidate; do not rename `run`/`retreat`; combat
  reach/hitboxes untouched; baked sparks = no extra runtime emitter; no
  animator pingpong; AFK outranks surges).
- The rear carry makes the raised-sword pop on jump/attack MORE visible than
  v1 did (the blade crosses the whole body). Attacks: still fine as a
  telegraph read. 7B-1 (air/dash re-pose with `heldSword()`) is now the
  natural next stage.
- The AFK distinctness contract is STRONGER than in v1: locomotion sword =
  trailing, low, behind; AFK sword = vertical, planted, in front. Keep it so.
- The retreat guard hand and the folded rear arm are BAKED anatomy — do not
  add runtime hand VFX on top of them.
- The idle tip rests ON the floor by design (executioner read). If a future
  pass wants a hover instead, raise `IDLE_ANGLE` toward 116 and accept the tip
  pulling 1-2 cols toward the body — do NOT shorten REACH (blade size is
  locked redesign language).

## 7. Verification (already done on the data)

Generator self-validates on every run (sizes / palette keys / floor row; it
throws on violation). Rear-tip cells confirmed: idle (2,46) resting, walk
plant (3,47) biting, retreat (4,43) lifted. 8x zoom pass on idle/plant/pass/
glide/surge frames: no guard-blade joint holes, no leg/blade cross-contamination
(>=2 col clearance at every leg pose), grip welded to the fist in all 23
frames. After wiring, re-run the standard offscreen anchor script and the live
boot check (0 console errors).
