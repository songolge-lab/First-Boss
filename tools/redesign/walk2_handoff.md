# Stage 7B-1 — Boss Locomotion (rear trailing carry) — HANDOFF PACKAGE

Asset + handoff work only. **Nothing here is integrated into the live game;
`src/`, gameplay, hitboxes, AI, AFK, combat VFX, throne room and Electron/
Capacitor files are all untouched.** This document packages the APPROVED
revised Stage 7B-0 locomotion output (the rear-carry revision, a.k.a. 7B-0R)
into a drop-in-ready set for a later wiring stage.

The approved design preserves the walk_v1 foundation and corrects only the
sword-carry logic: the boss always faces the Hero, and the greatsword is
carried BEHIND the body on the rear / trailing side, coherent in both facings.
**This revision is NOT walk_v1.** Do not fall back to the front-carried sword.

## 1. File manifest (the approved revision — clearly distinct from walk_v1)

| file (tools/redesign/) | role | supersedes |
|------------------------|------|------------|
| `walk2_literal.txt`    | **drop-in matrix data** for `BOSS_REDESIGN_SPRITES` (5 clips, JS literals) | `walk_literal.txt` |
| `walk2_gen.js`         | generator / editable source (`node walk2_gen.js` re-emits sheet + literals) | `walk_gen.js` |
| `walk2_v1.png`         | full rendered production sheet (band A = the real drop-in matrices) | `walk_v1.png` |
| `walk2_validate.js`    | **standalone validator + facing proof** (`node walk2_validate.js`) | — (new) |
| `walk2_facing.png`     | facing-proof render: each base clip authored (hero right) vs mirror (hero left) | — (new) |
| `walk2_spec.md`        | detailed per-clip design spec + change log vs walk_v1 | `walk_spec.md` |
| `walk2_handoff.md`     | this package index + implementation contract + validation results | — (new) |

The older `walk_*` files remain on disk as the superseded 7B-0 originals; ignore
them for integration. Everything to be wired lives in the `walk2_*` set.

## 2. Animation groups, frame counts, durations, loop, base-vs-surge

All frames are **46×48** at the current boss pixel density (`BOSS_IDLE_PIXEL 3`
→ 138×144 on screen; identical scale/anchor to every existing boss clip).

### Base locomotion (carries the sword pose; replaces existing clips in place)

| clip           | frames | replaces (keep the key name) | hold @60fps | loop  | selection |
|----------------|--------|------------------------------|-------------|-------|-----------|
| `idle`         | 3      | `idle`                       | 12          | loop  | grounded, ~0 horizontal velocity |
| `walkForward`  | 6      | `run`                        | 5 (4 works) | loop  | grounded, moving TOWARD the Hero |
| `walkBackward` | 4      | `retreat`                    | 12 (was 5)  | loop  | grounded, moving AWAY from the Hero while still facing it |

- The 3-frame idle loops `0-1-2` (no pingpong in `SpriteAnimator`).
- Forward vs backward selection is the EXISTING `Player._animState` logic
  (`run` when `sign(velocityX) === aimDir`, `retreat` when moving away while
  facing the Hero — `walk_spec.md`/`_animState` ~line 1183). We only swap the
  frame data under the `run`/`retreat` keys and bump their holds; no selection
  logic changes.

### Surge overlays (NEW keys; render-only, ~1 s black-red silhouette flare)

| clip            | frames | key    | hold @60fps | loop     | selection |
|-----------------|--------|--------|-------------|----------|-----------|
| `surgeForward`  | 6      | new    | 10 (→60 ticks ≈ 1.0 s) | one-shot | rides `walkForward` when the surge timer fires |
| `surgeBackward` | 4      | new    | 15 (→60 ticks ≈ 1.0 s) | one-shot | rides `walkBackward` when the surge timer fires |

- Surges are ALTERNATE SKINS of the walk poses (same stride frames, body pushed
  to the eclipse silhouette + baked void-fracture bolts). They ride ON TOP of
  locomotion without stopping the stride; movement/velocity/FSM are never
  touched.
- Scheduler (render-only, to be added in `Player.js` at wire time — NOT now):
  fire every **420–480 ticks** of continuous locomotion; play exactly one pass
  (~60 ticks); pick the variant by the active clip (`run`→`surgeForward`,
  `retreat`→`surgeBackward`); on attack/dash/jump/direction-flip, jump to the
  last (ash) frame for 1 tick then hand back; **AFK outranks and suppresses
  surges** (the eclipse language stays exclusive to denial/AFK contexts).
- **Base vs surge separation is total:** the 5 clips are independent frame sets.
  Base locomotion needs zero new code (auto-served by the merged animator +
  `frame.length >= 40` row-count detection). Only the surge scheduler + retreat
  afterimages are new render-only code, added later.

## 3. Facing + sword-carry contract (explicit)

**Rule:** the boss always faces the Hero; the sword is always on the rear /
trailing side of the silhouette, held by the trailing hand; in neither facing
may the sword read as being in front of the body.

### How it is represented — one authored facing + the existing mirror

- Every matrix is authored **facing RIGHT** (Hero on the right), like all
  approved boss clips. The grip is welded to the boss's OWN rear fist that
  already exists in the base art (the hanging left hand at cell ~(11,24), or the
  folded-up fist at ~(13,20) in the retreat) — `hand = REAR_FIST + bodyBob` in
  every frame. The blade trails DOWN-BACK from that fist at 106–113° through the
  otherwise-empty rear-lower-left quadrant. The Hero-side (lead) hand is EMPTY:
  a relaxed hang in idle/advance, a raised ember-knuckle guard in the retreat.
- The runtime already mirrors the whole sprite by `aimDir` in `Player.draw`
  ("the sword ALWAYS points at the Hero" flip). **The naive full-sprite mirror
  is CORRECT here and is the intended mechanism** — no separate facing matrices
  and no layer composition are required.

### Why the naive mirror does NOT break the rear-carry rule

The carry is defined RELATIVE TO FACING ("trailing" = opposite the direction the
boss faces). A full mirror flips the facing AND every pixel together, so the
sword's position-relative-to-facing is invariant:

- Hero RIGHT → authored frame → boss faces right, sword trails LEFT (rear),
  gripped by the left/rear hand.
- Hero LEFT → same frame mirrored → boss faces left, sword trails RIGHT (rear),
  gripped by what now reads as the right/rear hand — the correct trailing hand
  for that facing.

Because the blade was authored on the trailing (not a fixed absolute) side, the
mirror can never carry it to the front. This is proven numerically in §5 (REAR +
MIRROR checks) and visually in `walk2_facing.png`. A naive mirror would only
break the rule if the sword were pinned to an absolute side (e.g. always the
Hero-facing side) — which this design deliberately avoids. **No separate facing
matrices are needed; do not add them.**

### Anchors (expected, unchanged from the rest of the boss set)

- Frame box 46×48; feet plant on rows 46–47 in every frame (validated).
- Draw anchor: feet-anchored, bottom of the 48-row frame on the floor line,
  horizontal centre at the body centroid (torso ≈ col 19). On-screen 138×144.
- Idle→walk transition validated as jump-free (§5 ANCHR): feet Δ0, top Δ0,
  centre Δ ≤1px.

## 4. Afterimages + drag sparks (supporting elements)

- **Backward-glide afterimages** — render-only, recommended, added at wire time
  (NOT baked into the matrices, aside from the in-frame tattered trail hints on
  the facing contour). Two stepped ghosts of the current retreat frame, offset
  toward FACING (+6px, +12px world), alphas ~0.45 / 0.25, tint `#1c1d28` /
  `#12121a`, refreshed every ~6 ticks, drawn BEHIND the sprite; near-void dither
  tint during `surgeBackward`. Same idiom as `drawDashAura`'s stepped
  afterimages, slower/subtler. The `walk2_v1.png` "GLIDE AFTERIMAGES" band shows
  detach → trail → decay.
- **Sword drag sparks** — BAKED into the two `walkForward` PLANT frames (f1, f4):
  the trailing blade tip grinds the floor (rows 46–47) and kicks ember scrape
  sparks UP-BACK (behind the boss). Because they are baked, do NOT add a runtime
  ember emitter on top (double-spark). The idle tip RESTS on the floor behind the
  heel (a resting drag, not the AFK plant); the retreat tip LIFTS clear (rows
  42–43). The `walk2_v1.png` "DRAG SPARK 2X" panel zooms the plant read.

## 5. Validation results (`node walk2_validate.js` → exit 0, ALL PASSED)

The validator reads the ARTIFACT (`walk2_literal.txt`), not the generator, so it
certifies exactly what would be pasted into `BOSS_REDESIGN_SPRITES`.

- **CLIPS** — all 5 present with approved counts: idle 3, walkForward 6,
  walkBackward 4, surgeForward 6, surgeBackward 4.
- **DIMS** — 23/23 frames exactly 46×48, all rows uniform width.
- **KEYS** — every cell is a legal `BOSS_REDESIGN_PALETTE` key (`0-5 a-d g h .`);
  zero illegal keys across 23 frames.
- **FLOOR** — 23/23 frames plant on row 46–47 (no feet pop).
- **REAR** — in all 13 base-locomotion frames the sword sits **11.3–12.7px
  behind** the body centroid, with **0** cells in the front-lower quadrant
  (cols ≥32, rows ≥28) → the sword is never in front.
- **MIRROR** — authored (facing R) sword left of body (6.6 < 19.0); mirrored
  (facing L) sword right of body (38.4 > 26.0) → trailing invariant under the
  naive mirror.
- **ANCHR** — idle final frame → walkForward[0] / walkBackward[0]: feet Δ0,
  top Δ0, centre Δ ≤1px (no anchor jump).
- Syntax: `node --check` clean on `walk2_gen.js` and `walk2_validate.js`.

## 6. Palette + matrix consistency notes

- All matrices use ONLY the `BOSS_REDESIGN_PALETTE` key set and colours (the
  same map `walk2_gen.js BOSS_PAL` and the validator both hard-code): body ramp
  `0 #08080c → 5 #565c74`, ember ramp `a #6e0f1c / b #a8182a / c #e0263a /
  d #ff5a4a`, deep-ember `g #3a1014`, dim rim `h #571820`. No palette change is
  needed to wire this set.
- Surge eclipse + bolts reuse the same keys (body → near-void `0`/`1`, blade →
  deep-ember `a`/`g` memory, broken rim `h` + sparse `c`, void-fracture bolts as
  `0` sheath / `c` filament / `d` kinks / `b` branches + `a` tips / ash `g`+`1`)
  — the approved afk2 anatomy, no new keys.
- Row/column convention matches the base art (`boss_matrix.txt`, 48 rows × 46
  cols); the generator derives every frame from it via the house pose pipeline
  (eraseBlade → leg-band re-pose → moveUpper bob → emberUp → parametric
  `heldSword()` on the rear fist), so density and silhouette stay consistent
  with the rest of `BOSS_REDESIGN_SPRITES`.
- Drop-in compatibility: `idle`/`walkForward`(`run`)/`walkBackward`(`retreat`)
  replace frame data under the existing keys; `surgeForward`/`surgeBackward` are
  new keys. Row-count detection (`frame.length >= 40`) auto-routes all of them
  through `BOSS_IDLE_PIXEL 3` + `BOSS_REDESIGN_PALETTE`, exactly like the
  current redesigned clips.

## 7. Integration map (for the LATER wiring stage — do not do it now)

1. Paste the 5 clips from `walk2_literal.txt` into `BOSS_REDESIGN_SPRITES`
   (`src/core/SpriteManager.js`); keep the `run` / `retreat` key names.
2. No wiring for the base clips — merged animator + row-count detection serve
   them; the existing `aimDir` flip implements the facing contract (§3).
3. Add the surge scheduler + retreat afterimages as render-only code in
   `Player.js` (`_animState` indexed-clip idiom + `_prevGroundedVFX` idiom).
4. Hold tweaks: `run` 4→5, `retreat` 5→12 (one-number render-only edits).
5. Re-run the standard offscreen anchor script + live boot (0 console errors).

## 8. Caution carried forward

Jump / fall / doubleJump / dash and the attack wind-ups still carry the OLD
raised idle sword; the rear carry makes that pop MORE visible than walk_v1 did
(the blade now crosses the whole body when raised). Attacks read the raise as a
telegraph (fine); re-posing the air/dash clips with `heldSword()` is the natural
next stage. The AFK planted-sword read (vertical, point-down, in FRONT, longer
ceremonial blade) stays exclusive and is now even more distinct from the
trailing locomotion carry.
