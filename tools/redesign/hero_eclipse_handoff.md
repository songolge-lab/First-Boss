# Stage 8B-2 — HERO LIGHT ECLIPSE — HANDOFF PACKAGE

Extraction / packaging only. **Nothing here is integrated into the live game.**
`src/`, gameplay, hitboxes, timings, damage, AI and the boss Red Eclipse overlays
are untouched. This document packages the **APPROVED Stage 8B-0** Hero Light
Eclipse family (`hero_eclipse_v1.png`) into a drop-in-ready set for a LATER wiring
stage (8B-3).

---

## 1. The named family (this is the point of this document)

> ## **HERO LIGHT ECLIPSE**
> ### *A **WHITE disc** inside a **GOLD corona**.*
> Where the Boss carries a **void disc in a hot ember corona**, the Hero carries a
> **light eclipse**. Holy / solar / luminous — clean and dangerous, never soft,
> never fiery. **The Boss's ash SINKS. The Hero's motes RISE.**

**Hero Light Eclipse** is a **named, reusable VFX family**, exactly as **Red
Eclipse** is for the Boss ([[red-eclipse-render-only]]). It is not a one-off effect
set for one animation. Every future Hero light effect — combos, casts, parries,
projectiles, finishers, unlockable mechanics from the progression matrix — **composes
from these six families, plays the CYCLE grammar, and never invents a new ramp.**

When a future stage needs Hero light, the answer is always: *which Light Eclipse
part is this?* — never *what new effect should I draw?*

### The five laws (never break these)

1. **WHITE + GOLD only. ZERO BLUE, ever.** The hero's own cold-blue accents (visor /
   sigil / blade glow) are the **character**, not the effect. They stay; the effect
   family never contains them.
2. **True circles.** The Hero owns sacred geometry. The Boss owns broken octagons.
   **Never bolts** — the Boss shatters into jagged bolts; the Hero's rays peel into motes.
3. **Light RISES.** Motes lift and wink out. Light never ashes, never sinks, never smokes.
4. **North dominates.** The longest ray points up (ascension) — the exact inverse of
   the Boss's south-dominant dive ray.
5. **Strict pixel art.** Hard cells. No blur, no gradients, no glow clouds, no alpha
   washes, no `shadowBlur`. (The v1/v2 hero VFX were rejected for exactly this.)

### Distinctness contract — the mirror must stay pure

| | BOSS Red Eclipse | HERO Light Eclipse |
|---|---|---|
| core | void disc in a hot corona | **white disc in a gold corona** |
| geometry | broken octagon — never a circle | **true circles / halos** |
| rays | straight crystalline, **S-ray longest** (dive) | straight tapered, **N-ray longest** (ascension) |
| decay | shatters into jagged bolts | **never bolts** — rays peel into motes |
| exit | ash **SINKS** | motes **RISE** and wink out |
| body skin | `eclipseSkin` — near-void + ember rim | **`radiantSkin`** — one ramp step brighter + broken gold rim |

`radiantSkin` is the **exact inverse** of `eclipseSkin`: the Boss goes void, the
Hero goes radiant.

---

## 2. Palette law (locked)

| key | hex | role |
|-----|-----|------|
| `W` | `#fffdf4` | white core, glints, ray hearts |
| `I` | `#f2e6bf` | ivory transitions, rising motes |
| `y` | `#f2c94e` | radiant gold — corona ring, ray body, halo |
| `o` | `#e0a93c` | warm gold — ray outer, trailing rims, teeth |
| `G` | `#c9962e` | deep gold — tips, rim winks (**== the hero sprite's own gold key `g`**) |
| `u` | `#8a6420` | bronze — dissolve motes, rare dark edge (**== throne-room gold-dark**) |

- **Warm law (validated):** every step satisfies `R >= G >= B` — **blue literally
  cannot exist in the ramp.**
- The deep end anchors to golds **already living in the game** (hero gold key, throne
  gold), so the family is native, not imported.
- **Zero key collisions** with `HERO_REDESIGN_PALETTE` (`. 0-5 n m l L g`) — validated.
  `G` deliberately shares the hero gold value.

---

## 3. File manifest

| file (tools/redesign/) | role |
|------------------------|------|
| `hero_eclipse_v1.png`        | the approved production sheet — the visual source of truth |
| `hero_eclipse_gen.js`        | deterministic generator (bakes the design asserts; throws on violation) |
| `hero_eclipse_literal.txt`   | the approved drop-in grid data: 6 families, 22 effect grids + 3 bodyflare sets |
| `hero_eclipse_spec.md`       | the 8B-0 design spec |
| `hero_light_eclipse_dropin.mjs` | **NEW (8B-2)** the same data as an importable ES module + locked palette, anchors, holds |
| `hero_dropin_extract.js`     | **NEW (8B-2)** the extractor that emits the drop-in module from the literal |
| `hero_eclipse_validate.js`   | **NEW (8B-2)** standalone validator — reads the ARTIFACTS, re-proves every family law |
| `hero_eclipse_handoff.md`    | **NEW (8B-2)** this package index + implementation contract |

```
node hero_dropin_extract.js      # re-emit the drop-in modules from the approved literals
node hero_eclipse_validate.js    # exit 0 = ALL PASSED (26 checks)
```

---

## 4. The six families — parts, anchors, layer order

Exported from `hero_light_eclipse_dropin.mjs` as `LIGHT_ECLIPSE_GRIDS`
(+ `LIGHT_ECLIPSE_BODY_FLARE`), with `LIGHT_ECLIPSE_ANCHORS` and
`LIGHT_ECLIPSE_HOLDS` alongside.

| family | key | canvas | centre / anchor | cells | holds (@60fps) |
|--------|-----|--------|-----------------|-------|----------------|
| **EMBLEM** | `lightEmblem` | 41×41 | (20,20) | 1 | — (flash) |
| **EMBLEM micro** | `lightEmblemMicro` | 13×13 | (6,6) | 1 | — |
| **HALO** | `lightHalo` | 33×33 | (16,16) | 3 | 4 / 5 / 6 (H2 loops) |
| **GROUND HALO** | `lightGroundHalo` | 41×13 | (20,6) — **cy sits ON the floor line** | 2 | 4 / 4 |
| **SLASH** | `lightSlash` | 37×37 | (18,18) — **authored travelling RIGHT** | 4 | 3 / 3 / **6 (HIT — HOLD)** / 3 |
| **IMPACT** | `lightImpact` | 21×21 | (10,10) — **sits at the strike contact point** | 3 | 2 / 4 / 3 |
| **CYCLE** | `lightCycle` | 45×45 | (22,22) | 8 | 6/6/4/5/5/4/5/6 |
| **BODY FLARE** | `lightBodyFlare` | 48×36 (+30×24 body) | hero origin (9,8); **chest core (22,18)**; **feet row 31** | 3 × {back, front, body} | — |

### Part anatomy

- **EMBLEM** — the core motif. White core disc r3 → ivory separation ring r4.5 →
  gold corona ring r6 → 4 long cardinal rays (3px base tapering to 1px, ramp
  `W I y o G`, detached white tips) → 4 short diagonal rays (`y o G`) → broken outer
  dash halo r19 → 4 cross-sparks. **Perfectly h-symmetric (validated).** The **micro
  glyph** compresses the same language to 13×13 for tiny accents (projectile cores,
  charge pips). **Escalation ladder: micro glyph → impact star → full emblem — the
  same shape at three weights. Pick by moment weight.**
- **HALO** — `H0 SNAP` (tight bright ring r8, white cardinal nodes, N/S snap ticks) →
  `H1 SETTLE` (rests at r10, underside warms to `o`) → `H2 SHIMMER` (breaks into
  marching `y`/`o` dashes, nodes wink, motes rise — **loop**).
- **GROUND HALO** — flat ellipse ring (rx18 ry4) + inner ivory dash ellipse + white
  front/back nodes; 2 cells march the dashes. Sits **under the feet, ON the floor
  line** — cast / charge / blessing moments.
- **SLASH** — per row: leading edge `W` / body `I` / inner edge `y` / belly trailing
  rim `o` / sparse `G` breakup. Rhythm: `S0 GLINT` (anticipation) → `S1 SHEAR` →
  **`S2 HIT` — HOLD for impact** → `S3 FOLLOW` (breaks into one-step-dimmer bands,
  motes rise). Runtime mirrors with the existing `facing` flip.
- **IMPACT** — compact 4-point star. `P0 FLASH` → `P1 STAR` (4-point star + broken
  ring + diagonal teeth) → `P2 SPARK-OUT` (tips drift out, sparks rise). Sits at the
  contact point of any strike; **scales by pixel size, not by new art.**
- **CYCLE — the family grammar. Every use of the Light Eclipse plays this rhythm:**
  **GATHER** (motes converge on fixed spokes, ring contracts — validated mean radius
  15.0 → 9.3 → 3.6) → **IGNITE** (white kernel + ray stubs) → **RELEASE** (the full
  eclipse bursts open; `R0`↔`R1` shimmer **loop while held**) → **DISSOLVE** (rays
  peel off and detach, fragments become motes that **RISE** and wink out — validated
  lit 59 → 24 → 7 with rising mean-Y).
- **BODY FLARE** — `BF0 GATHER` (light drawn to the chest sigil) → `BF1 PEAK` (halo
  ring r13 + white chest core + **north-dominant rays** + ground sparkle at the feet)
  → `BF2 RISE` (ring fragments and motes lift off the crown).

### Anchors, mirroring, layer order

- **`lightBodyFlare` self-anchors.** Grid centre col == hero centre col, so the
  **existing `facing`/`aimDir` full-sprite mirror anchors the whole effect with zero
  extra math** — the same scheme as the boss RE families. Do not hand-roll a mirror.
- **Layer order:** `back` (BEHIND the sprite) → **hero body** (`body` = the radiant
  re-skin, drawn in place of the normal sprite) → `front` (OVER it).
- **`body` is a palette-only re-skin.** One ramp step brighter, the hero's own `l → L`
  pulse, broken gold rim via the hero's own `g` key. **HERO keys only, and the
  non-empty mask is byte-identical to `hero_matrix.txt` (validated) — geometry can
  never desync from the character.**
- **Floor:** `back` never below row 32, `front` never below row 33 (the `BF1` ground
  sparkle legally sits at rows 32–33, ON the floor).
- **On-screen scale** at the hero 2px grid: emblem 82px, halo 66px, slash 74px,
  impact 42px, cycle 90px, ground halo 82×26px, bodyflare 96×72px around the 60×48px hero.

---

## 5. Validation results (`node hero_eclipse_validate.js` → exit 0, ALL PASSED)

26/26 checks pass against the ARTIFACTS:

- **EXTRACT** — `hero_light_eclipse_dropin.mjs` is cell-for-cell identical to the
  approved literal: **41,710 cells, 0 diffs**; drop-in ramp == the locked 8B-0 palette.
- **FAMILY/DIMS** — all 6 families present with approved counts; 22/22 grids match
  their declared canvas.
- **PALETTE** — warm law R≥G≥B on all 6 steps — blue cannot exist.
- **NOBLUE** — **all 22 effect grids are LIGHT-keys-only: zero blue, zero hero keys.**
  The character's cold accents cannot leak into the effect family.
- **EMBLEM** — perfect h-symmetry across all 41 rows; core cell (20,20) is white;
  white/ivory 37% (≥20%) + gold 63% (≥40%) — the white-disc-in-gold-corona read;
  micro glyph keeps the symmetry at 13×13.
- **CIRCLE** — **214/214 halo cells sit on true radii** — sacred geometry intact,
  the distinctness contract vs the boss's broken octagons holds.
- **IMPACT** — P1 STAR reaches 9 cells from centre (≥7) — reads at 2px scale.
- **CYCLE** — gather contracts (15.0 → 9.3 → 3.6); release expands (10.3 > 1.6× ignite);
  dissolve thins (59 → 24 → 7); **motes RISE** (mean-Y 21.2 → 17.3 → 8.7).
- **BFMASK** — 3/3 radiant re-skins mask-identical to `hero_matrix.txt`.
- **BFKEYS** — bodyflare bodies use HERO keys only (0 foreign cells).
- **BFNORTH** — BF1 PEAK is north-dominant: 18 up vs 14 down — **light rises**.
- **BFFLOOR** — nothing spills below the floor.

Also confirmed: `hero_eclipse_gen.js` re-emits `hero_eclipse_literal.txt` **and**
`hero_eclipse_v1.png` **byte-identical** (deterministic), and its own baked asserts
pass. `node --check` clean on every 8B-2 script.

---

## 6. Reuse map — where each part enters

| moment | parts |
|--------|-------|
| **Sword combos** *(8B-1, ready — see [hero_combo_handoff.md](hero_combo_handoff.md))* | SLASH + IMPACT at contact; S2 holds |
| **Charged moments** | CYCLE gather/ignite + GROUND HALO underfoot + BODY FLARE peak as the "ready" loop (`R0`↔`R1` / `BF1`) |
| **Finisher accents** | full EMBLEM flash + HALO `H0` snap + a scaled-up IMPACT star |
| **Parry / riposte** | HALO `H0` snap is a natural parry ring; cross-sparks on the counter |
| **Ranged / thrown light** | the MICRO glyph as the projectile core, ray tips as its trail |
| **Future powers** | compose from the same six families; always play the CYCLE grammar; **never invent a new ramp** |

The progression matrix's later Hero unlocks (`invuln_shield` enc 12, `ranged_projectile`
enc 20, `multishot` enc 23, `enrage` enc 27, `apex_predator` enc 30) are all natural
consumers: shield → HALO + BODY FLARE; projectiles → MICRO glyph; enrage → BODY FLARE
peak held; apex homing trails → ray tips.

---

## 7. Integration map (for the LATER wiring stage — DO NOT do it now)

Natural seams in [Enemy.js](../../src/entities/Enemy.js) `draw`:

| seam | part |
|------|------|
| melee ACTIVE frames ([Enemy.js:1405](../../src/entities/Enemy.js#L1405)) | SLASH — **but the 8B-1 combo bakes its own trails; see the combo handoff §9.2** |
| `cast` / `CASTING` | CYCLE + GROUND HALO |
| `parry` / `parry_counter` | HALO `H0` snap |
| strike contact | IMPACT |
| charged / empowered states (e.g. `enrage`) | BODY FLARE |

- Port as `SpriteManager` statics using hard `fillRect` cells. **The v3/v4 lesson:
  never repaint the smooth-curve + `shadowBlur` path — that is exactly what got the
  hero VFX v1/v2 rejected.**
- The current live hero VFX is the blue "cold sanctity" v4 set
  (`drawHolySlash`, [SpriteManager.js:1230](../../src/core/SpriteManager.js#L1230)).
  **The Light Eclipse supersedes it at the hero-attack seams when the combo lands.**
- **RENDER-ONLY LAW:** effect grids are overlays — **never** hitboxes, never in
  `getActiveHitboxes()`; no gameplay / timing / AI / physics changes.

### Tiering
normal = everything; lite = drop sparkle breakup + halve motes + drop the outer dash
halo; performance = core disc + corona + cardinal rays + single ring only.
**The white-disc-in-gold-corona read survives every tier.**

---

## 8. Implementation risks for Stage 8B-3

1. **Blue leaking into the family (identity risk #1).** The hero's blues are the
   character; the effects are white+gold. Any tint, blend or reuse of the existing
   blue `drawHolySlash` path under a Light Eclipse grid **kills the mirror**.
   Validated clean in the data — keep it clean in the painters.
2. **`shadowBlur` / smooth curves.** The single most-repeated rejection in this
   project's history. Hard `fillRect` cells only.
3. **Body flare mirror.** `lightBodyFlare` self-anchors via the existing full-sprite
   flip because its centre col == the hero centre col. Hand-rolling a midline mirror
   will shift it off the chest core in left-facing. (Same trap as the boss
   `comboDetonation` CX=38 lesson.)
4. **Ground halo floor-pinning.** `cy` (row 6) must land on the arena floor line, not
   the grid's own bottom, or the ellipse floats or clips.
5. **Cycle indexing.** `R0`↔`R1` **loops while held** — a naive linear playthrough
   ends the "ready" state early and the charge reads as finished before it is.
6. **Superseding the live v4 blue VFX.** Landing Light Eclipse at a seam without
   retiring the blue slash there **double-draws two different families at once** —
   visually incoherent, and it breaks law #1 by putting blue back into the moment.
7. **Boss/Hero family blur.** Circles vs octagons, rise vs sink. If a future stage
   reaches for a bolt or sinking ash on the Hero, it is reaching for the **wrong
   family** ([[hero-light-eclipse]], [[red-eclipse-render-only]]).

---

## 9. Recommended integration order

1. **The 8B-1 combo package first** ([hero_combo_handoff.md](hero_combo_handoff.md)
   §10) — it carries its own baked Light Eclipse and needs **no** new painters, so it
   proves the palette merge and the family's on-screen read at zero painter risk.
2. **Then IMPACT at strike contact** — the smallest standalone painter, one seam,
   render-only, trivially revertible.
3. **Then HALO at parry / GROUND HALO + CYCLE at cast** — each is one seam, each
   supersedes a live blue v4 effect, so retire the blue in the same pass (risk 6).
4. **BODY FLARE last** — the heaviest visual, the mirror/anchor risk (risk 3), and it
   needs a charged/empowered state to hang on. Land it where it can be validated in
   isolation.

Rationale: each step is independently verifiable in-game, and the ordering front-loads
the zero-painter swap while isolating the anchor-sensitive work into its own pass.
