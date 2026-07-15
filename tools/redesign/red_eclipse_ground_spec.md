# Red Eclipse — Ground Charged Inhale (Stage RE-2 handoff)

Production sheet: `red_eclipse_ground_v1.png` (generator `red_eclipse_ground_gen.js`,
data `red_eclipse_ground_literal.txt`).
**STATUS: HANDOFF PACKAGE, pending approval. Nothing wired into `src/`.**

This is the dedicated extraction of the approved **RE-0 Family B "INHALE ECLIPSE"**
(`eclipse_gen.js` / `eclipse_spec.md`) for the Boss's **ground charged attack**. The
normal-tier effect grids are **byte-exact to `eclipseInhale` in `eclipse_literal.txt`**
(asserted by the generator on every run) — this package extracts and productionizes the
approved direction; it does not reinterpret it.

Core visual idea: an **IMPLOSION**. reref1's radial starburst structure (strong central
alignment, long pointed radial blades, broken ring fragments, electrical branching)
translated into the boss's black-red pixel language and **run in reverse**: power forms
OUTSIDE the Boss, travels INWARD along fixed lanes, and compresses into the red chest
core. `OUTSIDE -> INWARD -> CHEST CORE`, never an outward explosion.

Strict pixel art: hard cells, boss palette keys only (`0-5 a b c d g h`), no blur, no
gradients, no glow clouds, no new colors. Arc anatomy = the approved void-fracture
language (`0` crack-sheath / `c` filament / `d` hot kinks / `b` branches / `a` tips /
`g`+`1` sinking ash); the AFK arcs themselves stay AFK-only.

---

## 1. Geometry & anchors

- Effect key-grids **84x62** per frame, split `back` (drawn BEHIND the sprite) +
  `front` (drawn OVER it), plus a pre-treated 46x48 `body` re-skin per frame.
- Boss `groundCharge` pose (46x48) sits at grid **(19,14)**; feet rows **60-61**;
  floor row **60**.
- **Chest-core target anchor: grid (39,29)** = pose chest **(20,15)** — the red chest
  core. This is also the height the live grounded laser gathers at (the `drawWandGlow`
  muzzle / `_chestY` in `Player.draw`), so the implosion lands exactly where the beam
  will be born. Never the sword tip, feet, floor, or head.
- Authored facing RIGHT; runtime mirrors with the existing aimDir flip (the whole
  84x62 grid mirrors around the boss origin — radial geometry is flip-safe).
- On screen at BOSS_IDLE_PIXEL (3): **252x186 px** on the 1280x720 view (<20% of the
  screen width). The sheet is rendered at this actual scale (1 cell = 3 px).

## 2. Animation phases (frame counts + suggested holds @60fps)

| frame | phase | RE-2 phase name | hold | what happens |
|-------|-------|-----------------|------|--------------|
| B0 | VEIL-A | 1 — Outer formation / summon | 8 | half the shard ring materializes far out (r≈28); far floor embers wake; the Boss is calm |
| B1 | VEIL-B | 1 — Outer formation / summon | 8 | the broken ring completes (r≈27) + first inward pressure ticks; floor skitters ignite; body takes one dark step |
| B2 | INHALE-A | 2 — Inward convergence | 6 | ring collapses to r≈19; 3-cell tails trail OUTWARD behind every head; floor arcs crawl in |
| B3 | INHALE-B | 2 — Inward convergence | 6 | r≈12 + 4 feed filaments; convergence rides the FRONT grid (visibly crosses the silhouette); chest kernel lights |
| B4 | CRUSH | 3 — Core compression | 6 | 6 hot filaments + broken-octagon pressure ring (r9) snap on; shard heads dropped (they landed); feet arcs fracture; chest core at full pulse |
| B5 | BRIM-A | 4 — Charged hold | 8 | ring holds, bright heartbeat, late stragglers still falling in |
| B6 | BRIM-B | 4 — Charged hold | 8 | ring rotates a half-slot (0→22°), heartbeat dims, other straggler lanes |
| R0 | SNAP | 5 — Release handoff (optional) | 4 | ring dies to ash one frame behind; last energy snaps into the muzzle point on the beam axis |

- **B5 ↔ B6 pingpong** until release or cancel. The loop is seamless in both
  directions; no bridge frame is needed. Straggler lanes alternate between the two
  frames so the inward feed never reads as stopped.
- Holds are **visual suggestions only** — the gameplay charge clock owns all timing.
  A longer charge loops the brim; a shorter one cuts straight to release. If the charge
  ends before B4, jump to release/cancel cleanup immediately (legal cut).
- Body re-skin per frame (pre-baked in the literal, shared by all tiers):
  B0 raw pose → B1-B2 `darkenStep` → B3-B6 + R0 `eclipseSkin` (near-void body, broken
  ember rim, molten blade memory) + chest-core pulse (level 1 → 2 → 2 → 0 heartbeat).

## 3. Outer-to-inner motion rules (the inward contract)

Every frame must obey all four cues so no still can be misread as an explosion:

1. **Radius only shrinks.** Mean hot-cell radius across B1→B4: 31.0 → 28.9 → 16.2 →
   10.4 (normal; monotonic in every tier). Baked as a generator assertion.
2. **Heads hot inside, tails dark outside.** Shard heads are `b/c/d` on the
   core-facing side; tails fade `a → g → 0` outward, so motion vectors point at the
   chest even in a freeze-frame.
3. **Floor arcs only crawl inward** along row 60 toward his feet; the perimeter
   empties as the center densifies.
4. **The 9 spoke angles are FIXED for the whole clip** (-90/-122/-152/180/-58/-28/0/
   24/156°, per-spoke radius jitter only). The same lanes carry only inward traffic.

From B3 on, the convergence rides the FRONT grid so the pull visibly crosses the
silhouette (down-lanes were fully occluded on the back grid; RE-0 lesson). Front-grid
filaments are ember-only (`noVoid`) so the `0` sheath never bites holes in the body.

## 4. Release handoff (Phase 5, optional)

Integration seam: **the `drawWandGlow` seam in `Player.draw`** while
`_chargeType === 'GROUND_LASER'`. This effect replaces the gather visual at that seam;
**`drawLaserBeam` — the fired laser — is untouched**, as are charge duration, damage
and hitboxes.

At fire: play **R0 SNAP** for ~4 ticks — the brim octagon dies to sinking ash ONE
frame behind (family law: nothing may linger) while a tight hot cluster + a short
forward step of cells (`d → c → b` toward +x) hands the energy to the muzzle point at
chest height. Then the existing laser fires exactly as it does today. The laser cell
on the sheet is an **illustration only** and is not part of this effect's data.

R0 is optional: shipping without it (brim → laser directly) is acceptable; with it,
the handoff reads causal (the ring becomes the beam).

## 5. Quality tiers (reductions of the same design — never a different effect)

All three tiers are baked as data in the literal; the inward proof (rule 1 above) is
asserted per tier.

| tier | key | reduction |
|------|-----|-----------|
| normal | `eclipseGround` | full design — 9-spoke ring, 3-cell tails, 4→6 feed filaments, brim stragglers; byte-exact RE-0 Family B data |
| lite | `eclipseGroundLite` | shard counts halved (5 spokes: B0 3, B1-B3 5), tails 2 cells, brim stragglers dropped; filament counts, pressure ring, floor arcs and heartbeat unchanged |
| performance | `eclipseGroundPerf` | ring + filaments + floor arcs only — 5-spoke shards with 1-cell tails, no pressure ticks, filaments B3 2 / B4 4, no stragglers; still unmistakably inward, never a generic fallback |

`eclipseGroundRelease` (R0) and `eclipseGroundBody` (8 pre-treated bodies) are shared
by all tiers.

## 6. Readability contract

- Boss silhouette and sword stay readable inside the effect (body re-skin keeps the
  full contour; front-grid cells are sparse filaments/ring, never a filled mass).
- The red chest core is the brightest, most persistent element from B3 on — the
  unmistakable focal point.
- 252x186 px on a 1280x720 view: the effect never approaches screen coverage; the
  throne room stays legible behind it (see the actual-scale band on the sheet).
- Verified on the sheet at true gameplay scale (whole sheet at 1 cell = 3 px, plus a
  full-viewport 100% mock with true-scale hero).

## 7. Family distinctness (never mix)

- **Walk stride eclipse** — locomotion manifestation riding the body; arcs never
  leave the silhouette. This ground effect is a deliberate stationary absorption.
- **Air ignition eclipse** — outward starburst detonation; this is its exact inverse.
- **AFK intimidation** — planted-idle exclusive; no curse vignette, no barrier
  language here. This is a charged-attack effect, not an intimidation state.
- **Old charge aura** — retired at this seam; this is drawn pixel geometry, not a
  recolored/enlarged alpha cloud.

## 8. Cleanup rules

- Cancel (charge interrupted, stagger, death, restart, scene reset): **clear all
  effect cells the same frame; body re-skin resolves back to the live sprite next
  frame.** No orphan cells, no outward debris, no lingering ash. A hard cut to
  nothing is legal at any frame.
- All lifecycle ends route through the existing charge-cancel path — the effect has
  no clock of its own beyond the charge state that drives it.
- Never draw during AFK (charge and AFK are already mutually exclusive states).

## 9. Invariants (unchanged law)

- **Visual-only.** No gameplay, timing, hitbox, damage, charge-duration, laser-logic,
  movement, AI, collision or scale changes. Effect frames are RENDER-ONLY overlays —
  never Hitboxes, never in `getActiveHitboxes()`.
- Port method: `SpriteManager` static (hard `fillRect` cells, per the afk2/boss-VFX
  port method), drawn from `Player.draw` around the seam in §4.
- `src/` untouched by this stage; walk surge, air charge visuals and AFK intimidation
  untouched.

## 10. Package contents

| file | contents |
|------|----------|
| `red_eclipse_ground_v1.png` | production sheet: palette law, 7 labeled phase frames + motion map, inward-proof notes, convergence-target map + 2X anatomy zooms, charged-hold loop + lifecycle timeline, release-handoff strip, 3-row tier ladder, family contract, true-scale tableau, full 1280x720 actual-scale mock, handoff notes |
| `red_eclipse_ground_gen.js` | editable generator (frames, tiers, sheet, literal) with baked assertions: palette/size legality, RE-0 byte-exactness, per-tier inward monotonicity, chest-core convergence, literal round-trip |
| `red_eclipse_ground_literal.txt` | drop-in data: `eclipseGround` / `eclipseGroundLite` / `eclipseGroundPerf` (7 frames back/front each), `eclipseGroundRelease` (R0), `eclipseGroundBody` (8 pre-treated 46x48 body frames) |
| `red_eclipse_ground_spec.md` | this document |
