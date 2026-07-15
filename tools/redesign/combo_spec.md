# Stage 8A-0 — Boss Basic Combo Redesign (visual production spec)

**Status: VISUAL DESIGN ONLY — nothing wired into `src/`.** This package redesigns the
look of the Boss's normal 4-hit ground combo. Gameplay (FSM timings, hitboxes, damage,
projectile speeds, dash length) is **untouched by design**: every visual rides the
existing `COMBO` / `FLAME` / `FINISH` / `EXPL` windows in `src/entities/Player.js`.

## Package

| File | Contents |
|---|---|
| `combo_gen.js` | deterministic generator (asserts baked in; throws on violation) |
| `combo_v1.png` | the production sheet (this document's visual source of truth) |
| `combo_literal.txt` | drop-in matrices: 4 body clips (16f, 46×48) + 2 effect grids |
| `combo_spec.md` | this hand-off |

Base ingredients (all approved): `boss_matrix.txt` body, walk2 rear trailing carry +
`heldSword` parametric blade (reach 23 — **one-sword law**, same sword as locomotion),
ember-void palette keys `0-5 a-d g h`, walk2/afk2 bolt anatomy, eclipse_gen
`eclipseSkin`, Family-C corona/ray/octagon detonation vocabulary.

## Why 4 hits

The redesign keeps a 4-slot chain because (a) the escalation arc reads strongest as
fast opener → turning heavy → cadence break → decisive ender, and (b) it maps 1:1
onto the existing `comboStep 1..4` FSM, so integration is a pure sprite/VFX swap with
zero gameplay drift. Both legacy elements survive, redesigned: the old 3rd-hit magic
becomes the **Umbral Orb** (red-eclipse ball, kept at slot 3), the old 4th-hit rush +
explosion becomes the **Eclipse Breaker** (shoulder-load rush + grounded detonation).

## The hits

### HIT 1 — RISING REND (`attack1`, 4f) — fastest
The rear low carry IS the wind-up: the trailing blade whips low→high through the
front (uppercut), body uncoiling out of the locomotion stance.
- f0 COIL — one breath deeper than the idle carry (crouch 1, weight back, tip stirs dust)
- f1 ACT-LO — blade passes under the front (58°); thin scar starts
- f2 ACT-HI — **the hit**: rising diagonal (-40°), forward lean, bold rising air scar
- f3 FOLLOW — blade drifts near-vertical (-70°); scar breaks to sinking ash
- Scar: thin black-red arc (`0` sheath / `a b` body / `c` inner / `d` licks), baked,
  drawn behind the silhouette only. **No eclipse on this hit.**

### HIT 2 — ECLIPSE WHEEL (`attack2`, 4f) — best reach, full-body turn
Reference-logic reinterpretation (torque / turn-through / low sweep), not a copy.
- f0 WRAP 2H — blade lies flat back over the shoulders at chin level; the empty lead
  hand JOINS the grip (two-hand moment); crouch begins
- f1 AWAY — mid-pivot: the body is seen from behind (mirrored silhouette, visor and
  chest core hidden); the blade sweeps BEHIND him at hip height (drawn behind-only)
- f2 SWEEP — **the hit**: rotation completes into a wide knee-height front cut (12°),
  widest silhouette, flat scar band passes in FRONT of the legs, tip-graze ticks
- f3 EXIT — body rises; the band ashes behind the settling blade (48°)
- Scar: the flattened horizontal band (side-view spin ring). Red Eclipse appears
  ONLY as this black-red scar — the body stays normal.

### HIT 3 — UMBRAL ORB (`attack3`, 3f body + `comboOrb` 4 cells) — range / cadence break
The sword returns to the rear carry; the EMPTY lead palm casts. Replaces the Dark
Flame **visual** on the same moving-hitbox slot (nothing about `FLAME` changes).
- f0 GATHER — planted; a void-fracture arc links the chest core to the palm; kernel forms
- f1 CAST — palm thrusts; the orb condenses ahead of the open hand
- f2 RECOIL — orb detached (flight cells take over); ember residue drifts off the palm
- `comboOrb` (23×23, centre 11,11, authored travel = +x):
  O0 IGNITE (kernel + converging ticks) → O1/O2 FLIGHT loop (void disc `0` core +
  hot `d` corona + broken `c` ring + bolt kinks + ember tail) → O3 BURST (broken
  ring + outward shards + sinking ash). 23 cells ≈ 69 game px ≈ the existing 64px
  flame box — the visual matches the live hitbox envelope.

### HIT 4 — ECLIPSE BREAKER (`attack4`, 5f + `comboDetonation` 4 cells) — heaviest, ender
- f0 LOAD — two-hand shoulder load (power pose): blade up-back over the rear
  shoulder, both fists stacked at the chest, body coiled, ember veins bright
- f1 RUSH-A — eclipse ignites (rim 0.6): drive posture, blade leading low-forward,
  baked speed ticks; runtime afterimages (see integration)
- f2 RUSH-B — **peak**: full eclipse body, hot broken rim, bolt tears off behind
- f3 IMPACT — the blade RAMS the floor ahead; bite sparks; detonation anchors here
- f4 RECOVER — back to the EXACT rear-carry rest + ember memory on the floor —
  the seam straight back into locomotion idle (asserted: tip in the rear-lower quadrant)
- `comboDetonation` (72×52, centre 38,34, **floor row 48**): D0 FLASH (void core
  births + floor flare) → D1 BURST (corona core, crystalline rays up/forward, broken
  half-octagon, outward shards, void-fracture skitters racing the floor) → D2
  FRACTURE (rays break into black-red bolts, octagon cracks) → D3 ASHFALL (sinking
  slivers + ember scorch, zero hot cells). Grounded half-dome — the floor eats
  everything below row 49. 72 cells = 216 px ≈ the existing 210px `EXPL.size`.

## Red Eclipse law (escalation, never flooding)

H1 none → H2 black-red scar only → H3 the orb IS the eclipse → H4 full
(eclipse body on the rush + detonation). Bolts use the approved afk2 anatomy
(`0` sheath / `c` filament / `d` kinks / `b`+`a` branches / `g 1` ash). Body eclipse
uses the approved `eclipseSkin` broken-ember rim — distinct from the denial tint's
solid rim and from the AFK aura.

## Suggested holds (presentation-only knobs; commit/recovery frames UNCHANGED)

| Clip | Frames | Existing window | Suggested |
|---|---|---|---|
| attack1 | 4 | commit 14 + chain 16 | hold 4 (f3 = chain pose fills recovery) |
| attack2 | 4 | commit 16 + chain 16 | hold 4 |
| attack3 | 3 | commit 20 + chain 18 | hold 7 |
| attack4 | 5 | dash 10 + recovery 30 | index off the phase (like the AFK clips): f0 at start, f1-f2 across the dash, f3 pinned while the blast lives, f4 for the tail. Free-running fallback: hold 8 (no mid-recovery loop) |

Orb over the 80f flame life: O0 ticks 0-5, then O1↔O2 @5, O3 as the last ~6 ticks /
on hit. Detonation over the 26f blast: D0 0-5, D1 6-13, D2 14-19, D3 20-25.

## Facing law

Authored facing right; the existing full-sprite `aimDir` mirror is correct for every
frame (the wheel's AWAY frame is a spin moment — direction-agnostic by construction).
Effect grids flip around their own centre col (orb 11; detonation **CX=38**, not the
72-grid midline — mirror cells around CX, RE-3/RE-5 style anchor math applies).

## Integration map (for the LATER implementation stage — not now)

- Body clips: replace `attack1..attack4` frame data inside `BOSS_REDESIGN_SPRITES`
  (`src/core/SpriteManager.js`) — same keys, auto-routed by the `frame.length>=40`
  detection. Hold tweaks in `Player._animState` (currently 4/3/5/3).
- Scars are BAKED: retire the runtime `drawBossSlash` hook on combo hits 1/2
  (`Player.draw`, the `_slashVfxFrame` block) or gate it off — otherwise double trails.
- Orb: swap the visual at the `kind==='flame'` seam (`Player.js` ~1951,
  `SpriteManager.drawDarkFlame` caller) for a `comboOrb` cell painter
  (O-index from `p.lifeProgress`); position/speed/hitbox untouched.
- Detonation: swap the visual at the `kind==='explosion'` seam (`Player.js` ~1968,
  `drawExplosion` caller) for a `comboDetonation` painter, floor row 48 pinned to
  the arena floor line; D-index from the blast's 26f life.
- Rush afterimages: render-only ghosts of the live frame during
  `_finisherDashTimer > 0` (drawDashAura / glide-trail idiom — 2 stepped tints).
- Never touch: `COMBO`/`FLAME`/`FINISH`/`EXPL`/`DIVE` consts, hitboxes, damage,
  input, AI, Walk/Ground/Air eclipse overlays, AFK.

## Validation (all asserted in-generator; regenerate to re-prove)

16 body frames 46×48, palette-legal, feet/shadow on rows 46-47; effect grids legal;
away frame has zero hot ember above row 18 (visor hidden); rush void dominance
≥1.5× a normal frame; finisher f4 tip back in the rear-lower quadrant (locomotion
seam); orb flight cells keep the void-disc core + ≥8 `d` corona; detonation reaches
row ≤14, floor skitters present, D3 fully cooled, nothing below the floor;
detonation outshines the orb (`d`-count escalation); literal round-trips.
