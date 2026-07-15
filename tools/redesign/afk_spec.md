# 7A-0 — Boss AFK Intimidation / Sword-Planted Idle (visual spec)

Concept stage only. **No gameplay code exists yet.** Source of truth: `afk_gen.js` →
`afk_v1.png` (sheet) + `afk_literal.txt` (drop-in clip matrices). Derived 100% from the
approved boss matrix (`boss_matrix.txt`) and hero matrix, palette-law compliant.

## 1. State fantasy

Player (Boss) gives no input for **3.0s** → the Boss forcibly asserts dominance: snaps
upright, flips the (new, longer) sword point-down, releases a black-red **pressure
barrier** that shoves the Hero away (wall-ricochet if cornered), **plants** the sword
into the floor, and stands in a calm sword-planted idle wrapped in an oppressive
intimidation aura while the screen corners darken. Any player input exits the state.
Works even airborne (forced descent) or while being hit (denial tint — the hit is
visually swallowed). Feeling: *doing nothing becomes threatening.*

## 2. The longer sword (state-specific repose)

The idle sword (~23 px hilt-to-tip, reach 19) is too short to plant. This state uses a
**planted greatsword stack** (`plantedSword()` in afk_gen.js — parametric, byte-stable
across every frame): pommel ember bead `b/c` → pommel cap → 5-px grip w/ `a` wrap node →
**main double-crossguard** (lit bar, `4` tips, down-swept horns, hot `c/d` heart gem) →
short tier-2 cross at the blade root → **27-row molten blade** (`b→c→d` ramp, dark `1`
left flank / lit `3` right flank, tapered) → hot `d` tip biting the floor (`c` + `a`
seep). Total bead→tip **36 rows ≈ 75% of boss height** (+55% vs idle sword). Same
weapon family: obsidian body, double crossguard, molten core, ember gems. It exists
ONLY in the afk clips — normal combat clips keep the approved reach (gameplay reach
unchanged, house rule).

## 3. Clips (in afk_literal.txt, ready for SpriteManager)

Boss 46×48 → `BOSS_REDESIGN_SPRITES` (auto-wired: merged animator + `frame.length>=40`
→ BOSS_IDLE_PIXEL 3 + BOSS_REDESIGN_PALETTE). Hero 30×24 → `HERO_REDESIGN_SPRITES`
(HERO_SHEET merge + `frame.length>=20`).

| clip | frames | read | suggested hold (frames @60) |
|---|---|---|---|
| `afkSnap` | 3 | regal straighten + full vein flare (idle blade still raised) / blade re-gripped POINT-DOWN held high / chest-out release (+1px rise, flare) — **barrier fires on f2** | 8 / 7 / 7 |
| `afkPlant` | 3 | descent begins / **IMPACT** — 4px drive, tip bites floor, body dips 1px, gem flash / settled — hands slide up onto pommel | 5 / 6 / 8 |
| `afkIdle` | 2 | geometry-locked planted stance; f1 = whole-figure emberUp heartbeat | heartbeat: 42 / 6 (long rest, short thump) |
| `afkExit` | 2 | hands re-grip down the hilt / blade pulled free (tip clears floor) → FSM returns to `idle` | 6 / 6 |
| hero `brace` | 2 | head tucked+back, cape pressed away, blade lowered to defensive guard; f1 = blueUp + deeper cape | 10 / 10 loop |

`afkPlant` f2 **is** `afkIdle` f0 (identical matrix) — the handoff cannot pop.
Continuity: snap f1/f2 hand row 9; plant f0 row 11 → f1 row 15 (the 4-px drive).

## 4. VFX (port the paint() cells from afk_gen.js verbatim, house method)

All hard `fillRect` px blocks; no shadowBlur/gradients on bodies. Ember ramp:
`SMK #1a1420, UMB #14101c, E0 #6e0f1c, E1 #a8182a, E2 #e0263a, E3 #ff5a4a`,
void-black `#060409`.

| effect | sheet cell | notes |
|---|---|---|
| `drawIntimidationFlare` | barrier cell 1 | chest-point snap: hot 2×2 core, umbral diamond, radial ticks pointing OUTWARD (push, not gather), detaching wall hints. Anchor: `_chestY` idiom (render-only chest anchor from the boss VFX pass). |
| `drawPressureWave` | barrier cells 2–4 (`paintWave` ph 1/2/3) | traveling vertical pressure WALL, ~1.2× boss height: E2 leading edge + E3 crest sparks, 2–3px UMB dithered body (every 3rd px skipped = translucent void), E1/E0 pressure teeth, SMK trailing dashes, UMB ground-skim + ember drag. Mirrored pair, one per direction. ph2 = wider/dimmer, ph3 = vertical shard remnants dissolve. NOT a rectangle, NOT smoke. |
| wall ricochet | wall cells 1–3 | wave compresses hero into wall → **steel ST1 rim flash on the wall + dark UMB/SMK chevrons + warm dust** (NO red on hero, no hit-flash = not damage) → rebound: 1 dither-thinned steel afterimage + steel streaks + icy `#7fd4ff` ticks. Reuse Hero landing-dust for the wall base puff. |
| `drawPlantCrack` | crack cells 1–2 | impact E3 wink cross → settled: jagged `#0c0a12`/`#3a1014` cracks ±7px, E0/E1 ember seep inside, 2 slow motes. Spawned once at plant x, WORLD-anchored, lingers ~2s after exit. |
| `drawIntimidationAura` | aura cells 1–3 (`paintAura` ph 0/1/2) | see §5. Draw BEFORE the boss sprite (drawAura idiom). Anchors: boss matrix origin; plant col +31, floor +47, core (+19,+15). |
| screen vignette | vignette demo cell + tableau | see §6. Screen-space, drawn in main render after world. |

## 5. Intimidation aura — distinctness contract

Every live boss aura has a motion signature; this one must keep the ONLY
outward+downward signature:

- idle `drawAura` = violet ORBIT → intimidation has **zero violet, nothing orbits**
- `drawFearBossAura` = crimson fire RISING fast → intimidation **sinks**; only 3 slow motes rise
- charge auras = ember spokes CONVERGING inward → intimidation only radiates outward
- laser = horizontal beam language → nothing horizontal here

Layers (all in `paintAura`): ① spreading UMB floor-shadow pool from the plant point,
broken E0 rim, grows 15→21px half-width over the loop; ② 7 hanging void shards
(`#060409` slivers 1–2px wide, dim E0 caps, occasional E1 wink, sparse drip tips)
**sinking 1px/frame** with per-shard phase offset; ③ 2 static vertical pressure marks
near the body (unnatural stillness); ④ chest-core **heartbeat**: rest → tight E1 dash
ring → wide fading E0 ring, synced to the `afkIdle` emberUp frame; ⑤ 3 slow rising
ember motes. 3-phase loop @ ~9 frames/phase. Tiering: perf = pool + 4 shards + heartbeat
only; lite = drop drip tips + 1 mote.

## 6. Screen darkening (fear-pressure vignette)

QUANTIZED, never a smooth gradient wash: 3 stepped border bands of `#0a0410` at alpha
**0.42 / 0.24 / 0.11** (insets 0/6/15px scaled to screen) + 3px E0 ember tint 0.10 on
the outer rim. Center of screen untouched; combat band must keep full readability
(same rule as throne-room shafts ≤5% in the combat band). Fade in over ~400ms after
the plant, out over ~250ms on exit. perf tier: single 0.30 step.

## 7. Hero reaction (temporary, not weak)

- New AI substate `WARY` while the boss state is live: stops approaching, holds
  distance (~≥260px), no attacks; released the moment the state exits.
- Visual: `brace` clip loop + **hesitation arc** — 4–5 steel `#2e3444` ground dashes
  with one icy `#7fd4ff` tick + one `#b8ecff` held-breath glint at the toe line
  (the line he won't cross). Cold/steel = hero-owned palette; NOT the fear-stun
  crumple (that stays the Fear Strike visual) and NOT stars.
- Pushback: horizontal impulse only, **0 damage**; wall contact reflects velocity
  (~×0.55) into a short ricochet arc + the §4 wall visuals, brief stagger, no stun.

## 8. Override reads (state always wins)

- **Airborne trigger:** snap plays in-air while a `#060409` pressure column + E1 down-
  chevrons slam the boss to the ground (concept cell, band A row 5 right); landing
  merges into `afkPlant` f1; barrier fires on ground contact in this path. Suppress
  landing dust (slamActive-style guard).
- **Hit during snap/plant:** replace the white hit-tint with the **denial tint**
  (band A row 5): full UMB silhouette, E2 rim on the outer left/right contour only,
  2 frames, then shed E0 shards; no knockback read. Draw-time tint like the existing
  white flash — not a clip.

## 9. Integration map (later stage, NOT now)

- `SpriteManager.js`: add clips from `afk_literal.txt` to `BOSS_REDESIGN_SPRITES` /
  `HERO_REDESIGN_SPRITES`; add the §4 statics (port cells verbatim).
- `Player.js`: AFK timer (3s no input), state `AFK_INTIMIDATION` (snap → barrier →
  plant → idle loop → exit on input), denial tint hook, forced-descent hook.
  Boss is NOT invulnerable by default (visual dominance, not a cheat) — tunable.
- `Enemy.js`: barrier impulse + wall reflect + `WARY` substate + brace clip + arc.
- `main.js` (or Player render tail): vignette overlay.
- Gameplay numbers (radius ~360px world, wave speed, impulse) are all TUNABLE —
  this doc locks visuals only. No hitbox/timing/scale changes to existing moves.
- Reminder: boss/hero matrices share palette-key characters with different colors —
  per-sheet palettes already exist (`BOSS_/HERO_REDESIGN_PALETTE`); keep using them.
