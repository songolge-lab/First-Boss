# Hero Combo A — "MERIDIAN LOOP" (Stage 8C-0 hand-off)

Production sheet: `hero_combo_a_v1.png` (generator `hero_combo_a_gen.js`, data
`hero_combo_a_literal.txt`).
**STATUS: CONCEPT (Stage 8C-0, REV 2 correction pass), pending approval. Nothing
wired into `src/`.**

> **REV 2 (correction pass, July 2026)** — same combo, same family, same 5-step
> structure and loop clock; four corrections:
> 1. **The dive is a TURN, not a fall** — a lossless 90° body rotation gives S2 a
>    real plunge frame: upright apex → horizontal plunge (head leading, blade
>    leading the line) → planted slam. See §S2 below.
> 2. **The advance is normalized** — mark → pillar is **5 hero lengths**
>    (`ADVANCE_PX 150`, asserted 3.5–6.5), a controlled holy advance, not the
>    near-wall-to-wall run of the first draft. S4's chase streaks were tightened
>    to match.
> 3. **Body radiance for the key moments** — radiant skin + a new sparse
>    **contour aura** (LIGHT cells hugging the *outside* of the silhouette,
>    upward-biased, **bounded 5–34 cells and asserted**) on T2 / D2A / D2B /
>    A4B / P5B / P5C. The silhouette always reads; the opener stays bare.
> 4. The eclipse state now **persists through the dive** (radiant on D2A/D2B,
>    fading on R2) so the transformation is an arc, not a single frame.

A second, visually distinct Hero combo — a 5-step chain built entirely on the
approved **Stage 8B-0 Hero Light Eclipse** language and the approved 30×24
Dawnguard Knight. Strict pixel art: hard cells, no blur, no gradients, no glow
clouds — and **ZERO BLUE in the effects** (the blade keeps its own cold-blue
glow: that is the character, not the effect).

Reference translation (inspired, never copied): the ink-silhouette swordsman
gave the *scale* of a committed full-body strike and the idea of a smear that is
longer than the fighter; the pixel-art knight sheet gave the long, low, level
smear that became the S1 bow; the arena footage gave the sense of a move that
crosses a stage rather than happening in place. All of it is re-authored on our
hero, our canvas and our ramp.

---

## Identity in one line

> **DAYBREAK CHAIN is a combo of ARCS. MERIDIAN LOOP is a combo of LINES.**
> Daybreak swings four radial crescents at the shoulder and stays on the body.
> Meridian draws a bow, a dive, a thrown glaive, a chase and a pillar through
> space — advances five hero lengths, and comes back to where it started.

Naming: `DAYBREAK` is dawn and **rises**; `MERIDIAN` is solar noon and
**returns**. Same solar vocabulary, next hour of the day.

## The chain (5 steps, 24 frames, 82 ticks)

| # | Name | Motion | Eclipse level | Frames |
|---|------|--------|---------------|--------|
| S1 | **SUNSTEP** | grounded **level cut**; the blade rotates only 26° — a wrist cut. Long shallow **bow** smear from a distant pivot | thin W-I band + one glint | 4 |
| S2 | **ZENITH DIVE** | coil → **launch** → **ECLIPSE STATE** at the airborne apex → **the turn** (90° rolled plunge, blade leading) → planted slam → rise | halo snap + radiant re-skin + aura — the state persists through the dive | 6 |
| S3 | **SUNGLAIVE** | the light **leaves the sword**: a slash projectile is cast forward | the glaive carries it; the blade is left **bare** | 4 |
| S4 | **CHASECUT** | sets **THE MARK**, then cuts forward along the glaive's path, carving the **CORRIDOR** | ground halo + chase lines; the blade **crosses** the glaive | 4 |
| S5 | **NOON PILLAR + ECHO RETURN** | the corridor stands up into a **pillar** at the far end — then the hero **unmakes** and **reforms** back at the mark | full | 6 |

### How S1 is distinct from every Daybreak hit

The distinction is **pivot radius**, not sweep angle. Daybreak's H1/H2/H4 pivot
tight at the shoulder (r≈15) and rotate the blade 60–200° → radial crescents.
S1 pivots at **(22,62) r=40** — far below the cut line — and rotates the blade
**26°**. The same approved SLASH band anatomy (W leading edge / I body / y inner
/ o belly rim / sparse G) comes out as a **long shallow bow that bulges up
through the middle**: an arc by construction, a *line* to the eye. And because
the pivot sits below, the band's hot edge is its **top** — the light rises off
the cut. Nothing in Daybreak moves like this, and no new shape was invented.

## Per-step frame groups

### S1 SUNSTEP (4f) — the opener stays honest
`W1 SET` (blade drawn back level, W edge glint + gold spark — the S0 GLINT
language) → `A1A SHEAR` (thin W-I bow, top of the band) → `A1B HIT` **(hold 4)**
(full bow + o belly, step in, contact spark) → `L1 FOLLOW` (bow broken one step
dimmer, motes rise).

### S2 ZENITH DIVE (6f) — the transform and the turn (rebuilt in R2)
`W2 COIL` (ground glint underfoot, gather motes at the chest) → `J2 LAUNCH`
(**airborne**, ground glint hot, push-off line) → `T2 ECLIPSE` **(hold 5)**
(**the eclipse state**: HALO SNAP r11, radiant re-skin + contour aura, N ray
longest, outer dash halo lifted, white chest core — the 8B-0 BODYFLARE peak,
airborne) → `D2A PLUNGE` (**the turn** — the body has rolled over the apex and
rides **horizontal**: head leading, face down, cape trailing up the back, both
hands driving the sword down-forward so the **blade leads the line** to the
impact; the broken dim arc over the back is the path the blade traced through
the turn; the apex light is left behind and rises) → `D2B SLAM` **(hold 5)**
(the rotation completes: upright again but **weight sunk** — deep crouch, wide
stance, cape thrown forward by the stop, both hands driving the blade
vertically into the floor; big impact star at the plant, ground burst) →
`R2 RISE` (radiance fades).

**How the plunge body is made (R2):** 90° is the one rotation pixel art
survives losslessly — a pure transpose + flip, no resampling, no mush. The
approved base (blade erased in base coords first) turns head-forward/face-down
and the sword is re-drawn along the dive line. Upright → horizontal → planted:
one readable rotation across three frames, and the hero identity is untouched
because every cell is the approved base's own cell.

### S3 SUNGLAIVE (4f) — the light leaves the sword
`W3 DRAW` (gather motes converge on the blade) → `A3A CAST` (the crescent peels
off the edge) → `A3B RELEASE` **(hold 4)** (the glaive is born and already
leaving frame; **the blade is bare**) → `L3 FOLLOW` (last motes rise).

### S4 CHASECUT (4f) — the load-bearing step
`W4 MARK` (**THE MARK** — a bright ground halo; the only frame that tells the
player where the return will land) → `A4A DASH` (chase lines, the mark left
behind) → `A4B CUT` **(hold 3)** (**the merge beat** — the blade crosses the
travelling glaive so steps 3-4-5 read as one move) → `L4 DRIVE`.

### S5 NOON PILLAR + ECHO RETURN (6f) — the payoff and the loop
`P5A SEED` (kernel ignites at the floor ahead) → `P5B ERUPT` **(hold 5)** (the
pillar's near edge bathes the hero — radiant re-skin) → `P5C CROWN` (the crown
opens overhead) → `E5A UNMAKE` (**at the far end** — the body goes to light,
rising mote column) → `E5B REFORM` (**back at the mark** — the body knits inside
the still-lit corridor bed, halo snap punctuates) → `E5C SETTLE` (**seam** — the
blade returns to the idle carry; asserted within 3 cells of (36,27)).

## The grammar argument (why the teleport is not an invention)

The 8B-0 family grammar is **GATHER → IGNITE → RELEASE → DISSOLVE**.
The teleport is that grammar **run backwards**:

- **Departure** = DISSOLVE, played on the body. The silhouette is eaten **from
  the feet up** and becomes a rising mote column.
- **Arrival** = GATHER, played on the body. Motes converge on the 8 fixed spokes
  (mean radius contracts — asserted) and the silhouette knits **from the feet
  up**.

Both halves are bottom-up, so **light rises in both** — the family's exit law
holds at an arrival, which is the whole reason this reads as Light Eclipse and
not as a generic blink. No new ramp, no new shapes; only the direction of time.

## The loop clock (the one timing fact the move depends on)

The requirement — *"before the pillar fully dissipates, the hero teleports
back"* — is encoded as data and **asserted in-generator**:

| | tick |
|---|---|
| S5 begins / pillar seeds | 58 |
| **ECHO RETURN lands** (`E5B REFORM`) | **73** |
| **Pillar dies** (end of `PL4 RESIDUE`) | **82** |
| **Margin** | **9 ticks** |

The return also lands inside `CR1` — the corridor bed is still clearly lit
(asserted). If the hero reappears after `CR2`, the return reads as a *pop*
instead of a loop; the lit bed is what sells it.

## New reusable Light Eclipse sub-effects (8C-0 additions to the family)

All four compose from 8B-0 parts. None introduces a ramp, a colour or a shape
language.

| grid | size | what it is | derived from |
|------|------|-----------|--------------|
| `lightGlaive` | 25×25, 3f | the thrown slash projectile (birth / travel / shimmer, loops GL1↔GL2) | the 8B-0 **reuse map's own line**: "ranged / thrown light — the MICRO glyph as the projectile core, ray tips as its trail", wrapped in a SLASH crescent |
| `lightCorridor` | 72×17, 3f | the cut path and its fading residue (cut / fade / ghost) — the bed the return lands in | a straight tapered ray laid flat + the SLASH band anatomy; a thin **cut**, never a wall |
| `lightPillar` | 41×72, 5f | the climax column (seed / erupt / noon / break / residue) | **the EMBLEM's NORTH ray at world scale** — straight, tapered base→tip, standing on a GROUND HALO, crowned by a true-circle corona with cardinal rays and cross-sparks |
| `lightReform` | 33×33, 3f | the arrival (call / knit / snap) | the CYCLE **GATHER** spokes + the HALO **H0 SNAP** the family already uses for parry |

The pillar derivation is the load-bearing one: **it is not a new shape, it is the
emblem's longest ray drawn big.** That is also why it rises — and why it stays
the exact inverse of the boss's Eclipse Breaker, which rams the floor and sinks
ash. The Noon Pillar tears out of the floor and burns out **from the base up**,
so its last light is the light that has risen.

## Escalation law — measured at the MOVE level

Combo A's light does not live on the body the way Daybreak's does: S3 hands it to
the glaive and S5 hands it to the pillar, so S3's hero frame is *deliberately*
modest (the light left the sword). Measuring hero-frame pixels alone would
therefore punish the correct art. The law is measured **per step** as
`hero hit-frame LIGHT px + the detached grid that step owns` — what the player
actually sees:

```
S1 101  →  S2 237  →  S3 196  →  S4 514  →  S5 805
```

Asserted (the same invariant *shape* the approved `hero_combo_validate.js` uses,
which is the shape that survives compositing): **S1 is the smallest**, **S5 is
dominant (> 1.5× every other step)**, and **every middle step exceeds S1**. Note
S3 < S2 by design — that is the light being handed to the projectile, not a
regression. Do not "fix" it.

## Faster and more graceful than the boss combo

- **82 ticks / 5 steps = 16.4 ticks per step**, vs Daybreak's 67/4 = 16.75 — and
  each Meridian step does far more.
- **Only the three true impacts are held** (`A1B` 4, `T2` 5, `D2B` 5, `A3B` 4,
  `P5B` 5). Every travel frame is **2 ticks**. The combo spends its time moving,
  not posing — the boss chain's weight comes from long holds; Meridian's comes
  from distance covered.
- Grace comes from the **loop closing**: the move ends where it began, on the
  seam back to the idle carry.

## Canvas, anchors, palette

- Frames are **44×34**, hero base at **(7,10)**, feet/shadow rows **32/33** —
  **identical to the approved 8B-1 combo canvas**, deliberately. The runtime path
  8B-3 already proved (row-count detection, the `aimDir` mirror, the
  `HERO_BODY_ROWS`/`HERO_BODY_COLS` body-box clamps) serves these unchanged.
- **Airborne law (new):** `J2` / `T2` / `D2A` carry **no body on the floor rows**
  (asserted). The legs tuck *above* the collision base, so `drawSprite`'s
  centerX/feet-bottom anchor still self-solves — a tucked pose simply reads as
  the legs pulled up above the hitbox bottom, which is what a jump should look
  like.
- Authored **facing RIGHT** like every approved Hero clip.
- **Palette:** HERO keys + the six LIGHT keys (`W I y o G u`) — the same merge
  8B-3 already made into `HERO_REDESIGN_PALETTE`. No new keys.
- The four detached grids are **pure LIGHT keys** and are **world-space** effects
  — they do **not** ride the sprite anchor. See "integration" below.

## Validation (all asserted in-generator, throws on violation)

Warm law R≥G≥B on every LIGHT colour; 44×34 + legal keys on all 24 frames; fx
layers restricted to LIGHT + neutral steel (never `l`/`L`/`g`); feet on the floor
rows for grounded frames **and no body on them for airborne frames**; body mass
conserved (and, on the ghost frames, the unmake/reform ratios plus a mean-Y proof
that both halves are bottom-up); radiant re-skin mask identity (the silhouette
can never desync); front accents ≤6 body px (≤18 on the two flare frames — the
8B-0 BF1 precedent paints a white chest core over the body); move-level
escalation; pillar h-symmetry + north-dominance + true-circle crown + dissolve
thinning + residue rising; corridor reach + fade + rising residue; glaive core
white and bowed toward travel; reform mean-radius contraction + snap circle
purity (every lit cell on a declared true radius); **the loop clock** (return
before the pillar dies with ≥6 ticks margin, and inside the lit corridor bed);
**the R2 aura bounds** (every aura frame carries 5–34 contour cells — tasteful
is a law, not a hope); **the R2 advance bound** (mark → pillar stays within
3.5–6.5 hero lengths — the stage map and tableau 2 draw from the same constant
so the sheet cannot quietly re-inflate it);
the S4-settle seam; literal round-trip re-parse on all 9 clips. The generator
re-emits the PNG **and** the literal **byte-identical** across runs.

## Integration — read this before scheduling anything

> **This is the big difference from 8B-1, but it is smaller than it first looks —
> most of the primitives already exist. Verified against the live `Enemy.js`.**

Daybreak Chain rode the live 4-hit melee FSM 1:1 and shipped as a pure
sprite/VFX swap with **zero gameplay change**. Meridian Loop cannot ride the FSM
unchanged — but the systems its steps lean on are, with two exceptions, already
in the game:

| step | what it needs | exists today? |
|------|---------------|---------------|
| S2 | a **jump + dive** (airborne strike) | ✅ `MoveState.JUMPING` + `AIR_ATTACK` (the pogo dive), `JUMP_DEFAULT` on |
| S3 | a **world-space projectile** | ✅ the light-wave magic — free-moving `projectiles[]` drawn at world `p.x,p.y` via `SpriteManager.drawLightWave` (not sprite-parented) |
| S4 | a **dash** with travel distance | ✅ `MoveState.DASH_WINDUP` / `DASHING`, `DASH.MULTIPLIER 6.0` |
| all | a **world-space effect layer** not parented to the sprite | ✅ `drawWaveProjectiles` already draws light effects in world space — the pillar/corridor/glaive extend that seam, they do not open it |
| S5 | a **position teleport / warp** | ❌ no teleport primitive in `Enemy.js` (grep: 0) — genuinely new |
| all | a **5-step** chain | ❌ `COMBO.HITS` is 4 — needs a 5th entry (or a separate FSM) |

So the honest gap is **two things, not five**: a position-warp and a 5th hit
window. Everything else has a live precedent to copy. (Note: this corrects the
stale `CLAUDE.md` line "The Hero does not yet jump" — it does; `targetY` is no
longer merely reserved.) The timings on the sheet are presentation intent, **not**
an FSM contract. Suggested split into later stages:

1. **8C-1 — extraction/packaging.** Drop-in module + validators for the 24 body
   frames and the 4 grids, exactly as 8B-2 did. Pure artifact work; safe now.
2. **8C-2 — the world-space effect grids as painters.** Add `lightGlaive` /
   `lightCorridor` / `lightPillar` / `lightReform` as `SpriteManager` statics
   alongside the existing `drawLightWave`, and render them from the same
   world-space path `drawWaveProjectiles` already uses. Render-only, independently
   verifiable, reuses a proven seam.
3. **8C-3 — the two missing systems + the choreography** (a position-warp for the
   ECHO RETURN, a 5th `COMBO.HITS` entry or a bespoke Meridian FSM, and the
   step→state mapping). This is the **gameplay** stage — hitbox/timing/AI/balance
   consequences — and must be specced on its own terms, not smuggled in behind an
   art swap.
4. **8C-4 — the visual swap**, once 8C-3 exists to hang it on.

If only part of this can ship, **S1+S2 are separable** (a grounded cut and a
jump/dive already have every system they need) and **S3-S4-S5 are not** — they
are one move, and the loop only exists once the warp (8C-3) lands.

## Risks

1. **The dive vs the mirror (highest art risk).** The boss's air eclipse already
   owns the downward dive ray. S2 keeps the mirror pure by having the hero's
   **body** fall while its **light is left behind and rises** — north stays the
   longest ray. If a later pass points the hero's rays *down* into the dive, the
   two families blur and the Light Eclipse loses its meaning
   ([[hero-light-eclipse]], [[red-eclipse-render-only]]).
2. **The mark must be readable.** `W4 MARK` is 3 ticks. If the ground halo is
   dimmed, shortened or dropped for performance, the return has no anchor and the
   whole move reads as a random blink. The mark is **not** decoration — it is the
   move's grammar. Any tiering must keep it.
3. **The overlap is the move.** If the pillar is shortened or the return delayed
   past `PL4`, the loop collapses into "big hit, then teleport" — two moves. The
   9-tick margin is small on purpose (it should feel tight) but it is the floor.
4. **The corridor must stay thin.** It is a *cut*, not a beam weapon. A thick
   corridor reads as the boss's language and also swamps the escalation.
5. **World-space effects need a new painter.** The pillar is 82×144 px on screen
   and stands on the floor line, not on the hero. Do not try to bake it into a
   hero frame — that is what the 44×34 canvas cannot do, and forcing it would
   break the anchor that 8B-3 spent a whole stage getting right.
6. **Do not phase-index these off `COMBO.HITS`.** There is no 5-step FSM to index
   against; a free-running animator will drift the held frames and the impact
   weight collapses (the 8B-2 risk 3 lesson).

---

## Reproduce

```bash
node tools/redesign/hero_combo_a_gen.js   # re-emits the sheet + the literal, byte-identical
```
