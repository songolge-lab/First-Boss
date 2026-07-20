# Stage 8B-2 — Hero Combo "DAYBREAK CHAIN" — HANDOFF PACKAGE

Extraction / packaging only. **Nothing here is integrated into the live game.**
`src/`, gameplay, the FSM timings, hitboxes, damage, AI, the Red Eclipse overlays
and everything else are untouched. This document packages the **APPROVED Stage
8B-1** Hero combo redesign (`hero_combo_v1.png`) into a drop-in-ready set for a
LATER wiring stage (8B-3).

The redesign re-skins the Hero's **4-hit melee combo** so it rides the EXISTING
`COMBO.HITS` FSM 1:1 — integration is a pure sprite/VFX swap with zero gameplay
drift. It preserves the approved Dawnguard Knight identity and is built entirely
from the approved **[HERO LIGHT ECLIPSE](hero_eclipse_handoff.md)** family.

---

## 1. File manifest

| file (tools/redesign/) | role |
|------------------------|------|
| `hero_combo_v1.png`      | the approved production sheet — the visual source of truth |
| `hero_combo_gen.js`      | deterministic generator (bakes the design asserts; throws on violation) |
| `hero_combo_literal.txt` | the approved drop-in matrix data: 4 clips, 18 frames, 44×34 |
| `hero_combo_spec.md`     | the 8B-1 design spec (choreography, escalation law, holds) |
| `hero_combo_dropin.mjs`  | **NEW (8B-2)** the same data as an importable ES module + the locked LIGHT palette |
| `hero_dropin_extract.js` | **NEW (8B-2)** the extractor that emits the drop-in module from the literal |
| `hero_combo_validate.js` | **NEW (8B-2)** standalone validator — reads the ARTIFACTS, re-proves every drop-in contract |
| `hero_combo_handoff.md`  | **NEW (8B-2)** this package index + implementation contract |

Nothing supersedes prior assets; 8B-2 only ADDS the extractor, the drop-in module,
the validator and this handoff on top of the approved 8B-1 set.
`hero_combo_validate.js` reads `hero_combo_literal.txt` **and**
`hero_combo_dropin.mjs` — not the generator — so it certifies exactly what would be
pasted downstream, independent of generator internals.

Run order:

```
node hero_dropin_extract.js     # re-emit the drop-in modules from the approved literals
node hero_combo_validate.js     # exit 0 = ALL PASSED (19 checks)
```

---

## 2. Combo structure and hit order

**Four hits, 18 frames.** The identity in one line:

> The Light Eclipse **rises across the combo** — steel glint → gilded smear →
> radiant lance → full SOLSTICE. The sword stays the star; the light rides it.

| # | Clip | Name | Hands | Motion | Eclipse level | Frames |
|---|------|------|-------|--------|---------------|--------|
| H1 | `heroCombo1` | **FIRST LIGHT** | one | descending shear, high-rear → low-front | glint only (2 LIGHT px) | 4 |
| H2 | `heroCombo2` | **GILDED CREST** | one | rising backhand crescent, low-front → overhead | gold smear + first rising motes | 4 |
| H3 | `heroCombo3` | **SUNPIERCE** | two | lunging straight **thrust** (breaks the swing rhythm) | radiant lance + IMPACT star at the tip | 4 |
| H4 | `heroCombo4` | **SOLSTICE** | two | ground-rear rising **full moon — launcher** | full crescent + big IMPACT + HALO snap + rising motes | 6 |

- **Hit order** is the live chain order: H1 → H2 → H3 → H4, driven by `_comboIndex`.
- **The cadence break is H3** — a thrust among swings.
- **The finisher is H4** — the deliberate mirror of the boss's H4 Eclipse Breaker:
  the boss **rams the floor** (void detonation, ash sinks); the Hero **tears out of
  it upward** (light launcher, motes rise). The live finisher knockback (16) reads
  as the launch.
- **Hands:** H1/H2 one-hand, H3/H4 two-hand (the far arm is baked into the frames).

---

## 3. Frame groups per hit

All frames are **44×34**, ordered to match the FSM phase order exactly:
**WINDUP / ACTIVE-EARLY / ACTIVE-HIT / LINK**. The **HIT frame is HELD** in every
hit — that is the impact weight, and it is the whole rhythm of the chain.

### H1 FIRST LIGHT (`heroCombo1`, 4f) — the light is asleep
| f | tag | role |
|---|-----|------|
| 0 | `W1 GLINT`  | blade raised beside the helm, body pulled back, cape drifts forward; two W edge glints + one gold spark |
| 1 | `A1A SHEAR` | top of the steel smear revealed (5-4-3 steel ramp) |
| 2 | `A1B HIT` **(hold)** | full descending crescent, blade low-front, small step in; ONE white apex glint pair — smear stays **pure steel** |
| 3 | `L1 FOLLOW` | smear breaks into one-step-dimmer broken bands |

### H2 GILDED CREST (`heroCombo2`, 4f) — gold enters the smear
| f | tag | role |
|---|-----|------|
| 0 | `W2 DIP`    | blade dips low-front, body coils down 1; a W+y tip glint |
| 1 | `A2A SHEAR` | rising partial crescent (W/I/y, thin) |
| 2 | `A2B HIT` **(hold)** | full rising crescent low→overhead, warm `o` belly rim, sparse `G` breakup, tail cooled one step; 2 motes rise off the arc top |
| 3 | `L2 FLOAT`  | crescent broken + dimmed; motes risen higher |

### H3 SUNPIERCE (`heroCombo3`, 4f) — the cadence break
| f | tag | role |
|---|-----|------|
| 0 | `W3 COIL`   | body coils back, blade level at the waist; 3 gather motes converge on the tip + W tip glint (the CYCLE gather grammar, micro-dose) |
| 1 | `A3A DRIVE` | launch: lunge stance opens, speed-lines ignite |
| 2 | `A3B HIT` **(hold)** | full extension. Radiant lance = hot W/I upper speed-line + gold rims + I/y lower line, each with a **1px air gap** off the blade band so they read as motion, not blade thickening; launch streaks trail past the back; compact IMPACT star at the tip |
| 3 | `L3 RECOIL` | lance dissolves to broken o/G/u dashes; 2 motes rise |

### H4 SOLSTICE (`heroCombo4`, 6f) — finisher / launcher
| f | tag | role |
|---|-----|------|
| 0 | `W4A COIL`   | deep crouch, blade swept to the rear-low corner, cape pools; underfoot **ground-glint** (GROUND HALO hint) + gather motes at the tip |
| 1 | `W4B IGNITE` | W kernel flares on the tip, ground glint gains its W node |
| 2 | `A4A ASCENT` | the cut launches: partial crescent through the low-front, **ground-skim ticks** where the arc crossed the floor row |
| 3 | `A4B HIT` **(hold)** | the FULL MOON: 210° W/I/y/o crescent with sparse `G` belly, big IMPACT star at the contact zone, detached tip glint, 2 rising motes; body stretched tall |
| 4 | `P4 PEAK`    | blade overhead (canted back over the crown); **HALO H0 SNAP** ring around the body (true circle + W cardinal nodes + N/S ticks); crescent remnant dissolving; motes risen |
| 5 | `S4 SETTLE`  | top-arc ring fragments + last bronze mote; the blade returns to the idle carry — **the seam back into locomotion** |

---

## 4. Effect groups per hit — where the LIGHT ECLIPSE enters

The combo is the first consumer of the **[HERO LIGHT ECLIPSE](hero_eclipse_handoff.md)**
reusable family. Every light shape in the chain is a re-use of an 8B-0 family part —
nothing new was invented:

| Hit | 8B-0 family parts used | Eclipse level |
|-----|------------------------|---------------|
| H1 | **SLASH `S0 GLINT`** language only — one W edge glint on windup + apex | none — steel only |
| H2 | **SLASH** band (W-I-y crescent + `o` belly) — follow breaks one step dimmer; **motes rise** | gold enters |
| H3 | **CYCLE gather** (micro-dose on coil) → **radiant lance** → **IMPACT `P1` star** at the tip | radiant |
| H4 | **GROUND HALO** hint underfoot on coil → W kernel **ignite** → full crescent → big **IMPACT** on hit → **HALO `H0` SNAP** ring at the peak → ring fragments + last mote on settle | full |

**Escalation law:** the light grows strictly H1 → H4. See §9 risk 1 for the exact
measurement level this law lives at — it matters at integration.

Effects are **BAKED into the frames**, drawn BEHIND the body (`setBehind`), with
front accents covering at most 6 body px so the sword always stays the star. The
effect layers never contain the hero's cold blues — **no blue can enter the eclipse**.

---

## 5. FSM mapping (integration contract — zero gameplay change)

Maps 1:1 onto the LIVE 4-hit melee FSM in [Enemy.js](../../src/entities/Enemy.js)
(`COMBO.HITS`, fields `_comboIndex` / `_comboPhase` / `_comboPhaseTimer`),
phase-indexed exactly like the approved boss 8A-2 port. The live per-hit windows at
[Enemy.js:149](../../src/entities/Enemy.js#L149) are `windup/active/link` =
**5/4/7, 3/4/7, 3/4/8, 6/6/10** — the table below is derived from those and changes
none of them:

| hit | windup | active | link |
|-----|--------|--------|------|
| H1 (w5/a4/l7)  | `W1` | timer>2 → `A1A`, else **`A1B` held** | `L1` |
| H2 (w3/a4/l7)  | `W2` | timer>2 → `A2A`, else **`A2B` held** | `L2` |
| H3 (w3/a4/l8)  | `W3` | timer>2 → `A3A`, else **`A3B` held** | `L3` |
| H4 (w6/a6/l10) | timer>3 → `W4A`, else `W4B` | timer>3 → `A4A`, else **`A4B` held** | timer>5 → `P4`, else `S4` |

The chain totals ~67 ticks ≈ 1.1s — the same cadence the game already plays.
**These are presentation knobs only. The `COMBO.HITS` shapes must not be edited.**

---

## 6. Canvas, anchors, contact points, layer order

- **Canvas 44×34** (vs the 30×24 base): headroom for overhead blades and smears.
  Hero base pasted at **(7,10)**; feet/shadow rows **32/33** (last row).
- **Anchor:** `SpriteManager.drawSprite`'s centerX / feet-bottom anchor
  ([SpriteManager.js:552](../../src/core/SpriteManager.js#L552)) **self-solves** —
  no code change. Body offset from the grid centre col matches the 30-wide base, so
  the existing `aimDir`/`facing` mirror behaves identically. **Authored facing RIGHT**,
  like every approved Hero clip; the runtime full-sprite flip is the intended mechanism.
- **On screen:** 44×34 at `HERO_IDLE_PIXEL` 2 = **88×68 px** around the same 60×48
  body. Rows ≥ 20 → the existing row-count detection already routes these through
  `HERO_REDESIGN_PALETTE`.
- **Contact points (the "hit" frame per clip):** H1 f2, H2 f2, H3 f2 (star at the
  blade tip), H4 f3 (star at the contact zone). If an on-hit confirm is added later,
  the 8B-0 `lightImpact` grid centre (10,10) rides these points.
- **Layer order** (baked, back → front): `fxB` smear/trail → **hero body** → `fxF`
  front accents (≤6 body px) → (later, optional) runtime `lightImpact` at contact.
  **The body always wins over its own trail.**

### Palette
Frames use HERO keys + the six LIGHT keys (`W I y o G u`). At integration, extend
`HERO_REDESIGN_PALETTE` ([SpriteManager.js:64](../../src/core/SpriteManager.js#L64))
with the LIGHT keys — **validated: zero key collisions** with the hero set
(`. 0-5 n m l L g`). `G` (#c9962e) deliberately shares the hero gold value.

---

## 7. Validation results (`node hero_combo_validate.js` → exit 0, ALL PASSED)

19/19 checks pass against the ARTIFACTS:

- **EXTRACT** — `hero_combo_dropin.mjs` is cell-for-cell identical to the approved
  literal: **26,928 cells, 0 diffs**; drop-in ramp == the locked 8B-0 palette.
- **CLIPS/DIMS** — 4/4/4/6 = 18 frames, all exactly 44×34.
- **KEYS** — every cell is a legal HERO+LIGHT key; **0 collisions** on merge.
- **PALETTE** — warm law R≥G≥B on all 6 LIGHT steps (blue cannot exist).
- **FLOOR** — 18/18 frames plant feet/shadow on rows 32–33 (no feet pop).
- **BODY** — 18/18 frames carry the hero body (the re-pose never erased it).
- **GLINT** — H1's hit frame is glint-only: 2 LIGHT px (≤6).
- **PEAK** — H4's hit (155 LIGHT px) > 1.5× every other hit (max 64).
- **ESCALAT** — composite escalation: H1 2 ≪ mid band [H2 64, H3 54] ≪ H4 155 (§9.1).
- **DISSOLV** — H3's lance thins: L3 10 < A3B 54.
- **MOTES** — light RISES, never ashes: H2 mean-Y 15.28 → 13.24; H4 18.88 → 14.21 → 8.79.
- **SEAM** — S4 returns the blade to **exactly** the idle carry tip (36,27), 0.00 cells off.

Also confirmed: `hero_combo_gen.js` re-emits `hero_combo_literal.txt` **and**
`hero_combo_v1.png` **byte-identical** (deterministic), and its own baked asserts
pass. `node --check` clean on every 8B-2 script.

---

## 8. Integration map (for the LATER wiring stage — DO NOT do it now)

1. **Palette:** merge the six LIGHT keys into `HERO_REDESIGN_PALETTE`
   ([SpriteManager.js:64](../../src/core/SpriteManager.js#L64)). Import
   `HERO_COMBO_PALETTE_EXT` from `hero_combo_dropin.mjs` or paste the six entries.
2. **Body clips:** paste `heroCombo1..4` from `HERO_COMBO_SPRITES` into
   `HERO_REDESIGN_SPRITES` ([SpriteManager.js:372](../../src/core/SpriteManager.js#L372)).
   Row-count detection + the `facing` flip auto-serve them.
3. **Phase-index the clips:** replace the free-running `attack` clip at the
   `_animState` ATTACKING / ATTACK_WINDUP branch
   ([Enemy.js:1299](../../src/entities/Enemy.js#L1299), currently
   `{ name: this._clip('attack'), hold: 3 }`) with `heroCombo1..4` selected by
   `_comboIndex` and indexed by `_comboPhase` / `_comboPhaseTimer` per §5.
4. **Retire the runtime slash hook:** the trails are BAKED. `drawSlashArc` is fired
   on melee ACTIVE frames at [Enemy.js:1405](../../src/entities/Enemy.js#L1405) →
   `SpriteManager.drawHolySlash` ([Enemy.js:1467](../../src/entities/Enemy.js#L1467)).
   **Gate it off for the melee combo or every hit shows two trails.**
5. **Optional on-hit confirm:** the 8B-0 `lightImpact` grids at the hitbox contact
   point on a connected strike (render-only).
6. **Never touch:** `COMBO.HITS`, hitboxes, damage, knockback, AI, the Red Eclipse
   overlays, the pogo/air-attack seams ([Enemy.js:1511](../../src/entities/Enemy.js#L1511)
   also calls `drawHolySlash` — that is a DIFFERENT seam and must keep working).

---

## 9. Implementation risks for Stage 8B-3

1. **The escalation law is an EFFECT-LAYER law, not a composite law (read this
   first).** The 8B-1 spec states LIGHT px grows strictly H1<H2<H3<H4 as
   `2 → 69 → 71 → 194`. That is measured on the **un-composited fx layers** and is
   asserted in the generator. The **shipped literal is composited** — the body draws
   over the back smear — and occlusion is uneven per hit: **`2 / 64 / 54 / 155`**.
   H3 SUNPIERCE is a thrust, so the body and arms eat 17 px of its lance while H2's
   crescent only loses 5, which **inverts H2 vs H3 in the composite**. *The art is
   correct and approved — only the measurement level differs.* Do **not** "fix" the
   art to make a composite-level strict-escalation check pass; that would be redesign
   drift. `hero_combo_validate.js` asserts the invariants that actually survive
   compositing (H1 glint-only, H4 dominant, mid band ≫ H1).
2. **Double sword trail (highest wiring risk).** Trails are baked into the frames;
   the live `drawSlashArc` → `drawHolySlash` hook on melee ACTIVE frames must be
   retired or gated (§8.4). The same lesson as the boss 8A-2 `_slashVfxFrame`
   retirement. This is the single most likely regression.
3. **Free-running animator drift.** The clips must be **phase-indexed off the FSM**,
   not free-run at a fixed hold. A free-running animator will drift the HELD hit
   frame off the actual `active` window and the impact weight collapses.
4. **The HOLD is the feel.** If `A1B/A2B/A3B/A4B` are not held for the back half of
   the active window, the chain reads weightless. This is the whole rhythm.
5. **Palette merge order.** The LIGHT keys must be merged into
   `HERO_REDESIGN_PALETTE` **before** the clips render, or `G/W/I/y/o/u` cells drop
   out and the light silently vanishes. (Keys are collision-free — validated.)
6. **Canvas growth 30×24 → 44×34.** The anchor self-solves, but anything that
   assumes a 30-wide hero frame (bespoke offsets, the telegraph at
   [Enemy.js:1403](../../src/entities/Enemy.js#L1403)) should be eyeballed once.
7. **The pogo/air-attack `drawHolySlash` seam is separate** — gate the melee hook
   only, or the air attack loses its slash entirely.
8. **Red Eclipse / Light Eclipse must not blur.** The boss family is void discs and
   broken octagons; the Hero family is white discs and TRUE circles. Keep the mirror
   pure ([[hero-light-eclipse]], [[red-eclipse-render-only]]).

---

## 10. Recommended integration order

1. **Palette merge + body clips + phase-indexing (§8.1–8.3), with the slash hook
   retired in the same pass (§8.4).** These four are one atomic step — the clips and
   the hook retire cannot ship apart without either doubling the trails (clips
   without retire) or deleting the Hero's trail entirely (retire without clips).
   Ship and verify this alone first: it is the highest-visibility change and needs no
   new painters.
2. **Then the optional on-hit `lightImpact` confirm (§8.5)** — one seam, render-only,
   independently verifiable, and easy to revert if it reads as noise.
3. **Then any wider Light Eclipse re-use** (cast / parry / charged moments) — see
   [hero_eclipse_handoff.md](hero_eclipse_handoff.md) §7.

Rationale: step 1 is the whole approved redesign and is self-contained; steps 2–3
are additive polish that can be judged against a known-good baseline. Front-load the
one atomic swap, isolate every optional painter behind it.
