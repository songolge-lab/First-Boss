# Hero Light Eclipse — reusable white+gold VFX family (concept hand-off)

Concept sheet: `hero_eclipse_v1.png` (generator `hero_eclipse_gen.js`, data
`hero_eclipse_literal.txt`).
**STATUS: CONCEPT (Stage 8B-0), pending approval. Nothing wired into `src/`.**

The Hero's counterpart to the boss **Red Eclipse** system, and the visual language
the upcoming Hero direct-attack (sword combo) redesign will be built from. Strict
pixel art: hard cells, no blur, no gradients, no glow clouds, no alpha washes —
and **ZERO BLUE**. The read is white + gold: holy / solar / luminous, clean and
dangerous, never soft or fiery.

---

## Identity in one line

> Where the boss carries a **void disc inside a hot ember corona**, the Hero
> carries a **WHITE disc inside a GOLD corona** — a *light eclipse*.

Reference translation (heavily inspired, never copied): the sword-attack sheet
gave the slash rhythm (anticipation glint → shear → **held** hit → follow-through)
and the starburst hit accents; the glowing-blade knight references set the bar for
elegant blade glints and clean silhouettes; the luminous-figure reference drove the
radiant body re-skin. Everything is re-authored around **our** 30×24 Dawnguard
Knight and our palette law.

## Palette law (locked)

| key | hex | role |
|-----|-----|------|
| `W` | `#fffdf4` | white core, glints, ray hearts |
| `I` | `#f2e6bf` | ivory transitions, rising motes |
| `y` | `#f2c94e` | radiant gold — corona ring, ray body, halo |
| `o` | `#e0a93c` | warm gold — ray outer, trailing rims, teeth |
| `G` | `#c9962e` | deep gold — tips, rim winks (**== the hero sprite's own gold key `g`**) |
| `u` | `#8a6420` | bronze — dissolve motes, rare dark edge (**== throne-room gold-dark**) |

- **Warm law (asserted in the generator):** every step satisfies `R >= G >= B` —
  blue literally cannot exist in the ramp.
- The deep end anchors to golds already living in the game (hero gold key, throne
  gold), so the family is native, not imported.
- The hero's OWN cold-blue accents (visor / sigil / blade glow) are part of the
  character, not the effect — they stay. The character also keeps its
  "3 gold points" law; the effect family carries the rest of the gold.

## Distinctness contract (the mirror must stay pure)

| | BOSS Red Eclipse | HERO Light Eclipse |
|---|---|---|
| core | void disc in hot corona | **white disc in gold corona** |
| geometry | broken octagon — never a circle | **true circles / halos — sacred geometry** |
| rays | straight crystalline, S-ray longest (dive) | straight tapered, **N-ray longest (ascension)** |
| decay | shatters into jagged bolts | **never bolts** — rays peel into motes |
| exit | ash **sinks** | motes **RISE** and wink out — light never ashes |
| body skin | eclipseSkin — near-void + ember rim | **radiantSkin — one ramp step brighter + broken gold rim** |

## The families

### EMBLEM — the core motif (41×41, center 20,20; micro 13×13)
White core disc r3 → ivory separation ring r4.5 → gold corona ring r6 → 4 long
cardinal rays (3px base tapering to 1px, ramp `W I y o G`, detached white tips) →
4 short diagonal rays (`y o G`) → broken outer dash halo r19 → 4 cross-sparks +
ivory sparkle breakup. Perfectly h-symmetric (asserted). The **micro glyph**
compresses the same shape language to 13×13 for tiny accents (projectile cores,
charge pips). Escalation ladder: micro glyph → impact star → full emblem — same
shape at three weights.

### HALO — ring variant (33×33) + GROUND HALO (41×13)
- `H0 SNAP` — tight bright ring r8, white cardinal nodes, N/S snap ticks (hold 4)
- `H1 SETTLE` — ring rests at r10, underside warms to `o`, diagonal `G` drips (hold 5)
- `H2 SHIMMER` — ring breaks into marching `y`/`o` dashes, nodes wink, motes rise (loop 6)
- Ground halo: flat ellipse ring (rx18 ry4) with inner ivory dash ellipse and white
  front/back nodes; 2 frames march the dashes. Sits under the feet ON the floor
  line — cast / charge / blessing moments.
- Circle purity is asserted: every lit halo cell sits on a declared true radius.

### SLASH — sword-combo accent (37×37, authored traveling RIGHT)
Anatomy per row: leading edge `W` / body `I` / inner edge `y` / belly trailing rim
`o` / sparse `G` breakup. Rhythm (from the sword-attack reference, at 60fps):

| frame | phase | hold |
|-------|-------|------|
| S0 | GLINT — the raised edge catches the light (anticipation) | 3 |
| S1 | SHEAR — top 55% of the smear revealed, hot head | 3 |
| S2 | HIT — full crescent + contact spark + detached tip glints | **6 — HOLD for impact** |
| S3 | FOLLOW — smear breaks into one-step-dimmer bands, motes rise | 3 |

Runtime mirrors with the existing aimDir flip. This is the accent the Hero combo
redesign (next stage) will ride.

### IMPACT — compact 4-point star (21×21)
`P0 FLASH` white pop (2) → `P1 STAR` 4-point star + broken ring + diagonal teeth
(4) → `P2 SPARK-OUT` detached tips drift out, sparks rise (3). Sits at the contact
point of any strike; scales by pixel size, not by new art.

### CYCLE — the family grammar (45×45, 8 frames)
Every use of the Light Eclipse plays this rhythm:
**GATHER** (motes converge on fixed spokes, ring contracts — asserted meanR
15.0 → 9.3 → 3.6) → **IGNITE** (white kernel + ray stubs) → **RELEASE** (the full
eclipse bursts open; R0↔R1 shimmer loop while held) → **DISSOLVE** (rays peel off
and detach, fragments become motes that **RISE** and wink out — asserted lit-count
59 → 24 → 7 with rising mean-Y). Holds: G0 6 / G1 6 / I0 4 / R0 5 / R1 5 / D0 4 /
D1 5 / D2 6.

### BODYFLARE — body-centered eclipse on the real Hero (48×36 back/front + 30×24 body)
- Anchors: hero origin grid (9,8); chest core **(22,18)** == hero chest (13,10);
  feet row 31. Grid center col == hero center col, so the existing aimDir mirror
  **self-anchors** the whole effect (same scheme as the boss RE families).
- `back` draws BEHIND the sprite, `front` OVER it.
- Body re-skin = **radiantSkin**: one ramp step brighter (palette-only), hero's own
  `l → L` pulse, broken gold rim on the contour via the hero's own `g` key. HERO
  keys only; the non-empty mask is asserted identical to the base — geometry can
  never desync.
- `BF0 GATHER` (light drawn to the chest sigil) → `BF1 PEAK` (halo ring r13 + white
  chest core + **north-dominant rays** + ground sparkle at the feet) → `BF2 RISE`
  (ring fragments and motes lift off the crown).

## Reuse map (why this stage exists)

- **Sword combos (next stage)** — SLASH + IMPACT at contact; S2 holds.
- **Charged moments** — CYCLE gather/ignite + GROUND HALO underfoot + BODYFLARE
  peak as the "ready" loop (R0↔R1 / BF1).
- **Finisher accents** — full EMBLEM flash + HALO snap + a scaled-up IMPACT star.
- **Parry / riposte** — HALO snap (H0) is a natural parry ring; cross-sparks on the
  counter.
- **Ranged / thrown light** — the MICRO glyph as the projectile core, ray tips as
  its trail.
- **Future powers** — compose from the same six families; always play the CYCLE
  grammar; never invent a new ramp.

## Integration notes (for the LATER wiring stage — nothing now)

- Effect grids are RENDER-ONLY overlays — never Hitboxes, never in
  `getActiveHitboxes()`; no gameplay/timing/AI/physics changes.
- Natural seams (same pattern as prior ports): `Enemy.js` draw — slash on melee
  ACTIVE frames, cycle on `cast`, halo on `parry`/`parry_counter`, impact at
  strike contact, bodyflare on charged/empowered states. Port as `SpriteManager`
  statics using hard `fillRect` cells (the v3/v4 lesson: never repaint the smooth
  curve + shadowBlur path — that is what got hero VFX v1/v2 rejected).
- On-screen scale: everything renders at the hero 2px grid — emblem 82px, halo
  66px, slash 74px, impact 42px, cycle 90px, bodyflare 96×72px around the 60×48px
  hero. (The current live hero VFX is the blue "cold sanctity" v4 set; the Light
  Eclipse supersedes it at the hero-attack seams when the combo redesign lands.)
- Tiering suggestion: normal = everything; lite = drop sparkle breakup + halve
  motes + drop the outer dash halo; performance = core disc + corona + cardinal
  rays + single ring only. The white-disc-in-gold-corona read survives every tier.

## Validation (all asserted in-generator, throws on violation)

Palette-legal grids (LIGHT keys only in effects, HERO keys only in body re-skins);
warm law R>=G>=B on every LIGHT color (no blue can exist); emblem perfect
h-symmetry + white core + white/gold share balance; halo true-circle purity;
impact star reach; cycle gather-contracts / release-expands / dissolve-thins /
motes-RISE; bodyflare mask identity + north-dominance + nothing below the floor
rows; literal round-trip re-parse (lightSlash + lightCycle byte-compare).
