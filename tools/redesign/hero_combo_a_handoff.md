# Stage 8C-2 — Hero Combo Expansion A — "MERIDIAN LOOP" — HANDOFF PACKAGE

Extraction / technical handoff only. **Nothing here is integrated into the live
game.** `src/`, gameplay, the FSM, hitboxes, damage, AI, the Hero Light Eclipse
family module, Combo B / Dragon Wrath, the throne room and the camera are all
untouched. This document packages the **APPROVED Stage 8C-0 (REV 2)** Hero combo
expansion A (`hero_combo_a_v1.png`) into a durable, drop-in-ready contract for the
LATER gameplay-integration stages (8C-3 / 8C-4) so they can wire the approved
sequence without re-interpreting or redesigning the visual work.

MERIDIAN LOOP is the SECOND Hero sword combo, built entirely from the approved
**[HERO LIGHT ECLIPSE](hero_eclipse_handoff.md)** family (white disc + gold corona,
zero blue in the effects) and the approved 30×24 Dawnguard Knight. Unlike Daybreak
Chain (8B-1), it is **not** a render-only drop-in — see §9.

> **DAYBREAK CHAIN is a combo of ARCS. MERIDIAN LOOP is a combo of LINES.**
> A shallow bow, a diving turn, a thrown glaive, a chase, and a world-scale pillar
> — it advances five hero lengths across the arena and teleports back to where it
> started, while the pillar it raised is still burning.

---

## 1. File manifest

| file (tools/redesign/) | role | status |
|------------------------|------|--------|
| `hero_combo_a_v1.png`      | the approved production sheet — the **visual source of truth** | approved 8C-0 REV 2 |
| `hero_combo_a_gen.js`      | deterministic generator (bakes every design assert; throws on violation; re-emits byte-identical) | approved 8C-0 REV 2 |
| `hero_combo_a_literal.txt` | the approved **shipping matrix data**: 5 body clips / 24 frames (44×34) + 4 detached world-space grids | approved 8C-0 REV 2 |
| `hero_combo_a_spec.md`     | the 8C-0 REV 2 design spec (choreography, escalation law, loop clock, risks) | approved 8C-0 REV 2 |
| `hero_combo_a_handoff.md`  | **NEW (8C-2)** this package — the integration contract | 8C-2 |
| `hero_combo_a_validate.js` | **NEW (8C-2)** standalone validator — reads the shipping literal + the generator's declared constants; 36 checks | 8C-2 |
| `hero_combo_a_index.md`    | **NEW (8C-2)** the one-page package index / mapping | 8C-2 |

8C-2 only **adds** the handoff, the validator and the index on top of the approved
8C-0 set. It does **not** modify, regenerate or overwrite any approved
visual-production file. Following the 8B-2 precedent, no separate `*_dropin.mjs`
was authored: the literal is the single shipping artifact and the validator reads
it **directly** (there is no second copy to keep in sync).

Run order:

```bash
node hero_combo_a_gen.js        # (optional) re-emit the sheet + literal, byte-identical
node hero_combo_a_validate.js   # exit 0 = ALL PASSED (36 checks) against the shipping literal
```

---

## 2. The chain (5 steps · 24 frames · 82 ticks)

| # | Clip | Name | Hands | Motion | Eclipse | Frames |
|---|------|------|-------|--------|---------|--------|
| S1 | `heroComboA1` | **SUNSTEP**   | one | grounded **level cut** — a 26° wrist cut, long shallow **bow** from a distant pivot | thin W-I band + one glint | 4 |
| S2 | `heroComboA2` | **ZENITH DIVE** | two (dive) | coil → launch → **ECLIPSE STATE** at the apex → **the turn** (90° rolled plunge) → planted slam → rise | halo snap + radiant re-skin + aura, persists through the dive | 6 |
| S3 | `heroComboA3` | **SUNGLAIVE** | one | the light **leaves the sword** — a slash projectile is cast forward | glaive carries it; the blade is left **bare** | 4 |
| S4 | `heroComboA4` | **CHASECUT**  | one | sets **THE MARK**, then cuts forward along the glaive's path, carving the **CORRIDOR** | ground halo + chase lines | 4 |
| S5 | `heroComboA5` | **NOON PILLAR + ECHO RETURN** | one | the corridor stands up into a **pillar** at the far end, then the hero **unmakes** and **reforms** back at the mark | full | 6 |

- **Step order** is the chain order S1→S2→S3→S4→S5.
- **Authored facing RIGHT**, like every approved Hero clip; the runtime full-sprite
  flip is the intended mirroring mechanism (§5, §6).
- **Hands:** S1/S3/S4/S5 one-hand; S2's plunge (D2A/D2B) is two-hand (baked).

---

## 3. Per-step frame groups (the extraction)

All body frames are **44×34**, hero base at **(7,10)**, feet/shadow rows **32/33**
(identical to the approved 8B-1 canvas). Effects are **BAKED** into the body frames;
the four detached grids (§4) are **separate, world-space**, and are NOT baked into
any body frame. Frame indices below are 0-based into each clip.

### S1 SUNSTEP (`heroComboA1`, 4f) — the opener stays honest
| i | tag | phase / hold | role |
|---|-----|------|------|
| 0 | `W1 SET`    | WINDUP 4        | blade drawn back level (angle −14°), body pulled back, cape drifts forward; two W edge glints + one gold spark (the S0 GLINT language) |
| 1 | `A1A SHEAR` | ACTIVE-EARLY 2  | thin W-I bow (top of the band), step in begins |
| 2 | `A1B HIT` **(HELD 4)** | ACTIVE-LATE 4 | full bow (W/I/y) + `o` belly rim, lunge in, contact spark at (39,23) + apex glint (34,18) |
| 3 | `L1 FOLLOW` | LINK 4          | bow broken one step dimmer, 2 motes rise |

- **Bow geometry:** the smear pivots at **(22,62), radius 40** — far below the cut
  line — and the blade rotates only **26°** across the whole step. A distant pivot
  turns the approved SLASH crescent into a long shallow bow that bulges up through
  the middle: an arc by construction, a *line* to the eye. Same band anatomy
  (W leading edge / I body / y inner / o belly rim / sparse G).
- **Contact / hit anchor:** the spark at **(39,23)**, blade tip on the right.
- **Left / right facing:** authored right; a runtime full-sprite flip mirrors the
  whole clip (pivot, bow, spark) as one — no per-cell handling.

### S2 ZENITH DIVE (`heroComboA2`, 6f) — the transform and the turn
| i | tag | phase / hold | role |
|---|-----|------|------|
| 0 | `W2 COIL`    | WINDUP 4  | ground glint underfoot (cx 21), gather motes at the chest; grounded |
| 1 | `J2 LAUNCH`  | RISE 2    | **airborne** (no body on floor rows), ground glint hot, push-off speed-line |
| 2 | `T2 ECLIPSE` **(HELD 5)** | APEX 5 | **the eclipse state**, airborne, **upright**: HALO SNAP r11 around the body (centre 20,14), radiant re-skin + contour aura, N ray longest, outer dash halo, white chest core (8B-0 BODYFLARE peak) |
| 3 | `D2A PLUNGE` | FALL-TURN 2 | **the turn** — the body has rolled over the apex and rides **horizontal** (rotated silhouette): head leading, face down, cape trailing up the back, both hands driving the sword down-forward so the **blade leads the line**; the broken dim arc over the back is the path the blade traced; the apex light is left behind and rises; airborne |
| 4 | `D2B SLAM` **(HELD 5)** | CONTACT 5 | rotation completes: upright again but **weight sunk** — deep crouch, wide stance, cape thrown forward, both hands driving the blade vertically into the floor; big IMPACT star at the plant (27,30), ground burst; grounded |
| 5 | `R2 RISE`    | RECOVER 4 | radiance fades, ground residue ellipse, 3 motes rise |

- **Rotation contract — see §7. This is the highest-risk step.**
- **Floor-contact anchor:** the slam impact star at **(27,30)** with the ground
  glint centred at cx **26**; the body plants on rows 32/33 on D2B.
- **Impact VFX anchor:** the `impactStar` at (27,30), front layer.
- **Airborne law:** J2 / T2 / D2A carry **NO hero body on rows 32–33** (asserted).
  The legs tuck above the collision base, so the feet-bottom anchor still self-solves.

### S3 SUNGLAIVE (`heroComboA3`, 4f) — the light leaves the sword
| i | tag | phase / hold | role |
|---|-----|------|------|
| 0 | `W3 DRAW`    | WINDUP 3       | gather motes converge on the blade tip + W glint |
| 1 | `A3A CAST`   | ACTIVE-EARLY 2 | the crescent peels off the edge (glaive birth at ~38,19), speed-line off the blade |
| 2 | `A3B RELEASE` **(HELD 4)** | ACTIVE-LATE 4 | the glaive is born at ~(41,20) with a MICRO GLYPH core (38,20) and already leaving frame; **the blade is left bare**; launch speed-lines trail |
| 3 | `L3 FOLLOW`  | LINK 3         | last motes rise; blade cool |

- **Projectile handoff — see §8.** The glaive is a **detached, world-space** grid
  (`lightGlaive`), not baked into the hero after it leaves; A3A/A3B only paint the
  birth on the blade so the throw reads as continuous.
- **Spawn anchor:** off the blade tip, right side, world-x leading; the detached
  grid takes over once cast.

### S4 CHASECUT (`heroComboA4`, 4f) — the load-bearing step
| i | tag | phase / hold | role |
|---|-----|------|------|
| 0 | `W4 MARK` | WINDUP 3 (SET THE MARK) | **THE MARK** — a bright ground halo (ellipse) at cx **21**, floor row **32**; the only frame that tells the player where the return will land. Gather motes converge |
| 1 | `A4A DASH` | ACTIVE-EARLY 2 | chase speed-lines, the mark left behind (drawn at cx 8), lunge opens |
| 2 | `A4B CUT` **(HELD 3)** | ACTIVE-LATE 3 | the **merge beat** — the blade crosses the travelling glaive (glaive at ~41,21) so steps 3-4-5 read as one move; IMPACT star (40,17) |
| 3 | `L4 DRIVE` | LINK 2 | broken chase dashes, glaive dim and leaving |

- **THE MARK is the return anchor** (see §8, §9). It is 3 ticks; it must read and be
  remembered for ~1s. **Tiering must never dim, shorten or drop it.**
- **Approved travel intent:** a **controlled moderate advance of ~5 hero lengths**
  (`ADVANCE_PX 150` sheet-px ÷ `HERO_LEN 30` = 5.0), asserted 3.5–6.5. **Not** a
  screen-crossing dash. See §8 and the anti-patterns there.
- **Chase destination anchor:** the far end, where S5 seeds the pillar (~cx 39).

### S5 NOON PILLAR + ECHO RETURN (`heroComboA5`, 6f) — the payoff and the loop
| i | tag | phase / hold | role |
|---|-----|------|------|
| 0 | `P5A SEED`   | IMPACT 3 | kernel ignites at the floor ahead (~39,30); gather motes; grounded at the far end |
| 1 | `P5B ERUPT` **(HELD 5)** | PILLAR 5 | the pillar's near edge bathes the hero (radiant re-skin + aura); grounded at the far end |
| 2 | `P5C CROWN`  | PILLAR 4 | the crown opens overhead; radiant |
| 3 | `E5A UNMAKE` | DEPART 3 | **at the far end** — the body goes to light (ghost, unmake): silhouette peels off the feet up into a rising mote column |
| 4 | `E5B REFORM` | ARRIVE 4 | **back at the mark** — the body knits (ghost, reform) inside the still-lit corridor bed (row 20–22), halo snap punctuates, THE MARK re-drawn at cx 21 |
| 5 | `E5C SETTLE` | SEAM 5 | the blade returns to the idle carry (asserted at **(36,27)**, 0 cells off); residue fades |

- **Pillar + teleport-return handoff — see §10.** The pillar is a **detached,
  world-space** grid (`lightPillar`) at the far end; the arrival snap is a detached
  grid (`lightReform`); the corridor bed is a detached grid (`lightCorridor`).
- **The loop clock (asserted):** S5 begins tick 58 · **ECHO RETURN lands tick 73** ·
  **pillar dies tick 82** · **margin 9 ticks**. The return also lands inside the lit
  corridor bed `[58, 74)`. The overlap **is** the move.

---

## 4. Detached, world-space effect grids (4 — new to the family this stage)

These are **pure LIGHT-key** grids, authored travelling RIGHT, and are **NOT baked
into or parented to the hero sprite** — they are world-space effects placed at world
coordinates (§6). Each composes from 8B-0 parts; none introduces a new ramp, colour
or shape language.

| grid | dims (cells) | on-screen @2px | frames | own local origin | what it is |
|------|-------------|----------------|--------|------------------|-----------|
| `lightGlaive`   | 25×25 | 50×50   | 3 (birth / travel / shimmer, loops GL1↔GL2) | centre (11,12), core (8,12) | the thrown slash projectile — MICRO GLYPH core in a SLASH crescent |
| `lightCorridor` | 72×17 | 144×34  | 3 (cut / fade / ghost) | centre row 8, mark node col 5 | the cut path + fading residue — the bed the return lands in (the return's timing clock) |
| `lightPillar`   | 41×72 | 82×144  | 5 (seed / erupt / noon / break / residue) | centre col 20, floor/base row 68, ground halo row 70 | the climax column — the EMBLEM's north ray at world scale, on a ground halo, crowned by a true-circle corona |
| `lightReform`   | 33×33 | 66×66   | 3 (call / knit / snap) | centre (16,16) | the arrival — GATHER spokes + HALO H0 SNAP |

**Effect ownership / layering (baked body frames):** back → front is
`fxB` (smear / trail / halo, behind the body) → **hero body** → `fxF` (front accents:
sparks, impact stars, motes, ≤6 body-px cover, ≤18 on the two flare frames T2 / D2B /
E5B). The body always wins over its own trail. The detached grids render on the
**world-space effect layer**, the same seam `drawWaveProjectiles` already uses — the
pillar/corridor/glaive/reform extend that seam, they do not open a new one.

**Cleanup ownership:** the glaive is owned by the projectile lifecycle; the corridor,
pillar and reform are owned by the S5 sequence and must be torn down when the
sequence ends / is interrupted / the Hero dies / the encounter resets (§9).

---

## 5. Frame & phase contract (integration-facing)

The table below is the **presentation** contract, not an FSM contract — there is no
5-step melee FSM in the game yet (§9). It documents ordering, relative weight,
looping and the next-phase transition so a later stage can hang timing on it.

| step | frame | phase | hold (ticks) | one-shot / loop | interruptible? | next |
|------|-------|-------|--------------|-----------------|----------------|------|
| S1 | W1 SET | WINDUP | 4 | one-shot | yes (pre-commit) | A1A |
| S1 | A1A SHEAR | ACTIVE-EARLY | 2 | one-shot | no (committed) | A1B |
| S1 | A1B HIT | ACTIVE-LATE | 4 **HELD** | held | no | L1 |
| S1 | L1 FOLLOW | LINK | 4 | one-shot | yes (cancel into S2) | S2/idle |
| S2 | W2 COIL | WINDUP | 4 | one-shot | yes | J2 |
| S2 | J2 LAUNCH | RISE | 2 | one-shot | no | T2 |
| S2 | T2 ECLIPSE | APEX | 5 **HELD** | held (peak may loop) | no | D2A |
| S2 | D2A PLUNGE | FALL-TURN | 2 | one-shot | no | D2B |
| S2 | D2B SLAM | CONTACT | 5 **HELD** | held | no | R2 |
| S2 | R2 RISE | RECOVER | 4 | one-shot | yes | S3/idle |
| S3 | W3 DRAW | WINDUP | 3 | one-shot | yes | A3A |
| S3 | A3A CAST | ACTIVE-EARLY | 2 | one-shot | no | A3B |
| S3 | A3B RELEASE | ACTIVE-LATE | 4 **HELD** | held (glaive spawns here) | no | L3 |
| S3 | L3 FOLLOW | LINK | 3 | one-shot | yes | S4/idle |
| S4 | W4 MARK | WINDUP | 3 | one-shot | yes (**store return pos here**) | A4A |
| S4 | A4A DASH | ACTIVE-EARLY | 2 | one-shot | no | A4B |
| S4 | A4B CUT | ACTIVE-LATE | 3 **HELD** | held | no | L4 |
| S4 | L4 DRIVE | LINK | 2 | one-shot | yes | S5/idle |
| S5 | P5A SEED | IMPACT | 3 | one-shot (pillar seeds) | no | P5B |
| S5 | P5B ERUPT | PILLAR | 5 **HELD** | held | no | P5C |
| S5 | P5C CROWN | PILLAR | 4 | one-shot | no | E5A |
| S5 | E5A UNMAKE | DEPART | 3 | one-shot (**teleport departs**) | no | E5B |
| S5 | E5B REFORM | ARRIVE | 4 | one-shot (**teleport arrives at the mark**) | no | E5C |
| S5 | E5C SETTLE | SEAM | 5 | one-shot | yes (seam to idle carry) | idle |

- **Effect spawn points:** glaive spawns on A3B (world x = blade tip); corridor cut
  begins during S4 and its lit bed (CR1) runs through S5; pillar seeds on P5A and
  runs its own 5-frame clock `[3,5,4,6,6]` (dies tick 82); reform plays over E5A/E5B.
- **Effect cleanup point:** glaive on expiry/impact; corridor/pillar/reform at the
  end of E5C or on interruption (§9).
- **No gameplay damage / balance values are assigned here** — timings are visual
  sequencing intent only.

---

## 6. Anchors & coordinate conventions

Two coordinate spaces are in play. Keep them distinct at integration.

**(a) Body-frame local (hero-anchored), 44×34.** Same convention as 8B-1:
`SpriteManager.drawSprite`'s centerX / feet-bottom anchor self-solves; the frame's
grid bottom is the entity's collision base. Row-count detection (`frame.length >= 20`)
routes these through `HERO_REDESIGN_PALETTE` at `HERO_IDLE_PIXEL = 2` (88×68 px).

| anchor | value (frame-local) | notes |
|--------|--------------------|-------|
| Hero sprite origin | base pasted at **(7,10)** | OX,OY; 30×24 base on the 44×34 canvas |
| feet / floor anchor | rows **32 / 33** | 33 = shadow (last row); the collision base |
| sword hand / grip | per-frame `hand:(x,y)` | e.g. idle carry ≈ (25–26, 22–23); drawn per frame |
| sword trail origin | S1 bow pivot **(22,62) r40**; other steps: the blade tip | the smear/lance source |
| hit / contact anchor | S1 (39,23) · S2 slam (27,30) · S3 glaive birth (38–41,19–20) · S4 (40,17) · S5 seed (39,30) | the per-step contact point |
| dive impact point | **(27,30)**, ground glint cx 26 | D2B plant |
| step-4 start marker (THE MARK) | ground halo at cx **21**, floor row **32** | **the teleport return anchor** |
| teleport disappearance point | E5A, at the far end | body dissolves bottom-up |
| teleport return point | E5B, **back at the mark** (cx 21) | body knits bottom-up |
| reappearance residue centre | halo snap centre **(21,20)**, corridor bed rows 20–22 | inside the still-lit bed |

**(b) Detached-grid local (world-anchored).** Each grid has its own origin (§4):
glaive (11,12) · corridor (mark col 5, row 8) · pillar (col 20, floor row 68) ·
reform (16,16). These are **world-space** and are placed at world (x,y) derived from
the mark / far-end / pillar positions — they do **not** ride the sprite anchor.

**Conversion relationship (sheet → in-game).** The sheet frames are frame-local; at
integration the hero sprite is placed by its existing anchor, and the detached grids
are placed at world coordinates: the mark and reform sit at the **stored step-4
position**; the corridor spans mark→far-end; the glaive travels mark→far-end along
world-x; the pillar stands at the **far-end** on the arena floor line, its local
floor row 68 aligned to the world floor. The one distance constant is `ADVANCE_PX`
(150 sheet-px = 5 hero lengths ≈ 300 screen-px at 2px/cell) — the mark→far-end span.
No new coordinate system is introduced.

---

## 7. Rotating-dive handoff (S2 — the highest art risk)

**The dive is a TURN, not a fall.** This section exists so a later stage cannot
reproduce the rejected stiff-fall version. The generator asserts it; the validator
re-proves it from the literal.

- **Ordered rotation across three frames:** `T2 ECLIPSE` (upright apex) →
  `D2A PLUNGE` (rotated **horizontal** — head leading, face down, blade leading the
  line) → `D2B SLAM` (upright again, **weight sunk**, blade driven into the floor).
- **The body and sword rotate as ONE coherent attack.** D2A is built by a **lossless
  90° body rotation** (pure transpose + flip — the one rotation pixel art survives
  with no resampling and no mush) of the approved base; every cell is the approved
  base's own cell, so the hero identity is untouched. The base blade is erased in
  base coords first, then the sword is re-drawn along the dive line so it **leads the
  strike**.
- **Measured proof (validator `[ROTATE]`):** the D2A silhouette **rotates wide** —
  bounding-box aspect **0.92 vs the upright T2's 0.68** (≥1.15×; a rigid upright fall
  would keep ≈0.68). On the turn the top blade cell sits at **row 15** (≤25) — the
  blade **leads the dive line and is NOT parked at the feet**.

**Explicit laws for later integration (do not violate):**
- The Hero does **not** fall rigidly upright; torso, limbs, cape and sword rotate
  together.
- The sword must **not** remain near the feet during the plunge — it leads the line.
- **Rotational direction / frame order:** clockwise from upright → head-forward
  horizontal → planted; strictly T2 → D2A → D2B.
- **Downward acceleration begins at D2A** (index 3) — the turn frame; the plunge is
  committed there, and the apex light is left behind and rises.
- **Floor-contact row:** the slam plants on rows **32/33**; the impact star is at
  **(27,30)**. J2 / T2 / D2A are airborne and carry **no body** on rows 32/33.
- **Mirror purity:** the boss dives *with* its light (south ray at the ground); the
  Hero falls *out of* its own — the apex light is left behind and **rises**, north
  stays the longest ray. If a later pass points the Hero's rays down into the dive,
  the two families blur ([[hero-light-eclipse]], [[red-eclipse-render-only]]).

---

## 8. Projectile & forward-travel handoff (S3 + S4)

### Projectile (`lightGlaive`) — S3
- **Spawn anchor:** off the blade tip (right side, world-x leading) on **A3B RELEASE**;
  A3A/A3B paint the birth on the blade so the throw reads continuous, then the
  detached grid takes over. The blade is left **bare** after release.
- **Projectile centre / origin:** grid centre **(11,12)**; MICRO GLYPH white core at
  **(8,12)** (validator `[GLAIVE]`).
- **Frame groups:** GL0 birth → GL1 travel (full crescent + micro-glyph core + trail
  comb) → GL2 shimmer; **loops GL1↔GL2** while in flight (the R0↔R1 release law).
- **Facing / travel rules:** authored travelling RIGHT; the crescent **bows toward
  travel** (belly leads the tips — validator-checked). Mirror the whole grid under a
  facing flip; travel direction follows the Hero's facing at cast.
- **Layering:** world-space effect layer (behind gameplay actors); Light Eclipse
  trail comb behind the core.
- **Cleanup:** owned by the projectile lifecycle — despawn on impact / expiry; do not
  leave a stale glaive when S3 ends.
- **Distinguish four visuals:** (1) Hero body animation (S3 frames), (2) sword
  animation (bare after release), (3) the projectile visual (`lightGlaive`), (4) the
  projectile residue / trail comb (part of the grid). **No new projectile mechanic is
  invented** — this is the 8B-0 reuse-map "ranged = micro glyph core" line realized.

### Forward travel (`lightCorridor`) — S4
- **Approved travel = a controlled MODERATE advance of ~5 hero lengths**
  (`ADVANCE_PX 150` = 5.0 × `HERO_LEN 30`; asserted 3.5–6.5; validator `[ADVANCE]`).
  The stage map and tableau draw from the same constant so the sheet cannot quietly
  re-inflate it.
- **Do NOT describe or permit:** near-full-map travel · uncontrolled pursuit ·
  unlimited movement · arbitrary teleportation during the chase. The only teleport in
  the whole combo is the S5 ECHO RETURN.
- **Positional contract for later integration:** store the **exact step-4 starting
  position at W4 MARK** (§9), advance forward by ~5 hero lengths clamped inside the
  arena bounds, carve the corridor mark→far-end, and return to the **stored** position
  in S5. The corridor is a **thin cut**, never a wall/beam (validator-checked reach +
  fade + rising residue).
- **Destination / feet / floor:** the chase ends at the far end on the floor line
  (feet on rows 32/33 through S4); transition into P5A seeds the pillar there.

---

## 9. Pillar & teleport-return handoff (S5)

### The pillar (`lightPillar`)
- **Pillar centre:** local col **20**; **floor / base row 68**; ground halo at row
  **70**. On-screen 82×144 px, standing on the arena floor line at the **far end**
  (the stored-position + advance), **not** on the hero.
- **Visual layers / phases (5 frames, own clock `[3,5,4,6,6]`, dies tick 82):**
  PL0 seed (ground halo + gather motes) → PL1 erupt (shaft to ~⅔) → PL2 noon (full
  height + true-circle crown) → PL3 break (dissolve, dashes) → PL4 residue (burns out
  **from the base up**, only the risen light left).
- **Rays / rings / fragments / residue:** north-dominant shaft (the EMBLEM north ray
  at world scale), true-circle corona with cardinal rays + cross-sparks, ground halo,
  dissolving dashes; the residue **rises** (validator `[PILLAR]`: h-symmetric,
  north-dominant 687:37, dissolving 724>402>34, residue rising 42.6→21.2).

### The teleport return
- **Saved return-position relationship:** the return lands at **THE MARK** (set at
  W4 MARK, cx 21, floor row 32) — the **stored step-4 starting position**, NOT the
  pillar location.
- **Teleport-cover timing (the loop clock, asserted):** S5 begins tick **58**; Hero
  **disappears** at E5A (`DEPART`, tick 70); Hero **reappears** at E5B (`ARRIVE`,
  tick **73**); the **pillar dies tick 82** → **margin 9 ticks**. The reappearance
  lands **inside the still-lit corridor bed** `[58, 74)`.
- **Reappearance placement:** inside the fading residue — the corridor bed (rows
  20–22) runs straight through the half-knit body; halo snap (`lightReform` SNAP) at
  (21,20) punctuates. Both halves are **bottom-up** (departure lifts off the feet;
  arrival knits from the feet up), so light rises in both — the family's exit law
  holds at an arrival.
- **Residual-light cleanup / final exit:** E5C SETTLE fades the residue and returns
  the blade to the idle carry (asserted **(36,27)**, 0 cells off) — the seam back
  into locomotion.

**The handoff must prevent (integration guarantees):**
- teleporting **after** the pillar has completely vanished — the return must land
  before tick 82, inside the lit bed;
- returning to the **pillar** location instead of the **saved mark** — the return
  destination is the stored step-4 position;
- leaving **stale** pillar / corridor / reform residue — all three tear down at E5C
  or on interruption;
- leaving the **Hero invisible** — E5B must restore the body (reform), and a hard
  interrupt during E5A/E5B must snap the Hero visible at the stored position;
- **losing the saved return position** before the return occurs — it is stored at
  W4 MARK and must survive until E5B consumes it.

---

## 10. Quality tiers

Combo A must keep its **identity** at every tier. The identity is: the five step
silhouettes, the readable rotating dive, the projectile shape, the pillar, and the
fading-return residue with the teleport cover. Do **not** replace any of these with a
generic glow placeholder.

| tier | keep | reduce |
|------|------|--------|
| **normal** | full approved design + full secondary Light Eclipse detail (auras, motes, fragments, minor rays, trail combs) | — |
| **lite** | hero body frames, sword paths, projectile identity, rotating dive, pillar, teleport cover | secondary particles, fragments, minor rays; thin the auras (they are bounded 5–34 cells already) |
| **performance** | core silhouettes + effect identity: **readable rotation**, projectile shape, pillar, **fading-return residue**, THE MARK | drop most sparks / motes / fragments; simplest crown; single-flank corridor |
| **auto** | follow the project's existing quality-selection behaviour (`?vfxQuality` / PerfMonitor) — never fewer guarantees than the resolved tier | — |

**Never tier away:** THE MARK (§8 — the return has no anchor without it), the
rotating-dive readability (§7), and the pillar↔return overlap (§9 — without it the
loop collapses into "big hit, then teleport"). The validator's `[TIERS]` check fails
if any tier-critical group (the 6 held frames, the rotation trio, THE MARK, or any of
the 4 sub-effect grids) is missing from the shipping data.

---

## 11. Gameplay-handoff notes (for 8C-3 / 8C-4 — DO NOT implement now)

Minimum later-integration requirements (documented, not built):

- **Store the exact step-4 starting position** at W4 MARK, and keep it until E5B
  consumes it (the return destination).
- **Clamp forward travel** to ~5 hero lengths **inside arena bounds**; prevent
  full-map travel / uncontrolled pursuit.
- **Maintain Hero facing** across all 5 steps (authored right; runtime flip mirrors
  the clips and the directional grids).
- **Maintain floor alignment** — grounded frames on rows 32/33; airborne frames
  (J2/T2/D2A) carry no body there.
- **Projectile ownership & lifecycle** — spawn on A3B, world-space, despawn on
  impact/expiry (extends the existing `projectiles[]` / `drawWaveProjectiles` seam).
- **Pillar ownership & lifecycle** — spawn on P5A at the far end, own 5-frame clock,
  die tick 82, tear down at E5C.
- **Teleport timing** — depart E5A, arrive E5B (tick 73), before the pillar dies,
  inside the lit corridor bed.
- **Collision-safe reappearance** — reappear at the stored, in-bounds mark; do not
  reappear inside a wall or the boss.
- **Interruption behaviour** — a hard interrupt must snap the Hero visible at a valid
  position and clear the corridor / pillar / reform / glaive.
- **Hero-death cleanup / encounter-reset cleanup / repeated-use cleanup / VFX-tier
  cleanup** — never leak a pillar, corridor, glaive, reform snap, stored position, or
  an invisible Hero across death, reset, re-use or a tier switch.
- **Avoid duplicate legacy effects** — the four detached grids are the ONLY source of
  their visuals; do not also fire a legacy slash/pillar for the same beat.

Systems that already exist vs. the genuine gaps (verified against live `Enemy.js` in
the spec §Integration): jump+dive, a world-space projectile, a dash, and a
world-space effect layer **exist**; the only genuinely new systems are a **position
warp/teleport** and a **5th chain entry**. So the honest gap is **two systems, not
five** — but this is the **gameplay** stage (8C-3) and must be specced on its own
terms, not smuggled behind an art swap. S1+S2 are separable; S3-S4-S5 are one move
and only exist once the warp lands.

**Do not** invent unrelated mechanics or new AI behaviour.

---

## 12. Validation

`node hero_combo_a_validate.js` → **exit 0, ALL PASSED — 36 checks** against the
shipping literal (`hero_combo_a_literal.txt`) plus a generator-constant cross-check
(the generator is read as text, never executed by the validator):

- **PALETTE** — warm law R≥G≥B on all 6 LIGHT steps; 0 LIGHT/HERO key collisions.
- **CLIPS / DIMS / KEYS** — 5 body clips = 24/24 frames at 44×34; 4 grids at their
  declared WxH; body frames HERO+LIGHT only; the 4 grids are **pure LIGHT** (no blue).
- **MANIFEST** — 24 frames map 1:1 onto the frame/phase contract (no missing /
  duplicated frame); 6 HELD frames; holds sum to 82 ticks.
- **FLOOR** — grounded frames plant feet on 32/33; the 3 airborne frames carry ZERO
  body there.
- **BODY** — every non-ghost frame carries the hero; the teleport dissolves it
  (UNMAKE 114 < REFORM 182 < SETTLE 266).
- **ROTATE** — D2A aspect 0.92 ≥ 1.15× the upright T2 0.68; blade leads the line
  (top blade row 15 ≤ 25).
- **ESCALAT** — move-level light `54 / 242 / 173 / 386 / 827`: S1 smallest, S5 ≥ 1.5×
  every other, middle all above S1 (S3<S2 by design).
- **GLAIVE** — MICRO GLYPH white core; crescent bows toward travel.
- **CORRIDOR** — fades 263>116>37; residue rises; reaches 69/72.
- **PILLAR** — h-symmetric; north-dominant 687:37; dissolves 724>402>34; residue
  rises; true-circle crown.
- **REFORM** — mean radius contracts 12.2→6.6→6.0.
- **LOOP** — return tick 73 < pillar end 82; margin 9; inside the lit bed `[58,74)`.
- **ADVANCE** — 5.0 hero lengths (3.5–6.5).
- **SEAM** — E5C blade back at (36,27), 0.00 cells off.
- **FACING** — mirror-critical grids h-symmetric; directional grids authored right.
- **TIERS** — every tier-critical group present.
- **GENCONST** — literal geometry matches the generator's declared canvas + grid
  constants + advance.

Also confirmed independently: `hero_combo_a_gen.js` re-emits both the PNG and the
literal **byte-identical** (deterministic) and its own baked asserts pass;
`node --check` clean on the validator.

---

## 13. Major later-integration risks

1. **The dive must stay a TURN** (§7) — highest art risk. A later pass that reverts to
   a rigid upright fall or points the Hero's rays down into the dive blurs the mirror
   with the boss air-eclipse. The `[ROTATE]` check guards the art; keep it.
2. **THE MARK must survive tiering** (§8, §10) — dim/shorten/drop it and the return
   has no anchor; the whole move reads as a random blink.
3. **The overlap is the move** (§9) — shorten the pillar or delay the return past its
   death (tick 82) and the loop collapses into two moves. The 9-tick margin is the
   floor, not a target.
4. **The corridor must stay thin** — a thick corridor reads as the boss's beam language
   and swamps the escalation.
5. **World-space effects need a real painter** — the pillar is 82×144 px on the floor
   line, not on the hero. Do not bake it into a 44×34 hero frame; that is exactly what
   the canvas cannot do and would break the 8B-3 anchor work.
6. **Do not phase-index off `COMBO.HITS`** — there is no 5-step FSM to index against; a
   free-running animator drifts the held frames and the impact weight collapses (the
   8B-2 risk-3 lesson). This combo needs its own step→state mapping (8C-3).
7. **Two coordinate spaces** (§6) — the hero anchor is frame-local; the 4 grids are
   world-space. Placing a grid on the sprite anchor (or vice-versa) mislocates it.
8. **Red Eclipse / Light Eclipse must not blur** — white discs + TRUE circles for the
   Hero; keep the mirror pure ([[hero-light-eclipse]], [[red-eclipse-render-only]]).

---

## 14. Scope honoured

`src/` was **not** touched (read-only reference lookups only). No gameplay, hitbox,
timing, damage, movement, balance, AI, Boss, Combo B / Dragon Wrath, Hero Light
Eclipse family, throne room, camera or package-config change. No approved
visual-production file was modified or overwritten — every matrix in the package is
cell-for-cell the approved 8C-0 REV 2 art, proven by the validator reading the
shipping literal directly and by the generator's byte-identical re-emit. This stage
is one technical-handoff concern only; it does not begin 8C-3 or any later stage.
