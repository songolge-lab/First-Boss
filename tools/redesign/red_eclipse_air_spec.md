# Red Eclipse — Air Charged Ignition (Stage RE-4 handoff)

Production sheet: `red_eclipse_air_v1.png` (generator `red_eclipse_air_gen.js`,
data `red_eclipse_air_literal.txt`).
**STATUS: HANDOFF PACKAGE, pending approval. Nothing wired into `src/`.**

This is the dedicated extraction of the approved **RE-0 Family C "IGNITION ECLIPSE"**
(`eclipse_gen.js` / `eclipse_spec.md`) for the Boss's **air charged attack**. The
normal-tier effect grids are **byte-exact to `eclipseIgnition` in `eclipse_literal.txt`**
(asserted by the generator on every run) — this package extracts and productionizes the
approved direction; it does not reinterpret it.

Core visual idea: a **DETONATION**. reref1's radial starburst (powerful central ignition,
long pointed rays, cross + diagonal geometry, ring fragments, electrical discharge,
gather → ignition → discharge rhythm) translated into the boss's black-red pixel language:
energy gathers at the hovering Boss's red chest core, the core ignites into an umbral
void-disc eclipse inside a hot corona, and long STRAIGHT crystalline rays burst outward.
`CHEST CORE -> IGNITION -> OUTWARD EXPANSION` — the exact conceptual opposite of the
Ground Charged Inhale (RE-2), never an inward convergence, never a generic aura.

Strict pixel art: hard cells, boss palette keys only (`0-5 a b c d g h`), no blur, no
gradients, no glow clouds, no new colors. Bolt anatomy at decay = the approved
void-fracture language (`0` crack-sheath / `c` filament / `d` hot kinks / `b` branches /
`a` tips / `g`+`1` sinking ash); the AFK arcs themselves stay AFK-only.

---

## 1. Geometry & anchors

- Effect key-grids **100x88** per frame, split `back` (drawn BEHIND the sprite) +
  `front` (drawn OVER it), plus a pre-treated 46x48 `body` re-skin per frame.
- Boss `airCharge` pose (46x48) sits at grid **(27,14)**. **No floor in-frame** — the
  Boss is airborne (hover-charging); the grid follows the Boss, not the world.
- **Chest-core ignition anchor: grid (47,29)** = pose chest **(20,15)** — the red chest
  core. All 8 rays are born there, and the corona's void disc rides the FRONT grid at
  the same cell, so the eclipse "eye" sits visibly on the chest. Never the feet, the
  floor, the sword tip, or a point behind the Boss.
- Authored facing RIGHT; runtime mirrors with the existing aimDir flip. Grid center
  column 50 == body center column (27 + 46/2), so the whole 100x88 grid mirrors around
  the Boss's center with zero extra math — the radial geometry is flip-safe and the
  chest core stays anchored in both facings (same self-solving scheme as RE-3's
  `drawGroundEclipse`).
- On screen at BOSS_IDLE_PIXEL (3): **300x264 px** on the 1280x720 view (<24% of the
  screen width — dominant but never a screen obstruction). The sheet renders at this
  actual scale (1 cell = 3 px).

## 2. Animation phases (frame counts + suggested holds @60fps)

| frame | phase | RE-4 phase name | hold | what happens |
|-------|-------|-----------------|------|--------------|
| C0 | KERNEL | 1 — Suspended gather | 6 | void kernel condenses at the chest; 4 tiny in-ticks; close shards drift IN (short + tight — NOT family B's big ring) |
| C1 | CONDENSE | 1 — Suspended gather | 6 | kernel goes hot; N-S pre-stubs appear — the star about to be born |
| C2 | IGNITE | 2 — Pre-ignition expansion | 4 | rays burst to 55%; faint octagon skeleton; shards begin flying OUT |
| C3 | CORONA | 3 — Peak eclipse ignition | 5 | the reref1 frame: full straight rays + broken octagon + outer dash ring + corona core + detached tip glints + crystal scatter; the Boss hangs inside it |
| C4 | SHIMMER | 3 — Peak eclipse ignition | 5 | held peak: minor rays rotate a slot, shards push further out, corona pulses |
| C5 | SHATTER | 4 — Outward discharge | 5 | rays BREAK into black-red bolts (N+S still flash hot, E+W fractured, 2 diagonals tear off whole); octagon cracks; one bolt crawls OFF the body |
| C6 | BOLTFALL | 4 — Outward discharge | 6 | only stray bolts remain + sinking ash slivers; core cools to ember memory |
| C7 | FADE | 5 — Dissipation | 8 | last ash sinks, a single `a` wink at the core, the body resolves back to normal |

- **Loop / one-shot contract:** C0-C2 play ONCE (riding the charge-up), the C2→C3
  ignition transition fires ONCE per charge (the deliberate peak event), **C3↔C4
  pingpong** loops while the charge stays ready, C5-C7 play ONCE on release. Nothing
  else ever loops; the effect can never re-detonate mid-hold.
- Holds are **visual suggestions only** — the gameplay charge clock owns all timing
  (see §5). If the charge ends before C3, cut straight to cleanup (legal hard cut).
- Body re-skin per frame (pre-baked in the literal, shared by all tiers):
  C0 `darkenStep` → C1-C5 `eclipseSkin` (rim envelope .6/.8/1/1/.7; hot at the peak;
  molten blade keeps its ember memory) → C6 `darkenStep` → C7 raw pose. At runtime the
  re-skin replaces the sprite frame for **C0-C4 only**; the release tail C5-C7 draws
  back+front grids only, over whatever live pose the dive shows (see §6).

## 3. reref1 fidelity (what the extraction preserves)

The approved RE-0 translation keeps reref1's core behavior, mapped 1:1:

- **Powerful central ignition event** → the C2→C3 burst out of the chest core.
- **Long pointed radial spikes** → 4 cardinal rays, `d→c→b→a` taper to 1px, `0` void
  flanks near the core, detached `d` tip glints flying ahead of each ray.
- **Cross + diagonal starburst geometry** → fixed 8-ray skeleton (N/S/E/W + 4
  diagonals) + 8 minor inter-rays at the peak; the **south ray is the longest (~2.2x)
  and aims at the ground** — the air charge's threat axis (the dive).
- **Expanding geometric structure** → broken-octagon ring fragments + detached outer
  dash ring (angular eclipse geometry — deliberately never a circle).
- **Center-to-edge energy direction** → asserted: mean hot-cell radius only grows
  C1→C2→C3 (3.8 → 9.0 → 14.8 normal) after the C0→C1 gather pull-in (15.1 → 3.8).
- **Brief dominant peak** → C3/C4 held eclipse; the ignition transition itself is one
  4-tick frame.
- **Fragments + electrical discharge** → crystal shard scatter with core-pointing
  tails (outward flight), then the C5-C7 bolt decay in the approved void-fracture
  anatomy.
- **Gather → ignition → discharge rhythm** → phases 1-5 above.

The reference's white flash is inverted into the dark identity: an umbral VOID disc
inside a hot `d` corona — a literal red eclipse. No reference character or scene
elements were carried over; only the effect behavior and composition.

## 4. Outward-motion rules (the detonation contract)

Every frame must obey all four cues so no still can be misread as an implosion:

1. **Gather pulls tight first, then radius only grows.** C0 shards drift IN (tails
   outside), the kernel condenses, then mean hot-cell radius rises monotonically
   C1→C2→C3 and holds stable (±20%) at C4. Baked as a generator assertion per tier
   (normal 15.1 / 3.8 / 9.0 / 14.8 / 14.4 across C0-C4).
2. **Rays ramp hot-at-core to dark-at-tip** (`d→c→b→a` outward) with detached `d` tip
   glints beyond the ray ends — the energy visibly leads away from the Boss.
3. **Shard tails point AT the core** (tail behind motion), so every fragment reads as
   outward flight even in a freeze-frame.
4. **The 8 ray angles never change**; the S ray is always the longest and aims at the
   ground. Decay only ever breaks outward — bolts fly off the ray lines, ash sinks,
   nothing returns to the core.

Reach is asserted at the C3 peak in every tier: S ≥ 50 cells, N ≥ 24, E/W ≥ 32, and
S strictly dominant (S=58, N=27, E/W=36 as authored). The corona core is asserted as
a void disc (`0` at 47,29) inside a hot ring (≥8 `d` cells within manhattan 4) across
C2-C4, and as a lit kernel (`a`/`d`) across C0-C1.

## 5. Relation to the existing air charge (nothing about it changes)

Integration seam: **the `drawChargedAirAura` + `drawChargeReadyAura` seams in
`Player.draw`** while `_chargeType === 'AIR_DIVE'`. This effect replaces those two
aura visuals at their call sites; everything that drives them stays as-is:

- **Gather (C0-C2)** rides the REAL charge meter — suggested mapping
  `index = min(2, floor(chargeRatio * 3))` (`chargeRatio` = `chargeTimer / 60`), the
  same scheme RE-3 used for the ground family. The real 60-tick charge simply
  stretches the gather; no new clock.
- **Peak ignition** happens the moment the meter fills — the frame `isChargeReady`
  first arms (fully charged + still holding + airborne). C2→C3 is that transition.
- **Charged hold** = `isCharging && isChargeReady`: C3↔C4 pingpong (suggested 5 ticks
  each, a render-only counter like RE-3's `_groundEclipseHold`). This is the safe
  hold-loop strategy: a **restrained post-ignition loop that stays visually stable**
  — the corona holds its radius (asserted), minor rays rotate a slot, the corona
  pulses. The largest starburst appears exactly once per charge as a deliberate
  event; the hold never re-bursts, never restarts the gather, never accumulates.
- **Release (fully charged)** → the existing `_startAirDive(true)`: play C5-C7 ONCE
  (~19 ticks) as a render-only tail while the existing freeze (12 ticks) + dive play
  out. Draw back+front only (no body re-skin) so the tail never fights the live
  `chargedDive` pose. After C7, nothing remains — the existing dive trail and landing
  slam VFX (untouched) carry the rest of the attack.
- **Release (partial charge)** → normal dive, NO tail: the gather cuts hard to
  nothing the same frame (matches today's aura behavior).
- Tier gate stays `PerfMonitor.shouldSkip('playerChargeAura')`; tier choice stays
  `isPerfVfx()/isLiteVfx()` picking `eclipseAirPerf`/`eclipseAirLite`/`eclipseAir`.

Hover feel, charge duration (`CHARGE.frames` 60), type locking, dive freeze/velocity
(`DIVE` 12/11/21), Fear-shockwave gating (`_diveCharged`), damage, hitboxes and the
`airCharge`/`chargedDive` poses are **all untouched** — the visuals fit the existing
attack, not the other way around.

## 6. Cleanup rules

- Cancel (charge interrupted, hit-stagger, death, restart, scene reset, Nemesis card):
  **clear all effect cells the same frame; body re-skin resolves back to the live
  sprite next frame.** No orphan cells, no lingering ash, no stale VFX. A hard cut to
  nothing is legal at any frame.
- All lifecycle ends route through the existing charge-cancel paths (the formation is
  derived from the live charge state; the only render-only counters are the hold
  pingpong and the release-tail countdown, both zeroed on fire/cancel — mirror RE-3's
  `cancelIntimidation` cleanup).
- Never draws during AFK (charge and AFK are already mutually exclusive states).
- The release tail ends itself after ~19 ticks; if the dive lands earlier, the
  landing slam simply draws over the last tail frames and the tail expires — no
  interaction, no handoff logic needed.

## 7. Facing behavior

Authored facing right. At runtime the existing aimDir flip mirrors back, body and
front grids around the Boss center; because the grid center column (50) is the body
center column, the chest core lands on (47,29)-mirrored = the same chest cell, and
the radial starburst is symmetric enough that left/right facing read identically.
The S ray stays vertical (the dive axis has no horizontal facing). Facing at release
should be captured once for the tail (like `_groundEclipseReleaseFlip`) so a mid-dive
turn cannot mirror the decay debris.

## 8. Quality tiers (reductions of the same design — never a different effect)

All three tiers are baked as data in the literal; the outward proof (§4) is asserted
per tier. Shard cuts take the FIRST n of the normal scatter (same seeded stream), so
lower tiers are deterministic subsets, never re-rolls.

| tier | key | reduction |
|------|-----|-----------|
| normal | `eclipseAir` | full design — 8 rays + minor inter-rays + broken octagon + outer dash ring + full shard scatter + full bolt decay (incl. diagonal tear-offs + the body-crawl bolt); byte-exact RE-0 Family C data |
| lite | `eclipseAirLite` | all 8 main rays, octagon, corona core, tip glints kept; minor inter-rays + outer dash ring dropped; shards halved; decay keeps tear-offs + crawl, drops one stray bolt |
| performance | `eclipseAirPerf` | 4 cardinal rays + 4 diagonal rays + corona core + tip glints (the H/V/diagonal starburst skeleton, S ray longest); no octagon/dashes/peak shards; decay = the 4 cardinal ray-break bolts + the S-axis boltfall + ash; still unmistakably an outward eclipse — never a generic aura, never the old placeholder |

`eclipseAirBody` (8 pre-treated bodies) is shared by all tiers.

## 9. Readability contract

- Boss silhouette and sword stay readable inside the effect (body re-skin keeps the
  full contour; the corona is a ring around the chest, never a filled mass; rays are
  1-2 cells thick with void flanks).
- The chest-core eclipse (void disc + hot corona) is the brightest, most persistent
  element from C1 on — the unmistakable ignition center.
- 300x264 px on a 1280x720 view: dominant at the peak but never full-screen; the
  throne room and the Hero stay legible (see the tableau + full-viewport mock on the
  sheet, both with the true-scale 2px-grid hero).
- Verified on the sheet at true gameplay scale (whole sheet at 1 cell = 3 px, zoom
  bands marked 2X).

## 10. Family distinctness (never mix)

- **Ground charged inhale (RE-2)** — power forms OUTSIDE, travels INWARD on fixed
  lanes, crushes into the chest core, brims. This air family is its exact inverse:
  born AT the chest core, ignites, bursts OUT. The sheet carries a side-by-side
  opposites band (ground B4 crush vs air C3 corona, IN/OUT motion glyphs).
- **Walk stride eclipse** — locomotion-linked manifestation riding the body; arcs
  never leave the silhouette; no large radial ignition. This is a deliberate airborne
  detonation with 25-58-cell rays.
- **AFK void-fracture intimidation** — planted-idle exclusive, intermittent localized
  forks, oppressive stillness. This is a structured radial charged-attack ignition;
  it never fires during AFK and reuses none of the AFK arc placements.
- **Old charge / charge-ready auras** — retired at these seams; this is drawn pixel
  geometry, not a recolored or enlarged alpha cloud.
- **Laser** — untouched and unrelated; no beam is created here.

## 11. Invariants (unchanged law)

- **Visual-only.** No gameplay, timing, hitbox, damage, charge-duration,
  charge-classification, hover, dive, movement, AI, collision or scale changes.
  Effect frames are RENDER-ONLY overlays — never Hitboxes, never in
  `getActiveHitboxes()`.
- Port method: `SpriteManager` static (hard `fillRect` cells, per the RE-3
  `drawGroundEclipse` pattern), drawn from `Player.draw` around the seams in §5.
- `src/` untouched by this stage; Walk Red Eclipse, Ground Charged Red Eclipse, AFK
  intimidation, Hero, throne room and packaging all untouched.

## 12. Package contents

| file | contents |
|------|----------|
| `red_eclipse_air_v1.png` | production sheet: palette law, 8 labeled phase frames, outward-proof notes, ignition-anchor map + 2X ray/bolt anatomy zooms, charge-ready hold loop + lifecycle timeline, release-into-dive strip (with existing-dive mock), 3-row tier ladder, air-vs-ground opposites band, airborne true-scale tableau, full 1280x720 actual-scale mock, handoff notes |
| `red_eclipse_air_gen.js` | editable generator (frames, tiers, sheet, literal) with baked assertions: palette/size legality, RE-0 byte-exactness (8/8), per-tier gather-then-outward monotonicity, C4 hold stability, S-ray reach + dominance, corona void-disc core, literal round-trip |
| `red_eclipse_air_literal.txt` | drop-in data: `eclipseAir` / `eclipseAirLite` / `eclipseAirPerf` (8 frames back/front each), `eclipseAirBody` (8 pre-treated 46x48 body frames) |
| `red_eclipse_air_spec.md` | this document |
