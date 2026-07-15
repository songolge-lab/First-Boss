# Red Eclipse System — boss-only VFX production sheet (concept hand-off)

Concept sheet: `eclipse_v1.png` (generator `eclipse_gen.js`, data `eclipse_literal.txt`).
**STATUS: CONCEPT, pending approval. Nothing wired into `src/`.**

Three boss-only red-eclipse animation families. All strict pixel art: hard cells,
boss palette keys only (`0-5 a b c d g h`), no blur, no gradients, no glow clouds,
no new colors. Shared arc anatomy = the approved afk2 void-fracture language
(VOID `0` crack-sheath / `c` filament / `d` hot kinks / `b` branches / `a` tips /
`g`+`1` sinking ash), but **the AFK arcs themselves stay AFK-only** — these three
families never reuse them at runtime and never overlap the AFK state.

Shared body language: `darkenStep` (one ramp step toward the eclipse) for entry/
exit frames, `eclipseSkin` (near-void body + BROKEN ember rim with `h`/`c` winks,
density driven by a rim envelope; molten blade keeps a graded `b`/`c` ember memory
on `hot` frames) for the flare core. This is the same silhouette form the live
surge uses — refined, not replaced.

---

## FAMILY A — STRIDE ECLIPSE (walk trigger, refinement of the live surge)

Same identity, same walk poses, same wiring. The 6f forward / 4f backward clips in
`eclipse_literal.txt` are **index-locked 46x48 drop-ins that REPLACE the frame data
of `surgeForward` / `surgeBackward`** in `BOSS_REDESIGN_SPRITES` (key names kept).
The 2.5s scheduler, direction pick, interrupt-reset and index-lock from 7B-3/7B-4
are all unchanged — this is frame data only.

Refinements vs the live surge (sheet band A, "REFINED VS LIVE SURGE"):

1. **Rim envelope** — broken-rim ember density ramps 0 → peak → 0 across the clip
   (fwd: .0/.8/1.0/.85/.55/0, bwd: 0/1.0/.7/0) instead of constant per-frame noise.
2. **One arc packet** — the lightning reads as a single energy packet traveling
   station to station; the abandoned segment dies to ash ONE frame behind the live
   arc (no more permanent re-jitter everywhere).
3. **Omen pre-glints** — F0/B0 announce the event (facing-contour glints fwd,
   faint crown-halo ticks bwd).
4. **Ember memory** — the exit frame leaves 3 dim `b` cells cooling on the blade.

| clip | frame | phase | hold @60fps |
|------|-------|-------|-------------|
| surgeForward (6f, ~1s) | F0 | OMEN — dark step + chest ignite + pre-glints | 10 |
| | F1 | FLARE — packet chest → rear fist (branch) | 10 |
| | F2 | FLARE-PEAK — packet fist → trailing blade; chest ashes | 10 |
| | F3 | FLARE — packet blade → ground skitter BEHIND him | 10 |
| | F4 | FRACTURE — blade + ground arcs break into runs | 10 |
| | F5 | ASHFALL — ash sinks, blade ember memory, dark step out | 10 |
| surgeBackward (4f, ~1s) | B0 | OMEN — dark step + crown ignite + halo hints | 15 |
| | B1 | FLARE-PEAK — crown arc + one arc per shoulder + regal halo | 15 |
| | B2 | FRACTURE — spine crawl + trailing tear-off; crown/shoulders break | 15 |
| | B3 | ASHFALL — ash sinks off spine + shoulders, halo fades | 15 |

Placement law (kept from 7B-0R): **fwd = low / weapon-line** (chest, rear arm,
trailing blade, ground), **bwd = high / crown-spine** (crown, shoulders, spine,
up-back tear-off). The two variants are siblings, never twins.

**ONE-SHOT (sheet strip):** once triggered the flare plays through all frames and
never re-triggers mid-flare. The only thing that can end it early is a state break
(attack/dash/jump/charge/hit-stagger/direction flip) — and that is a clean CUT TO
ASH: bolts are baked into the frames, so nothing can linger. Never fires during AFK
(scheduler eligibility already guarantees this).

## FAMILY B — INHALE ECLIPSE (ground charged attack, IMPLOSION)

NEW. Effect key-grids `84x62` (`eclipseInhale` in the literal, `back`+`front` per
frame). Anchors: boss `groundCharge` pose origin at grid **(19,14)**, chest core at
**(39,29)**, floor row **60**. `back` draws BEHIND the sprite, `front` OVER it; the
per-frame body re-skin is the shared `darkenStep`/`eclipseSkin` + a baked chest-core
pulse. Everything anchors to the boss's position; author-space faces right, runtime
mirrors with the existing aimDir flip.

Signature motion — **everything travels INWARD along FIXED spokes** (9 angles, held
across the whole clip) with a monotonically shrinking radius; heads are hot (`b→c→d`),
tails trail OUTWARD (`a→g→0`) so every still frame reads as inward flight. Floor arcs
skitter inward along row 60 toward his feet. Validated in the generator: mean hot-cell
radius 31.0 → 28.9 → 16.2 → 10.4 across B1→B4.

| frame | phase | hold @60fps | notes |
|-------|-------|-------------|-------|
| B0 | VEIL-A | 8 | half the shard ring materializes far out (r≈28); far floor embers |
| B1 | VEIL-B | 8 | ring completes + first inward pressure ticks; floor ignites |
| B2 | INHALE-A | 6 | ring collapses to r≈19, 3-cell outward tails; floor arcs crawl in |
| B3 | INHALE-B | 6 | r≈12 + 4 feed filaments; convergence rides the FRONT grid from here (visibly crosses the silhouette); chest kernel lights |
| B4 | CRUSH | 6 | 6 hot filaments + pressure ring (broken octagon r9) snap on; feet arcs fracture; shard heads dropped (they landed) |
| B5 | BRIM-A | 8 | ready loop: ring holds, bright heartbeat, late stragglers still falling in |
| B6 | BRIM-B | 8 | ring rotates a half-slot, heartbeat dims, other stragglers |

B5↔B6 loop until release. Lifecycle maps to the charge: VEIL+INHALE+CRUSH ≈ the 1s
charge-up, BRIM = the held/ready state. Integration seam: this becomes the ground
charge gather visual at the **`drawWandGlow` seam** in `Player.draw`
(`_chargeType === 'GROUND_LASER'`); `drawLaserBeam` (the fired laser) is untouched.

## FAMILY C — IGNITION ECLIPSE (air charged attack, OUTWARD starburst)

NEW, the flagship. Effect key-grids `100x88` (`eclipseIgnition`, `back`+`front`).
Anchors: boss `airCharge` pose origin at grid **(27,14)**, chest core at **(47,29)**.
No floor in-frame (airborne). reref1 translated into the eclipse identity:

- **Core = a literal red eclipse**: umbral VOID disc inside a hot `d` corona ring +
  `c` halo (front overlay at the chest) — the reference's white flash, inverted into
  our dark identity. Never a filled bright blob.
- **Long pointed rays are STRAIGHT and crystalline** (`d→c→b→a` ramp, `0` void
  flanks near the core, taper to 1px, detached `d` tip glints) — that is family C's
  signature; jagged bolts only appear at decay. The **south ray is the longest
  (~2.2x) and aims at the ground** — the air charge's threat axis (the dive).
- **Ring geometry = BROKEN octagon fragments** (`a`/`g`, edges only, split at the
  rays) + detached outer `0`/`g` dash ring — angular eclipse geometry, deliberately
  never a circle, never a rune circle.
- **Crystal shard scatter** between rays, flying outward (tails point at the core).

| frame | phase | hold @60fps | notes |
|-------|-------|-------------|-------|
| C0 | KERNEL | 6 | void kernel at the chest, 4 tiny in-ticks, close shards drift IN (short + tight — NOT family B's big ring) |
| C1 | CONDENSE | 6 | kernel goes hot, N-S pre-stubs — the star about to be born |
| C2 | IGNITE | 4 | rays burst to 55%, faint octagon, shards begin flying OUT |
| C3 | CORONA | 5 | the reref1 frame: full rays + octagon + outer dashes + corona core + tip glints; body = pure eclipse silhouette inside it |
| C4 | SHIMMER | 5 | held peak: minor rays rotate a slot, shards push out, corona pulses |
| C5 | SHATTER | 5 | rays BREAK into black-red bolts (N+S still flash hot, E+W fractured, 2 diagonals tear off whole); octagon cracks; one bolt crawls OFF the body (front) |
| C6 | BOLTFALL | 6 | stray bolts + sinking ash slivers; core = ember memory |
| C7 | FADE | 8 | last ash sinks, single `a` wink, body resolves to normal |

Lifecycle maps to the charge: C0-C2 while holding (gather), C3↔C4 loop while
charge-ready, C5-C7 on release into the dive. Integration seams: replaces
**`drawChargedAirAura`** (gather/hold) and **`drawChargeReadyAura`** (peak loop) in
`Player.draw` (`_chargeType === 'AIR_DIVE'`); the release tail plays as the dive
begins (`_diveCharged`), then hands off to the existing dive/slam VFX.

## Family distinctness contract (sheet "CONTRACT" line + motion maps)

- **A** — arc packet traveling ON the body, riding the stride. Never leaves the
  silhouette + drag line.
- **B** — fixed spokes + shrinking radius + outward tails + floor skitters = an
  INHALE. Ground-anchored, converges INTO the boss.
- **C** — straight crystalline rays OUT + corona eclipse core + bolt decay = a
  DETONATION. Airborne, radiates OUT of the boss. Exact inverse of B.
- AFK void-fracture arcs remain a fourth, AFK-exclusive signature (planted-idle
  only); none of these families fires during AFK.

## Tiering (suggested, same philosophy as prior stages)

- normal: everything.
- lite: B drops stragglers + halves shard counts; C drops minor inter-rays, outer
  dash ring and half the shards; A unchanged (it IS the boss sprite).
- performance: B = ring + filaments + floor arcs only; C = 4 cardinal rays + corona
  core + S-ray only; silhouettes and the in/out signatures survive every tier.

## Invariants (unchanged law)

- Visual-only: no gameplay, timing, hitbox, AI or physics changes. Effect frames are
  RENDER-ONLY overlays — never Hitboxes, never in `getActiveHitboxes()`.
- A's frames are drop-ins for the existing surge keys; B/C port as `SpriteManager`
  statics (hard `fillRect` cells, per the afk2/boss-VFX port method) drawn from
  `Player.draw` around the existing seams listed above.
- Palette law: boss keys only, as rendered; no blends, no shadowBlur, no gradients.
- On-screen scale: matrix cells render at BOSS_IDLE_PIXEL (3) like the sprite —
  B ≈ 252x186 px, C ≈ 300x264 px on screen.
