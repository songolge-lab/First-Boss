# Stage 8A-1 — Boss Basic Combo Redesign — HANDOFF PACKAGE

Asset + handoff work only. **Nothing here is integrated into the live game;
`src/`, gameplay, FSM timings, hitboxes, damage, projectile speeds, dash length,
AI, AFK, the Walk/Ground/Air Red Eclipse overlays, the throne room and the
Electron/Capacitor files are all untouched.** This document packages the
APPROVED Stage 8A-0 Boss combo redesign (`combo_v1.png`) into a drop-in-ready set
for a LATER wiring stage.

The redesign re-skins the Boss's normal **4-hit ground combo** (`attack1..attack4`)
so it rides the EXISTING `comboStep 1..4` FSM 1:1 — integration is a pure
sprite/VFX swap with zero gameplay drift. It preserves the approved Boss identity,
the one-sword law, and the Red Eclipse visual language.

---

## 1. File manifest

| file (tools/redesign/) | role |
|------------------------|------|
| `combo_v1.png`      | the approved production sheet — the visual source of truth |
| `combo_gen.js`      | deterministic generator (bakes 20+ asserts; throws on any violation) |
| `combo_literal.txt` | **drop-in matrix data**: 4 body clips (16f, 46×48) + 2 FX grids |
| `combo_spec.md`     | the 8A-0 design spec (per-hit choreography, escalation law, holds) |
| `combo_validate.js` | **NEW (8A-1)** standalone validator — reads the ARTIFACT, re-proves every drop-in contract (`node combo_validate.js` → exit 0 = ALL PASSED) |
| `combo_handoff.md`  | **NEW (8A-1)** this package index + implementation contract |

Nothing supersedes prior assets; this stage only ADDS the validator + this
handoff on top of the approved 8A-0 set. `combo_validate.js` reads
`combo_literal.txt` (not the generator), so it certifies exactly what would be
pasted downstream, independent of the generator internals.

---

## 2. Combo structure (SPECIAL ATTENTION 1–4)

**Four hits**, one per existing `comboStep`. The escalation arc is
**fast opener → turning heavy → cadence break → decisive ender**, and the two
legacy elements survive (redesigned): the old 3rd-hit magic is now the Umbral
Orb, the old 4th-hit rush+explosion is now the Eclipse Breaker.

| # | Clip | Name | Role | Frames | Hands | Rotates? | Orb? | Finisher? |
|---|------|------|------|--------|-------|----------|------|-----------|
| 1 | `attack1` | RISING REND   | fastest opener        | 4 | **one** (rear hand; lead empty) | no | no | no |
| 2 | `attack2` | ECLIPSE WHEEL | best reach, heavy turn| 4 | **two** (lead joins the grip) | **YES — 360° body turn-through** | no | no |
| 3 | `attack3` | UMBRAL ORB    | range / cadence break | 3 | **one** (sword rear-carried; **empty lead palm casts**) | no | **YES — the eclipse-ball** | no |
| 4 | `attack4` | ECLIPSE BREAKER| heaviest ender       | 5 | **two** (shoulder load) | no | no | **YES — rush + grounded detonation** |

- **(1) how many hits:** 4.
- **(2) what each hit is:** see the table + §4.
- **(3) which hit uses the orb / eclipse-ball:** **HIT 3 (Umbral Orb)** — the
  `comboOrb` grid IS the eclipse ball.
- **(4) which hit is the finisher:** **HIT 4 (Eclipse Breaker)** — shoulder-load
  rush into the grounded `comboDetonation` half-dome.

Total: **16 body frames** (4+4+3+5) + **4 orb cells** + **4 detonation cells** = 24 matrices.

---

## 3. Frame groups per hit (SPECIAL ATTENTION per-hit grouping)

All body frames are **46×48** at the current Boss pixel density
(`BOSS_IDLE_PIXEL 3` → 138×144 on screen; identical scale/anchor to every
existing Boss clip). Frame roles are authored, not free-running — the phase
labels are the sheet's own captions.

### HIT 1 — RISING REND (`attack1`, 4f) — the rear carry IS the wind-up
| f | role | pose |
|---|------|------|
| f0 | COIL   | one breath deeper than the idle rear-carry (crouch 1, weight back, tip stirs dust) |
| f1 | ACT-LO | blade passes under the front (~58°); thin scar starts |
| f2 | ACT-HI | **the hit** — rising diagonal (~-40°), forward lean, bold rising air scar |
| f3 | FOLLOW | blade drifts near-vertical (~-70°); scar breaks to sinking ash — **this is the chain pose** |

### HIT 2 — ECLIPSE WHEEL (`attack2`, 4f) — full-body turn-through, widest reach
| f | role | pose |
|---|------|------|
| f0 | WRAP 2H | blade flat over the shoulders at chin level; **the empty lead hand JOINS the grip** (two-hand moment); crouch begins |
| f1 | AWAY    | mid-pivot — body seen **from behind** (mirrored silhouette, visor + chest core hidden); blade sweeps BEHIND at hip height |
| f2 | SWEEP   | **the hit** — rotation completes into a wide knee-height front cut (~12°); widest silhouette; flat scar band passes in FRONT of the legs; tip-graze ticks |
| f3 | EXIT    | body rises; band ashes behind the settling blade (~48°) |

### HIT 3 — UMBRAL ORB (`attack3`, 3f body + `comboOrb`) — cadence break
| f | role | pose |
|---|------|------|
| f0 | GATHER | sword back in the rear carry; a void-fracture arc links the chest core to the open lead palm; kernel forms |
| f1 | CAST   | palm thrusts; the orb condenses ahead of the open hand |
| f2 | RECOIL | orb detached (flight cells take over); ember residue drifts off the palm |

### HIT 4 — ECLIPSE BREAKER (`attack4`, 5f + `comboDetonation`) — finisher
| f | role | pose |
|---|------|------|
| f0 | LOAD    | two-hand shoulder load (power pose): blade up-back over the rear shoulder, both fists stacked at the chest, ember veins bright |
| f1 | RUSH-A  | eclipse ignites (rim ~0.6): drive posture, blade leading low-forward, baked speed ticks |
| f2 | RUSH-B  | **peak** — full eclipse body, hot broken rim, bolt tears off behind |
| f3 | IMPACT  | the blade RAMS the floor ahead; bite sparks; detonation anchors here |
| f4 | RECOVER | back to the EXACT rear-carry rest + ember memory on the floor — **the seam straight back into locomotion idle** (validated: tip in the rear-lower quadrant) |

---

## 4. Special-effect groups per hit + escalation law (SPECIAL ATTENTION 5)

**Red Eclipse escalation — escalate, never flood:**

| Hit | Eclipse presence | Effect group |
|-----|------------------|--------------|
| H1  | **none**                 | thin baked air scar only (no eclipse) |
| H2  | **scar only** (black-red)| the flattened horizontal sweep band; body stays normal |
| H3  | **the orb IS the eclipse**| `comboOrb` flight cells (the eclipse-ball) |
| H4  | **full** (body + blast)  | eclipse body on the rush + grounded `comboDetonation` |

Bolts everywhere use the approved **afk2 void-fracture anatomy**: `0` sheath /
`c` filament / `d` kinks / `b`+`a` branches / `g` `1` ash. Body eclipse uses the
approved `eclipseSkin` **broken-ember rim** — deliberately distinct from the
AFK-denial tint's solid rim and from the AFK aura.

### Sword-trail (scar) family per hit — SPECIAL ATTENTION 5

There is ONE scar family (the black-red "air scar"), used at three shapes. **All
scars are BAKED into the body frames**, drawn behind the silhouette (`setBehind`).

| Hit | Trail shape | ramp | eclipse? |
|-----|-------------|------|----------|
| H1 | **rising arc** (thin uppercut scar, low→high) | `0` sheath / `a b` body / `c` inner / `d` licks | no eclipse |
| H2 | **flat sweep band** (side-view spin ring, in front of the legs) | same ramp, flattened horizontal | black-red scar = the only eclipse on this hit |
| H3 | *(no sword trail)* — H3 is a cast, not a swing; the effect is the orb | — | — |
| H4 | **rush eclipse + speed ticks** on the body, then the detonation (not a slash scar) | `eclipseSkin` rim + baked speed ticks | full |

> Because the scars are baked, the runtime `drawBossSlash` hook currently fired on
> combo hits 1/2 (`Player.draw` `_slashVfxFrame`) **must be retired / gated at
> wire time or the trails double.** (See §9.)

### Orb / eclipse-ball group — SPECIAL ATTENTION (orb) — `comboOrb`
23×23 grid, **centre (11,11)**, authored travel = **+x**. 4 cells:
- **O0 IGNITE** — kernel + converging ticks
- **O1 / O2 FLIGHT** (loop) — void-disc `0` core + hot `d` corona + broken `c`
  ring + bolt kinks + ember tail (both cells validated: core `0` + ≥8 `d`)
- **O3 BURST** — broken ring + outward shards + sinking ash

23 cells ≈ 69 game px ≈ the existing 64px flame box → the visual matches the live
hitbox envelope.

### Finisher explosion group — SPECIAL ATTENTION (finisher) — `comboDetonation`
72×52 grid, **centre (38,34)**, **floor row 48**. Grounded half-dome. 4 cells:
- **D0 FLASH** — void core births + floor flare
- **D1 BURST** — corona core, crystalline rays up/forward, broken half-octagon,
  outward shards, void-fracture skitters racing the floor (validated: reaches
  row 13, 82 floor-skitter cells, `d`-count > the orb → the finisher outshines it)
- **D2 FRACTURE** — rays break into black-red bolts, octagon cracks
- **D3 ASHFALL** — sinking slivers + ember scorch, **zero hot cells** (validated cooled)

The floor eats everything below row 49 (validated: 0 cells below floor+1).
72 cells = 216 px ≈ the existing 210px `EXPL.size`.

---

## 5. Hands / rotation contract (SPECIAL ATTENTION 6 & 7)

- **One hand:** H1 (rear hand swings; lead hand empty), H3 (sword rear-carried;
  the **empty lead palm** does the casting).
- **Two hands:** H2 (the lead hand JOINS the grip on the WRAP frame), H4 (two-hand
  shoulder LOAD).
- **Rotation / spin:** **only H2 rotates** — a full 360° body turn-through. Its
  f1 AWAY frame is the back-of-body moment (visor + chest embers voided above
  row 18, validated). No other hit spins.

---

## 6. Facing / mirroring (SPECIAL ATTENTION 8) + anchors

**Every matrix is authored facing RIGHT** (Hero on the right), like all approved
Boss clips. The runtime already mirrors the whole sprite by `aimDir` in
`Player.draw` — **that existing naive full-sprite mirror is the intended, correct
mechanism for every body frame.** No separate facing matrices.

- The H2 AWAY frame is a spin moment and is **direction-agnostic by construction**,
  so the mirror is safe there too.
- **Effect grids flip around their OWN centre column, not the grid midline:**
  - `comboOrb` → centre col **11** (grid is 23 wide → 11 is the true midline).
  - `comboDetonation` → **CX = 38** (NOT the 72-grid midline 36). The mirror math
    must reflect cells around **CX=38** — the RE-3 / RE-5 self-anchoring pattern:
    place the grid so its CX coincides with the Boss centre and let `drawMatrix`'s
    built-in flip mirror the whole effect around the Boss. Then the chest-core /
    impact origin stays anchored in BOTH facings across every pose frame with zero
    extra math.

### Anchor notes (torso, sword, effect origin, hit emphasis)
- **Frame box** 46×48; **feet plant on rows 46–47** in every body frame (validated).
  Draw anchor is feet-anchored: bottom of the 48-row frame on the floor line,
  horizontal centre at the body centroid (torso ≈ col 19). On-screen 138×144.
- **Sword origin (one-sword law):** the blade is welded to the Boss's own rear
  fist via the walk2 `heldSword` parametric drawer at **reach 23** in every frame —
  the SAME sword as locomotion, no second blade, melee reach envelope unchanged.
- **Effect origins:**
  - Orb (H3): casts from the **empty lead palm**; `comboOrb` centre (11,11) rides
    the projectile position.
  - Detonation (H4): anchored at the **IMPACT point on the floor** (grid CX=38,
    **floor row 48** pinned to the arena floor line).
- **Hit emphasis (the "the hit" frame per clip):** H1 **f2 ACT-HI**, H2 **f2 SWEEP**
  (widest silhouette), H3 **f1 CAST** (orb detaches at f2), H4 **f3 IMPACT** →
  detonation. Wire the peak hitbox activity to these frames' existing windows.

---

## 7. Timing suggestions mapped onto the EXISTING combo windows

**Presentation-only knobs — commit/recovery frames are UNCHANGED.** These are
`Player._animState` hold values (currently a1 4 / a2 3 / a3 5 / a4 3), not gameplay:

| Clip | Frames | Existing window | Suggested hold |
|------|--------|-----------------|----------------|
| `attack1` | 4 | commit 14 + chain 16 | hold 4 (f3 = chain pose fills recovery) |
| `attack2` | 4 | commit 16 + chain 16 | hold 4 |
| `attack3` | 3 | commit 20 + chain 18 | hold 7 |
| `attack4` | 5 | dash 10 + recovery 30 | **phase-index off the FSM** (AFK-clip idiom): f0 at start, f1–f2 across the dash, f3 pinned while the blast lives, f4 for the tail. Free-running fallback: hold 8 (no mid-recovery loop) |

- **Orb** over the 80f flame life: O0 ticks 0–5, then O1↔O2 @5, O3 as the last ~6
  ticks / on hit.
- **Detonation** over the 26f blast: D0 0–5, D1 6–13, D2 14–19, D3 20–25.

---

## 8. Compatibility with the current Boss size / proportions (SPECIAL ATTENTION 9)

- Body clips are **46×48 @ BOSS_IDLE_PIXEL 3** = 138×144 on screen — byte-for-byte
  the same box, density, and feet anchor as every clip already in
  `BOSS_REDESIGN_SPRITES`; all are auto-routed by the existing
  `frame.length >= 40` row-count detection through `BOSS_REDESIGN_PALETTE`.
- All frames derive from `boss_matrix.txt` via the house pose pipeline
  (eraseBlade → re-pose → bob → emberUp → parametric `heldSword`), so silhouette
  and proportions stay consistent with the rest of the set.
- Effect grids are sized to the LIVE hitbox envelopes (orb 69px ≈ 64px `FLAME`
  box; detonation 216px ≈ 210px `EXPL.size`), so nothing overspills the current
  combat scale.
- Palette is the locked `BOSS_REDESIGN_PALETTE` key set (`0-5 a-d g h`) — no new
  keys, no palette change needed to wire this in.

---

## 9. Integration map (for the LATER wiring stage — DO NOT do it now)

1. **Body clips:** paste `attack1..attack4` from `combo_literal.txt` over the same
   keys inside `BOSS_REDESIGN_SPRITES` (`src/core/SpriteManager.js`). Merged
   animator + row-count detection auto-serve them; the `aimDir` flip implements
   facing. Apply the §7 hold tweaks in `Player._animState` (currently 4/3/5/3).
2. **Baked scars — retire the double trail:** gate off / remove the runtime
   `drawBossSlash` hook on combo hits 1/2 (`Player.draw`, the `_slashVfxFrame`
   block, ~`Player.js:1745`) — the scars now live in the frames.
3. **Orb:** swap the visual at the `kind==='flame'` seam (`Player.js` ~1951, the
   `SpriteManager.drawDarkFlame` caller) for a `comboOrb` cell painter
   (O-index from `p.lifeProgress`); position / speed / hitbox untouched.
4. **Detonation:** swap the visual at the `kind==='explosion'` seam (`Player.js`
   ~1968, the `drawExplosion` caller) for a `comboDetonation` painter, floor row 48
   pinned to the arena floor line; D-index from the blast's 26f life. Mirror
   around **CX=38** (§6).
5. **Rush afterimages:** render-only ghosts of the live H4 frame while
   `_finisherDashTimer > 0` (the `drawDashAura` / glide-trail idiom — 2 stepped tints).
6. **Never touch:** `COMBO` / `FLAME` / `FINISH` / `EXPL` / `DIVE` consts,
   hitboxes, damage, input, AI, the Walk / Ground / Air Red Eclipse overlays, AFK.

The recommended wiring pattern matches every prior Boss stage: data into
`BOSS_REDESIGN_SPRITES` is auto-wired; only the render-only seams (scar retire,
orb painter, detonation painter, rush afterimages) are new code, added later.

---

## 10. Validation results (`node combo_validate.js` → exit 0, ALL PASSED)

The validator reads the ARTIFACT (`combo_literal.txt`), so it certifies exactly
what would be pasted downstream. 20/20 checks pass:

- **CLIPS** — attack1 4 / attack2 4 / attack3 3 / attack4 5 / comboOrb 4 / comboDetonation 4.
- **DIMS** — 16/16 body frames exactly 46×48; comboOrb 23×23; comboDetonation 72×52; rows uniform.
- **KEYS** — every cell is a legal `BOSS_REDESIGN_PALETTE` key; 0 illegal across body + FX.
- **FLOOR** — 16/16 body frames plant on rows 46–47 (no feet pop).
- **SWORD** — 16/16 body frames carry the blade (≥20 ember cells) — one-sword law.
- **AWAY** — H2 f1 hides the face: 0 hot-ember (c/d) cells above row 18.
- **VOID** — H4 RUSH-B void 349 ≥ 1.5× the H1 opener void 157 (rush eclipse dominance).
- **SEAM** — H4 f4 tip at (2,46), back in the rear-lower quadrant (locomotion hand-off).
- **ORB** — both flight cells: void-disc `0` core + ≥8 `d` corona.
- **DET** — D1 reaches row 13; 82 floor skitters; D3 fully cooled; 0 cells below
  floor+1 (half-dome); det `d`=64 > orb `d`=28 (finisher outshines the orb).

Also confirmed: `combo_gen.js` re-emits `combo_literal.txt` **byte-identical**
(deterministic), and its own 20+ baked asserts pass (`validation clean`).
`node --check` clean on `combo_gen.js` and `combo_validate.js`.

---

## 11. Implementation risks to watch for (SPECIAL ATTENTION 8)

1. **Double sword trail (highest priority).** Scars are baked into H1/H2 frames;
   the live `drawBossSlash` / `_slashVfxFrame` hook must be retired or every hit
   shows two trails. This is the single most likely wiring regression.
2. **Detonation mirror axis.** `comboDetonation` centre is **CX=38, not 36**.
   Mirroring around the grid midline (36) shifts the blast 2px off the Boss in
   left-facing. Use the RE-3/RE-5 self-anchoring scheme (place grid CX at Boss
   centre, let `drawMatrix`'s flip mirror) — do NOT hand-roll a midline mirror.
3. **Floor-pinning the detonation.** Floor row 48 must land on the arena floor
   line, not the grid's own bottom; otherwise the half-dome floats or clips.
4. **Orb index vs. life.** The O0/O1↔O2/O3 mapping must ride `p.lifeProgress` (80f
   flame life) — a naive per-frame advance will desync from the live projectile.
5. **H4 phase-indexing.** The 5-frame finisher should index off the FSM phase
   (dash / recovery), like the AFK clips, so IMPACT lands with the blast; a
   free-running animator can drift IMPACT off the detonation spawn.
6. **Red Eclipse overlap.** The Walk Red Eclipse surge is an independent
   render-only overlay ([[red-eclipse-render-only]]); it must not be cancelled by,
   nor double-drawn under, the combo — same family/palette, layer cleanly.

---

## 12. What to integrate first

1. **Body clips (§9.1) + the H1/H2 scar-hook retire (§9.2)** — this is the
   lowest-risk, highest-visibility change: the four swings render with their baked
   scars, no new painters, no hitbox/timing touch. Ship + verify this alone first.
2. **Then the Umbral Orb painter (§9.3)** — one seam, projectile-life-indexed.
3. **Then the Eclipse Breaker detonation (§9.4) + rush afterimages (§9.5)** — the
   heaviest visual, the CX=38 mirror + floor-pin risk, so it goes last where it can
   be validated against the live `EXPL` window in isolation.

Rationale: each step is independently verifiable in-game, and the ordering front-loads
the safe swaps while isolating the two real risk areas (scar double-draw, detonation
anchoring) into separate, testable passes.
