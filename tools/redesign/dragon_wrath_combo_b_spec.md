# Hero DRAGON WRATH + Combo B — "DRAGONS REND" (Stage 8C-1 hand-off)

Production sheet: `dragon_wrath_combo_b_v1.png` (generator
`dragon_wrath_combo_b_gen.js`, data `dragon_wrath_combo_b_literal.txt`).
Family registration: **[`dragon_wrath_handoff.md`](dragon_wrath_handoff.md)** —
the durable contract for reusing the state.
**STATUS: CONCEPT (Stage 8C-1), pending approval. Nothing wired into `src/`.**

**DRAGON WRATH** is a *named, reusable Hero power state* inside the approved
Stage 8B-0 **Hero Light Eclipse** family. This stage designs the state, the
transformed **WRATH BLADE**, a third Hero combo (**Combo B "DRAGONS REND"**,
performed only inside the state), a 1.5-second **CROWN CHARGE**, and the
**DRAGONFALL** finisher — the arena darkens, a white-gold flash fires, and a
gigantic vertical Light Eclipse greatsword descends and strikes the ground.

Strict pixel art: hard cells, no blur, no gradients, **ZERO BLUE in the
effects** (the visor/chest sigil keep their cold blue — that is the character,
not the effect). White core + warm gold only. No Red Eclipse language anywhere.

> **REFERENCE NOTE (read before review).** The stage brief names four
> references — *hero power up*, *bswordcombo*, *bswordcombo2*, *bigsword* —
> but the images did not arrive with the brief (not attached in-session, not
> on disk). Everything here is designed from the brief's own structural
> descriptions of those references (activation with start/peak/settle; a
> three-strike momentum combo; a post-combo magical charge; darken → flash →
> giant vertical sword → descent → impact) plus the approved family sheets.
> If the actual reference images diverge from what was built, flag the deltas
> for a REV pass — the generator makes corrections cheap.

---

## Identity in one line

> Daybreak is ARCS at the shoulder. Meridian is LINES across the arena.
> **DRAGONS REND is TURNS around the body core — three connected full-body
> rotations performed inside a power state, each trail entering where the
> last one exited (asserted), ending in a charge that pulls the family emblem
> out of the sky and drops it as a sword.**

## The state — DRAGON WRATH (the four marks)

Minted at activation, worn on every empowered frame. Any future empowered
Hero moment replays **exactly these four marks** — never a new ramp:

1. **Radiant skin** — the 8B-0 BODYFLARE law: one ramp step brighter,
   palette-only (mask identity asserted), broken gold contour rim via the
   hero's own `g` key. The rim **never touches the sword** (skip-mask).
2. **Bounded contour aura** — sparse LIGHT cells outside the silhouette,
   upward-biased, **5–34 cells asserted** (the 8C-0 R2 law, reused verbatim).
3. **Crown halo** — a small broken sacred arc above the helm (the state tell).
   During the charge the overhead sigil replaces it; it returns on the watch.
4. **The WRATH BLADE** — below.

Activation clip `dragonWrathRise` (5f, 22 ticks — important, never long):
`DW0 GATHER` (bare, cold-blue sword, motes converge on the chest sigil) →
`DW1 IGNITE` (kernel at the chest; **the light runs hilt → tip**, ignite 0.5) →
`DW2 BURST` **(hold 6, the peak)** (halo snap r12 + N-ray longest + E/W rays +
outer dash ring + full ground halo + radiant + aura — the BODYFLARE peak) →
`DW3 CROWN` (rings gone; the crown arc appears; the state settles) →
`DW4 WRATH IDLE` (the reusable loop pose; DW3↔DW4 shimmer).

## The WRATH BLADE (the transformed sword)

The hero's own sword **awakened** — the physical weapon never changes shape
(same arm, hand, guard span, steel core `4`, trailing steel `3`, reach family):

- the cold-blue leading edge `l` turns **white `W`** (the glow awakened)
- guard center becomes a white focus; gold winks one step out (hero `g` key)
- **G rune pips** surface on the steel core every 3rd cell
- a **broken gold sheath** (`y`/`o`) stands **one cell off** the edge — the
  air gap is the law: energy *around* a blade, never a glowing stick
- detached `W` tip glint + `I` mote leading the point

States (all shown isolated in the 21×13 `wrathBladeStudy` strip): **BASE**
(cold blue, untouched) → **AWAKEN** (light runs in, partial) → **EMPOWERED**
(full) → **FLARE** (sheath closes solid `W` + tip star — impact frames) →
**CALM** (held/charging: edge + runes only, no sheath winks) → **SETTLE**
(outer half returns to blue; the sheath breaks into motes that RISE — the
family exit law played on the weapon).

**Asserted blade law:** on every wrath-active frame the body carries **no
blue beyond the character's own visor+sigil** (≤6 cells, ≥2 surviving) and
≥6 `W` sword cells; the pre-ignite and settle frames must carry clearly more
blue (the cold-blue blade exists on them).

## Combo B — "DRAGONS REND" (3 strikes, 12 frames, 34 ticks)

Performed only inside Dragon Wrath — the only empowered combo in the set.
Every strike is a full-body TURN around the body core `(21,20)`:

| # | Name | Grip | Motion | Sweep |
|---|------|------|--------|-------|
| B1 | **TALON** | one | rising **gutter-to-sky** cut: low-back → floor skim → high-front | 190° at r18 |
| B2 | **WING** | one → two | the **level spin** — mid-turn shows the ONLY mirrored body in the hero set; the trail is a flat ellipse band (rx18 ry5) wrapping the body | 195° ellipse |
| B3 | **FANG** | two | the **over-the-top crash**: up the back, over the crown, down the front; big impact star at the floor plant | 260° at r19 |

Frame grammar per strike (the brief's six beats): windup carries the **entry
arc** of the cut it is about to make (dim) → active carries the full sweep
with the hot `W` leading edge **(held)** → follow breaks the band one step
dimmer, motes rise → link carries a **dim connector** into the next strike.

**THE MOMENTUM LAW (asserted, cell-level):** all trail geometry comes from
shared constants; consecutive segment endpoints must sit **within 6 cells**
(five junction pairs checked), the turn hand-off blade tips within 9, every
junction frame carries ≥6 connector cells, sweeps ≥140°/140°/200°. The three
strikes are provably one rotation — not three separate swings.

**Escalation (asserted):** hit-frame LIGHT px strictly TALON < WING < FANG,
FANG ≥ 1.4× TALON — and at move level ACTIVATION < COMBO < CHARGE < FINISHER.

### Distinctness vs the approved combos

- **DAYBREAK (8B-1)** pivots at the shoulder (r≈15) — radial crescents on the
  body. Dragons Rend pivots at the **body core** with 140–260° wraps; nothing
  in Daybreak encircles the body.
- **MERIDIAN (8C-0)** is lines through space, advancing five hero lengths.
  Dragons Rend **stays in place and rotates**; its only travel is a lunge.
- Unique tells: the mirrored WING turn frame, the flat ellipse band (no other
  hero effect is level), and the power state carried on every frame.

## CROWN CHARGE (5 frames, 90 ticks = 1.5 s EXACTLY — asserted)

From FANG's follow-through the hero raises the blade to the sky (two hands,
vertical, hilt held forward of the face so the visor stays clear — the blade
is CALM state: clean white edge, no combat sheath). On the family grammar:

- `C0 ENTRY` 10t — stance sets, ground halo ignites, first motes
- `C1 GATHER` 18t — motes converge on the raised tip (**mean radius asserted
  falling** C1→C2→C3), `wrathSigil` **SG0 SEED** opens overhead
- `C2 GEOMETRY` 22t — tip ring forms; **SG1 RING → SG2 BUILD** overhead
- `C3 PEAK` 28t — kernel bursts on the tip, full ground halo, floor skim,
  **SG3 BLAZE** (the full 8B-0 emblem, N-ray longest); **the arena begins to
  darken here** (tick 106)
- `C4 RELEASE` 12t — everything snaps tight; the white hand-off column leaves
  the tip; **the flash fires at tick 143**

The **WRATH SIGIL** (41×41, 4f, pure LIGHT) is a *detached world-space grid*
on the 8C-0 pillar contract — it hangs over the raised tip, never rides the
sprite. It is not a new shape: it **is the family emblem played as a growth**
(growth + h-symmetry + N-dominance asserted).

## DRAGONFALL (the giant sword finisher, 44 ticks)

### The screen event (darken → flash → reveal)

- **Darken** (tick 106 → full by 134, holds to 180, lifts with the dissolve):
  environment **values step down** (dim map asserted darker per channel) +
  **stepped corner diagonals** (pixel triangles, never flat rectangular bars)
  + a gold dash ring framing the sky point. The fighters are stamped after
  the darkening at full value — **they always read**.
- **Flash** (tick 143, 6 ticks total — asserted ≤8): `wrathBurst` 41×41, 3f —
  W kernel pop → full-ray BLAZE (the holy detonation) → OPEN (already hollow,
  asserted; sparks rise out — the family exit law). Never a whiteout, never
  an obstruction.
- Darken lead = 37 ticks (asserted ≥24): the dim arrives long before the
  flash, so the reveal is anticipated, not a jump-cut.

### The GIANT ECLIPSE GREATSWORD (`lightGreatsword` 41×84, 6f, pure LIGHT)

**The wrath blade at world scale — a SWORD, never a beam:** pommel, one-cell
grip, a two-row crossguard with upturned quillons (**asserted ≥1.7× the blade
root**), a true-circle halo crowning the guard (the charge sigil arrived on
the weapon), and a real longsword blade — near-parallel body, point only in
the last quarter — on the emblem ray law: `W` core (≥60% of rows asserted),
`I` flanks, `y` body, `o` edge, `G` rune pips down the core. Point DOWN.

Lifecycle: `GS0 MANIFEST` 6t (broken gold contour sketch + converging motes)
→ `GS1 REVEAL` 6t (fully lit, hanging) → `GS2 DESCENT` 8t (**every GS1 cell
survives into GS2 — asserted**; fall streaks beside the hilt, pressure ticks
under the point) → `GS3 CONTACT` 4t (impact star at the tip + first ground
ring) → `GS4 PEAK` 10t HOLD (the base vanishes in the detonation, double
ground halo, upward burst rays, floor streaks both ways) → `GS5 DISSOLVE` 10t
(**burns out from the buried end UP** — bottom-third collapse + crown-last +
rising mean-Y all asserted; ground residue goes bronze).

Anchor: **the TIP row (76) plants on the floor line**; rows below it are the
ground zone. On screen at the hero 2px grid: **82×168 px — 3.5× the 48px hero
body**, taller than the 8C-0 Noon Pillar. The capstone of the family.

Meanwhile the hero: `F1 GUARD` 22t (holds a guard under the fall, crown halo
back) → `F2 SETTLE` 22t (**the state ends on the body**: crown fragments,
sheath breaks into rising motes, **the blue edge returns** — the wrath never
just pops off). The hero clock and the greatsword clock close together at 190.

## The master clock (all asserted)

| event | tick |
|---|---|
| activation | 0–22 |
| TALON / WING / FANG | 22–32 / 32–42 / 42–56 |
| CROWN CHARGE | 56–146 (**90 ticks = 1.5 s exactly**) |
| arena darken begins | **106** |
| flash | **143** (+6) |
| greatsword clock | 146–190 |
| CONTACT / PEAK | **166 / 170** |
| dissolve + darken lift + state settle | → **190** |

Timings are presentation intent — **not an FSM contract**.

## Canvas, anchors, palette

- Body clips **44×34**, hero base at **(7,10)**, feet row **33** — identical
  to the approved 8B-1/8C-0 combo canvas; the proven runtime path (row-count
  detection, aimDir mirror, body-box clamps) serves them unchanged.
- All grounded (no airborne frames); feet-on-floor asserted every frame.
- Authored facing RIGHT. The WING turn frame is a **lossless mirror** of the
  approved base (every cell is the base's own cell) — art, not a runtime flip.
- **Palette:** HERO keys + the six LIGHT keys — the exact 8B-3 merge. No new
  keys, no new ramp (warm law R≥G≥B asserted).
- Detached grids (`wrathSigil`, `wrathBurst`, `lightGreatsword`) are **pure
  LIGHT, world-space** — the pillar contract; they never ride the sprite.

## Deliverable clips (literal)

| clip | frames | what |
|------|--------|------|
| `dragonWrathRise` | 5 | activation (gather/ignite/burst/crown/idle) |
| `heroComboB1..B3` | 4+4+4 | TALON / WING / FANG |
| `wrathCharge` | 5 | the 1.5 s charge |
| `wrathRelease` | 2 | guard under the fall + the settle |
| `wrathSigil` | 4 | 41×41 charge emblem (world-space) |
| `wrathBurst` | 3 | 41×41 holy detonation flash (world-space) |
| `lightGreatsword` | 6 | 41×84 giant sword lifecycle (world-space) |
| `wrathBladeStudy` | 5 | 21×13 weapon-state documentation strip |

## Validation (all asserted in-generator, throws on violation)

Warm law; dim-map strictly darker; 44×34 + legal keys on all 24 frames; fx
layers LIGHT+neutral steel only; feet on floor; body mass conserved; radiant
mask identity; front cover ≤6 (≤18 flare); aura 5–34; **the wrath blade blues
law**; **the momentum law** (junctions ≤6 cells, tips ≤9, connectors present,
sweeps); strike + stage escalation; sub-effect sizes + pure-LIGHT keys;
h-symmetry on sigil/burst/greatsword; sigil growth + N-dominance; burst
white-core + hollow-clear + flash ≤8 ticks + darken lead ≥24; charge = 90
exactly; clocks close together; greatsword sword-anatomy (guard ≥1.7× root,
tip taper, root−tip ≥4, length ≥2.3× hero, W-core ≥60%), GS1⊂GS2 descent
identity, dissolve thinning + base-up burnout + rising mean-Y; charge gather
contraction; literal round-trip on all 10 clips; deterministic re-emit
(verified: PNG + literal byte-identical across runs).

## Integration — a LATER gameplay stage, not this one

Verified seam reality (nothing wired now):

| piece | seam | exists today? |
|-------|------|---------------|
| the state visuals | render-only dressing at draw time (the enrage / empowered moments are natural consumers) | ✅ pattern proven by 8B-3 |
| 3-hit chain | needs its own hit table or a trimmed combo FSM (`COMBO.HITS` is 4) | ❌ gameplay |
| 90-tick charge | needs a channel state | ❌ gameplay |
| sigil / burst / greatsword | extend the world-space effect seam the light-wave projectiles already use (`drawWaveProjectiles`) | ✅ seam exists, painters needed |
| arena darken | render-only overlay pass (vignette + value dip) | ❌ new, render-only |

Never smuggle these in behind an art swap; spec the gameplay stage on its own
terms (the 8C-0 lesson).

## Risks

1. **The state must stay bounded.** The four marks are deliberately sparse;
   if a later pass thickens the aura or gilds the whole silhouette the state
   becomes a blob and the silhouette law dies. The 5–34 bound is the law.
2. **The greatsword must stay a sword.** The guard/taper/anatomy asserts are
   the defense — do not "simplify" it into a beam or a pillar remake.
3. **The flash must never linger.** 6 ticks, hollow by WB2 — asserted. A held
   whiteout is exactly what the brief forbids.
4. **The mirror stays pure.** White disc / true circles / N-ray / motes rise /
   never bolts / never ash. No red, no void, anywhere in these grids.
5. **The reference gap.** See the note at the top — review against the four
   original references and order a REV pass if the motion logic diverges.

## Reproduce

```bash
node tools/redesign/dragon_wrath_combo_b_gen.js   # re-emits sheet + literal, byte-identical
```
