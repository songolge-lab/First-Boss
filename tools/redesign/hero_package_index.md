# Stage 8B-2 — HERO PACKAGE INDEX

What exists, where it lives, and where it was integrated.
**Status: SHIPPED — Stage 8B-3 wired this package into `src/`.** The integration was
render-only: no gameplay, hitbox, timing or balance change (proven — see below).

---

## The package at a glance

Two approved visual stages, packaged for one integration stage:

| stage | what | status |
|-------|------|--------|
| **8B-0** | **HERO LIGHT ECLIPSE** — the named, reusable white+gold VFX family | APPROVED → packaged → **LIVE** (`src/core/HeroLightEclipse.js`) |
| **8B-1** | **DAYBREAK CHAIN** — the Hero's 4-hit sword combo, built FROM 8B-0 | APPROVED → packaged → **LIVE** (`heroCombo1..4`) |
| **8B-2** | drop-in extraction, validators, handoff docs | **done** |
| **8B-3** | wiring into the live game | **DONE** — see §"What 8B-3 actually did" |

> **[HERO LIGHT ECLIPSE](hero_eclipse_handoff.md)** is to the Hero what
> **Red Eclipse** is to the Boss: a *named reusable family*, not a one-off effect set.
> **A white disc in a gold corona. The Boss's ash sinks; the Hero's motes rise.**
> Future Hero light effects **compose from its six families** — they never invent a new ramp.

---

## File map

### Read these first
| file | what it is |
|------|-----------|
| [`hero_eclipse_handoff.md`](hero_eclipse_handoff.md) | the **family** contract: the five laws, palette, six families, anchors, reuse map, risks |
| [`hero_combo_handoff.md`](hero_combo_handoff.md) | the **combo** contract: hit order, frame groups, effect groups, FSM map, integration map, risks |
| `hero_package_index.md` | this file |

### Approved source of truth (8B-0 / 8B-1 — do not modify)
| file | what it is |
|------|-----------|
| `hero_eclipse_v1.png` / `hero_combo_v1.png` | the approved production sheets — **the visual source of truth** |
| `hero_eclipse_spec.md` / `hero_combo_spec.md` | the original design specs |
| `hero_eclipse_gen.js` / `hero_combo_gen.js` | deterministic generators (baked design asserts; verified byte-identical re-emit) |
| `hero_eclipse_literal.txt` / `hero_combo_literal.txt` | the approved literal matrix data |

### 8B-2 additions (new this stage)
| file | what it is |
|------|-----------|
| `hero_light_eclipse_dropin.mjs` | the eclipse family as an importable ES module: palette + anchors + holds + 22 grids + 3 bodyflare sets |
| `hero_combo_dropin.mjs` | the combo as an importable ES module: LIGHT palette ext + 4 clips / 18 frames |
| `hero_dropin_extract.js` | emits both drop-in modules **from the approved literals** (extraction only — never re-authors) |
| `hero_eclipse_validate.js` | 26 checks against the artifacts |
| `hero_combo_validate.js` | 19 checks against the artifacts |

**Why the `.mjs` drop-ins exist:** the approved `*_literal.txt` files are object-body
**fragments** (they need eval-wrapping to parse). The drop-in modules are the same
data — provably cell-for-cell identical — as ES modules with the locked palettes,
anchors and holds attached, so 8B-3 can `import` them instead of hand-pasting text.
They are `.mjs` because `tools/redesign/` has no `package.json` type field, matching
the existing `*_harness.mjs` convention; the file **contents** are exactly what pastes
into `src/`.

---

## Reproduce / verify everything

```bash
cd tools/redesign
node hero_dropin_extract.js      # re-emit both drop-in modules from the approved literals
node hero_combo_validate.js      # 19 checks — exit 0 = ALL PASSED
node hero_eclipse_validate.js    # 26 checks — exit 0 = ALL PASSED
```

Both validators read the **ARTIFACTS** (`*_literal.txt` + `*_dropin.mjs`), never the
generator internals, so they certify exactly what would be pasted downstream. The
`[EXTRACT]` check byte-compares the drop-in against the approved literal in both
directions of the package (26,928 + 41,710 cells, **0 diffs**).

---

## What 8B-3 actually did (all seams below are now LIVE)

| target | seam | outcome |
|--------|------|---------|
| `src/core/SpriteManager.js` | `HERO_REDESIGN_PALETTE` | six LIGHT keys merged — **0 collisions**, as validated |
| `src/core/SpriteManager.js` | `HERO_REDESIGN_SPRITES` | `heroCombo1..4` pasted (18 frames, one frame per line — the boss 8A-2 formatting) |
| `src/core/HeroLightEclipse.js` | **NEW** | the family as a named reusable module (palette + anchors + holds + 22 grids + 3 bodyflare sets) |
| `src/entities/Enemy.js` | `_animState` ATTACKING / ATTACK_WINDUP | → new `_comboAnim()`, phase-indexed per [hero_combo_handoff.md §5](hero_combo_handoff.md) |
| `src/entities/Enemy.js` | `draw()` | gained the boss-8A-2 `index` branch (`anim.sprites[name][index]`; every other clip still free-runs) |
| `src/entities/Enemy.js` | `drawSlashArc` on melee ACTIVE | **RETIRED** — method kept but uncalled (trails are baked) |
| `src/entities/Enemy.js` | `COMBO.HITS` | **untouched** — read-only, as required |
| `src/entities/Enemy.js` | `HERO_BODY_ROWS/COLS` | **NEW** — see the canvas-growth gotcha below |
| still open | `cast` / `parry` / contact / charged | the other Light Eclipse families — 8B-4+ |

Reproduce the asset half of the integration (idempotent — safe to re-run):

```bash
node tools/redesign/hero_combo_integrate.js      # palette + clips + family module
node tools/redesign/hero_integration_validate.js # 19 checks — reads the LIVE src/
node tools/redesign/hero_combo_harness.mjs       # 14 checks — a real Enemy, a real chain
```

The Enemy.js FSM wiring is hand-written and is NOT emitted by the injector.

### The gotcha 8B-2 predicted, and the one it didn't

Risk 2 (double trails) was real and is handled: the hook retired in the same pass as
the clips. Risk 6 ("canvas growth 30×24 → 44×34 — the anchor self-solves, but anything
that assumes a 30-wide hero frame should be eyeballed once") was **understated**. The
sprite anchor does self-solve, but three body-framing consumers measured the raw frame:
the floating HP bar (`_spriteTopY`) popped **20px up** the instant the Hero swung, the
contact shadow **swelled ~50%**, and `bodyCY` drifted 10px. All three now measure the
BODY box via `HERO_BODY_ROWS=24` / `HERO_BODY_COLS=30` clamps; non-combo clips are
bit-identical (both already fit inside the box).

---

## The two things 8B-3 must not get wrong *(both held — kept here as standing law)*

1. **Double trails.** The combo's trails are **baked into the frames**. The live
   `drawSlashArc` → `drawHolySlash` melee hook must be retired in the *same* pass as
   the clips. *(8B-3: retired. The pogo/air-attack `drawHolySlash` seam in
   `drawPogoStrike` is **separate** and is still live — verified.)*
2. **The escalation law is an EFFECT-LAYER law, not a composite law.** The 8B-1 spec's
   `2 → 69 → 71 → 194` is measured pre-composite. The shipped literal is composited
   and measures `2 / 64 / 54 / 155` — **H2 > H3**, because the body occludes 17 px of
   H3's thrust lance vs only 5 px of H2's crescent. **The art is correct and approved.**
   Do not "fix" the art to satisfy a composite-level strict-escalation check — that is
   redesign drift. Details: [hero_combo_handoff.md §9.1](hero_combo_handoff.md).

---

## Hard rules honoured

**8B-2 (packaging):** `src/` was read-only throughout (seam lookup only); no gameplay /
hitbox / timing / balance changes; no redesign drift — every matrix is cell-for-cell the
approved art, proven by the `[EXTRACT]` byte-compare and by both generators re-emitting
byte-identical output.

**8B-3 (integration):** render-only, and measured rather than asserted —
`hero_combo_harness.mjs` drives a real `Enemy` through a real chain and confirms the
chain still totals **67 ticks**, the hitbox shapes are still **40x46 / 42x46 / 44x48 /
56x54**, and per-hit damage is still **16 / 18 / 30**. `COMBO.HITS`, the hitboxes,
damage, knockback, AI, the camera, the throne room and the Red Eclipse overlays were not
touched. No redesign drift: `hero_integration_validate.js` byte-compares the **live
`src/`** against the approved literals (26,928 + 29,182 cells, **0 diffs**), and the two
8B-2 validators still pass unchanged.
